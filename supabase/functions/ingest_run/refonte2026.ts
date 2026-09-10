/** Active ingestion since 2026.1. The legacy pipeline is deliberately bypassed.
 * Save the sport first; independent progress; stage atomic delayed polygon effects.
 *
 * ─── CONTRAT DE RÉPONSE (lu par apps/mobile RunResult.tsx) ──────────────────
 * `status` (premier niveau) parle de L'ACTIVITÉ SPORTIVE et vaut `'valid'` dès
 * qu'elle est enregistrée : le cahier §5.2 interdit de présenter une sortie
 * sans boucle comme un échec. Il ne dit RIEN du terrain, et rien ne doit être
 * déverrouillé sur lui.
 *
 * `territory2026` est le seul juge du terrain :
 *   status  = published | scheduled | pending | rejected | private | no_loop
 *   reason  = identifiant STABLE (moteur : no_admissible_loop, loop_too_small,
 *             gps_quality_unconfirmed ; base : shared_map_not_authorized,
 *             protected_place, verification_required, source_or_clock_unconfirmed,
 *             no_recording_session, clock_drift_too_large, receipt_window_expired,
 *             closure_crosses_known_barrier, consent_withdrawn, source_deleted,
 *             result_pending). Registre complet : _shared/engine/capture2026.ts.
 *   reasonDetail = les NOMBRES qui expliquent le refus (missingLengthM,
 *             observedAccuracyM, driftS…). Un motif nu ne se raconte pas.
 *   provisional  = true SEULEMENT quand la capture est `scheduled` : les quatre
 *             surfaces sont alors un ESTIMÉ §5.4 contre la possession de
 *             l'instant (0158), pas un acquis — une boucle concurrente publiée
 *             avant la nôtre peut encore en reprendre une part.
 *             false + nombres = chiffres du rejeu, acquis (`published`).
 *             false + null    = rien à annoncer (`pending`, `rejected`,
 *             `private`, `no_loop`) ; `null` n'est PAS zéro.
 *   loopAreaM2 / newTerrainM2 / neutralTakenM2 / takenFromOthersM2 /
 *   alreadyOwnedM2 suivent §5.4 : on ne somme jamais des polygones qui se
 *   recouvrent comme s'ils étaient du terrain neuf.
 *
 * `progression2026.status` (confirmed | pending) est INDÉPENDANT du terrain
 * (§5.5 règle 8 : un échec géographique ne bloque pas les XP sportifs).
 * Un partage ou une progression ne se gate JAMAIS sur `status` de premier
 * niveau : `published` pour annoncer un gain, `progression2026` pour les XP.
 */
import type { SupabaseClient } from 'npm:@supabase/supabase-js@^2';
import { cellToLatLng } from 'npm:h3-js@^4.1';
import { RULESET_VERSION_2026, TERRITORY_RULES_2026, INGEST_MAX_RUNS_PER_HOUR } from '../_shared/game-rules.ts';
import type { IngestRunRequest, IngestRunResponse, RunPoint } from '../_shared/types.ts';
import { analyzeTrace2026, captureRejection2026, CAPTURE_SERVER_REASONS_2026,
  type CaptureServerReason2026 } from '../_shared/engine/capture2026.ts';
import { scoreRun, type AntiCheatDecision } from '../_shared/engine/anticheat.ts';
// §11.3 — la traduction « décision moteur → ligne de revue » existe déjà et est
// testée (anticheat_wiring_test.ts) : on la RÉUTILISE plutôt que d'en écrire une
// seconde, qui divergerait au premier changement de colonne.
import { buildReviewRow, isDuplicateReview, type ReviewableDecision } from './anticheat_wiring.ts';
import { recomputeProgression2026 } from '../_shared/recomputeProgress2026.ts';
// LOT C, ligne du motif d'XP uniquement (constat 3) : un zéro sans motif est un
// silence. Le calcul reste PUR et partagé ; ce fichier ne fait que le rendre.
import { runXpReason2026 } from '../_shared/progression2026.ts';
import { maskedPolylineFor } from './tracePersist.ts';
import { publicationMasks2026 } from './captureMasks2026.ts';

