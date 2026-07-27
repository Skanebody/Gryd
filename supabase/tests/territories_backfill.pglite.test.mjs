#!/usr/bin/env node
/**
 * GRYD — test EXÉCUTABLE de la migration 0076
 * (`territories_backfill` : le FILET de diagnostic, pas un backfill).
 * LOT 1, ÉTAPE 3 sur 4.
 *
 * ═══ POURQUOI CE FICHIER EXISTE ═════════════════════════════════════════════
 * 0076 ne contient AUCUN TypeScript : une vue, une fonction, un bloc `do`. Les
 * tests Deno du dépôt ne touchent pas une ligne de DDL — sans ce fichier, « la
 * migration ne fabrique aucune géométrie » et « une capture orpheline est
 * signalée » resteraient des INTENTIONS écrites dans un commentaire.
 *
 * Et c'est le genre de fichier où l'intention ne suffit VRAIMENT pas : sa
 * promesse centrale est NÉGATIVE (« elle ne crée rien »). Une promesse négative
 * ne se relit pas, elle se mesure — on compte les lignes de `territories` avant
 * et après, et on exige zéro.
 *
 * Docker est indisponible sur cette machine (pas de `npx supabase start`).
 * PGlite — Postgres compilé en WASM — exécute le VRAI SQL des migrations dans
 * Node. Même harnais que `territories.pglite.test.mjs` (0074) et
 * `territories_source_run_unique.pglite.test.mjs` (0075).
 *
 * ═══ CE QUE CE TEST PROUVE ══════════════════════════════════════════════════
 *  1. 0076 s'applique sur un Postgres réel, telle quelle, par-dessus la LIGNÉE
 *     COMPLÈTE des migrations (0002 → 0075). Pas sur une maquette de schéma :
 *     la vue est vérifiée avec `hex_claims.activity` et la clé primaire
 *     `(h3index, activity)` de 0070, comme en production.
 *  2. SUR UNE BASE VIDE, elle ne crée AUCUNE ligne `territories` — et le résumé
 *     rend 0, jamais NULL (un « inconnu » à la place d'un « zéro » serait un
 *     état inventé de plus).
 *  3. Une capture SANS territoire est SIGNALÉE : bon compte de cellules, bonnes
 *     bornes de temps, bonne discipline, bon propriétaire, bonne ville.
 *  4. Une capture AVEC son territoire n'apparaît PAS. Un filet qui crie sur du
 *     sain est un filet qu'on débranche.
 *  5. Run et Bike sur la MÊME cellule H3 restent DEUX groupes distincts — la
 *     discipline ne se mélange jamais (0070, E14).
 *  6. Les cellules dont la course a été purgée (§7) sont comptées À PART
 *     (`attributable_to_run = false`), jamais confondues avec les orphelines
 *     rattachables.
 *  7. L'anti-jointure ne DUPLIQUE aucune cellule : la somme des `cell_count`
 *     égale exactement le nombre de cellules sans polygone.
 *  8. Le résumé et la vue ne peuvent pas diverger (le premier est bâti sur la
 *     seconde) — vérifié en les comparant sur un état non trivial.
 *  9. AUCUN rôle client (`public`, `anon`, `authenticated`) ne peut lire la vue
 *     ni exécuter la fonction, MÊME quand les privilèges par défaut de Supabase
 *     accordent tout sur le schéma `public` (ils sont posés dans le socle
 *     ci-dessous exprès, pour que le `revoke` de la migration ait un sens).
 * 10. Rejouer la migration est idempotent, et ne crée toujours rien.
 *
 * ═══ CE QU'IL NE PROUVE PAS, dit ici plutôt que laissé croire ═══════════════
 *  · L'ÉTAT DE LA BASE DE PRODUCTION. On prouve que le filet fonctionne, pas
 *    qu'il ne trouvera rien chez `gryd`. Seul le déploiement le dira — c'est la
 *    raison d'être du bloc `do` de la migration.
 *  · L'EFFET RÉEL DES REVOKE. PGlite tourne en SUPERUTILISATEUR : on vérifie que
 *    les privilèges sont ABSENTS du catalogue, pas qu'une connexion
 *    `authenticated` se fasse refuser (même limite qu'en 0074/0075).
 *  · LE TEXTE DU `raise warning`. PGlite ne restitue pas les messages de
 *    notice/warning à l'appelant ; ce qui est testé, c'est la FONCTION qui
 *    fournit les chiffres du message, pas son rendu dans un log.
 *
 * ═══ LANCER ════════════════════════════════════════════════════════════════
 *   mkdir -p /tmp/pglite && cd /tmp/pglite
 *   echo '{"name":"pglite-scratch","private":true}' > package.json
 *   npm i --ignore-scripts @electric-sql/pglite
 *   cd <repo> && GRYD_PGLITE=/tmp/pglite/node_modules/@electric-sql/pglite/dist/index.js \
 *     node supabase/tests/territories_backfill.pglite.test.mjs
 * Sans PGlite : sortie CODE 2 — un test non exécuté n'est JAMAIS vert. Il n'est
 * donc pas branché sur `npm run test:functions` (Deno, `--allow-read` seul).
 */
