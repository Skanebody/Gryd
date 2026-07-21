#!/usr/bin/env node
/**
 * GRYD — test EXÉCUTABLE des migrations 0056/0057/0058 (`steal_push_queue`).
 *
 * ═══ POURQUOI CE FICHIER EXISTE ═════════════════════════════════════════════
 * Toute la correction de concurrence du drain de vol vit en SQL — réservation
 * atomique, exclusion de la victime entière, réapeur, finalisation, horloge du
 * cooldown. Jusqu'ici RIEN dans le dépôt ne l'exécutait : les 800+ tests Deno
 * couvrent les fonctions PURES (`logic.ts`, `_shared/push.ts`) et ne touchent
 * pas une ligne de plpgsql. Une migration jamais exécutée est une intention,
 * pas un mécanisme.
 *
 * Docker n'est pas disponible sur la machine du fondateur (donc pas de
 * `npx supabase start`). PGlite — Postgres compilé en WASM — exécute le VRAI
 * SQL des migrations dans Node, sans démon.
 *
 * ═══ CE QUE CE TEST PROUVE, ET CE QU'IL NE PROUVE PAS ═══════════════════════
 * PROUVÉ (SQL réel, assertions sur l'état de la table) :
 *   1. la réservation prend TOUTES les lignes dues de la victime et pose
 *      `reserved_at` / `attempts` ;
 *   2. un second appel immédiat ne rend RIEN — pas de re-livraison ;
 *   3. la finalisation consomme (`processed_at`, `outcome`) et rend des
 *      compteurs exacts ; une ligne consommée ne revient jamais ;
 *   4. le report pose `next_attempt_at` et écarte la victime jusqu'à échéance,
 *      puis la reprend AVEC ses lignes reportées (agrégat complet) ;
 *   5. DÉFAUT 1 (0058) : une victime dont une ligne est encore réservée est
 *      écartée ENTIÈRE — jamais un agrégat tronqué ;
 *   6. le réapeur consomme les réservations orphelines en `abandoned` et rend
 *      la victime au lot ;
 *   7. DÉFAUT 3 (0058) : `last_pushed_at` remonte la dernière consommation
 *      `pushed` — l'horloge du cooldown ne dépend d'aucun `push_log` ;
 *   8. DÉFAUT 4 (0058) : l'index de lecture couvre bien `next_attempt_at`.
 *
 * NON PROUVÉ — dit ici plutôt que laissé croire :
 *   · LA CONCURRENCE RÉELLE. PGlite est MONO-CONNEXION : impossible d'ouvrir
 *     deux transactions simultanées, donc impossible d'observer deux drains qui
 *     se chevauchent, `pg_try_advisory_xact_lock` refusé, ou `for update` qui
 *     attend. Ce qui est testé, c'est la MACHINE À ÉTATS qui rend la
 *     concurrence sûre (les états qu'un drain concurrent laisserait derrière
 *     lui sont fabriqués à la main : `reserved_at` posé, réservation orpheline
 *     vieillie…). Le verrou lui-même reste non couvert par un test automatisé.
 *   · LA RLS ET LES GRANTS. PGlite n'a ni schéma `auth`, ni rôles Supabase :
 *     le harnais crée des rôles nus. `revoke ... from public, anon` est exécuté
 *     mais son EFFET n'est pas vérifié ici.
 *   · LE PLAN D'EXÉCUTION. Sur quelques dizaines de lignes le planificateur
 *     choisira un seqscan quelle que soit l'indexation. Le test vérifie donc
 *     que l'index EXISTE avec la bonne définition, pas qu'il est CHOISI.
 *
 * ═══ LANCER ════════════════════════════════════════════════════════════════
 *   mkdir -p /tmp/pglite && cd /tmp/pglite
 *   echo '{"name":"pglite-scratch","private":true}' > package.json
 *   npm i --ignore-scripts @electric-sql/pglite
 *   cd <repo> && GRYD_PGLITE=/tmp/pglite/node_modules/@electric-sql/pglite/dist/index.js \
 *     node supabase/tests/steal_push_queue.pglite.test.mjs
 *
 * Sans PGlite, ce fichier sort en CODE 2 avec un message explicite : un test
 * qui n'a pas tourné ne doit JAMAIS ressembler à un test vert. Il n'est donc
 * PAS branché sur `npm run test:functions` (qui tourne sous Deno, `--allow-read`
 * seul) : le brancher rendrait le gate rouge sur toute machine sans PGlite, ou
 * — pire — vert sans avoir rien exécuté.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const MIGRATIONS = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

/**
 * PGlite n'est PAS une dépendance du monorepo, volontairement : la racine
 * héberge React 18 (Expo) et `apps/web` React 19 (Next 15), et ce dépôt a déjà
 * payé un `styled-jsx` hoisté au mauvais endroit (cf. CLAUDE.md, « Pièges
 * monorepo connus »). On n'ajoute pas un paquet WASM de 100 Mo à cet équilibre
 * pour un test qui tourne à la main.
 *
 * D'où la résolution en deux temps : le paquet s'il est installé, sinon le
 * chemin explicite passé en `GRYD_PGLITE`. `NODE_PATH` ne fonctionne PAS pour
 * un `import()` ESM — d'où cette variable plutôt que la recette habituelle.
 */
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
      '    node supabase/tests/steal_push_queue.pglite.test.mjs',
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

