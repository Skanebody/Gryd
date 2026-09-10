/**
 * GRYD — 0190 : le job d'inactivité, la dissolution, la découverte à filtres.
 *
 * ═══ ÉTAPE 0 — LES DÉFAUTS EXISTAIENT, ET ILS SONT REJOUÉS ═════════════════
 * 0188 et 0189 sont appliquées, un capitaine ARME sa règle d'inactivité, et un
 * membre n'a pas couru depuis quatre-vingts jours. Rien ne se passe :
 *   0a. `crew_warnings_2026` reste VIDE — aucune inactivité n'est jamais
 *       constatée, parce qu'aucune fonction ne regarde ;
 *   0b. `sweep_crew_inactivity_2026` n'existe pas, et aucun job ne l'appelle ;
 *   0c. AUCUNE FONCTION NE DISSOUT UN CREW : `crews` n'a pas de colonne
 *       d'archivage, `crew_dissolve_2026` n'existe pas, et un fondateur qui
 *       veut fermer son crew n'a que `leave_crew`, qui laisse la coquille.
 * Sans cette étape, rien ne distinguerait 0190 d'un no-op.
 *
 * ═══ CE QUE CE TEST PROUVE ═════════════════════════════════════════════════
 *  1. le job écrit UN avertissement par membre et par règle, et DIX passages
 *     n'en écrivent pas onze (l'unique partielle de 0189 §2) ;
 *  2. un avertissement se LÈVE dès que le fait cesse, et l'horloge repart ;
 *  3. les TROIS garde-fous du retrait : règle armée + avertissement préalable ·
 *     jamais un founder ni un co_captain · jamais sans avertissement acquitté
 *     ou vieux de CREW_WARNING_GRACE_DAYS ;
 *  4. le passage est journalisé MÊME À VIDE : « le job a-t-il tourné ? » a une
 *     réponse ;
 *  5. la dissolution : fondateur seul, refus `active_challenge` avec sa date,
 *     `already_archived`, membres retirés, notifications, nom tenu puis rendu,
 *     et RIEN de supprimé ;
 *  6. l'invitation par pseudo OUTREPASSE les exigences (la porte humaine) ;
 *  7. la découverte à filtres, dont « je suis éligible », sans jamais dire quel
 *     seuil a écarté un crew ;
 *  8. les privilèges : `anon` n'appelle rien, le balayage est service_role SEUL.
 *
 * ═══ CE QU'IL NE PROUVE PAS ════════════════════════════════════════════════
 *  · L'EFFET RÉEL DE LA RLS : PGlite tourne en SUPERUTILISATEUR.
 *  · QUE `pg_cron` TOURNE : le schéma `cron` n'existe pas ici, le bloc `do $$`
 *    de 0190 §9 est donc sauté — c'est exactement ce qui le rend rejouable. La
 *    planification réelle se vérifie en production (`select * from cron.job`).
 *  · LA MODÉRATION DE NOM (0050) : bouchonnée ici, elle a son propre test. Ce
 *    fichier ne prouve que la TENUE du nom d'un crew archivé.
 *
 * ═══ LANCER ════════════════════════════════════════════════════════════════
 *   node supabase/tests/crew_inactivity_2026.pglite.test.mjs
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
function constant(name) {
  const m = new RegExp(`export const ${name} = ([0-9_]+);`).exec(RULES);
  if (m === null) { console.error(`\n${name} introuvable.`); process.exit(1); }
  return Number(m[1].replace(/_/g, ''));
}
function list(name) {
  const m = new RegExp(`export const ${name} = \\[([^\\]]*)\\]`, 's').exec(RULES);
  if (m === null) { console.error(`\n${name} introuvable.`); process.exit(1); }
  return m[1].split(',').map((x) => x.trim().replace(/^'|'$/g, '')).filter(Boolean);
}
/** Le mode ACCÉLÉRÉ : on avance l'horloge en PARAMÈTRE, jamais par une variable cachée. */
const sweep = (days = 0) => val(
  `select public.sweep_crew_inactivity_2026(now() + make_interval(days => $1))`, [days]);

