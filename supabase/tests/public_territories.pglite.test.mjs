#!/usr/bin/env node
/**
 * GRYD — test EXÉCUTABLE de la migration 0077 (`public_territories` : la surface
 * PUBLIQUE d'un territoire — spec §12.1, §12.3, §1.5).
 *
 * ═══ POURQUOI CE FICHIER EXISTE ═════════════════════════════════════════════
 * 0077 ne contient AUCUN TypeScript : c'est une vue, un `where`, un `date_trunc`
 * et quatre lignes de privilèges. Les ~2300 tests Deno du dépôt n'en touchent
 * pas une ligne. Or ce que cette vue promet est une promesse de VIE PRIVÉE :
 * « le tracé exact n'en sort pas », « rien n'en sort avant l'échéance », « aucune
 * heure précise ». Non exécutée, chacune de ces phrases est une intention.
 *
 * Docker est indisponible sur cette machine (donc pas de `npx supabase start`).
 * PGlite — Postgres compilé en WASM — exécute le VRAI SQL des migrations dans
 * Node, sans démon. Même harnais que `territories.pglite.test.mjs` (0074).
 *
 * ═══ CE QUE CE TEST PROUVE ══════════════════════════════════════════════════
 *  1. La migration S'APPLIQUE sur un Postgres réel, telle quelle.
 *  2. La vue EXISTE, et elle est bien une vue (pas une table matérialisée qui
 *     figerait des données de joueurs).
 *  3. Elle N'EXPOSE PAS `geometry` (le tracé exact), `source_run_id`,
 *     `publish_after`, `created_at`, `updated_at` ni `algorithm_version` — et
 *     « pas exposé » est vérifié par l'ÉCHEC d'un `select` nommant la colonne,
 *     pas seulement par une liste.
 *  4. La géométrie rendue est bien la GÉNÉRALISÉE, et elle DIFFÈRE de l'exacte.
 *  5. Le filtre `publish_after <= now()` AGIT : sur deux territoires identiques
 *     dont un seul est échu, la vue n'en rend qu'un.
 *  6. Une ligne sans géométrie généralisée est ABSENTE — aucun repli sur le
 *     contour exact (ce serait la fuite que la migration existe pour empêcher).
 *  7. `controlled_since` est TRONQUÉ à l'heure : minutes, secondes et
 *     microsecondes ne sortent pas (§12.1).
 *  8. Les privilèges sont ceux annoncés : `authenticated` LIT et rien d'autre,
 *     `anon` ne lit pas. Le harnais reproduit d'abord les DEFAULT PRIVILEGES de
 *     Supabase, sans quoi l'assertion serait vraie par accident.
 *  9. `security_invoker` ET `security_barrier` sont réellement posés sur la vue
 *     (une vue servie à des clients ne doit jamais valoir plus que son lecteur).
 * 10. LA PHRASE DE SUSPENS EST VRAIE : `hex_claims_select_all` est TOUJOURS
 *     `using (true)` après 0077. La migration dit qu'elle ne verrouille pas
 *     `hex_claims` — ce test le prouve, au lieu de laisser croire l'inverse.
 *
 * ═══ CE QUE CE TEST NE PROUVE PAS ═══════════════════════════════════════════
 *  · L'EFFET de la RLS ni de `security_invoker`. PGlite tourne en
 *    SUPERUTILISATEUR : les policies ne s'y appliquent pas et `auth.uid()` y est
 *    un bouchon. On prouve que les options sont POSÉES et que les privilèges
 *    sont ceux annoncés — PAS qu'un rival est réellement aveugle. Cela ne pourra
 *    l'être que sur un vrai Supabase. (Le filtre `publish_after`, lui, EST
 *    prouvé : c'est un `where` de vue, il s'applique à tout rôle, superutilisateur
 *    compris.)
 *  · QUE `geometry_generalized` SOIT VRAIMENT PLUS GROSSIÈRE que `geometry`. La
 *    base stocke ce qu'on lui donne ; ici le test FOURNIT deux géométries
 *    différentes. Que le producteur (moteur `simplifyRing`) généralise
 *    réellement appartient à ses propres tests.
 *  · LE FUSEAU. `date_trunc('hour', timestamptz)` tronque dans le fuseau de la
 *    session ; le test force UTC, comme un Supabase par défaut.
 *
 * ═══ LANCER ════════════════════════════════════════════════════════════════
 *   mkdir -p /tmp/pglite && cd /tmp/pglite
 *   echo '{"name":"pglite-scratch","private":true}' > package.json
 *   npm i --ignore-scripts @electric-sql/pglite
 *   cd <repo> && GRYD_PGLITE=/tmp/pglite/node_modules/@electric-sql/pglite/dist/index.js \
 *     node supabase/tests/public_territories.pglite.test.mjs
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
      `  cause : ${err.message}\n\n` +
      '  mkdir -p /tmp/pglite && cd /tmp/pglite\n' +
      '  echo \'{"name":"pglite-scratch","private":true}\' > package.json\n' +
      '  npm i --ignore-scripts @electric-sql/pglite\n' +
      '  cd <repo> && GRYD_PGLITE=/tmp/pglite/node_modules/@electric-sql/pglite/dist/index.js \\\n' +
      '    node supabase/tests/public_territories.pglite.test.mjs',
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
/** Une requête doit ÉCHOUER, et pour la raison qu'on vise. */
const rejects = async (sql, needle, what) => {
  try {
    await db.query(sql);
  } catch (err) {
    if (!String(err.message).includes(needle)) {
      throw new Error(`${what} : refusé, mais pour une autre raison — « ${err.message} »`);
    }
    return;
  }
  throw new Error(`${what} : ACCEPTÉ alors qu'il devait être refusé`);
};

