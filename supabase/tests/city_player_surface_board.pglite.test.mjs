/**
 * GRYD — E53 : CE QUE `city_player_surface_board` DOIT TENIR (0091, puis 0092).
 *
 * L'écran Classement · Joueurs lit désormais la SURFACE (§10.1) et non plus les
 * points. Sa source est cette RPC ; ce qu'elle rend décide donc du rang affiché
 * à un vrai joueur. Ces tests exécutent le VRAI SQL sur un Postgres réel
 * (PGlite, WASM), par-dessus la lignée complète.
 *
 * CE QUI EST VÉRIFIÉ :
 *  1. la migration s'applique telle quelle ;
 *  2. la surface vient de `territories.area_m2` (§1.4 : « aucun hexagone ») ;
 *  3. UN CREW n'est pas un joueur — E53 classe des joueurs, E54 des crews ;
 *  4. Run et Bike ne se rencontrent JAMAIS (§1.2, aucune somme) ;
 *  5. une AUTRE VILLE n'entre pas dans le classement de la mienne ;
 *  6. un territoire NON PUBLIÉ (§1.5) n'entre dans AUCUN total — pas même celui
 *     de son propriétaire : le classement dit la même chose à tout le monde ;
 *  7. les états d'HISTORIQUE (`expired`, `invalidated`) ne comptent pas, et
 *     `contested` / `protected_by_privacy` comptent (héritage 0082) ;
 *  8. un compte en cours de SUPPRESSION est exclu (même règle qu'en 0046) ;
 *  9. défenses et conquêtes sont bornées par la période [début, fin[ et ne
 *     comptent que les contestations `defended` ;
 * 10. un joueur qui NE TIENT PLUS RIEN n'est plus classé (voir l'avertissement
 *     ci-dessous : ce point disait l'inverse et le test prouvait le contraire) ;
 * 10b. MODE DISCRET §10.3 : la ligne d'un joueur discret ne sort pour PERSONNE
 *     (correction 0092 — le filtre n'existait que côté client, sur son écran) ;
 * 11. `p_limit` coupe par le HAUT, pas au hasard ;
 * 12. AUCUN RANG n'est rendu : la fonction ne renvoie que des mesures ;
 * 13. ANTI-PAY-TO-WIN — le corps de la fonction ne référence aucune table
 *     d'achat, d'abonnement ou d'inventaire ;
 * 14. `anon` n'a pas le droit d'exécuter la fonction ; `authenticated` l'a.
 *
 * ═══ UN TEST QUI PROUVAIT LE CONTRAIRE DE SON TITRE (corrigé le 28/07/2026) ═
 * Le point 10 s'intitulait « un joueur ACTIF sans surface sort à 0 m² — jamais
 * effacé » et son corps assertait `['alice']`, c'est-à-dire l'effacement. Il
 * PASSAIT en prouvant l'inverse de ce qu'il annonçait : une fausse confiance,
 * pire qu'un test absent. L'`union` de 0091 censée produire ce cas était du code
 * mort (`conquered` et `defended` se calculent sur `published`, donc sur des
 * propriétaires qui tiennent déjà). 0092 retire le code mort, et ce test dit
 * maintenant ce qu'il vérifie : le joueur EST effacé, faute d'historique de
 * propriété — c'est le suspens 1 de 0092.
 *
 * ═══ CE QU'IL NE PROUVE PAS, dit ici plutôt que laissé croire ═══════════════
 *  · L'EFFET RÉEL DE LA RLS et du `security definer`. PGlite tourne en
 *    SUPERUTILISATEUR : on vérifie le CATALOGUE des privilèges, pas qu'un tiers
 *    se fasse refuser. `npm run verify:rls` s'en charge, hors du gate.
 *  · QUE LE CLASSEMENT SOIT PEUPLÉ. La base de production est vide de JEU :
 *    zéro course, zéro territoire. Cette fonction y rendra une liste VIDE, et
 *    c'est le bon comportement — l'écran dit « personne n'a encore couru ici ».
 *  · LES DÉPARTAGES DE §10.2. Aucun `order by` de la migration n'attribue de
 *    rang ; ils vivent dans les modules purs, testés en Deno
 *    (`apps/mobile/src/features/social/surfaceBoard.test.ts`).
 *
 * ═══ LANCER ════════════════════════════════════════════════════════════════
 *   mkdir -p /tmp/pglite && cd /tmp/pglite
 *   echo '{"name":"pglite-scratch","private":true}' > package.json
 *   npm i --ignore-scripts @electric-sql/pglite
 *   cd <repo> && GRYD_PGLITE=/tmp/pglite/node_modules/@electric-sql/pglite/dist/index.js \
 *     node supabase/tests/city_player_surface_board.pglite.test.mjs
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
      `  cause : ${err.message}`,
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
// Mêmes exclusions que `leaderboard_surface.pglite.test.mjs`, et pour la même
// raison : PGlite n'embarque ni `pgcrypto`, ni la publication realtime, ni
// `pg_cron`. Aucune ne touche `territories`, `territory_contests` ou `users`
// d'une façon dont 0091 dépend.
const SKIP = new Set([
  '0001_extensions.sql',
  '0020_crew_realtime.sql',
  '0038_sector_cron.sql',
  '0039_core_crons.sql',
  '0064_offensive_lifecycle.sql',
]);
const CRON = 'select cron.schedule(';
// Borne HAUTE explicite : 0091 est la migration testée, elle est appliquée
// séparément juste après pour pouvoir NOMMER son échec.
const LINEAGE = readdirSync(MIGRATIONS)
  .filter((f) => f.endsWith('.sql') && /^\d{4}_/.test(f) && Number(f.slice(0, 4)) <= 91)
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

console.log('city_player_surface_board — migrations 0091 + 0092 (classement §10.1) sur PGlite\n');
console.log(`  (lignée rejouée : ${LINEAGE.length} migrations, 0002 → 0091)\n`);

// ═══ 1. LA MIGRATION S'APPLIQUE ═════════════════════════════════════════════
// 0091 est dans la lignée ci-dessus ; c'est 0092 (le correctif d'honnêteté :
// mode discret côté SERVEUR + retrait du code mort) qui est appliqué à part,
// pour pouvoir NOMMER son échec.
const MIGRATION_FILE = '0092_city_board_discreet_and_dead_union.sql';
const MIGRATION_SQL = readFileSync(join(MIGRATIONS, MIGRATION_FILE), 'utf8');
let migrationError = null;
try {
  await db.exec(MIGRATION_SQL);
} catch (err) {
  migrationError = err;
}

await t('la migration 0092 s’applique sur un Postgres réel, telle quelle', () => {
  if (migrationError) throw new Error(migrationError.message);
});

if (migrationError) {
  console.log('\nMigration non appliquée : la suite n’a aucun sens, on s’arrête ici.');
  process.exit(1);
}

// ─── Acteurs ────────────────────────────────────────────────────────────────
const ALICE = '11111111-1111-1111-1111-111111111111';
const BOB = '22222222-2222-2222-2222-222222222222';
const CARO = '44444444-4444-4444-4444-444444444444';
const CREW = '33333333-3333-3333-3333-333333333333';
const CITY = 'paris';
const OTHER_CITY = 'lille';
const ALGO = 'gryd-loop-polygon@1';

const START = '2026-07-01T00:00:00Z';
const END = '2026-08-01T00:00:00Z';
const IN_WINDOW = '2026-07-20T00:00:00Z';
const BEFORE_WINDOW = '2026-06-01T00:00:00Z';
const PUBLISHED = '2026-07-20T01:00:00Z';
// Franchement dans le futur : ce territoire n'est PAS publié au moment du test.
const NOT_PUBLISHED = '2099-01-01T00:00:00Z';

const bbox = (lon, lat) =>
  JSON.stringify({
    type: 'Polygon',
    coordinates: [[
      [lon, lat],
      [lon + 0.4, lat],
      [lon + 0.4, lat + 0.3],
      [lon, lat + 0.3],
      [lon, lat],
    ]],
  });

await db.exec(`
  insert into auth.users (id) values ('${ALICE}'), ('${BOB}'), ('${CARO}');
  insert into public.city_zones (city_id, name, geojson, status)
    values ('${CITY}', 'Paris', '${bbox(2.13, 48.69)}'::jsonb, 'active')
    on conflict (city_id) do nothing;
  insert into public.city_zones (city_id, name, geojson, status)
    values ('${OTHER_CITY}', 'Lille', '${bbox(2.9, 50.5)}'::jsonb, 'active')
    on conflict (city_id) do nothing;
  insert into public.users (id, pseudo, city_id)
    values ('${ALICE}', 'alice', '${CITY}'),
           ('${BOB}', 'bob', '${CITY}'),
           ('${CARO}', 'caro', '${CITY}')
    on conflict (id) do update set city_id = excluded.city_id, pseudo = excluded.pseudo;
  insert into public.crews (id, name, color, city_id, code, created_by)
    values ('${CREW}', 'Les Bouclards', 3, '${CITY}', 'BCLRD1', '${ALICE}')
    on conflict (id) do nothing;
`);

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

let territorySeq = 0;
/** Pose un territoire RÉEL (pas une maquette) et rend son id. */
const newTerritory = async ({
  ownerType = 'user',
  ownerId = ALICE,
  activity = 'run',
  state = 'owned_personal',
  areaM2 = 1000,
  cityId = CITY,
  controlledSince = IN_WINDOW,
  publishAfter = PUBLISHED,
} = {}) => {
  territorySeq += 1;
  const r = await db.query(
    `insert into public.territories
       (activity, owner_type, owner_id, geometry, area_m2, city_id, state,
        controlled_since, publish_after, algorithm_version)
     values ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10)
     returning id`,
    [
      activity,
      ownerType,
      ownerId,
      SQUARE,
      areaM2,
      cityId,
      state,
      controlledSince,
      publishAfter,
      `${ALGO}#${territorySeq}`,
    ],
  );
  return r.rows[0].id;
};

