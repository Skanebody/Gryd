#!/usr/bin/env node
/**
 * GRYD — test EXÉCUTABLE de la migration 0081 (`anticheat_reviews`,
 * `anticheat_appeals`). LOT 9 : la revue anti-triche et le droit d'appel
 * (spec §11.3, §11.4).
 *
 * ═══ POURQUOI CE FICHIER EXISTE ═════════════════════════════════════════════
 * 0081 ne contient AUCUN TypeScript : deux tables, des CHECK, quatre index,
 * quatre policies, deux triggers, et — le point le plus important — des
 * privilèges de COLONNE. Les tests Deno du dépôt ne touchent pas une ligne de
 * DDL : sans ce fichier, « un joueur ne peut pas écrire la décision de son
 * propre appel » resterait une phrase dans un commentaire.
 *
 * Et c'est bien LA promesse qu'il fallait mesurer. `grant insert (review_id,
 * user_id, message)` est le genre de ligne qu'un futur chantier « corrige » en
 * `grant insert` tout court, sans rien casser de visible : la faute ne se voit
 * pas à la relecture, elle se voit le jour où quelqu'un dépose un appel déjà
 * marqué `closed` / `overturned` et se rend justice tout seul.
 *
 * Docker est indisponible sur cette machine (pas de `npx supabase start`).
 * PGlite — Postgres compilé en WASM — exécute le VRAI SQL des migrations dans
 * Node. Même harnais que `territory_contests.pglite.test.mjs`.
 *
 * ═══ CE QUE CE TEST PROUVE ══════════════════════════════════════════════════
 *  1. 0081 s'applique sur un Postgres réel, telle quelle, par-dessus la LIGNÉE
 *     COMPLÈTE des migrations (0002 → 0080) — pas sur une maquette de schéma.
 *  2. Chaque CHECK refuse ce qu'il annonce : décision système inconnue, `PASS`
 *     et `PASS_WITH_EXCLUSIONS` refusés (une revue n'existe que pour une capture
 *     NON créditée), score hors [0, 100], `signals` qui n'est pas un tableau,
 *     clôture sans date, décision sans clôture, clôture sans décision, date de
 *     clôture antérieure à l'ouverture, message d'appel trop long.
 *  3. Les BORNES 0 et 100 du score sont ACCEPTÉES.
 *  4. UNE revue par course, UN appel par revue.
 *  5. Les quatre index existent et ont la bonne FORME (partiels sur les
 *     dossiers non clos pour les deux files, non partiels pour la lecture du
 *     joueur).
 *  6. RLS activée sur les deux tables ; les quatre policies existent et
 *     nomment ce qu'elles doivent nommer ; l'écriture client est réduite à
 *     l'INSERT d'appel, sur TROIS colonnes et pas une de plus.
 *  7. Cascades : purger la course emporte la revue, purger la revue emporte
 *     l'appel, supprimer un opérateur n'efface PAS la décision rendue.
 *  8. `updated_at` bouge tout seul, sur les deux tables, même contre un
 *     écrivain qui la falsifie.
 *  9. Aucune colonne d'échéance/SLA n'existe — le « délai » de §11.4 n'est
 *     promis nulle part, et ce test le VÉRIFIE au lieu de le supposer.
 *
 * ═══ CE QU'IL NE PROUVE PAS, dit ici plutôt que laissé croire ═══════════════
 *  · L'EFFET RÉEL DE LA RLS. PGlite tourne en SUPERUTILISATEUR : les policies ne
 *    s'y appliquent pas et `auth.uid()` y est un bouchon qui rend NULL. On
 *    vérifie que les policies EXISTENT, ce qu'elles NOMMENT, et l'état exact du
 *    catalogue de privilèges — pas qu'un tiers se fasse réellement refuser.
 *  · QUE LA REVUE AIT LIEU. Personne n'écrit dans ces tables : `ingest_run`
 *    n'appelle pas encore `scoreRun`, et aucun opérateur ne dépile la file. Ce
 *    test prouve un SCHÉMA, pas une mécanique en service.
 *
 * ═══ LANCER ════════════════════════════════════════════════════════════════
 *   mkdir -p /tmp/pglite && cd /tmp/pglite
 *   echo '{"name":"pglite-scratch","private":true}' > package.json
 *   npm i --ignore-scripts @electric-sql/pglite
 *   cd <repo> && GRYD_PGLITE=/tmp/pglite/node_modules/@electric-sql/pglite/dist/index.js \
 *     node supabase/tests/anticheat_review.pglite.test.mjs
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
      '    node supabase/tests/anticheat_review.pglite.test.mjs',
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
/** Une requête doit ÉCHOUER, et pour la raison qu'on vise (jamais « au hasard »). */
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
// `alter default privileges … grant all on tables` n'est PAS décoratif : sans
// lui, les tables naîtraient déjà sans privilège client et le test des `revoke`
// de la migration serait un faux positif — le pire genre de vert.
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
// CINQ FICHIERS SONT SAUTÉS, et uniquement parce que PGlite n'embarque pas les
// extensions qu'ils exigent — jamais parce qu'ils gênent :
//   · 0001 : `pgcrypto` (inutile ici, `gen_random_uuid()` est natif en PG13+) ;
//   · 0020 : publication `supabase_realtime` (côté plateforme, pas côté schéma) ;
//   · 0038 / 0039 / 0064 : `pg_cron`.
// Aucun ne touche `runs` ni `users` d'une façon dont 0081 dépend. Les fichiers
// qui appellent `cron.schedule(` sans créer l'extension sont, eux, tronqués à
// cet appel (patron de `activity_dimension.pglite.test.mjs`).
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
// 0080 ; il ne doit pas rougir parce qu'un autre lot a livré 0082.
const LINEAGE = readdirSync(MIGRATIONS)
  .filter((f) => f.endsWith('.sql') && /^\d{4}_/.test(f) && Number(f.slice(0, 4)) <= 80)
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

