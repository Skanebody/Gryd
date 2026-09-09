// Actual migration and non-spatial PostgreSQL functions. PostGIS reads are tested
// separately in refonte2026.postgis.test.mjs, never simulated here.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
const db=new PGlite();let passed=0;
const ids=[1,2,3].map(n=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`);
const q=async(sql,args=[])=>(await db.query(sql,args)).rows;
const one=async(sql,args=[])=>Object.values((await q(sql,args))[0])[0];
const test=async(name,fn)=>{await fn();console.log(`ok ${++passed} - ${name}`);};
const reject=(sql,args=[],pattern)=>assert.rejects(()=>db.query(sql,args),new RegExp(pattern??'permission denied'));
async function as(user,fn){await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user??'']);await db.exec('set role authenticated');try{return await fn();}finally{await db.exec('reset role');}}
try{
  await db.exec(`create role anon;create role authenticated;create role service_role;
    create schema auth;create schema extensions;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.role() returns text language sql stable as $$ select current_setting('request.jwt.claim.role',true) $$;
    grant usage on schema auth to authenticated,service_role;
    create table crews(id uuid primary key,name text);
    create table crew_members(crew_id uuid,user_id uuid,left_at timestamptz);
    create table runs(id uuid primary key,user_id uuid,activity text,game_status_2026 text,game_reason_2026 text);
  `);
  await test('migration 0112 applies unchanged to PostgreSQL; no seed data is created',async()=>{
    await db.exec(readFileSync(new URL('../migrations/0112_refonte_2026_territory_read_model.sql',import.meta.url),'utf8'));
    assert.equal(await one('select count(*)::int from crew_members'),0);
  });
  await db.query('insert into crews values($1,$2)',[ids[0],'Local fixture']);
  await db.query('insert into crew_members values($1,$1,null),($1,$2,null)',[ids[0],ids[1]]);
  await test('own title takes precedence over common crew membership',async()=>assert.equal(await one('select territory_role_2026($1,$1)',[ids[0]]),'mine'));
  await test('current common membership is grouped as crew in either direction',async()=>{
    assert.equal(await one('select territory_role_2026($1,$2)',[ids[0],ids[1]]),'crew');assert.equal(await one('select territory_role_2026($1,$2)',[ids[1],ids[0]]),'crew');
  });
  await test('an unrelated account is others without inferring sport affiliation',async()=>assert.equal(await one('select territory_role_2026($1,$2)',[ids[2],ids[0]]),'others'));
  await test('leaving a crew immediately changes grouping without rewriting ownership',async()=>{
    await db.query('update crew_members set left_at=now() where user_id=$1',[ids[1]]);
    assert.equal(await one('select territory_role_2026($1,$2)',[ids[1],ids[0]]),'others');
    assert.equal(await one('select territory_role_2026($1,$1)',[ids[1]]),'mine');
  });
  await test('arbitrary owner membership lookup is not executable by a client',async()=>{
    await as(ids[0],()=>reject('select territory_role_2026($1,$2)',[ids[0],ids[1]]));
    assert.equal(await one("select has_function_privilege('service_role','territory_role_2026(uuid,uuid)','EXECUTE')"),true);
  });
  await test('ownership read is authenticated and null viewport fields fail before spatial work',async()=>{
    await as(null,()=>reject("select get_ownership_2026('run',2,48,3,49)",[],'invalid_viewport'));
    for(const args of [[null,2,48,3,49],['run',null,48,3,49],['run',2,null,3,49],['run',2,48,null,49],['run',2,48,3,null]])
      await as(ids[0],()=>reject('select get_ownership_2026($1,$2,$3,$4,$5)',args,'invalid_viewport'));
  });
  await test('invalid sport and bounds fail closed, including nonfinite coordinates',async()=>{
    for(const args of [['swim',2,48,3,49],['run',3,48,2,49],['run',2,49,3,48],['run',-181,48,3,49],['run',2,48,181,49],['run',2,48,3,91],['run','NaN',48,3,49],['run',2,48,'Infinity',49]])
      await as(ids[0],()=>reject('select get_ownership_2026($1,$2,$3,$4,$5)',args,'invalid_viewport'));
  });
  await test('run capture result cannot be read by a different account',async()=>{
    await db.query("insert into runs(id,user_id,activity) values($1,$1,'run')",[ids[0]]);
    await as(ids[1],()=>reject('select capture_result_2026($1)',[ids[0]],'not_authorized'));
  });
  await test('anonymous role cannot call either read RPC',async()=>{
    assert.equal(await one("select has_function_privilege('anon','get_ownership_2026(text,float8,float8,float8,float8)','EXECUTE')"),false);
    assert.equal(await one("select has_function_privilege('anon','capture_result_2026(uuid)','EXECUTE')"),false);
    assert.equal(await one("select has_function_privilege('authenticated','capture_result_2026(uuid)','EXECUTE')"),true);
  });
  console.log(`${passed} PostgreSQL checks passed; PostGIS area/viewport operations NOT executed in PGlite.`);
}finally{await db.close();}
