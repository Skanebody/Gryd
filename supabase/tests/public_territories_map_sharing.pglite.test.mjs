#!/usr/bin/env node
/**
 * GRYD — test EXÉCUTABLE de la migration 0087 (`public_territories` respecte
 * `user_profiles.map_sharing` — constitution §7, spec §12.1, E56).
 *
 * ═══ POURQUOI CE FICHIER EXISTE ═════════════════════════════════════════════
 * 0087 déplace une protection de vie privée du CLIENT vers le SERVEUR. Tant
 * qu'elle n'est pas exécutée, « le réglage du joueur est désormais opposable à
 * tout lecteur » n'est qu'une phrase — et c'est précisément le genre de phrase
 * qui a été écrite une fois de trop dans ce dépôt (cf. l'aveu de
 * `features/social/rivalZones.ts` : le filtre était CLIENT, donc décoratif).
 *
 * Docker est indisponible ; PGlite exécute le VRAI SQL des migrations dans
 * Node. Même harnais que `public_territories.pglite.test.mjs` (0077).
 *
 * ═══ CE QUE CE TEST PROUVE ══════════════════════════════════════════════════
 *  1. La migration S'APPLIQUE sur un Postgres réel, telle quelle.
 *  2. Un territoire dont le propriétaire a `map_sharing = 'none'` est ABSENT
 *     de la vue — alors qu'il est présent dans `territories`, publié et doté
 *     d'une géométrie généralisée (donc écarté par le SEUL nouveau critère).
 *  3. Le même territoire redevient visible dès que le réglage change : c'est
 *     bien le RÉGLAGE qui décide, pas un effet de bord de la migration.
 *  4. Les trois autres valeurs du domaine (`precise`, `simplified`,
 *     `territory_only`) laissent passer — la vue n'expose que la géométrie
 *     généralisée, elles y sont satisfaites à l'identique.
 *  5. Un propriétaire SANS ligne de profil est masqué (repli prudent annoncé).
 *  6. Un territoire de CREW n'est pas gouverné par le réglage d'un individu.
 *  7. Les filtres de 0077 (publication différée, géométrie généralisée
 *     obligatoire) sont TOUJOURS là après le `create or replace` — une
 *     réécriture de vue qui perdrait le `where` d'origine serait une fuite.
 *  8. La vue garde `security_invoker` ET `security_barrier`.
 *  9. La fonction est bien `security definer`, `stable`, à `search_path` figé.
 * 10. Ses privilèges sont ceux annoncés : `authenticated` exécute, `anon` non.
 * 11. Les privilèges de la VUE survivent au `create or replace` : `select` pour
 *     `authenticated`, rien pour `anon`.
 *
 * ═══ CE QUE CE TEST NE PROUVE PAS ═══════════════════════════════════════════
 *  · L'EFFET de la RLS ni de `security_invoker` : PGlite tourne en
 *    SUPERUTILISATEUR, où les policies ne s'appliquent pas. Ce qui est prouvé
 *    ici est role-INDÉPENDANT (un `where` de vue filtre pour tout le monde,
 *    superutilisateur compris) — c'est justement ce qui fait la valeur du
 *    déplacement client → serveur.
 *  · Que `hex_claims` cesse de fuir : elle reste `using (true)`, 0087 le dit.
 *
 * ═══ LANCER ════════════════════════════════════════════════════════════════
 *   mkdir -p /tmp/pglite && cd /tmp/pglite
 *   echo '{"name":"pglite-scratch","private":true}' > package.json
 *   npm i --ignore-scripts @electric-sql/pglite
 *   cd <repo> && GRYD_PGLITE=/tmp/pglite/node_modules/@electric-sql/pglite/dist/index.js \
 *     node supabase/tests/public_territories_map_sharing.pglite.test.mjs
 * Sans PGlite : sortie CODE 2 — un test non exécuté n'est JAMAIS vert.
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
      `  cause : ${err.message}`,
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

const db = new PGlite();

// ─── Le socle Supabase qu'un Postgres nu n'a pas ────────────────────────────
await db.exec(`
  set time zone 'UTC';
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

// ─── Le monde d'AVANT ───────────────────────────────────────────────────────
// 0010 pour `crews`/`crew_members` (0011 les référence), 0011 pour
// `user_profiles` (le réglage lui-même), 0074/0075 pour `territories`, 0077
// pour la vue que 0087 remplace.
for (const file of [
  '0002_schema.sql',
  '0003_rls.sql',
  '0010_crews_supercell.sql',
  '0011_social.sql',
  '0074_territories_polygon.sql',
  '0075_territories_source_run_unique.sql',
  '0077_public_territories_view.sql',
]) {
  await db.exec(readFileSync(join(MIGRATIONS, file), 'utf8'));
}

console.log('public_territories × map_sharing — migration 0087 sur PGlite\n');

// ═══ 1. LA MIGRATION S'APPLIQUE ═════════════════════════════════════════════
let migrationError = null;
try {
  await db.exec(
    readFileSync(join(MIGRATIONS, '0087_public_territories_respects_map_sharing.sql'), 'utf8'),
  );
} catch (err) {
  migrationError = err;
}

await t('la migration 0087 s’applique sur un Postgres réel, telle quelle', () => {
  if (migrationError) throw new Error(migrationError.message);
});

if (migrationError) {
  console.log('\nMigration non appliquée : la suite n’a aucun sens, on s’arrête ici.');
  process.exit(1);
}

// ─── Acteurs ────────────────────────────────────────────────────────────────
// SHARER partage sa carte, REFUSER l'a refusée, NOPROFILE n'a pas de profil du
// tout. Trois territoires strictement identiques : la SEULE différence entre
// eux est le réglage de leur propriétaire.
const SHARER = '11111111-1111-1111-1111-111111111111';
const REFUSER = '22222222-2222-2222-2222-222222222222';
const NOPROFILE = '33333333-3333-3333-3333-333333333333';
const CITY = 'paris';

await db.exec(`
  insert into auth.users (id) values ('${SHARER}'), ('${REFUSER}'), ('${NOPROFILE}');
  insert into public.city_zones (city_id, name, geojson, status)
    values ('${CITY}', 'Paris', '{}'::jsonb, 'active');
  insert into public.users (id, pseudo, city_id) values
    ('${SHARER}', 'partage', '${CITY}'),
    ('${REFUSER}', 'refuse', '${CITY}'),
    ('${NOPROFILE}', 'sansprofil', '${CITY}');
  insert into public.user_profiles (user_id, handle, map_sharing) values
    ('${SHARER}', 'partage', 'simplified'),
    ('${REFUSER}', 'refuse', 'none');
`);

const GEOM = JSON.stringify({
  type: 'Polygon',
  coordinates: [[[2.35, 48.85], [2.352, 48.85], [2.352, 48.851], [2.35, 48.851], [2.35, 48.85]]],
});

/** Un territoire publié, doté d'une géométrie généralisée — donc visible SAUF si le réglage l'exclut. */
const insertTerritory = async (ownerType, ownerId) => {
  const run = (
    await db.query(
      `insert into public.runs (user_id, client_run_id, source, started_at,
                                distance_m, duration_s, status)
       values ($1, gen_random_uuid(), 'gps', now(), 5000, 1800, 'valid')
       returning id`,
      [ownerType === 'user' ? ownerId : SHARER],
    )
  ).rows[0].id;
  return (
    await db.query(
      `insert into public.territories
         (activity, owner_type, owner_id, city_id, state, source_run_id,
          geometry, geometry_generalized, area_m2, controlled_since, publish_after,
          algorithm_version)
       values ('run', $1, $2, $3, $6, $4,
               $5::jsonb, $5::jsonb, 12345, now() - interval '2 hours', now() - interval '1 hour',
               'test')
       returning id`,
      [ownerType, ownerId, CITY, run, GEOM, ownerType === 'user' ? 'owned_personal' : 'owned_crew'],
    )
  ).rows[0].id;
};

