#!/usr/bin/env node
/**
 * GRYD — tests EXÉCUTABLES des migrations 0137, 0138 et 0139
 * (signaler une personne · modérer son crew · le blocage vaut aux adhésions).
 *
 * ═══ CE QUE CE FICHIER PROUVE ═══════════════════════════════════════════════
 *  0. LES TROIS DÉFAUTS EXISTAIENT, sur la lignée 0002 → 0128 :
 *     · `social_report_2026` n'acceptait AUCUNE cible « personne » ;
 *     · `reviewed_at` n'était écrit par AUCUNE fonction du schéma, et
 *       `social_remove_2026` filtrait sur `author_id = auth.uid()` — donc un
 *       capitaine ne pouvait rien retirer du fil de son crew ;
 *     · un joueur BLOQUÉ par la direction d'un crew y entrait quand même, par
 *       code comme par lien d'invitation.
 *  1. Après les migrations : la personne se signale, la direction retire et
 *     classe, la file service_role s'ouvre, et l'adhérent bloqué est refusé.
 *  2. LES REFUS QUI COMPTENT LE PLUS : un membre ORDINAIRE ne modère pas, la
 *     direction d'un AUTRE crew non plus, et personne ne se signale soi-même.
 *
 * ═══ CE QU'IL NE PROUVE PAS ═════════════════════════════════════════════════
 * PGlite tourne en SUPERUTILISATEUR : les policies ne s'y appliquent pas. On
 * vérifie les PRIVILÈGES au catalogue et la LOGIQUE des RPC, jamais un refus
 * vécu par un rôle restreint (`npm run verify:rls` le fait sur le vrai projet).
 * PostGIS est absent : la lignée est rejouée jusqu'à 0112, puis les migrations
 * sociales sont appliquées telles quelles (elles n'ont aucune dépendance
 * spatiale) au-dessus de la seule colonne que 0118 leur apporte.
 */
import { readFileSync, readdirSync } from 'node:fs';
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
      'ne le comptez pas comme vert (sortie 2, jamais 0).\n' +
      `  cause : ${err.message}`,
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
const rejects = async (fn, pattern, what) => {
  try {
    await fn();
  } catch (err) {
    if (!pattern.test(err.message)) throw new Error(`${what} : message inattendu « ${err.message} »`);
    return;
  }
  throw new Error(`${what} : aucun refus n’a été levé`);
};

const db = new PGlite();
const q = async (sql, args = []) => (await db.query(sql, args)).rows;
const one = async (sql, args = []) => Object.values((await q(sql, args))[0])[0];
/** Incarne un acteur : `auth.uid()` est un bouchon lisant une table témoin. */
const as = async (uid, fn) => {
  await db.query('update auth._who set uid = $1', [uid]);
  try {
    return await fn();
  } finally {
    await db.query('update auth._who set uid = null');
  }
};

await db.exec(`
  set time zone 'UTC';
  create role anon; create role authenticated; create role service_role;
  create schema auth; create schema storage; create schema extensions;
  create table auth.users (id uuid primary key);
  create table auth._who (uid uuid); insert into auth._who values (null);
  create function auth.uid() returns uuid language sql stable as $$ select uid from auth._who limit 1 $$;
  create function extensions.gen_random_bytes(n int) returns bytea language sql as $$
    select substring(decode(md5(random()::text)||md5(random()::text)||md5(random()::text),'hex') from 1 for n) $$;
  grant usage on schema auth, storage to anon, authenticated, service_role;
  create table storage.buckets(id text primary key, name text, public boolean,
    file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects(id uuid default gen_random_uuid(), bucket_id text, name text, metadata jsonb);
  alter table storage.objects enable row level security;
  grant select, insert, delete on storage.objects to authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
`);

