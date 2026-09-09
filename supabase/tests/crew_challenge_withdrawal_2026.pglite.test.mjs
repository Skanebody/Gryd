#!/usr/bin/env node
/**
 * GRYD — LE RETRAIT DE CONSENTEMENT NE REJOUE PLUS UN DÉFI TERMINÉ (0148).
 *
 * ÉTAPE 0 OBLIGATOIRE. Ce fichier joue d'abord `0122` SEULE et montre le défaut
 * en le MESURANT : sur un défi `final` déjà publié, un joueur appelle
 * `join_crew_challenge_2026(p_consent := false)`, toutes ses contributions
 * passent `withdrawn`, une révision 2 est publiée et le VAINQUEUR CHANGE. Puis
 * `0148` est appliquée sur la même base et le même geste est refusé
 * (`challenge_closed`), publication inchangée. Sans l'étape 0, rien ne
 * distinguerait cette migration d'un no-op.
 *
 * CE QUE CE FICHIER NE PROUVE PAS : PGlite tourne en SUPERUTILISATEUR et n'a
 * pas PostGIS. Les refus de privilèges y sont testés via `set role`, jamais
 * l'effet d'une policy sur un rôle restreint ; aucune géométrie n'est calculée
 * ici (les métrages de secteur sont posés en fixture, pas mesurés).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
let passed = 0;
const users = Array.from({ length: 10 }, (_, i) => `00000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`);
const crews = ['10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002'];
const sectors = ['canal', 'park', 'centre'].map(id => ({ id, title: id, geometry: { type: 'Polygon', coordinates: [[[2, 48], [2.01, 48], [2.01, 48.01], [2, 48.01], [2, 48]]] } }));
const q = async (sql, args = []) => (await db.query(sql, args)).rows;
const one = async (sql, args = []) => Object.values((await q(sql, args))[0])[0];
const rejects = (sql, args = [], part) => assert.rejects(() => db.query(sql, args), part ? new RegExp(part) : undefined);
async function as(user, fn) {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user ?? '']); await db.exec('set role authenticated');
  try { return await fn(); } finally { await db.exec('reset role'); }
}
async function test(name, fn) { await fn(); console.log(`ok ${++passed} - ${name}`); }
const migration = (name) => readFileSync(new URL(`../migrations/${name}`, import.meta.url), 'utf8');

/** Un défi complet, déjà joué, inséré directement : le cycle par RPC est déjà
 *  couvert par crew_challenges_2026.pglite.test.mjs. Ici seul le retrait compte. */
let runSequence = 0;
async function playedMatch(id, weeksAgo, endsInterval) {
  const starts = await one(`select ((date_trunc('week',now() at time zone 'Europe/Paris')-interval '${weeksAgo} weeks') at time zone 'Europe/Paris')::text`);
  await db.query(`insert into crew_challenges_2026(id,client_id,created_by,arena_id,title,activity,time_zone,starts_at,ends_at,ranked_week,sectors,status)
    values($1,gen_random_uuid(),$2,'fixture_run','Fixture','run','Europe/Paris',$3::timestamptz,
      (($3::timestamptz at time zone 'Europe/Paris')+interval '${endsInterval}') at time zone 'Europe/Paris',
      ($3::timestamptz at time zone 'Europe/Paris')::date,$4,'scheduled')`, [id, users[0], starts, JSON.stringify(sectors)]);
  for (const [index, crew] of crews.entries()) {
    await db.query(`insert into challenge_teams_2026 values($1,$2,$3,$4::timestamptz-interval '1 day',$4::timestamptz-interval '1 day',$4::timestamptz-interval '1 day')`, [id, crew, index, starts]);
  }
  for (let i = 0; i < users.length; i++) {
    await db.query(`insert into challenge_roster_2026(challenge_id,crew_id,player_id,user_id,activity,ranked_week,consent,consented_at)
      values($1,$2,$3,$3,'run',($4::timestamptz at time zone 'Europe/Paris')::date,true,$4::timestamptz-interval '1 day')`, [id, crews[Math.floor(i / 5)], users[i], starts]);
  }
  // A gagne canal et park, B gagne centre : 2 points de match contre 1.
  const plan = [[0, 'canal', 2], [1, 'park', 2], [5, 'canal', 1], [6, 'park', 1], [7, 'centre', 2]];
  const runs = [];
  for (const [player, sector, days] of plan) {
    for (let day = 0; day < days; day++) {
      const run = `30000000-0000-0000-0000-${String(++runSequence).padStart(12, '0')}`;
      const closed = await one(`select ($1::timestamptz+interval '${day} days'+interval '10 hours')::text`, [starts]);
      await db.query('insert into runs(id,user_id,activity,started_at,ended_at_2026,created_at) values($1,$2,$3,$4,$4,$4)', [run, users[player], 'run', closed]);
      await db.query(`insert into challenge_contributions_2026(challenge_id,player_id,crew_id,day,run_id,activity_key,event_id,sector_id,closed_at,received_at,used_fallback)
        values($1,$2,$3,($4::timestamptz at time zone 'Europe/Paris')::date,$5,$5,$5,$6,$4::timestamptz,$4::timestamptz,false)`,
        [id, users[player], crews[Math.floor(player / 5)], closed, run, sector]);
      if (player === 0) runs.push(run);
    }
  }
  await db.query('select maintain_challenge_2026($1)', [id]);
  return runs;
}
const published = async (id) => (await q('select revision,result from challenge_publications_2026 where challenge_id=$1 order by revision desc limit 1', [id]))[0];

