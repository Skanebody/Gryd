/**
 * GRYD — 0193 : LES FAITS DU JEU ARRIVENT À QUELQU'UN.
 *
 * ═══ ÉTAPE 0 — LE DÉFAUT EXISTAIT, ET IL EST REJOUÉ ════════════════════════
 * Avant d'exécuter une ligne de 0193, ce fichier joue les SEPT faits sur le
 * socle 0192 seul, et vérifie qu'aucun ne laisse la moindre trace :
 *   0a. une capture PUBLIÉE ne produit AUCUNE ligne de réception ;
 *   0b. un nouveau membre de crew non plus ;
 *   0c. ni une sortie proposée, ni son annulation ;
 *   0d. ni une annonce, ni un défi clos, ni une quête accomplie, ni une
 *       récompense de niveau.
 * Sans cette étape, rien ne distinguerait 0193 d'un no-op — et les tables
 * seraient déjà pleines quand les triggers arrivent.
 *
 * ═══ CE QUE CE TEST PROUVE ═════════════════════════════════════════════════
 *  1. 0193 s'applique sur un vrai Postgres, tel quel ;
 *  2. UN producteur par fait, chacun sur le bon destinataire ;
 *  3. UNE SEULE LIGNE PAR SORTIE, pas par face : quatre faces publiées d'une
 *     même boucle n'écrivent qu'un message ;
 *  4. la création d'un crew n'est pas une arrivée (personne n'est prévenu) ;
 *  5. un changement de rendez-vous ne va QU'AUX INSCRITS ;
 *  6. le budget §14.1 n'est JAMAIS consommé par un producteur ;
 *  7. la déduplication par `event_id` tient sur des passages répétés ;
 *  8. ce qui ne produit rien : une quête expirée, un défi annulé, une
 *     publication intermédiaire, une annonce retirée.
 *
 * ═══ CE QU'IL NE PROUVE PAS ════════════════════════════════════════════════
 *  · LA GÉOMÉTRIE : PGlite n'a pas PostGIS. `capture_events_2026` est ici un
 *    socle NON SPATIAL, aux colonnes que 0193 lit — et 0193 n'en lit aucune
 *    géométrie, c'est délibéré (aucune surface dans un message).
 *  · L'EFFET RÉEL DE LA RLS : PGlite tourne en SUPERUTILISATEUR.
 *
 * ═══ LANCER ════════════════════════════════════════════════════════════════
 *   node supabase/tests/notification_producers_2026.pglite.test.mjs
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
  try { await fn(); passed += 1; console.log(`  ok   ${name}`); }
  catch (err) { failures.push({ name, err }); console.log(`  FAIL ${name}\n       ${err.message}`); }
};
const eq = (actual, expected, what) => {
  const a = JSON.stringify(actual); const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${what} : attendu ${e}, obtenu ${a}`);
};
const ok = (cond, what) => { if (!cond) throw new Error(what); };

const db = new PGlite();
const q = async (sql, args = []) => (await db.query(sql, args)).rows;
const val = async (sql, args = []) => Object.values((await q(sql, args))[0])[0];

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

const U = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const CAP = U(1);   // fondateur du crew
const MEM = U(2);   // membre déjà là
const NEO = U(3);   // le nouvel arrivant
const SOLO = U(4);  // sans crew
const CREW = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const CREW2 = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const RUN = 'rrrrrrrr-rrrr-rrrr-rrrr-rrrrrrrrrrrr'.replace(/r/g, '1');
const DEFI = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

/** Les lignes de réception d'un compte, par fait. */
const faits = async (user) =>
  (await q(`select payload->>'event' as kind, event_id, payload
              from public.notifications where user_id=$1 order by created_at, event_id`, [user]))
    .map((r) => r.kind);
const compte = async (user) =>
  Number(await val(`select count(*) from public.notifications where user_id=$1`, [user]));

/**
 * ATTENDRE QUE L'HORLOGE AVANCE — 12/09/2026, correction d'un vert au hasard.
 *
 * `faits()` trie par `created_at, event_id`. Quand deux écritures tombent sur le
 * MÊME `now()` (PGlite a une horloge à la milliseconde et trois `update`
 * consécutifs peuvent y tenir), le départage se fait sur `event_id`, qui est
 * ALPHABÉTIQUE et n'a rien de chronologique : `capture_published:` passait alors
 * devant `result_ready:` et l'assertion d'ordre échouait. Une fois sur deux.
 *
 * Ce n'est pas un défaut du schéma : c'est le test qui affirmait une CHRONOLOGIE
 * sans en créer une. Trois millisecondes entre deux changements d'état la
 * rendent réelle, et l'assertion redevient une assertion.
 */
