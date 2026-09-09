-- Cahier §7.2 et §7.5 : les HUIT récompenses de niveau deviennent des objets
-- OCTROYÉS PAR LE SERVEUR. Elles étaient peintes cochées par l'écran de
-- progression (LEVEL_REWARDS_2026), alors qu'aucune table ne les possédait :
-- la collection ne pouvait pas les montrer et le Studio rendait `null`.
-- Requiert 0119 (registre) et 0121 (collections de saison, équipement).
--
-- ─── POURQUOI UNE MAISON DÉDIÉE, ET PAS UNE DES DEUX EXISTANTES ─────────────
--  · `season_reward_ownership_2026` (0121) est clé sur une collection PUBLIÉE
--    (FK `season_collections_2026`). Une récompense de niveau n'appartient à
--    aucun calendrier : l'y ranger obligerait à inventer une saison, donc à
--    fabriquer un fait. Sa table de modèles est en plus un instantané GELÉ de
--    SEASON_REWARDS_2026 dont `tier` est UNIQUE — y ajouter huit lignes
--    casserait l'instantané et son test de dérive.
--  · `commercial_ownership_2026` (0125) enregistre un REÇU DU STORE
--    (`product_id`, `observed_at_ms`, contrainte `not owned or product_id is
--    not null`). Une récompense gratuite n'a pas de reçu ; en forger un
--    décrirait un achat qui n'a pas eu lieu.
-- On reprend donc la forme ÉPROUVÉE de 0121 — modèles gelés + possession +
-- octroi idempotent dans le commit du registre — avec son propre couple de
-- tables, ancré sur les XP de carrière au lieu d'un calendrier.
--
-- ─── PERMANENCE (§7.5 « Permanente ») ───────────────────────────────────────
-- Un objet gagné n'est JAMAIS retiré, même si une correction de source fait
-- baisser les XP sous le seuil : même règle que les variantes de saison, qui
-- survivent à la fin d'un abonnement.

create table public.level_reward_templates_2026 (
  reward_id text primary key,
  level integer not null unique check(level>1),
  -- Seuil cumulé du cahier : XP(N) = 100×(N−1) + 10×(N−1)×(N−2). Figé ici,
  -- et confronté à `xpForLevel2026` par le test SQL (dérive interdite).
  min_xp integer not null unique check(min_xp>0),
  label text not null,
  -- Emplacement d'identité du profil, ou NULL pour un objet de Studio.
  identity_slot text check(identity_slot in ('frame','title'))
);
insert into public.level_reward_templates_2026 values
  ('first_trace',2,100,'Première trace',null),
  ('line_frame',3,220,'Cadre Ligne','frame'),
  ('chalk',5,520,'Palette Craie',null),
  ('atlas',10,1620,'Collection Atlas',null),
  ('contour_animation',15,3220,'Animation Contour',null),
  ('ridge_merit',20,5320,'Ligne de crête','frame'),
  ('cartographer',30,11020,'Cartographe','title'),
  ('horizon',50,28420,'Ensemble Horizon',null);

create table public.level_reward_ownership_2026 (
  user_id uuid not null references public.users(id) on delete cascade,
  reward_id text not null references public.level_reward_templates_2026(reward_id),
  earned_at timestamptz not null default now(),
  ledger_version bigint not null,
  primary key(user_id,reward_id)
);
-- Un seul cadre, un seul titre : la clé primaire (user_id,slot) rend
-- structurellement impossible d'afficher deux cadres sur un même profil.
create table public.level_reward_equipment_2026 (
  user_id uuid not null,
  slot text not null check(slot in ('frame','title')),
  reward_id text not null,
  equipped_at timestamptz not null default now(),
  primary key(user_id,slot),
  foreign key(user_id,reward_id)
    references public.level_reward_ownership_2026(user_id,reward_id) on delete cascade
);

alter table public.level_reward_templates_2026 enable row level security;
alter table public.level_reward_ownership_2026 enable row level security;
alter table public.level_reward_equipment_2026 enable row level security;
revoke all on public.level_reward_templates_2026,public.level_reward_ownership_2026,
  public.level_reward_equipment_2026 from public,anon,authenticated;
grant all on public.level_reward_templates_2026,public.level_reward_ownership_2026,
  public.level_reward_equipment_2026 to service_role;

-- Rejouable : octroie TOUT ce que les XP confirmés méritent déjà, donc rattrape
-- les comptes créés avant cette migration sans exiger une nouvelle sortie.
-- Le registre est la seule source ; aucun abonnement, capture ou classement
-- n'entre dans cette condition (§7.2 : « le niveau ne change aucun calcul »).
create function public.grant_level_rewards_2026(p_user_id uuid)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare added integer;
begin
  if not exists(select 1 from public.users where id=p_user_id and deletion_requested_at is null) then return 0; end if;
  perform 1 from public.progress_accounts_2026 where user_id=p_user_id for update;
  insert into public.level_reward_ownership_2026(user_id,reward_id,ledger_version)
    select p.user_id,t.reward_id,p.ledger_version
    from public.progress_accounts_2026 p cross join public.level_reward_templates_2026 t
    where p.user_id=p_user_id and coalesce((p.ledger->>'totalXp')::integer,0)>=t.min_xp
    on conflict do nothing;
  get diagnostics added=row_count;
  return added;
