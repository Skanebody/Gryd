-- Read-only identity enrichment. Capture title remains INDIVIDUAL; current crew
-- membership is separate metadata, not historical contribution or joint title.
create function public.territory_owner_identity_2026(p_owner uuid,p_viewer uuid)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare profile public.user_profiles; visible boolean:=false; membership jsonb:=null;
begin
  if p_owner is null or p_viewer is null then return null; end if;
  select * into profile from public.user_profiles where user_id=p_owner;
  visible := p_owner=p_viewer or (not coalesce(profile.discreet_mode,true) and (
    profile.profile_visibility='public' or
    (profile.profile_visibility='crew' and public.territory_role_2026(p_owner,p_viewer)='crew') or
    (profile.profile_visibility='friends' and exists(select 1 from public.friendships f where f.status='accepted' and
      least(f.requester_id,f.addressee_id)=least(p_owner,p_viewer) and greatest(f.requester_id,f.addressee_id)=greatest(p_owner,p_viewer)))
  ));
  if visible then
    select jsonb_build_object('key',md5('crew.2026.3:'||p_viewer::text||':'||m.crew_id::text),'name',c.name)
      into membership from public.crew_members m join public.crews c on c.id=m.crew_id where m.user_id=p_owner and m.left_at is null;
  end if;
  -- Scoped pseudonym for comparing already-authorized published faces, not a
  -- public user UUID, profile deep-link, or claim of irreversible anonymization.
  return jsonb_build_object('key',md5('owner.2026.3:'||p_viewer::text||':'||p_owner::text),'kind','individual',
    'label',case when visible then coalesce(profile.display_name,profile.handle) else null end,'crew',membership);
end $$;
revoke all on function public.territory_owner_identity_2026(uuid,uuid) from public,anon,authenticated;
grant execute on function public.territory_owner_identity_2026(uuid,uuid) to service_role;

create or replace function public.get_ownership_2026(p_activity text,p_west float8,p_south float8,p_east float8,p_north float8)
returns jsonb language plpgsql stable security definer set search_path=public,extensions,pg_temp as $$
declare result jsonb; own_crew jsonb;
begin
  if auth.uid() is null or p_activity is null or p_west is null or p_east is null or p_south is null or p_north is null or p_activity not in ('run','bike') or not(p_west>=-180 and p_east<=180 and p_south>=-90 and p_north<=90 and p_west<p_east and p_south<p_north) then raise exception 'invalid_viewport'; end if;
  select jsonb_build_object('id',c.id,'name',c.name) into own_crew from public.crew_members m join public.crews c on c.id=m.crew_id
    where m.user_id=auth.uid() and m.left_at is null;
  select jsonb_build_object('type','FeatureCollection','contract','ownership.2026.3','activity',p_activity,'asOf',now(),'crew',own_crew,
    'features',coalesce(jsonb_agg(jsonb_build_object('type','Feature','id',o.event_id,'geometry',ST_AsGeoJSON(o.geometry)::jsonb,
      'properties',jsonb_build_object('id',o.event_id,'ownerId',case when o.owner_id=auth.uid() then o.owner_id else null end,
      'owner',public.territory_owner_identity_2026(o.owner_id,auth.uid()),
      'role',public.territory_role_2026(o.owner_id,auth.uid()),'activity',o.activity,'areaM2',ST_Area(o.geometry::geography),
      'capturedAreaM2',ST_Area(e.geometry::geography),'controlledSince',o.controlled_since,'ruleset','2026.1'))),'[]'::jsonb)) into result
  from public.ownership_2026 o join public.capture_events_2026 e on e.id=o.event_id
  where o.activity=p_activity and e.status='published' and o.geometry && ST_MakeEnvelope(p_west,p_south,p_east,p_north,4326)
    and exists(select 1 from public.user_profiles up where up.user_id=o.owner_id and up.map_sharing<>'none')
    and exists(select 1 from public.users u where u.id=o.owner_id and u.deletion_requested_at is null)
    and not public.challenge_pair_blocked_2026(auth.uid(),o.owner_id)
    and not exists(select 1 from public.friendships fr where fr.status='blocked' and
      least(fr.requester_id,fr.addressee_id)=least(auth.uid(),o.owner_id) and greatest(fr.requester_id,fr.addressee_id)=greatest(auth.uid(),o.owner_id));
  return result;
end $$;
revoke all on function public.get_ownership_2026(text,float8,float8,float8,float8) from public,anon;
grant execute on function public.get_ownership_2026(text,float8,float8,float8,float8) to authenticated;