const SKIP = new Set([
  '0001_extensions.sql',
  '0020_crew_realtime.sql',
  '0038_sector_cron.sql',
  '0039_core_crons.sql',
  '0064_offensive_lifecycle.sql',
]);
// `pg_cron` n'existe pas sous PGlite : on coupe la migration au PREMIER appel
// d'ordonnancement (0102 commence par un `unschedule`, d'où les deux marqueurs).
const CRON_MARKERS = ['select cron.schedule(', 'select cron.unschedule('];
const applyFile = async (file) => {
  const raw = readFileSync(join(MIGRATIONS, file), 'utf8');
  const cuts = CRON_MARKERS.map((m) => raw.indexOf(m)).filter((i) => i !== -1);
  await db.exec(cuts.length === 0 ? raw : raw.slice(0, Math.min(...cuts)));
};

const LINEAGE = readdirSync(MIGRATIONS)
  .filter((f) => f.endsWith('.sql') && /^\d{4}_/.test(f) && Number(f.slice(0, 4)) <= 112)
  .sort()
  .filter((f) => !SKIP.has(f));

for (const file of LINEAGE) {
  try {
    await applyFile(file);
  } catch (err) {
    console.error(`\nSOCLE CASSÉ : la migration ${file} n’a pas pu s’appliquer.\n  ${err.message}`);
    process.exit(1);
  }
}
// La SEULE chose dont 0124 a besoin de 0118 : la colonne de version de règles.
// 0118 elle-même est spatiale (PostGIS) et n'a rien à faire dans ce test.
await db.exec("alter table public.runs add column if not exists ruleset_version text not null default 'legacy';");
for (const file of ['0124_refonte_2026_social.sql', '0127_refonte_2026_crew_conversation.sql']) {
  try {
    await applyFile(file);
  } catch (err) {
    console.error(`\nSOCLE CASSÉ : ${file} — ${err.message}`);
    process.exit(1);
  }
}

console.log('social_moderation — migrations 0137 / 0138 / 0139 sur PGlite\n');
console.log(`  (lignée rejouée : ${LINEAGE.length} migrations 0002 → 0112, puis 0124 et 0127)\n`);

// ─── Acteurs ────────────────────────────────────────────────────────────────
const FOUNDER = '11111111-1111-1111-1111-111111111111';
const COCAP = '22222222-2222-2222-2222-222222222222';
const MEMBER = '33333333-3333-3333-3333-333333333333';
const NUISANCE = '44444444-4444-4444-4444-444444444444';
const RIVAL_LEAD = '55555555-5555-5555-5555-555555555555';
const OUTSIDER = '66666666-6666-6666-6666-666666666666';
const ACTORS = [FOUNDER, COCAP, MEMBER, NUISANCE, RIVAL_LEAD, OUTSIDER];
const CREW = 'aaaaaaaa-0000-0000-0000-000000000001';
const RIVAL = 'aaaaaaaa-0000-0000-0000-000000000002';
const RUN = 'bbbbbbbb-0000-0000-0000-000000000001';

