import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();let passed=0;
const owner='00000000-0000-0000-0000-000000000001',other='00000000-0000-0000-0000-000000000002';
const q=async(sql,args=[]) => (await db.query(sql,args)).rows;
const scalar=async(sql,args=[])=>Object.values((await q(sql,args))[0])[0];
const test=async(name,fn)=>{await fn();console.log(`ok ${++passed} - ${name}`);};
async function asUser(id,fn){await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');try{return await fn();}finally{await db.exec('reset role');}}
const owned={id:'relief',owned:true,productId:'test.relief',acquiredAt:'2026-09-01T00:00:00Z'};
const apply=(id,event,time,items)=>scalar('select apply_commercial_snapshot_2026($1,$2,$3,$4)',[id,event,time,JSON.stringify(items)]);
try{
  await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to anon,authenticated,service_role;
    create table public.users(id uuid primary key);`);
  await db.exec(readFileSync(new URL('../migrations/0125_refonte_2026_permanent_collections.sql',import.meta.url),'utf8'));
  await db.query('insert into users values($1),($2)',[owner,other]);
  await test('unconfigured catalogue has three products, no fake price or purchasable SKU',async()=>{const rows=(await asUser(owner,()=>scalar('select get_commercial_collections_2026()'))).collections;assert.equal(rows.length,3);assert(rows.every(r=>!r.owned&&!r.configured&&r.productIds.length===0));});
  await db.exec("update commercial_collections_2026 set entitlement_id='test_relief',product_ids=array['test.relief'],enabled=true where id='relief'");
  await test('no client can grant ownership, change catalogue or forge a receipt',async()=>{await asUser(owner,async()=>{for(const sql of ["insert into commercial_ownership_2026(user_id,collection_id,owned,observed_at_ms) values(auth.uid(),'relief',true,100)","update commercial_collections_2026 set enabled=true","select apply_commercial_snapshot_2026(auth.uid(),'forged',100,'[]')"]){await assert.rejects(()=>db.query(sql),/permission denied/);}});});
  await test('server receipt grants one permanent collection and scopes it to owner',async()=>{await apply(owner,'purchase',100,[owned]);const mine=(await asUser(owner,()=>scalar('select get_commercial_collections_2026()'))).collections;const theirs=(await asUser(other,()=>scalar('select get_commercial_collections_2026()'))).collections;assert.equal(mine.filter(r=>r.owned).length,1);assert.equal(theirs.filter(r=>r.owned).length,0);});
  await test('duplicate receipts and older revocation cannot undo a newer purchase',async()=>{assert.equal((await apply(owner,'purchase',100,[owned])).replayed,true);await apply(owner,'stale',99,[{...owned,owned:false}]);assert.equal(await scalar("select owned from commercial_ownership_2026 where collection_id='relief'"),true);});
  await test('equipment requires ownership; current confirmed objects really equip',async()=>{await asUser(other,()=>assert.rejects(()=>db.query("select equip_commercial_collection_2026('relief',true)"),/collection_not_owned/));await asUser(owner,()=>db.query("select equip_commercial_collection_2026('relief',true)"));assert.equal(await scalar('select count(*)::integer from commercial_equipment_2026'),1);});
  await test('subscription absence or catalogue sale closure does not remove permanent ownership',async()=>{await db.exec("update commercial_collections_2026 set enabled=false where id='relief'");const row=(await asUser(owner,()=>scalar('select get_commercial_collections_2026()'))).collections.find(r=>r.id==='relief');assert(row.owned&&row.equipped&&!row.configured);});
  await test('partial batch fails atomically with no success receipt',async()=>{await assert.rejects(()=>apply(owner,'partial',102,[{...owned,owned:false},{id:'invented',owned:true}]),/invalid_collection/);assert.equal(await scalar("select owned from commercial_ownership_2026 where collection_id='relief'"),true);assert.equal(await scalar("select count(*)::integer from commercial_receipts_2026 where event_id='partial'"),0);});
  await test('authoritative refund removes ownership and equipment, replay stays revoked',async()=>{await apply(owner,'refund',103,[{...owned,owned:false}]);assert.equal(await scalar("select owned from commercial_ownership_2026 where collection_id='relief'"),false);assert.equal(await scalar('select count(*)::integer from commercial_equipment_2026'),0);await asUser(owner,()=>assert.rejects(()=>db.query("select equip_commercial_collection_2026('relief',true)"),/collection_not_owned/));await apply(owner,'purchase-equal',103,[owned]);assert.equal(await scalar("select owned from commercial_ownership_2026 where collection_id='relief'"),false);});
  await test('transfer snapshot may grant new owner without restoring old owner',async()=>{await apply(other,'transfer',104,[owned]);const a=(await asUser(owner,()=>scalar('select get_commercial_collections_2026()'))).collections;const b=(await asUser(other,()=>scalar('select get_commercial_collections_2026()'))).collections;assert(!a.some(r=>r.owned));assert(b.some(r=>r.owned));});
  await test('deleted account is not resurrected by late Store event',async()=>{await db.query('delete from users where id=$1',[other]);assert.equal((await apply(other,'late',105,[owned])).ignored,true);});
  console.log(`${passed} commercial collection SQL tests passed. Store/gateway not exercised.`);
}finally{await db.close();}