const attendreUneMs = () => new Promise((resolve) => setTimeout(resolve, 3));

try {
  // ─── Socle : les colonnes que 0193 LIT, aux noms des migrations réelles ──
  await db.exec(`
    set time zone 'UTC';
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
    create table public.users (id uuid primary key, deletion_requested_at timestamptz);
    create table public.user_profiles (
      user_id uuid primary key references public.users(id) on delete cascade,
      handle text, display_name text);
    create table public.crews (id uuid primary key, name text not null);
    -- 0093 : la clé porte joined_at, et un seul membre ACTIF par personne.
    create table public.crew_members (
      crew_id uuid not null references public.crews(id) on delete cascade,
      user_id uuid not null references public.users(id) on delete cascade,
      role text not null default 'rookie', joined_at timestamptz not null default now(),
      left_at timestamptz, removed_by uuid,
      primary key (crew_id, user_id, joined_at));
    -- 0019 + 0085 + 0124 : la sortie de crew, telle que 0193 la trouve.
    create table public.crew_events (
      id uuid primary key default gen_random_uuid(),
      crew_id uuid not null references public.crews(id) on delete cascade,
      title text not null, when_label text not null default '', place_label text not null default '',
      zone_label text not null default '', objective text not null default 'conquete',
      created_by uuid not null references public.users(id) on delete cascade,
      created_at timestamptz not null default now(),
      starts_at timestamptz, activity text, capacity integer,
      cancelled_at_2026 timestamptz, revision_2026 integer not null default 1);
    create table public.crew_event_rsvps (
      event_id uuid not null references public.crew_events(id) on delete cascade,
      user_id uuid not null references public.users(id) on delete cascade,
      choice text not null check (choice in ('coming','maybe','no')),
      updated_at timestamptz not null default now(),
      primary key (event_id, user_id));
    create table public.crew_announcements (
      id uuid primary key default gen_random_uuid(),
      crew_id uuid not null references public.crews(id) on delete cascade,
      author_id uuid not null references public.users(id) on delete cascade,
      body text not null, created_at timestamptz not null default now(),
      removed_at timestamptz, removed_by uuid);
    -- 0122 SANS géométrie : 0193 ne lit aucune colonne spatiale.
    create table public.crew_challenges_2026 (
      id uuid primary key default gen_random_uuid(), title text not null,
      activity text not null default 'run',
      status text not null default 'invited'
        check (status in ('invited','assembling','scheduled','active','final','cancelled')),
      reason text);
    create table public.challenge_roster_2026 (
      challenge_id uuid not null references public.crew_challenges_2026(id) on delete cascade,
      crew_id uuid not null, player_id uuid not null references public.users(id) on delete cascade,
      reserved boolean not null default true, consent boolean not null default true,
      primary key (challenge_id, player_id));
    create table public.weekly_quest_assignments_2026 (
      user_id uuid not null references public.users(id) on delete cascade,
      week_start date not null, activity text not null, quest_id text not null,
      status text not null default 'active' check (status in ('active','completed','expired')),
      completed_at timestamptz,
      primary key (user_id, week_start, activity, quest_id),
      check ((status='completed') = (completed_at is not null)));
    create table public.level_reward_templates_2026 (
      reward_id text primary key, level integer not null unique);
    create table public.level_reward_ownership_2026 (
      user_id uuid not null references public.users(id) on delete cascade,
      reward_id text not null references public.level_reward_templates_2026(reward_id),
      earned_at timestamptz not null default now(), ledger_version bigint not null default 0,
      primary key (user_id, reward_id));
    -- 0118/0155 SANS géométrie : une ligne par FACE, c'est tout ce qui compte ici.
    create table public.capture_events_2026 (
      id uuid primary key default gen_random_uuid(), run_id uuid, owner_id uuid,
      activity text not null default 'run', face_key text not null default '0:0',
      closed_at timestamptz not null default now(), status text not null, reason text);
  `);
  await db.exec(slice('0119_refonte_2026_progress_ledger.sql',
    'create table public.progress_accounts_2026', ');') + ');');
  await db.exec(slice('0006_notifications.sql',
    'create table public.notifications (', '-- ─── push_log'));
  await db.exec('alter table public.notifications enable row level security;');
  await db.exec(slice('0006_notifications.sql',
    'revoke insert, update, delete on public.notifications', '-- push_log : interne'));
  await db.exec(slice('0188_crew_rules_2026.sql',
    'alter table public.notifications\n  add column if not exists event_id text;',
    'create or replace function public.crew_notification_event_2026'));
  await db.exec(readFileSync(join(MIGRATIONS, '0140_notification_preferences_2026.sql'), 'utf8'));
  await db.exec(readFileSync(join(MIGRATIONS, '0141_notification_engine_2026.sql'), 'utf8'));
  await db.exec(readFileSync(join(MIGRATIONS, '0192_notification_inbox_2026.sql'), 'utf8'));

  await db.exec(`
    insert into public.users(id) values ('${CAP}'),('${MEM}'),('${NEO}'),('${SOLO}');
    insert into public.user_profiles(user_id, handle, display_name)
      values ('${NEO}','lea','Léa'), ('${CAP}','cap','Cap');
    insert into public.crews(id,name) values ('${CREW}','Les Foulées du Canal'),('${CREW2}','Test');
    insert into public.crew_members(crew_id,user_id,role) values ('${CREW}','${CAP}','founder');
    insert into public.crew_members(crew_id,user_id,role) values ('${CREW}','${MEM}','rookie');
    insert into public.level_reward_templates_2026(reward_id,level) values ('first_trace',2);
    insert into public.crew_challenges_2026(id,title,status)
      values ('${DEFI}','Le Quai contre la Colline','scheduled');
    insert into public.challenge_roster_2026(challenge_id,crew_id,player_id)
      values ('${DEFI}','${CREW}','${CAP}'), ('${DEFI}','${CREW}','${MEM}');
  `);

  console.log('\n── ÉTAPE 0 : le défaut existait ──');

  await t('0a — une capture PUBLIÉE ne produit AUCUNE ligne de réception', async () => {
    await db.query(`insert into public.capture_events_2026(run_id,owner_id,status)
                    values ($1,$2,'scheduled')`, [RUN, CAP]);
    await db.query(`update public.capture_events_2026 set status='published' where run_id=$1`, [RUN]);
    eq(await compte(CAP), 0, 'le terrain est publié et personne ne l’apprend');
  });

  await t('0b — un nouveau membre ne produit AUCUNE ligne', async () => {
    await db.query(`insert into public.crew_members(crew_id,user_id,role)
                    values ($1,$2,'rookie')`, [CREW, NEO]);
    eq(await compte(NEO) + await compte(CAP) + await compte(MEM), 0, 'personne n’est prévenu');
  });

  await t('0c — sortie proposée puis annulée : rien non plus', async () => {
    const id = await val(`insert into public.crew_events(crew_id,title,created_by,starts_at,activity)
      values ($1,'Boucle du dimanche',$2,now()+interval '2 days','run') returning id`, [CREW, CAP]);
    await db.query(`insert into public.crew_event_rsvps(event_id,user_id,choice)
                    values ($1,$2,'coming')`, [id, MEM]);
    await db.query(`update public.crew_events set cancelled_at_2026=now(),
                    revision_2026=revision_2026+1 where id=$1`, [id]);
    eq(await compte(MEM), 0, 'un rendez-vous annulé reste muet');
  });

  await t('0d — annonce, défi clos, quête accomplie, récompense : rien', async () => {
    await db.query(`insert into public.crew_announcements(crew_id,author_id,body)
                    values ($1,$2,'Rendez-vous samedi.')`, [CREW, CAP]);
    await db.query(`update public.crew_challenges_2026 set status='final' where id=$1`, [DEFI]);
    await db.query(`insert into public.weekly_quest_assignments_2026(user_id,week_start,activity,quest_id)
                    values ($1,'2026-09-07','run','explore_new')`, [SOLO]);
    await db.query(`update public.weekly_quest_assignments_2026
                    set status='completed', completed_at=now() where user_id=$1`, [SOLO]);
    await db.query(`insert into public.level_reward_ownership_2026(user_id,reward_id)
                    values ($1,'first_trace')`, [SOLO]);
    eq(await compte(SOLO) + await compte(MEM) + await compte(CAP), 0, 'quatre faits, zéro message');
  });

  // Table rase : les faits de l'étape 0 ne doivent pas polluer les mesures.
  await db.exec(`delete from public.notifications;
    delete from public.capture_events_2026; delete from public.crew_event_rsvps;
    delete from public.crew_events; delete from public.crew_announcements;
    delete from public.weekly_quest_assignments_2026; delete from public.level_reward_ownership_2026;
    delete from public.crew_members where user_id='${NEO}';
    update public.crew_challenges_2026 set status='scheduled' where id='${DEFI}';`);

  // ─── 0193 ───────────────────────────────────────────────────────────────
  await db.exec(readFileSync(join(MIGRATIONS, '0193_notification_producers_2026.sql'), 'utf8'));

  console.log('\n── LA SORTIE ──');

  await t('vérification en cours, puis terminée, puis terrain publié', async () => {
    await db.query(`insert into public.capture_events_2026(run_id,owner_id,status,reason)
                    values ($1,$2,'pending','verification_required')`, [RUN, SOLO]);
    eq(await faits(SOLO), ['result_pending'], 'la sortie part en vérification');
    await attendreUneMs();
    await db.query(`update public.capture_events_2026 set status='scheduled', reason=null
                    where run_id=$1`, [RUN]);
    eq(await faits(SOLO), ['result_pending', 'result_ready'], 'la vérification est terminée');
    await attendreUneMs();
    await db.query(`update public.capture_events_2026 set status='published' where run_id=$1`, [RUN]);
    eq(await faits(SOLO), ['result_pending', 'result_ready', 'capture_published'],
      'le terrain est publié');
  });

  await t('UNE ligne par SORTIE, pas par face : quatre faces, un message', async () => {
    const run2 = U(77);
    await db.query(`insert into public.capture_events_2026(run_id,owner_id,status,face_key)
      values ($1,$2,'scheduled','0:0'),($1,$2,'scheduled','0:1'),
             ($1,$2,'scheduled','1:0'),($1,$2,'scheduled','1:1')`, [run2, MEM]);
    await db.query(`update public.capture_events_2026 set status='published' where run_id=$1`, [run2]);
    eq(await faits(MEM), ['capture_published'], 'quatre faces publiées, un seul message');
  });

  await t('le message ne porte AUCUNE surface, et ouvre la sortie', async () => {
    const p = await val(`select payload from public.notifications
                          where user_id=$1 and payload->>'event'='capture_published'`, [MEM]);
    eq(Object.keys(p).sort(), ['activity', 'event', 'runId', 'transactional'],
      'le payload dit le fait et rien de plus');
    eq(await val(`select notification_deep_link_2026('capture_published', payload)
                    from public.notifications where user_id=$1`, [MEM]),
      `/course/${U(77)}`, 'et il ouvre la sortie');
  });

  await t('une sortie refusée le dit, sans dire le soupçon', async () => {
    const run3 = U(78);
    await db.query(`insert into public.capture_events_2026(run_id,owner_id,status)
                    values ($1,$2,'pending')`, [run3, SOLO]);
    await db.query(`update public.capture_events_2026 set status='rejected' where run_id=$1`, [run3]);
    const p = await val(`select payload from public.notifications
                          where user_id=$1 and payload->>'event'='result_refused'`, [SOLO]);
    ok(p !== undefined && p !== null, 'le refus est dit');
    eq(p.reason, undefined, 'aucune raison de soupçon dans le message');
  });

  console.log('\n── LE CREW ──');

  await t('un nouveau membre : « tu as rejoint » à lui, le fait aux autres', async () => {
    await db.query(`insert into public.crew_members(crew_id,user_id,role)
                    values ($1,$2,'rookie')`, [CREW, NEO]);
    eq(await faits(NEO), ['crew_joined'], 'au nouvel arrivant');
    ok((await faits(CAP)).includes('crew_member_joined'), 'au fondateur');
    ok((await faits(MEM)).includes('crew_member_joined'), 'au membre');
    const p = await val(`select payload from public.notifications
                          where user_id=$1 and payload->>'event'='crew_member_joined'`, [CAP]);
    eq(p.handle, 'Léa', 'le nom du nouvel arrivant voyage');
    eq(p.crewName, 'Les Foulées du Canal', 'et celui du crew');
  });

  await t('créer un crew n’est PAS une arrivée : personne n’est prévenu', async () => {
    const avant = await compte(SOLO);
    await db.query(`insert into public.crew_members(crew_id,user_id,role)
                    values ($1,$2,'founder')`, [CREW2, SOLO]);
    eq(await compte(SOLO), avant, 'le fondateur d’un crew vide ne reçoit rien');
  });

  await t('une sortie proposée va aux membres, jamais à l’hôte', async () => {
    const id = await val(`insert into public.crew_events(crew_id,title,created_by,starts_at,activity)
      values ($1,'Boucle du dimanche',$2,now()+interval '2 days','run') returning id`, [CREW, CAP]);
    ok((await faits(MEM)).includes('crew_outing_proposed'), 'au membre');
    ok((await faits(NEO)).includes('crew_outing_proposed'), 'au nouvel arrivant');
    eq((await faits(CAP)).includes('crew_outing_proposed'), false, 'jamais à qui l’a proposée');
    return id;
  });

  await t('un changement ne va QU’AUX INSCRITS', async () => {
    const id = await val(`select id from public.crew_events where crew_id=$1
                           order by created_at desc limit 1`, [CREW]);
    await db.query(`insert into public.crew_event_rsvps(event_id,user_id,choice)
                    values ($1,$2,'coming')`, [id, MEM]);
    await db.query(`update public.crew_events set starts_at=starts_at+interval '1 hour',
                    revision_2026=revision_2026+1 where id=$1`, [id]);
    ok((await faits(MEM)).includes('crew_outing_changed'), 'à l’inscrit');
    eq((await faits(NEO)).includes('crew_outing_changed'), false,
      'jamais à qui ne s’est pas inscrit');
  });

  await t('une annulation atteint les inscrits AVANT que les RSVP disparaissent', async () => {
    const id = await val(`select id from public.crew_events where crew_id=$1
                           order by created_at desc limit 1`, [CREW]);
    await db.query(`update public.crew_events set cancelled_at_2026=now(),
                    revision_2026=revision_2026+1 where id=$1`, [id]);
    await db.query(`delete from public.crew_event_rsvps where event_id=$1`, [id]);
    ok((await faits(MEM)).includes('crew_outing_cancelled'), 'l’inscrit est prévenu');
  });

  await t('le lieu n’entre JAMAIS dans le payload d’un rendez-vous', async () => {
    for (const p of await q(`select payload from public.notifications
                              where payload->>'event' like 'crew_outing%'`)) {
      eq(p.payload.placeLabel, undefined, 'placeLabel dans un payload de rendez-vous');
      eq(p.payload.place_label, undefined, 'place_label dans un payload de rendez-vous');
    }
  });

  await t('une annonce prévient les membres, jamais son auteur', async () => {
    await db.query(`insert into public.crew_announcements(crew_id,author_id,body)
                    values ($1,$2,'Rendez-vous samedi.')`, [CREW, CAP]);
    ok((await faits(MEM)).includes('crew_announcement'), 'au membre');
    eq((await faits(CAP)).includes('crew_announcement'), false, 'jamais à l’auteur');
    const p = await val(`select payload from public.notifications
                          where user_id=$1 and payload->>'event'='crew_announcement'`, [MEM]);
    eq(p.body, undefined, 'le corps de l’annonce reste dans le fil');
  });

  await t('une annonce DÉJÀ retirée ne produit rien', async () => {
    const avant = await compte(MEM);
    await db.query(`insert into public.crew_announcements(crew_id,author_id,body,removed_at)
                    values ($1,$2,'Effacée',now())`, [CREW, CAP]);
    eq(await compte(MEM), avant, 'rien de neuf');
  });

  console.log('\n── DÉFI, QUÊTE, RÉCOMPENSE ──');

  await t('le défi commence puis se clôt : deux messages au roster réservé', async () => {
    await db.query(`update public.crew_challenges_2026 set status='active' where id=$1`, [DEFI]);
    ok((await faits(CAP)).includes('crew_challenge_started'), 'au roster');
    await db.query(`update public.crew_challenges_2026 set status='final' where id=$1`, [DEFI]);
    ok((await faits(CAP)).includes('crew_challenge_ended'), 'et le résultat');
    eq((await faits(NEO)).includes('crew_challenge_started'), false,
      'jamais à un membre hors roster');
  });

  await t('un défi annulé ne reproche rien à personne', async () => {
    const autre = U(90);
    await db.query(`insert into public.crew_challenges_2026(id,title,status)
                    values ($1,'Annulé','scheduled')`, [autre]);
    await db.query(`insert into public.challenge_roster_2026(challenge_id,crew_id,player_id)
                    values ($1,$2,$3)`, [autre, CREW, NEO]);
    const avant = await compte(NEO);
    await db.query(`update public.crew_challenges_2026 set status='cancelled',
                    reason='roster_incomplete_at_start' where id=$1`, [autre]);
    eq(await compte(NEO), avant, 'aucun message sur un défi qui n’a pas eu lieu');
  });

  await t('une quête accomplie annonce une récompense DÉJÀ posée', async () => {
    await db.query(`insert into public.weekly_quest_assignments_2026(user_id,week_start,activity,quest_id)
                    values ($1,'2026-09-07','run','explore_new')`, [MEM]);
    await db.query(`update public.weekly_quest_assignments_2026 set status='completed',
                    completed_at=now() where user_id=$1 and quest_id='explore_new'`, [MEM]);
    ok((await faits(MEM)).includes('weekly_quest_done'), 'la quête est dite');
  });

  await t('une quête EXPIRÉE reste silencieuse (§4.2)', async () => {
    await db.query(`insert into public.weekly_quest_assignments_2026(user_id,week_start,activity,quest_id)
                    values ($1,'2026-08-31','run','two_loops')`, [MEM]);
    const avant = await compte(MEM);
    await db.query(`update public.weekly_quest_assignments_2026 set status='expired'
                    where user_id=$1 and quest_id='two_loops'`, [MEM]);
    eq(await compte(MEM), avant, 'aucune relance sur un échec');
  });

  await t('une récompense de niveau porte son niveau', async () => {
    await db.query(`insert into public.level_reward_ownership_2026(user_id,reward_id)
                    values ($1,'first_trace')`, [MEM]);
    const p = await val(`select payload from public.notifications
                          where user_id=$1 and payload->>'event'='level_reward'`, [MEM]);
    eq(p.level, 2, 'le niveau vient du modèle gelé');
    eq(p.rewardId, 'first_trace', 'et l’objet aussi');
  });

  console.log('\n── LES INVARIANTS ──');

  await t('AUCUN producteur ne consomme le budget §14.1', async () => {
    eq(Number(await val(`select count(*) from public.notification_log_2026`)), 0,
      'le journal des sollicitations est resté vide : rien n’emporte ces messages');
  });

  await t('la déduplication tient : rejouer un fait n’écrit rien de neuf', async () => {
    const avant = await compte(MEM);
    await db.query(`update public.capture_events_2026 set status='scheduled' where run_id=$1`, [U(77)]);
    await db.query(`update public.capture_events_2026 set status='published' where run_id=$1`, [U(77)]);
    await db.query(`insert into public.level_reward_ownership_2026(user_id,reward_id)
                    values ($1,'first_trace') on conflict do nothing`, [MEM]);
    eq(await compte(MEM), avant, 'aucun doublon');
  });

  await t('tout message écrit est un fait DU CATALOGUE, et rien d’autre', async () => {
    const inconnus = await q(`select distinct payload->>'event' as kind from public.notifications
      where public.notification_kind_2026(payload->>'event') is null`);
    eq(inconnus.map((r) => r.kind), [], 'un fait hors catalogue a été écrit');
    eq(Number(await val(`select count(*) from public.notifications where event_id is null`)), 0,
      'une ligne sans identifiant d’événement échapperait à la déduplication');
  });

  await t('aucune ligne ne porte de phrase : la copie vit dans les 5 langues du mobile', async () => {
    eq(Number(await val(`select count(*) from public.notifications
       where payload ? 'title' or payload ? 'body'`)), 0, 'une phrase a été écrite en base');
  });

  console.log('');
  if (failures.length > 0) {
    console.error(`${failures.length} échec(s) sur ${passed + failures.length}.`);
    for (const f of failures) console.error(`  ${f.name}\n    ${f.err.stack ?? f.err.message}`);
    process.exit(1);
  }
  console.log(`${passed} vérifications vertes.`);
} catch (err) {
  console.error(`\nERREUR FATALE — le test n’a pas pu tourner :\n  ${err.stack ?? err.message}`);
  process.exit(1);
} finally {
  await db.close();
}