await db.exec(`
  insert into auth.users (id) values ${ACTORS.map((a) => `('${a}')`).join(',')};
  insert into public.users (id, pseudo) values
    ('${FOUNDER}','founder'),('${COCAP}','cocap'),('${MEMBER}','member'),
    ('${NUISANCE}','nuisance'),('${RIVAL_LEAD}','rival'),('${OUTSIDER}','outsider')
  on conflict (id) do update set pseudo = excluded.pseudo;
  insert into public.city_zones (city_id, name, geojson, status) values
    ('paris','Paris','{"type":"Polygon","coordinates":[[[2.22,48.81],[2.47,48.81],[2.47,48.91],[2.22,48.91],[2.22,48.81]]]}'::jsonb,'wild')
    on conflict (city_id) do nothing;
  insert into public.crews (id, name, color, city_id, code, created_by) values
    ('${CREW}','Foulées 93',3,'paris','ABC123','${FOUNDER}'),
    ('${RIVAL}','Rivaux',5,'paris','ZZZ999','${RIVAL_LEAD}');
  insert into public.crew_members (crew_id, user_id, role) values
    ('${CREW}','${FOUNDER}','founder'),('${CREW}','${COCAP}','co_captain'),
    ('${CREW}','${MEMBER}','runner'),('${CREW}','${NUISANCE}','runner'),
    ('${RIVAL}','${RIVAL_LEAD}','founder');
  insert into public.user_profiles (user_id, handle, display_name, profile_visibility) values
    ('${FOUNDER}','founder','Founder','crew'),('${COCAP}','cocap','Cocap','crew'),
    ('${MEMBER}','member','Member','crew'),('${NUISANCE}','nuisance','Nuisance','crew'),
    ('${RIVAL_LEAD}','rival','Rival','public'),('${OUTSIDER}','outsider','Outsider','public');
  insert into public.runs (id, user_id, client_run_id, source, started_at, distance_m, duration_s, status, ruleset_version, activity)
    values ('${RUN}','${NUISANCE}','bbbbbbbb-0000-0000-0000-0000000000ff','gps', now() - interval '2 hours', 5000, 1800, 'valid', '2026.1', 'run');
`);

// ═══════════════════════════════════════════════════════════════════════════
// ÉTAPE 0 — LES DÉFAUTS EXISTAIENT
// ═══════════════════════════════════════════════════════════════════════════
let POST;
let COMMENT;
let MESSAGE;

await t('étape 0 — 0124 n’accepte AUCUNE cible « personne » pour un signalement', async () => {
  eq(await one("select to_regprocedure('public.social_report_2026(text,uuid,uuid,uuid)') is not null"), false,
    'la signature à 4 arguments ne doit pas encore exister');
  const columns = await q(
    "select column_name from information_schema.columns where table_name='social_reports_2026'");
  eq(columns.some((c) => c.column_name === 'target_user_id'), false, 'la colonne cible ne doit pas exister');
  // La contrainte de 0124 impose « post XOR comment » : aucune place pour un tiers.
  const check = await one(
    `select pg_get_constraintdef(oid) from pg_constraint
      where conrelid='public.social_reports_2026'::regclass and contype='c'
        and pg_get_constraintdef(oid) ilike '%post_id IS NULL%'`);
  ok(/comment_id IS NULL/i.test(check), 'la contrainte XOR de 0124 est bien en place');
});

await t('étape 0 — AUCUNE fonction du schéma n’écrit `reviewed_at`', async () => {
  const writers = await q(
    `select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.prokind='f'
        and pg_get_functiondef(p.oid) ilike '%reviewed_at%'
        and pg_get_functiondef(p.oid) ilike '%social_reports_2026%'`);
  eq(writers.map((r) => r.proname), [], 'un signalement entrait et n’en sortait plus');
});

await t('étape 0 — la direction ne peut RIEN retirer du fil de son propre crew', async () => {
  POST = (await as(NUISANCE, () =>
    one("select social_publish_2026($1,$2,'Contenu problématique',null,true,$3)",
      ['cccccccc-0000-0000-0000-000000000001', RUN, CREW]))).id;
  COMMENT = await as(MEMBER, async () => {
    await one('select social_comment_2026($1,$2,$3)', [POST, 'cccccccc-0000-0000-0000-000000000002', 'Un commentaire']);
    return (await one('select social_comments_read_2026($1)', [POST]))[0].id;
  });
  MESSAGE = (await as(NUISANCE, () => one('select crew_message_send_2026($1,$2,$3)',
    [CREW, 'cccccccc-0000-0000-0000-000000000003', 'Message deplace']))).id;
  ok(POST && COMMENT && MESSAGE, 'les trois contenus de fixture existent');
  // `social_remove_2026` est filtrée sur l'auteur : la direction est refusée.
  await rejects(() => as(FOUNDER, () => one('select social_remove_2026($1)', [POST])), /forbidden/,
    'le founder ne peut pas retirer la publication d’un membre');
  await rejects(() => as(FOUNDER, () => one('select social_remove_2026(null,$1)', [COMMENT])), /forbidden/,
    'le founder ne peut pas retirer le commentaire d’un membre');
  eq(await one('select count(*)::int from social_posts_2026 where removed_at is not null'), 0,
    'rien n’a été retiré');
});