console.log('anticheat_review — migration 0081 (revue §11.3 + appel §11.4) sur PGlite\n');
console.log(`  (lignée rejouée : ${LINEAGE.length} migrations, 0002 → 0080)\n`);

// ═══ 1. LA MIGRATION S'APPLIQUE ═════════════════════════════════════════════
let migrationError = null;
try {
  await db.exec(readFileSync(join(MIGRATIONS, '0081_anticheat_review.sql'), 'utf8'));
} catch (err) {
  migrationError = err;
}

await t('la migration 0081 s’applique sur un Postgres réel, telle quelle', () => {
  if (migrationError) throw new Error(migrationError.message);
});

if (migrationError) {
  console.log('\nMigration non appliquée : la suite n’a aucun sens, on s’arrête ici.');
  process.exit(1);
}

// ─── Acteurs ────────────────────────────────────────────────────────────────
const JOUEUR = '11111111-1111-1111-1111-111111111111';
const AUTRE = '22222222-2222-2222-2222-222222222222';
const OPERATEUR = '44444444-4444-4444-4444-444444444444';
const CITY = 'paris';

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

// Mêmes pièges de socle qu'en 0078 : Paris est semée par la lignée, et
// `public.users` est provisionné par le déclencheur de 0028 à l'insert dans
// `auth.users` — on COMPLÈTE, on ne recrée pas.
await db.exec(`
  insert into auth.users (id) values ('${JOUEUR}'), ('${AUTRE}'), ('${OPERATEUR}');
  insert into public.city_zones (city_id, name, geojson, status)
    values ('${CITY}', 'Paris', '${PARIS_BBOX}'::jsonb, 'active')
    on conflict (city_id) do nothing;
  insert into public.users (id, pseudo, city_id)
    values ('${JOUEUR}', 'joueur', '${CITY}'),
           ('${AUTRE}', 'autre', '${CITY}'),
           ('${OPERATEUR}', 'operateur', '${CITY}')
    on conflict (id) do update set city_id = excluded.city_id;
`);

