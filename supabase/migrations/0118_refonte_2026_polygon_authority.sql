-- September 2026. Additive cutover: legacy runs/hexes/territories remain archives.
-- PostGIS was installed by 0001. Only these tables decide new possession.
alter table public.runs add column if not exists ruleset_version text not null default 'legacy';
alter table public.runs add column if not exists trace_points_2026 jsonb;
alter table public.runs add column if not exists ended_at_2026 timestamptz;
alter table public.runs add column if not exists game_status_2026 text;
alter table public.runs add column if not exists game_reason_2026 text;
alter table public.runs add column if not exists recording_session_id_2026 uuid;
alter table public.runs add column if not exists shared_map_consent_2026 boolean not null default false;

-- The old crew dashboard has no per-activity audience contract. Keep its
-- distance aggregates historical until it reads consented 2026 sporting facts.
do $$ declare definition text; begin
  definition:=pg_get_functiondef('public.crew_stats(text,integer)'::regprocedure);
  definition:=replace(definition,'and r.status in (''valid'', ''partial'')',
    'and r.ruleset_version = ''legacy'' and r.status in (''valid'', ''partial'')');
  execute definition;
end $$;

-- An old backfill, function deployment or still-installed client must never
-- award a 2026 activity through the archived cells/polygon engine.
create function public.prevent_legacy_capture_2026()
returns trigger language plpgsql set search_path=public,pg_temp as $$
declare source_id uuid;
begin
  source_id:=coalesce((to_jsonb(new)->>'source_run_id')::uuid,(to_jsonb(new)->>'run_id')::uuid);
  if exists(select 1 from public.runs where id=source_id and ruleset_version='2026.1') then
    raise exception 'legacy_capture_forbidden_for_2026_activity';
  end if;
  return new;
end $$;
create trigger prevent_legacy_hex_capture_2026 before insert or update on public.hex_claims
  for each row execute function public.prevent_legacy_capture_2026();
create trigger prevent_legacy_polygon_capture_2026 before insert or update on public.territories
  for each row execute function public.prevent_legacy_capture_2026();

create table public.recording_sessions_2026 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  client_run_id uuid not null,
  activity text not null check (activity in ('run','bike')),
  started_at timestamptz not null default now(),
  unique(user_id,client_run_id)
);
alter table public.recording_sessions_2026 enable row level security;
revoke all on public.recording_sessions_2026 from anon, authenticated;
grant all on public.recording_sessions_2026 to service_role;

