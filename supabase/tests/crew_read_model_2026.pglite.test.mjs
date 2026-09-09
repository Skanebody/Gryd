/**
 * GRYD — 0152 : le crew cesse de lire une table gelée.
 *
 * ═══ ÉTAPE 0 — LE DÉFAUT EXISTAIT, ET IL EST REJOUÉ ICI ════════════════════
 * Avant d'exécuter une ligne de 0152, ce fichier applique les VRAIES fonctions
 * d'avant — `crew_overview()` telle que 0108 la définit, et le couple
 * `crew_live_footprint` / `crew_discovery` EXTRAIT du fichier 0083 — puis leur
 * donne une possession 2026 (`ownership_2026` + `capture_events_2026` publié).
 * Les deux répondent « 0 zone » et « aucune capture ». Sans cette étape, rien
 * ne distinguerait 0152 d'un no-op : on ne saurait pas si le fil était vide
 * parce que la fixture est vide ou parce que la lecture est morte.
 *
 * ═══ CE QUE CE TEST PROUVE ═════════════════════════════════════════════════
 *  0. le défaut : une possession 2026 est INVISIBLE de `crew_overview` et de
 *     `crew_discovery` d'avant 0152 ; une capture 2026 publiée est INVISIBLE
 *     de `crew_activity_feed` d'avant 0152 ;
 *  1. 0152 s'applique sur un vrai Postgres, telle quelle ;
 *  2. la même possession devient un fait : `membersHolding`, `holdsRun`,
 *     `lastCaptureAt` — et JAMAIS une surface ni un rang de crew (0126 :
 *     le titre territorial est individuel) ;
 *  3. l'audience de la carte est opposable : `map_sharing='none'`, compte en
 *     suppression, événement non publié et membre parti ne comptent pas ;
 *  4. Course et Vélo ne se mélangent pas : deux booléens, jamais une somme ;
 *  5. §13.1 — la découverte rend les SORTIES À VENIR (nombre + date), sans
 *     lieu de rendez-vous, et une sortie annulée ou passée n'y figure pas ;
 *  6. plus aucune clé `hexesHeld` / `cityRank` / `contributionPct` ne sort de
 *     ces trois RPC : un écran ne PEUT plus peindre le chiffre gelé ;
 *  7. le fil du crew rend les captures 2026 publiées, avec l'heure TRONQUÉE,
 *     et jamais l'auteur d'un autre crew ;
 *  8. `crew_facts_2026` et `crew_conquests_2026` sont FERMÉES aux rôles
 *     clients, et `crew_live_footprint` n'existe plus.
 *
 * ═══ CE QU'IL NE PROUVE PAS, dit ici plutôt que laissé croire ══════════════
 *  · L'EFFET RÉEL DE LA RLS : PGlite tourne en SUPERUTILISATEUR. On vérifie les
 *    privilèges au catalogue, pas un refus vécu par un tiers.
 *  · LA GÉOMÉTRIE : PGlite n'a pas PostGIS. 0152 n'en lit aucune — c'est
 *    précisément pourquoi il est rejouable ici. `get_ownership_2026` et ses
 *    surfaces restent l'affaire du harnais PostGIS, non exécuté sur ce poste.
 *  · LE SCHÉMA COMPLET : la lignée 0002→0151 n'est pas rejouée (0118 crée des
 *    colonnes `extensions.geometry`, impossibles ici). Les tables sont posées
 *    en socle minimal, aux MÊMES colonnes que les migrations qui les créent.
 *
 * ═══ LANCER ════════════════════════════════════════════════════════════════
 *   node supabase/tests/crew_read_model_2026.pglite.test.mjs
 * Sans PGlite : sortie CODE 2 — un test non exécuté n'est JAMAIS vert.
 */
import { readFileSync } from 'node:fs';
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
      `ne le comptez pas comme vert (sortie 2, jamais 0).\n  cause : ${err.message}`,
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
const q = async (sql, args = []) => (await db.query(sql, args)).rows;
const one = async (sql, args = []) => (await q(sql, args))[0];
/** Incarne un compte : `auth.uid()` est un bouchon, pas une session Supabase. */
const as = async (uid) => {
  await db.exec(
    `create or replace function auth.uid() returns uuid language sql stable as $$ select ${
      uid ? `'${uid}'::uuid` : 'null::uuid'
    } $$;`,
  );
};

