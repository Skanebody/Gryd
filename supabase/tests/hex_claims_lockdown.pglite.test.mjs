#!/usr/bin/env node
/**
 * GRYD — test EXÉCUTABLE de la migration 0079 (fermeture de `hex_claims`,
 * AUDIT R3 — spec §12.1, §12.3, §1.5).
 *
 * ═══ POURQUOI CE FICHIER EXISTE ═════════════════════════════════════════════
 * 0079 ne contient AUCUN TypeScript : une policy, une vue, un `date_trunc`, une
 * jointure et quatre lignes de privilèges. Les tests Deno du dépôt n'en touchent
 * pas une ligne. Or ce que cette migration promet est une promesse de VIE PRIVÉE
 * (« les horaires de sortie d'un autre joueur ne sortent plus ») : non exécutée,
 * cette phrase est une intention.
 *
 * Docker est indisponible sur cette machine (donc pas de `npx supabase start`).
 * PGlite — Postgres compilé en WASM — exécute le VRAI SQL des migrations dans
 * Node, sans démon. Même harnais que `public_territories.pglite.test.mjs` (0077).
 *
 * ═══ CE QUE CE TEST PROUVE ══════════════════════════════════════════════════
 *  1. La migration S'APPLIQUE sur un Postgres réel, telle quelle.
 *  2. `hex_claims_select_all` (0003:114, `using (true)`) N'EXISTE PLUS, et la
 *     policy qui la remplace borne bien la lecture à `owner_user_id = auth.uid()`.
 *  3. Les privilèges d'écriture restent RÉVOQUÉS pour `anon` et `authenticated`,
 *     et `anon` perd en plus le SELECT sur la table.
 *  4. La vue `public_hex_claims` existe, et c'est une VUE (une matview figerait
 *     des données de joueurs et ne verrait jamais `auth.uid()`).
 *  5. Elle N'EXPOSE PAS `run_id` (le regroupement qui redessine un TRAJET), ni
 *     `claimed_at`/`decay_at` exacts, ni `locked_until`/`shielded_until`, ni
 *     `city_id`/`sector_id`/`crew_color_cache` — et « pas exposé » est vérifié
 *     par l'ÉCHEC d'un `select` nommant la colonne, pas par une liste seule.
 *  6. Les horodatages publiés sont TRONQUÉS À L'HEURE (§12.1) : minutes,
 *     secondes et microsecondes ne sortent pas. `decay_at` est tronqué AUSSI —
 *     il vaut `claimed_at + DECAY_DAYS`, l'oublier aurait rendu la troncature de
 *     `claimed_at` purement décorative. C'est LE piège de cette migration.
 *  7. Un NULL reste NULL (compte protégé, `decay_at` absent) : aucune échéance
 *     n'est inventée.
 *  8. Le lecteur NE SE VOIT PAS dans la vue (il lit ses cellules dans la table,
 *     à leur précision réelle) — prouvé en faisant varier `auth.uid()`.
 *  9. La PUBLICATION DIFFÉRÉE (§1.5) agit : une cellule dont la course a produit
 *     un territoire non encore publié est ABSENTE ; la même après échéance est
 *     présente.
 * 10. La cellule SANS territoire connu reste visible (repli `coalesce` assumé et
 *     écrit en suspens §4.2) — le test le CONSTATE au lieu de laisser croire que
 *     le délai couvre tout.
 * 11. La jointure sur `territories` ne DUPLIQUE aucune cellule (index unique
 *     `territories_source_run_unique`, 0075).
 * 12. Les privilèges de la vue sont ceux annoncés : `authenticated` lit,
 *     `anon` ne lit rien. Le harnais reproduit d'abord les DEFAULT PRIVILEGES de
 *     Supabase, sans quoi l'assertion serait vraie par accident.
 * 13. `security_barrier` est posé ; `security_invoker` est ABSENT À DESSEIN
 *     (c'est l'ouverture au-dessus d'une table fermée) — le test fixe ce choix
 *     pour qu'il ne bascule pas par inadvertance.
 * 14. Contre-épreuve : la TABLE, elle, garde toutes ses colonnes. Fermer la
 *     lecture n'a rien mutilé — les jobs service_role lisent toujours l'exact.
 *
 * ═══ CE QUE CE TEST NE PROUVE PAS ═══════════════════════════════════════════
 *  · L'EFFET DE LA RLS. PGlite tourne en SUPERUTILISATEUR : les policies ne s'y
 *    appliquent pas. On prouve que la policy EXISTE avec la bonne expression et
 *    que les privilèges sont ceux annoncés — PAS qu'un rival est réellement
 *    aveugle. Cela ne pourra être constaté que sur un vrai Supabase.
 *    (Le `where` de la VUE, lui, EST prouvé : un `where` s'applique à tout rôle,
 *    superutilisateur compris. C'est pour cela que le cœur de cette migration —
 *    troncature, exclusion du lecteur, délai — est réellement testable ici.)
 *  · `auth.uid()` est ici un BOUCHON lisant un GUC de test (`gryd.test_uid`) au
 *    lieu du JWT PostgREST. C'est ce qui permet de faire varier « qui lit » ;
 *    que PostgREST alimente réellement `auth.uid()` en production est une
 *    propriété de Supabase, pas de ce SQL.
 *  · LE FUSEAU. `date_trunc('hour', timestamptz)` tronque dans le fuseau de la
 *    session ; le test force UTC, comme un Supabase par défaut.
 *
 * ═══ LANCER ════════════════════════════════════════════════════════════════
 *   mkdir -p /tmp/pglite && cd /tmp/pglite
 *   echo '{"name":"pglite-scratch","private":true}' > package.json
 *   npm i --ignore-scripts @electric-sql/pglite
 *   cd <repo> && GRYD_PGLITE=/tmp/pglite/node_modules/@electric-sql/pglite/dist/index.js \
 *     node supabase/tests/hex_claims_lockdown.pglite.test.mjs
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
      '    node supabase/tests/hex_claims_lockdown.pglite.test.mjs',
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

/** Charge le VRAI SQL d'une migration, éventuellement tronqué à un marqueur. */
function migration(file, cutAt) {
  const sql = readFileSync(join(MIGRATIONS, file), 'utf8');
  if (!cutAt) return sql;
  const at = sql.indexOf(cutAt);
  if (at === -1) throw new Error(`${file} : marqueur de coupe « ${cutAt} » introuvable`);
  return sql.slice(0, at);
}