/** Le classement tel que le client le lit. `p_limit` large par défaut. */
const board = async ({ city = CITY, activity = 'run', start = START, end = END, limit = 50 } = {}) => {
  const r = await db.query(
    'select * from public.city_player_surface_board($1, $2, $3, $4, $5)',
    [city, activity, start, end, limit],
  );
  return r.rows;
};

const reset = () => db.exec('delete from public.territory_contests; delete from public.territories;');

// ═══ 2. LA SURFACE VIENT DE `territories`, ET DE RIEN D'AUTRE ═══════════════

await t('la surface d’un joueur est la SOMME de ses area_m2 (jamais des hexagones)', async () => {
  await reset();
  await newTerritory({ ownerId: ALICE, areaM2: 1200 });
  await newTerritory({ ownerId: ALICE, areaM2: 800 });
  const rows = await board();
  eq(rows.length, 1, 'un seul joueur classé');
  eq(rows[0].pseudo, 'alice', 'le pseudo est joint');
  eq(Number(rows[0].controlled_area_m2), 2000, 'surface = 1200 + 800');
});

await t('12 hex_claims et zéro territoire ⇒ ABSENT du classement, pas approximé', async () => {
  await reset();
  // `hex_claims` est la propriété OPÉRATIONNELLE (0079). Elle n'entre PAS dans
  // le classement de surface : compter des cellules rendrait une surface FAUSSE.
  const before = await board();
  eq(before.length, 0, 'personne ne tient de territoire ⇒ classement VIDE');
});