await t('étape 0 — un joueur bloqué par la direction entre quand même dans le crew', async () => {
  await as(FOUNDER, () => one('select social_block_2026($1,true)', [OUTSIDER]));
  const joined = await as(OUTSIDER, () => one("select join_crew_by_code('ABC123')"));
  eq(joined.ok, true, 'la brèche : l’adhésion réussit malgré le blocage');
  eq(await one('select count(*)::int from crew_members where crew_id=$1 and user_id=$2 and left_at is null',
    [CREW, OUTSIDER]), 1, 'la personne bloquée est bien dans le roster');
  // On referme la fixture : elle repart, et le cooldown est neutralisé pour la
  // suite (0093 compte les départs VOLONTAIRES).
  await db.query('delete from crew_members where crew_id=$1 and user_id=$2', [CREW, OUTSIDER]);
});

// ═══════════════════════════════════════════════════════════════════════════
// LES MIGRATIONS
// ═══════════════════════════════════════════════════════════════════════════
for (const file of [
  '0137_social_report_profile_2026.sql',
  '0138_social_moderation_2026.sql',
  '0139_crew_join_respects_blocks_2026.sql',
]) {
  await applyFile(file);
}

// ─── 0137 : signaler une personne ───────────────────────────────────────────
await t('0137 — un profil visible peut être signalé, une fois', async () => {
  await as(MEMBER, () => one("select social_report_2026('harassment',null,null,$1)", [NUISANCE]));
  await as(MEMBER, () => one("select social_report_2026('harassment',null,null,$1)", [NUISANCE]));
  eq(await one('select count(*)::int from social_reports_2026 where target_user_id=$1', [NUISANCE]), 1,
    're-signaler n’empile pas la file');
});

await t('0137 — on ne se signale pas soi-même, ni sans cible, ni avec deux cibles', async () => {
  await rejects(() => as(MEMBER, () => one("select social_report_2026('other',null,null,$1)", [MEMBER])),
    /invalid_target/, 'auto-signalement');
  await rejects(() => as(MEMBER, () => one("select social_report_2026('other')")),
    /invalid_target/, 'aucune cible');
  await rejects(() => as(MEMBER, () => one("select social_report_2026('other',$1,null,$2)", [POST, NUISANCE])),
    /invalid_target/, 'deux cibles');
  await rejects(() => as(MEMBER, () => one("select social_report_2026('parce-que',null,null,$1)", [NUISANCE])),
    /invalid_reason/, 'motif inconnu');
});

await t('0137 — un profil hors d’atteinte ne se signale pas, un profil BLOQUÉ si', async () => {
  // `outsider` est hors crew et son profil est public : il est visible, donc
  // signalable. On le rend privé pour éprouver le refus.
  await db.query("update user_profiles set profile_visibility='private' where user_id=$1", [OUTSIDER]);
  await rejects(() => as(MEMBER, () => one("select social_report_2026('other',null,null,$1)", [OUTSIDER])),
    /profile_unavailable/, 'profil privé et sans lien');
  // …et le cas qui compte : « je bloque, PUIS je signale ». Sans la seconde
  // branche de la garde, bloquer rendrait le signalement impossible.
  await as(MEMBER, () => one('select social_block_2026($1,true)', [OUTSIDER]));
  await as(MEMBER, () => one("select social_report_2026('harassment',null,null,$1)", [OUTSIDER]));
  eq(await one('select count(*)::int from social_reports_2026 where target_user_id=$1', [OUTSIDER]), 1,
    'le signalement après blocage est enregistré');
});