try {
  await db.exec(`create role anon;create role authenticated;create role service_role;
    create schema auth;create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated,service_role;
    create table users(id uuid primary key,pseudo text unique,deletion_requested_at timestamptz);
    create table crews(id uuid primary key,name text);
    create table crew_members(crew_id uuid references crews(id),user_id uuid references users(id) on delete cascade,role text,left_at timestamptz,joined_at timestamptz default '2025-01-01');
    create table user_blocks(blocker_id uuid references users(id),blocked_pseudo text);
    create table runs(id uuid primary key,user_id uuid references users(id) on delete cascade,activity text,started_at timestamptz,ended_at_2026 timestamptz,created_at timestamptz,ruleset_version text default '2026.1');
    create table capture_events_2026(id uuid primary key,run_id uuid references runs(id) on delete set null,status text,reason text,face_key text);
    create table no_capture_zones(geojson jsonb);`);
  await db.exec(migration('0122_refonte_2026_crew_challenges.sql'));
  for (let i = 0; i < users.length; i++) await db.query('insert into users(id,pseudo) values($1,$2)', [users[i], `fixture_${i}`]);
  for (let i = 0; i < 2; i++) await db.query('insert into crews values($1,$2)', [crews[i], `Test crew ${i}`]);
  for (let i = 0; i < users.length; i++) await db.query('insert into crew_members(crew_id,user_id,role,left_at) values($1,$2,$3,null)', [crews[Math.floor(i / 5)], users[i], i % 5 === 0 ? 'founder' : 'runner']);
  await db.query("insert into challenge_arenas_2026(id,title,activity,time_zone,sectors,access_source,reviewed_at) values('fixture_run','Local test','run','Europe/Paris',$1,'Fixture reviewed access',now())", [JSON.stringify(sectors)]);

  const before = '90000000-0000-0000-0000-000000000001';
  const withdrawnRuns = await playedMatch(before, 4, '7 days');
  await test("étape 0 — 0122 seule : le défi est final, publié, et l'équipe A l'emporte", async () => {
    assert.equal(await one('select status from crew_challenges_2026 where id=$1', [before]), 'final');
    const snapshot = await published(before);
    assert.equal(snapshot.revision, 1);
    assert.equal(snapshot.result.winnerTeamId, crews[0]);
    assert.deepEqual(snapshot.result.scores.map(s => s.matchPoints), [2, 1]);
  });
  await test('étape 0 — 0122 seule : un retrait après la clôture RENVERSE le vainqueur publié', async () => {
    assert.equal((await as(users[0], () => one('select join_crew_challenge_2026($1,false)', [before]))).joined, false);
    assert.equal(await one('select count(*)::integer from challenge_contributions_2026 where challenge_id=$1 and player_id=$2 and withdrawn', [before, users[0]]), 2);
    const snapshot = await published(before);
    assert.equal(snapshot.revision, 2);
    assert.equal(snapshot.result.winnerTeamId, crews[1]);
  });

  await db.exec(migration('0148_challenge_withdrawal_after_result_2026.sql'));

  const sealed = '90000000-0000-0000-0000-000000000002';
  await playedMatch(sealed, 6, '7 days');
  await test('0148 : le même geste sur un défi final est refusé, sans toucher au résultat', async () => {
    assert.equal((await published(sealed)).result.winnerTeamId, crews[0]);
    await as(users[0], () => rejects('select join_crew_challenge_2026($1,false)', [sealed], 'challenge_closed'));
    const snapshot = await published(sealed);
    assert.equal(snapshot.revision, 1);
    assert.equal(snapshot.result.winnerTeamId, crews[0]);
    assert.equal(await one('select count(*)::integer from challenge_contributions_2026 where challenge_id=$1 and withdrawn', [sealed]), 0);
    assert.equal(await one('select consent from challenge_roster_2026 where challenge_id=$1 and user_id=$2', [sealed, users[0]]), true);
  });
  await test("0148 : la fenêtre de 24 h expirée ferme aussi le retrait, même sans passage du job", async () => {
    const expired = '90000000-0000-0000-0000-000000000003';
    await playedMatch(expired, 8, '7 days');
    await db.query("update crew_challenges_2026 set status='active' where id=$1", [expired]);
    const sync = await one('select sync_hours from challenge_rules_2026');
    assert.equal(await one('select now()>=ends_at+make_interval(hours=>$2) from crew_challenges_2026 where id=$1', [expired, sync]), true);
    await as(users[0], () => rejects('select join_crew_challenge_2026($1,false)', [expired], 'challenge_closed'));
  });
  await test('0148 : pendant le match, le retrait de consentement reste immédiat et total', async () => {
    const running = '90000000-0000-0000-0000-000000000004';
    await db.query(`insert into crew_challenges_2026(id,client_id,created_by,arena_id,title,activity,time_zone,starts_at,ends_at,ranked_week,sectors,status)
      values($1,gen_random_uuid(),$2,'fixture_run','Fixture','run','Europe/Paris',now()-interval '2 days',now()+interval '5 days',(now()-interval '2 days')::date,$3,'active')`,
      [running, users[0], JSON.stringify(sectors)]);
    for (const [index, crew] of crews.entries()) await db.query("insert into challenge_teams_2026 values($1,$2,$3,now()-interval '3 days',now()-interval '3 days',now()-interval '3 days')", [running, crew, index]);
    for (let i = 0; i < users.length; i++) {
      await db.query(`insert into challenge_roster_2026(challenge_id,crew_id,player_id,user_id,activity,ranked_week,consent,consented_at)
        values($1,$2,$3,$3,'run',(now()-interval '2 days')::date,true,now()-interval '3 days')`, [running, crews[Math.floor(i / 5)], users[i]]);
    }
    await db.query(`insert into challenge_contributions_2026(challenge_id,player_id,crew_id,day,run_id,activity_key,event_id,sector_id,closed_at,received_at,used_fallback)
      values($1,$2,$3,(now()-interval '1 day')::date,null,gen_random_uuid(),gen_random_uuid(),'canal',now()-interval '1 day',now()-interval '1 day',false)`, [running, users[0], crews[0]]);
    assert.equal((await as(users[0], () => one('select join_crew_challenge_2026($1,false)', [running]))).joined, false);
    assert.equal(await one('select consent from challenge_roster_2026 where challenge_id=$1 and user_id=$2', [running, users[0]]), false);
    assert.equal(await one('select withdrawn from challenge_contributions_2026 where challenge_id=$1 and player_id=$2', [running, users[0]]), true);
  });
  await test("0148 : le droit sur SES données survit — retirer une sortie nommée corrige le résultat, avec révision", async () => {
    await as(users[0], () => one('select withdraw_challenge_activity_2026($1)', [withdrawnRuns[0]]));
    const target = (await q('select run_id from challenge_contributions_2026 where challenge_id=$1 and player_id=$2 order by closed_at limit 1', [sealed, users[0]]))[0].run_id;
    await as(users[0], () => one('select withdraw_challenge_activity_2026($1)', [target]));
    assert.equal(await one('select withdrawn from challenge_contributions_2026 where run_id=$1', [target]), true);
    assert.equal((await published(sealed)).revision, 2);
    await as(users[1], () => rejects('select withdraw_challenge_activity_2026($1)', [target], 'activity_unavailable'));
  });
  await test('0148 : une suppression de compte ou de sortie retire toujours ses preuves', async () => {
    const target = (await q('select run_id from challenge_contributions_2026 where challenge_id=$1 and player_id=$2 and not withdrawn limit 1', [sealed, users[1]]))[0].run_id;
    await db.query('delete from runs where id=$1', [target]);
    assert.equal(await one('select withdrawn from challenge_contributions_2026 where challenge_id=$1 and player_id=$2', [sealed, users[1]]), true);
  });
  console.log(`PASS ${passed} — 0148 sur PostgreSQL réel (0122 puis 0148). Aucune géométrie, aucune RLS effective prouvées ici.`);
} finally { await db.close(); }