import { readFileSync, readdirSync } from 'node:fs';
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
      '    node supabase/tests/territories_backfill.pglite.test.mjs',
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

// ─── Le socle que Supabase fournit et qu'un Postgres nu n'a pas ──────────────
// `alter default privileges … grant all on tables to anon, authenticated` n'est
// PAS décoratif : sans lui, une vue naîtrait déjà sans privilège client et le
// test des `revoke` de la migration serait un faux positif. On reproduit ici le
// comportement de Supabase pour que le revoke ait quelque chose à révoquer.
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

// ─── LA LIGNÉE COMPLÈTE, jouée telle quelle ─────────────────────────────────
// On applique TOUTES les migrations 0002 → 0075, dans l'ordre, SANS LES
// MODIFIER. C'est plus coûteux qu'un sous-ensemble, et c'est le but : la vue de
// 0076 lit `hex_claims` telle qu'elle est VRAIMENT après 0070 (colonne
// `activity`, clé primaire `(h3index, activity)`), pas telle qu'elle était en
// 0002. Un test bâti sur un schéma partiel aurait pu passer sur une colonne qui
// n'existe plus.
//
// QUATRE FICHIERS SONT SAUTÉS, et uniquement parce que PGlite n'embarque pas les
// extensions qu'ils exigent — jamais parce qu'ils gênent :
//   · 0001 : `pgcrypto` (inutile ici, `gen_random_uuid()` est natif en PG13+) ;
//   · 0020 : publication `supabase_realtime` (côté plateforme, pas côté schéma) ;
//   · 0038 / 0039 / 0064 : `pg_cron`.
// Aucun ne touche `hex_claims`, `runs` ni `territories` d'une façon dont la vue
// dépend. Les fichiers qui appellent `cron.schedule(` sans créer l'extension
// sont, eux, tronqués à cet appel (patron de `activity_dimension.pglite.test.mjs`).
const SKIP = new Set([
  '0001_extensions.sql',
  '0020_crew_realtime.sql',
  '0038_sector_cron.sql',
  '0039_core_crons.sql',
  '0064_offensive_lifecycle.sql',
]);
const CRON = 'select cron.schedule(';
// Borne HAUTE explicite : les chantiers voisins tournent en parallèle et
// déposeront des migrations ultérieures. Ce test répond de la lignée jusqu'à
// 0076 ; il ne doit pas rougir parce qu'un autre lot a livré 0077.
const LINEAGE = readdirSync(MIGRATIONS)
  .filter((f) => f.endsWith('.sql') && /^\d{4}_/.test(f) && Number(f.slice(0, 4)) <= 75)
  .sort()
  .filter((f) => !SKIP.has(f));

for (const file of LINEAGE) {
  const raw = readFileSync(join(MIGRATIONS, file), 'utf8');
  const at = raw.indexOf(CRON);
  try {
    await db.exec(at === -1 ? raw : raw.slice(0, at));
  } catch (err) {
    console.error(`\nSOCLE CASSÉ : la migration ${file} n’a pas pu s’appliquer.\n  ${err.message}`);
    process.exit(1);
  }
}

console.log('territories — migration 0076 (filet de backfill) sur PGlite\n');
console.log(`  (lignée rejouée : ${LINEAGE.length} migrations, 0002 → 0075)\n`);

// ═══ 1. LA MIGRATION S'APPLIQUE, ET NE CRÉE RIEN ════════════════════════════
const BACKFILL_SQL = readFileSync(join(MIGRATIONS, '0076_territories_backfill.sql'), 'utf8');

