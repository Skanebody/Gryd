-- Consented social sharing, separate from territorial authority and XP.
-- No historical local identity or activity is adopted by this migration.
alter table public.user_profiles add column if not exists avatar_path_2026 text;
alter table public.user_profiles add column if not exists profile_data_2026 jsonb not null default '{}';
alter table public.user_profiles add constraint profile_avatar_owner_2026 check(avatar_path_2026 is null or split_part(avatar_path_2026,'/',1)=user_id::text);

create table public.social_blocks_2026 (
  owner_id uuid references public.users(id) on delete cascade,
  target_id uuid references public.users(id) on delete cascade,
  created_at timestamptz not null default now(), target_label text, primary key(owner_id,target_id), check(owner_id<>target_id)
);
create table public.social_posts_2026 (
  id uuid primary key default gen_random_uuid(), client_id uuid not null,
  author_id uuid not null references public.users(id) on delete cascade,
  crew_id uuid not null references public.crews(id) on delete cascade,
  run_id uuid not null references public.runs(id) on delete cascade,
  body text not null default '' check(length(body)<=600), media_path text,
  consented_at timestamptz not null default now(), created_at timestamptz not null default now(),
  removed_at timestamptz, unique(author_id,client_id), unique(author_id,crew_id,run_id)
);
create index social_posts_2026_crew_time on public.social_posts_2026(crew_id,created_at desc);
create table public.social_reactions_2026 (
  post_id uuid references public.social_posts_2026(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(post_id,user_id)
);
create table public.social_comments_2026 (
  id uuid primary key default gen_random_uuid(), client_id uuid not null,
  post_id uuid not null references public.social_posts_2026(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete cascade,
  body text not null check(length(btrim(body)) between 1 and 400),
  created_at timestamptz not null default now(), removed_at timestamptz,
  unique(author_id,client_id)
);
create table public.social_reports_2026 (
  id uuid primary key default gen_random_uuid(), reporter_id uuid not null references public.users(id) on delete cascade,
  post_id uuid references public.social_posts_2026(id) on delete cascade,
  comment_id uuid references public.social_comments_2026(id) on delete cascade,
  reason text not null check(reason in ('harassment','privacy','inappropriate','other')),
  created_at timestamptz not null default now(), reviewed_at timestamptz,
  check((post_id is null) <> (comment_id is null))
);
create unique index social_reports_2026_post_unique on public.social_reports_2026(reporter_id,post_id) where post_id is not null;
create unique index social_reports_2026_comment_unique on public.social_reports_2026(reporter_id,comment_id) where comment_id is not null;

create function public.social_blocked_2026(p_a uuid,p_b uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select auth.uid() in (p_a,p_b) and (exists(select 1 from social_blocks_2026 where (owner_id=p_a and target_id=p_b) or (owner_id=p_b and target_id=p_a))
 or exists(select 1 from user_blocks b join users u on lower(u.pseudo)=lower(b.blocked_pseudo) where (b.blocker_id=p_a and u.id=p_b) or (b.blocker_id=p_b and u.id=p_a))
 or exists(select 1 from user_blocks b join user_profiles p on lower(p.handle)=lower(ltrim(b.blocked_pseudo,'@')) where (b.blocker_id=p_a and p.user_id=p_b) or (b.blocker_id=p_b and p.user_id=p_a)))
$$;
create function public.social_profile_visible_2026(p_user_id uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select auth.uid() is not null and (p_user_id=auth.uid() or (not social_blocked_2026(auth.uid(),p_user_id) and exists(
 select 1 from user_profiles p where p.user_id=p_user_id and (p.profile_visibility='public'
 or (p.profile_visibility in ('friends','crew') and exists(select 1 from friendships f where f.status='accepted' and ((f.requester_id=auth.uid() and f.addressee_id=p_user_id) or (f.addressee_id=auth.uid() and f.requester_id=p_user_id))))
 or (p.profile_visibility='crew' and exists(select 1 from crew_members a join crew_members b on a.crew_id=b.crew_id where a.user_id=auth.uid() and b.user_id=p_user_id and a.left_at is null and b.left_at is null))))))
$$;
-- Legacy readers also use direct profile SELECTs. Keep one audience authority,
-- including both directions of a block, for RPCs and those existing readers.
drop policy if exists user_profiles_select_visible on public.user_profiles;
create policy user_profiles_select_visible on public.user_profiles for select to authenticated
 using(public.social_profile_visible_2026(user_id));

-- The map and challenge services already call this private helper. Extending it
-- here propagates new stable blocks without converting them back into pseudos.
-- CREATE OR REPLACE preserves its existing service-only grants.
do $integration$ begin
 if to_regprocedure('public.challenge_pair_blocked_2026(uuid,uuid)') is not null then
 execute $definition$
 create or replace function public.challenge_pair_blocked_2026(p_a uuid,p_b uuid)
 returns boolean language sql stable security definer set search_path=public,pg_temp as $body$
  select exists(select 1 from public.social_blocks_2026 b where (b.owner_id=p_a and b.target_id=p_b) or (b.owner_id=p_b and b.target_id=p_a))
    or exists(select 1 from public.challenge_identity_blocks_2026 b where (b.blocker_id=p_a and b.blocked_user_id=p_b) or (b.blocker_id=p_b and b.blocked_user_id=p_a))
    or exists(select 1 from public.user_blocks b join public.users u on lower(u.pseudo)=lower(b.blocked_pseudo)
      where (b.blocker_id=p_a and u.id=p_b) or (b.blocker_id=p_b and u.id=p_a));
 $body$;
 create or replace function public.social_blocked_2026(p_a uuid,p_b uuid)
 returns boolean language sql stable security definer set search_path=public,pg_temp as $body$
  select auth.uid() in (p_a,p_b) and (public.challenge_pair_blocked_2026(p_a,p_b)
    or exists(select 1 from public.user_blocks b join public.user_profiles p on lower(p.handle)=lower(ltrim(b.blocked_pseudo,'@'))
      where (b.blocker_id=p_a and p.user_id=p_b) or (b.blocker_id=p_b and p.user_id=p_a)));
 $body$;
 $definition$;
 end if;
end $integration$;
create function public.social_post_visible_2026(p_post_id uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select auth.uid() is not null and exists(select 1 from social_posts_2026 p where p.id=p_post_id and p.removed_at is null
 and not social_blocked_2026(auth.uid(),p.author_id)
 and (p.author_id=auth.uid() or exists(select 1 from crew_members m where m.crew_id=p.crew_id and m.user_id=auth.uid() and m.left_at is null))
 and not exists(select 1 from social_reports_2026 r where r.reporter_id=auth.uid() and r.post_id=p.id))
$$;
create function public.social_media_readable_2026(p_path text) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select auth.uid() is not null and (split_part(p_path,'/',1)=auth.uid()::text
 or exists(select 1 from user_profiles p where p.avatar_path_2026=p_path and social_profile_visible_2026(p.user_id))
 or exists(select 1 from social_posts_2026 p where p.media_path=p_path and social_post_visible_2026(p.id)))
$$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('social-2026','social-2026',false,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy social_media_insert_2026 on storage.objects for insert to authenticated with check(bucket_id='social-2026' and split_part(name,'/',1)=auth.uid()::text and name ~ '^[0-9a-f-]{36}/(avatar|post)/[0-9a-f-]{36}\.(jpg|png|webp)$');
create policy social_media_read_2026 on storage.objects for select to authenticated using(bucket_id='social-2026' and public.social_media_readable_2026(name));
create policy social_media_delete_2026 on storage.objects for delete to authenticated using(bucket_id='social-2026' and split_part(name,'/',1)=auth.uid()::text);

create function public.social_validate_media_2026(p_path text,p_kind text) returns void language plpgsql security definer set search_path=public,storage,pg_temp as $$
begin
 if p_path is null then return; end if;
 if split_part(p_path,'/',1)<>auth.uid()::text or split_part(p_path,'/',2)<>p_kind
 or not exists(select 1 from storage.objects where bucket_id='social-2026' and name=p_path and metadata->>'mimetype' in ('image/jpeg','image/png','image/webp') and (metadata->>'size')::bigint between 1 and 5242880) then raise exception 'invalid_media'; end if;
end $$;
create function public.my_social_profile_2026() returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select case when auth.uid() is null then null else coalesce((select jsonb_build_object('ownerId',user_id,'profile',profile_data_2026 || jsonb_build_object('handle',handle,'displayName',coalesce(display_name,''),'bio',coalesce(bio,''),'avatarPath',avatar_path_2026,'visibility',profile_visibility)) from user_profiles where user_id=auth.uid()),jsonb_build_object('ownerId',auth.uid(),'profile',null)) end
$$;
create function public.save_my_social_profile_2026(p_profile jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid:=auth.uid(); v_handle text:=lower(btrim(p_profile->>'handle')); v_name text:=btrim(p_profile->>'displayName'); v_vis text:=coalesce(p_profile->>'visibility','crew'); v_path text:=nullif(p_profile->>'avatarPath',''); v_data jsonb;
begin
 if v_uid is null then raise exception 'authentication_required'; end if;
 if v_handle is null or v_handle !~ '^[a-z0-9_]{3,20}$' or v_handle in ('admin','gryd','support','moderator') then raise exception 'invalid_handle'; end if;
 if coalesce(length(v_name),0) not between 1 and 40 or length(coalesce(p_profile->>'bio',''))>280 or v_vis not in ('private','friends','crew','public') then raise exception 'invalid_profile'; end if;
 perform social_validate_media_2026(v_path,'avatar');
 -- Resolve existing pseudo-based blocks before changing that pseudo.
 insert into social_blocks_2026(owner_id,target_id,target_label)
 select b.blocker_id,v_uid,p.handle from user_blocks b join user_profiles p on p.user_id=v_uid and lower(ltrim(b.blocked_pseudo,'@'))=lower(p.handle) where b.blocker_id<>v_uid on conflict do nothing;
 v_data:=jsonb_build_object('title',left(coalesce(p_profile->>'title',''),80),'city',left(coalesce(p_profile->>'city',''),100),'cityId',left(coalesce(p_profile->>'cityId',''),100),'avatarInitials',left(coalesce(p_profile->>'avatarInitials',''),2));
 insert into user_profiles(user_id,handle,display_name,bio,profile_visibility,avatar_path_2026,profile_data_2026)
 values(v_uid,v_handle,v_name,nullif(p_profile->>'bio',''),v_vis,v_path,v_data)
 on conflict(user_id) do update set handle=excluded.handle,display_name=excluded.display_name,bio=excluded.bio,profile_visibility=excluded.profile_visibility,avatar_path_2026=excluded.avatar_path_2026,profile_data_2026=excluded.profile_data_2026,updated_at=now();
 return my_social_profile_2026();
exception when unique_violation then raise exception 'handle_taken';
end $$;
create function public.social_member_2026(p_user_id uuid) returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('id',user_id,'handle',handle,'name',coalesce(display_name,handle),'bio',bio,'avatarPath',avatar_path_2026,'isMe',user_id=auth.uid()) from user_profiles where user_id=p_user_id and social_profile_visible_2026(user_id)
$$;
create function public.social_people_2026(p_query text default '') returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce(jsonb_agg(x.item),'[]') from (select social_member_2026(p.user_id) item from user_profiles p where p.user_id<>auth.uid() and length(btrim(p_query))>=2 and (p.handle ilike '%'||replace(replace(btrim(p_query),'%','\%'),'_','\_')||'%' or p.display_name ilike '%'||replace(replace(btrim(p_query),'%','\%'),'_','\_')||'%') and social_profile_visible_2026(p.user_id) order by p.handle limit 30) x
$$;
create function public.social_member_by_handle_2026(p_handle text) returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select social_member_2026(user_id) from user_profiles where handle=lower(ltrim(btrim(p_handle),'@')) and social_profile_visible_2026(user_id)
$$;
create function public.social_crew_members_2026() returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce(jsonb_agg(social_member_2026(b.user_id)),'[]') from crew_members a join crew_members b on b.crew_id=a.crew_id and b.left_at is null where a.user_id=auth.uid() and a.left_at is null and social_profile_visible_2026(b.user_id)
$$;
create function public.social_block_list_2026() returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',target_id,'name',target_label)),'[]') from social_blocks_2026 where owner_id=auth.uid()
$$;
create function public.social_publication_context_2026(p_run_id uuid) returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('runId',r.id,'activity',r.activity,'distanceM',r.distance_m,'durationS',r.duration_s,'crewName',c.name,'crewId',c.id,'profileReady',exists(select 1 from user_profiles where user_id=auth.uid()),'published',exists(select 1 from social_posts_2026 p where p.run_id=r.id and p.author_id=auth.uid() and p.crew_id=c.id))
 from runs r join crew_members m on m.user_id=r.user_id and m.left_at is null join crews c on c.id=m.crew_id where r.id=p_run_id and r.user_id=auth.uid() and r.ruleset_version='2026.1' and r.status in ('valid','partial')
$$;

create function public.social_publish_2026(p_client_id uuid,p_run_id uuid,p_body text default '',p_media_path text default null,p_consent boolean default false,p_expected_crew_id uuid default null) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid:=auth.uid(); v_crew uuid; v_id uuid;
begin
 if v_uid is null then raise exception 'authentication_required'; end if;
 if p_consent is distinct from true then raise exception 'consent_required'; end if;
 if p_client_id is null or length(coalesce(p_body,''))>600 then raise exception 'invalid_post'; end if;
 select crew_id into v_crew from crew_members where user_id=v_uid and left_at is null for update;
 if v_crew is null then raise exception 'no_crew'; end if;
 if p_expected_crew_id is distinct from v_crew then raise exception 'crew_changed'; end if;
 if not exists(select 1 from user_profiles where user_id=v_uid) then raise exception 'profile_required'; end if;
 if not exists(select 1 from runs where id=p_run_id and user_id=v_uid and ruleset_version='2026.1' and status in ('valid','partial')) then raise exception 'run_unavailable'; end if;
 if public.crew_description_refusal(coalesce(p_body,'')) is not null then raise exception 'moderated'; end if;
 perform social_validate_media_2026(p_media_path,'post');
 perform pg_advisory_xact_lock(hashtextextended(v_uid::text,113));
 select id into v_id from social_posts_2026 where author_id=v_uid and (client_id=p_client_id or (crew_id=v_crew and run_id=p_run_id));
 if v_id is not null then
   if exists(select 1 from social_posts_2026 where id=v_id and removed_at is not null) then raise exception 'post_removed'; end if;
   return jsonb_build_object('id',v_id,'replayed',true);
 end if;
 insert into social_posts_2026(client_id,author_id,crew_id,run_id,body,media_path) values(p_client_id,v_uid,v_crew,p_run_id,btrim(coalesce(p_body,'')),p_media_path) returning id into v_id;
 return jsonb_build_object('id',v_id,'replayed',false);
end $$;
create function public.social_feed_2026(p_activity text default 'run',p_post_id uuid default null) returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce(jsonb_agg(x.item order by x.created_at desc),'[]') from (
 select p.created_at,jsonb_build_object('id',p.id,'body',p.body,'mediaPath',p.media_path,'createdAt',p.created_at,'mine',p.author_id=auth.uid(),
 'author',jsonb_build_object('id',p.author_id,'handle',u.handle,'name',coalesce(u.display_name,u.handle),'avatarPath',case when social_profile_visible_2026(p.author_id) then u.avatar_path_2026 else null end),
 'activity',r.activity,'distanceM',r.distance_m,'durationS',r.duration_s,
 'reactionCount',(select count(*) from social_reactions_2026 a where a.post_id=p.id and not social_blocked_2026(auth.uid(),a.user_id)),
 'reacted',exists(select 1 from social_reactions_2026 a where a.post_id=p.id and a.user_id=auth.uid()),
 'commentCount',(select count(*) from social_comments_2026 c where c.post_id=p.id and c.removed_at is null and not social_blocked_2026(auth.uid(),c.author_id))) item
 from social_posts_2026 p join runs r on r.id=p.run_id join user_profiles u on u.user_id=p.author_id
 where r.activity=p_activity and (p_post_id is null or p.id=p_post_id) and social_post_visible_2026(p.id)
 order by p.created_at desc limit 50) x
$$;
create function public.social_comments_read_2026(p_post_id uuid) returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce(jsonb_agg(x.item order by x.created_at),'[]') from (
 select c.created_at,jsonb_build_object('id',c.id,'body',c.body,'createdAt',c.created_at,'mine',c.author_id=auth.uid(),'author',jsonb_build_object('id',c.author_id,'handle',p.handle,'name',coalesce(p.display_name,p.handle))) item
 from social_comments_2026 c join user_profiles p on p.user_id=c.author_id where c.post_id=p_post_id and social_post_visible_2026(p_post_id) and c.removed_at is null and not social_blocked_2026(auth.uid(),c.author_id)
 and not exists(select 1 from social_reports_2026 r where r.reporter_id=auth.uid() and r.comment_id=c.id) order by c.created_at desc limit 100) x
$$;
create function public.social_react_2026(p_post_id uuid,p_reacted boolean) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not social_post_visible_2026(p_post_id) then raise exception 'post_unavailable'; end if;
 if p_reacted is true then insert into social_reactions_2026(post_id,user_id) values(p_post_id,auth.uid()) on conflict do nothing;
 else delete from social_reactions_2026 where post_id=p_post_id and user_id=auth.uid(); end if;
end $$;
create function public.social_comment_2026(p_post_id uuid,p_client_id uuid,p_body text) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not social_post_visible_2026(p_post_id) then raise exception 'post_unavailable'; end if;
 if not exists(select 1 from user_profiles where user_id=auth.uid()) then raise exception 'profile_required'; end if;
 if p_client_id is null or length(btrim(coalesce(p_body,''))) not between 1 and 400 then raise exception 'invalid_comment'; end if;
 if public.crew_description_refusal(p_body) is not null then raise exception 'moderated'; end if;
 insert into social_comments_2026(post_id,author_id,client_id,body) values(p_post_id,auth.uid(),p_client_id,btrim(p_body)) on conflict(author_id,client_id) do nothing;
end $$;
create function public.social_remove_2026(p_post_id uuid default null,p_comment_id uuid default null) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 if p_comment_id is not null then update social_comments_2026 set removed_at=coalesce(removed_at,now()) where id=p_comment_id and author_id=auth.uid();
 else update social_posts_2026 set removed_at=coalesce(removed_at,now()) where id=p_post_id and author_id=auth.uid(); end if;
 if not found then raise exception 'forbidden'; end if;
end $$;
create function public.social_report_2026(p_reason text,p_post_id uuid default null,p_comment_id uuid default null) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_post uuid:=p_post_id;
begin
 if p_comment_id is not null then select post_id into v_post from social_comments_2026 where id=p_comment_id and removed_at is null; end if;
 if not social_post_visible_2026(v_post) then raise exception 'post_unavailable'; end if;
 insert into social_reports_2026(reporter_id,post_id,comment_id,reason) values(auth.uid(),case when p_comment_id is null then v_post else null end,p_comment_id,p_reason) on conflict do nothing;
end $$;
create function public.social_block_2026(p_user_id uuid,p_blocked boolean) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or p_user_id is null or p_user_id=auth.uid() then raise exception 'invalid_user'; end if;
 if p_blocked is true then
 insert into social_blocks_2026(owner_id,target_id,target_label) values(auth.uid(),p_user_id,(select coalesce(display_name,handle) from user_profiles where user_id=p_user_id and social_profile_visible_2026(p_user_id))) on conflict do nothing;
 delete from follows where (follower_id=auth.uid() and followee_id=p_user_id) or (followee_id=auth.uid() and follower_id=p_user_id);
 update friendships set status='rejected' where status in ('pending','accepted') and least(requester_id,addressee_id)=least(auth.uid(),p_user_id) and greatest(requester_id,addressee_id)=greatest(auth.uid(),p_user_id);
 else delete from social_blocks_2026 where owner_id=auth.uid() and target_id=p_user_id; end if;
end $$;

-- All social writes are RPC-only. Direct reads obey the same live audience.
alter table social_blocks_2026 enable row level security;
alter table social_posts_2026 enable row level security;
alter table social_reactions_2026 enable row level security;
alter table social_comments_2026 enable row level security;
alter table social_reports_2026 enable row level security;
revoke all on social_blocks_2026,social_posts_2026,social_reactions_2026,social_comments_2026,social_reports_2026 from anon,authenticated;
grant select(id,author_id,crew_id,body,media_path,created_at,removed_at) on social_posts_2026 to authenticated;
grant select on social_comments_2026,social_reactions_2026 to authenticated;
grant all on social_blocks_2026,social_posts_2026,social_reactions_2026,social_comments_2026,social_reports_2026 to service_role;
create policy social_posts_read on social_posts_2026 for select to authenticated using(social_post_visible_2026(id));
create function public.social_comment_visible_2026(p_comment_id uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from social_comments_2026 c where c.id=p_comment_id and social_post_visible_2026(c.post_id) and c.removed_at is null and not social_blocked_2026(auth.uid(),c.author_id) and not exists(select 1 from social_reports_2026 r where r.reporter_id=auth.uid() and r.comment_id=c.id))
$$;
create policy social_comments_read on social_comments_2026 for select to authenticated using(social_comment_visible_2026(id));
create policy social_reactions_read on social_reactions_2026 for select to authenticated using(social_post_visible_2026(post_id) and not social_blocked_2026(auth.uid(),user_id));
do $$ declare r record; begin
 for r in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and (p.proname like 'social%2026' or p.proname in ('my_social_profile_2026','save_my_social_profile_2026')) loop
 execute format('revoke all on function %s from public,anon,authenticated',r.signature);
 execute format('grant execute on function %s to authenticated,service_role',r.signature);
 end loop;
end $$;
revoke all on function social_validate_media_2026(text,text) from authenticated;

-- Existing crew rendez-vous gain RSVP and revision-checked editing.
alter table crew_events add column cancelled_at_2026 timestamptz;
alter table crew_events add column revision_2026 integer not null default 1;
drop index if exists crew_events_no_duplicate_idx;
create unique index crew_events_no_duplicate_idx on crew_events(crew_id,created_by,starts_at,lower(btrim(title))) where starts_at is not null and cancelled_at_2026 is null;
create function public.crew_outings_2026() returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
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
 'cancelled',e.cancelled_at_2026 is not null,'revision',e.revision_2026,'hostName',coalesce(p.display_name,p.handle)) item
 from crew_events e left join user_profiles p on p.user_id=e.created_by where e.crew_id=v_crew and e.starts_at>=now()-interval '1 day' order by e.starts_at limit 50) x;
 return jsonb_build_object('ok',true,'canCreate',v_role in ('captain','co_captain','founder'),'items',v_items);
end $$;
create function public.crew_outing_rsvp_2026(p_event_id uuid,p_joined boolean) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare e crew_events; n integer;
begin
 if auth.uid() is null then return jsonb_build_object('ok',false,'reason','signed_out'); end if;
 select * into e from crew_events where id=p_event_id for update;
 if not found or not exists(select 1 from crew_members where crew_id=e.crew_id and user_id=auth.uid() and left_at is null) then return jsonb_build_object('ok',false,'reason','forbidden'); end if;
 if p_joined is false then delete from crew_event_rsvps where event_id=p_event_id and user_id=auth.uid(); return jsonb_build_object('ok',true,'joined',false); end if;
 if p_joined is null then return jsonb_build_object('ok',false,'reason','invalid'); end if;
 if e.cancelled_at_2026 is not null then return jsonb_build_object('ok',false,'reason','cancelled'); end if;
 if e.starts_at is null or e.starts_at<=now() then return jsonb_build_object('ok',false,'reason','started'); end if;
 if exists(select 1 from crew_event_rsvps where event_id=p_event_id and user_id=auth.uid() and choice='coming') then return jsonb_build_object('ok',true,'joined',true); end if;
 select count(*) into n from crew_event_rsvps r join crew_members m on m.user_id=r.user_id and m.crew_id=e.crew_id and m.left_at is null where r.event_id=p_event_id and r.choice='coming';
 if e.capacity is not null and n>=e.capacity then return jsonb_build_object('ok',false,'reason','full'); end if;
 insert into crew_event_rsvps(event_id,user_id,choice) values(p_event_id,auth.uid(),'coming') on conflict(event_id,user_id) do update set choice='coming',updated_at=now();
 return jsonb_build_object('ok',true,'joined',true);
end $$;
create function public.crew_outing_change_2026(p_event_id uuid,p_revision integer,p_title text,p_starts_at timestamptz,p_activity text,p_place_label text,p_capacity integer,p_cancelled boolean default false) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare e crew_events; v_role text; n integer;
begin
 if auth.uid() is null then return jsonb_build_object('ok',false,'reason','signed_out'); end if;
 select * into e from crew_events where id=p_event_id for update;
 select role into v_role from crew_members where crew_id=e.crew_id and user_id=auth.uid() and left_at is null;
 if e.id is null or v_role is null or (e.created_by<>auth.uid() and v_role not in ('co_captain','founder')) then return jsonb_build_object('ok',false,'reason','forbidden'); end if;
 if e.cancelled_at_2026 is not null then return jsonb_build_object('ok',p_cancelled is true,'reason','cancelled'); end if;
 if e.starts_at<=now() then return jsonb_build_object('ok',false,'reason','started'); end if;
 if p_revision is distinct from e.revision_2026 then return jsonb_build_object('ok',false,'reason','stale'); end if;
 if p_cancelled is true then update crew_events set cancelled_at_2026=now(),revision_2026=revision_2026+1 where id=e.id; delete from crew_event_rsvps where event_id=e.id; return jsonb_build_object('ok',true,'cancelled',true); end if;
 if length(btrim(coalesce(p_title,''))) not between 1 and 80 or length(btrim(coalesce(p_place_label,''))) not between 1 and 80 or p_activity is null or p_activity not in ('run','bike') or p_capacity is not null and p_capacity not between 2 and 50 or p_starts_at is null or p_starts_at<=now() or p_starts_at>now()+make_interval(days=>public.crew_outing_horizon_days()) then return jsonb_build_object('ok',false,'reason','invalid'); end if;
 if crew_outing_place_refusal(p_place_label) is not null then return jsonb_build_object('ok',false,'reason','place_looks_like_address'); end if;
 if crew_description_refusal(p_title) is not null or crew_description_refusal(p_place_label) is not null then return jsonb_build_object('ok',false,'reason','moderated'); end if;
 select count(*) into n from crew_event_rsvps r join crew_members m on m.user_id=r.user_id and m.crew_id=e.crew_id and m.left_at is null where r.event_id=e.id and r.choice='coming';
 if p_capacity is not null and n>p_capacity then return jsonb_build_object('ok',false,'reason','capacity_below_attendance'); end if;
 update crew_events set title=btrim(p_title),starts_at=p_starts_at,activity=p_activity,place_label=btrim(p_place_label),capacity=p_capacity,revision_2026=revision_2026+1 where id=e.id;
 return jsonb_build_object('ok',true,'revision',e.revision_2026+1);
exception when unique_violation then return jsonb_build_object('ok',false,'reason','duplicate');
end $$;
revoke all on function crew_outings_2026(),crew_outing_rsvp_2026(uuid,boolean),crew_outing_change_2026(uuid,integer,text,timestamptz,text,text,integer,boolean) from public,anon;
grant execute on function crew_outings_2026(),crew_outing_rsvp_2026(uuid,boolean),crew_outing_change_2026(uuid,integer,text,timestamptz,text,text,integer,boolean) to authenticated,service_role;

-- Existing follow/friend APIs use this one relation gate. New blocks must also
-- prevent requests through the installed older endpoints.
create or replace function public.social_pair_state(p_a uuid,p_b uuid) returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object(
 'iFollow',exists(select 1 from follows where follower_id=p_a and followee_id=p_b),
 'followsMe',exists(select 1 from follows where follower_id=p_b and followee_id=p_a),
 'friend',exists(select 1 from friendships where status='accepted' and least(requester_id,addressee_id)=least(p_a,p_b) and greatest(requester_id,addressee_id)=greatest(p_a,p_b)),
 'friendPending',exists(select 1 from friendships where status='pending' and least(requester_id,addressee_id)=least(p_a,p_b) and greatest(requester_id,addressee_id)=greatest(p_a,p_b)),
 'blocked',social_blocked_2026(p_a,p_b) or exists(select 1 from friendships where status='blocked' and least(requester_id,addressee_id)=least(p_a,p_b) and greatest(requester_id,addressee_id)=greatest(p_a,p_b)))
$$;
revoke all on function social_pair_state(uuid,uuid) from public,anon,authenticated;

-- Keep old entry points coherent with cancellation without changing their
-- validated creation rules. Fail if the known source signature has drifted.
do $$ declare signature text; original text; updated text; begin
 foreach signature in array array['public.crew_outing_context()','public.crew_outing_create(text,timestamp with time zone,text,text,text,text,integer)'] loop
  if to_regprocedure(signature) is not null then
   original:=pg_get_functiondef(to_regprocedure(signature));
   updated:=replace(original,'e.starts_at > now()','e.starts_at > now() and e.cancelled_at_2026 is null');
   updated:=replace(updated,'and e.starts_at = p_starts_at','and e.starts_at = p_starts_at and e.cancelled_at_2026 is null');
   if original=updated then raise exception 'outing_cancellation_adapter_drift'; end if;
   execute updated;
  end if;
 end loop;
end $$;