/** Une course SIGNALÉE — le seul cas où une revue existe. */
const newRun = async (user = JOUEUR) => {
  const r = await db.query(
    `insert into public.runs (user_id, client_run_id, source, started_at,
                              distance_m, duration_s, status)
     values ($1, gen_random_uuid(), 'gps', now(), 5000, 1800, 'flagged')
     returning id`,
    [user],
  );
  return r.rows[0].id;
};

/**
 * Insert d'une revue NOMINALE. Toutes les valeurs viennent de l'APPELANT, comme
 * en production : le schéma ne connaît ni seuil, ni poids, ni décision — c'est
 * `packages/engine/src/anticheat.ts` qui décide.
 */
const SIGNALS = JSON.stringify([
  { id: 'sustained_speed', available: true, severity: 1, weight: 3, evidence: { shareOfDuration: 1 } },
  { id: 'step_coherence', available: false, severity: 0, weight: 2, unavailableReason: 'Aucun podomètre transmis.' },
]);

const insertReview = (runId, over = {}) => {
  const v = {
    userId: JOUEUR,
    systemDecision: 'MANUAL_REVIEW',
    suspicion: 27,
    signals: SIGNALS,
    status: 'open',
    openedAt: '2026-07-27 08:00:00+00',
    closedAt: null,
    finalDecision: null,
    operatorId: null,
    ...over,
  };
  return db.query(
    `insert into public.anticheat_reviews
       (run_id, user_id, system_decision, suspicion, signals, status,
        opened_at, closed_at, final_decision, operator_id)
     values ($1, $2, $3, $4, $5::jsonb, $6, $7::timestamptz, $8::timestamptz, $9, $10)
     returning id, status, suspicion, updated_at`,
    [
      runId,
      v.userId,
      v.systemDecision,
      v.suspicion,
      v.signals,
      v.status,
      v.openedAt,
      v.closedAt,
      v.finalDecision,
      v.operatorId,
    ],
  );
};

const newReview = async (over = {}) => (await insertReview(await newRun(over.userId ?? JOUEUR), over)).rows[0].id;

// ═══ 2. LES CHECK REFUSENT CE QU'ILS ANNONCENT ══════════════════════════════

await t('une revue NOMINALE s’insère (sinon tout le reste ne prouve rien)', async () => {
  const r = await insertReview(await newRun());
  eq(r.rows[0].status, 'open', 'la revue naît ouverte');
  eq(r.rows[0].suspicion, 27, 'le score est stocké tel quel');
});

await t('une décision système INCONNUE est refusée', async () => {
  const run = await newRun();
  await rejects(
    `insert into public.anticheat_reviews (run_id, user_id, system_decision, suspicion)
     values ($1, $2, 'BANNI', 10)`,
    [run, JOUEUR],
    'anticheat_reviews_system_decision_check',
    'une décision hors §11.3',
  );
});

await t('« PASS » et « PASS_WITH_EXCLUSIONS » sont refusés : une capture créditée n’est PAS en revue', async () => {
  for (const d of ['PASS', 'PASS_WITH_EXCLUSIONS']) {
    const run = await newRun();
    await rejects(
      `insert into public.anticheat_reviews (run_id, user_id, system_decision, suspicion)
       values ($1, $2, $3, 10)`,
      [run, JOUEUR, d],
      'anticheat_reviews_system_decision_check',
      `la décision ${d} n’ouvre pas de revue`,
    );
  }
});

await t('un score hors [0, 100] est refusé, et les BORNES sont acceptées', async () => {
  const run = await newRun();
  await rejects(
    `insert into public.anticheat_reviews (run_id, user_id, system_decision, suspicion)
     values ($1, $2, 'REJECT', 101)`,
    [run, JOUEUR],
    'anticheat_reviews_suspicion_check',
    'un score au-dessus de 100',
  );
  await rejects(
    `insert into public.anticheat_reviews (run_id, user_id, system_decision, suspicion)
     values ($1, $2, 'REJECT', -1)`,
    [run, JOUEUR],
    'anticheat_reviews_suspicion_check',
    'un score négatif',
  );
  // Un CHECK trop zélé rejetterait une mesure parfaitement réelle : 0 (aucun
  // signal positif, mais une décision décisive) et 100 existent tous les deux.
  for (const s of [0, 100]) {
    const r2 = await insertReview(await newRun(), { suspicion: s });
    eq(r2.rows[0].suspicion, s, `le score ${s} doit être accepté`);
  }
});

