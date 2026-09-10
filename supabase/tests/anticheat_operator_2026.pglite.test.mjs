/**
 * GRYD — 0187 : quelqu'un dépile enfin la file de revue anti-triche.
 *
 * ÉTAPE 0 — LE DÉFAUT EXISTAIT, et il est lu dans les fichiers DÉPLOYÉS :
 *   · aucune fonction du dépôt ne clôt une revue (aucun `update` sur
 *     `anticheat_reviews` dans 0001-0186) ;
 *   · aucune notion d'habilitation : 0138 REFUSE explicitement d'en créer une,
 *     et 0081 inscrit « AUCUN OPÉRATEUR » dans ses suspens.
 * Sans cette étape, un vert ne distinguerait pas 0187 d'un no-op.
 *
 * CE QUE PGlite PROUVE ICI : la LOGIQUE de clôture (garde, refus de sa propre
 * sortie, idempotence, effets sur la capture, sur les XP et sur le journal), la
 * forme de la file, et l'état exact du catalogue de privilèges.
 * CE QU'IL NE PROUVE PAS : PGlite tourne en SUPERUTILISATEUR — les policies ne
 * s'y appliquent pas. Qu'un joueur soit RÉELLEMENT aveugle à la liste des
 * modérateurs ne se prouve que sur un vrai Supabase (`npm run verify:rls`).
 * PGlite n'a pas non plus PostGIS : aucune géométrie n'est calculée ici, et
 * aucun vert de ce fichier n'en prouve une.
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
let passed = 0;
const q = async (sql, args = []) => (await db.query(sql, args)).rows;
const one = async (sql, args = []) => Object.values((await q(sql, args))[0])[0];
const test = async (name, fn) => { await fn(); console.log(`ok ${++passed} - ${name}`); };
const ids = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const as = async (n, fn) => {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [n === null ? '' : ids(n)]);
  return await fn();
};
const fn = (signature) => `to_regprocedure('public.${signature}') is not null`;

const MIGRATIONS = new URL('../migrations/', import.meta.url);
const read = (file) => readFileSync(new URL(file, MIGRATIONS), 'utf8');
const M0081 = read('0081_anticheat_review.sql');
const M0119 = read('0119_refonte_2026_progress_ledger.sql');
const M0138 = read('0138_social_moderation_2026.sql');
const M0155 = read('0155_capture_admission_2026.sql');
const M0187 = read('0187_anticheat_operator_2026.sql');

const RESOLVE = 'resolve_anticheat_review_2026(uuid,text,text)';
const QUEUE = 'anticheat_reviews_pending_2026(integer)';
const AMI = 'am_i_moderator_2026()';

try {
  // ── ÉTAPE 0 ───────────────────────────────────────────────────────────────
  await test('ÉTAPE 0 — aucune migration 0001-0186 ne clôt une revue', () => {
    const coupables = readdirSync(new URL('.', MIGRATIONS))
      .filter((f) => f.endsWith('.sql') && !f.startsWith('0187_'))
      .filter((f) => /update\s+public\.anticheat_reviews/i.test(read(f)));
    assert.deepEqual(coupables, [],
      'une migration antérieure écrivait déjà dans anticheat_reviews : ce test ne parle plus du défaut');
  });

  await test('ÉTAPE 0 — 0081 inscrit « AUCUN OPÉRATEUR » dans ses suspens', () => {
    assert.ok(M0081.includes('AUCUN OPÉRATEUR'), '0081 doit bien nommer le trou que 0187 ferme');
    assert.ok(M0081.includes('une notion d\'opérateur qui n\'existe pas encore dans'),
      '0081 doit bien dire qu\'aucune habilitation n\'existe');
  });

  await test('ÉTAPE 0 — 0138 REFUSAIT de créer un rôle, et disait où l’ajouter', () => {
    assert.ok(M0138.includes('PAS DE RÔLE `moderator` GLOBAL'));
    assert.ok(M0138.includes('social_moderation_role_2026'),
      '0138 doit bien désigner l\'endroit unique où une habilitation s\'ajoutera');
  });

  // ── LA LIGNÉE ─────────────────────────────────────────────────────────────
  await db.exec(`create role anon;create role authenticated;create role service_role;
    create schema auth;create schema extensions;
    -- PGlite n'a pas PostGIS. Ce DOMAINE porte seulement le NOM du type pour que
    -- plpgsql accepte les déclarations de 0155 ; aucune opération spatiale n'est
    -- exécutée ici, et aucun vert de ce fichier n'en prouve une.
    create domain extensions.geometry as text;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated,service_role;
    create table auth.users(id uuid primary key);
    create table public.users(id uuid primary key, deletion_requested_at timestamptz);
    create table public.user_profiles(user_id uuid primary key references public.users(id), handle text, map_sharing text);
    create table public.no_capture_zones(geojson jsonb);
    create table public.crew_challenges_2026(id uuid primary key, sectors jsonb, status text);
    create table public.challenge_roster_2026(challenge_id uuid, user_id uuid, activity text, reserved boolean, consent boolean, consented_at timestamptz);
    create function public.maintain_challenge_2026(uuid) returns void language sql as $$ select null::void $$;
    create function public.assign_challenge_loop_2026(uuid,uuid,timestamptz,jsonb) returns void language sql as $$ select null::void $$;
    -- Le trigger d'horodatage de 0074, réutilisé par 0081 : il ne référence
    -- aucune colonne propre à \`territories\`.
    create function public.territories_touch_updated_at() returns trigger language plpgsql as $$
      begin new.updated_at := now(); return new; end $$;
    create table public.runs(
      id uuid primary key default gen_random_uuid(), user_id uuid references public.users(id),
      client_run_id uuid, activity text, source text, started_at timestamptz,
      created_at timestamptz default now(), ended_at_2026 timestamptz,
      distance_m integer, duration_s integer, avg_pace_s_km integer,
      status text, ruleset_version text not null default 'legacy',
      trace_points_2026 jsonb, game_status_2026 text, game_reason_2026 text,
      recording_session_id_2026 uuid, shared_map_consent_2026 boolean not null default false);
    create table public.recording_sessions_2026(
      id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id),
      client_run_id uuid not null, activity text not null check (activity in ('run','bike')),
      started_at timestamptz not null default now(), unique(user_id,client_run_id));
    -- Le vocabulaire d'états TEL QU'IL EST EN PRODUCTION (0118) : 0155 l'élargit.
    create table public.capture_events_2026(
      id uuid primary key default gen_random_uuid(), run_id uuid references public.runs(id) on delete set null,
      owner_id uuid, activity text, face_key text, closed_at timestamptz,
      received_at timestamptz, publish_after timestamptz,
      status text not null check(status in ('private','pending','scheduled','published','withdrawn')),
      reason text, unique(run_id,face_key));`);

  await db.exec(M0081);
  await db.exec(M0155);
  // Le grand livre de progression, jusqu'à `record_progress_evidence_2026`
  // incluse : c'est la fonction que 0187 appelle pour corriger l'évidence.
  await db.exec(M0119.slice(0, M0119.indexOf('create function public.progress_snapshot_2026')));

  await test('ÉTAPE 0 — avant 0187, AUCUNE fonction ne clôt une revue', async () => {
    assert.equal(await one(`select ${fn(RESOLVE)}`), false);
    assert.equal(await one(`select ${fn(QUEUE)}`), false);
    assert.equal(await one(`select ${fn(AMI)}`), false);
    assert.equal(await one("select to_regclass('public.moderators_2026') is not null"), false);
    assert.equal(
      await one(`select count(*)::int from information_schema.columns
                 where table_name='runs' and column_name='anticheat_cleared_2026'`), 0);
  });

  // ── 0187 ──────────────────────────────────────────────────────────────────
  await test('0187 s’applique telle quelle et ne nomme AUCUN modérateur', async () => {
    await db.exec(M0187);
    assert.equal(await one('select count(*)::int from public.moderators_2026'), 0,
      'une habilitation inventée serait une donnée fabriquée : la base a 0 donnée de jeu');
    assert.equal(await one('select count(*)::int from public.anticheat_review_journal_2026'), 0);
  });

  await test('privilèges : rien pour public/anon, la garde vit DANS les fonctions', async () => {
    for (const f of [AMI, QUEUE, RESOLVE]) {
      assert.equal(await one(`select has_function_privilege('anon','public.${f}','execute')`), false);
      assert.equal(await one(`select has_function_privilege('authenticated','public.${f}','execute')`), true);
      assert.equal(await one(`select has_function_privilege('service_role','public.${f}','execute')`), true);
    }
    // L'habilitation se LIT (sa propre ligne), elle ne s'écrit jamais depuis l'app.
    assert.equal(await one("select relrowsecurity from pg_class where oid='public.moderators_2026'::regclass"), true);
    assert.equal(await one("select has_table_privilege('authenticated','public.moderators_2026','select')"), true);
    for (const p of ['insert', 'update', 'delete']) {
      assert.equal(await one(`select has_table_privilege('authenticated','public.moderators_2026','${p}')`), false);
      assert.equal(await one(`select has_table_privilege('anon','public.moderators_2026','${p}')`), false);
    }
    assert.equal(await one("select has_table_privilege('anon','public.moderators_2026','select')"), false);
    // Le journal n'est lisible par AUCUN rôle client.
    assert.equal(await one("select relrowsecurity from pg_class where oid='public.anticheat_review_journal_2026'::regclass"), true);
    for (const role of ['anon', 'authenticated']) {
      assert.equal(await one(`select has_table_privilege('${role}','public.anticheat_review_journal_2026','select')`), false);
      assert.equal(await one(`select has_table_privilege('${role}','public.anticheat_review_journal_2026','insert')`), false);
    }
  });

  await test('la policy d’habilitation ne nomme QUE son titulaire', async () => {
    const rows = await q(`select polname, pg_get_expr(polqual,polrelid) as using_expr, polcmd
      from pg_policy where polrelid='public.moderators_2026'::regclass`);
    assert.equal(rows.length, 1, 'une seule policy : lire SA ligne, rien d\'autre');
    assert.equal(rows[0].polname, 'moderators_2026_select_self');
    assert.equal(rows[0].polcmd, 'r', 'aucune policy d\'écriture');
    assert.ok(/user_id = \( SELECT auth\.uid\(\)/i.test(rows[0].using_expr), rows[0].using_expr);
  });

  // ── LES DONNÉES DU SCÉNARIO ───────────────────────────────────────────────
  // Trois comptes : un joueur, un modérateur, un tiers. Aucune donnée de jeu
  // « d'ambiance » : chaque ligne sert une assertion.
  await db.query('insert into auth.users(id) values($1),($2),($3)', [ids(1), ids(2), ids(3)]);
  await db.query('insert into public.users(id) values($1),($2),($3)', [ids(1), ids(2), ids(3)]);
  await db.query("insert into public.user_profiles(user_id,handle) values($1,'joueuse')", [ids(1)]);

  const nouvelleSortie = async (n, opts = {}) => {
    const runId = ids(100 + n);
    await db.query(
      `insert into public.runs(id,user_id,client_run_id,activity,source,started_at,
         distance_m,duration_s,avg_pace_s_km,status,ruleset_version,game_status_2026,recording_session_id_2026)
       values($1,$2,gen_random_uuid(),'run','gps',now()-interval '2 hours',5000,1800,360,'valid','2026.1','pending',$3)`,
      [runId, opts.owner ?? ids(1), opts.session === false ? null : ids(900 + n)],
    );
    const reviewId = ids(200 + n);
    await db.query(
      `insert into public.anticheat_reviews(id,run_id,user_id,system_decision,suspicion,signals)
       values($1,$2,$3,'MANUAL_REVIEW',72,
         '[{"id":"step_coherence","available":true,"severity":3,"weight":2,"evidence":{"stepsPerMeter":0.12}}]'::jsonb)`,
      [reviewId, runId, opts.owner ?? ids(1)],
    );
    await db.query(
      `insert into public.capture_events_2026(run_id,owner_id,activity,face_key,closed_at,received_at,publish_after,status,reason)
       values($1,$2,'run',$3,now()-interval '2 hours',now()-interval '110 minutes',now(),$4,'verification_required')`,
      [runId, opts.owner ?? ids(1), `face-${n}`, opts.faceStatus ?? 'pending'],
    );
    return { runId, reviewId };
  };

  const sortie1 = await nouvelleSortie(1);
  await db.query(
    `insert into public.anticheat_appeals(review_id,user_id,message) values($1,$2,$3)`,
    [sortie1.reviewId, ids(1), 'J’ai couru avec une poussette, mon téléphone était dans le panier.'],
  );
  await db.query(
    `insert into public.progress_activity_2026(run_id,user_id,evidence) values($1,$2,$3::jsonb)`,
    [sortie1.runId, ids(1),
      JSON.stringify({ canonicalId: sortie1.runId, revision: 1, sport: 'run', eligibility: 'review' })],
  );
  await db.query('insert into public.progress_accounts_2026(user_id) values($1)', [ids(1)]);

  // ── LA GARDE ──────────────────────────────────────────────────────────────
  await test('hors session : « suis-je modérateur » rend false, jamais une erreur', async () => {
    assert.equal(await as(null, () => one('select am_i_moderator_2026()')), false);
  });

  await test('un NON-modérateur ne lit pas la file et ne clôt rien', async () => {
    assert.equal(await as(3, () => one('select am_i_moderator_2026()')), false);
    await assert.rejects(() => as(3, () => one('select anticheat_reviews_pending_2026(25)')), /forbidden/);
    await assert.rejects(
      () => as(3, () => one('select resolve_anticheat_review_2026($1,$2,null)', [sortie1.reviewId, 'validated'])),
      /forbidden/);
    await assert.rejects(
      () => as(null, () => one('select anticheat_reviews_pending_2026(25)')), /authentication_required/);
    // Et rien n'a bougé.
    assert.equal(await one('select status from public.anticheat_reviews where id=$1', [sortie1.reviewId]), 'open');
    assert.equal(await one('select count(*)::int from public.anticheat_review_journal_2026'), 0);
  });

  // ── L'HABILITATION, TELLE QUE LE FONDATEUR L'ÉCRIRA ───────────────────────
  await test('la nomination est une insertion nominative, et elle suffit', async () => {
    await db.query("insert into public.moderators_2026(user_id,note) values($1,'fondateur')", [ids(2)]);
    assert.equal(await as(2, () => one('select am_i_moderator_2026()')), true);
    assert.equal(await as(3, () => one('select am_i_moderator_2026()')), false);
  });

  // ── LA FILE ───────────────────────────────────────────────────────────────
  await test('la file rend le dossier COMPLET : pseudo, signaux, sortie, appel', async () => {
    const file = await as(2, () => one('select anticheat_reviews_pending_2026(25)'));
    assert.equal(file.length, 1);
    const d = file[0];
    assert.equal(d.reviewId, sortie1.reviewId);
    assert.equal(d.player, 'joueuse', 'le pseudo public, pas un identifiant technique');
    assert.equal(d.suspicion, 72);
    assert.equal(d.systemDecision, 'MANUAL_REVIEW');
    assert.equal(d.signals[0].id, 'step_coherence');
    assert.equal(d.signals[0].evidence.stepsPerMeter, 0.12, 'les preuves CHIFFRÉES arrivent intactes');
    assert.equal(d.run.distanceM, 5000);
    assert.equal(d.run.captureStatus, 'pending');
    assert.ok(d.appeal.message.startsWith('J’ai couru'), 'le mot du joueur est lu, pas seulement demandé');
    // Aucune coordonnée ne voyage : le rapport du moteur n'en émet aucune (§12).
    assert.ok(!JSON.stringify(d).includes('"lat"'));
  });

  await test('un joueur SANS pseudo est nommé par un identifiant COURT, pas par son e-mail', async () => {
    const sansPseudo = await nouvelleSortie(9, { owner: ids(3) });
    const file = await as(2, () => one('select anticheat_reviews_pending_2026(25)'));
    const d = file.find((x) => x.reviewId === sansPseudo.reviewId);
    assert.equal(d.player, ids(3).slice(0, 8));
    await db.query('delete from public.anticheat_reviews where id=$1', [sansPseudo.reviewId]);
    await db.query('delete from public.runs where id=$1', [sansPseudo.runId]);
  });

  // ── JAMAIS SA PROPRE SORTIE ───────────────────────────────────────────────
  await test('un modérateur ne tranche JAMAIS sa propre sortie', async () => {
    const sienne = await nouvelleSortie(2, { owner: ids(2) });
    await assert.rejects(
      () => as(2, () => one('select resolve_anticheat_review_2026($1,$2,null)', [sienne.reviewId, 'validated'])),
      /own_run_forbidden/);
    assert.equal(await one('select status from public.anticheat_reviews where id=$1', [sienne.reviewId]), 'open');
    assert.equal(await one('select count(*)::int from public.anticheat_review_journal_2026'), 0);
  });

  await test('un verdict inconnu est refusé — « je ne sais pas » n’est pas une décision', async () => {
    await assert.rejects(
      () => as(2, () => one('select resolve_anticheat_review_2026($1,$2,null)', [sortie1.reviewId, 'peut-etre'])),
      /invalid_verdict/);
    await assert.rejects(
      () => as(2, () => one('select resolve_anticheat_review_2026($1,$2,null)', [ids(777), 'validated'])),
      /review_not_found/);
  });

  // ── LA VALIDATION, ET SES EFFETS RÉELS ────────────────────────────────────
  await test('« validated » : dossier clos, face réadmise, appel clos, XP débloquées', async () => {
    const out = await as(2, () => one(
      'select resolve_anticheat_review_2026($1,$2,$3)',
      [sortie1.reviewId, 'validated', 'Poussette : allure et podomètre cohérents avec la trace.']));
    assert.equal(out.alreadyClosed, false);
    assert.equal(out.finalDecision, 'overturned');
    assert.equal(out.captureReadmitted, 1);
    assert.equal(out.captureUnconfirmed, 0);
    assert.equal(out.captureExpired, 0);
    assert.equal(out.appealClosed, true);
    assert.equal(out.xpUnblocked, true);

    const r = (await q('select * from public.anticheat_reviews where id=$1', [sortie1.reviewId]))[0];
    assert.equal(r.status, 'closed');
    assert.equal(r.final_decision, 'overturned');
    assert.equal(r.operator_id, ids(2));
    assert.ok(r.closed_at !== null);

    const a = (await q('select * from public.anticheat_appeals where review_id=$1', [sortie1.reviewId]))[0];
    assert.equal(a.status, 'closed');
    assert.equal(a.decision, 'overturned', 'l\'appel ne peut pas rester ouvert sur une revue tranchée');

    const e = (await q('select * from public.capture_events_2026 where run_id=$1', [sortie1.runId]))[0];
    assert.equal(e.status, 'scheduled', 'la face repart dans le circuit de publication');
    assert.equal(e.reason, null, 'le motif de gel disparaît avec le gel');

    const run = (await q('select * from public.runs where id=$1', [sortie1.runId]))[0];
    assert.ok(run.anticheat_cleared_2026 !== null, 'le fait « un humain a validé » est DURABLE');
    assert.equal(run.game_status_2026, 'scheduled', 'le statut territorial est DÉRIVÉ, jamais écrit à la main');

    const ev = await one('select evidence from public.progress_activity_2026 where run_id=$1', [sortie1.runId]);
    assert.equal(ev.eligibility, 'eligible');
    assert.equal(ev.revision, 2, 'une évidence corrigée est une nouvelle révision, pas une réécriture muette');
  });

  await test('le journal dit QUI, QUAND, QUOI — et la note du modérateur', async () => {
    const j = (await q('select * from public.anticheat_review_journal_2026 where review_id=$1', [sortie1.reviewId]))[0];
    assert.equal(j.moderator_id, ids(2));
    assert.equal(j.verdict, 'validated');
    assert.equal(j.run_id, sortie1.runId);
    assert.ok(j.note.startsWith('Poussette'));
    assert.ok(j.decided_at !== null);
  });

  await test('idempotence : le même verdict renvoyé ne rejoue RIEN', async () => {
    const avant = await one('select closed_at from public.anticheat_reviews where id=$1', [sortie1.reviewId]);
    const out = await as(2, () => one(
      'select resolve_anticheat_review_2026($1,$2,$3)', [sortie1.reviewId, 'rejected', 'oups']));
    assert.equal(out.alreadyClosed, true);
    assert.equal(out.finalDecision, 'overturned', 'un dossier clos ne se rejuge pas dans l\'autre sens');
    assert.equal(out.captureReadmitted, 0);
    assert.equal(
      String(await one('select closed_at from public.anticheat_reviews where id=$1', [sortie1.reviewId])),
      String(avant));
    assert.equal(await one('select count(*)::int from public.anticheat_review_journal_2026 where review_id=$1',
      [sortie1.reviewId]), 1, 'une seule ligne de journal pour une seule décision');
  });

  await test('un dossier clos sort de la file', async () => {
    const file = await as(2, () => one('select anticheat_reviews_pending_2026(25)'));
    assert.ok(!file.some((d) => d.reviewId === sortie1.reviewId));
  });

  // ── LE REFUS ──────────────────────────────────────────────────────────────
  await test('« rejected » : la face devient un refus DATÉ, motif conservé', async () => {
    const s = await nouvelleSortie(3);
    const out = await as(2, () => one(
      'select resolve_anticheat_review_2026($1,$2,$3)', [s.reviewId, 'rejected', 'Vitesse soutenue de véhicule.']));
    assert.equal(out.finalDecision, 'upheld');
    assert.equal(out.captureRefused, 1);
    assert.equal(out.captureReadmitted, 0);
    assert.equal(out.xpUnblocked, false);
    const e = (await q('select * from public.capture_events_2026 where run_id=$1', [s.runId]))[0];
    assert.equal(e.status, 'rejected');
    assert.equal(e.reason, 'verification_required',
      'le STATUT porte la finalité, la raison continue de porter la cause (même choix qu\'à l\'expiration, 0156)');
    assert.equal(await one('select anticheat_cleared_2026 from public.runs where id=$1', [s.runId]), null,
      'un refus ne marque JAMAIS la sortie comme validée');
    assert.equal(await one('select game_status_2026 from public.runs where id=$1', [s.runId]), 'rejected');
  });

  // ── LES DEUX HONNÊTETÉS QUI COÛTENT ───────────────────────────────────────
  await test('une face déjà EXPIRÉE n’est pas ressuscitée, et le compte est rendu', async () => {
    const s = await nouvelleSortie(4, { faceStatus: 'pending' });
    // Ce que fait `resolve_pending_captures_2026` (0156) au bout de 24 h.
    await db.query("update public.capture_events_2026 set status='rejected' where run_id=$1", [s.runId]);
    const out = await as(2, () => one(
      'select resolve_anticheat_review_2026($1,$2,null)', [s.reviewId, 'validated']));
    assert.equal(out.finalDecision, 'overturned', 'la sortie EST reconnue honnête');
    assert.equal(out.captureExpired, 1);
    assert.equal(out.captureReadmitted, 0, 'réécrire la carte des jours après coup est ce que §5.5 refuse');
    assert.equal(await one('select status from public.capture_events_2026 where run_id=$1', [s.runId]), 'rejected');
    assert.ok(await one('select anticheat_cleared_2026 is not null from public.runs where id=$1', [s.runId]));
  });

  await test('sans session d’enregistrement, la face reste en attente avec le VRAI motif', async () => {
    const s = await nouvelleSortie(5, { session: false });
    const out = await as(2, () => one(
      'select resolve_anticheat_review_2026($1,$2,null)', [s.reviewId, 'validated']));
    assert.equal(out.captureReadmitted, 0);
    assert.equal(out.captureUnconfirmed, 1);
    const e = (await q('select * from public.capture_events_2026 where run_id=$1', [s.runId]))[0];
    assert.equal(e.status, 'pending', 'la famille du motif est décidée par 0155, pas par 0187');
    assert.equal(e.reason, 'no_recording_session');
    assert.equal(
      await one("select capture_state_for_reason_2026('no_recording_session')"), 'pending',
      'si 0155 changeait d\'avis sur ce motif, 0187 suivrait sans être modifiée');
  });

  await test('la file se lit du plus ANCIEN au plus récent, et se borne', async () => {
    const file = await as(2, () => one('select anticheat_reviews_pending_2026(1)'));
    assert.equal(file.length, 1, 'la borne de page est respectée');
    const toutes = await as(2, () => one('select anticheat_reviews_pending_2026(100)'));
    const dates = toutes.map((d) => d.openedAt);
    assert.deepEqual(dates, [...dates].sort(), 'une file se dépile par le bas');
  });

  console.log(`\n${passed} assertions vertes — 0187.`);
} catch (error) {
  console.error(error);
  process.exit(1);
} finally {
  await db.close();
}
