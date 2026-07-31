#!/usr/bin/env node
/**
 * GRYD — test EXÉCUTABLE de la migration 0107 (`crew_level_normalized`).
 *
 * ═══ CE QUE 0107 CHANGE, ET CE QUE CE FICHIER DOIT PROUVER ══════════════════
 * Le barème de niveau de crew est désormais NORMALISÉ par la taille du crew.
 * La normalisation elle-même vit dans le moteur pur (`crewXpTableFor`), et elle
 * y est éprouvée. Ce qui vit EN SQL, et donc ici, c'est le PLANCHER :
 *
 *   `level = greatest(ancien, nouveau)`
 *
 * Sans lui, un crew qui RECRUTE verrait son multiplicateur monter, son barème
 * durcir, et son niveau BAISSER. Accueillir un ami coûterait un niveau —
 * personne ne recruterait plus, dans un jeu qui repose entièrement sur le
 * recrutement.
 *
 * ═══ L'ÉTAPE 0 EST LA PLUS IMPORTANTE ══════════════════════════════════════
 * Le test rejoue d'abord la lignée SANS 0107 et vérifie que le niveau DESCEND
 * réellement. Sans cette étape, rien ne distinguerait 0107 d'un no-op, et on
 * aurait un test vert qui garde du vide — la faute que ce dépôt a déjà payée.
 *
 * ═══ CE QU'IL NE PROUVE PAS, dit plutôt que laissé croire ══════════════════
 *  · L'EFFET RÉEL DE LA RLS : PGlite tourne en SUPERUTILISATEUR. Les `revoke`
 *    sont vérifiés sur le CATALOGUE (`has_function_privilege`), ce qui prouve
 *    la déclaration, pas l'application par un vrai rôle.
 *  · La normalisation elle-même : elle n'est pas en SQL. Le SQL reçoit une
 *    table et compare. C'est `crewNormalization.test.ts` qui prouve la table,
 *    et `crew_normalization_guard_test.ts` que les appelants la passent.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS = join(HERE, '..', 'migrations');

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

await db.exec(`
  set time zone 'UTC';
  create role anon;
  create role authenticated;
  create role service_role;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
  create schema extensions;
  create function extensions.gen_random_bytes(n int) returns bytea
    language sql as $$
      select substring(
        decode(md5(random()::text) || md5(random()::text) || md5(random()::text), 'hex')
        from 1 for n)
    $$;
  alter default privileges in schema public grant all on tables to anon, authenticated;
`);

const SKIP = new Set([
  '0001_extensions.sql',
  '0020_crew_realtime.sql',
  '0038_sector_cron.sql',
  '0039_core_crons.sql',
  '0064_offensive_lifecycle.sql',
]);
const CRON = 'select cron.schedule(';
const UNSCHEDULE = 'select cron.unschedule(';
const all = readdirSync(MIGRATIONS)
  .filter((f) => f.endsWith('.sql') && /^\d{4}_/.test(f))
  .sort()
  .filter((f) => !SKIP.has(f));
const LINEAGE = all.filter((f) => Number(f.slice(0, 4)) <= 106);
const CIBLE = all.find((f) => f.startsWith('0107_'));
if (!CIBLE) {
  console.error('La migration 0107 est introuvable — ce test ne vérifie rien.');
  process.exit(1);
}

const apply = async (file) => {
  const raw = readFileSync(join(MIGRATIONS, file), 'utf8');
  let sql = raw;
  for (const marker of [CRON, UNSCHEDULE]) {
    const at = sql.indexOf(marker);
    if (at !== -1) sql = sql.slice(0, at);
  }
  await db.exec(sql);
};

for (const file of LINEAGE) {
  try {
    await apply(file);
  } catch (err) {
    console.error(`\nSOCLE CASSÉ : la migration ${file} n’a pas pu s’appliquer.\n  ${err.message}`);
    process.exit(1);
  }
}

console.log('crew_level_normalized — migration 0107 sur PGlite\n');
console.log(`  (lignée rejouée : ${LINEAGE.length} migrations, 0002 → 0106)\n`);

// ─── Fixtures ────────────────────────────────────────────────────────────────
const FOUNDER = '11111111-1111-4111-8111-111111111111';
const CREW = '22222222-2222-4222-8222-222222222222';

await db.exec(`
  insert into auth.users (id) values ('${FOUNDER}');
  insert into public.users (id, pseudo) values ('${FOUNDER}','founder')
    on conflict (id) do nothing;
  insert into public.city_zones (city_id, name, geojson, status)
    values ('paris','Paris',
      '{"type":"Polygon","coordinates":[[[2.22,48.81],[2.47,48.81],[2.47,48.91],[2.22,48.91],[2.22,48.81]]]}'::jsonb,
      'wild')
    on conflict (city_id) do nothing;
  insert into public.crews (id, name, color, city_id, code, created_by)
    values ('${CREW}','Foulées 93',3,'paris','ABC123','${FOUNDER}');
`);

/** Barème brut (crew à la taille de référence) et barème d'un crew 10× plus grand. */
const BRUT = [0, 1000, 3000, 7500, 15000, 30000, 60000, 100000, 175000, 300000];
const GRAND = BRUT.map((x) => x * 10);
const arr = (t) => `ARRAY[${t.join(',')}]::bigint[]`;

const level = async () =>
  (await db.query(`select level from public.crews where id = '${CREW}'`)).rows[0].level;