await t('`signals` doit être un TABLEAU (un objet nu serait illisible pour la file)', async () => {
  const run = await newRun();
  await rejects(
    `insert into public.anticheat_reviews (run_id, user_id, system_decision, suspicion, signals)
     values ($1, $2, 'REJECT', 10, '{"a":1}'::jsonb)`,
    [run, JOUEUR],
    'anticheat_reviews_signals_check',
    'un `signals` non tableau',
  );
});

await t('la clôture et sa date sont INDISSOCIABLES, dans les deux sens', async () => {
  await rejects(
    `insert into public.anticheat_reviews (run_id, user_id, system_decision, suspicion, status, final_decision)
     values ($1, $2, 'REJECT', 10, 'closed', 'upheld')`,
    [await newRun(), JOUEUR],
    'anticheat_reviews_closed_coherent',
    'une revue close SANS date de clôture',
  );
  await rejects(
    `insert into public.anticheat_reviews (run_id, user_id, system_decision, suspicion, status, closed_at)
     values ($1, $2, 'REJECT', 10, 'open', now())`,
    [await newRun(), JOUEUR],
    'anticheat_reviews_closed_coherent',
    'une revue ouverte AVEC une date de clôture',
  );
});

await t('aucune décision finale sur une revue ouverte, aucune clôture muette', async () => {
  await rejects(
    `insert into public.anticheat_reviews (run_id, user_id, system_decision, suspicion, status, final_decision)
     values ($1, $2, 'REJECT', 10, 'in_progress', 'overturned')`,
    [await newRun(), JOUEUR],
    'anticheat_reviews_decision_when_closed',
    'une conclusion sans dossier clos',
  );
  await rejects(
    `insert into public.anticheat_reviews (run_id, user_id, system_decision, suspicion, status, closed_at)
     values ($1, $2, 'REJECT', 10, 'closed', now())`,
    [await newRun(), JOUEUR],
    'anticheat_reviews_closed_has_decision',
    'une revue close qui ne dit pas ce qu’elle a décidé',
  );
});

await t('une clôture ANTÉRIEURE à l’ouverture est refusée', async () => {
  await rejects(
    `insert into public.anticheat_reviews
       (run_id, user_id, system_decision, suspicion, status, opened_at, closed_at, final_decision)
     values ($1, $2, 'REJECT', 10, 'closed', '2026-07-27 08:00:00+00',
             '2026-07-26 08:00:00+00', 'upheld')`,
    [await newRun(), JOUEUR],
    'anticheat_reviews_closed_after_opened',
    'une revue close avant d’être ouverte',
  );
});

await t('UNE revue par course : la seconde est refusée', async () => {
  const run = await newRun();
  await insertReview(run);
  await rejects(
    `insert into public.anticheat_reviews (run_id, user_id, system_decision, suspicion)
     values ($1, $2, 'REJECT', 50)`,
    [run, JOUEUR],
    'anticheat_reviews_run_id_key',
    'une seconde revue sur la même course (retry d’ingestion)',
  );
});

// ═══ 3. L'APPEL ═════════════════════════════════════════════════════════════

const insertAppeal = (reviewId, over = {}) => {
  const v = { userId: JOUEUR, message: 'Mon téléphone était dans le sac.', ...over };
  return db.query(
    `insert into public.anticheat_appeals (review_id, user_id, message)
     values ($1, $2, $3) returning id, status, created_at, updated_at`,
    [reviewId, v.userId, v.message],
  );
};

await t('un appel nominal s’ouvre, et naît « received » sans que le client l’écrive', async () => {
  const r = await insertAppeal(await newReview());
  eq(r.rows[0].status, 'received', 'le statut initial vient du DEFAULT, pas du client');
});

