#!/usr/bin/env node
/**
 * GRYD — LES REFUS DE DÉFI PORTENT UN NOM (0149), ET LA DIRECTION N'A QU'UNE
 * DÉFINITION.
 *
 * ÉTAPE 0 OBLIGATOIRE. `0122` seule est jouée d'abord : on MESURE que le refus
 * lu par l'écran est `query returned no rows` (P0002) — la plomberie PL/pgSQL,
 * pas une raison. `0149` est ensuite appliquée sur la même base et les mêmes
 * appels répondent `no_crew`, `arena_unavailable`, `direction_required`.
 *
 * CE QUE CE FICHIER NE PROUVE PAS : PGlite est SUPERUTILISATEUR et sans PostGIS.
 * Il prouve la logique des RPC et le texte des refus, jamais l'effet d'une
 * policy RLS ni une géométrie.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { CREW_PERMISSIONS } from '../functions/_shared/game-rules.ts';

const db = new PGlite();
let passed = 0;
const users = Array.from({ length: 13 }, (_, i) => `00000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`);
const crews = ['10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002'];
const sectors = ['canal', 'park', 'centre'].map(id => ({ id, title: id, geometry: { type: 'Polygon', coordinates: [[[2, 48], [2.01, 48], [2.01, 48.01], [2, 48.01], [2, 48]]] } }));
const q = async (sql, args = []) => (await db.query(sql, args)).rows;
const one = async (sql, args = []) => Object.values((await q(sql, args))[0])[0];
async function as(user, fn) {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user ?? '']); await db.exec('set role authenticated');
  try { return await fn(); } finally { await db.exec('reset role'); }
}
const failure = async (sql, args = []) => { try { await db.query(sql, args); return null; } catch (error) { return error.message; } };
async function test(name, fn) { await fn(); console.log(`ok ${++passed} - ${name}`); }
const migration = (name) => readFileSync(new URL(`../migrations/${name}`, import.meta.url), 'utf8');
let monday;
const create = (user, client, arena = 'fixture_run') => as(user, () => failure('select create_crew_challenge_2026($1,$2,$3,$4,true)', [client, crews[1], arena, monday]));

try {
  await db.exec(`create role anon;create role authenticated;create role service_role;
    create schema auth;create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated,service_role;
    create table users(id uuid primary key,pseudo text unique,deletion_requested_at timestamptz);
    create table crews(id uuid primary key,name text);
    create table crew_members(crew_id uuid references crews(id),user_id uuid references users(id) on delete cascade,role text,left_at timestamptz,joined_at timestamptz default '2025-01-01');
    create unique index crew_members_one_active_per_user on crew_members(user_id) where left_at is null;
    create table user_blocks(blocker_id uuid references users(id),blocked_pseudo text);
    create table runs(id uuid primary key,user_id uuid references users(id) on delete cascade,activity text,started_at timestamptz,ended_at_2026 timestamptz,created_at timestamptz,ruleset_version text default '2026.1');
    create table capture_events_2026(id uuid primary key,run_id uuid references runs(id) on delete set null,status text,reason text,face_key text);
    create table no_capture_zones(geojson jsonb);`);
  await db.exec(migration('0122_refonte_2026_crew_challenges.sql'));
  for (let i = 0; i < users.length; i++) await db.query('insert into users(id,pseudo) values($1,$2)', [users[i], `fixture_${i}`]);
  for (let i = 0; i < 2; i++) await db.query('insert into crews values($1,$2)', [crews[i], `Test crew ${i}`]);
  for (let i = 0; i < 10; i++) await db.query('insert into crew_members(crew_id,user_id,role,left_at) values($1,$2,$3,null)', [crews[Math.floor(i / 5)], users[i], i % 5 === 0 ? 'founder' : 'runner']);
  await db.query("insert into crew_members(crew_id,user_id,role,left_at) values($1,$2,'captain',null)", [crews[0], users[10]]);
  await db.query("insert into crew_members(crew_id,user_id,role,left_at) values($1,$2,'co_captain',null)", [crews[0], users[11]]);
  // users[12] n'a AUCUNE adhésion : c'est le compte du défaut mesuré ci-dessous.
  await db.query("insert into challenge_arenas_2026(id,title,activity,time_zone,sectors,access_source,reviewed_at) values('fixture_run','Local test','run','Europe/Paris',$1,'Fixture reviewed access',now())", [JSON.stringify(sectors)]);
  monday = await one("select ((date_trunc('week',now() at time zone 'Europe/Paris')+interval '1 week') at time zone 'Europe/Paris')::text");

  await test('étape 0 — 0122 seule : sans crew, le serveur répond de la plomberie, pas une raison', async () => {
    const message = await create(users[12], '20000000-0000-0000-0000-000000000001');
    assert.match(message, /no rows/);
    assert.equal(/no_crew/.test(message), false);
  });
  await test('étape 0 — 0122 seule : arène inconnue et non-direction rendent le MÊME message opaque', async () => {
    assert.match(await create(users[0], '20000000-0000-0000-0000-000000000002', 'ghost_arena'), /no rows/);
    const invited = await create(users[0], '20000000-0000-0000-0000-000000000003');
    assert.equal(invited, null);
    const challenge = await one('select id from crew_challenges_2026 order by created_at desc limit 1');
    assert.match(await as(users[6], () => failure('select accept_crew_challenge_2026($1,true)', [challenge])), /no rows/);
    assert.match(await as(users[6], () => failure('select lock_crew_challenge_2026($1)', [challenge])), /no rows/);
    await db.query('delete from crew_challenges_2026 where id=$1', [challenge]);
  });

  await db.exec(migration('0149_challenge_named_refusals_2026.sql'));

  await test('0149 : chaque refus porte le nom que le contrat annonce', async () => {
    assert.match(await create(users[12], '20000000-0000-0000-0000-000000000011'), /no_crew/);
    assert.match(await create(users[0], '20000000-0000-0000-0000-000000000012', 'ghost_arena'), /arena_unavailable/);
    await db.query("update challenge_arenas_2026 set retired_at=now() where id='fixture_run'");
    assert.match(await create(users[0], '20000000-0000-0000-0000-000000000013'), /arena_unavailable/);
    await db.query("update challenge_arenas_2026 set retired_at=null where id='fixture_run'");
  });
  await test('0149 : accepter et figer répondent direction_required au lieu de P0002', async () => {
    assert.equal(await create(users[0], '20000000-0000-0000-0000-000000000014'), null);
    const challenge = await one('select id from crew_challenges_2026 order by created_at desc limit 1');
    assert.match(await as(users[6], () => failure('select accept_crew_challenge_2026($1,true)', [challenge])), /direction_required/);
    assert.match(await as(users[6], () => failure('select lock_crew_challenge_2026($1)', [challenge])), /direction_required/);
    assert.equal((await as(users[5], () => one('select accept_crew_challenge_2026($1,true)', [challenge]))).status, 'assembling');
    assert.match(await as(users[5], () => failure('select lock_crew_challenge_2026($1)', [challenge])), /five_volunteers_required/);
    await db.query('delete from crew_challenges_2026 where id=$1', [challenge]);
  });
  await test('la direction d’un DÉFI est CREW_PERMISSIONS.invite, et rien d’autre', async () => {
    assert.deepEqual(await one('select manager_roles from challenge_rules_2026'), CREW_PERMISSIONS.invite);
    // Le capitaine crée une SORTIE (createOuting, 0124) mais n'engage pas le crew
    // dans un défi : les deux listes diffèrent, et c'est voulu.
    assert.equal(CREW_PERMISSIONS.createOuting.includes('captain'), true);
    assert.equal(CREW_PERMISSIONS.invite.includes('captain'), false);
    assert.equal(await one('select challenge_manager_2026($1,$2)', [users[10], crews[0]]), false);
    assert.equal(await one('select challenge_manager_2026($1,$2)', [users[11], crews[0]]), true);
    assert.equal(await one('select challenge_manager_2026($1,$2)', [users[0], crews[0]]), true);
    assert.match(await create(users[10], '20000000-0000-0000-0000-000000000015'), /direction_required/);
    assert.equal(await create(users[11], '20000000-0000-0000-0000-000000000016'), null);
  });
  console.log(`PASS ${passed} — 0149 sur PostgreSQL réel (0122 puis 0149). Aucune géométrie, aucune RLS effective prouvées ici.`);
} finally { await db.close(); }
