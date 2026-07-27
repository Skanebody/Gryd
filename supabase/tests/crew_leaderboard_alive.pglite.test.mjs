#!/usr/bin/env node
/**
 * GRYD — test EXÉCUTABLE de la migration 0086 (`crew_leaderboard_alive`).
 * E54 « Classement crews » + la source serveur de E50 « Statistiques du crew ».
 *
 * ═══ POURQUOI CE FICHIER EXISTE ═════════════════════════════════════════════
 * 0086 répare une vue matérialisée qui n'a JAMAIS été rafraîchie et dont le
 * commentaire d'origine (0002:296) prétendait le contraire. La faute historique
 * n'était pas visible à la lecture — elle l'était seulement à l'exécution : la
 * vue rendait zéro, et zéro ressemble à un monde vide.
 *
 * Ce fichier vérifie donc à l'EXÉCUTION les trois choses qu'une relecture ne
 * peut pas établir :
 *   · que le rafraîchissement a lieu ET laisse une trace datée ;
 *   · que la surface vient de `territories` et JAMAIS d'un compte de cellules ;
 *   · que `crew_board()` distingue « jamais calculé » de « calculé, personne ».
 *
 * Docker est indisponible sur cette machine. PGlite — Postgres compilé en WASM —
 * exécute le VRAI SQL des migrations dans Node. Même harnais que
 * `leaderboard_surface.pglite.test.mjs`.
 *
 * ═══ CE QUE CE TEST PROUVE ══════════════════════════════════════════════════
 *  1. 0086 s'applique sur un Postgres réel, telle quelle, par-dessus la LIGNÉE
 *     COMPLÈTE des migrations.
 *  2. `crew_board()` REFUSE (`never_refreshed`) tant qu'aucun rafraîchissement
 *     n'a eu lieu — le refus qui justifie toute la migration.
 *  3. `refresh_crew_leaderboard()` horodate son passage dans
 *     `matview_refresh_state`, et elle est IDEMPOTENTE (deux appels, même
 *     contenu).
 *  4. SUR UNE BASE SANS CREW, le board rend `{ok:true, rows:[]}` — un VIDE, pas
 *     un refus, pas un chiffre inventé.
 *  5. LA SURFACE VIENT DE `territories`. Un crew dont les membres possèdent 12
 *     `hex_claims` et zéro territoire a une surface de 0 m² — jamais une aire
 *     estimée depuis un compte de cellules (constitution §6).
 *  6. Run et Bike ne se rencontrent jamais : deux lignes, jamais une somme.
 *  7. Les états d'HISTORIQUE (`expired`) n'entrent pas dans la surface d'un crew.
 *  8. Un membre PARTI (`left_at`) ne compte plus, ni dans l'effectif ni dans la
 *     surface.
 *  9. Le classement ne retient QUE les crews qui tiennent du terrain ; un crew à
 *     0 m² n'est pas « dernier », il est ABSENT et son `myRank` vaut `null`.
 * 10. Les EX AEQUO partagent le rang et le suivant saute (rang de compétition).
 * 11. `crew_stats()` borne défenses et distance à la fenêtre, garde les semaines
 *     à zéro dans la courbe, et refuse proprement `no_crew` / `bad_weeks`.
 * 12. Les privilèges : la matview est FERMÉE aux rôles clients (la seule porte
 *     est `crew_board()`), les deux RPC sont ouvertes à `authenticated`.
 *
 * ═══ CE QU'IL NE PROUVE PAS, dit ici plutôt que laissé croire ═══════════════
 *  · L'EFFET RÉEL DE LA RLS. PGlite tourne en SUPERUTILISATEUR : les policies ne
 *    s'y appliquent pas. `auth.uid()` est ici un bouchon REMPLAÇABLE (voir plus
 *    bas) — c'est ce qui permet de tester les RPC, mais ce n'est pas une preuve
 *    d'isolation entre comptes.
 *  · QUE `recompute_sectors` APPELLE LA FONCTION toutes les 15 minutes. Seul un
 *    vrai Supabase peut le montrer (`select * from cron.job`).
 *
 * ═══ LANCER ════════════════════════════════════════════════════════════════
 *   mkdir -p /tmp/pglite && cd /tmp/pglite
 *   echo '{"name":"pglite-scratch","private":true}' > package.json
 *   npm i --ignore-scripts @electric-sql/pglite
 *   cd <repo> && GRYD_PGLITE=/tmp/pglite/node_modules/@electric-sql/pglite/dist/index.js \
 *     node supabase/tests/crew_leaderboard_alive.pglite.test.mjs
 * Sans PGlite : sortie CODE 2 — un test non exécuté n'est JAMAIS vert.
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
      '    node supabase/tests/crew_leaderboard_alive.pglite.test.mjs',
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
// `auth.uid()` est ici LISIBLE DEPUIS UNE TABLE plutôt que constant : c'est la
// seule façon de tester des RPC `security definer` qui s'appuient dessus. Ce
// n'est PAS une simulation de la RLS (PGlite est superutilisateur) — c'est un
// interrupteur qui dit « qui appelle », rien de plus.
await db.exec(`
  set time zone 'UTC';
  create role anon;
  create role authenticated;
  create role service_role;
  create schema auth;
  create table auth.users (id uuid primary key);
  create table auth.gryd_current (uid uuid);
  insert into auth.gryd_current (uid) values (null);
  create function auth.uid() returns uuid language sql stable as $$
    select uid from auth.gryd_current limit 1
  $$;
  create schema extensions;
  create function extensions.gen_random_bytes(int) returns bytea
    language sql as $$ select decode(md5(random()::text), 'hex') $$;
  alter default privileges in schema public grant all on tables to anon, authenticated;
`);

/** Change l'appelant vu par `auth.uid()`. */
const asUser = (uid) =>
  db.query('update auth.gryd_current set uid = $1', [uid]);

