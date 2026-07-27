#!/usr/bin/env node
/**
 * GRYD — test EXÉCUTABLE de la migration 0075
 * (`territories_source_run_unique` : une course produit AU PLUS UN territoire).
 * LOT 1, ÉTAPE 2 sur 4 — la double écriture du territoire.
 *
 * ═══ POURQUOI CE FICHIER EXISTE ═════════════════════════════════════════════
 * 0075 ne contient AUCUN TypeScript : c'est UN index. Les tests Deno du dépôt ne
 * touchent pas une ligne de DDL — sans ce fichier, « un renvoi ne crée pas un
 * second territoire » resterait une INTENTION. Or c'est précisément la garantie
 * dont `ingest_run` DÉPEND : sa garde applicative est un `select` puis un
 * `insert` (donc un TOCTOU), et c'est la BASE qui doit tenir quand deux requêtes
 * concurrentes la franchissent. Une idempotence portée uniquement par du code
 * applicatif n'est pas un mécanisme.
 *
 * Docker est indisponible sur cette machine (pas de `npx supabase start`).
 * PGlite — Postgres compilé en WASM — exécute le VRAI SQL des migrations dans
 * Node. Même harnais que `territories.pglite.test.mjs` (0074).
 *
 * ═══ CE QUE CE TEST PROUVE ══════════════════════════════════════════════════
 *  1. 0075 s'applique sur un Postgres réel, telle quelle, par-dessus 0074.
 *  2. DEUX territoires sur la MÊME course sont REFUSÉS, et par la contrainte
 *     NOMMÉE qu'on vise (pas par un autre CHECK qui aurait sauvé le test).
 *  3. Deux courses DIFFÉRENTES gardent deux territoires — une unicité qui
 *     écraserait des courses distinctes serait pire que pas d'unicité.
 *  4. Plusieurs territoires ORPHELINS (`source_run_id` null) coexistent. C'est
 *     le cas RÉEL d'après purge (§7) : `on delete set null` met la colonne à
 *     NULL, et Postgres tient deux NULL pour distincts. Un index qui aurait
 *     interdit ça aurait cassé la rétention.
 *  5. La purge d'une course NE DÉTRUIT PAS son territoire (0074 : `on delete set
 *     null`), et LIBÈRE la clé — un nouveau territoire peut renaître sur une
 *     nouvelle course sans buter sur l'ancien.
 *  6. `insert … on conflict (source_run_id) do nothing` — la forme d'écriture
 *     idempotente — est bien ARBITRÉ par cet index. C'est ce qu'un index
 *     PARTIEL n'aurait PAS permis (Postgres ne l'infère pas sans répéter son
 *     prédicat) : le test échouerait si quelqu'un « optimisait » l'index en
 *     partiel.
 *  7. L'index est bien UNIQUE et bien NON PARTIEL (lecture de `pg_indexes`).
 *
 * ═══ CE QU'IL NE PROUVE PAS, dit ici plutôt que laissé croire ═══════════════
 *  · LA CONCURRENCE RÉELLE. PGlite est mono-connexion : on prouve que la
 *    contrainte REFUSE le doublon, pas qu'elle arbitre deux transactions
 *    simultanées (c'est le même mécanisme, mais il n'est pas exercé ici).
 *  · LE CHEMIN D'ÉCRITURE d'ingest_run. Il vit dans une Edge Function Deno ;
 *    c'est `supabase/functions/ingest_run/territory_test.ts` qui prouve la
 *    DÉCISION (quoi écrire, et que la clé naturelle est la course).
 *
 * ═══ LANCER ════════════════════════════════════════════════════════════════
 *   mkdir -p /tmp/pglite && cd /tmp/pglite
 *   echo '{"name":"pglite-scratch","private":true}' > package.json
 *   npm i --ignore-scripts @electric-sql/pglite
 *   cd <repo> && GRYD_PGLITE=/tmp/pglite/node_modules/@electric-sql/pglite/dist/index.js \
 *     node supabase/tests/territories_source_run_unique.pglite.test.mjs
 * Sans PGlite : sortie CODE 2 — un test non exécuté n'est JAMAIS vert. Il n'est
 * donc pas branché sur `npm run test:functions` (Deno, `--allow-read` seul).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const MIGRATIONS = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

let PGlite;
try {
  ({ PGlite } = await import(process.env.GRYD_PGLITE || '@electric-sql/pglite'));
} catch (err) {
  console.error(
    'NON EXÉCUTÉ — PGlite est introuvable. Ce test n’a rien vérifié ;\n' +
      'ne le comptez pas comme vert (sortie 2, jamais 0).\n' +
      `  cause : ${err.message}\n\n` +
      '  mkdir -p /tmp/pglite && cd /tmp/pglite\n' +
      '  echo \'{"name":"pglite-scratch","private":true}\' > package.json\n' +
      '  npm i --ignore-scripts @electric-sql/pglite\n' +
      '  cd <repo> && GRYD_PGLITE=/tmp/pglite/node_modules/@electric-sql/pglite/dist/index.js \\\n' +
      '    node supabase/tests/territories_source_run_unique.pglite.test.mjs',
  );
  process.exit(2);
}

// ─── Micro-harnais d'assertions (aucune dépendance de test) ──────────────────
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
const eq = (actual, expected, what) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${what} : attendu ${e}, obtenu ${a}`);
};
const ok = (cond, what) => {
  if (!cond) throw new Error(what);
};
/** Une insertion doit être REFUSÉE, et par la contrainte NOMMÉE qu'on vise. */
const rejects = async (sql, params, needle, what) => {
  try {
    await db.query(sql, params);
  } catch (err) {
    if (!String(err.message).includes(needle)) {
      throw new Error(`${what} : refusé, mais pour une autre raison — « ${err.message} »`);
    }
    return;
  }
  throw new Error(`${what} : ACCEPTÉ alors qu'il devait être refusé`);
};

