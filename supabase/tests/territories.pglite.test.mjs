#!/usr/bin/env node
/**
 * GRYD — test EXÉCUTABLE de la migration 0074 (`territories` : le territoire
 * devient un POLYGONE, spec §1.4/§19.2). LOT 1, ÉTAPE 1 sur 4.
 *
 * ═══ POURQUOI CE FICHIER EXISTE ═════════════════════════════════════════════
 * 0074 ne contient AUCUN TypeScript : elle est faite de CHECK, d'index, d'une
 * policy RLS et d'un déclencheur. Les ~997 tests Deno du dépôt ne touchent pas
 * une ligne de DDL — sans ce fichier, chacune de ces garanties serait une
 * INTENTION, pas un mécanisme. Et parmi elles il y en a une qu'on n'a pas le
 * droit de supposer : la publication différée de §1.5, qui est le point de vie
 * privée le plus sérieux du backend (AUDIT R3).
 *
 * Docker est indisponible sur cette machine (donc pas de `npx supabase start`).
 * PGlite — Postgres compilé en WASM — exécute le VRAI SQL de la migration dans
 * Node, sans démon. Même harnais que `fr_communes.pglite.test.mjs` (0068) et
 * `activity_dimension.pglite.test.mjs` (0070).
 *
 * ═══ CE QUE CE TEST PROUVE ══════════════════════════════════════════════════
 *  1. La migration S'APPLIQUE sur un Postgres réel, telle quelle, sans retouche.
 *  2. Un insert NOMINAL passe, et la géométrie GeoJSON relue est INTACTE —
 *     anneau extérieur ET trou, aux décimales près (une perte de précision sur
 *     une coordonnée serait un territoire faux).
 *  3. Les CHECK REFUSENT : un `state` inconnu, `defense_level = 4` (et -1), un
 *     `owner_type` inconnu, une discipline inconnue, un GeoJSON qui n'est pas un
 *     Polygon (Point, ou scalaire JSON), une aire nulle ou négative, un
 *     `algorithm_version` vide.
 *  4. La COHÉRENCE propriétaire/état tient dans les deux sens : `unowned` avec
 *     un propriétaire est refusé, un état possédé sans propriétaire aussi, et
 *     `owned_crew` avec `owner_type = 'user'` également.
 *  5. `publish_after` est OBLIGATOIRE et SANS DÉFAUT : un insert qui l'omet
 *     échoue. Aucun délai de jeu n'est enterré dans le schéma (game-rules est la
 *     source unique).
 *  6. La RLS est ACTIVÉE, une policy de lecture EXISTE, et son expression porte
 *     bien `publish_after` — « une policy existe » ne prouverait rien sur ce
 *     qu'elle filtre.
 *  7. Les privilèges d'écriture client sont RÉVOQUÉS, et `anon` ne peut même pas
 *     lire. Le harnais reproduit d'abord les DEFAULT PRIVILEGES de Supabase
 *     (`grant all on tables to anon, authenticated`) pour que le `revoke` de la
 *     migration ait quelque chose à révoquer : sans ça, l'assertion serait vraie
 *     par accident sur un Postgres nu.
 *  8. Les TROIS index existent, sur les bonnes colonnes — dont celui sur
 *     `publish_after`.
 *  9. `updated_at` NE MENT PAS : le déclencheur le repousse à chaque update,
 *     même si l'écrivain ne l'écrit pas, et `created_at` ne bouge pas.
 * 10. Le territoire SURVIT à la purge de sa course (`on delete set null`) :
 *     l'histoire n'est pas réécrite quand la trace est effacée (rétention §7).
 * 11. La table est CRÉÉE VIDE et rien ne la remplit — l'étape 1 ne change rien
 *     à ce que voit un joueur.
 *
 * ═══ CE QUE CE TEST NE PROUVE PAS ═══════════════════════════════════════════
 *  · L'EFFET de la RLS. PGlite tourne en SUPERUTILISATEUR : les policies ne s'y
 *    appliquent pas, et `auth.uid()` y est un bouchon qui rend NULL. On prouve
 *    que la policy EXISTE, que son expression porte `publish_after` et que les
 *    privilèges sont révoqués (`has_table_privilege`) — PAS qu'un rival est
 *    réellement aveugle avant l'échéance. Cela ne pourra l'être que sur un vrai
 *    Supabase. Même réserve que `fr_communes.pglite.test.mjs`.
 *  · LA GÉOMÉTRIE. Aucun CHECK ne vérifie qu'un anneau est fermé, qu'il ne
 *    s'auto-intersecte pas, ni que `area_m2` correspond à `geometry` : la base
 *    stocke, le moteur pur calcule. Ce test ne teste donc pas de géométrie — il
 *    teste que la base accepte et rend un GeoJSON sans l'abîmer.
 *  · LA CONCURRENCE. PGlite est mono-connexion.
 *  · LE CHEMIN D'ÉCRITURE. Il n'existe pas encore (étape 3 du lot 1) : ce test
 *    insère à la main, en service-role de fait.
 *
 * ═══ LANCER ════════════════════════════════════════════════════════════════
 *   mkdir -p /tmp/pglite && cd /tmp/pglite
 *   echo '{"name":"pglite-scratch","private":true}' > package.json
 *   npm i --ignore-scripts @electric-sql/pglite
 *   cd <repo> && GRYD_PGLITE=/tmp/pglite/node_modules/@electric-sql/pglite/dist/index.js \
 *     node supabase/tests/territories.pglite.test.mjs
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
      '    node supabase/tests/territories.pglite.test.mjs',
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
// On le crée pour exécuter les migrations SANS LES MODIFIER.
//
// ⚠️ LE POINT QUI FAIT LA DIFFÉRENCE ENTRE UNE VRAIE PREUVE ET UNE PREUVE VIDE :
// `alter default privileges`. Sur un vrai Supabase, `anon` et `authenticated`
// reçoivent TOUS les privilèges sur chaque table nouvellement créée — c'est
// précisément pourquoi 0074 doit les révoquer. Sur un Postgres nu, ces rôles
// n'ont JAMAIS rien : sans cette ligne, l'assertion « anon ne peut pas écrire »
// serait vraie même si la migration avait oublié le `revoke`.
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

// ─── Le monde d'AVANT (0002) : city_zones, users, crews, crew_members, runs ──
// 0074 référence `city_zones`, `runs` et `crew_members` : sans eux, la migration
// ne s'appliquerait pas. On charge le VRAI 0002, non modifié.
await db.exec(readFileSync(join(MIGRATIONS, '0002_schema.sql'), 'utf8'));

console.log('territories — migration 0074 sur PGlite\n');

// ═══ 1. LA MIGRATION S'APPLIQUE ═════════════════════════════════════════════
let migrationError = null;
try {
  await db.exec(readFileSync(join(MIGRATIONS, '0074_territories_polygon.sql'), 'utf8'));
} catch (err) {
  migrationError = err;
}

await t('la migration 0074 s’applique sur un Postgres réel, telle quelle', () => {
  if (migrationError) throw new Error(migrationError.message);
});

if (migrationError) {
  console.log('\nMigration non appliquée : la suite n’a aucun sens, on s’arrête ici.');
  process.exit(1);
}

// ─── Acteurs ────────────────────────────────────────────────────────────────
const RUNNER = '11111111-1111-1111-1111-111111111111';
const RIVAL = '33333333-3333-3333-3333-333333333333';
const CITY = 'paris';

await db.exec(`
  insert into auth.users (id) values ('${RUNNER}'), ('${RIVAL}');
  insert into public.city_zones (city_id, name, geojson, status)
    values ('${CITY}', 'Paris', '{}'::jsonb, 'active');
  insert into public.users (id, pseudo, city_id) values
    ('${RUNNER}', 'coureur', '${CITY}'),
    ('${RIVAL}',  'rival',   '${CITY}');
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

// Un polygone RÉEL — une boucle autour du parc des Buttes-Chaumont, avec un TROU
// (un étang qu'on ne capture pas). Les décimales sont volontairement longues :
// c'est ce qui permet de voir une perte de précision si la base en perdait.
const POLYGON = {
  type: 'Polygon',
  coordinates: [
    [
      [2.3812345, 48.8798765],
      [2.3891234, 48.8801234],
      [2.3887654, 48.8765432],
      [2.3808765, 48.8762109],
      [2.3812345, 48.8798765],
    ],
    [
      [2.3840001, 48.8785002],
      [2.3855003, 48.8786004],
      [2.3854005, 48.8776006],
      [2.3839007, 48.8775008],
      [2.3840001, 48.8785002],
    ],
  ],
};

const INSERT = `
  insert into public.territories
    (activity, owner_type, owner_id, geometry, geometry_generalized, area_m2,
     city_id, state, defense_level, controlled_since, publish_after,
     algorithm_version, source_run_id)
  values ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, $8, $9, $10, $11, $12, $13)
  returning id`;

const nominal = (over = {}) => {
  const base = {
    activity: 'run',
    owner_type: 'user',
    owner_id: RUNNER,
    geometry: JSON.stringify(POLYGON),
    geometry_generalized: null,
    area_m2: 148_320.5,
    city_id: CITY,
    state: 'owned_personal',
    defense_level: 0,
    controlled_since: new Date().toISOString(),
    publish_after: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    algorithm_version: 'gryd-polygon-1',
    source_run_id: null,
    ...over,
  };
  return [
    base.activity, base.owner_type, base.owner_id, base.geometry,
    base.geometry_generalized, base.area_m2, base.city_id, base.state,
    base.defense_level, base.controlled_since, base.publish_after,
    base.algorithm_version, base.source_run_id,
  ];
};

// ═══ 2. LA TABLE EST CRÉÉE VIDE ═════════════════════════════════════════════
await t('la table est créée VIDE — l’étape 1 ne remplit rien, ne change rien', async () => {
  const r = await db.query('select count(*)::int as n from public.territories');
  eq(r.rows[0].n, 0, 'lignes à la création');
});

// ═══ 3. INSERT NOMINAL + ALLER-RETOUR DE LA GÉOMÉTRIE ═══════════════════════
let nominalId = null;
await t('un insert nominal passe, et la géométrie GeoJSON revient INTACTE (trou compris)', async () => {
  const ins = await db.query(INSERT, nominal());
  nominalId = ins.rows[0].id;
  ok(!!nominalId, 'id non rendu');

  const r = await db.query(
    'select geometry, area_m2, state, defense_level, activity from public.territories where id = $1',
    [nominalId],
  );
  const row = r.rows[0];
  // Égalité STRUCTURELLE, décimales comprises : un arrondi silencieux
  // déplacerait un territoire sur le terrain.
  eq(row.geometry, POLYGON, 'géométrie relue');
  eq(row.geometry.coordinates.length, 2, 'anneau extérieur + trou conservés');
  eq(Number(row.area_m2), 148_320.5, 'aire relue');
  eq(row.state, 'owned_personal', 'état');
  eq(row.defense_level, 0, 'niveau de fortification par défaut');
  eq(row.activity, 'run', 'discipline');
});

// ═══ 4. LES CHECK REFUSENT ══════════════════════════════════════════════════
await t('un `state` INCONNU est refusé (les 9 états de §5.3 font foi)', async () => {
  await rejects(
    INSERT, nominal({ state: 'royaume' }),
    'territories_state_check',
    'state inconnu',
  );
});

await t('les 9 états de §5.3 sont TOUS acceptés (le CHECK ne bloque pas la spec)', async () => {
  const owned = ['owned_personal', 'contested', 'defended', 'transfer_pending',
    'protected_by_privacy', 'expired', 'invalidated'];
  for (const state of owned) {
    await db.query(INSERT, nominal({ state }));
  }
  // Les deux états à propriétaire particulier.
  await db.query(INSERT, nominal({ state: 'owned_crew', owner_type: 'crew' }));
  await db.query(INSERT, nominal({ state: 'unowned', owner_type: null, owner_id: null }));
  const r = await db.query('select count(distinct state)::int as n from public.territories');
  eq(r.rows[0].n, 9, 'états distincts insérés');
});

await t('`defense_level = 4` est refusé, et -1 aussi (§9.2 : 0 à 3, rien d’autre)', async () => {
  await rejects(INSERT, nominal({ defense_level: 4 }),
    'territories_defense_level_check', 'defense_level = 4');
  await rejects(INSERT, nominal({ defense_level: -1 }),
    'territories_defense_level_check', 'defense_level = -1');
  // Les quatre niveaux légitimes passent.
  for (const lvl of [0, 1, 2, 3]) {
    await db.query(INSERT, nominal({ defense_level: lvl }));
  }
});

await t('un `owner_type` INCONNU est refusé (« user » ou « crew », pas « clan »)', async () => {
  await rejects(INSERT, nominal({ owner_type: 'clan' }),
    'territories_owner_type_check', 'owner_type = clan');
});

await t('une DISCIPLINE inconnue est refusée (alignée sur hex_claims, 0070)', async () => {
  await rejects(INSERT, nominal({ activity: 'swim' }),
    'territories_activity_check', 'activity = swim');
  await db.query(INSERT, nominal({ activity: 'bike' })); // les deux mondes existent
});

await t('un GeoJSON qui n’est PAS un Polygon est refusé (Point, ou scalaire JSON)', async () => {
  await rejects(
    INSERT,
    nominal({ geometry: JSON.stringify({ type: 'Point', coordinates: [2.38, 48.87] }) }),
    'territories_geometry_is_polygon', 'geometry = Point',
  );
  // Un scalaire JSON doit échouer PROPREMENT sur le CHECK, sans faire lever une
  // fonction interne : c'est pourquoi le CHECK n'appelle pas jsonb_array_length.
  await rejects(
    INSERT, nominal({ geometry: JSON.stringify('boucle') }),
    'territories_geometry_is_polygon', 'geometry = chaîne JSON',
  );
  // ⚠️ LES DEUX CAS QUI ONT RÉELLEMENT ATTRAPÉ UN DÉFAUT (première exécution du
  // 27/07/2026) : une clé ABSENTE rend NULL, un CHECK qui vaut NULL est
  // SATISFAIT — donc l'enveloppe incomplète passait, là où l'enveloppe fausse
  // était refusée. Corrigé par des `coalesce` dans la migration. Ces deux
  // assertions restent la seule chose qui empêche la régression.
  await rejects(
    INSERT, nominal({ geometry: JSON.stringify({ type: 'Polygon' }) }),
    'territories_geometry_is_polygon', 'Polygon sans coordinates',
  );
  await rejects(
    INSERT, nominal({ geometry: JSON.stringify({ coordinates: POLYGON.coordinates }) }),
    'territories_geometry_is_polygon', 'coordinates sans type',
  );
  await rejects(
    INSERT, nominal({ geometry: JSON.stringify({}) }),
    'territories_geometry_is_polygon', 'objet JSON vide',
  );
});

await t('même piège, même parade sur la géométrie GÉNÉRALISÉE (clé absente ≠ permissif)', async () => {
  await rejects(
    INSERT, nominal({ geometry_generalized: JSON.stringify({ type: 'Polygon' }) }),
    'territories_generalized_is_polygon', 'generalized Polygon sans coordinates',
  );
  await rejects(
    INSERT, nominal({ geometry_generalized: JSON.stringify({ coordinates: [] }) }),
    'territories_generalized_is_polygon', 'generalized coordinates sans type',
  );
});

await t('une géométrie généralisée mal formée est refusée, mais son ABSENCE est permise', async () => {
  await rejects(
    INSERT,
    nominal({ geometry_generalized: JSON.stringify({ type: 'LineString', coordinates: [] }) }),
    'territories_generalized_is_polygon', 'generalized = LineString',
  );
  await db.query(INSERT, nominal({ geometry_generalized: null })); // pas encore calculée
});

await t('une aire nulle ou négative est refusée (un territoire a une surface)', async () => {
  await rejects(INSERT, nominal({ area_m2: 0 }),
    'territories_area_positive', 'aire = 0');
  await rejects(INSERT, nominal({ area_m2: -12 }),
    'territories_area_positive', 'aire négative');
});

await t('un `algorithm_version` vide est refusé (§19.2 : on sait TOUJOURS qui a dérivé)', async () => {
  await rejects(INSERT, nominal({ algorithm_version: '' }),
    'territories_algorithm_version_check', 'version vide');
});

// ═══ 5. COHÉRENCE PROPRIÉTAIRE / ÉTAT ═══════════════════════════════════════
await t('`unowned` AVEC un propriétaire est refusé (une ligne ne se contredit pas)', async () => {
  await rejects(
    INSERT, nominal({ state: 'unowned', owner_type: 'user', owner_id: RUNNER }),
    'territories_owner_coherent', 'unowned + propriétaire',
  );
});

await t('un état POSSÉDÉ sans propriétaire est refusé (pas de propriété fantôme)', async () => {
  await rejects(
    INSERT, nominal({ state: 'contested', owner_type: null, owner_id: null }),
    'territories_owner_coherent', 'contested sans propriétaire',
  );
});

await t('`owned_crew` avec un propriétaire JOUEUR est refusé, et réciproquement', async () => {
  await rejects(
    INSERT, nominal({ state: 'owned_crew', owner_type: 'user' }),
    'territories_state_owner_type', 'owned_crew + user',
  );
  await rejects(
    INSERT, nominal({ state: 'owned_personal', owner_type: 'crew' }),
    'territories_state_owner_type', 'owned_personal + crew',
  );
});

// ═══ 6. `publish_after` EST OBLIGATOIRE ET SANS DÉFAUT ══════════════════════
await t('`publish_after` est OBLIGATOIRE : l’omettre échoue (aucun délai en dur)', async () => {
  await rejects(
    `insert into public.territories
       (owner_type, owner_id, geometry, area_m2, state, algorithm_version)
     values ('user', $1, $2::jsonb, 1000, 'owned_personal', 'gryd-polygon-1')`,
    [RUNNER, JSON.stringify(POLYGON)],
    'publish_after',
    'publish_after omis',
  );
  // Et la colonne n'a AUCUN défaut : le délai de 60 min (§1.5) vit dans
  // game-rules.ts, jamais dans le schéma.
  const d = await db.query(
    `select column_default from information_schema.columns
      where table_name = 'territories' and column_name = 'publish_after'`,
  );
  eq(d.rows[0].column_default, null, 'défaut de publish_after');
});

// ═══ 7. RLS + POLICY ════════════════════════════════════════════════════════
await t('RLS ACTIVÉE sur territories', async () => {
  const r = await db.query(
    `select relrowsecurity as on from pg_class where oid = 'public.territories'::regclass`,
  );
  ok(r.rows[0].on === true, 'RLS doit être activée');
});

await t('une policy de LECTURE existe, et elle est la SEULE (zéro écriture client)', async () => {
  const sel = await db.query(
    `select count(*)::int as n from pg_policies
      where tablename = 'territories' and cmd = 'SELECT'`,
  );
  ok(sel.rows[0].n >= 1, 'policy de lecture manquante');
  const write = await db.query(
    `select count(*)::int as n from pg_policies
      where tablename = 'territories' and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')`,
  );
  eq(write.rows[0].n, 0, 'policies d’écriture (doivent être zéro : service_role only)');
});

await t('la policy de lecture FILTRE BIEN sur publish_after (§1.5) — pas juste « une policy »', async () => {
  const r = await db.query(
    `select qual from pg_policies
      where tablename = 'territories' and policyname = 'territories_select_published'`,
  );
  ok(r.rows.length === 1, 'policy territories_select_published introuvable');
  const qual = String(r.rows[0].qual);
  ok(qual.includes('publish_after'), `l’expression ne mentionne pas publish_after : ${qual}`);
  ok(qual.includes('now()'), `l’expression ne compare pas à l’instant courant : ${qual}`);
  // Le propriétaire voit sa propre conquête tout de suite : le délai protège des
  // RIVAUX, il ne cache pas au joueur ce qu'il vient de faire.
  ok(qual.includes('auth.uid()'), `l’expression n’identifie pas le lecteur : ${qual}`);
  ok(qual.includes('crew_members'), `l’expression n’ouvre pas au crew propriétaire : ${qual}`);
});

// ═══ 8. PRIVILÈGES ══════════════════════════════════════════════════════════
await t('écriture RÉVOQUÉE aux rôles clients (les Edge Functions écrivent seules)', async () => {
  for (const role of ['anon', 'authenticated']) {
    for (const priv of ['INSERT', 'UPDATE', 'DELETE']) {
      const r = await db.query(
        `select has_table_privilege($1, 'public.territories', $2) as v`, [role, priv],
      );
      ok(r.rows[0].v === false, `${role} ne doit pas ${priv} territories`);
    }
  }
});

await t('`anon` ne lit RIEN, `authenticated` peut lire (la policy décide ensuite QUOI)', async () => {
  const a = await db.query(
    `select has_table_privilege('anon', 'public.territories', 'SELECT') as v`,
  );
  ok(a.rows[0].v === false, 'anon ne doit pas lire territories');
  const b = await db.query(
    `select has_table_privilege('authenticated', 'public.territories', 'SELECT') as v`,
  );
  ok(b.rows[0].v === true, 'authenticated doit pouvoir lire (filtré par la policy)');
});

// ═══ 9. INDEX ═══════════════════════════════════════════════════════════════
await t('l’index sur `publish_after` existe (échéance de publication + policy)', async () => {
  const r = await db.query(
    `select indexdef from pg_indexes
      where schemaname = 'public' and indexname = 'territories_publish_after_idx'`,
  );
  ok(r.rows.length === 1, 'territories_publish_after_idx introuvable');
  ok(String(r.rows[0].indexdef).includes('publish_after'),
    `définition inattendue : ${r.rows[0].indexdef}`);
});

await t('les index (owner_type, owner_id) et (activity, city_id) existent', async () => {
  const owner = await db.query(
    `select indexdef from pg_indexes
      where schemaname = 'public' and indexname = 'territories_owner_idx'`,
  );
  ok(owner.rows.length === 1, 'territories_owner_idx introuvable');
  ok(/owner_type/.test(owner.rows[0].indexdef) && /owner_id/.test(owner.rows[0].indexdef),
    `définition inattendue : ${owner.rows[0].indexdef}`);

  const city = await db.query(
    `select indexdef from pg_indexes
      where schemaname = 'public' and indexname = 'territories_activity_city_idx'`,
  );
  ok(city.rows.length === 1, 'territories_activity_city_idx introuvable');
  ok(/activity/.test(city.rows[0].indexdef) && /city_id/.test(city.rows[0].indexdef),
    `définition inattendue : ${city.rows[0].indexdef}`);
});

// ═══ 10. `updated_at` NE MENT PAS ═══════════════════════════════════════════
await t('`updated_at` est repoussé par le déclencheur même si l’écrivain l’oublie', async () => {
  const before = await db.query(
    'select created_at, updated_at from public.territories where id = $1', [nominalId],
  );
  // On force une horloge visiblement fausse : le déclencheur doit la corriger.
  await db.query(
    `update public.territories
        set defense_level = 2, updated_at = timestamptz '2000-01-01 00:00:00+00'
      where id = $1`,
    [nominalId],
  );
  const after = await db.query(
    'select created_at, updated_at, defense_level from public.territories where id = $1',
    [nominalId],
  );
  eq(after.rows[0].defense_level, 2, 'la mise à jour métier a bien eu lieu');
  ok(new Date(after.rows[0].updated_at) > new Date(before.rows[0].updated_at),
    `updated_at n’a pas été repoussé : ${after.rows[0].updated_at}`);
  eq(
    new Date(after.rows[0].created_at).toISOString(),
    new Date(before.rows[0].created_at).toISOString(),
    'created_at ne doit JAMAIS bouger',
  );
});

// ═══ 11. LE TERRITOIRE SURVIT À LA PURGE DE SA COURSE ═══════════════════════
await t('purger la course NE DÉTRUIT PAS le territoire (on delete set null, §7)', async () => {
  const runId = await newRun();
  const ins = await db.query(INSERT, nominal({ source_run_id: runId }));
  const id = ins.rows[0].id;
  await db.query('delete from public.runs where id = $1', [runId]);
  const r = await db.query(
    'select source_run_id, state, geometry from public.territories where id = $1', [id],
  );
  ok(r.rows.length === 1, 'le territoire a disparu avec sa course — histoire réécrite');
  eq(r.rows[0].source_run_id, null, 'source_run_id après purge');
  eq(r.rows[0].geometry, POLYGON, 'la géométrie survit à la purge de la trace');
});

// ═══ 12. `hex_claims` EST INTACTE ═══════════════════════════════════════════
await t('0074 ne touche PAS `hex_claims` : la propriété reste hexagonale (étape 1/4)', async () => {
  const pk = await db.query(
    `select conname from pg_constraint
      where conrelid = 'public.hex_claims'::regclass and contype = 'p'`,
  );
  eq(pk.rows[0].conname, 'hex_claims_pkey', 'clé primaire de hex_claims');
  const cols = await db.query(
    `select count(*)::int as n from information_schema.columns
      where table_name = 'hex_claims' and column_name in ('geometry', 'territory_id')`,
  );
  eq(cols.rows[0].n, 0, 'colonnes ajoutées à hex_claims (doit être 0)');
});

console.log(`\n${passed} test(s) OK, ${failures.length} échec(s).`);
console.log(
  'RAPPEL : l’EFFET de la RLS n’est PAS prouvé ici (PGlite = superutilisateur, ' +
    'auth.uid() bouchonné). Seules l’EXISTENCE de la policy, la présence de ' +
    '`publish_after` dans son expression et les privilèges le sont.',
);
process.exit(failures.length === 0 ? 0 : 1);