// ─── LA LIGNÉE COMPLÈTE, jouée telle quelle ─────────────────────────────────
// Mêmes cinq fichiers sautés que dans `leaderboard_surface.pglite.test.mjs`, et
// pour la même raison : PGlite n'embarque ni `pgcrypto`, ni la publication
// realtime, ni `pg_cron`. Aucun ne touche ce que 0086 lit.
const SKIP = new Set([
  '0001_extensions.sql',
  '0020_crew_realtime.sql',
  '0038_sector_cron.sql',
  '0039_core_crons.sql',
  '0064_offensive_lifecycle.sql',
]);
const CRON = 'select cron.schedule(';
// BORNE HAUTE À 84, ET PAS 85 : un chantier VOISIN (E49, sortie de crew) a
// déposé `0085_crew_outing_create.sql` en parallèle. Cette migration-ci ne
// dépend pas de lui — elle lit `crews`, `crew_members`, `hex_claims`,
// `season_scores`, `territories` et `territory_contests`, toutes antérieures à
// 0082. Le rejouer ici ferait dépendre CE test de la santé d'un fichier qui ne
// lui appartient pas ; l'omettre ne cache rien, il prouve seulement que 0086
// tient sur un socle qui n'a jamais vu 0085.
const LINEAGE = readdirSync(MIGRATIONS)
  .filter((f) => f.endsWith('.sql') && /^\d{4}_/.test(f) && Number(f.slice(0, 4)) <= 84)
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

console.log('crew_leaderboard_alive — migration 0086 (E54 + source de E50) sur PGlite\n');
console.log(`  (lignée rejouée : ${LINEAGE.length} migrations, 0002 → 0084)\n`);

// ═══ 1. LA MIGRATION S'APPLIQUE ═════════════════════════════════════════════
let migrationError = null;
try {
  await db.exec(readFileSync(join(MIGRATIONS, '0086_crew_leaderboard_alive.sql'), 'utf8'));
} catch (err) {
  migrationError = err;
}

