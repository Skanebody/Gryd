#!/usr/bin/env node
/**
 * GRYD — test EXÉCUTABLE de la migration 0078 (`territory_contests`).
 * LOT 3, ÉTAPE 1 : le vol cesse d'être instantané (spec §9, §19.3).
 *
 * ═══ POURQUOI CE FICHIER EXISTE ═════════════════════════════════════════════
 * 0078 ne contient AUCUN TypeScript : une table, des CHECK, trois index, une
 * policy, un trigger. Les tests Deno du dépôt ne touchent pas une ligne de DDL —
 * sans ce fichier, « une seule contestation active par territoire » resterait
 * une phrase dans un commentaire.
 *
 * Et c'est LA promesse qu'il fallait mesurer plutôt que relire : deux rivaux qui
 * bouclent le même quartier à dix minutes d'intervalle est le cas RÉEL, pas le
 * cas tordu. Si l'index unique partiel est mal écrit (non partiel, mauvaise
 * colonne, mauvais prédicat), la faute ne se voit pas à la lecture — elle se
 * voit quand deux transferts attribuent le même territoire deux fois.
 *
 * Docker est indisponible sur cette machine (pas de `npx supabase start`).
 * PGlite — Postgres compilé en WASM — exécute le VRAI SQL des migrations dans
 * Node. Même harnais que `territories_backfill.pglite.test.mjs`.
 *
 * ═══ CE QUE CE TEST PROUVE ══════════════════════════════════════════════════
 *  1. 0078 s'applique sur un Postgres réel, telle quelle, par-dessus la LIGNÉE
 *     COMPLÈTE des migrations (0002 → 0077) — pas sur une maquette de schéma.
 *  2. Chaque CHECK refuse ce qu'il annonce : statut inconnu, type d'assaillant
 *     inconnu, recouvrement hors [0, 1], fenêtre de défense nulle ou inversée,
 *     résolution incohérente avec le statut, résolution antérieure au début.
 *  3. Les BORNES 0 et 1 du recouvrement sont ACCEPTÉES (un CHECK trop zélé
 *     rejetterait une mesure parfaitement réelle).
 *  4. UNE SEULE contestation ACTIVE par territoire — le second assaillant
 *     simultané est refusé —, mais l'HISTORIQUE reste libre : une fois la
 *     première close, une nouvelle contestation peut s'ouvrir, et deux
 *     territoires distincts se contestent en parallèle sans se gêner.
 *  5. Les trois index existent ET ont la bonne FORME (unique+partiel pour la
 *     contestation active, partiel sur les actives pour le cron d'échéance).
 *  6. RLS activée, policy présente et NOMMANT LES DEUX CAMPS, privilèges
 *     d'écriture révoqués pour `anon` et `authenticated`.
 *  7. La suppression du TERRITOIRE emporte ses contestations (cascade), la
 *     purge de la COURSE ne les emporte PAS (la contestation a eu lieu).
 *  8. `updated_at` bouge tout seul à la résolution.
 *  9. Un assaillant CREW est accepté au même titre qu'un joueur.
 *
 * ═══ CE QU'IL NE PROUVE PAS, dit ici plutôt que laissé croire ═══════════════
 *  · L'EFFET RÉEL DE LA RLS. PGlite tourne en SUPERUTILISATEUR : les policies ne
 *    s'y appliquent pas et `auth.uid()` y est un bouchon qui rend NULL. On
 *    vérifie que la policy EXISTE, ce qu'elle NOMME, et que les privilèges sont
 *    absents du catalogue — pas qu'un tiers se fasse réellement refuser.
 *  · QUE LE JEU AIT CHANGÉ. Personne n'écrit dans cette table : `claim_hexes`
 *    transfère toujours la propriété dans la transaction. Ce test prouve un
 *    SCHÉMA, pas une mécanique en service.
 *
 * ═══ LANCER ════════════════════════════════════════════════════════════════
 *   mkdir -p /tmp/pglite && cd /tmp/pglite
 *   echo '{"name":"pglite-scratch","private":true}' > package.json
 *   npm i --ignore-scripts @electric-sql/pglite
 *   cd <repo> && GRYD_PGLITE=/tmp/pglite/node_modules/@electric-sql/pglite/dist/index.js \
 *     node supabase/tests/territory_contests.pglite.test.mjs
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
      '    node supabase/tests/territory_contests.pglite.test.mjs',
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
// lui, la table naîtrait déjà sans privilège client et le test des `revoke` de
// la migration serait un faux positif.
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
// Aucun ne touche `territories`, `runs` ni `crews` d'une façon dont 0078 dépend.
// Les fichiers qui appellent `cron.schedule(` sans créer l'extension sont, eux,
// tronqués à cet appel (patron de `activity_dimension.pglite.test.mjs`).
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
// 0078 ; il ne doit pas rougir parce qu'un autre lot a livré 0079.
const LINEAGE = readdirSync(MIGRATIONS)
  .filter((f) => f.endsWith('.sql') && /^\d{4}_/.test(f) && Number(f.slice(0, 4)) <= 77)
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

console.log('territory_contests — migration 0078 (contestation §9) sur PGlite\n');
console.log(`  (lignée rejouée : ${LINEAGE.length} migrations, 0002 → 0077)\n`);

// ═══ 1. LA MIGRATION S'APPLIQUE ═════════════════════════════════════════════
let migrationError = null;
try {
  await db.exec(readFileSync(join(MIGRATIONS, '0078_territory_contests.sql'), 'utf8'));
} catch (err) {
  migrationError = err;
}

await t('la migration 0078 s’applique sur un Postgres réel, telle quelle', () => {
  if (migrationError) throw new Error(migrationError.message);
});

if (migrationError) {
  console.log('\nMigration non appliquée : la suite n’a aucun sens, on s’arrête ici.');
  process.exit(1);
}

// ─── Acteurs ────────────────────────────────────────────────────────────────
const OWNER = '11111111-1111-1111-1111-111111111111';
const RIVAL = '22222222-2222-2222-2222-222222222222';
const CREW = '33333333-3333-3333-3333-333333333333';
const CITY = 'paris';
const ALGO = 'gryd-loop-polygon@1';

// DEUX PIÈGES DU SOCLE, réglés ici plutôt que contournés :
//  · Paris EXISTE DÉJÀ — la lignée elle-même sème la zone (0002). D'où le
//    `on conflict do nothing` : on ne réécrit pas la donnée de production, on
//    s'assure seulement qu'elle est là.
//  · sa `geojson` doit être un VRAI polygone : depuis 0066, un déclencheur en
//    dérive la boîte englobante (`min_lat`… `not null`). Un `{}` de complaisance
//    ferait tomber l'insert dans le cas où la zone n'existerait pas.
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

await db.exec(`
  insert into auth.users (id) values ('${OWNER}'), ('${RIVAL}');
  insert into public.city_zones (city_id, name, geojson, status)
    values ('${CITY}', 'Paris', '${PARIS_BBOX}'::jsonb, 'active')
    on conflict (city_id) do nothing;
  -- public.users est DÉJÀ provisionné par le déclencheur de 0028 à l'insert dans
  -- auth.users : on COMPLÈTE la ligne existante, on ne la recrée pas. La recréer
  -- ferait tomber le test sur users_pkey — et cacherait au passage que le dépôt
  -- provisionne bien ses joueurs tout seul.
  insert into public.users (id, pseudo, city_id)
    values ('${OWNER}', 'proprio', '${CITY}'), ('${RIVAL}', 'rival', '${CITY}')
    on conflict (id) do update set city_id = excluded.city_id;
  insert into public.crews (id, name, color, city_id, code, created_by)
    values ('${CREW}', 'Les Rivaux', 3, '${CITY}', 'RIVAUX', '${RIVAL}');
  insert into public.crew_members (crew_id, user_id) values ('${CREW}', '${RIVAL}');
`);

/** Un carré ~400 m à Paris, en GeoJSON refermé (ce que le moteur persiste). */
const SQUARE = JSON.stringify({
  type: 'Polygon',
  coordinates: [[
    [2.3522, 48.8566],
    [2.3577, 48.8566],
    [2.3577, 48.8602],
    [2.3522, 48.8602],
    [2.3522, 48.8566],
  ]],
});