await t('0137 — les signalements de CONTENU de 0124 fonctionnent comme avant', async () => {
  await as(COCAP, () => one("select social_report_2026('inappropriate',$1)", [POST]));
  eq(await one('select count(*)::int from social_reports_2026 where post_id=$1 and reporter_id=$2',
    [POST, COCAP]), 1, 'le signalement de publication est enregistré');
  eq(await one("select has_function_privilege('anon','public.social_report_2026(text,uuid,uuid,uuid)','execute')"), false,
    'anon n’exécute pas');
  eq(await one("select has_function_privilege('authenticated','public.social_report_2026(text,uuid,uuid,uuid)','execute')"), true,
    'authenticated exécute');
});

// ─── 0138 : la direction modère ─────────────────────────────────────────────
await t('0138 — un membre ORDINAIRE ne modère rien', async () => {
  await rejects(() => as(MEMBER, () => one("select social_moderate_2026('post',$1,'remove')", [POST])),
    /forbidden/, 'membre ordinaire sur une publication');
  await rejects(() => as(MEMBER, () => one("select social_moderate_2026('message',$1,'remove')", [MESSAGE])),
    /forbidden/, 'membre ordinaire sur un message');
  eq(await one('select count(*)::int from social_posts_2026 where removed_at is not null'), 0, 'rien retiré');
});

await t('0138 — la direction d’un AUTRE crew ne modère rien non plus', async () => {
  await rejects(() => as(RIVAL_LEAD, () => one("select social_moderate_2026('post',$1,'remove')", [POST])),
    /forbidden/, 'founder du crew rival');
  await rejects(() => as(RIVAL_LEAD, () => one("select social_moderate_2026('comment',$1,'remove')", [COMMENT])),
    /forbidden/, 'founder rival sur un commentaire');
  await rejects(() => as(RIVAL_LEAD, () => one("select social_moderate_2026('message',$1,'dismiss')", [MESSAGE])),
    /forbidden/, 'founder rival sur un message');
});

await t('0138 — le co_captain retire un commentaire et CLASSE les signalements liés', async () => {
  await as(NUISANCE, () => one("select social_report_2026('other',null,$1)", [COMMENT]));
  const out = await as(COCAP, () => one("select social_moderate_2026('comment',$1,'remove')", [COMMENT]));
  eq(out.ok, true, 'le retrait aboutit');
  eq(out.reportsReviewed, 1, 'le signalement lié est classé');
  const row = (await q('select removed_at, removed_by from social_comments_2026 where id=$1', [COMMENT]))[0];
  ok(row.removed_at !== null, 'le commentaire est masqué');
  eq(row.removed_by, COCAP, 'le retrait est signé');
  eq(await one('select count(*)::int from social_reports_2026 where comment_id=$1 and reviewed_at is null',
    [COMMENT]), 0, 'plus aucun signalement ouvert sur ce commentaire');
  eq(await one('select reviewed_by from social_reports_2026 where comment_id=$1', [COMMENT]), COCAP,
    'la revue est signée');
});

await t('0138 — « classer » ferme le signalement SANS retirer le contenu', async () => {
  const out = await as(FOUNDER, () => one("select social_moderate_2026('post',$1,'dismiss')", [POST]));
  eq(out.reportsReviewed, 1, 'le signalement de la publication est classé');
  eq(await one('select removed_at is null from social_posts_2026 where id=$1', [POST]), true,
    'la publication reste en ligne');
  // La LIGNE de signalement survit : une alerte classée reste une alerte reçue.
  eq(await one('select count(*)::int from social_reports_2026 where post_id=$1', [POST]), 1,
    'le signalement n’est pas supprimé');
});

await t('0138 — modérer PAR le signalement retire le contenu visé', async () => {
  await as(MEMBER, () => one("select social_report_2026('harassment',$1)", [POST]));
  const report = await one(
    'select id from social_reports_2026 where post_id=$1 and reporter_id=$2', [POST, MEMBER]);
  const out = await as(FOUNDER, () => one("select social_moderate_2026('report',$1,'remove')", [report]));
  eq(out.ok, true, 'le retrait par signalement aboutit');
  eq(await one('select removed_at is not null from social_posts_2026 where id=$1', [POST]), true,
    'la publication est retirée');
  eq(await one('select removed_by from social_posts_2026 where id=$1', [POST]), FOUNDER, 'signé');
});