const idSharer = await insertTerritory('user', SHARER);
const idRefuser = await insertTerritory('user', REFUSER);
const idNoProfile = await insertTerritory('user', NOPROFILE);

const inView = async (id) =>
  (await db.query('select 1 from public.public_territories where id = $1', [id])).rows.length;
const inTable = async (id) =>
  (await db.query('select 1 from public.territories where id = $1', [id])).rows.length;

// ═══ 2. LE REFUS EST OPPOSABLE ══════════════════════════════════════════════
await t('un territoire dont le propriétaire refuse le partage est ABSENT de la vue', async () => {
  eq(await inTable(idRefuser), 1, 'la ligne existe bien dans territories');
  eq(await inView(idRefuser), 0, 'elle ne doit pas sortir par la vue publique');
});

await t('le partage explicite laisse passer (le témoin de contrôle)', async () => {
  eq(await inView(idSharer), 1, 'un territoire identique, propriétaire partageur');
});

// ═══ 3. C'EST LE RÉGLAGE QUI DÉCIDE, ET RIEN D'AUTRE ════════════════════════
await t('changer le réglage change la visibilité, dans les deux sens', async () => {
  await db.query(`update public.user_profiles set map_sharing = 'precise' where user_id = $1`, [
    REFUSER,
  ]);
  eq(await inView(idRefuser), 1, 'après acceptation, le territoire réapparaît');
  await db.query(`update public.user_profiles set map_sharing = 'none' where user_id = $1`, [
    REFUSER,
  ]);
  eq(await inView(idRefuser), 0, 'après refus, il disparaît de nouveau');
});