// ─── Socle minimal ─────────────────────────────────────────────────────────
await db.exec(`
  set time zone 'UTC';
  create role anon; create role authenticated; create role service_role;
  create schema auth; create schema extensions;
  create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
  -- Bouchon d'aléa : pgcrypto n'existe pas sous PGlite (même bouchon que
  -- crew_invite_tokens.pglite.test.mjs). Il ne prouve RIEN de la qualité
  -- cryptographique — celle-ci vient de pgcrypto, installé par 0001.
  create function extensions.gen_random_bytes(n int) returns bytea language sql as $$
    select substring(decode(md5(random()::text) || md5(random()::text)
      || md5(random()::text), 'hex') from 1 for n) $$;

  create table public.city_zones (city_id text primary key, name text not null);
  create table public.users (
    id uuid primary key, pseudo text, city_id text references public.city_zones(city_id),
    level integer not null default 1, deletion_requested_at timestamptz);
  create table public.user_profiles (
    user_id uuid primary key references public.users(id) on delete cascade,
    handle text unique, profile_visibility text not null default 'crew',
    map_sharing text not null default 'simplified');
  create table public.crews (
    id uuid primary key default gen_random_uuid(),
    name text not null check (char_length(name) between 1 and 40),
    tag text, color smallint not null default 0,
    city_id text references public.city_zones(city_id),
    code char(6) unique, created_by uuid references public.users(id),
    created_at timestamptz not null default now(),
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
    message text, role_wanted text, status text not null default 'pending'
      check (status in ('pending','accepted','rejected','withdrawn')),
    created_at timestamptz not null default now(),
    decided_at timestamptz, decided_by uuid references public.users(id));
  create table public.crew_invites (
    id uuid primary key default gen_random_uuid(),
    crew_id uuid not null references public.crews(id) on delete cascade,
    token_hash bytea not null unique check (octet_length(token_hash) = 32),
    prefix char(4) not null, created_by uuid not null references public.users(id),
    created_at timestamptz not null default now(),
    expires_at timestamptz not null check (expires_at > created_at),
    revoked_at timestamptz, uses integer not null default 0, last_used_at timestamptz);
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
    id uuid primary key default gen_random_uuid(),
    crew_id uuid references public.crews(id) on delete cascade,
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
    side integer not null, accepted_at timestamptz, access_confirmed_at timestamptz,
    locked_at timestamptz, primary key (challenge_id, crew_id));
  create table public.challenge_roster_2026 (
    challenge_id uuid not null, crew_id uuid not null, player_id uuid not null,
    user_id uuid references public.users(id) on delete set null,
    activity text not null default 'run', ranked_week date,
    reserved boolean not null default true, consent boolean not null default true,
    consented_at timestamptz not null default now(),
    primary key (challenge_id, player_id));
  create table public.challenge_contributions_2026 (
    challenge_id uuid not null, player_id uuid not null, crew_id uuid not null, day date not null,
    run_id uuid, activity_key uuid, event_id uuid, sector_id text, closed_at timestamptz,
    received_at timestamptz, validated_at timestamptz not null default clock_timestamp(),
    withdrawn boolean not null default false, used_fallback boolean not null default false,
    primary key (challenge_id, player_id, day));
  create table public.friendships (requester_id uuid, addressee_id uuid, status text);
  create table public.notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    type text not null check (type in ('steal','decay_warning','streak','digest','reward','season','system')),
    priority smallint not null check (priority between 0 and 6),
    payload jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    read_at timestamptz check (read_at is null or read_at >= created_at));
  alter table public.notifications enable row level security;

  -- BOUCHON de la modération de nom (0050) : ce fichier ne prouve QUE la tenue
  -- du nom d'un crew archivé. La modération a son propre test, et la bouchonner
  -- ici évite de faire dépendre ce test de la liste de termes bloqués.
  create or replace function public.crew_name_refusal(p_name text)
    returns text language sql stable as $$ select null::text $$;
`);

// Le VRAI SQL du dépôt : rang de rôle (0093), faits de crew (0152), jetons (0090).
await db.exec(slice('0093_crew_member_roles.sql',
  'create or replace function public.crew_role_rank(p_role text)', '-- 3. `crew_set_member_role`'));
await db.exec(slice('0152_crew_read_model_2026.sql',
  'create or replace function public.crew_facts_2026(p_crew_ids uuid[])', '-- ═══ 2. DÉCOUVERTE'));
await db.exec(slice('0090_crew_invite_tokens.sql',
  'create or replace function public.gryd_new_invite_token()', '-- ─── 4.2 revoke_crew_invite'));
await db.exec(slice('0090_crew_invite_tokens.sql',
  'create or replace function public.redeem_crew_invite(p_token text)', '-- ║ §5 — EXÉCUTION'));

// ─── Acteurs ───────────────────────────────────────────────────────────────
const CAP = '11111111-1111-1111-1111-111111111111';   // founder, court
const OFF = '22222222-2222-2222-2222-222222222222';   // co_captain, INACTIF
const REG = '44444444-4444-4444-4444-444444444444';   // runner assidu
const SHY = '55555555-5555-5555-5555-555555555555';   // runner, dernière sortie 19 j
const GHO = '66666666-6666-6666-6666-666666666666';   // rookie, jamais sorti
const NEW = '77777777-7777-7777-7777-777777777777';   // hors crew, sans course
const OW2 = '99999999-9999-9999-9999-999999999999';   // fondateur d'un autre crew
const INV = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';   // jamais eu de crew : l'invitée
/** Le crew REFONDÉ sous le nom rendu — renseigné par le test du nom tenu. */
let REBORN = null;

const CREW = 'aaaaaaaa-0000-0000-0000-000000000001';  // Les Quais
const OTHR = 'aaaaaaaa-0000-0000-0000-000000000002';  // Les Ponts
const CHAL = 'cccccccc-0000-0000-0000-000000000001';
const CITY = 'insee-76540';

await db.exec(`
  insert into public.city_zones values ('${CITY}','Rouen');
  insert into public.users (id,pseudo,city_id) values
    ('${CAP}','Ada','${CITY}'), ('${OFF}','Bo','${CITY}'), ('${REG}','Dee','${CITY}'),
    ('${SHY}','Sam','${CITY}'), ('${GHO}','Gil','${CITY}'), ('${NEW}','Zoe','${CITY}'),
    ('${OW2}','Ilo','${CITY}'), ('${INV}','Noa','${CITY}');
  insert into public.user_profiles (user_id,handle) values
    ('${CAP}','ada'), ('${OFF}','bo_'), ('${REG}','dee'), ('${SHY}','sam'),
    ('${GHO}','gil'), ('${NEW}','zoe'), ('${OW2}','ilo'), ('${INV}','noa');
  insert into public.crews (id,name,city_id,code,recruitment_status,tags) values
    ('${CREW}','Les Quais','${CITY}','AAAAAA','on_request','{run_club}'),
    ('${OTHR}','Les Ponts','${CITY}','BBBBBB','open','{debutants_ok}');
  insert into public.crew_members (crew_id,user_id,role,joined_at,left_at) values
    ('${CREW}','${CAP}','founder',    now() - interval '300 days', null),
    ('${CREW}','${OFF}','co_captain', now() - interval '200 days', null),
    ('${CREW}','${REG}','runner',     now() - interval '100 days', null),
    ('${CREW}','${SHY}','runner',     now() - interval '80 days',  null),
    ('${CREW}','${GHO}','rookie',     now() - interval '60 days',  null),
    ('${OTHR}','${OW2}','founder',    now() - interval '30 days',  null);
  insert into public.runs (user_id, activity, started_at, distance_m, status) values
    ('${CAP}','run', now() - interval '2 days',  8000, 'valid'),
    ('${REG}','run', now() - interval '1 days', 10000, 'valid'),
    ('${REG}','run', now() - interval '4 days', 12000, 'valid'),
    ('${SHY}','run', now() - interval '19 days', 5000, 'valid');
    -- OFF (co_captain) et GHO (rookie) n'ont JAMAIS couru.
  insert into public.capture_events_2026 (owner_id, activity, closed_at, status) values
    ('${REG}','run', now() - interval '1 days', 'published');
  insert into public.ownership_2026 values
    ((select id from public.capture_events_2026 limit 1), '${REG}', 'run', now() - interval '1 days');
`);

