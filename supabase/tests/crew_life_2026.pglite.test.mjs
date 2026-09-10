/**
 * GRYD — 0182 : être dans un crew change quelque chose.
 *
 * ═══ ÉTAPE 0 — LES TROIS DÉFAUTS EXISTAIENT, ET ILS SONT REJOUÉS ═══════════
 * Avant d'exécuter une ligne de 0182, ce fichier applique le VRAI SQL d'avant —
 * `crew_overview()` et `crew_activity_feed()` tels que 0152 les définit — puis
 * leur donne un crew complet : une ville, un mode d'accueil, une arrivée
 * récente, une sortie partagée, une contribution à un défi. Les trois lectures
 * répondent, et taisent tout cela :
 *   0a. le QG ne dit NI la ville NI l'accueil du crew (la fiche PUBLIQUE d'un
 *       crew, elle, les rend depuis 0152 §3 : la page de son propre crew en
 *       disait moins que celle du voisin) ;
 *   0b. le fil ne porte AUCUNE adhésion, alors que `crew_members.joined_at`
 *       existe depuis 0002 ;
 *   0c. `crew_run_impact_2026` n'existe pas : rien ne relie une sortie à un
 *       crew, donc l'écran de résultat ne peut rien dire de §13.4.
 * Sans cette étape, rien ne distinguerait 0182 d'un no-op.
 *
 * ═══ CE QUE CE TEST PROUVE ═════════════════════════════════════════════════
 *  1. 0182 s'applique sur un vrai Postgres, tel quel ;
 *  2. le QG rend `city_name` et `access`, et RIEN de plus qu'avant sur le
 *     territoire (aucune surface, aucun rang : 0126) ;
 *  3. le fil rend les arrivées RÉCENTES, tronquées à l'heure, plafonnées,
 *     bornées par la fenêtre, et JAMAIS un départ ;
 *  4. `crew_run_impact_2026` est réservée à l'auteur de la sortie, répond
 *     `crew: null` sans crew, et rend le partage / le défi tels qu'ils sont —
 *     une journée RETIRÉE ne compte plus ;
 *  5. les grants : les nouvelles fonctions internes sont fermées aux clients.
 *
 * ═══ CE QU'IL NE PROUVE PAS, dit ici plutôt que laissé croire ══════════════
 *  · L'EFFET RÉEL DE LA RLS : PGlite tourne en SUPERUTILISATEUR. On vérifie les
 *    privilèges au catalogue, pas un refus vécu par un tiers.
 *  · LA GÉOMÉTRIE : PGlite n'a pas PostGIS. 0182 n'en lit aucune — c'est
 *    délibéré (la surface d'une capture reste `capture_result_2026`).
 *  · LE SCHÉMA COMPLET : la lignée 0002→0181 n'est pas rejouée. Les tables sont
 *    posées en socle minimal, aux MÊMES colonnes que les migrations qui les
 *    créent.
 *
 * ═══ LANCER ════════════════════════════════════════════════════════════════
 *   node supabase/tests/crew_life_2026.pglite.test.mjs
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
    crew_id uuid, user_id uuid, role text not null default 'member',
    joined_at timestamptz not null default now(), left_at timestamptz);
  create table public.crew_applications (crew_id uuid, user_id uuid, status text);
  create table public.friendships (requester_id uuid, addressee_id uuid, status text);
  create table public.city_zones (city_id text primary key, name text);
  create table public.user_profiles (user_id uuid primary key, map_sharing text);

  -- Règlement 2026 (0118), SANS la colonne geometry : 0182 n'en lit aucune.
  create table public.capture_events_2026 (
    id uuid primary key, run_id uuid, owner_id uuid, activity text not null,
    closed_at timestamptz not null, publish_after timestamptz not null, status text not null);
  create table public.ownership_2026 (
    event_id uuid primary key, owner_id uuid not null, activity text not null,
    controlled_since timestamptz not null);
  create table public.runs (
    id uuid primary key, user_id uuid not null, activity text,
    created_at timestamptz not null default now());

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

  -- Social (0124) et défis (0122), aux colonnes des migrations qui les créent.
  create table public.social_posts_2026 (
    id uuid primary key default gen_random_uuid(), client_id uuid,
    author_id uuid not null, crew_id uuid not null, run_id uuid not null,
    body text not null default '', media_path text,
    consented_at timestamptz not null default now(),
    created_at timestamptz not null default now(), removed_at timestamptz);
  create table public.challenge_arenas_2026 (
    id text primary key, title text not null, activity text not null,
    time_zone text not null, sectors jsonb not null, access_source text not null,
    reviewed_at timestamptz not null, created_at timestamptz not null default now(),
    retired_at timestamptz);
  create table public.crew_challenges_2026 (
    id uuid primary key, client_id uuid, created_by uuid, arena_id text not null,
    title text not null, activity text not null, time_zone text not null,
    starts_at timestamptz not null, ends_at timestamptz not null,
    ranked_week date not null, sectors jsonb not null,
    status text not null default 'active', reason text,
    created_at timestamptz not null default now());
  create table public.challenge_contributions_2026 (
    challenge_id uuid not null, player_id uuid not null, crew_id uuid not null,
    day date not null, run_id uuid, activity_key uuid not null, event_id uuid not null,
    sector_id text not null, closed_at timestamptz not null, received_at timestamptz not null,
    validated_at timestamptz not null default clock_timestamp(),
    withdrawn boolean not null default false, used_fallback boolean not null default false);
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

// Les constantes de jeu et la ligne d'annonce de 0096, prises à la source.
await db.exec(slice('0096_crew_announcements.sql',
  'create or replace function public.crew_announcement_max_active()',
  '-- ═══ §3. La garde de VIE PRIVÉE'));
await db.exec(slice('0096_crew_announcements.sql',
  'create or replace function public.crew_announcement_row(p_id uuid)',
  '-- ═══ §5. crew_activity_feed'));

// ─── Acteurs et fixture ────────────────────────────────────────────────────
const CAP = '11111111-1111-1111-1111-111111111111'; // capitaine, tient du terrain
const NEW1 = '22222222-2222-2222-2222-222222222222'; // arrivé il y a 2 jours
const NEW2 = '33333333-3333-3333-3333-333333333333'; // arrivé il y a 1 heure
const OLD = '44444444-4444-4444-4444-444444444444'; // arrivé il y a 40 jours
const GONE = '55555555-5555-5555-5555-555555555555'; // a quitté le crew
const SOLO = '66666666-6666-6666-6666-666666666666'; // sans crew

const CREW = 'aaaaaaaa-0000-0000-0000-000000000001';
const CREW_OTHER = 'aaaaaaaa-0000-0000-0000-000000000002';
const CITY = 'rouen';
const RUN_CAP = 'bbbbbbbb-0000-0000-0000-000000000001';
const RUN_SOLO = 'bbbbbbbb-0000-0000-0000-000000000002';
const CHALLENGE = 'cccccccc-0000-0000-0000-000000000001';

await db.exec(`
  insert into public.city_zones values ('${CITY}', 'Rouen');
  insert into public.users (id, pseudo, city_id) values
    ('${CAP}','Ada','${CITY}'), ('${NEW1}','Bo','${CITY}'), ('${NEW2}','Cy','${CITY}'),
    ('${OLD}','Dee','${CITY}'), ('${GONE}','Eve','${CITY}'), ('${SOLO}','Fay','${CITY}');
  insert into public.user_profiles values
    ('${CAP}','public'), ('${NEW1}','public'), ('${NEW2}','public'),
    ('${OLD}','public'), ('${GONE}','public'), ('${SOLO}','public');
  insert into public.crews (id,name,tag,city_id,recruitment_status) values
    ('${CREW}','Les Quais','QUAI','${CITY}','on_request'),
    ('${CREW_OTHER}','Ailleurs',null,'${CITY}','open');
  insert into public.crew_members (crew_id,user_id,role,joined_at,left_at) values
    ('${CREW}','${CAP}','founder', now() - interval '90 days', null),
    ('${CREW}','${NEW1}','member', now() - interval '2 days',  null),
    ('${CREW}','${NEW2}','member', now() - interval '1 hour',  null),
    ('${CREW}','${OLD}','member',  now() - interval '40 days', null),
    ('${CREW}','${GONE}','member', now() - interval '3 days',  now() - interval '1 day');
  insert into public.runs (id,user_id,activity) values
    ('${RUN_CAP}','${CAP}','run'), ('${RUN_SOLO}','${SOLO}','run');
  insert into public.capture_events_2026 (id,run_id,owner_id,activity,closed_at,publish_after,status)
    values ('ee000000-0000-0000-0000-000000000001','${RUN_CAP}','${CAP}','run',
            now() - interval '2 hours', now() - interval '2 hours','published');
  insert into public.ownership_2026 values
    ('ee000000-0000-0000-0000-000000000001','${CAP}','run', now() - interval '2 hours');
  insert into public.challenge_arenas_2026
    (id,title,activity,time_zone,sectors,access_source,reviewed_at) values
    ('rouen-1','Rouen centre','run','Europe/Paris',
     '[{"id":"s1","title":"Quais rive droite"},{"id":"s2","title":"Ile Lacroix"},{"id":"s3","title":"Coteaux"}]'::jsonb,
     'open-data', now());
  insert into public.crew_challenges_2026
    (id,arena_id,title,activity,time_zone,starts_at,ends_at,ranked_week,sectors,status) values
    ('${CHALLENGE}','rouen-1','Quais contre Coteaux','run','Europe/Paris',
     now() - interval '1 day', now() + interval '6 days', current_date,
     '[{"id":"s1","title":"Quais rive droite"},{"id":"s2","title":"Ile Lacroix"},{"id":"s3","title":"Coteaux"}]'::jsonb,
     'active');
`);

console.log('\ncrew_life_2026 — migration 0182 sur PGlite\n');

// ════════════════════════════════════════════════════════════════════════════
// ÉTAPE 0 — LES DÉFAUTS, REJOUÉS SUR LE VRAI SQL D'AVANT (0152)
// ════════════════════════════════════════════════════════════════════════════
await db.exec(slice('0152_crew_read_model_2026.sql',
  'create or replace function public.crew_facts_2026(p_crew_ids uuid[])',
  '-- ═══ 2. DÉCOUVERTE'));
await db.exec(slice('0152_crew_read_model_2026.sql',
  'create or replace function public.crew_overview() returns jsonb',
  '-- ═══ 5. LE FIL DU CREW'));
await db.exec(slice('0152_crew_read_model_2026.sql',
  'create or replace function public.crew_conquests_2026(p_crew_id uuid) returns jsonb',
  '-- ═══ 6. LA PORTE SUR LA TABLE GELÉE'));

await as(CAP);
const beforeOverview = (await one('select public.crew_overview() as v')).v;
await t('ÉTAPE 0 — le QG (0152) ne dit NI la ville NI l’accueil du crew', () => {
  eq(beforeOverview.ok, true, 'la lecture aboutit pourtant');
  eq(Object.keys(beforeOverview.crew).sort(), ['city_id', 'color', 'id', 'name'],
    'la ligne du crew ne porte qu’un identifiant de ville, jamais son nom ni son accueil');
  eq(beforeOverview.crew.city_id, CITY, 'l’identifiant, lui, était bien là');
});

const beforeFeed = (await one('select public.crew_activity_feed() as v')).v;
await t('ÉTAPE 0 — le fil (0152) ne porte AUCUNE adhésion', () => {
  eq(beforeFeed.ok, true, 'le fil répond');
  eq(Object.prototype.hasOwnProperty.call(beforeFeed, 'joins'), false,
    'deux membres sont arrivés cette semaine, le fil n’en dit rien');
});

await t('ÉTAPE 0 — rien ne relie une sortie à un crew', async () => {
  const rows = await q(
    `select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname = 'crew_run_impact_2026'`);
  eq(rows.length, 0, 'crew_run_impact_2026 n’existe pas avant 0182');
});

// ════════════════════════════════════════════════════════════════════════════
// 0182
// ════════════════════════════════════════════════════════════════════════════
let migrationError = null;
try {
  await db.exec(readFileSync(join(MIGRATIONS, '0182_crew_life_2026.sql'), 'utf8'));
} catch (err) {
  migrationError = err;
}
await t('0182 s’applique sur un Postgres réel, telle quelle', () => {
  if (migrationError) throw new Error(migrationError.message);
});
if (migrationError) {
  console.log('\nMigration non appliquée : la suite n’a aucun sens, on s’arrête ici.');
  await db.close();
  process.exit(1);
}

await as(CAP);
const after = (await one('select public.crew_overview() as v')).v;

await t('le QG dit la ville et l’accueil — G15 et §13.1', () => {
  eq(after.ok, true, 'la lecture aboutit');
  eq(after.crew.city_name, 'Rouen', 'le nom de la ville, tel que city_zones le porte');
  eq(after.crew.access, 'on_request', 'le mode d’accueil, même vocabulaire que crew_edit');
});

await t('et RIEN de plus sur le territoire : aucune surface, aucun rang (0126)', () => {
  eq(Object.keys(after.territory).sort(),
    ['holdsBike', 'holdsRun', 'lastCaptureAt', 'membersHolding', 'ruleset'],
    'le bloc territoire est celui de 0152, inchangé');
  eq(after.territory.membersHolding, 1, 'un seul membre tient du terrain publié');
});

await t('une ville inconnue de cette base ne devient PAS un nom de repli', async () => {
  await db.query('update public.crews set city_id = $1 where id = $2', ['nulle-part', CREW]);
  const v = (await one('select public.crew_overview() as v')).v;
  eq(v.crew.city_name, null, 'on ne sait pas nommer cette ville, donc on ne la nomme pas');
  eq(v.crew.city_id, 'nulle-part', 'l’identifiant reste rendu tel quel');
  await db.query('update public.crews set city_id = $1 where id = $2', [CITY, CREW]);
});

// ─── §14.2 : « Demande d'adhésion acceptée » entre dans le fil ─────────────
const feed = (await one('select public.crew_activity_feed() as v')).v;

await t('le fil rend les arrivées récentes, de la plus récente à la plus ancienne', () => {
  eq(feed.joins.map((j) => j.pseudo), ['Cy', 'Bo'],
    'les deux arrivées de la fenêtre, dans l’ordre');
});

await t('l’heure d’arrivée est TRONQUÉE (PUBLIC_TIMESTAMP_TRUNC)', () => {
  for (const join of feed.joins) {
    const at = new Date(join.joinedAt);
    eq([at.getUTCMinutes(), at.getUTCSeconds()], [0, 0],
      `la minute exacte de l’arrivée de ${join.pseudo} n’est pas rendue`);
  }
});

await t('une adhésion HORS fenêtre (40 jours) n’est pas une nouvelle', () => {
  eq(feed.joins.some((j) => j.pseudo === 'Dee'), false,
    'CREW_ACTIVITY_WINDOW_DAYS borne le fil, comme pour les captures');
});

await t('un DÉPART n’apparaît jamais — ce serait une mise en cause, pas une nouvelle', () => {
  eq(feed.joins.some((j) => j.pseudo === 'Eve'), false,
    'la ligne de Eve est partie il y a un jour, dans la fenêtre : elle reste tue');
});

await t('le plafond de lecture est celui de game-rules (CREW_ACTIVITY_JOIN_MAX)', async () => {
  const extras = [];
  for (let i = 0; i < 8; i++) {
    const id = `77777777-0000-0000-0000-00000000000${i}`;
    extras.push(id);
    await db.query('insert into public.users (id,pseudo,city_id) values ($1,$2,$3)', [id, `X${i}`, CITY]);
    await db.query('insert into public.user_profiles values ($1,$2)', [id, 'public']);
    await db.query(
      `insert into public.crew_members (crew_id,user_id,role,joined_at) values ($1,$2,'member', now() - ($3 || ' minutes')::interval)`,
      [CREW, id, String(i + 1)]);
  }
  const max = (await one('select public.crew_activity_join_max() as v')).v;
  eq(max, 5, 'le plafond vaut ce que game-rules dit');
  const v = (await one('select public.crew_activity_feed() as v')).v;
  eq(v.joins.length, max, 'le fil s’arrête au plafond, sans jamais annoncer un COMPTE');
  for (const id of extras) {
    await db.query('delete from public.crew_members where user_id = $1', [id]);
    await db.query('delete from public.user_profiles where user_id = $1', [id]);
    await db.query('delete from public.users where id = $1', [id]);
  }
});

await t('un compte en suppression disparaît des arrivées (public_profiles, 0046)', async () => {
  await db.query('update public.users set deletion_requested_at = now() where id = $1', [NEW1]);
  const v = (await one('select public.crew_activity_feed() as v')).v;
  eq(v.joins.some((j) => j.pseudo === 'Bo'), false, 'plus de profil public, plus de ligne');
  await db.query('update public.users set deletion_requested_at = null where id = $1', [NEW1]);
});

// ─── §13.4 : ce qu'une sortie a apporté au crew ────────────────────────────
await t('sans crew, la réponse est « pas de crew » — et c’est une RÉPONSE', async () => {
  await as(SOLO);
  const v = (await one('select public.crew_run_impact_2026($1) as v', [RUN_SOLO])).v;
  eq(v.ok, true, 'la lecture aboutit');
  eq(v.crew, null, 'aucun bloc crew ne sera peint sur ce résultat');
});

await t('la sortie de quelqu’un d’autre n’est jamais lisible', async () => {
  await as(SOLO);
  const v = (await one('select public.crew_run_impact_2026($1) as v', [RUN_CAP])).v;
  eq(v.ok, false, 'refus');
  eq(v.reason, 'not_authorized', 'et il porte son nom');
});

await t('une sortie inconnue est « introuvable », jamais un objet vide', async () => {
  await as(CAP);
  const v = (await one('select public.crew_run_impact_2026($1) as v',
    ['99999999-9999-9999-9999-999999999999'])).v;
  eq([v.ok, v.reason], [false, 'not_found'], 'deux faits distincts, deux réponses distinctes');
});

await t('capture publiée = un FAIT DE STATUT, jamais une surface de crew', async () => {
  await as(CAP);
  const v = (await one('select public.crew_run_impact_2026($1) as v', [RUN_CAP])).v;
  eq(v.ok, true, 'la lecture aboutit');
  eq(v.crew.name, 'Les Quais', 'le crew actuel de l’auteur');
  eq(v.capturePublished, true, 'la capture de cette sortie est publiée');
  eq(v.sharedWithCrew, false, 'rien n’a été partagé : le partage est un geste, pas un effet');
  eq(v.challenge, null, 'aucune contribution à un défi pour l’instant');
  const keys = Object.keys(v).sort();
  eq(keys, ['capturePublished', 'challenge', 'crew', 'ok', 'sharedWithCrew'],
    'aucune clé de surface ni de rang : le titre reste individuel (0126)');
});

await t('le partage AVEC CE CREW est distingué d’un partage ailleurs', async () => {
  await db.query(
    `insert into public.social_posts_2026 (author_id,crew_id,run_id) values ($1,$2,$3)`,
    [CAP, CREW_OTHER, RUN_CAP]);
  await as(CAP);
  eq((await one('select public.crew_run_impact_2026($1) as v', [RUN_CAP])).v.sharedWithCrew, false,
    'partagée avec un AUTRE crew : ce crew-ci n’a rien vu');
  await db.query(
    `insert into public.social_posts_2026 (author_id,crew_id,run_id) values ($1,$2,$3)`,
    [CAP, CREW, RUN_CAP]);
  eq((await one('select public.crew_run_impact_2026($1) as v', [RUN_CAP])).v.sharedWithCrew, true,
    'partagée avec CE crew');
});

await t('une publication retirée n’est plus un partage', async () => {
  await db.query('update public.social_posts_2026 set removed_at = now() where crew_id = $1', [CREW]);
  await as(CAP);
  eq((await one('select public.crew_run_impact_2026($1) as v', [RUN_CAP])).v.sharedWithCrew, false,
    'retirée = plus rien à annoncer');
  await db.query('update public.social_posts_2026 set removed_at = null where crew_id = $1', [CREW]);
});

await t('la contribution à un défi porte le titre du SECTEUR publié', async () => {
  await db.query(
    `insert into public.challenge_contributions_2026
       (challenge_id,player_id,crew_id,day,run_id,activity_key,event_id,sector_id,closed_at,received_at)
     values ($1,$2,$3,current_date,$4,$4,$5,'s2', now(), now())`,
    [CHALLENGE, CAP, CREW, RUN_CAP, 'ee000000-0000-0000-0000-000000000001']);
  await as(CAP);
  const v = (await one('select public.crew_run_impact_2026($1) as v', [RUN_CAP])).v;
  eq(v.challenge.title, 'Quais contre Coteaux', 'le défi est nommé');
  eq(v.challenge.sectorTitle, 'Ile Lacroix', 'le secteur aussi, depuis les secteurs FIGÉS du défi');
});

await t('une journée RETIRÉE (0148) cesse d’être une contribution', async () => {
  await db.query('update public.challenge_contributions_2026 set withdrawn = true where run_id = $1', [RUN_CAP]);
  await as(CAP);
  eq((await one('select public.crew_run_impact_2026($1) as v', [RUN_CAP])).v.challenge, null,
    'annoncer une contribution retirée serait faux');
  await db.query('update public.challenge_contributions_2026 set withdrawn = false where run_id = $1', [RUN_CAP]);
});

await t('sans compte, aucune de ces lectures ne répond', async () => {
  await as(null);
  eq((await one('select public.crew_overview() as v')).v.reason, 'signed_out', 'QG');
  eq((await one('select public.crew_activity_feed() as v')).v.reason, 'signed_out', 'fil');
  eq((await one('select public.crew_run_impact_2026($1) as v', [RUN_CAP])).v.reason, 'signed_out', 'impact');
});

await t('les fonctions internes restent FERMÉES aux rôles clients', async () => {
  for (const sig of ['crew_joins_2026(uuid)', 'crew_activity_join_max()']) {
    for (const role of ['anon', 'authenticated']) {
      eq((await one(`select has_function_privilege($1,$2,'EXECUTE') as v`, [role, sig])).v, false,
        `${role} n’appelle pas ${sig}`);
    }
    eq((await one(`select has_function_privilege('service_role',$1,'EXECUTE') as v`, [sig])).v, true,
      `service_role garde ${sig}`);
  }
});

await t('les lectures d’écran restent ouvertes au compte connecté, jamais à anon', async () => {
  for (const sig of ['crew_overview()', 'crew_activity_feed()', 'crew_run_impact_2026(uuid)']) {
    eq((await one(`select has_function_privilege('authenticated',$1,'EXECUTE') as v`, [sig])).v, true,
      `authenticated garde ${sig}`);
    eq((await one(`select has_function_privilege('anon',$1,'EXECUTE') as v`, [sig])).v, false,
      `anon n’a pas ${sig}`);
  }
});

console.log(`\n${passed} vérifications passées, ${failures.length} échec(s).`);
console.log('RLS non prouvée (PGlite = superutilisateur) · géométrie non lue (aucun PostGIS).\n');
await db.close();
process.exit(failures.length === 0 ? 0 : 1);
