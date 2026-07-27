#!/usr/bin/env node
/**
 * GRYD — test EXÉCUTABLE de la migration 0082 (`leaderboard_surface`).
 * LOT 8 : le classement se mesure en SURFACE (spec §10.1 → §10.3).
 *
 * ═══ POURQUOI CE FICHIER EXISTE ═════════════════════════════════════════════
 * 0082 ne contient AUCUN TypeScript : une fonction de définition, une vue, une
 * fonction d'agrégation, deux tables, des CHECK, des index, des policies. Les
 * tests Deno du dépôt ne touchent pas une ligne de DDL — sans ce fichier, « la
 * surface vient de `territories` et jamais de `hex_claims` » resterait une
 * phrase dans un commentaire.
 *
 * Et c'est LA promesse qu'il fallait mesurer plutôt que relire. Deux fautes
 * classiques ne se voient PAS à la lecture :
 *   · un `group by` qui oublie `activity` — les surfaces Run et Bike se somment
 *     silencieusement, et §1.2 (« une surface Run ne s'additionne pas à une
 *     surface Bike ») tombe sans qu'aucune erreur ne soit levée ;
 *   · un index unique nu sur des colonnes NULLABLES — en SQL deux NULL ne sont
 *     pas égaux, donc l'identité d'un snapshot ne contraint plus rien, et deux
 *     classements concurrents coexistent pour le même instant.
 *
 * Docker est indisponible sur cette machine (pas de `npx supabase start`).
 * PGlite — Postgres compilé en WASM — exécute le VRAI SQL des migrations dans
 * Node. Même harnais que `territory_contests.pglite.test.mjs`.
 *
 * ═══ CE QUE CE TEST PROUVE ══════════════════════════════════════════════════
 *  1. 0082 s'applique sur un Postgres réel, telle quelle, par-dessus la LIGNÉE
 *     COMPLÈTE des migrations — pas sur une maquette de schéma.
 *  2. `territory_state_is_controlled` tranche EXACTEMENT les 9 états de §5.3 :
 *     six comptent, trois ne comptent pas, et aucun état inconnu ne passe.
 *  3. LA SURFACE VIENT DE `territories`. Un joueur qui possède 12 `hex_claims`
 *     et zéro territoire a une surface ABSENTE — pas « approximée ».
 *  4. Run et Bike ne se rencontrent JAMAIS : deux lignes, jamais une somme.
 *  5. Les états d'HISTORIQUE (`expired`, `invalidated`) n'entrent pas dans la
 *     surface ; `contested` / `transfer_pending` / `protected_by_privacy` y
 *     entrent (un territoire contesté n'est pas encore perdu).
 *  6. Un CREW est un sujet comme un joueur.
 *  7. `leaderboard_source_metrics` borne défenses et conquêtes à [début, fin[,
 *     ne compte QUE les contestations `defended`, et fait apparaître à 0 m² un
 *     sujet qui a joué la période sans plus rien tenir.
 *  8. Chaque CHECK des snapshots refuse ce qu'il annonce, y compris les deux
 *     incohérences de contexte (amis sans public, lieu sans clé).
 *  9. L'IDENTITÉ d'un snapshot tient MALGRÉ LES NULL (le piège du `coalesce`).
 * 10. L'ÉGALITÉ DE RANG est autorisée (§10.2 la prévoit), mais un même sujet ne
 *     peut pas figurer deux fois dans le même snapshot.
 * 11. Cascades : supprimer le snapshot emporte ses lignes ; supprimer le public
 *     d'un classement d'amis emporte le classement.
 * 12. RLS activée, policies présentes et NOMMANT le cas 'friends' ; la vue et la
 *     fonction de mesure sont FERMÉES aux rôles clients (sinon la publication
 *     différée de 0074 se contournerait par un agrégat).
 * 13. `season_scores` est INTACTE — les points coexistent, rien n'est déprécié.
 *
 * ═══ CE QU'IL NE PROUVE PAS, dit ici plutôt que laissé croire ═══════════════
 *  · L'EFFET RÉEL DE LA RLS. PGlite tourne en SUPERUTILISATEUR : les policies ne
 *    s'y appliquent pas et `auth.uid()` y est un bouchon qui rend NULL. On
 *    vérifie que les policies EXISTENT, ce qu'elles NOMMENT, et que les
 *    privilèges sont absents du catalogue — pas qu'un tiers se fasse refuser.
 *  · QUE LE CLASSEMENT AIT CHANGÉ. Personne n'écrit dans ces tables et l'écran
 *    lit toujours `player_leaderboard` (les points). Ce test prouve un SCHÉMA et
 *    des MESURES, pas un classement en service.
 *  · LES DÉPARTAGES DE §10.2. Ils vivent dans le moteur pur et sont testés en
 *    Deno (`packages/engine/src/leaderboard.test.ts`) : aucun `order by` de
 *    cette migration n'attribue un rang, il n'y a donc rien à tester ici.
 *
 * ═══ LANCER ════════════════════════════════════════════════════════════════
 *   mkdir -p /tmp/pglite && cd /tmp/pglite
 *   echo '{"name":"pglite-scratch","private":true}' > package.json
 *   npm i --ignore-scripts @electric-sql/pglite
 *   cd <repo> && GRYD_PGLITE=/tmp/pglite/node_modules/@electric-sql/pglite/dist/index.js \
 *     node supabase/tests/leaderboard_surface.pglite.test.mjs
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
      '    node supabase/tests/leaderboard_surface.pglite.test.mjs',
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
// de la migration serait un faux positif.
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
// Aucun ne touche `territories`, `territory_contests` ni `season_scores` d'une
// façon dont 0082 dépend. Les fichiers qui appellent `cron.schedule(` au niveau
// SQL sont, eux, tronqués à cet appel (patron de `activity_dimension`).
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
// 0081 ; il ne doit pas rougir parce qu'un autre lot a livré 0083.
const LINEAGE = readdirSync(MIGRATIONS)
  .filter((f) => f.endsWith('.sql') && /^\d{4}_/.test(f) && Number(f.slice(0, 4)) <= 81)
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

console.log('leaderboard_surface — migration 0082 (classement §10.1) sur PGlite\n');
console.log(`  (lignée rejouée : ${LINEAGE.length} migrations, 0002 → 0081)\n`);

// ═══ 1. LA MIGRATION S'APPLIQUE ═════════════════════════════════════════════
let migrationError = null;
try {
  await db.exec(readFileSync(join(MIGRATIONS, '0082_leaderboard_surface.sql'), 'utf8'));
} catch (err) {
  migrationError = err;
}

await t('la migration 0082 s’applique sur un Postgres réel, telle quelle', () => {
  if (migrationError) throw new Error(migrationError.message);
});

if (migrationError) {
  console.log('\nMigration non appliquée : la suite n’a aucun sens, on s’arrête ici.');
  process.exit(1);
}

// ─── Acteurs ────────────────────────────────────────────────────────────────
const ALICE = '11111111-1111-1111-1111-111111111111';
const BOB = '22222222-2222-2222-2222-222222222222';
const CREW = '33333333-3333-3333-3333-333333333333';
const CITY = 'paris';
const ALGO = 'gryd-loop-polygon@1';

// Voir `territory_contests.pglite.test.mjs` pour les deux pièges du socle
// (Paris déjà semée par 0002, `public.users` provisionnée par le trigger 0028).
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
  insert into auth.users (id) values ('${ALICE}'), ('${BOB}');
  insert into public.city_zones (city_id, name, geojson, status)
    values ('${CITY}', 'Paris', '${PARIS_BBOX}'::jsonb, 'active')
    on conflict (city_id) do nothing;
  insert into public.users (id, pseudo, city_id)
    values ('${ALICE}', 'alice', '${CITY}'), ('${BOB}', 'bob', '${CITY}')
    on conflict (id) do update set city_id = excluded.city_id;
  insert into public.crews (id, name, color, city_id, code, created_by)
    values ('${CREW}', 'Les Bouclards', 3, '${CITY}', 'BCLRD1', '${ALICE}')
    on conflict (id) do nothing;
`);

let territorySeq = 0;
/** Pose un territoire RÉEL (pas une maquette) et rend son id. */
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
    [
      activity,
      ownerType,
      ownerId,
      SQUARE,
      areaM2,
      CITY,
      state,
      controlledSince,
      '2026-07-20T01:00:00Z',
      `${ALGO}#${territorySeq}`,
    ],
  );
  return r.rows[0].id;
};