await t('la migration 0086 s’applique sur un Postgres réel, telle quelle', () => {
  if (migrationError) throw new Error(migrationError.message);
});

if (migrationError) {
  console.log('\nMigration non appliquée : la suite n’a aucun sens, on s’arrête ici.');
  process.exit(1);
}

// ─── Acteurs ────────────────────────────────────────────────────────────────
const ALICE = '11111111-1111-1111-1111-111111111111';
const BOB = '22222222-2222-2222-2222-222222222222';
const CARLA = '33333333-3333-3333-3333-333333333333';
const CREW_A = 'aaaaaaaa-0000-0000-0000-000000000001';
const CREW_B = 'aaaaaaaa-0000-0000-0000-000000000002';
const CITY = 'paris';
const ALGO = 'gryd-loop-polygon@1';

const SQUARE = JSON.stringify({
  type: 'Polygon',
  coordinates: [[
    [2.34, 48.86],
    [2.35, 48.86],
    [2.35, 48.87],
    [2.34, 48.87],
    [2.34, 48.86],
  ]],
});

await db.exec(`
  insert into auth.users (id) values ('${ALICE}'), ('${BOB}'), ('${CARLA}');
  insert into public.users (id, pseudo, city_id)
    values ('${ALICE}', 'alice', '${CITY}'),
           ('${BOB}', 'bob', '${CITY}'),
           ('${CARLA}', 'carla', '${CITY}')
    on conflict (id) do update set city_id = excluded.city_id;
`);

// ═══ 2. LE REFUS QUI JUSTIFIE TOUTE LA MIGRATION ════════════════════════════
// Avant tout rafraîchissement, la matview est peuplée (à sa création) mais elle
// n'a jamais été RECALCULÉE. C'est exactement l'état où le dépôt vivait depuis
// 0002 : `pg_matviews.ispopulated` dit `true`, et pourtant rien n'est à jour.

await t('`pg_matviews.ispopulated` vaut `true` alors que rien n’a été recalculé — le piège', async () => {
  const r = await db.query(
    `select ispopulated from pg_matviews where schemaname = 'public' and matviewname = 'crew_leaderboard'`,
  );
  eq(r.rows[0].ispopulated, true, 'Postgres dit « peuplée » — d’où le besoin de matview_refresh_state');
  const st = await db.query(`select count(*)::int as n from public.matview_refresh_state`);
  eq(st.rows[0].n, 0, 'aucun rafraîchissement enregistré : c’est bien l’état « jamais calculée »');
});

await t('`crew_board()` REFUSE `never_refreshed` tant qu’aucun refresh n’a eu lieu', async () => {
  await asUser(ALICE);
  const r = await db.query(`select public.crew_board('run', 50) as j`);
  eq(r.rows[0].j, { ok: false, reason: 'never_refreshed' },
    'un job absent ne doit JAMAIS ressembler à un constat sur les joueurs');
});

await t('`crew_board()` distingue ses refus : signed_out / bad_activity / bad_limit / city_unknown', async () => {
  await asUser(null);
  eq((await db.query(`select public.crew_board('run', 50) as j`)).rows[0].j,
    { ok: false, reason: 'signed_out' }, 'pas de session ⇒ signed_out');
  await asUser(ALICE);
  eq((await db.query(`select public.crew_board('nage', 50) as j`)).rows[0].j,
    { ok: false, reason: 'bad_activity' }, 'discipline inconnue ⇒ bad_activity');
  eq((await db.query(`select public.crew_board('run', 0) as j`)).rows[0].j,
    { ok: false, reason: 'bad_limit' }, 'limite absurde ⇒ bad_limit');
  // Ville non rattachée : état DISTINCT du vide et du refus technique.
  await db.query(`update public.users set city_id = null where id = $1`, [CARLA]);
  await asUser(CARLA);
  eq((await db.query(`select public.crew_board('run', 50) as j`)).rows[0].j,
    { ok: false, reason: 'city_unknown' }, 'users.city_id NULL ⇒ city_unknown, jamais une ville devinée');
  await db.query(`update public.users set city_id = $2 where id = $1`, [CARLA, CITY]);
});