await t('un appel SANS message est accepté : se justifier n’est pas une condition', async () => {
  const r = await insertAppeal(await newReview(), { message: null });
  ok(r.rows[0].id, 'un recours doit pouvoir s’ouvrir sans texte');
});

await t('un message démesuré est refusé (la colonne n’est pas un dépotoir)', async () => {
  await rejects(
    `insert into public.anticheat_appeals (review_id, user_id, message)
     values ($1, $2, repeat('x', 2001))`,
    [await newReview(), JOUEUR],
    'anticheat_appeals_message_check',
    'un message de plus de 2000 caractères',
  );
});

await t('UN appel par revue : le second tap est refusé', async () => {
  const review = await newReview();
  await insertAppeal(review);
  await rejects(
    `insert into public.anticheat_appeals (review_id, user_id) values ($1, $2)`,
    [review, JOUEUR],
    'anticheat_appeals_review_id_key',
    'un second appel sur la même revue',
  );
});

await t('les CHECK de clôture de l’appel valent ceux de la revue', async () => {
  const review = await newReview();
  const a = await insertAppeal(review);
  await rejects(
    `update public.anticheat_appeals set status = 'closed' where id = $1`,
    [a.rows[0].id],
    'anticheat_appeals_closed_coherent',
    'un appel clos sans date de décision',
  );
  await rejects(
    `update public.anticheat_appeals set decision = 'overturned' where id = $1`,
    [a.rows[0].id],
    'anticheat_appeals_decision_when_closed',
    'une décision d’appel sans clôture',
  );
  await rejects(
    `update public.anticheat_appeals set status = 'closed', decided_at = now() where id = $1`,
    [a.rows[0].id],
    'anticheat_appeals_closed_has_decision',
    'un appel clos qui ne dit pas ce qu’il a décidé',
  );
});

// ═══ 4. §11.4 — AUCUN DÉLAI N'EST PROMIS ════════════════════════════════════

await t('aucune colonne d’échéance : le « délai » de §11.4 n’est promis nulle part', async () => {
  // Ce test protège une DÉCISION, pas une implémentation : tant que personne ne
  // dépile la file, une colonne `sla_due_at` (même nullable, même vide) serait
  // l'amorce d'une promesse — et un écran finirait par l'afficher.
  const r = await db.query(
    `select table_name, column_name from information_schema.columns
      where table_schema = 'public'
        and table_name in ('anticheat_reviews', 'anticheat_appeals')
        and (column_name like '%due%' or column_name like '%sla%'
             or column_name like '%deadline%' or column_name like '%expires%')`,
  );
  eq(r.rows, [], 'une colonne d’échéance est apparue : le délai redevient une promesse');
});

// ═══ 5. INDEX ═══════════════════════════════════════════════════════════════

const indexDef = async (name) => {
  const r = await db.query('select indexdef from pg_indexes where indexname = $1', [name]);
  return r.rows[0]?.indexdef ?? null;
};

await t('les deux files sont indexées par statut, et PARTIELLEMENT', async () => {
  for (const [name, table] of [
    ['anticheat_reviews_open_idx', 'anticheat_reviews'],
    ['anticheat_appeals_open_idx', 'anticheat_appeals'],
  ]) {
    const def = await indexDef(name);
    ok(def !== null, `${name} doit exister`);
    ok(def.includes(table), `${name} doit porter sur ${table}`);
    ok(def.includes('status'), `${name} doit indexer le statut (la file se lit par là)`);
    ok(
      def.includes("WHERE (status <> 'closed'"),
      `${name} doit être PARTIEL sur les dossiers non clos — obtenu : ${def}`,
    );
  }
});

await t('la lecture du JOUEUR est indexée, et NON partielle (il relit ses dossiers clos)', async () => {
  for (const name of ['anticheat_reviews_user_idx', 'anticheat_appeals_user_idx']) {
    const def = await indexDef(name);
    ok(def !== null, `${name} doit exister`);
    ok(def.includes('user_id'), `${name} doit indexer le joueur`);
    ok(!def.includes('WHERE'), `${name} ne doit PAS être partiel — obtenu : ${def}`);
  }
});

