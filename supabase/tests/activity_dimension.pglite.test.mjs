#!/usr/bin/env node
/**
 * GRYD — test EXÉCUTABLE de la migration 0070 (`activity` : deux disciplines,
 * deux univers — planche E14).
 *
 * ═══ POURQUOI CE FICHIER EXISTE ═════════════════════════════════════════════
 * Tout ce qui empêche un cycliste de VOLER la zone d'un coureur vit en SQL : la
 * clé primaire composite `(h3index, activity)`, le `on conflict (h3index,
 * activity)` de `claim_hexes`, l'upsert `season_scores` par discipline et le
 * garde-fou de decay. Les 1 080 tests Deno couvrent les fonctions PURES et ne
 * touchent pas une ligne de plpgsql : sans ce fichier, la séparation des mondes
 * serait une INTENTION, pas un mécanisme.
 *
 * Docker n'est pas disponible sur la machine du fondateur (donc pas de
 * `npx supabase start`). PGlite — Postgres compilé en WASM — exécute le VRAI
 * SQL des migrations dans Node, sans démon. Même harnais que
 * `steal_push_queue.pglite.test.mjs` (0056/0057/0058).
 *
 * ═══ CE QUE CE TEST PROUVE ══════════════════════════════════════════════════
 *  1. L'HISTOIRE N'EST PAS RÉÉCRITE : une course et un hexagone capturés AVANT
 *     la migration (par la RPC 5-args d'origine) gardent leur propriétaire,
 *     leurs points et leur sens, et portent `activity = 'run'`.
 *  2. LE MÊME HEXAGONE tenu SIMULTANÉMENT par un coureur et par un cycliste :
 *     deux lignes, deux propriétaires, aucun vol.
 *  3. Un claim `bike` ne touche JAMAIS la ligne `run` (ni owner, ni lock, ni
 *     decay, ni claimed_at) — et réciproquement.
 *  4. DISCIPLINE ABSENTE ⇒ `run` : la RPC appelée sans `p_activity` se comporte
 *     exactement comme avant le vélo.
 *  5. Une discipline INCONNUE lève, elle n'est jamais repliée en silence.
 *  6. LES POINTS NE SONT JAMAIS SOMMÉS : `season_scores` porte deux lignes.
 *  7. La signature 5-args est DROPÉE (pas d'ambiguïté PostgREST `PGRST203`).
 *  8. LA GARDE DE DECAY : un UPDATE écrit par `h3index` SEUL (ce que fait
 *     `decay_job`) ne neutralise QUE la ligne réellement échue.
 *  9. La garde TOCTOU de 0031 continue de juger dans le BON monde.
 * 10. Les agrégats (`player_leaderboard`, `crew_leaderboard`, `sector_control`)
 *     rendent la discipline au lieu d'une somme.
 * 11. Aucune clé étrangère ne référençait `hex_claims` : le swap de clé
 *     primaire n'a rien cassé en cascade (assertion sur `pg_constraint`).
 * 12. LA RPC DE DRAIN REND `activity` : sans ça, la colonne ajoutée à
 *     `steal_push_queue` serait EN ÉCRITURE SEULE et la faute que 0070 dit
 *     empêcher se produirait quand même (défaut de revue adversariale).
 * 13. LE PLAN DU CLASSEMENT DE LIGUE, en volume (20 000 lignes) : l'index de
 *     0002 `(season_id, points desc)` SURVIT — Postgres n'a pas de skip-scan,
 *     donc un index discipliné seul ne peut pas rendre l'ordre d'une requête qui
 *     ne filtre pas la discipline.
 *     ⚠️ DEUX RÉSERVES, écrites plutôt que tues. (a) Les chiffres qui
 *     circulaient (« 0,2 ms → 36 ms sur 30 000 lignes ») ne sont PAS rejouables
 *     ici : `@electric-sql/pglite` n'est pas installé, ce fichier sort 2. Ils
 *     sont donc RAISONNÉS, pas mesurés, tant que le paquet manque. (b) Depuis
 *     que `leagueBoard` filtre `season_id + activity`, PLUS AUCUN lecteur du
 *     dépôt n'émet le prédicat que cet invariant teste : il garde une valeur de
 *     ROLLBACK (revenir à une lecture non disciplinée), pas de couverture d'un
 *     chemin vivant. Le dire est le seul moyen qu'un futur lecteur ne le prenne
 *     pas pour la preuve d'un besoin actuel.
 * 14. L'index discipliné, lui, est CHOISI dès que les deux mondes coexistent —
 *     et c'est LUI qui porte la requête chaude d'aujourd'hui.
 *
 * ═══ NON PROUVÉ — dit ici plutôt que laissé croire ══════════════════════════
 *  · LA CONCURRENCE RÉELLE. PGlite est MONO-CONNEXION : on ne peut pas observer
 *    deux ingestions simultanées. Ce qui est testé, c'est la MACHINE À ÉTATS
 *    (les états qu'un concurrent laisserait derrière lui sont fabriqués à la
 *    main), pas le verrou.
 *  · LA RLS ET LES GRANTS. PGlite n'a ni schéma `auth` réel ni rôles Supabase :
 *    le harnais les crée nus. Les `revoke`/`grant` sont EXÉCUTÉS (donc leur
 *    syntaxe et leurs cibles sont vraies) mais leur EFFET n'est pas vérifié.
 *  · LE PLAN D'EXÉCUTION, SAUF POUR season_scores (§8). Sur quelques lignes le
 *    planificateur fait un seqscan quoi qu'il arrive : pour hex_claims et les
 *    satellites, on vérifie que les index EXISTENT avec la bonne définition,
 *    pas qu'ils sont CHOISIS. Le classement de ligue fait exception — c'est la
 *    requête la plus chaude du jeu, et une revue a prouvé qu'une assertion
 *    d'existence n'y voyait RIEN : §8 seede 20 000 lignes et lit le VRAI plan.
 *    Le planificateur de PGlite est celui de Postgres, mais ses constantes de
 *    coût sont celles d'un WASM mono-connexion : ce qui est verrouillé est le
 *    CHOIX D'ACCÈS (Index Scan vs Seq Scan + Sort), jamais un budget en ms.
 *  · LES JOBS hors périmètre (`decay_job`, `season_close`, `digest_job`,
 *    `recompute_sectors`) ne sont pas exécutés ici : leur SQL est du TypeScript.
 *    Le test 8 reproduit LITTÉRALEMENT l'instruction de decay_job:199 pour
 *    prouver le garde-fou, pas le job.
 *
 * ═══ LANCER ═════════════════════════════════════════════════════════════════
 *   mkdir -p /tmp/pglite && cd /tmp/pglite
 *   echo '{"name":"pglite-scratch","private":true}' > package.json
 *   npm i --ignore-scripts @electric-sql/pglite
 *   cd <repo> && GRYD_PGLITE=/tmp/pglite/node_modules/@electric-sql/pglite/dist/index.js \
 *     node supabase/tests/activity_dimension.pglite.test.mjs
 *
 * Sans PGlite, ce fichier sort en CODE 2 avec un message explicite : un test qui
 * n'a pas tourné ne doit JAMAIS ressembler à un test vert. Il n'est donc PAS
 * branché sur `npm run test:functions` (Deno, `--allow-read` seul).
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
      '    node supabase/tests/activity_dimension.pglite.test.mjs',
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
const throws = async (fn, needle, what) => {
  try {
    await fn();
  } catch (err) {
    if (!String(err.message).includes(needle)) {
      throw new Error(`${what} : message inattendu « ${err.message} »`);
    }
    return;
  }
  throw new Error(`${what} : aucune exception levée`);
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

// Le socle que Supabase fournit et qu'un Postgres nu n'a pas. On le crée pour
// exécuter les migrations SANS LES MODIFIER — c'est tout l'intérêt.
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
`);

// ── PHASE 1 : le monde AVANT le vélo (migrations d'origine, non modifiées) ───
// `cron.schedule` (extension pg_cron) est hors sujet ici : on coupe à cette
// instruction, tout ce qui la précède est exécuté tel quel.
const CRON = 'select cron.schedule(';
for (const [file, cut] of [
  ['0002_schema.sql'],
  ['0006_notifications.sql'],
  ['0007_badges_catalog.sql'],
  ['0008_all_badges_live.sql'],
  ['0009_badges_v2.sql'],
  ['0010_crews_supercell.sql'],
  ['0011_social.sql'],
  ['0015_partial_boundaries.sql'],
  ['0017_zone_defense.sql'],
  // La LIGNÉE COMPLÈTE de claim_hexes doit être rejouée, y compris les
  // migrations qui DROPENT les signatures périmées (0018, 0032) : sans elles la
  // base de test porte des surcharges que la production n'a plus, et le test de
  // non-ambiguïté PostgREST mentirait dans les deux sens.
  ['0018_xp_d18_fix.sql'],
  ['0029_moderation.sql'],
  ['0031_claim_toctou_guard.sql'],
  ['0032_drop_stale_claim_hexes_4arg.sql'],
  ['0041_co_captures.sql'],
  ['0046_account_deletion_grace.sql', CRON],
  ['0056_steal_push_queue.sql', CRON],
  // 0057/0058 définissent les RPC de drain du vol (`returns table` explicite).
  // On les charge pour PROUVER que la colonne `activity` ajoutée par 0070 à
  // `steal_push_queue` ne casse pas leur contrat — un ajout de colonne est
  // additif en théorie, on le vérifie plutôt que de l'affirmer.
  ['0057_steal_push_reservation.sql'],
  ['0058_steal_push_completeness.sql'],
]) {
  await db.exec(migration(file, cut));
}

// ─── Acteurs ─────────────────────────────────────────────────────────────────
const RUNNER = '11111111-1111-1111-1111-111111111111';
const CYCLIST = '22222222-2222-2222-2222-222222222222';
const RIVAL = '33333333-3333-3333-3333-333333333333';
const CITY = 'paris';
// Un h3index arbitraire mais STABLE : c'est LE même hexagone dans les deux
// mondes, c'est tout le sujet du test.
const HEX = 613196750582120448n;
const HEX2 = 613196750582120449n;

await db.exec(`
  insert into auth.users (id) values
    ('${RUNNER}'), ('${CYCLIST}'), ('${RIVAL}');
  insert into public.city_zones (city_id, name, geojson, status)
    values ('${CITY}', 'Paris', '{}'::jsonb, 'active');
  insert into public.users (id, pseudo, city_id) values
    ('${RUNNER}',  'coureur',  '${CITY}'),
    ('${CYCLIST}', 'cycliste', '${CITY}'),
    ('${RIVAL}',   'rival',    '${CITY}');
  insert into public.seasons (city_id, starts_at, ends_at, status)
    values ('${CITY}', now() - interval '7 days', now() + interval '30 days', 'active');
`);

const newRun = async (userId, label) => {
  const r = await db.query(
    `insert into public.runs (user_id, client_run_id, source, started_at,
                              distance_m, duration_s, status)
     values ($1, gen_random_uuid(), 'gps', now(), 5000, 1800, 'valid')
     returning id`,
    [userId],
  );
  return r.rows[0].id;
};

// ── L'HISTOIRE : une capture faite AVANT la migration, par la RPC d'ORIGINE ──
// C'est le cœur de « une migration ne réécrit jamais l'histoire » : cette ligne
// existe, elle a un propriétaire et des points, et rien de ce qui suit ne doit
// changer son sens.
const legacyRun = await newRun(RUNNER);
await db.query(
  `select public.claim_hexes($1, $2, $3, $4::jsonb, $5)`,
  [
    legacyRun,
    RUNNER,
    CITY,
    JSON.stringify([{ h3index: HEX.toString(), outcome: 'neutral', points: 10 }]),
    10,
  ],
);
const legacyBefore = (await db.query(
  'select owner_user_id, claim_type, claimed_at from public.hex_claims where h3index = $1',
  [HEX.toString()],
)).rows[0];
const legacyPointsBefore = (await db.query(
  'select points from public.season_scores where user_id = $1',
  [RUNNER],
)).rows[0];

// ── PHASE 2 : LA MIGRATION ───────────────────────────────────────────────────
await db.exec(migration('0070_activity_dimension.sql'));

console.log('0070 — deux disciplines, deux univers (E14) sur PGlite\n');

// ═══ 1. L'histoire n'est pas réécrite ════════════════════════════════════════

await t('un claim acquis AVANT la migration garde son propriétaire et ses points', async () => {
  const after = (await db.query(
    'select owner_user_id, claim_type, claimed_at, activity from public.hex_claims where h3index = $1',
    [HEX.toString()],
  )).rows[0];
  eq(after.owner_user_id, legacyBefore.owner_user_id, 'propriétaire');
  eq(after.claim_type, legacyBefore.claim_type, 'type de claim');
  eq(
    new Date(after.claimed_at).toISOString(),
    new Date(legacyBefore.claimed_at).toISOString(),
    'horodatage de capture',
  );
  eq(after.activity, 'run', 'discipline rétro-remplie');
  const pts = (await db.query(
    'select points, activity from public.season_scores where user_id = $1',
    [RUNNER],
  )).rows;
  eq(pts.length, 1, 'une seule ligne de score');
  eq(Number(pts[0].points), Number(legacyPointsBefore.points), 'points de saison');
  eq(pts[0].activity, 'run', 'discipline du score rétro-remplie');
});

await t('les courses déjà ingérées sont de la COURSE À PIED, pas des inconnues', async () => {
  const r = (await db.query('select activity from public.runs where id = $1', [legacyRun])).rows[0];
  eq(r.activity, 'run', 'runs.activity');
});

await t('aucune clé étrangère ne référençait hex_claims (swap de PK sans cascade)', async () => {
  const r = await db.query(`
    select count(*)::int as n
    from pg_constraint c
    join pg_class t on t.oid = c.confrelid
    where c.contype = 'f' and t.relname = 'hex_claims'
  `);
  eq(r.rows[0].n, 0, 'FK pointant vers hex_claims');
});

await t('la clé primaire de hex_claims est bien (h3index, activity)', async () => {
  const r = await db.query(`
    select string_agg(a.attname, ',' order by k.ord) as cols
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    cross join lateral unnest(c.conkey) with ordinality as k(attnum, ord)
    join pg_attribute a on a.attrelid = t.oid and a.attnum = k.attnum
    where c.contype = 'p' and t.relname = 'hex_claims'
    group by c.oid
  `);
  eq(r.rows[0].cols, 'h3index,activity', 'colonnes de la PK');
});

// ═══ 2. Deux mondes sur le même hexagone ═════════════════════════════════════

await t('le MÊME hexagone est tenu par un coureur ET un cycliste, sans conflit', async () => {
  const bikeRun = await newRun(CYCLIST);
  const res = (await db.query(
    'select public.claim_hexes($1, $2, $3, $4::jsonb, $5, $6) as r',
    [
      bikeRun,
      CYCLIST,
      CITY,
      JSON.stringify([{ h3index: HEX.toString(), outcome: 'neutral', points: 7 }]),
      7,
      'bike',
    ],
  )).rows[0].r;
  eq(res.applied, 1, 'claims appliqués');
  eq(res.skipped, 0, 'claims sautés');
  eq(res.activity, 'bike', 'discipline rendue par la RPC');

  const rows = (await db.query(
    'select activity, owner_user_id from public.hex_claims where h3index = $1 order by activity',
    [HEX.toString()],
  )).rows;
  eq(rows.length, 2, 'lignes sur cet hexagone');
  eq(rows[0].activity, 'bike', 'monde 1');
  eq(rows[0].owner_user_id, CYCLIST, 'propriétaire vélo');
  eq(rows[1].activity, 'run', 'monde 2');
  eq(rows[1].owner_user_id, RUNNER, 'propriétaire course — INCHANGÉ');
});

await t("le claim vélo n'a touché NI le lock NI le decay NI l'horodatage du coureur", async () => {
  const run = (await db.query(
    `select claimed_at, locked_until, decay_at, claim_type
     from public.hex_claims where h3index = $1 and activity = 'run'`,
    [HEX.toString()],
  )).rows[0];
  eq(
    new Date(run.claimed_at).toISOString(),
    new Date(legacyBefore.claimed_at).toISOString(),
    'claimed_at du coureur',
  );
  eq(run.claim_type, legacyBefore.claim_type, 'claim_type du coureur');
  ok(run.locked_until === null, 'locked_until du coureur inchangé (null)');
  ok(run.decay_at === null, 'decay_at du coureur inchangé (null)');
});

await t('un vol en vélo ne vole que le cycliste, jamais le coureur', async () => {
  const rivalRun = await newRun(RIVAL);
  await db.query(
    'select public.claim_hexes($1, $2, $3, $4::jsonb, $5, $6)',
    [
      rivalRun,
      RIVAL,
      CITY,
      JSON.stringify([
        { h3index: HEX.toString(), outcome: 'steal', points: 12, expected_owner: CYCLIST },
      ]),
      12,
      'bike',
    ],
  );
  const rows = (await db.query(
    'select activity, owner_user_id, claim_type from public.hex_claims where h3index = $1 order by activity',
    [HEX.toString()],
  )).rows;
  eq(rows[0].owner_user_id, RIVAL, 'le vélo a changé de mains');
  eq(rows[0].claim_type, 'stolen', 'type du vol');
  eq(rows[1].owner_user_id, RUNNER, 'la course est INTACTE');
  eq(rows[1].claim_type, 'neutral', 'type de la course inchangé');
});

await t('la garde TOCTOU (0031) juge dans le BON monde', async () => {
  // Le moteur a observé « personne » sur le monde BIKE de HEX2 ; il n'y a
  // effectivement rien → l'insert passe.
  const r1 = await newRun(CYCLIST);
  const a = (await db.query(
    'select public.claim_hexes($1, $2, $3, $4::jsonb, $5, $6) as r',
    [r1, CYCLIST, CITY, JSON.stringify([{ h3index: HEX2.toString(), outcome: 'neutral', points: 3 }]), 3, 'bike'],
  )).rows[0].r;
  eq(a.applied, 1, 'capture vélo sur hexagone neutre');

  // Un second coureur croit HEX2 neutre en COURSE — il l'est (le vélo ne
  // compte pas) : la garde ne doit pas confondre les deux mondes.
  const r2 = await newRun(RUNNER);
  const b = (await db.query(
    'select public.claim_hexes($1, $2, $3, $4::jsonb, $5) as r',
    [r2, RUNNER, CITY, JSON.stringify([{ h3index: HEX2.toString(), outcome: 'neutral', points: 4 }]), 4],
  )).rows[0].r;
  eq(b.applied, 1, 'capture course sur le même hexagone');

  // En revanche, une observation PÉRIMÉE dans son propre monde est bien rejetée.
  const r3 = await newRun(RIVAL);
  const c = (await db.query(
    'select public.claim_hexes($1, $2, $3, $4::jsonb, $5, $6) as r',
    [
      r3,
      RIVAL,
      CITY,
      JSON.stringify([
        { h3index: HEX2.toString(), outcome: 'steal', points: 9, expected_owner: RUNNER },
      ]),
      9,
      'bike', // owner réel du monde bike = CYCLIST, pas RUNNER → conflit
    ],
  )).rows[0].r;
  eq(c.applied, 0, 'claim appliqué malgré une observation périmée');
  eq(c.skipped, 1, 'claim correctement sauté');
});

await t('une défense ne défend QUE sa propre discipline', async () => {
  // Le coureur défend HEX2 (il le possède en course). La ligne vélo (au
  // cycliste) ne doit pas bouger d'un iota.
  const bikeBefore = (await db.query(
    `select owner_user_id, last_defended_at from public.hex_claims
     where h3index = $1 and activity = 'bike'`,
    [HEX2.toString()],
  )).rows[0];
  const r = await newRun(RUNNER);
  const res = (await db.query(
    'select public.claim_hexes($1, $2, $3, $4::jsonb, $5) as r',
    [r, RUNNER, CITY, JSON.stringify([{ h3index: HEX2.toString(), outcome: 'defend', points: 2 }]), 2],
  )).rows[0].r;
  eq(res.applied, 1, 'défense appliquée en course');
  const bikeAfter = (await db.query(
    `select owner_user_id, last_defended_at from public.hex_claims
     where h3index = $1 and activity = 'bike'`,
    [HEX2.toString()],
  )).rows[0];
  eq(bikeAfter.owner_user_id, bikeBefore.owner_user_id, 'propriétaire vélo');
  eq(
    new Date(bikeAfter.last_defended_at).toISOString(),
    new Date(bikeBefore.last_defended_at).toISOString(),
    'last_defended_at vélo',
  );
});

await t("une défense dans le mauvais monde n'écrit RIEN (et ne crédite RIEN)", async () => {
  // Le cycliste ne possède PAS HEX2 en course : sa « défense » course ne doit
  // trouver aucune ligne — ni la sienne (vélo), ni celle du coureur.
  const r = await newRun(CYCLIST);
  const res = (await db.query(
    'select public.claim_hexes($1, $2, $3, $4::jsonb, $5) as r',
    [r, CYCLIST, CITY, JSON.stringify([{ h3index: HEX2.toString(), outcome: 'defend', points: 50 }]), 50],
  )).rows[0].r;
  eq(res.applied, 0, 'claims appliqués');
  eq(res.skipped, 1, 'claims sautés');
  eq(res.points_total, 0, 'points crédités');
});

// ═══ 3. Rétro-compatibilité de la RPC ════════════════════════════════════════

await t('discipline ABSENTE ⇒ course à pied (comportement d’avant, à l’identique)', async () => {
  const HEX3 = 613196750582120450n;
  const r = await newRun(RUNNER);
  await db.query(
    'select public.claim_hexes($1, $2, $3, $4::jsonb, $5)',
    [r, RUNNER, CITY, JSON.stringify([{ h3index: HEX3.toString(), outcome: 'neutral', points: 5 }]), 5],
  );
  const row = (await db.query(
    'select activity, owner_user_id from public.hex_claims where h3index = $1',
    [HEX3.toString()],
  )).rows;
  eq(row.length, 1, 'lignes créées');
  eq(row[0].activity, 'run', 'discipline par défaut');
});

await t("l'appel 4-args (completeBoundaries) fonctionne toujours, en course", async () => {
  const HEX4 = 613196750582120451n;
  const r = await newRun(RUNNER);
  const res = (await db.query(
    'select public.claim_hexes($1, $2, $3, $4::jsonb) as r',
    [r, RUNNER, CITY, JSON.stringify([{ h3index: HEX4.toString(), outcome: 'neutral', points: 6 }])],
  )).rows[0].r;
  eq(res.applied, 1, 'claim appliqué');
  eq(res.activity, 'run', 'discipline par défaut');
});

await t('une discipline INCONNUE lève — jamais un repli silencieux', async () => {
  const r = await newRun(RUNNER);
  await throws(
    () =>
      db.query('select public.claim_hexes($1, $2, $3, $4::jsonb, $5, $6)', [
        r,
        RUNNER,
        CITY,
        JSON.stringify([{ h3index: '1', outcome: 'neutral', points: 1 }]),
        1,
        'scooter',
      ]),
    'unknown activity',
    'discipline inconnue',
  );
});

await t('la signature 5-args est DROPÉE (pas d’ambiguïté PostgREST)', async () => {
  const r = await db.query(`
    select count(*)::int as n
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'claim_hexes'
  `);
  eq(r.rows[0].n, 1, 'surcharges vivantes de claim_hexes');
});

// ═══ 4. Les points ne sont JAMAIS sommés ═════════════════════════════════════

await t('un athlète HYBRIDE a deux scores côte à côte, jamais une somme', async () => {
  // Le cycliste court aussi : c'est le cas que E14 nomme (« crews hybrides =
  // deux métriques côte à côte, JAMAIS SOMMÉES »).
  const bikeBefore = Number((await db.query(
    `select points from public.season_scores where user_id = $1 and activity = 'bike'`,
    [CYCLIST],
  )).rows[0].points);
  const HEX5 = 613196750582120452n;
  const r = await newRun(CYCLIST);
  await db.query(
    'select public.claim_hexes($1, $2, $3, $4::jsonb, $5)',
    [r, CYCLIST, CITY, JSON.stringify([{ h3index: HEX5.toString(), outcome: 'neutral', points: 21 }]), 21],
  );
  const rows = (await db.query(
    `select activity, points from public.season_scores
     where user_id = $1 order by activity`,
    [CYCLIST],
  )).rows;
  eq(rows.length, 2, 'lignes de score de l’athlète hybride');
  eq(rows[0].activity, 'bike', 'première discipline');
  eq(rows[1].activity, 'run', 'seconde discipline');
  eq(Number(rows[0].points), bikeBefore, 'le score vélo n’a pas bougé d’un point');
  eq(Number(rows[1].points), 21, 'le score course vaut ses propres points, pas la somme');
});

await t('la clé primaire de season_scores porte la discipline', async () => {
  const r = await db.query(`
    select string_agg(a.attname, ',' order by k.ord) as cols
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    cross join lateral unnest(c.conkey) with ordinality as k(attnum, ord)
    join pg_attribute a on a.attrelid = t.oid and a.attnum = k.attnum
    where c.contype = 'p' and t.relname = 'season_scores'
    group by c.oid
  `);
  eq(r.rows[0].cols, 'season_id,user_id,activity', 'colonnes de la PK');
});

// ═══ 4bis. L'idempotence n'a pas bougé ═══════════════════════════════════════

await t(
  'idempotence INTACTE : la discipline n’entre PAS dans la clé (user, clientRunId)',
  async () => {
    const clientRunId = '99999999-9999-9999-9999-999999999999';
    await db.query(
      `insert into public.runs (user_id, client_run_id, source, started_at,
                                distance_m, duration_s, status, activity)
       values ($1, $2, 'gps', now(), 5000, 1800, 'valid', 'run')`,
      [RUNNER, clientRunId],
    );
    // Un retry qui déclarerait (par bug client) une AUTRE discipline doit
    // toujours retomber sur la même course, pas en créer une seconde : la clé
    // d'idempotence (D14) est (user_id, client_run_id) et rien d'autre.
    await throws(
      () =>
        db.query(
          `insert into public.runs (user_id, client_run_id, source, started_at,
                                    distance_m, duration_s, status, activity)
           values ($1, $2, 'gps', now(), 5000, 1800, 'valid', 'bike')`,
          [RUNNER, clientRunId],
        ),
      'runs_user_client_run_unique',
      'contrainte d’idempotence',
    );
    const n = (await db.query(
      'select count(*)::int as n from public.runs where user_id = $1 and client_run_id = $2',
      [RUNNER, clientRunId],
    )).rows[0].n;
    eq(n, 1, 'courses enregistrées pour cette clé');
  },
);

// ═══ 5. Le garde-fou de decay (le danger silencieux) ═════════════════════════

await t(
  'un UPDATE de decay écrit par h3index SEUL ne neutralise QUE la ligne échue',
  async () => {
    const H = 613196750582120460n;
    const rRun = await newRun(RUNNER);
    const rBike = await newRun(CYCLIST);
    // Course : échéance DÉPASSÉE. Vélo : échéance LOINTAINE.
    await db.query(
      'select public.claim_hexes($1, $2, $3, $4::jsonb, $5)',
      [
        rRun,
        RUNNER,
        CITY,
        JSON.stringify([
          {
            h3index: H.toString(),
            outcome: 'neutral',
            points: 1,
            decay_at: new Date(Date.now() - 60_000).toISOString(),
          },
        ]),
        1,
      ],
    );
    await db.query(
      'select public.claim_hexes($1, $2, $3, $4::jsonb, $5, $6)',
      [
        rBike,
        CYCLIST,
        CITY,
        JSON.stringify([
          {
            h3index: H.toString(),
            outcome: 'neutral',
            points: 1,
            decay_at: new Date(Date.now() + 14 * 86_400_000).toISOString(),
          },
        ]),
        1,
        'bike',
      ],
    );

    // L'INSTRUCTION LITTÉRALE de decay_job/index.ts:199 — par h3index, sans
    // discipline. C'est elle qui effacerait le monde vélo sans le garde-fou.
    await db.query(
      `update public.hex_claims
          set owner_user_id = null, crew_color_cache = null, locked_until = null,
              shielded_until = null, decay_at = null, decay_warned_at = null
        where h3index = $1`,
      [H.toString()],
    );

    const rows = (await db.query(
      'select activity, owner_user_id, decay_at from public.hex_claims where h3index = $1 order by activity',
      [H.toString()],
    )).rows;
    eq(rows[0].activity, 'bike', 'ordre des mondes');
    eq(rows[0].owner_user_id, CYCLIST, 'la zone vélo NON échue survit');
    ok(rows[0].decay_at !== null, "l'échéance vélo est intacte");
    eq(rows[1].activity, 'run', 'ordre des mondes');
    eq(rows[1].owner_user_id, null, 'la zone course échue est bien neutralisée');
  },
);

await t('le garde-fou ne bloque JAMAIS une neutralisation légitime', async () => {
  const H = 613196750582120461n;
  const r = await newRun(RUNNER);
  await db.query(
    'select public.claim_hexes($1, $2, $3, $4::jsonb, $5)',
    [
      r,
      RUNNER,
      CITY,
      JSON.stringify([
        {
          h3index: H.toString(),
          outcome: 'neutral',
          points: 1,
          decay_at: new Date(Date.now() - 1000).toISOString(),
        },
      ]),
      1,
    ],
  );
  await db.query(
    `update public.hex_claims set owner_user_id = null, decay_at = null where h3index = $1`,
    [H.toString()],
  );
  const row = (await db.query(
    'select owner_user_id from public.hex_claims where h3index = $1',
    [H.toString()],
  )).rows[0];
  eq(row.owner_user_id, null, 'neutralisation légitime');
});

await t('on ne marque pas « prévenue » une zone qui n’a aucune échéance', async () => {
  const H = 613196750582120462n;
  const r = await newRun(RUNNER);
  await db.query(
    'select public.claim_hexes($1, $2, $3, $4::jsonb, $5)',
    [r, RUNNER, CITY, JSON.stringify([{ h3index: H.toString(), outcome: 'neutral', points: 1 }]), 1],
  );
  await db.query(
    'update public.hex_claims set decay_warned_at = now() where h3index = $1',
    [H.toString()],
  );
  const row = (await db.query(
    'select decay_at, decay_warned_at from public.hex_claims where h3index = $1',
    [H.toString()],
  )).rows[0];
  eq(row.decay_at, null, "la zone n'a pas d'échéance (compte neuf, §3.3)");
  eq(row.decay_warned_at, null, 'aucun avertissement ne peut être marqué');
});

// ═══ 6. Agrégats : la discipline, jamais une somme ═══════════════════════════

await t('player_leaderboard rend la discipline (le lecteur choisit son monde)', async () => {
  const cols = (await db.query(`
    select column_name from information_schema.columns
    where table_schema = 'public' and table_name = 'player_leaderboard'
  `)).rows.map((r) => r.column_name);
  ok(cols.includes('activity'), 'la vue expose `activity`');
  const rows = (await db.query(
    `select activity, points from public.player_leaderboard
     where user_id = $1 order by activity`,
    [CYCLIST],
  )).rows;
  eq(rows.length, 2, 'deux lignes de classement pour un joueur hybride');
});

await t('crew_leaderboard : une ligne par (crew, discipline), jamais une somme', async () => {
  await db.exec(`
    insert into public.crews (id, name, color, city_id, code, created_by)
      values ('44444444-4444-4444-4444-444444444444', 'Crew', 1, '${CITY}', 'ABC123', '${RUNNER}');
    insert into public.crew_members (crew_id, user_id)
      values ('44444444-4444-4444-4444-444444444444', '${CYCLIST}');
  `);
  await db.exec('refresh materialized view public.crew_leaderboard;');
  const rows = (await db.query(
    `select activity, hexes_held, points_total from public.crew_leaderboard
     where crew_id = '44444444-4444-4444-4444-444444444444' order by activity`,
  )).rows;
  eq(rows.length, 2, 'lignes par crew');
  eq(rows[0].activity, 'bike', 'première discipline');
  eq(rows[1].activity, 'run', 'seconde discipline');

  // Vérité de référence lue DIRECTEMENT sur hex_claims, monde par monde : la
  // matview doit rendre CHAQUE monde, jamais leur somme.
  const truth = Object.fromEntries(
    (await db.query(
      `select activity, count(*)::int as n from public.hex_claims
        where owner_user_id = $1 and (decay_at is null or decay_at > now())
        group by activity`,
      [CYCLIST],
    )).rows.map((r) => [r.activity, r.n]),
  );
  const bike = truth.bike ?? 0;
  const run = truth.run ?? 0;
  ok(bike > 0 && run > 0, 'le scénario doit bien être hybride (sinon le test ne prouve rien)');
  eq(Number(rows[0].hexes_held), bike, 'territoire vélo du crew');
  eq(Number(rows[1].hexes_held), run, 'territoire course du crew');
  ok(
    Number(rows[0].hexes_held) !== bike + run && Number(rows[1].hexes_held) !== bike + run,
    'aucune ligne ne rend la SOMME des deux mondes',
  );
});

await t('crew_leaderboard garde un index unique compatible REFRESH CONCURRENTLY', async () => {
  const r = await db.query(`
    select indexdef from pg_indexes
    where schemaname = 'public' and indexname = 'crew_leaderboard_crew_idx'
  `);
  ok(/unique/i.test(r.rows[0].indexdef), 'index unique');
  ok(/activity/.test(r.rows[0].indexdef), 'il porte la discipline');
});

await t('sector_control compte le contrôle PAR discipline', async () => {
  // `information_schema.columns` ignore les vues MATÉRIALISÉES (elles ne sont
  // pas au standard SQL) : on lit le catalogue Postgres directement.
  const cols = (await db.query(`
    select a.attname from pg_attribute a
    join pg_class c on c.oid = a.attrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'sector_control' and a.attnum > 0
  `)).rows.map((r) => r.attname);
  ok(cols.includes('activity'), 'la matview expose `activity`');
  const idx = (await db.query(`
    select indexdef from pg_indexes
    where schemaname = 'public' and indexname = 'sector_control_sector_crew_idx'
  `)).rows[0].indexdef;
  ok(/unique/i.test(idx) && /activity/.test(idx), 'index unique (sector, crew, activity)');
});

// ═══ 7. Index et satellites ══════════════════════════════════════════════════

await t('les index de hex_claims portent la discipline', async () => {
  const rows = (await db.query(`
    select indexname, indexdef from pg_indexes
    where schemaname = 'public' and tablename = 'hex_claims'
  `)).rows;
  const byName = Object.fromEntries(rows.map((r) => [r.indexname, r.indexdef]));
  for (const name of ['hex_claims_city_idx', 'hex_claims_sector_idx', 'hex_claims_owner_idx']) {
    ok(byName[name] !== undefined, `${name} existe`);
    ok(/activity/.test(byName[name]), `${name} porte la discipline`);
  }
  // Le balayage de decay reste TOUTES disciplines : une échéance est une
  // échéance. Le discriminer ralentirait un job qui n'en a pas besoin.
  ok(!/activity/.test(byName['hex_claims_decay_idx'] ?? ''), 'hex_claims_decay_idx reste commun');
});

await t('les satellites clés par h3index portent tous la discipline', async () => {
  const tables = [
    'hex_co_captures',
    'partial_boundaries',
    'steal_push_queue',
    'contested_group_runs',
    'outposts',
    'routes',
    'runs',
  ];
  for (const table of tables) {
    const r = await db.query(
      `select column_default, is_nullable from information_schema.columns
       where table_schema = 'public' and table_name = $1 and column_name = 'activity'`,
      [table],
    );
    ok(r.rows.length === 1, `${table}.activity existe`);
    eq(r.rows[0].is_nullable, 'NO', `${table}.activity non nullable`);
    ok(
      String(r.rows[0].column_default).includes("'run'"),
      `${table}.activity vaut « run » pour tout l'existant`,
    );
  }
});

await t('le drain de vol REND la discipline (colonne jamais en écriture seule)', async () => {
  // Ajouter une colonne à `steal_push_queue` est additif EN THÉORIE : les RPC
  // déclarent `returns table (...)` en colonnes explicites. On l'exécute plutôt
  // que de l'affirmer — c'est la seule preuve qui vaille.
  //
  // CE QUE CE TEST VERROUILLE (défaut de revue) : tant que
  // `claim_steal_push_batch` ne DÉCLARAIT pas `activity` dans son `returns
  // table`, la colonne était EN ÉCRITURE SEULE — et la faute que 0070 dit
  // empêcher (« un coureur reçoit "reprends ta zone" pour un hexagone qu'il
  // tient toujours en courant ») se produisait quand même. Écrire la colonne
  // sans la rendre lisible ne prévient de rien.
  await db.query(
    `insert into public.steal_push_queue (victim_user_id, thief_user_id, h3index, activity)
     values ($1, $2, 777, 'bike')`,
    [RUNNER, CYCLIST],
  );
  const claimed = (await db.query(
    'select * from public.claim_steal_push_batch($1, $2, $3)',
    [500, new Date().toISOString(), 30],
  )).rows;
  eq(claimed.length, 1, 'lignes réservées par le drain');
  ok(
    Object.prototype.hasOwnProperty.call(claimed[0], 'activity'),
    'la RPC DÉCLARE `activity` dans son contrat de sortie',
  );
  eq(claimed[0].activity, 'bike', 'la RPC rend le MONDE où la zone a été perdue');
  // Le reste du contrat 0058 ne bouge pas d'une colonne : le consommateur
  // (steal_push_job) lit encore id/victim/thief/h3index/stolen_at/last_pushed_at.
  for (const col of ['id', 'victim_user_id', 'thief_user_id', 'h3index', 'stolen_at', 'last_pushed_at']) {
    ok(
      Object.prototype.hasOwnProperty.call(claimed[0], col),
      `le contrat 0058 conserve « ${col} »`,
    );
  }
  const row = (await db.query(
    'select activity, reserved_at from public.steal_push_queue where h3index = 777',
  )).rows[0];
  eq(row.activity, 'bike', 'la discipline du vol est conservée');
  ok(row.reserved_at !== null, 'la réservation a bien eu lieu');
});

await t('la RPC de drain n’a PAS de surcharge (pas d’ambiguïté PostgREST)', async () => {
  // 0070 la REDÉFINIT (drop + create : Postgres refuse de changer le type de
  // retour d'un `returns table`). Une signature d'arguments identique + un drop
  // préalable = exactement UNE fonction vivante. Deux ⇒ `PGRST203` sur tout
  // appel PostgREST.
  const r = await db.query(`
    select count(*)::int as n
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'claim_steal_push_batch'
  `);
  eq(r.rows[0].n, 1, 'une seule surcharge de claim_steal_push_batch');
});

await t('la discipline est bornée à ce que le jeu connaît (jamais du texte libre)', async () => {
  await throws(
    () =>
      db.query(
        `insert into public.hex_claims (h3index, activity, owner_user_id, claim_type)
         values (999, 'scooter', $1, 'neutral')`,
        [RUNNER],
      ),
    'activity_check',
    'contrainte de discipline',
  );
});

// ═══ 8. LE PLAN D'EXÉCUTION DU CLASSEMENT (pas seulement l'existence d'index) ═
// L'en-tête de ce fichier dit « on vérifie que les index EXISTENT, pas qu'ils
// sont CHOISIS » — c'est vrai sur quelques lignes. Ce bloc-ci fait l'inverse EN
// VOLUME, parce qu'une revue a prouvé qu'un index mal ordonné dégradait la
// requête la plus chaude du jeu SANS qu'aucune assertion d'existence bronche.

await t('les DEUX index de season_scores existent (l’ancien n’est pas remplacé)', async () => {
  const rows = (await db.query(`
    select indexname, indexdef from pg_indexes
    where schemaname = 'public' and tablename = 'season_scores'
  `)).rows;
  const byName = Object.fromEntries(rows.map((r) => [r.indexname, r.indexdef]));
  ok(byName['season_scores_points_idx'] !== undefined, 'l’index de 0002 SURVIT à 0070');
  ok(
    !/activity/.test(byName['season_scores_points_idx']),
    'il reste SANS discipline (sinon le classement de ligue perd son ordre)',
  );
  ok(
    /activity/.test(byName['season_scores_activity_points_idx'] ?? ''),
    'l’index discipliné existe À CÔTÉ',
  );
});

await t('le classement de ligue reste un Index Scan borné (jamais Seq Scan + Sort)', async () => {
  // 20 000 scores sur la saison active : au-delà de quelques centaines de
  // lignes, le planificateur cesse de faire semblant et choisit vraiment.
  const N = 20000;
  const sid = (await db.query(`select id from public.seasons limit 1`)).rows[0].id;
  await db.exec(`
    insert into auth.users (id)
      select ('00000000-0000-4000-9000-' || lpad(g::text, 12, '0'))::uuid
      from generate_series(1, ${N}) g;
    insert into public.users (id, pseudo, city_id)
      select ('00000000-0000-4000-9000-' || lpad(g::text, 12, '0'))::uuid,
             'plan' || g, '${CITY}'
      from generate_series(1, ${N}) g;
    insert into public.season_scores (season_id, user_id, points)
      select '${sid}',
             ('00000000-0000-4000-9000-' || lpad(g::text, 12, '0'))::uuid,
             ((g::bigint * 7919) % 100000)::integer
      from generate_series(1, ${N}) g;
    analyze public.season_scores; analyze public.users; analyze public.seasons;
  `);

  // La requête RÉELLE du produit : apps/mobile/src/features/social/leagueBoard.ts
  // (vue player_leaderboard, filtre season_id SEUL, tri points desc, limite 50).
  // Elle n'a AUCUN prédicat sur `activity` — et Postgres n'a pas de skip-scan.
  const plan = (await db.query(`
    explain (analyze, buffers)
    select user_id, pseudo, points
      from public.player_leaderboard
     where season_id = '${sid}'
     order by points desc
     limit 50
  `)).rows.map((r) => r['QUERY PLAN']).join('\n');

  ok(
    /Index Scan using season_scores_points_idx/.test(plan),
    `l’ordre vient de l’index, pas d’un tri.\n--- plan ---\n${plan}`,
  );
  ok(
    !/Sort Key: ss\.points/.test(plan),
    `aucun tri de toute la saison pour n’en garder que 50.\n--- plan ---\n${plan}`,
  );
  ok(
    !/Seq Scan on season_scores/.test(plan),
    `aucun balayage complet de season_scores.\n--- plan ---\n${plan}`,
  );
});

await t('un lecteur DISCIPLINÉ trouve son propre index quand les deux mondes existent', async () => {
  // Tant que 100 % des lignes sont 'run', `activity = 'run'` a une sélectivité
  // de 1 et le planificateur garde À RAISON l'index sans discipline + filtre.
  // On fabrique donc le monde d'après : autant de lignes vélo que de course.
  const N = 20000;
  const sid = (await db.query(`select id from public.seasons limit 1`)).rows[0].id;
  await db.exec(`
    insert into public.season_scores (season_id, user_id, activity, points)
      select '${sid}',
             ('00000000-0000-4000-9000-' || lpad(g::text, 12, '0'))::uuid,
             'bike', ((g::bigint * 104729) % 100000)::integer
      from generate_series(1, ${N}) g;
    analyze public.season_scores;
  `);
  const plan = (await db.query(`
    explain (analyze, buffers)
    select user_id, points
      from public.season_scores
     where season_id = '${sid}' and activity = 'run'
     order by points desc
     limit 50
  `)).rows.map((r) => r['QUERY PLAN']).join('\n');
  ok(
    /Index Scan using season_scores_activity_points_idx/.test(plan),
    `le lecteur d’UN monde utilise l’index discipliné.\n--- plan ---\n${plan}`,
  );

  // Et le lecteur SANS discipline (le produit d'aujourd'hui) n'est pas dégradé
  // par l'arrivée du vélo : il garde son Index Scan.
  const planAll = (await db.query(`
    explain (analyze, buffers)
    select user_id, pseudo, points
      from public.player_leaderboard
     where season_id = '${sid}'
     order by points desc
     limit 50
  `)).rows.map((r) => r['QUERY PLAN']).join('\n');
  ok(
    /Index Scan using season_scores_points_idx/.test(planAll),
    `le classement toutes disciplines reste indexé.\n--- plan ---\n${planAll}`,
  );
});

// ─── Verdict ─────────────────────────────────────────────────────────────────
console.log(`\n${passed} ok, ${failures.length} échec(s)`);
if (failures.length > 0) {
  for (const f of failures) console.error(`\n${f.name}\n${f.err.stack}`);
  process.exit(1);
}