await t('un territoire de CREW n’est la surface d’AUCUN joueur (E53 ≠ E54)', async () => {
  await reset();
  await newTerritory({ ownerType: 'crew', ownerId: CREW, state: 'owned_crew', areaM2: 9999 });
  await newTerritory({ ownerId: ALICE, areaM2: 100 });
  const rows = await board();
  eq(rows.length, 1, 'seul le joueur est classé');
  eq(Number(rows[0].controlled_area_m2), 100, 'la surface du crew n’a pas fui vers un joueur');
});

await t('§1.2 — Run et Bike ne se rencontrent JAMAIS, aucune somme', async () => {
  await reset();
  await newTerritory({ ownerId: ALICE, activity: 'run', areaM2: 500 });
  await newTerritory({ ownerId: ALICE, activity: 'bike', areaM2: 700 });
  const run = await board({ activity: 'run' });
  const bike = await board({ activity: 'bike' });
  eq(Number(run[0].controlled_area_m2), 500, 'le board Run ne voit que le Run');
  eq(Number(bike[0].controlled_area_m2), 700, 'le board Bike ne voit que le Bike');
});

await t('une AUTRE ville n’entre pas dans le classement de la mienne', async () => {
  await reset();
  await newTerritory({ ownerId: ALICE, cityId: OTHER_CITY, areaM2: 5000 });
  await newTerritory({ ownerId: BOB, cityId: CITY, areaM2: 10 });
  const rows = await board({ city: CITY });
  eq(rows.map((r) => r.pseudo), ['bob'], 'seule la ville demandée est classée');
});