const setState = async (xp, lvl) =>
  db.exec(`update public.crews set xp = ${xp}, level = ${lvl} where id = '${CREW}'`);
const addXp = async (xp, table) =>
  (await db.query(
    `select * from public.add_crew_xp('${CREW}'::uuid, ${xp}::bigint, ${arr(table)})`,
  )).rows[0];

// ═══ ÉTAPE 0 — LA BRÈCHE EXISTAIT VRAIMENT (avant 0107) ════════════════════
console.log('  — étape 0 : sans 0107, le niveau DESCEND quand le crew grandit —');

await t('AVANT 0107 : un crew de référence atteint bien L4', async () => {
  await setState(0, 1);
  const r = await addXp(7500, BRUT);
  eq(r.level_to, 4, 'niveau après 7500 XP au barème brut');
  eq(await level(), 4, 'niveau écrit');
});

await t('AVANT 0107 : recruter (barème ×10) FAIT PERDRE des niveaux', async () => {
  // Même XP, crew dix fois plus grand : le barème durcit, et rien ne retient
  // le niveau. C'est exactement le piège social que 0107 ferme.
  const r = await addXp(0, GRAND);
  ok(r.level_to < 4, `le niveau aurait dû descendre sous 4, obtenu ${r.level_to}`);
  eq(await level(), r.level_to, 'la descente est réellement ÉCRITE en base');
});

// ═══ 0107 s'applique sur un Postgres réel ══════════════════════════════════
await t('0107 s’applique par-dessus la lignée 0002 → 0106', async () => {
  await apply(CIBLE);
});

console.log('\n  — après 0107 —');

// ═══ LE PLANCHER ═══════════════════════════════════════════════════════════
await t('APRÈS 0107 : recruter ne fait PLUS perdre de niveau', async () => {
  await setState(7500, 4);
  const r = await addXp(0, GRAND);
  eq(r.level_from, 4, 'niveau de départ');
  eq(r.level_to, 4, 'le niveau acquis est conservé malgré le barème durci');
  eq(await level(), 4, 'niveau écrit');
});

await t('le plancher tient même sur un barème absurdement durci', async () => {
  await setState(7500, 4);
  const r = await addXp(0, BRUT.map((x) => x * 1_000_000));
  eq(r.level_to, 4, 'un niveau acquis ne se reprend jamais');
});

// ═══ CE QUI DOIT CONTINUER DE MARCHER ══════════════════════════════════════
await t('le niveau MONTE toujours quand l’XP le mérite', async () => {
  await setState(0, 1);
  const r = await addXp(3000, BRUT);
  eq(r.level_from, 1, 'départ');
  eq(r.level_to, 3, 'montée normale');
});

await t('un crew plus grand monte plus lentement — pour le MÊME total d’XP', async () => {
  // La normalisation reste effective : le plancher ne l'annule pas, il empêche
  // seulement de REDESCENDRE. Un crew neuf et grand n'obtient pas L4 avec l'XP
  // qui suffisait à un crew de référence.
  await setState(0, 1);
  const r = await addXp(7500, GRAND);
  ok(r.level_to < 4, `un grand crew ne doit pas atteindre L4 avec 7500 XP, obtenu ${r.level_to}`);
});

await t('l’XP est cumulée, jamais remplacée, et n’est jamais négative', async () => {
  await setState(1000, 2);
  await addXp(2000, BRUT);
  const xp = (await db.query(`select xp from public.crews where id = '${CREW}'`)).rows[0].xp;
  eq(Number(xp), 3000, 'XP cumulée');
  await addXp(-5000, BRUT);
  const apres = (await db.query(`select xp from public.crews where id = '${CREW}'`)).rows[0].xp;
  eq(Number(apres), 3000, 'une XP négative ne retire rien');
});

await t('crew inconnu : no-op silencieux, aucune ligne rendue', async () => {
  const r = await db.query(
    `select * from public.add_crew_xp('33333333-3333-4333-8333-333333333333'::uuid, 100::bigint, ${arr(BRUT)})`,
  );
  eq(r.rows.length, 0, 'aucune ligne');
});

await t('le plafond de la table est respecté (jamais de niveau hors table)', async () => {
  await setState(0, 1);
  const r = await addXp(999_999_999, BRUT);
  eq(r.level_to, BRUT.length, 'niveau maximal = longueur de la table');
});

// ═══ PRIVILÈGES ════════════════════════════════════════════════════════════
await t('anon et authenticated n’exécutent pas add_crew_xp', async () => {
  for (const role of ['anon', 'authenticated', 'public']) {
    const r = await db.query(
      `select has_function_privilege('${role}', 'public.add_crew_xp(uuid,bigint,bigint[])', 'execute') as can`,
    );
    eq(r.rows[0].can, false, `${role} ne doit pas pouvoir exécuter add_crew_xp`);
  }
});

// ═══ ANTI-PAY-TO-WIN PAR ABSENCE ═══════════════════════════════════════════
await t('add_crew_xp ne lit AUCUN statut payant ni aucune surface de jeu', async () => {
  const r = await db.query(
    `select prosrc from pg_proc where proname = 'add_crew_xp'`,
  );
  const src = r.rows[0].prosrc;
  for (const interdit of ['purchases', 'entitlement', 'premium', 'hex_claims', 'territories']) {
    ok(!src.includes(interdit), `add_crew_xp mentionne « ${interdit} »`);
  }
});

console.log(`\n${passed} assertions vertes, ${failures.length} échec(s).`);
if (failures.length > 0) process.exit(1);