const db = new PGlite();

// ─── Le socle Supabase qu'un Postgres nu n'a pas ────────────────────────────
// `alter default privileges` est LE point qui sépare une preuve d'une preuve
// vide : sur un vrai Supabase, `anon`/`authenticated` reçoivent tous les
// privilèges sur chaque table ET chaque vue nouvellement créée — c'est
// exactement pourquoi 0079 doit les révoquer. Sans cette ligne, « anon ne lit
// pas » serait vrai même si la migration avait oublié le revoke.
//
// `auth.uid()` lit un GUC de test au lieu du JWT : c'est le SEUL écart au socle
// des autres tests PGlite, et il est délibéré — sans lui, « le lecteur ne se
// voit pas dans la vue » serait intestable (un `auth.uid()` constamment NULL
// rendrait la clause `is distinct from` toujours vraie, donc muette).
await db.exec(`
  set time zone 'UTC';
  create role anon;
  create role authenticated;
  create role service_role;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('gryd.test_uid', true), '')::uuid
  $$;
  create schema extensions;
  create function extensions.gen_random_bytes(int) returns bytea
    language sql as $$ select decode(md5(random()::text), 'hex') $$;
  alter default privileges in schema public grant all on tables to anon, authenticated;
`);

// ─── Le monde d'AVANT ───────────────────────────────────────────────────────
// 0003 est chargée pour une raison précise : c'est ELLE qui pose
// `hex_claims_select_all using (true)`. On charge la policy réelle pour prouver
// que 0079 la retire, au lieu de tester le vide.
// De 0070, on ne rejoue que les sections 1 et 2 (`runs.activity` et
// `hex_claims.activity` + clé composite) : la suite touche les crews, les
// classements et `claim_hexes`, dont rien ici ne dépend. La coupe est faite sur
// un marqueur du fichier RÉEL — si le titre de section change, le test ÉCHOUE
// bruyamment plutôt que de charger silencieusement autre chose.
await db.exec(migration('0002_schema.sql'));
await db.exec(migration('0003_rls.sql'));
await db.exec(migration('0070_activity_dimension.sql', '-- 3. `season_scores` — DEUX CLASSEMENTS'));
await db.exec(migration('0074_territories_polygon.sql'));
await db.exec(migration('0075_territories_source_run_unique.sql'));

