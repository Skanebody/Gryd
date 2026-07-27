#!/usr/bin/env node
/**
 * GRYD — test EXÉCUTABLE de la migration 0080 (`resolve_due_contests`).
 * LOT 3, ÉTAPE 3 : §9.4, l'échéance de la contestation.
 *
 * ═══ POURQUOI CE FICHIER EXISTE ═════════════════════════════════════════════
 * 0080 est la SEULE porte du dépôt par laquelle un territoire polygonal change
 * de propriétaire sans qu'une course soit en train d'être ingérée. Une faute
 * ici ne plante pas : elle donne la zone à la mauvaise personne, ou deux fois,
 * ou jamais. Aucun test Deno ne touche une ligne de plpgsql — sans ce fichier,
 * « rejouer le job ne transfère pas deux fois » resterait un commentaire.
 *
 * Docker est indisponible sur cette machine (`npx supabase start` impossible).
 * PGlite — Postgres compilé en WASM — exécute le VRAI SQL des migrations dans
 * Node. Même harnais que `territory_contests.pglite.test.mjs`.
 *
 * ═══ CE QUE CE TEST PROUVE ══════════════════════════════════════════════════
 *  1. 0080 s'applique sur un Postgres réel, TELLE QUELLE, par-dessus la lignée
 *     complète (0002 → 0079) — et SANS pg_cron, ce qui est précisément la
 *     condition qu'elle s'est imposée pour rester prouvable (les migrations qui
 *     exigent pg_cron sont SAUTÉES par tous les tests du dépôt, donc non
 *     prouvées).
 *  2. À l'échéance et sans défense, le territoire est TRANSFÉRÉ : nouveau
 *     propriétaire = l'assaillant, `state` cohérent avec `owner_type`,
 *     `defense_level` remis à 0, `controlled_since` = l'ÉCHÉANCE.
 *  3. `resolved_at` vaut l'ÉCHÉANCE et non l'heure du job — un cron en retard de
 *     trois jours écrit la même histoire qu'un cron à l'heure.
 *  4. DOUBLE EXÉCUTION SANS EFFET : le second passage ne rend aucune ligne et ne
 *     retransfère rien (c'est la garantie que le rejeu d'un cron ne peut pas
 *     rejouer un transfert).
 *  5. Une contestation NON ÉCHUE est laissée strictement intacte.
 *  6. Une contestation déjà `defended` n'est JAMAIS transférée, même largement
 *     échue : c'est ainsi que la défense jugée à l'ingestion tient.
 *  7. Plusieurs échéances sont traitées dans l'ORDRE des échéances, et `p_limit`
 *     borne réellement un passage (le reste attend le passage suivant).
 *  8. Un assaillant CREW produit `owned_crew` (la contrainte
 *     `territories_state_owner_type` de 0074 refuserait `owned_personal`).
 *  9. Les privilèges : `anon`/`authenticated` ne peuvent pas exécuter la
 *     fonction, `service_role` le peut.
 *
 * ═══ CE QU'IL NE PROUVE PAS, dit ici plutôt que laissé croire ═══════════════
 *  · QUE pg_cron APPELLE LE JOB. PGlite ne l'embarque pas ; la planification de
 *    0080 est sous garde `if exists (… pg_extension …)` et ne s'exécute donc pas
 *    ici. Seul un vrai Supabase peut le montrer (`select * from cron.job`).
 *  · QUE LES DÉFENSES SOIENT BIEN JUGÉES. §9.3 est de la géométrie : elle est
 *    tranchée par `packages/engine/src/contest.ts` et
 *    `supabase/functions/ingest_run/contest_wiring.ts`, testés en Deno.
 *  · QUE LES POINTS SUIVENT. `hex_claims` n'est pas touchée par ce job : après
 *    un transfert de POLYGONE, les CELLULES restent à qui elles étaient.
 *
 * ═══ LANCER ════════════════════════════════════════════════════════════════
 *   mkdir -p /tmp/pglite && cd /tmp/pglite
 *   echo '{"name":"pglite-scratch","private":true}' > package.json
 *   npm i --ignore-scripts @electric-sql/pglite
 *   cd <repo> && GRYD_PGLITE=/tmp/pglite/node_modules/@electric-sql/pglite/dist/index.js \
 *     node supabase/tests/resolve_contests.pglite.test.mjs
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
      '    node supabase/tests/resolve_contests.pglite.test.mjs',
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

// ─── LA LIGNÉE COMPLÈTE, jouée telle quelle ─────────────────────────────────
// Mêmes cinq fichiers sautés qu'en `territory_contests.pglite.test.mjs`, et pour
// la même raison — PGlite n'embarque pas les extensions qu'ils exigent :
//   · 0001 : `pgcrypto` ; · 0020 : publication realtime ;
//   · 0038 / 0039 / 0064 : `pg_cron`.
// 0080, ELLE, N'EST PAS SAUTÉE : c'est tout l'intérêt de sa garde
// `if exists (… pg_extension …)` — elle s'applique sur un Postgres nu, donc elle
// est prouvable. Les fichiers qui appellent `cron.schedule(` sans créer
// l'extension sont tronqués à cet appel (patron du dépôt) ; 0080 n'écrit pas
// cette chaîne (elle passe par `perform`, sous garde), donc rien n'y est tronqué.
const SKIP = new Set([
  '0001_extensions.sql',
  '0020_crew_realtime.sql',
  '0038_sector_cron.sql',
  '0039_core_crons.sql',
  '0064_offensive_lifecycle.sql',
]);
const CRON = 'select cron.schedule(';
// Borne HAUTE explicite : d'autres chantiers tournent en parallèle et
// déposeront des migrations ultérieures. Ce test répond de la lignée jusqu'à
// 0079 ; il ne doit pas rougir parce qu'un autre lot a livré 0081.
const LINEAGE = readdirSync(MIGRATIONS)
  .filter((f) => f.endsWith('.sql') && /^\d{4}_/.test(f) && Number(f.slice(0, 4)) <= 79)
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

console.log('resolve_due_contests — migration 0080 (échéance §9.4) sur PGlite\n');
console.log(`  (lignée rejouée : ${LINEAGE.length} migrations, 0002 → 0079)\n`);

// ═══ 1. LA MIGRATION S'APPLIQUE, SANS pg_cron ═══════════════════════════════
let migrationError = null;
try {
  await db.exec(readFileSync(join(MIGRATIONS, '0080_resolve_contests.sql'), 'utf8'));
} catch (err) {
  migrationError = err;
}

await t('la migration 0080 s’applique sur un Postgres NU (pg_cron absent)', () => {
  if (migrationError) throw new Error(migrationError.message);
});

if (migrationError) {
  console.log('\nMigration non appliquée : la suite n’a aucun sens, on s’arrête ici.');
  process.exit(1);
}

// ─── Acteurs ────────────────────────────────────────────────────────────────
const OWNER = '11111111-1111-1111-1111-111111111111';
const RIVAL = '22222222-2222-2222-2222-222222222222';
const CREW = '33333333-3333-3333-3333-333333333333';
const CITY = 'paris';
const ALGO = 'gryd-loop-polygon@1';

const PARIS_BBOX = JSON.stringify({
  type: 'Polygon',
  coordinates: [[
    [2.13, 48.69],
    [2.61, 48.69],
    [2.61, 48.99],
    [2.13, 48.99],
    [2.13, 48.69],
  ]],
});

await db.exec(`
  insert into auth.users (id) values ('${OWNER}'), ('${RIVAL}');
  insert into public.city_zones (city_id, name, geojson, status)
    values ('${CITY}', 'Paris', '${PARIS_BBOX}'::jsonb, 'active')
    on conflict (city_id) do nothing;
  insert into public.users (id, pseudo, city_id)
    values ('${OWNER}', 'proprio', '${CITY}'), ('${RIVAL}', 'rival', '${CITY}')
    on conflict (id) do update set city_id = excluded.city_id;
  insert into public.crews (id, name, color, city_id, code, created_by)
    values ('${CREW}', 'Les Rivaux', 3, '${CITY}', 'RIVAUX', '${RIVAL}');
  insert into public.crew_members (crew_id, user_id) values ('${CREW}', '${RIVAL}');
`);

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

/**
 * Un territoire du PROPRIÉTAIRE, `contested` et fortifié : c'est l'état dans
 * lequel le câblage d'ingestion laisse une zone attaquée. Le job doit le
 * ramener à une propriété nette, sans fortification héritée.
 */