const db = new PGlite();

// ─── Le socle que Supabase fournit et qu'un Postgres nu n'a pas ──────────────
await db.exec(`
  create role anon;
  create role authenticated;
  create role service_role;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
  create schema extensions;
  create function extensions.gen_random_bytes(int) returns bytea
    language sql as $$ select decode(md5(random()::text), 'hex') $$;
  alter default privileges in schema public grant all on tables to anon, authenticated;
`);

// ─── Le monde d'AVANT : 0002 (city_zones, users, crews, crew_members, runs)
//     puis 0074 (la table `territories` elle-même). VRAIS fichiers, non modifiés.
await db.exec(readFileSync(join(MIGRATIONS, '0002_schema.sql'), 'utf8'));
await db.exec(readFileSync(join(MIGRATIONS, '0074_territories_polygon.sql'), 'utf8'));

console.log('territories — migration 0075 (unicité source_run_id) sur PGlite\n');

// ═══ 1. LA MIGRATION S'APPLIQUE ═════════════════════════════════════════════
let migrationError = null;
try {
  await db.exec(readFileSync(join(MIGRATIONS, '0075_territories_source_run_unique.sql'), 'utf8'));
} catch (err) {
  migrationError = err;
}

await t('la migration 0075 s’applique sur un Postgres réel, telle quelle', () => {
  if (migrationError) throw new Error(migrationError.message);
});

if (migrationError) {
  console.log('\nMigration non appliquée : la suite n’a aucun sens, on s’arrête ici.');
  process.exit(1);
}

// ─── Acteurs ────────────────────────────────────────────────────────────────
const RUNNER = '11111111-1111-1111-1111-111111111111';
const CITY = 'paris';
const ALGO = 'gryd-loop-polygon@1';