// 0188 et 0189 sont l'état d'AVANT ce fichier.
await db.exec(readFileSync(join(MIGRATIONS, '0188_crew_rules_2026.sql'), 'utf8'));
await db.exec(readFileSync(join(MIGRATIONS, '0189_crew_board_2026.sql'), 'utf8'));

console.log('crew_inactivity_2026 — migration 0190 sur PGlite\n');

// ══════════════════════════════════════════════════════════════════════════
// ÉTAPE 0 — LE DÉFAUT EXISTAIT
// ══════════════════════════════════════════════════════════════════════════
await t('étape 0 — une règle est ARMÉE, un membre n’a jamais couru, et AUCUNE inactivité n’est constatée', async () => {
  await as(CAP);
  const armed = await val('select public.crew_rules_set_2026($1,$2,$3)',
    [null, {}, { max_inactivity_days: 14 }]);
  eq(armed.ok, true, 'la règle est écrite');
  eq(await val("select to_regprocedure('public.sweep_crew_inactivity_2026(timestamptz)') is null"), true,
    'aucune fonction ne balaie');
  eq(await val('select count(*)::int from public.crew_warnings_2026'), 0,
    'la table existe et reste VIDE : personne ne regarde');
  // Et le tableau de suivi le dit sans mentir : « averti » n'arrive jamais.
  eq((await val('select public.crew_member_board_2026($1,$2)', ['last_run', null]))
    .rows.filter((r) => r.standing !== 'compliant').length, 0,
    'tout le monde est « conforme », y compris celui qui n’a jamais couru');
});

await t('étape 0 — aucune fonction ne dissout un crew, et `crews` n’a pas de colonne d’archivage', async () => {
  eq(await val("select to_regprocedure('public.crew_dissolve_2026(text)') is null"), true, 'absente');
  eq(await val(`select count(*)::int from information_schema.columns
    where table_name = 'crews' and column_name in ('archived_at','name_available_at')`), 0,
    'aucune colonne d’archivage');
  eq(await val("select to_regprocedure('public.crew_invite_by_handle_2026(text)') is null"), true,
    'aucune invitation par pseudo');
  eq(await val(`select to_regprocedure('public.crew_discovery_2026(text,text,text,text,integer,integer,text,boolean,text[])') is null`),
    true, 'aucune découverte à filtres');
});

// ══════════════════════════════════════════════════════════════════════════
// 0190 S'APPLIQUE
// ══════════════════════════════════════════════════════════════════════════
await db.exec(readFileSync(join(MIGRATIONS, '0190_crew_inactivity_2026.sql'), 'utf8'));
console.log('\n  — 0190 appliquée —\n');

const openWarnings = async (kind = null) => q(
  `select w.user_id, w.kind, w.week_key, w.issued_at from public.crew_warnings_2026 w
   where w.resolved_at is null and ($1::text is null or w.kind = $1) order by w.user_id`, [kind]);

// ══════════════════════════════════════════════════════════════════════════
// 1. LE JOB — CONSTATER, LEVER, RETIRER
// ══════════════════════════════════════════════════════════════════════════
await t('le job constate l’inactivité, et DIX passages n’écrivent qu’UN avertissement par membre', async () => {
  const first = await sweep(0);
  eq(first.ok, true, 'le balayage répond');
  eq(first.crews, 1, 'un crew a une règle active');
  eq(first.warned, 3, 'Bo et Gil n’ont jamais couru, Sam a couru il y a 19 jours (> 14)');
  const w = await openWarnings('inactivity');
  eq(w.map((x) => x.user_id).sort(), [OFF, SHY, GHO].sort(),
    'les trois inactifs de plus de 14 jours');
  eq(w[0].week_key, '', 'inactivité : UN seul avertissement ouvert à la fois, clé vide');
  // Le retrait n'est PAS armé : l'avertissement ne doit annoncer AUCUNE date.
  // Il n'existe pas de second message « retrait imminent » — §14.3 demande de
  // regrouper, pas de doubler.
  eq(await val(`select payload->>'removalAt' from public.notifications
    where user_id = $1 and payload->>'event' = 'warning_issued'`, [GHO]), null,
    'aucune date de retrait annoncée tant que la règle n’est pas armée');

  for (let i = 0; i < 9; i += 1) {
    const again = await sweep(0);
    eq(again.warned, 0, `passage ${i + 2} : rien de neuf`);
  }
  eq((await openWarnings('inactivity')).length, 3, 'toujours trois : l’unique partielle tient');
});

await t('un membre arrivé RÉCEMMENT n’est jamais averti : on n’exige pas d’avoir couru avant d’arriver', async () => {
  await db.query(`insert into public.crew_members (crew_id,user_id,role,joined_at)
    values ($1,$2,'rookie', now() - interval '2 days')`, [CREW, NEW]);
  const r = await sweep(0);
  eq(r.warned, 0, 'aucun avertissement pour l’arrivant');
  eq((await openWarnings('inactivity')).some((w) => w.user_id === NEW), false, 'Zoe n’est pas avertie');
  await db.query('delete from public.crew_members where crew_id = $1 and user_id = $2', [CREW, NEW]);
});

