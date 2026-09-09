-- Keep the outing and its public host pseudo readable by the current crew,
-- without bypassing the host's social-profile audience through SECURITY DEFINER.
-- No table, RLS policy, RSVP, management permission or event field is changed.
create or replace function public.crew_outings_2026() returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare v_crew uuid; v_role text; v_items jsonb;
begin
 if auth.uid() is null then return jsonb_build_object('ok',false,'reason','signed_out'); end if;
 select crew_id,role into v_crew,v_role from crew_members where user_id=auth.uid() and left_at is null;
 if v_crew is null then return jsonb_build_object('ok',false,'reason','no_crew'); end if;
 select coalesce(jsonb_agg(x.item order by x.starts_at),'[]') into v_items from (
 select e.starts_at,jsonb_build_object('id',e.id,'title',e.title,'startsAt',e.starts_at,'activity',e.activity,'placeLabel',e.place_label,'capacity',e.capacity,
 'goingCount',(select count(*) from crew_event_rsvps r join crew_members m on m.user_id=r.user_id and m.crew_id=e.crew_id and m.left_at is null where r.event_id=e.id and r.choice='coming'),
 'joined',exists(select 1 from crew_event_rsvps r where r.event_id=e.id and r.user_id=auth.uid() and r.choice='coming'),
 'canManage',e.cancelled_at_2026 is null and e.starts_at>now() and (e.created_by=auth.uid() or v_role in ('co_captain','founder')),
 'cancelled',e.cancelled_at_2026 is not null,'revision',e.revision_2026,
 'hostName',coalesce(nullif(p.display_name,''),p.handle,u.pseudo)) item
 from crew_events e
 left join users u on u.id=e.created_by
 left join user_profiles p on p.user_id=e.created_by and social_profile_visible_2026(e.created_by)
 where e.crew_id=v_crew and e.starts_at>=now()-interval '1 day' order by e.starts_at limit 50) x;
 return jsonb_build_object('ok',true,'canCreate',v_role in ('captain','co_captain','founder'),'items',v_items);
end $$;

-- CREATE OR REPLACE retains existing ACLs; explicitly retain the original boundary.
revoke all on function public.crew_outings_2026() from public,anon;
grant execute on function public.crew_outings_2026() to authenticated,service_role;