// ═══ 3. LE RAFRAÎCHISSEMENT — IL A LIEU, IL LAISSE UNE TRACE, IL EST IDEMPOTENT

await t('`refresh_crew_leaderboard()` horodate son passage dans matview_refresh_state', async () => {
  await db.exec(`select public.refresh_crew_leaderboard()`);
  const r = await db.query(
    `select view_name, refreshed_at, row_count from public.matview_refresh_state`,
  );
  eq(r.rows.length, 1, 'une seule ligne, pour la vue concernée');
  eq(r.rows[0].view_name, 'public.crew_leaderboard', 'la vue est nommée en toutes lettres');
  ok(r.rows[0].refreshed_at instanceof Date, 'la date est une vraie date');
  eq(r.rows[0].row_count, 0, 'base sans crew ⇒ 0 ligne, et on le DIT au lieu de le taire');
});

await t('deux appels de suite ⇒ même contenu (IDEMPOTENT), date remise à jour', async () => {
  const before = (await db.query(`select refreshed_at from public.matview_refresh_state`)).rows[0];
  const c1 = (await db.query(`select count(*)::int as n from public.crew_leaderboard`)).rows[0].n;
  await db.exec(`select pg_sleep(0.01); select public.refresh_crew_leaderboard();`);
  const c2 = (await db.query(`select count(*)::int as n from public.crew_leaderboard`)).rows[0].n;
  const after = (await db.query(`select refreshed_at from public.matview_refresh_state`)).rows[0];
  eq(c1, c2, 'le contenu ne bouge pas entre deux appels');
  ok(
    after.refreshed_at.getTime() >= before.refreshed_at.getTime(),
    '`refreshed_at` dit « dernier passage », pas « premier »',
  );
  const n = (await db.query(`select count(*)::int as n from public.matview_refresh_state`)).rows[0].n;
  eq(n, 1, 'l’upsert ne crée pas une seconde ligne à chaque passage');
});

// ═══ 4. BASE SANS CREW : UN VIDE, PAS UN REFUS ══════════════════════════════

await t('base sans aucun crew ⇒ {ok:true, rows:[]} — le vide est un état de première classe', async () => {
  await asUser(ALICE);
  const j = (await db.query(`select public.crew_board('run', 50) as j`)).rows[0].j;
  eq(j.ok, true, 'la lecture a ABOUTI : ce n’est plus un refus');
  eq(j.rows, [], 'personne n’a encore couru ici — aucune ligne inventée');
  eq(j.rankedTotal, 0, 'zéro crew classé');
  eq(j.myCrewId, null, 'Alice n’a pas de crew : null, jamais un crew fabriqué');
  eq(j.myRank, null, 'pas de crew ⇒ pas de rang');
  eq(j.cityName, 'Paris', 'le nom de la ville est LU dans city_zones');
  ok(typeof j.refreshedAt === 'string', 'le board est DATÉ — l’écran peut dire de quand il parle');
});

// ─── On peuple : deux crews RÉELS, dans la ville, avec de vrais membres ──────
await db.exec(`
  insert into public.crews (id, name, color, city_id, code, created_by) values
    ('${CREW_A}', 'Les Bouclards', 3, '${CITY}', 'BCLRD1', '${ALICE}'),
    ('${CREW_B}', 'Nord Runners', 5, '${CITY}', 'NRDRN1', '${BOB}');
  insert into public.crew_members (crew_id, user_id) values
    ('${CREW_A}', '${ALICE}'),
    ('${CREW_B}', '${BOB}');
`);

