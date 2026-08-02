#!/usr/bin/env node
/**
 * GRYD — test EXÉCUTABLE de la migration 0110 (`my_territory_history`).
 *
 * ═══ CE QUE CE TEST PROUVE ══════════════════════════════════════════════════
 *  0. LA LECTURE N'EXISTAIT PAS sur la lignée 0002 → 0109.
 *  1. Elle rend MES règnes, et RIEN d'autre : ni ceux d'un autre joueur, ni
 *     ceux d'un crew (« mon histoire » est celle du joueur).
 *  2. Elle est `security INVOKER` — donc la RLS de 0109 s'applique. C'est le
 *     point de vie privée le plus important du fichier : un `security definer`
 *     contournerait la policy et ferait reposer toute l'isolation sur le filtre
 *     écrit dans le corps.
 *  3. Les refus sont DISTINCTS et nommés (`signed_out`, `bad_activity`) — une
 *     discipline inconnue ne doit pas se déguiser en « tu n'as rien tenu ».
 *  4. Elle rend le BRUT : aucune durée, aucun total. La dérivation est dans le
 *     moteur pur, testée là-bas.
 *  5. Les privilèges : `authenticated` exécute, `anon` et `public` non.
 *
 * ═══ CE QU'IL NE PROUVE PAS ════════════════════════════════════════════════
 *  · L'EFFET RÉEL DE LA RLS : PGlite tourne en SUPERUTILISATEUR, les policies ne
 *    mordent pas. L'isolation vérifiée ici est celle du FILTRE `auth.uid()`
 *    écrit dans le corps — le second verrou. Le premier (la policy) est vérifié
 *    par déclaration, et réellement par `npm run verify:rls`, hors gate.
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
const LINEAGE = all.filter((f) => Number(f.slice(0, 4)) <= 109);
const CIBLE = all.find((f) => f.startsWith('0110_'));
if (!CIBLE) {
  console.error('La migration 0110 est introuvable — ce test ne vérifie rien.');
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

console.log('my_territory_history — migration 0110 sur PGlite\n');
console.log(`  (lignée rejouée : ${LINEAGE.length} migrations, 0002 → 0109)\n`);

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

/** Crée un territoire (le trigger de 0109 ouvre le règne tout seul). */
let n = 0;
const territoire = async (ownerType, ownerId, activity, since) => {
  n += 1;
  const id = `5${String(n).padStart(7, '0')}-0000-4000-8000-000000000000`;
  await db.exec(`
    insert into public.territories
      (id, activity, owner_type, owner_id, geometry, area_m2, city_id, state,
       controlled_since, publish_after, algorithm_version)
    values
      ('${id}', '${activity}', '${ownerType}', '${ownerId}', '${POLY}'::jsonb, ${1000 + n},
       'paris', '${ownerType === 'crew' ? 'owned_crew' : 'owned_personal'}',
       timestamptz '${since}', timestamptz '${since}', 'test');
  `);
  return id;
};

const histoire = async (activity = null, limit = null) => {
  const a = activity === null ? 'null' : `'${activity}'`;
  const l = limit === null ? 'null' : String(limit);
  return (await db.query(`select public.my_territory_history(${a}, ${l}) as h`)).rows[0].h;
};

// ═══ ÉTAPE 0 ══════════════════════════════════════════════════════════════
await t('AVANT 0110 : la fonction de lecture n’existe pas', async () => {
  const r = await db.query(
    `select count(*)::int as n from pg_proc where proname = 'my_territory_history'`,
  );
  eq(r.rows[0].n, 0, 'my_territory_history ne devrait pas encore exister');
});

await t('0110 s’applique par-dessus la lignée 0002 → 0109', async () => {
  await apply(CIBLE);
});

// ═══ REFUS DISTINCTS ══════════════════════════════════════════════════════
await t('pas connecté → refus NOMMÉ, jamais une liste vide', async () => {
  await db.exec(`update auth._who set uid = null`);
  const h = await histoire();
  eq(h.ok, false, 'refus');
  eq(h.reason, 'signed_out', 'motif');
  ok(!('reigns' in h), 'aucune liste : « rien lu » n’est pas « rien tenu »');
});

await t('discipline inconnue → refus NOMMÉ, jamais « tu n’as rien tenu »', async () => {
  await db.exec(`update auth._who set uid = '${ANNE}'`);
  const h = await histoire('car');
  eq(h.ok, false, 'refus');
  eq(h.reason, 'bad_activity', 'motif');
});

// ═══ CE QUE JE VOIS, ET CE QUE JE NE VOIS PAS ═════════════════════════════
await t('aucun règne → liste VIDE et ok:true (« lu, il n’y a rien »)', async () => {
  const h = await histoire();
  eq(h.ok, true, 'la lecture a réussi');
  eq(h.reigns, [], 'liste vide — distincte d’un refus');
});

