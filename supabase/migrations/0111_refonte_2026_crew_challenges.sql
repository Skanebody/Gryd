-- September §§6,18: voluntary 5v5, immutable geography/roster, physical days.
-- Constants are a frozen CHALLENGE_RULES_2026 snapshot, verified by PGlite.
-- No arena, invitation, player or activity is seeded in production.
create table public.challenge_rules_2026 (
  singleton boolean primary key default true check(singleton),players integer not null,
  days integer not null,sectors integer not null,maximum_days integer not null,points integer not null,
  run_metres integer not null,bike_metres integer not null,sync_hours integer not null,publication_hour integer not null,
  manager_roles text[] not null,win_points numeric not null,tie_points numeric not null
);
insert into public.challenge_rules_2026 values(true,5,7,3,2,3,400,1000,24,12,array['co_captain','founder'],1,0.5);
-- The legacy block UI stores a pseudo. Resolve it to a stable identity once,
-- so renaming a profile cannot reopen invitations from a blocked account.
create table public.challenge_identity_blocks_2026 (
  blocker_id uuid not null references public.users(id) on delete cascade,
  blocked_user_id uuid not null references public.users(id) on delete cascade,
  source_pseudo text not null,primary key(blocker_id,source_pseudo)
);
insert into public.challenge_identity_blocks_2026
  select b.blocker_id,u.id,b.blocked_pseudo from public.user_blocks b join public.users u on lower(u.pseudo)=lower(b.blocked_pseudo)
  on conflict do nothing;
create table public.challenge_arenas_2026 (
  id text primary key,title text not null,activity text not null check(activity in('run','bike')),
  time_zone text not null,sectors jsonb not null,access_source text not null,reviewed_at timestamptz not null,
  created_at timestamptz not null default now(),retired_at timestamptz
);
create table public.crew_challenges_2026 (
  id uuid primary key default gen_random_uuid(),client_id uuid not null,created_by uuid references public.users(id) on delete set null,
  arena_id text not null references public.challenge_arenas_2026(id),title text not null,
  activity text not null check(activity in('run','bike')),time_zone text not null,
  starts_at timestamptz not null,ends_at timestamptz not null,ranked_week date not null,sectors jsonb not null,
  status text not null default 'invited' check(status in('invited','assembling','scheduled','active','final','cancelled')),
  reason text,created_at timestamptz not null default now(),unique(created_by,client_id),check(ends_at>starts_at)
);
create table public.challenge_teams_2026 (
  challenge_id uuid not null references public.crew_challenges_2026(id) on delete cascade,
  crew_id uuid not null references public.crews(id) on delete restrict,side integer not null check(side in(0,1)),
  accepted_at timestamptz,access_confirmed_at timestamptz,locked_at timestamptz,
  primary key(challenge_id,crew_id),unique(challenge_id,side)
);
create table public.challenge_roster_2026 (
  challenge_id uuid not null,crew_id uuid not null,player_id uuid not null,
  user_id uuid references public.users(id) on delete set null,
  activity text not null,ranked_week date not null,reserved boolean not null default true,
  consent boolean not null,consented_at timestamptz not null default now(),
  primary key(challenge_id,player_id),
  foreign key(challenge_id,crew_id) references public.challenge_teams_2026(challenge_id,crew_id) on delete cascade
);
create unique index challenge_one_team_per_sport_week_2026 on public.challenge_roster_2026(user_id,activity,ranked_week) where reserved and user_id is not null;
create table public.challenge_preferences_2026 (
  id bigint generated always as identity primary key,challenge_id uuid not null,player_id uuid not null,
  sector_id text not null,recorded_at timestamptz not null default clock_timestamp(),
  foreign key(challenge_id,player_id) references public.challenge_roster_2026(challenge_id,player_id) on delete cascade
);
create table public.challenge_contributions_2026 (
  challenge_id uuid not null,player_id uuid not null,crew_id uuid not null,day date not null,
  run_id uuid references public.runs(id) on delete set null,activity_key uuid not null,event_id uuid not null,
  sector_id text not null,closed_at timestamptz not null,received_at timestamptz not null,
  validated_at timestamptz not null default clock_timestamp(),withdrawn boolean not null default false,
  used_fallback boolean not null,
  primary key(challenge_id,player_id,day),unique(challenge_id,player_id,activity_key),
  foreign key(challenge_id,player_id) references public.challenge_roster_2026(challenge_id,player_id) on delete cascade
);
create table public.challenge_publications_2026 (
  challenge_id uuid not null references public.crew_challenges_2026(id) on delete cascade,
  cutoff_at timestamptz not null,revision integer not null default 1,result jsonb not null,
  published_at timestamptz not null default now(),primary key(challenge_id,cutoff_at,revision)
);

