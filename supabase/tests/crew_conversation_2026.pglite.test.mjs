// Runs the actual 0116 SQL and RLS. Base membership/social moderation dependencies
// are minimal fixtures; profile visibility uses the actual 0113 helper and policy.
// Remote deployment and concurrent connections are not exercised.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
const db=new PGlite();const id=n=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const val=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0];
const as=async(n,fn)=>{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[n===null?'':id(n)]);await db.exec('set role authenticated');try{return await fn()}finally{await db.exec('reset role')}};
let passed=0;const test=async(name,fn)=>{await fn();console.log(`ok ${++passed} - ${name}`)};
try {
 await db.exec(`create role authenticated;create role anon;create role service_role;create schema auth;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated,anon,service_role;
 create table users(id uuid primary key,pseudo text);create table crews(id uuid primary key,name text);
 create table crew_members(crew_id uuid,user_id uuid,role text,left_at timestamptz,primary key(crew_id,user_id));
 create table user_profiles(user_id uuid primary key,display_name text,handle text,profile_visibility text not null default 'crew');
 create table friendships(requester_id uuid,addressee_id uuid,status text);
 create table fixture_blocks(owner_id uuid,target_id uuid);
 create function social_blocked_2026(uuid,uuid) returns boolean language sql stable as $$select exists(select 1 from fixture_blocks where (owner_id=$1 and target_id=$2) or (owner_id=$2 and target_id=$1))$$;
 create function crew_description_refusal(text) returns text language sql as $$select case when $1='fixture_banned' then 'moderated' else null end$$;`);
 const socialSql=readFileSync(new URL('../migrations/0113_refonte_2026_social.sql',import.meta.url),'utf8');
 const visibilityStart=socialSql.indexOf('create function public.social_profile_visible_2026(');
 const visibilityEnd=socialSql.indexOf('$$;',visibilityStart)+3;
 assert.ok(visibilityStart>=0&&visibilityEnd>visibilityStart,'actual profile visibility helper is present');
 await db.exec(socialSql.slice(visibilityStart,visibilityEnd));
 const visibilityPolicy=socialSql.match(/create policy user_profiles_select_visible[\s\S]*?;/)?.[0];
 assert.ok(visibilityPolicy,'actual direct-read profile policy is present');
 await db.exec('alter table user_profiles enable row level security;grant select on user_profiles to authenticated;');
 await db.exec(visibilityPolicy);
 await db.exec(readFileSync(new URL('../migrations/0116_refonte_2026_crew_conversation.sql',import.meta.url),'utf8'));
 for(let n=1;n<=5;n++){await db.query('insert into users values($1,$2)',[id(n),`Runner ${n}`]);await db.query('insert into user_profiles(user_id,display_name,handle) values($1,$2,$3)',[id(n),`Runner ${n}`,`runner${n}`])}
 await db.query('insert into crews values($1,$2),($3,$4)',[id(11),'Paris',id(12),'Lille']);
 for(const [n,crew,role] of [[1,11,'founder'],[2,11,'runner'],[3,11,'co_captain'],[4,12,'founder']])await db.query('insert into crew_members(crew_id,user_id,role,left_at) values($1,$2,$3,null)',[id(crew),id(n),role]);
 const send=(n,client,body='On se retrouve au parc ?')=>as(n,()=>val('select crew_message_send_2026($1,$2,$3)',[id(11),id(client),body]));
 const read=n=>as(n,()=>val('select crew_conversation_2026($1)',[id(11)]));
 let first;
 await test('conversation starts empty and every active member can send without a recorded run',async()=>{
  assert.equal((await read(2)).messages.length,0);first=(await send(2,101)).id;
  const result=await read(1);assert.equal(result.messages[0].body,'On se retrouve au parc ?');assert.equal(result.messages[0].authorName,'Runner 2');assert.equal(result.messages[0].mine,false);assert.equal(result.bodyMax,600);
 });
 await test('chat identity obeys real private, public, friends and crew profile visibility with public pseudo fallback',async()=>{
  const identity=async(viewer,visible,expectedName)=>{
   const direct=await as(viewer,()=>db.query('select display_name,handle from user_profiles where user_id=$1',[id(2)]));
   assert.equal(direct.rows.length,visible?1:0);
   const conversation=await read(viewer);
   assert.equal(conversation.messages.find(message=>message.id===first)?.authorName,expectedName);
   if(!visible){assert.equal(JSON.stringify(conversation).includes('Private identity'),false);assert.equal(JSON.stringify(conversation).includes('private_handle'),false)}
  };
  await db.query("update user_profiles set display_name='Private identity',handle='private_handle',profile_visibility='private' where user_id=$1",[id(2)]);
  await identity(1,false,'Runner 2');
  await identity(2,true,'Private identity');
  await db.query("update user_profiles set display_name=null where user_id=$1",[id(2)]);
  await identity(1,false,'Runner 2'); // Hidden handle must not become the fallback.
  await identity(2,true,'private_handle');
  await db.query("update user_profiles set display_name='Private identity',profile_visibility='public' where user_id=$1",[id(2)]);
  await identity(1,true,'Private identity');
  await db.query("update user_profiles set profile_visibility='friends' where user_id=$1",[id(2)]);
  await identity(1,false,'Runner 2'); // Sharing a crew does not override friends-only.
  await db.query("insert into friendships values($1,$2,'pending')",[id(2),id(1)]);
  await identity(1,false,'Runner 2');
  await db.exec("update friendships set status='accepted'");
  await identity(1,true,'Private identity');
  await db.exec('delete from friendships');
  await db.query("update user_profiles set profile_visibility='crew' where user_id=$1",[id(2)]);
  await identity(1,true,'Private identity');
  await db.query('update crew_members set left_at=now() where user_id=$1',[id(2)]);
  await identity(1,false,'Runner 2'); // Old messages remain; former crew membership grants no profile access.
  await db.query('update crew_members set left_at=null where user_id=$1',[id(2)]);
  await db.query("update user_profiles set display_name='Runner 2',handle='runner2',profile_visibility='crew' where user_id=$1",[id(2)]);
 });
 await test('anonymous, non-members and wrong audiences cannot read or send',async()=>{
  for(const who of [null,4,5]){await assert.rejects(()=>read(who),/authentication_required|crew_changed/);await assert.rejects(()=>send(who,102),/authentication_required|crew_changed/)}
  await assert.rejects(()=>as(2,()=>val('select crew_message_send_2026($1,$2,$3)',[id(12),id(102),'Hello'])),/crew_changed/);
 });
 await test('idempotent retry returns same id, while changed body cannot silently replace a prior send',async()=>{
  assert.equal((await send(2,101)).id,first);assert.equal((await send(2,101)).replayed,true);
  await assert.rejects(()=>send(2,101,'Changed draft'),/message_request_changed/);assert.equal((await read(1)).messages.length,1);
 });
 await test('RLS excludes outsider and departed member including their own messages; table writes denied',async()=>{
  assert.equal((await as(4,()=>db.query('select id from crew_messages_2026'))).rows.length,0);
  await db.query('update crew_members set left_at=now() where user_id=$1',[id(2)]);
  assert.equal((await as(2,()=>db.query('select id from crew_messages_2026'))).rows.length,0);await assert.rejects(()=>read(2),/crew_changed/);await assert.rejects(()=>send(2,103),/crew_changed/);
  await db.query('update crew_members set left_at=null where user_id=$1',[id(2)]);
  await assert.rejects(()=>as(2,()=>db.query('delete from crew_messages_2026 where id=$1',[first])),/permission denied/);
  await assert.rejects(()=>as(2,()=>db.query('insert into crew_messages_2026(client_id,crew_id,author_id,body) values($1,$2,$3,$4)',[id(104),id(11),id(1),'Forged author'])),/permission denied/);
 });
 await test('only author or real crew leadership can remove; removal and retries cannot resurrect content',async()=>{
  const leaderPost=(await send(1,105,'Bonjour au crew')).id;
  await db.query("insert into crew_members(crew_id,user_id,role,left_at) values($1,$2,'captain',null)",[id(11),id(5)]);
  assert.equal((await read(5)).messages.find(m=>m.id===leaderPost).canRemove,false);
  await assert.rejects(()=>as(5,()=>val('select crew_message_remove_2026($1)',[leaderPost])),/forbidden/);
  await assert.rejects(()=>as(2,()=>val('select crew_message_remove_2026($1)',[leaderPost])),/forbidden/);
  await assert.rejects(()=>as(4,()=>val('select crew_message_remove_2026($1)',[first])),/forbidden/);
  await as(3,()=>val('select crew_message_remove_2026($1)',[first]));
  assert.equal((await read(1)).messages.some(m=>m.id===first),false);await assert.rejects(()=>send(2,101),/message_removed/);
 });
 await test('reports persist, hide for reporter only, and bilateral block filters RPC and table reads',async()=>{
  const message=(await send(2,106,'Sortie tranquille dimanche')).id;
  await as(1,()=>val("select crew_message_report_2026($1,'spam')",[message]));
  assert.equal((await read(1)).messages.some(m=>m.id===message),false);assert.equal((await read(3)).messages.some(m=>m.id===message),true);
  assert.equal((await as(1,()=>db.query('select id from crew_messages_2026 where id=$1',[message]))).rows.length,0);
  await db.query('insert into fixture_blocks values($1,$2)',[id(3),id(2)]);
  assert.equal((await read(3)).messages.some(m=>m.authorId===id(2)),false);
  await as(3,()=>val('select crew_message_send_2026($1,$2,$3)',[id(11),id(107),'À bientôt']));
  assert.equal((await read(2)).messages.some(m=>m.authorId===id(3)),false);
 });
 await test('input bounds, moderation and actual persisted anti-spam count are enforced by the server',async()=>{
  for(const body of ['', ' '.repeat(20), 'x'.repeat(601)])await assert.rejects(()=>send(2,108,body),/invalid_message/);
  await assert.rejects(()=>send(2,108,'fixture_banned'),/moderated/);
  const existing=Number(await val('select count(*) from crew_messages_2026 where author_id=$1',[id(2)]));
  for(let n=existing;n<10;n++)await send(2,200+n,`Message ${n}`);
  await assert.rejects(()=>send(2,300,'Too many'),/message_rate_limited/);
 });
 await test('voluntary sporting role is self assigned, audience scoped, and never changes administrative power',async()=>{
  await as(2,()=>val("select crew_set_my_sporting_role_2026($1,'outing_host')",[id(11)]));
  assert.equal(await val('select role from crew_members where user_id=$1',[id(2)]),'runner');
  assert.equal((await as(1,()=>val('select crew_sporting_roles_2026($1)',[id(11)]))).find(item=>item.userId===id(2)).role,'outing_host');
  await assert.rejects(()=>as(4,()=>val('select crew_sporting_roles_2026($1)',[id(11)])),/crew_changed/);
  await assert.rejects(()=>as(2,()=>val("select crew_set_my_sporting_role_2026($1,'founder')",[id(11)])),/invalid_sporting_role/);
  await as(2,()=>val('select crew_set_my_sporting_role_2026($1,null)',[id(11)]));
  assert.equal(await val('select sporting_role_2026 from crew_members where user_id=$1',[id(2)]),null);
 });
 await test('keyset pagination has no overlap, handles equal timestamps, and retains audience checks',async()=>{
  for(let n=0;n<65;n++)await db.query('insert into crew_messages_2026(id,client_id,crew_id,author_id,body,created_at) values($1,$2,$3,$4,$5,$6)',[id(400+n),id(500+n),id(11),id(1),`Earlier ${n}`,'2026-01-01T10:00:00Z']);
  const newest=await read(1);assert.equal(newest.messages.length,60);assert.ok(newest.olderCursor);
  const cursor=newest.olderCursor;
  const older=await as(1,()=>val('select crew_conversation_2026($1,$2,$3)',[id(11),cursor.createdAt,cursor.id]));
  assert.ok(older.messages.length>0);assert.equal(older.olderCursor,null);
  assert.equal(older.messages.some(m=>newest.messages.some(n=>n.id===m.id)),false);
  assert.equal(new Set([...newest.messages,...older.messages].map(m=>m.id)).size,newest.messages.length+older.messages.length);
  await assert.rejects(()=>as(4,()=>val('select crew_conversation_2026($1,$2,$3)',[id(11),cursor.createdAt,cursor.id])),/crew_changed/);
  await assert.rejects(()=>as(1,()=>val('select crew_conversation_2026($1,$2,null)',[id(11),cursor.createdAt])),/invalid_cursor/);
 });
 console.log(`${passed} crew conversation SQL checks passed`);
} finally {await db.close()}
