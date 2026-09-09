-- One owner per square metre. Crew is a current grouping, never a second title.
-- Existing public/private capture events are preserved; no historical publication.
create function public.territory_role_2026(p_owner uuid,p_viewer uuid)
returns text language sql stable security definer set search_path=public,pg_temp as $$
  select case when p_owner=p_viewer then 'mine' when exists(
    select 1 from public.crew_members a join public.crew_members b on b.crew_id=a.crew_id
    where a.user_id=p_viewer and b.user_id=p_owner and a.left_at is null and b.left_at is null
  ) then 'crew' else 'others' end;
$$;
revoke all on function public.territory_role_2026(uuid,uuid) from public,anon,authenticated;
grant execute on function public.territory_role_2026(uuid,uuid) to service_role;

create or replace function public.get_ownership_2026(p_activity text,p_west float8,p_south float8,p_east float8,p_north float8)
returns jsonb language plpgsql stable security definer set search_path=public,extensions,pg_temp as $$
declare result jsonb; own_crew jsonb;
begin
  if auth.uid() is null or p_activity is null or p_west is null or p_east is null or p_south is null or p_north is null or p_activity not in ('run','bike') or not(p_west>=-180 and p_east<=180 and p_south>=-90 and p_north<=90 and p_west<p_east and p_south<p_north) then raise exception 'invalid_viewport'; end if;
  select jsonb_build_object('id',c.id,'name',c.name) into own_crew from public.crew_members m join public.crews c on c.id=m.crew_id
    where m.user_id=auth.uid() and m.left_at is null;
  select jsonb_build_object('type','FeatureCollection','contract','ownership.2026.2','activity',p_activity,'asOf',now(),'crew',own_crew,
    'features',coalesce(jsonb_agg(jsonb_build_object('type','Feature','id',o.event_id,'geometry',ST_AsGeoJSON(o.geometry)::jsonb,
      'properties',jsonb_build_object('id',o.event_id,'ownerId',case when o.owner_id=auth.uid() then o.owner_id else null end,
      'role',public.territory_role_2026(o.owner_id,auth.uid()),'activity',o.activity,'areaM2',ST_Area(o.geometry::geography),
      'capturedAreaM2',ST_Area(e.geometry::geography),'controlledSince',o.controlled_since,'ruleset','2026.1'))),'[]'::jsonb)) into result
  from public.ownership_2026 o join public.capture_events_2026 e on e.id=o.event_id
  where o.activity=p_activity and o.geometry && ST_MakeEnvelope(p_west,p_south,p_east,p_north,4326)
    and exists(select 1 from public.user_profiles up where up.user_id=o.owner_id and up.map_sharing<>'none')
    and exists(select 1 from public.users u where u.id=o.owner_id and u.deletion_requested_at is null)
    and not public.challenge_pair_blocked_2026(auth.uid(),o.owner_id)
    and not exists(select 1 from public.friendships fr where fr.status='blocked' and
      least(fr.requester_id,fr.addressee_id)=least(auth.uid(),o.owner_id) and greatest(fr.requester_id,fr.addressee_id)=greatest(auth.uid(),o.owner_id));
  return result;
end $$;
revoke all on function public.get_ownership_2026(text,float8,float8,float8,float8) from public,anon;
grant execute on function public.get_ownership_2026(text,float8,float8,float8,float8) to authenticated;

create or replace function public.capture_result_2026(p_run_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public,extensions,pg_temp as $$
declare r public.runs; result jsonb; remaining float8;
begin
  select * into strict r from public.runs where id=p_run_id;
  if coalesce(auth.role(),'')<>'service_role' and r.user_id is distinct from auth.uid() then raise exception 'not_authorized'; end if;
  if exists(select 1 from public.capture_events_2026 where run_id=p_run_id and status in('published','withdrawn')) then
    -- A later capture by the SAME player may change event attribution, not possession.
    select coalesce(ST_Area(ST_Intersection(
      (select ST_UnaryUnion(ST_Collect(e.geometry)) from public.capture_events_2026 e
        where e.run_id=p_run_id and e.status in('published','withdrawn')),
      (select ST_UnaryUnion(ST_Collect(o.geometry)) from public.ownership_2026 o
        where o.owner_id=r.user_id and o.activity=r.activity)
    )::geography),0) into remaining;
  end if;
  select jsonb_build_object('ruleset','2026.1','status',coalesce(r.game_status_2026,'pending'),
    'reason',coalesce(min(e.reason) filter(where e.status=r.game_status_2026 or (r.game_status_2026='private' and e.status='withdrawn')),r.game_reason_2026),'loopAreaM2',coalesce(ST_Area(ST_UnaryUnion(ST_Collect(e.geometry))::geography),0),
    'newTerrainM2',ST_Area(ST_UnaryUnion(ST_Collect(e.new_geometry))::geography),
    'neutralTakenM2',ST_Area(ST_UnaryUnion(ST_Collect(e.neutral_geometry))::geography),
    'takenFromOthersM2',ST_Area(ST_UnaryUnion(ST_Collect(e.taken_geometry))::geography),
    'alreadyOwnedM2',ST_Area(ST_UnaryUnion(ST_Collect(e.already_owned_geometry))::geography),
    'publishedAreaM2',ST_Area(ST_UnaryUnion(ST_Collect(e.geometry) filter(where e.status in('published','withdrawn')))::geography),
    'remainingTerrainM2',remaining,'asOf',now(),'publishAfter',max(e.publish_after)) into result
    from public.capture_events_2026 e where e.run_id=p_run_id;
  return result;
end $$;
revoke all on function public.capture_result_2026(uuid) from public,anon;
grant execute on function public.capture_result_2026(uuid) to authenticated,service_role;