console.log('hex_claims lockdown — migration 0079 sur PGlite\n');

// ═══ 0. L'ÉTAT D'AVANT, CONSTATÉ (sinon on ne prouve rien) ══════════════════
await t('AVANT 0079 : `hex_claims_select_all` est bien `using (true)` — le défaut R3 existe', async () => {
  const r = await db.query(`
    select qual from pg_policies
    where schemaname = 'public' and tablename = 'hex_claims' and policyname = 'hex_claims_select_all'
  `);
  eq(r.rows.length, 1, 'la policy d’origine est introuvable : le test ne prouverait plus rien');
  eq(r.rows[0].qual, 'true', 'la policy d’origine ne rend pas la table entière ?');
});

// ═══ 1. LA MIGRATION S'APPLIQUE ═════════════════════════════════════════════
let migrationError = null;
try {
  await db.exec(migration('0079_hex_claims_lockdown.sql'));
} catch (err) {
  migrationError = err;
}

await t('la migration 0079 s’applique sur un Postgres réel, telle quelle', () => {
  if (migrationError) throw new Error(migrationError.message);
});

if (migrationError) {
  console.log('\nMigration non appliquée : la suite n’a aucun sens, on s’arrête ici.');
  process.exit(1);
}

// ═══ 2. LA POLICY : SES PROPRES CELLULES, ET RIEN D'AUTRE ═══════════════════
await t('`hex_claims_select_all` (using true) N’EXISTE PLUS', async () => {
  const r = await db.query(`
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'hex_claims' and policyname = 'hex_claims_select_all'
  `);
  eq(r.rows.length, 0, 'la policy ouverte survit à la migration');
});

await t('la lecture est bornée à SES cellules (`owner_user_id = auth.uid()`)', async () => {
  const r = await db.query(`
    select cmd, roles::text as roles, qual from pg_policies
    where schemaname = 'public' and tablename = 'hex_claims' and policyname = 'hex_claims_select_own'
  `);
  eq(r.rows.length, 1, 'la policy de remplacement est introuvable');
  eq(r.rows[0].cmd, 'SELECT', 'la policy doit porter sur la LECTURE');
  ok(r.rows[0].roles.includes('authenticated'), 'la policy doit viser le rôle `authenticated`');
  const qual = String(r.rows[0].qual).replace(/\s+/g, ' ');
  ok(qual.includes('owner_user_id'), `l’expression ne parle pas du propriétaire : ${qual}`);
  ok(qual.includes('auth.uid()'), `l’expression n’appelle pas auth.uid() : ${qual}`);
  ok(!/\btrue\b/.test(qual), `l’expression contient encore un « true » : ${qual}`);
});

await t('la RLS reste ACTIVÉE sur hex_claims (une policy sans RLS ne protège rien)', async () => {
  const r = await db.query(`select relrowsecurity from pg_class where oid = 'public.hex_claims'::regclass`);
  eq(r.rows[0].relrowsecurity, true, 'RLS désactivée : les policies ne s’appliqueraient pas');
});

await t('aucune écriture cliente : insert/update/delete restent révoqués', async () => {
  for (const role of ['anon', 'authenticated']) {
    for (const priv of ['insert', 'update', 'delete']) {
      const r = await db.query(`select has_table_privilege($1, 'public.hex_claims', $2) as p`, [role, priv]);
      eq(r.rows[0].p, false, `${role} peut ${priv} sur hex_claims`);
    }
  }
});