await t('une sortie enregistrée LÈVE l’avertissement, et l’horloge du retrait repart de zéro', async () => {
  await db.query(`insert into public.runs (user_id, activity, started_at, distance_m, status)
    values ($1,'run', now() - interval '1 hour', 4000, 'valid')`, [SHY]);
  const r = await sweep(0);
  eq(r.resolved, 1, 'un avertissement levé');
  eq((await openWarnings('inactivity')).map((x) => x.user_id).sort(), [OFF, GHO].sort(),
    'Sam n’est plus averti');
  eq(await val(`select count(*)::int from public.crew_warnings_2026
    where user_id = $1 and resolved_at is not null`, [SHY]), 1,
    'la trace reste : levé n’est pas effacé');
});

await t('le retrait automatique exige la règle ARMÉE — sans elle, rien ne se passe jamais', async () => {
  const r = await sweep(30);
  eq(r.removed, 0, 'trente jours plus tard, toujours personne : auto_remove_after_days = 0');
  eq(await val(`select count(*)::int from public.crew_members
    where crew_id = $1 and left_at is not null`, [CREW]), 0, 'aucun départ');
});

await t('le garde-fou de la DÉCISION 4 : jamais retiré sans avertissement acquitté ou vieux de N jours', async () => {
  const GRACE = constant('CREW_WARNING_GRACE_DAYS');
  await as(CAP);
  // Retrait armé à UN jour : c'est le délai de grâce qui devient la borne.
  const armed = await val('select public.crew_rules_set_2026($1,$2,$3)',
    [null, {}, { max_inactivity_days: 14, auto_remove_after_days: 1 }]);
  eq(armed.ok, true, 'retrait armé à 1 jour');

  const tooSoon = await sweep(GRACE - 1);
  eq(tooSoon.removed, 0,
    `à J+${GRACE - 1}, le délai de la règle est passé mais pas le délai de grâce`);

  const now = await sweep(GRACE + 1);
  eq(now.removed, 1, `à J+${GRACE + 1}, Gil est retiré (Bo est co_captain : intouchable)`);
});

await t('quand le retrait EST armé, l’avertissement porte sa date — et il n’y a pas de second message', async () => {
  // Un membre neuf, inactif depuis longtemps, sur un crew où le retrait est armé.
  await db.query(`insert into public.crew_members (crew_id,user_id,role,joined_at)
    values ($1,$2,'rookie', now() - interval '90 days')`, [CREW, NEW]);
  const r = await sweep(0);
  eq(r.warned, 1, 'un avertissement de plus');
  const payload = (await q(`select payload from public.notifications
    where user_id = $1 and payload->>'event' = 'warning_issued'`, [NEW]))[0].payload;
  eq(payload.kind, 'inactivity', 'motif');
  ok(payload.removalAt != null, 'la DATE de retrait voyage avec l’avertissement');
  eq(await val(`select count(*)::int from public.notifications
    where user_id = $1 and payload->>'event' = 'removal_imminent'`, [NEW]), 0,
    'aucun second message : le catalogue ne déclare pas d’événement sans producteur');
  // On la ressort du crew pour ne pas fausser la dissolution plus loin.
  await db.query('delete from public.crew_members where crew_id = $1 and user_id = $2', [CREW, NEW]);
  await db.query('delete from public.crew_warnings_2026 where user_id = $1', [NEW]);
});

await t('garde-fou ② : le job ne retire JAMAIS un founder ni un co_captain', async () => {
  eq(await val(`select left_at is null from public.crew_members
    where crew_id = $1 and user_id = $2 and left_at is null`, [CREW, OFF]), true,
    'Bo (co_captain) est toujours là, averti depuis longtemps');
  eq(await val(`select count(*)::int from public.crew_kicks_2026 where user_id = $1`, [OFF]), 0,
    'et aucun retrait n’a été écrit à son nom');
});

await t('le retrait automatique écrit tout : sortie, kick sans auteur, journal « automatique », notification', async () => {
  const m = (await q(`select left_at, removed_by, removed_by_server from public.crew_members
    where crew_id = $1 and user_id = $2 and left_at is not null`, [CREW, GHO]))[0];
  ok(m.left_at != null, 'l’adhésion est close');
  eq(m.removed_by, null, 'aucune personne n’a décidé');
  eq(m.removed_by_server, true, 'le SERVEUR a décidé — et ce n’est pas un départ volontaire');

  const kick = (await q('select * from public.crew_kicks_2026 where user_id = $1', [GHO]))[0];
  eq(kick.reason, 'inactivity', 'motif');
  eq(kick.decided_by, null, 'décideur : le serveur');
  ok(kick.rejoin_allowed_at != null, 'la date de re-adhésion est écrite');

  await as(CAP);
  const log = await val('select public.crew_decisions_log_2026(50)');
  const auto = log.entries.find((e) => e.kind === 'removal' && e.automatic === true);
  ok(auto != null, 'le journal porte un retrait AUTOMATIQUE');
  eq(auto.actor, null, 'aucun nom : « automatique » n’est pas un pseudo');
  eq(auto.reason, 'inactivity', 'et son motif');

  const n = (await q(`select payload, priority from public.notifications
    where user_id = $1 and payload->>'event' = 'removed'`, [GHO]))[0];
  eq(n.payload.reason, 'inactivity', 'l’exclu apprend le motif');
  eq(n.payload.automatic, true, 'et que c’est automatique');
  eq(n.payload.transactional, true, 'transactionnel');
});

