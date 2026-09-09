#!/usr/bin/env node
/**
 * GRYD — 0165→0168 : les défis personnels de la semaine, joués pour de vrai sur
 * PostgreSQL/WASM. Le SQL exécuté est celui des migrations, sans réécriture, et
 * le registre sportif est celui de 0119/0120/0121 avec son moteur pur.
 *
 * PGlite tourne en SUPERUTILISATEUR et n'a pas PostGIS. Ce fichier prouve donc :
 * les contraintes, les privilèges posés, la logique des six conditions, l'octroi
 * d'objet, l'expiration et l'absence de compte à rebours dans la réponse. Il ne
 * prouve PAS l'effet d'une policy sur un rôle restreint, ni une géométrie
 * PostGIS — c'est exactement pourquoi 0166 calcule ses carreaux en arithmétique
 * SQL ordinaire sur le GeoJSON du moteur : la règle de jeu reste rejouable ici.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { computeProgressLedger2026 } from '../functions/_shared/progression2026.ts';
import {
  PROGRESSION_RULES_2026, WEEKLY_QUEST_CATALOGUE_2026, WEEKLY_QUEST_REWARDS_2026,
  WEEKLY_QUEST_RULES_2026,
} from '../functions/_shared/game-rules.ts';

const db = new PGlite();
let passed = 0;
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const crewId = (n) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const q = async (sql, args = []) => (await db.query(sql, args)).rows;
const one = async (sql, args = []) => Object.values((await q(sql, args))[0])[0];
const rejects = (sql, args = [], part) => assert.rejects(() => db.query(sql, args), part ? new RegExp(part) : undefined);
async function test(name, fn) { await fn(); console.log(`ok ${++passed} - ${name}`); }
async function as(user, fn) {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user ?? '']);
  await db.exec('set role authenticated');
  try { return await fn(); } finally { await db.exec('reset role'); }
}

// Un anneau GeoJSON carré autour d'un point : c'est ce que le moteur pur
// (`PhysicalFace2026.geometry`) produit et ce que l'ingestion transmet.
const ring = (lat, lng, side = 0.001) => ({
  type: 'Polygon',
  coordinates: [[[lng, lat], [lng + side, lat], [lng + side, lat + side], [lng, lat + side], [lng, lat]]],
});
let runSequence = 0;
/** Une boucle réelle : activité durable, événement de capture, face notée. */
async function loop(user, activity, closedAt, { lat, lng, areaM2 = 6_000, status = 'published', insertPublished = false } = {}) {
  const runId = id(500 + ++runSequence);
  await db.query(`insert into runs(id,user_id,activity,started_at,ended_at_2026,created_at,ruleset_version)
    values($1,$2,$3,$4,$4,$4,'2026.1')`, [runId, user, activity, closedAt]);
  const key = '0:0';
  const eventId = await one("select md5($1::text||':'||$2)::uuid", [runId, key]);
  await db.query(`insert into capture_events_2026(id,run_id,owner_id,activity,face_key,closed_at,status)
    values($1,$2,$3,$4,$5,$6,$7)`, [eventId, runId, user, activity, key, closedAt, insertPublished ? 'published' : 'scheduled']);
  await db.query('select note_weekly_quest_faces_2026($1,$2::jsonb)', [runId,
    JSON.stringify([{ key, geometry: ring(lat, lng), closedAt, areaM2 }])]);
  if (status === 'published' && !insertPublished) {
    await db.query("update capture_events_2026 set status='published' where id=$1", [eventId]);
  }
  return { runId, eventId };
}
/**
 * Fixture d'attribution : l'allocation réelle est déterministe mais dépend du
 * md5 du couple compte/semaine. Pour éprouver UN déclencheur ou UNE condition,
 * on pose exactement le défi visé — l'allocation, elle, a son propre test.
 */
async function forceQuest(user, mondayIso, activity, questId) {
  await db.query('delete from weekly_quest_assignments_2026 where user_id=$1 and week_start=$2::date', [user, mondayIso]);
  await db.query(`insert into weekly_quest_assignments_2026(user_id,week_start,activity,quest_id,quest_version,cross_discipline)
    select $1,$2::date,$3,q.quest_id,q.version,q.cross_discipline from weekly_quests_2026 q where q.quest_id=$4`,
    [user, mondayIso, activity, questId]);
}
async function snapshot(user) { return one('select public.progress_snapshot_2026($1)', [user]); }
async function evidence(user, startedAt, sport, minutes = 15) {
  const runId = id(700 + ++runSequence);
  const ended = new Date(Date.parse(startedAt) + minutes * 60_000).toISOString();
  await db.query(`insert into runs(id,user_id,activity,started_at,ended_at_2026,created_at,ruleset_version)
    values($1,$2,$3,$4,$5,$5,'2026.1')`, [runId, user, sport, startedAt, ended]);
  await db.query('select public.record_progress_evidence_2026($1,$2)', [runId, {
    canonicalId: runId, revision: 1, sport, startedAt, endedAt: ended, receivedAt: ended,
    source: 'gps', eligibility: 'eligible', movement: [{ start: startedAt, end: ended }],
  }]);
  return runId;
}
const totalXp = async (user) => Number(await one(
  "select coalesce((select (ledger->>'totalXp')::int from progress_accounts_2026 where user_id=$1),0)", [user]));
