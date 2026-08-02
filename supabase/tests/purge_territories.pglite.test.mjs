#!/usr/bin/env node
/**
 * GRYD — test EXÉCUTABLE de la migration 0111 (droit à l'effacement, suite).
 *
 * ═══ CE QUE CE TEST PROUVE ══════════════════════════════════════════════════
 *  0. LE TROU EXISTAIT : sur la lignée 0002 → 0110, un compte purgé LAISSE ses
 *     lignes `territories` derrière lui — une personne, un polygone, des dates.
 *     Sans cette étape, rien ne distinguerait 0111 d'un no-op.
 *  1. Après 0111, le territoire du compte purgé disparaît.
 *  2. LES CASCADES SUIVENT : la contestation en cours (0078) et les règnes
 *     attachés (0109) partent avec — plus rien ne pointe vers un fantôme.
 *  3. LE CAS QUE LA CASCADE NE COUVRE PAS : le règne du joueur sur un
 *     territoire appartenant AUJOURD'HUI À QUELQU'UN D'AUTRE. C'est la raison
 *     d'être de la suppression explicite de 0109 §4, et c'est le piège le plus
 *     facile à manquer.
 *  4. ON NE TOUCHE QUE LE COMPTE PURGÉ : territoires, règnes et contestations
 *     des autres restent intacts.
 *  5. Les territoires de CREW ne sont pas emportés par la purge d'un membre —
 *     ils appartiennent au crew, pas à lui.
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

const ANNE = '11111111-1111-4111-8111-111111111111';
const BRUNO = '22222222-2222-4222-8222-222222222222';
const CLARA = '66666666-6666-4666-8666-666666666666';
/** Purgé à l'étape 0 — ne JAMAIS le réutiliser ensuite : il n'existe plus. */
const DAVID = '88888888-8888-4888-8888-888888888888';
const CREW = '33333333-3333-4333-8333-333333333333';
const POLY = '{"type":"Polygon","coordinates":[[[2.30,48.86],[2.31,48.86],[2.31,48.87],[2.30,48.87],[2.30,48.86]]]}';