// ─── Socle minimal, aux colonnes des migrations qui créent ces tables ───────
await db.exec(`
  set time zone 'UTC';
  create role anon; create role authenticated; create role service_role;
  create schema auth;
  create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;

  create table public.users (
    id uuid primary key, pseudo text, city_id text, deletion_requested_at timestamptz);
  create view public.public_profiles as
    select u.id, u.pseudo from public.users u where u.deletion_requested_at is null;
  create table public.crews (
    id uuid primary key, name text not null, tag text, color integer not null default 0,
    city_id text, recruitment_status text not null default 'open',
    created_at timestamptz not null default now(),
    level integer not null default 1, xp bigint not null default 0);
  create table public.crew_members (
    crew_id uuid, user_id uuid, role text not null default 'member', left_at timestamptz);
  create table public.crew_applications (crew_id uuid, user_id uuid, status text);
  create table public.friendships (requester_id uuid, addressee_id uuid, status text);
  create table public.city_zones (city_id text primary key, name text);
  create table public.user_profiles (user_id uuid primary key, map_sharing text);

  -- Héritage GELÉ par 0118 (colonnes de 0002/0070).
  create table public.hex_claims (
    owner_user_id uuid, h3index bigint, activity text,
    claimed_at timestamptz not null default now(), decay_at timestamptz);

  -- Règlement 2026 (0118), SANS la colonne geometry : 0152 n'en lit aucune.
  create table public.capture_events_2026 (
    id uuid primary key, run_id uuid, owner_id uuid, activity text not null,
    closed_at timestamptz not null, publish_after timestamptz not null, status text not null);
  create table public.ownership_2026 (
    event_id uuid primary key, owner_id uuid not null, activity text not null,
    controlled_since timestamptz not null);

  -- Sorties (0019 + 0085 + 0124) et annonces (0096).
  create table public.crew_events (
    id uuid primary key default gen_random_uuid(), crew_id uuid, title text,
    starts_at timestamptz, activity text, place_label text, capacity integer,
    created_by uuid, created_at timestamptz not null default now(),
    cancelled_at_2026 timestamptz);
  create table public.crew_announcements (
    id uuid primary key default gen_random_uuid(), crew_id uuid, author_id uuid,
    body text, created_at timestamptz not null default now(), removed_at timestamptz);
  create table public.crew_feed_events (
    id uuid primary key default gen_random_uuid(), crew_id uuid, actor_id uuid,
    event_type text, payload jsonb, created_at timestamptz not null default now());
`);

/** Extrait un morceau CONTIGU d'une migration réelle (jamais une réécriture). */
function slice(file, from, to) {
  const raw = readFileSync(join(MIGRATIONS, file), 'utf8');
  const a = raw.indexOf(from);
  const b = to === null ? raw.length : raw.indexOf(to);
  if (a === -1 || (to !== null && b === -1) || (to !== null && b < a)) {
    console.error(`\nEXTRACTION IMPOSSIBLE dans ${file} — le test ne prouve rien.`);
    process.exit(1);
  }
  return raw.slice(a, b);
}

// Bornes de 0096 §2 et §4 : les constantes de jeu et la ligne d'annonce, prises
// à la source. Les stuber leur ferait perdre leur valeur.
await db.exec(slice('0096_crew_announcements.sql',
  'create or replace function public.crew_announcement_max_active()',
  '-- ═══ §3. La garde de VIE PRIVÉE'));
await db.exec(slice('0096_crew_announcements.sql',
  'create or replace function public.crew_announcement_row(p_id uuid)',
  '-- ═══ §5. crew_activity_feed'));

// ─── Acteurs et fixture ────────────────────────────────────────────────────
const RUNNER = '11111111-1111-1111-1111-111111111111'; // tient du terrain 2026
const BIKER = '22222222-2222-2222-2222-222222222222'; // tient du terrain vélo
const SILENT = '33333333-3333-3333-3333-333333333333'; // map_sharing = 'none'
const LEAVER = '44444444-4444-4444-4444-444444444444'; // a quitté le crew
const VISITOR = '55555555-5555-5555-5555-555555555555'; // découvre, sans crew
const STRANGER = '66666666-6666-6666-6666-666666666666'; // autre crew

