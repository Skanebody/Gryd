#!/usr/bin/env node
/**
 * GRYD — test EXÉCUTABLE de la migration 0069 (`specialty_leaderboard`) sur PGlite.
 *
 * POURQUOI : la vue expose des compteurs de user_stats (RLS owner-only) EN LECTURE
 * cross-user, par ville — comme player_leaderboard pour les points. On prouve ici
 * ce que seule l'exécution révèle : la JOINTURE user_stats⋈users est correcte, les
 * comptes en SUPPRESSION sont exclus, les colonnes exposées sont les bonnes, et le
 * tri par une spécialité classe bien plusieurs joueurs de la MÊME ville.
 *
 * CE QUE CE TEST NE PROUVE PAS : l'EFFET de la RLS (PGlite tourne en superutilisateur).
 * On prouve que la lecture est grantée aux authenticated et révoquée à anon/public
 * (has_table_privilege), pas le contournement definer en prod.
 *
 * LANCER : GRYD_PGLITE=/tmp/pglite/node_modules/@electric-sql/pglite/dist/index.js \
 *   node supabase/tests/specialty_leaderboard.pglite.test.mjs
 * Sans PGlite : sortie CODE 2 (un test non exécuté n'est jamais vert).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS = join(HERE, '..', 'migrations');

let PGlite;
try {
  ({ PGlite } = await import(process.env.GRYD_PGLITE || '@electric-sql/pglite'));
} catch (err) {
  console.error(
    'NON EXÉCUTÉ — PGlite introuvable. Ce test n’a rien vérifié (sortie 2, jamais 0).\n' +
      `  cause : ${err.message}`,
  );
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
const eq = (actual, expected, what) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${what} : attendu ${e}, obtenu ${a}`);
};
const ok = (cond, what) => {
  if (!cond) throw new Error(what);
};

const db = new PGlite();

// Rôles Supabase (PGlite ne les a pas) — nécessaires aux grant/revoke de 0069.
await db.exec(`create role anon; create role authenticated; create role service_role;`);

// Schéma prérequis MINIMAL (colonnes que la vue lit), à la place des migrations
// 0002/0007/0046 : la vue ne dépend que de ces colonnes.
await db.exec(`
  create table public.users (
    id uuid primary key,
    pseudo text,
    city_id text,
    deletion_requested_at timestamptz
  );
  create table public.user_stats (
    user_id uuid primary key references public.users (id) on delete cascade,
    hexes_captured integer not null default 0,
    steals integer not null default 0,
    defends integer not null default 0,
    pioneer_hexes integer not null default 0
  );
`);

// Le VRAI SQL de la migration.
await db.exec(readFileSync(join(MIGRATIONS, '0069_specialty_leaderboard.sql'), 'utf8'));

const A = '11111111-1111-1111-1111-111111111111';
const B = '22222222-2222-2222-2222-222222222222';
const C = '33333333-3333-3333-3333-333333333333';
const D = '44444444-4444-4444-4444-444444444444';
await db.exec(`
  insert into public.users (id, pseudo, city_id, deletion_requested_at) values
    ('${A}', 'Alpha', 'paris', null),
    ('${B}', 'Bravo', 'paris', null),
    ('${C}', 'Charlie', 'paris', now()),   -- compte en SUPPRESSION → exclu
    ('${D}', 'Delta', 'lille', null);
  insert into public.user_stats (user_id, hexes_captured, steals, defends, pioneer_hexes) values
    ('${A}', 10, 3, 5, 1),
    ('${B}', 20, 1, 2, 0),
    ('${C}', 999, 9, 9, 9),
    ('${D}', 7, 0, 0, 4);
`);

console.log('specialty_leaderboard — migration 0069 sur PGlite\n');

await t('un compte en suppression est EXCLU (jamais dans un classement)', async () => {
  const r = await db.query('select count(*)::int as n from public.specialty_leaderboard');
  eq(r.rows[0].n, 3, 'lignes visibles (A,B,D ; C exclu)');
  const c = await db.query(`select 1 from public.specialty_leaderboard where user_id = '${C}'`);
  eq(c.rows.length, 0, 'Charlie (suppression) absent');
});

await t('Conquérant : tri par hexes_captured, borné à MA ville', async () => {
  const r = await db.query(
    `select pseudo, hexes_captured from public.specialty_leaderboard
     where city_id = 'paris' order by hexes_captured desc`,
  );
  eq(r.rows.map((x) => x.pseudo), ['Bravo', 'Alpha'], 'ordre Conquérant Paris');
  eq(r.rows.map((x) => x.hexes_captured), [20, 10], 'valeurs Conquérant');
});

await t('chaque spécialité lit sa vraie colonne (Défenseur/Voleur/Pionnier)', async () => {
  const r = await db.query(
    `select pseudo, steals, defends, pioneer_hexes from public.specialty_leaderboard
     where pseudo = 'Alpha'`,
  );
  eq([r.rows[0].steals, r.rows[0].defends, r.rows[0].pioneer_hexes], [3, 5, 1], 'compteurs Alpha');
});

await t('lecture grantée aux authenticated, révoquée à anon/public', async () => {
  const a = await db.query(
    `select has_table_privilege('authenticated', 'public.specialty_leaderboard', 'SELECT') as ok`,
  );
  ok(a.rows[0].ok === true, 'authenticated peut SELECT');
  const an = await db.query(
    `select has_table_privilege('anon', 'public.specialty_leaderboard', 'SELECT') as ok`,
  );
  ok(an.rows[0].ok === false, 'anon ne peut PAS SELECT');
});

console.log(`\n${passed} ok, ${failures.length} FAIL`);
process.exit(failures.length === 0 ? 0 : 1);