await db.exec(`
  insert into auth.users (id) values ('${RUNNER}');
  insert into public.city_zones (city_id, name, geojson, status)
    values ('${CITY}', 'Paris', '{}'::jsonb, 'active');
  insert into public.users (id, pseudo, city_id) values ('${RUNNER}', 'coureur', '${CITY}');
`);

const newRun = async () => {
  const r = await db.query(
    `insert into public.runs (user_id, client_run_id, source, started_at,
                              distance_m, duration_s, status)
     values ($1, gen_random_uuid(), 'gps', now(), 5000, 1800, 'valid')
     returning id`,
    [RUNNER],
  );
  return r.rows[0].id;
};

/** Un carré ~400 m à Paris, en GeoJSON refermé (ce que le moteur persiste). */
const SQUARE = JSON.stringify({
  type: 'Polygon',
  coordinates: [[
    [2.3522, 48.8566],
    [2.3577, 48.8566],
    [2.3577, 48.8602],
    [2.3522, 48.8602],
    [2.3522, 48.8566],
  ]],
});

/** Insert d'un territoire NOMINAL ; `runId` peut être null (orphelin). */
const insertTerritory = (runId) =>
  db.query(
    `insert into public.territories
       (activity, owner_type, owner_id, geometry, area_m2, city_id, state,
        publish_after, algorithm_version, source_run_id)
     values ('run', 'user', $1, $2::jsonb, 160000, $3, 'owned_personal',
             now() + interval '60 minutes', $4, $5)
     returning id`,
    [RUNNER, SQUARE, CITY, ALGO, runId],
  );

// ═══ 2. DEUX TERRITOIRES SUR LA MÊME COURSE : REFUSÉ ════════════════════════
const RUN_A = await newRun();

await t('un premier territoire sur une course passe', async () => {
  const r = await insertTerritory(RUN_A);
  ok(r.rows[0].id, 'aucun id retourné');
});

await t('un SECOND territoire sur la MÊME course est refusé (territories_source_run_unique)', () =>
  rejects(
    `insert into public.territories
       (activity, owner_type, owner_id, geometry, area_m2, city_id, state,
        publish_after, algorithm_version, source_run_id)
     values ('run', 'user', $1, $2::jsonb, 160000, $3, 'owned_personal',
             now() + interval '60 minutes', $4, $5)`,
    [RUNNER, SQUARE, CITY, ALGO, RUN_A],
    'territories_source_run_unique',
    'le doublon de course',
  ));

// Le doublon est refusé MÊME s'il diffère en tout point (aire, état, ville) :
// la clé est la COURSE, pas la ressemblance des lignes.
await t('le doublon est refusé même avec une géométrie et un état DIFFÉRENTS', () =>
  rejects(
    `insert into public.territories
       (activity, owner_type, owner_id, geometry, area_m2, state,
        publish_after, algorithm_version, source_run_id)
     values ('bike', 'user', $1, $2::jsonb, 999999, 'contested',
             now(), 'autre-algo@9', $3)`,
    [RUNNER, SQUARE, RUN_A],
    'territories_source_run_unique',
    'le doublon de course, contenu différent',
  ));

// ═══ 3. DEUX COURSES DIFFÉRENTES = DEUX TERRITOIRES ═════════════════════════
await t('deux courses DIFFÉRENTES gardent deux territoires', async () => {
  const runB = await newRun();
  await insertTerritory(runB);
  const c = await db.query('select count(*)::int as n from public.territories');
  eq(c.rows[0].n, 2, 'nombre de territoires');
});

// ═══ 4. LES ORPHELINS COEXISTENT (nulls distinctes) ═════════════════════════
await t('plusieurs territoires ORPHELINS (source_run_id null) coexistent', async () => {
  await insertTerritory(null);
  await insertTerritory(null);
  const c = await db.query(
    'select count(*)::int as n from public.territories where source_run_id is null',
  );
  eq(c.rows[0].n, 2, 'territoires orphelins');
});