// ═══ 6. RLS ET PRIVILÈGES ═══════════════════════════════════════════════════

await t('RLS activée sur les deux tables', async () => {
  const r = await db.query(
    `select relname, relrowsecurity from pg_class
      where relname in ('anticheat_reviews', 'anticheat_appeals') order by relname`,
  );
  eq(
    r.rows,
    [
      { relname: 'anticheat_appeals', relrowsecurity: true },
      { relname: 'anticheat_reviews', relrowsecurity: true },
    ],
    'sans RLS, tout le reste est décoratif',
  );
});

await t('les policies existent, et une suspicion reste STRICTEMENT personnelle', async () => {
  const r = await db.query(
    `select tablename, policyname, cmd, qual, with_check from pg_policies
      where tablename in ('anticheat_reviews', 'anticheat_appeals')
      order by tablename, policyname`,
  );
  eq(
    r.rows.map((x) => `${x.tablename}.${x.policyname}:${x.cmd}`),
    [
      'anticheat_appeals.anticheat_appeals_insert_own:INSERT',
      'anticheat_appeals.anticheat_appeals_select_own:SELECT',
      'anticheat_reviews.anticheat_reviews_select_own:SELECT',
    ],
    'exactement trois policies : deux lectures personnelles et UNE création d’appel',
  );
  const rev = r.rows.find((x) => x.policyname === 'anticheat_reviews_select_own');
  ok(rev.qual.includes('auth.uid()'), 'la lecture doit être bornée à l’utilisateur courant');
  // Le point de vie privée propre à ce domaine : contrairement à 0078, AUCUNE
  // exception « membres du crew ». Un coéquipier n’a pas à savoir qu’un compte a
  // été suspecté.
  ok(!rev.qual.includes('crew_members'), 'une revue ne se partage PAS avec le crew');

  const ins = r.rows.find((x) => x.policyname === 'anticheat_appeals_insert_own');
  ok(ins.with_check.includes('auth.uid()'), 'l’appel doit être signé de l’utilisateur courant');
  ok(
    ins.with_check.includes('anticheat_reviews'),
    'l’appel doit viser une revue, et le `with check` doit le vérifier',
  );
});

await t('AUCUNE policy d’UPDATE ni de DELETE côté client', async () => {
  const r = await db.query(
    `select policyname, cmd from pg_policies
      where tablename in ('anticheat_reviews', 'anticheat_appeals')
        and cmd in ('UPDATE', 'DELETE')`,
  );
  eq(r.rows, [], 'un dossier déposé ne se modifie ni ne s’efface côté client');
});

await t('LE POINT LE PLUS FRAGILE : l’insert client est borné à TROIS colonnes', async () => {
  // `grant insert (review_id, user_id, message)` : c'est cette ligne, et elle
  // seule, qui empêche un joueur de déposer un appel déjà `closed` /
  // `overturned`. Un futur `grant insert` sans liste la remplacerait sans rien
  // casser de visible — d'où ce test au catalogue.
  const r = await db.query(
    `select column_name from information_schema.column_privileges
      where table_schema = 'public' and table_name = 'anticheat_appeals'
        and grantee = 'authenticated' and privilege_type = 'INSERT'
      order by column_name`,
  );
  eq(
    r.rows.map((x) => x.column_name),
    ['message', 'review_id', 'user_id'],
    'seules les trois colonnes du joueur sont accordées à l’insert',
  );
});

