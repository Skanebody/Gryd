#!/usr/bin/env node
// GRYD — 0144 : les huit récompenses de niveau du §7.2 sont OCTROYÉES.
//
// Ce fichier rejoue le VRAI SQL 0119→0121 puis 0144 sur PostgreSQL/WASM, avec
// le registre partagé réel. Seuls `users`/`runs`/`auth` sont des fixtures.
//
// PGlite tourne en SUPERUTILISATEUR et n'a pas PostGIS : ce test prouve le SQL
// (tables, octroi, idempotence, privilèges posés, exclusivité d'emplacement),
// jamais l'EFFET d'une policy sur un rôle restreint.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { computeProgressLedger2026, xpForLevel2026 } from '../functions/_shared/progression2026.ts';
import { LEVEL_REWARDS_2026 } from '../functions/_shared/game-rules.ts';

const db = new PGlite();
let passed = 0;
const alpha = '00000000-0000-0000-0000-000000000001';
const beta = '00000000-0000-0000-0000-000000000002';
const query = async (sql, params = []) => (await db.query(sql, params)).rows;
const scalar = async (sql, params = []) => Object.values((await query(sql, params))[0])[0];
const migration = (name) => readFileSync(new URL(`../migrations/${name}`, import.meta.url), 'utf8');
async function test(name, fn) { await fn(); passed += 1; console.log(`ok ${passed} - ${name}`); }
async function rejects(sql, params = [], contains) {
  await assert.rejects(() => db.query(sql, params), contains ? new RegExp(contains) : undefined);
}
async function asAuthenticated(user, fn) {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user ?? '']);
  await db.exec('set role authenticated');
  try { return await fn(); } finally { await db.exec('reset role'); }
}
const snapshot = (user) => scalar('select public.progress_snapshot_2026($1)', [user]);
async function commit(user, run = null) {
  const s = await snapshot(user);
  const ledger = computeProgressLedger2026({ accountId: user, ...s });
  return scalar('select public.commit_progress_2026($1,$2,$3,$4)', [user, s.version, ledger, run]);
}
const read = (user) => asAuthenticated(user, () => scalar('select public.get_progression_2026()'));
async function evidence(id, user, start, minutes = 12) {
  const ended = new Date(Date.parse(start) + minutes * 60_000).toISOString();
  await db.query('insert into public.runs(id,user_id) values($1,$2) on conflict do nothing', [id, user]);
  await db.query('select public.record_progress_evidence_2026($1,$2)', [id, {
    canonicalId: id, revision: 1, sport: 'run', startedAt: start, endedAt: ended, receivedAt: ended,
    source: 'gps', eligibility: 'eligible', movement: [{ start, end: ended }],
  }]);
}