// ─── Chargement du VRAI SQL des migrations ───────────────────────────────────
/**
 * 0056 planifie le cron via `cron.schedule` (extension absente de PGlite, et
 * hors sujet ici : on teste le drainage, pas l'ordonnanceur). On coupe le
 * fichier à cette instruction — tout ce qui la précède (table, index, RLS,
 * revokes) est exécuté tel quel.
 */
function migration(file, cutAt) {
  const sql = readFileSync(join(MIGRATIONS, file), 'utf8');
  if (!cutAt) return sql;
  const at = sql.indexOf(cutAt);
  if (at === -1) throw new Error(`${file} : marqueur de coupe « ${cutAt} » introuvable`);
  return sql.slice(0, at);
}

const db = new PGlite();

// Rôles Supabase : ils n'existent pas dans un Postgres nu, et les `revoke` des
// migrations les nomment. On les crée pour exécuter le SQL SANS le modifier.
await db.exec(`
  create role anon;
  create role authenticated;
  create role service_role;
  create table public.users (id uuid primary key);
  insert into public.users (id) values
    ('11111111-1111-1111-1111-111111111111'),
    ('22222222-2222-2222-2222-222222222222'),
    ('33333333-3333-3333-3333-333333333333');
`);

await db.exec(migration('0056_steal_push_queue.sql', 'select cron.schedule('));
await db.exec(migration('0057_steal_push_reservation.sql'));
await db.exec(migration('0058_steal_push_completeness.sql'));

// ─── Utilitaires de scénario ─────────────────────────────────────────────────
const VICTIM_A = '11111111-1111-1111-1111-111111111111';
const VICTIM_B = '22222222-2222-2222-2222-222222222222';
const THIEF = '33333333-3333-3333-3333-333333333333';
const T0 = '2026-07-21T12:00:00Z';
const GRACE = 30; // STEAL_QUEUE_RESERVATION_GRACE_MINUTES
const MAX_VICTIMS = 500; // STEAL_QUEUE_MAX_VICTIMS_PER_DRAIN

const reset = () => db.exec('truncate public.steal_push_queue restart identity;');

const steal = async (victim, hex, stolenAt = T0) => {
  const r = await db.query(
    `insert into public.steal_push_queue (victim_user_id, thief_user_id, h3index, stolen_at)
     values ($1, $2, $3, $4) returning id`,
    [victim, THIEF, hex, stolenAt],
  );
  return Number(r.rows[0].id);
};

const claim = async (now = T0, maxVictims = MAX_VICTIMS) =>
  (await db.query('select * from public.claim_steal_push_batch($1, $2, $3)', [
    maxVictims,
    now,
    GRACE,
  ])).rows;

const finalize = async (consumed, deferred, now = T0) =>
  (await db.query('select * from public.finalize_steal_push_batch($1, $2, $3)', [
    JSON.stringify(consumed),
    JSON.stringify(deferred),
    now,
  ])).rows[0];

const rowById = async (id) =>
  (await db.query('select * from public.steal_push_queue where id = $1', [id])).rows[0];

console.log('steal_push_queue — migrations 0056/0057/0058 sur PGlite\n');

// ─── 1. Réservation ──────────────────────────────────────────────────────────
await t('la réservation prend TOUTES les lignes dues de la victime', async () => {
  await reset();
  const ids = [await steal(VICTIM_A, 1), await steal(VICTIM_A, 2), await steal(VICTIM_B, 3)];
  const claimed = await claim();
  eq(claimed.length, 3, 'lignes réservées');
  for (const id of ids) {
    const r = await rowById(id);
    ok(r.reserved_at !== null, `ligne ${id} : reserved_at doit être posé`);
    eq(Number(r.attempts), 1, `ligne ${id} : attempts`);
    ok(r.processed_at === null, `ligne ${id} : rien n'est consommé par la réservation`);
  }
});