const newTerritory = async (over = {}) => {
  const v = { state: 'contested', defenseLevel: 2, ...over };
  const r = await db.query(
    `insert into public.territories
       (activity, owner_type, owner_id, geometry, area_m2, city_id, state,
        defense_level, controlled_since, publish_after, algorithm_version)
     values ('run', 'user', $1, $2::jsonb, 160000, $3, $4, $5,
             timestamptz '2026-07-01 00:00:00+00',
             timestamptz '2026-07-01 01:00:00+00', $6)
     returning id`,
    [OWNER, SQUARE, CITY, v.state, v.defenseLevel, ALGO],
  );
  return r.rows[0].id;
};

/**
 * Contestation NOMINALE. Toutes les valeurs de jeu (recouvrement, fenêtre) sont
 * fournies par l'APPELANT, comme en production : ni le schéma ni la fonction
 * n'en connaissent aucune. Échéance par défaut : 27/07 02:00 UTC.
 */
const DEADLINE = '2026-07-27 02:00:00+00';
const insertContest = async (territoryId, over = {}) => {
  const v = {
    attackerType: 'user',
    attackerId: RIVAL,
    overlapRatio: 0.78,
    startedAt: '2026-07-26 08:00:00+00',
    expiresAt: DEADLINE,
    status: 'active',
    resolvedAt: null,
    ...over,
  };
  const r = await db.query(
    `insert into public.territory_contests
       (territory_id, attacker_type, attacker_id, overlap_ratio,
        started_at, expires_at, status, resolved_at)
     values ($1, $2, $3, $4, $5::timestamptz, $6::timestamptz, $7, $8::timestamptz)
     returning id`,
    [
      territoryId,
      v.attackerType,
      v.attackerId,
      v.overlapRatio,
      v.startedAt,
      v.expiresAt,
      v.status,
      v.resolvedAt,
    ],
  );
  return r.rows[0].id;
};