const db = new PGlite();

// ─── Le socle Supabase qu'un Postgres nu n'a pas ────────────────────────────
// `alter default privileges` est LE point qui sépare une preuve d'une preuve
// vide : sur un vrai Supabase, `anon`/`authenticated` reçoivent tous les
// privilèges sur chaque table ET chaque vue nouvellement créée — c'est
// exactement pourquoi 0077 doit les révoquer. Sans cette ligne, « anon ne lit
// pas » serait vrai même si la migration avait oublié le revoke.
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

// ─── Le monde d'AVANT : 0002 (schéma), 0003 (RLS), 0074/0075 (territories) ──
// 0003 est chargée pour une raison précise : le §3 de 0077 AFFIRME que
// `hex_claims` reste grande ouverte. On charge donc la policy réelle pour
// pouvoir vérifier cette affirmation au lieu de la croire.
await db.exec(readFileSync(join(MIGRATIONS, '0002_schema.sql'), 'utf8'));
await db.exec(readFileSync(join(MIGRATIONS, '0003_rls.sql'), 'utf8'));
await db.exec(readFileSync(join(MIGRATIONS, '0074_territories_polygon.sql'), 'utf8'));
await db.exec(readFileSync(join(MIGRATIONS, '0075_territories_source_run_unique.sql'), 'utf8'));

console.log('public_territories — migration 0077 sur PGlite\n');

// ═══ 1. LA MIGRATION S'APPLIQUE ═════════════════════════════════════════════
let migrationError = null;
try {
  await db.exec(readFileSync(join(MIGRATIONS, '0077_public_territories_view.sql'), 'utf8'));
} catch (err) {
  migrationError = err;
}

await t('la migration 0077 s’applique sur un Postgres réel, telle quelle', () => {
  if (migrationError) throw new Error(migrationError.message);
});

if (migrationError) {
  console.log('\nMigration non appliquée : la suite n’a aucun sens, on s’arrête ici.');
  process.exit(1);
}

// ─── Acteurs et données ─────────────────────────────────────────────────────
const RUNNER = '11111111-1111-1111-1111-111111111111';
const CITY = 'paris';