await t('un retrait AUTOMATIQUE n’arme pas le cooldown de 7 jours, mais bien le délai de re-adhésion', async () => {
  await as(GHO);
  // Ailleurs : accepté tout de suite (l'exclusion ne doit pas être une arme).
  const other = await val('select public.crew_apply_2026($1,$2,$3)', [OTHR, null, null]);
  eq(other.ok, true, 'Gil rejoint un autre crew le jour même');
  eq(other.effect, 'joined', 'le crew Les Ponts est ouvert');
  await db.query(`update public.crew_members set left_at = now(), removed_by = null
    where crew_id = $1 and user_id = $2 and left_at is null`, [OTHR, GHO]);
  await db.query(`update public.crew_members set removed_by_server = true
    where crew_id = $1 and user_id = $2 and left_at is not null`, [OTHR, GHO]);
  // Au MÊME crew : refusé pendant CREW_REJOIN_AFTER_KICK_DAYS.
  const same = await val('select public.crew_apply_2026($1,$2,$3)', [CREW, 'je reviens', null]);
  eq(same.reason, 'cooldown', 'refusé au crew qui l’a retiré');
  ok(same.rejoinAllowedAt != null, 'la date est dite');
});

await t('un officier LÈVE un avertissement manuel — sinon il resterait ouvert à vie', async () => {
  await as(CAP);
  const w = await val('select public.crew_warn_member_2026($1,$2)', [SHY, 'On ne te voit plus le mardi.']);
  eq(w.ok, true, 'avertissement manuel posé');
  await as(SHY);
  eq((await val('select public.crew_resolve_warning_2026($1)', [w.warningId])).reason, 'forbidden',
    'le membre visé ne lève pas son propre avertissement');
  await as(CAP);
  eq((await val('select public.crew_resolve_warning_2026($1)',
    ['00000000-0000-4000-8000-000000000000'])).reason, 'not_found', 'un identifiant inconnu');
  const done = await val('select public.crew_resolve_warning_2026($1)', [w.warningId]);
  eq(done.ok, true, 'levé');
  eq(done.effect, 'resolved', 'resolved');
  eq((await val('select public.crew_resolve_warning_2026($1)', [w.warningId])).effect,
    'already_resolved', 'idempotent : rejouer un geste abouti n’est pas une erreur');
  eq(await val(`select count(*)::int from public.crew_warnings_2026
    where id = $1 and resolved_at is not null`, [w.warningId]), 1, 'la trace reste : levé n’est pas effacé');
  const log = await val('select public.crew_decisions_log_2026(50)');
  ok(log.entries.some((e) => e.kind === 'warning' && e.reason === 'resolved'),
    'la levée est journalisée');
});

await t('la règle « sorties par semaine » est clée sur le LUNDI mesuré, donc écrite une fois', async () => {
  await as(CAP);
  await val('select public.crew_rules_set_2026($1,$2,$3)',
    [null, {}, { min_weekly_outings: 1 }]);
  const first = await sweep(0);
  ok(first.warned >= 1, 'au moins un membre n’a pas couru la semaine écoulée');
  const w = await openWarnings('weekly_outings');
  ok(w.length >= 1, 'des avertissements hebdomadaires existent');
  ok(/^\d{4}-\d{2}-\d{2}$/.test(w[0].week_key), 'la clé est le lundi de la semaine mesurée');
  const again = await sweep(0);
  eq(again.warned, 0, 'le même jour, rien de neuf');
  const sameWeek = await sweep(1);
  eq(sameWeek.warned, 0, 'le lendemain non plus : la semaine mesurée n’a pas changé');
});

await t('la règle de défi ne vise QUE les joueurs inscrits au défi, et à sa clôture', async () => {
  await db.exec(`
    insert into public.crew_challenges_2026 (id,title,activity,starts_at,ends_at,status) values
      ('${CHAL}','Défi des quais','run', now() - interval '9 days', now() - interval '2 days','active');
    insert into public.challenge_teams_2026 (challenge_id, crew_id, side) values ('${CHAL}','${CREW}',0);
    -- Dee est inscrite et a contribué UNE journée ; Sam est inscrit et zéro ;
    -- Ada n'est PAS inscrite : elle ne doit jamais être avertie.
    insert into public.challenge_roster_2026 (challenge_id, crew_id, player_id, user_id) values
      ('${CHAL}','${CREW}','${REG}','${REG}'), ('${CHAL}','${CREW}','${SHY}','${SHY}');
    insert into public.challenge_contributions_2026 (challenge_id, player_id, crew_id, day) values
      ('${CHAL}','${REG}','${CREW}', (now() - interval '4 days')::date);
  `);
  await as(CAP);
  await val('select public.crew_rules_set_2026($1,$2,$3)', [null, {}, { min_challenge_days: 2 }]);
  const r = await sweep(0);
  const w = await openWarnings('challenge');
  eq(w.map((x) => x.user_id).sort(), [REG, SHY].sort(),
    'les deux inscrits sous le seuil, jamais un membre hors roster');
  eq(w[0].week_key, CHAL, 'la clé est l’identifiant du défi');
  eq((await sweep(0)).warned, 0, 'rejoué : rien de neuf');
});

await t('le passage est journalisé MÊME À VIDE : « le job a-t-il tourné ? » a une réponse', async () => {
  const before = await val('select count(*)::int from public.crew_sweep_log_2026');
  await as(CAP);
  await val('select public.crew_rules_set_2026($1,$2,$3)', [null, {}, {}]);   // toutes règles éteintes
  const empty = await sweep(0);
  eq(empty.crews, 0, 'plus aucun crew n’a de règle active');
  eq(empty.warned, 0, 'rien à écrire');
  eq(await val('select count(*)::int from public.crew_sweep_log_2026'), before + 1,
    'une ligne quand même : un job mort et un job sans travail ne se ressemblent plus');
  const last = (await q('select * from public.crew_sweep_log_2026 order by id desc limit 1'))[0];
  eq(last.crews_seen, 0, 'zéro crew vu, et c’est écrit');
});