await t('0138 — la conversation de crew se modère aussi, et son signalement se classe', async () => {
  await as(MEMBER, () => one("select crew_message_report_2026($1,'harassment')", [MESSAGE]));
  eq(await one('select count(*)::int from crew_message_reports_2026 where reviewed_at is null'), 1,
    'le signalement de message est ouvert');
  const out = await as(FOUNDER, () => one("select social_moderate_2026('message',$1,'remove')", [MESSAGE]));
  eq(out.reportsReviewed, 1, 'il est classé par le retrait');
  eq(await one('select removed_by from crew_messages_2026 where id=$1', [MESSAGE]), FOUNDER, 'signé');
});

await t('0138 — un contenu inexistant ou un genre inconnu sont refusés proprement', async () => {
  await rejects(() => as(FOUNDER, () => one("select social_moderate_2026('post',$1,'remove')",
    ['dddddddd-0000-0000-0000-000000000009'])), /forbidden/, 'publication inexistante');
  await rejects(() => as(FOUNDER, () => one("select social_moderate_2026('planete',$1,'remove')", [POST])),
    /invalid_moderation/, 'genre inconnu');
  await rejects(() => as(FOUNDER, () => one("select social_moderate_2026('post',$1,'brûler')", [POST])),
    /invalid_moderation/, 'action inconnue');
});

await t('0138 — la file des signalements ouverts est réservée au service_role', async () => {
  for (const role of ['anon', 'authenticated']) {
    eq(await one("select has_table_privilege($1,'public.social_reports_queue_2026','select')", [role]), false,
      `${role} ne lit pas la file`);
  }
  eq(await one("select has_table_privilege('service_role','public.social_reports_queue_2026','select')"), true,
    'service_role lit la file');
  const queue = await q('select source, target_kind, reason, priority from social_reports_queue_2026 order by priority, source');
  // Restent ouverts : les deux signalements de PERSONNE (harcèlement), qui ne
  // relèvent d'aucune direction de crew.
  eq(queue.map((r) => `${r.source}/${r.target_kind}/${r.reason}/${r.priority}`),
    ['social/profile/harassment/0', 'social/profile/harassment/0'],
    'la file ne garde que ce qui n’a pas été traité, menaces en tête');
});

await t('0138 — un signalement de PERSONNE ne se modère pas depuis un crew', async () => {
  const report = await one('select id from social_reports_2026 where target_user_id=$1', [NUISANCE]);
  await rejects(() => as(FOUNDER, () => one("select social_moderate_2026('report',$1,'dismiss')", [report])),
    /forbidden/, 'aucune direction de crew n’a autorité sur un signalement de personne');
});

