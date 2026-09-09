/**
 * GRYD — 0155 : l'admission d'une capture est une règle NOMMÉE, TOLÉRANTE et FINIE.
 *
 * ÉTAPE 0 — le défaut existait, et il est lu dans le fichier DÉPLOYÉ (0118) :
 *   · `closure>r.created_at` compare deux horloges sans la moindre tolérance ;
 *   · `publish_capture_events_2026` ne promeut que `scheduled`, donc rien ne
 *     fait jamais sortir un `pending`.
 * Sans cette étape, un vert ne distinguerait pas 0155 d'un no-op.
 *
 * CE QUE PGlite PROUVE ICI : la LOGIQUE d'admission, la famille d'un motif, le
 * statut dérivé d'une sortie, l'adoption d'une session et les privilèges.
 * CE QU'IL NE PROUVE PAS : PGlite tourne en SUPERUTILISATEUR et n'a pas PostGIS.
 * Les effets géométriques de `stage_capture_2026` sont dans
 * supabase/tests/refonte2026.postgis.test.mjs, qui exige un vrai PostgreSQL.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
let passed = 0;
const q = async (sql, args = []) => (await db.query(sql, args)).rows;
const one = async (sql, args = []) => Object.values((await q(sql, args))[0])[0];
const test = async (name, fn) => { await fn(); console.log(`ok ${++passed} - ${name}`); };
const ids = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const M0118 = readFileSync(new URL('../migrations/0118_refonte_2026_polygon_authority.sql', import.meta.url), 'utf8');
const M0155 = readFileSync(new URL('../migrations/0155_capture_admission_2026.sql', import.meta.url), 'utf8');

try {
  await test('ÉTAPE 0 — 0118 compare les horloges SANS tolérance', () => {
    assert.ok(M0118.includes('closure>r.created_at'),
      '0118 doit bien contenir la comparaison nue ; sinon ce test ne parle plus du défaut');
    assert.ok(!/clock_tolerance/i.test(M0118), '0118 n’a aucune notion de tolérance d’horloge');
  });
  await test('ÉTAPE 0 — 0118 ne fait JAMAIS sortir un `pending`', () => {
    const publish = M0118.slice(M0118.indexOf('create function public.publish_capture_events_2026'));
    assert.ok(publish.includes("status='scheduled' and publish_after<=now()"), 'promotion des seuls `scheduled`');
    assert.ok(!publish.includes("status='pending'"), '0118 ne relit jamais un `pending`');
    assert.ok(!M0118.includes("'rejected'"), '0118 n’a pas d’état terminal honnête');
  });
  await test('ÉTAPE 0 — 2 s de dérive suffisaient à suspendre tout le territoire', async () => {
    assert.equal(await one("select (now()+interval '2 seconds') > now()"), true);
  });

  await db.exec(`create role anon;create role authenticated;create role service_role;
    create schema auth;create schema extensions;
    -- PGlite n'a pas PostGIS. Ce DOMAINE porte seulement le NOM du type pour que
    -- plpgsql accepte les déclarations de \`stage_capture_2026\` ; aucune opération
    -- spatiale n'est exécutée ici, et aucun vert de ce fichier n'en prouve une.
    create domain extensions.geometry as text;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create table public.users(id uuid primary key, deletion_requested_at timestamptz);
    create table public.user_profiles(user_id uuid primary key, map_sharing text);
    create table public.no_capture_zones(geojson jsonb);
    create table public.crew_challenges_2026(id uuid primary key, sectors jsonb, status text);
    create table public.challenge_roster_2026(challenge_id uuid, user_id uuid, activity text, reserved boolean, consent boolean, consented_at timestamptz);
    create function public.maintain_challenge_2026(uuid) returns void language sql as $$ select null::void $$;
    create function public.assign_challenge_loop_2026(uuid,uuid,timestamptz,jsonb) returns void language sql as $$ select null::void $$;
    create table public.runs(
      id uuid primary key, user_id uuid references public.users(id), client_run_id uuid,
      activity text, source text, started_at timestamptz, created_at timestamptz default now(),
      ended_at_2026 timestamptz, status text, ruleset_version text not null default 'legacy',
      trace_points_2026 jsonb, game_status_2026 text, game_reason_2026 text,
      recording_session_id_2026 uuid, shared_map_consent_2026 boolean not null default false);
    create table public.recording_sessions_2026(
      id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id),
      client_run_id uuid not null, activity text not null check (activity in ('run','bike')),
      started_at timestamptz not null default now(), unique(user_id,client_run_id));
    -- Le vocabulaire d'états TEL QU'IL EST EN PRODUCTION (0118), pour que la
    -- migration ait vraiment quelque chose à élargir.
    create table public.capture_events_2026(
      id uuid primary key, run_id uuid references public.runs(id) on delete set null,
      owner_id uuid, activity text, face_key text, closed_at timestamptz,
      received_at timestamptz, publish_after timestamptz,
      status text not null check(status in ('private','pending','scheduled','published','withdrawn')),
      reason text, unique(run_id,face_key));
  `);
  await db.query('insert into public.users values($1,null)', [ids(1)]);

  await test('ÉTAPE 0 — `rejected` était un état IMPOSSIBLE avant 0155', async () => {
    await assert.rejects(
      () => db.query("insert into public.capture_events_2026(id,run_id,status) values(gen_random_uuid(),null,'rejected')"),
      /violates check constraint/);
  });

  await test('0155 s’applique telle quelle et ne crée aucune donnée', async () => {
    await db.exec(M0155);
    assert.equal(await one('select count(*)::int from public.capture_events_2026'), 0);
    assert.equal(await one('select count(*)::int from public.recording_sessions_2026'), 0);
  });
  await test('un état terminal honnête existe désormais', async () => {
    await db.query("insert into public.capture_events_2026(id,run_id,status,reason) values(gen_random_uuid(),null,'rejected','receipt_window_expired')");
    assert.equal(await one("select count(*)::int from public.capture_events_2026 where status='rejected'"), 1);
    await db.query('delete from public.capture_events_2026');
  });

  const admit = (verified, review, closedSql, receivedSql, tol, hours, reason = null) =>
    one(`select public.capture_admission_2026($1,$2,${closedSql},${receivedSql},$3,$4,$5)`,
      [verified, review, tol, hours, reason]);

  await test('2 s de dérive ne suspendent plus rien (R2S-3)', async () => {
    const a = await admit(true, false, "now()+interval '2 seconds'", 'now()', 300, 24);
    assert.equal(a.state, 'scheduled');
    assert.equal(a.reason, undefined);
  });
  await test('la tolérance est une BORNE, pas une porte ouverte', async () => {
    assert.equal((await admit(true, false, "now()+interval '299 seconds'", 'now()', 300, 24)).state, 'scheduled');
    const over = await admit(true, false, "now()+interval '400 seconds'", 'now()', 300, 24);
    assert.equal(over.state, 'rejected');
    assert.equal(over.reason, 'clock_drift_too_large');
    assert.ok(over.driftS > 300, 'le refus porte la dérive mesurée, pour l’expliquer au joueur');
  });
  await test('au-delà de la fenêtre de réception, ce n’est pas « à confirmer », c’est non', async () => {
    assert.equal((await admit(true, false, "now()-interval '23 hours'", 'now()', 300, 24)).state, 'scheduled');
    const late = await admit(true, false, "now()-interval '25 hours'", 'now()', 300, 24);
    assert.equal(late.state, 'rejected');
    assert.equal(late.reason, 'receipt_window_expired');
    assert.ok(late.lateBySeconds > 0, 'le retard est chiffré');
  });
  await test('revue et provenance restent RÉSOLUBLES, donc `pending`', async () => {
    const review = await admit(true, true, 'now()', 'now()', 300, 24);
    assert.deepEqual([review.state, review.reason], ['pending', 'verification_required']);
    const noSession = await admit(false, false, 'now()', 'now()', 300, 24, 'no_recording_session');
    assert.deepEqual([noSession.state, noSession.reason], ['pending', 'no_recording_session']);
    const nude = await admit(false, false, 'now()', 'now()', 300, 24);
    assert.deepEqual([nude.state, nude.reason], ['pending', 'source_or_clock_unconfirmed']);
  });
  await test('un motif TERMINAL transmis par l’Edge ne redevient pas « en attente »', async () => {
    const drift = await admit(false, false, 'now()', 'now()', 300, 24, 'clock_drift_too_large');
    assert.deepEqual([drift.state, drift.reason], ['rejected', 'clock_drift_too_large']);
  });
  await test('chaque motif choisit sa famille dans UN seul endroit', async () => {
    for (const reason of ['clock_drift_too_large', 'receipt_window_expired', 'closure_crosses_known_barrier'])
      assert.equal(await one('select public.capture_state_for_reason_2026($1)', [reason]), 'rejected');
    for (const reason of ['verification_required', 'source_or_clock_unconfirmed', 'no_recording_session'])
      assert.equal(await one('select public.capture_state_for_reason_2026($1)', [reason]), 'pending');
  });
  await test('la confidentialité passe avant l’admission, dans le texte de la migration', () => {
    // On regarde la BOUCLE de mise en scène des faces, pas la réévaluation.
    const loop = M0155.slice(M0155.indexOf('for f in select value from jsonb_array_elements(p_faces) loop'));
    const privateFirst = loop.indexOf("state:='private'; why:='shared_map_not_authorized'");
    const admission = loop.indexOf('public.capture_admission_2026(p_source_verified');
    assert.ok(privateFirst > 0, 'la face sans consentement est refusée AVANT toute autre règle');
    assert.ok(admission > privateFirst, 'une face privée n’est jamais rattrapée par l’horloge');
    assert.ok(loop.includes("if state<>'private' then"), 'l’admission ne s’applique qu’à une face publiable');
    assert.ok(loop.indexOf("why:='protected_place'") < admission, 'un lieu protégé prime aussi sur l’admission');
  });
  await test('aucun paramètre de jeu n’est écrit en dur dans 0155 (ADR-003)', () => {
    const body = M0155.split('\n').filter((l) => !l.trimStart().startsWith('--')).join('\n');
    for (const magic of ['300', '86400', ' 24', '35', '180'])
      assert.ok(!new RegExp(`(secs=>|hours=>|interval ')\\s*${magic}\\b`).test(body),
        `constante ${magic} écrite en dur au lieu d’être injectée`);
  });

  await test('le statut d’une sortie se dérive de ses faces, dans un seul ordre', async () => {
    const run = async (states) => {
      await db.query('delete from public.capture_events_2026');
      await db.query("insert into public.runs(id,user_id,ruleset_version) values($1,$2,'2026.1') on conflict do nothing", [ids(9), ids(1)]);
      let i = 0;
      for (const s of states)
        await db.query('insert into public.capture_events_2026(id,run_id,face_key,status) values(gen_random_uuid(),$1,$2,$3)', [ids(9), `f${i++}`, s]);
      return one('select public.run_capture_status_2026($1)', [ids(9)]);
    };
    assert.equal(await run([]), 'no_loop');
    assert.equal(await run(['private']), 'private');
    assert.equal(await run(['rejected', 'private']), 'rejected');
    assert.equal(await run(['pending', 'rejected', 'private']), 'pending');
    assert.equal(await run(['scheduled', 'pending', 'rejected']), 'scheduled');
    assert.equal(await run(['published', 'scheduled', 'pending']), 'published');
    await db.query('delete from public.capture_events_2026');
  });

  // ─── R2S-8 : un départ sans session reste récupérable ─────────────────────
  const seedRun = async (n, { minutesAgo = 60, spanMinutes = 30, source = 'gps', points = true } = {}) => {
    const id = ids(100 + n);
    await db.query(`insert into public.runs(id,user_id,client_run_id,activity,source,created_at,ruleset_version,trace_points_2026)
      values($1,$2,gen_random_uuid(),'run',$3,now(),'2026.1',$4)`, [
      id, ids(1), source,
      points ? JSON.stringify([
        { lat: 49.44, lng: 1.09, t: Date.now() - minutesAgo * 60_000, acc: 5 },
        { lat: 49.45, lng: 1.10, t: Date.now() - (minutesAgo - spanMinutes) * 60_000, acc: 5 },
      ]) : null,
    ]);
    return id;
  };
  const adopt = (runId, tol = 300, hours = 24) =>
    one('select public.adopt_recording_session_2026($1,$2,$3)', [runId, tol, hours]);

  await test('une sortie hors ligne cohérente obtient sa session A POSTERIORI', async () => {
    const runId = await seedRun(1);
    const r = await adopt(runId);
    assert.ok(r.id, 'une session est créée');
    assert.equal(r.adopted, true, 'et elle est MARQUÉE adoptée, pas déguisée en départ observé');
    assert.equal(await one('select recording_session_id_2026 from public.runs where id=$1', [runId]), r.id);
    assert.equal(await one('select (adopted_at is not null) from public.recording_sessions_2026 where id=$1', [r.id]), true);
    // Le départ adopté est ancré sur le PREMIER point de l'évidence persistée.
    assert.equal(
      (await one('select started_at from public.recording_sessions_2026 where id=$1', [r.id])).toISOString(),
      (await one("select to_timestamp((trace_points_2026->0->>'t')::float8/1000) from public.runs where id=$1", [runId])).toISOString());
  });
  await test('l’adoption est idempotente et ne double jamais une session', async () => {
    const runId = await seedRun(2);
    const first = await adopt(runId);
    const again = await adopt(runId);
    assert.equal(again.id, first.id);
    assert.equal(await one('select count(*)::int from public.recording_sessions_2026 where user_id=$1', [ids(1)]) >= 1, true);
  });
  await test('un départ RÉELLEMENT observé est retrouvé, jamais dupliqué ni réécrit', async () => {
    const runId = await seedRun(3);
    const clientRunId = await one('select client_run_id from public.runs where id=$1', [runId]);
    const live = await one(`insert into public.recording_sessions_2026(user_id,client_run_id,activity,started_at)
      values($1,$2,'run',now()-interval '90 minutes') returning id`, [ids(1), clientRunId]);
    const r = await adopt(runId);
    assert.equal(r.id, live);
    assert.equal(r.adopted, false, 'un départ observé ne devient pas « adopté »');
  });
  await test('hors fenêtre de réception : refus NOMMÉ, pas une session fabriquée', async () => {
    const runId = await seedRun(4, { minutesAgo: 60 * 30, spanMinutes: 10 });
    const r = await adopt(runId);
    assert.equal(r.reason, 'receipt_window_expired');
    assert.equal(r.id, undefined);
    assert.equal(await one('select recording_session_id_2026 from public.runs where id=$1', [runId]), null);
  });
  await test('trace dans le futur : refus NOMMÉ avec la dérive mesurée', async () => {
    const runId = await seedRun(5, { minutesAgo: -60, spanMinutes: 10 });
    const r = await adopt(runId);
    assert.equal(r.reason, 'clock_drift_too_large');
    assert.ok(r.driftS > 0);
  });
  await test('un import n’est pas un départ : seule une source GPS est adoptable', async () => {
    assert.equal((await adopt(await seedRun(6, { source: 'gpx' }))).reason, 'source_or_clock_unconfirmed');
    assert.equal((await adopt(await seedRun(7, { points: false }))).reason, 'source_or_clock_unconfirmed');
  });
  await test('les bornes viennent de l’évidence persistée, jamais d’un champ de requête', () => {
    const fn = M0155.slice(M0155.indexOf('create function public.adopt_recording_session_2026'));
    assert.ok(fn.includes('r.trace_points_2026'), 'les bornes sont lues sur la trace enregistrée');
    assert.ok(!/p_first_point_at|p_last_point_at|p_started_at/.test(fn), 'aucune borne temporelle n’est acceptée du client');
  });

  await test('aucune de ces fonctions n’est exécutable par un client', async () => {
    const signatures = [
      'capture_admission_2026(boolean,boolean,timestamptz,timestamptz,float8,float8,text)',
      'capture_state_for_reason_2026(text)', 'run_capture_status_2026(uuid)',
      'adopt_recording_session_2026(uuid,float8,float8)',
      'stage_capture_2026(uuid,jsonb,jsonb,timestamptz,float8,float8,boolean,boolean,float8,text)',
      'stage_game_activity_2026(uuid,jsonb,jsonb,jsonb,timestamptz,float8,float8,boolean,boolean,float8,text)',
    ];
    for (const s of signatures) {
      for (const role of ['anon', 'authenticated'])
        assert.equal(await one('select has_function_privilege($1,$2,$3)', [role, s, 'EXECUTE']), false, `${role} → ${s}`);
      assert.equal(await one('select has_function_privilege($1,$2,$3)', ['service_role', s, 'EXECUTE']), true, s);
    }
  });
  await test('l’ancienne signature sans tolérance a DISPARU : aucun appel ne peut y retomber', async () => {
    assert.equal(await one(`select count(*)::int from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname='stage_capture_2026'`), 1);
    assert.equal(await one(`select count(*)::int from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname='stage_game_activity_2026'`), 1);
    assert.equal(await one(`select pronargs from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname='stage_capture_2026'`), 10);
  });

  console.log(`\n${passed} vérifications PostgreSQL passées ; PostGIS NON exécuté sous PGlite.`);
} finally { await db.close(); }