const newRun = async () => {
  const r = await db.query(
    `insert into public.runs (user_id, client_run_id, source, started_at,
                              distance_m, duration_s, status)
     values ($1, gen_random_uuid(), 'gps', now(), 5000, 1800, 'valid')
     returning id`,
    [RIVAL],
  );
  return r.rows[0].id;
};

const newTerritory = async () => {
  const r = await db.query(
    `insert into public.territories
       (activity, owner_type, owner_id, geometry, area_m2, city_id, state,
        publish_after, algorithm_version)
     values ('run', 'user', $1, $2::jsonb, 160000, $3, 'owned_personal',
             now() + interval '60 minutes', $4)
     returning id`,
    [OWNER, SQUARE, CITY, ALGO],
  );
  return r.rows[0].id;
};

/**
 * Insert d'une contestation NOMINALE. Toutes les valeurs de jeu (0,78 de
 * recouvrement, 18 h de fenêtre) sont fournies par l'APPELANT, comme en
 * production : le schéma n'en connaît aucune.
 */
const insertContest = (territoryId, over = {}) => {
  const v = {
    attackerType: 'user',
    attackerId: RIVAL,
    sourceActivityId: null,
    overlapRatio: 0.78,
    startedAt: '2026-07-27 08:00:00+00',
    expiresAt: '2026-07-28 02:00:00+00', // +18 h (fenêtre de niveau 0)
    status: 'active',
    resolvedAt: null,
    ...over,
  };
  return db.query(
    `insert into public.territory_contests
       (territory_id, attacker_type, attacker_id, source_activity_id, overlap_ratio,
        started_at, expires_at, status, resolved_at)
     values ($1, $2, $3, $4, $5, $6::timestamptz, $7::timestamptz, $8, $9::timestamptz)
     returning id, status, overlap_ratio, updated_at`,
    [
      territoryId,
      v.attackerType,
      v.attackerId,
      v.sourceActivityId,
      v.overlapRatio,
      v.startedAt,
      v.expiresAt,
      v.status,
      v.resolvedAt,
    ],
  );
};

