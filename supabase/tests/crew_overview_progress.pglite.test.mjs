#!/usr/bin/env node
/**
 * GRYD — test EXÉCUTABLE de la migration 0108 (`crew_overview_progress`).
 *
 * ═══ CE QUE CE TEST PROUVE ══════════════════════════════════════════════════
 *  0. LE MANQUE EXISTAIT : sur la lignée 0002 → 0107, `crew_overview()` ne rend
 *     NI `level`, NI `xp`, NI `memberCount`. Sans cette étape, rien ne
 *     distinguerait 0108 d'un no-op.
 *  1. 0108 s'applique par-dessus, et le corps repris de 0071 reste valide.
 *  2. Les trois clés sont RÉELLES : elles suivent `crews.xp/level` et le nombre
 *     de membres ACTIFS, pas une valeur figée.
 *  3. RIEN N'EST PERDU : les clés que le HQ crew consomme déjà (`crew`, `role`,
 *     `territory`, `members`) sont toujours là. C'est le risque n°1 quand on
 *     recrée une fonction de 170 lignes.
 *  4. `code` reste ABSENT (secret depuis 0036) — la régression qui coûterait le
 *     plus cher, et la plus facile à commettre en rouvrant ce payload.
 *  5. Les membres PARTIS ne sont pas comptés : `memberCount` sert au barème
 *     normalisé (0107), et gonfler la taille DURCIRAIT le barème de ceux qui
 *     restent.
 *
 * ═══ CE QU'IL NE PROUVE PAS ════════════════════════════════════════════════
 *  · L'effet réel de la RLS : PGlite tourne en SUPERUTILISATEUR. On y simule
 *    `auth.uid()` par une fonction, ce qui teste la LOGIQUE de la RPC, pas
 *    l'isolation par rôle.
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

const ME = '11111111-1111-4111-8111-111111111111';
const PAL = '44444444-4444-4444-8444-444444444444';
const PARTI = '55555555-5555-4555-8555-555555555555';
const CREW = '22222222-2222-4222-8222-222222222222';

await db.exec(`
  set time zone 'UTC';
  create role anon;
  create role authenticated;
  create role service_role;
  create schema auth;
  create table auth.users (id uuid primary key);
  -- auth.uid() simulé : la RPC est strictement personnelle, il faut donc
  -- pouvoir se faire passer pour un joueur précis. (Aucun accent grave dans ce
  -- bloc : il est DANS un template literal JS, et le terminerait.)
  create table auth._who (uid uuid);
  insert into auth._who values (null);
  create function auth.uid() returns uuid language sql stable as $$ select uid from auth._who limit 1 $$;
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
const LINEAGE = all.filter((f) => Number(f.slice(0, 4)) <= 107);
const CIBLE = all.find((f) => f.startsWith('0108_'));
if (!CIBLE) {
  console.error('La migration 0108 est introuvable — ce test ne vérifie rien.');
  process.exit(1);
}

const apply = async (file) => {
  let sql = readFileSync(join(MIGRATIONS, file), 'utf8');
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

console.log('crew_overview_progress — migration 0108 sur PGlite\n');
console.log(`  (lignée rejouée : ${LINEAGE.length} migrations, 0002 → 0107)\n`);

await db.exec(`
  insert into auth.users (id) values ('${ME}'),('${PAL}'),('${PARTI}');
  insert into public.users (id, pseudo) values
    ('${ME}','moi'),('${PAL}','pote'),('${PARTI}','parti')
    on conflict (id) do nothing;
  insert into public.city_zones (city_id, name, geojson, status)
    values ('paris','Paris',
      '{"type":"Polygon","coordinates":[[[2.22,48.81],[2.47,48.81],[2.47,48.91],[2.22,48.91],[2.22,48.81]]]}'::jsonb,
      'wild')
    on conflict (city_id) do nothing;
  insert into public.crews (id, name, color, city_id, code, created_by, xp, level)
    values ('${CREW}','Foulées 93',3,'paris','ABC123','${ME}', 7500, 4);
  -- Le rôle est EXPLICITE : la colonne a pour défaut 'runner' (0013), et un
  -- insert brut ne passe pas par create_crew qui, lui, pose 'founder'.
  insert into public.crew_members (crew_id, user_id, role, left_at) values
    ('${CREW}','${ME}',     'founder', null),
    ('${CREW}','${PAL}',    'runner',  null),
    ('${CREW}','${PARTI}',  'runner',  now());
  update auth._who set uid = '${ME}';
`);

const overview = async () =>
  (await db.query(`select public.crew_overview() as o`)).rows[0].o;

// ═══ ÉTAPE 0 — LE MANQUE EXISTAIT ═════════════════════════════════════════
await t('AVANT 0108 : ni level, ni xp, ni memberCount dans le payload', async () => {
  const o = await overview();
  eq(o.ok, true, 'la RPC répond bien pour un membre');
  for (const cle of ['level', 'xp', 'memberCount']) {
    ok(!(cle in o), `« ${cle} » ne devrait pas encore exister`);
  }
});

await t('0108 s’applique par-dessus la lignée 0002 → 0107', async () => {
  await apply(CIBLE);
});

// ═══ LES TROIS CLÉS SONT RÉELLES ══════════════════════════════════════════
await t('level et xp suivent la ligne `crews`', async () => {
  const o = await overview();
  eq(o.level, 4, 'niveau');
  eq(Number(o.xp), 7500, 'XP');
  await db.exec(`update public.crews set xp = 30000, level = 6 where id = '${CREW}'`);
  const apres = await overview();
  eq(apres.level, 6, 'niveau après écriture');
  eq(Number(apres.xp), 30000, 'XP après écriture');
});

await t('memberCount compte les ACTIFS, jamais ceux qui sont partis', async () => {
  // 3 lignes en base, 1 avec `left_at` renseigné → 2 membres actifs. Compter
  // le parti gonflerait la taille, donc DURCIRAIT le barème normalisé (0107)
  // pour ceux qui restent.
  const o = await overview();
  eq(Number(o.memberCount), 2, 'membres actifs');
});

await t('memberCount suit un départ réel', async () => {
  await db.exec(
    `update public.crew_members set left_at = now() where crew_id = '${CREW}' and user_id = '${PAL}'`,
  );
  eq(Number((await overview()).memberCount), 1, 'après le départ du pote');
  await db.exec(
    `update public.crew_members set left_at = null where crew_id = '${CREW}' and user_id = '${PAL}'`,
  );
});

// ═══ RIEN N'EST PERDU ═════════════════════════════════════════════════════
await t('les clés que le HQ crew consomme déjà sont toutes là', async () => {
  const o = await overview();
  for (const cle of ['ok', 'crew', 'role', 'territory', 'members']) {
    ok(cle in o, `« ${cle} » a disparu du payload`);
  }
  eq(o.crew.name, 'Foulées 93', 'le crew est bien le mien');
  eq(o.role, 'founder', 'mon rôle');
  ok(Array.isArray(o.members), 'members reste un tableau');
  for (const cle of ['hexesHeld', 'lastCaptureAt', 'cityRank', 'crewsInCity']) {
    ok(cle in o.territory, `territory.${cle} a disparu`);
  }
});

await t('le CODE du crew reste ABSENT du payload (secret depuis 0036)', async () => {
  const o = await overview();
  ok(!('code' in o.crew), 'crew.code exposé');
  ok(!JSON.stringify(o).includes('ABC123'), 'le code fuit quelque part dans le payload');
});

// ═══ REFUS INCHANGÉS ══════════════════════════════════════════════════════
await t('les refus restent les mêmes (signed_out / no_crew)', async () => {
  await db.exec(`update auth._who set uid = null`);
  eq((await overview()).reason, 'signed_out', 'non connecté');
  await db.exec(`update auth._who set uid = '${PARTI}'`);
  eq((await overview()).reason, 'no_crew', 'connecté mais sans crew');
  await db.exec(`update auth._who set uid = '${ME}'`);
});

// ═══ ANTI-PAY-TO-WIN PAR ABSENCE ══════════════════════════════════════════
await t('crew_overview ne lit AUCUN statut payant', async () => {
  const r = await db.query(`select prosrc from pg_proc where proname = 'crew_overview'`);
  for (const row of r.rows) {
    for (const interdit of ['purchases', 'entitlement', 'premium', 'support_tier']) {
      ok(!row.prosrc.includes(interdit), `crew_overview mentionne « ${interdit} »`);
    }
  }
});

console.log(`\n${passed} assertions vertes, ${failures.length} échec(s).`);
if (failures.length > 0) process.exit(1);
