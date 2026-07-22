#!/usr/bin/env node
/**
 * GRYD — test EXÉCUTABLE de la migration 0060 (`season_current`) sur PGlite.
 *
 * ═══ POURQUOI ═══════════════════════════════════════════════════════════════
 * `season_current` est la RPC qui garantit que l'app ne MENT jamais sur la
 * saison : elle lit la table `seasons` et renvoie la saison ACTIVE d'une ville
 * (avec son numéro dérivé) ou RIEN. Une migration jamais exécutée est une
 * intention, pas un mécanisme — ce test exécute le VRAI SQL de 0060 et prouve :
 *   1. la RPC renvoie la saison `active` de la ville, et son numéro 0-indexé
 *      (rang par ancienneté de `starts_at` : la 1re saison = « Saison 0 ») ;
 *   2. une saison `upcoming` ou `closed` n'est JAMAIS renvoyée (statut seul) ;
 *   3. sans saison active, la RPC renvoie ZÉRO ligne (le hook dira « aucune ») ;
 *   4. `p_city_id` par défaut résout la ville du joueur via `auth.uid()` ;
 *   5. GRANTS : `authenticated` a EXECUTE, `anon` et `public` NE l'ont PAS.
 *
 * ═══ CE QUE CE TEST NE PROUVE PAS ═══════════════════════════════════════════
 *   · LA RLS. PGlite tourne en superutilisateur (RLS contournée) et n'a ni
 *     schéma `auth` ni rôles Supabase réels : on STUBBE `auth.uid()` et les
 *     tables. Ce qui est prouvé côté sécurité, c'est le périmètre d'EXECUTE
 *     (has_function_privilege) — pas l'effet des politiques de `seasons`, dont
 *     la lecture reste garantie par 0003_rls.sql (revue, non ré-exécutée ici).
 *
 * ═══ LANCER ════════════════════════════════════════════════════════════════
 *   mkdir -p /tmp/pglite && cd /tmp/pglite
 *   echo '{"name":"pglite-scratch","private":true}' > package.json
 *   npm i --ignore-scripts @electric-sql/pglite
 *   cd <repo> && GRYD_PGLITE=/tmp/pglite/node_modules/@electric-sql/pglite/dist/index.js \
 *     node supabase/tests/season_current.pglite.test.mjs
 *
 * Sans PGlite : sortie CODE 2 avec message explicite (un test non exécuté ne
 * doit jamais ressembler à un test vert). Non branché sur `npm run test:functions`
 * (Deno, --allow-read seul) — le brancher rendrait le gate rouge sans PGlite.
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
      '    node supabase/tests/season_current.pglite.test.mjs',
  );
  process.exit(2);
}

// ─── Micro-harnais d'assertions ──────────────────────────────────────────────
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

const db = new PGlite();

// ─── Stubs : rôles Supabase, schéma auth, et les tables lues par la RPC. ─────
// La migration 0060 ne crée aucune table — elle référence public.seasons,
// public.users et auth.uid(). On fournit des stubs MINIMAUX (colonnes réellement
// lues) pour exécuter le VRAI SQL de la migration sans le modifier.
await db.exec(`
  create role anon;
  create role authenticated;
  create role service_role;

  create schema if not exists auth;
  -- auth.uid() lit un GUC de session posé par le test (aucun schéma auth réel).
  create or replace function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('test.uid', true), '')::uuid
  $$;

  create table public.users (
    id      uuid primary key,
    city_id text
  );
  create table public.seasons (
    id        uuid primary key default gen_random_uuid(),
    city_id   text not null,
    starts_at timestamptz not null,
    ends_at   timestamptz not null,
    status    text not null
  );
`);

// Le VRAI SQL de la migration (create function + revoke/grant).
await db.exec(readFileSync(join(MIGRATIONS, '0060_season_current.sql'), 'utf8'));

// ─── Données de scénario ─────────────────────────────────────────────────────
const PARIS = 'paris';
const LILLE = 'lille';
const UID_PARIS = '11111111-1111-1111-1111-111111111111';
const UID_NOCITY = '22222222-2222-2222-2222-222222222222';

const insertSeason = (cityId, startsAt, endsAt, status) =>
  db.query(
    `insert into public.seasons (city_id, starts_at, ends_at, status)
     values ($1, $2, $3, $4) returning id`,
    [cityId, startsAt, endsAt, status],
  );

const current = async (cityId) =>
  (await db.query('select * from public.season_current($1)', [cityId])).rows;

const setUid = (uid) => db.exec(`set test.uid = '${uid ?? ''}';`);

await db.exec(`
  insert into public.users (id, city_id) values
    ('${UID_PARIS}', '${PARIS}'),
    ('${UID_NOCITY}', null);
`);

console.log('season_current — migration 0060 sur PGlite\n');

// ─── 1. Numéro 0-indexé + saison active de la ville ──────────────────────────
await t('renvoie la saison active de la ville avec son numéro 0-indexé', async () => {
  await db.exec('truncate public.seasons;');
  // Deux saisons Paris : une CLOSED plus ancienne (Saison 0), une ACTIVE (Saison 1).
  await insertSeason(PARIS, '2026-01-01T00:00:00Z', '2026-03-01T00:00:00Z', 'closed');
  await insertSeason(PARIS, '2026-05-01T00:00:00Z', '2026-07-01T00:00:00Z', 'active');
  // Une saison active pour Lille : ne doit PAS fuiter dans la lecture de Paris.
  await insertSeason(LILLE, '2026-05-01T00:00:00Z', '2026-07-01T00:00:00Z', 'active');

  const rows = await current(PARIS);
  eq(rows.length, 1, 'une seule saison active pour Paris');
  eq(rows[0].city_id, PARIS, 'ville');
  eq(Number(rows[0].season_number), 1, 'numéro = rang 0-indexé (une saison antérieure)');
  eq(new Date(rows[0].ends_at).toISOString(), '2026-07-01T00:00:00.000Z', 'ends_at réel');
});

await t('la toute première saison d’une ville est « Saison 0 »', async () => {
  await db.exec('truncate public.seasons;');
  await insertSeason(PARIS, '2026-05-01T00:00:00Z', '2026-07-01T00:00:00Z', 'active');
  const rows = await current(PARIS);
  eq(Number(rows[0].season_number), 0, 'aucune saison antérieure → numéro 0');
});

// ─── 2. Le STATUT seul décide ────────────────────────────────────────────────
await t('une saison upcoming ou closed n’est jamais renvoyée', async () => {
  await db.exec('truncate public.seasons;');
  await insertSeason(PARIS, '2026-08-01T00:00:00Z', '2026-10-01T00:00:00Z', 'upcoming');
  await insertSeason(PARIS, '2026-01-01T00:00:00Z', '2026-03-01T00:00:00Z', 'closed');
  eq((await current(PARIS)).length, 0, 'aucune ligne : rien n’est « active »');
});

// ─── 3. Aucune saison active → zéro ligne (jamais une date inventée) ─────────
await t('ville sans saison active → zéro ligne', async () => {
  await db.exec('truncate public.seasons;');
  await insertSeason(LILLE, '2026-05-01T00:00:00Z', '2026-07-01T00:00:00Z', 'active');
  eq((await current(PARIS)).length, 0, 'Paris n’a rien d’actif');
});

// ─── 4. p_city_id par défaut = ville du joueur via auth.uid() ────────────────
await t('sans p_city_id, résout la ville du joueur courant (auth.uid())', async () => {
  await db.exec('truncate public.seasons;');
  await insertSeason(PARIS, '2026-05-01T00:00:00Z', '2026-07-01T00:00:00Z', 'active');

  await setUid(UID_PARIS);
  const mine = (await db.query('select * from public.season_current(null)')).rows;
  eq(mine.length, 1, 'le joueur parisien voit la saison de Paris');
  eq(mine[0].city_id, PARIS, 'ville résolue via users.city_id');

  // Joueur sans ville : rien à résoudre → aucune saison.
  await setUid(UID_NOCITY);
  eq((await db.query('select * from public.season_current(null)')).rows.length, 0, 'pas de ville → rien');
  await setUid('');
});

// ─── 5. GRANTS : authenticated oui, anon/public non ──────────────────────────
await t('authenticated a EXECUTE, anon et public ne l’ont PAS', async () => {
  const priv = async (role) =>
    (
      await db.query(
        `select has_function_privilege($1, 'public.season_current(text)', 'execute') as ok`,
        [role],
      )
    ).rows[0].ok;
  eq(await priv('authenticated'), true, 'authenticated doit pouvoir exécuter');
  eq(await priv('anon'), false, 'anon ne doit PAS pouvoir exécuter (décompte réservé aux connectés)');
  eq(await priv('public'), false, 'public ne doit PAS pouvoir exécuter');
});

// ─── Verdict ─────────────────────────────────────────────────────────────────
await db.close();
console.log(`\n${passed} test(s) OK, ${failures.length} échec(s).`);
console.log(
  'RAPPEL : la RLS de `seasons` (lecture authenticated-only) n’est PAS couverte ' +
    'ici — PGlite tourne en superutilisateur. Seul le périmètre d’EXECUTE l’est.',
);
process.exit(failures.length === 0 ? 0 : 1);