// ══════════════════════════════════════════════════════════════════════════
// 2. LA DISSOLUTION
// ══════════════════════════════════════════════════════════════════════════
await t('dissoudre : le co_captain est refusé par `not_founder`, pas par `forbidden`', async () => {
  await as(null);
  eq((await val('select public.crew_dissolve_2026($1)', [null])).reason, 'signed_out', 'sans session');
  await as(OFF);
  const r = await val('select public.crew_dissolve_2026($1)', [null]);
  eq(r.reason, 'not_founder', 'un co_captain ne dissout pas : impossibilité de NATURE');
  eq(list('CREW_DISSOLVE_REFUSALS').includes(r.reason), true, 'le motif est au catalogue de game-rules');
});

await t('dissoudre pendant un défi EN COURS est refusé, et la réponse DIT la date de clôture (§G20)', async () => {
  await db.query(`update public.crew_challenges_2026 set ends_at = now() + interval '3 days',
    status = 'active' where id = $1`, [CHAL]);
  await as(CAP);
  const r = await val('select public.crew_dissolve_2026($1)', ['on arrête']);
  eq(r.reason, 'active_challenge', 'refusé');
  eq(r.challengeId, CHAL, 'le défi est nommé');
  ok(r.endsAt != null, 'et sa date de clôture : un refus sans échéance serait un cul-de-sac');
  eq(await val('select archived_at is null from public.crews where id = $1', [CREW]), true,
    'rien n’a bougé');
});

await t('dissoudre : le crew est ARCHIVÉ, jamais supprimé, et tous les membres sortent', async () => {
  await db.query(`update public.crew_challenges_2026 set status = 'final',
    ends_at = now() - interval '1 day' where id = $1`, [CHAL]);
  const before = await val('select count(*)::int from public.crew_members where crew_id = $1', [CREW]);
  await as(CAP);
  const r = await val('select public.crew_dissolve_2026($1)', ['Plus assez de monde le mardi.']);
  eq(r.ok, true, 'dissolution prononcée');
  eq(r.effect, 'archived', 'archived');
  eq(r.membersRemoved, 3, 'Bo, Dee et Sam sortent — le fondateur n’est pas compté avec eux');
  ok(r.nameAvailableAt != null, 'la date de libération du nom est rendue');

  const c = (await q('select * from public.crews where id = $1', [CREW]))[0];
  ok(c != null, 'LA LIGNE EXISTE TOUJOURS : dissoudre n’est pas supprimer');
  eq(c.name, 'Les Quais', 'le nom est conservé');
  eq(c.archived_by, CAP, 'le fondateur est inscrit');
  eq(c.archived_reason, 'Plus assez de monde le mardi.', 'le motif aussi');
  eq(c.recruitment_status, 'closed', 'l’accueil est refermé dans la même écriture');
  eq(await val('select count(*)::int from public.crew_members where crew_id = $1', [CREW]), before,
    'aucune adhésion effacée : l’historique est intact');
  eq(await val(`select count(*)::int from public.crew_members
    where crew_id = $1 and left_at is null`, [CREW]), 0, 'plus aucun membre actif');
  // L'histoire territoriale de chacun reste la sienne (0126).
  eq(await val('select count(*)::int from public.capture_events_2026'), 1,
    'aucune capture effacée : le titre territorial est INDIVIDUEL');
});

await t('dissoudre : les membres échappent au cooldown, le fondateur non', async () => {
  eq(await val(`select removed_by from public.crew_members
    where crew_id = $1 and user_id = $2 and left_at is not null`, [CREW, REG]), CAP,
    'le fondateur est inscrit comme auteur : le membre n’a rien choisi');
  eq(await val(`select removed_by from public.crew_members
    where crew_id = $1 and user_id = $2 and left_at is not null`, [CREW, CAP]), null,
    'le fondateur, LUI, a choisi : son départ reste volontaire');
  await as(REG);
  const r = await val('select public.crew_apply_2026($1,$2,$3)', [OTHR, null, null]);
  eq(r.ok, true, 'un ancien membre rejoint ailleurs le jour même');
  await as(CAP);
  eq((await val('select public.crew_apply_2026($1,$2,$3)', [OTHR, null, null])).reason, 'cooldown',
    'le fondateur attend CREW_SWITCH_COOLDOWN_DAYS');
});

await t('dissoudre : chaque ancien membre reçoit une notification NEUTRE, jamais le fondateur', async () => {
  const rows = await q(`select user_id, priority, payload->>'transactional' as tr
    from public.notifications where payload->>'event' = 'dissolved' order by user_id`);
  eq(rows.map((r) => r.user_id).sort(), [OFF, REG, SHY].sort(), 'les trois membres retirés');
  ok(rows.every((r) => r.user_id !== CAP), 'le fondateur n’est pas notifié de sa propre décision');
  eq(rows[0].tr, 'true', 'transactionnel : ce message arrive toujours');
  eq(rows[0].priority, 1, 'priorité P1 — un fait d’appartenance');
  const payload = (await q(`select payload from public.notifications
    where user_id = $1 and payload->>'event' = 'dissolved'`, [OFF]))[0].payload;
  eq(payload.crewName, 'Les Quais', 'le nom du crew, que l’écran interpolera dans les 5 langues');
  ok(!('reason' in payload), 'aucun jugement, aucun motif privé n’est transmis aux membres');
});