await t('aucun privilège d’écriture de TABLE pour anon / authenticated', async () => {
  const r = await db.query(
    `select table_name, grantee, privilege_type from information_schema.table_privileges
      where table_schema = 'public'
        and table_name in ('anticheat_reviews', 'anticheat_appeals')
        and grantee in ('anon', 'authenticated')
      order by table_name, grantee, privilege_type`,
  );
  const interdits = r.rows.filter((x) => ['UPDATE', 'DELETE', 'TRUNCATE'].includes(x.privilege_type));
  eq(interdits, [], 'la RLS ne doit pas être la seule ligne de défense');
  eq(
    r.rows.filter((x) => x.grantee === 'anon'),
    [],
    'un visiteur non authentifié n’a RIEN à faire ici',
  );
  // Le seul INSERT de table accordé (Postgres remonte aussi les privilèges de
  // colonne au niveau table) doit concerner les appels, jamais les revues.
  eq(
    r.rows.filter((x) => x.table_name === 'anticheat_reviews' && x.privilege_type === 'INSERT'),
    [],
    'un joueur ne crée jamais sa propre revue',
  );
});

// ═══ 7. CASCADES ════════════════════════════════════════════════════════════

await t('purger la COURSE emporte sa revue, et la revue emporte son appel', async () => {
  const run = await newRun();
  const review = (await insertReview(run)).rows[0].id;
  const appeal = (await insertAppeal(review)).rows[0].id;
  await db.query('delete from public.runs where id = $1', [run]);
  const r1 = await db.query('select 1 from public.anticheat_reviews where id = $1', [review]);
  const r2 = await db.query('select 1 from public.anticheat_appeals where id = $1', [appeal]);
  eq(r1.rows.length, 0, 'une revue sans course ne s’interprète pas');
  eq(r2.rows.length, 0, 'un appel sans revue non plus');
});

await t('supprimer un OPÉRATEUR n’efface pas la décision qu’il a rendue', async () => {
  const review = (
    await insertReview(await newRun(), {
      status: 'closed',
      closedAt: '2026-07-28 08:00:00+00',
      finalDecision: 'upheld',
      operatorId: OPERATEUR,
    })
  ).rows[0].id;
  await db.query('delete from public.users where id = $1', [OPERATEUR]);
  const r = await db.query(
    'select final_decision, operator_id from public.anticheat_reviews where id = $1',
    [review],
  );
  eq(r.rows.length, 1, 'la revue doit survivre au départ de l’opérateur');
  eq(r.rows[0].final_decision, 'upheld', 'la décision rendue reste');
  eq(r.rows[0].operator_id, null, 'seul le lien vers le compte est effacé');
});

// ═══ 8. `updated_at` ════════════════════════════════════════════════════════

await t('`updated_at` est tenue par la base sur les DEUX tables, même contre un écrivain qui la falsifie', async () => {
  // On n'oppose PAS deux `now()` (l'insert et l'update peuvent tomber dans la
  // même milliseconde sous PGlite : le test serait tantôt vert, tantôt rouge, et
  // faux dans les deux cas). On écrit une date DÉLIBÉRÉMENT fausse : si elle
  // ressort telle quelle, le trigger n'est pas là, et la colonne ment.
  const review = await newReview();
  const r1 = await db.query(
    `update public.anticheat_reviews
        set status = 'in_progress', updated_at = '2000-01-01 00:00:00+00'
      where id = $1 returning updated_at`,
    [review],
  );
  ok(
    new Date(r1.rows[0].updated_at).getTime() > Date.parse('2001-01-01T00:00:00Z'),
    'revue : la date falsifiée a été conservée — trigger absent',
  );

  const appeal = (await insertAppeal(review)).rows[0].id;
  const r2 = await db.query(
    `update public.anticheat_appeals
        set status = 'closed', decided_at = now(), decision = 'overturned',
            updated_at = '2000-01-01 00:00:00+00'
      where id = $1 returning updated_at`,
    [appeal],
  );
  ok(
    new Date(r2.rows[0].updated_at).getTime() > Date.parse('2001-01-01T00:00:00Z'),
    'appel : la date falsifiée a été conservée — trigger absent',
  );
});

// ─── Verdict ────────────────────────────────────────────────────────────────
console.log(`\n${passed} test(s) OK, ${failures.length} échec(s).`);
if (failures.length > 0) process.exit(1);