await t('`anon` perd le SELECT sur la table ; `authenticated` le garde (la RLS filtre les lignes)', async () => {
  const anon = await db.query(`select has_table_privilege('anon', 'public.hex_claims', 'select') as p`);
  eq(anon.rows[0].p, false, 'anon peut encore lire la table');
  const auth = await db.query(`select has_table_privilege('authenticated', 'public.hex_claims', 'select') as p`);
  eq(auth.rows[0].p, true, 'authenticated ne peut plus lire ses PROPRES cellules — la mission casserait');
});

// ═══ 3. LA VUE EXISTE, ET C'EST UNE VUE ═════════════════════════════════════
await t('la vue public.public_hex_claims existe (relkind = vue, ni table ni matview)', async () => {
  const r = await db.query(`
    select c.relkind::text as kind
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'public_hex_claims'
  `);
  eq(r.rows.length, 1, 'la vue est introuvable');
  eq(r.rows[0].kind, 'v', 'ce n’est pas une vue simple (une matview ne verrait jamais auth.uid())');
});

const viewColumns = async () =>
  (
    await db.query(`
      select column_name from information_schema.columns
      where table_schema = 'public' and table_name = 'public_hex_claims'
      order by ordinal_position
    `)
  ).rows.map((r) => r.column_name);

await t('§12.3 : la vue N’EXPOSE NI la course source NI les horloges exactes', async () => {
  const cols = await viewColumns();
  for (const forbidden of [
    'run_id',
    'claimed_at',
    'decay_at',
    'locked_until',
    'shielded_until',
    'city_id',
    'sector_id',
    'crew_color_cache',
  ]) {
    ok(!cols.includes(forbidden), `la colonne « ${forbidden} » est exposée alors qu’elle ne doit pas l’être`);
  }
});

await t('la liste des colonnes publiques est EXACTEMENT celle prévue (aucun ajout muet)', async () => {
  eq(
    await viewColumns(),
    ['h3index', 'activity', 'owner_user_id', 'claim_type', 'claimed_at_hour', 'decay_at_hour'],
    'la surface publique a changé sans que ce test le sache',
  );
});

await t('nommer `run_id` dans un select sur la vue ÉCHOUE (preuve par l’erreur)', async () => {
  await rejects(
    `select run_id from public.public_hex_claims`,
    'run_id',
    'la course source reste atteignable par la vue',
  );
});

await t('nommer `claimed_at` (exact) dans un select sur la vue ÉCHOUE', async () => {
  await rejects(
    `select claimed_at from public.public_hex_claims`,
    'claimed_at',
    'l’horodatage exact reste atteignable par la vue',
  );
});

// ─── Acteurs et données ─────────────────────────────────────────────────────
const RUNNER = '11111111-1111-1111-1111-111111111111';
const RIVAL = '22222222-2222-2222-2222-222222222222';
const CITY = 'paris';

await db.exec(`
  insert into auth.users (id) values ('${RUNNER}'), ('${RIVAL}');
  insert into public.city_zones (city_id, name, geojson, status)
    values ('${CITY}', 'Paris', '{}'::jsonb, 'active');
  insert into public.users (id, pseudo, city_id) values
    ('${RUNNER}', 'coureur', '${CITY}'),
    ('${RIVAL}',  'rival',   '${CITY}');
`);

/** Une course réelle : c'est elle qui relie une cellule à un territoire. */
const newRun = async (userId) =>
  (
    await db.query(
      `insert into public.runs (user_id, client_run_id, source, started_at,
                                distance_m, duration_s, status)
       values ($1, gen_random_uuid(), 'gps', now(), 5000, 1800, 'valid')
       returning id`,
      [userId],
    )
  ).rows[0].id;

const POLY = JSON.stringify({
  type: 'Polygon',
  coordinates: [[[2.35, 48.85], [2.352, 48.85], [2.352, 48.851], [2.35, 48.851], [2.35, 48.85]]],
});

