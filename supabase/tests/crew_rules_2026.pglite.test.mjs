/**
 * GRYD — 0188 : entrer dans un crew (exigences, charte, message de candidature).
 *
 * ═══ ÉTAPE 0 — LES DÉFAUTS EXISTAIENT, ET ILS SONT REJOUÉS ═════════════════
 * Avant d'exécuter une ligne de 0188, ce fichier applique le VRAI SQL d'avant —
 * `crew_join_intent` (0093) et `crew_join_requests` (0083) — puis les met en
 * situation. Les deux répondent, et taisent tout ce que le lot Q2 ajoute :
 *   0a. AUCUNE EXIGENCE N'EXISTE. Un compte de niveau 1, sans une seule course,
 *       reçoit `intent: 'join'` sur un crew ouvert : n'importe qui entre.
 *   0b. LE MESSAGE N'EST JAMAIS ÉCRIT. La seule voie qui insère une candidature
 *       (0083, l. 550) pose `(crew_id, user_id)` et rien d'autre ; le capitaine
 *       lit donc toujours `message: null`.
 *   0c. AUCUNE CHARTE. Ni table, ni acceptation, ni version.
 * Sans cette étape, rien ne distinguerait 0188 d'un no-op.
 *
 * ═══ CE QUE CE TEST PROUVE ═════════════════════════════════════════════════
 *  1. 0188 s'applique sur un vrai Postgres, tel quel ;
 *  2. les constantes SQL ne DÉRIVENT PAS de `packages/shared/src/game-rules.ts`
 *     (lu à la source, pas recopié), y compris la courbe de niveau 2026 ;
 *  3. les six refus `bad_rules` et la règle de version de charte ;
 *  4. l'éligibilité critère par critère, avec « il te manque … » chiffré ;
 *  5. les onze refus nommés de `crew_apply_2026`, dans l'ordre ;
 *  6. le message est ÉCRIT puis RELU par `crew_join_requests` (0083), inchangée ;
 *  7. le délai de re-adhésion : refusé 30 jours au MÊME crew, accepté ailleurs ;
 *  8. les notifications écrites, à qui de droit et une seule fois ;
 *  9. les privilèges : `anon` n'appelle rien.
 *
 * ═══ CE QU'IL NE PROUVE PAS, dit ici plutôt que laissé croire ══════════════
 *  · L'EFFET RÉEL DE LA RLS : PGlite tourne en SUPERUTILISATEUR. On vérifie les
 *    privilèges au catalogue, jamais un refus vécu par un rôle restreint. La
 *    preuve réelle est `npm run verify:rls` après push.
 *  · LA GÉOMÉTRIE : PGlite n'a pas PostGIS. `capture_events_2026` est ici un
 *    socle NON SPATIAL, aux colonnes que 0188 lit — et 0188 n'en lit aucune
 *    géométrie, c'est délibéré.
 *  · LA MODÉRATION DE NOM (0050) : elle a son propre test.
 *
 * ═══ LANCER ════════════════════════════════════════════════════════════════
 *   node supabase/tests/crew_rules_2026.pglite.test.mjs
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
const ok = (cond, what) => { if (!cond) throw new Error(what); };

const db = new PGlite();
const q = async (sql, args = []) => (await db.query(sql, args)).rows;
const one = async (sql, args = []) => (await q(sql, args))[0];
const val = async (sql, args = []) => Object.values((await q(sql, args))[0])[0];
const as = async (uid) => {
  await db.exec(
    `create or replace function auth.uid() returns uuid language sql stable as $$ select ${
      uid ? `'${uid}'::uuid` : 'null::uuid'
    } $$;`,
  );
};

/** Extrait un morceau CONTIGU d'une migration RÉELLE (jamais une réécriture). */
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
/** Une constante de game-rules.ts, lue À LA SOURCE : aucune valeur recopiée. */
const RULES = readFileSync(join(SHARED, 'game-rules.ts'), 'utf8');
function constant(name) {
  const m = new RegExp(`export const ${name} = ([0-9_]+);`).exec(RULES);
  if (m === null) {
    console.error(`\n${name} INTROUVABLE dans game-rules.ts — le test ne prouve rien.`);
    process.exit(1);
  }
  return Number(m[1].replace(/_/g, ''));
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

  -- 0011 : la table de candidature, telle qu'elle est, AVEC son message JAMAIS écrit.
  create table public.crew_applications (
    id uuid primary key default gen_random_uuid(),
    crew_id uuid not null references public.crews(id) on delete cascade,
    user_id uuid not null references public.users(id) on delete cascade,
    message text check (message is null or char_length(message) <= 280),
    role_wanted text, status text not null default 'pending'
      check (status in ('pending','accepted','rejected','withdrawn')),
    created_at timestamptz not null default now(),
    decided_at timestamptz, decided_by uuid references public.users(id));
  create unique index crew_applications_pending_unique
    on public.crew_applications (crew_id, user_id) where status = 'pending';

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
  -- 0118 SANS géométrie : 0188 ne lit aucune colonne PostGIS, c'est le point.
  create table public.capture_events_2026 (
    id uuid primary key default gen_random_uuid(), run_id uuid, owner_id uuid,
    activity text not null, face_key text not null default '0:0',
    closed_at timestamptz not null, status text not null);

  -- 0006 : la boîte de réception, telle que 0188 la trouve.
  create table public.notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    type text not null check (type in ('steal','decay_warning','streak','digest','reward','season','system')),
    priority smallint not null check (priority between 0 and 6),
    payload jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    read_at timestamptz check (read_at is null or read_at >= created_at));
  alter table public.notifications enable row level security;
  revoke insert, update, delete on public.notifications from anon, authenticated;
  grant update (read_at) on public.notifications to authenticated;