const surfaceOf = async (ownerId, activity) => {
  const r = await db.query(
    `select controlled_area_m2, territory_count
       from public.territory_surface_by_owner
      where owner_id = $1 and activity = $2`,
    [ownerId, activity],
  );
  return r.rows;
};

const reset = () => db.exec('delete from public.territory_contests; delete from public.territories;');

// ═══ 2. « SURFACE CONTRÔLÉE VALIDÉE » — UNE SEULE DÉFINITION ════════════════

await t('les 9 états de §5.3 sont tranchés un par un — six comptent, trois non', async () => {
  const r = await db.query(`
    select s as state, public.territory_state_is_controlled(s) as compte
    from unnest(array[
      'unowned','owned_personal','owned_crew','contested','defended',
      'transfer_pending','protected_by_privacy','expired','invalidated'
    ]) as s
    order by s
  `);
  const map = Object.fromEntries(r.rows.map((x) => [x.state, x.compte]));
  eq(map.owned_personal, true, 'owned_personal doit compter');
  eq(map.owned_crew, true, 'owned_crew doit compter');
  eq(map.contested, true, 'contesté n’est PAS perdu (§9) : la surface compte toujours');
  eq(map.defended, true, 'defended doit compter');
  eq(map.transfer_pending, true, 'le transfert n’est pas consommé : la surface compte');
  eq(
    map.protected_by_privacy,
    true,
    'la vie privée ne doit pas coûter un rang : la surface compte',
  );
  eq(map.unowned, false, 'personne ne tient un territoire unowned');
  eq(map.expired, false, 'expired est de l’historique (§9.4), pas du contrôle');
  eq(map.invalidated, false, 'invalidated est de l’historique, pas du contrôle');
  const inconnu = await db.query(`select public.territory_state_is_controlled('roi_du_monde') as c`);
  eq(inconnu.rows[0].c, false, 'un état inconnu ne compte pas — jamais de repli permissif');
});