await t('les trois valeurs non-refus laissent toutes passer', async () => {
  for (const value of ['precise', 'simplified', 'territory_only']) {
    await db.query('update public.user_profiles set map_sharing = $2 where user_id = $1', [
      SHARER,
      value,
    ]);
    eq(await inView(idSharer), 1, `map_sharing = ${value}`);
  }
  await db.query(`update public.user_profiles set map_sharing = 'simplified' where user_id = $1`, [
    SHARER,
  ]);
});

// ═══ 4. LE REPLI PRUDENT, ET LA LIMITE DU PRÉDICAT ══════════════════════════
await t('sans ligne de profil, le territoire est masqué (repli prudent annoncé)', async () => {
  eq(await inView(idNoProfile), 0, 'aucun réglage lu ⇒ aucun rendu public');
});

await t('un territoire de CREW n’est pas gouverné par le réglage d’un individu', async () => {
  // `owner_id` d'un crew ne désigne pas un profil : le prédicat doit répondre
  // « oui » sans aller chercher un réglage qui n'existe pas pour lui.
  const crewId = (
    await db.query(
      `insert into public.crews (name, tag, code, city_id, color)
       values ('Night', 'NGT', 'NGT001', $1, 0) returning id`,
      [CITY],
    )
  ).rows[0].id;
  const idCrew = await insertTerritory('crew', crewId);
  eq(await inView(idCrew), 1, 'le territoire de crew reste public');
});

// ═══ 5. LES FILTRES DE 0077 SURVIVENT AU `create or replace` ════════════════
await t('la publication différée filtre TOUJOURS après 0087', async () => {
  const run = (
    await db.query(
      `insert into public.runs (user_id, client_run_id, source, started_at,
                                distance_m, duration_s, status)
       values ($1, gen_random_uuid(), 'gps', now(), 5000, 1800, 'valid')
       returning id`,
      [SHARER],
    )
  ).rows[0].id;
  const id = (
    await db.query(
      `insert into public.territories
         (activity, owner_type, owner_id, city_id, state, source_run_id,
          geometry, geometry_generalized, area_m2, controlled_since, publish_after,
          algorithm_version)
       values ('run', 'user', $1, $2, 'owned_personal', $3,
               $4::jsonb, $4::jsonb, 999, now(), now() + interval '1 hour', 'test')
       returning id`,
      [SHARER, CITY, run, GEOM],
    )
  ).rows[0].id;
  eq(await inView(id), 0, 'non échu ⇒ absent, exactement comme avant');
});

