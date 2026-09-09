/**
 * GRYD — 0156 : « en attente » a une fin, et la possession ne se rejoue plus
 * en entier quand rien ne l'exige.
 *
 * ÉTAPE 0 — le défaut est EXÉCUTÉ, pas seulement cité : la fonction
 * `publish_capture_events_2026` TELLE QU'ELLE EST DÉPLOYÉE (extraite du fichier
 * 0118) est installée, on lui donne une capture `pending` fermée il y a 48 h,
 * et on constate qu'elle la laisse `pending` — indéfiniment.
 *
 * CE QUE PGlite NE PROUVE PAS : il n'a pas PostGIS. Les deux fonctions
 * spatiales (`apply_capture_event_2026`, `rebuild_ownership_2026`) sont
 * remplacées par des ESPIONS après l'application de la migration : on prouve
 * QUEL CHEMIN la publication choisit, jamais ce que la géométrie devient.
 * L'équivalence des deux chemins appartient à refonte2026.postgis.test.mjs.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { TERRITORY_RULES_2026 } from '../functions/_shared/game-rules.ts';

const db = new PGlite();
let passed = 0;
const q = async (sql, args = []) => (await db.query(sql, args)).rows;
const one = async (sql, args = []) => Object.values((await q(sql, args))[0])[0];
const test = async (name, fn) => { await fn(); console.log(`ok ${++passed} - ${name}`); };
const read = (n) => readFileSync(new URL(`../migrations/${n}`, import.meta.url), 'utf8');
const M0118 = read('0118_refonte_2026_polygon_authority.sql');
const M0155 = read('0155_capture_admission_2026.sql');
const M0156 = read('0156_capture_pending_resolution_2026.sql');
const USER = '00000000-0000-4000-8000-000000000001';
const RUN = (n) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const seedEvent = (id, run, status, reason, closedMinutesAgo, publishMinutes = -1, activity = 'run') =>
  db.query(`insert into public.capture_events_2026(id,run_id,owner_id,activity,face_key,closed_at,received_at,publish_after,status,reason)
    values($1,$2,$3,$4,$5,now()-make_interval(mins=>$6),now(),now()+make_interval(mins=>$7),$8,$9)`,
    [id, run, USER, activity, String(id), closedMinutesAgo, publishMinutes, status, reason]);

try {
  await db.exec(`create role anon;create role authenticated;create role service_role;
    create schema auth;create schema extensions;
    -- PGlite n'a pas PostGIS : ce DOMAINE ne porte que le NOM du type, pour que
    -- plpgsql accepte les déclarations. Aucune opération spatiale n'est jouée.
    create domain extensions.geometry as text;
    create table public.users(id uuid primary key, deletion_requested_at timestamptz);
    create table public.user_profiles(user_id uuid primary key, map_sharing text);
    create table public.runs(id uuid primary key, user_id uuid references public.users(id),
      client_run_id uuid, activity text, source text, created_at timestamptz default now(),
      ruleset_version text not null default 'legacy', trace_points_2026 jsonb,
      game_status_2026 text, game_reason_2026 text, recording_session_id_2026 uuid,
      shared_map_consent_2026 boolean not null default false);
    create table public.recording_sessions_2026(id uuid primary key default gen_random_uuid(),
      user_id uuid not null, client_run_id uuid not null,
      activity text not null check (activity in ('run','bike')),
      started_at timestamptz not null default now(), unique(user_id,client_run_id));
    create table public.capture_events_2026(id uuid primary key, run_id uuid, owner_id uuid,
      activity text, face_key text, closed_at timestamptz, received_at timestamptz,
      publish_after timestamptz, geometry extensions.geometry,
      status text not null check(status in ('private','pending','scheduled','published','withdrawn')),
      reason text, new_geometry extensions.geometry, neutral_geometry extensions.geometry,
      taken_geometry extensions.geometry, already_owned_geometry extensions.geometry,
      unique(run_id,face_key));
    create table public.ownership_2026(event_id uuid primary key, owner_id uuid, activity text,
      geometry extensions.geometry, controlled_since timestamptz);
    create function public.rebuild_ownership_2026(p_activity text) returns void language sql as $$ select null::void $$;
    -- Dépendances de 0155 qui n'ont rien à voir avec ce qu'on prouve ici.
    create table public.no_capture_zones(geojson jsonb);
    create table public.crew_challenges_2026(id uuid primary key, sectors jsonb, status text);
    create table public.challenge_roster_2026(challenge_id uuid, user_id uuid, activity text,
      reserved boolean, consent boolean, consented_at timestamptz);
    create function public.maintain_challenge_2026(uuid) returns void language sql as $$ select null::void $$;
    create function public.assign_challenge_loop_2026(uuid,uuid,timestamptz,jsonb) returns void language sql as $$ select null::void $$;
  `);
  await db.query('insert into public.users values($1,null)', [USER]);
  await db.query("insert into public.user_profiles values($1,'simplified')", [USER]);
  await db.query(`insert into public.runs(id,user_id,activity,ruleset_version,game_status_2026,shared_map_consent_2026)
    values($1,$2,'run','2026.1','pending',true),($3,$2,'run','2026.1','pending',true),($4,$2,'run','2026.1','scheduled',true),($5,$2,'run','2026.1','scheduled',true)`,
    [RUN(1), USER, RUN(2), RUN(3), RUN(4)]);

  // ── ÉTAPE 0 : la publication DÉPLOYÉE, telle quelle ──────────────────────
  const deployedPublish = M0118.slice(
    M0118.indexOf('create function public.publish_capture_events_2026'),
    M0118.indexOf('revoke all on function public.publish_capture_events_2026'));
  await test('ÉTAPE 0 — la publication de 0118 ne connaît que `scheduled`', async () => {
    assert.ok(deployedPublish.includes("status='scheduled' and publish_after<=now()"));
    assert.ok(!deployedPublish.includes("status='pending'"), '0118 ne relit jamais un `pending`');
    await db.exec(deployedPublish);
  });
  await test('ÉTAPE 0 — une capture en attente depuis 48 h le reste, pour toujours', async () => {
    await seedEvent(RUN(1), RUN(1), 'pending', 'verification_required', 48 * 60);
    assert.equal(await one('select public.publish_capture_events_2026()'), 0);
    assert.equal(await one('select status from public.capture_events_2026 where id=$1', [RUN(1)]), 'pending');
    assert.equal(await one('select game_status_2026 from public.runs where id=$1', [RUN(1)]), 'pending');
  });

  await test('0155 puis 0156 s’appliquent telles quelles', async () => {
    await db.exec(M0155);
    await db.exec(M0156);
    assert.equal(await one('select count(*)::int from public.ownership_2026'), 0);
  });

  // Espions : on mesure la DÉCISION, pas la géométrie.
  await db.exec(`create table spy(step text, at bigserial);
    create or replace function public.apply_capture_event_2026(p_event_id uuid) returns void
      language sql as $$ insert into spy(step) values('apply:'||p_event_id::text) $$;
    create or replace function public.rebuild_ownership_2026(p_activity text) returns void
      language sql as $$ insert into spy(step) values('rebuild:'||p_activity) $$;`);
  const spy = async () => (await q('select step from spy order by at')).map((r) => r.step);
  const clearSpy = () => db.exec('delete from spy');

  await test('R2S-4 — passé le délai, l’attente devient un refus daté', async () => {
    assert.equal(await one('select public.publish_capture_events_2026()'), 0);
    assert.equal(await one('select status from public.capture_events_2026 where id=$1', [RUN(1)]), 'rejected');
    assert.equal(await one('select game_status_2026 from public.runs where id=$1', [RUN(1)]), 'rejected');
  });
  await test('le motif est CONSERVÉ : le statut porte la finalité, pas la cause', async () => {
    assert.equal(await one('select reason from public.capture_events_2026 where id=$1', [RUN(1)]),
      'verification_required');
  });
  await test('une attente encore résoluble n’est jamais expédiée', async () => {
    await seedEvent(RUN(2), RUN(2), 'pending', 'source_or_clock_unconfirmed', 120);
    await db.query('select public.publish_capture_events_2026()');
    assert.equal(await one('select status from public.capture_events_2026 where id=$1', [RUN(2)]), 'pending');
    assert.equal(await one('select game_status_2026 from public.runs where id=$1', [RUN(2)]), 'pending');
  });
  await test('la fenêtre est celle du cahier, injectée et bornée', async () => {
    await assert.rejects(() => db.query("select public.resolve_pending_captures_2026('swim',24)"), /invalid_discipline/);
    await assert.rejects(() => db.query("select public.resolve_pending_captures_2026('run',null)"), /invalid_receipt_window/);
    assert.equal(await one("select public.resolve_pending_captures_2026('bike',24)"), 0);
  });
  await test('le littéral de la publication vaut EXACTEMENT la constante partagée', () => {
    const call = /perform public\.resolve_pending_captures_2026\(discipline,([0-9.]+)\);/.exec(M0156);
    assert.ok(call, 'la publication doit appeler le résolveur avec une fenêtre explicite');
    assert.equal(Number(call[1]), TERRITORY_RULES_2026.captureReceiptMaxAgeHours,
      'dérive entre 0156 et game-rules.ts : TERRITORY_RULES_2026.captureReceiptMaxAgeHours');
  });

  // ── R2S-7b : quel chemin la publication choisit ──────────────────────────
  await test('un lot strictement postérieur s’applique sans rejouer la discipline', async () => {
    await clearSpy();
    await seedEvent(RUN(3), RUN(3), 'scheduled', null, 30);
    assert.equal(await one('select public.publish_capture_events_2026()'), 1);
    assert.deepEqual(await spy(), [`apply:${RUN(3)}`]);
    assert.equal(await one('select status from public.capture_events_2026 where id=$1', [RUN(3)]), 'published');
    assert.equal(await one('select game_status_2026 from public.runs where id=$1', [RUN(3)]), 'published');
  });
  await test('un envoi tardif qui s’intercale REJOUE la discipline entière', async () => {
    await clearSpy();
    // Fermé AVANT l'événement déjà publié : l'état « avant » n'est plus la
    // possession courante, le raccourci n'est plus équivalent.
    await seedEvent(RUN(4), RUN(4), 'scheduled', null, 90);
    assert.equal(await one('select public.publish_capture_events_2026()'), 1);
    assert.deepEqual(await spy(), ['rebuild:run']);
  });
  await test('sans rien à publier, la publication ne touche à aucune possession', async () => {
    await clearSpy();
    assert.equal(await one('select public.publish_capture_events_2026()'), 0);
    assert.deepEqual(await spy(), []);
  });
  await test('le rejeu canonique reste la référence, et il passe par la même fonction', () => {
    const rebuild = M0156.slice(M0156.indexOf('create or replace function public.rebuild_ownership_2026'));
    assert.ok(rebuild.includes('delete from public.ownership_2026 where activity=p_activity'), 'il efface toujours');
    assert.ok(rebuild.includes('order by closed_at,id'), 'et rejoue toujours dans l’ordre de fermeture physique');
    assert.ok(rebuild.includes('perform public.apply_capture_event_2026(e.id)'),
      'un seul corps par événement : le raccourci ne peut pas diverger de la référence');
  });
  await test('le consentement est toujours revérifié SOUS le verrou de publication', async () => {
    const publish = M0156.slice(M0156.indexOf('create or replace function public.publish_capture_events_2026'));
    const lock = publish.indexOf('pg_advisory_xact_lock');
    const recheck = publish.indexOf("status='private',reason='consent_withdrawn'");
    const promote = publish.indexOf("set status='published'");
    assert.ok(lock < recheck && recheck < promote, 'aucune victime ne perd rien avant la revérification');
  });
  await test('aucune de ces fonctions n’est exécutable par un client', async () => {
    for (const s of ['resolve_pending_captures_2026(text,float8)', 'apply_capture_event_2026(uuid)'])
      for (const role of ['anon', 'authenticated'])
        assert.equal(await one('select has_function_privilege($1,$2,$3)', [role, s, 'EXECUTE']), false, `${role} → ${s}`);
  });

  console.log(`\n${passed} vérifications PostgreSQL passées ; PostGIS NON exécuté (espions à la place des deux fonctions spatiales).`);
} finally { await db.close(); }