await t('mes règnes sortent, avec leurs champs bruts', async () => {
  await territoire('user', ANNE, 'run', '2026-03-04 08:00:00+00');
  const h = await histoire();
  eq(h.reigns.length, 1, 'un règne');
  const r = h.reigns[0];
  eq(r.activity, 'run', 'discipline');
  eq(r.cityId, 'paris', 'ville');
  eq(r.endedAt, null, 'en cours');
  eq(r.endedReason, null, 'aucune raison de fin');
  ok(String(r.startedAt).startsWith('2026-03-04'), `date de début, obtenu ${r.startedAt}`);
  // BRUT : aucune dérivation ne doit venir du serveur.
  for (const derive of ['days', 'heldDays', 'duration', 'longest', 'summary']) {
    ok(!(derive in r), `« ${derive} » ne doit pas être calculé en SQL`);
  }
});

await t('l’histoire d’un AUTRE joueur ne sort JAMAIS', async () => {
  await territoire('user', BRUNO, 'run', '2026-01-01 08:00:00+00');
  // L'aire est unique par territoire (1000 + n) : elle sert d'empreinte pour
  // vérifier qu'AUCUN octet de Bruno n'a traversé, pas seulement que le COMPTE
  // est bon — un filtre fautif pourrait rendre la bonne quantité de mauvaises
  // lignes.
  const aireDeBruno = await db.query(
    `select area_m2 from public.territories where owner_id = '${BRUNO}'`,
  );
  const empreinte = String(Number(aireDeBruno.rows[0].area_m2));
  const h = await histoire();
  eq(h.reigns.length, 1, 'toujours un seul règne : celui d’Anne');
  eq(h.reigns[0].cityId, 'paris', 'et c’est bien un règne lisible');
  ok(
    !JSON.stringify(h.reigns).includes(empreinte),
    `l’aire ${empreinte} de Bruno ne doit apparaître nulle part`,
  );
});

await t('les règnes de CREW ne sortent pas de « mon histoire »', async () => {
  await territoire('crew', CREW, 'run', '2026-02-01 08:00:00+00');
  const h = await histoire();
  eq(h.reigns.length, 1, '« mon histoire » est celle du JOUEUR');
});

// ═══ FILTRE, ORDRE, BORNES ════════════════════════════════════════════════
await t('la lentille de discipline borne une VRAIE lecture', async () => {
  await territoire('user', ANNE, 'bike', '2026-05-01 08:00:00+00');
  eq((await histoire()).reigns.length, 2, 'sans lentille : les deux mondes');
  eq((await histoire('run')).reigns.length, 1, 'lentille course');
  eq((await histoire('bike')).reigns.length, 1, 'lentille vélo');
  eq((await histoire('bike')).reigns[0].activity, 'bike', 'et c’est le bon monde');
});

await t('les règnes sortent du plus RÉCENT au plus ancien', async () => {
  const h = await histoire();
  ok(
    new Date(h.reigns[0].startedAt) >= new Date(h.reigns[1].startedAt),
    'ordre décroissant',
  );
});

await t('la limite est bornée, et une valeur absurde ne casse rien', async () => {
  eq((await histoire(null, 1)).reigns.length, 1, 'limite respectée');
  ok((await histoire(null, 0)).ok, 'limite 0 → plancher, pas une erreur');
  ok((await histoire(null, 99999)).ok, 'limite énorme → plafond, pas une erreur');
  ok((await histoire(null, -5)).ok, 'limite négative → plancher');
});

// ═══ VIE PRIVÉE : LE POINT LE PLUS IMPORTANT ══════════════════════════════
await t('la fonction est security INVOKER — la RLS reste le garde', async () => {
  const r = await db.query(
    `select prosecdef from pg_proc where proname = 'my_territory_history'`,
  );
  eq(
    r.rows[0].prosecdef,
    false,
    'un security definer contournerait la policy de 0109 et ferait reposer toute la vie privée sur le filtre du corps',
  );
});

await t('privilèges : authenticated exécute, anon et public non', async () => {
  const sig = 'public.my_territory_history(text,integer)';
  eq(
    (await db.query(`select has_function_privilege('authenticated', '${sig}', 'execute') as c`))
      .rows[0].c,
    true,
    'authenticated doit pouvoir lire SON histoire',
  );
  for (const role of ['anon', 'public']) {
    eq(
      (await db.query(`select has_function_privilege('${role}', '${sig}', 'execute') as c`))
        .rows[0].c,
      false,
      `${role} ne doit rien pouvoir lire`,
    );
  }
});

console.log(`\n${passed} assertions vertes, ${failures.length} échec(s).`);
if (failures.length > 0) process.exit(1);