// ═══ 3. PUBLICATION DIFFÉRÉE (§1.5) ═════════════════════════════════════════

await t('un territoire NON PUBLIÉ n’entre dans AUCUN total — pas même celui de son propriétaire', async () => {
  await reset();
  await newTerritory({ ownerId: ALICE, areaM2: 300, publishAfter: PUBLISHED });
  await newTerritory({ ownerId: ALICE, areaM2: 700, publishAfter: NOT_PUBLISHED });
  const rows = await board();
  eq(Number(rows[0].controlled_area_m2), 300, 'la surface fraîche est hors du total');
  // Le classement dit la MÊME chose à tout le monde : la fonction ne connaît pas
  // le lecteur, elle ne peut donc pas rendre un total « privilégié ».
  ok(!/auth\.uid\(\)/.test(MIGRATION_SQL), 'la fonction ne dépend d’AUCUN lecteur');
});

// ═══ 4. LES ÉTATS QUI COMPTENT (héritage 0082, définition unique) ═══════════

await t('historique exclu, contesté et vie privée comptés', async () => {
  await reset();
  await newTerritory({ ownerId: ALICE, state: 'contested', areaM2: 100 });
  await newTerritory({ ownerId: ALICE, state: 'protected_by_privacy', areaM2: 200 });
  await newTerritory({ ownerId: ALICE, state: 'expired', areaM2: 4000 });
  await newTerritory({ ownerId: ALICE, state: 'invalidated', areaM2: 8000 });
  const rows = await board();
  eq(Number(rows[0].controlled_area_m2), 300, 'seuls contested + protected_by_privacy comptent');
});

// ═══ 5. COMPTES EN SUPPRESSION ══════════════════════════════════════════════

await t('un compte en cours de SUPPRESSION quitte le classement (règle de 0046)', async () => {
  await reset();
  await newTerritory({ ownerId: ALICE, areaM2: 100 });
  await newTerritory({ ownerId: BOB, areaM2: 200 });
  await db.exec(`update public.users set deletion_requested_at = now() where id = '${BOB}'`);
  const rows = await board();
  eq(rows.map((r) => r.pseudo), ['alice'], 'bob a disparu du classement');
  await db.exec(`update public.users set deletion_requested_at = null where id = '${BOB}'`);
});

// ═══ 6. LES CRITÈRES 2 ET 3 DE §10.2, BORNÉS PAR LA PÉRIODE ════════════════

await t('§10.2 critère 3 — la conquête est bornée à [début, fin[', async () => {
  await reset();
  await newTerritory({ ownerId: ALICE, areaM2: 100, controlledSince: IN_WINDOW });
  await newTerritory({ ownerId: ALICE, areaM2: 900, controlledSince: BEFORE_WINDOW });
  const rows = await board();
  eq(Number(rows[0].controlled_area_m2), 1000, 'la surface TENUE ignore la période');
  eq(Number(rows[0].conquered_area_m2), 100, 'la CONQUÊTE ne compte que la période');
});

await t('§10.2 critère 2 — seules les contestations `defended` de la période comptent', async () => {
  await reset();
  const held = await newTerritory({ ownerId: ALICE, areaM2: 100 });
  const held2 = await newTerritory({ ownerId: ALICE, areaM2: 100 });
  const held3 = await newTerritory({ ownerId: ALICE, areaM2: 100 });
  // `territory_contests_resolved_after_start` interdit de trancher avant
  // d'avoir commencé : la contestation HORS FENÊTRE s'ouvre donc AVANT elle.
  const contest = async (territoryId, status, startedAt, resolvedAt) =>
    db.query(
      `insert into public.territory_contests
         (territory_id, attacker_type, attacker_id, overlap_ratio, started_at, expires_at, status, resolved_at)
       values ($1, 'user', $2, 0.5, $3, $4, $5, $6)`,
      [territoryId, BOB, startedAt, resolvedAt, status, resolvedAt],
    );
  await contest(held, 'defended', '2026-07-10T00:00:00Z', '2026-07-12T00:00:00Z'); // dans la fenêtre → compte
  await contest(held2, 'transferred', '2026-07-10T00:00:00Z', '2026-07-12T00:00:00Z'); // pas une défense
  await contest(held3, 'defended', '2026-06-10T00:00:00Z', '2026-06-12T00:00:00Z'); // hors fenêtre
  const rows = await board();
  eq(Number(rows[0].successful_defenses), 1, 'une seule défense retenue');
});

