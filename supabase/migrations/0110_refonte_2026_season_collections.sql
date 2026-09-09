-- September §§6.6,7,16.3: one dated collection, permanent earned objects.
-- Requires 0108 (sporting ledger) and 0109 (server-verified GRYD+ rights).
-- No season/date is invented here. Operations publish an actual calendar with
-- configure_season_collection_2026; there is no reset of sporting or map data.

create table public.season_collection_rules_2026 (
  singleton boolean primary key default true check(singleton),
  weeks integer not null, tiers integer not null, xp_per_tier integer not null,
  premium_tiers integer[] not null
);
-- Frozen SQL snapshot of PROGRESSION_RULES_2026; drift tested against shared.
insert into public.season_collection_rules_2026 values(true,6,12,100,array[2,4,6,8,10,12]);

create table public.season_collections_2026 (
  id text primary key, title text not null check(length(title) between 1 and 80),
  time_zone text not null, starts_at timestamptz not null, ends_at timestamptz not null,
  published_at timestamptz not null default now(), check(ends_at>starts_at)
);
create table public.season_reward_templates_2026 (
  reward_id text primary key, tier integer not null unique check(tier>0), label text not null
);
-- Frozen SEASON_REWARDS_2026 identifiers; objects, never fabricated activities.
insert into public.season_reward_templates_2026 values
  ('season_poster',1,'Première affiche'),('participation_badge',2,'Badge de participation'),
  ('trace_pattern',3,'Motif de trace'),('profile_frame',4,'Cadre de saison'),
  ('sticker',5,'Sticker'),('title',6,'Titre de saison'),
  ('photo_composition',7,'Composition photo ou typographique'),('personal_emblem',8,'Emblème personnel'),
  ('short_animation',9,'Animation courte'),('recap',10,'Récap personnel ou collectif'),
  ('final_poster',11,'Affiche de fin'),('season_memory',12,'Souvenir complet');

alter table public.progress_accounts_2026
  add column initial_collection_id text references public.season_collections_2026(id),
  add column initial_collection_effective_at timestamptz,
  add column ledger_version bigint not null default -1;
create table public.progress_timezone_changes_2026 (
  user_id uuid not null references public.users(id) on delete cascade,
  time_zone text not null, requested_at timestamptz not null, effective_at timestamptz not null,
  primary key(user_id,effective_at), check(effective_at>requested_at)
);
create table public.season_collection_enrollments_2026 (
  user_id uuid not null references public.users(id) on delete cascade,
  collection_id text not null references public.season_collections_2026(id),
  started_at timestamptz not null default now(), primary key(user_id,collection_id)
);
create table public.progress_collection_selections_2026 (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  collection_id text not null references public.season_collections_2026(id),
  selected_at timestamptz not null, effective_day date not null,
  unique(user_id,selected_at)
);
create index progress_collection_selections_user_day_2026
  on public.progress_collection_selections_2026(user_id,effective_day,selected_at);
create table public.season_reward_ownership_2026 (
  user_id uuid not null references public.users(id) on delete cascade,
  collection_id text not null references public.season_collections_2026(id),
  reward_id text not null references public.season_reward_templates_2026(reward_id),
  variant text not null check(variant in('standard','premium')),
  earned_at timestamptz not null default now(), ledger_version bigint not null,
  primary key(user_id,collection_id,reward_id,variant)
);
create table public.season_reward_equipment_2026 (
  user_id uuid not null, collection_id text not null, reward_id text not null, variant text not null,
  equipped_at timestamptz not null default now(), primary key(user_id,reward_id),
  foreign key(user_id,collection_id,reward_id,variant)
    references public.season_reward_ownership_2026(user_id,collection_id,reward_id,variant) on delete cascade
);

alter table public.season_collection_rules_2026 enable row level security;
alter table public.season_collections_2026 enable row level security;
alter table public.season_reward_templates_2026 enable row level security;
alter table public.progress_timezone_changes_2026 enable row level security;
alter table public.season_collection_enrollments_2026 enable row level security;
alter table public.progress_collection_selections_2026 enable row level security;
alter table public.season_reward_ownership_2026 enable row level security;
alter table public.season_reward_equipment_2026 enable row level security;
revoke all on public.season_collection_rules_2026,public.season_collections_2026,
  public.season_reward_templates_2026,public.progress_timezone_changes_2026,
  public.season_collection_enrollments_2026,public.progress_collection_selections_2026,
  public.season_reward_ownership_2026,public.season_reward_equipment_2026 from public,anon,authenticated;