/** Un territoire adossé à une course, publié dans `publishOffset` (intervalle SQL). */
const newTerritory = async (ownerId, sourceRun, publishOffset) =>
  (
    await db.query(
      `insert into public.territories
         (activity, owner_type, owner_id, geometry, geometry_generalized, area_m2,
          city_id, state, defense_level, controlled_since, publish_after,
          algorithm_version, source_run_id)
       values ('run', 'user', $1, $2::jsonb, $2::jsonb, 42000, $3, 'owned_personal', 1,
               now(), now() + ($4)::interval, 'poly-v1', $5)
       returning id`,
      [ownerId, POLY, CITY, publishOffset, sourceRun],
    )
  ).rows[0].id;

/** Une cellule capturée. `claimedAt`/`decayAt` sont des littéraux SQL ou null. */
const newClaim = async ({ h3, owner, runId = null, claimedAt, decayAt = null, activity = 'run' }) => {
  await db.query(
    `insert into public.hex_claims
       (h3index, city_id, owner_user_id, claim_type, claimed_at, run_id, decay_at, activity)
     values ($1, $2, $3, 'neutral', $4::timestamptz, $5, $6::timestamptz, $7)`,
    [h3, CITY, owner, claimedAt, runId, decayAt, activity],
  );
};

/**
 * Un instant RELATIF à `now()`, résolu par la base et passé ensuite comme
 * valeur. Postgres accepte le littéral `'now()'` (son parseur de dates est
 * tolérant), mais s'appuyer là-dessus ferait dépendre une preuve de vie privée
 * d'une indulgence de parseur : on demande l'instant, on ne l'écrit pas.
 */
const at = async (offset) =>
  (await db.query(`select (now() + ($1)::interval)::text as v`, [offset])).rows[0].v;

// L'HEURE PIÈGE : 07 h 12 min 34,567891 s. C'est littéralement l'exemple de
// game-rules (« il part à 7 h 12 tous les mardis ») — si une minute sort, la
// migration ne protège rien.
const CLAIMED = '2026-07-20 07:12:34.567891+00';
const DECAY = '2026-08-10 07:12:34.567891+00';

const RIVAL_RUN = await newRun(RIVAL);
await newTerritory(RIVAL, RIVAL_RUN, '-1 hour'); // territoire PUBLIÉ
await newClaim({ h3: 613196750582120448n, owner: RIVAL, runId: RIVAL_RUN, claimedAt: CLAIMED, decayAt: DECAY });

// ═══ 4. LES HORODATAGES SONT TRONQUÉS À L'HEURE ═════════════════════════════
await db.exec(`set gryd.test_uid = '${RUNNER}'`);

await t('§12.1 : `claimed_at` sort TRONQUÉ à l’heure (ni minute, ni seconde)', async () => {
  const r = await db.query(
    `select to_char(claimed_at_hour at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS.US') as h
     from public.public_hex_claims where h3index = 613196750582120448`,
  );
  eq(r.rows.length, 1, 'la cellule du rival devrait être visible');
  eq(r.rows[0].h, '2026-07-20 07:00:00.000000', 'l’heure exacte de capture fuit encore');
});

await t('LE PIÈGE : `decay_at` est tronqué AUSSI (sinon claimed_at se re-déduit)', async () => {
  const r = await db.query(
    `select to_char(decay_at_hour at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS.US') as h
     from public.public_hex_claims where h3index = 613196750582120448`,
  );
  eq(r.rows[0].h, '2026-08-10 07:00:00.000000', 'decay_at exact republie l’heure de capture (− DECAY_DAYS)');
});

await t('un `decay_at` NULL reste NULL — aucune échéance inventée', async () => {
  const run = await newRun(RIVAL);
  await newTerritory(RIVAL, run, '-1 hour');
  await newClaim({ h3: 613196750582120460n, owner: RIVAL, runId: run, claimedAt: CLAIMED, decayAt: null });
  const r = await db.query(
    `select decay_at_hour from public.public_hex_claims where h3index = 613196750582120460`,
  );
  eq(r.rows.length, 1, 'la cellule devrait être visible');
  eq(r.rows[0].decay_at_hour, null, 'un compte protégé (< 14 j) se voit inventer une échéance');
});

