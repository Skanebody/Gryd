#!/usr/bin/env node
// GRYD — 0145 : `season.activeDays` cesse d'être une copie de `season.stage`.
//
// Rejoue le VRAI SQL 0119→0121 + 0144 puis 0145 sur PostgreSQL/WASM avec le
// registre partagé réel. PGlite tourne en SUPERUTILISATEUR : ce test prouve le
// SQL de lecture, jamais l'effet d'une policy sur un rôle restreint.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { computeProgressLedger2026 } from '../functions/_shared/progression2026.ts';
import { PROGRESSION_RULES_2026 } from '../functions/_shared/game-rules.ts';

const db = new PGlite();
let passed = 0;
const runner = '00000000-0000-0000-0000-000000000001';
const query = async (sql, params = []) => (await db.query(sql, params)).rows;
const scalar = async (sql, params = []) => Object.values((await query(sql, params))[0])[0];
const migration = (name) => readFileSync(new URL(`../migrations/${name}`, import.meta.url), 'utf8');
async function test(name, fn) { await fn(); passed += 1; console.log(`ok ${passed} - ${name}`); }
async function read() {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [runner]);
  await db.exec('set role authenticated');
  try { return await scalar('select public.get_progression_2026()'); } finally { await db.exec('reset role'); }
}
async function evidence(id, start, minutes = 12) {
  const ended = new Date(Date.parse(start) + minutes * 60_000).toISOString();
  await db.query('insert into public.runs(id,user_id) values($1,$2) on conflict do nothing', [id, runner]);
  await db.query('select public.record_progress_evidence_2026($1,$2)', [id, {
    canonicalId: id, revision: 1, sport: 'run', startedAt: start, endedAt: ended, receivedAt: ended,
    source: 'gps', eligibility: 'eligible', movement: [{ start, end: ended }],
  }]);
}
async function commit() {
  const s = await scalar('select public.progress_snapshot_2026($1)', [runner]);
  return scalar('select public.commit_progress_2026($1,$2,$3,null)', [runner, s.version, computeProgressLedger2026({ accountId: runner, ...s })]);
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
  for (const name of ['0119_refonte_2026_progress_ledger.sql', '0120_refonte_2026_premium_entitlements.sql',
    '0121_refonte_2026_season_collections.sql', '0144_refonte_2026_level_rewards.sql']) await db.exec(migration(name));
  await db.query("insert into users(id,created_at) values($1,'2025-01-01')", [runner]);
  const starts = await scalar("select ((date_trunc('week',now() at time zone 'Europe/Paris')-interval '2 weeks') at time zone 'Europe/Paris')::text");
  await scalar('select configure_season_collection_2026($1,$2,$3)', ['fixture_current', 'Collection de test', starts]);
  // Quatre journées ACTIVES dans une même semaine civile : le budget
  // hebdomadaire (§7.1) en crédite trois, la quatrième reste une vraie sortie.
  const days = PROGRESSION_RULES_2026.maximumCreditedDaysPerWeek + 1;
  for (let i = 0; i < days; i++) {
    await evidence(`10000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`, new Date(Date.parse(starts) + i * 86_400_000 + 12 * 3_600_000).toISOString());
  }
  await commit();

  // ── ÉTAPE 0 : LE DÉFAUT EXISTAIT ─────────────────────────────────────────
  await test('étape 0 — avant 0145, activeDays est le clone de stage et la 4e journée disparaît', async () => {
    const definition = await scalar("select pg_get_functiondef('read_progression_2026(uuid)'::regprocedure)");
    const clone = "least(rule.tiers,coalesce((account.ledger->'collections'->>c.id)::integer,0)/rule.xp_per_tier)";
    // La MÊME expression est écrite deux fois de suite, pour deux clés distinctes.
    assert.ok(definition.includes(`'activeDays',${clone}`), 'activeDays est bien l’expression de stage');
    const data = await read();
    assert.equal(data.season.stage, PROGRESSION_RULES_2026.maximumCreditedDaysPerWeek);
    assert.equal(data.season.activeDays, data.season.stage);
    assert.equal(data.activeDays, days); // Le compte, lui, savait : la saison mentait.
  });

  await db.exec(migration('0145_refonte_2026_season_active_days.sql'));

  await test('après 0145, la journée active non créditée existe enfin dans la saison', async () => {
    const data = await read();
    assert.equal(data.season.activeDays, days);
    assert.equal(data.season.stage, PROGRESSION_RULES_2026.maximumCreditedDaysPerWeek);
    assert.notEqual(data.season.activeDays, data.season.stage);
    assert.equal(data.season.xp, PROGRESSION_RULES_2026.maximumCreditedDaysPerWeek * PROGRESSION_RULES_2026.xpPerActiveDay);
  });

  await test('une journée sous le minimum de mouvement n’est active pour personne', async () => {
    await evidence('10000000-0000-0000-0000-000000000099', new Date(Date.parse(starts) + 10 * 86_400_000 + 12 * 3_600_000).toISOString(), 4);
    await commit();
    const data = await read();
    assert.equal(data.season.activeDays, days);
    assert.equal(data.activeDays, days);
  });

  await test('le reste de la lecture est intact, objets de niveau compris', async () => {
    const data = await read();
    assert.equal(data.ruleset, '2026.1');
    assert.equal(data.totalXp, 300);
    assert.deepEqual(data.ownedRewards.map(o => o.tier), [1, 2, 3]);
    assert.deepEqual(data.levelRewards.map(o => o.rewardId), ['first_trace', 'line_frame']);
    assert.equal(data.collections.find(c => c.id === 'fixture_current').stage, 3);
  });

  console.log(`PASS ${passed} tests PostgreSQL des journées actives de saison. 0119–0121, 0144, 0145 réels ; fixtures users/runs/auth.`);
} finally { await db.close(); }