const CREW = 'aaaaaaaa-0000-0000-0000-000000000001';
const CREW_NEW = 'aaaaaaaa-0000-0000-0000-000000000002';
const CREW_OTHER = 'aaaaaaaa-0000-0000-0000-000000000003';
const CITY = 'rouen';

await db.exec(`
  insert into public.city_zones values ('${CITY}', 'Rouen');
  insert into public.users (id, pseudo, city_id) values
    ('${RUNNER}','Ada','${CITY}'), ('${BIKER}','Bo','${CITY}'), ('${SILENT}','Cy','${CITY}'),
    ('${LEAVER}','Dee','${CITY}'), ('${VISITOR}','Eve','${CITY}'), ('${STRANGER}','Fay','${CITY}');
  insert into public.user_profiles values
    ('${RUNNER}','friends'), ('${BIKER}','public'), ('${SILENT}','none'),
    ('${LEAVER}','public'), ('${STRANGER}','public');
  insert into public.crews (id,name,tag,city_id,recruitment_status) values
    ('${CREW}','Les Quais','QUAI','${CITY}','on_request'),
    ('${CREW_NEW}','Rive Neuve',null,'${CITY}','open'),
    ('${CREW_OTHER}','Ailleurs',null,'${CITY}','open');
  insert into public.crew_members (crew_id,user_id,role,left_at) values
    ('${CREW}','${RUNNER}','founder',null),
    ('${CREW}','${BIKER}','member',null),
    ('${CREW}','${SILENT}','member',null),
    ('${CREW}','${LEAVER}','member',now() - interval '2 days'),
    ('${CREW_OTHER}','${STRANGER}','founder',null);
`);

/** Une possession 2026 : l'événement publié + la ligne de propriété dérivée. */
async function own(id, owner, activity, closedAt, status = 'published') {
  await db.query(
    `insert into public.capture_events_2026 (id,owner_id,activity,closed_at,publish_after,status)
       values ($1,$2,$3,$4::timestamptz,$4::timestamptz,$5)`,
    [id, owner, activity, closedAt, status],
  );
  if (status === 'published') {
    await db.query(
      `insert into public.ownership_2026 values ($1,$2,$3,$4::timestamptz)`,
      [id, owner, activity, closedAt],
    );
  }
}

const T_RUN = '2026-09-08T07:00:00Z';
const T_BIKE = '2026-09-09T18:30:00Z';
await own('ee000000-0000-0000-0000-000000000001', RUNNER, 'run', T_RUN);
await own('ee000000-0000-0000-0000-000000000002', BIKER, 'bike', T_BIKE);
// Consentement carte retiré : ce terrain n'existe pour personne d'autre.
await own('ee000000-0000-0000-0000-000000000003', SILENT, 'run', T_BIKE);
// Membre PARTI : son terrain n'est plus celui du crew.
await own('ee000000-0000-0000-0000-000000000004', LEAVER, 'run', T_BIKE);
// Capture 2026 NON publiée : elle n'existe pour aucun lecteur.
await own('ee000000-0000-0000-0000-000000000005', RUNNER, 'run', T_BIKE, 'scheduled');

console.log('\ncrew_read_model_2026 — migration 0152 sur PGlite\n');

// ════════════════════════════════════════════════════════════════════════════
// ÉTAPE 0 — LE DÉFAUT, REJOUÉ SUR LE VRAI SQL D'AVANT
// ════════════════════════════════════════════════════════════════════════════
await db.exec(slice('0108_crew_overview_progress.sql',
  'create or replace function public.crew_overview()', null));
await db.exec(slice('0083_crew_discovery_and_ownership.sql',
  'create or replace function public.crew_live_footprint(',
  'create or replace function public.crew_public_profile(p_crew_id uuid)'));

await as(RUNNER);
const before = (await one('select public.crew_overview() as v')).v;
await t('ÉTAPE 0 — une possession 2026 est INVISIBLE de crew_overview (0108)', () => {
  eq(before.ok, true, 'la lecture aboutit pourtant');
  eq(before.territory.hexesHeld, 0, 'hexesHeld reste à zéro alors que le crew tient du terrain');
  eq(before.territory.lastCaptureAt, null, 'aucune date de capture n’en sort');
});