await db.exec(`
  insert into auth.users (id) values ('${RUNNER}');
  insert into public.city_zones (city_id, name, geojson, status)
    values ('${CITY}', 'Paris', '{}'::jsonb, 'active');
  insert into public.users (id, pseudo, city_id) values ('${RUNNER}', 'coureur', '${CITY}');
`);

const runId = (
  await db.query(
    `insert into public.runs (user_id, client_run_id, source, started_at,
                              distance_m, duration_s, status)
     values ($1, gen_random_uuid(), 'gps', now(), 5000, 1800, 'valid')
     returning id`,
    [RUNNER],
  )
).rows[0].id;

// La géométrie EXACTE porte un point de plus (le « détail » à protéger) ; la
// généralisée est un simple carré. Elles sont DIFFÉRENTES à dessein : c'est ce
// qui permet de prouver laquelle sort de la vue.
const EXACT = JSON.stringify({
  type: 'Polygon',
  coordinates: [[[2.35, 48.85], [2.3512, 48.8503], [2.3521, 48.8509], [2.352, 48.851], [2.35, 48.851], [2.35, 48.85]]],
});
const GENERALIZED = JSON.stringify({
  type: 'Polygon',
  coordinates: [[[2.35, 48.85], [2.352, 48.85], [2.352, 48.851], [2.35, 48.851], [2.35, 48.85]]],
});

/** Insère un territoire ; rend son id. `publishOffset` est un intervalle SQL. */
const newTerritory = async ({
  publishOffset,
  generalized = GENERALIZED,
  controlledSince = null,
  sourceRun = null,
}) => {
  const r = await db.query(
    `insert into public.territories
       (activity, owner_type, owner_id, geometry, geometry_generalized, area_m2,
        city_id, state, defense_level, controlled_since, publish_after,
        algorithm_version, source_run_id)
     values ('run', 'user', $1, $2::jsonb, $3::jsonb, 42000, $4, 'owned_personal', 1,
             $5::timestamptz, now() + ($6)::interval, 'poly-v1', $7)
     returning id`,
    [RUNNER, EXACT, generalized, CITY, controlledSince, publishOffset, sourceRun],
  );
  return r.rows[0].id;
};

// Deux territoires JUMEAUX : seule l'échéance de publication les distingue.
const PUBLISHED = await newTerritory({
  publishOffset: '-1 hour',
  controlledSince: '2026-07-27 07:12:34.567891+00',
  sourceRun: runId,
});
const PENDING = await newTerritory({ publishOffset: '1 hour' });

// ═══ 2. LA VUE EXISTE, ET C'EST UNE VUE ═════════════════════════════════════
await t('la vue public.public_territories existe (relkind = vue, pas table ni matview)', async () => {
  const r = await db.query(`
    select c.relkind::text as kind
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'public_territories'
  `);
  eq(r.rows.length, 1, 'la vue est introuvable');
  eq(r.rows[0].kind, 'v', 'ce n’est pas une vue simple (une matview figerait des données de joueurs)');
});

// ═══ 3. CE QU'ELLE N'EXPOSE PAS ═════════════════════════════════════════════
const viewColumns = async () =>
  (
    await db.query(`
      select column_name from information_schema.columns
      where table_schema = 'public' and table_name = 'public_territories'
      order by ordinal_position
    `)
  ).rows.map((r) => r.column_name);

await t('§12.3 : la vue N’EXPOSE PAS le tracé exact ni la course source', async () => {
  const cols = await viewColumns();
  for (const forbidden of [
    'geometry',
    'source_run_id',
    'publish_after',
    'created_at',
    'updated_at',
    'algorithm_version',
    'controlled_since',
  ]) {
    ok(!cols.includes(forbidden), `la colonne « ${forbidden} » est exposée alors qu’elle ne doit pas l’être`);
  }
});

await t('la liste des colonnes publiques est EXACTEMENT celle prévue (aucun ajout muet)', async () => {
  eq(
    await viewColumns(),
    [
      'id',
      'activity',
      'owner_type',
      'owner_id',
      'city_id',
      'state',
      'defense_level',
      'area_m2',
      'geometry_generalized',
      'controlled_since_hour',
    ],
    'colonnes publiques',
  );
});

