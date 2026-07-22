#!/usr/bin/env node
/**
 * GRYD — test EXÉCUTABLE de la migration 0064 (cycle de vie des offensives) sur PGlite.
 *
 * ═══ POURQUOI ═══════════════════════════════════════════════════════════════
 * 0064 ferme trois trous : personne ne CRÉAIT d'offensive, personne ne la
 * CLÔTURAIT, et donc `offensivesCompleted` restait à 0 (200 XP crew jamais
 * crédités, badges Raid Leader et skill Strategist inatteignables). Une
 * migration jamais exécutée est une intention, pas un mécanisme — ce test
 * exécute le VRAI SQL de 0064 et prouve :
 *   1. create_offensive refuse un non-membre, un rôle non autorisé, et le
 *      dépassement du plafond anti-spam (p_max_open) ;
 *   2. create_offensive ouvre en 'active' si la fenêtre est déjà ouverte,
 *      en 'preparation' sinon ;
 *   3. activate_due_offensives est IDEMPOTENTE et n'active jamais une fenêtre
 *      déjà expirée ;
 *   4. claim_offensive_close ne clôture QU'UNE FOIS (claimed=true une seule
 *      fois), fige hexes_taken, et laisse result NULL ;
 *   5. finalize_offensive ne crédite QU'UNE FOIS (XP crew, coffre,
 *      user_stats.offensives_joined), et refuse une offensive non clôturée ;
 *   6. un échec (crew_xp=0) ne crédite ni XP ni coffre — mais finalise bien ;
 *   7. les CHECK de cohérence (result ⇒ done + finalized_at) tiennent ;
 *   8. GRANTS : ni `public`, ni `anon`, ni `authenticated` n'a EXECUTE sur les
 *      quatre fonctions (piège déjà rencontré 2 fois : PUBLIC hérite d'EXECUTE,
 *      un simple grant ne ferme rien).
 *
 * ═══ CE QUE CE TEST NE PROUVE PAS ═══════════════════════════════════════════
 *   · LA RLS. PGlite tourne en superutilisateur (RLS contournée) et n'a ni
 *     schéma `auth` ni rôles Supabase réels. Ce qui est prouvé côté sécurité,
 *     c'est le périmètre d'EXECUTE (has_function_privilege).
 *   · LE CRON (§7 de 0064) : pg_cron/pg_net/vault n'existent pas dans PGlite.
 *     Le fichier est coupé à `create extension if not exists pg_cron;`.
 *   · Les tables amont (`users`, `crews`, `crew_members`, `user_stats`) sont
 *     des STUBS réduits aux colonnes que 0064 touche — clairement marqués
 *     ci-dessous. `crew_chests`, `offensives`, `offensive_contributions` et
 *     `add_crew_xp` viennent, eux, du VRAI SQL de 0010 (tranche §3a→§4).
 *
 * ═══ LANCER ════════════════════════════════════════════════════════════════
 *   mkdir -p /tmp/pglite && cd /tmp/pglite
 *   echo '{"name":"pglite-scratch","private":true}' > package.json
 *   npm i --ignore-scripts @electric-sql/pglite
 *   cd <repo> && GRYD_PGLITE=/tmp/pglite/node_modules/@electric-sql/pglite/dist/index.js \
 *     node supabase/tests/offensive_lifecycle.pglite.test.mjs
 *
 * Sans PGlite : sortie CODE 2 avec message explicite (un test non exécuté ne
 * doit jamais ressembler à un test vert). Non branché sur `npm run test:functions`
 * (Deno, --allow-read seul) — le brancher rendrait le gate rouge sans PGlite.
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
      '    node supabase/tests/offensive_lifecycle.pglite.test.mjs',
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

// ─── Chargement du VRAI SQL ──────────────────────────────────────────────────
function migration(file, { from, cutAt } = {}) {
  let sql = readFileSync(join(MIGRATIONS, file), 'utf8');
  if (from) {
    const at = sql.indexOf(from);
    if (at === -1) throw new Error(`${file} : marqueur de début « ${from} » introuvable`);
    sql = sql.slice(at);
  }
  if (cutAt) {
    const at = sql.indexOf(cutAt);
    if (at === -1) throw new Error(`${file} : marqueur de coupe « ${cutAt} » introuvable`);
    sql = sql.slice(0, at);
  }
  return sql;
}

const db = new PGlite();

// Rôles Supabase + STUBS amont (colonnes touchées par 0064 uniquement).
await db.exec(`
  create role anon;
  create role authenticated;
  create role service_role;

  create table public.users (id uuid primary key);

  create table public.crews (
    id    uuid primary key,
    xp    bigint not null default 0,
    level int    not null default 1
  );

  create table public.crew_members (
    crew_id uuid not null references public.crews (id) on delete cascade,
    user_id uuid not null references public.users (id) on delete cascade,
    role    text not null default 'runner',
    left_at timestamptz,
    primary key (crew_id, user_id)
  );

  -- user_stats : seule la colonne lue/écrite par 0064 (0007 + 0009).
  create table public.user_stats (
    user_id           uuid primary key references public.users (id) on delete cascade,
    offensives_joined integer not null default 0 check (offensives_joined >= 0)
  );
`);

// VRAI SQL de 0010 : crew_chests, offensives, offensive_contributions, add_crew_xp.
await db.exec(
  migration('0010_crews_supercell.sql', {
    from: '-- ═══ 3a. crew_chests',
    cutAt: '-- ═══ 5. refresh_crew_activity',
  }),
);

// VRAI SQL de 0064, sans le §7 (cron : pg_cron/pg_net/vault absents de PGlite).
await db.exec(
  migration('0064_offensive_lifecycle.sql', { cutAt: 'create extension if not exists pg_cron;' }),
);

// ─── Fixtures ────────────────────────────────────────────────────────────────
const CREW = 'aaaaaaaa-0000-0000-0000-000000000001';
const OTHER_CREW = 'aaaaaaaa-0000-0000-0000-000000000002';
const FOUNDER = '11111111-1111-1111-1111-111111111111';
const RUNNER = '22222222-2222-2222-2222-222222222222';
const CO_CAPTAIN = '33333333-3333-3333-3333-333333333333';
const OUTSIDER = '44444444-4444-4444-4444-444444444444';
const LEFT = '55555555-5555-5555-5555-555555555555';

// Miroirs de game-rules (le SQL ne les connaît pas : ils sont PASSÉS en paramètre).
const XP_TABLE = [0, 1000, 3000]; // forme de CREW_XP_TABLE (croissante)
const MAX_OPEN = 3; // OFFENSIVE_MAX_ACTIVE_PER_CREW
const ALLOWED = ['co_captain', 'founder']; // CREW_PERMISSIONS.launchOffensive
const XP_VICTORY = 200; // CREW_XP_SOURCES.offensiveCompleted
const CHEST_VICTORY = 100; // CREW_CHEST_WEIGHTS.offensiveCompleted
const WEEK = '2026-07-20';

await db.exec(`
  insert into public.users (id) values
    ('${FOUNDER}'), ('${RUNNER}'), ('${CO_CAPTAIN}'), ('${OUTSIDER}'), ('${LEFT}');
  insert into public.crews (id) values ('${CREW}'), ('${OTHER_CREW}');
  insert into public.crew_members (crew_id, user_id, role) values
    ('${CREW}', '${FOUNDER}',    'founder'),
    ('${CREW}', '${RUNNER}',     'runner'),
    ('${CREW}', '${CO_CAPTAIN}', 'co_captain');
  insert into public.crew_members (crew_id, user_id, role, left_at) values
    ('${CREW}', '${LEFT}', 'founder', now() - interval '1 day');
`);

const reset = () =>
  db.exec(`
    truncate public.offensive_contributions, public.offensives cascade;
    truncate public.crew_chests;
    update public.crews set xp = 0, level = 1;
    update public.user_stats set offensives_joined = 0;
  `);

const createOffensive = async (opts = {}) => {
  const {
    crew = CREW,
    user = FOUNDER,
    label = 'Canal Saint-Martin',
    center = 123456789,
    radius = 2,
    objective = 60,
    startsAt = "now() - interval '1 hour'",
    endsAt = "now() + interval '23 hours'",
    maxOpen = MAX_OPEN,
    roles = ALLOWED,
  } = opts;
  const r = await db.query(
    `select public.create_offensive($1, $2, $3, $4, $5, $6, ${startsAt}, ${endsAt}, $7, $8) as j`,
    [crew, user, label, center, radius, objective, maxOpen, roles],
  );
  return r.rows[0].j;
};

const rowOf = async (id) =>
  (await db.query('select * from public.offensives where id = $1', [id])).rows[0];

const claimClose = async (id) =>
  (await db.query('select public.claim_offensive_close($1) as j', [id])).rows[0].j;

const finalize = async (id, result, xp, chest, joined) =>
  (await db.query(
    'select public.finalize_offensive($1, $2, $3, $4, $5, $6, $7) as j',
    [id, result, xp, chest, XP_TABLE, WEEK, joined],
  )).rows[0].j;

const contribute = (id, user, hexes) =>
  db.query(
    'insert into public.offensive_contributions (offensive_id, user_id, hexes) values ($1, $2, $3)',
    [id, user, hexes],
  );

console.log('offensives — migration 0064 (création + clôture) sur PGlite\n');

// ─── 1. create_offensive : L'ÉCRIVAIN QUI N'EXISTAIT PAS ─────────────────────
await t('un non-membre ne peut pas ouvrir une offensive (not_member)', async () => {
  await reset();
  eq((await createOffensive({ user: OUTSIDER })).rejected, 'not_member', 'motif');
  eq(
    Number((await db.query('select count(*) c from public.offensives')).rows[0].c),
    0,
    'aucune ligne écrite',
  );
});

await t('un membre PARTI ne peut plus ouvrir une offensive (left_at)', async () => {
  await reset();
  eq((await createOffensive({ user: LEFT })).rejected, 'not_member', 'motif');
});

await t('le rôle gate est RÉEL : runner refusé, co_captain et founder acceptés', async () => {
  await reset();
  eq((await createOffensive({ user: RUNNER })).rejected, 'forbidden_role', 'runner');
  ok((await createOffensive({ user: CO_CAPTAIN })).offensive_id, 'co_captain accepté');
  ok((await createOffensive({ user: FOUNDER })).offensive_id, 'founder accepté');
});

await t('fenêtre déjà ouverte → status active + activated_at ; sinon preparation', async () => {
  await reset();
  const now = await createOffensive();
  const later = await createOffensive({
    startsAt: "now() + interval '2 hours'",
    endsAt: "now() + interval '26 hours'",
  });
  const a = await rowOf(now.offensive_id);
  const b = await rowOf(later.offensive_id);
  eq(a.status, 'active', 'fenêtre ouverte');
  ok(a.activated_at !== null, 'activated_at posé');
  eq(b.status, 'preparation', 'fenêtre future');
  ok(b.activated_at === null, 'activated_at null tant que non activée');
  ok(a.closed_at === null && a.result === null, 'ni clôturée ni jugée à la naissance');
});

await t('plafond anti-spam : la (MAX_OPEN+1)ᵉ offensive ouverte est refusée', async () => {
  await reset();
  for (let i = 0; i < MAX_OPEN; i++) ok((await createOffensive()).offensive_id, `n°${i + 1}`);
  eq((await createOffensive()).rejected, 'too_many_open', 'plafond');
  // Le plafond est PAR CREW : un autre crew n'est pas bloqué…
  await db.query(
    `insert into public.crew_members (crew_id, user_id, role) values ($1, $2, 'founder')`,
    [OTHER_CREW, FOUNDER],
  );
  ok((await createOffensive({ crew: OTHER_CREW })).offensive_id, 'autre crew libre');
  await db.query('delete from public.crew_members where crew_id = $1', [OTHER_CREW]);
});

await t('une offensive CLÔTURÉE ne compte plus dans le plafond', async () => {
  await reset();
  const ids = [];
  for (let i = 0; i < MAX_OPEN; i++) ids.push((await createOffensive()).offensive_id);
  eq((await createOffensive()).rejected, 'too_many_open', 'plafond atteint');
  await claimClose(ids[0]);
  ok((await createOffensive()).offensive_id, 'une place libérée par la clôture');
});

// ─── 2. activate_due_offensives ──────────────────────────────────────────────
await t('activate_due_offensives ouvre les fenêtres échues, et est IDEMPOTENTE', async () => {
  await reset();
  const { offensive_id: id } = await createOffensive({
    startsAt: "now() - interval '10 minutes'",
    endsAt: "now() + interval '20 hours'",
  });
  // create_offensive l'a déjà ouverte ; on la remet en preparation pour tester le job.
  await db.query(
    `update public.offensives set status = 'preparation', activated_at = null where id = $1`,
    [id],
  );
  const first = (await db.query('select public.activate_due_offensives() as j')).rows[0].j;
  eq(first.activated, [id], 'premier passage');
  eq((await rowOf(id)).status, 'active', 'status');
  const second = (await db.query('select public.activate_due_offensives() as j')).rows[0].j;
  eq(second.activated, [], 'second passage : rien à faire');
});

await t('une fenêtre DÉJÀ EXPIRÉE n’est jamais activée rétroactivement', async () => {
  await reset();
  const { offensive_id: id } = await createOffensive({
    startsAt: "now() - interval '30 hours'",
    endsAt: "now() - interval '6 hours'",
  });
  await db.query(
    `update public.offensives set status = 'preparation', activated_at = null where id = $1`,
    [id],
  );
  const r = (await db.query('select public.activate_due_offensives() as j')).rows[0].j;
  eq(r.activated, [], 'aucune activation rétroactive');
  eq((await rowOf(id)).status, 'preparation', 'reste en préparation jusqu’à la clôture');
});

// ─── 3. claim_offensive_close : transition A ─────────────────────────────────
await t('claim_offensive_close fige hexes_taken et laisse result NULL', async () => {
  await reset();
  const { offensive_id: id } = await createOffensive();
  await contribute(id, FOUNDER, 40);
  await contribute(id, RUNNER, 25);
  const r = await claimClose(id);
  eq(r.claimed, true, 'claimed');
  eq(r.hexes_taken, 65, 'somme des contributions');
  eq(r.objectif_hexes, 60, 'objectif renvoyé au moteur');
  const row = await rowOf(id);
  eq(row.status, 'done', 'status');
  ok(row.closed_at !== null, 'closed_at posé');
  eq(row.result, null, 'le JUGEMENT reste au moteur pur (result NULL ici)');
  eq(row.hexes_taken, 65, 'hexes figés en base');
});

await t('IDEMPOTENCE : un 2ᵉ claim renvoie claimed=false et ne recalcule rien', async () => {
  await reset();
  const { offensive_id: id } = await createOffensive();
  await contribute(id, FOUNDER, 10);
  eq((await claimClose(id)).claimed, true, '1er claim');
  const before = await rowOf(id);
  // Une contribution tardive n'existe pas en vrai (ingest_run ne lit que 'active'),
  // mais si elle arrivait, elle NE DOIT PAS bouger le total figé.
  await contribute(id, RUNNER, 999);
  const second = await claimClose(id);
  eq(second.claimed, false, '2e claim refusé');
  eq(second.hexes_taken, 10, 'total figé renvoyé tel quel');
  eq((await rowOf(id)).closed_at.toISOString(), before.closed_at.toISOString(), 'closed_at inchangé');
});

await t('une offensive inconnue → found=false, claimed=false', async () => {
  const r = await claimClose('99999999-9999-9999-9999-999999999999');
  eq(r.found, false, 'found');
  eq(r.claimed, false, 'claimed');
});

await t('une offensive JAMAIS activée est clôturable (preparation → done)', async () => {
  await reset();
  const { offensive_id: id } = await createOffensive({
    startsAt: "now() + interval '1 hour'",
    endsAt: "now() + interval '25 hours'",
  });
  eq((await rowOf(id)).status, 'preparation', 'préparation');
  eq((await claimClose(id)).claimed, true, 'clôturable sans être passée par active');
  eq((await rowOf(id)).status, 'done', 'done');
});

// ─── 4. finalize_offensive : transition B (crédit UNIQUE) ────────────────────
await t('finalize_offensive crédite XP crew, coffre et offensives_joined UNE fois', async () => {
  await reset();
  const { offensive_id: id } = await createOffensive();
  await contribute(id, FOUNDER, 40);
  await contribute(id, RUNNER, 25);
  await claimClose(id);

  const r = await finalize(id, 'victory', XP_VICTORY, CHEST_VICTORY, [FOUNDER, RUNNER]);
  eq(r.finalized, true, 'finalisée');
  eq(r.joined, 2, 'contributeurs crédités');
  eq(r.level_from, 1, 'niveau avant');

  const crew = (await db.query('select xp, level from public.crews where id = $1', [CREW])).rows[0];
  eq(Number(crew.xp), XP_VICTORY, 'XP crew');
  const chest = (await db.query('select progress from public.crew_chests where crew_id = $1', [
    CREW,
  ])).rows[0];
  eq(Number(chest.progress), CHEST_VICTORY, 'coffre');
  const stats = (await db.query(
    'select user_id, offensives_joined from public.user_stats order by user_id',
  )).rows;
  eq(stats.map((s) => Number(s.offensives_joined)), [1, 1], 'offensives_joined');

  const row = await rowOf(id);
  eq(row.result, 'victory', 'result écrit');
  eq(row.xp_awarded, XP_VICTORY, 'trace du crédit');
  ok(row.finalized_at !== null, 'finalized_at posé');
});

await t('IDEMPOTENCE : une 2ᵉ finalisation ne crédite RIEN (result déjà écrit)', async () => {
  await reset();
  const { offensive_id: id } = await createOffensive();
  await contribute(id, FOUNDER, 70);
  await claimClose(id);
  await finalize(id, 'victory', XP_VICTORY, CHEST_VICTORY, [FOUNDER]);

  const again = await finalize(id, 'victory', XP_VICTORY, CHEST_VICTORY, [FOUNDER]);
  eq(again.finalized, false, 'refusée');
  eq(again.joined, 0, 'aucun crédit');
  const crew = (await db.query('select xp from public.crews where id = $1', [CREW])).rows[0];
  eq(Number(crew.xp), XP_VICTORY, 'XP crew NON doublée');
  const chest = (await db.query('select progress from public.crew_chests where crew_id = $1', [
    CREW,
  ])).rows[0];
  eq(Number(chest.progress), CHEST_VICTORY, 'coffre NON doublé');
  const stat = (await db.query('select offensives_joined from public.user_stats where user_id = $1', [
    FOUNDER,
  ])).rows[0];
  eq(Number(stat.offensives_joined), 1, 'offensives_joined NON doublé');
});

await t('finalize refuse une offensive NON clôturée (l’ordre A→B est imposé)', async () => {
  await reset();
  const { offensive_id: id } = await createOffensive();
  const r = await finalize(id, 'victory', XP_VICTORY, CHEST_VICTORY, [FOUNDER]);
  eq(r.finalized, false, 'refusée');
  eq(Number((await db.query('select xp from public.crews where id = $1', [CREW])).rows[0].xp), 0, 'XP');
});

await t('REPRISE APRÈS CRASH : clôturée mais non finalisée → le passage suivant finalise', async () => {
  await reset();
  const { offensive_id: id } = await createOffensive();
  await contribute(id, FOUNDER, 61);
  await claimClose(id); // crash simulé juste après la transition A
  const pending = (await db.query(
    `select id from public.offensives where status = 'done' and result is null`,
  )).rows;
  eq(pending.length, 1, 'reprise détectable par le job');
  eq((await finalize(id, 'victory', XP_VICTORY, CHEST_VICTORY, [FOUNDER])).finalized, true, 'reprise');
});

await t('un ÉCHEC finalise sans rien créditer (aucun lot de consolation)', async () => {
  await reset();
  const { offensive_id: id } = await createOffensive();
  await contribute(id, FOUNDER, 3);
  await claimClose(id);
  const r = await finalize(id, 'fail', 0, 0, [FOUNDER]);
  eq(r.finalized, true, 'finalisée');
  eq(Number((await db.query('select xp from public.crews where id = $1', [CREW])).rows[0].xp), 0, 'XP');
  eq(
    Number((await db.query('select count(*) c from public.crew_chests')).rows[0].c),
    0,
    'aucune ligne de coffre',
  );
  // La PARTICIPATION compte quand même : « rejoindre » n'est pas « gagner ».
  eq(r.joined, 1, 'offensivesJoined crédité même sur un échec');
  eq((await rowOf(id)).xp_awarded, 0, 'xp_awarded = 0, pas NULL');
});

await t('doublon dans p_joined_user_ids : dédoublonné, la transaction ne casse pas', async () => {
  await reset();
  const { offensive_id: id } = await createOffensive();
  await contribute(id, FOUNDER, 70);
  await claimClose(id);
  const r = await finalize(id, 'victory', XP_VICTORY, CHEST_VICTORY, [FOUNDER, FOUNDER]);
  eq(r.finalized, true, 'finalisée');
  eq(r.joined, 1, 'un seul crédit');
  eq(
    Number((await db.query('select offensives_joined from public.user_stats where user_id = $1', [
      FOUNDER,
    ])).rows[0].offensives_joined),
    1,
    'offensives_joined',
  );
});

await t('un contributeur SUPPRIMÉ ne fait pas échouer la finalisation', async () => {
  await reset();
  const { offensive_id: id } = await createOffensive();
  await contribute(id, FOUNDER, 70);
  await claimClose(id);
  const ghost = '88888888-8888-8888-8888-888888888888'; // absent de public.users
  const r = await finalize(id, 'victory', XP_VICTORY, CHEST_VICTORY, [FOUNDER, ghost]);
  eq(r.finalized, true, 'finalisée');
  eq(r.joined, 1, 'seul le joueur réel est crédité');
});

// ─── 5. Contraintes de cohérence ─────────────────────────────────────────────
await t('CHECK : impossible d’écrire un result sans clôture ni finalized_at', async () => {
  await reset();
  const { offensive_id: id } = await createOffensive();
  let raised = false;
  try {
    await db.query(`update public.offensives set result = 'victory' where id = $1`, [id]);
  } catch {
    raised = true;
  }
  ok(raised, 'la contrainte offensives_result_consistency doit refuser');
});

await t('CHECK : status done ⇔ closed_at non null', async () => {
  await reset();
  const { offensive_id: id } = await createOffensive();
  let raised = false;
  try {
    await db.query(`update public.offensives set status = 'done' where id = $1`, [id]);
  } catch {
    raised = true;
  }
  ok(raised, 'la contrainte offensives_closed_consistency doit refuser');
});

// ─── 5bis. discard_duplicate_offensive : le TOCTOU refermé ───────────────────
// `create_offensive` comptait les contributions PUIS supprimait, en deux requêtes :
// une contribution écrite entre les deux disparaissait en silence, alors que le
// code PROMETTAIT de ne jamais détruire un fait de jeu. La condition et la
// suppression tiennent désormais dans un seul énoncé — voici les deux issues.

await t('discard : une jumelle SANS contribution est retirée', async () => {
  await reset();
  const { offensive_id: id } = await createOffensive();
  const r = await db.query('select public.discard_duplicate_offensive($1, $2) as ok', [
    id,
    FOUNDER,
  ]);
  eq(r.rows[0].ok, true, 'la RPC dit avoir supprimé');
  eq(await rowOf(id), undefined, 'la ligne est bien partie');
});

await t('discard : une jumelle QUI PORTE une contribution SURVIT', async () => {
  await reset();
  const { offensive_id: id } = await createOffensive();
  await contribute(id, FOUNDER, 3); // quelqu'un a réellement couru
  const r = await db.query('select public.discard_duplicate_offensive($1, $2) as ok', [
    id,
    FOUNDER,
  ]);
  eq(r.rows[0].ok, false, 'la RPC refuse de supprimer, et le DIT');
  ok(await rowOf(id), 'le fait de jeu est intact');
});

await t('discard : on ne retire jamais l’offensive d’un autre auteur', async () => {
  await reset();
  const { offensive_id: id } = await createOffensive();
  const r = await db.query('select public.discard_duplicate_offensive($1, $2) as ok', [
    id,
    CO_CAPTAIN,
  ]);
  eq(r.rows[0].ok, false, 'auteur différent → aucune suppression');
  ok(await rowOf(id), 'la ligne reste');
});

// ─── 6. Grants (le piège déjà rencontré 2 fois) ──────────────────────────────
await t('GRANTS : ni public, ni anon, ni authenticated n’a EXECUTE', async () => {
  const signatures = [
    'public.create_offensive(uuid, uuid, text, bigint, numeric, int, timestamptz, timestamptz, int, text[])',
    'public.activate_due_offensives()',
    'public.claim_offensive_close(uuid)',
    'public.finalize_offensive(uuid, text, int, int, bigint[], date, uuid[])',
    'public.discard_duplicate_offensive(uuid, uuid)',
  ];
  for (const sig of signatures) {
    for (const role of ['public', 'anon', 'authenticated']) {
      const r = await db.query(
        `select has_function_privilege($1, $2, 'EXECUTE') as granted`,
        [role, sig],
      );
      eq(r.rows[0].granted, false, `${role} sur ${sig}`);
    }
  }
});

// ─── Bilan ───────────────────────────────────────────────────────────────────
console.log(`\n${passed} ok, ${failures.length} échec(s)`);
if (failures.length > 0) {
  for (const f of failures) console.error(`\n${f.name}\n${f.err.stack}`);
  process.exit(1);
}