do $$ declare t text; begin
  foreach t in array array['challenge_rules_2026','challenge_identity_blocks_2026','challenge_arenas_2026','crew_challenges_2026','challenge_teams_2026','challenge_roster_2026','challenge_preferences_2026','challenge_contributions_2026','challenge_publications_2026'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated',t);
    execute format('grant all on public.%I to service_role',t);
  end loop;
end $$;

create function public.remember_challenge_block_2026()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if tg_op in('UPDATE','DELETE') then
    delete from public.challenge_identity_blocks_2026 where blocker_id=old.blocker_id and source_pseudo=old.blocked_pseudo;
  end if;
  if tg_op='DELETE' then return old; end if;
  insert into public.challenge_identity_blocks_2026
    select new.blocker_id,id,new.blocked_pseudo from public.users where lower(pseudo)=lower(new.blocked_pseudo)
    on conflict(blocker_id,source_pseudo) do update set blocked_user_id=excluded.blocked_user_id;
  return new;
end $$;
create trigger remember_challenge_block_2026 after insert or update or delete on public.user_blocks
  for each row execute function public.remember_challenge_block_2026();

create function public.challenge_manager_2026(p_user uuid,p_crew uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select exists(select 1 from public.crew_members m join public.users u on u.id=m.user_id cross join public.challenge_rules_2026 r
    where m.user_id=p_user and m.crew_id=p_crew and m.left_at is null and m.role=any(r.manager_roles) and u.deletion_requested_at is null);
$$;
create function public.challenge_pair_blocked_2026(p_a uuid,p_b uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select exists(select 1 from public.challenge_identity_blocks_2026 b where (b.blocker_id=p_a and b.blocked_user_id=p_b) or (b.blocker_id=p_b and b.blocked_user_id=p_a))
    or exists(select 1 from public.user_blocks b join public.users u on lower(u.pseudo)=lower(b.blocked_pseudo)
    where (b.blocker_id=p_a and u.id=p_b) or (b.blocker_id=p_b and u.id=p_a));
$$;
create function public.challenge_has_block_2026(p_challenge uuid,p_user uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select exists(select 1 from public.challenge_teams_2026 t join public.crew_members m on m.crew_id=t.crew_id and m.left_at is null
    where t.challenge_id=p_challenge and public.challenge_pair_blocked_2026(p_user,m.user_id))
    or exists(select 1 from public.challenge_roster_2026 r where r.challenge_id=p_challenge and public.challenge_pair_blocked_2026(p_user,r.user_id));
$$;

-- Operations publish geography only after reviewing practical access for this
-- sport. PostGIS executes on the real server; this function is not spatially
-- validated by the PGlite lifecycle tests.
create function public.configure_challenge_arena_2026(p_id text,p_title text,p_activity text,p_time_zone text,p_sectors jsonb,p_access_source text,p_reviewed_at timestamptz)
returns void language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare sector jsonb; good boolean; r public.challenge_rules_2026;
begin
  select * into strict r from public.challenge_rules_2026;
  if nullif(p_id,'') is null or nullif(p_title,'') is null or p_activity not in('run','bike') or nullif(p_access_source,'') is null
    or p_reviewed_at is null or p_reviewed_at>now() or not exists(select 1 from pg_timezone_names where name=p_time_zone)
    or jsonb_typeof(p_sectors)<>'array' or jsonb_array_length(p_sectors)<>r.sectors then raise exception 'invalid_arena'; end if;
  if (select count(distinct s->>'id') from jsonb_array_elements(p_sectors) s)<>r.sectors then raise exception 'invalid_sectors'; end if;
  for sector in select value from jsonb_array_elements(p_sectors) loop
    if nullif(sector->>'id','') is null or nullif(sector->>'title','') is null then raise exception 'invalid_sector'; end if;
    execute 'select ST_IsValid(g) and not ST_IsEmpty(g) and ST_GeometryType(g) in (''ST_Polygon'',''ST_MultiPolygon'') from (select ST_SetSRID(ST_GeomFromGeoJSON($1),4326) g) q'
      into good using sector->'geometry';
    if good is distinct from true then raise exception 'invalid_sector_geometry'; end if;
  end loop;
  -- Immutable after publication; retire and publish a new reviewed version.
  insert into public.challenge_arenas_2026 values(p_id,p_title,p_activity,p_time_zone,p_sectors,p_access_source,p_reviewed_at,now(),null);
end $$;

create function public.list_challenge_arenas_2026(p_activity text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id',id,'title',title,'activity',activity,'timeZone',time_zone,
    'sectors',sectors,'accessSource',access_source,'reviewedAt',reviewed_at) order by id)
    from public.challenge_arenas_2026 where activity=p_activity and retired_at is null),'[]');
end $$;

create function public.create_crew_challenge_2026(p_client_id uuid,p_opponent_crew_id uuid,p_arena_id text,p_starts_at timestamptz,p_access_confirmed boolean)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare owner uuid:=auth.uid(); own_crew uuid; a public.challenge_arenas_2026; c public.crew_challenges_2026; r public.challenge_rules_2026; local_start timestamp;
begin
  if owner is null then raise exception 'authentication_required'; end if;
  select m.crew_id into strict own_crew from public.crew_members m where m.user_id=owner and m.left_at is null;
  if not public.challenge_manager_2026(owner,own_crew) then raise exception 'direction_required'; end if;
  perform pg_advisory_xact_lock(hashtextextended('challenge_invite:'||owner,0));
  select * into c from public.crew_challenges_2026 where created_by=owner and client_id=p_client_id;
  if found then return jsonb_build_object('id',c.id,'status',c.status,'replayed',true); end if;
  select * into strict a from public.challenge_arenas_2026 where id=p_arena_id and retired_at is null;
  select * into strict r from public.challenge_rules_2026;
  local_start:=p_starts_at at time zone a.time_zone;
  if p_client_id is null or p_access_confirmed is distinct from true or p_starts_at is null or p_starts_at<=now()
    or local_start<>date_trunc('week',local_start) or own_crew=p_opponent_crew_id
    or not exists(select 1 from public.crew_members m where m.crew_id=p_opponent_crew_id and public.challenge_manager_2026(m.user_id,m.crew_id)) then raise exception 'challenge_unavailable'; end if;
  if exists(select 1 from public.crew_members m where m.crew_id=p_opponent_crew_id and m.left_at is null and public.challenge_pair_blocked_2026(owner,m.user_id)) then raise exception 'challenge_unavailable'; end if;
  insert into public.crew_challenges_2026(client_id,created_by,arena_id,title,activity,time_zone,starts_at,ends_at,ranked_week,sectors)
    values(p_client_id,owner,a.id,a.title,a.activity,a.time_zone,p_starts_at,(local_start+make_interval(days=>r.days)) at time zone a.time_zone,local_start::date,a.sectors) returning * into c;
  insert into public.challenge_teams_2026 values(c.id,own_crew,0,now(),now(),null),(c.id,p_opponent_crew_id,1,null,null,null);
  return jsonb_build_object('id',c.id,'status',c.status,'replayed',false);
end $$;

create function public.accept_crew_challenge_2026(p_challenge_id uuid,p_access_confirmed boolean)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.crew_challenges_2026; own_crew uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select * into strict c from public.crew_challenges_2026 where id=p_challenge_id for update;
  select crew_id into strict own_crew from public.challenge_teams_2026 where challenge_id=c.id and side=1 and public.challenge_manager_2026(auth.uid(),crew_id);
  if c.starts_at<=now() or c.status not in('invited','assembling') or p_access_confirmed is distinct from true or public.challenge_has_block_2026(c.id,auth.uid()) then raise exception 'challenge_unavailable'; end if;
  update public.challenge_teams_2026 set accepted_at=coalesce(accepted_at,now()),access_confirmed_at=coalesce(access_confirmed_at,now()) where challenge_id=c.id and crew_id=own_crew;
  update public.crew_challenges_2026 set status='assembling' where id=c.id;
  return jsonb_build_object('id',c.id,'status','assembling');
end $$;

create function public.join_crew_challenge_2026(p_challenge_id uuid,p_consent boolean)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.crew_challenges_2026; team uuid; r public.challenge_rules_2026; existing public.challenge_roster_2026;
begin
  if auth.uid() is null or p_consent is null then raise exception 'authentication_required'; end if;
  select * into strict c from public.crew_challenges_2026 where id=p_challenge_id for update;
  if p_consent and c.status in('cancelled','final') then raise exception 'challenge_closed'; end if;
  select * into existing from public.challenge_roster_2026 where challenge_id=c.id and user_id=auth.uid();
  if not p_consent then
    -- A non-participant cannot unlock or cancel someone else's scheduled team.
    if existing.user_id is null then return jsonb_build_object('id',c.id,'joined',false); end if;
    if c.starts_at>now() then
      delete from public.challenge_roster_2026 where challenge_id=c.id and user_id=auth.uid();
      update public.challenge_teams_2026 set locked_at=null where challenge_id=c.id and crew_id=existing.crew_id;
      if c.status='scheduled' then update public.crew_challenges_2026 set status='assembling' where id=c.id; end if;
    else
      update public.challenge_roster_2026 set consent=false where challenge_id=c.id and user_id=auth.uid();
      update public.challenge_contributions_2026 set withdrawn=true where challenge_id=c.id and player_id=existing.player_id;
      perform public.maintain_challenge_2026(c.id);
    end if;
    return jsonb_build_object('id',c.id,'joined',false);
  end if;
  if public.challenge_has_block_2026(c.id,auth.uid()) or not exists(select 1 from public.users where id=auth.uid() and deletion_requested_at is null) then raise exception 'challenge_unavailable'; end if;
  if existing.user_id is not null then
    update public.challenge_roster_2026 set consent=true,consented_at=case when consent then consented_at else now() end where challenge_id=c.id and user_id=auth.uid();
    return jsonb_build_object('id',c.id,'joined',true);
  end if;
  if c.starts_at<=now() or c.status='scheduled' then raise exception 'roster_locked'; end if;
  select t.crew_id into strict team from public.challenge_teams_2026 t join public.crew_members m on m.crew_id=t.crew_id
    where t.challenge_id=c.id and m.user_id=auth.uid() and m.left_at is null and t.accepted_at is not null and t.locked_at is null;
  select * into strict r from public.challenge_rules_2026;
  if (select count(*) from public.challenge_roster_2026 where challenge_id=c.id and crew_id=team)>=r.players then raise exception 'team_full'; end if;
  perform pg_advisory_xact_lock(hashtextextended('challenge_player:'||auth.uid()::text||':'||c.activity,0));
  if exists(select 1 from public.challenge_roster_2026 p join public.crew_challenges_2026 prior on prior.id=p.challenge_id
    where p.user_id=auth.uid() and p.activity=c.activity and p.reserved
      and (p.ranked_week=c.ranked_week or tstzrange(prior.starts_at,prior.ends_at,'[)') && tstzrange(c.starts_at,c.ends_at,'[)'))) then raise exception 'player_already_registered'; end if;
  insert into public.challenge_roster_2026(challenge_id,crew_id,player_id,user_id,activity,ranked_week,consent)
    values(c.id,team,auth.uid(),auth.uid(),c.activity,c.ranked_week,true);
  return jsonb_build_object('id',c.id,'joined',true);
end $$;

create function public.lock_crew_challenge_2026(p_challenge_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.crew_challenges_2026; team uuid; r public.challenge_rules_2026;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select * into strict c from public.crew_challenges_2026 where id=p_challenge_id for update;
  select crew_id into strict team from public.challenge_teams_2026 where challenge_id=c.id and public.challenge_manager_2026(auth.uid(),crew_id) and accepted_at is not null;
  select * into strict r from public.challenge_rules_2026;
  if c.starts_at<=now() or c.status not in('assembling','scheduled') or public.challenge_has_block_2026(c.id,auth.uid())
    or exists(select 1 from public.challenge_roster_2026 p where p.challenge_id=c.id and public.challenge_has_block_2026(c.id,p.user_id)) then raise exception 'challenge_unavailable'; end if;
  if (select count(*) from public.challenge_roster_2026 p join public.crew_members m on m.crew_id=p.crew_id and m.user_id=p.user_id and m.left_at is null
      join public.users u on u.id=p.user_id where p.challenge_id=c.id and p.crew_id=team and p.consent and u.deletion_requested_at is null)<>r.players then raise exception 'five_volunteers_required'; end if;
  update public.challenge_teams_2026 set locked_at=coalesce(locked_at,now()) where challenge_id=c.id and crew_id=team;
  if not exists(select 1 from public.challenge_teams_2026 where challenge_id=c.id and locked_at is null) then update public.crew_challenges_2026 set status='scheduled' where id=c.id; end if;
  return (select jsonb_build_object('id',id,'status',status) from public.crew_challenges_2026 where id=c.id);
end $$;

create function public.cancel_crew_challenge_2026(p_challenge_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.crew_challenges_2026;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select * into strict c from public.crew_challenges_2026 where id=p_challenge_id for update;
  if not exists(select 1 from public.challenge_teams_2026 where challenge_id=c.id and public.challenge_manager_2026(auth.uid(),crew_id)) then raise exception 'direction_required'; end if;
  if c.starts_at<=now() then raise exception 'challenge_started'; end if;
  update public.crew_challenges_2026 set status='cancelled',reason='cancelled_before_start' where id=c.id;
  update public.challenge_roster_2026 set reserved=false where challenge_id=c.id;
  return jsonb_build_object('id',c.id,'status','cancelled');
end $$;

create function public.set_challenge_preference_2026(p_challenge_id uuid,p_sector_id text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.crew_challenges_2026; recorded timestamptz:=clock_timestamp();
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select * into strict c from public.crew_challenges_2026 where id=p_challenge_id;
  if c.status in('cancelled','final') or now()>=c.ends_at or not exists(select 1 from public.challenge_roster_2026 where challenge_id=c.id and user_id=auth.uid() and consent)
    or not exists(select 1 from jsonb_array_elements(c.sectors) s where s->>'id'=p_sector_id) then raise exception 'preference_unavailable'; end if;
  insert into public.challenge_preferences_2026(challenge_id,player_id,sector_id,recorded_at) values(c.id,auth.uid(),p_sector_id,recorded);
  return jsonb_build_object('sectorId',p_sector_id,'recordedAt',recorded);
end $$;

-- Called only after server geometry/provenance validation. No public writer can
-- supply metres, timestamps or points. Sector order is the published JSON order.
create function public.assign_challenge_loop_2026(p_run_id uuid,p_event_id uuid,p_closed_at timestamptz,p_sector_metres jsonb)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare run public.runs; c public.crew_challenges_2026; roster public.challenge_roster_2026; r public.challenge_rules_2026;
  sector text; preferred text; minimum integer;
begin
  select * into strict run from public.runs where id=p_run_id and ruleset_version='2026.1';
  select * into strict r from public.challenge_rules_2026;
  minimum:=case when run.activity='run' then r.run_metres else r.bike_metres end;
  for roster in select * from public.challenge_roster_2026 where user_id=run.user_id and activity=run.activity and reserved and consent and consented_at<=run.started_at loop
    select * into strict c from public.crew_challenges_2026 where id=roster.challenge_id for update;
    if c.status not in('scheduled','active','final') or p_closed_at is null or run.started_at is null or run.ended_at_2026 is null or run.created_at is null
      or p_closed_at<c.starts_at or p_closed_at>=c.ends_at or run.started_at>p_closed_at or run.ended_at_2026<p_closed_at
      or run.created_at<run.ended_at_2026 or run.ended_at_2026>c.ends_at+make_interval(hours=>r.sync_hours) or run.created_at>c.ends_at+make_interval(hours=>r.sync_hours) then continue; end if;
    if exists(select 1 from public.challenge_contributions_2026 where challenge_id=c.id and player_id=roster.player_id and
      (day=(p_closed_at at time zone c.time_zone)::date or activity_key=run.id)) then continue; end if;
    select sector_id into preferred from public.challenge_preferences_2026 where challenge_id=c.id and player_id=roster.player_id and recorded_at<=run.started_at order by recorded_at desc,id desc limit 1;
    select s->>'id' into sector from jsonb_array_elements(c.sectors) with ordinality q(s,position)
      where case when jsonb_typeof(p_sector_metres->(s->>'id'))='number' then (p_sector_metres->>(s->>'id'))::double precision else 0 end>=minimum
      order by case when s->>'id'=preferred then 0 else 1 end,position limit 1;
    if sector is null then continue; end if;
    insert into public.challenge_contributions_2026(challenge_id,player_id,crew_id,day,run_id,activity_key,event_id,sector_id,closed_at,received_at,used_fallback)
      values(c.id,roster.player_id,roster.crew_id,(p_closed_at at time zone c.time_zone)::date,run.id,run.id,p_event_id,sector,p_closed_at,run.created_at,preferred is distinct from sector);
  end loop;
end $$;

-- SQL scoring mirrors computeChallenge2026; the executable tests compare its
-- output to the shared engine. No subscription, distance total or pace enters it.
create function public.challenge_score_2026(p_challenge_id uuid,p_cutoff timestamptz default 'infinity')
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare scores jsonb; first_score jsonb; second_score jsonb; a numeric:=0; b numeric:=0; sector jsonb; c public.crew_challenges_2026; rule public.challenge_rules_2026;
begin
  select * into strict c from public.crew_challenges_2026 where id=p_challenge_id;
  select * into strict rule from public.challenge_rules_2026;
  with ordered as (
    select x.*,row_number() over(partition by player_id order by closed_at,event_id) n
    from public.challenge_contributions_2026 x where challenge_id=c.id and received_at<=p_cutoff and validated_at<=p_cutoff
  ), credited as (
    select o.*,case when n<=r.maximum_days and not withdrawn then r.points else 0 end points from ordered o cross join public.challenge_rules_2026 r
  ) select jsonb_agg(jsonb_build_object('teamId',t.crew_id,'totalPoints',coalesce((select sum(points) from credited x where x.crew_id=t.crew_id),0),
      'sectors',(select jsonb_object_agg(s->>'id',coalesce((select sum(points) from credited x where x.crew_id=t.crew_id and x.sector_id=s->>'id'),0)) from jsonb_array_elements(c.sectors) s)) order by t.side)
    into scores from public.challenge_teams_2026 t where t.challenge_id=c.id;
  first_score:=scores->0; second_score:=scores->1;
  for sector in select value from jsonb_array_elements(c.sectors) loop
    if (first_score->'sectors'->>(sector->>'id'))::integer=(second_score->'sectors'->>(sector->>'id'))::integer then a:=a+rule.tie_points;b:=b+rule.tie_points;
    elsif (first_score->'sectors'->>(sector->>'id'))::integer>(second_score->'sectors'->>(sector->>'id'))::integer then a:=a+rule.win_points;
    else b:=b+rule.win_points; end if;
  end loop;
  return jsonb_build_object('scores',jsonb_build_array(first_score||jsonb_build_object('matchPoints',a),second_score||jsonb_build_object('matchPoints',b)),
    'winnerTeamId',case when a=b then null when a>b then first_score->>'teamId' else second_score->>'teamId' end,'isDraw',a=b);
end $$;

create function public.challenge_publication_cutoff_2026(p_challenge_id uuid,p_at timestamptz)
returns timestamptz language plpgsql stable security definer set search_path=public,pg_temp as $$
declare c public.crew_challenges_2026; r public.challenge_rules_2026; cutoff timestamptz; deadline timestamptz;
begin
  select * into strict c from public.crew_challenges_2026 where id=p_challenge_id;
  select * into strict r from public.challenge_rules_2026;
  deadline:=c.ends_at+make_interval(hours=>r.sync_hours);
  if p_at>=deadline then return deadline; end if;
  cutoff:=(date_trunc('day',p_at at time zone c.time_zone)+make_interval(hours=>r.publication_hour)) at time zone c.time_zone;
  if cutoff>p_at then cutoff:=((cutoff at time zone c.time_zone)-interval '1 day') at time zone c.time_zone; end if;
  return least(cutoff,((c.ends_at at time zone c.time_zone)-interval '1 day'+make_interval(hours=>r.publication_hour)) at time zone c.time_zone);
end $$;

create function public.maintain_challenge_2026(p_challenge_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.crew_challenges_2026; r public.challenge_rules_2026; cutoff timestamptz; deadline timestamptz; result jsonb; prior public.challenge_publications_2026;
begin
  select * into strict c from public.crew_challenges_2026 where id=p_challenge_id for update;
  select * into strict r from public.challenge_rules_2026;
  if c.status='cancelled' or now()<c.starts_at then return; end if;
  if c.status in('invited','assembling') or (c.status='scheduled' and exists(
    select 1 from public.challenge_roster_2026 p where p.challenge_id=c.id and (p.user_id is null or
      not exists(select 1 from public.crew_members m where m.crew_id=p.crew_id and m.user_id=p.user_id and m.joined_at<=c.starts_at and (m.left_at is null or m.left_at>c.starts_at))
      or public.challenge_has_block_2026(c.id,p.user_id)))) then
    update public.crew_challenges_2026 set status='cancelled',reason='roster_incomplete_at_start' where id=c.id;
    update public.challenge_roster_2026 set reserved=false where challenge_id=c.id; return;
  end if;
  if c.status='scheduled' then update public.crew_challenges_2026 set status='active' where id=c.id; end if;
  deadline:=c.ends_at+make_interval(hours=>r.sync_hours);
  cutoff:=public.challenge_publication_cutoff_2026(c.id,now());
  if now()>=deadline then
    result:=public.challenge_score_2026(c.id);
    update public.crew_challenges_2026 set status='final' where id=c.id;
  else
    -- Last comparative publication is Sunday noon, never Monday morning.
    if cutoff<c.starts_at then return; end if;
    result:=public.challenge_score_2026(c.id,cutoff);
  end if;
  select * into prior from public.challenge_publications_2026 where challenge_id=c.id and cutoff_at=cutoff order by revision desc limit 1;
  -- A withdrawal may revise an existing snapshot immediately. Its fixed cutoff
  -- still excludes every newly validated activity, so this reveals no live score.
  if not found or prior.result is distinct from result then
    insert into public.challenge_publications_2026(challenge_id,cutoff_at,revision,result) values(c.id,cutoff,coalesce(prior.revision,0)+1,result);
  end if;
end $$;

create function public.withdraw_challenge_activity_2026(p_run_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare id uuid;
begin
  if auth.uid() is null or not exists(select 1 from public.runs where runs.id=p_run_id and user_id=auth.uid()) then raise exception 'activity_unavailable'; end if;
  update public.challenge_contributions_2026 set withdrawn=true where run_id=p_run_id;
  for id in select distinct challenge_id from public.challenge_contributions_2026 where run_id=p_run_id loop perform public.maintain_challenge_2026(id); end loop;
end $$;

create function public.remove_challenge_source_2026()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare match_id uuid;
begin
  update public.challenge_contributions_2026 set withdrawn=true where run_id=old.id;
  for match_id in select distinct challenge_id from public.challenge_contributions_2026 where run_id=old.id loop perform public.maintain_challenge_2026(match_id); end loop;
  return old;
end $$;
create trigger remove_challenge_source_2026 before delete on public.runs for each row execute function public.remove_challenge_source_2026();

create function public.withdraw_challenge_with_capture_2026()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare match_id uuid;
begin
  -- Opting out of the map does not revoke the separate challenge consent of a
  -- face that was already private. Removing its source still withdraws it.
  if new.status='withdrawn' or new.reason='source_deleted' or (new.reason='consent_withdrawn' and old.status<>'private') then
    update public.challenge_contributions_2026 set withdrawn=true where activity_key=coalesce(new.run_id,old.run_id);
    for match_id in select distinct challenge_id from public.challenge_contributions_2026 where activity_key=coalesce(new.run_id,old.run_id) loop
      perform public.maintain_challenge_2026(match_id);
    end loop;
  end if;
  return new;
end $$;
create trigger withdraw_challenge_with_capture_2026 after update of status,reason on public.capture_events_2026
  for each row when(old.status is distinct from new.status or old.reason is distinct from new.reason)
  execute function public.withdraw_challenge_with_capture_2026();

create function public.get_crew_challenges_2026(p_activity text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.crew_challenges_2026; ids uuid[]; out jsonb:='[]'; mine uuid; own_score jsonb; published public.challenge_publications_2026;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select array_agg(candidate.id) into ids from public.crew_challenges_2026 candidate where candidate.activity=p_activity and
    (exists(select 1 from public.challenge_roster_2026 p where p.challenge_id=candidate.id and p.user_id=auth.uid()) or
     exists(select 1 from public.challenge_teams_2026 t join public.crew_members m on m.crew_id=t.crew_id where t.challenge_id=candidate.id and m.user_id=auth.uid() and m.left_at is null))
    and not public.challenge_has_block_2026(candidate.id,auth.uid());
  for c in select * from public.crew_challenges_2026 where id=any(ids) order by starts_at desc,id loop
    perform public.maintain_challenge_2026(c.id);
    select * into strict c from public.crew_challenges_2026 where id=c.id;
    select crew_id into mine from public.challenge_roster_2026 where challenge_id=c.id and user_id=auth.uid();
    if mine is null then select t.crew_id into mine from public.challenge_teams_2026 t join public.crew_members m on m.crew_id=t.crew_id where t.challenge_id=c.id and m.user_id=auth.uid() and m.left_at is null; end if;
    -- matchPoints depend on the OTHER team's current score and must not leak.
    select value-'matchPoints' into own_score from jsonb_array_elements(public.challenge_score_2026(c.id)->'scores') where value->>'teamId'=mine::text;
    select * into published from public.challenge_publications_2026 where challenge_id=c.id order by cutoff_at desc,revision desc limit 1;
    out:=out||jsonb_build_array(jsonb_build_object('id',c.id,'title',c.title,'activity',c.activity,'status',c.status,'reason',c.reason,'timeZone',c.time_zone,'startsAt',c.starts_at,'endsAt',c.ends_at,
      'sectors',c.sectors,'myTeamId',mine,'canManage',public.challenge_manager_2026(auth.uid(),mine),
      'joined',exists(select 1 from public.challenge_roster_2026 where challenge_id=c.id and user_id=auth.uid() and consent),
      'rostered',exists(select 1 from public.challenge_roster_2026 where challenge_id=c.id and user_id=auth.uid()),
      'myPreference',(select jsonb_build_object('sectorId',sector_id,'recordedAt',recorded_at) from public.challenge_preferences_2026 where challenge_id=c.id and player_id=auth.uid() order by recorded_at desc,id desc limit 1),
      'teams',(select jsonb_agg(jsonb_build_object('id',t.crew_id,'name',cr.name,'accepted',t.accepted_at is not null,'locked',t.locked_at is not null,
        'players',(select count(*) from public.challenge_roster_2026 p where p.challenge_id=c.id and p.crew_id=t.crew_id),'side',t.side) order by t.side) from public.challenge_teams_2026 t join public.crews cr on cr.id=t.crew_id where t.challenge_id=c.id),
      'ownScore',own_score,'publishedResult',published.result,'publishedAt',published.cutoff_at,'resultRevision',published.revision,
      'myContributions',coalesce((select jsonb_agg(jsonb_build_object('runId',x.run_id,'day',x.day,'sectorId',x.sector_id,'withdrawn',x.withdrawn,'usedFallback',x.used_fallback,
        'points',case when x.n<=rule.maximum_days and not x.withdrawn then rule.points else 0 end) order by x.closed_at,x.event_id)
        from (select cc.*,row_number() over(order by cc.closed_at,cc.event_id) n from public.challenge_contributions_2026 cc where cc.challenge_id=c.id and cc.player_id=auth.uid()) x
        cross join public.challenge_rules_2026 rule),'[]')));
  end loop;
  return out;
end $$;

create function public.publish_due_challenges_2026()
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare id uuid;
begin
  for id in select c.id from public.crew_challenges_2026 c where c.status not in('cancelled','final') and c.starts_at<=now() loop perform public.maintain_challenge_2026(id); end loop;
end $$;

-- Capture and accepted challenge evidence share one transaction. Only portions
-- actually ridden/run on the face boundary are measured, with synthetic closure
-- connectors and forbidden geometry removed. Personal masks stay private and
-- never appear in the public challenge API; only sector participation is shared.
create function public.stage_game_activity_2026(p_run_id uuid,p_faces jsonb,p_segments jsonb,p_masks jsonb,
  p_publish_after timestamptz,p_min_area_m2 double precision,p_receipt_max_hours double precision,
  p_source_verified boolean,p_review_required boolean)
returns void language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare run public.runs; face jsonb; c public.crew_challenges_2026; lengths jsonb; barrier boolean;
begin
  perform public.stage_capture_2026(p_run_id,p_faces,p_masks,p_publish_after,p_min_area_m2,p_receipt_max_hours,p_source_verified,p_review_required);
  if p_source_verified is distinct from true or p_review_required is distinct from false then return; end if;
  select * into strict run from public.runs where id=p_run_id;
  for c in select ch.* from public.crew_challenges_2026 ch join public.challenge_roster_2026 r on r.challenge_id=ch.id
    where r.user_id=run.user_id and r.activity=run.activity and r.reserved and r.consent and r.consented_at<=run.started_at
    and ch.status in('scheduled','active','final') loop
    perform public.maintain_challenge_2026(c.id);
    for face in select value from jsonb_array_elements(p_faces) order by (value->>'closedAt')::timestamptz,value->>'key' loop
      -- A late upload may be outside the free-map receipt window while still
      -- eligible for this match's explicit final synchronization deadline.
      -- Provenance/review were checked above, independently of map audience.
      if not exists(select 1 from public.capture_events_2026 where run_id=run.id and face_key=face->>'key'
        and status<>'withdrawn' and coalesce(reason,'') not in('consent_withdrawn','source_deleted')) then continue; end if;
      if face ? 'closureConnector' then
        execute 'select exists(select 1 from public.no_capture_zones where ST_Intersects(ST_SetSRID(ST_GeomFromGeoJSON($1),4326),ST_SetSRID(ST_GeomFromGeoJSON(geojson),4326)))'
          into barrier using face->'closureConnector';
        if barrier then continue; end if;
      end if;
      execute $spatial$
        with trace as (select ST_UnaryUnion(ST_Collect(ST_SetSRID(ST_GeomFromGeoJSON(s),4326))) g from jsonb_array_elements($1) s),
        forbidden as (select ST_UnaryUnion(ST_Collect(ST_SetSRID(ST_GeomFromGeoJSON(geojson),4326))) g from public.no_capture_zones),
        boundary as (select ST_Intersection(trace.g,ST_Boundary(ST_SetSRID(ST_GeomFromGeoJSON($2),4326))) g from trace),
        allowed as (select case when forbidden.g is null then boundary.g else ST_Difference(boundary.g,forbidden.g) end g from boundary,forbidden),
        measured as (select case when $3::jsonb is null then allowed.g else ST_Difference(allowed.g,ST_SetSRID(ST_GeomFromGeoJSON($3),4326)) end g from allowed)
        select jsonb_object_agg(s->>'id',ST_Length(ST_CollectionExtract(ST_Intersection(measured.g,ST_SetSRID(ST_GeomFromGeoJSON(s->'geometry'),4326)),2)::geography))
          from measured,jsonb_array_elements($4) s
      $spatial$ into lengths using p_segments,face->'geometry',face->'closureConnector',c.sectors;
      perform public.assign_challenge_loop_2026(run.id,md5(run.id::text||':'||(face->>'key'))::uuid,(face->>'closedAt')::timestamptz,lengths);
    end loop;
    perform public.maintain_challenge_2026(c.id);
  end loop;
end $$;
revoke all on function public.stage_game_activity_2026(uuid,jsonb,jsonb,jsonb,timestamptz,float8,float8,boolean,boolean) from public,anon,authenticated;
grant execute on function public.stage_game_activity_2026(uuid,jsonb,jsonb,jsonb,timestamptz,float8,float8,boolean,boolean) to service_role;

-- Every new function defaults to PRIVATE, then only the purposeful owner RPCs
-- below are opened. Internal scorers cannot leak live opponents through RPC.
do $$ declare f record; begin
  for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in('remember_challenge_block_2026','challenge_manager_2026','challenge_pair_blocked_2026','challenge_has_block_2026','configure_challenge_arena_2026','list_challenge_arenas_2026',
      'create_crew_challenge_2026','accept_crew_challenge_2026','join_crew_challenge_2026','lock_crew_challenge_2026','cancel_crew_challenge_2026','set_challenge_preference_2026',
      'assign_challenge_loop_2026','challenge_score_2026','challenge_publication_cutoff_2026','maintain_challenge_2026','withdraw_challenge_activity_2026','remove_challenge_source_2026','withdraw_challenge_with_capture_2026','get_crew_challenges_2026','publish_due_challenges_2026') loop
    execute format('revoke all on function %s from public,anon,authenticated',f.signature);
    execute format('grant execute on function %s to service_role',f.signature);
  end loop;
end $$;
grant execute on function public.list_challenge_arenas_2026(text),public.create_crew_challenge_2026(uuid,uuid,text,timestamptz,boolean),public.accept_crew_challenge_2026(uuid,boolean),
  public.join_crew_challenge_2026(uuid,boolean),public.lock_crew_challenge_2026(uuid),public.cancel_crew_challenge_2026(uuid),public.set_challenge_preference_2026(uuid,text),
  public.withdraw_challenge_activity_2026(uuid),public.get_crew_challenges_2026(text) to authenticated;

do $$ begin
  if exists(select 1 from pg_namespace where nspname='cron') then
    perform cron.schedule('publish-challenges-2026','* * * * *','select public.publish_due_challenges_2026()');
  end if;
end $$;
