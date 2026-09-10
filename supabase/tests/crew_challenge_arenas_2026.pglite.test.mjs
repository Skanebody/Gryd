#!/usr/bin/env node
/**
 * GRYD — LA VOIE DE PUBLICATION D'UNE ARÈNE (0151), SANS AUCUNE ARÈNE CRÉÉE.
 *
 * ÉTAPE 0 OBLIGATOIRE. `0122` seule est jouée d'abord : le catalogue est vide,
 * il n'existe AUCUNE fonction pour en dériver un depuis la géographie réelle,
 * et la seule entrée demande trois polygones écrits à la main. C'est le
 * cul-de-sac mesuré : `list_challenge_arenas_2026('run')` rend `[]` pour
 * toujours. `0151` est ensuite appliquée sur la même base.
 *
 * ⚠️ CE QUE CE FICHIER NE PROUVE PAS. PGlite n'a pas PostGIS : le DÉCOUPAGE
 * lui-même (clusters de possessions réelles, bandes du contour communal,
 * disjonction, aires, portées) n'est pas exécuté ici. Sont prouvés : les refus
 * qui précèdent tout calcul, les droits, le journal, le retrait, et surtout
 * qu'aucune arène n'est semée par la migration.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
let passed = 0;
const users = ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'];
const crews = ['10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002'];
const sectors = ['canal', 'park', 'centre'].map(id => ({ id, title: id, geometry: { type: 'Polygon', coordinates: [[[2, 48], [2.01, 48], [2.01, 48.01], [2, 48.01], [2, 48]]] } }));
const q = async (sql, args = []) => (await db.query(sql, args)).rows;
const one = async (sql, args = []) => Object.values((await q(sql, args))[0])[0];
const failure = async (sql, args = []) => { try { await db.query(sql, args); return null; } catch (error) { return error.message; } };
async function as(user, fn) {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user ?? '']); await db.exec('set role authenticated');
  try { return await fn(); } finally { await db.exec('reset role'); }
}
async function test(name, fn) { await fn(); console.log(`ok ${++passed} - ${name}`); }
const migration = (name) => readFileSync(new URL(`../migrations/${name}`, import.meta.url), 'utf8');
const exists = async (name) => await one("select count(*)::integer from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=$1", [name]);
// Paramètres explicites, comme l'Edge Function les enverra (aucun défaut SQL).
const params = [4000, 400, 400, 3];

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
    create table no_capture_zones(geojson jsonb);
    create table city_zones(city_id text primary key,name text,geojson jsonb,status text);
    create table fr_communes(insee text primary key,nom text not null,lat double precision not null,lng double precision not null,population integer);`);
  await db.exec(migration('0122_refonte_2026_crew_challenges.sql'));
  for (const [index, id] of users.entries()) await db.query('insert into users(id,pseudo) values($1,$2)', [id, `fixture_${index}`]);
  for (const [index, id] of crews.entries()) await db.query('insert into crews values($1,$2)', [id, `Test crew ${index}`]);
  for (const [index, id] of users.entries()) await db.query("insert into crew_members(crew_id,user_id,role,left_at) values($1,$2,'founder',null)", [crews[index], id]);
  // Communes RÉELLES du référentiel 0068 (extrait), jamais inventées.
  await db.query("insert into fr_communes values('76540','Rouen',49.4428,1.0886,112321),('75056','Paris',48.8566,2.3522,2145906)");

  await test('étape 0 — 0122 seule : le catalogue est vide et rien ne permet de le remplir', async () => {
    assert.equal(await one('select count(*)::integer from challenge_arenas_2026'), 0);
    assert.deepEqual(await as(users[0], () => one("select list_challenge_arenas_2026('run')")), []);
    for (const name of ['propose_challenge_arenas_2026', 'publish_challenge_arena_2026', 'retire_challenge_arena_2026']) assert.equal(await exists(name), 0);
    assert.equal(await one("select to_regclass('public.challenge_arena_publications_2026') is null"), true);
    // La seule entrée existante exige trois polygones écrits à la main.
    assert.equal(await one("select has_function_privilege('authenticated','public.configure_challenge_arena_2026(text,text,text,text,jsonb,text,timestamptz)','execute')"), false);
  });

  await db.exec(migration('0149_challenge_named_refusals_2026.sql'));
  await db.exec(migration('0151_challenge_arena_from_real_geography_2026.sql'));

  await test('0151 : la voie est posée, et AUCUNE arène n’est semée', async () => {
    assert.equal(await one('select count(*)::integer from challenge_arenas_2026'), 0);
    assert.equal(await one('select count(*)::integer from challenge_arena_publications_2026'), 0);
    assert.deepEqual(await as(users[0], () => one("select list_challenge_arenas_2026('run')")), []);
    for (const name of ['propose_challenge_arenas_2026', 'publish_challenge_arena_2026', 'retire_challenge_arena_2026']) assert.equal(await exists(name), 1);
  });
  await test('0151 : proposer et publier sont des droits du service, jamais du client', async () => {
    for (const role of ['anon', 'authenticated']) {
      assert.equal(await one("select has_function_privilege($1,'public.propose_challenge_arenas_2026(text,text,text,float8,float8,float8,integer)','execute')", [role]), false);
      assert.equal(await one("select has_function_privilege($1,'public.publish_challenge_arena_2026(text,text,text,text,text,text[],text,timestamptz,text,float8,float8,float8,integer)','execute')", [role]), false);
      assert.equal(await one("select has_function_privilege($1,'public.retire_challenge_arena_2026(text,text,text)','execute')", [role]), false);
      assert.equal(await one('select has_table_privilege($1,$2,$3)', [role, 'public.challenge_arena_publications_2026', 'select']), false);
      assert.equal(await one('select has_table_privilege($1,$2,$3)', [role, 'public.challenge_arena_publications_2026', 'insert']), false);
    }
    assert.equal(await one("select relrowsecurity from pg_class where oid='public.challenge_arena_publications_2026'::regclass"), true);
    assert.equal(await one("select count(*)::integer from pg_policies where tablename='challenge_arena_publications_2026'"), 0);
  });
  await test('0151 : une commune inconnue ou un paramètre absurde est refusé AVANT toute géométrie', async () => {
    assert.match(await failure('select propose_challenge_arenas_2026($1,$2,$3,$4,$5,$6,$7)', ['rouen-run-v1', '99999', 'run', ...params]), /unknown_commune/);
    assert.match(await failure('select propose_challenge_arenas_2026($1,$2,$3,$4,$5,$6,$7)', ['rouen-run-v1', '76540', 'walk', ...params]), /invalid_arena_request/);
    assert.match(await failure('select propose_challenge_arenas_2026($1,$2,$3,$4,$5,$6,$7)', ['   ', '76540', 'run', ...params]), /invalid_arena_request/);
    assert.match(await failure('select propose_challenge_arenas_2026($1,$2,$3,$4,$5,$6,$7)', ['rouen-run-v1', '76540', 'run', 0, 400, 400, 3]), /invalid_parameters/);
    // Moins d'une possession par secteur ne serait pas une présence réelle.
    assert.match(await failure('select propose_challenge_arenas_2026($1,$2,$3,$4,$5,$6,$7)', ['rouen-run-v1', '76540', 'run', 4000, 400, 400, 2]), /invalid_parameters/);
  });
  await test('0151 : publier sans opérateur ni noms de lieux réels est refusé, sans calcul', async () => {
    const publish = (titles, operator = 'fondateur') => failure('select publish_challenge_arena_2026($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',
      ['rouen-run-v1', '76540', 'run', 'Europe/Paris', 'Rouen', titles, 'https://exemple/acces', new Date().toISOString(), operator, ...params]);
    assert.match(await publish(['Les Quais', 'Jardin des Plantes', 'Rive Gauche'], '  '), /operator_required/);
    assert.match(await publish(['Les Quais', 'Jardin des Plantes']), /sector_titles_required/);
    assert.match(await publish(['Les Quais', 'Jardin des Plantes', '  ']), /sector_titles_required/);
    assert.match(await publish(['Les Quais', 'Les Quais', 'Rive Gauche']), /sector_titles_required/);
    // Noms valides : le refus suivant vient de la GÉOGRAPHIE, pas des noms.
    assert.equal(/sector_titles_required|operator_required/.test(await publish(['Les Quais', 'Jardin des Plantes', 'Rive Gauche'])), false);
    assert.equal(await one('select count(*)::integer from challenge_arenas_2026'), 0);
  });
  await test('0151 : la portée d’un secteur se mesure sur sa part JOUABLE, jamais sur son aire brute', async () => {
    // Ce que PGlite peut prouver sans PostGIS : la RÈGLE écrite dans le corps.
    // `challenge_sector_metres_2026` (0150) soustrait `no_capture_zones` de la
    // trace ; une proposition qui jugerait la portée sur l'aire brute pourrait
    // publier un secteur inerte. Constaté sur PostGIS 3.3.7 réel le 10/09/2026 :
    // un secteur taillé dans « La Seine » rendait 1 296 m de portée brute (donc
    // publiable) pour 0 m² jouable. Les deux mesures doivent venir du MÊME
    // ensemble — c'est la contrainte que ce test verrouille.
    const body = await one("select pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='propose_challenge_arenas_2026'");
    assert.ok(/countable as \(select case when barred\.g is null/.test(body), 'la part jouable doit être dérivée des zones interdites');
    assert.ok(/ST_XMin\(countable\.g\)/.test(body) && /ST_XMax\(countable\.g\)/.test(body), 'la portée doit être mesurée sur la part jouable');
    assert.equal(/ST_XMin\(kept\.g\)/.test(body), false, 'la portée ne doit plus être mesurée sur l’aire brute');
    assert.ok(/countable is null or countable<=0/.test(body), 'un secteur entièrement interdit doit être refusé');
    assert.ok(/'countableAreaM2'/.test(body), 'la part jouable doit être rapportée à l’opérateur');
    assert.ok(/surfaces:=surfaces\|\|countable/.test(body), 'le rapport d’aires (§6.5) doit comparer des aires jouables');
    // Une emprise `city_zones` est une MÉTROPOLE en production (Paris : 124
    // communes, Lille : 93, constat du 10/09/2026) : découper « la commune » y
    // rendrait des bandes bien plus larges qu'elle, et cela doit se dire.
    assert.ok(/footprint_wider_than_commune/.test(body), 'une emprise plus large que la commune doit être annoncée');
    assert.ok(/'footprintName',footprint_name/.test(body), 'le territoire réellement découpé doit être nommé');
  });
  await test('0151 : retirer une arène la sort du catalogue, la journalise, et ne se rejoue pas', async () => {
    await db.query("insert into challenge_arenas_2026(id,title,activity,time_zone,sectors,access_source,reviewed_at) values('rouen-run-v1','Rouen','run','Europe/Paris',$1,'Revue de terrain',now())", [JSON.stringify(sectors)]);
    assert.equal((await as(users[0], () => one("select list_challenge_arenas_2026('run')"))).length, 1);
    assert.match(await failure("select retire_challenge_arena_2026('rouen-run-v1','fondateur','  ')"), /operator_required/);
    const retired = await one("select retire_challenge_arena_2026('rouen-run-v1','fondateur','travaux sur les quais')");
    assert.equal(retired.retired, true);
    assert.deepEqual(await as(users[0], () => one("select list_challenge_arenas_2026('run')")), []);
    const journal = (await q("select * from challenge_arena_publications_2026 where arena_id='rouen-run-v1'"))[0];
    assert.equal(journal.action, 'retired');
    assert.equal(journal.operator, 'fondateur');
    assert.equal(journal.proposal.reason, 'travaux sur les quais');
    // Aucune commune inventée pour une arène publiée hors de cette voie.
    assert.equal(journal.commune_insee, null);
    assert.match(await failure("select retire_challenge_arena_2026('rouen-run-v1','fondateur','deux fois')"), /arena_unavailable/);
  });
  await test('0151 + 0149 : un défi ne se crée plus sur une arène retirée, et le dit', async () => {
    const monday = await one("select ((date_trunc('week',now() at time zone 'Europe/Paris')+interval '1 week') at time zone 'Europe/Paris')::text");
    assert.match(await as(users[0], () => failure('select create_crew_challenge_2026($1,$2,$3,$4,true)',
      ['20000000-0000-0000-0000-000000000001', crews[1], 'rouen-run-v1', monday])), /arena_unavailable/);
  });
  console.log(`PASS ${passed} — 0151 sur PostgreSQL réel (0122, 0149, 0151). Le découpage géographique n'est PAS exécuté ici.`);
} finally { await db.close(); }
