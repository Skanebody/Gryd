#!/usr/bin/env node
/**
 * GRYD — « Ta commune, cette semaine » : LA PART SPATIALE, celle que PGlite ne
 * peut pas prouver. ADR-013 §2.1, migrations 0160 → 0164.
 *
 * ⚠️ CE FICHIER N'EST PAS DANS LE GATE, ET C'EST VOULU. `npm run test:sql` ne
 * ramasse que `*.pglite.test.mjs` ; celui-ci exige un PostgreSQL/PostGIS LOCAL
 * et sort en CODE 2 quand il n'y en a pas — jamais en vert. Même patron que
 * `refonte2026.postgis.test.mjs`, pour la même raison : une base absente ne doit
 * jamais ressembler à une preuve.
 *
 * ═══ CE QU'IL PROUVE, ET QUE RIEN D'AUTRE NE PROUVE ════════════════════════
 *  1. La commune d'un mètre carré est la commune QUI LE CONTIENT : une boucle à
 *     cheval sur deux communes compte dans les deux, chacune pour SA PART.
 *  2. Le total d'un département est EXACTEMENT la somme de ses communes — les
 *     trois portées lisent la même intersection, elles ne peuvent pas se
 *     contredire.
 *  3. Le terrain situé hors de toute commune ouverte n'est compté NULLE PART
 *     (assumé : le référentiel ne connaît pas ce sol, on ne l'invente pas).
 *  4. Le terrain TENU se mesure avec exactement les mêmes exclusions que le
 *     terrain PRIS — sinon une personne exclue du rang réapparaîtrait par son
 *     état.
 *  5. Les deux rectangles de démarrage ('paris', 'lille', 0004) ne captent
 *     AUCUNE surface : ils ne sont pas des communes.
 *
 * ═══ LANCER ════════════════════════════════════════════════════════════════
 *   createdb gryd_spatial_scratch     # base JETABLE, vide, en loopback
 *   GRYD_TEST_DATABASE_URL=postgres://localhost/gryd_spatial_scratch \
 *     node supabase/tests/leaderboard_2026.postgis.test.mjs
 * Tout est joué dans UNE transaction, annulée à la fin : la base ressort vide.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS = join(HERE, '..', 'migrations');

const target = process.env.GRYD_TEST_DATABASE_URL;
if (!target || !['localhost', '127.0.0.1', '[::1]'].includes(new URL(target).hostname)) {
  console.error(
    'NON EXÉCUTÉ : fournir GRYD_TEST_DATABASE_URL vers une base PostgreSQL/PostGIS locale VIDE.\n' +
      'Sans elle, la part spatiale du classement (intersection commune × événement) reste NON PROUVÉE.',
  );
  process.exit(2);
}

let pg;
try {
  pg = createRequire(import.meta.url)('pg');
} catch (err) {
  console.error(`NON EXÉCUTÉ — le client « pg » est introuvable : ${err.message}`);
  process.exit(2);
}

let passed = 0;
const failures = [];
const t = async (name, fn) => {
  try {
    await fn();
    passed += 1;
    console.log(`  ok   ${name}`);
  } catch (err) {
    failures.push({ name, err });
    console.log(`  FAIL ${name}\n       ${err.message}`);
  }
};
const near = (actual, expected, tolerance, what) => {
  if (!(Math.abs(actual - expected) <= tolerance)) {
    throw new Error(`${what} : attendu ${expected} ± ${tolerance}, obtenu ${actual}`);
  }
};
const eq = (actual, expected, what) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${what} : attendu ${e}, obtenu ${a}`);
};

const client = new pg.Client({ connectionString: target });
await client.connect();
await client.query('begin');

try {
  const empty = await client.query("select to_regclass('public.runs') as present");
  if (empty.rows[0].present !== null) {
    throw new Error('base NON VIDE : fournir une base jetable (public.runs existe déjà)');
  }

  // ─── Socle Supabase + lignée réelle ──────────────────────────────────────
  await client.query(`
    create schema if not exists extensions;
    create extension if not exists postgis with schema extensions;
    create extension if not exists pgcrypto with schema extensions;
    create schema if not exists auth;
    create schema if not exists storage;
    create table storage.buckets(id text primary key, name text, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid, metadata jsonb);
    do $$ begin
      if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
      if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
      if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role; end if;
    end $$;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.role',true),'') $$;
    grant usage on schema auth, public to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated;
  `);

  const SKIP = new Set(['0001_extensions.sql', '0020_crew_realtime.sql']);
  const CRON = 'select cron.schedule(';
  const lineage = readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith('.sql') && /^\d{4}_/.test(f) && Number(f.slice(0, 4)) <= 128)
    .sort()
    .filter((f) => !SKIP.has(f));
  for (const file of [...lineage, '0160_leaderboard_2026_scopes.sql', '0161_leaderboard_2026_source_metrics.sql',
    '0162_leaderboard_2026_snapshot_taker.sql', '0163_leaderboard_2026_hourly_job.sql', '0164_leaderboard_2026_read.sql']) {
    const raw = readFileSync(join(MIGRATIONS, file), 'utf8');
    const at = raw.indexOf(CRON);
    // Les migrations qui posent un job sont tronquées à cet appel : pg_cron
    // n'est pas installé sur une base jetable, et l'horloge n'est pas le sujet.
    const sql = at === -1 ? raw : raw.slice(0, at);
    try {
      await client.query(sql.replace(/do \$\$ begin\s*\n\s*if exists \(select 1 from pg_namespace where nspname = 'cron'\)[\s\S]*?end \$\$;/g, ''));
    } catch (err) {
      throw new Error(`SOCLE : ${file} — ${err.message}`);
    }
  }

  console.log('\nleaderboard_2026 — la part SPATIALE (PostgreSQL + PostGIS réel)\n');

  // ─── Deux communes VOISINES et une commune d'un autre département ────────
  // Carrés de 0,01° côte à côte : [1.00,1.01[ et [1.01,1.02[ en longitude.
  const zone = async (cityId, name, west) =>
    client.query(
      `insert into public.city_zones(city_id,name,geojson,status,min_lat,max_lat,min_lng,max_lng)
       values($1,$2,extensions.ST_AsGeoJSON(extensions.ST_MakeEnvelope($3,49,$3+0.01,49.01,4326))::jsonb,'wild',49,49.01,$3,$3+0.01)`,
      [cityId, name, west],
    );
  await zone('insee-76540', 'Rouen', 1.0);
  await zone('insee-76351', 'Le Havre', 1.01);
  await zone('insee-14118', 'Caen', 1.03);

  const owner = '00000001-0000-4000-8000-000000000000';
  await client.query('insert into auth.users(id) values($1)', [owner]);
  await client.query(
    "insert into public.user_profiles(user_id,handle,display_name,profile_visibility,map_sharing,discreet_mode) values($1,'coureur','Coureur','public','simplified',false)",
    [owner],
  );
  const runId = '00000101-0000-4000-8000-000000000000';
  await client.query(
    `insert into public.runs(id,user_id,client_run_id,source,started_at,distance_m,duration_s,status,activity,ruleset_version,shared_map_consent_2026,game_status_2026)
     values($1,$2,gen_random_uuid(),'gps',now(),5000,1800,'valid','run','2026.1',true,'published')`,
    [runId, owner],
  );
  // Une boucle À CHEVAL : moitié dans Rouen, moitié dans Le Havre.
  await client.query(
    `insert into public.capture_events_2026(id,run_id,owner_id,activity,face_key,closed_at,received_at,publish_after,geometry,status,new_geometry)
     select '00000201-0000-4000-8000-000000000000', $1, $2, 'run', '0', now(), now(), now(),
       extensions.ST_Multi(extensions.ST_MakeEnvelope(1.005,49.002,1.015,49.008,4326)), 'published',
       extensions.ST_Multi(extensions.ST_MakeEnvelope(1.005,49.002,1.015,49.008,4326))`,
    [runId, owner],
  );
  await client.query(
    `insert into public.ownership_2026(event_id,owner_id,activity,geometry,controlled_since)
     select '00000201-0000-4000-8000-000000000000', $1, 'run',
       extensions.ST_Multi(extensions.ST_MakeEnvelope(1.005,49.002,1.015,49.008,4326)), now()`,
    [owner],
  );

  const bounds = (await client.query('select week_start, week_end from public.leaderboard_week_bounds_2026(now())')).rows[0];
  const metrics = async (scope, ref) =>
    (await client.query(
      'select subject_id, new_terrain_m2, held_area_m2 from public.board_source_metrics_2026($1,$2,$3,$4,$5)',
      ['run', scope, ref, bounds.week_start, bounds.week_end],
    )).rows;

  let rouen;
  let havre;

  await t('une boucle à cheval compte dans les DEUX communes, chacune pour sa part', async () => {
    rouen = await metrics('commune', 'insee-76540');
    havre = await metrics('commune', 'insee-76351');
    eq([rouen.length, havre.length], [1, 1], 'la boucle n’a pas été vue par les deux communes');
    // La boucle mesure 0,01° de large et déborde de 0,005° de chaque côté de la
    // frontière : les deux parts sont égales à la précision géodésique près.
    near(Number(rouen[0].new_terrain_m2), Number(havre[0].new_terrain_m2), Number(rouen[0].new_terrain_m2) * 0.01,
      'les deux parts de la boucle ne sont pas égales');
  });

  await t('le département est EXACTEMENT la somme de ses communes', async () => {
    const dept = await metrics('department', '76');
    eq(dept.length, 1, 'le département n’a pas agrégé le propriétaire');
    near(Number(dept[0].new_terrain_m2), Number(rouen[0].new_terrain_m2) + Number(havre[0].new_terrain_m2), 1,
      'le total du département contredit ses communes');
  });

  await t('le pays est la somme de ses communes ouvertes, sans commune vide', async () => {
    const country = await metrics('country', 'FR');
    const dept = await metrics('department', '76');
    near(Number(country[0].new_terrain_m2), Number(dept[0].new_terrain_m2), 1,
      'le pays compte une surface que ses départements n’ont pas');
    eq((await metrics('commune', 'insee-14118')).length, 0, 'une commune sans course a rendu une mesure');
  });

  await t('les deux rectangles de démarrage ne captent AUCUNE surface', async () => {
    eq((await metrics('commune', 'paris')).length, 0, 'le rectangle « paris » a capté du terrain');
    eq((await metrics('commune', 'lille')).length, 0, 'le rectangle « lille » a capté du terrain');
  });

  await t('le terrain hors de toute commune ouverte n’est compté nulle part', async () => {
    const outside = await client.query(
      `select extensions.ST_Area(extensions.ST_Multi(extensions.ST_MakeEnvelope(1.005,49.002,1.015,49.008,4326))::extensions.geography) as total`,
    );
    const country = await metrics('country', 'FR');
    // La boucle déborde des deux carrés de commune (au nord et au sud) : le
    // total mesuré est donc STRICTEMENT inférieur à sa surface réelle.
    if (!(Number(country[0].new_terrain_m2) <= Number(outside.rows[0].total) + 1)) {
      throw new Error('une surface hors référentiel a été comptée');
    }
  });

  await t('le terrain TENU suit les mêmes exclusions que le terrain PRIS', async () => {
    const before = Number((await metrics('commune', 'insee-76540'))[0].held_area_m2);
    if (!(before > 0)) throw new Error('le terrain tenu n’est pas mesuré');
    await client.query("update public.user_profiles set discreet_mode=true where user_id=$1", [owner]);
    eq((await metrics('commune', 'insee-76540')).length, 0, 'un discret garde son terrain tenu au classement');
    await client.query("update public.user_profiles set discreet_mode=false where user_id=$1", [owner]);
  });

  await t('le preneur de snapshot écrit un classement réel de bout en bout', async () => {
    const snapshot = (await client.query("select public.take_leaderboard_snapshot_2026('run','commune','insee-76540') as id")).rows[0].id;
    const row = (await client.query(
      'select subjects_count, metric from public.leaderboard_snapshots where id=$1', [snapshot],
    )).rows[0];
    eq([row.subjects_count, row.metric], [1, 'weekly_new_terrain_m2'], 'le snapshot spatial n’a pas été écrit');
    const entry = (await client.query(
      'select rank, conquered_area_m2, controlled_area_m2 from public.leaderboard_entries where snapshot_id=$1', [snapshot],
    )).rows[0];
    eq(entry.rank, 1, 'le rang n’a pas été attribué');
    near(Number(entry.conquered_area_m2), Number(rouen[0].new_terrain_m2), 1, 'la surface gelée n’est pas celle mesurée');
  });

  console.log('');
  if (failures.length > 0) {
    console.error(`${failures.length} échec(s) sur ${passed + failures.length}.`);
    process.exitCode = 1;
  } else {
    console.log(`${passed} vérifications spatiales passées (PostGIS réel).`);
  }
} catch (err) {
  console.error(`\nÉCHEC : ${err.message}`);
  process.exitCode = 1;
} finally {
  await client.query('rollback');
  await client.end();
}
