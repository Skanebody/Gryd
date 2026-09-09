/** GRYD — LA MESURE « DANS LE SECTEUR » (0150), SUR UN VRAI PostGIS.
 *
 * Real PostgreSQL + PostGIS only. Never treats an unavailable database as green.
 * GRYD_TEST_DATABASE_URL must point at an EMPTY disposable loopback database.
 * Toutes les fixtures, migrations et assertions sont annulées ensemble (rollback).
 *
 * ⚠️ NON EXÉCUTÉ sur le poste de développement (aucune base PostgreSQL/PostGIS
 * locale, cf. CLAUDE.md) : ce fichier sort en code 2 sans base, ce qui n'est
 * JAMAIS un test vert. Le gate, lui, ne prouve que la structure de 0150
 * (crew_challenge_measure_2026.pglite.test.mjs).
 *
 * Ce qu'il vérifie, et qui ne se prouve nulle part ailleurs :
 *   1. étape 0 — l'ancienne mesure (trace ∩ ST_Boundary(face)) rend 0 m pour
 *      une portion de trace réellement parcourue À L'INTÉRIEUR de la boucle ;
 *   2. la mesure de 0150 la compte, au-dessus du seuil du cahier §6.2 ;
 *   3. un secteur entouré mais jamais traversé reste à 0 (anti-« englober ») ;
 *   4. un raccord synthétique de fermeture ne se mesure pas ;
 *   5. une zone interdite est soustraite de la longueur mesurée.
 */
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { CHALLENGE_RULES_2026 } from '../functions/_shared/game-rules.ts';

