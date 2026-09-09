-- Cahier §7.1/§7.3 : `season.activeDays` et `season.stage` étaient la MÊME
-- expression dans 0121 (`least(tiers, collectionXp / xpPerTier)`), donc le même
-- nombre affiché deux fois — et surtout une DISPARITION : les journées actives
-- au-delà du budget hebdomadaire de trois n'existaient nulle part, alors que le
-- cahier dit explicitement que ce plafond « n'est pas une limite de sorties ».
--
-- `activeDays` compte désormais les journées RÉELLEMENT ACTIVES rattachées à la
-- collection : au moins dix minutes de mouvement admissible (`eligible`), qu'un
-- palier ait été crédité ou non. `stage` reste le nombre de paliers acquis. Les
-- deux peuvent diverger, et c'est précisément l'information qui manquait.
-- Requiert 0121 et 0144 (la lecture est ré-émise en entier, objets de niveau
-- compris : une fonction SQL ne se remplace pas par morceaux).

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
      'activeDays',coalesce((select count(*) from jsonb_array_elements(account.ledger->'days') d
        where d->>'collectionId'=c.id and (d->>'eligible')::boolean),0),
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