let territorySeq = 0;
const newTerritory = async ({
  ownerType = 'user',
  ownerId = ALICE,
  activity = 'run',
  state = 'owned_personal',
  areaM2 = 1000,
  controlledSince = '2026-07-20T00:00:00Z',
} = {}) => {
  territorySeq += 1;
  const r = await db.query(
    `insert into public.territories
       (activity, owner_type, owner_id, geometry, area_m2, city_id, state,
        controlled_since, publish_after, algorithm_version)
     values ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10)
     returning id`,
    [activity, ownerType, ownerId, SQUARE, areaM2, CITY, state, controlledSince,
      '2026-07-20T01:00:00Z', `${ALGO}#${territorySeq}`],
  );
  return r.rows[0].id;
};

const boardOf = async (uid, activity = 'run') => {
  await asUser(uid);
  return (await db.query(`select public.crew_board($1, 50) as j`, [activity])).rows[0].j;
};

// ═══ 5. LA SURFACE VIENT DE `territories`, JAMAIS D'UN COMPTE DE CELLULES ═══

await t('un crew avec 12 hex_claims et AUCUN territoire a 0 m² — jamais une aire estimée', async () => {
  await db.exec(`
    insert into public.hex_claims (h3index, owner_user_id, city_id, activity, claim_type, claimed_at)
    select 600000000000000000 + g, '${ALICE}', '${CITY}', 'run', 'neutral', now()
    from generate_series(1, 12) as g
  `);
  await db.exec(`select public.refresh_crew_leaderboard()`);
  const r = await db.query(
    `select hexes_held, controlled_area_m2, territory_count, members_active
       from public.crew_leaderboard where crew_id = $1 and activity = 'run'`,
    [CREW_A],
  );
  eq(r.rows[0].hexes_held, 12, 'les cellules sont bien là (le test doit mordre)');
  eq(r.rows[0].controlled_area_m2, 0, 'aucun polygone ⇒ AUCUNE surface, pas 12 × une aire nominale');
  eq(r.rows[0].territory_count, 0, 'zéro zone tenue');
  eq(r.rows[0].members_active, 1, 'l’effectif ACTIF est compté, lui');

  // …et le board ne le classe donc PAS : 0 m² n'est pas « dernier ».
  const j = await boardOf(ALICE);
  eq(j.rows, [], 'un crew sans surface n’apparaît pas dans le classement');
  eq(j.myCrewId, CREW_A, 'mon crew est bien identifié');
  eq(j.myRank, null, 'non classé ⇒ null, jamais un rang de consolation');
});

await t('la surface d’un crew est la somme des `territories.area_m2` de ses membres actifs', async () => {
  await newTerritory({ ownerId: ALICE, areaM2: 4000 });
  await newTerritory({ ownerId: ALICE, areaM2: 1500 });
  await db.exec(`select public.refresh_crew_leaderboard()`);
  const r = await db.query(
    `select controlled_area_m2, territory_count from public.crew_leaderboard
      where crew_id = $1 and activity = 'run'`,
    [CREW_A],
  );
  eq(r.rows[0].controlled_area_m2, 5500, '4000 + 1500, mesurés — pas estimés');
  eq(r.rows[0].territory_count, 2, 'deux ZONES (polygones), le mot que l’écran emploie');
});

await t('Run et Bike ne se rencontrent JAMAIS : deux lignes, jamais une somme', async () => {
  await newTerritory({ ownerId: ALICE, activity: 'bike', areaM2: 9000 });
  await db.exec(`select public.refresh_crew_leaderboard()`);
  const r = await db.query(
    `select activity, controlled_area_m2 from public.crew_leaderboard
      where crew_id = $1 order by activity`,
    [CREW_A],
  );
  eq(r.rows.map((x) => [x.activity, x.controlled_area_m2]), [['bike', 9000], ['run', 5500]],
    'une surface Run ne s’additionne pas à une surface Bike (§1.2)');
});

await t('les états d’HISTORIQUE (`expired`) n’entrent pas dans la surface', async () => {
  await newTerritory({ ownerId: ALICE, state: 'expired', areaM2: 100000 });
  await db.exec(`select public.refresh_crew_leaderboard()`);
  const r = await db.query(
    `select controlled_area_m2 from public.crew_leaderboard where crew_id = $1 and activity = 'run'`,
    [CREW_A],
  );
  eq(r.rows[0].controlled_area_m2, 5500, 'un crew ne grossit pas en PERDANT du terrain');
});