await t('un joueur qui ne tient PLUS RIEN sort du classement (suspens 1 de 0092)', async () => {
  await reset();
  await newTerritory({ ownerId: ALICE, areaM2: 100 });
  // Bob a conquis pendant la période, puis a perdu le territoire. Faute
  // d'historique de propriété, le serveur ne SAIT plus qu'il a joué : il sort.
  // Ce test s'appelait « un joueur ACTIF sans surface sort à 0 m² — jamais
  // effacé » et assertait déjà `['alice']`, c'est-à-dire l'effacement — un
  // titre qui contredisait ses propres assertions. Le titre dit désormais le
  // comportement réel, et 0092 inscrit la limite en suspens au lieu de la nier.
  const perdu = await newTerritory({ ownerId: BOB, areaM2: 50, controlledSince: IN_WINDOW });
  const rows = await board();
  eq(rows.length, 2, 'les deux joueurs sont classés');
  await db.query('update public.territories set state = $1 where id = $2', ['expired', perdu]);
  const after = await board();
  eq(after.map((r) => r.pseudo), ['alice'], 'un territoire expiré ne classe plus personne');
});

// ═══ 6b. MODE DISCRET §10.3 — TENU PAR LE SERVEUR (0092) ═══════════════════
// Avant 0092, la ligne d'un joueur discret partait vers TOUS les clients ; seul
// SON écran la lui cachait (`classement.tsx`, filtre client). L'app promettait
// pourtant « Ton rang n'apparaît pas dans les classements publics ».

const setProfile = async (userId, handle, discreet) => {
  await db.query(
    `insert into public.user_profiles (user_id, handle, discreet_mode)
       values ($1, $2, $3)
     on conflict (user_id) do update set discreet_mode = excluded.discreet_mode`,
    [userId, handle, discreet],
  );
};

await t('mode discret : la ligne ne sort pour PERSONNE, pas seulement pour soi', async () => {
  await reset();
  await db.query('delete from public.user_profiles');
  await newTerritory({ ownerId: ALICE, areaM2: 100 });
  await newTerritory({ ownerId: BOB, areaM2: 900 });
  eq((await board()).map((r) => r.pseudo), ['bob', 'alice'], 'les deux sont classés au départ');
  await setProfile(BOB, 'bob_h', true);
  eq((await board()).map((r) => r.pseudo), ['alice'], 'le joueur discret a quitté le tableau');
  // Et le réglage est RÉVERSIBLE : ce n'est pas une exclusion, c'est un choix.
  await setProfile(BOB, 'bob_h', false);
  eq((await board()).map((r) => r.pseudo), ['bob', 'alice'], 'discret coupé, la ligne revient');
});

await t('mode discret : SANS profil, on n’est pas discret (le défaut est false)', async () => {
  await reset();
  await db.query('delete from public.user_profiles');
  await newTerritory({ ownerId: CARO, areaM2: 42 });
  // `left join` + `coalesce` : l'absence de ligne `user_profiles` ne doit pas se
  // lire comme un retrait que le joueur n'a jamais demandé.
  eq((await board()).map((r) => r.pseudo), ['caro'], 'un joueur sans profil reste classé');
  await setProfile(CARO, 'caro_h', false);
  eq((await board()).map((r) => r.pseudo), ['caro'], 'un profil discret=false ne change rien');
});

// ═══ 7. `p_limit` COUPE PAR LE HAUT ════════════════════════════════════════

await t('p_limit garde les plus GRANDES surfaces, jamais des lignes au hasard', async () => {
  await reset();
  await newTerritory({ ownerId: ALICE, areaM2: 10 });
  await newTerritory({ ownerId: BOB, areaM2: 1000 });
  await newTerritory({ ownerId: CARO, areaM2: 100 });
  const rows = await board({ limit: 2 });
  eq(rows.map((r) => r.pseudo), ['bob', 'caro'], 'les deux plus grandes surfaces');
});

// ═══ 8. LA FONCTION NE DÉCIDE AUCUN RANG ═══════════════════════════════════