/** Le job, avec le temps INJECTÉ — c'est ce qui rend l'échéance testable. */
const resolveAt = async (nowIso, limit = null) => {
  const r = limit === null
    ? await db.query('select * from public.resolve_due_contests($1::timestamptz)', [nowIso])
    : await db.query('select * from public.resolve_due_contests($1::timestamptz, $2)', [
      nowIso,
      limit,
    ]);
  return r.rows;
};

const iso = (v) => new Date(v).toISOString();
const contestRow = async (id) =>
  (await db.query('select status, resolved_at from public.territory_contests where id = $1', [id]))
    .rows[0];
const territoryRow = async (id) =>
  (await db.query(
    'select owner_type, owner_id, state, defense_level, controlled_since from public.territories where id = $1',
    [id],
  )).rows[0];

// ═══ 2. LE TRANSFERT À L'ÉCHÉANCE ═══════════════════════════════════════════

await t('à l’échéance et sans défense, le territoire est TRANSFÉRÉ à l’assaillant', async () => {
  const territory = await newTerritory();
  const contest = await insertContest(territory);

  // Le job se réveille 5 minutes APRÈS l'échéance (granularité du cron).
  const out = await resolveAt('2026-07-27 02:05:00+00');
  eq(out.length, 1, 'une contestation tranchée');
  eq(out[0].out_territory_id, territory, 'le territoire rendu');

  const c = await contestRow(contest);
  eq(c.status, 'transferred', 'statut de la contestation');
  // resolved_at = L'ÉCHÉANCE, pas l'heure du job (02:05).
  eq(iso(c.resolved_at), iso(DEADLINE), 'resolved_at doit être l’échéance');

  const tr = await territoryRow(territory);
  eq(tr.owner_id, RIVAL, 'nouveau propriétaire');
  eq(tr.owner_type, 'user', 'type de propriétaire');
  eq(tr.state, 'owned_personal', 'état de propriété (§5.3)');
  eq(Number(tr.defense_level), 0, 'le vainqueur n’hérite PAS du bouclier du vaincu');
  eq(iso(tr.controlled_since), iso(DEADLINE), 'tenue depuis l’échéance, pas depuis le réveil du job');
});