grant all on public.season_collection_rules_2026,public.season_collections_2026,
  public.season_reward_templates_2026,public.progress_timezone_changes_2026,
  public.season_collection_enrollments_2026,public.progress_collection_selections_2026,
  public.season_reward_ownership_2026,public.season_reward_equipment_2026 to service_role;

create function public.configure_season_collection_2026(p_id text,p_title text,p_starts_at timestamptz,p_time_zone text default 'Europe/Paris')
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare ends timestamptz; existing public.season_collections_2026; rule public.season_collection_rules_2026;
begin
  if p_id is null or p_id !~ '^[a-z0-9][a-z0-9_-]{1,63}$' or p_title is null or length(p_title) not between 1 and 80
    or p_starts_at is null or not isfinite(p_starts_at)
    or not exists(select 1 from pg_timezone_names where name=p_time_zone) then raise exception 'invalid_season'; end if;
  select * into strict rule from public.season_collection_rules_2026;
  ends:=((p_starts_at at time zone p_time_zone)+make_interval(weeks=>rule.weeks)) at time zone p_time_zone;
  perform pg_advisory_xact_lock(hashtextextended('season_calendar_2026',0));
  select * into existing from public.season_collections_2026 where id=p_id;
  if found then
    if existing.starts_at<>p_starts_at or existing.time_zone<>p_time_zone or existing.title<>p_title then
      raise exception 'published_season_is_immutable';
    end if;
    return to_jsonb(existing);
  end if;
  if exists(select 1 from public.season_collections_2026 where tstzrange(starts_at,ends_at,'[)') && tstzrange(p_starts_at,ends,'[)')) then
    raise exception 'overlapping_season';
  end if;
  insert into public.season_collections_2026(id,title,time_zone,starts_at,ends_at)
    values(p_id,p_title,p_time_zone,p_starts_at,ends) returning * into existing;
  return to_jsonb(existing);
end $$;