// ═══ 3. LA SURFACE VIENT DE `territories`, JAMAIS DE `hex_claims` ═══════════

await t('un joueur avec des hex_claims mais AUCUN territoire n’a PAS de surface', async () => {
  await reset();
  // 12 cellules H3 possédées : sous l'ancien modèle, ce joueur « valait » 12
  // hexes. §1.4 dit « aucun hexagone » — sa surface polygonale est donc ABSENTE,
  // pas estimée à 12 × une aire nominale.
  await db.exec(`
    insert into public.hex_claims (h3index, owner_user_id, city_id, activity, claim_type, claimed_at)
    select 600000000000000000 + g, '${ALICE}', '${CITY}', 'run', 'neutral', now()
    from generate_series(1, 12) as g
  `);
  const claims = await db.query(
    `select count(*)::int as n from public.hex_claims where owner_user_id = $1`,
    [ALICE],
  );
  eq(claims.rows[0].n, 12, 'les cellules sont bien là (le test doit mordre)');
  eq(await surfaceOf(ALICE, 'run'), [], 'aucune ligne de surface : elle ne vient pas de hex_claims');
  await db.exec('delete from public.hex_claims');
});

await t('la surface est la SOMME des aires géodésiques des territoires tenus', async () => {
  await reset();
  await newTerritory({ areaM2: 1200.5 });
  await newTerritory({ areaM2: 800.25 });
  const rows = await surfaceOf(ALICE, 'run');
  eq(rows.length, 1, 'une ligne par (propriétaire, discipline)');
  eq(Number(rows[0].controlled_area_m2), 2000.75, 'la surface est la somme exacte des area_m2');
  eq(rows[0].territory_count, 2, 'le nombre de territoires est rendu tel quel');
});