type Request2026 = IngestRunRequest & { recordingSessionId?: string; sharedMapParticipation?: boolean; recordingOwnerId?: string | null };
type Response2026 = IngestRunResponse & {
  territory2026: { ruleset: string; status: string; reason?: string;
    reasonDetail?: Record<string, number>; loopAreaM2: number;
    newTerrainM2: number | null; alreadyOwnedM2: number | null; neutralTakenM2: number | null;
    takenFromOthersM2: number | null; provisional?: boolean; publishAfter?: string };
  progression2026: { status: 'confirmed' | 'pending'; totalXp?: number; xpReason?: string };
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const check = (error: { message: string } | null, context: string) => { if (error) throw new Error(`${context}: ${error.message}`); };

/**
 * R2S-3 — DEUX HORLOGES NE SONT JAMAIS À LA MILLISECONDE L'UNE DE L'AUTRE.
 * L'ancienne version exigeait `p.t >= startedAt && p.t <= receivedAt` au ratio
 * près : deux secondes de dérive NTP — une banalité — suspendaient TOUT le
 * territoire d'une sortie, en silence. La dérive admise vient maintenant de
 * `TERRITORY_RULES_2026.clockToleranceSeconds`, et au-delà le verdict porte son
 * motif ET la dérive mesurée, pour que le joueur puisse l'entendre.
 */
export type ClockVerdict2026 =
  | { verified: true }
  | { verified: false; reason: CaptureServerReason2026; driftS: number };

export function sourceClockVerdict2026(input: {
  source: string; activity: string; clientRunId: string; points: readonly RunPoint[];
  receivedAt: string; session: { activity: string; client_run_id: string; started_at: string } | null;
  toleranceS?: number; unavailableReason?: string;
}): ClockVerdict2026 {
  const tolerance = Math.max(0, input.toleranceS ?? TERRITORY_RULES_2026.clockToleranceSeconds) * 1000;
  const refuse = (reason: CaptureServerReason2026, driftS = 0): ClockVerdict2026 =>
    ({ verified: false, reason, driftS });
  if (!input.session) {
    const named = CAPTURE_SERVER_REASONS_2026.find((r) => r === input.unavailableReason);
    return refuse(named ?? 'no_recording_session');
  }
  if (input.source !== 'gps' || input.session.activity !== input.activity ||
      input.session.client_run_id !== input.clientRunId || !input.points.length) {
    return refuse('source_or_clock_unconfirmed');
  }
  for (let i = 1; i < input.points.length; i++) {
    if (input.points[i]!.t <= input.points[i - 1]!.t) return refuse('source_or_clock_unconfirmed');
  }
  const lower = Date.parse(input.session.started_at), upper = Date.parse(input.receivedAt);
  if (!Number.isFinite(lower) || !Number.isFinite(upper)) return refuse('source_or_clock_unconfirmed');
  let drift = 0;
  for (const p of input.points) drift = Math.max(drift, lower - p.t, p.t - upper);
  if (drift > tolerance) return refuse('clock_drift_too_large', Math.round(drift / 1000));
  return { verified: true };
}

/** Sensor startup can race the server anchor. Preserve the complete sporting
 * record, but only the observed-clock suffix can contribute to authoritative game.
 * The same tolerance applies here : sans elle, une horloge en retard de deux
 * secondes ne laissait AUCUN point après l'ancre, donc aucune capture.
 */
export function pointsAfterAnchor2026(
  points: readonly RunPoint[], startedAt: string,
  toleranceS: number = TERRITORY_RULES_2026.clockToleranceSeconds,
): RunPoint[] {
  const anchor=Date.parse(startedAt)-Math.max(0,toleranceS)*1000;
  if(!Number.isFinite(anchor)) return [];
  const index=points.findIndex(p=>p.t>=anchor);
  if(index<0) return [];
  return points.slice(index).map((p,i)=>i===0?{...p,breakBefore:true}:p);
}

export function requiresReview2026(decision: AntiCheatDecision): boolean {
  return decision === 'MANUAL_REVIEW' || decision === 'REJECT';
}

export async function ingestRefonte2026(db: SupabaseClient, userId: string, body: IngestRunRequest): Promise<Response> {
  const request = body as Request2026;
  if (request.recordingOwnerId !== undefined && request.recordingOwnerId !== userId) return json({error:'recording_owner_mismatch'},403);
  if (!uuid.test(request.clientRunId) || !Number.isFinite(Date.parse(request.startedAt)) ||
    request.points.some(p => !Number.isFinite(p.lat) || Math.abs(p.lat) > 90 || !Number.isFinite(p.lng) || Math.abs(p.lng) > 180 ||
      !Number.isFinite(p.t) || Math.abs(p.t) > 8.64e15 || (p.acc !== undefined && (!Number.isFinite(p.acc) || p.acc < 0))) ||
    (request.recordingSessionId !== undefined && !uuid.test(request.recordingSessionId)) ||
    (request.sharedMapParticipation !== undefined && typeof request.sharedMapParticipation !== 'boolean')) return json({ error: 'invalid_payload' }, 400);
  const activity = request.activity ?? 'run';
  let runId: string | null = null;
  try {
    const rate = await db.rpc('hit_rate_limit', { p_key: `ingest:${userId}`, p_max: INGEST_MAX_RUNS_PER_HOUR, p_window_s: 3600 });
    if (rate.data === false) return json({ error: 'rate_limited' }, 429);
    const account=await db.from('users').select('id,deletion_requested_at').eq('id',userId).maybeSingle();
    check(account.error,'account state');
    if(!account.data || account.data.deletion_requested_at!==null) return json({error:'account_unavailable'},403);
    // First replay historical results unchanged. A pending 2026 run resumes below.
    const old = await db.from('runs').select('*').eq('user_id', userId).eq('client_run_id', request.clientRunId).maybeSingle();
    check(old.error, 'activity replay');
    if (old.data && old.data.ruleset_version !== RULESET_VERSION_2026) return json({
      ...(old.data.celebration ?? {status:old.data.status,distanceM:old.data.distance_m,durationS:old.data.duration_s,
        avgPaceSKm:old.data.avg_pace_s_km??0,pointsAwarded:old.data.points_awarded??0,xpAwarded:old.data.xp_awarded??0,
        fouleesAwarded:0,hexes:{claimed:0,stolen:0,defended:0,pioneer:0,blocked:0},streak:{weeks:0,multiplier:1},results:[],newBadges:[]}),
      runId:old.data.id,replayed:true,
    });
    if (old.data?.celebration && old.data.game_status_2026 !== 'pending' && old.data.celebration.progression2026?.status === 'confirmed') {
      const territory = await db.rpc('capture_result_2026', { p_run_id: old.data.id });
      return json({ ...old.data.celebration, ...(territory.data ? { territory2026: territory.data } : {}), replayed: true });
    }
    let run = old.data;
    if (!run) {
      const analysis = analyzeTrace2026(request.points, activity);
      const distanceM = Math.max(0, Math.round(analysis.distanceM));
      const durationS = Math.max(0, Math.round(analysis.durationS));
      const endMs = request.points.at(-1)?.t ?? Date.parse(request.startedAt);
      // Includes timestamps: doing the same route on another day is a real activity.
      const fingerprint = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(request.points.map(p => [p.lat,p.lng,p.t])))))).map(b => b.toString(16).padStart(2,'0')).join('');
      const duplicate = await db.from('runs').select('id').eq('user_id', userId).eq('polyline_hash', fingerprint).limit(1).maybeSingle();
      check(duplicate.error, 'activity deduplication');
      if (duplicate.data && request.points.length > 1) return json({ status: 'duplicate', runId: duplicate.data.id, replayed: false });
      const saved = await db.from('runs').upsert({
        user_id: userId, client_run_id: request.clientRunId, source: request.source, activity,
        started_at: request.startedAt, ended_at_2026: new Date(endMs).toISOString(),
        status: 'valid', distance_m: distanceM, duration_s: durationS,
        avg_pace_s_km: distanceM > 0 && durationS > 0 ? Math.max(1,Math.round(durationS*1000/distanceM)) : null,
        points_awarded: 0, xp_awarded: 0, ruleset_version: RULESET_VERSION_2026,
        game_status_2026: 'pending', trace_points_2026: request.points, polyline_hash: fingerprint,
        recording_session_id_2026: request.recordingSessionId ?? null,
        // ── LES DEUX SIGNAUX DE CAPTEUR SONT PERSISTÉS AVEC LA COURSE ────────
        // Ils sont scellés ICI, à la première écriture, et jamais relus de la
        // requête ensuite : un renvoi du même `clientRunId` ne doit pas pouvoir
        // rendre une décision anti-triche différente de la première (le moteur
        // est déterministe ; ses ENTRÉES doivent l'être aussi). `null` garde son
        // sens exact dans les deux cas — « l'appareil n'a rien mesuré », jamais
        // « zéro ».
        step_count: typeof request.stepCount === 'number' && Number.isFinite(request.stepCount)
          ? Math.max(0, Math.round(request.stepCount))
          : null,
        mocked_location_2026: typeof request.mockedLocation === 'boolean' ? request.mockedLocation : null,
        shared_map_consent_2026: request.sharedMapParticipation === true && request.runMode !== 'course_privee',
      }, { onConflict: 'user_id,client_run_id', ignoreDuplicates: true }).select('*').maybeSingle();
      check(saved.error, 'durable activity');
      if (saved.data) run = saved.data;
      else {
        const replay = await db.from('runs').select('*').eq('user_id',userId).eq('client_run_id',request.clientRunId).single();
        check(replay.error,'concurrent activity'); run = replay.data;
      }
    }
    runId = run.id;
    const points = run.trace_points_2026 as RunPoint[]; // Retry uses the immutable saved evidence.
    const analysis = analyzeTrace2026(points,run.activity);
    const result: Response2026 = {
      runId: run.id, status: 'valid', replayed: old.data !== null, distanceM: run.distance_m,
      durationS: run.duration_s, avgPaceSKm: run.avg_pace_s_km ?? 0,
      hexes: { claimed:0, stolen:0, defended:0, pioneer:0, blocked:0 },
      pointsAwarded:0, fouleesAwarded:0, xpAwarded:0, streak:{weeks:0,multiplier:1}, results:[], newBadges:[],
      territory2026: { ruleset:RULESET_VERSION_2026,status:'pending',loopAreaM2:0,newTerrainM2:null,alreadyOwnedM2:null,neutralTakenM2:null,takenFromOthersM2:null },
      progression2026: { status:'pending' },
    };
    // R2S-8 — UN DÉPART SANS SESSION RESTE RÉCUPÉRABLE. `begin_recording_2026`
    // part en « fire and forget » côté client : réseau coupé au départ = aucune
    // session, donc capture suspendue à vie. Le cahier §5.5 ADMET le hors-ligne
    // sous 24 h : le serveur reconstitue la session à partir de l'évidence déjà
    // persistée (jamais d'un champ de requête), et la marque comme adoptée.
    const adoption = await db.rpc('adopt_recording_session_2026',{p_run_id:run.id,
      p_clock_tolerance_s:TERRITORY_RULES_2026.clockToleranceSeconds,
      p_receipt_max_hours:TERRITORY_RULES_2026.captureReceiptMaxAgeHours});
    const adopted = (adoption.data ?? null) as { id?:string; reason?:string } | null;
    const sessionId = adopted?.id ?? run.recording_session_id_2026 ?? null;
    const sessionResult = sessionId
      ? await db.from('recording_sessions_2026').select('activity,client_run_id,started_at').eq('id',sessionId).eq('user_id',userId).maybeSingle()
      : { data:null,error:null };
    const anchoredPoints=sessionResult.data ? pointsAfterAnchor2026(points,sessionResult.data.started_at) : [];
    const clock = sessionResult.error
      ? { verified:false as const, reason:'source_or_clock_unconfirmed' as const, driftS:0 }
      : sourceClockVerdict2026({ source:run.source,activity:run.activity,clientRunId:run.client_run_id,
          points:anchoredPoints,receivedAt:run.created_at,session:sessionResult.data,
          ...(adopted?.reason ? { unavailableReason:adopted.reason } : {}) });
    const sourceVerified = clock.verified;
    const authoritativeAnalysis=sourceVerified?analyzeTrace2026(anchoredPoints,run.activity):analysis;
    // ── §18.4 — LES SIGNAUX DE CAPTEUR ATTEIGNENT ENFIN LE MOTEUR ───────────
    // Ils étaient collectés et transmis depuis des mois (`IngestRunRequest.
    // stepCount`, alimenté par `Pedometer.watchStepCount` côté mobile), stockés
    // en base par le pipeline historique... et JAMAIS passés à `scoreRun` par
    // le pipeline de septembre, seul actif. Conséquence mesurable : le signal
    // `step_coherence` — celui qui dit « ce déplacement n'est pas pédestre »,
    // c'est-à-dire le SEUL qui démasque un vélo déclaré « course » — sortait
    // systématiquement « indisponible » en production. La donnée existait, la
    // règle existait, le fil entre les deux était coupé.
    //
    // Les entrées viennent de la LIGNE `runs`, pas de la requête : un renvoi ne
    // peut pas changer la décision (cf. le scellement à l'upsert).
    const antiCheat = scoreRun({ points:sourceVerified?anchoredPoints:points, activity:run.activity, source:run.source, now:Date.parse(run.created_at),
      ...(typeof run.step_count === 'number' ? { stepCount: run.step_count } : {}),
      ...(typeof run.mocked_location_2026 === 'boolean' ? { mockedLocation: run.mocked_location_2026 } : {}) });
    // Legacy segment eligibility excludes slow outings from territorial pace
    // bands. It is not a review signal in September's independent sporting XP.
    //
    // ── UNE VÉRIFICATION HUMAINE NE SE REDEMANDE PAS (migration 0187) ───────
    // Le moteur est DÉTERMINISTE : sur l'évidence scellée à l'upsert, il rendra
    // éternellement la même décision `MANUAL_REVIEW`. Sans cette lecture, un
    // simple renvoi du même `clientRunId` regèlerait, via `stage_capture_2026`,
    // la face qu'un modérateur vient de dégeler — la décision humaine serait
    // réversible par accident, et le joueur perdrait deux fois le même terrain.
    // `runs.anticheat_cleared_2026` est le fait durable écrit par
    // `resolve_anticheat_review_2026` ; il ne dit pas que la sortie est propre,
    // il dit qu'une personne l'a déjà jugée. Un refus n'écrit rien ici : la
    // vérification reste alors demandée, et c'est ce qu'on veut.
    const reviewRequired = requiresReview2026(antiCheat.decision) &&
      run.anticheat_cleared_2026 == null;
    // ── §11.3/§11.4 — LA RAISON D'UN GEL EST ÉCRITE QUELQUE PART ────────────
    // `reviewRequired` suffisait à REFUSER la capture (`p_review_required` →
    // `verification_required`, migration 0155) mais n'écrivait RIEN : ni le
    // score, ni les signaux, ni leurs preuves chiffrées. Une sortie repartait
    // sans terrain et le dépôt entier ne savait pas dire pourquoi — ni pour un
    // opérateur, ni pour le joueur qui fait appel (E28). `anticheat_reviews`
    // (0081) attendait depuis le lot 9, vide par construction.
    //
    // BEST-EFFORT ASSUMÉ, comme dans le pipeline historique : la capture est
    // déjà refusée quoi qu'il arrive ici. Faire échouer l'ingestion parce que
    // la ligne d'audit n'est pas passée priverait le joueur de son résultat
    // sportif sans rien protéger. Idempotence PAR LA CONTRAINTE (`run_id`
    // unique) et non par un `select` préalable : deux renvois simultanés ne
    // peuvent pas empiler deux dossiers du même fait.
    //
    // VIE PRIVÉE (§12, 0081) : `signals` ne porte que des nombres — parts de
    // durée, écarts, seuils. Le moteur n'émet aucune coordonnée, précisément
    // parce que ce rapport voyage jusqu'à la revue et jusqu'à l'appel.
    if (reviewRequired) {
      try {
        const review = await db.from('anticheat_reviews').insert(buildReviewRow({
          runId: run.id, userId,
          review: { system_decision: antiCheat.decision as ReviewableDecision,
            suspicion: antiCheat.suspicion, signals: antiCheat.signals },
        }));
        if (review.error && !isDuplicateReview(review.error.code)) {
          console.error('[ingest2026] anticheat review pending (capture déjà refusée):', review.error.message);
        }
      } catch(e) { console.error('[ingest2026] anticheat review pending (verdict inchangé)',e); }
    }
    // XP failure and geometry failure are independent and both resumable.
    try {
      const evidence = { canonicalId:run.id,revision:1,sport:run.activity,startedAt:run.started_at,endedAt:run.ended_at_2026,
        receivedAt:run.created_at,source:run.source==='gps'?'gps':'manual',eligibility:sourceVerified&&!reviewRequired?'eligible':'review',movement:authoritativeAnalysis.movingIntervals };
      const recorded = await db.rpc('record_progress_evidence_2026',{p_run_id:run.id,p_evidence:evidence});
      check(recorded.error,'sport evidence');
      const committed = await recomputeProgression2026(db, userId, run.id);
      result.xpAwarded = committed.runXpAwarded ?? Math.max(0, committed.xpDelta);
      result.progression2026 = { status:'confirmed',totalXp:committed.ledger.totalXp,xpReason:runXpReason2026(committed.ledger,run.id,result.xpAwarded) };
    } catch (e) { console.error('[ingest2026] progress pending',e); }
    try {
      const privacy=await db.rpc('privacy_masks_2026',{p_user_id:userId});
      check(privacy.error,'privacy masks');
      if (!Array.isArray(privacy.data)) throw new Error('privacy_masks_unavailable');
      const personalMasks=(privacy.data as {centerH3:string;radiusM:number}[]).map(z=>{const [lat,lng]=cellToLatLng(z.centerH3);return {lat,lng,radiusM:z.radiusM};});
      const masks=publicationMasks2026(personalMasks,points,anchoredPoints);
      const publishAfter=new Date(Math.max(Date.now(),Date.parse(run.ended_at_2026))+TERRITORY_RULES_2026.publicationDelayMinutes*60_000).toISOString();
      const staged=await db.rpc('stage_game_activity_2026',{p_run_id:run.id,p_faces:authoritativeAnalysis.faces,
        p_segments:authoritativeAnalysis.segments.filter(segment=>segment.length>1).map(segment=>({type:'LineString',coordinates:segment.map(p=>[p.lng,p.lat])})),p_masks:masks.capture,
        p_publish_after:publishAfter,p_min_area_m2:TERRITORY_RULES_2026[run.activity as 'run'|'bike'].minAreaM2,
        p_receipt_max_hours:TERRITORY_RULES_2026.captureReceiptMaxAgeHours,p_source_verified:sourceVerified,p_review_required:reviewRequired,
        p_clock_tolerance_s:TERRITORY_RULES_2026.clockToleranceSeconds,
        p_unverified_reason:clock.verified?null:clock.reason});
      check(staged.error,'capture staging');
      // Défis de la semaine (migration 0166) : le carreau et la signature d'une
      // boucle se calculent sur le GeoJSON produit par le moteur PUR, ici et
      // maintenant, sans PostGIS — c'est ce qui garde la règle rejouable sous
      // PGlite. Le rangement est idempotent et n'écrit QUE pour les faces que
      // la mise en scène vient de retenir. Isolé : un échec de ce fait
      // secondaire ne doit coûter ni le résultat de capture, ni la trace
      // masquée qui le suivent.
      try {
        const localities=await db.rpc('note_weekly_quest_faces_2026',{p_run_id:run.id,p_faces:authoritativeAnalysis.faces});
        check(localities.error,'weekly quest localities');
      } catch(e) { console.error('[ingest2026] weekly quest localities pending',e); }
      const capture=await db.rpc('capture_result_2026',{p_run_id:run.id});
      check(capture.error,'capture result'); result.territory2026=capture.data;
      // R2S-5/9 — « Choisir le motif exact » (§5.5). Le moteur rend un
      // identifiant STABLE et les nombres qui l'expliquent au joueur ; l'écran
      // n'a plus à deviner ce qui a manqué.
      if(result.territory2026.status==='no_loop') {
        const rejection=captureRejection2026(authoritativeAnalysis,run.activity as 'run'|'bike');
        if(rejection) {
          result.territory2026.reason=rejection.code;
          result.territory2026.reasonDetail=rejection.detail;
          const reason=await db.from('runs').update({game_reason_2026:rejection.code}).eq('id',run.id);
          check(reason.error,'capture reason');
        }
      }
      // La dérive mesurée voyage avec son motif : « ton téléphone avance de N s »
      // vaut mieux qu'un « origine ou horaire à confirmer » incompréhensible.
      if(!clock.verified && clock.driftS>0 && result.territory2026.reason===clock.reason) {
        result.territory2026.reasonDetail={driftS:clock.driftS,
          toleranceS:TERRITORY_RULES_2026.clockToleranceSeconds};
      }
      // Only publish a masked trace. Never join disjoint trace segments for media.
      const masked=analysis.segments.length===1 ? maskedPolylineFor(points,masks.media.map(m=>({center:{lat:m.lat,lng:m.lng},radiusM:m.radiusM}))) : null;
      const stored=await db.from('runs').update({polyline_masked:masked}).eq('id',run.id);
      check(stored.error,'masked trace');
    } catch(e) {
      console.error('[ingest2026] geometry pending; activity saved',e);
      // L'activité est sauvée, le terrain non traité. On le DIT plutôt que de
      // laisser un `pending` muet ressembler à une attente de publication.
      if(result.territory2026.status==='pending' && !result.territory2026.reason) {
        result.territory2026.reason='result_pending';
      }
    }
    const celebration=await db.from('runs').update({celebration:result}).eq('id',run.id);
    check(celebration.error,'activity result');
    return json(result);
  } catch(error) {
    console.error('[ingest2026]',error);
    return runId ? json({runId,status:'valid',saved:true,gameStatus:'pending',error:'result_pending'},202)
      : json({error:'activity_save_failed'},503);
  }
}