await t('une ligne sans géométrie généralisée reste ABSENTE (aucun repli sur l’exacte)', async () => {
  const run = (
    await db.query(
      `insert into public.runs (user_id, client_run_id, source, started_at,
                                distance_m, duration_s, status)
       values ($1, gen_random_uuid(), 'gps', now(), 5000, 1800, 'valid')
       returning id`,
      [SHARER],
    )
  ).rows[0].id;
  const id = (
    await db.query(
      `insert into public.territories
         (activity, owner_type, owner_id, city_id, state, source_run_id,
          geometry, area_m2, controlled_since, publish_after, algorithm_version)
       values ('run', 'user', $1, $2, 'owned_personal', $3,
               $4::jsonb, 999, now(), now() - interval '1 hour', 'test')
       returning id`,
      [SHARER, CITY, run, GEOM],
    )
  ).rows[0].id;
  eq(await inView(id), 0, 'pas de contour généralisé ⇒ rien');
});

await t('la vue n’expose toujours PAS la géométrie exacte', async () => {
  const cols = (
    await db.query(
      `select column_name from information_schema.columns
       where table_schema = 'public' and table_name = 'public_territories'`,
    )
  ).rows.map((r) => r.column_name);
  ok(!cols.includes('geometry'), 'geometry ne doit pas être une colonne de la vue');
  ok(!cols.includes('source_run_id'), 'source_run_id non plus');
  ok(cols.includes('geometry_generalized'), 'la généralisée, elle, doit être là');
});

// ═══ 6. LES OPTIONS ET LES PRIVILÈGES ═══════════════════════════════════════
await t('la vue garde security_invoker ET security_barrier', async () => {
  const opts =
    (
      await db.query(
        `select c.reloptions from pg_class c
         join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public' and c.relname = 'public_territories'`,
      )
    ).rows[0].reloptions ?? [];
  const flat = opts.map((o) => String(o).replace(/\s/g, ''));
  ok(flat.includes('security_invoker=true'), `security_invoker manquant (${flat.join(',')})`);
  ok(flat.includes('security_barrier=true'), `security_barrier manquant (${flat.join(',')})`);
});

await t('le prédicat est security definer, stable, à search_path figé', async () => {
  const row = (
    await db.query(
      `select p.prosecdef, p.provolatile, p.proconfig
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname = 'territory_owner_shares_map'`,
    )
  ).rows[0];
  ok(row.prosecdef === true, 'la fonction doit être SECURITY DEFINER');
  eq(row.provolatile, 's', 'volatilité (s = stable)');
  ok(
    (row.proconfig ?? []).some((c) => String(c).startsWith('search_path=')),
    'search_path doit être figé sur une fonction security definer',
  );
});

await t('privilèges du prédicat : authenticated exécute, anon non', async () => {
  const row = (
    await db.query(
      `select has_function_privilege('authenticated',
                'public.territory_owner_shares_map(text, uuid)', 'execute') as auth_ok,
              has_function_privilege('anon',
                'public.territory_owner_shares_map(text, uuid)', 'execute') as anon_ok`,
    )
  ).rows[0];
  ok(row.auth_ok === true, 'authenticated doit pouvoir exécuter (la vue est security_invoker)');
  ok(row.anon_ok === false, 'anon ne doit PAS pouvoir exécuter');
});

await t('privilèges de la vue : inchangés par le create or replace', async () => {
  const row = (
    await db.query(
      `select has_table_privilege('authenticated', 'public.public_territories', 'select') as auth_sel,
              has_table_privilege('anon', 'public.public_territories', 'select') as anon_sel`,
    )
  ).rows[0];
  ok(row.auth_sel === true, 'authenticated doit toujours lire la vue');
  ok(row.anon_sel === false, 'anon ne doit toujours pas la lire');
});

// ─── Verdict ────────────────────────────────────────────────────────────────
console.log(`\n${passed} ok, ${failures.length} échec(s)`);
if (failures.length > 0) process.exit(1);