await t('dissoudre : candidatures refermées, liens révoqués, journal écrit, et c’est irréversible', async () => {
  eq(await val(`select count(*)::int from public.crew_applications
    where crew_id = $1 and status = 'pending'`, [CREW]), 0, 'aucune candidature en attente');
  eq(await val(`select count(*)::int from public.crew_warnings_2026
    where crew_id = $1 and resolved_at is null`, [CREW]), 0, 'aucun avertissement ouvert');
  eq(await val(`select count(*)::int from public.crew_decisions_2026
    where crew_id = $1 and kind = 'dissolution'`, [CREW]), 1, 'la décision est journalisée');
  await as(CAP);
  eq((await val('select public.crew_dissolve_2026($1)', [null])).reason, 'no_crew',
    'le fondateur n’a plus de crew : il ne peut plus rien y faire');
});

await t('un crew archivé ne recrute plus : `crew_join_intent` dit « archived », le code ne marche plus', async () => {
  await as(NEW);
  eq((await val('select public.crew_join_intent($1)', [CREW])).intent, 'archived',
    'l’écran doit le DIRE au lieu de peindre un bouton qui échouerait');
  eq((await val('select public.join_crew_by_code($1)', ['AAAAAA'])).reason, 'dead_crew',
    'le code d’un crew dissous n’ouvre plus rien');
  eq((await val('select public.crew_apply_2026($1,$2,$3)', [CREW, null, null])).reason, 'dead_crew',
    'et la candidature non plus');
});

await t('le NOM est tenu, puis rendu — et le refus ne raconte pas l’histoire du crew dissous', async () => {
  const HOLD = constant('CREW_NAME_HOLD_AFTER_ARCHIVE_DAYS');
  await as(NEW);
  const taken = await val('select public.create_crew($1,$2,$3)', ['Les Quais', 0, CITY]);
  eq(taken.reason, 'name_unavailable', 'le nom est tenu');
  ok(!JSON.stringify(taken).toLowerCase().includes('archiv'),
    'le refus ne dit PAS pourquoi : on ne raconte pas l’histoire d’un groupe à qui n’en était pas');
  eq((await val('select public.create_crew($1,$2,$3)', ['LES QUAIS', 0, CITY])).reason,
    'name_unavailable', 'la casse ne contourne rien');
  // Après le délai, le nom redevient prenable. On avance l'horloge de la BASE,
  // pas celle du test : c'est `name_available_at` qui fait foi.
  await db.query(`update public.crews set name_available_at = now() - interval '1 day'
    where id = $1`, [CREW]);
  const free = await val('select public.create_crew($1,$2,$3)', ['Les Quais', 0, CITY]);
  eq(free.ok, true, `le nom est rendu après ${HOLD} jours`);
  eq(free.crew.name, 'Les Quais', 'et il est bien repris');
  REBORN = free.crew.id;
  ok(REBORN !== CREW, 'c’est un NOUVEAU crew : l’archivé n’est jamais ressuscité');
});

// ══════════════════════════════════════════════════════════════════════════
// 3. L'INVITATION PAR PSEUDO — LA PORTE HUMAINE
// ══════════════════════════════════════════════════════════════════════════
await t('inviter par pseudo : rôle-gaté, zéro énumération, et le jeton part chez la personne visée', async () => {
  // Un crew propre, avec des exigences que le candidat ne remplit PAS.
  await as(OW2);
  await val('select public.crew_rules_set_2026($1,$2,$3)',
    ['On court doucement.', { min_distance_km_28d: 500 }, {}]);
  await as(INV);
  eq((await val('select public.crew_invite_by_handle_2026($1)', ['zoe'])).reason, 'no_crew',
    'sans crew, personne à inviter');
  await as(OW2);
  eq((await val('select public.crew_invite_by_handle_2026($1)', ['inconnu'])).reason, 'not_found',
    'pseudo inconnu');
  eq((await val('select public.crew_invite_by_handle_2026($1)', ['ZZ'])).reason, 'not_found',
    'pseudo mal formé : le MÊME motif, zéro énumération');
  eq((await val('select public.crew_invite_by_handle_2026($1)', ['ilo'])).reason, 'self',
    'jamais soi-même');

  const inv = await val('select public.crew_invite_by_handle_2026($1)', ['noa']);
  eq(inv.ok, true, 'invitation posée');
  eq(inv.effect, 'invited', 'invited');
  ok(inv.token === undefined, 'le jeton NE revient PAS à l’inviteur : il a été remis à la personne visée');

  const n = (await q(`select payload from public.notifications
    where user_id = $1 and payload->>'event' = 'invited'`, [INV]))[0];
  ok(n != null && n.payload.token, 'le jeton est dans la boîte de réception du destinataire');
  eq(n.payload.invitedBy, 'Ilo', 'et qui invite');

  // ET IL OUTREPASSE LES EXIGENCES : 500 km demandés, Noa n’a jamais couru.
  await as(INV);
  eq((await val('select public.crew_apply_2026($1,$2,$3)', [OTHR, null, 1])).reason, 'not_eligible',
    'la CANDIDATURE, elle, est filtrée');
  const joined = await val('select public.redeem_crew_invite($1)', [n.payload.token]);
  eq(joined.ok, true, 'l’INVITATION passe : c’est la porte humaine (leçon ② de Clash)');
  eq(await val(`select role from public.crew_members
    where crew_id = $1 and user_id = $2 and left_at is null`, [OTHR, INV]), 'rookie', 'entrée au rôle d’essai');
});