let migrationError = null;
try {
  await db.exec(BACKFILL_SQL);
} catch (err) {
  migrationError = err;
}

await t('la migration 0076 s’applique sur un Postgres réel, telle quelle', () => {
  if (migrationError) throw new Error(migrationError.message);
});

if (migrationError) {
  console.log('\nMigration non appliquée : la suite n’a aucun sens, on s’arrête ici.');
  process.exit(1);
}

const territoryCount = async () =>
  (await db.query('select count(*)::int as n from public.territories')).rows[0].n;
const gapRows = async () =>
  (
    await db.query(
      `select run_id, activity, owner_user_id, city_id, cell_count::int as cell_count,
              first_claimed_at, last_claimed_at, attributable_to_run
       from public.territories_backfill_gap
       order by activity, cell_count desc, attributable_to_run desc`,
    )
  ).rows;
const summary = async () =>
  (
    await db.query(
      `select gap_groups::int as gap_groups, gap_cells::int as gap_cells,
              cells_attributable_to_run::int as attributable,
              cells_without_run::int as without_run
       from public.territories_backfill_gap_summary()`,
    )
  ).rows[0];

await t('sur une base VIDE, la migration n’a créé AUCUN territoire', async () => {
  eq(await territoryCount(), 0, 'lignes territories');
});

await t('sur une base VIDE, le filet ne signale rien — et rend 0, jamais NULL', async () => {
  eq(await gapRows(), [], 'lignes de la vue');
  eq(await summary(), { gap_groups: 0, gap_cells: 0, attributable: 0, without_run: 0 }, 'résumé');
});

// ─── Acteurs ────────────────────────────────────────────────────────────────
const RUNNER = '11111111-1111-1111-1111-111111111111';
const OTHER = '22222222-2222-2222-2222-222222222222';
const ALGO = 'gryd-loop-polygon@1';

// La ville est PRISE dans la base (les seeds 0004/0033/0066 en posent), jamais
// inventée : si la lignée change de villes, le test suit au lieu de mentir.
const CITY = (
  await db.query('select city_id from public.city_zones order by city_id limit 1')
).rows[0].city_id;
ok(typeof CITY === 'string' && CITY.length > 0, 'aucune city_zone dans la lignée');

await db.exec(`
  insert into auth.users (id) values ('${RUNNER}'), ('${OTHER}');
  insert into public.users (id, pseudo, city_id)
    values ('${RUNNER}', 'coureur', '${CITY}'), ('${OTHER}', 'rival', '${CITY}')
    on conflict (id) do nothing;
`);

const newRun = async (userId = RUNNER) =>
  (
    await db.query(
      `insert into public.runs (user_id, client_run_id, source, started_at,
                                distance_m, duration_s, status)
       values ($1, gen_random_uuid(), 'gps', now(), 5000, 1800, 'valid')
       returning id`,
      [userId],
    )
  ).rows[0].id;

/** Un carré ~400 m à Paris, refermé — ce que le moteur persiste réellement. */
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

const insertTerritory = (runId, userId = RUNNER) =>
  db.query(
    `insert into public.territories
       (activity, owner_type, owner_id, geometry, area_m2, city_id, state,
        publish_after, algorithm_version, source_run_id)
     values ('run', 'user', $1, $2::jsonb, 160000, $3, 'owned_personal',
             now() + interval '60 minutes', $4, $5)`,
    [userId, SQUARE, CITY, ALGO, runId],
  );

/** `h3index` est un bigint arbitraire ici : la vue ne décode aucune cellule. */
let nextIndex = 600000000000000000n;
const claimCells = async (runId, n, opts = {}) => {
  const { userId = RUNNER, activity = 'run', cityId = CITY, claimedAt = null } = opts;
  const indexes = [];
  for (let i = 0; i < n; i += 1) {
    nextIndex += 1n;
    indexes.push(nextIndex.toString());
    await db.query(
      `insert into public.hex_claims
         (h3index, activity, city_id, owner_user_id, claim_type, claimed_at, run_id)
       values ($1::bigint, $2, $3, $4, 'neutral', coalesce($5::timestamptz, now()), $6)`,
      [indexes[i], activity, cityId, userId, claimedAt, runId],
    );
  }
  return indexes;
};