// ═══ 2. LES CHECK REFUSENT CE QU'ILS ANNONCENT ══════════════════════════════
const T1 = await newTerritory();

await t('une contestation nominale passe', async () => {
  const r = await insertContest(T1);
  ok(r.rows[0].id, 'aucun id retourné');
  eq(r.rows[0].status, 'active', 'statut');
});

await t('un statut hors des 4 valeurs de §19.3 est refusé', async () => {
  const T = await newTerritory();
  await rejects(
    `insert into public.territory_contests
       (territory_id, attacker_type, attacker_id, overlap_ratio, started_at, expires_at, status, resolved_at)
     values ($1, 'user', $2, 0.7, now(), now() + interval '18 hours', 'pending', now())`,
    [T, RIVAL],
    'territory_contests_status_check',
    'statut « pending »',
  );
});

await t('un type d’assaillant inconnu est refusé', async () => {
  const T = await newTerritory();
  await rejects(
    `insert into public.territory_contests
       (territory_id, attacker_type, attacker_id, overlap_ratio, started_at, expires_at)
     values ($1, 'club', $2, 0.7, now(), now() + interval '18 hours')`,
    [T, RIVAL],
    'territory_contests_attacker_type_check',
    'assaillant « club »',
  );
});

await t('un recouvrement hors [0, 1] est refusé (au-dessus comme en dessous)', async () => {
  const T = await newTerritory();
  const sql = `insert into public.territory_contests
       (territory_id, attacker_type, attacker_id, overlap_ratio, started_at, expires_at)
     values ($1, 'user', $2, $3, now(), now() + interval '18 hours')`;
  await rejects(sql, [T, RIVAL, 1.5], 'territory_contests_overlap_ratio_range', 'ratio 1,5');
  await rejects(sql, [T, RIVAL, -0.1], 'territory_contests_overlap_ratio_range', 'ratio −0,1');
});