create function public.ensure_progress_account_2026(p_user_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare account public.progress_accounts_2026; season public.season_collections_2026; created timestamptz;
begin
  select created_at into strict created from public.users where id=p_user_id and deletion_requested_at is null;
  insert into public.progress_accounts_2026(user_id) values(p_user_id) on conflict do nothing;
  select * into strict account from public.progress_accounts_2026 where user_id=p_user_id for update;
  if account.initial_collection_id is null then
    select * into season from public.season_collections_2026 where starts_at<=now() and ends_at>now() order by starts_at,id limit 1;
    if found then
      update public.progress_accounts_2026 set initial_collection_id=season.id,
        initial_collection_effective_at=greatest(created,season.starts_at),version=version+1 where user_id=p_user_id;
      insert into public.season_collection_enrollments_2026(user_id,collection_id) values(p_user_id,season.id) on conflict do nothing;
    end if;
  end if;
end $$;

create function public.progress_timezone_at_2026(p_user_id uuid,p_at timestamptz)
returns text language sql stable security definer set search_path=public,pg_temp as $$
  select coalesce((select t.time_zone from public.progress_timezone_changes_2026 t
    where t.user_id=p_user_id and t.effective_at<=p_at order by t.effective_at desc limit 1),p.initial_timezone)
  from public.progress_accounts_2026 p where p.user_id=p_user_id;
$$;
create function public.selected_progress_collection_2026(p_user_id uuid,p_at timestamptz)
returns text language sql stable security definer set search_path=public,pg_temp as $$
  select coalesce((select s.collection_id from public.progress_collection_selections_2026 s
    where s.user_id=p_user_id and s.effective_day<=(p_at at time zone public.progress_timezone_at_2026(p_user_id,p_at))::date
    order by s.selected_at desc,s.id desc limit 1),p.initial_collection_id)
  from public.progress_accounts_2026 p where p.user_id=p_user_id;
$$;

create function public.select_progress_collection_2026(p_collection_id text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare owner uuid:=auth.uid(); chosen public.season_collections_2026; requested timestamptz:=clock_timestamp(); effective date; latest text;
begin
  if owner is null then raise exception 'authentication_required'; end if;
  perform public.ensure_progress_account_2026(owner);
  perform 1 from public.progress_accounts_2026 where user_id=owner for update;
  select * into strict chosen from public.season_collections_2026 where id=p_collection_id and starts_at<=requested;
  if chosen.ends_at<=requested and not exists(select 1 from public.season_collection_enrollments_2026 where user_id=owner and collection_id=chosen.id) then
    raise exception 'archive_not_started';
  end if;
  effective:=(requested at time zone public.progress_timezone_at_2026(owner,requested))::date+1;
  select collection_id into latest from public.progress_collection_selections_2026 where user_id=owner order by selected_at desc,id desc limit 1;
  if coalesce(latest,public.selected_progress_collection_2026(owner,requested))=chosen.id then
    return jsonb_build_object('collectionId',chosen.id,'changed',false,'effectiveDay',
      (select effective_day from public.progress_collection_selections_2026 where user_id=owner order by selected_at desc,id desc limit 1));
  end if;
  insert into public.season_collection_enrollments_2026(user_id,collection_id) values(owner,chosen.id) on conflict do nothing;
  insert into public.progress_collection_selections_2026(user_id,collection_id,selected_at,effective_day) values(owner,chosen.id,requested,effective);
  update public.progress_accounts_2026 set version=version+1 where user_id=owner;
  return jsonb_build_object('collectionId',chosen.id,'changed',true,'effectiveDay',effective);
end $$;

create function public.set_progress_timezone_2026(p_time_zone text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare owner uuid:=auth.uid(); requested timestamptz:=clock_timestamp(); current_zone text; effective timestamptz;
begin
  if owner is null then raise exception 'authentication_required'; end if;
  if p_time_zone is null or (p_time_zone<>'UTC' and p_time_zone not like '%/%') or p_time_zone like 'posix/%' or p_time_zone like 'right/%'
    or not exists(select 1 from pg_timezone_names where name=p_time_zone) then raise exception 'invalid_timezone'; end if;
  perform public.ensure_progress_account_2026(owner);
  perform 1 from public.progress_accounts_2026 where user_id=owner for update;
  current_zone:=public.progress_timezone_at_2026(owner,requested);
  effective:=(date_trunc('week',requested at time zone current_zone)+interval '1 week') at time zone current_zone;
  if current_zone=p_time_zone then
    delete from public.progress_timezone_changes_2026 where user_id=owner and effective_at>requested;
    if found then update public.progress_accounts_2026 set version=version+1 where user_id=owner; end if;
    return jsonb_build_object('timeZone',current_zone,'effectiveAt',null);
  end if;
  insert into public.progress_timezone_changes_2026 values(owner,p_time_zone,requested,effective)
    on conflict(user_id,effective_at) do update set time_zone=excluded.time_zone,requested_at=excluded.requested_at;
  update public.progress_accounts_2026 set version=version+1 where user_id=owner;
  return jsonb_build_object('timeZone',p_time_zone,'effectiveAt',effective);
end $$;

create function public.equip_season_reward_2026(p_collection_id text,p_reward_id text,p_variant text default 'standard')
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare owner uuid:=auth.uid();
begin
  if owner is null then raise exception 'authentication_required'; end if;
  perform public.ensure_progress_account_2026(owner);
  -- Ownership is permanent; expiration of Studio controls is irrelevant here.
  if not exists(select 1 from public.season_reward_ownership_2026 where user_id=owner
    and collection_id=p_collection_id and reward_id=p_reward_id and variant=p_variant) then raise exception 'reward_not_owned'; end if;
  insert into public.season_reward_equipment_2026(user_id,collection_id,reward_id,variant)
    values(owner,p_collection_id,p_reward_id,p_variant)
    on conflict(user_id,reward_id) do update set collection_id=excluded.collection_id,variant=excluded.variant,equipped_at=now();
  return jsonb_build_object('collectionId',p_collection_id,'rewardId',p_reward_id,'variant',p_variant,'equipped',true);
end $$;
create function public.unequip_season_reward_2026(p_reward_id text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  delete from public.season_reward_equipment_2026 where user_id=auth.uid() and reward_id=p_reward_id;
  return jsonb_build_object('rewardId',p_reward_id,'equipped',false);
end $$;

create or replace function public.record_progress_evidence_2026(p_run_id uuid,p_evidence jsonb)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare owner uuid;
begin
  select user_id into strict owner from public.runs where id=p_run_id and ruleset_version='2026.1';
  perform public.ensure_progress_account_2026(owner);
  perform 1 from public.progress_accounts_2026 where user_id=owner for update;
  insert into public.progress_activity_2026 values(p_run_id,owner,p_evidence)
    on conflict(run_id) do update set evidence=excluded.evidence where progress_activity_2026.evidence is distinct from excluded.evidence;
  if found then update public.progress_accounts_2026 set version=version+1 where user_id=owner; end if;
end $$;

-- A removed source invalidates the ledger even if the runner records nothing
-- else afterwards. The authenticated refresh recomputes it from the remaining
-- complete history; it cannot present a stale total as confirmed meanwhile.
create function public.invalidate_removed_progress_evidence_2026()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  update public.progress_accounts_2026 set version=version+1 where user_id=old.user_id;
  return old;
end $$;
create trigger invalidate_removed_progress_evidence_2026
  after delete on public.progress_activity_2026 for each row
  execute function public.invalidate_removed_progress_evidence_2026();
revoke all on function public.invalidate_removed_progress_evidence_2026() from public,anon,authenticated;

create or replace function public.progress_snapshot_2026(p_user_id uuid)
returns jsonb language plpgsql volatile security definer set search_path=public,pg_temp as $$
begin
  perform public.ensure_progress_account_2026(p_user_id);
  return (select jsonb_build_object('version',p.version,'accountCreatedAt',u.created_at,
    'initialTimeZone',p.initial_timezone,'initialCollectionId',p.initial_collection_id,
    'initialCollectionEffectiveAt',p.initial_collection_effective_at,'previousLedger',p.ledger,
    'timezoneChanges',coalesce((select jsonb_agg(jsonb_build_object('timeZone',t.time_zone,'requestedAt',t.requested_at,'effectiveAt',t.effective_at) order by t.effective_at) from public.progress_timezone_changes_2026 t where t.user_id=p.user_id),'[]'::jsonb),
    'collectionSelections',coalesce((select jsonb_agg(jsonb_build_object('collectionId',s.collection_id,'selectedAt',s.selected_at) order by s.selected_at,s.id) from public.progress_collection_selections_2026 s where s.user_id=p.user_id),'[]'::jsonb),
    'activities',coalesce((select jsonb_agg(e.evidence order by e.run_id) from public.progress_activity_2026 e where e.user_id=p.user_id),'[]'::jsonb))
    from public.progress_accounts_2026 p join public.users u on u.id=p.user_id where p.user_id=p_user_id);
end $$;

create function public.grant_earned_season_variants2026(p_user_id uuid)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare added integer;
begin
  if not public.has_gryd_plus_access_2026(p_user_id) or not exists(select 1 from public.users where id=p_user_id and deletion_requested_at is null) then return 0; end if;
  perform 1 from public.progress_accounts_2026 where user_id=p_user_id for update;
  insert into public.season_reward_ownership_2026(user_id,collection_id,reward_id,variant,ledger_version)
    select p.user_id,c.id,r.reward_id,'premium',p.ledger_version from public.progress_accounts_2026 p
    join public.season_collection_enrollments_2026 e on e.user_id=p.user_id
    join public.season_collections_2026 c on c.id=e.collection_id
    cross join public.season_reward_templates_2026 r cross join public.season_collection_rules_2026 rule
    where p.user_id=p_user_id and p.version=p.ledger_version and r.tier=any(rule.premium_tiers)
      and coalesce((p.ledger->'collections'->>c.id)::integer,0)>=r.tier*rule.xp_per_tier
      and (c.id=public.selected_progress_collection_2026(p_user_id,now()) or (c.starts_at<=now() and c.ends_at>now()))
    on conflict do nothing;
  get diagnostics added=row_count;
  return added;
end $$;

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
  return jsonb_build_object('committed',true,'xpDelta',xp_delta,'runXpAwarded',run_xp);
end $$;

create function public.read_progression_2026(p_user_id uuid)
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
      from public.season_reward_ownership_2026 o join public.season_reward_templates_2026 r using(reward_id) where o.user_id=p_user_id),'[]'::jsonb));
end $$;
create or replace function public.get_progression_2026()
returns jsonb language plpgsql volatile security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  return public.read_progression_2026(auth.uid());
end $$;

revoke all on function public.configure_season_collection_2026(text,text,timestamptz,text),public.ensure_progress_account_2026(uuid),
  public.progress_timezone_at_2026(uuid,timestamptz),public.selected_progress_collection_2026(uuid,timestamptz),
  public.grant_earned_season_variants2026(uuid),public.read_progression_2026(uuid) from public,anon,authenticated;
grant execute on function public.configure_season_collection_2026(text,text,timestamptz,text),public.ensure_progress_account_2026(uuid),
  public.progress_timezone_at_2026(uuid,timestamptz),public.selected_progress_collection_2026(uuid,timestamptz),
  public.grant_earned_season_variants2026(uuid),public.read_progression_2026(uuid) to service_role;
revoke all on function public.select_progress_collection_2026(text),public.set_progress_timezone_2026(text),public.get_progression_2026() from public,anon;
grant execute on function public.select_progress_collection_2026(text),public.set_progress_timezone_2026(text),public.get_progression_2026() to authenticated;
revoke all on function public.equip_season_reward_2026(text,text,text),public.unequip_season_reward_2026(text) from public,anon;
grant execute on function public.equip_season_reward_2026(text,text,text),public.unequip_season_reward_2026(text) to authenticated;