await t('§1.2 — Run et Bike font DEUX lignes, jamais une somme', async () => {
  await reset();
  await newTerritory({ activity: 'run', areaM2: 100 });
  await newTerritory({ activity: 'bike', areaM2: 900 });
  const run = await surfaceOf(ALICE, 'run');
  const bike = await surfaceOf(ALICE, 'bike');
  eq(Number(run[0].controlled_area_m2), 100, 'la surface Run reste 100');
  eq(Number(bike[0].controlled_area_m2), 900, 'la surface Bike reste 900');
  const total = await db.query(
    `select count(*)::int as n from public.territory_surface_by_owner where owner_id = $1`,
    [ALICE],
  );
  eq(total.rows[0].n, 2, 'deux mondes = deux lignes ; une seule ligne à 1000 serait la faute');
});

await t('les états d’HISTORIQUE ne gonflent pas la surface, les états tenus si', async () => {
  await reset();
  await newTerritory({ state: 'owned_personal', areaM2: 100 });
  await newTerritory({ state: 'contested', areaM2: 200 });
  await newTerritory({ state: 'transfer_pending', areaM2: 300 });
  await newTerritory({ state: 'protected_by_privacy', areaM2: 400 });
  await newTerritory({ state: 'expired', areaM2: 10_000 });
  await newTerritory({ state: 'invalidated', areaM2: 10_000 });
  const rows = await surfaceOf(ALICE, 'run');
  eq(Number(rows[0].controlled_area_m2), 1000, 'seuls les quatre états tenus entrent dans la somme');
  eq(rows[0].territory_count, 4, 'et le compte suit');
});

await t('un CREW est un sujet de classement au même titre qu’un joueur', async () => {
  await reset();
  await newTerritory({ ownerType: 'crew', ownerId: CREW, state: 'owned_crew', areaM2: 5000 });
  const r = await db.query(
    `select owner_type, controlled_area_m2 from public.territory_surface_by_owner where owner_id = $1`,
    [CREW],
  );
  eq(r.rows.length, 1, 'le crew doit apparaître');
  eq(r.rows[0].owner_type, 'crew', 'et son type est rendu tel quel');
  eq(Number(r.rows[0].controlled_area_m2), 5000, 'sa surface est celle de ses territoires');
});

// ═══ 4. LES MESURES DE §10.2, BORNÉES PAR LA PÉRIODE ════════════════════════

const P_START = '2026-07-20T00:00:00Z';
const P_END = '2026-07-27T00:00:00Z';
const metrics = async (activity = 'run', from = P_START, to = P_END) => {
  const r = await db.query(
    `select owner_type, owner_id, controlled_area_m2, successful_defenses, conquered_area_m2
       from public.leaderboard_source_metrics($1, $2, $3)
      order by owner_id`,
    [activity, from, to],
  );
  return r.rows;
};

/**
 * Une contestation CLOSE, cohérente avec les CHECK de 0078 : la fenêtre est
 * dérivée de l'instant de résolution (`resolved_at >= started_at`), sinon un
 * cas « hors période » se ferait refuser par la contrainte au lieu d'être
 * mesuré — et le test croirait avoir vérifié quelque chose.
 */
const addContest = async (territoryId, { status, resolvedAt }) => {
  const startedAt = new Date(Date.parse(resolvedAt) - 3_600_000).toISOString();
  const expiresAt = new Date(Date.parse(resolvedAt) + 3_600_000).toISOString();
  return db.query(
    `insert into public.territory_contests
       (territory_id, attacker_type, attacker_id, overlap_ratio, started_at, expires_at, status, resolved_at)
     values ($1, 'user', $2, 0.8, $3, $4, $5, $6)`,
    [territoryId, BOB, startedAt, expiresAt, status, resolvedAt],
  );
};

await t('§10.2 (3) — la conquête compte quand controlled_since est DANS [début, fin[', async () => {
  await reset();
  await newTerritory({ areaM2: 100, controlledSince: '2026-07-19T23:59:59Z' }); // avant
  await newTerritory({ areaM2: 200, controlledSince: '2026-07-22T12:00:00Z' }); // dedans
  await newTerritory({ areaM2: 400, controlledSince: P_END }); // borne haute EXCLUE
  const rows = await metrics();
  eq(rows.length, 1, 'un seul sujet');
  eq(Number(rows[0].controlled_area_m2), 700, 'la surface TENUE ignore la période — elle est totale');
  eq(Number(rows[0].conquered_area_m2), 200, 'seule la conquête de la fenêtre est comptée');
});