async function commitLedger(user) {
  const s = await snapshot(user);
  const ledger = computeProgressLedger2026({ accountId: user, ...s });
  return one('select public.commit_progress_2026($1,$2,$3,null)', [user, s.version, ledger]);
}

try {
  await db.exec(`create role anon;create role authenticated;create role service_role;
    create schema auth;create schema extensions;
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated,service_role;
    create table public.users(id uuid primary key,created_at timestamptz not null default now(),deletion_requested_at timestamptz);
    create table public.runs(id uuid primary key,user_id uuid not null references public.users(id) on delete cascade,
      activity text,started_at timestamptz,ended_at_2026 timestamptz,created_at timestamptz default now(),
      ruleset_version text not null default '2026.1',xp_awarded integer not null default 0);
    create table public.crews(id uuid primary key,name text);
    create table public.crew_members(crew_id uuid references public.crews(id),user_id uuid references public.users(id) on delete cascade,
      role text,left_at timestamptz);
    create table public.crew_events(id uuid primary key,crew_id uuid references public.crews(id),
      created_by uuid references public.users(id),title text,starts_at timestamptz,activity text,cancelled_at_2026 timestamptz);
    create table public.crew_event_rsvps(event_id uuid references public.crew_events(id) on delete cascade,
      user_id uuid references public.users(id) on delete cascade,choice text,updated_at timestamptz not null default now(),
      primary key(event_id,user_id));
    -- Fixture NON SPATIALE de 0118 : seules les colonnes que les défis lisent.
    -- La géométrie PostGIS n'entre jamais dans 0165-0168, c'est le point.
    create table public.capture_events_2026(id uuid primary key,
      run_id uuid references public.runs(id) on delete set null,
      owner_id uuid references public.users(id) on delete set null,
      activity text not null,face_key text not null,closed_at timestamptz not null,
      status text not null,reason text);`);
  for (const name of ['0119_refonte_2026_progress_ledger.sql', '0120_refonte_2026_premium_entitlements.sql',
    '0121_refonte_2026_season_collections.sql']) {
    await db.exec(readFileSync(new URL(`../migrations/${name}`, import.meta.url), 'utf8'));
  }
  for (let n = 1; n <= 10; n += 1) await db.query("insert into users(id,created_at) values($1,'2025-01-01')", [id(n)]);
  await db.query('insert into crews values($1,$2)', [crewId(1), 'Crew de test']);
  for (const [user, role] of [[id(2), 'founder'], [id(3), 'runner'], [id(4), 'runner']]) {
    await db.query('insert into crew_members(crew_id,user_id,role,left_at) values($1,$2,$3,null)', [crewId(1), user, role]);
  }

  // ══ ÉTAPE 0 — LE DÉFAUT EXISTAIT ═════════════════════════════════════════
  await test('étape 0 — aucun défi hebdomadaire ne peut exister, et aucune maison ne peut porter son objet', async () => {
    assert.equal(await one("select to_regclass('public.weekly_quests_2026') is null"), true);
    assert.equal(await one("select to_regclass('public.weekly_quest_assignments_2026') is null"), true);
    assert.equal(await one("select to_regprocedure('public.read_weekly_quests_2026()') is null"), true);
    assert.equal(await one("select to_regprocedure('public.evaluate_weekly_quests_2026(uuid)') is null"), true);
    // La seule maison d'objets GRATUITS déployée exige une collection PUBLIÉE.
    // Aucune saison n'existe en production : y ranger une récompense de défi
    // obligerait donc à inventer un calendrier, c'est-à-dire un fait.
    assert.deepEqual(await q('select 1 from season_collections_2026'), []);
    await rejects(`insert into season_reward_ownership_2026(user_id,collection_id,reward_id,variant,ledger_version)
      values($1,'saison_0','season_poster','standard',0)`, [id(1)], 'violates foreign key');
    // Et son catalogue est un instantané gelé dont `tier` est UNIQUE : on ne
    // peut pas y ajouter un objet de défi sans casser l'instantané.
    await rejects("insert into season_reward_templates_2026 values('quest_sticker_ailleurs',1,'Sticker')", [], 'duplicate key');
    await rejects("insert into season_reward_templates_2026 values('quest_sticker_ailleurs',0,'Sticker')", [], 'violates check');
  });

  for (const name of ['0165_weekly_quests_2026_catalogue.sql', '0166_weekly_quests_2026_loop_facts.sql',
    '0167_weekly_quests_2026_assignment.sql', '0168_weekly_quests_2026_read.sql']) {
    await db.exec(readFileSync(new URL(`../migrations/${name}`, import.meta.url), 'utf8'));
  }

  const week = await one('select public.weekly_quest_week_start_2026(now())');
  const weekStart = typeof week === 'string' ? week : week.toISOString().slice(0, 10);
  const shift = (days) => new Date(Date.parse(`${weekStart}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
  /** Un instant RÉEL à l'intérieur d'une semaine civile donnée, jamais futur. */
  const inWeek = async (mondayIso, dayOffset, hour) =>
    one(`select least(($1::date + $2 * interval '1 day' + $3 * interval '1 hour') at time zone 'Europe/Paris', now() - interval '1 minute')`,
      [mondayIso, dayOffset, hour]);

  await test('les quatre migrations s’appliquent ; le catalogue est semé, aucun joueur ne l’est', async () => {
    assert.equal(Number(await one('select count(*) from weekly_quests_2026')), WEEKLY_QUEST_CATALOGUE_2026.length);
    assert.equal(Number(await one('select count(*) from weekly_quest_reward_templates_2026')), WEEKLY_QUEST_REWARDS_2026.length);
    assert.equal(Number(await one('select count(*) from weekly_quest_assignments_2026')), 0);
    assert.equal(Number(await one('select count(*) from weekly_quest_reward_ownership_2026')), 0);
    assert.equal(Number(await one('select count(*) from weekly_quest_faces_2026')), 0);
  });

  await test('les règles SQL sont la copie exacte de WEEKLY_QUEST_RULES_2026', async () => {
    const r = (await q('select * from weekly_quest_rules_2026'))[0];
    assert.equal(r.simultaneous_per_discipline, WEEKLY_QUEST_RULES_2026.simultaneousPerDiscipline);
    assert.equal(r.week_time_zone, WEEKLY_QUEST_RULES_2026.weekTimeZone);
    assert.equal(r.late_sync_hours, WEEKLY_QUEST_RULES_2026.lateSyncHours);
    assert.equal(r.xp_reward, WEEKLY_QUEST_RULES_2026.xpReward);
    assert.deepEqual(r.reward_kinds, [...WEEKLY_QUEST_RULES_2026.rewardKinds]);
    assert.equal(Number(r.locality_tile_degrees), WEEKLY_QUEST_RULES_2026.localityTileDegrees);
    assert.equal(Number(r.distinct_loop_tile_degrees), WEEKLY_QUEST_RULES_2026.distinctLoopTileDegrees);
    assert.equal(Number(r.distinct_loop_area_bucket_m2), WEEKLY_QUEST_RULES_2026.distinctLoopAreaBucketM2);
    assert.equal(r.regularity_active_days, WEEKLY_QUEST_RULES_2026.regularityActiveDays);
    assert.equal(r.exploration_distinct_loops, WEEKLY_QUEST_RULES_2026.explorationDistinctLoops);
    assert.equal(r.group_outing_minimum_participants, WEEKLY_QUEST_RULES_2026.groupOutingMinimumParticipants);
    assert.equal(r.group_outing_proximity_hours, WEEKLY_QUEST_RULES_2026.groupOutingProximityHours);
    // La borne des journées n'appartient pas aux défis : elle est le plafond XP.
    assert.equal(r.xp_day_cap_per_week, PROGRESSION_RULES_2026.maximumCreditedDaysPerWeek);
  });

  await test('le catalogue SQL est la copie exacte du catalogue partagé, objets compris', async () => {
    const quests = await q(`select quest_id as id,version,family,cross_discipline as "crossDiscipline",
      requires,condition,threshold,reward_id as "rewardId" from weekly_quests_2026 order by quest_id`);
    assert.deepEqual(quests, [...WEEKLY_QUEST_CATALOGUE_2026].map(x => ({ ...x })).sort((a, b) => a.id.localeCompare(b.id)));
    const rewards = await q('select reward_id as id,kind,slot,label from weekly_quest_reward_templates_2026 order by reward_id');
    assert.deepEqual(rewards, [...WEEKLY_QUEST_REWARDS_2026].map(x => ({ ...x })).sort((a, b) => a.id.localeCompare(b.id)));
    assert.equal(await one(`select bool_and(kind = any(r.reward_kinds)) from weekly_quest_reward_templates_2026,weekly_quest_rules_2026 r`), true);
  });

  await test('la récompense est un objet — l’XP n’a aucune porte, même par configuration', async () => {
    await rejects('update weekly_quest_rules_2026 set xp_reward=100', [], 'violates check');
    await rejects("insert into weekly_quest_reward_templates_2026 values('quest_xp','xp','sticker','Cent XP')", [], 'weekly_quest_reward_kind_2026');
    await rejects("insert into weekly_quest_reward_templates_2026 values('quest_frame','sticker','frame','Cadre')", [], 'violates check');
    // Aucune fonction de défi n'écrit dans le registre, le crédit d'activité,
    // la possession de terrain ou une table héritée. §16.2 : les objets
    // changent ce qu'on MONTRE, jamais ce qu'on GAGNE.
    const bodies = await q(`select p.proname,pg_get_functiondef(p.oid) body from pg_proc p
      join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like '%weekly_quest%'`);
    assert.ok(bodies.length >= 10);
    for (const { proname, body } of bodies) {
      for (const forbidden of ['update public.progress_accounts', 'update public.runs', 'insert into public.progress_',
        'update public.ownership_2026', 'insert into public.ownership_2026', 'season_reward_ownership', 'xp_awarded',
        'insert into public.territories', 'hex_claims']) {
        assert.ok(!body.toLowerCase().includes(forbidden), `${proname} touche ${forbidden}`);
      }
    }
  });

  await test('le carreau et la signature sont de l’arithmétique, pas une géométrie devinée', async () => {
    // [lng, lat] est l'ordre GeoJSON : s'y tromper rangerait Rouen en Somalie.
    assert.equal(await one("select weekly_quest_tile_2026($1::jsonb,0.01)", [JSON.stringify(ring(49.44, 1.09))]), '4944:109');
    assert.equal(await one("select weekly_quest_tile_2026($1::jsonb,0.01)", [JSON.stringify(ring(49.4409, 1.0909))]), '4944:109');
    assert.equal(await one("select weekly_quest_tile_2026($1::jsonb,0.01)", [JSON.stringify(ring(49.46, 1.09))]), '4946:109');
    assert.equal(await one("select weekly_quest_tile_2026(null,0.01)"), null);
    assert.equal(await one("select weekly_quest_tile_2026($1::jsonb,0)", [JSON.stringify(ring(49.44, 1.09))]), null);
    // Deux boucles voisines de taille voisine partagent leur signature : c'est
    // la déduplication du §7.4, pas une comparaison de formes.
    const a = await one('select weekly_quest_signature_2026($1::jsonb,6000)', [JSON.stringify(ring(49.4400, 1.0900))]);
    const b = await one('select weekly_quest_signature_2026($1::jsonb,6400)', [JSON.stringify(ring(49.4401, 1.0901))]);
    const c = await one('select weekly_quest_signature_2026($1::jsonb,6000)', [JSON.stringify(ring(49.4600, 1.0900))]);
    assert.equal(a, b); assert.notEqual(a, c);
  });

  await test('deux défis au maximum par discipline, et la même lecture ne les redistribue pas', async () => {
    const first = await as(id(1), () => one('select read_weekly_quests_2026()'));
    const perActivity = (payload, activity) => payload.current.filter(x => x.activity === activity);
    assert.equal(perActivity(first, 'run').length, WEEKLY_QUEST_RULES_2026.simultaneousPerDiscipline);
    assert.equal(perActivity(first, 'bike').length, WEEKLY_QUEST_RULES_2026.simultaneousPerDiscipline);
    const second = await as(id(1), () => one('select read_weekly_quests_2026()'));
    assert.deepEqual(second.current.map(x => `${x.activity}:${x.questId}`).sort(),
      first.current.map(x => `${x.activity}:${x.questId}`).sort());
    assert.equal(Number(await one('select count(*) from weekly_quest_assignments_2026 where user_id=$1', [id(1)])),
      2 * WEEKLY_QUEST_RULES_2026.simultaneousPerDiscipline);
    // Un défi TRANSVERSE ne peut pas occuper les deux onglets : l'index partiel
    // le refuse, quoi qu'un futur appelant tente.
    const cross = first.current.filter(x => x.questId === 'regularity_two_active_days');
    assert.ok(cross.length <= 1);
    await rejects(`insert into weekly_quest_assignments_2026(user_id,week_start,activity,quest_id,quest_version,cross_discipline)
      select user_id,week_start,case when activity='run' then 'bike' else 'run' end,quest_id,quest_version,true
      from weekly_quest_assignments_2026 where user_id=$1 and cross_discipline limit 1`, [id(1)], 'duplicate key');
  });

  await test('« Double pratique » n’est jamais proposé à un mono-sport, et l’est à qui pratique les deux', async () => {
    await db.query("insert into runs(id,user_id,activity,ruleset_version) values($1,$2,'run','2026.1')", [id(801), id(5)]);
    await db.query("insert into runs(id,user_id,activity,ruleset_version) values($1,$2,'run','2026.1')", [id(802), id(6)]);
    await db.query("insert into runs(id,user_id,activity,ruleset_version) values($1,$2,'bike','2026.1')", [id(803), id(6)]);
    // Vingt semaines d'attribution : l'ordre est déterministe (md5 du couple
    // compte/semaine), donc ce balayage est une preuve, pas un tirage.
    for (let k = 0; k < 20; k += 1) {
      for (const activity of ['run', 'bike']) {
        await db.query('select assign_weekly_quests_2026($1,$2,$3::date)', [id(5), activity, shift(-7 * k)]);
        await db.query('select assign_weekly_quests_2026($1,$2,$3::date)', [id(6), activity, shift(-7 * k)]);
      }
    }
    assert.equal(Number(await one(`select count(*) from weekly_quest_assignments_2026
      where user_id=$1 and quest_id='double_practice_two_sports'`, [id(5)])), 0);
    assert.ok(Number(await one(`select count(*) from weekly_quest_assignments_2026
      where user_id=$1 and quest_id='double_practice_two_sports'`, [id(6)])) > 0);
    // Sans crew, les deux défis de crew ne sont jamais proposés non plus.
    assert.equal(Number(await one(`select count(*) from weekly_quest_assignments_2026
      where user_id=$1 and quest_id in('ensemble_group_outing','hosting_open_outing')`, [id(5)])), 0);
  });

  await test('un défi expiré ne récompense pas — la même preuve, une semaine plus tôt, ne donne rien', async () => {
    const old = shift(-14);
    await forceQuest(id(7), old, 'run', 'exploration_new_locality');
    await loop(id(7), 'run', await inWeek(old, 2, 10), { lat: 48.85, lng: 2.35 });
    assert.equal(await one(`select weekly_quest_satisfied_2026($1,'run',$2::date,'exploration_new_locality')`, [id(7), old]), true);
    await db.query('select evaluate_weekly_quests_2026($1)', [id(7)]);
    const rows = await q(`select quest_id,status from weekly_quest_assignments_2026
      where user_id=$1 and week_start=$2::date order by quest_id`, [id(7), old]);
    assert.ok(rows.length > 0);
    assert.deepEqual([...new Set(rows.map(r => r.status))], ['expired']);
    assert.equal(Number(await one('select count(*) from weekly_quest_reward_ownership_2026 where user_id=$1', [id(7)])), 0);
    // Contrôle : la MÊME preuve, dans la semaine en cours, récompense.
    await forceQuest(id(7), weekStart, 'run', 'exploration_new_locality');
    await loop(id(7), 'run', await inWeek(weekStart, 0, 10), { lat: 45.75, lng: 4.85 });
    await db.query('select evaluate_weekly_quests_2026($1)', [id(7)]);
    assert.equal(await one(`select status from weekly_quest_assignments_2026
      where user_id=$1 and week_start=$2::date and quest_id='exploration_new_locality'`, [id(7), weekStart]), 'completed');
    assert.equal(await one('select reward_id from weekly_quest_reward_ownership_2026 where user_id=$1', [id(7)]), 'quest_sticker_ailleurs');
  });

  await test('un secteur déjà visité n’est plus « ailleurs » ; deux boucles jumelles ne font pas deux boucles', async () => {
    const user = id(8);
    await loop(user, 'run', await inWeek(shift(-21), 1, 10), { lat: 43.60, lng: 1.44 });
    await loop(user, 'run', await inWeek(weekStart, 0, 9), { lat: 43.6005, lng: 1.4405 });
    assert.equal(await one(`select weekly_quest_satisfied_2026($1,'run',$2::date,'exploration_new_locality')`, [user, weekStart]), false);
    assert.equal(await one(`select weekly_quest_satisfied_2026($1,'run',$2::date,'exploration_two_distinct_loops')`, [user, weekStart]), false);
    // Une deuxième boucle presque identique reste une seule boucle distincte.
    await loop(user, 'run', await inWeek(weekStart, 0, 11), { lat: 43.6006, lng: 1.4406, areaM2: 6_200 });
    assert.equal(await one(`select weekly_quest_satisfied_2026($1,'run',$2::date,'exploration_two_distinct_loops')`, [user, weekStart]), false);
    // Une boucle réellement ailleurs ouvre les deux défis d'Exploration.
    await loop(user, 'run', await inWeek(weekStart, 0, 12), { lat: 43.65, lng: 1.44 });
    assert.equal(await one(`select weekly_quest_satisfied_2026($1,'run',$2::date,'exploration_new_locality')`, [user, weekStart]), true);
    assert.equal(await one(`select weekly_quest_satisfied_2026($1,'run',$2::date,'exploration_two_distinct_loops')`, [user, weekStart]), true);
    // Le vélo ne se sert pas des boucles de course : deux mondes, jamais une somme.
    assert.equal(await one(`select weekly_quest_satisfied_2026($1,'bike',$2::date,'exploration_two_distinct_loops')`, [user, weekStart]), false);
  });

  await test('une capture non publiée ne compte pour rien — et sa publication clôt le défi sans ouvrir l’écran', async () => {
    const user = id(9);
    await forceQuest(user, weekStart, 'run', 'exploration_new_locality');
    const staged = await loop(user, 'run', await inWeek(weekStart, 0, 8), { lat: 44.84, lng: -0.58, status: 'scheduled' });
    await db.query('select evaluate_weekly_quests_2026($1)', [user]);
    assert.equal(await one(`select status from weekly_quest_assignments_2026
      where user_id=$1 and week_start=$2::date and quest_id='exploration_new_locality'`, [user, weekStart]), 'active');
    assert.equal(Number(await one('select count(*) from weekly_quest_reward_ownership_2026 where user_id=$1', [user])), 0);
    // La publication est le fait serveur. Le déclencheur de 0168 fait le reste.
    await db.query("update capture_events_2026 set status='published' where id=$1", [staged.eventId]);
    assert.equal(await one(`select status from weekly_quest_assignments_2026
      where user_id=$1 and week_start=$2::date and quest_id='exploration_new_locality'`, [user, weekStart]), 'completed');
    assert.equal(Number(await one('select count(*) from weekly_quest_reward_ownership_2026 where user_id=$1', [user])), 1);
    // Un retrait ultérieur ne reprend pas l'objet (§7.5 : permanent), mais il
    // ne peut pas non plus recréditer quoi que ce soit.
    await db.query("update capture_events_2026 set status='withdrawn',reason='consent_withdrawn' where id=$1", [staged.eventId]);
    assert.equal(Number(await one('select count(*) from weekly_quest_reward_ownership_2026 where user_id=$1', [user])), 1);
  });

  await test('une journée admissible du registre déclenche l’évaluation, sans jamais créditer d’XP', async () => {
    const user = id(10);
    await as(user, () => one('select read_weekly_quests_2026()'));
    await forceQuest(user, weekStart, 'run', 'exploration_new_locality');
    // Boucle insérée DÉJÀ publiée : aucun UPDATE de statut, donc le déclencheur
    // de publication ne peut pas être celui qui clôt le défi ci-dessous.
    await loop(user, 'run', await inWeek(weekStart, 0, 7), { lat: 47.21, lng: -1.55, insertPublished: true });
    assert.equal(await one(`select status from weekly_quest_assignments_2026
      where user_id=$1 and week_start=$2::date and quest_id='exploration_new_locality'`, [user, weekStart]), 'active');
    const before = await totalXp(user);
    await evidence(user, await inWeek(weekStart, 0, 6), 'run');
    const receipt = await commitLedger(user);
    assert.equal(receipt.committed, true);
    assert.equal(await one(`select status from weekly_quest_assignments_2026
      where user_id=$1 and week_start=$2::date and quest_id='exploration_new_locality'`, [user, weekStart]), 'completed');
    // L'XP a bougé parce qu'une JOURNÉE a été admise — jamais parce qu'un défi
    // a été clos : le défi n'a rien ajouté au registre.
    const after = await totalXp(user);
    assert.equal(after - before, PROGRESSION_RULES_2026.xpPerActiveDay);
    const again = await one('select evaluate_weekly_quests_2026($1)', [user]);
    assert.equal(Number(again), 0);
    assert.equal(await totalXp(user), after);
    assert.equal(Number(await one('select coalesce(sum(xp_awarded),0) from runs where user_id=$1', [user])), 0);
  });

  await test('régularité et double pratique lisent le registre, sport par sport, deux journées et jamais trois', async () => {
    const user = id(4); const previous = shift(-7);
    await evidence(user, await inWeek(previous, 0, 9), 'run');
    await commitLedger(user);
    assert.equal(await one(`select weekly_quest_satisfied_2026($1,'run',$2::date,'regularity_two_active_days')`, [user, previous]), false);
    assert.equal(await one(`select weekly_quest_satisfied_2026($1,'run',$2::date,'double_practice_two_sports')`, [user, previous]), false);
    await evidence(user, await inWeek(previous, 2, 9), 'bike');
    await commitLedger(user);
    assert.equal(await one(`select weekly_quest_satisfied_2026($1,'run',$2::date,'regularity_two_active_days')`, [user, previous]), true);
    assert.equal(await one(`select weekly_quest_satisfied_2026($1,'bike',$2::date,'regularity_two_active_days')`, [user, previous]), true);
    assert.equal(await one(`select weekly_quest_satisfied_2026($1,'run',$2::date,'double_practice_two_sports')`, [user, previous]), true);
    // Le seuil reste 2 : le catalogue ne peut pas demander la troisième journée.
    assert.equal(await one(`select threshold from weekly_quests_2026 where quest_id='regularity_two_active_days'`),
      WEEKLY_QUEST_RULES_2026.regularityActiveDays);
    assert.ok(WEEKLY_QUEST_RULES_2026.regularityActiveDays < PROGRESSION_RULES_2026.maximumCreditedDaysPerWeek);
    assert.equal(Number(await one(`select count(*) from weekly_quests_2026 q cross join weekly_quest_rules_2026 r
      where q.condition in('active_days','run_day_and_bike_day') and q.threshold>=r.xp_day_cap_per_week`)), 0);
    // Et la garde de 0165 n'est pas décorative : sur un catalogue trafiqué, elle refuse.
    await db.exec('begin');
    await db.exec("update weekly_quests_2026 set threshold=3 where quest_id='regularity_two_active_days'");
    await assert.rejects(() => db.exec(`do $$ begin
      if exists(select 1 from public.weekly_quests_2026 q cross join public.weekly_quest_rules_2026 r
        where q.condition in('active_days','run_day_and_bike_day') and q.threshold>=r.xp_day_cap_per_week) then
        raise exception 'regularity_quest_would_push_a_third_day'; end if; end $$;`), /third_day/);
    await db.exec('rollback');
    assert.equal(await one(`select threshold from weekly_quests_2026 where quest_id='regularity_two_active_days'`),
      WEEKLY_QUEST_RULES_2026.regularityActiveDays);
  });

  await test('une sortie de groupe n’est validée que par des faits : consentement avant, participants réels, activité enregistrée', async () => {
    const host = id(2); const guest = id(3); const outing = id(900);
    const startsAt = await inWeek(weekStart, 0, 7);
    // Dérivé de `startsAt`, jamais recalculé : un lundi très tôt, deux appels à
    // `inWeek` peuvent tomber à quelques millisecondes l'un de l'autre.
    const beforeStart = await one("select ($1::timestamptz - interval '2 hours')", [startsAt]);
    await db.query(`insert into crew_events(id,crew_id,created_by,title,starts_at,activity)
      values($1,$2,$3,'Sortie ouverte',$4,'run')`, [outing, crewId(1), host, startsAt]);
    const check = (user, quest) => one(`select weekly_quest_satisfied_2026($1,'run',$2::date,$3)`, [user, weekStart, quest]);
    assert.equal(await check(guest, 'ensemble_group_outing'), false);
    assert.equal(await check(host, 'hosting_open_outing'), false);
    // Un seul « je viens » : une sortie de groupe à une personne n'en est pas une.
    await db.query(`insert into crew_event_rsvps values($1,$2,'coming',$3)`, [outing, host, beforeStart]);
    assert.equal(await check(host, 'hosting_open_outing'), false);
    await db.query(`insert into crew_event_rsvps values($1,$2,'coming',$3)`, [outing, guest, beforeStart]);
    // L'accueil est validé : deux membres réels, dont un autre que l'organisateur.
    assert.equal(await check(host, 'hosting_open_outing'), true);
    // « Ensemble » exige EN PLUS une activité enregistrée autour du départ.
    assert.equal(await check(guest, 'ensemble_group_outing'), false);
    await db.query(`insert into runs(id,user_id,activity,started_at,created_at,ruleset_version)
      values($1,$2,'run',$3,$3,'2026.1')`, [id(901), guest, startsAt]);
    assert.equal(await check(guest, 'ensemble_group_outing'), true);
    // Un consentement donné APRÈS le départ ne rend pas une sortie consentie.
    await db.query(`update crew_event_rsvps set updated_at=$3 where event_id=$1 and user_id=$2`,
      [outing, guest, await one("select ($1::timestamptz + interval '1 hour')", [startsAt])]);
    assert.equal(await check(guest, 'ensemble_group_outing'), false);
    await db.query(`update crew_event_rsvps set updated_at=$3 where event_id=$1 and user_id=$2`,
      [outing, guest, beforeStart]);
    // Un rendez-vous annulé n'a pas eu lieu.
    await db.query('update crew_events set cancelled_at_2026=now() where id=$1', [outing]);
    assert.equal(await check(guest, 'ensemble_group_outing'), false);
    assert.equal(await check(host, 'hosting_open_outing'), false);
    await db.query('update crew_events set cancelled_at_2026=null where id=$1', [outing]);
    // Une sortie vélo ne valide pas un défi de course.
    assert.equal(await one(`select weekly_quest_satisfied_2026($1,'bike',$2::date,'ensemble_group_outing')`, [guest, weekStart]), false);
  });

  await test('la réponse ne porte aucun compte à rebours, aucune échéance, aucune semaine en cours', async () => {
    const payload = await as(id(1), () => one('select read_weekly_quests_2026()'));
    const text = JSON.stringify(payload);
    for (const forbidden of ['expiresAt', 'endsAt', 'expiresIn', 'remaining', 'deadline', 'countdown', 'daysLeft', 'weekEnd']) {
      assert.ok(!text.includes(forbidden), `la lecture expose ${forbidden}`);
    }
    assert.equal(Object.keys(payload).sort().join(','), 'asOf,current,objects,passed,passedWeek,ruleset');
    assert.equal(Object.keys(payload.current[0]).sort().join(','),
      'activity,completedAt,condition,family,questId,reward,status,threshold,version');
    assert.equal(payload.current.every(x => (x.status === 'completed') === (x.completedAt !== null)), true);
    // `passedWeek` est un lundi RÉVOLU : de quoi dire « la semaine est passée »,
    // jamais de quoi compter un reste.
    assert.ok(Date.parse(`${payload.passedWeek}T00:00:00Z`) < Date.parse(`${weekStart}T00:00:00Z`));
  });

  await test('les objets s’équipent, un seul par emplacement, et jamais sans possession', async () => {
    const user = id(9);
    await as(user, () => rejects("select equip_weekly_quest_reward_2026('quest_pattern_regulier',true)", [], 'reward_not_owned'));
    const equipped = await as(user, () => one("select equip_weekly_quest_reward_2026('quest_sticker_ailleurs',true)"));
    assert.deepEqual(equipped, { rewardId: 'quest_sticker_ailleurs', slot: 'sticker', equipped: true });
    // Deux objets du même emplacement : le second remplace le premier.
    await db.query(`insert into weekly_quest_reward_ownership_2026(user_id,reward_id,quest_id,week_start)
      values($1,'quest_pattern_deux_boucles','exploration_two_distinct_loops',$2::date),
             ($1,'quest_pattern_regulier','regularity_two_active_days',$2::date)`, [user, weekStart]);
    await as(user, () => one("select equip_weekly_quest_reward_2026('quest_pattern_deux_boucles',true)"));
    await as(user, () => one("select equip_weekly_quest_reward_2026('quest_pattern_regulier',true)"));
    assert.deepEqual(await q(`select slot,reward_id from weekly_quest_reward_equipment_2026 where user_id=$1 order by slot`, [user]),
      [{ slot: 'sticker', reward_id: 'quest_sticker_ailleurs' }, { slot: 'trace', reward_id: 'quest_pattern_regulier' }]);
    await as(user, () => one("select equip_weekly_quest_reward_2026('quest_sticker_ailleurs',false)"));
    assert.equal(Number(await one('select count(*) from weekly_quest_reward_equipment_2026 where user_id=$1', [user])), 1);
    const payload = await as(user, () => one('select read_weekly_quests_2026()'));
    assert.equal(payload.objects.find(o => o.rewardId === 'quest_pattern_regulier').equipped, true);
    assert.equal(payload.objects.find(o => o.rewardId === 'quest_sticker_ailleurs').equipped, false);
  });

  await test('un client ne peut rien déclarer : ni s’assigner un défi, ni le clore, ni s’octroyer un objet', async () => {
    await as(id(1), async () => {
      for (const table of ['weekly_quests_2026', 'weekly_quest_rules_2026', 'weekly_quest_reward_templates_2026',
        'weekly_quest_assignments_2026', 'weekly_quest_reward_ownership_2026', 'weekly_quest_reward_equipment_2026',
        'weekly_quest_faces_2026']) {
        await rejects(`select * from ${table}`, [], 'permission denied');
      }
      await rejects('select evaluate_weekly_quests_2026($1)', [id(1)], 'permission denied');
      await rejects("select assign_weekly_quests_2026($1,'run',$2::date)", [id(1), weekStart], 'permission denied');
      await rejects(`select weekly_quest_satisfied_2026($1,'run',$2::date,'active_days')`, [id(1), weekStart], 'permission denied');
      await rejects('select expire_weekly_quests_2026()', [], 'permission denied');
      await rejects('select note_weekly_quest_faces_2026($1,$2::jsonb)', [id(1), '[]'], 'permission denied');
      await rejects('select weekly_quest_week_start_2026(now())', [], 'permission denied');
    });
    await as(null, () => rejects('select read_weekly_quests_2026()', [], 'authentication_required'));
    const tables = await q(`select relname,relrowsecurity from pg_class where relname in
      ('weekly_quests_2026','weekly_quest_rules_2026','weekly_quest_reward_templates_2026','weekly_quest_assignments_2026',
       'weekly_quest_reward_ownership_2026','weekly_quest_reward_equipment_2026','weekly_quest_faces_2026')`);
    assert.equal(tables.length, 7);
    assert.ok(tables.every(t => t.relrowsecurity));
    // Plancher `auth.uid()` posé sur chaque table qui porte une ligne personnelle.
    const policies = await q(`select tablename,policyname,qual from pg_policies where schemaname='public' and tablename like 'weekly_quest%'`);
    assert.equal(policies.length, 4);
    assert.ok(policies.every(p => p.qual.includes('auth.uid()')));
  });

  await test('la mise en scène n’écrit un fait que pour une face réellement retenue par 0118', async () => {
    const runId = id(950);
    await db.query(`insert into runs(id,user_id,activity,started_at,ended_at_2026,created_at,ruleset_version)
      values($1,$2,'run',now(),now(),now(),'2026.1')`, [runId, id(1)]);
    // Face refusée par la mise en scène (surface, zone interdite) : aucun
    // événement n'existe, donc aucun fait de défi ne doit apparaître.
    const written = await one('select note_weekly_quest_faces_2026($1,$2::jsonb)', [runId,
      JSON.stringify([{ key: '0:0', geometry: ring(49.44, 1.09), closedAt: new Date().toISOString(), areaM2: 10 }])]);
    assert.equal(Number(written), 0);
    assert.equal(Number(await one('select count(*) from weekly_quest_faces_2026 where run_id=$1', [runId])), 0);
    // Une activité héritée n'entre jamais dans le régime 2026.
    await db.query("update runs set ruleset_version='legacy' where id=$1", [runId]);
    assert.equal(Number(await one('select note_weekly_quest_faces_2026($1,$2::jsonb)', [runId, '[]'])), 0);
  });

  await test('l’expiration est silencieuse et rejouable — et le mode accéléré des tests est la fonction elle-même', async () => {
    const before = await q('select user_id,week_start,quest_id from weekly_quest_assignments_2026 order by 1,2,3');
    const expired = Number(await one('select expire_weekly_quests_2026()'));
    assert.ok(expired >= 0);
    assert.equal(Number(await one('select expire_weekly_quests_2026()')), 0);
    const after = await q('select user_id,week_start,quest_id from weekly_quest_assignments_2026 order by 1,2,3');
    assert.deepEqual(after, before); // rien n'est supprimé, rien n'est créé
    assert.equal(Number(await one(`select count(*) from weekly_quest_assignments_2026 a
      where a.status='active' and now()>=(select b.expires_at from weekly_quest_week_bounds_2026(a.week_start) b)`)), 0);
    // Aucune semaine future n'est ouverte d'avance : on n'assigne que ce qu'on lit.
    assert.equal(Number(await one('select count(*) from weekly_quest_assignments_2026 where week_start>$1::date', [weekStart])), 0);
  });

  console.log(`\n${passed} assertions SQL vertes (PGlite, sans PostGIS).`);
  await db.close();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
  await db.close();
}
