#!/usr/bin/env node
// Executes actual 0108–0110 SQL and the shared ledger on local PostgreSQL/WASM.
// Only pre-existing users/runs/auth are small fixtures. No PostGIS, remote DB,
// Store network or Supabase HTTP gateway is exercised by this test.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { computeProgressLedger2026 } from '../functions/_shared/progression2026.ts';
import { PROGRESSION_RULES_2026, SEASON_REWARDS_2026 } from '../functions/_shared/game-rules.ts';

const db = new PGlite();
let passed = 0;
const owner = '00000000-0000-0000-0000-000000000001';
const other = '00000000-0000-0000-0000-000000000002';
const fresh = '00000000-0000-0000-0000-000000000003';
const query = async (sql, params = []) => (await db.query(sql, params)).rows;
const scalar = async (sql, params = []) => Object.values((await query(sql, params))[0])[0];
async function test(name, fn) {
  await fn(); passed += 1; console.log(`ok ${passed} - ${name}`);
}
async function rejects(sql, params = [], contains) {
  await assert.rejects(() => db.query(sql, params), contains ? new RegExp(contains) : undefined);
}
async function asAuthenticated(user, fn) {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user ?? '']);
  await db.exec('set role authenticated');
  try { return await fn(); } finally { await db.exec('reset role'); }
}
async function snapshot(user = owner) {
  return scalar('select public.progress_snapshot_2026($1)', [user]);
}
async function commit(user = owner, run = null) {
  const s = await snapshot(user);
  const ledger = computeProgressLedger2026({ accountId: user, ...s });
  return { ledger, receipt: await scalar('select public.commit_progress_2026($1,$2,$3,$4)', [user, s.version, ledger, run]) };
}
async function read(user = owner) {
  return asAuthenticated(user, () => scalar('select public.get_progression_2026()'));
}
async function evidence(id, user, start, minutes = 10) {
  const ended = new Date(Date.parse(start) + minutes * 60_000).toISOString();
  const value = { canonicalId: id, revision: 1, sport: 'run', startedAt: start, endedAt: ended, receivedAt: ended,
    source: 'gps', eligibility: 'eligible', movement: [{ start, end: ended }] };
  await db.query('insert into public.runs(id,user_id) values($1,$2) on conflict do nothing', [id, user]);
  await db.query('select public.record_progress_evidence_2026($1,$2)', [id, value]);
  return value;
}
async function premium(user, active, revision = 1) {
  return scalar('select public.apply_gryd_plus_snapshot_2026($1,$2,$3,$4,$5,$6,$7,$8,$9)', [
    user, 'gryd_plus', 'gryd_plus_monthly', active, new Date(Date.now() + 86_400_000).toISOString(), false,
    `fixture:${user}:${revision}`, revision, revision,
  ]);
}