end $$;

-- Même transaction que le crédit d'XP : franchir un seuil et recevoir l'objet
-- ne peuvent pas diverger, et un rejeu ne double rien.
create or replace function public.commit_progress_2026(p_user_id uuid,p_version bigint,p_ledger jsonb,p_run_id uuid default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare account public.progress_accounts_2026; xp_delta integer; run_xp integer;
begin
  select * into strict account from public.progress_accounts_2026 where user_id=p_user_id for update;
  if not exists(select 1 from public.users where id=p_user_id and deletion_requested_at is null) then raise exception 'account_unavailable'; end if;
  if account.version<>p_version then return jsonb_build_object('committed',false,'xpDelta',0); end if;
  if p_run_id is not null then select xp_awarded into strict run_xp from public.runs where id=p_run_id and user_id=p_user_id; end if;
  xp_delta:=(p_ledger->>'totalXp')::integer-coalesce((account.ledger->>'totalXp')::integer,0);
  if account.ledger is distinct from p_ledger then
    insert into public.progress_corrections_2026(user_id,version,previous_ledger,new_ledger) values(p_user_id,p_version,account.ledger,p_ledger);
    update public.progress_accounts_2026 set ledger=p_ledger,ledger_version=p_version where user_id=p_user_id;
    if p_run_id is not null then
      update public.runs set xp_awarded=xp_awarded+greatest(xp_delta,0) where id=p_run_id and user_id=p_user_id returning xp_awarded into run_xp;
    end if;
  else update public.progress_accounts_2026 set ledger_version=p_version where user_id=p_user_id;
  end if;
  insert into public.season_reward_ownership_2026(user_id,collection_id,reward_id,variant,ledger_version)
    select p_user_id,e.collection_id,r.reward_id,'standard',p_version
    from public.season_collection_enrollments_2026 e cross join public.season_reward_templates_2026 r
    cross join public.season_collection_rules_2026 rule
    where e.user_id=p_user_id and coalesce((p_ledger->'collections'->>e.collection_id)::integer,0)>=r.tier*rule.xp_per_tier
    on conflict do nothing;
  perform public.grant_earned_season_variants2026(p_user_id);
  perform public.grant_level_rewards_2026(p_user_id);
  return jsonb_build_object('committed',true,'xpDelta',xp_delta,'runXpAwarded',run_xp);
end $$;

create function public.equip_level_reward_2026(p_reward_id text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare owner uuid:=auth.uid(); target text;
begin
  if owner is null then raise exception 'authentication_required'; end if;
  select identity_slot into target from public.level_reward_templates_2026 where reward_id=p_reward_id;
  if target is null then raise exception 'not_an_identity_object'; end if;
  if not exists(select 1 from public.level_reward_ownership_2026 where user_id=owner and reward_id=p_reward_id) then raise exception 'reward_not_owned'; end if;
  -- L'emplacement est partagé avec les objets de saison : équiper ici LIBÈRE
  -- le même emplacement de l'autre famille, jamais deux cadres à la fois.
  delete from public.season_reward_equipment_2026 where user_id=owner
    and reward_id=(case target when 'frame' then 'profile_frame' else 'title' end);
  insert into public.level_reward_equipment_2026(user_id,slot,reward_id) values(owner,target,p_reward_id)
    on conflict(user_id,slot) do update set reward_id=excluded.reward_id,equipped_at=now();
  return jsonb_build_object('rewardId',p_reward_id,'slot',target,'equipped',true);
end $$;
create function public.unequip_level_reward_2026(p_reward_id text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  delete from public.level_reward_equipment_2026 where user_id=auth.uid() and reward_id=p_reward_id;
  return jsonb_build_object('rewardId',p_reward_id,'equipped',false);
end $$;

-- Réciproque : équiper un objet de saison libère le même emplacement de niveau.
create or replace function public.equip_season_reward_2026(p_collection_id text,p_reward_id text,p_variant text default 'standard')
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare owner uuid:=auth.uid();
begin
  if owner is null then raise exception 'authentication_required'; end if;
  perform public.ensure_progress_account_2026(owner);
  -- Ownership is permanent; expiration of Studio controls is irrelevant here.
  if not exists(select 1 from public.season_reward_ownership_2026 where user_id=owner
    and collection_id=p_collection_id and reward_id=p_reward_id and variant=p_variant) then raise exception 'reward_not_owned'; end if;
  delete from public.level_reward_equipment_2026 where user_id=owner
    and slot=(case p_reward_id when 'profile_frame' then 'frame' when 'title' then 'title' else null end);
  insert into public.season_reward_equipment_2026(user_id,collection_id,reward_id,variant)
    values(owner,p_collection_id,p_reward_id,p_variant)
    on conflict(user_id,reward_id) do update set collection_id=excluded.collection_id,variant=excluded.variant,equipped_at=now();
  return jsonb_build_object('collectionId',p_collection_id,'rewardId',p_reward_id,'variant',p_variant,'equipped',true);
end $$;

-- La lecture expose les objets de niveau POSSÉDÉS (jamais le catalogue coché) :
-- `equippable` vient de l'emplacement d'identité, pas d'une liste côté client.
create or replace function public.read_progression_2026(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare account public.progress_accounts_2026; selected text; current_day date; rule public.season_collection_rules_2026;
begin
  perform public.ensure_progress_account_2026(p_user_id);
  select * into strict account from public.progress_accounts_2026 where user_id=p_user_id;
  select * into strict rule from public.season_collection_rules_2026;
  selected:=public.selected_progress_collection_2026(p_user_id,now());
  current_day:=(now() at time zone public.progress_timezone_at_2026(p_user_id,now()))::date;
  return jsonb_build_object('ruleset','2026.1','totalXp',coalesce((account.ledger->>'totalXp')::integer,0),
    'activeDays',coalesce((select count(*) from jsonb_array_elements(account.ledger->'days') d where (d->>'eligible')::boolean),0),
    'pending',account.version<>account.ledger_version,'timeZone',public.progress_timezone_at_2026(p_user_id,now()),
    'pendingTimeZone',(select jsonb_build_object('timeZone',time_zone,'effectiveAt',effective_at) from public.progress_timezone_changes_2026 where user_id=p_user_id and effective_at>now() order by effective_at limit 1),
    'season',(select jsonb_build_object('id',c.id,'title',c.title,'startsAt',c.starts_at,'endsAt',c.ends_at,
      'activeDays',least(rule.tiers,coalesce((account.ledger->'collections'->>c.id)::integer,0)/rule.xp_per_tier),
      'stage',least(rule.tiers,coalesce((account.ledger->'collections'->>c.id)::integer,0)/rule.xp_per_tier),
      'xp',coalesce((account.ledger->'collections'->>c.id)::integer,0),'archived',c.ends_at<=now()) from public.season_collections_2026 c where c.id=selected),
    'selectedCollectionId',selected,
    'pendingSelection',(select jsonb_build_object('collectionId',s.collection_id,'effectiveDay',s.effective_day) from public.progress_collection_selections_2026 s where s.user_id=p_user_id and s.effective_day>current_day order by s.selected_at desc,s.id desc limit 1),
    'collections',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'title',c.title,'startsAt',c.starts_at,'endsAt',c.ends_at,
      'state',case when c.starts_at>now() then 'upcoming' when c.ends_at<=now() then 'archived' else 'current' end,
      'started',e.user_id is not null,'selectable',c.starts_at<=now() and (c.ends_at>now() or e.user_id is not null),
      'xp',coalesce((account.ledger->'collections'->>c.id)::integer,0),
      'stage',least(rule.tiers,coalesce((account.ledger->'collections'->>c.id)::integer,0)/rule.xp_per_tier)) order by c.starts_at desc,c.id)
      from public.season_collections_2026 c left join public.season_collection_enrollments_2026 e on e.collection_id=c.id and e.user_id=p_user_id),'[]'::jsonb),
    'ownedRewards',coalesce((select jsonb_agg(jsonb_build_object('id',o.collection_id||':'||o.reward_id||':'||o.variant,
      'collectionId',o.collection_id,'rewardId',o.reward_id,'tier',r.tier,'label',r.label,'variant',o.variant,'earnedAt',o.earned_at,
      'equipped',exists(select 1 from public.season_reward_equipment_2026 e where e.user_id=o.user_id and e.collection_id=o.collection_id and e.reward_id=o.reward_id and e.variant=o.variant)) order by o.collection_id,r.tier,o.variant)
      from public.season_reward_ownership_2026 o join public.season_reward_templates_2026 r using(reward_id) where o.user_id=p_user_id),'[]'::jsonb),
    'levelRewards',coalesce((select jsonb_agg(jsonb_build_object('id','level:'||o.reward_id,'rewardId',o.reward_id,
      'level',t.level,'label',t.label,'equippable',t.identity_slot is not null,'earnedAt',o.earned_at,
      'equipped',exists(select 1 from public.level_reward_equipment_2026 q where q.user_id=o.user_id and q.reward_id=o.reward_id)) order by t.level)
      from public.level_reward_ownership_2026 o join public.level_reward_templates_2026 t using(reward_id) where o.user_id=p_user_id),'[]'::jsonb));
end $$;

revoke all on function public.grant_level_rewards_2026(uuid) from public,anon,authenticated;
grant execute on function public.grant_level_rewards_2026(uuid) to service_role;
revoke all on function public.equip_level_reward_2026(text),public.unequip_level_reward_2026(text) from public,anon;
grant execute on function public.equip_level_reward_2026(text),public.unequip_level_reward_2026(text) to authenticated;