const target = process.env.GRYD_TEST_DATABASE_URL;
if (!target || !['localhost', '127.0.0.1', '[::1]'].includes(new URL(target).hostname)) {
  console.error('NON EXÉCUTÉ : fournir GRYD_TEST_DATABASE_URL vers une base PostgreSQL/PostGIS locale vide.');
  process.exit(2);
}
const run = CHALLENGE_RULES_2026.minimumTraceInsideSectorM.run;
const bootstrap = `
begin;
do $$ begin if to_regclass('public.runs') is not null then raise exception 'Disposable EMPTY database required'; end if; end $$;
create schema if not exists extensions;
create extension if not exists postgis with schema extensions;
create schema if not exists auth;
do $$ begin
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
  if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role; end if;
end $$;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth,public to anon,authenticated,service_role;
create table public.users(id uuid primary key,pseudo text unique,deletion_requested_at timestamptz);
create table public.crews(id uuid primary key,name text);
create table public.crew_members(crew_id uuid references public.crews(id),user_id uuid references public.users(id),role text,left_at timestamptz,joined_at timestamptz default '2025-01-01');
create table public.user_blocks(blocker_id uuid references public.users(id),blocked_pseudo text);
create table public.runs(id uuid primary key,user_id uuid references public.users(id),activity text,started_at timestamptz,ended_at_2026 timestamptz,created_at timestamptz,ruleset_version text default '2026.1');
create table public.capture_events_2026(id uuid primary key,run_id uuid references public.runs(id),status text,reason text,face_key text);
create table public.no_capture_zones(geojson jsonb);
create function public.stage_capture_2026(uuid,jsonb,jsonb,timestamptz,float8,float8,boolean,boolean) returns void language plpgsql as $$ begin return; end $$;
`;
// La boucle est un carré ; la trace ajoute une diagonale RÉELLEMENT parcourue à
// l'intérieur. `enclosed` est entouré par la boucle mais n'est jamais traversé.
const assertions = `
create temp table fixture as select
  '{"type":"Polygon","coordinates":[[[2,48],[2.01,48],[2.01,48.01],[2,48.01],[2,48]]]}'::jsonb face,
  '[{"type":"LineString","coordinates":[[2,48],[2.01,48],[2.01,48.01],[2,48.01],[2,48]]},
    {"type":"LineString","coordinates":[[2.002,48.002],[2.008,48.008]]}]'::jsonb segments,
  '{"type":"LineString","coordinates":[[2.002,48.002],[2.008,48.008]]}'::jsonb connector,
  jsonb_build_array(
    jsonb_build_object('id','edge','title','Bord réellement parcouru','geometry',extensions.ST_AsGeoJSON(extensions.ST_MakeEnvelope(1.9999,47.9999,2.0101,48.0001,4326))::jsonb),
    jsonb_build_object('id','inside','title','Traversé à l''intérieur de la boucle','geometry',extensions.ST_AsGeoJSON(extensions.ST_MakeEnvelope(2.0015,48.0015,2.0085,48.0085,4326))::jsonb),
    jsonb_build_object('id','enclosed','title','Entouré sans passage','geometry',extensions.ST_AsGeoJSON(extensions.ST_MakeEnvelope(2.006,48.002,2.009,48.0035,4326))::jsonb)
  ) sectors;

do $$
declare f record; legacy jsonb; measured jsonb; masked jsonb;
begin
  select * into f from fixture;
  -- 1. ÉTAPE 0 : la mesure de 0122, rejouée telle quelle sur la même fixture.
  execute $spatial$
    with trace as (select extensions.ST_UnaryUnion(extensions.ST_Collect(extensions.ST_SetSRID(extensions.ST_GeomFromGeoJSON(s),4326))) g from jsonb_array_elements($1) s),
    boundary as (select extensions.ST_Intersection(trace.g,extensions.ST_Boundary(extensions.ST_SetSRID(extensions.ST_GeomFromGeoJSON($2),4326))) g from trace)
    select jsonb_object_agg(s->>'id',extensions.ST_Length(extensions.ST_CollectionExtract(extensions.ST_Intersection(boundary.g,extensions.ST_SetSRID(extensions.ST_GeomFromGeoJSON(s->'geometry'),4326)),2)::extensions.geography))
      from boundary,jsonb_array_elements($3) s
  $spatial$ into legacy using f.segments,f.face,f.sectors;
  if (legacy->>'inside')::float8 <> 0 then raise exception 'étape 0 invalide : 0122 mesurait déjà la diagonale intérieure'; end if;
  if (legacy->>'edge')::float8 < ${run} then raise exception 'étape 0 invalide : le bord parcouru devait déjà compter'; end if;

  -- 2 et 3. La mesure de 0150.
  measured:=public.challenge_sector_metres_2026(f.segments,f.face,null,f.sectors);
  if (measured->>'inside')::float8 < ${run} then
    raise exception '§6.2 : une portion de trace validée à l''intérieur du secteur doit compter (mesuré %)',measured->>'inside'; end if;
  if (measured->>'edge')::float8 < (legacy->>'edge')::float8 then
    raise exception 'régression : la nouvelle mesure doit contenir l''ancienne'; end if;
  if (measured->>'enclosed')::float8 <> 0 then
    raise exception 'englober un secteur sans y passer a produit % m',measured->>'enclosed'; end if;

  -- 4. Le raccord synthétique de fermeture ne se mesure jamais.
  measured:=public.challenge_sector_metres_2026(f.segments,f.face,f.connector,f.sectors);
  if (measured->>'inside')::float8 <> 0 then
    raise exception 'un raccord inventé a été mesuré (% m)',measured->>'inside'; end if;

  -- 5. Une zone interdite est soustraite.
  insert into public.no_capture_zones values(extensions.ST_AsGeoJSON(extensions.ST_MakeEnvelope(2,47.999,2.005,48.001,4326))::jsonb);
  masked:=public.challenge_sector_metres_2026(f.segments,f.face,null,f.sectors);
  if (masked->>'edge')::float8 >= (legacy->>'edge')::float8 then
    raise exception 'une zone interdite n''a pas été retirée du bord mesuré'; end if;
  if (masked->>'inside')::float8 < ${run} then
    raise exception 'la zone interdite a mangé une portion qu''elle ne couvre pas'; end if;
end $$;
rollback;
`;
const dir = mkdtempSync(join(tmpdir(), 'gryd-challenge-measure-'));
try {
  const sql = join(dir, 'verify.sql');
  writeFileSync(sql, bootstrap +
    readFileSync(new URL('../migrations/0122_refonte_2026_crew_challenges.sql', import.meta.url), 'utf8') +
    readFileSync(new URL('../migrations/0150_challenge_trace_inside_sector_2026.sql', import.meta.url), 'utf8') +
    assertions);
  const result = spawnSync('psql', [target, '-X', '-v', 'ON_ERROR_STOP=1', '-f', sql], { stdio: 'inherit' });
  if (result.error) { console.error(`NON EXÉCUTÉ : ${result.error.message}`); process.exitCode = 2; }
  else process.exitCode = result.status ?? 1;
} finally { rmSync(dir, { recursive: true, force: true }); }
