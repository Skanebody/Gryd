// Actual 0124 + 0128 PostgreSQL functions and RLS. Storage gateway/upload, concurrent
// connections and deployment are not exercised by this local single DB test.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
const db = new PGlite(); let passed=0;
const id=n=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const q=async(s,p=[])=>(await db.query(s,p)).rows;
const val=async(s,p=[])=>Object.values((await q(s,p))[0])[0];
const as=async(n,fn)=>{ await db.query("select set_config('request.jwt.claim.sub',$1,false)",[n===null?'':id(n)]); await db.exec('set role authenticated'); try{return await fn()} finally{await db.exec('reset role')} };
const test=async(n,fn)=>{await fn(); console.log(`ok ${++passed} - ${n}`)};
try {
 await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth; create schema storage;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,storage to authenticated,anon,service_role;
 create table users(id uuid primary key,pseudo text); create table crews(id uuid primary key,name text default 'Fixture crew');
 create table crew_members(crew_id uuid references crews(id),user_id uuid references users(id),role text,left_at timestamptz,primary key(crew_id,user_id));
 create table user_profiles(user_id uuid primary key references users(id),handle text unique not null,display_name text,bio text,profile_visibility text not null default 'crew',updated_at timestamptz default now());
 create table follows(follower_id uuid,followee_id uuid); create table friendships(requester_id uuid,addressee_id uuid,status text); create table user_blocks(blocker_id uuid,blocked_pseudo text);
 create table runs(id uuid primary key,user_id uuid references users(id),ruleset_version text,status text,activity text,distance_m integer,duration_s integer);
 create table crew_events(id uuid primary key default gen_random_uuid(),crew_id uuid references crews(id),created_by uuid references users(id),title text,starts_at timestamptz,activity text,place_label text,capacity integer);
 create table crew_event_rsvps(event_id uuid references crew_events(id),user_id uuid references users(id),choice text,updated_at timestamptz default now(),primary key(event_id,user_id));
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,metadata jsonb);
 alter table storage.objects enable row level security; grant select,insert,delete on storage.objects to authenticated;
 create function crew_description_refusal(text) returns text language sql as $$select case when $1='fixture_banned' then 'moderated' else null end$$;
 create function crew_outing_place_refusal(text) returns text language sql as $$select case when $1='12 rue privée' then 'street_address' else null end$$;
 create function crew_outing_horizon_days() returns integer language sql as $$select 30$$;`);
 const oldSocial=readFileSync(new URL('../migrations/0011_social.sql',import.meta.url),'utf8');
 await db.exec('alter table user_profiles enable row level security; grant select on user_profiles to authenticated;');
 await db.exec(oldSocial.slice(oldSocial.indexOf('create policy user_profiles_select_visible'),oldSocial.indexOf('-- ── friendships : owner-only')));
 // Use the real non-spatial 0122 helper, with its private grants, so 0124's
 // map/challenge block integration executes instead of being skipped.
 const challenges=readFileSync(new URL('../migrations/0122_refonte_2026_crew_challenges.sql',import.meta.url),'utf8');
 await db.exec('create table challenge_identity_blocks_2026(blocker_id uuid,blocked_user_id uuid);');
 await db.exec(challenges.slice(challenges.indexOf('create function public.challenge_pair_blocked_2026'),challenges.indexOf('create function public.challenge_has_block_2026')));
 await db.exec('revoke all on function challenge_pair_blocked_2026(uuid,uuid) from public,anon,authenticated; grant execute on function challenge_pair_blocked_2026(uuid,uuid) to service_role;');
 await db.exec(readFileSync(new URL('../migrations/0124_refonte_2026_social.sql',import.meta.url),'utf8'));
 await db.exec(readFileSync(new URL('../migrations/0128_crew_outing_host_profile_visibility.sql',import.meta.url),'utf8'));
 for(let i=1;i<=5;i++) await db.query('insert into users(id) values($1)',[id(i)]);
 await db.query('insert into crews(id) values($1),($2)',[id(11),id(12)]);
 for(const [i,role] of [[1,'founder'],[2,'runner'],[3,'runner']]) await db.query('insert into crew_members values($1,$2,$3,null)',[id(11),id(i),role]);
 await db.query('insert into crew_members values($1,$2,$3,null)',[id(12),id(4),'founder']);
 const profile=n=>({handle:`runner${n}`,displayName:`Runner ${n}`,bio:'',visibility:'crew'});
 await test('profile writes are scoped to authenticated identity; private identity excluded from search',async()=>{
  for(let n=1;n<=4;n++) await as(n,()=>val('select save_my_social_profile_2026($1)',[profile(n)]));
  assert.equal((await as(1,()=>val('select my_social_profile_2026()'))).ownerId,id(1));
  assert.equal((await as(2,()=>val("select social_people_2026('runner')"))).length,2);
  assert.equal(await as(4,()=>val('select social_member_2026($1)',[id(1)])),null);
  await as(1,()=>val('select save_my_social_profile_2026($1)',[{...profile(1),visibility:'private'}]));
  assert.equal(await as(2,()=>val('select social_member_2026($1)',[id(1)])),null);
  await as(1,()=>val('select save_my_social_profile_2026($1)',[profile(1)]));
 });
 await test('avatar must reference the account own uploaded media; cross-owner storage denied',async()=>{
  const path=`${id(1)}/avatar/${id(101)}.jpg`;
  await as(1,()=>db.query("insert into storage.objects(bucket_id,name,metadata) values('social-2026',$1,$2)",[path,{size:200,mimetype:'image/jpeg'}]));
  await assert.rejects(()=>as(2,()=>val('select save_my_social_profile_2026($1)',[{...profile(2),avatarPath:path}])),/invalid_media/);
  assert.equal((await as(2,()=>q('select name from storage.objects'))).length,0);
  await as(1,()=>val('select save_my_social_profile_2026($1)',[{...profile(1),avatarPath:path}]));
  assert.equal((await as(2,()=>q('select name from storage.objects'))).length,1);
  assert.equal((await as(4,()=>q('select name from storage.objects'))).length,0);
 });
 await db.query('insert into runs values($1,$2,\'2026.1\',\'valid\',\'run\',5000,1800)',[id(51),id(1)]);
 let post;
 await test('publishing requires consent, real owned 2026 run and membership',async()=>{
  await assert.rejects(()=>as(1,()=>val('select social_publish_2026($1,$2)',[id(61),id(51)])),/consent_required/);
  await assert.rejects(()=>as(2,()=>val("select social_publish_2026($1,$2,'',null,true,$3)",[id(61),id(51),id(11)])),/run_unavailable/);
  await assert.rejects(()=>as(5,()=>val("select social_publish_2026($1,$2,'',null,true,$3)",[id(61),id(51),id(11)])),/no_crew/);
  await assert.rejects(()=>as(1,()=>val("select social_publish_2026($1,$2,'',null,true,$3)",[id(61),id(51),id(12)])),/crew_changed/);
  post=(await as(1,()=>val("select social_publish_2026($1,$2,'Sortie du matin',null,true,$3)",[id(61),id(51),id(11)]))).id;
  const again=await as(1,()=>val("select social_publish_2026($1,$2,'different',null,true,$3)",[id(62),id(51),id(11)])); assert.equal(again.id,post); assert.equal(again.replayed,true);
 });
 await test('feed and direct table RLS exclude other crews, anonymous and departed members',async()=>{
  assert.equal((await as(2,()=>val('select social_feed_2026()')))[0].distanceM,5000);
  for(const who of [4,null]) {assert.deepEqual(await as(who,()=>val('select social_feed_2026()')),[]);assert.equal((await as(who,()=>q('select id from social_posts_2026'))).length,0)}
  await db.query('update crew_members set left_at=now() where user_id=$1',[id(3)]);
  assert.deepEqual(await as(3,()=>val('select social_feed_2026()')),[]);
  await db.query('update crew_members set left_at=null where user_id=$1',[id(3)]);
  await assert.rejects(()=>as(2,()=>db.query('delete from social_posts_2026 where id=$1',[post])),/permission denied/);
 });
 await test('reactions are idempotent and comments require audience, preserve request idempotence',async()=>{
  for(let n=0;n<2;n++) await as(2,()=>val('select social_react_2026($1,true)',[post]));
  assert.equal((await as(1,()=>val('select social_feed_2026()')))[0].reactionCount,1);
  await assert.rejects(()=>as(4,()=>val('select social_comment_2026($1,$2,$3)',[post,id(70),'Bravo'])),/post_unavailable/);
  for(let n=0;n<2;n++) await as(2,()=>val('select social_comment_2026($1,$2,$3)',[post,id(70),'Bravo']));
  assert.equal((await as(1,()=>val('select social_comments_read_2026($1)',[post]))).length,1);
 });
 await test('reports persist and hide content for reporter; blocks revoke reads both ways',async()=>{
  const comment=(await as(1,()=>val('select social_comments_read_2026($1)',[post])))[0];
  await as(1,()=>val("select social_report_2026('other',null,$1)",[comment.id]));
  assert.deepEqual(await as(1,()=>val('select social_comments_read_2026($1)',[post])),[]);
  assert.equal((await as(1,()=>q('select id from social_comments_2026'))).length,0);
  await as(2,()=>val('select social_block_2026($1,true)',[id(1)]));
  assert.deepEqual(await as(2,()=>val('select social_feed_2026()')),[]);
  assert.equal(await as(1,()=>val('select social_member_2026($1)',[id(2)])),null);
  await as(2,()=>val('select social_block_2026($1,false)',[id(1)]));
 });
 await test('blocks cover inherited profile SELECTs and the map/challenge guard without weakening legacy blocks',async()=>{
  assert.equal((await as(2,()=>q('select user_id from user_profiles where user_id=$1',[id(1)]))).length,1);
  const mapBranch=()=>q('select owner_id from (values ($2::uuid)) ownership(owner_id) where not public.challenge_pair_blocked_2026($1,owner_id)',[id(2),id(1)]);
  assert.equal((await mapBranch()).length,1);
  await as(2,()=>val('select social_block_2026($1,true)',[id(1)]));
  for(const visibility of ['crew','public','friends']) {
   await db.query('update user_profiles set profile_visibility=$1 where user_id in ($2,$3)',[visibility,id(1),id(2)]);
   assert.equal((await as(2,()=>q('select user_id from user_profiles where user_id=$1',[id(1)]))).length,0);
   assert.equal((await as(1,()=>q('select user_id from user_profiles where user_id=$1',[id(2)]))).length,0);
   assert.equal((await as(1,()=>q('select user_id from user_profiles where user_id=$1',[id(1)]))).length,1);
  }
  assert.equal((await mapBranch()).length,0);
  assert.equal(await val('select challenge_pair_blocked_2026($1,$2)',[id(1),id(2)]),true);
  await assert.rejects(()=>as(2,()=>val('select challenge_pair_blocked_2026($1,$2)',[id(1),id(2)])),/permission denied/);
  await as(2,()=>val('select social_block_2026($1,false)',[id(1)]));
  assert.equal((await mapBranch()).length,1);
  await db.query('insert into challenge_identity_blocks_2026 values($1,$2)',[id(1),id(2)]);
  assert.equal((await mapBranch()).length,0);
  assert.deepEqual(await as(2,()=>val('select social_feed_2026()')),[]);
  assert.equal(await as(2,()=>val('select social_member_2026($1)',[id(1)])),null);
  await db.exec('delete from challenge_identity_blocks_2026');
  await db.query('update users set pseudo=$1 where id=$2',['historical_name',id(1)]);
  await db.query('insert into user_blocks values($1,$2)',[id(2),'historical_name']);
  assert.equal((await mapBranch()).length,0);
  assert.deepEqual(await as(2,()=>val('select social_feed_2026()')),[]);
  assert.equal(await as(2,()=>val('select social_member_2026($1)',[id(1)])),null);
  await db.exec('delete from user_blocks');
  await db.query("update user_profiles set profile_visibility='crew' where user_id in ($1,$2)",[id(1),id(2)]);
 });
 await test('post removal is owner-only and prevents resurrection by publication retry',async()=>{
  await assert.rejects(()=>as(2,()=>val('select social_remove_2026($1)',[post])),/forbidden/);
  await as(1,()=>val('select social_remove_2026($1)',[post]));
  assert.deepEqual(await as(2,()=>val('select social_feed_2026()')),[]);
  await assert.rejects(()=>as(1,()=>val("select social_publish_2026($1,$2,'',null,true,$3)",[id(61),id(51),id(11)])),/post_removed/);
 });
 const date=new Date(Date.now()+86400000).toISOString();
 await db.query('insert into crew_events(id,crew_id,created_by,title,starts_at,activity,place_label,capacity) values($1,$2,$3,$4,$5,$6,$7,2)',[id(80),id(11),id(1),'Sortie',date,'run','Parc']);
 await test('outing host identity follows real profile RLS for private, public, friends and crew audiences',async()=>{
  const original=(await q('select pseudo from users where id=$1',[id(1)]))[0].pseudo;
  await db.query("update users set pseudo='Public host pseudo' where id=$1",[id(1)]);
  await db.query("update user_profiles set display_name='Private host name',handle='private_host_handle',profile_visibility='private' where user_id=$1",[id(1)]);
  const identity=async(viewer,visible,expected)=>{
   const direct=await as(viewer,()=>q('select display_name,handle from user_profiles where user_id=$1',[id(1)]));
   assert.equal(direct.length,visible?1:0,'direct profile RLS matches the audience');
   const result=await as(viewer,()=>val('select crew_outings_2026()'));
   const outing=result.items.find(item=>item.id===id(80));
   assert.ok(outing,'the real outing remains readable');assert.equal(outing.hostName,expected);
   if(!visible){assert.equal(JSON.stringify(result).includes('Private host name'),false);assert.equal(JSON.stringify(result).includes('private_host_handle'),false)}
  };
  await identity(2,false,'Public host pseudo');await identity(1,true,'Private host name');
  await db.query('update user_profiles set display_name=null where user_id=$1',[id(1)]);
  await identity(2,false,'Public host pseudo');await identity(1,true,'private_host_handle');
  await db.query("update user_profiles set display_name='Private host name',profile_visibility='public' where user_id=$1",[id(1)]);
  await identity(2,true,'Private host name');
  await db.query("update user_profiles set profile_visibility='friends' where user_id=$1",[id(1)]);
  await identity(2,false,'Public host pseudo');
  await db.query("insert into friendships values($1,$2,'pending')",[id(2),id(1)]);
  await identity(2,false,'Public host pseudo');
  await db.query("update friendships set status='accepted' where requester_id=$1 and addressee_id=$2",[id(2),id(1)]);
  await identity(2,true,'Private host name');
  await db.query('delete from friendships where requester_id=$1 and addressee_id=$2',[id(2),id(1)]);
  await db.query("update user_profiles set profile_visibility='crew' where user_id=$1",[id(1)]);
  await identity(2,true,'Private host name');
  await db.query('update crew_members set left_at=now() where user_id=$1',[id(1)]);
  await identity(2,false,'Public host pseudo');
  await db.query('update crew_members set left_at=null where user_id=$1',[id(1)]);
  await as(2,()=>val('select social_block_2026($1,true)',[id(1)]));
  await identity(2,false,'Public host pseudo');
  await as(2,()=>val('select social_block_2026($1,false)',[id(1)]));
  await as(1,()=>val('select social_block_2026($1,true)',[id(2)]));
  await identity(2,false,'Public host pseudo');
  await as(1,()=>val('select social_block_2026($1,false)',[id(2)]));
  await as(1,()=>val('select save_my_social_profile_2026($1)',[profile(1)]));
  await db.query('update users set pseudo=$1 where id=$2',[original,id(1)]);
 });
 await test('outing privacy migration preserves caller grants, current crew boundary and profile RLS',async()=>{
  assert.equal(await val("select has_function_privilege('anon','public.crew_outings_2026()','execute')"),false);
  for(const role of ['authenticated','service_role'])assert.equal(await val('select has_function_privilege($1,\'public.crew_outings_2026()\',\'execute\')',[role]),true);
  assert.equal(await val("select relrowsecurity from pg_class where oid='public.user_profiles'::regclass"),true);
  assert.equal((await as(null,()=>val('select crew_outings_2026()'))).reason,'signed_out');
  assert.equal((await as(5,()=>val('select crew_outings_2026()'))).reason,'no_crew');
  assert.deepEqual((await as(4,()=>val('select crew_outings_2026()'))).items,[]);
  await db.query('update crew_members set left_at=now() where user_id=$1',[id(2)]);
  assert.equal((await as(2,()=>val('select crew_outings_2026()'))).reason,'no_crew');
  await db.query('update crew_members set left_at=null where user_id=$1',[id(2)]);
 });
 await test('RSVP checks active membership, capacity and sequential idempotence',async()=>{
  assert.equal((await as(4,()=>val('select crew_outing_rsvp_2026($1,true)',[id(80)]))).reason,'forbidden');
  for(let n=0;n<2;n++) assert.equal((await as(1,()=>val('select crew_outing_rsvp_2026($1,true)',[id(80)]))).joined,true);
  await as(2,()=>val('select crew_outing_rsvp_2026($1,true)',[id(80)]));
  assert.equal((await as(3,()=>val('select crew_outing_rsvp_2026($1,true)',[id(80)]))).reason,'full');
  await as(2,()=>val('select crew_outing_rsvp_2026($1,false)',[id(80)]));
  assert.equal((await as(3,()=>val('select crew_outing_rsvp_2026($1,true)',[id(80)]))).joined,true);
 });
 const change=(n,rev,cancel=false)=>as(n,()=>val('select crew_outing_change_2026($1,$2,$3,$4,$5,$6,$7,$8)',[id(80),rev,'Sortie modifiée',date,'bike','Parc',2,cancel]));
 await test('editing requires creator/direction, rejects stale revision, applies sport change',async()=>{
  assert.equal((await change(2,1)).reason,'forbidden');
  assert.equal((await change(1,1)).revision,2);
  assert.equal((await change(1,1)).reason,'stale');
  const read=await as(2,()=>val('select crew_outings_2026()')); assert.equal(read.items[0].activity,'bike');assert.equal(read.items[0].goingCount,2);
 });
 await test('cancellation clears attendance, is idempotent and rejects new RSVPs',async()=>{
  assert.equal((await change(1,2,true)).ok,true); assert.equal((await change(1,2,true)).ok,true);
  assert.equal((await as(2,()=>val('select crew_outing_rsvp_2026($1,true)',[id(80)]))).reason,'cancelled');
  const read=await as(2,()=>val('select crew_outings_2026()')); assert.equal(read.items[0].cancelled,true);assert.equal(read.items[0].goingCount,0);
 });
 console.log(`${passed} social PostgreSQL tests passed`);
} finally {await db.close()}
