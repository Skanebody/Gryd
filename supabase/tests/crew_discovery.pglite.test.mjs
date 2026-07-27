#!/usr/bin/env node
/**
 * GRYD — test EXÉCUTABLE de la migration 0083 (`crew_discovery_and_ownership`).
 * LOT 7 : la découverte de crew devient réelle, et la propriété crew est tranchée.
 *
 * ═══ POURQUOI CE FICHIER EXISTE ═════════════════════════════════════════════
 * 0083 ne contient AUCUN TypeScript : six fonctions PL/pgSQL, une colonne, un
 * index, des grants. Les tests Deno du dépôt n'en touchent pas une ligne. Sans
 * ce fichier, « la découverte ne fabrique rien » et « la propriété reste
 * humaine » resteraient des phrases dans un commentaire.
 *
 * Et c'est bien là qu'on se trompe sans le voir. Quatre fautes ne se lisent pas :
 *   · un `count(*)` au lieu de `count(distinct h3index)` — un joueur complet
 *     (run + bike sur le MÊME hexagone) doublerait l'emprise du crew, et §1.2
 *     (« une surface Run ne s'additionne pas à une surface Bike ») tomberait ;
 *   · un membre PARTI (left_at non nul) laissé dans l'agrégat — le crew garderait
 *     une emprise fantôme ;
 *   · une liste de rôles recopiée à la main qui DÉRIVE de `CREW_PERMISSIONS` ;
 *   · un `crew_join_intent` qui rejoindrait un crew 'closed' parce que le client
 *     a envoyé l'intention « rejoindre ».
 *
 * Docker est indisponible sur cette machine (pas de `npx supabase start`).
 * PGlite — Postgres compilé en WASM — exécute le VRAI SQL des migrations dans
 * Node. Même harnais que `leaderboard_surface.pglite.test.mjs`.
 *
 * ═══ CE QUE CE TEST PROUVE ══════════════════════════════════════════════════
 *  1. 0083 s'applique sur un Postgres réel, telle quelle, PAR-DESSUS la lignée
 *     complète 0002 → 0082 — pas sur une maquette de schéma.
 *  2. L'ARBITRAGE EST INSCRIT EN BASE : `territories.context_crew_id` existe,
 *     est NULLABLE, ne casse pas les CHECK de 0074, et son commentaire DIT
 *     qu'aucun écrivain ne l'alimente. `owner_type` garde 'crew' (capacité
 *     dormante documentée), et la voie A n'a PAS été prise : `owner_user_id`
 *     de `hex_claims` est toujours NOT NULL.
 *  3. L'emprise vivante compte des HEXAGONES DISTINCTS, pas des lignes : un
 *     joueur run+bike sur le même hexagone vaut 1, avec le détail 1/1.
 *  4. Un membre PARTI ne compte plus ; un hex EXPIRÉ ne compte plus.
 *  5. La découverte est BORNÉE À UNE VILLE et NE FABRIQUE RIEN : un crew d'une
 *     autre ville n'y figure pas, un crew sans emprise sort à 0 (pas absent),
 *     et sans ville connue elle DIT `no_city` au lieu de tout renvoyer.
 *  6. Elle N'EXPOSE PAS le secret ni le décor : aucune clé `code`, aucune clé
 *     `activityScore` / `league` / `xp` (colonnes jamais alimentées), aucune
 *     identité de membre (§12).
 *  7. `crew_join_intent` : le SERVEUR décide. 'open' → adhésion, 'on_request' →
 *     candidature (idempotente), 'closed'/'invite_only' → refus, plafond
 *     d'effectif → refus, cooldown 7 j → refus, déjà dans un crew → refus.
 *  8. La candidature EST LISIBLE ET TRANCHABLE : sans quoi le bouton mentirait.
 *  9. LA DÉRIVE DE LA LISTE DE RÔLES EST TESTÉE contre game-rules.ts —
 *     `CREW_PERMISSIONS.acceptApplications` est lu dans le fichier source.
 * 10. ANTI-P2W : accepter une candidature n'octroie ni territoire ni points, et
 *     l'entrant reçoit le rôle d'ESSAI, pas un rôle de pouvoir.
 * 11. `crew_live_footprint` est FERMÉE aux rôles clients (sinon l'emprise de
 *     n'importe quel crew s'énumère hors des garde-fous de la découverte).
 *
 * ═══ CE QU'IL NE PROUVE PAS, dit ici plutôt que laissé croire ═══════════════
 *  · L'EFFET RÉEL DE LA RLS. PGlite tourne en SUPERUTILISATEUR : les policies ne
 *    s'y appliquent pas. On vérifie les PRIVILÈGES au catalogue, pas un refus
 *    vécu par un tiers.
 *  · `auth.uid()` est un bouchon : on le REDÉFINIT pour incarner un acteur. Ce
 *    n'est pas une session Supabase, c'est une simulation fidèle de son effet.
 *  · QUE LES ÉCRANS APPELLENT CES FONCTIONS. Le classement de pertinence §E39
 *    est PUR et testé ailleurs (`features/crew/discovery.test.ts`) ; aucun
 *    `order by` de cette migration n'attribue une pertinence.
 *
 * ═══ LANCER ════════════════════════════════════════════════════════════════
 *   mkdir -p /tmp/pglite && cd /tmp/pglite
 *   echo '{"name":"pglite-scratch","private":true}' > package.json
 *   npm i --ignore-scripts @electric-sql/pglite
 *   cd <repo> && GRYD_PGLITE=/tmp/pglite/node_modules/@electric-sql/pglite/dist/index.js \
 *     node supabase/tests/crew_discovery.pglite.test.mjs
 * Sans PGlite : sortie CODE 2 — un test non exécuté n'est JAMAIS vert.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS = join(HERE, '..', 'migrations');
const GAME_RULES = join(HERE, '..', '..', 'packages', 'shared', 'src', 'game-rules.ts');

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
      '    node supabase/tests/crew_discovery.pglite.test.mjs',
  );
  process.exit(2);
}

// ─── Micro-harnais (aucune dépendance de test) ───────────────────────────────
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
  create function extensions.gen_random_bytes(int) returns bytea
    language sql as $$ select decode(md5(random()::text), 'hex') $$;
  alter default privileges in schema public grant all on tables to anon, authenticated;
`);

// Même liste de sauts que les tests voisins, et pour la même raison : PGlite
// n'embarque ni pgcrypto, ni pg_cron, ni la publication realtime.
const SKIP = new Set([
  '0001_extensions.sql',
  '0020_crew_realtime.sql',
  '0038_sector_cron.sql',
  '0039_core_crons.sql',
  '0064_offensive_lifecycle.sql',
]);
const CRON = 'select cron.schedule(';
const LINEAGE = readdirSync(MIGRATIONS)
  .filter((f) => f.endsWith('.sql') && /^\d{4}_/.test(f) && Number(f.slice(0, 4)) <= 82)
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

console.log('crew_discovery — migration 0083 (LOT 7 crews) sur PGlite\n');
console.log(`  (lignée rejouée : ${LINEAGE.length} migrations, 0002 → 0082)\n`);

// ═══ 1. LA MIGRATION S'APPLIQUE ═════════════════════════════════════════════
let migrationError = null;
try {
  await db.exec(readFileSync(join(MIGRATIONS, '0083_crew_discovery_and_ownership.sql'), 'utf8'));
} catch (err) {
  migrationError = err;
}

await t('la migration 0083 s’applique sur un Postgres réel, telle quelle', () => {
  if (migrationError) throw new Error(migrationError.message);
});
if (migrationError) {
  console.log('\nMigration non appliquée : la suite n’a aucun sens, on s’arrête ici.');
  process.exit(1);
}

// ─── Acteurs ────────────────────────────────────────────────────────────────
const CHIEF = '11111111-1111-1111-1111-111111111111'; // fondateur du crew A
const DUO = '22222222-2222-2222-2222-222222222222'; // membre du crew A, ami du visiteur
const LEAVER = '33333333-3333-3333-3333-333333333333'; // a QUITTÉ le crew A
const VISITOR = '44444444-4444-4444-4444-444444444444'; // sans crew : celui qui découvre
const NOMAD = '55555555-5555-5555-5555-555555555555'; // sous cooldown de changement
const OUTSIDER = '66666666-6666-6666-6666-666666666666'; // membre du crew d'une autre ville

const CREW_A = 'aaaaaaaa-0000-0000-0000-000000000001'; // Paris, on_request, avec emprise
const CREW_OPEN = 'aaaaaaaa-0000-0000-0000-000000000002'; // Paris, open, vide
const CREW_SHUT = 'aaaaaaaa-0000-0000-0000-000000000003'; // Paris, closed
const CREW_FULL = 'aaaaaaaa-0000-0000-0000-000000000004'; // Paris, open mais plein
const CREW_LILLE = 'aaaaaaaa-0000-0000-0000-000000000005'; // AUTRE ville

const PARIS = 'paris';
const LILLE_ZONE = JSON.stringify({
  type: 'Polygon',
  coordinates: [[[3.0, 50.6], [3.1, 50.6], [3.1, 50.7], [3.0, 50.7], [3.0, 50.6]]],
});

// `public.users` est provisionnée par le trigger de 0028 sur auth.users : on
// insère donc dans auth.users puis on complète le pseudo/la ville.
const people = [
  [CHIEF, 'chief'],
  [DUO, 'duo'],
  [LEAVER, 'leaver'],
  [VISITOR, 'visitor'],
  [NOMAD, 'nomad'],
  [OUTSIDER, 'outsider'],
];
for (const [id, pseudo] of people) {
  await db.query('insert into auth.users (id) values ($1)', [id]);
  await db.query(
    `insert into public.users (id, pseudo, city_id) values ($1, $2, $3)
     on conflict (id) do update set pseudo = excluded.pseudo, city_id = excluded.city_id`,
    [id, pseudo, PARIS],
  );
}
// Lille doit exister comme zone avant qu'un crew ne s'y rattache.
await db.query(
  `insert into public.city_zones (city_id, name, geojson, status)
   values ('lille', 'Lille', $1::jsonb, 'wild') on conflict (city_id) do nothing`,
  [LILLE_ZONE],
);

const crews = [
  [CREW_A, 'Les Berges', 'BRG', PARIS, 'on_request', 'AAAAA1'],
  [CREW_OPEN, 'Portes Ouvertes', 'OPN', PARIS, 'open', 'AAAAA2'],
  [CREW_SHUT, 'Le Verrou', 'SHT', PARIS, 'closed', 'AAAAA3'],
  [CREW_FULL, 'Complet', 'FUL', PARIS, 'open', 'AAAAA4'],
  [CREW_LILLE, 'Nord Runners', 'NRD', 'lille', 'open', 'AAAAA5'],
];
for (const [id, name, tag, city, rec, code] of crews) {
  await db.query(
    `insert into public.crews (id, name, tag, color, city_id, code, recruitment_status, created_by)
     values ($1, $2, $3, 1, $4, $5, $6, $7)`,
    [id, name, tag, city, code, rec, CHIEF],
  );
}

const member = (crew, user, role, leftAt = null) =>
  db.query(
    `insert into public.crew_members (crew_id, user_id, role, joined_at, left_at)
     values ($1, $2, $3, now() - interval '30 days', $4)`,
    [crew, user, role, leftAt],
  );

await member(CREW_A, CHIEF, 'founder');
await member(CREW_A, DUO, 'runner');
await member(CREW_A, LEAVER, 'runner', new Date(Date.now() - 20 * 864e5).toISOString());
await member(CREW_LILLE, OUTSIDER, 'founder');

// NOMAD a quitté un crew il y a 2 jours → cooldown de 7 j encore actif.
await db.query(
  `insert into public.crew_members (crew_id, user_id, role, joined_at, left_at)
   values ($1, $2, 'runner', now() - interval '40 days', now() - interval '2 days')`,
  [CREW_OPEN, NOMAD],
);

// VISITOR et DUO sont amis (acceptée) → `friendsInside` doit valoir 1 sur CREW_A.
await db.query(
  `insert into public.friendships (requester_id, addressee_id, status)
   values ($1, $2, 'accepted')`,
  [VISITOR, DUO],
);

// ─── Emprise : CHIEF tient 2 hexagones dont UN en run ET en bike ────────────
// Le piège de 0070/0071 : deux lignes, un seul hexagone sur la carte.
const claim = (user, h3, activity, decay) =>
  db.query(
    `insert into public.hex_claims
       (h3index, owner_user_id, activity, city_id, claim_type, claimed_at, decay_at)
     values ($1, $2, $3, $4, 'neutral', now() - interval '1 day', $5)`,
    [h3, user, activity, PARIS, decay],
  );
await claim(CHIEF, 100n.toString(), 'run', null);
await claim(CHIEF, 100n.toString(), 'bike', null);
await claim(CHIEF, 101n.toString(), 'run', null);
// Hex EXPIRÉ de DUO : ne doit compter nulle part.
await claim(DUO, 102n.toString(), 'run', new Date(Date.now() - 864e5).toISOString());
// Hex du PARTI : le crew ne doit pas le garder.
await claim(LEAVER, 103n.toString(), 'run', null);

// Incarner un acteur : `auth.uid()` est un bouchon, on le redéfinit.
const beAll = async (uid) => {
  await db.exec(
    `create or replace function auth.uid() returns uuid language sql stable as $$ select ${
      uid === null ? 'null::uuid' : `'${uid}'::uuid`
    } $$;`,
  );
};
const rpc = async (sql, params = []) => (await db.query(sql, params)).rows[0];

// ═══ 2. L'ARBITRAGE EST INSCRIT EN BASE ═════════════════════════════════════
await t('context_crew_id existe, est NULLABLE, et pointe sur crews', async () => {
  const { rows } = await db.query(`
    select is_nullable, data_type from information_schema.columns
    where table_schema = 'public' and table_name = 'territories' and column_name = 'context_crew_id'`);
  eq(rows.length, 1, 'colonne context_crew_id');
  eq(rows[0].is_nullable, 'YES', 'nullabilité (NULL = inconnu, jamais « pas de crew »)');
  const { rows: fk } = await db.query(`
    select count(*)::int as n from information_schema.table_constraints tc
    join information_schema.constraint_column_usage ccu on ccu.constraint_name = tc.constraint_name
    where tc.table_name = 'territories' and tc.constraint_type = 'FOREIGN KEY'
      and ccu.table_name = 'crews'`);
  ok(fk[0].n >= 1, 'clé étrangère vers crews absente');
});

await t('le commentaire DIT qu’aucun écrivain n’alimente context_crew_id', async () => {
  const { rows } = await db.query(`
    select col_description('public.territories'::regclass, ordinal_position) as c
    from information_schema.columns
    where table_schema='public' and table_name='territories' and column_name='context_crew_id'`);
  const c = rows[0].c || '';
  ok(/AUCUN ÉCRIVAIN/.test(c), 'le suspens n’est pas inscrit en base');
  ok(/JAMAIS un propriétaire/.test(c), 'la voie B n’est pas nommée dans le commentaire');
});

await t('la VOIE A n’a pas été prise : hex_claims n’a AUCUN propriétaire crew', async () => {
  // Le NULL de `owner_user_id` est nullable depuis 0006:57 et veut dire NEUTRE.
  // La voie A aurait exigé une colonne de propriété crew : elle ne doit pas
  // exister. `crew_color_cache` reste ce qu'elle a toujours été — de la COULEUR.
  const { rows } = await db.query(`
    select column_name from information_schema.columns
    where table_schema='public' and table_name='hex_claims'
      and column_name in ('owner_crew_id', 'owner_type', 'crew_id')`);
  eq(rows.map((r) => r.column_name), [], 'une propriété crew est apparue dans hex_claims');
  const { rows: cache } = await db.query(`
    select data_type from information_schema.columns
    where table_schema='public' and table_name='hex_claims' and column_name='crew_color_cache'`);
  eq(cache[0].data_type, 'smallint', 'crew_color_cache a cessé d’être une couleur');
});

await t('owner_type garde « crew » — capacité dormante, et documentée comme telle', async () => {
  const { rows } = await db.query(`
    select pg_get_constraintdef(oid) as def from pg_constraint
    where conname = 'territories_owner_type_check'`);
  ok(/crew/.test(rows[0].def), 'la capacité « crew » a été retirée du CHECK');
  const { rows: c } = await db.query(`
    select col_description('public.territories'::regclass, ordinal_position) as c
    from information_schema.columns
    where table_schema='public' and table_name='territories' and column_name='owner_type'`);
  ok(/DORMANTE/.test(c[0].c || ''), 'rien ne prévient qu’aucun écrivain ne produit « crew »');
});

await t('un territoire existant accepte context_crew_id sans casser les CHECK de 0074', async () => {
  const geom = JSON.stringify({
    type: 'Polygon',
    coordinates: [[[2.34, 48.86], [2.35, 48.86], [2.35, 48.87], [2.34, 48.86]]],
  });
  await db.query(
    `insert into public.territories
       (activity, owner_type, owner_id, state, geometry, area_m2, city_id,
        defense_level, controlled_since, publish_after, algorithm_version, context_crew_id)
     values ('run', 'user', $1, 'owned_personal', $2::jsonb, 1000, $3,
        0, now(), now(), 'gryd-loop-polygon@1', $4)`,
    [CHIEF, geom, PARIS, CREW_A],
  );
  const { rows } = await db.query(
    'select context_crew_id from public.territories where owner_id = $1', [CHIEF]);
  eq(rows[0].context_crew_id, CREW_A, 'contexte non persisté');
  // Et il reste un territoire PERSONNEL : le contexte n'a pas déplacé la propriété.
  const { rows: o } = await db.query(
    'select owner_type from public.territories where owner_id = $1', [CHIEF]);
  eq(o[0].owner_type, 'user', 'le contexte a été confondu avec une propriété');
});

// ═══ 3. L'EMPRISE VIVANTE ═══════════════════════════════════════════════════
await t('l’emprise compte des hexagones DISTINCTS (run+bike sur le même = 1)', async () => {
  const r = await rpc('select * from public.crew_live_footprint(array[$1]::uuid[])', [CREW_A]);
  eq(r.hexes_held, 2, 'emprise (2 hexagones distincts : 100 et 101)');
  eq(r.hexes_run, 2, 'détail run');
  eq(r.hexes_bike, 1, 'détail bike');
  ok(r.hexes_run + r.hexes_bike > r.hexes_held, 'le joueur complet doit créer un écart, pas une somme');
});

await t('un membre PARTI et un hex EXPIRÉ ne comptent plus', async () => {
  const r = await rpc('select * from public.crew_live_footprint(array[$1]::uuid[])', [CREW_A]);
  eq(r.member_count, 2, 'effectif (le parti est exclu)');
  ok(r.hexes_held === 2, 'l’hex du parti ou l’hex expiré a été compté');
});

await t('un crew sans rien tenir sort à 0 — pas absent, pas NULL', async () => {
  const r = await rpc('select * from public.crew_live_footprint(array[$1]::uuid[])', [CREW_OPEN]);
  eq(r.hexes_held, 0, 'emprise du crew vide');
  eq(r.member_count, 0, 'effectif du crew vide');
  eq(r.last_capture, null, 'dernière capture d’un crew qui n’a jamais capturé');
});

// ═══ 4. DÉCOUVERTE ══════════════════════════════════════════════════════════
await t('sans session, la découverte refuse (elle ne renvoie pas « rien »)', async () => {
  await beAll(null);
  const r = await rpc('select public.crew_discovery() as j');
  eq(r.j.ok, false, 'ok');
  eq(r.j.reason, 'signed_out', 'motif');
});

await t('sans ville connue, elle DIT no_city au lieu de tout renvoyer', async () => {
  await db.query('update public.users set city_id = null where id = $1', [VISITOR]);
  await beAll(VISITOR);
  const r = await rpc('select public.crew_discovery() as j');
  eq(r.j.ok, false, 'ok');
  eq(r.j.reason, 'no_city', 'motif');
  await db.query('update public.users set city_id = $2 where id = $1', [VISITOR, PARIS]);
});

await t('la découverte est bornée à UNE ville (pas d’annuaire mondial)', async () => {
  await beAll(VISITOR);
  const r = await rpc('select public.crew_discovery() as j');
  eq(r.j.ok, true, 'ok');
  eq(r.j.cityId, PARIS, 'ville');
  const names = r.j.crews.map((c) => c.name).sort();
  eq(names, ['Complet', 'Le Verrou', 'Les Berges', 'Portes Ouvertes'], 'crews rendus');
  ok(!names.includes('Nord Runners'), 'un crew d’une autre ville a fuité dans la découverte');
});

await t('elle renvoie des FAITS réels : emprise, effectif, amis présents', async () => {
  await beAll(VISITOR);
  const r = await rpc('select public.crew_discovery() as j');
  const a = r.j.crews.find((c) => c.id === CREW_A);
  eq(a.hexesHeld, 2, 'emprise');
  eq(a.memberCount, 2, 'effectif');
  eq(a.friendsInside, 1, 'amis déjà présents (DUO)');
  eq(a.recruitmentStatus, 'on_request', 'recrutement');
  eq(a.myRequestPending, false, 'aucune candidature en cours au départ');
  const open = r.j.crews.find((c) => c.id === CREW_OPEN);
  eq(open.friendsInside, 0, 'amis dans un crew où je n’en ai aucun');
});

await t('elle N’EXPOSE PAS le code secret ni les colonnes jamais alimentées', async () => {
  await beAll(VISITOR);
  const r = await rpc('select public.crew_discovery() as j');
  const keys = Object.keys(r.j.crews[0]);
  for (const forbidden of ['code', 'activityScore', 'activity_status', 'league', 'xp', 'level']) {
    ok(!keys.includes(forbidden), `la découverte expose « ${forbidden} »`);
  }
  ok(!JSON.stringify(r.j).includes('AAAAA1'), 'un code de crew a fuité dans la découverte');
});

await t('aucune identité de membre ne sort de la découverte (§12)', async () => {
  await beAll(VISITOR);
  const r = await rpc('select public.crew_discovery() as j');
  const blob = JSON.stringify(r.j);
  for (const pseudo of ['chief', 'duo', 'leaver']) {
    ok(!blob.includes(`"${pseudo}"`), `le pseudo « ${pseudo} » a fuité avant adhésion`);
  }
});

await t('la recherche filtre sur nom ET tag, sans casse', async () => {
  await beAll(VISITOR);
  const byName = await rpc('select public.crew_discovery(null, $1) as j', ['berges']);
  eq(byName.j.crews.map((c) => c.name), ['Les Berges'], 'recherche par nom');
  const byTag = await rpc('select public.crew_discovery(null, $1) as j', ['opn']);
  eq(byTag.j.crews.map((c) => c.name), ['Portes Ouvertes'], 'recherche par tag');
  const none = await rpc('select public.crew_discovery(null, $1) as j', ['zzzz']);
  eq(none.j.crews, [], 'aucun résultat = liste vide, jamais une invention');
});

// ═══ 5. FICHE PUBLIQUE ══════════════════════════════════════════════════════
await t('la fiche publique donne les agrégats et le rang de ville, sans membres', async () => {
  await beAll(VISITOR);
  const r = await rpc('select public.crew_public_profile($1) as j', [CREW_A]);
  eq(r.j.ok, true, 'ok');
  eq(r.j.crew.hexesHeld, 2, 'emprise');
  eq(r.j.crew.memberCount, 2, 'effectif');
  eq(r.j.crew.cityRank, 1, 'rang (seul crew à tenir quelque chose)');
  eq(r.j.crew.crewsRanked, 1, 'nombre de crews classés');
  eq(r.j.crew.iAmMember, false, 'appartenance du visiteur');
  ok(!('members' in r.j.crew), 'la fiche publique liste des membres');
  ok(!JSON.stringify(r.j).includes('AAAAA1'), 'le code du crew a fuité sur la fiche publique');
});

await t('un crew sans emprise n’a PAS de rang (jamais « dernier » sur du vide)', async () => {
  await beAll(VISITOR);
  const r = await rpc('select public.crew_public_profile($1) as j', [CREW_OPEN]);
  eq(r.j.crew.hexesHeld, 0, 'emprise');
  eq(r.j.crew.cityRank, null, 'rang d’un crew neuf');
});

await t('un crew inexistant renvoie not_found (jamais un objet vide)', async () => {
  await beAll(VISITOR);
  const r = await rpc('select public.crew_public_profile($1) as j',
    ['99999999-9999-9999-9999-999999999999']);
  eq(r.j.ok, false, 'ok');
  eq(r.j.reason, 'not_found', 'motif');
});

// ═══ 6. REJOINDRE / CANDIDATER — LE SERVEUR TRANCHE ═════════════════════════
await t('crew « closed » : refus, même si le client demandait à rejoindre', async () => {
  await beAll(VISITOR);
  const r = await rpc('select public.crew_join_intent($1) as j', [CREW_SHUT]);
  eq(r.j.ok, false, 'ok');
  eq(r.j.reason, 'closed', 'motif');
});

await t('crew « invite_only » : refus aussi — le code reste la seule porte', async () => {
  await db.query(`update public.crews set recruitment_status='invite_only' where id=$1`, [CREW_SHUT]);
  await beAll(VISITOR);
  const r = await rpc('select public.crew_join_intent($1) as j', [CREW_SHUT]);
  eq(r.j.reason, 'closed', 'motif');
  await db.query(`update public.crews set recruitment_status='closed' where id=$1`, [CREW_SHUT]);
});

await t('cooldown de changement de crew : refusé avec le nombre de jours', async () => {
  await beAll(NOMAD);
  const r = await rpc('select public.crew_join_intent($1) as j', [CREW_OPEN]);
  eq(r.j.ok, false, 'ok');
  eq(r.j.reason, 'cooldown', 'motif');
  ok(Number(r.j.daysLeft) >= 1, 'jours restants non communiqués');
});

await t('crew PLEIN : refusé avant toute écriture', async () => {
  // 50 membres factices (game-rules: CREW_MAX_MEMBERS) sur CREW_FULL.
  for (let i = 0; i < 50; i += 1) {
    const id = `77777777-0000-0000-0000-${String(i).padStart(12, '0')}`;
    await db.query('insert into auth.users (id) values ($1)', [id]);
    await db.query(
      `insert into public.users (id, pseudo, city_id) values ($1, $2, $3)
       on conflict (id) do update set pseudo = excluded.pseudo`,
      [id, `filler${i}`, PARIS],
    );
    await member(CREW_FULL, id, 'runner');
  }
  await beAll(VISITOR);
  const r = await rpc('select public.crew_join_intent($1) as j', [CREW_FULL]);
  eq(r.j.ok, false, 'ok');
  eq(r.j.reason, 'full', 'motif');
});

await t('crew « on_request » : candidature, et elle est IDEMPOTENTE', async () => {
  await beAll(VISITOR);
  const a = await rpc('select public.crew_join_intent($1) as j', [CREW_A]);
  eq(a.j.effect, 'requested', 'effet');
  const b = await rpc('select public.crew_join_intent($1) as j', [CREW_A]);
  eq(b.j.effect, 'requested', 'effet du second tap');
  const { rows } = await db.query(
    `select count(*)::int as n from public.crew_applications
     where crew_id = $1 and user_id = $2 and status = 'pending'`, [CREW_A, VISITOR]);
  eq(rows[0].n, 1, 'nombre de candidatures en cours (un double-tap ne doit pas en créer deux)');
});

await t('la candidature en cours se voit dans la découverte ET sur la fiche', async () => {
  await beAll(VISITOR);
  const d = await rpc('select public.crew_discovery() as j');
  eq(d.j.crews.find((c) => c.id === CREW_A).myRequestPending, true, 'état en découverte');
  const p = await rpc('select public.crew_public_profile($1) as j', [CREW_A]);
  eq(p.j.crew.myRequestPending, true, 'état sur la fiche');
});

// ═══ 7. LA CANDIDATURE EST LISIBLE ET TRANCHABLE ════════════════════════════
await t('un simple membre ne voit PAS les candidatures (rôle-gaté)', async () => {
  await beAll(DUO);
  const r = await rpc('select public.crew_join_requests() as j');
  eq(r.j.ok, false, 'ok');
  eq(r.j.reason, 'forbidden', 'motif');
});

await t('un joueur sans crew ne voit aucune file (no_crew, pas une liste vide)', async () => {
  await beAll(NOMAD);
  const r = await rpc('select public.crew_join_requests() as j');
  eq(r.j.reason, 'no_crew', 'motif');
});

await t('le fondateur voit la candidature, avec le pseudo du candidat', async () => {
  await beAll(CHIEF);
  const r = await rpc('select public.crew_join_requests() as j');
  eq(r.j.ok, true, 'ok');
  eq(r.j.requests.length, 1, 'nombre de candidatures');
  eq(r.j.requests[0].pseudo, 'visitor', 'pseudo du candidat');
});

await t('un membre simple ne peut pas trancher', async () => {
  await beAll(CHIEF);
  const list = await rpc('select public.crew_join_requests() as j');
  const id = list.j.requests[0].id;
  await beAll(DUO);
  const r = await rpc('select public.crew_decide_join_request($1, true) as j', [id]);
  eq(r.j.reason, 'forbidden', 'motif');
});

await t('accepter fait entrer le candidat AU RÔLE D’ESSAI (anti-p2w §E46)', async () => {
  await beAll(CHIEF);
  const list = await rpc('select public.crew_join_requests() as j');
  const id = list.j.requests[0].id;
  const r = await rpc('select public.crew_decide_join_request($1, true) as j', [id]);
  eq(r.j.effect, 'accepted', 'effet');
  const { rows } = await db.query(
    `select role from public.crew_members where crew_id=$1 and user_id=$2 and left_at is null`,
    [CREW_A, VISITOR]);
  eq(rows[0].role, 'rookie', 'rôle d’entrée (game-rules: CREW_ENTRY_ROLE)');
});

await t('accepter n’octroie AUCUN territoire ni point — le rôle ne capture pas', async () => {
  const { rows: hx } = await db.query(
    'select count(*)::int as n from public.hex_claims where owner_user_id = $1', [VISITOR]);
  eq(hx[0].n, 0, 'des hexagones ont été offerts à l’entrant');
  const { rows: fp } = await db.query(
    'select hexes_held from public.crew_live_footprint(array[$1]::uuid[])', [CREW_A]);
  eq(fp[0].hexes_held, 2, 'l’emprise du crew a changé du seul fait d’un recrutement');
});

await t('la file est vide une fois la candidature tranchée', async () => {
  await beAll(CHIEF);
  const r = await rpc('select public.crew_join_requests() as j');
  eq(r.j.requests, [], 'file après décision');
});

await t('trancher deux fois la même candidature renvoie not_found', async () => {
  const { rows } = await db.query(
    `select id from public.crew_applications where crew_id=$1 and user_id=$2`, [CREW_A, VISITOR]);
  await beAll(CHIEF);
  const r = await rpc('select public.crew_decide_join_request($1, true) as j', [rows[0].id]);
  eq(r.j.reason, 'not_found', 'motif');
});

await t('déjà membre d’un crew : l’intention est refusée, jamais un déplacement', async () => {
  await beAll(VISITOR); // désormais membre de CREW_A
  const r = await rpc('select public.crew_join_intent($1) as j', [CREW_OPEN]);
  eq(r.j.reason, 'already_in_crew', 'motif');
  const { rows } = await db.query(
    `select crew_id from public.crew_members where user_id=$1 and left_at is null`, [VISITOR]);
  eq(rows[0].crew_id, CREW_A, 'le joueur a été déplacé de crew en silence');
});

await t('crew « open » : adhésion DIRECTE, sans candidature', async () => {
  const FRESH = '88888888-8888-8888-8888-888888888888';
  await db.query('insert into auth.users (id) values ($1)', [FRESH]);
  await db.query(
    `insert into public.users (id, pseudo, city_id) values ($1, 'fresh', $2)
     on conflict (id) do update set pseudo = excluded.pseudo`, [FRESH, PARIS]);
  await beAll(FRESH);
  const r = await rpc('select public.crew_join_intent($1) as j', [CREW_OPEN]);
  eq(r.j.effect, 'joined', 'effet');
  const { rows } = await db.query(
    `select role from public.crew_members where crew_id=$1 and user_id=$2 and left_at is null`,
    [CREW_OPEN, FRESH]);
  eq(rows[0].role, 'rookie', 'rôle d’entrée');
  const { rows: apps } = await db.query(
    `select count(*)::int as n from public.crew_applications where user_id=$1`, [FRESH]);
  eq(apps[0].n, 0, 'une candidature a été créée alors que le crew est ouvert');
});

// ═══ 8. DÉRIVE DE LA LISTE DE RÔLES ═════════════════════════════════════════
await t('la liste de rôles du SQL == CREW_PERMISSIONS.acceptApplications', async () => {
  const src = readFileSync(GAME_RULES, 'utf8');
  const m = src.match(/acceptApplications:\s*\[([^\]]*)\]/);
  ok(m, 'acceptApplications introuvable dans game-rules.ts');
  const fromRules = m[1]
    .split(',')
    .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean)
    .sort();

  const { rows } = await db.query(`
    select p.proname, pg_get_functiondef(p.oid) as def
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('crew_join_requests', 'crew_decide_join_request')`);
  eq(rows.length, 2, 'les deux fonctions rôle-gatées');
  for (const r of rows) {
    const g = r.def.match(/not in \(([^)]*)\)/);
    ok(g, `aucune garde de rôle dans ${r.proname}`);
    const fromSql = g[1]
      .split(',')
      .map((s) => s.trim().replace(/^'|'$/g, ''))
      .sort();
    eq(fromSql, fromRules, `${r.proname} a DÉRIVÉ de CREW_PERMISSIONS.acceptApplications`);
  }
});

// ═══ 9. PRIVILÈGES ══════════════════════════════════════════════════════════
await t('crew_live_footprint est FERMÉE aux rôles clients', async () => {
  const { rows } = await db.query(`
    select has_function_privilege('authenticated', p.oid, 'execute') as a,
           has_function_privilege('anon',          p.oid, 'execute') as b
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname='public' and p.proname='crew_live_footprint'`);
  eq(rows[0].a, false, 'authenticated peut énumérer l’emprise de n’importe quel crew');
  eq(rows[0].b, false, 'anon peut énumérer l’emprise de n’importe quel crew');
});

await t('les 5 RPC clientes sont ouvertes à authenticated et fermées à anon', async () => {
  const names = ['crew_discovery', 'crew_public_profile', 'crew_join_intent',
    'crew_join_requests', 'crew_decide_join_request'];
  const { rows } = await db.query(`
    select p.proname,
           has_function_privilege('authenticated', p.oid, 'execute') as a,
           has_function_privilege('anon',          p.oid, 'execute') as b
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname='public' and p.proname = any($1)`, [names]);
  eq(rows.length, names.length, 'toutes les fonctions présentes');
  for (const r of rows) {
    eq(r.a, true, `${r.proname} inaccessible à authenticated`);
    eq(r.b, false, `${r.proname} accessible à anon`);
  }
});

await t('toutes les fonctions sont SECURITY DEFINER avec search_path figé', async () => {
  const { rows } = await db.query(`
    select p.proname, p.prosecdef, p.proconfig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname='public' and p.proname like 'crew\\_%'
      and p.proname in ('crew_live_footprint','crew_discovery','crew_public_profile',
                        'crew_join_intent','crew_join_requests','crew_decide_join_request')`);
  eq(rows.length, 6, 'les six fonctions de 0083');
  for (const r of rows) {
    eq(r.prosecdef, true, `${r.proname} n’est pas SECURITY DEFINER`);
    ok(
      (r.proconfig || []).some((c) => c.startsWith('search_path=')),
      `${r.proname} n’a pas de search_path fige (vecteur d’injection de schéma)`,
    );
  }
});

// ─── Bilan ──────────────────────────────────────────────────────────────────
console.log(`\n${passed} vert(s), ${failures.length} rouge(s)`);
if (failures.length > 0) process.exit(1);