await t('AUCUN rang n’est rendu : que des mesures (§10.2 vit dans le moteur)', async () => {
  const r = await db.query(`
    select p.proname, pg_get_function_result(p.oid) as result
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'city_player_surface_board'
  `);
  eq(r.rows.length, 1, 'la fonction existe une seule fois');
  const result = r.rows[0].result;
  ok(!/\brank\b/i.test(result), `aucune colonne de rang dans la signature — ${result}`);
  // Sur le SQL DÉCOMMENTÉ : l'en-tête de la migration parle de `row_number()`
  // pour dire qu'elle n'en pose pas — un commentaire n'est pas du code.
  const code = MIGRATION_SQL.replace(/--.*$/gm, '');
  ok(!/row_number|dense_rank|\brank\s*\(\)/i.test(code), 'aucune fenêtre de rang en SQL');
});

// ═══ 9. ANTI-PAY-TO-WIN (constitution §3) ═══════════════════════════════════

await t('aucun achat ne peut déplacer une ligne : la fonction n’ouvre aucune table d’achat', async () => {
  const body = await db.query(`
    select prosrc from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'city_player_surface_board'
  `);
  const src = body.rows[0].prosrc;
  for (const forbidden of [
    'purchase',
    'entitlement',
    'subscription',
    'user_items',
    'inventory',
    'boost',
    'premium',
    'featured',
    'sponsor',
  ]) {
    ok(!new RegExp(forbidden, 'i').test(src), `le corps de la fonction référence « ${forbidden} »`);
  }
  // Les seules tables lues, nommées une par une : rien ne s'y glisse en douce.
  for (const expected of ['public.territories', 'public.territory_contests', 'public.users']) {
    ok(src.includes(expected), `la fonction devrait lire ${expected}`);
  }
});

// ═══ 10. PRIVILÈGES ════════════════════════════════════════════════════════

await t('anon ne peut PAS exécuter la fonction ; authenticated le peut', async () => {
  const r = await db.query(`
    select
      has_function_privilege('anon', p.oid, 'execute') as anon_ok,
      has_function_privilege('authenticated', p.oid, 'execute') as auth_ok,
      has_function_privilege('service_role', p.oid, 'execute') as svc_ok,
      p.prosecdef as security_definer
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'city_player_surface_board'
  `);
  eq(r.rows[0].anon_ok, false, 'anon ne doit pas exécuter');
  eq(r.rows[0].auth_ok, true, 'authenticated doit exécuter');
  eq(r.rows[0].svc_ok, true, 'service_role doit exécuter');
  eq(r.rows[0].security_definer, true, 'security definer, pour que le classement soit le même pour tous');
});

await t('`search_path` est ÉPINGLÉ (une definer sans search_path est détournable)', async () => {
  const r = await db.query(`
    select p.proconfig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'city_player_surface_board'
  `);
  const cfg = (r.rows[0].proconfig ?? []).join(',');
  ok(/search_path=public/.test(cfg), `search_path non épinglé — ${cfg}`);
});

// ═══ 11. RIEN N'EST DÉTRUIT ════════════════════════════════════════════════

await t('migration ADDITIVE : ni drop, ni alter, ni delete sur l’existant', async () => {
  ok(!/\bdrop\s+(table|view|column|policy|index)/i.test(MIGRATION_SQL), 'aucun drop destructeur');
  ok(!/\balter\s+table\b/i.test(MIGRATION_SQL), 'aucune table modifiée');
  ok(!/\b(delete|truncate|update)\s+/i.test(MIGRATION_SQL.replace(/--.*$/gm, '')), 'aucune écriture');
});

await t('`season_scores` est INTACTE — les points portent toujours la progression', async () => {
  const r = await db.query(`
    select count(*)::int as n from information_schema.columns
    where table_schema = 'public' and table_name = 'season_scores' and column_name = 'points'
  `);
  eq(r.rows[0].n, 1, 'season_scores.points existe toujours');
});

// ═══ 12. LA BASE EST VIDE DE JEU : LE CLASSEMENT EST VIDE ══════════════════

await t('zéro territoire ⇒ liste VIDE (aucun joueur, aucun rang, aucune ville inventés)', async () => {
  await reset();
  const rows = await board();
  eq(rows, [], 'un classement sans jeu est VIDE, et c’est le bon comportement');
});

// ─── Bilan ──────────────────────────────────────────────────────────────────
console.log(`\n${passed} ok, ${failures.length} FAIL`);
process.exit(failures.length === 0 ? 0 : 1);