try {
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
    $$;
    grant usage on schema auth to anon,authenticated,service_role;
    create table public.users(id uuid primary key,created_at timestamptz not null default now(),deletion_requested_at timestamptz);
    create table public.runs(id uuid primary key,user_id uuid not null references users(id) on delete cascade,
      ruleset_version text not null default '2026.1',xp_awarded integer not null default 0);`);
  for (const name of ['0108_refonte_2026_progress_ledger.sql', '0109_refonte_2026_premium_entitlements.sql', '0110_refonte_2026_season_collections.sql']) {
    await db.exec(readFileSync(new URL(`../migrations/${name}`, import.meta.url), 'utf8'));
  }
  await db.query("insert into users(id,created_at) values($1,'2025-01-01'),($2,'2025-01-01'),($3,'2025-01-01')", [owner, other, fresh]);
  await test('real migrations apply; an unconfigured calendar returns no invented season', async () => {
    const data = await read(); assert.equal(data.season, null); assert.deepEqual(data.collections, []);
    assert.equal(data.totalXp, 0); assert.equal(data.pending, true);
    await commit(); assert.equal((await read()).pending, false);
  });
  await test('SQL reward templates and season constants exactly match shared rules', async () => {
    const rules = (await query('select * from season_collection_rules_2026'))[0];
    assert.equal(rules.weeks, PROGRESSION_RULES_2026.seasonWeeks);
    assert.equal(rules.tiers, PROGRESSION_RULES_2026.seasonTierCount);
    assert.equal(rules.xp_per_tier, PROGRESSION_RULES_2026.seasonXpPerTier);
    assert.deepEqual(rules.premium_tiers, [...PROGRESSION_RULES_2026.premiumVariantTiers]);
    assert.deepEqual(await query('select reward_id as id,tier,label from season_reward_templates_2026 order by tier'), SEASON_REWARDS_2026);
  });
  // A test-only historical calendar is relative to actual server time; production
  // deliberately seeds no calendar. Each entry is six local calendar weeks.
  const starts = await scalar("select ((date_trunc('week',now() at time zone 'Europe/Paris')-interval '2 weeks') at time zone 'Europe/Paris')::text");
  const previous = await scalar("select (($1::timestamptz at time zone 'Europe/Paris')-interval '6 weeks') at time zone 'Europe/Paris'", [starts]);
  await test('calendar publication is immutable, idempotent and rejects overlaps', async () => {
    const first = await scalar('select configure_season_collection_2026($1,$2,$3)', ['fixture_current', 'Test current', starts]);
    const replay = await scalar('select configure_season_collection_2026($1,$2,$3)', ['fixture_current', 'Test current', starts]);
    assert.deepEqual(first, replay);
    await rejects('select configure_season_collection_2026($1,$2,$3)', ['fixture_current', 'Changed', starts], 'immutable');
    await rejects('select configure_season_collection_2026($1,$2,$3)', ['fixture_overlap', 'Overlap', starts], 'overlapping');
    await scalar('select configure_season_collection_2026($1,$2,$3)', ['fixture_archive', 'Test archive', previous]);
    await rejects("select configure_season_collection_2026(null,'Bad',now())", [], 'invalid_season');
  });
  await test('calendar duration is six civil weeks even across DST', async () => {
    const c = await scalar("select configure_season_collection_2026('fixture_dst','DST','2020-03-01T23:00:00Z','Europe/Paris')");
    assert.equal(Date.parse(c.ends_at) - Date.parse(c.starts_at), (42 * 24 - 1) * 3_600_000);
  });
  await test('new account joins actual season and exposes exactly one selected collection', async () => {
    const data = await read(); assert.equal(data.selectedCollectionId, 'fixture_current');
    assert.equal(data.season.stage, 0); assert.equal(data.season.archived, false);
    assert.equal(data.collections.find(c => c.id === 'fixture_archive').selectable, false);
    await commit();
  });
  await test('a client cannot read other ledgers, self-award XP, publish seasons or bypass RLS', async () => {
    await asAuthenticated(owner, async () => {
      await rejects('select * from progress_accounts_2026', [], 'permission denied');
      await rejects('select * from season_reward_ownership_2026', [], 'permission denied');
      await rejects('select * from season_reward_equipment_2026', [], 'permission denied');
      await rejects('select read_progression_2026($1)', [other], 'permission denied');
      await rejects("select commit_progress_2026($1,0,'{}')", [owner], 'permission denied');
      await rejects("select configure_season_collection_2026('bad','Bad',now())", [], 'permission denied');
      await rejects('select grant_earned_season_variants2026($1)', [owner], 'permission denied');
    });
    await asAuthenticated(null, () => rejects('select get_progression_2026()', [], 'authentication_required'));
    const tables = await query("select relname,relrowsecurity from pg_class where relname in ('progress_accounts_2026','progress_activity_2026','progress_corrections_2026','season_collections_2026','season_reward_ownership_2026','progress_collection_selections_2026','progress_timezone_changes_2026')");
    assert.equal(tables.length, 7); assert.ok(tables.every(t => t.relrowsecurity));
  });
  await test('unstarted archives cannot be enrolled retrospectively', async () => {
    await asAuthenticated(owner, () => rejects("select select_progress_collection_2026('fixture_archive')", [], 'archive_not_started'));
  });
  const run1 = '10000000-0000-0000-0000-000000000001';
  const run2 = '10000000-0000-0000-0000-000000000002';
  const day1 = new Date(Date.parse(starts) + 12 * 3_600_000).toISOString();
  const day2 = new Date(Date.parse(starts) + 36 * 3_600_000).toISOString();
  await test('verified movement commits sporting XP and standard objects atomically', async () => {
    await evidence(run1, owner, day1); const out = await commit(owner, run1);
    assert.equal(out.receipt.xpDelta, 100); assert.equal(out.receipt.runXpAwarded, 100);
    const data = await read(); assert.equal(data.totalXp, 100); assert.equal(data.season.stage, 1);
    assert.deepEqual(data.ownedRewards.map(o => [o.tier, o.variant]), [[1, 'standard']]);
  });
  await test('same evidence and receipt are idempotent, including object ownership', async () => {
    const before = await snapshot(); await evidence(run1, owner, day1);
    assert.equal((await snapshot()).version, before.version);
    const again = await commit(owner, run1); assert.equal(again.receipt.xpDelta, 0); assert.equal(again.receipt.runXpAwarded, 100);
    assert.equal((await read()).ownedRewards.length, 1);
  });
  await test('concurrent stale ledger is refused instead of overwriting newer evidence', async () => {
    const before = await snapshot(); await evidence(run2, owner, day2);
    const stale = await scalar('select commit_progress_2026($1,$2,$3)', [owner, before.version, computeProgressLedger2026({ accountId: owner, ...before })]);
    assert.equal(stale.committed, false); assert.equal((await read()).pending, true);
    await commit(owner, run2); assert.equal((await read()).season.stage, 2);
  });
  await test('subscription catch-up grants only earned even-tier art and no sporting XP', async () => {
    assert.equal(await scalar('select grant_earned_season_variants2026($1)', [owner]), 0);
    await premium(owner, true); assert.equal(await scalar('select grant_earned_season_variants2026($1)', [owner]), 1);
    assert.equal(await scalar('select grant_earned_season_variants2026($1)', [owner]), 0);
    const data = await read(); assert.equal(data.totalXp, 200);
    assert.deepEqual(data.ownedRewards.filter(o => o.variant === 'premium').map(o => o.tier), [2]);
  });
  await test('expiry removes tools but never deletes earned season variants', async () => {
    await premium(owner, false, 2);
    assert.equal(await scalar('select has_gryd_plus_access_2026($1)', [owner]), false);
    assert.equal((await read()).ownedRewards.filter(o => o.variant === 'premium').length, 1);
  });
  await test('only owned objects can be equipped; earned premium remains usable after expiry', async () => {
    await asAuthenticated(owner, () => rejects("select equip_season_reward_2026('fixture_current','profile_frame','premium')", [], 'reward_not_owned'));
    await asAuthenticated(other, () => rejects("select equip_season_reward_2026('fixture_current','participation_badge','premium')", [], 'reward_not_owned'));
    await asAuthenticated(owner, () => scalar("select equip_season_reward_2026('fixture_current','participation_badge','premium')"));
    assert.deepEqual((await read()).ownedRewards.filter(o => o.equipped).map(o => [o.rewardId, o.variant]), [['participation_badge', 'premium']]);
    await asAuthenticated(owner, () => scalar("select equip_season_reward_2026('fixture_current','participation_badge','standard')"));
    assert.deepEqual((await read()).ownedRewards.filter(o => o.equipped).map(o => o.variant), ['standard']);
    await asAuthenticated(owner, () => scalar("select unequip_season_reward_2026('participation_badge')"));
    assert.equal((await read()).ownedRewards.filter(o => o.equipped).length, 0);
  });
  await test('archive resumption applies tomorrow and repeat selection is a no-op', async () => {
    // Real historical enrollment is a fixture: the client has no write access.
    await db.query("insert into season_collection_enrollments_2026 values($1,'fixture_archive',$2)", [owner, previous]);
    const result = await asAuthenticated(owner, () => scalar("select select_progress_collection_2026('fixture_archive')"));
    assert.equal(result.changed, true);
    const data = await read(); assert.equal(data.selectedCollectionId, 'fixture_current');
    assert.equal(data.pendingSelection.collectionId, 'fixture_archive');
    assert.equal(data.pendingSelection.effectiveDay, result.effectiveDay);
    const repeat = await asAuthenticated(owner, () => scalar("select select_progress_collection_2026('fixture_archive')"));
    assert.equal(repeat.changed, false); assert.equal(repeat.effectiveDay, result.effectiveDay);
    await commit(); assert.equal((await read()).totalXp, 200);
  });
  await test('timezone requests are frozen until next week and leave past days unchanged', async () => {
    const before = (await snapshot()).previousLedger;
    const requested = await asAuthenticated(owner, () => scalar("select set_progress_timezone_2026('America/New_York')"));
    const s = await snapshot(); assert.equal(s.timezoneChanges.length, 1);
    assert.equal(s.timezoneChanges[0].effectiveAt, requested.effectiveAt);
    assert.equal((await read()).timeZone, 'Europe/Paris');
    assert.equal((await read()).pendingTimeZone.timeZone, 'America/New_York');
    const after = (await commit()).ledger; assert.deepEqual(after.days, before.days);
    await asAuthenticated(owner, () => rejects("select set_progress_timezone_2026('not/a/zone')", [], 'invalid_timezone'));
    await asAuthenticated(owner, () => scalar("select set_progress_timezone_2026('Europe/Paris')"));
    assert.equal((await snapshot()).timezoneChanges.length, 0);
  });
  await test('two accounts receive isolated rewards, selections and evidence', async () => {
    const data = await read(other); assert.equal(data.totalXp, 0); assert.deepEqual(data.ownedRewards, []);
    assert.equal(data.pendingSelection, null);
    await asAuthenticated(other, () => rejects("select select_progress_collection_2026('fixture_archive')", [], 'archive_not_started'));
  });
  await test('two days weekly for six weeks earn twelve distinct objects and exactly six premium variants', async () => {
    await read(fresh);
    // Simulate a real already-started archive with dated choices; this is a
    // service fixture, never a client-controlled backdating route.
    await db.query("update progress_accounts_2026 set initial_collection_id='fixture_archive',initial_collection_effective_at=$2,version=version+1 where user_id=$1", [fresh, previous]);
    await db.query("insert into season_collection_enrollments_2026 values($1,'fixture_archive',$2)", [fresh, previous]);
    for (let week = 0; week < 6; week++) for (let day = 0; day < 2; day++) {
      const start = new Date(Date.parse(previous) + (week * 7 + day) * 86_400_000 + 12 * 3_600_000).toISOString();
      await evidence(`20000000-0000-0000-0000-${String(week * 2 + day + 1).padStart(12, '0')}`, fresh, start);
    }
    await premium(fresh, true); const result = await commit(fresh);
    assert.equal(result.ledger.totalXp, 1200);
    assert.equal(result.ledger.collections.fixture_archive, 1200);
    const data = await read(fresh); assert.equal(data.season.stage, 12);
    assert.equal(data.ownedRewards.filter(o => o.variant === 'standard').length, 12);
    assert.deepEqual(data.ownedRewards.filter(o => o.variant === 'premium').map(o => o.tier), [2, 4, 6, 8, 10, 12]);
    await evidence('20000000-0000-0000-0000-000000000013', fresh, day1);
    await commit(fresh); const beyond = await read(fresh);
    assert.equal(beyond.totalXp, 1300); assert.equal(beyond.season.xp, 1200);
    assert.equal(beyond.collections.find(c => c.id === 'fixture_current').xp, 0);
    assert.equal(beyond.ownedRewards.length, 18);
  });
  await test('a source deletion invalidates and corrects the sporting ledger without granting new objects from stale XP', async () => {
    await db.query('delete from runs where id=$1', [run2]);
    assert.equal((await read()).pending, true);
    await premium(owner, true, 3);
    assert.equal(await scalar('select grant_earned_season_variants2026($1)', [owner]), 0);
    const result = await commit(); assert.equal(result.receipt.xpDelta, -100);
    const data = await read(); assert.equal(data.totalXp, 100); assert.equal(data.pending, false);
    assert.equal(data.ownedRewards.filter(o => o.variant === 'premium').length, 1);
    assert.equal((await snapshot()).activities.length, 1);
  });
  await test('account deletion blocks refresh and cascades permanent owner records', async () => {
    await db.query('update users set deletion_requested_at=now() where id=$1', [owner]);
    await rejects('select progress_snapshot_2026($1)', [owner]);
    assert.equal(await scalar('select grant_earned_season_variants2026($1)', [owner]), 0);
    await db.query('delete from users where id=$1', [owner]);
    assert.equal(await scalar('select count(*)::integer from season_reward_ownership_2026 where user_id=$1', [owner]), 0);
  });
  console.log(`PASS ${passed} PostgreSQL progression/collection tests. Actual 0108–0110; fixture users/runs/auth; no PostGIS or Store network.`);
} finally { await db.close(); }