await t('nommer `geometry` sur la vue ÉCHOUE — « absent » est vérifié, pas supposé', async () => {
  await rejects(
    'select geometry from public.public_territories',
    'does not exist',
    'select geometry',
  );
});

await t('nommer `source_run_id` sur la vue ÉCHOUE aussi', async () => {
  await rejects(
    'select source_run_id from public.public_territories',
    'does not exist',
    'select source_run_id',
  );
});

// ═══ 4. LA GÉOMÉTRIE RENDUE EST LA GÉNÉRALISÉE ══════════════════════════════
await t('la géométrie rendue est la GÉNÉRALISÉE, et elle diffère de l’exacte', async () => {
  const r = await db.query(
    'select geometry_generalized as g from public.public_territories where id = $1',
    [PUBLISHED],
  );
  eq(r.rows.length, 1, 'le territoire publié devrait être visible');
  eq(r.rows[0].g, JSON.parse(GENERALIZED), 'géométrie rendue');
  ok(
    JSON.stringify(r.rows[0].g) !== EXACT,
    'la vue rend la géométrie EXACTE — c’est exactement la fuite §12.3',
  );
});

// ═══ 5. LE FILTRE DE PUBLICATION DIFFÉRÉE (§1.5) ════════════════════════════
await t('§1.5 : la vue FILTRE sur publish_after — le territoire non échu est ABSENT', async () => {
  const all = await db.query('select id from public.public_territories order by id');
  const ids = all.rows.map((r) => r.id);
  ok(ids.includes(PUBLISHED), 'le territoire échu devrait être publié');
  ok(!ids.includes(PENDING), 'un territoire NON ÉCHU est visible dans la vue publique (§1.5 violé)');
  eq(ids.length, 1, 'la vue ne devrait contenir QUE le territoire échu');
});

await t('les DEUX lignes existent bien dans la table — la vue filtre, elle ne perd rien', async () => {
  const r = await db.query('select count(*)::int as n from public.territories');
  eq(r.rows[0].n, 2, 'nombre de territoires en base');
});

await t('un territoire devient public dès que son échéance passe (le filtre est temporel, pas figé)', async () => {
  await db.query(
    `update public.territories set publish_after = now() - interval '1 second' where id = $1`,
    [PENDING],
  );
  const r = await db.query('select id from public.public_territories where id = $1', [PENDING]);
  eq(r.rows.length, 1, 'échéance passée : le territoire devrait apparaître');
  // On le remet en attente pour ne pas polluer les tests suivants.
  await db.query(
    `update public.territories set publish_after = now() + interval '1 hour' where id = $1`,
    [PENDING],
  );
});

// ═══ 6. PAS DE FORME DÉRIVÉE ⇒ ABSENT (aucun repli sur l'exacte) ════════════
await t('sans géométrie généralisée, la ligne est ABSENTE — jamais un repli sur l’exacte', async () => {
  const naked = await newTerritory({ publishOffset: '-1 hour', generalized: null });
  const r = await db.query('select id from public.public_territories where id = $1', [naked]);
  eq(r.rows.length, 0, 'une ligne sans contour dérivé est publiée — repli interdit');
  await db.query('delete from public.territories where id = $1', [naked]);
});

// ═══ 7. LES TIMESTAMPS SONT TRONQUÉS (§12.1) ════════════════════════════════
await t('§12.1 : controlled_since est TRONQUÉ à l’heure (ni minute, ni seconde, ni µs)', async () => {
  const r = await db.query(
    'select controlled_since_hour as h from public.public_territories where id = $1',
    [PUBLISHED],
  );
  const h = new Date(r.rows[0].h);
  eq(h.toISOString(), '2026-07-27T07:00:00.000Z', 'horodatage public');
  // Et la table, elle, garde bien la précision : on tronque à la LECTURE
  // publique, on ne détruit pas la donnée du propriétaire.
  const raw = await db.query('select controlled_since as c from public.territories where id = $1', [
    PUBLISHED,
  ]);
  ok(
    new Date(raw.rows[0].c).getUTCMinutes() === 12,
    'la table devrait conserver la minute exacte (la troncature est un RENDU)',
  );
});