`);

// Le VRAI SQL d'avant : la lecture d'intention (0093) et la lecture des
// candidatures (0083). Aucune réécriture — ce sont les fichiers du dépôt.
await db.exec(slice('0093_crew_member_roles.sql',
  'create or replace function public.crew_join_intent(p_crew_id uuid) returns jsonb',
  '-- ════════════════════════════════════════════════════════════════════════════\n-- 9. PRIVILÈGES'));
await db.exec(slice('0083_crew_discovery_and_ownership.sql',
  'create or replace function public.crew_join_requests() returns jsonb',
  'create or replace function public.crew_decide_join_request('));

// ─── Acteurs et fixture ────────────────────────────────────────────────────
const CAP = '11111111-1111-1111-1111-111111111111';   // fondateur
const OFF = '22222222-2222-2222-2222-222222222222';   // co_captain
const MEM = '33333333-3333-3333-3333-333333333333';   // runner
const NEO = '44444444-4444-4444-4444-444444444444';   // candidat sans course
const PRO = '55555555-5555-5555-5555-555555555555';   // candidat qui coche tout
const EXC = '66666666-6666-6666-6666-666666666666';   // exclu du crew A
const NOM = '77777777-7777-7777-7777-777777777777';   // parti volontairement
const SPM = '88888888-8888-8888-8888-888888888888';   // candidat en rafale
const OWN = '99999999-9999-9999-9999-999999999999';   // fondateur du crew OUVERT
const OWN2 = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'; // fondateur du crew AILLEURS
const OWN3 = 'cccccccc-cccc-cccc-cccc-cccccccccccc'; // fondateur du crew SUR INVITATION

const CREW = 'aaaaaaaa-0000-0000-0000-000000000001';  // sur demande
const OPEN = 'aaaaaaaa-0000-0000-0000-000000000002';  // ouvert
const DEAD = 'aaaaaaaa-0000-0000-0000-000000000003';  // sans membre actif
const SHUT = 'aaaaaaaa-0000-0000-0000-000000000004';  // sur invitation
const ELSE = 'aaaaaaaa-0000-0000-0000-000000000005';  // ailleurs, ouvert
const CITY = 'insee-76540';
const OTHER_CITY = 'insee-75056';

await db.exec(`
  insert into public.city_zones values ('${CITY}','Rouen'), ('${OTHER_CITY}','Paris');
  insert into public.users (id,pseudo,city_id) values
    ('${CAP}','Ada','${CITY}'), ('${OFF}','Bo','${CITY}'), ('${MEM}','Cy','${CITY}'),
    ('${NEO}','Dee','${CITY}'), ('${PRO}','Eve','${CITY}'), ('${EXC}','Fay','${CITY}'),
    ('${NOM}','Gil','${CITY}'), ('${SPM}','Hal','${OTHER_CITY}'),
    ('${OWN}','Ilo','${CITY}'), ('${OWN2}','Jun','${CITY}'), ('${OWN3}','Kim','${CITY}');
  insert into public.user_profiles (user_id,handle) values
    ('${CAP}','ada'), ('${OFF}','bo_'), ('${MEM}','cy_'), ('${NEO}','dee'),
    ('${PRO}','eve'), ('${EXC}','fay'), ('${NOM}','gil'), ('${SPM}','hal'),
    ('${OWN}','ilo'), ('${OWN2}','jun'), ('${OWN3}','kim');
  insert into public.crews (id,name,city_id,code,recruitment_status) values
    ('${CREW}','Les Quais','${CITY}','AAAAAA','on_request'),
    ('${OPEN}','Les Ponts','${CITY}','BBBBBB','open'),
    ('${DEAD}','Les Partis','${CITY}','CCCCCC','open'),
    ('${SHUT}','Les Clos','${CITY}','DDDDDD','invite_only'),
    ('${ELSE}','Les Autres','${CITY}','EEEEEE','open');
  insert into public.crew_members (crew_id,user_id,role,joined_at,left_at) values
    ('${CREW}','${CAP}','founder', now() - interval '200 days', null),
    ('${CREW}','${OFF}','co_captain', now() - interval '100 days', null),
    ('${CREW}','${MEM}','runner', now() - interval '50 days', null),
    ('${OPEN}','${OWN}','founder', now() - interval '30 days', null),
    ('${ELSE}','${OWN2}','founder', now() - interval '30 days', null),
    ('${SHUT}','${OWN3}','founder', now() - interval '30 days', null),
    -- Le crew DEAD a eu un fondateur, et il est parti : plus aucun membre actif.
    ('${DEAD}','${NOM}','founder', now() - interval '80 days', now() - interval '70 days');