await t('§10.2 (2) — seules les contestations `defended` comptent, et dans la fenêtre', async () => {
  await reset();
  const a = await newTerritory({ areaM2: 100 });
  const b = await newTerritory({ areaM2: 100 });
  const c = await newTerritory({ areaM2: 100 });
  const d = await newTerritory({ areaM2: 100 });
  await addContest(a, { status: 'defended', resolvedAt: '2026-07-22T00:00:00Z' }); // compte
  await addContest(b, { status: 'defended', resolvedAt: '2026-07-10T00:00:00Z' }); // hors fenêtre
  await addContest(c, { status: 'transferred', resolvedAt: '2026-07-22T00:00:00Z' }); // pas une défense
  await addContest(d, { status: 'cancelled', resolvedAt: '2026-07-22T00:00:00Z' }); // pas une défense
  const rows = await metrics();
  eq(rows[0].successful_defenses, 1, 'une seule défense réussie dans la fenêtre');
});

await t('§1.2 — les mesures d’une discipline ignorent entièrement l’autre', async () => {
  await reset();
  await newTerritory({ activity: 'run', areaM2: 100, controlledSince: '2026-07-22T00:00:00Z' });
  const velo = await newTerritory({ activity: 'bike', areaM2: 900, controlledSince: '2026-07-22T00:00:00Z' });
  await addContest(velo, { status: 'defended', resolvedAt: '2026-07-22T00:00:00Z' });
  const run = await metrics('run');
  const bike = await metrics('bike');
  eq(Number(run[0].controlled_area_m2), 100, 'la mesure Run ne voit pas les 900 m² du vélo');
  eq(run[0].successful_defenses, 0, 'ni la défense faite à vélo');
  eq(Number(bike[0].controlled_area_m2), 900, 'et réciproquement');
  eq(bike[0].successful_defenses, 1, 'la défense appartient au monde où elle a eu lieu');
});

await t('un sujet qui a joué la période sans plus rien tenir apparaît À 0 m²', async () => {
  await reset();
  // Le territoire de BOB est passé en `expired` : il ne tient plus rien. Mais il
  // a défendu pendant la période — l'effacer du classement effacerait une
  // semaine de jeu réelle. Le moteur le classera dernier, ce qui est la vérité.
  const perdu = await newTerritory({ ownerId: BOB, state: 'expired', areaM2: 5000 });
  await addContest(perdu, { status: 'defended', resolvedAt: '2026-07-22T00:00:00Z' });
  await newTerritory({ ownerId: ALICE, areaM2: 10 });
  const rows = await metrics();
  eq(rows.length, 2, 'les deux sujets sont présents');
  const bob = rows.find((r) => r.owner_id === BOB);
  eq(Number(bob.controlled_area_m2), 0, 'zéro surface tenue, dit tel quel');
  eq(bob.successful_defenses, 1, 'mais sa défense de la période est comptée');
});

await t('aucun territoire, aucun sujet : la mesure rend VIDE, pas une erreur', async () => {
  await reset();
  eq(await metrics(), [], '« personne » est un état réel du jeu, pas une panne');
});

// ═══ 5. LES SNAPSHOTS — CE QUE LES CHECK REFUSENT ═══════════════════════════

const SNAP = `insert into public.leaderboard_snapshots
  (period, scope, scope_ref, audience_user_id, activity, subject_type, period_start, period_end, taken_at)
  values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning id`;
const snapArgs = (patch = {}) => {
  const base = {
    period: 'weekly',
    scope: 'city',
    scope_ref: CITY,
    audience_user_id: null,
    activity: 'run',
    subject_type: 'user',
    period_start: P_START,
    period_end: P_END,
    taken_at: '2026-07-27T00:05:00Z',
    ...patch,
  };
  return [
    base.period,
    base.scope,
    base.scope_ref,
    base.audience_user_id,
    base.activity,
    base.subject_type,
    base.period_start,
    base.period_end,
    base.taken_at,
  ];
};

