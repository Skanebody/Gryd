/** Active ingestion since 2026.1. The legacy pipeline is deliberately bypassed.
 * Save the sport first; independent progress; stage atomic delayed polygon effects.
 */
import type { SupabaseClient } from 'npm:@supabase/supabase-js@^2';
import { cellToLatLng } from 'npm:h3-js@^4.1';
import { RULESET_VERSION_2026, TERRITORY_RULES_2026, INGEST_MAX_RUNS_PER_HOUR } from '../_shared/game-rules.ts';
import type { IngestRunRequest, IngestRunResponse, RunPoint } from '../_shared/types.ts';
import { analyzeTrace2026 } from '../_shared/engine/capture2026.ts';
import { scoreRun, type AntiCheatDecision } from '../_shared/engine/anticheat.ts';
import { recomputeProgression2026 } from '../_shared/recomputeProgress2026.ts';
// LOT C, ligne du motif d'XP uniquement (constat 3) : un zéro sans motif est un
// silence. Le calcul reste PUR et partagé ; ce fichier ne fait que le rendre.
import { runXpReason2026 } from '../_shared/progression2026.ts';
import { maskedPolylineFor } from './tracePersist.ts';
import { publicationMasks2026 } from './captureMasks2026.ts';

type Request2026 = IngestRunRequest & { recordingSessionId?: string; sharedMapParticipation?: boolean; recordingOwnerId?: string | null };
type Response2026 = IngestRunResponse & {
  territory2026: { ruleset: string; status: string; reason?: string; loopAreaM2: number;
    newTerrainM2: number | null; alreadyOwnedM2: number | null; neutralTakenM2: number | null;
    takenFromOthersM2: number | null; publishAfter?: string };
  progression2026: { status: 'confirmed' | 'pending'; totalXp?: number; xpReason?: string };
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const check = (error: { message: string } | null, context: string) => { if (error) throw new Error(`${context}: ${error.message}`); };

export function sourceClockVerified2026(input: {
  source: string; activity: string; clientRunId: string; points: readonly RunPoint[];
  receivedAt: string; session: { activity: string; client_run_id: string; started_at: string } | null;
}): boolean {
  if (input.source !== 'gps' || !input.session || input.session.activity !== input.activity ||
      input.session.client_run_id !== input.clientRunId || !input.points.length) return false;
  const lower = Date.parse(input.session.started_at), upper = Date.parse(input.receivedAt);
  return input.points.every((p, i) => p.t >= lower && p.t <= upper && (i === 0 || p.t > input.points[i - 1]!.t));
}

/** Sensor startup can race the server anchor. Preserve the complete sporting
 * record, but only the observed-clock suffix can contribute to authoritative game.
 */
export function pointsAfterAnchor2026(points: readonly RunPoint[], startedAt: string): RunPoint[] {
  const anchor=Date.parse(startedAt);
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
    const sessionResult = run.recording_session_id_2026
      ? await db.from('recording_sessions_2026').select('activity,client_run_id,started_at').eq('id',run.recording_session_id_2026).eq('user_id',userId).maybeSingle()
      : { data:null,error:null };
    const anchoredPoints=sessionResult.data ? pointsAfterAnchor2026(points,sessionResult.data.started_at) : [];
    const sourceVerified = !sessionResult.error && sourceClockVerified2026({ source:run.source,activity:run.activity,clientRunId:run.client_run_id,points:anchoredPoints,receivedAt:run.created_at,session:sessionResult.data });
    const authoritativeAnalysis=sourceVerified?analyzeTrace2026(anchoredPoints,run.activity):analysis;
    const antiCheat = scoreRun({ points:sourceVerified?anchoredPoints:points, activity:run.activity, source:run.source, now:Date.parse(run.created_at) });
    // Legacy segment eligibility excludes slow outings from territorial pace
    // bands. It is not a review signal in September's independent sporting XP.
    const reviewRequired = requiresReview2026(antiCheat.decision);
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
        p_receipt_max_hours:TERRITORY_RULES_2026.captureReceiptMaxAgeHours,p_source_verified:sourceVerified,p_review_required:reviewRequired});
      check(staged.error,'capture staging');
      const capture=await db.rpc('capture_result_2026',{p_run_id:run.id});
      check(capture.error,'capture result'); result.territory2026=capture.data;
      if(result.territory2026.status==='no_loop') {
        result.territory2026.reason=authoritativeAnalysis.qualityBreaks>0?'gps_quality_unconfirmed':authoritativeAnalysis.rejectedSmallLoops>0?'loop_too_small':'no_admissible_loop';
        const reason=await db.from('runs').update({game_reason_2026:result.territory2026.reason}).eq('id',run.id);
        check(reason.error,'capture reason');
      }
      // Only publish a masked trace. Never join disjoint trace segments for media.
      const masked=analysis.segments.length===1 ? maskedPolylineFor(points,masks.media.map(m=>({center:{lat:m.lat,lng:m.lng},radiusM:m.radiusM}))) : null;
      const stored=await db.from('runs').update({polyline_masked:masked}).eq('id',run.id);
      check(stored.error,'masked trace');
    } catch(e) { console.error('[ingest2026] geometry pending; activity saved',e); }
    const celebration=await db.from('runs').update({celebration:result}).eq('id',run.id);
    check(celebration.error,'activity result');
    return json(result);
  } catch(error) {
    console.error('[ingest2026]',error);
    return runId ? json({runId,status:'valid',saved:true,gameStatus:'pending',error:'result_pending'},202)
      : json({error:'activity_save_failed'},503);
  }
}