await t('les bornes 0 et 1 du recouvrement sont ACCEPTÉES — ce sont des mesures réelles', async () => {
  const A = await newTerritory();
  const B = await newTerritory();
  eq((await insertContest(A, { overlapRatio: 0 })).rows[0].overlap_ratio, 0, 'ratio 0');
  eq((await insertContest(B, { overlapRatio: 1 })).rows[0].overlap_ratio, 1, 'ratio 1');
});

await t('une fenêtre de défense nulle ou inversée est refusée', async () => {
  const T = await newTerritory();
  await rejects(
    `insert into public.territory_contests
       (territory_id, attacker_type, attacker_id, overlap_ratio, started_at, expires_at)
     values ($1, 'user', $2, 0.7, '2026-07-27 08:00:00+00', '2026-07-27 08:00:00+00')`,
    [T, RIVAL],
    'territory_contests_window_positive',
    'échéance = ouverture (le propriétaire n’aurait jamais eu sa chance)',
  );
  await rejects(
    `insert into public.territory_contests
       (territory_id, attacker_type, attacker_id, overlap_ratio, started_at, expires_at)
     values ($1, 'user', $2, 0.7, '2026-07-27 08:00:00+00', '2026-07-27 02:00:00+00')`,
    [T, RIVAL],
    'territory_contests_window_positive',
    'échéance avant ouverture',
  );
});

await t('statut et date de résolution ne peuvent pas se contredire', async () => {
  const T = await newTerritory();
  await rejects(
    `insert into public.territory_contests
       (territory_id, attacker_type, attacker_id, overlap_ratio, started_at, expires_at, status, resolved_at)
     values ($1, 'user', $2, 0.7, now(), now() + interval '18 hours', 'active', now())`,
    [T, RIVAL],
    'territory_contests_resolution_coherent',
    'active ET résolue',
  );
  await rejects(
    `insert into public.territory_contests
       (territory_id, attacker_type, attacker_id, overlap_ratio, started_at, expires_at, status, resolved_at)
     values ($1, 'user', $2, 0.7, now(), now() + interval '18 hours', 'transferred', null)`,
    [T, RIVAL],
    'territory_contests_resolution_coherent',
    'transférée SANS date (une propriété changée de main à une date inconnue)',
  );
});

await t('on ne tranche pas une contestation avant de l’avoir ouverte', async () => {
  const T = await newTerritory();
  await rejects(
    `insert into public.territory_contests
       (territory_id, attacker_type, attacker_id, overlap_ratio, started_at, expires_at, status, resolved_at)
     values ($1, 'user', $2, 0.7, '2026-07-27 08:00:00+00', '2026-07-28 02:00:00+00',
             'defended', '2026-07-27 07:00:00+00')`,
    [T, RIVAL],
    'territory_contests_resolved_after_start',
    'résolution antérieure à l’ouverture',
  );
});

await t('le statut par défaut d’une contestation est « active » — elle naît ouverte', async () => {
  const T = await newTerritory();
  const r = await db.query(
    `insert into public.territory_contests
       (territory_id, attacker_type, attacker_id, overlap_ratio, started_at, expires_at)
     values ($1, 'user', $2, 0.7, now(), now() + interval '18 hours')
     returning status`,
    [T, RIVAL],
  );
  eq(r.rows[0].status, 'active', 'statut par défaut');
});