await t('les CHECK des snapshots refusent chacun ce qu’ils annoncent', async () => {
  await rejects(SNAP, snapArgs({ period: 'daily' }), 'period_check', 'une période hors §10.3');
  await rejects(SNAP, snapArgs({ scope: 'galaxie' }), 'scope_check', 'un contexte hors §10.3');
  await rejects(SNAP, snapArgs({ activity: 'nage' }), 'activity_check', 'une discipline inconnue');
  await rejects(SNAP, snapArgs({ subject_type: 'ville' }), 'subject_type_check', 'un sujet inconnu');
  await rejects(
    SNAP,
    snapArgs({ period_start: P_END, period_end: P_START }),
    'period_window',
    'une fenêtre inversée',
  );
  await rejects(
    SNAP,
    snapArgs({ scope: 'friends', scope_ref: null, audience_user_id: null }),
    'scope_coherent',
    'un classement d’amis SANS public',
  );
  await rejects(
    SNAP,
    snapArgs({ scope: 'friends', scope_ref: CITY, audience_user_id: ALICE }),
    'scope_coherent',
    'un classement d’amis qui prétend aussi être un lieu',
  );
  await rejects(SNAP, snapArgs({ scope_ref: null }), 'scope_coherent', 'un lieu sans clé de contexte');
  await rejects(
    SNAP,
    snapArgs({ audience_user_id: ALICE }),
    'scope_coherent',
    'un classement de ville qui se prétend privé',
  );
});

await t('les quatre contextes de §10.3 et les deux périodes sont ACCEPTÉS', async () => {
  await db.exec('delete from public.leaderboard_snapshots');
  await db.query(SNAP, snapArgs({ scope: 'city', scope_ref: CITY }));
  await db.query(SNAP, snapArgs({ scope: 'neighborhood', scope_ref: 'secteur-42' }));
  await db.query(SNAP, snapArgs({ scope: 'local', scope_ref: '8a1fb46622dffff' }));
  await db.query(SNAP, snapArgs({ scope: 'friends', scope_ref: null, audience_user_id: ALICE }));
  await db.query(SNAP, snapArgs({ period: 'season', scope_ref: CITY }));
  await db.query(SNAP, snapArgs({ subject_type: 'crew', scope_ref: CITY }));
  const r = await db.query('select count(*)::int as n from public.leaderboard_snapshots');
  eq(r.rows[0].n, 6, 'les sept classements de §10.3 se décrivent sans exception');
});

await t('L’IDENTITÉ d’un snapshot tient MALGRÉ les NULL (le piège du coalesce)', async () => {
  await db.exec('delete from public.leaderboard_snapshots');
  // Cas A — scope géographique : `audience_user_id` est NULL des deux côtés.
  await db.query(SNAP, snapArgs());
  await rejects(SNAP, snapArgs(), 'identity', 'deux prises du même classement de ville au même instant');
  // Cas B — classement d'amis : c'est `scope_ref` qui est NULL des deux côtés.
  const amis = { scope: 'friends', scope_ref: null, audience_user_id: ALICE };
  await db.query(SNAP, snapArgs(amis));
  await rejects(SNAP, snapArgs(amis), 'identity', 'deux prises du même classement d’amis au même instant');
  // Ce qui DOIT rester possible : un autre instant, une autre discipline, un
  // autre public — sinon la contrainte aurait mangé des classements légitimes.
  await db.query(SNAP, snapArgs({ taken_at: '2026-07-28T00:05:00Z' }));
  await db.query(SNAP, snapArgs({ activity: 'bike' }));
  await db.query(SNAP, snapArgs({ ...amis, audience_user_id: BOB }));
  const r = await db.query('select count(*)::int as n from public.leaderboard_snapshots');
  eq(r.rows[0].n, 5, 'les classements légitimement distincts coexistent');
});

// ═══ 6. LES LIGNES — L’ÉGALITÉ EST PERMISE, LE DOUBLON NON ══════════════════

