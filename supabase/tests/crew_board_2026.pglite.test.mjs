/**
 * GRYD — 0189 : le tableau de suivi, l'avertissement, l'exclusion motivée.
 *
 * ═══ ÉTAPE 0 — LE DÉFAUT EXISTAIT, ET IL EST REJOUÉ ════════════════════════
 * Avant d'exécuter une ligne de 0189, ce fichier applique le VRAI SQL d'avant —
 * `crew_facts_2026` (0152) et `crew_overview()` (0182) — puis leur donne un crew
 * complet : des courses, des boucles publiées, des sorties, un défi. La seule
 * lecture de roster qui existe répond, et ne dit RIEN d'aucun membre :
 *   0a. chaque ligne porte exactement `userId`, `pseudo`, `role`,
 *       `holdsTerritory` — ni dernière sortie, ni distance, ni ancienneté, ni
 *       contribution, ni avertissement ;
 *   0b. `crew_warnings_2026`, `crew_kicks_2026` et la vue d'activité n'existent
 *       pas : rien ne peut être averti, ni motivé, ni journalisé.
 * Sans cette étape, rien ne distinguerait 0189 d'un no-op.
 *
 * ═══ CE QUE CE TEST PROUVE ═════════════════════════════════════════════════
 *  1. 0189 s'applique sur un vrai Postgres, tel quel ;
 *  2. le tableau est rôle-gaté sur CREW_PERMISSIONS.kick : un membre simple est
 *     refusé, un co_captain et un fondateur passent ;
 *  3. la vie privée MESURE PAR MESURE : `'not_shared'` — jamais `null`, jamais
 *     `0` — et le déverrouillage borné aux SEULES règles actives ;
 *  4. les lignes masquées passent en fin de tri : leur rang ne trahit rien ;
 *  5. l'avertissement manuel : bornes de rôle, un par jour, notification au seul
 *     membre visé, journal ;
 *  6. l'exclusion : motif obligatoire, note obligatoire sur `other`, bornes de
 *     0093 rejouées, avertissements résolus, `rejoinAllowedAt`, et un message
 *     qui ne nomme JAMAIS le décideur ;
 *  7. `crew_my_standing_2026` acquitte les avertissements (décision 4) ;
 *  8. le journal rend les pseudos, et `automatic` quand personne n'a décidé ;
 *  9. les privilèges : `anon` n'appelle rien.
 *
 * ═══ CE QU'IL NE PROUVE PAS ════════════════════════════════════════════════
 *  · L'EFFET RÉEL DE LA RLS : PGlite tourne en SUPERUTILISATEUR.
 *  · LA GÉOMÉTRIE : pas de PostGIS ; 0189 n'en lit aucune (les boucles sont
 *    COMPTÉES, jamais mesurées — 0126 : le titre territorial est individuel).
 *
 * ═══ LANCER ════════════════════════════════════════════════════════════════
 *   node supabase/tests/crew_board_2026.pglite.test.mjs
 * Sans PGlite : sortie CODE 2 — un test non exécuté n'est JAMAIS vert.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS = join(HERE, '..', 'migrations');
const SHARED = join(HERE, '..', '..', 'packages', 'shared', 'src');

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
  try { await fn(); passed += 1; console.log(`  ok   ${name}`); }
  catch (err) { failures.push({ name, err }); console.log(`  FAIL ${name}\n       ${err.message}`); }
};
const eq = (actual, expected, what) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${what} : attendu ${e}, obtenu ${a}`);
};
const ok = (cond, what) => { if (!cond) throw new Error(what); };

const db = new PGlite();
const q = async (sql, args = []) => (await db.query(sql, args)).rows;
const val = async (sql, args = []) => Object.values((await q(sql, args))[0])[0];
const as = async (uid) => {
  await db.exec(`create or replace function auth.uid() returns uuid language sql stable as $$ select ${
    uid ? `'${uid}'::uuid` : 'null::uuid'} $$;`);
};
function slice(file, from, to) {
  const raw = readFileSync(join(MIGRATIONS, file), 'utf8');
  const a = raw.indexOf(from);
  const b = to === null ? raw.length : raw.indexOf(to, a);
  if (a === -1 || (to !== null && b === -1)) {
    console.error(`\nEXTRACTION IMPOSSIBLE dans ${file} — le test ne prouve rien.`);
    process.exit(1);
  }
  return raw.slice(a, b);
}
const RULES = readFileSync(join(SHARED, 'game-rules.ts'), 'utf8');
/** Un catalogue fermé de game-rules.ts, lu À LA SOURCE. */
function list(name) {
  const m = new RegExp(`export const ${name} = \\[([^\\]]*)\\]`, 's').exec(RULES);
  if (m === null) {
    console.error(`\n${name} INTROUVABLE dans game-rules.ts — le test ne prouve rien.`);
    process.exit(1);
  }
  return m[1].split(',').map((x) => x.trim().replace(/^'|'$/g, '')).filter(Boolean);
}
/** Le tableau CREW_ROLE_DUTY, lu à la source : la traduction ne doit pas dériver. */
function roleDuties() {
  const m = /export const CREW_ROLE_DUTY: Readonly<Record<CrewRole, CrewRoleDuty>> = \{([^}]*)\}/s.exec(RULES);
  if (m === null) { console.error('\nCREW_ROLE_DUTY introuvable.'); process.exit(1); }
  return Object.fromEntries(m[1].split('\n').map((l) => l.trim())
    .filter((l) => l.includes(':'))
    .map((l) => l.replace(/,$/, '').split(':').map((x) => x.trim().replace(/'/g, ''))));
}

// ─── Socle minimal, aux colonnes des migrations qui créent ces tables ───────
await db.exec(`
  set time zone 'UTC';
  create role anon; create role authenticated; create role service_role;
  create schema auth; create schema extensions;
  create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;

  create table public.city_zones (city_id text primary key, name text not null);
  create table public.users (
    id uuid primary key, pseudo text, city_id text references public.city_zones(city_id),
    level integer not null default 1, deletion_requested_at timestamptz);
  create table public.user_profiles (
    user_id uuid primary key references public.users(id) on delete cascade,
    handle text unique, profile_visibility text not null default 'crew',
    map_sharing text not null default 'simplified');
  create table public.crews (
    id uuid primary key default gen_random_uuid(), name text not null, tag text,
    color smallint not null default 0, city_id text references public.city_zones(city_id),
    code char(6) unique, created_by uuid, created_at timestamptz not null default now(),
    recruitment_status text not null default 'on_request',
    tags text[] not null default '{}', level integer not null default 1, xp bigint not null default 0);
  create table public.crew_members (
    crew_id uuid not null references public.crews(id) on delete cascade,
    user_id uuid not null references public.users(id) on delete cascade,
    role text not null default 'rookie', role_since timestamptz not null default now(),
    joined_at timestamptz not null default now(), left_at timestamptz, removed_by uuid,
    primary key (crew_id, user_id, joined_at));
  create unique index crew_members_one_active_per_user
    on public.crew_members (user_id) where left_at is null;
  create table public.crew_applications (
    id uuid primary key default gen_random_uuid(),
    crew_id uuid not null references public.crews(id) on delete cascade,
    user_id uuid not null references public.users(id) on delete cascade,
    message text, role_wanted text, status text not null default 'pending',
    created_at timestamptz not null default now(),
    decided_at timestamptz, decided_by uuid references public.users(id));
  create table public.runs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    activity text not null default 'run', started_at timestamptz not null,
    distance_m integer not null default 0, duration_s integer not null default 0,
    status text not null default 'valid');
  create table public.progress_accounts_2026 (
    user_id uuid primary key references public.users(id) on delete cascade,
    initial_timezone text not null default 'Europe/Paris', version bigint not null default 0,
    ledger jsonb not null default '{"totalXp":0,"days":[],"collections":[]}'::jsonb);
  create table public.capture_events_2026 (
    id uuid primary key default gen_random_uuid(), run_id uuid, owner_id uuid,
    activity text not null, face_key text not null default '0:0',
    closed_at timestamptz not null, publish_after timestamptz, status text not null);
  create table public.ownership_2026 (
    event_id uuid primary key, owner_id uuid not null, activity text not null,
    controlled_since timestamptz not null);
  create table public.crew_events (
    id uuid primary key default gen_random_uuid(), crew_id uuid references public.crews(id) on delete cascade,
    title text, when_label text, place_label text, zone_label text, objective text,
    starts_at timestamptz, activity text, capacity integer,
    created_by uuid references public.users(id), created_at timestamptz not null default now(),
    cancelled_at_2026 timestamptz);
  create table public.crew_event_rsvps (
    event_id uuid references public.crew_events(id) on delete cascade,
    user_id uuid references public.users(id) on delete cascade,
    choice text not null, updated_at timestamptz not null default now(),
    primary key (event_id, user_id));
  create table public.crew_challenges_2026 (
    id uuid primary key, client_id uuid, created_by uuid, arena_id text,
    title text not null, activity text not null, time_zone text not null default 'Europe/Paris',
    starts_at timestamptz not null, ends_at timestamptz not null, ranked_week date,
    sectors jsonb not null default '[]'::jsonb, status text not null default 'active', reason text,
    created_at timestamptz not null default now());
  create table public.challenge_teams_2026 (
    challenge_id uuid not null references public.crew_challenges_2026(id) on delete cascade,
    crew_id uuid not null references public.crews(id) on delete restrict,
    side integer not null, accepted_at timestamptz, access_confirmed_at timestamptz, locked_at timestamptz,
    primary key (challenge_id, crew_id));
  create table public.challenge_contributions_2026 (
    challenge_id uuid not null, player_id uuid not null, crew_id uuid not null, day date not null,
    run_id uuid, activity_key uuid, event_id uuid, sector_id text, closed_at timestamptz,
    received_at timestamptz, validated_at timestamptz not null default clock_timestamp(),
    withdrawn boolean not null default false, used_fallback boolean not null default false,
    primary key (challenge_id, player_id, day));
  create table public.notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    type text not null check (type in ('steal','decay_warning','streak','digest','reward','season','system')),
    priority smallint not null check (priority between 0 and 6),
    payload jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    read_at timestamptz check (read_at is null or read_at >= created_at));
  alter table public.notifications enable row level security;
`);

// Le VRAI SQL d'avant : les faits de crew (0152) et le QG (0182).
await db.exec(slice('0152_crew_read_model_2026.sql',
  'create or replace function public.crew_facts_2026(p_crew_ids uuid[])',
  '-- ═══ 2. DÉCOUVERTE'));
await db.exec(slice('0182_crew_life_2026.sql',
  'create or replace function public.crew_overview() returns jsonb',
  '-- ═══ 2. LES ARRIVÉES'));
// Le rang d'un rôle (0093) : 0189 s'en sert pour ses bornes.
await db.exec(slice('0093_crew_member_roles.sql',
  'create or replace function public.crew_role_rank(p_role text)',
  '-- 3. `crew_set_member_role`'));

// ─── Acteurs ───────────────────────────────────────────────────────────────
const CAP = '11111111-1111-1111-1111-111111111111';   // founder
const OFF = '22222222-2222-2222-2222-222222222222';   // co_captain
const ORG = '33333333-3333-3333-3333-333333333333';   // captain (officier terrain)
const REG = '44444444-4444-4444-4444-444444444444';   // runner assidu, profil ouvert
const SHY = '55555555-5555-5555-5555-555555555555';   // runner, profil PRIVÉ
const GHO = '66666666-6666-6666-6666-666666666666';   // rookie, jamais sorti
const OUT = '77777777-7777-7777-7777-777777777777';   // hors crew
const GON = '88888888-8888-8888-8888-888888888888';   // parti de lui-même, il y a longtemps
const CREW = 'aaaaaaaa-0000-0000-0000-000000000001';
const CHAL = 'cccccccc-0000-0000-0000-000000000001';
const CITY = 'insee-76540';

await db.exec(`
  insert into public.city_zones values ('${CITY}','Rouen');
  insert into public.users (id,pseudo,city_id) values
    ('${CAP}','Ada','${CITY}'), ('${OFF}','Bo','${CITY}'), ('${ORG}','Cy','${CITY}'),
    ('${REG}','Dee','${CITY}'), ('${SHY}','Sam','${CITY}'), ('${GHO}','Gil','${CITY}'),
    ('${OUT}','Zoe','${CITY}'), ('${GON}','Noa','${CITY}');
  insert into public.user_profiles (user_id,handle,profile_visibility,map_sharing) values
    ('${CAP}','ada','crew','simplified'), ('${OFF}','bo_','crew','simplified'),
    ('${ORG}','cy_','crew','simplified'), ('${REG}','dee','public','simplified'),
    -- Sam a FERMÉ son profil : c'est la tension du lot.
    ('${SHY}','sam','private','none'),
    ('${GHO}','gil','crew','simplified'), ('${OUT}','zoe','crew','simplified'),
    ('${GON}','noa','crew','simplified');
  insert into public.crews (id,name,city_id,code) values ('${CREW}','Les Quais','${CITY}','AAAAAA');
  insert into public.crew_members (crew_id,user_id,role,joined_at,left_at) values
    ('${CREW}','${CAP}','founder',    now() - interval '300 days', null),
    ('${CREW}','${OFF}','co_captain', now() - interval '200 days', null),
    ('${CREW}','${ORG}','captain',    now() - interval '150 days', null),
    ('${CREW}','${REG}','runner',     now() - interval '100 days', null),
    ('${CREW}','${SHY}','runner',     now() - interval '80 days',  null),
    ('${CREW}','${GHO}','rookie',     now() - interval '60 days',  null),
    -- Un départ VOLONTAIRE (removed_by null) : le journal doit le porter,
    -- et il ne doit JAMAIS être confondu avec une exclusion.
    ('${CREW}','${GON}','runner',     now() - interval '250 days', now() - interval '240 days');

  -- Des courses RÉELLES : Dee court beaucoup, Sam court un peu, Gil jamais.
  insert into public.runs (user_id, activity, started_at, distance_m, status) values
    ('${REG}','run', now() - interval '1 days',  10000, 'valid'),
    ('${REG}','run', now() - interval '4 days',  12000, 'valid'),
    ('${REG}','run', now() - interval '20 days', 15000, 'valid'),
    ('${SHY}','run', now() - interval '19 days',  5000, 'valid'),
    ('${CAP}','run', now() - interval '2 days',   8000, 'valid'),
    ('${OFF}','run', now() - interval '9 days',   7000, 'valid'),
    ('${ORG}','run', now() - interval '3 days',   6000, 'valid');
  insert into public.capture_events_2026 (owner_id, activity, closed_at, status) values
    ('${REG}','run', now() - interval '1 days', 'published'),
    ('${REG}','run', now() - interval '4 days', 'published'),
    ('${SHY}','run', now() - interval '19 days','published');

  -- Une sortie de crew proposée par l'organisateur, honorée par Dee : c'est
  -- l'entraide de §2.6 — VENIR et ORGANISER, jamais un transfert.
  insert into public.crew_events (id, crew_id, title, starts_at, created_by, created_at) values
    ('dddddddd-0000-0000-0000-000000000001','${CREW}','Sortie des quais',
     now() - interval '5 days', '${ORG}', now() - interval '10 days');
  insert into public.crew_event_rsvps (event_id, user_id, choice) values
    ('dddddddd-0000-0000-0000-000000000001','${REG}','coming'),
    ('dddddddd-0000-0000-0000-000000000001','${SHY}','coming');

  -- Un défi EN COURS et deux journées contribuées par Dee.
  insert into public.crew_challenges_2026 (id,title,activity,starts_at,ends_at,status) values
    ('${CHAL}','Défi des quais','run', now() - interval '3 days', now() + interval '4 days','active');
  insert into public.challenge_teams_2026 (challenge_id, crew_id, side) values ('${CHAL}','${CREW}',0);
  insert into public.challenge_contributions_2026
    (challenge_id, player_id, crew_id, day, withdrawn) values
    ('${CHAL}','${REG}','${CREW}', (now() - interval '2 days')::date, false),
    ('${CHAL}','${REG}','${CREW}', (now() - interval '1 days')::date, false),
    -- Une journée RETIRÉE ne compte plus (0148).
    ('${CHAL}','${SHY}','${CREW}', (now() - interval '2 days')::date, true);
`);

console.log('crew_board_2026 — migration 0189 sur PGlite\n');

// ══════════════════════════════════════════════════════════════════════════
// ÉTAPE 0 — LE DÉFAUT EXISTAIT
// ══════════════════════════════════════════════════════════════════════════
await t('étape 0 — le capitaine ne voit AUCUNE activité par membre', async () => {
  await as(CAP);
  const qg = await val('select public.crew_overview()');
  eq(qg.ok, true, 'le QG répond');
  eq(qg.members.length, 6, 'six membres actifs, le parti n’en est plus');
  // Le roster d'avant 0189, clé par clé : rien qui mesure une personne.
  eq(Object.keys(qg.members[0]).sort(), ['holdsTerritory', 'pseudo', 'role', 'userId'],
    'aucune mesure par membre, aucune ancienneté, aucun avertissement');
});

await t('étape 0 — rien ne peut être averti, motivé ni journalisé', async () => {
  for (const rel of ['crew_warnings_2026', 'crew_kicks_2026', 'crew_member_activity_2026']) {
    eq(await val(`select to_regclass('public.${rel}') is null`), true, `${rel} absente`);
  }
  for (const fn of ['crew_member_board_2026(text,text)', 'crew_my_standing_2026()',
    'crew_warn_member_2026(uuid,text)', 'crew_remove_member_2026(uuid,text,text)',
    'crew_decisions_log_2026(integer)']) {
    eq(await val(`select to_regprocedure('public.${fn}') is null`), true, `${fn} absente`);
  }
});

// ══════════════════════════════════════════════════════════════════════════
// 0188 PUIS 0189 S'APPLIQUENT
// ══════════════════════════════════════════════════════════════════════════
await db.exec(readFileSync(join(MIGRATIONS, '0188_crew_rules_2026.sql'), 'utf8'));
await db.exec(readFileSync(join(MIGRATIONS, '0189_crew_board_2026.sql'), 'utf8'));
console.log('\n  — 0188 puis 0189 appliquées —\n');

const board = async (sort = null, filter = null) =>
  val('select public.crew_member_board_2026($1,$2)',
    [sort ?? 'last_run', filter]);
const rowFor = (b, uid) => b.rows.find((r) => r.userId === uid);

// ══════════════════════════════════════════════════════════════════════════
// 1. DROITS ET CATALOGUES
// ══════════════════════════════════════════════════════════════════════════
await t('le tableau est rôle-gaté sur CREW_PERMISSIONS.kick : le membre simple est REFUSÉ', async () => {
  await as(null);
  eq((await board()).reason, 'signed_out', 'sans session');
  await as(OUT);
  eq((await board()).reason, 'no_crew', 'sans crew');
  await as(REG);
  eq((await board()).reason, 'forbidden', 'un runner n’audite personne');
  await as(ORG);
  eq((await board()).reason, 'forbidden', 'un captain non plus : kick = co_captain + founder');
  await as(OFF);
  eq((await board()).ok, true, 'le co_captain passe');
  await as(CAP);
  eq((await board()).ok, true, 'le fondateur passe');
});

await t('les tris et les filtres sont des catalogues FERMÉS, ceux de game-rules.ts', async () => {
  await as(CAP);
  eq((await board('surface')).reason, 'bad_sort', 'un tri inconnu est refusé');
  eq((await board('last_run', 'les_lents')).reason, 'bad_filter', 'un filtre inconnu est refusé');
  for (const sort of list('CREW_BOARD_SORTS')) {
    eq((await board(sort)).ok, true, `tri ${sort} accepté`);
  }
  for (const filter of list('CREW_BOARD_FILTERS')) {
    eq((await board('last_run', filter)).ok, true, `filtre ${filter} accepté`);
  }
});

await t('le devoir affiché est celui de CREW_ROLE_DUTY, lu à la source', async () => {
  const duties = roleDuties();
  await as(CAP);
  const b = await board();
  for (const row of b.rows) {
    eq(row.duty, duties[row.role], `devoir de ${row.role}`);
  }
});

// ══════════════════════════════════════════════════════════════════════════
// 2. LA VIE PRIVÉE, MESURE PAR MESURE
// ══════════════════════════════════════════════════════════════════════════
await t('sans aucune règle active, un profil FERMÉ ne rend AUCUNE mesure — et jamais un zéro', async () => {
  await as(CAP);
  const b = await board();
  eq(b.rulesActive, {}, 'aucune règle armée');
  const sam = rowFor(b, SHY);
  const NOT = 'not_shared';
  for (const key of ['lastRunAt', 'runs7d', 'challengeDays', 'distance7dKm', 'distance28dKm',
    'runs28d', 'loops28d', 'outingsJoined28d', 'outingsCreated28d']) {
    eq(sam[key], NOT, `${key} masqué`);
    ok(sam[key] !== 0 && sam[key] !== null, `${key} n’est ni 0 ni null (L8)`);
  }
  // Le profil OUVERT, lui, rend tout — et les chiffres sont RÉELS.
  const dee = rowFor(b, REG);
  eq(dee.distance28dKm, 37, 'Dee : 10 + 12 + 15 km sur 28 jours');
  eq(dee.runs28d, 3, 'trois sorties');
  eq(dee.loops28d, 2, 'deux boucles publiées');
  eq(dee.challengeDays, 2, 'deux journées contribuées, la retirée exclue');
  eq(dee.outingsJoined28d, 1, 'une sortie de crew honorée');
  eq(rowFor(b, ORG).outingsCreated28d, 1, 'une sortie proposée, avec au moins un inscrit');
  eq(rowFor(b, GHO).lastRunAt, null, 'Gil n’a jamais couru : null, et son profil est ouvert au crew');
});

await t('une règle ACTIVE déverrouille SA mesure, et elle seule (décision 2)', async () => {
  await as(CAP);
  await val('select public.crew_rules_set_2026($1,$2,$3)',
    ['Une sortie par semaine, et on se voit le mardi.', {}, { max_inactivity_days: 14 }]);
  const b = await board();
  eq(b.rulesActive, { max_inactivity_days: 14 }, 'une règle armée');
  const sam = rowFor(b, SHY);
  ok(sam.lastRunAt !== 'not_shared', 'la dernière sortie est rendue : une règle active la lit');
  eq(sam.runs7d, 'not_shared', 'les sorties de la semaine restent masquées : aucune règle ne les lit');
  eq(sam.distance28dKm, 'not_shared', 'AUCUNE règle ne lit la distance — elle reste masquée');
  eq(sam.challengeDays, 'not_shared', 'la contribution au défi reste masquée');

  await val('select public.crew_rules_set_2026($1,$2,$3)',
    ['Une sortie par semaine, et on se voit le mardi.', {},
     { max_inactivity_days: 14, min_weekly_outings: 1, min_challenge_days: 2 }]);
  const b2 = await board();
  const sam2 = rowFor(b2, SHY);
  ok(sam2.runs7d !== 'not_shared', 'la règle hebdomadaire déverrouille les sorties de la semaine');
  ok(sam2.challengeDays !== 'not_shared', 'la règle de défi déverrouille les journées de défi');
  eq(sam2.distance28dKm, 'not_shared', 'la distance n’est déverrouillée par AUCUNE règle');
});

await t('les lignes masquées passent en FIN de tri : leur rang ne trahit pas la mesure', async () => {
  await as(CAP);
  // On repasse à zéro règle : Sam redevient entièrement masqué.
  await val('select public.crew_rules_set_2026($1,$2,$3)',
    ['Une sortie par semaine, et on se voit le mardi.', {}, {}]);
  const b = await board('distance_28d');
  const ids = b.rows.map((r) => r.userId);
  eq(ids[ids.length - 1], SHY, 'la seule ligne masquée est la dernière, quel que soit son chiffre');
  eq(b.rows[0].userId, REG, 'et le tri reste vrai pour les lignes visibles');
});

await t('le filtre « jamais sorti » n’inclut pas une ligne masquée', async () => {
  await as(CAP);
  const b = await board('last_run', 'never_ran');
  eq(b.rows.map((r) => r.userId), [GHO], 'seul Gil, dont le profil est ouvert au crew');
  const off = await board('last_run', 'officers');
  eq(b.rows.length > 0 && off.rows.map((r) => r.userId).sort(), [CAP, OFF, ORG].sort(),
    'les officiers sont captain, co_captain et founder');
});

// ══════════════════════════════════════════════════════════════════════════
// 3. AVERTIR
// ══════════════════════════════════════════════════════════════════════════
await t('avertir : bornes de rôle rejouées, une fois par jour, et rien de plus', async () => {
  await as(REG);
  eq((await val('select public.crew_warn_member_2026($1,$2)', [GHO, null])).reason, 'forbidden',
    'un runner n’avertit personne');
  await as(OFF);
  eq((await val('select public.crew_warn_member_2026($1,$2)', [OFF, null])).reason, 'self',
    'jamais sur soi');
  eq((await val('select public.crew_warn_member_2026($1,$2)', [CAP, null])).reason, 'cannot_target_lead',
    'jamais le fondateur');
  eq((await val('select public.crew_warn_member_2026($1,$2)', [ORG, null])).reason, 'out_of_scope',
    'CO_CAPTAIN_KICKABLE_ROLES : un captain est hors périmètre');
  eq((await val('select public.crew_warn_member_2026($1,$2)', [OUT, null])).reason, 'not_member',
    'quelqu’un d’un autre crew n’existe pas ici');
  eq((await val('select public.crew_warn_member_2026($1,$2)', [GHO, 'x'.repeat(201)])).reason, 'bad_note',
    'note trop longue');

  const first = await val('select public.crew_warn_member_2026($1,$2)', [GHO, 'On ne te voit plus.']);
  eq(first.ok, true, 'avertissement posé');
  eq(first.effect, 'warned', 'warned');
  const again = await val('select public.crew_warn_member_2026($1,$2)', [GHO, 'encore']);
  eq(again.effect, 'unchanged', 'un seul avertissement manuel par jour');
  eq(again.warningId, first.warningId, 'le même');
  eq(await val(`select count(*)::int from public.crew_warnings_2026
    where user_id = $1 and kind = 'manual'`, [GHO]), 1, 'une seule ligne');
});

await t('l’avertissement notifie le SEUL membre visé, en TRANSACTIONNEL (décision 4)', async () => {
  const rows = await q(`select user_id, priority, payload->>'transactional' as tr
    from public.notifications where payload->>'event' = 'warning_issued'`);
  eq(rows.length, 1, 'un destinataire');
  eq(rows[0].user_id, GHO, 'le membre visé, et personne d’autre — jamais le fil (§2.10 ②)');
  eq(rows[0].tr, 'true', 'transactionnel : il sort du budget de §14.1');
  eq(rows[0].priority, 2, 'priorité P2');
});

await t('`crew_my_standing_2026` rend MES mesures sans masquage, et ACQUITTE l’avertissement', async () => {
  eq(await val(`select acknowledged_at is null from public.crew_warnings_2026
    where user_id = $1 and kind = 'manual'`, [GHO]), true, 'non acquitté avant lecture');
  await as(GHO);
  const mine = await val('select public.crew_my_standing_2026()');
  eq(mine.ok, true, 'ma situation répond');
  eq(mine.role, 'rookie', 'mon rôle');
  eq(mine.duty, 'member', 'mon devoir');
  eq(mine.my.lastRunAt, null, 'je n’ai jamais couru, et on me le dit sans détour');
  eq(mine.warnings.length, 1, 'un avertissement');
  eq(mine.warnings[0].issuedBy, 'officer', 'posé par un officier, pas par le serveur');
  eq(mine.atRisk, false, 'aucun retrait automatique armé, donc AUCUN risque à annoncer');
  eq(mine.removalAt, null, 'et donc aucune date');
  eq(await val(`select acknowledged_at is not null from public.crew_warnings_2026
    where user_id = $1 and kind = 'manual'`, [GHO]), true, 'acquitté par la lecture');
});

await t('un membre averti apparaît « averti » au tableau, et « à risque » seulement si le retrait est armé', async () => {
  await as(CAP);
  eq(rowFor(await board(), GHO).standing, 'rule_off',
    'sans règle active, l’état est « règle éteinte » — jamais « conforme »');
  await val('select public.crew_rules_set_2026($1,$2,$3)',
    ['Une sortie par semaine, et on se voit le mardi.', {}, { max_inactivity_days: 14 }]);
  eq(rowFor(await board(), GHO).standing, 'warned', 'averti');
  const warned = await board('last_run', 'warned');
  eq(warned.rows.map((r) => r.userId), [GHO], 'le filtre « averti » le trouve');
  const risky = await board('last_run', 'at_risk');
  eq(risky.rows, [], 'aucun « à risque » : le retrait automatique n’est pas armé');
});

// ══════════════════════════════════════════════════════════════════════════
// 4. EXCLURE
// ══════════════════════════════════════════════════════════════════════════
await t('exclure : le motif est OBLIGATOIRE et fermé, la note l’est pour « other »', async () => {
  await as(OFF);
  eq((await val('select public.crew_remove_member_2026($1,$2,$3)', [GHO, null, null])).reason,
    'bad_reason', 'aucun motif');
  eq((await val('select public.crew_remove_member_2026($1,$2,$3)', [GHO, 'parce que', null])).reason,
    'bad_reason', 'motif hors catalogue');
  eq((await val('select public.crew_remove_member_2026($1,$2,$3)', [GHO, 'other', null])).reason,
    'note_required', '« other » exige la note');
  for (const reason of list('CREW_KICK_REASONS')) {
    const r = await val('select public.crew_remove_member_2026($1,$2,$3)',
      [OUT, reason, reason === 'other' ? 'une note' : null]);
    eq(r.reason, 'not_member', `motif ${reason} accepté par le catalogue`);
  }
});

await t('exclure : les bornes de 0093 sont rejouées à l’identique', async () => {
  await as(REG);
  eq((await val('select public.crew_remove_member_2026($1,$2,$3)', [GHO, 'fit', null])).reason,
    'forbidden', 'un runner n’exclut personne');
  await as(OFF);
  eq((await val('select public.crew_remove_member_2026($1,$2,$3)', [OFF, 'fit', null])).reason,
    'self', 'jamais soi-même (leave_crew existe pour ça)');
  eq((await val('select public.crew_remove_member_2026($1,$2,$3)', [CAP, 'fit', null])).reason,
    'cannot_target_lead', 'jamais le fondateur');
  eq((await val('select public.crew_remove_member_2026($1,$2,$3)', [ORG, 'fit', null])).reason,
    'out_of_scope', 'un co_captain n’exclut pas un captain (CO_CAPTAIN_KICKABLE_ROLES)');
  // Le fondateur, lui, le peut.
  await as(CAP);
  eq((await val('select public.crew_remove_member_2026($1,$2,$3)', [ORG, 'fit', null])).ok, true,
    'le fondateur exclut un captain');
});

await t('exclure : trace complète, avertissements résolus, message SANS le nom du décideur', async () => {
  await as(OFF);
  const r = await val('select public.crew_remove_member_2026($1,$2,$3)',
    [GHO, 'inactivity', 'Aucune sortie depuis l’arrivée.']);
  eq(r.ok, true, 'exclusion prononcée');
  eq(r.effect, 'removed', 'removed');
  eq(r.previousRole, 'rookie', 'le rôle d’avant est rendu');
  eq(r.reason, 'inactivity', 'le motif est rendu');
  ok(r.rejoinAllowedAt != null, 'la date de re-adhésion est rendue');

  eq(await val(`select removed_by from public.crew_members
    where crew_id = $1 and user_id = $2 and left_at is not null`, [CREW, GHO]), OFF,
    'removed_by porte l’auteur : ce n’est pas un départ volontaire');
  eq(await val(`select count(*)::int from public.crew_warnings_2026
    where user_id = $1 and resolved_at is null`, [GHO]), 0,
    'les avertissements ouverts sont résolus : ils portaient sur une appartenance finie');
  const kick = (await q('select * from public.crew_kicks_2026 where user_id = $1', [GHO]))[0];
  eq(kick.reason, 'inactivity', 'motif au journal');
  eq(kick.decided_by, OFF, 'décideur au journal INTERNE');

  const notif = (await q(`select payload from public.notifications
    where user_id = $1 and payload->>'event' = 'removed'`, [GHO]))[0];
  eq(notif.payload.reason, 'inactivity', 'le motif est dit à l’exclu');
  ok(!JSON.stringify(notif.payload).includes(OFF),
    'le nom de qui a décidé n’est JAMAIS dans le message de l’exclu');
  // Idempotence : ré-exclure quelqu'un déjà sorti n'est pas une erreur.
  eq((await val('select public.crew_remove_member_2026($1,$2,$3)', [GHO, 'fit', null])).effect,
    'already_removed', 'idempotent');
});

// ══════════════════════════════════════════════════════════════════════════
// 5. LE JOURNAL
// ══════════════════════════════════════════════════════════════════════════
await t('le journal est rôle-gaté, rend les pseudos, et dit « automatique » quand personne n’a décidé', async () => {
  await as(REG);
  eq((await val('select public.crew_decisions_log_2026(50)')).reason, 'forbidden', 'un runner ne lit pas le journal');
  await as(CAP);
  const log = await val('select public.crew_decisions_log_2026(50)');
  eq(log.ok, true, 'le journal répond');
  const kinds = [...new Set(log.entries.map((e) => e.kind))].sort();
  for (const kind of ['charter', 'joined', 'left', 'removal', 'warning']) {
    ok(kinds.includes(kind), `le journal porte « ${kind} » (obtenu ${kinds.join(', ')})`);
  }
  const removal = log.entries.find((e) => e.kind === 'removal');
  eq(removal.actor, 'Bo', 'le journal, LUI, nomme le décideur');
  eq(removal.target, 'Gil', 'et la cible');
  eq(removal.reason, 'inactivity', 'et le motif');
  eq(removal.automatic, false, 'ce n’est pas le serveur');
  ok(log.entries.every((e, i) => i === 0 || e.at <= log.entries[i - 1].at),
    'antéchronologique');
});

// ══════════════════════════════════════════════════════════════════════════
// 6. PRIVILÈGES
// ══════════════════════════════════════════════════════════════════════════
await t('`anon` n’appelle rien ; la vue et les deux tables restent fermées aux clients', async () => {
  const client = ['crew_member_board_2026(text,text)', 'crew_my_standing_2026()',
    'crew_warn_member_2026(uuid,text)', 'crew_remove_member_2026(uuid,text,text)',
    'crew_decisions_log_2026(integer)'];
  for (const sig of client) {
    eq(await val("select has_function_privilege('anon',$1,'EXECUTE')", [sig]), false, `anon n’a pas ${sig}`);
    eq(await val("select has_function_privilege('authenticated',$1,'EXECUTE')", [sig]), true,
      `authenticated garde ${sig}`);
  }
  eq(await val("select has_function_privilege('anon','crew_role_duty(text)','EXECUTE')"), false,
    'anon n’a pas crew_role_duty');
  for (const rel of ['crew_warnings_2026', 'crew_kicks_2026', 'crew_member_activity_2026']) {
    for (const role of ['anon', 'authenticated']) {
      eq(await val('select has_table_privilege($1,$2,$3)', [role, `public.${rel}`, 'SELECT']), false,
        `${role} ne lit pas ${rel}`);
    }
  }
  for (const table of ['crew_warnings_2026', 'crew_kicks_2026']) {
    eq(await val(`select relrowsecurity from pg_class where oid = 'public.${table}'::regclass`), true,
      `RLS activée sur ${table}`);
  }
  eq(await val(`select count(*)::int from pg_matviews where matviewname = 'crew_member_activity_2026'`), 0,
    'crew_member_activity_2026 est une VUE SIMPLE, jamais une matview (piège de 0002)');
});

console.log(`\n${passed} vérifications passées, ${failures.length} échec(s).`);
console.log('RLS non prouvée (PGlite = superutilisateur) · aucune géométrie lue (pas de PostGIS).\n');
await db.close();
process.exit(failures.length === 0 ? 0 : 1);