await t('un membre PARTI cesse de compter — effectif ET surface', async () => {
  await db.query(
    `insert into public.crew_members (crew_id, user_id, joined_at) values ($1, $2, now())`,
    [CREW_A, CARLA],
  );
  await newTerritory({ ownerId: CARLA, areaM2: 2000 });
  await db.exec(`select public.refresh_crew_leaderboard()`);
  let r = await db.query(
    `select members_active, controlled_area_m2 from public.crew_leaderboard
      where crew_id = $1 and activity = 'run'`, [CREW_A],
  );
  eq([r.rows[0].members_active, r.rows[0].controlled_area_m2], [2, 7500], 'Carla dedans');

  await db.query(
    `update public.crew_members set left_at = now() where crew_id = $1 and user_id = $2`,
    [CREW_A, CARLA],
  );
  await db.exec(`select public.refresh_crew_leaderboard()`);
  r = await db.query(
    `select members_active, controlled_area_m2 from public.crew_leaderboard
      where crew_id = $1 and activity = 'run'`, [CREW_A],
  );
  eq([r.rows[0].members_active, r.rows[0].controlled_area_m2], [1, 5500],
    'ce que Carla tient part avec elle : le crew ne garde pas un territoire qu’il ne tient plus');
});

// ═══ 6. LE CLASSEMENT — RANG DE COMPÉTITION, AUCUN DÉPARTAGE INVENTÉ ════════

await t('le board classe pour de vrai, et rend ma position dans le classement COMPLET', async () => {
  await newTerritory({ ownerId: BOB, areaM2: 9000 });
  await db.exec(`select public.refresh_crew_leaderboard()`);
  const j = await boardOf(BOB);
  eq(j.ok, true, 'lecture aboutie');
  eq(j.rows.map((r) => [r.name, r.rank, r.areaM2, r.membersActive, r.zonesHeld]),
    [['Nord Runners', 1, 9000, 1, 1], ['Les Bouclards', 2, 5500, 1, 2]],
    'E54 : crews ; membres ; surface — et le rang vient de la surface');
  eq(j.rankedTotal, 2, 'deux crews classés');
  eq([j.myCrewId, j.myRank, j.myAreaM2], [CREW_B, 1, 9000], 'Bob voit son crew et son rang');
  const jA = await boardOf(ALICE);
  eq(jA.myRank, 2, 'Alice voit le sien');
});

await t('EX AEQUO : même rang partagé, le suivant SAUTE (rang de compétition)', async () => {
  // On aligne Les Bouclards sur Nord Runners : 5500 + 3500 = 9000.
  await newTerritory({ ownerId: ALICE, areaM2: 3500 });
  await db.exec(`select public.refresh_crew_leaderboard()`);
  const j = await boardOf(BOB);
  eq(j.rows.map((r) => r.rank), [1, 1],
    'aucun départage n’est INVENTÉ : les quatre critères de §10.2 vivent dans le moteur pur');
  eq(j.rows.map((r) => r.name), ['Les Bouclards', 'Nord Runners'],
    'à rang égal, l’ordre d’affichage est alphabétique — stable, et il ne prétend pas classer');
});

// ═══ 7. `crew_stats()` — LES TROIS MESURES DE E50, BORNÉES ══════════════════

await t('`crew_stats()` refuse proprement : signed_out / no_crew / bad_weeks / bad_activity', async () => {
  await asUser(null);
  eq((await db.query(`select public.crew_stats('run', 4) as j`)).rows[0].j,
    { ok: false, reason: 'signed_out' }, 'pas de session');
  await asUser(CARLA); // sortie du crew au test précédent
  eq((await db.query(`select public.crew_stats('run', 4) as j`)).rows[0].j,
    { ok: false, reason: 'no_crew' }, 'sans crew, il n’y a pas de statistiques de crew');
  await asUser(ALICE);
  eq((await db.query(`select public.crew_stats('run', 0) as j`)).rows[0].j,
    { ok: false, reason: 'bad_weeks' }, 'profondeur absurde refusée');
  eq((await db.query(`select public.crew_stats('nage', 4) as j`)).rows[0].j,
    { ok: false, reason: 'bad_activity' }, 'discipline inconnue refusée');
});