await as(VISITOR);
const beforeDiscovery = (await one('select public.crew_discovery() as v')).v;
await t('ÉTAPE 0 — la découverte (0083) annonce « aucune zone » pour un crew actif', () => {
  eq(beforeDiscovery.ok, true, 'la découverte répond');
  const crew = beforeDiscovery.crews.find((c) => c.id === CREW);
  ok(crew, 'le crew est bien listé');
  eq(crew.hexesHeld, 0, 'hexesHeld gelé à zéro');
  eq(crew.lastCaptureAt, null, 'lastCaptureAt gelé à null — le tri « activité récente » ne trie rien');
});

// Fil du crew d'avant : aucun fait 2026 n'y entre.
await db.exec(slice('0099_crew_activity_feed_no_rival_actor.sql',
  'create or replace function public.crew_activity_feed()',
  'comment on function public.crew_activity_feed()'));
await as(RUNNER);
const beforeFeed = (await one('select public.crew_activity_feed() as v')).v;
await t('ÉTAPE 0 — la section « conquête » du fil (0099) est vide malgré deux captures 2026', () => {
  eq(beforeFeed.ok, true, 'le fil répond');
  eq(beforeFeed.conquests, [], 'crew_feed_events ne reçoit plus rien depuis 0118');
});

// ════════════════════════════════════════════════════════════════════════════
// 0152
// ════════════════════════════════════════════════════════════════════════════
let migrationError = null;
try {
  await db.exec(readFileSync(join(MIGRATIONS, '0152_crew_read_model_2026.sql'), 'utf8'));
} catch (err) {
  migrationError = err;
}
await t('0152 s’applique sur un Postgres réel, telle quelle', () => {
  if (migrationError) throw new Error(migrationError.message);
});
if (migrationError) {
  console.log('\nMigration non appliquée : la suite n’a aucun sens, on s’arrête ici.');
  process.exit(1);
}

await as(RUNNER);
const after = (await one('select public.crew_overview() as v')).v;

await t('la possession 2026 devient un fait de crew — en MEMBRES, jamais en zones', () => {
  eq(after.ok, true, 'la lecture aboutit');
  eq(after.territory.ruleset, '2026.1', 'le règlement est nommé');
  eq(after.territory.membersHolding, 2, 'deux membres tiennent du terrain publié et partagé');
  eq(after.territory.holdsRun, true, 'la course est pratiquée');
  eq(after.territory.holdsBike, true, 'le vélo aussi');
  ok(after.territory.lastCaptureAt !== null, 'la dernière capture a une date');
  eq(new Date(after.territory.lastCaptureAt).toISOString(), new Date(T_BIKE).toISOString(),
    'c’est la plus récente des possessions VISIBLES');
});

await t('aucune surface, aucun rang, aucune part : le titre reste individuel (0126)', () => {
  const keys = Object.keys(after.territory).sort();
  eq(keys, ['holdsBike', 'holdsRun', 'lastCaptureAt', 'membersHolding', 'ruleset'],
    'le bloc territoire ne porte que des faits vivants');
  const member = after.members.find((m) => m.userId === RUNNER);
  eq(Object.keys(member).sort(), ['holdsTerritory', 'pseudo', 'role', 'userId'],
    'plus de contributionPct ni de hexesHeld sur une ligne de membre');
  eq(member.holdsTerritory, true, 'le fait « il tient du terrain » reste, lui, vrai');
});

await t('map_sharing=\'none\' et membre parti ne comptent pas — même audience que la carte', () => {
  const silent = after.members.find((m) => m.userId === SILENT);
  eq(silent.holdsTerritory, false, 'un membre qui a coupé le partage ne tient rien pour les autres');
  eq(after.members.some((m) => m.userId === LEAVER), false, 'un membre parti n’est plus au roster');
  eq(after.memberCount, 3, 'trois membres actifs');
});

await t('un compte en suppression disparaît immédiatement des faits (0046)', async () => {
  await db.query('update public.users set deletion_requested_at = now() where id = $1', [BIKER]);
  const v = (await one('select public.crew_overview() as v')).v;
  eq(v.territory.membersHolding, 1, 'il ne compte plus dans les membres qui tiennent');
  eq(v.territory.holdsBike, false, 'et sa discipline disparaît avec lui');
  await db.query('update public.users set deletion_requested_at = null where id = $1', [BIKER]);
});

