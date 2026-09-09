-- Défis de la semaine, 4/5 — LA LECTURE, L'ÉQUIPEMENT, LES DÉCLENCHEURS.
-- Requiert 0165, 0166, 0167 (et 0118/0119 pour les faits qu'ils déclenchent).
--
-- ─── CE QUE CETTE LECTURE NE RENVOIE PAS, ET POURQUOI ───────────────────────
-- Ni `expiresAt`, ni `endsAt`, ni « il te reste N jours », ni la date de la
-- semaine en cours. Un client ne peut donc pas peindre un compte à rebours,
-- même par erreur : la donnée n'existe pas dans la réponse. C'est §4.2 rendu
-- structurel plutôt que promis. La seule date renvoyée est `passedWeek`, un
-- lundi RÉVOLU — de quoi dire « la semaine est passée » au passé, sans reproche
-- et sans horloge.
--
-- ─── ATTRIBUTION AU PREMIER REGARD ──────────────────────────────────────────
-- Les défis d'une semaine naissent quand quelqu'un les lit, pas quand une tâche
-- planifiée les distribue. Personne ne se voit assigner un objectif qu'il n'a
-- pas ouvert, et les conditions sont évaluées sur TOUTE la semaine écoulée :
-- ouvrir l'écran dimanche crédite la boucle de lundi.

create function public.read_weekly_quests_2026()
returns jsonb language plpgsql volatile security definer set search_path=public,pg_temp as $$
declare owner uuid:=auth.uid(); week date; previous date;
begin
  if owner is null then raise exception 'authentication_required'; end if;
  if not exists(select 1 from public.users where id=owner and deletion_requested_at is null) then
    raise exception 'account_unavailable'; end if;
  week:=public.weekly_quest_week_start_2026(now());
  previous:=week-7;
  perform public.assign_weekly_quests_2026(owner,'run',week);
  perform public.assign_weekly_quests_2026(owner,'bike',week);
  perform public.evaluate_weekly_quests_2026(owner);
  return jsonb_build_object(
    'ruleset','2026.1',
    'asOf',now(),
    'passedWeek',previous,
    'current',coalesce((select jsonb_agg(jsonb_build_object(
        'activity',a.activity,'questId',a.quest_id,'version',a.quest_version,
        'family',q.family,'condition',q.condition,'threshold',q.threshold,'status',a.status,
        -- Un fait PASSÉ (« réussi à telle heure »), jamais une échéance.
        'completedAt',a.completed_at,
        'reward',jsonb_build_object('rewardId',t.reward_id,'label',t.label,'kind',t.kind,'slot',t.slot,
          'owned',exists(select 1 from public.weekly_quest_reward_ownership_2026 o where o.user_id=owner and o.reward_id=t.reward_id)))
        order by a.activity,a.quest_id)
      from public.weekly_quest_assignments_2026 a
      join public.weekly_quests_2026 q on q.quest_id=a.quest_id
      join public.weekly_quest_reward_templates_2026 t on t.reward_id=q.reward_id
      where a.user_id=owner and a.week_start=week),'[]'::jsonb),
    'passed',coalesce((select jsonb_agg(jsonb_build_object(
        'activity',a.activity,'questId',a.quest_id,'version',a.quest_version,
        'family',q.family,'condition',q.condition,'threshold',q.threshold,'status',a.status,
        'completedAt',a.completed_at,
        'reward',jsonb_build_object('rewardId',t.reward_id,'label',t.label,'kind',t.kind,'slot',t.slot,
          'owned',exists(select 1 from public.weekly_quest_reward_ownership_2026 o where o.user_id=owner and o.reward_id=t.reward_id)))
        order by a.activity,a.quest_id)
      from public.weekly_quest_assignments_2026 a
      join public.weekly_quests_2026 q on q.quest_id=a.quest_id
      join public.weekly_quest_reward_templates_2026 t on t.reward_id=q.reward_id
      where a.user_id=owner and a.week_start=previous),'[]'::jsonb),
    -- Les objets POSSÉDÉS, jamais un catalogue coché. Un objet gagnable n'a
    -- rien à faire dans une vitrine tant qu'il n'est pas gagné (G24).
    'objects',coalesce((select jsonb_agg(jsonb_build_object(
        'rewardId',o.reward_id,'label',t.label,'kind',t.kind,'slot',t.slot,
        'questId',o.quest_id,'earnedAt',o.earned_at,
        'equipped',exists(select 1 from public.weekly_quest_reward_equipment_2026 e
                          where e.user_id=o.user_id and e.reward_id=o.reward_id))
        order by o.earned_at,o.reward_id)
      from public.weekly_quest_reward_ownership_2026 o
      join public.weekly_quest_reward_templates_2026 t on t.reward_id=o.reward_id
      where o.user_id=owner),'[]'::jsonb));
end $$;

-- ── Équiper : un objet possédé, un emplacement, une décision ────────────────
-- Aucun emplacement d'identité (cadre, titre) n'est touché : les objets de défi
-- ne s'empilent pas au-dessus du pseudo (G22). Équiper ne change AUCUN calcul —
-- ni capture, ni match, ni XP (§16.2).
create function public.equip_weekly_quest_reward_2026(p_reward_id text,p_equip boolean)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare owner uuid:=auth.uid(); target text;
begin
  if owner is null then raise exception 'authentication_required'; end if;
  if p_equip is null then raise exception 'invalid_equipment_choice'; end if;
  if not p_equip then
    delete from public.weekly_quest_reward_equipment_2026 where user_id=owner and reward_id=p_reward_id;
    return jsonb_build_object('rewardId',p_reward_id,'equipped',false);
  end if;
  if not exists(select 1 from public.weekly_quest_reward_ownership_2026
    where user_id=owner and reward_id=p_reward_id) then raise exception 'reward_not_owned'; end if;
  select slot into strict target from public.weekly_quest_reward_templates_2026 where reward_id=p_reward_id;
  insert into public.weekly_quest_reward_equipment_2026(user_id,slot,reward_id) values(owner,target,p_reward_id)
    on conflict(user_id,slot) do update set reward_id=excluded.reward_id,equipped_at=now();
  return jsonb_build_object('rewardId',p_reward_id,'slot',target,'equipped',true);
end $$;

-- ── Les deux faits serveur qui closent un défi sans qu'on ouvre l'écran ─────
-- 1. Une capture PUBLIÉE (0118). Le déclencheur ne regarde que la transition
--    vers `published` : ni `rebuild_ownership_2026` (qui n'écrit pas `status`),
--    ni une mise en scène, ni un retrait ne le réveillent.
create function public.evaluate_weekly_quests_on_capture_2026()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if new.owner_id is not null then perform public.evaluate_weekly_quests_2026(new.owner_id); end if;
  return null;
end $$;
create trigger evaluate_weekly_quests_on_capture_2026
  after update of status on public.capture_events_2026
  for each row when(new.status='published' and old.status is distinct from new.status)
  execute function public.evaluate_weekly_quests_on_capture_2026();

-- 2. Une journée admissible confirmée : le registre change (0119/0121/0144,
--    `commit_progress_2026`). On lit le registre, on ne le recalcule pas, et on
--    n'y écrit RIEN — un défi ne crédite jamais d'XP (§7.1).
create function public.evaluate_weekly_quests_on_ledger_2026()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  perform public.evaluate_weekly_quests_2026(new.user_id);
  return null;
end $$;
create trigger evaluate_weekly_quests_on_ledger_2026
  after update of ledger on public.progress_accounts_2026
  for each row when(new.ledger is distinct from old.ledger)
  execute function public.evaluate_weekly_quests_on_ledger_2026();

-- ── L'expiration, en tâche de fond et SANS message ─────────────────────────
-- Elle n'envoie rien, n'inscrit rien dans un journal d'activité, ne touche
-- aucun autre compte. Le seul effet visible est qu'à la lecture suivante, la
-- carte dit « la semaine est passée ». Les tests l'appellent directement : la
-- planification n'est pas une condition de la preuve.
create function public.expire_weekly_quests_2026()
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare expired integer;
begin
  update public.weekly_quest_assignments_2026 a set status='expired'
   where a.status='active'
     and now()>=(select b.expires_at from public.weekly_quest_week_bounds_2026(a.week_start) b);
  get diagnostics expired=row_count;
  return expired;
end $$;

revoke all on function public.evaluate_weekly_quests_on_capture_2026(),
  public.evaluate_weekly_quests_on_ledger_2026(),public.expire_weekly_quests_2026()
  from public,anon,authenticated;
grant execute on function public.expire_weekly_quests_2026() to service_role;
revoke all on function public.read_weekly_quests_2026(),
  public.equip_weekly_quest_reward_2026(text,boolean) from public,anon;
grant execute on function public.read_weekly_quests_2026(),
  public.equip_weekly_quest_reward_2026(text,boolean) to authenticated,service_role;

-- Les déploiements qui portent pg_cron expirent d'eux-mêmes ; les autres
-- expirent à la première lecture du compte concerné. Aucune installation n'est
-- exigée pour que la règle soit vraie.
do $$ begin
  if exists(select 1 from pg_extension where extname='pg_cron') then
    perform cron.schedule('expire-weekly-quests-2026','7 * * * *','select public.expire_weekly_quests_2026()');
  end if;
end $$;