await t('un assaillant CREW est accepté au même titre qu’un joueur', async () => {
  const T = await newTerritory();
  const r = await insertContest(T, { attackerType: 'crew', attackerId: CREW });
  ok(r.rows[0].id, 'contestation de crew refusée');
});

// ═══ 3. UNE SEULE CONTESTATION ACTIVE PAR TERRITOIRE ════════════════════════
// LE cas réel : deux rivaux qui bouclent le même quartier à dix minutes d'écart.
await t('un SECOND assaillant simultané sur le MÊME territoire est refusé', async () => {
  const T = await newTerritory();
  await insertContest(T);
  await rejects(
    `insert into public.territory_contests
       (territory_id, attacker_type, attacker_id, overlap_ratio, started_at, expires_at)
     values ($1, 'crew', $2, 0.9, now(), now() + interval '18 hours')`,
    [T, CREW],
    'territory_contests_one_active_per_territory',
    'deuxième contestation active',
  );
});

await t('deux territoires DIFFÉRENTS se contestent en parallèle sans se gêner', async () => {
  const A = await newTerritory();
  const B = await newTerritory();
  await insertContest(A);
  const r = await insertContest(B);
  ok(r.rows[0].id, 'la contestation du second territoire a été refusée à tort');
});

await t('une fois la première close, une NOUVELLE contestation peut s’ouvrir', async () => {
  const T = await newTerritory();
  const first = await insertContest(T);
  await db.query(
    `update public.territory_contests
        set status = 'defended', resolved_at = expires_at
      where id = $1`,
    [first.rows[0].id],
  );
  const second = await insertContest(T);
  ok(second.rows[0].id, 'la reprise (§9.4) doit rester possible');
});

await t('l’HISTORIQUE reste libre : plusieurs contestations closes sur la même zone', async () => {
  const T = await newTerritory();
  for (const status of ['defended', 'transferred', 'cancelled']) {
    await insertContest(T, { status, resolvedAt: '2026-07-28 02:00:00+00' });
  }
  const r = await db.query(
    `select count(*)::int as n from public.territory_contests
      where territory_id = $1 and status <> 'active'`,
    [T],
  );
  eq(r.rows[0].n, 3, 'contestations closes conservées');
});

// ═══ 4. LA FORME DES INDEX ══════════════════════════════════════════════════
const indexdef = async (name) => {
  const r = await db.query(
    `select indexdef from pg_indexes
      where schemaname = 'public' and tablename = 'territory_contests' and indexname = $1`,
    [name],
  );
  ok(r.rows.length === 1, `index ${name} absent`);
  return r.rows[0].indexdef;
};