// ══════════════════════════════════════════════════════════════════════════
// 4. LA DÉCOUVERTE À FILTRES
// ══════════════════════════════════════════════════════════════════════════
await t('la découverte filtre sur des FAITS, et n’expose jamais un crew archivé', async () => {
  const find = (args) => val(
    `select public.crew_discovery_2026($1,$2,$3,$4,$5,$6,$7,$8,$9)`, args);
  await as(NEW);
  eq((await find([CITY, null, 'nage', null, null, null, null, false, null])).reason, 'bad_activity',
    'discipline hors catalogue');
  eq((await find([CITY, null, null, 'partout', null, null, null, false, null])).reason,
    'bad_recruitment', 'accueil hors catalogue');
  eq((await find([CITY, null, null, null, null, null, 'peut_etre', false, null])).reason,
    'bad_requirements', 'filtre d’exigences hors catalogue');

  const all = await find([CITY, null, null, null, null, null, null, false, null]);
  eq(all.ok, true, 'la découverte répond');
  const ids = all.rows.map((r) => r.id);
  eq(ids.includes(CREW), false, 'le crew ARCHIVÉ n’apparaît pas');
  eq(ids.includes(OTHR), true, 'le crew vivant apparaît');
  const ponts = all.rows.find((r) => r.id === OTHR);
  eq(ponts.hasRequirements, true, 'ses exigences sont annoncées…');
  eq(ponts.hasCharter, true, '…et sa charte aussi');
  ok(ponts.missing === undefined, 'mais JAMAIS le détail de ce qui manque à l’appelant');

  eq((await find([CITY, 'Ponts', null, null, null, null, null, false, null])).rows.map((r) => r.id),
    [OTHR], 'recherche par nom');
  eq((await find([CITY, null, null, 'open', null, null, null, false, null])).rows.map((r) => r.id),
    [OTHR], 'filtre d’accueil');
  eq((await find([CITY, null, null, null, 99, null, null, false, null])).rows, [],
    'filtre de taille minimale');
  eq((await find([CITY, null, null, null, null, null, null, false, ['debutants_ok']])).rows.map((r) => r.id),
    [OTHR], 'filtre d’étiquettes');
  eq((await find([CITY, null, null, null, null, null, null, false, ['pionnier']])).rows, [],
    'une étiquette absente ne rend rien');

  // « je suis éligible » : Zoe n'a jamais couru, Les Ponts demande 500 km.
  const eligible = (await find([CITY, null, null, null, null, null, 'eligible', false, null]))
    .rows.map((r) => r.id);
  eq(eligible.includes(OTHR), false, 'Les Ponts est ÉCARTÉ, sans dire QUEL seuil a mordu');
  eq(eligible.includes(REBORN), true, 'le crew refondé, sans exigence, reste atteignable');
  const none = (await find([CITY, null, null, null, null, null, 'none', false, null]))
    .rows.map((r) => r.id);
  eq(none, [REBORN], '« sans exigence » ne rend que celui qui n’en a aucune');
  const anyone = await find([CITY, null, null, null, null, null, 'any', false, null]);
  eq(anyone.rows.map((r) => r.id).sort(), [OTHR, REBORN].sort(), '« avec ou sans » les rend tous');
  eq(anyone.rows.find((r) => r.id === OTHR).iAmEligible, false, 'et dit, pour MOI, si je le suis');
});

// ══════════════════════════════════════════════════════════════════════════
// 5. PRIVILÈGES ET PLANIFICATION
// ══════════════════════════════════════════════════════════════════════════
await t('`anon` n’appelle rien, et le balayage est réservé à `service_role`', async () => {
  const client = ['crew_dissolve_2026(text)', 'crew_resolve_warning_2026(uuid)',
    'crew_invite_by_handle_2026(text)',
    'crew_discovery_2026(text,text,text,text,integer,integer,text,boolean,text[])',
    'crew_join_intent(uuid)', 'join_crew_by_code(text)', 'create_crew(text,smallint,text)'];
  for (const sig of client) {
    eq(await val("select has_function_privilege('anon',$1,'EXECUTE')", [sig]), false, `anon n’a pas ${sig}`);
    eq(await val("select has_function_privilege('authenticated',$1,'EXECUTE')", [sig]), true,
      `authenticated garde ${sig}`);
  }
  const sweepSig = 'sweep_crew_inactivity_2026(timestamptz)';
  for (const role of ['anon', 'authenticated']) {
    eq(await val('select has_function_privilege($1,$2,\'EXECUTE\')', [role, sweepSig]), false,
      `${role} ne déclenche PAS le balayage : il choisirait le moment de son avertissement`);
  }
  eq(await val("select has_function_privilege('service_role',$1,'EXECUTE')", [sweepSig]), true,
    'service_role garde le balayage');
  for (const role of ['anon', 'authenticated']) {
    eq(await val('select has_table_privilege($1,$2,$3)', [role, 'public.crew_sweep_log_2026', 'SELECT']),
      false, `${role} ne lit pas le journal de passage`);
  }
});

await t('le bloc `pg_cron` est CONDITIONNEL : la migration reste rejouable sans le schéma `cron`', async () => {
  const raw = readFileSync(join(MIGRATIONS, '0190_crew_inactivity_2026.sql'), 'utf8');
  ok(raw.includes("cron.schedule(\n      'crew-inactivity-sweep-2026',"), 'le job porte son nom');
  ok(raw.includes("'10 3 * * *'"), 'la planification est celle de la spec §3.3');
  ok(raw.includes("select 1 from pg_namespace where nspname = 'cron'"),
    'la pose est conditionnelle, comme 0163 §3');
  eq(await val("select count(*)::int from pg_namespace where nspname = 'cron'"), 0,
    'et le schéma cron n’existe pas ici : le bloc a été sauté, la migration a tenu');
});

console.log(`\n${passed} vérifications passées, ${failures.length} échec(s).`);
console.log('RLS non prouvée (PGlite = superutilisateur) · pg_cron non prouvé (schéma absent).\n');
await db.close();
process.exit(failures.length === 0 ? 0 : 1);