await t('une capture NON publiée n’entre dans aucun fait', async () => {
  const held = await q(`select count(*)::int as n from public.ownership_2026`);
  eq(held[0].n, 4, 'la fixture compte bien quatre possessions dérivées');
  const v = (await one('select public.crew_overview() as v')).v;
  eq(v.territory.membersHolding, 2, 'la capture « scheduled » n’ajoute personne');
});

// ─── §13.1 : accueil, horaires, sorties AVANT le classement ────────────────
await db.query(
  `insert into public.crew_events (crew_id,title,starts_at,activity,place_label,created_by) values
     ($1,'Sortie des quais', now() + interval '2 days','run','Devant le kiosque',$2),
     ($1,'Sortie longue',    now() + interval '9 days','run','Pont Flaubert',$2),
     ($1,'Annulée',          now() + interval '3 days','run','Ailleurs',$2),
     ($1,'Passée',           now() - interval '1 day', 'run','Ailleurs',$2),
     ($3,'Découverte',       now() + interval '1 day', 'bike','Rive',$4)`,
  [CREW, RUNNER, CREW_NEW, VISITOR],
);
await db.query(
  `update public.crew_events set cancelled_at_2026 = now() where title = 'Annulée'`);

await as(VISITOR);
const page = (await one('select public.crew_discovery() as v')).v;
const row = page.crews.find((c) => c.id === CREW);
const rowNew = page.crews.find((c) => c.id === CREW_NEW);

await t('§13.1 — la découverte rend les SORTIES À VENIR, nombre et date', () => {
  eq(row.upcomingOutings, 2, 'l’annulée et la passée ne comptent pas');
  ok(row.nextOutingAt !== null, 'la prochaine a une date');
  ok(new Date(row.nextOutingAt).getTime() > Date.now(), 'et elle est bien à venir');
  eq(rowNew.upcomingOutings, 1, 'un crew neuf peut avoir un rendez-vous sans tenir un mètre carré');
});

await t('§13.1 — la découverte ne rend AUCUN lieu de rendez-vous', () => {
  const serialized = JSON.stringify(page);
  ok(!serialized.includes('kiosque'), 'le point de rendez-vous reste une information de membre');
  ok(!serialized.includes('Flaubert'), 'idem pour la sortie suivante');
  ok(!serialized.includes('Sortie des quais'), 'ni le titre, qui peut nommer un lieu');
});

await t('la découverte rend l’activité 2026 et plus aucun compte gelé', () => {
  eq(row.membersHolding, 2, 'deux membres tiennent du terrain visible');
  eq(row.holdsRun, true, 'course');
  eq(row.holdsBike, true, 'vélo');
  ok(row.lastCaptureAt !== null, 'le tri « activité récente » a de nouveau une valeur');
  for (const key of ['hexesHeld', 'hexesRun', 'hexesBike', 'cityRank', 'crewsRanked']) {
    ok(!(key in row), `la clé gelée ${key} ne sort plus`);
  }
  eq(rowNew.membersHolding, 0, 'un crew qui ne tient rien le dit — 0 est ici une mesure, pas un repli');
  eq(rowNew.lastCaptureAt, null, 'et il n’a aucune date de capture');
});

await t('la découverte garde l’accueil : recrutement, effectif, amis, candidature', () => {
  eq(row.recruitmentStatus, 'on_request', 'le mode d’accueil est rendu');
  eq(row.memberCount, 3, 'l’effectif actif est rendu');
  eq(typeof row.friendsInside, 'number', 'les amis dedans restent un ENTIER, jamais des noms');
  eq(row.myRequestPending, false, 'aucune candidature en cours');
  ok(!('code' in row), 'le code d’invitation reste secret (0036)');
});

const profile = (await one('select public.crew_public_profile($1) as v', [CREW])).v;
await t('la fiche publique dit les mêmes faits, et ne classe plus un crew sur du vide', () => {
  eq(profile.ok, true, 'la fiche répond');
  eq(profile.crew.membersHolding, 2, 'même mesure que la découverte');
  eq(profile.crew.upcomingOutings, 2, 'mêmes sorties');
  for (const key of ['cityRank', 'crewsRanked', 'hexesHeld', 'hexesRun', 'hexesBike']) {
    ok(!(key in profile.crew), `la clé ${key} ne sort plus de la fiche`);
  }
  ok(!('members' in profile.crew), 'aucune identité de membre avant d’entrer (§12)');
});