await t('un second drain immédiat ne re-livre RIEN', async () => {
  const again = await claim();
  eq(again.length, 0, 'lignes rendues au second appel');
});

// ─── 2. Consommation ─────────────────────────────────────────────────────────
await t('la finalisation consomme, compte juste, et la ligne ne revient jamais', async () => {
  await reset();
  const id = await steal(VICTIM_A, 10);
  await claim();
  const counts = await finalize([{ id, outcome: 'pushed' }], []);
  eq(Number(counts.consumed_count), 1, 'consumed_count');
  eq(Number(counts.deferred_count), 0, 'deferred_count');
  const r = await rowById(id);
  ok(r.processed_at !== null, 'processed_at posé');
  eq(r.outcome, 'pushed', 'outcome');
  ok(r.reserved_at === null, 'la réservation est relâchée par la consommation');
  eq((await claim()).length, 0, 'une ligne consommée ne revient jamais dans un lot');
});

await t('la finalisation est idempotente : un rejeu ne reconsomme rien', async () => {
  const id = 1; // la ligne consommée juste au-dessus (identity relancée)
  const counts = await finalize([{ id, outcome: 'pushed' }], []);
  eq(Number(counts.consumed_count), 0, 'un rejeu ne doit toucher aucune ligne');
});

// ─── 3. Report ───────────────────────────────────────────────────────────────
await t('le report écarte la victime jusqu’à échéance, puis rend l’agrégat COMPLET', async () => {
  await reset();
  const a = await steal(VICTIM_A, 20);
  await claim();
  await finalize([], [{ id: a, next_attempt_at: '2026-07-21T13:00:00Z' }]);

  const r = await rowById(a);
  ok(r.reserved_at === null, 'la réservation est relâchée par le report');
  ok(r.next_attempt_at !== null, 'next_attempt_at posé');
  eq((await claim('2026-07-21T12:30:00Z')).length, 0, 'avant échéance : rien');

  // Un NOUVEAU vol réveille la victime : le lot doit contenir les DEUX lignes,
  // la reportée comprise — sinon le message annoncerait 1 zone au lieu de 2.
  const b = await steal(VICTIM_A, 21, '2026-07-21T12:40:00Z');
  const claimed = await claim('2026-07-21T12:45:00Z');
  eq(claimed.map((x) => Number(x.id)).sort(), [a, b], 'lignes du lot');
  eq((await rowById(a)).next_attempt_at, null, 'la prise consomme le report');
});

// ─── 4. DÉFAUT 1 — jamais un agrégat tronqué ─────────────────────────────────
await t('une victime dont une ligne est réservée est écartée ENTIÈRE', async () => {
  await reset();
  // État qu'un drain concurrent (ou mort) aurait laissé : une ligne réservée.
  const orphan = await steal(VICTIM_A, 30);
  await db.query('update public.steal_push_queue set reserved_at = $1 where id = $2', [
    T0,
    orphan,
  ]);
  // Puis un nouveau vol arrive pour la MÊME victime, et un autre pour une autre.
  await steal(VICTIM_A, 31, '2026-07-21T12:05:00Z');
  const other = await steal(VICTIM_B, 32, '2026-07-21T12:05:00Z');

  const claimed = await claim('2026-07-21T12:10:00Z');
  eq(
    claimed.map((x) => Number(x.id)),
    [other],
    'seule la victime SANS réservation en cours est servie (0058) — sinon le ' +
      'message de A annoncerait 1 zone alors que 2 lui ont été prises',
  );
});

await t('le réapeur ferme les réservations orphelines et rend la victime au lot', async () => {
  // Même état, une heure plus tard : les deux réservations (l'orpheline de A,
  // et celle que le drain précédent a posée sur B) ont dépassé la grâce de
  // 30 min. Elles deviennent `abandoned` — comptées, pas tues — et A, qui a
  // encore une ligne fraîche en attente, redevient servable.
  //
  // Ce test a d'abord été écrit avec une attente FAUSSE (« 2 lignes ») ; c'est
  // le harnais qui l'a corrigé, pas l'inverse. La ligne de B a bien été
  // réservée au drain précédent : elle n'est pas « en attente », elle est
  // perdue-et-comptée. C'est exactement le coût du « au plus une fois », et
  // c'est aussi pourquoi un drain plus lent que la grâce doit être VISIBLE
  // (cf. l'écart de compteurs lu après `finalize_steal_push_batch`).
  const late = '2026-07-21T13:00:00Z'; // T0 + 60 min > grâce 30 min
  const claimed = await claim(late);
  eq(claimed.length, 1, 'seule la ligne fraîche de A revient');
  eq(claimed[0].victim_user_id, VICTIM_A, 'et c’est bien la victime A');
  const abandoned = await db.query(
    `select count(*)::int as n from public.steal_push_queue where outcome = 'abandoned'`,
  );
  eq(abandoned.rows[0].n, 2, 'les DEUX réservations dépassées sont consommées `abandoned`');
});