await t('la courbe garde les semaines à ZÉRO — une semaine sans sortie est une information', async () => {
  await asUser(ALICE);
  const j = (await db.query(`select public.crew_stats('run', 4) as j`)).rows[0].j;
  eq(j.ok, true, 'lecture aboutie');
  eq(j.trend.length, 4, 'quatre points, même sans une seule course');
  eq(j.trend.map((p) => p.distanceM), [0, 0, 0, 0], 'des zéros VRAIS, pas des trous');
  eq(j.distanceM, 0, 'aucune course ⇒ 0 m parcourus, ce qui est exact');
  eq(j.defenses, 0, 'aucune contestation défendue');
});

await t('distance collective : `valid` et `partial` comptent, `rejected` non', async () => {
  await db.exec(`
    insert into public.runs (user_id, client_run_id, source, started_at, distance_m, duration_s, status, activity)
    values
      ('${ALICE}', gen_random_uuid(), 'gps', now(), 5000, 1800, 'valid', 'run'),
      ('${ALICE}', gen_random_uuid(), 'gps', now(), 3000, 1200, 'partial', 'run'),
      ('${ALICE}', gen_random_uuid(), 'gps', now(), 99000, 9999, 'rejected', 'run'),
      ('${ALICE}', gen_random_uuid(), 'gps', now(), 40000, 3600, 'valid', 'bike');
  `);
  await asUser(ALICE);
  const run = (await db.query(`select public.crew_stats('run', 4) as j`)).rows[0].j;
  eq(Number(run.distanceM), 8000, '5000 + 3000 : une course partielle a bien été COURUE');
  const bike = (await db.query(`select public.crew_stats('bike', 4) as j`)).rows[0].j;
  eq(Number(bike.distanceM), 40000, 'le vélo compte à part — jamais une somme des deux mondes');
  eq(Number(run.trend[run.trend.length - 1].distanceM), 8000,
    'la semaine en cours porte les kilomètres de la semaine en cours');
});

await t('une course HORS FENÊTRE ne compte pas (la borne est réelle, pas décorative)', async () => {
  await db.exec(`
    insert into public.runs (user_id, client_run_id, source, started_at, distance_m, duration_s, status, activity)
    values ('${ALICE}', gen_random_uuid(), 'gps', now() - interval '20 weeks', 77000, 3600, 'valid', 'run');
  `);
  await asUser(ALICE);
  const j = (await db.query(`select public.crew_stats('run', 4) as j`)).rows[0].j;
  eq(Number(j.distanceM), 8000, 'la sortie d’il y a 20 semaines reste hors du mois glissant');
  const large = (await db.query(`select public.crew_stats('run', 30) as j`)).rows[0].j;
  eq(Number(large.distanceM), 85000, 'élargir la fenêtre la fait réapparaître — elle existe bien');
});

await t('défenses : seules les contestations `defended` de la fenêtre comptent', async () => {
  const terr = (await db.query(
    `select id from public.territories where owner_id = $1 and activity = 'run' limit 1`,
    [ALICE],
  )).rows[0].id;
  await db.query(
    `insert into public.territory_contests
       (territory_id, attacker_type, attacker_id, overlap_ratio, started_at, expires_at, status, resolved_at)
     values
       ($1, 'user', $2, 0.8, now() - interval '2 days', now() - interval '1 day', 'defended', now() - interval '1 day'),
       ($1, 'user', $2, 0.8, now() - interval '3 days', now() - interval '2 days', 'transferred', now() - interval '2 days'),
       ($1, 'user', $2, 0.8, now() - interval '1 day', now() + interval '1 day', 'active', null),
       ($1, 'user', $2, 0.8, now() - interval '30 weeks', now() - interval '29 weeks', 'defended', now() - interval '29 weeks')`,
    [terr, BOB],
  );
  await asUser(ALICE);
  const j = (await db.query(`select public.crew_stats('run', 4) as j`)).rows[0].j;
  eq(j.defenses, 1,
    'une seule : `transferred` est une perte, `active` n’a rien prouvé, et la 4ᵉ est hors fenêtre');
});