// ─── Le fil du crew ────────────────────────────────────────────────────────
await as(RUNNER);
const feed = (await one('select public.crew_activity_feed() as v')).v;
await t('le fil rend les captures 2026 publiées des membres, heure TRONQUÉE', () => {
  eq(feed.ok, true, 'le fil répond');
  eq(feed.conquests.length, 2, 'deux captures visibles : la course et le vélo');
  const first = feed.conquests[0];
  eq(first.kind, 'capture_2026', 'le fait porte son règlement');
  eq(first.activity, 'bike', 'la plus récente d’abord');
  eq(first.actorPseudo, 'Bo', 'l’auteur est un membre de CE crew');
  eq(new Date(first.createdAt).toISOString(), '2026-09-09T18:00:00.000Z',
    'l’heure est tronquée : jamais la minute exacte d’une sortie');
});

await t('le fil ne nomme jamais quelqu’un d’un autre crew, et ignore le non publié', async () => {
  await own('ee000000-0000-0000-0000-000000000006', STRANGER, 'run', T_BIKE);
  const v = (await one('select public.crew_activity_feed() as v')).v;
  eq(v.conquests.length, 2, 'la capture d’un autre crew n’entre pas dans ce fil');
  ok(!JSON.stringify(v).includes('Fay'), 'et son auteur n’y est pas nommé');
  ok(!JSON.stringify(v).includes('Cy'), 'le membre qui a coupé le partage n’y est pas non plus');
});

await t('une capture hors fenêtre CREW_ACTIVITY_WINDOW_DAYS sort du fil', async () => {
  await own('ee000000-0000-0000-0000-000000000007', RUNNER, 'run', '2026-01-01T06:00:00Z');
  const v = (await one('select public.crew_activity_feed() as v')).v;
  eq(v.conquests.length, 2, 'la vieille capture reste en base et sort de l’affichage');
});

// ─── Privilèges et porte fermée ────────────────────────────────────────────
await t('crew_facts_2026 et crew_conquests_2026 sont FERMÉES aux rôles clients', async () => {
  for (const sig of ['crew_facts_2026(uuid[])', 'crew_conquests_2026(uuid)']) {
    for (const role of ['anon', 'authenticated']) {
      eq(
        (await one(`select has_function_privilege($1,$2,'EXECUTE') as v`, [role, sig])).v,
        false,
        `${role} ne peut pas appeler ${sig} directement`,
      );
    }
    eq((await one(`select has_function_privilege('service_role',$1,'EXECUTE') as v`, [sig])).v, true,
      `le service peut appeler ${sig}`);
  }
});

await t('crew_live_footprint n’existe plus : la porte sur la table gelée est fermée', async () => {
  const rows = await q(
    `select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname = 'crew_live_footprint'`);
  eq(rows.length, 0, 'aucune fonction ne lit plus hex_claims pour un crew');
});

await t('les trois RPC de lecture restent appelables par un compte connecté', async () => {
  for (const sig of ['crew_discovery(text,text)', 'crew_public_profile(uuid)',
    'crew_overview()', 'crew_activity_feed()']) {
    eq((await one(`select has_function_privilege('authenticated',$1,'EXECUTE') as v`, [sig])).v, true,
      `authenticated garde ${sig}`);
    eq((await one(`select has_function_privilege('anon',$1,'EXECUTE') as v`, [sig])).v, false,
      `anon n’a pas ${sig}`);
  }
});

await t('sans compte, aucune de ces lectures ne répond', async () => {
  await as(null);
  eq((await one('select public.crew_discovery() as v')).v.reason, 'signed_out', 'découverte');
  eq((await one('select public.crew_overview() as v')).v.reason, 'signed_out', 'QG');
  eq((await one('select public.crew_activity_feed() as v')).v.reason, 'signed_out', 'fil');
  eq((await one('select public.crew_public_profile($1) as v', [CREW])).v.reason, 'signed_out', 'fiche');
});

console.log(`\n${passed} vérifications passées, ${failures.length} échec(s).`);
console.log('RLS non prouvée (PGlite = superutilisateur) · géométrie non lue (aucun PostGIS).\n');
await db.close();
process.exit(failures.length === 0 ? 0 : 1);