try {
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated,service_role;
    create table public.users(id uuid primary key,created_at timestamptz not null default now(),deletion_requested_at timestamptz);
    create table public.runs(id uuid primary key,user_id uuid not null references users(id) on delete cascade,
      ruleset_version text not null default '2026.1',xp_awarded integer not null default 0);`);
  for (const name of ['0119_refonte_2026_progress_ledger.sql', '0120_refonte_2026_premium_entitlements.sql', '0121_refonte_2026_season_collections.sql']) {
    await db.exec(migration(name));
  }
  await db.query("insert into users(id,created_at) values($1,'2025-01-01'),($2,'2025-01-01')", [alpha, beta]);
  // Calendrier de TEST relatif à l'heure serveur réelle ; la production n'en
  // sème aucun. Six semaines civiles à partir d'il y a deux semaines.
  const starts = await scalar("select ((date_trunc('week',now() at time zone 'Europe/Paris')-interval '2 weeks') at time zone 'Europe/Paris')::text");
  await scalar('select configure_season_collection_2026($1,$2,$3)', ['fixture_current', 'Collection de test', starts]);
  const day = (offsetDays) => new Date(Date.parse(starts) + offsetDays * 86_400_000 + 12 * 3_600_000).toISOString();
  const runId = (n) => `10000000-0000-0000-0000-${String(n).padStart(12, '0')}`;

  // ── ÉTAPE 0 : LE DÉFAUT EXISTAIT ─────────────────────────────────────────
  await test('étape 0 — avant 0144, un compte à plus de 520 XP n’a aucune « Palette Craie »', async () => {
    for (let i = 0; i < 6; i++) await evidence(runId(i + 1), alpha, day(i < 3 ? i : i + 4));
    const receipt = await commit(alpha);
    assert.equal(receipt.committed, true);
    const data = await read(alpha);
    // 600 XP confirmés : le seuil du niveau 5 (520) est franchi…
    assert.equal(data.totalXp, 600);
    assert.ok(data.totalXp >= xpForLevel2026(5));
    // …et pourtant AUCUNE table ne possède l’objet, ni ne peut l’octroyer.
    assert.equal(await scalar("select to_regclass('public.level_reward_ownership_2026') is null"), true);
    assert.equal(await scalar("select to_regprocedure('public.grant_level_rewards_2026(uuid)') is null"), true);
    assert.equal(data.levelRewards, undefined);
    // L’écran peignait pourtant les huit récompenses cochées : la seule table
    // de modèles existante ne connaît QUE les douze paliers de saison.
    const templates = await query('select reward_id from season_reward_templates_2026');
    for (const reward of LEVEL_REWARDS_2026) {
      assert.ok(!templates.some(t => t.reward_id === reward.id), `${reward.id} n’est pas un modèle de saison`);
      assert.ok(!data.ownedRewards.some(o => o.rewardId === reward.id));
    }
  });

  await db.exec(migration('0144_refonte_2026_level_rewards.sql'));

  await test('les seuils SQL figés sont exactement ceux du registre partagé (aucune dérive)', async () => {
    const rows = await query('select reward_id as id,level,min_xp,label,identity_slot from level_reward_templates_2026 order by level');
    assert.equal(rows.length, LEVEL_REWARDS_2026.length);
    assert.deepEqual(rows.map(r => ({ id: r.id, level: r.level, label: r.label })), LEVEL_REWARDS_2026.map(r => ({ id: r.id, level: r.level, label: r.label })));
    for (const row of rows) assert.equal(row.min_xp, xpForLevel2026(row.level));
    assert.deepEqual(rows.filter(r => r.identity_slot).map(r => [r.id, r.identity_slot]),
      [['line_frame', 'frame'], ['ridge_merit', 'frame'], ['cartographer', 'title']]);
  });

  await test('rattrapage : un compte déjà au-dessus du seuil reçoit ses objets, une seule fois', async () => {
    assert.equal(await scalar('select grant_level_rewards_2026($1)', [alpha]), 3);
    assert.equal(await scalar('select grant_level_rewards_2026($1)', [alpha]), 0);
    const data = await read(alpha);
    assert.deepEqual(data.levelRewards.map(r => [r.rewardId, r.level, r.equippable, r.equipped]),
      [['first_trace', 2, false, false], ['line_frame', 3, true, false], ['chalk', 5, false, false]]);
    assert.ok(data.levelRewards.every(r => Number.isFinite(Date.parse(r.earnedAt))));
  });

  await test('passage de niveau : l’objet arrive dans la MÊME transaction que l’XP', async () => {
    await evidence(runId(20), beta, day(0));
    await commit(beta);
    assert.deepEqual((await read(beta)).levelRewards.map(r => r.rewardId), ['first_trace']);
    await evidence(runId(21), beta, day(1));
    await evidence(runId(22), beta, day(2));
    await commit(beta);
    const data = await read(beta);
    assert.equal(data.totalXp, 300);
    assert.deepEqual(data.levelRewards.map(r => r.rewardId), ['first_trace', 'line_frame']);
  });

  await test('permanence : une correction de source qui fait baisser les XP ne reprend rien', async () => {
    await db.query('delete from runs where id=$1', [runId(22)]);
    const receipt = await commit(beta);
    assert.equal(receipt.xpDelta, -100);
    const data = await read(beta);
    assert.equal(data.totalXp, 200);
    assert.ok(data.totalXp < xpForLevel2026(3));
    assert.deepEqual(data.levelRewards.map(r => r.rewardId), ['first_trace', 'line_frame']);
  });

  await test('un seul cadre : saison et niveau se libèrent mutuellement l’emplacement', async () => {
    await asAuthenticated(alpha, () => scalar("select equip_season_reward_2026('fixture_current','profile_frame','standard')"));
    assert.deepEqual((await read(alpha)).ownedRewards.filter(o => o.equipped).map(o => o.rewardId), ['profile_frame']);
    await asAuthenticated(alpha, () => scalar("select equip_level_reward_2026('line_frame')"));
    let data = await read(alpha);
    assert.deepEqual(data.ownedRewards.filter(o => o.equipped), []);
    assert.deepEqual(data.levelRewards.filter(o => o.equipped).map(o => o.rewardId), ['line_frame']);
    await asAuthenticated(alpha, () => scalar("select equip_season_reward_2026('fixture_current','profile_frame','standard')"));
    data = await read(alpha);
    assert.deepEqual(data.levelRewards.filter(o => o.equipped), []);
    assert.deepEqual(data.ownedRewards.filter(o => o.equipped).map(o => o.rewardId), ['profile_frame']);
    // Un titre de saison et un cadre de niveau cohabitent : deux emplacements.
    await asAuthenticated(alpha, () => scalar("select equip_level_reward_2026('line_frame')"));
    await asAuthenticated(alpha, () => scalar("select equip_season_reward_2026('fixture_current','title','standard')"));
    data = await read(alpha);
    assert.deepEqual(data.levelRewards.filter(o => o.equipped).map(o => o.rewardId), ['line_frame']);
    assert.deepEqual(data.ownedRewards.filter(o => o.equipped).map(o => o.rewardId), ['title']);
    await asAuthenticated(alpha, () => scalar("select unequip_level_reward_2026('line_frame')"));
    assert.deepEqual((await read(alpha)).levelRewards.filter(o => o.equipped), []);
  });

  await test('un client ne peut ni s’octroyer un objet, ni équiper ce qu’il ne possède pas', async () => {
    await asAuthenticated(alpha, async () => {
      await rejects('select * from level_reward_ownership_2026', [], 'permission denied');
      await rejects('select * from level_reward_templates_2026', [], 'permission denied');
      await rejects('select * from level_reward_equipment_2026', [], 'permission denied');
      await rejects('select grant_level_rewards_2026($1)', [alpha], 'permission denied');
      await rejects("select equip_level_reward_2026('cartographer')", [], 'reward_not_owned');
      await rejects("select equip_level_reward_2026('chalk')", [], 'not_an_identity_object');
      await rejects("select equip_level_reward_2026('nope')", [], 'not_an_identity_object');
    });
    await asAuthenticated(null, () => rejects("select equip_level_reward_2026('line_frame')", [], 'authentication_required'));
    const tables = await query("select relname,relrowsecurity from pg_class where relname in ('level_reward_templates_2026','level_reward_ownership_2026','level_reward_equipment_2026')");
    assert.equal(tables.length, 3); assert.ok(tables.every(t => t.relrowsecurity));
  });

  await test('suppression de compte : les objets de niveau disparaissent avec leur propriétaire', async () => {
    await db.query('update users set deletion_requested_at=now() where id=$1', [beta]);
    assert.equal(await scalar('select grant_level_rewards_2026($1)', [beta]), 0);
    await db.query('delete from users where id=$1', [beta]);
    assert.equal(await scalar('select count(*)::integer from level_reward_ownership_2026 where user_id=$1', [beta]), 0);
    assert.equal(await scalar('select count(*)::integer from level_reward_equipment_2026 where user_id=$1', [beta]), 0);
  });

  console.log(`PASS ${passed} tests PostgreSQL des récompenses de niveau. 0119–0121 + 0144 réels ; fixtures users/runs/auth ; ni PostGIS ni réseau Store.`);
} finally { await db.close(); }
