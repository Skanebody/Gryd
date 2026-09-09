-- Private crew conversation. No run, territorial award, XP or purchase required.
-- Writes are RPC-only, with current membership and expected audience rechecked.
create table public.crew_messages_2026 (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null,
  crew_id uuid not null references public.crews(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete cascade,
  body text not null check(length(btrim(body)) between 1 and 600),
  created_at timestamptz not null default now(), removed_at timestamptz,
  unique(author_id,client_id)
);
create index crew_messages_2026_recent on public.crew_messages_2026(crew_id,created_at desc,id desc) where removed_at is null;
create table public.crew_message_reports_2026 (
  message_id uuid not null references public.crew_messages_2026(id) on delete cascade,
  reporter_id uuid not null references public.users(id) on delete cascade,
  reason text not null check(reason in ('spam','harassment','other')),
  created_at timestamptz not null default now(), primary key(message_id,reporter_id)
);
alter table public.crew_messages_2026 enable row level security;
alter table public.crew_message_reports_2026 enable row level security;
revoke all on public.crew_messages_2026,public.crew_message_reports_2026 from public,anon,authenticated;
grant select(id,crew_id,author_id,body,created_at) on public.crew_messages_2026 to authenticated;
grant all on public.crew_messages_2026,public.crew_message_reports_2026 to service_role;

create function public.crew_message_visible_2026(p_message_id uuid) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 select auth.uid() is not null and exists(
   select 1 from crew_messages_2026 m where m.id=p_message_id and m.removed_at is null
   and exists(select 1 from crew_members cm where cm.crew_id=m.crew_id and cm.user_id=auth.uid() and cm.left_at is null)
   and not social_blocked_2026(auth.uid(),m.author_id)
   and not exists(select 1 from crew_message_reports_2026 r where r.message_id=m.id and r.reporter_id=auth.uid())
 )
$$;
create policy crew_messages_read_2026 on public.crew_messages_2026 for select to authenticated using(public.crew_message_visible_2026(id));

create function public.crew_conversation_2026(p_crew_id uuid,p_before_created_at timestamptz default null,p_before_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare v_role text; v_name text; v_items jsonb; v_has_more boolean;
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 select cm.role,c.name into v_role,v_name from crew_members cm join crews c on c.id=cm.crew_id
 where cm.user_id=auth.uid() and cm.crew_id=p_crew_id and cm.left_at is null;
 if not found then raise exception 'crew_changed'; end if;
 if (p_before_created_at is null)<>(p_before_id is null) then raise exception 'invalid_cursor'; end if;
 select coalesce(jsonb_agg(x.item order by x.created_at,x.id),'[]'::jsonb) into v_items from (
   select m.created_at,m.id,jsonb_build_object('id',m.id,'body',m.body,'createdAt',m.created_at,
     'mine',m.author_id=auth.uid(),'canRemove',m.author_id=auth.uid() or v_role in ('founder','co_captain'),
     'authorId',m.author_id,'authorName',coalesce(nullif(p.display_name,''),p.handle,u.pseudo,'Membre')) item
   from crew_messages_2026 m join users u on u.id=m.author_id
   -- SECURITY DEFINER must apply the same audience rule as direct profile reads.
   -- A crew message stays readable without disclosing a private profile identity.
   left join user_profiles p on p.user_id=m.author_id and social_profile_visible_2026(m.author_id)
   where m.crew_id=p_crew_id and crew_message_visible_2026(m.id)
   and (p_before_created_at is null or (m.created_at,m.id)<(p_before_created_at,p_before_id))
   order by m.created_at desc,m.id desc limit 61
 ) x;
 v_has_more:=jsonb_array_length(v_items)>60;
 if v_has_more then v_items:=v_items-0; end if;
 return jsonb_build_object('crewId',p_crew_id,'crewName',v_name,'myRole',v_role,'bodyMax',600,'windowSize',60,'messages',v_items,
   'olderCursor',case when v_has_more then jsonb_build_object('createdAt',v_items->0->>'createdAt','id',v_items->0->>'id') else null end);
end $$;

create function public.crew_message_send_2026(p_crew_id uuid,p_client_id uuid,p_body text) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid:=auth.uid(); v_message crew_messages_2026%rowtype; v_id uuid;
begin
 if v_uid is null then raise exception 'authentication_required'; end if;
 -- Membership row lock serializes this send against leaving this audience.
 perform 1 from crew_members where user_id=v_uid and crew_id=p_crew_id and left_at is null for update;
 if not found then raise exception 'crew_changed'; end if;
 if p_client_id is null or length(btrim(coalesce(p_body,''))) not between 1 and 600 then raise exception 'invalid_message'; end if;
 if crew_description_refusal(p_body) is not null then raise exception 'moderated'; end if;
 select * into v_message from crew_messages_2026 where author_id=v_uid and client_id=p_client_id;
 if found then
   if v_message.crew_id<>p_crew_id or v_message.body<>btrim(p_body) then raise exception 'message_request_changed'; end if;
   if v_message.removed_at is not null then raise exception 'message_removed'; end if;
   return jsonb_build_object('id',v_message.id,'replayed',true);
 end if;
 -- Anti-spam bound, not a game rule: no message creates a sporting advantage.
 if (select count(*) from crew_messages_2026 where author_id=v_uid and created_at>now()-interval '1 minute')>=10 then raise exception 'message_rate_limited'; end if;
 insert into crew_messages_2026(client_id,crew_id,author_id,body) values(p_client_id,p_crew_id,v_uid,btrim(p_body)) returning id into v_id;
 return jsonb_build_object('id',v_id,'replayed',false);
end $$;

create function public.crew_message_remove_2026(p_message_id uuid) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_message crew_messages_2026%rowtype; v_role text;
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 select * into v_message from crew_messages_2026 where id=p_message_id for update;
 if not found then raise exception 'message_unavailable'; end if;
 select role into v_role from crew_members where crew_id=v_message.crew_id and user_id=auth.uid() and left_at is null;
 if not found or (v_message.author_id<>auth.uid() and v_role not in ('founder','co_captain')) then raise exception 'forbidden'; end if;
 update crew_messages_2026 set removed_at=coalesce(removed_at,now()) where id=p_message_id;
end $$;
create function public.crew_message_report_2026(p_message_id uuid,p_reason text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 if exists(select 1 from crew_message_reports_2026 where message_id=p_message_id and reporter_id=auth.uid()) then return; end if;
 if not crew_message_visible_2026(p_message_id) then raise exception 'message_unavailable'; end if;
 if p_reason not in ('spam','harassment','other') or p_reason is null then raise exception 'invalid_report'; end if;
 insert into crew_message_reports_2026(message_id,reporter_id,reason) values(p_message_id,auth.uid(),p_reason) on conflict do nothing;
end $$;
revoke all on function public.crew_message_visible_2026(uuid),public.crew_conversation_2026(uuid,timestamptz,uuid),public.crew_message_send_2026(uuid,uuid,text),public.crew_message_remove_2026(uuid),public.crew_message_report_2026(uuid,text) from public,anon;
grant execute on function public.crew_message_visible_2026(uuid),public.crew_conversation_2026(uuid,timestamptz,uuid),public.crew_message_send_2026(uuid,uuid,text),public.crew_message_remove_2026(uuid),public.crew_message_report_2026(uuid,text) to authenticated,service_role;

-- Voluntary contribution is separate from crew_members.role and its permissions.
-- It is self-declared availability, never a verified ability or a sporting rank.
alter table public.crew_members add column sporting_role_2026 text
 check(sporting_role_2026 is null or sporting_role_2026 in ('welcomer','outing_host','route_scout'));
create function public.crew_sporting_roles_2026(p_crew_id uuid) returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 if not exists(select 1 from crew_members where crew_id=p_crew_id and user_id=auth.uid() and left_at is null) then raise exception 'crew_changed'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('userId',cm.user_id,'role',cm.sporting_role_2026)),'[]'::jsonb)
   from crew_members cm where cm.crew_id=p_crew_id and cm.left_at is null and not social_blocked_2026(auth.uid(),cm.user_id));
end $$;
create function public.crew_set_my_sporting_role_2026(p_crew_id uuid,p_role text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 if p_role is not null and p_role not in ('welcomer','outing_host','route_scout') then raise exception 'invalid_sporting_role'; end if;
 update crew_members set sporting_role_2026=p_role where crew_id=p_crew_id and user_id=auth.uid() and left_at is null;
 if not found then raise exception 'crew_changed'; end if;
end $$;
revoke all on function public.crew_sporting_roles_2026(uuid),public.crew_set_my_sporting_role_2026(uuid,text) from public,anon;
grant execute on function public.crew_sporting_roles_2026(uuid),public.crew_set_my_sporting_role_2026(uuid,text) to authenticated,service_role;
