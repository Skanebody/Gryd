#!/usr/bin/env node
/**
 * GRYD — test EXÉCUTABLE de la migration 0109 (`territory_reigns`).
 *
 * ═══ CE QUE CE TEST PROUVE ══════════════════════════════════════════════════
 *  0. L'OUBLI EXISTAIT : sur la lignée 0002 → 0108, changer de propriétaire ne
 *     laisse AUCUNE trace de l'ancien. Sans cette étape, rien ne distinguerait
 *     0109 d'un no-op.
 *  1. Le règne s'ouvre à la CRÉATION du territoire, daté sur `controlled_since`.
 *  2. Le règne se ferme et un autre s'ouvre quand le propriétaire change —
 *     PAR TRIGGER, donc quel que soit l'auteur de l'écriture. C'est le point
 *     entier de la migration : `resolve_due_contests` (0080) n'a pas été
 *     instrumentée, et l'histoire est quand même complète.
 *  3. Ce qui n'est PAS un changement de propriétaire ne ferme aucun règne
 *     (défense, passage en contesté, recalcul d'aire) — sinon un défenseur
 *     verrait son règne coupé chaque fois qu'il défend.
 *  4. UN SEUL règne ouvert par territoire, garanti par index unique.
 *  5. Les champs dénormalisés décrivent le règne TEL QU'IL A ÉTÉ : ils ne
 *     suivent pas les changements ultérieurs du territoire.
 *  6. VIE PRIVÉE : la table n'est ni publique ni écrivable par un client, et sa
 *     policy de lecture est bornée au propriétaire / aux membres ACTIFS du crew.
 *  7. DROIT À L'EFFACEMENT : `purge_due_accounts()` efface bien l'historique
 *     polymorphe, qu'aucune cascade n'atteint.
 *
 * ═══ CE QU'IL NE PROUVE PAS ════════════════════════════════════════════════
 *  · L'EFFET RÉEL DE LA RLS : PGlite tourne en SUPERUTILISATEUR, les policies ne
 *    s'appliquent pas. On vérifie leur DÉCLARATION (catalogue `pg_policies`) et
 *    les privilèges de table — pas leur application par un vrai rôle. C'est
 *    `npm run verify:rls` qui fait le reste, hors gate.
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
const CREW = '33333333-3333-4333-8333-333333333333';
const TERR = '44444444-4444-4444-8444-444444444444';
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
const LINEAGE = all.filter((f) => Number(f.slice(0, 4)) <= 108);
const CIBLE = all.find((f) => f.startsWith('0109_'));
if (!CIBLE) {
  console.error('La migration 0109 est introuvable — ce test ne vérifie rien.');
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

console.log('territory_reigns — migration 0109 sur PGlite\n');
console.log(`  (lignée rejouée : ${LINEAGE.length} migrations, 0002 → 0108)\n`);

await db.exec(`
  insert into auth.users (id) values ('${ANNE}'),('${BRUNO}');
  insert into public.users (id, pseudo) values ('${ANNE}','anne'),('${BRUNO}','bruno')
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

const creerTerritoire = async () =>
  db.exec(`
    insert into public.territories
      (id, activity, owner_type, owner_id, geometry, area_m2, city_id, state,
       controlled_since, publish_after, algorithm_version)
    values
      ('${TERR}', 'run', 'user', '${ANNE}', '${POLY}'::jsonb, 12345, 'paris', 'owned_personal',
       timestamptz '2026-03-04 08:00:00+00', timestamptz '2026-03-04 08:00:00+00', 'test');
  `);

const reigns = async () =>
  (await db.query(
    `select owner_type, owner_id, activity, city_id, area_m2, started_at, ended_at, ended_reason
       from public.territory_reigns order by started_at, id`,
  )).rows;

// ═══ ÉTAPE 0 — L'OUBLI EXISTAIT ═══════════════════════════════════════════
await t('AVANT 0109 : aucune table n’historise la propriété', async () => {
  const r = await db.query(
    `select to_regclass('public.territory_reigns') as t`,
  );
  eq(r.rows[0].t, null, 'territory_reigns ne devrait pas encore exister');
  await creerTerritoire();
  await db.exec(
    `update public.territories set owner_id = '${BRUNO}' where id = '${TERR}'`,
  );
  const t2 = await db.query(
    `select owner_id from public.territories where id = '${TERR}'`,
  );
  eq(t2.rows[0].owner_id, BRUNO, 'le propriétaire a bien changé');
  // …et il ne reste RIEN d'Anne. C'est exactement l'oubli que 0109 répare.
});

await t('0109 s’applique par-dessus la lignée 0002 → 0108', async () => {
  await db.exec(`delete from public.territories where id = '${TERR}'`);
  await apply(CIBLE);
});

// ═══ 1. LE RÈGNE S'OUVRE À LA CRÉATION ════════════════════════════════════
await t('créer un territoire ouvre un règne, daté sur controlled_since', async () => {
  await creerTerritoire();
  const r = await reigns();
  eq(r.length, 1, 'un seul règne');
  eq(r[0].owner_id, ANNE, 'propriétaire');
  eq(r[0].owner_type, 'user', 'type');
  eq(r[0].activity, 'run', 'discipline figée');
  eq(r[0].city_id, 'paris', 'ville');
  eq(Number(r[0].area_m2), 12345, 'aire');
  eq(r[0].ended_at, null, 'règne EN COURS');
  eq(r[0].ended_reason, null, 'aucune raison de fin');
  ok(
    new Date(r[0].started_at).toISOString().startsWith('2026-03-04'),
    `le règne doit dater de la prise de contrôle, obtenu ${r[0].started_at}`,
  );
});

// ═══ 2. LE CHANGEMENT DE PROPRIÉTAIRE, PAR TRIGGER ════════════════════════
await t('perdre le territoire ferme le règne et en ouvre un autre', async () => {
  // Écriture BRUTE, exactement comme le fait `resolve_due_contests` (0080),
  // qui n'a PAS été instrumentée. C'est tout l'intérêt du trigger.
  await db.exec(`update public.territories set owner_id = '${BRUNO}' where id = '${TERR}'`);
  const r = await reigns();
  eq(r.length, 2, 'deux règnes');
  eq(r[0].owner_id, ANNE, 'le premier est celui d’Anne');
  ok(r[0].ended_at !== null, 'le règne d’Anne est CLOS');
  eq(r[0].ended_reason, 'lost', 'perdu au profit d’un autre');
  eq(r[1].owner_id, BRUNO, 'le second est celui de Bruno');
  eq(r[1].ended_at, null, 'et il est en cours');
});

await t('un territoire qui perd tout propriétaire clôt le règne sans en ouvrir', async () => {
  await db.exec(
    `update public.territories
        set owner_id = null, owner_type = null, state = 'unowned'
      where id = '${TERR}'`,
  );
  const r = await reigns();
  eq(r.length, 2, 'aucun nouveau règne');
  eq(r[1].ended_reason, 'released', 'libéré, pas perdu au profit de quelqu’un');
  const ouverts = r.filter((x) => x.ended_at === null);
  eq(ouverts.length, 0, 'plus aucun règne ouvert');
});

await t('un règne de CREW s’enregistre comme tel', async () => {
  await db.exec(
    `update public.territories
        set owner_type = 'crew', owner_id = '${CREW}', state = 'owned_crew'
      where id = '${TERR}'`,
  );
  const r = await reigns();
  eq(r[r.length - 1].owner_type, 'crew', 'type crew');
  eq(r[r.length - 1].owner_id, CREW, 'le crew');
});

// ═══ 3. CE QUI NE FERME AUCUN RÈGNE ═══════════════════════════════════════
await t('défendre, contester ou recalculer une aire NE COUPE PAS le règne', async () => {
  const avant = (await reigns()).length;
  await db.exec(`
    update public.territories set defense_level = 2 where id = '${TERR}';
    update public.territories set state = 'contested' where id = '${TERR}';
    update public.territories set area_m2 = 99999 where id = '${TERR}';
    update public.territories set state = 'owned_crew' where id = '${TERR}';
  `);
  const apres = await reigns();
  eq(apres.length, avant, 'aucun règne ajouté');
  const ouverts = apres.filter((x) => x.ended_at === null);
  eq(ouverts.length, 1, 'le règne en cours est toujours ouvert');
  // Et la mémoire NE BOUGE PAS avec le territoire :
  eq(Number(ouverts[0].area_m2), 12345, 'l’aire du règne décrit ce qu’il A ÉTÉ');
});

await t('réécrire le MÊME propriétaire n’ouvre pas un second règne', async () => {
  const avant = (await reigns()).length;
  await db.exec(
    `update public.territories
        set owner_id = '${CREW}', owner_type = 'crew', state = 'owned_crew'
      where id = '${TERR}'`,
  );
  eq((await reigns()).length, avant, 'aucun règne ajouté sur une écriture identique');
});

// ═══ 4. L'INVARIANT ═══════════════════════════════════════════════════════
await t('UN SEUL règne ouvert par territoire (index unique)', async () => {
  const r = await db.query(
    `select count(*)::int as n from public.territory_reigns
      where territory_id = '${TERR}' and ended_at is null`,
  );
  eq(r.rows[0].n, 1, 'un seul règne en cours');
  let refuse = false;
  try {
    await db.exec(`
      insert into public.territory_reigns
        (territory_id, owner_type, owner_id, activity, area_m2)
      values ('${TERR}', 'user', '${BRUNO}', 'run', 1);
    `);
  } catch {
    refuse = true;
  }
  ok(refuse, 'un second règne ouvert doit être REFUSÉ par la base');
});

// ═══ 6. VIE PRIVÉE ════════════════════════════════════════════════════════
await t('la RLS est active et la lecture est bornée au propriétaire', async () => {
  const r = await db.query(
    `select relrowsecurity from pg_class where relname = 'territory_reigns'`,
  );
  eq(r.rows[0].relrowsecurity, true, 'RLS activée');
  const p = await db.query(
    `select cmd, qual from pg_policies where tablename = 'territory_reigns'`,
  );
  eq(p.rows.length, 1, 'une seule policy — et c’est une policy de LECTURE');
  eq(p.rows[0].cmd, 'SELECT', 'aucune policy d’écriture');
  ok(p.rows[0].qual.includes('uid'), 'la lecture est bornée à auth.uid()');
  ok(p.rows[0].qual.includes('left_at'), 'un membre PARTI ne lit plus l’histoire du crew');
});

await t('aucun client ne peut ÉCRIRE le registre', async () => {
  for (const role of ['anon', 'authenticated']) {
    for (const priv of ['INSERT', 'UPDATE', 'DELETE']) {
      const r = await db.query(
        `select has_table_privilege('${role}', 'public.territory_reigns', '${priv}') as can`,
      );
      eq(r.rows[0].can, false, `${role} ne doit pas pouvoir ${priv}`);
    }
  }
  const anonSelect = await db.query(
    `select has_table_privilege('anon', 'public.territory_reigns', 'SELECT') as can`,
  );
  eq(anonSelect.rows[0].can, false, 'anon ne lit rien du tout');
});

await t('le registre n’entre dans AUCUNE vue publique', async () => {
  const r = await db.query(
    `select viewname from pg_views
      where schemaname = 'public' and definition ilike '%territory_reigns%'`,
  );
  eq(r.rows.length, 0, `des vues exposent le registre : ${JSON.stringify(r.rows)}`);
});

// ═══ 7. DROIT À L'EFFACEMENT ══════════════════════════════════════════════
await t('purge_due_accounts efface l’historique polymorphe', async () => {
  // Anne a un règne CLOS (elle a perdu le territoire au profit de Bruno).
  const avant = await db.query(
    `select count(*)::int as n from public.territory_reigns where owner_id = '${ANNE}'`,
  );
  ok(avant.rows[0].n > 0, 'Anne doit avoir une histoire avant la purge');

  await db.exec(`
    update public.users
       set deletion_requested_at = now() - interval '400 days'
     where id = '${ANNE}';
  `);
  await db.query(`select public.purge_due_accounts()`);

  const apres = await db.query(
    `select count(*)::int as n from public.territory_reigns where owner_id = '${ANNE}'`,
  );
  eq(apres.rows[0].n, 0, 'l’histoire d’Anne doit avoir disparu avec son compte');
  // Et le règne des AUTRES n'est pas emporté au passage.
  const bruno = await db.query(
    `select count(*)::int as n from public.territory_reigns where owner_id = '${BRUNO}'`,
  );
  ok(bruno.rows[0].n > 0, 'la purge ne doit toucher QUE le compte purgé');
});

console.log(`\n${passed} assertions vertes, ${failures.length} échec(s).`);
if (failures.length > 0) process.exit(1);