await t('deux ex aequo partagent le rang (§10.2), un même sujet ne figure pas deux fois', async () => {
  await db.exec('delete from public.leaderboard_snapshots');
  const s = await db.query(SNAP, snapArgs());
  const id = s.rows[0].id;
  const ENTRY = `insert into public.leaderboard_entries
    (snapshot_id, subject_type, subject_id, rank, tied_count, controlled_area_m2,
     successful_defenses, conquered_area_m2, previous_snapshot_at)
    values ($1, 'user', $2, $3, $4, $5, $6, $7, $8)`;
  await db.query(ENTRY, [id, ALICE, 2, 2, 300, 2, 30, '2026-07-20T00:05:00Z']);
  await db.query(ENTRY, [id, BOB, 2, 2, 300, 2, 30, null]);
  const r = await db.query(
    'select count(*)::int as n from public.leaderboard_entries where snapshot_id = $1 and rank = 2',
    [id],
  );
  eq(r.rows[0].n, 2, 'l’égalité de rang que §10.2 prévoit doit être STOCKABLE');
  await rejects(
    ENTRY,
    [id, ALICE, 5, 1, 1, 0, 0, null],
    'leaderboard_entries_pkey',
    'le même sujet deux fois dans le même snapshot',
  );
  await rejects(ENTRY, [id, CREW, 0, 1, 1, 0, 0, null], 'rank_positive', 'un rang 0');
  await rejects(ENTRY, [id, CREW, 1, 0, 1, 0, 0, null], 'tied_positive', 'un groupe d’ex aequo vide');
  await rejects(ENTRY, [id, CREW, 1, 1, -1, 0, 0, null], 'area_positive', 'une surface négative');
  await rejects(ENTRY, [id, CREW, 1, 1, 1, -1, 0, null], 'defenses_positive', 'des défenses négatives');
  await rejects(ENTRY, [id, CREW, 1, 1, 1, 0, -1, null], 'conquered_positive', 'une conquête négative');
});

await t('`previous_snapshot_at` NULL est accepté — « jamais classé ici » est un fait', async () => {
  const r = await db.query(
    `select count(*)::int as n from public.leaderboard_entries where previous_snapshot_at is null`,
  );
  ok(r.rows[0].n >= 1, 'un sujet jamais classé doit pouvoir figurer sans ancienneté inventée');
});

// ═══ 7. CASCADES ════════════════════════════════════════════════════════════

await t('supprimer un snapshot emporte ses lignes, jamais des orphelines', async () => {
  const s = await db.query('select id from public.leaderboard_snapshots limit 1');
  await db.query('delete from public.leaderboard_snapshots where id = $1', [s.rows[0].id]);
  const r = await db.query('select count(*)::int as n from public.leaderboard_entries where snapshot_id = $1', [
    s.rows[0].id,
  ]);
  eq(r.rows[0].n, 0, 'des lignes sans snapshot ne seraient interprétables par personne');
});

await t('supprimer le PUBLIC d’un classement d’amis emporte ce classement', async () => {
  await db.exec('delete from public.leaderboard_snapshots');
  const CARL = '44444444-4444-4444-4444-444444444444';
  await db.exec(`
    insert into auth.users (id) values ('${CARL}');
    insert into public.users (id, pseudo, city_id) values ('${CARL}', 'carl', '${CITY}')
      on conflict (id) do nothing;
  `);
  await db.query(SNAP, snapArgs({ scope: 'friends', scope_ref: null, audience_user_id: CARL }));
  await db.query('delete from public.users where id = $1', [CARL]);
  const r = await db.query('select count(*)::int as n from public.leaderboard_snapshots');
  eq(r.rows[0].n, 0, 'un classement d’amis sans public n’a plus de sens');
});

// ═══ 8. RLS ET PRIVILÈGES ═══════════════════════════════════════════════════

await t('RLS activée sur les deux tables de snapshot', async () => {
  const r = await db.query(`
    select relname, relrowsecurity from pg_class
    where relname in ('leaderboard_snapshots', 'leaderboard_entries')
    order by relname
  `);
  eq(r.rows.length, 2, 'les deux tables doivent exister');
  for (const row of r.rows) ok(row.relrowsecurity, `RLS absente sur ${row.relname}`);
});