create function public.begin_recording_2026(p_client_run_id uuid,p_activity text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.recording_sessions_2026;
begin
  if auth.uid() is null or p_activity not in ('run','bike') then raise exception 'invalid_recording'; end if;
  if not exists(select 1 from public.users where id=auth.uid() and deletion_requested_at is null) then raise exception 'account_unavailable'; end if;
  insert into public.recording_sessions_2026(user_id,client_run_id,activity)
    values(auth.uid(),p_client_run_id,p_activity) on conflict(user_id,client_run_id) do nothing;
  select * into strict r from public.recording_sessions_2026 where user_id=auth.uid() and client_run_id=p_client_run_id;
  if r.activity<>p_activity then raise exception 'recording_discipline_mismatch'; end if;
  return jsonb_build_object('id',r.id,'startedAt',r.started_at);
end $$;
revoke all on function public.begin_recording_2026(uuid,text) from public,anon;
grant execute on function public.begin_recording_2026(uuid,text) to authenticated;

-- H3 BIGINT must cross JSON as text: a JavaScript number loses precision and
-- can move a privacy mask. This RPC exposes masks only to the service edge.
create function public.privacy_masks_2026(p_user_id uuid)
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
  select coalesce(jsonb_agg(jsonb_build_object('centerH3',to_hex(center_h3_res8),'radiusM',radius_m)),'[]'::jsonb)
    from public.privacy_zones where user_id=p_user_id;
$$;
revoke all on function public.privacy_masks_2026(uuid) from public,anon,authenticated;
grant execute on function public.privacy_masks_2026(uuid) to service_role;

create table public.capture_events_2026 (
  id uuid primary key,
  run_id uuid references public.runs(id) on delete set null,
  owner_id uuid references public.users(id) on delete set null,
  activity text not null check(activity in ('run','bike')),
  face_key text not null,
  closed_at timestamptz not null,
  received_at timestamptz not null,
  publish_after timestamptz not null,
  geometry extensions.geometry(MultiPolygon,4326) not null,
  status text not null check(status in ('private','pending','scheduled','published','withdrawn')),
  reason text,
  new_geometry extensions.geometry(MultiPolygon,4326),
  neutral_geometry extensions.geometry(MultiPolygon,4326),
  taken_geometry extensions.geometry(MultiPolygon,4326),
  already_owned_geometry extensions.geometry(MultiPolygon,4326),
  unique(run_id,face_key)
);
create index capture_events_2026_order on public.capture_events_2026(activity,closed_at,id);
create index capture_events_2026_due on public.capture_events_2026(publish_after) where status='scheduled';
create index capture_events_2026_geom on public.capture_events_2026 using gist(geometry);
alter table public.capture_events_2026 enable row level security;
revoke all on public.capture_events_2026 from anon,authenticated;
grant all on public.capture_events_2026 to service_role;
-- Capture events remain private even after publication: only the derived ownership is exposed.

create table public.ownership_2026 (
  event_id uuid primary key references public.capture_events_2026(id) on delete cascade,
  owner_id uuid not null references public.users(id) on delete cascade,
  activity text not null check(activity in ('run','bike')),
  geometry extensions.geometry(MultiPolygon,4326) not null,
  controlled_since timestamptz not null
);
create index ownership_2026_geom on public.ownership_2026 using gist(geometry);
create index ownership_2026_owner on public.ownership_2026(owner_id,activity);
alter table public.ownership_2026 enable row level security;
revoke all on public.ownership_2026 from anon,authenticated;
grant all on public.ownership_2026 to service_role;

-- Stage geometry only after the durable activity exists. Caller is the service edge.
-- Every game parameter is injected from shared constants, never a SQL default.
create function public.stage_capture_2026(p_run_id uuid,p_faces jsonb,p_masks jsonb,
  p_publish_after timestamptz,p_min_area_m2 double precision,p_receipt_max_hours double precision,
  p_source_verified boolean,p_review_required boolean)
returns void language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare r public.runs; f jsonb; m jsonb; g geometry; mask geometry;
  exclusions geometry; state text; why text; closure timestamptz;
begin
  select * into strict r from public.runs where id=p_run_id for update;
  if r.ruleset_version<>'2026.1' then raise exception 'wrong_ruleset'; end if;
  if exists(select 1 from public.capture_events_2026 where run_id=r.id) then return; end if;
  select ST_UnaryUnion(ST_Collect(ST_SetSRID(ST_GeomFromGeoJSON(geojson),4326)))
    into exclusions from public.no_capture_zones;
  for f in select value from jsonb_array_elements(p_faces) loop
    g:=ST_SetSRID(ST_GeomFromGeoJSON(f->'geometry'),4326);
    -- Invalid rings are never repaired into an invented capture.
    if not ST_IsValid(g) then raise exception 'invalid_capture_geometry'; end if;
    closure:=(f->>'closedAt')::timestamptz;
    state:='scheduled'; why:=null;
    if not r.shared_map_consent_2026 or not exists(select 1 from public.user_profiles where user_id=r.user_id and map_sharing<>'none') then state:='private'; why:='shared_map_not_authorized'; end if;
    for m in select value from jsonb_array_elements(p_masks) loop
      mask:=ST_Buffer(ST_SetSRID(ST_MakePoint((m->>'lng')::float8,(m->>'lat')::float8),4326)::geography,(m->>'radiusM')::float8)::geometry;
      -- A whole face stays private. No identifying hole is published.
      if ST_Intersects(g,mask) then state:='private'; why:='protected_place'; end if;
    end loop;
    if state<>'private' and (not p_source_verified or p_review_required or closure>r.created_at or
        r.created_at-closure>make_interval(secs=>p_receipt_max_hours*3600)) then
      state:='pending'; why:=case when p_review_required then 'verification_required' else 'source_or_clock_unconfirmed' end;
    end if;
    if state<>'private' and exclusions is not null and f ? 'closureConnector' and
       ST_Intersects(ST_SetSRID(ST_GeomFromGeoJSON(f->'closureConnector'),4326),exclusions) then
      state:='pending'; why:='closure_crosses_known_barrier';
    end if;
    if exclusions is not null then g:=ST_Difference(g,exclusions); end if;
    g:=ST_Multi(ST_CollectionExtract(g,3));
    if ST_IsEmpty(g) or ST_Area(g::geography)<p_min_area_m2 then continue; end if;
    insert into public.capture_events_2026(id,run_id,owner_id,activity,face_key,closed_at,received_at,publish_after,geometry,status,reason)
      values(md5(r.id::text||':'||(f->>'key'))::uuid,r.id,r.user_id,r.activity,f->>'key',closure,r.created_at,p_publish_after,g,state,why);
  end loop;
  update public.runs set game_status_2026=coalesce((select case
    when bool_or(status='scheduled') then 'scheduled' when bool_or(status='pending') then 'pending' else 'private' end
    from public.capture_events_2026 where run_id=r.id having count(*)>0),'no_loop') where id=r.id;
end $$;
revoke all on function public.stage_capture_2026(uuid,jsonb,jsonb,timestamptz,float8,float8,boolean,boolean) from public,anon,authenticated;
grant execute on function public.stage_capture_2026(uuid,jsonb,jsonb,timestamptz,float8,float8,boolean,boolean) to service_role;

-- Canonical replay is the pilot reference algorithm. One discipline transaction
-- guarantees reversed uploads, per-face ordering, delayed loss/counters and holes.
-- Production throughput requires spatial-component replay before a large rollout.
create function public.rebuild_ownership_2026(p_activity text)
returns void language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare e public.capture_events_2026; mine geometry; all_owned geometry; empty_geom geometry; visited geometry; fresh geometry;
begin
  if p_activity not in ('run','bike') then raise exception 'invalid_discipline'; end if;
  perform pg_advisory_xact_lock(hashtext('ownership_2026:'||p_activity));
  empty_geom:=ST_GeomFromText('MULTIPOLYGON EMPTY',4326);
  delete from public.ownership_2026 where activity=p_activity;
  for e in select * from public.capture_events_2026 where activity=p_activity and status in ('published','withdrawn') order by closed_at,id loop
    -- Each square metre of an activity is described once, even if another
    -- player crossed between its faces. The ownership still follows every face.
    select coalesce(ST_UnaryUnion(ST_Collect(geometry)),empty_geom) into visited
      from public.capture_events_2026 where run_id=e.run_id and status in ('published','withdrawn') and (closed_at,id)<(e.closed_at,e.id);
    fresh:=ST_Difference(e.geometry,visited);
    select coalesce(ST_UnaryUnion(ST_Collect(geometry)),empty_geom) into mine
      from public.ownership_2026 where activity=p_activity and owner_id=e.owner_id and geometry && e.geometry;
    select coalesce(ST_UnaryUnion(ST_Collect(geometry)),empty_geom) into all_owned
      from public.ownership_2026 where activity=p_activity and geometry && e.geometry;
    update public.capture_events_2026 set
      new_geometry=ST_Multi(ST_CollectionExtract(ST_Difference(fresh,mine),3)),
      neutral_geometry=ST_Multi(ST_CollectionExtract(ST_Difference(fresh,all_owned),3)),
      taken_geometry=ST_Multi(ST_CollectionExtract(ST_Difference(ST_Intersection(fresh,all_owned),mine),3)),
      already_owned_geometry=ST_Multi(ST_CollectionExtract(ST_Intersection(fresh,mine),3))
      where id=e.id;
    update public.ownership_2026 set geometry=ST_Multi(ST_CollectionExtract(ST_Difference(geometry,e.geometry),3))
      where activity=p_activity and geometry && e.geometry;
    delete from public.ownership_2026 where activity=p_activity and ST_IsEmpty(geometry);
    -- A withdrawal is a neutralizing tombstone, never resurrection of an old owner.
    if e.status='published' then
      insert into public.ownership_2026 values(e.id,e.owner_id,e.activity,e.geometry,e.closed_at);
    end if;
  end loop;
end $$;
revoke all on function public.rebuild_ownership_2026(text) from public,anon,authenticated;
grant execute on function public.rebuild_ownership_2026(text) to service_role;

create function public.publish_capture_events_2026()
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare discipline text; changed integer:=0; n integer;
begin
  foreach discipline in array array['run','bike'] loop
    perform pg_advisory_xact_lock(hashtext('ownership_2026:'||discipline));
    -- Consent can change while an upload is being staged. Recheck under the
    -- publication lock, before any victim loss or public geometry can change.
    update public.capture_events_2026 e set status='private',reason='consent_withdrawn'
      where e.activity=discipline and e.status='scheduled' and not exists(
        select 1 from public.runs r join public.users u on u.id=r.user_id
          join public.user_profiles up on up.user_id=u.id
        where r.id=e.run_id and r.shared_map_consent_2026 and up.map_sharing<>'none' and u.deletion_requested_at is null);
    update public.capture_events_2026 set status='published'
      where activity=discipline and status='scheduled' and publish_after<=now();
    get diagnostics n=row_count;
    if n>0 then
      perform public.rebuild_ownership_2026(discipline);
      update public.runs r set game_status_2026='published' where exists(
        select 1 from public.capture_events_2026 e where e.run_id=r.id and e.activity=discipline and e.status='published');
    end if;
    changed:=changed+n;
  end loop;
  return changed;
end $$;
revoke all on function public.publish_capture_events_2026() from public,anon,authenticated;
grant execute on function public.publish_capture_events_2026() to service_role;

create function public.get_ownership_2026(p_activity text,p_west float8,p_south float8,p_east float8,p_north float8)
returns jsonb language plpgsql stable security definer set search_path=public,extensions,pg_temp as $$
declare result jsonb;
begin
  if auth.uid() is null or p_activity not in ('run','bike') or not(p_west>=-180 and p_east<=180 and p_south>=-90 and p_north<=90 and p_west<p_east and p_south<p_north) then
    raise exception 'invalid_viewport';
  end if;
  select jsonb_build_object('type','FeatureCollection','features',coalesce(jsonb_agg(jsonb_build_object(
    'type','Feature','id',o.event_id,'geometry',ST_AsGeoJSON(o.geometry)::jsonb,
    'properties',jsonb_build_object('id',o.event_id,'ownerId',o.owner_id,'activity',o.activity,
      'areaM2',ST_Area(o.geometry::geography),'controlledSince',o.controlled_since,'ruleset','2026.1'))),'[]'::jsonb)) into result
    from public.ownership_2026 o where o.activity=p_activity and o.geometry && ST_MakeEnvelope(p_west,p_south,p_east,p_north,4326)
      and exists(select 1 from public.user_profiles up where up.user_id=o.owner_id and up.map_sharing<>'none')
      and exists(select 1 from public.users u where u.id=o.owner_id and u.deletion_requested_at is null)
      and not exists(select 1 from public.friendships fr where fr.status='blocked' and
        least(fr.requester_id,fr.addressee_id)=least(auth.uid(),o.owner_id) and greatest(fr.requester_id,fr.addressee_id)=greatest(auth.uid(),o.owner_id));
  return result;
end $$;
revoke all on function public.get_ownership_2026(text,float8,float8,float8,float8) from public,anon;
grant execute on function public.get_ownership_2026(text,float8,float8,float8,float8) to authenticated;

create function public.capture_result_2026(p_run_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public,extensions,pg_temp as $$
declare r public.runs; result jsonb;
begin
  select * into strict r from public.runs where id=p_run_id;
  if coalesce(auth.role(),'')<>'service_role' and r.user_id is distinct from auth.uid() then raise exception 'not_authorized'; end if;
  select jsonb_build_object('ruleset','2026.1','status',coalesce(r.game_status_2026,'pending'),
    'reason',coalesce(min(e.reason),r.game_reason_2026),'loopAreaM2',coalesce(ST_Area(ST_UnaryUnion(ST_Collect(e.geometry))::geography),0),
    'newTerrainM2',ST_Area(ST_UnaryUnion(ST_Collect(e.new_geometry))::geography),
    'neutralTakenM2',ST_Area(ST_UnaryUnion(ST_Collect(e.neutral_geometry))::geography),
    'takenFromOthersM2',ST_Area(ST_UnaryUnion(ST_Collect(e.taken_geometry))::geography),
    'alreadyOwnedM2',ST_Area(ST_UnaryUnion(ST_Collect(e.already_owned_geometry))::geography),
    'publishAfter',max(e.publish_after)) into result from public.capture_events_2026 e where e.run_id=p_run_id;
  return result;
end $$;
revoke all on function public.capture_result_2026(uuid) from public,anon;
grant execute on function public.capture_result_2026(uuid) to authenticated,service_role;

create function public.withdraw_capture_2026(p_run_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.runs;
begin
  select * into strict r from public.runs where id=p_run_id and user_id=auth.uid();
  perform pg_advisory_xact_lock(hashtext('ownership_2026:'||r.activity));
  update public.capture_events_2026 set status=case when status='published' then 'withdrawn' else 'private' end,
    reason='consent_withdrawn' where run_id=r.id and status<>'withdrawn';
  update public.runs set game_status_2026='private',shared_map_consent_2026=false where id=r.id;
  perform public.rebuild_ownership_2026(r.activity);
end $$;
revoke all on function public.withdraw_capture_2026(uuid) from public,anon;
grant execute on function public.withdraw_capture_2026(uuid) to authenticated;

-- Deleting a source activity/account neutralizes only its surviving ownership.
-- Anonymous tombstones survive so a later replay cannot resurrect a rival.
create function public.remove_capture_source_2026()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  perform pg_advisory_xact_lock(hashtext('ownership_2026:'||old.activity));
  delete from public.ownership_2026 where event_id in(select id from public.capture_events_2026 where run_id=old.id);
  update public.capture_events_2026 set status=case when status='published' then 'withdrawn' else 'private' end,
    reason='source_deleted' where run_id=old.id and status<>'withdrawn';
  return old;
end $$;
create trigger remove_capture_source_2026 before delete on public.runs for each row execute function public.remove_capture_source_2026();

create function public.revoke_map_consent_2026()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare discipline text;
begin
  if new.map_sharing='none' and old.map_sharing is distinct from new.map_sharing then
    foreach discipline in array array['run','bike'] loop
      perform pg_advisory_xact_lock(hashtext('ownership_2026:'||discipline));
      delete from public.ownership_2026 where owner_id=new.user_id and activity=discipline;
      update public.capture_events_2026 set status=case when status='published' then 'withdrawn' else 'private' end,
        reason='consent_withdrawn' where owner_id=new.user_id and activity=discipline and status<>'withdrawn';
      update public.runs set game_status_2026='private',shared_map_consent_2026=false
        where user_id=new.user_id and activity=discipline and ruleset_version='2026.1';
    end loop;
  end if;
  return new;
end $$;
create trigger revoke_map_consent_2026 after update of map_sharing on public.user_profiles
  for each row execute function public.revoke_map_consent_2026();

-- Existing deployments with pg_cron publish atomically once eligible. Local
-- environments without pg_cron can invoke the service function explicitly.
do $$ begin
  if exists(select 1 from pg_extension where extname='pg_cron') then
    perform cron.schedule('publish-capture-events-2026','* * * * *','select public.publish_capture_events_2026()');
  end if;
end $$;