`);

// PRO coche tout : niveau, distance, journées, ville, discipline.
await db.exec(`
  insert into public.progress_accounts_2026 (user_id, ledger) values
    ('${PRO}', '{"totalXp":1000,"days":[],"collections":[]}'::jsonb);
  insert into public.runs (user_id, activity, started_at, distance_m, status) values
    ('${PRO}','run', now() - interval '2 days', 12000, 'valid'),
    ('${PRO}','run', now() - interval '5 days', 11000, 'valid'),
    ('${PRO}','run', now() - interval '9 days', 10000, 'partial'),
    -- Une course REJETÉE ne compte pour aucune exigence.
    ('${PRO}','run', now() - interval '3 days', 90000, 'rejected'),
    -- Hors fenêtre de 28 jours : elle ne compte pas non plus.
    ('${PRO}','run', now() - interval '40 days', 50000, 'valid');
  insert into public.capture_events_2026 (owner_id, activity, closed_at, status) values
    ('${PRO}','run', now() - interval '2 days', 'published');
`);

console.log('crew_rules_2026 — migration 0188 sur PGlite\n');

// ══════════════════════════════════════════════════════════════════════════
// ÉTAPE 0 — LE DÉFAUT EXISTAIT
// ══════════════════════════════════════════════════════════════════════════
await t('étape 0 — aucune exigence n’existe : un compte sans une seule course reçoit « join » sur un crew ouvert', async () => {
  await as(NEO);
  const intent = await val('select public.crew_join_intent($1)', [OPEN]);
  eq(intent.intent, 'join', 'intention avant 0188');
  // Et rien, nulle part, ne mesure quoi que ce soit de cette personne.
  eq(await val("select to_regclass('public.crew_rules_2026') is null"), true, 'crew_rules_2026 absente');
  eq(await val("select to_regprocedure('public.crew_eligibility_2026(uuid)') is null"), true, 'crew_eligibility_2026 absente');
  eq(await val("select to_regprocedure('public.crew_apply_2026(uuid,text,integer)') is null"), true, 'crew_apply_2026 absente');
});

await t('étape 0 — `message` est TOUJOURS null : la seule voie d’écriture ne le pose pas', async () => {
  // Exactement ce que `crew_join_intent` (0083, l. 550) insérait : deux colonnes.
  await db.query('insert into public.crew_applications (crew_id, user_id) values ($1,$2)', [CREW, NEO]);
  await as(CAP);
  const seen = await val('select public.crew_join_requests()');
  eq(seen.ok, true, 'le capitaine lit ses demandes');
  eq(seen.requests.length, 1, 'une demande');
  eq(seen.requests[0].message, null, 'le message lu avant 0188');
  await db.exec('delete from public.crew_applications');
});

await t('étape 0 — aucune charte, aucune acceptation, aucune version', async () => {
  eq(await val("select to_regclass('public.crew_rule_acceptances_2026') is null"), true, 'acceptations absentes');
  eq(await val(`select count(*)::int from information_schema.columns
    where table_name = 'crew_applications' and column_name = 'charter_version'`), 0, 'colonne absente');
  eq(await val("select to_regprocedure('public.crew_accept_charter_2026(integer)') is null"), true, 'acceptation absente');
});

// ══════════════════════════════════════════════════════════════════════════
// 0188 S'APPLIQUE
// ══════════════════════════════════════════════════════════════════════════
await db.exec(readFileSync(join(MIGRATIONS, '0188_crew_rules_2026.sql'), 'utf8'));
console.log('\n  — 0188 appliquée —\n');

// ══════════════════════════════════════════════════════════════════════════
// 1. LES CONSTANTES NE DÉRIVENT PAS
// ══════════════════════════════════════════════════════════════════════════
await t('les constantes SQL sont celles de game-rules.ts, lues à la source', async () => {
  const pairs = [
    ['crew_charter_max_chars', 'CREW_CHARTER_MAX_CHARS'],
    ['crew_application_message_max', 'CREW_APPLICATION_MESSAGE_MAX'],
    ['crew_kick_note_max', 'CREW_KICK_NOTE_MAX'],
    ['crew_requirement_window_days', 'CREW_REQUIREMENT_WINDOW_DAYS'],
    ['crew_rejoin_after_kick_days', 'CREW_REJOIN_AFTER_KICK_DAYS'],
    ['crew_join_requests_per_day_max', 'CREW_JOIN_REQUESTS_PER_DAY_MAX'],
    ['crew_warning_grace_days', 'CREW_WARNING_GRACE_DAYS'],
    ['crew_name_hold_after_archive_days', 'CREW_NAME_HOLD_AFTER_ARCHIVE_DAYS'],
  ];
  for (const [fn, name] of pairs) {
    eq(await val(`select public.${fn}()`), constant(name), `${fn}() = ${name}`);
  }
});

await t('la courbe de niveau 2026 en SQL est le miroir EXACT de levelForXp2026', async () => {
  const { levelForXp2026, xpForLevel2026 } = await import(join(SHARED, 'progression2026.ts'))
    .catch(() => ({ levelForXp2026: null, xpForLevel2026: null }));
  // Le module TS n'est pas importable par Node sans transpilation : on rejoue
  // la formule du cahier (PROGRESSION_RULES_2026), y compris SUR LES SEUILS
  // EXACTS, là où un arrondi flottant ferait perdre un niveau.
  const xpFor = xpForLevel2026 ?? ((lvl) => 100 * (lvl - 1) + 10 * (lvl - 1) * (lvl - 2));
  const lvlFor = levelForXp2026 ?? ((xp) => {
    if (xp <= 0) return 1;
    let l = Math.floor((Math.sqrt(90 * 90 + 4 * 10 * xp) - 90) / 20) + 1;
    if (xpFor(l + 1) <= xp) l += 1;
    if (xpFor(l) > xp) l -= 1;
    return Math.max(l, 1);
  });
  for (let lvl = 1; lvl <= 40; lvl += 1) {
    const floor = xpFor(lvl);
    for (const xp of [floor, floor + 1, Math.max(0, floor - 1)]) {
      eq(await val('select public.progress_level_for_xp_2026($1)', [xp]), lvlFor(xp),
        `niveau pour ${xp} XP`);
    }
  }
  eq(await val('select public.progress_level_for_xp_2026(null)'), 1, 'aucun registre = niveau 1');
});

// ══════════════════════════════════════════════════════════════════════════
// 2. LA CHARTE ET LES RÈGLES
// ══════════════════════════════════════════════════════════════════════════
await t('un crew sans règle rend `{}` et une charte nulle — jamais une charte inventée', async () => {
  await as(MEM);
  const r = await val('select public.crew_rules_get_2026($1)', [CREW]);
  eq(r.ok, true, 'lecture ouverte à tout compte connecté');
  eq(r.charter, null, 'aucune charte');
  eq(r.charterVersion, 1, 'version 1 par défaut');
  eq(r.requirements, {}, 'aucune exigence');
  eq(r.enforcement, {}, 'aucune règle');
  eq(r.myAcceptedVersion, null, 'rien accepté');
});

await t('`crew_rules_set_2026` : le co_captain est refusé, le fondateur passe (changeSettings)', async () => {
  await as(OFF);
  eq((await val('select public.crew_rules_set_2026($1,$2,$3)', ['x', {}, {}])).reason, 'forbidden',
    'co_captain refusé');
  await as(MEM);
  eq((await val('select public.crew_rules_set_2026($1,$2,$3)', ['x', {}, {}])).reason, 'forbidden',
    'un runner ne règle rien non plus');
  await as(NEO);
  eq((await val('select public.crew_rules_set_2026($1,$2,$3)', ['x', {}, {}])).reason, 'no_crew',
    'sans crew, rien à régler');
});

await t('les six refus `bad_rules` sont NOMMÉS un par un', async () => {
  await as(CAP);
  const cases = [
    ['charter_too_long', ['a'.repeat(601), {}, {}]],
    ['unknown_requirement', [null, { min_streak: 3 }, {}]],
    ['unknown_enforcement', [null, {}, { max_absences: 3 }]],
    ['negative_requirement', [null, { min_level: -1 }, {}]],
    ['negative_enforcement', [null, {}, { min_weekly_outings: -2 }]],
    ['challenge_days_over_max', [null, {}, { min_challenge_days: 8 }]],
    ['unknown_city', [null, { city_id: 'insee-00000' }, {}]],
    ['unknown_activity', [null, { activity: 'swim' }, {}]],
    ['removal_without_warning', [null, {}, { auto_remove_after_days: 5 }]],
  ];
  for (const [detail, args] of cases) {
    const r = await val('select public.crew_rules_set_2026($1,$2,$3)', args);
    eq(r.reason, 'bad_rules', `${detail} → bad_rules`);
    eq(r.detail, detail, `détail ${detail}`);
  }
  // Le garde-fou ① passe dès que l'avertissement préalable existe.
  const armed = await val('select public.crew_rules_set_2026($1,$2,$3)',
    [null, {}, { max_inactivity_days: 20, auto_remove_after_days: 5 }]);
  eq(armed.ok, true, 'retrait armé AVEC avertissement préalable');
});

await t('la version de charte monte au TEXTE, jamais au seuil — et la PREMIÈRE est la 1', async () => {
  await as(CAP);
  // Le test précédent a déjà réglé des SEUILS : la ligne crew_rules_2026 existe
  // donc, sans aucune charte. C'est exactement le piège que charter_set_at
  // ferme — la première charte doit naître en version 1 quand même.
  ok(await val('select charter_set_at is null from public.crew_rules_2026 where crew_id = $1', [CREW]),
    'aucune charte n’a encore existé sur ce crew');
  const first = await val('select public.crew_rules_set_2026($1,$2,$3)',
    ['On court ensemble le mardi.', {}, {}]);
  eq(first.ok, true, 'première charte écrite');
  eq(first.charterVersion, 1, 'la PREMIÈRE charte est la version 1, pas la 2');
  eq(first.bumped, true, 'le texte a changé');

  const same = await val('select public.crew_rules_set_2026($1,$2,$3)',
    ['On court ensemble le mardi.', {}, { max_inactivity_days: 30 }]);
  eq(same.charterVersion, 1, 'un seuil ne fait pas monter la version');
  eq(same.bumped, false, 'aucun texte modifié');

  const next = await val('select public.crew_rules_set_2026($1,$2,$3)',
    ['On court ensemble le mardi et le samedi.', {}, {}]);
  eq(next.charterVersion, 2, 'le texte modifié fait monter la version');

  // Le fondateur qui écrit la charte l'a lue : son acceptation est écrite.
  eq(await val(`select count(*)::int from public.crew_rule_acceptances_2026
    where crew_id = $1 and user_id = $2 and charter_version = 2`, [CREW, CAP]), 1,
    'le fondateur a accepté sa propre charte');
});

await t('un changement de charte notifie les MEMBRES, une fois par version, jamais le fondateur', async () => {
  const rows = await q(`select user_id, payload->>'charterVersion' as v, payload->>'transactional' as tr
    from public.notifications where payload->>'event' = 'charter_updated' order by user_id, v`);
  // Deux versions écrites (1 puis 2), deux membres à prévenir : quatre lignes.
  eq(rows.length, 4, 'deux versions × deux membres');
  ok(rows.every((r) => r.user_id !== CAP), 'le fondateur n’est pas notifié de sa propre charte');
  eq(rows[0].tr, 'false', 'la charte n’est PAS transactionnelle (§14.1)');
  eq([...new Set(rows.map((r) => r.v))].sort(), ['1', '2'], 'une notification par version');
  // Réécrire le MÊME texte ne bouge rien : ni version, ni notification (§14.3).
  await as(CAP);
  const again = await val('select public.crew_rules_set_2026($1,$2,$3)',
    ['On court ensemble le mardi et le samedi.', {}, {}]);
  eq(again.bumped, false, 'même texte, aucune version de plus');
  eq(await val(`select count(*)::int from public.notifications where payload->>'event' = 'charter_updated'`), 4,
    'aucun doublon');
});

await t('`crew_accept_charter_2026` refuse une version périmée et écrit la bonne', async () => {
  await as(MEM);
  const current = (await val('select public.crew_rules_get_2026($1)', [CREW])).charterVersion;
  eq((await val('select public.crew_accept_charter_2026($1)', [current - 1])).reason, 'charter_stale',
    'version périmée');
  const good = await val('select public.crew_accept_charter_2026($1)', [current]);
  eq(good.ok, true, 'version courante acceptée');
  eq(await val(`select count(*)::int from public.crew_rule_acceptances_2026
    where crew_id = $1 and user_id = $2`, [CREW, MEM]), 1, 'acceptation horodatée');
  await as(NEO);
  eq((await val('select public.crew_accept_charter_2026($1)', [current])).reason, 'no_crew',
    'sans crew, rien à accepter');
});

// ══════════════════════════════════════════════════════════════════════════
// 3. L'ÉLIGIBILITÉ — « il te manque … »
// ══════════════════════════════════════════════════════════════════════════
await t('chaque critère manquant est rendu avec son `need`, son `have` et son unité', async () => {
  await as(CAP);
  const set = await val('select public.crew_rules_set_2026($1,$2,$3)', [
    'On court ensemble le mardi et le samedi.',
    { min_level: 4, min_distance_km_28d: 30, min_active_days_28d: 3,
      city_id: CITY, activity: 'run' },
    {},
  ]);
  eq(set.ok, true, 'exigences écrites');

  await as(NEO);   // aucun registre, aucune course, bonne ville
  const nope = await val('select public.crew_eligibility_2026($1)', [CREW]);
  eq(nope.ok, true, 'la vérification répond');
  eq(nope.eligible, false, 'non éligible');
  eq(nope.invitesBypass, true, 'la porte humaine est DITE');
  eq(nope.charterRequired, true, 'la charte doit être acceptée');
  const byKey = Object.fromEntries(nope.missing.map((m) => [m.key, m]));
  eq(Object.keys(byKey).sort(), ['activity', 'min_active_days_28d', 'min_distance_km_28d', 'min_level'],
    'quatre critères manquent, la ville est bonne');
  eq(byKey.min_level.need, 4, 'niveau requis');
  eq(byKey.min_level.have, 1, 'niveau réel');
  eq(byKey.min_level.unit, 'level', 'unité');
  eq(byKey.min_distance_km_28d.have, 0, 'aucun kilomètre');
  eq(byKey.min_distance_km_28d.unit, 'km', 'unité km');
  eq(byKey.activity.need, 'run', 'discipline demandée');
  eq(byKey.activity.have, [], 'aucune boucle publiée');

  await as(PRO);   // 1000 XP, 33 km utiles, 3 journées, bonne ville, run publié
  const yes = await val('select public.crew_eligibility_2026($1)', [CREW]);
  eq(yes.eligible, true, 'éligible sur des faits réels');
  eq(yes.missing, [], 'rien ne manque');
});

await t('la course rejetée et celle hors fenêtre ne comptent pas dans la mesure', async () => {
  const m = await val('select public.crew_member_measures_2026($1, now())', [PRO]);
  // 12 + 11 + 10 = 33 km : ni les 90 km rejetés, ni les 50 km d'il y a 40 jours.
  eq(Number(m.distanceKm28d), 33, 'distance sur 28 jours, sorties valides seulement');
  eq(m.activeDays28d, 3, 'trois journées distinctes');
  eq(m.activities, ['run'], 'discipline pratiquée');
});

await t('le capitaine ne reçoit JAMAIS le détail de ce qui manque à quelqu’un', async () => {
  // `crew_eligibility_2026` mesure TOUJOURS l'appelant : le capitaine qui la
  // vise n'obtient que ses propres chiffres, jamais ceux d'un candidat.
  await as(CAP);
  const mine = await val('select public.crew_eligibility_2026($1)', [CREW]);
  const capMeasures = await val('select public.crew_member_measures_2026($1, now())', [CAP]);
  eq(mine.missing.some((m) => m.key === 'min_distance_km_28d'
    && Number(m.have) === Number(capMeasures.distanceKm28d)), true,
    'ce sont les mesures de l’appelant, pas celles d’un tiers');
});

// ══════════════════════════════════════════════════════════════════════════
// 4. `crew_apply_2026` — LES REFUS NOMMÉS, PUIS LE MESSAGE ÉCRIT
// ══════════════════════════════════════════════════════════════════════════
await t('les refus nommés, dans l’ordre du contrat', async () => {
  await as(null);
  eq((await val('select public.crew_apply_2026($1,$2,$3)', [CREW, null, null])).reason, 'signed_out', 'signed_out');
  await as(NEO);
  eq((await val('select public.crew_apply_2026($1,$2,$3)',
    ['aaaaaaaa-0000-0000-0000-0000000000ff', null, null])).reason, 'not_found', 'not_found');
  eq((await val('select public.crew_apply_2026($1,$2,$3)', [DEAD, null, null])).reason, 'dead_crew', 'dead_crew');
  eq((await val('select public.crew_apply_2026($1,$2,$3)', [SHUT, null, null])).reason, 'closed', 'invite_only → closed');
  const long = await val('select public.crew_apply_2026($1,$2,$3)', [CREW, 'z'.repeat(281), null]);
  eq(long.reason, 'bad_message', 'message trop long');
  eq(long.max, constant('CREW_APPLICATION_MESSAGE_MAX'), 'la borne est celle de game-rules');
  const version = (await val('select public.crew_rules_get_2026($1)', [CREW])).charterVersion;
  eq((await val('select public.crew_apply_2026($1,$2,$3)', [CREW, 'bonjour', version])).reason, 'not_eligible',
    'exigences non satisfaites');
  await as(MEM);
  eq((await val('select public.crew_apply_2026($1,$2,$3)', [OPEN, null, null])).reason, 'already_in_crew',
    'déjà dans un autre crew');
  await as(PRO);
  eq((await val('select public.crew_apply_2026($1,$2,$3)', [CREW, 'bonjour', version - 1])).reason,
    'charter_stale', 'version de charte périmée');
});

await t('le message EST écrit, et `crew_join_requests` (0083, inchangée) le lit enfin', async () => {
  await as(PRO);
  const version = (await val('select public.crew_rules_get_2026($1)', [CREW])).charterVersion;
  const applied = await val('select public.crew_apply_2026($1,$2,$3)',
    [CREW, 'Je cours le mardi soir, je viens du club des Quais.', version]);
  eq(applied.ok, true, 'candidature acceptée');
  eq(applied.effect, 'applied', 'candidature, pas adhésion (on_request)');

  await as(CAP);
  const seen = await val('select public.crew_join_requests()');
  eq(seen.requests.length, 1, 'une demande');
  eq(seen.requests[0].message, 'Je cours le mardi soir, je viens du club des Quais.',
    'LE TROU ① EST BOUCHÉ : le capitaine lit le message');
  eq(await val('select charter_version from public.crew_applications where user_id = $1', [PRO]), version,
    'la version de charte acceptée est conservée avec la candidature');
});

await t('une candidature en attente refuse la suivante (`pending`)', async () => {
  await as(PRO);
  const version = (await val('select public.crew_rules_get_2026($1)', [CREW])).charterVersion;
  eq((await val('select public.crew_apply_2026($1,$2,$3)', [CREW, 'encore moi', version])).reason,
    'pending', 'pending');
});

await t('la candidature notifie les OFFICIERS, et personne d’autre', async () => {
  const rows = await q(`select user_id from public.notifications
    where payload->>'event' = 'application_received' order by user_id`);
  eq(rows.map((r) => r.user_id).sort(), [CAP, OFF].sort(), 'fondateur et co_captain seulement');
});

await t('le plafond quotidien de candidatures est appliqué (`rate_limited`)', async () => {
  const MAX = constant('CREW_JOIN_REQUESTS_PER_DAY_MAX');
  // Des candidatures déjà tranchées comptent aussi : le plafond vise la RAFALE,
  // pas le nombre de dossiers ouverts.
  for (let i = 0; i < MAX; i += 1) {
    await db.query(`insert into public.crew_applications (crew_id, user_id, status, created_at)
      values ($1, $2, 'rejected', now() - interval '1 hour')`, [ELSE, SPM]);
  }
  await as(SPM);
  const version = (await val('select public.crew_rules_get_2026($1)', [CREW])).charterVersion;
  const r = await val('select public.crew_apply_2026($1,$2,$3)', [CREW, null, version]);
  eq(r.reason, 'rate_limited', 'rate_limited');
  eq(r.max, MAX, 'la borne est celle de game-rules');
  await db.query('delete from public.crew_applications where user_id = $1', [SPM]);
});

await t('un crew OUVERT fait entrer tout de suite, et l’acceptation de charte est écrite dans la même transaction', async () => {
  // Une charte sur le crew OUVERT, posée par SON fondateur.
  await as(OWN);
  const set = await val('select public.crew_rules_set_2026($1,$2,$3)', ['Ici on court lentement.', {}, {}]);
  eq(set.ok, true, 'charte du crew ouvert');

  await as(NEO);
  eq((await val('select public.crew_apply_2026($1,$2,$3)', [OPEN, null, null])).reason, 'charter_stale',
    'un crew ouvert exige quand même sa charte');
  const joined = await val('select public.crew_apply_2026($1,$2,$3)', [OPEN, null, set.charterVersion]);
  eq(joined.ok, true, 'entrée immédiate');
  eq(joined.effect, 'joined', 'joined');
  eq(await val(`select role from public.crew_members
    where crew_id = $1 and user_id = $2 and left_at is null`, [OPEN, NEO]), 'rookie',
    'entrée au rôle d’essai (CREW_ENTRY_ROLE)');
  eq(await val(`select count(*)::int from public.crew_rule_acceptances_2026
    where crew_id = $1 and user_id = $2`, [OPEN, NEO]), 1, 'charte acceptée dans la même transaction');
  // Rejouer = idempotent, jamais une erreur.
  eq((await val('select public.crew_apply_2026($1,$2,$3)', [OPEN, null, set.charterVersion])).effect, 'joined',
    'idempotent');
});

// ══════════════════════════════════════════════════════════════════════════
// 5. LES DEUX DÉLAIS — celui du nomade, celui de l'exclu
// ══════════════════════════════════════════════════════════════════════════
await t('le délai de re-adhésion vise le MÊME crew, 30 jours, et pas un autre', async () => {
  const DAYS = constant('CREW_REJOIN_AFTER_KICK_DAYS');
  // FAY a été exclue du crew A il y a 3 jours (removed_by renseigné : 0093).
  await db.query(`insert into public.crew_members (crew_id,user_id,role,joined_at,left_at,removed_by)
    values ($1,$2,'runner', now() - interval '40 days', now() - interval '3 days', $3)`, [CREW, EXC, CAP]);

  await as(EXC);
  const version = (await val('select public.crew_rules_get_2026($1)', [CREW])).charterVersion;
  const same = await val('select public.crew_apply_2026($1,$2,$3)', [CREW, 'je reviens', version]);
  eq(same.reason, 'cooldown', 'refusée au MÊME crew');
  ok(same.rejoinAllowedAt != null, 'la date de re-adhésion est DITE');
  ok(same.daysLeft > DAYS - 4 && same.daysLeft <= DAYS, `il reste ~${DAYS - 3} jours`);

  // AILLEURS : acceptée le jour même. C'est la doctrine de 0093 — l'exclusion
  // ne doit pas devenir une arme de blocage.
  await as(EXC);
  const rules = await val('select public.crew_rules_get_2026($1)', [ELSE]);
  const other = await val('select public.crew_apply_2026($1,$2,$3)', [ELSE, null, rules.charterVersion]);
  eq(other.ok, true, 'acceptée ailleurs le jour même');
  eq(other.effect, 'joined', 'le crew ELSE est ouvert');
  await db.query(`update public.crew_members set left_at = now(), removed_by = null
    where crew_id = $1 and user_id = $2 and left_at is null`, [ELSE, EXC]);
});

await t('le délai de 7 jours vise le départ VOLONTAIRE, jamais l’exclusion ni le retrait serveur', async () => {
  await db.query(`insert into public.crew_members (crew_id,user_id,role,joined_at,left_at)
    values ($1,$2,'runner', now() - interval '40 days', now() - interval '2 days')`, [ELSE, NOM]);
  await as(NOM);
  const version = (await val('select public.crew_rules_get_2026($1)', [CREW])).charterVersion;
  const r = await val('select public.crew_apply_2026($1,$2,$3)', [CREW, null, version]);
  eq(r.reason, 'cooldown', 'le nomade attend');
  ok(r.rejoinAllowedAt === undefined, 'c’est le délai GLOBAL, pas celui de re-adhésion');

  // Le même départ, mais décidé par le SERVEUR : plus de délai global.
  await db.query(`update public.crew_members set removed_by_server = true
    where crew_id = $1 and user_id = $2 and left_at is not null`, [ELSE, NOM]);
  const after = await val('select public.crew_apply_2026($1,$2,$3)', [CREW, 'me revoilà', version]);
  eq(after.reason, 'not_eligible', 'le délai a sauté ; il reste les exigences du crew');
});

// ══════════════════════════════════════════════════════════════════════════
// 6. PRIVILÈGES
// ══════════════════════════════════════════════════════════════════════════
await t('`anon` n’appelle AUCUNE des RPC de 0188 ; `authenticated` garde les cinq lectures d’écran', async () => {
  const client = ['crew_rules_get_2026(uuid)', 'crew_rules_set_2026(text,jsonb,jsonb)',
    'crew_eligibility_2026(uuid)', 'crew_apply_2026(uuid,text,integer)',
    'crew_accept_charter_2026(integer)'];
  for (const sig of client) {
    eq(await val("select has_function_privilege('anon',$1,'EXECUTE')", [sig]), false, `anon n’a pas ${sig}`);
    eq(await val("select has_function_privilege('authenticated',$1,'EXECUTE')", [sig]), true,
      `authenticated garde ${sig}`);
  }
  const internal = ['crew_member_measures_2026(uuid,timestamptz)',
    'crew_missing_requirements_2026(jsonb,jsonb)',
    'crew_notify_2026(uuid,text,uuid,text,jsonb,timestamptz)',
    'progress_level_for_xp_2026(bigint)', 'crew_charter_max_chars()'];
  for (const sig of internal) {
    for (const role of ['anon', 'authenticated']) {
      eq(await val('select has_function_privilege($1,$2,\'EXECUTE\')', [role, sig]), false,
        `${role} n’appelle pas ${sig}`);
    }
    eq(await val("select has_function_privilege('service_role',$1,'EXECUTE')", [sig]), true,
      `service_role garde ${sig}`);
  }
});

await t('les trois tables neuves sont fermées aux rôles clients et portent la RLS', async () => {
  for (const table of ['crew_rules_2026', 'crew_rule_acceptances_2026', 'crew_decisions_2026']) {
    eq(await val(`select relrowsecurity from pg_class where oid = 'public.${table}'::regclass`), true,
      `RLS activée sur ${table}`);
    for (const role of ['anon', 'authenticated']) {
      for (const priv of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
        eq(await val('select has_table_privilege($1,$2,$3)', [role, `public.${table}`, priv]), false,
          `${role} n’a pas ${priv} sur ${table}`);
      }
    }
    eq(await val('select has_table_privilege($1,$2,$3)', ['service_role', `public.${table}`, 'SELECT']), true,
      `service_role lit ${table}`);
  }
});

await t('le catalogue de notifications SQL est le miroir EXACT de CREW_NOTIFICATION_EVENTS_2026', async () => {
  // Lu À LA SOURCE : SQL ne peut pas importer TypeScript, la dérive se teste.
  const block = /export const CREW_NOTIFICATION_EVENTS_2026 = \{([\s\S]*?)\n\} as const;/.exec(RULES);
  if (block === null) {
    throw new Error('CREW_NOTIFICATION_EVENTS_2026 introuvable dans game-rules.ts');
  }
  const entries = [...block[1].matchAll(
    /^ {2}(\w+): \{[\s\S]*?category: '(\w+)', transactional: (true|false), priority: (\d+),[\s\S]*?eventIdPrefix: '([^']+)',/gm)];
  ok(entries.length >= 6, `au moins six événements (obtenu ${entries.length})`);
  for (const [, key, category, transactional, priority, prefix] of entries) {
    const sql = await val('select public.crew_notification_event_2026($1)', [key]);
    ok(sql !== null, `${key} existe côté SQL`);
    eq(sql.transactional, transactional === 'true', `${key}.transactional`);
    eq(sql.priority, Number(priority), `${key}.priority`);
    eq(sql.prefix, prefix, `${key}.eventIdPrefix`);
    eq(category, 'crew', `${key} est dans la catégorie crew de NOTIFICATION_RULES_2026`);
  }
  // Un événement HORS catalogue lève : une notification de crew que personne
  // n'a réglée dans ses préférences ne doit pas pouvoir être écrite.
  eq(await val("select public.crew_notification_event_2026('achete_gryd_plus') is null"), true,
    'hors catalogue = null');
  // Un événement DU catalogue passe sans lever…
  await db.query('select public.crew_notify_2026($1,$2,$3,$4)', [CAP, 'charter_updated', CREW, 'x']);
  // …et un événement hors catalogue lève.
  let raised = false;
  try {
    await db.query('select public.crew_notify_2026($1,$2,$3,$4)', [CAP, 'achete_gryd_plus', CREW, 'y']);
  } catch { raised = true; }
  eq(raised, true, 'crew_notify_2026 LÈVE sur un événement inconnu');
  // Et AUCUNE valeur de NOTIFICATION_RULES_2026 n'est touchée par ce lot.
  ok(/maximumNonTransactionalPerWeek: 3/.test(RULES), 'le budget hebdomadaire est intact');
  ok(/categories: \['sport', 'crew', 'events', 'results', 'weekly', 'offers'\]/.test(RULES),
    'les six catégories de §14.1 sont intactes');
});

await t('la boîte de réception dédoublonne par `event_id`, et le journal garde qui a décidé', async () => {
  eq(await val(`select count(*)::int from pg_indexes
    where indexname = 'notifications_user_event_unique'`), 1, 'unique partielle posée');
  const kinds = await q(`select kind, count(*)::int as n from public.crew_decisions_2026 group by kind order by kind`);
  const byKind = Object.fromEntries(kinds.map((k) => [k.kind, k.n]));
  ok(byKind.charter >= 1, 'les changements de charte sont journalisés');
  ok(byKind.application >= 1, 'les candidatures sont journalisées');
  eq(await val(`select count(*)::int from public.crew_decisions_2026 where actor_id is null`), 0,
    'aucune décision sans auteur à ce stade : le serveur ne décide rien en 0188');
});

console.log(`\n${passed} vérifications passées, ${failures.length} échec(s).`);
console.log('RLS non prouvée (PGlite = superutilisateur) · aucune géométrie lue (pas de PostGIS).\n');
await db.close();
process.exit(failures.length === 0 ? 0 : 1);