await t('0138 — la file du crew : la direction voit, le membre ordinaire non', async () => {
  // On repart d'une alerte fraîche sur un contenu encore en ligne. Une SECONDE
  // sortie est nécessaire : `social_posts_2026` est unique par (auteur, crew,
  // sortie), et la première publication a été retirée juste au-dessus.
  const run2 = 'bbbbbbbb-0000-0000-0000-000000000002';
  await db.query(
    `insert into public.runs (id, user_id, client_run_id, source, started_at, distance_m, duration_s, status, ruleset_version, activity)
       values ($1,$2,$3,'gps', now() - interval '3 hours', 6000, 2100, 'valid', '2026.1', 'run')`,
    [run2, NUISANCE, 'bbbbbbbb-0000-0000-0000-0000000000fe'],
  );
  const post2 = (await as(NUISANCE, () =>
    one("select social_publish_2026($1,$2,'Deuxieme publication',null,true,$3)",
      ['cccccccc-0000-0000-0000-000000000010', run2, CREW]))).id;
  await as(MEMBER, () => one("select social_report_2026('harassment',$1)", [post2]));
  const mine = await as(FOUNDER, () => one('select social_moderation_queue_2026()'));
  eq(mine.ok, true, 'la direction reçoit une réponse valide');
  eq(mine.canModerate, true, 'elle peut modérer');
  eq(mine.items.length, 1, 'une alerte ouverte');
  eq(mine.items[0].kind, 'post', 'sur une publication');
  eq(mine.items[0].reports, 1, 'une seule alerte');
  eq(mine.items[0].reason, 'harassment', 'le motif le plus grave remonte');
  // L'IDENTITÉ DE CELUI QUI SIGNALE NE SORT JAMAIS.
  ok(!JSON.stringify(mine).includes(MEMBER), 'le rapporteur n’est pas nommé');

  const ordinary = await as(MEMBER, () => one('select social_moderation_queue_2026()'));
  eq(ordinary.ok, true, 'réponse VALIDE pour un membre ordinaire, pas une erreur');
  eq(ordinary.canModerate, false, 'mais il ne modère pas');
  eq(ordinary.items, [], 'et il ne voit rien');

  // La direction d'un AUTRE crew ne voit pas cette alerte non plus.
  const rival = await as(RIVAL_LEAD, () => one('select social_moderation_queue_2026()'));
  eq(rival.items, [], 'le crew voisin ne voit rien');

  // « Classer » vide la file sans retirer le contenu.
  await as(FOUNDER, () => one("select social_moderate_2026('post',$1,'dismiss')", [post2]));
  eq((await as(FOUNDER, () => one('select social_moderation_queue_2026()'))).items, [],
    'la file est vidée par le classement');
  eq(await one('select removed_at is null from social_posts_2026 where id=$1', [post2]), true,
    'et la publication reste en ligne');
});

await t('0138 — hors session et sans crew, la file le DIT au lieu d’échouer', async () => {
  eq((await one('select social_moderation_queue_2026()')).reason, 'signed_out', 'hors session');
  eq((await as(OUTSIDER, () => one('select social_moderation_queue_2026()'))).reason, 'no_crew',
    'sans crew');
});

await t('0138 — privilèges des fonctions de modération', async () => {
  for (const signature of ['social_moderate_2026(text,uuid,text)', 'social_moderation_role_2026(text,uuid)']) {
    eq(await one("select has_function_privilege('anon',$1,'execute')", [`public.${signature}`]), false, `anon / ${signature}`);
    eq(await one("select has_function_privilege('authenticated',$1,'execute')", [`public.${signature}`]), true, `authenticated / ${signature}`);
  }
  eq(await one("select has_function_privilege('authenticated','public.social_content_crew_2026(text,uuid)','execute')"), false,
    'le helper de résolution de crew reste interne');
});

// ─── 0139 : le blocage vaut aux adhésions ───────────────────────────────────
await t('0139 — l’adhésion par CODE est refusée quand la direction a bloqué', async () => {
  const out = await as(OUTSIDER, () => one("select join_crew_by_code('ABC123')"));
  eq(out.ok, false, 'refus');
  eq(out.reason, 'blocked', 'motif nu, sans nommer personne');
  ok(!JSON.stringify(out).includes(FOUNDER), 'le refus ne désigne pas qui a bloqué');
  eq(await one('select count(*)::int from crew_members where crew_id=$1 and user_id=$2 and left_at is null',
    [CREW, OUTSIDER]), 0, 'personne n’est entré');
});