await t('les policies existent et NOMMENT le cas des classements d’amis', async () => {
  const r = await db.query(`
    select tablename, policyname, qual from pg_policies
    where tablename in ('leaderboard_snapshots', 'leaderboard_entries')
    order by tablename
  `);
  eq(r.rows.length, 2, 'une policy de lecture par table');
  for (const row of r.rows) {
    ok(String(row.qual).includes('friends'), `${row.tablename} : la policy ne parle pas de 'friends'`);
    ok(String(row.qual).includes('uid'), `${row.tablename} : la policy ne consulte pas auth.uid()`);
  }
});

await t('aucune écriture cliente sur les snapshots — lecture seule', async () => {
  for (const table of ['leaderboard_snapshots', 'leaderboard_entries']) {
    for (const role of ['anon', 'authenticated']) {
      for (const priv of ['insert', 'update', 'delete']) {
        const r = await db.query(`select has_table_privilege($1, $2, $3) as p`, [role, `public.${table}`, priv]);
        eq(r.rows[0].p, false, `${role} ne doit pas pouvoir ${priv} sur ${table}`);
      }
    }
    const a = await db.query(`select has_table_privilege('authenticated', $1, 'select') as p`, [`public.${table}`]);
    eq(a.rows[0].p, true, `un joueur connecté doit pouvoir LIRE ${table}`);
    const n = await db.query(`select has_table_privilege('anon', $1, 'select') as p`, [`public.${table}`]);
    eq(n.rows[0].p, false, `un visiteur anonyme ne lit pas ${table}`);
  }
});

await t('la vue de surface est FERMÉE aux clients (sinon la publication différée se contourne)', async () => {
  const cli = await db.query(
    `select has_table_privilege('authenticated', 'public.territory_surface_by_owner', 'select') as p`,
  );
  eq(cli.rows[0].p, false, 'un agrégat de surface lisible en direct contournerait la RLS de 0074');
  const anon = await db.query(
    `select has_table_privilege('anon', 'public.territory_surface_by_owner', 'select') as p`,
  );
  eq(anon.rows[0].p, false, 'ni anon');
  const srv = await db.query(
    `select has_table_privilege('service_role', 'public.territory_surface_by_owner', 'select') as p`,
  );
  eq(srv.rows[0].p, true, 'le preneur de snapshot (service_role) doit pouvoir la lire');
});

await t('la fonction de mesure n’est exécutable que par le serveur', async () => {
  const sig = 'public.leaderboard_source_metrics(text, timestamptz, timestamptz)';
  for (const role of ['anon', 'authenticated']) {
    const r = await db.query(`select has_function_privilege($1, $2, 'execute') as p`, [role, sig]);
    eq(r.rows[0].p, false, `${role} ne doit pas pouvoir exécuter la mesure`);
  }
  const srv = await db.query(`select has_function_privilege('service_role', $1, 'execute') as p`, [sig]);
  eq(srv.rows[0].p, true, 'service_role doit pouvoir l’exécuter');
});

// ═══ 9. RIEN N'A ÉTÉ RETIRÉ — LES DEUX AXES COEXISTENT ══════════════════════

await t('`season_scores` est INTACTE : les points coexistent avec la surface', async () => {
  const cols = await db.query(`
    select column_name from information_schema.columns
    where table_schema = 'public' and table_name = 'season_scores'
    order by column_name
  `);
  const noms = cols.rows.map((c) => c.column_name);
  ok(noms.includes('points'), 'la colonne `points` doit toujours exister (§10.5 : la progression)');
  ok(noms.includes('activity'), 'et sa discipline (0070)');
  const pk = await db.query(`
    select a.attname from pg_index i
    join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
    where i.indrelid = 'public.season_scores'::regclass and i.indisprimary
    order by a.attname
  `);
  eq(
    pk.rows.map((x) => x.attname),
    ['activity', 'season_id', 'user_id'],
    'la clé primaire de season_scores n’a pas bougé — 0082 est purement ADDITIVE',
  );
  const vue = await db.query(
    `select count(*)::int as n from pg_views where schemaname = 'public' and viewname = 'player_leaderboard'`,
  );
  eq(vue.rows[0].n, 1, 'la vue de classement en points existe toujours : rien n’est déprécié ici');
});

// ─── Verdict ────────────────────────────────────────────────────────────────
console.log(`\n${passed} test(s) OK, ${failures.length} échec(s).`);
if (failures.length > 0) process.exit(1);