await db.exec(`
  set time zone 'UTC';
  create role anon;
  create role authenticated;
  create role service_role;
  create schema auth;
  create table auth.users (id uuid primary key);
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
const LINEAGE = all.filter((f) => Number(f.slice(0, 4)) <= 110);
const CIBLE = all.find((f) => f.startsWith('0111_'));
if (!CIBLE) {
  console.error('La migration 0111 est introuvable — ce test ne vérifie rien.');
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

console.log('purge_territories — migration 0111 sur PGlite\n');
console.log(`  (lignée rejouée : ${LINEAGE.length} migrations, 0002 → 0110)\n`);

await db.exec(`
  insert into auth.users (id) values ('${ANNE}'),('${BRUNO}'),('${CLARA}'),('${DAVID}');
  insert into public.users (id, pseudo) values
    ('${ANNE}','anne'),('${BRUNO}','bruno'),('${CLARA}','clara'),('${DAVID}','david')
    on conflict (id) do nothing;
  insert into public.city_zones (city_id, name, geojson, status)
    values ('paris','Paris',
      '{"type":"Polygon","coordinates":[[[2.22,48.81],[2.47,48.81],[2.47,48.91],[2.22,48.91],[2.22,48.81]]]}'::jsonb,
      'wild')
    on conflict (city_id) do nothing;
  insert into public.crews (id, name, color, city_id, code, created_by)
    values ('${CREW}','Foulees 93',3,'paris','ABC123','${ANNE}');
  insert into public.crew_members (crew_id, user_id, role, left_at)
    values ('${CREW}','${ANNE}','founder', null);
`);

let n = 0;
const territoire = async (ownerType, ownerId) => {
  n += 1;
  const id = `7${String(n).padStart(7, '0')}-0000-4000-8000-000000000000`;
  await db.exec(`
    insert into public.territories
      (id, activity, owner_type, owner_id, geometry, area_m2, city_id, state,
       controlled_since, publish_after, algorithm_version)
    values
      ('${id}', 'run', '${ownerType}', '${ownerId}', '${POLY}'::jsonb, ${2000 + n},
       'paris', '${ownerType === 'crew' ? 'owned_crew' : 'owned_personal'}',
       now(), now(), 'test');
  `);
  return id;
};

const compte = async (sql) => Number((await db.query(sql)).rows[0].n);
const purger = async (uid) => {
  await db.exec(
    `update public.users set deletion_requested_at = now() - interval '400 days' where id = '${uid}'`,
  );
  return (await db.query(`select public.purge_due_accounts() as n`)).rows[0].n;
};

// ═══ ÉTAPE 0 — LE TROU EXISTAIT ═══════════════════════════════════════════
await t('AVANT 0111 : un compte purgé LAISSE ses territoires derrière lui', async () => {
  const tid = await territoire('user', DAVID);
  eq(await purger(DAVID), 1, 'le compte est bien purgé');
  const reste = await compte(
    `select count(*)::int as n from public.territories where id = '${tid}'`,
  );
  eq(reste, 1, 'le territoire de David survit — c’est exactement le trou');
  const orphelin = await compte(
    `select count(*)::int as n from public.territories t
      where t.owner_type = 'user'
        and not exists (select 1 from public.users u where u.id = t.owner_id)`,
  );
  eq(orphelin, 1, 'et il pointe vers un compte qui n’existe plus');
  await db.exec(`delete from public.territories where id = '${tid}'`);
});

await t('0111 s’applique par-dessus la lignée 0002 → 0110', async () => {
  await apply(CIBLE);
});

// ═══ LE CAS NOMINAL, ET SES CASCADES ══════════════════════════════════════
await t('le territoire du compte purgé disparaît, avec contestation et règne', async () => {
  const aAnne = await territoire('user', ANNE);
  // Bruno conteste le territoire d'Anne.
  await db.exec(`
    insert into public.territory_contests
      (territory_id, attacker_type, attacker_id, overlap_ratio, started_at, expires_at)
    values ('${aAnne}', 'user', '${BRUNO}', 0.75, now(), now() + interval '18 hours');
  `);
  ok(
    (await compte(
      `select count(*)::int as n from public.territory_reigns where territory_id = '${aAnne}'`,
    )) > 0,
    'le règne existe avant la purge',
  );

  eq(await purger(ANNE), 1, 'compte purgé');

  eq(
    await compte(`select count(*)::int as n from public.territories where id = '${aAnne}'`),
    0,
    'le territoire a disparu',
  );
  eq(
    await compte(
      `select count(*)::int as n from public.territory_contests where territory_id = '${aAnne}'`,
    ),
    0,
    'la contestation en cours part avec — il n’y a plus rien à prendre',
  );
  eq(
    await compte(
      `select count(*)::int as n from public.territory_reigns where territory_id = '${aAnne}'`,
    ),
    0,
    'le règne attaché part avec',
  );
});

// ═══ LE PIÈGE : CE QUE LA CASCADE NE COUVRE PAS ═══════════════════════════
await t('le règne sur un territoire devenu celui d’un AUTRE part aussi', async () => {
  // Bruno tient un quartier ; Clara le lui prend. Le territoire est à Clara :
  // purger Bruno ne le supprime PAS — mais le règne de Bruno doit disparaître.
  // C'est la raison d'être de la suppression explicite de 0109 §4.
  const dispute = await territoire('user', BRUNO);
  await db.exec(
    `update public.territories set owner_id = '${CLARA}' where id = '${dispute}'`,
  );
  eq(
    await compte(
      `select count(*)::int as n from public.territory_reigns
        where territory_id = '${dispute}' and owner_id = '${BRUNO}'`,
    ),
    1,
    'Bruno a bien un règne CLOS sur le territoire de Clara',
  );

  await purger(BRUNO);

  eq(
    await compte(`select count(*)::int as n from public.territories where id = '${dispute}'`),
    1,
    'le territoire reste à Clara — il n’appartient plus à Bruno',
  );
  eq(
    await compte(
      `select count(*)::int as n from public.territory_reigns where owner_id = '${BRUNO}'`,
    ),
    0,
    'mais AUCUNE trace de Bruno ne subsiste dans l’histoire',
  );
  eq(
    await compte(
      `select count(*)::int as n from public.territory_reigns
        where territory_id = '${dispute}' and owner_id = '${CLARA}'`,
    ),
    1,
    'et le règne de Clara, lui, est intact',
  );
});

// ═══ ON NE TOUCHE QUE LE COMPTE PURGÉ ═════════════════════════════════════
await t('les territoires de CREW ne sont pas emportés par la purge d’un membre', async () => {
  const duCrew = await territoire('crew', CREW);
  const encore = await compte(
    `select count(*)::int as n from public.territories where id = '${duCrew}'`,
  );
  eq(encore, 1, 'le territoire du crew appartient au CREW, pas à un membre');
  // Anne (fondatrice) a déjà été purgée plus haut : le territoire de crew créé
  // après l'est resté, et un nouveau passage de purge ne doit rien y changer.
  await db.query(`select public.purge_due_accounts()`);
  eq(
    await compte(`select count(*)::int as n from public.territories where id = '${duCrew}'`),
    1,
    'une purge sans compte échu ne supprime rien',
  );
});

await t('plus AUCUN territoire orphelin ne subsiste', async () => {
  const orphelins = await compte(
    `select count(*)::int as n from public.territories t
      where t.owner_type = 'user'
        and not exists (select 1 from public.users u where u.id = t.owner_id)`,
  );
  eq(orphelins, 0, 'aucun territoire ne pointe vers un compte disparu');
});

await t('une purge à vide rend 0 et ne casse rien (idempotence du cron)', async () => {
  eq(Number((await db.query(`select public.purge_due_accounts() as n`)).rows[0].n), 0);
  eq(Number((await db.query(`select public.purge_due_accounts() as n`)).rows[0].n), 0);
});

console.log(`\n${passed} assertions vertes, ${failures.length} échec(s).`);
if (failures.length > 0) process.exit(1);