await t('l’index de contestation active est UNIQUE et PARTIEL sur status = active', async () => {
  const def = await indexdef('territory_contests_one_active_per_territory');
  ok(/CREATE UNIQUE INDEX/i.test(def), `doit être UNIQUE — ${def}`);
  ok(/\(territory_id\)/.test(def), `doit porter sur territory_id seul — ${def}`);
  ok(
    /WHERE\s+\(?status\s*=\s*'active'/i.test(def),
    `doit être PARTIEL sur les actives, sinon l’historique serait interdit — ${def}`,
  );
});

await t('l’index de lecture (territory_id, status) existe', async () => {
  const def = await indexdef('territory_contests_territory_status_idx');
  ok(/\(territory_id,\s*status\)/.test(def), `colonnes attendues — ${def}`);
});

await t('l’index du cron d’échéance porte sur expires_at et ne voit que les actives', async () => {
  const def = await indexdef('territory_contests_expires_at_idx');
  ok(/\(expires_at\)/.test(def), `doit porter sur expires_at — ${def}`);
  ok(/WHERE\s+\(?status\s*=\s*'active'/i.test(def), `doit être partiel — ${def}`);
});

// ═══ 5. RLS ET PRIVILÈGES ═══════════════════════════════════════════════════
await t('la RLS est ACTIVÉE sur la table', async () => {
  const r = await db.query(
    `select relrowsecurity from pg_class where oid = 'public.territory_contests'::regclass`,
  );
  eq(r.rows[0].relrowsecurity, true, 'row level security');
});

await t('la seule policy est une LECTURE, et elle nomme les DEUX camps', async () => {
  const r = await db.query(
    `select policyname, cmd, qual from pg_policies
      where schemaname = 'public' and tablename = 'territory_contests'`,
  );
  eq(r.rows.length, 1, 'nombre de policies (aucune écriture client)');
  eq(r.rows[0].policyname, 'territory_contests_select_parties', 'nom');
  eq(r.rows[0].cmd, 'SELECT', 'commande');
  const qual = String(r.rows[0].qual);
  ok(/attacker_id/.test(qual), `le camp attaquant doit être nommé — ${qual}`);
  ok(/territories/.test(qual), `le camp défenseur passe par le territoire — ${qual}`);
  ok(/crew_members/.test(qual), `les crews des deux camps doivent être couverts — ${qual}`);
});

await t('aucun rôle client ne peut ÉCRIRE ; seul `authenticated` peut lire', async () => {
  const r = await db.query(
    `select grantee, privilege_type from information_schema.role_table_grants
      where table_schema = 'public' and table_name = 'territory_contests'
        and grantee in ('anon', 'authenticated')
      order by grantee, privilege_type`,
  );
  eq(
    r.rows.map((x) => `${x.grantee}:${x.privilege_type}`),
    ['authenticated:SELECT'],
    'privilèges clients',
  );
});

// ═══ 6. CYCLE DE VIE DES DONNÉES ════════════════════════════════════════════
await t('supprimer le TERRITOIRE emporte ses contestations (elles n’ont plus de sens)', async () => {
  const T = await newTerritory();
  await insertContest(T);
  await db.query('delete from public.territories where id = $1', [T]);
  const r = await db.query(
    'select count(*)::int as n from public.territory_contests where territory_id = $1',
    [T],
  );
  eq(r.rows[0].n, 0, 'contestations restantes');
});

await t('purger la COURSE n’efface pas la contestation : elle a eu lieu', async () => {
  const T = await newTerritory();
  const RUN = await newRun();
  const c = await insertContest(T, { sourceActivityId: RUN });
  await db.query('delete from public.runs where id = $1', [RUN]);
  const r = await db.query(
    'select source_activity_id, status from public.territory_contests where id = $1',
    [c.rows[0].id],
  );
  eq(r.rows.length, 1, 'la contestation doit survivre à la purge de sa trace');
  eq(r.rows[0].source_activity_id, null, 'la référence à la course est simplement effacée');
});

await t('`updated_at` est tenue par la base, même contre un écrivain qui la falsifie', async () => {
  const T = await newTerritory();
  const c = await insertContest(T);
  // On n'oppose PAS deux `now()` (l'insert et l'update peuvent tomber dans la
  // même milliseconde sous PGlite : le test serait tantôt vert, tantôt rouge, et
  // faux dans les deux cas). On écrit une date DÉLIBÉRÉMENT fausse : si elle
  // ressort telle quelle, le trigger n'est pas là, et la colonne ment.
  const r = await db.query(
    `update public.territory_contests
        set status = 'transferred', resolved_at = expires_at,
            updated_at = '2000-01-01 00:00:00+00'
      where id = $1
      returning updated_at, resolved_at`,
    [c.rows[0].id],
  );
  const vu = new Date(r.rows[0].updated_at).getTime();
  ok(vu > Date.parse('2001-01-01T00:00:00Z'), 'la date falsifiée a été conservée : trigger absent');
  ok(
    vu >= new Date(c.rows[0].updated_at).getTime(),
    'la mise à jour ne peut pas être antérieure à la création',
  );
});

// ─── Verdict ────────────────────────────────────────────────────────────────
console.log(`\n${passed} test(s) OK, ${failures.length} échec(s).`);
if (failures.length > 0) process.exit(1);