// ═══ 8. PRIVILÈGES — LA MATVIEW EST FERMÉE, LES RPC SONT OUVERTES ══════════

await t('la matview n’est PAS lisible par les clients : la seule porte est `crew_board()`', async () => {
  const r = await db.query(`
    select has_table_privilege('authenticated', 'public.crew_leaderboard', 'select') as auth_sel,
           has_table_privilege('anon',          'public.crew_leaderboard', 'select') as anon_sel,
           has_table_privilege('service_role',  'public.crew_leaderboard', 'select') as svc_sel
  `);
  eq(r.rows[0].auth_sel, false,
    'lire la matview sans passer par crew_board() rouvrirait le trou : un agrégat sans date');
  eq(r.rows[0].anon_sel, false, 'anon ne lit rien');
  eq(r.rows[0].svc_sel, true, 'le serveur, lui, en a besoin');
});

await t('les deux RPC sont exécutables par `authenticated` et fermées à `anon`', async () => {
  const r = await db.query(`
    select
      has_function_privilege('authenticated', 'public.crew_board(text,integer)', 'execute') as b_auth,
      has_function_privilege('anon',          'public.crew_board(text,integer)', 'execute') as b_anon,
      has_function_privilege('authenticated', 'public.crew_stats(text,integer)', 'execute') as s_auth,
      has_function_privilege('anon',          'public.crew_stats(text,integer)', 'execute') as s_anon,
      has_function_privilege('authenticated', 'public.refresh_crew_leaderboard()', 'execute') as r_auth,
      has_function_privilege('service_role',  'public.refresh_crew_leaderboard()', 'execute') as r_svc
  `);
  eq([r.rows[0].b_auth, r.rows[0].s_auth], [true, true], 'les lectures sont ouvertes au joueur connecté');
  eq([r.rows[0].b_anon, r.rows[0].s_anon], [false, false], 'rien pour anon');
  eq(r.rows[0].r_auth, false, 'un client ne déclenche pas un rafraîchissement de vue');
  eq(r.rows[0].r_svc, true, 'le job, lui, le déclenche');
});

await t('`matview_refresh_state` : RLS activée, lisible, jamais écrivable côté client', async () => {
  const rls = await db.query(
    `select relrowsecurity from pg_class where oid = 'public.matview_refresh_state'::regclass`,
  );
  eq(rls.rows[0].relrowsecurity, true, 'RLS activée');
  const p = await db.query(`
    select cmd from pg_policies
     where schemaname = 'public' and tablename = 'matview_refresh_state'
  `);
  eq(p.rows.map((x) => x.cmd), ['SELECT'], 'une seule policy, en lecture — aucune écriture cliente');
  const priv = await db.query(`
    select has_table_privilege('authenticated', 'public.matview_refresh_state', 'select') as sel,
           has_table_privilege('authenticated', 'public.matview_refresh_state', 'insert') as ins
  `);
  eq([priv.rows[0].sel, priv.rows[0].ins], [true, false],
    'le client DATE ce qu’il affiche, il ne fabrique pas la date');
});

// ─── Verdict ────────────────────────────────────────────────────────────────
console.log(`\n${passed} vert(s), ${failures.length} rouge(s)`);
if (failures.length > 0) {
  console.log('\nDétail :');
  for (const f of failures) console.log(`  · ${f.name}\n    ${f.err.message}`);
  process.exit(1);
}