// ═══ 2. UNE CAPTURE SANS POLYGONE EST SIGNALÉE ══════════════════════════════
const RUN_ORPHAN = await newRun();
await claimCells(RUN_ORPHAN, 4, { claimedAt: '2026-01-10T08:00:00Z' });
await db.query(
  `update public.hex_claims set claimed_at = '2026-01-10T09:30:00Z'
   where run_id = $1 and h3index = (select max(h3index) from public.hex_claims where run_id = $1)`,
  [RUN_ORPHAN],
);

await t('une capture SANS territoire est signalée, avec son compte et ses bornes', async () => {
  const rows = await gapRows();
  eq(rows.length, 1, 'nombre de groupes signalés');
  const g = rows[0];
  eq(g.run_id, RUN_ORPHAN, 'course signalée');
  eq(g.cell_count, 4, 'cellules comptées');
  eq(g.activity, 'run', 'discipline');
  eq(g.owner_user_id, RUNNER, 'propriétaire');
  eq(g.city_id, CITY, 'ville');
  eq(g.attributable_to_run, true, 'rattachable à une course');
  eq(g.first_claimed_at.toISOString(), '2026-01-10T08:00:00.000Z', 'première capture');
  eq(g.last_claimed_at.toISOString(), '2026-01-10T09:30:00.000Z', 'dernière capture');
});

await t('le résumé compte la même chose que la vue', async () => {
  eq(await summary(), { gap_groups: 1, gap_cells: 4, attributable: 4, without_run: 0 }, 'résumé');
});

await t('signaler ne crée toujours AUCUN territoire', async () => {
  eq(await territoryCount(), 0, 'lignes territories');
});

// ═══ 3. PAS DE FAUX POSITIF : une capture AVEC son polygone est muette ══════
const RUN_OK = await newRun();
await claimCells(RUN_OK, 7);
await insertTerritory(RUN_OK);

await t('une capture AVEC son territoire n’apparaît PAS dans le filet', async () => {
  const rows = await gapRows();
  eq(rows.length, 1, 'nombre de groupes signalés');
  eq(rows[0].run_id, RUN_ORPHAN, 'seul l’orphelin est signalé');
  eq((await summary()).gap_cells, 4, 'cellules signalées');
});

// ═══ 4. RUN ET BIKE NE SE MÉLANGENT JAMAIS (0070, E14) ══════════════════════
// La même cellule H3 peut appartenir à deux mondes : la clé primaire est
// `(h3index, activity)`. Un filet qui les fusionnerait sous-compterait, et un
// territoire vélo pourrait être « couvert » par un polygone de course.
const RUN_BIKE = await newRun();
const bikeCells = await claimCells(RUN_BIKE, 2, { activity: 'bike' });
// On rejoue EXACTEMENT les mêmes h3index en 'run', sur une autre course :
const RUN_SAME_HEX = await newRun();
for (const idx of bikeCells) {
  await db.query(
    `insert into public.hex_claims
       (h3index, activity, city_id, owner_user_id, claim_type, run_id)
     values ($1::bigint, 'run', $2, $3, 'neutral', $4)`,
    [idx, CITY, RUNNER, RUN_SAME_HEX],
  );
}

await t('les MÊMES cellules H3 en run et en bike forment DEUX groupes distincts', async () => {
  const rows = (await gapRows()).filter((r) => r.run_id === RUN_BIKE || r.run_id === RUN_SAME_HEX);
  eq(rows.length, 2, 'groupes distincts');
  const byActivity = Object.fromEntries(rows.map((r) => [r.activity, r.cell_count]));
  eq(byActivity, { bike: 2, run: 2 }, 'cellules par discipline');
});

// ═══ 5. COURSE PURGÉE (§7) : COMPTÉE À PART, JAMAIS CONFONDUE ═══════════════
// `hex_claims.run_id` est `on delete set null` : après purge, la cellule existe
// encore mais plus rien ne la relie à une course. Aucun backfill ne pourra
// jamais la traiter — le filet doit le DIRE, pas la noyer dans le total.
const RUN_PURGED = await newRun(OTHER);
await claimCells(RUN_PURGED, 3, { userId: OTHER });
await db.query('delete from public.runs where id = $1', [RUN_PURGED]);