// ═══ 5. LA PURGE D'UNE COURSE : LE TERRITOIRE SURVIT, LA CLÉ EST LIBÉRÉE ════
await t('purger la course NE DÉTRUIT PAS le territoire et LIBÈRE la clé', async () => {
  const before = await db.query('select count(*)::int as n from public.territories');
  await db.query('delete from public.runs where id = $1', [RUN_A]);
  const after = await db.query('select count(*)::int as n from public.territories');
  eq(after.rows[0].n, before.rows[0].n, 'le territoire a été gagné : il ne disparaît pas avec sa trace');
  const orphan = await db.query(
    'select count(*)::int as n from public.territories where source_run_id is null',
  );
  ok(orphan.rows[0].n === 3, `attendu 3 orphelins après purge, obtenu ${orphan.rows[0].n}`);
  // Et une NOUVELLE course peut redonner un territoire : la clé n'est pas
  // « brûlée » par l'ancienne.
  const runC = await newRun();
  const r = await insertTerritory(runC);
  ok(r.rows[0].id, 'une nouvelle course doit pouvoir écrire un territoire');
});

// ═══ 6. `on conflict (source_run_id) do nothing` EST ARBITRÉ PAR CET INDEX ══
// C'est LE point que casserait un index partiel : Postgres refuserait d'inférer
// l'arbitre et lèverait « there is no unique or exclusion constraint matching ».
await t('`on conflict (source_run_id) do nothing` est inférable — un index PARTIEL ne le serait pas', async () => {
  const runD = await newRun();
  const first = await db.query(
    `insert into public.territories
       (activity, owner_type, owner_id, geometry, area_m2, state,
        publish_after, algorithm_version, source_run_id)
     values ('run', 'user', $1, $2::jsonb, 160000, 'owned_personal',
             now() + interval '60 minutes', $3, $4)
     on conflict (source_run_id) do nothing
     returning id`,
    [RUNNER, SQUARE, ALGO, runD],
  );
  eq(first.rows.length, 1, 'le premier insert doit créer la ligne');

  const second = await db.query(
    `insert into public.territories
       (activity, owner_type, owner_id, geometry, area_m2, state,
        publish_after, algorithm_version, source_run_id)
     values ('run', 'user', $1, $2::jsonb, 160000, 'owned_personal',
             now() + interval '60 minutes', $3, $4)
     on conflict (source_run_id) do nothing
     returning id`,
    [RUNNER, SQUARE, ALGO, runD],
  );
  eq(second.rows.length, 0, 'le second insert ne doit RIEN créer, et ne doit PAS lever');

  const c = await db.query(
    'select count(*)::int as n from public.territories where source_run_id = $1',
    [runD],
  );
  eq(c.rows[0].n, 1, 'un seul territoire pour cette course');
});

// ═══ 7. LA FORME DE L'INDEX (unique, non partiel) ═══════════════════════════
await t('l’index est UNIQUE et NON PARTIEL', async () => {
  const r = await db.query(
    `select indexdef from pg_indexes
      where schemaname = 'public' and tablename = 'territories'
        and indexname = 'territories_source_run_unique'`,
  );
  ok(r.rows.length === 1, 'index territories_source_run_unique absent');
  const def = r.rows[0].indexdef;
  ok(/CREATE UNIQUE INDEX/i.test(def), `l’index doit être UNIQUE — ${def}`);
  ok(/\(source_run_id\)/.test(def), `l’index doit porter sur source_run_id — ${def}`);
  ok(
    !/\bWHERE\b/i.test(def),
    `l’index ne doit PAS être partiel (sinon "on conflict" ne l’infère plus) — ${def}`,
  );
});

// ─── Verdict ────────────────────────────────────────────────────────────────
console.log(`\n${passed} test(s) OK, ${failures.length} échec(s).`);
if (failures.length > 0) process.exit(1);