await t('un cron EN RETARD de trois jours écrit exactement la même histoire', async () => {
  const territory = await newTerritory();
  const contest = await insertContest(territory);
  await resolveAt('2026-07-30 02:05:00+00');
  const c = await contestRow(contest);
  eq(iso(c.resolved_at), iso(DEADLINE), 'l’histoire ne dépend pas de l’heure du réveil');
  const tr = await territoryRow(territory);
  eq(iso(tr.controlled_since), iso(DEADLINE), 'ni la date de prise de contrôle');
});

// ═══ 3. IDEMPOTENCE — LE POINT LE PLUS IMPORTANT DU FICHIER ═════════════════

await t('DOUBLE EXÉCUTION : le second passage ne transfère RIEN', async () => {
  const territory = await newTerritory();
  const contest = await insertContest(territory);

  const first = await resolveAt('2026-07-27 02:05:00+00');
  eq(first.length, 1, 'premier passage : un transfert');

  // On rend le territoire au propriétaire d'origine POUR VOIR si un second
  // passage le reprendrait. C'est la seule façon de distinguer « le job n'a rien
  // fait » de « le job a refait la même chose sans qu'on le voie ».
  await db.query(
    `update public.territories
        set owner_id = $1, state = 'owned_personal', defense_level = 3
      where id = $2`,
    [OWNER, territory],
  );

  const second = await resolveAt('2026-07-27 02:10:00+00');
  eq(second.length, 0, 'second passage : aucune ligne');
  const tr = await territoryRow(territory);
  eq(tr.owner_id, OWNER, 'le second passage n’a PAS retransféré');
  eq(Number(tr.defense_level), 3, 'ni remis la fortification à zéro');
  eq((await contestRow(contest)).status, 'transferred', 'la contestation reste tranchée une fois');
});

// ═══ 4. CE QUE LE JOB NE DOIT PAS TOUCHER ═══════════════════════════════════

await t('une contestation NON ÉCHUE est laissée strictement intacte', async () => {
  const territory = await newTerritory();
  const contest = await insertContest(territory);
  const out = await resolveAt('2026-07-27 01:59:00+00');
  eq(out.length, 0, 'rien à trancher avant l’échéance');
  const c = await contestRow(contest);
  eq(c.status, 'active', 'la contestation reste ouverte');
  eq(c.resolved_at, null, 'et non résolue');
  eq((await territoryRow(territory)).owner_id, OWNER, 'le propriétaire ne bouge pas');
});

await t('l’échéance EXACTE (à la seconde) est tranchée, pas ignorée', async () => {
  const territory = await newTerritory();
  const contest = await insertContest(territory);
  // On cherche CETTE contestation dans la sortie, pas un compte : les cas
  // précédents laissent derrière eux des contestations encore ouvertes (celle du
  // cas « non échue »), et un `length === 1` serait vert ou rouge selon l'ordre
  // des tests plutôt que selon la borne testée.
  const out = await resolveAt(DEADLINE);
  ok(
    out.some((r) => r.out_contest_id === contest),
    '`expires_at <= p_now` doit inclure l’instant EXACT de l’échéance',
  );
});

await t('une contestation DÉFENDUE n’est jamais transférée, même largement échue', async () => {
  const territory = await newTerritory({ state: 'defended', defenseLevel: 3 });
  const contest = await insertContest(territory, {
    status: 'defended',
    resolvedAt: '2026-07-26 20:00:00+00',
  });
  const out = await resolveAt('2026-08-15 00:00:00+00');
  eq(out.length, 0, 'une défense jugée à l’ingestion tient');
  eq((await contestRow(contest)).status, 'defended', 'statut inchangé');
  const tr = await territoryRow(territory);
  eq(tr.owner_id, OWNER, 'le défenseur garde sa zone');
  eq(Number(tr.defense_level), 3, 'et sa fortification');
});

// ═══ 5. PLUSIEURS ÉCHÉANCES, ET LA BORNE ═══════════════════════════════════

