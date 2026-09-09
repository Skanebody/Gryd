#!/usr/bin/env node
/**
 * GRYD — CE QUI EST MESURÉ DANS UN SECTEUR (0150) : PREUVE DE STRUCTURE.
 *
 * ⚠️ CE FICHIER NE PROUVE AUCUNE GÉOMÉTRIE. PGlite n'a pas PostGIS : aucune
 * intersection n'est calculable ici. Il prouve ce qui EST vérifiable sans
 * PostGIS et qui suffit à distinguer 0150 d'un no-op :
 *   · étape 0 — sur `0122` seule, la mesure du défi passe par `ST_Boundary` et
 *     `challenge_sector_metres_2026` n'existe pas ;
 *   · après `0150` — la mesure est une fonction nommée, réservée au service,
 *     qui intersecte la TRACE avec la FACE (§6.2) et ne mentionne plus
 *     `ST_Boundary` ; `stage_game_activity_2026` l'appelle au lieu de mesurer.
 * Les assertions spatiales réelles (portion de bord, secteur entouré sans
 * passage, raccord synthétique, zone interdite) vivent dans
 * `crew_challenge_measure_2026.postgis.test.mjs` — NON EXÉCUTÉ sur ce poste.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
let passed = 0;
const q = async (sql, args = []) => (await db.query(sql, args)).rows;
const one = async (sql, args = []) => Object.values((await q(sql, args))[0])[0];
async function test(name, fn) { await fn(); console.log(`ok ${++passed} - ${name}`); }
const migration = (name) => readFileSync(new URL(`../migrations/${name}`, import.meta.url), 'utf8');
const source = async (name) => await one("select pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=$1", [name]);
const exists = async (name) => await one("select count(*)::integer from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=$1", [name]);

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
    create table no_capture_zones(geojson jsonb);
    create function stage_capture_2026(uuid,jsonb,jsonb,timestamptz,float8,float8,boolean,boolean) returns void language plpgsql as $$ begin return; end $$;`);
  await db.exec(migration('0122_refonte_2026_crew_challenges.sql'));

  await test('étape 0 — 0122 seule : le défi mesure sur le BORD de la boucle', async () => {
    const staging = await source('stage_game_activity_2026');
    assert.match(staging, /ST_Boundary/);
    assert.match(staging, /boundary as \(select ST_Intersection\(trace\.g,ST_Boundary/);
    assert.equal(await exists('challenge_sector_metres_2026'), 0);
  });

  await db.exec(migration('0150_challenge_trace_inside_sector_2026.sql'));

  await test('0150 : la mesure est une fonction nommée, et elle porte sur la trace dans la face', async () => {
    assert.equal(await exists('challenge_sector_metres_2026'), 1);
    const measure = await source('challenge_sector_metres_2026');
    assert.match(measure, /inside as \(select ST_CollectionExtract\(ST_Intersection\(trace\.g,face\.g\),2\)/);
    assert.equal(/ST_Boundary/.test(measure), false);
    // Le raccord synthétique et les zones interdites restent soustraits.
    assert.match(measure, /ridden as \(select case when \$3::jsonb is null then inside\.g else ST_Difference/);
    assert.match(measure, /allowed as \(select case when forbidden\.g is null then ridden\.g else ST_Difference\(ridden\.g,forbidden\.g\)/);
    assert.match(measure, /from public\.no_capture_zones/);
  });
  await test('0150 : plus aucune mesure de bord dans le chemin de preuve', async () => {
    const staging = await source('stage_game_activity_2026');
    assert.equal(/ST_Boundary/.test(staging), false);
    assert.match(staging, /lengths:=public\.challenge_sector_metres_2026\(p_segments,face->'geometry',face->'closureConnector',c\.sectors\)/);
    // La barrière du raccord de fermeture reste vérifiée AVANT toute mesure.
    assert.match(staging, /if face \? 'closureConnector' then/);
  });
  await test('0150 : mesurer reste un droit du service, jamais du client', async () => {
    for (const role of ['anon', 'authenticated']) {
      assert.equal(await one("select has_function_privilege($1,'public.challenge_sector_metres_2026(jsonb,jsonb,jsonb,jsonb)','execute')", [role]), false);
      assert.equal(await one("select has_function_privilege($1,'public.stage_game_activity_2026(uuid,jsonb,jsonb,jsonb,timestamptz,float8,float8,boolean,boolean)','execute')", [role]), false);
    }
    assert.equal(await one("select has_function_privilege('service_role','public.challenge_sector_metres_2026(jsonb,jsonb,jsonb,jsonb)','execute')"), true);
  });
  await test('0150 : le seuil et son unité restent ceux du cahier, inchangés', async () => {
    const rules = (await q('select run_metres,bike_metres from challenge_rules_2026'))[0];
    assert.deepEqual([rules.run_metres, rules.bike_metres], [400, 1000]);
    assert.match(await source('assign_challenge_loop_2026'), /minimum:=case when run\.activity='run' then r\.run_metres else r\.bike_metres end/);
  });
  console.log(`PASS ${passed} — 0150 : STRUCTURE seule (0122 puis 0150). Aucune géométrie prouvée ici ; voir le harnais PostGIS, non exécuté.`);
} finally { await db.close(); }
