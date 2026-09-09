// Actual PostgreSQL migration/functions; deliberately no fake PostGIS operators.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
const db=new PGlite();let passed=0;
const ids=[1,2,3].map(n=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`);
const q=async(sql,args=[])=>(await db.query(sql,args)).rows;
const one=async(sql,args=[])=>Object.values((await q(sql,args))[0])[0];
const test=async(name,fn)=>{await fn();console.log(`ok ${++passed} - ${name}`);};
const identity=(owner=ids[1],viewer=ids[0])=>one('select territory_owner_identity_2026($1,$2)',[owner,viewer]);
try {
  await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create schema extensions;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.role() returns text language sql stable as $$ select current_setting('request.jwt.claim.role',true) $$;
    grant usage on schema auth to authenticated,service_role;
    create table crews(id uuid primary key,name text);create table crew_members(crew_id uuid,user_id uuid,left_at timestamptz);
    create table runs(id uuid primary key,user_id uuid,activity text,game_status_2026 text,game_reason_2026 text);
    create table user_profiles(user_id uuid primary key,display_name text,handle text,profile_visibility text,discreet_mode boolean,map_sharing text);
    create table friendships(requester_id uuid,addressee_id uuid,status text);
  `);
  await db.exec(readFileSync(new URL('../migrations/0123_refonte_2026_territory_read_model.sql',import.meta.url),'utf8'));
  await test('0126 migration applies unchanged without creating user or ownership data',async()=>{
    await db.exec(readFileSync(new URL('../migrations/0126_refonte_2026_territory_owner_identity.sql',import.meta.url),'utf8'));
    assert.equal(await one('select count(*)::int from user_profiles'),0);
  });
  await db.query("insert into user_profiles values($1,'Private Name','handle','private',false,'territory_only')",[ids[1]]);
  await db.query('insert into crews values($1,$2)',[ids[0],'Actual fixture crew']);
  await db.query('insert into crew_members values($1,$1,null),($1,$2,null)',[ids[0],ids[1]]);
  await test('private profiles keep both name and affiliation hidden from rivals and common crew',async()=>{
    const result=await identity();assert.equal(result.label,null);assert.equal(result.crew,null);assert.equal(result.kind,'individual');
  });
  await test('stable scoped pseudonyms differ across owners and viewers; no raw user UUID',async()=>{
    const a=await identity();assert.match(a.key,/^[0-9a-f]{32}$/);assert.equal(a.key,(await identity()).key);
    assert.notEqual(a.key,(await identity(ids[1],ids[2])).key);assert.notEqual(a.key,(await identity(ids[2],ids[0])).key);
    assert.equal(JSON.stringify(a).includes(ids[1]),false);
  });
  await test('public profile grants true display name and current affiliation, never collective ownership',async()=>{
    await db.query("update user_profiles set profile_visibility='public' where user_id=$1",[ids[1]]);
    const result=await identity();assert.equal(result.label,'Private Name');assert.equal(result.crew.name,'Actual fixture crew');assert.equal(result.kind,'individual');assert.equal('id' in result.crew,false);
  });
  await test('discreet mode hides display name and crew even when profile is public',async()=>{
    await db.query('update user_profiles set discreet_mode=true where user_id=$1',[ids[1]]);
    assert.equal((await identity()).label,null);assert.equal((await identity()).crew,null);
    await db.query('update user_profiles set discreet_mode=false where user_id=$1',[ids[1]]);
  });
  await test('crew visibility follows actual current membership and disappears immediately after leaving',async()=>{
    await db.query("update user_profiles set profile_visibility='crew' where user_id=$1",[ids[1]]);
    assert.equal((await identity()).label,'Private Name');assert.equal((await identity(ids[1],ids[2])).label,null);
    await db.query('update crew_members set left_at=now() where user_id=$1',[ids[1]]);
    assert.equal((await identity()).label,null);assert.equal((await identity()).crew,null);
  });
  await test('friends visibility requires accepted relationship, not pending or blocked',async()=>{
    await db.query("update user_profiles set profile_visibility='friends' where user_id=$1",[ids[1]]);
    await db.query("insert into friendships values($1,$2,'pending')",[ids[1],ids[0]]);assert.equal((await identity()).label,null);
    await db.exec("update friendships set status='accepted'");assert.equal((await identity()).label,'Private Name');
    await db.exec("update friendships set status='blocked'");assert.equal((await identity()).label,null);
  });
  await test('own profile remains readable and missing profiles never acquire fabricated labels',async()=>{
    assert.equal((await identity(ids[1],ids[1])).label,'Private Name');assert.equal((await identity(ids[2],ids[0])).label,null);
  });
  await test('identity helper cannot be used for arbitrary client lookups; RPC remains authenticated',async()=>{
    for(const role of ['anon','authenticated'])assert.equal(await one(`select has_function_privilege('${role}','territory_owner_identity_2026(uuid,uuid)','EXECUTE')`),false);
    assert.equal(await one("select has_function_privilege('service_role','territory_owner_identity_2026(uuid,uuid)','EXECUTE')"),true);
    assert.equal(await one("select has_function_privilege('anon','get_ownership_2026(text,float8,float8,float8,float8)','EXECUTE')"),false);
    assert.equal(await one("select has_function_privilege('authenticated','get_ownership_2026(text,float8,float8,float8,float8)','EXECUTE')"),true);
  });
  await test('invalid/anonymous viewports reject before spatial work',async()=>{
    await assert.rejects(()=>q("select get_ownership_2026('run',2,48,3,49)"),/invalid_viewport/);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[ids[0]]);
    await assert.rejects(()=>q("select get_ownership_2026('swim',2,48,3,49)"),/invalid_viewport/);
  });
  await test('read SQL retains publication, map consent, deletion and both blocking predicates',async()=>{
    const body=await one("select pg_get_functiondef('get_ownership_2026(text,float8,float8,float8,float8)'::regprocedure)");
    for(const guard of ["e.status='published'","up.map_sharing<>'none'",'u.deletion_requested_at is null','challenge_pair_blocked_2026',"fr.status='blocked'",'o.activity=p_activity','ST_MakeEnvelope'])assert.ok(body.includes(guard));
  });
  console.log(`${passed} PostgreSQL checks passed. PostGIS viewport/area query NOT executed here.`);
}finally{await db.close();}
