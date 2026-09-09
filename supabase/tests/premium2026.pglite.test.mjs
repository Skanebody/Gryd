#!/usr/bin/env node
/** Executes all of migration 0120. No PostGIS needed; Store integration itself needs native sandbox QA. */
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
const db = new PGlite();
const A = '00000000-0000-4000-8000-000000000001', B = '00000000-0000-4000-8000-000000000002';
let passed = 0;
const test = async (name, work) => { await work(); passed++; console.log(`PASS ${name}`); };
const future = new Date(Date.now() + 86_400_000).toISOString();
const apply = async (id, event, observed, active, expiry = active ? future : null, user = A, lifetime = false) => (await db.query('select public.apply_gryd_plus_snapshot_2026($1,$2,$3,$4,$5,$6,$7,$8,$9) as result', [user, 'gryd_pro', 'annual', active, expiry, lifetime, id, event, observed])).rows[0].result;
try {
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth; create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to authenticated;
    create table public.users(id uuid primary key);
    insert into public.users values ('${A}'),('${B}');`);
  await db.exec(readFileSync(new URL('../migrations/0120_refonte_2026_premium_entitlements.sql', import.meta.url), 'utf8'));
  await test('real migration applies active entitlement and success receipt together', async () => {
    assert.equal((await apply('purchase', 10, 100, true)).active, true);
    assert.equal((await db.query('select count(*)::int as n from public.premium_receipts_2026')).rows[0].n, 1);
  });
  await test('same event replays once without touching the entitlement', async () => {
    assert.equal((await apply('purchase', 10, 101, false)).replayed, true);
    assert.equal((await db.query('select is_active from public.premium_entitlements_2026')).rows[0].is_active, true);
  });
  await test('out-of-order snapshot cannot resurrect an expired/refunded right', async () => {
    assert.equal((await apply('refund', 20, 200, false)).active, false);
    assert.equal((await apply('old-renewal', 15, 150, true)).applied, false);
    assert.equal((await apply('equal-time-renewal', 25, 200, true)).applied, false);
  });
  await test('old notification can trigger a fresh API snapshot; event audit clock stays monotone', async () => {
    assert.equal((await apply('late-hook-fresh-read', 5, 210, true)).active, true);
    const row = (await db.query('select event_timestamp_ms,observed_at_ms from public.premium_entitlements_2026')).rows[0];
    assert.equal(Number(row.event_timestamp_ms), 20); assert.equal(Number(row.observed_at_ms), 210);
    assert.equal((await apply('same-time-revocation', 20, 210, false)).active, false);
  });
  await test('receipt failure rolls back rights and retry applies successfully', async () => {
    await db.exec(`create function public.fail_test_receipt() returns trigger language plpgsql as $$begin if new.rc_event_id='retry-after-failure' then raise exception 'test failure after entitlement write'; end if; return new; end$$;
      create trigger test_receipt_failure before insert on public.premium_receipts_2026 for each row execute function public.fail_test_receipt();`);
    await assert.rejects(() => apply('retry-after-failure', 30, 300, true));
    assert.equal((await db.query("select is_active from public.premium_entitlements_2026 where user_id=$1", [A])).rows[0].is_active, false);
    assert.equal((await db.query("select count(*)::int as n from public.premium_receipts_2026 where rc_event_id='retry-after-failure'")).rows[0].n, 0);
    await db.exec('drop trigger test_receipt_failure on public.premium_receipts_2026');
    assert.equal((await apply('retry-after-failure', 30, 300, true)).active, true);
  });
  await test('expiry is checked at read time; valid legacy lifetime remains', async () => {
    await apply('already-expired', 40, 400, true, new Date(Date.now() - 1000).toISOString());
    assert.equal((await db.query('select public.has_gryd_plus_access_2026($1) as active', [A])).rows[0].active, false);
    assert.equal((await apply('legacy-lifetime', 41, 401, true, null, A, true)).active, true);
  });
  await test('invalid active snapshot leaves no success receipt', async () => {
    await assert.rejects(() => apply('invalid-null-expiry', 50, 500, true, null));
    assert.equal((await db.query("select count(*)::int as n from public.premium_receipts_2026 where rc_event_id='invalid-null-expiry'")).rows[0].n, 0);
  });
  await test('authenticated reads only own aggregate; direct table and write RPC are denied', async () => {
    await db.exec(`set request.jwt.claim.sub='${B}'; set role authenticated;`);
    assert.equal((await db.query('select public.get_gryd_plus_access_2026() as access')).rows[0].access.active, false);
    await assert.rejects(() => db.query('select * from public.premium_entitlements_2026'));
    await assert.rejects(() => apply('forged', 60, 600, true));
    await db.exec('reset role');
    await db.exec(`set request.jwt.claim.sub='${A}'; set role authenticated;`);
    assert.equal((await db.query('select public.get_gryd_plus_access_2026() as access')).rows[0].access.active, true);
    await db.exec('reset role');
  });
  await test('deleted account is never recreated by a late Store webhook', async () => {
    await db.query('delete from public.users where id=$1', [A]);
    assert.equal((await apply('after-delete', 70, 700, true)).reason, 'unknown_user');
    assert.equal((await db.query('select count(*)::int as n from public.premium_receipts_2026 where user_id=$1', [A])).rows[0].n, 0);
  });
  console.log(`${passed} premium SQL tests passed; migration 0120 executed on PGlite.`);
} finally { await db.close(); }