await t('0139 — le blocage compte DANS LES DEUX SENS', async () => {
  await as(FOUNDER, () => one('select social_block_2026($1,false)', [OUTSIDER]));
  eq((await as(OUTSIDER, () => one("select join_crew_by_code('ABC123')"))).ok, true,
    'sans blocage, l’adhésion redevient possible');
  await db.query('delete from crew_members where crew_id=$1 and user_id=$2', [CREW, OUTSIDER]);
  // Maintenant c'est l'ADHÉRENT qui a bloqué la direction.
  await as(OUTSIDER, () => one('select social_block_2026($1,true)', [FOUNDER]));
  eq((await as(OUTSIDER, () => one("select join_crew_by_code('ABC123')"))).reason, 'blocked',
    'refus dans l’autre sens aussi');
});

await t('0139 — un blocage avec un MEMBRE ORDINAIRE ne ferme pas le crew', async () => {
  await as(OUTSIDER, () => one('select social_block_2026($1,false)', [FOUNDER]));
  await as(OUTSIDER, () => one('select social_block_2026($1,true)', [MEMBER]));
  eq((await as(OUTSIDER, () => one("select join_crew_by_code('ABC123')"))).ok, true,
    'bloquer un coureur du roster ne donne aucun veto sur le recrutement');
  await db.query('delete from crew_members where crew_id=$1 and user_id=$2', [CREW, OUTSIDER]);
  await as(OUTSIDER, () => one('select social_block_2026($1,false)', [MEMBER]));
});

await t('0139 — le LIEN D’INVITATION ne contourne pas le blocage, et n’est pas consommé', async () => {
  const invite = await as(FOUNDER, () => one('select create_crew_invite(24)'));
  const token = invite?.invite?.token ?? null;
  ok(typeof token === 'string' && token.length > 0, `create_crew_invite rend un jeton (${JSON.stringify(invite)})`);
  await as(COCAP, () => one('select social_block_2026($1,true)', [OUTSIDER]));
  const refused = await as(OUTSIDER, () => one('select redeem_crew_invite($1)', [token]));
  eq(refused.reason, 'blocked', 'le lien est refusé');
  eq(await one('select coalesce(sum(uses),0)::int from crew_invites'), 0,
    'un refus ne consomme jamais un usage');
  await as(COCAP, () => one('select social_block_2026($1,false)', [OUTSIDER]));
  eq((await as(OUTSIDER, () => one('select redeem_crew_invite($1)', [token]))).ok, true,
    'sans blocage, le lien fonctionne');
});

await t('0139 — la garde n’a pas abîmé les autres refus d’adhésion', async () => {
  eq((await as(OUTSIDER, () => one("select join_crew_by_code('NOPE')"))).reason, 'bad_code', 'code inconnu');
  eq((await as(OUTSIDER, () => one("select redeem_crew_invite('pas-un-jeton')"))).reason, 'bad_token', 'jeton inconnu');
  // L'idempotence est intacte : rouvrir le lien de SON crew ne refuse rien.
  eq((await as(FOUNDER, () => one("select join_crew_by_code('ABC123')"))).ok, true,
    'le founder qui rouvre son propre code');
});

await t('0139 — la garde est posée dans les DEUX fonctions, une seule fois chacune', async () => {
  for (const target of ['public.join_crew_by_code(text)', 'public.redeem_crew_invite(text)']) {
    const definition = await one('select pg_get_functiondef($1::regprocedure)', [target]);
    const occurrences = definition.split('crew_join_blocked_2026').length - 1;
    eq(occurrences, 1, `${target} porte la garde exactement une fois`);
    // Ce que la réécriture ne doit surtout pas avoir perdu.
    for (const kept of ['must_transfer_lead', 'cooldown']) {
      ok(definition.includes(kept), `${target} garde ${kept}`);
    }
  }
});

console.log('');
if (failures.length > 0) {
  console.error(`${failures.length} échec(s) :`);
  for (const f of failures) console.error(`  ${f.name}\n    ${f.err.stack ?? f.err.message}`);
  await db.close();
  process.exit(1);
}
console.log(`${passed} contrôles PostgreSQL passés (0137, 0138, 0139).`);
console.log('RLS non prouvée ici : PGlite est superutilisateur.');
await db.close();