await t('une course purgée laisse ses cellules NON rattachables, comptées à part', async () => {
  const rows = (await gapRows()).filter((r) => r.run_id === null);
  eq(rows.length, 1, 'groupe non rattachable');
  eq(rows[0].cell_count, 3, 'cellules orphelines de course');
  eq(rows[0].attributable_to_run, false, 'attributable_to_run');
  eq(rows[0].owner_user_id, OTHER, 'propriétaire conservé');

  const s = await summary();
  eq(s.without_run, 3, 'cellules sans course');
  eq(s.attributable, s.gap_cells - 3, 'le reste est rattachable');
});

// ═══ 6. L'ANTI-JOINTURE NE DUPLIQUE RIEN ════════════════════════════════════
// Un `left join` mal posé gonflerait les comptes en silence et transformerait le
// diagnostic en alarme fausse. On confronte la vue à la vérité brute.
await t('la somme des cell_count égale exactement les cellules sans polygone', async () => {
  const truth = (
    await db.query(
      `select count(*)::int as n
       from public.hex_claims hc
       where hc.run_id is null
          or not exists (select 1 from public.territories t where t.source_run_id = hc.run_id)`,
    )
  ).rows[0].n;
  const s = await summary();
  eq(s.gap_cells, truth, 'cellules signalées vs cellules réellement sans polygone');
  ok(truth > 0, 'le jeu de test doit être non trivial ici, sinon l’égalité ne prouve rien');
});

await t('le résumé ne peut pas diverger de la vue sur un état non trivial', async () => {
  const rows = await gapRows();
  const s = await summary();
  eq(s.gap_groups, rows.length, 'groupes');
  eq(s.gap_cells, rows.reduce((n, r) => n + r.cell_count, 0), 'cellules');
  eq(
    s.attributable,
    rows.filter((r) => r.attributable_to_run).reduce((n, r) => n + r.cell_count, 0),
    'cellules rattachables',
  );
});

// ═══ 7. AUCUN CLIENT NE VOIT CE DIAGNOSTIC ══════════════════════════════════
await t('aucun rôle client n’a le moindre privilège sur la vue', async () => {
  const r = await db.query(
    `select grantee, privilege_type
     from information_schema.role_table_grants
     where table_schema = 'public' and table_name = 'territories_backfill_gap'
       and grantee in ('PUBLIC', 'public', 'anon', 'authenticated')`,
  );
  eq(r.rows, [], 'privilèges clients sur territories_backfill_gap');
});

await t('aucun rôle client ne peut exécuter la fonction de résumé', async () => {
  const r = await db.query(
    `select coalesce(array_to_string(proacl, ' '), '') as acl
     from pg_proc where proname = 'territories_backfill_gap_summary'`,
  );
  eq(r.rows.length, 1, 'la fonction existe');
  const acl = r.rows[0].acl;
  ok(acl !== '', 'proacl NULL = privilèges par défaut = EXECUTE pour PUBLIC (revoke manquant)');
  for (const grantee of ['anon=', 'authenticated=']) {
    ok(!acl.includes(grantee), `privilège résiduel pour ${grantee.slice(0, -1)} : ${acl}`);
  }
  // Une entrée PUBLIC s'écrit sans nom de rôle, donc « =X/proprio ».
  ok(!/(^| )=/.test(acl), `privilège résiduel pour PUBLIC : ${acl}`);
});

// ═══ 8. REJOUER LA MIGRATION NE CRÉE TOUJOURS RIEN ══════════════════════════
// Le compte attendu n'est PAS zéro à ce stade : le §3 a inséré un territoire
// LÉGITIME (celui de RUN_OK). Ce qu'on exige, c'est que le rejeu n'en ajoute
// AUCUN — comparer à zéro ici masquerait le vrai invariant derrière un chiffre
// qui se trouve être faux pour une autre raison.
await t('rejouer 0076 est idempotent et ne fabrique aucun territoire', async () => {
  const before = await summary();
  const territoriesBefore = await territoryCount();
  await db.exec(BACKFILL_SQL);
  eq(await territoryCount(), territoriesBefore, 'lignes territories après rejeu');
  eq(await summary(), before, 'le filet mesure la même chose après rejeu');
});

// ─── Verdict ────────────────────────────────────────────────────────────────
console.log(`\n${passed} test(s) OK, ${failures.length} échec(s)`);
if (failures.length > 0) {
  console.log('\nÉCHECS :');
  for (const f of failures) console.log(`  · ${f.name}\n    ${f.err.stack || f.err.message}`);
  process.exit(1);
}