// ═══ 5. LE LECTEUR NE SE VOIT PAS DANS LA VUE ═══════════════════════════════
// Il lit ses cellules dans la table, à leur précision réelle. C'est ce qui rend
// la fusion client sans doublon ET met le délai de §1.5 hors d'atteinte de sa
// propre capture.
const MY_RUN = await newRun(RUNNER);
await newTerritory(RUNNER, MY_RUN, '-1 hour');
await newClaim({ h3: 613196750582120449n, owner: RUNNER, runId: MY_RUN, claimedAt: CLAIMED, decayAt: DECAY });

await t('mes propres cellules sont ABSENTES de la vue publique', async () => {
  await db.exec(`set gryd.test_uid = '${RUNNER}'`);
  const r = await db.query(
    `select h3index::text as h from public.public_hex_claims where h3index = 613196750582120449`,
  );
  eq(r.rows.length, 0, 'le lecteur se voit dans sa propre surface publique');
});

await t('… et la MÊME cellule est bien visible pour quelqu’un d’autre (la vue n’est pas vide)', async () => {
  await db.exec(`set gryd.test_uid = '${RIVAL}'`);
  const r = await db.query(
    `select owner_user_id::text as o, claim_type from public.public_hex_claims where h3index = 613196750582120449`,
  );
  eq(r.rows.length, 1, 'contre-épreuve manquée : la cellule n’est visible de personne');
  eq(r.rows[0].o, RUNNER, 'le propriétaire doit rester lisible (rôle §C : moi / mon crew / rival)');
  eq(r.rows[0].claim_type, 'neutral', 'le type de capture est une donnée de jeu, il doit sortir');
});

// ═══ 6. LA PUBLICATION DIFFÉRÉE (§1.5) AGIT ═════════════════════════════════
await db.exec(`set gryd.test_uid = '${RUNNER}'`);

await t('une cellule dont le territoire n’est PAS encore publié est ABSENTE', async () => {
  const run = await newRun(RIVAL);
  await newTerritory(RIVAL, run, '1 hour'); // publication DANS le futur
  await newClaim({ h3: 613196750582120450n, owner: RIVAL, runId: run, claimedAt: await at('0 seconds'), decayAt: null });
  const r = await db.query(`select 1 from public.public_hex_claims where h3index = 613196750582120450`);
  eq(r.rows.length, 0, 'la capture d’un rival est visible EN DIRECT — §1.5 non tenue');
});

await t('la même cellule apparaît une fois l’échéance passée', async () => {
  await db.query(
    `update public.territories set publish_after = now() - interval '1 minute'
     where source_run_id = (select run_id from public.hex_claims where h3index = 613196750582120450)`,
  );
  const r = await db.query(`select 1 from public.public_hex_claims where h3index = 613196750582120450`);
  eq(r.rows.length, 1, 'le territoire publié reste invisible : le filtre est trop large');
});

await t('SUSPENS §4.2 ASSUMÉ : une cellule sans territoire connu reste visible (repli coalesce)', async () => {
  await newClaim({ h3: 613196750582120451n, owner: RIVAL, runId: null, claimedAt: CLAIMED, decayAt: null });
  const r = await db.query(`select 1 from public.public_hex_claims where h3index = 613196750582120451`);
  eq(
    r.rows.length,
    1,
    'le repli a changé : les captures antérieures au lot polygonal DISPARAISSENT de la carte',
  );
});

await t('une cellule dont la course est future ne sort pas non plus (le coalesce compare bien)', async () => {
  await newClaim({
    h3: 613196750582120452n,
    owner: RIVAL,
    runId: null,
    claimedAt: await at('1 hour'),
    decayAt: null,
  });
  const r = await db.query(`select 1 from public.public_hex_claims where h3index = 613196750582120452`);
  eq(r.rows.length, 0, 'le repli publie une capture datée dans le futur');
});