// ─── 5. DÉFAUT 3 — l’horloge du cooldown vient de la DÉCISION ────────────────
await t('last_pushed_at remonte la dernière consommation `pushed`, sans push_log', async () => {
  await reset();
  const first = await steal(VICTIM_A, 40);
  await claim();
  await finalize([{ id: first, outcome: 'pushed' }], [], '2026-07-21T12:00:00Z');

  await steal(VICTIM_A, 41, '2026-07-21T12:30:00Z');
  const claimed = await claim('2026-07-21T12:35:00Z');
  eq(claimed.length, 1, 'la victime revient avec son nouveau vol');
  eq(
    new Date(claimed[0].last_pushed_at).toISOString(),
    '2026-07-21T12:00:00.000Z',
    'l’horloge du cooldown est la consommation `pushed`, écrite avant tout envoi',
  );
});

await t('une consommation `undeliverable` ou `abandoned` n’arme PAS le cooldown', async () => {
  await reset();
  const id = await steal(VICTIM_B, 50);
  await claim();
  await finalize([{ id, outcome: 'undeliverable' }], []);
  await steal(VICTIM_B, 51, '2026-07-21T12:30:00Z');
  const claimed = await claim('2026-07-21T12:35:00Z');
  eq(claimed[0].last_pushed_at, null, 'aucun push décidé ⇒ aucun cooldown');
});

// ─── 6. DÉFAUT 4 — l’index couvre le prédicat réel ───────────────────────────
await t('steal_push_queue_due_idx couvre next_attempt_at (et pas seulement stolen_at)', async () => {
  const r = await db.query(
    `select indexdef from pg_indexes
      where schemaname = 'public' and indexname = 'steal_push_queue_due_idx'`,
  );
  eq(r.rows.length, 1, 'l’index de lecture doit exister');
  const def = r.rows[0].indexdef;
  ok(
    def.includes('next_attempt_at'),
    'l’index ignore next_attempt_at alors que le drain filtre dessus — c’est le ' +
      `défaut 4 ; définition trouvée : ${def}`,
  );
  ok(def.includes('victim_user_id') && def.includes('stolen_at'), `définition : ${def}`);
  ok(
    def.includes('processed_at IS NULL') && def.includes('reserved_at IS NULL'),
    `l’index doit rester PARTIEL sur les lignes en attente ; définition : ${def}`,
  );
});

await t('l’horloge du cooldown a son index dédié', async () => {
  const r = await db.query(
    `select indexdef from pg_indexes
      where schemaname = 'public' and indexname = 'steal_push_queue_pushed_idx'`,
  );
  eq(r.rows.length, 1, 'index du cooldown');
  ok(r.rows[0].indexdef.includes("outcome = 'pushed'"), r.rows[0].indexdef);
});

// ─── 7. Anti pay-to-win : rien dans la signature ne porte un statut ──────────
await t('aucun paramètre des RPC ne peut porter un abonnement ou un niveau', async () => {
  const r = await db.query(
    `select p.proname, pg_get_function_arguments(p.oid) as args
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname in ('claim_steal_push_batch', 'finalize_steal_push_batch')
      order by p.proname`,
  );
  eq(r.rows.length, 2, 'les deux RPC du drain');
  for (const fn of r.rows) {
    ok(
      !/premium|pass|tier|level|plan|sub/i.test(fn.args),
      `${fn.proname}(${fn.args}) : aucun paramètre ne doit porter un statut payant (§22)`,
    );
  }
});

// ─── Verdict ─────────────────────────────────────────────────────────────────
await db.close();
console.log(`\n${passed} test(s) OK, ${failures.length} échec(s).`);
console.log(
  'RAPPEL : la concurrence RÉELLE (deux drains simultanés, verrou consultatif ' +
    'refusé, `for update` qui attend) n’est PAS couverte — PGlite est ' +
    'mono-connexion. Seule la machine à états l’est.',
);
process.exit(failures.length === 0 ? 0 : 1);