await t('controlled_since NULL reste NULL — aucune date inventée pour un territoire sans contrôle', async () => {
  const unowned = await db.query(
    `insert into public.territories
       (activity, geometry, geometry_generalized, area_m2, city_id, state,
        publish_after, algorithm_version)
     values ('run', $1::jsonb, $2::jsonb, 42000, $3, 'unowned', now() - interval '1 hour', 'poly-v1')
     returning id`,
    [EXACT, GENERALIZED, CITY],
  );
  const id = unowned.rows[0].id;
  const r = await db.query(
    'select controlled_since_hour as h from public.public_territories where id = $1',
    [id],
  );
  eq(r.rows.length, 1, 'un territoire unowned publié doit être visible');
  eq(r.rows[0].h, null, 'controlled_since_hour');
  await db.query('delete from public.territories where id = $1', [id]);
});

// ═══ 8. LES PRIVILÈGES ══════════════════════════════════════════════════════
await t('`authenticated` LIT la vue', async () => {
  const r = await db.query(
    `select has_table_privilege('authenticated', 'public.public_territories', 'select') as p`,
  );
  eq(r.rows[0].p, true, 'authenticated devrait pouvoir lire');
});

await t('`authenticated` n’ÉCRIT pas la vue (insert/update/delete révoqués)', async () => {
  for (const priv of ['insert', 'update', 'delete']) {
    const r = await db.query(
      `select has_table_privilege('authenticated', 'public.public_territories', $1) as p`,
      [priv],
    );
    eq(r.rows[0].p, false, `authenticated ne devrait pas avoir ${priv}`);
  }
});

await t('`anon` ne lit RIEN — un visiteur non connecté ne voit aucun territoire', async () => {
  const r = await db.query(
    `select has_table_privilege('anon', 'public.public_territories', 'select') as p`,
  );
  eq(r.rows[0].p, false, 'anon ne devrait pas pouvoir lire la vue publique');
});

// ═══ 9. LES OPTIONS DE SÉCURITÉ DE LA VUE ═══════════════════════════════════
await t('la vue est `security_invoker` ET `security_barrier`', async () => {
  const r = await db.query(`
    select coalesce(array_to_string(c.reloptions, ','), '') as opts
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'public_territories'
  `);
  const opts = r.rows[0].opts;
  ok(
    /security_invoker\s*=\s*(true|on)/i.test(opts),
    `security_invoker absent — la vue vaudrait plus que son lecteur (reloptions: « ${opts} »)`,
  );
  ok(
    /security_barrier\s*=\s*(true|on)/i.test(opts),
    `security_barrier absent — une fonction de l’appelant pourrait voir les lignes non publiées (reloptions: « ${opts} »)`,
  );
});

// ═══ 10. LA PHRASE DE SUSPENS EST VRAIE ═════════════════════════════════════
await t('0077 ne touche PAS hex_claims — `hex_claims_select_all` est toujours `using (true)`', async () => {
  const r = await db.query(`
    select pg_get_expr(p.polqual, p.polrelid) as qual
    from pg_policy p join pg_class c on c.oid = p.polrelid
    where c.relname = 'hex_claims' and p.polname = 'hex_claims_select_all'
  `);
  eq(r.rows.length, 1, 'la policy hex_claims_select_all devrait exister');
  eq(r.rows[0].qual, 'true', 'expression de la policy hex_claims');
  // Ce test n'est pas un satisfecit : c'est la PREUVE que le §3 de 0077 dit vrai
  // quand il écrit « hex_claims reste intégralement lisible ». Le verrouillage
  // est l'étape SUIVANTE, après la bascule des lectures client.
});

// ─── Verdict ────────────────────────────────────────────────────────────────
console.log(`\n${passed} ok, ${failures.length} échec(s)`);
process.exit(failures.length === 0 ? 0 : 1);