// ═══ 7. LA JOINTURE NE DUPLIQUE RIEN ════════════════════════════════════════
await t('une cellule adossée à un territoire n’apparaît QU’UNE fois (index unique 0075)', async () => {
  const r = await db.query(
    `select count(*)::int as n from public.public_hex_claims where h3index = 613196750582120448`,
  );
  eq(r.rows[0].n, 1, 'la jointure sur territories multiplie les cellules');
});

await t('les deux mondes restent DEUX lignes (clé composite 0070), jamais fondus', async () => {
  const run = await newRun(RIVAL);
  await newTerritory(RIVAL, run, '-1 hour');
  await newClaim({
    h3: 613196750582120448n,
    owner: RIVAL,
    runId: run,
    claimedAt: CLAIMED,
    decayAt: null,
    activity: 'bike',
  });
  const r = await db.query(
    `select activity from public.public_hex_claims where h3index = 613196750582120448 order by activity`,
  );
  eq(r.rows.map((x) => x.activity), ['bike', 'run'], 'la vue perd la discipline (E14)');
});

// ═══ 8. PRIVILÈGES DE LA VUE ════════════════════════════════════════════════
await t('`authenticated` LIT la vue, `anon` ne la lit pas', async () => {
  const auth = await db.query(`select has_table_privilege('authenticated', 'public.public_hex_claims', 'select') as p`);
  eq(auth.rows[0].p, true, 'le client connecté ne peut pas lire la surface publique — la carte perd les rivaux');
  const anon = await db.query(`select has_table_privilege('anon', 'public.public_hex_claims', 'select') as p`);
  eq(anon.rows[0].p, false, 'un visiteur NON CONNECTÉ lit les cellules de tout le monde');
});

await t('aucune écriture n’est ouverte sur la vue', async () => {
  for (const role of ['anon', 'authenticated']) {
    for (const priv of ['insert', 'update', 'delete']) {
      const r = await db.query(`select has_table_privilege($1, 'public.public_hex_claims', $2) as p`, [role, priv]);
      eq(r.rows[0].p, false, `${role} peut ${priv} sur la vue`);
    }
  }
});

// ═══ 9. LES OPTIONS DE LA VUE SONT CELLES QU'ON A CHOISIES ══════════════════
await t('`security_barrier` est posé, et `security_invoker` est ABSENT (choix documenté)', async () => {
  const r = await db.query(`
    select coalesce(array_to_string(reloptions, ','), '') as opts
    from pg_class where oid = 'public.public_hex_claims'::regclass
  `);
  const opts = r.rows[0].opts;
  ok(/security_barrier=(true|on)/.test(opts), `security_barrier manquant : « ${opts} »`);
  ok(
    !/security_invoker=(true|on)/.test(opts),
    `security_invoker=true a été posé : la vue ne rendrait plus que les lignes du lecteur — ` +
      `c’est-à-dire AUCUNE, puisqu’elle les exclut. La carte perdrait tous les rivaux. « ${opts} »`,
  );
});

// ═══ 10. CONTRE-ÉPREUVE : LA TABLE N'A PAS ÉTÉ MUTILÉE ══════════════════════
await t('la TABLE garde toutes ses colonnes (les jobs service_role lisent l’exact)', async () => {
  const cols = (
    await db.query(`
      select column_name from information_schema.columns
      where table_schema = 'public' and table_name = 'hex_claims'
    `)
  ).rows.map((r) => r.column_name);
  for (const kept of ['run_id', 'claimed_at', 'decay_at', 'locked_until', 'shielded_until', 'sector_id']) {
    ok(cols.includes(kept), `la colonne « ${kept} » a disparu de la table : decay_job/ingest_run cassent`);
  }
});

// ─── Verdict ────────────────────────────────────────────────────────────────
console.log(`\n${passed} vert(s), ${failures.length} rouge(s)`);
if (failures.length > 0) {
  console.log('\nÉCHECS :');
  for (const f of failures) console.log(`  · ${f.name}\n    ${f.err.message}`);
  process.exit(1);
}
console.log('0079 tient ses promesses — dans les limites énoncées en tête de fichier.');