await t('plusieurs échéances : traitées dans l’ordre des échéances, `p_limit` respecté', async () => {
  const early = await newTerritory();
  const late = await newTerritory();
  await insertContest(early, { expiresAt: '2026-07-27 03:00:00+00' });
  await insertContest(late, { expiresAt: '2026-07-27 04:00:00+00' });

  // Un seul par passage : après une panne, on rattrape dans l'ordre du JEU.
  const first = await resolveAt('2026-07-27 05:00:00+00', 1);
  eq(first.length, 1, 'la borne p_limit borne réellement');
  eq(first[0].out_territory_id, early, 'la plus ancienne échéance d’abord');
  eq((await territoryRow(late)).owner_id, OWNER, 'la seconde attend le passage suivant');

  const second = await resolveAt('2026-07-27 05:05:00+00', 1);
  eq(second.length, 1, 'le passage suivant reprend le reste');
  eq(second[0].out_territory_id, late, 'et c’est bien la seconde');
});

await t('une limite nulle ou négative ne fait rien, et ne casse pas le job', async () => {
  const territory = await newTerritory();
  const contest = await insertContest(territory);
  eq((await resolveAt('2026-07-27 02:05:00+00', 0)).length, 0, 'limite 0');
  eq((await resolveAt('2026-07-27 02:05:00+00', -5)).length, 0, 'limite négative');
  eq((await territoryRow(territory)).owner_id, OWNER, 'rien n’a bougé');
  // …et le territoire reste transférable au passage normal suivant.
  const out = await resolveAt('2026-07-27 02:05:00+00');
  ok(out.some((r) => r.out_contest_id === contest), 'reprise normale au passage suivant');
});

// ═══ 6. L'ASSAILLANT CREW (LOT 7, mais la contrainte doit déjà tenir) ═══════

await t('un assaillant CREW produit `owned_crew` (0074 refuserait owned_personal)', async () => {
  const territory = await newTerritory();
  await insertContest(territory, { attackerType: 'crew', attackerId: CREW });
  const out = await resolveAt('2026-07-27 02:05:00+00');
  eq(out.length, 1, 'transfert au crew');
  const tr = await territoryRow(territory);
  eq(tr.owner_type, 'crew', 'type de propriétaire');
  eq(tr.owner_id, CREW, 'le crew assaillant');
  eq(tr.state, 'owned_crew', 'état cohérent avec territories_state_owner_type');
});

// ═══ 7. QUI PEUT APPELER LE JOB ════════════════════════════════════════════

await t('anon et authenticated ne peuvent PAS exécuter le job ; service_role oui', async () => {
  const r = await db.query(`
    select
      has_function_privilege('anon', 'public.resolve_due_contests(timestamptz, integer)', 'execute') as anon,
      has_function_privilege('authenticated', 'public.resolve_due_contests(timestamptz, integer)', 'execute') as auth,
      has_function_privilege('service_role', 'public.resolve_due_contests(timestamptz, integer)', 'execute') as svc
  `);
  eq(r.rows[0].anon, false, 'anon ne doit pas pouvoir déclencher une résolution');
  eq(r.rows[0].auth, false, 'un joueur choisirait le moment où il gagne');
  eq(r.rows[0].svc, true, 'le seul appelant légitime');
});

await t('la fonction est SECURITY DEFINER avec un search_path figé', async () => {
  const r = await db.query(`
    select p.prosecdef, p.proconfig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'resolve_due_contests'
  `);
  eq(r.rows.length, 1, 'la fonction existe, une seule fois');
  eq(r.rows[0].prosecdef, true, 'security definer');
  ok(
    (r.rows[0].proconfig ?? []).some((c) => c.startsWith('search_path=')),
    'search_path figé (sinon un schéma injecté détournerait les tables)',
  );
});

// ═══ 8. LA COMPATIBILITÉ QU'ON A PROMISE : hex_claims N'EST PAS TOUCHÉE ════

await t('le job ne touche PAS hex_claims (la propriété opérationnelle reste hexagonale)', async () => {
  const sql = readFileSync(join(MIGRATIONS, '0080_resolve_contests.sql'), 'utf8');
  const code = sql
    .split('\n')
    .filter((l) => !l.trimStart().startsWith('--'))
    .join('\n');
  ok(!/update\s+public\.hex_claims/i.test(code), '0080 ne doit écrire dans aucune cellule');
  ok(!/insert\s+into\s+public\.hex_claims/i.test(code), '0080 ne doit créer aucune cellule');
});

// ─── Verdict ────────────────────────────────────────────────────────────────
console.log(`\n${passed} ok, ${failures.length} échec(s)`);
process.exit(failures.length === 0 ? 0 : 1);
