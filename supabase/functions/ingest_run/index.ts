/**
 * GRYD — Edge Function ingest_run (SPEC §6.3, AMENDEMENT-02 §2/§3/§4).
 *
 * Pipeline : auth JWT → idempotence (user_id, client_run_id) → validation §3.2
 * → hexing H3 → lecture état (hexes, privacy, no-capture, densité) →
 * decideClaims (pur) → RPC claim_hexes (application atomique) → runs.celebration.
 *
 * Toute la logique de jeu vit dans les modules purs du moteur @klaim/engine
 * (validation/hexing/claims/scoring), consommés via les copies générées
 * _shared/engine/ — ce fichier ne fait QUE de l'orchestration et de l'I/O.
 *
 * IDEMPOTENCE (D14) : le client génère clientRunId avant la course ; si la
 * paire (user_id, client_run_id) existe déjà, on renvoie le payload
 * `celebration` persisté avec replayed:true, sans AUCUN recalcul.
 */
import { createClient } from 'npm:@supabase/supabase-js@^2';
import { cellToLatLng } from 'npm:h3-js@^4.1';
import { DECAY_DAYS } from '../_shared/game-rules.ts';
import type {
  HexClaimResult,
  IngestRunRequest,
  IngestRunResponse,
  RunStatus,
} from '../_shared/types.ts';
import {
  claimableSegments,
  computeStats,
  filterPoints,
  haversineM,
  MOTION_TRUST_FLAGGED_BELOW,
  stepCoherence,
  validateRun,
} from '../_shared/engine/validation.ts';
import {
  type GeoJsonPolygonal,
  hexesForSegments,
  pointInGeoJson,
} from '../_shared/engine/hexing.ts';
import { decideClaims, type HexState } from '../_shared/engine/claims.ts';
import {
  computeScore,
  distributePointsAdjustment,
  streakMultiplier,
} from '../_shared/engine/scoring.ts';

const MS_PER_DAY = 86_400_000;
const DB_IN_CHUNK = 500; // taille des batches pour les clauses `in(...)`

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false, autoRefreshToken: false } },
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Index H3 (string hexadécimale) → BIGINT décimal pour la DB (D13). */
const h3ToDb = (h3: string): string => BigInt(`0x${h3}`).toString();
/** BIGINT décimal DB → index H3 string. */
const dbToH3 = (v: string | number): string => BigInt(v).toString(16);

function chunk<T>(arr: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

const ZONE_DENSITIES = new Set(['active', 'emerging', 'pioneer', 'wild']);

function isIngestRunRequest(body: unknown): body is IngestRunRequest {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  return typeof b.clientRunId === 'string' && b.clientRunId.length > 0 &&
    (b.source === 'gps' || b.source === 'healthkit') &&
    typeof b.startedAt === 'string' &&
    Array.isArray(b.points) &&
    b.points.every((p) =>
      typeof p === 'object' && p !== null &&
      typeof (p as Record<string, unknown>).lat === 'number' &&
      typeof (p as Record<string, unknown>).lng === 'number' &&
      typeof (p as Record<string, unknown>).t === 'number'
    ) &&
    (b.stepCount === undefined || typeof b.stepCount === 'number');
}

interface UserProfile {
  created_at: string;
  streak_weeks: number;
  is_club: boolean;
}

/** Réponse minimale reconstruite depuis la ligne runs quand celebration manque
 * (course insérée mais RPC interrompue lors d'une tentative précédente). */
function fallbackResponse(run: {
  id: string;
  status: RunStatus;
  reject_reason: string | null;
  distance_m: number;
  duration_s: number;
  avg_pace_s_km: number | null;
  points_awarded: number;
  xp_awarded?: number | null;
}, streakWeeks: number): IngestRunResponse {
  return {
    runId: run.id,
    status: run.status,
    rejectReason: (run.reject_reason ?? undefined) as IngestRunResponse['rejectReason'],
    replayed: true,
    distanceM: run.distance_m,
    durationS: run.duration_s,
    avgPaceSKm: run.avg_pace_s_km ?? 0,
    hexes: { claimed: 0, stolen: 0, defended: 0, pioneer: 0, blocked: 0 },
    pointsAwarded: run.points_awarded,
    fouleesAwarded: 0,
    xpAwarded: run.xp_awarded ?? 0,
    streak: { weeks: streakWeeks, multiplier: streakMultiplier(streakWeeks) },
    results: [],
  };
}

// ─── Lectures d'état ─────────────────────────────────────────────────────────

async function loadHexStates(
  hexes: readonly string[],
): Promise<ReadonlyMap<string, HexState>> {
  const states = new Map<string, HexState>();
  for (const batch of chunk(hexes.map(h3ToDb), DB_IN_CHUNK)) {
    const { data, error } = await supabase
      .from('hex_claims')
      .select('h3index, owner_user_id, claimed_at, locked_until, shielded_until, decay_at')
      .in('h3index', batch);
    if (error) throw new Error(`hex_claims read: ${error.message}`);
    for (const row of data ?? []) {
      const decayAt = row.decay_at ? new Date(row.decay_at) : null;
      states.set(dbToH3(row.h3index), {
        ownerUserId: row.owner_user_id,
        lockedUntil: row.locked_until ? new Date(row.locked_until) : null,
        shieldedUntil: row.shielded_until ? new Date(row.shielded_until) : null,
        decayAt,
        // Approximation MVP : decay_at est repoussé à chaque défense/claim à
        // now + DECAY_DAYS → dernière défense ≈ decay_at − DECAY_DAYS.
        // (decay_at null = territoire protégé nouveau joueur → cooldown depuis claimed_at.)
        lastDefendedAt: decayAt
          ? new Date(decayAt.getTime() - DECAY_DAYS * MS_PER_DAY)
          : new Date(row.claimed_at),
        everOwned: true,
      });
    }
  }
  return states;
}

async function loadOwnersCreatedAt(
  states: ReadonlyMap<string, HexState>,
  userId: string,
): Promise<ReadonlyMap<string, Date>> {
  const ownerIds = [
    ...new Set(
      [...states.values()]
        .map((s) => s.ownerUserId)
        .filter((id): id is string => id !== null && id !== userId),
    ),
  ];
  const map = new Map<string, Date>();
  for (const batch of chunk(ownerIds, DB_IN_CHUNK)) {
    const { data, error } = await supabase.from('users').select('id, created_at').in('id', batch);
    if (error) throw new Error(`users read: ${error.message}`);
    for (const row of data ?? []) map.set(row.id, new Date(row.created_at));
  }
  return map;
}

/** Hexes de la course situés dans une zone privée du coureur (§7 : centre res 8 + rayon). */
async function loadPrivacyHexes(
  userId: string,
  hexes: readonly string[],
): Promise<ReadonlySet<string>> {
  const { data, error } = await supabase
    .from('privacy_zones')
    .select('center_h3_res8, radius_m')
    .eq('user_id', userId);
  if (error) throw new Error(`privacy_zones read: ${error.message}`);
  const zones = (data ?? []).map((z) => {
    const [lat, lng] = cellToLatLng(dbToH3(z.center_h3_res8));
    return { lat, lng, radiusM: z.radius_m as number };
  });
  const result = new Set<string>();
  if (zones.length === 0) return result;
  for (const hex of hexes) {
    const [lat, lng] = cellToLatLng(hex);
    if (zones.some((z) => haversineM({ lat, lng }, z) <= z.radiusM)) result.add(hex);
  }
  return result;
}

/** Hexes de la course dans une zone non capturable (AMENDEMENT-02 §2). */
async function loadNoCaptureHexes(hexes: readonly string[]): Promise<ReadonlySet<string>> {
  const result = new Set<string>();
  const { data, error } = await supabase.from('no_capture_zones').select('geojson');
  // Table absente/vide → aucune zone interdite (la migration peut arriver après nous).
  if (error || !data || data.length === 0) return result;
  const zones = data.map((z) => z.geojson as GeoJsonPolygonal);
  for (const hex of hexes) {
    const [lat, lng] = cellToLatLng(hex);
    if (zones.some((z) => z && pointInGeoJson(lat, lng, z))) result.add(hex);
  }
  return result;
}

/** Densité globale de la course : city_zones.status si connue, sinon 'wild'. */
async function loadDensity(cityId: string | undefined): Promise<'active' | 'emerging' | 'pioneer' | 'wild'> {
  if (!cityId) return 'wild';
  const { data, error } = await supabase
    .from('city_zones')
    .select('status')
    .eq('city_id', cityId)
    .maybeSingle();
  if (error || !data) return 'wild';
  return ZONE_DENSITIES.has(data.status) ? data.status : 'wild';
}

/** Hexes déjà pris/défendus aujourd'hui (UTC) — approximation MVP du plafond §6.4
 * (les hexes volés au coureur depuis ce matin sortent du compte). */
async function loadClaimsToday(userId: string, now: Date): Promise<number> {
  const dayStart = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  )).toISOString();
  const { count, error } = await supabase
    .from('hex_claims')
    .select('h3index', { count: 'exact', head: true })
    .eq('owner_user_id', userId)
    .gte('claimed_at', dayStart);
  if (error) throw new Error(`claims count: ${error.message}`);
  return count ?? 0;
}

// ─── Handler ─────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  // Auth JWT (le client appelle avec son access token Supabase).
  const authHeader = req.headers.get('authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  if (!jwt) return json({ error: 'missing_authorization' }, 401);
  const { data: userData, error: authError } = await supabase.auth.getUser(jwt);
  if (authError || !userData?.user) return json({ error: 'invalid_token' }, 401);
  const userId = userData.user.id;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  if (!isIngestRunRequest(body)) return json({ error: 'invalid_payload' }, 400);
  const request = body;

  try {
    // Profil (streak, club, ancienneté) — nécessaire même pour le replay/rejet.
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('created_at, streak_weeks, is_club')
      .eq('id', userId)
      .single<UserProfile>();
    if (profileError || !profile) return json({ error: 'unknown_user' }, 403);

    // ── Idempotence : zéro recalcul sur retry ────────────────────────────────
    const { data: existing, error: existingError } = await supabase
      .from('runs')
      .select('id, status, reject_reason, distance_m, duration_s, avg_pace_s_km, points_awarded, xp_awarded, celebration')
      .eq('user_id', userId)
      .eq('client_run_id', request.clientRunId)
      .maybeSingle();
    if (existingError) throw new Error(`runs read: ${existingError.message}`);
    if (existing) {
      const payload = existing.celebration as IngestRunResponse | null;
      return json(
        payload
          ? { ...payload, replayed: true }
          : fallbackResponse(existing, profile.streak_weeks),
      );
    }

    const now = new Date();

    // ── Validation §3.2 (pur) ────────────────────────────────────────────────
    const filtered = filterPoints(request.points);
    const stats = computeStats(filtered.segments);
    const validation = validateOrStatus(filtered, stats, request.stepCount);

    const distanceM = Math.round(stats.distanceM);
    const durationS = Math.round(stats.durationS);
    const avgPaceSKm = Math.round(stats.avgPaceSKm);
    const streak = {
      weeks: profile.streak_weeks,
      multiplier: streakMultiplier(profile.streak_weeks),
    };

    const baseRow = {
      user_id: userId,
      client_run_id: request.clientRunId,
      source: request.source,
      started_at: request.startedAt,
      distance_m: distanceM,
      duration_s: durationS,
      avg_pace_s_km: avgPaceSKm > 0 ? avgPaceSKm : null,
      gps_trust: validation.gpsTrust,
      motion_trust: validation.motionTrust,
      trust_score: validation.trustScore,
      step_count: request.stepCount ?? null,
    };

    // ── Course rejetée ou gelée : insérée, AUCUNE écriture hex ───────────────
    if (validation.kind !== 'claimable') {
      const response: IngestRunResponse = {
        runId: '', // complété après insert
        status: validation.kind === 'rejected' ? 'rejected' : 'flagged',
        rejectReason: validation.kind === 'rejected' ? validation.reason : undefined,
        replayed: false,
        distanceM,
        durationS,
        avgPaceSKm,
        hexes: { claimed: 0, stolen: 0, defended: 0, pioneer: 0, blocked: 0 },
        pointsAwarded: 0,
        fouleesAwarded: 0,
        xpAwarded: 0,
        streak,
        results: [],
      };
      const inserted = await insertRun({
        ...baseRow,
        status: response.status,
        reject_reason: response.rejectReason ?? null,
        points_awarded: 0,
        xp_awarded: 0,
      }, userId, request.clientRunId, profile.streak_weeks);
      if (inserted.replayed) return json(inserted.payload);
      response.runId = inserted.runId;
      await persistCelebration(inserted.runId, response, 0);
      return json(response);
    }

    // ── Hexing (pur) ─────────────────────────────────────────────────────────
    const hexes = hexesForSegments(validation.claimable);

    // ── Lecture d'état + décision (pur) ──────────────────────────────────────
    const states = await loadHexStates(hexes);
    const [ownersCreatedAt, privacyHexes, noCaptureHexes, density, claimsToday] = await Promise
      .all([
        loadOwnersCreatedAt(states, userId),
        loadPrivacyHexes(userId, hexes),
        loadNoCaptureHexes(hexes),
        loadDensity(request.cityId),
        loadClaimsToday(userId, now),
      ]);

    const decision = decideClaims({
      hexes,
      states,
      context: {
        userId,
        userCreatedAt: new Date(profile.created_at),
        now,
        ownersCreatedAt,
        privacyHexes,
        noCaptureHexes,
        zoneDensity: density,
        claimsToday,
      },
    });

    // ── Scoring (pur) ────────────────────────────────────────────────────────
    const score = computeScore({
      basePoints: decision.totals.points,
      streakWeeks: profile.streak_weeks,
      isClub: profile.is_club,
      performance: {
        dataReliability: validation.gpsTrust / 100,
        isRegular: profile.streak_weeks >= 1,
      },
    });

    // ── Insert runs PUIS RPC (claim_hexes vérifie l'existence du run) ────────
    const inserted = await insertRun({
      ...baseRow,
      status: validation.status,
      reject_reason: null,
      points_awarded: score.points,
      xp_awarded: score.xp,
    }, userId, request.clientRunId, profile.streak_weeks);
    if (inserted.replayed) return json(inserted.payload);
    const runId = inserted.runId;

    // ── Application atomique via la RPC claim_hexes ──────────────────────────
    const actionable = decision.results.filter((r) =>
      r.outcome === 'claimed_neutral' || r.outcome === 'stolen' ||
      r.outcome === 'defended' || r.outcome === 'already_owned_cooldown'
    );
    if (actionable.length > 0) {
      // La RPC crédite season_scores/Foulées depuis la somme des points par hex :
      // on y répartit le total FINAL (streak × performance, floored).
      const finalPerHex = distributePointsAdjustment(
        actionable.map((r) => r.points),
        score.points,
      );
      const rpcClaims = actionable.map((r, i) => ({
        h3index: h3ToDb(r.h3),
        outcome: rpcOutcome(r),
        points: finalPerHex[i],
        locked_until: r.outcome === 'claimed_neutral' || r.outcome === 'stolen'
          ? decision.lockedUntil.toISOString()
          : null,
        // Nouveau joueur : territoire exempt de decay (§3.3) → decay_at null.
        decay_at: decision.decayExempt ? null : decision.decayAt.toISOString(),
      }));
      const { error: rpcError } = await supabase.rpc('claim_hexes', {
        p_run_id: runId,
        p_user_id: userId,
        p_city_id: request.cityId ?? null,
        p_claims: rpcClaims,
      });
      if (rpcError) throw new Error(`claim_hexes rpc: ${rpcError.message}`);
    }

    // ── Célébration persistée (source du replay idempotent) ──────────────────
    const response: IngestRunResponse = {
      runId,
      status: validation.status,
      replayed: false,
      distanceM,
      durationS,
      avgPaceSKm,
      hexes: {
        claimed: decision.totals.claimed,
        stolen: decision.totals.stolen,
        defended: decision.totals.defended,
        pioneer: decision.totals.pioneer,
        blocked: decision.totals.blocked,
      },
      pointsAwarded: score.points,
      fouleesAwarded: score.foulees,
      xpAwarded: score.xp,
      streak,
      results: decision.results,
    };
    await persistCelebration(runId, response, score.points);
    return json(response);
  } catch (err) {
    console.error('ingest_run:', err);
    return json({ error: 'internal_error', message: `${err}` }, 500);
  }
});

// ─── Étapes du handler ───────────────────────────────────────────────────────

type ValidationOutcome =
  | { kind: 'rejected'; reason: NonNullable<IngestRunResponse['rejectReason']>; gpsTrust: number; motionTrust: number; trustScore: number }
  | { kind: 'flagged'; gpsTrust: number; motionTrust: number; trustScore: number }
  | {
    kind: 'claimable';
    status: Extract<RunStatus, 'valid' | 'partial'>;
    claimable: ReturnType<typeof claimableSegments>['claimable'];
    gpsTrust: number;
    motionTrust: number;
    trustScore: number;
  };

/** Enchaîne §3.2 + GRYD Verify : rejected > flagged > partial > valid. */
function validateOrStatus(
  filtered: ReturnType<typeof filterPoints>,
  stats: ReturnType<typeof computeStats>,
  stepCount: number | undefined,
): ValidationOutcome {
  const gpsTrust = filtered.totalPoints > 0
    ? Math.floor((100 * filtered.keptPoints) / filtered.totalPoints)
    : 0;
  const motionTrust = stepCoherence(stats.distanceM, stepCount);
  // Trust MVP : le signal le plus faible domine (doc anti-triche §8, simplifié).
  const trustScore = Math.min(gpsTrust, motionTrust);

  const validation = validateRun(stats);
  if (validation.status === 'rejected') {
    return { kind: 'rejected', reason: validation.reason, gpsTrust, motionTrust, trustScore };
  }
  // Cohérence pas/distance insuffisante → claims gelés, course conservée en stats.
  if (motionTrust < MOTION_TRUST_FLAGGED_BELOW) {
    return { kind: 'flagged', gpsTrust, motionTrust, trustScore };
  }
  const claimable = claimableSegments(filtered.segments);
  return {
    kind: 'claimable',
    status: claimable.status,
    claimable: claimable.claimable,
    gpsTrust,
    motionTrust,
    trustScore,
  };
}

/** Vocabulaire d'outcome attendu par la RPC claim_hexes (0005). */
function rpcOutcome(r: HexClaimResult): 'neutral' | 'steal' | 'defend' | 'pioneer' {
  switch (r.outcome) {
    case 'claimed_neutral':
      return r.pioneer ? 'pioneer' : 'neutral';
    case 'stolen':
      return 'steal';
    default: // defended | already_owned_cooldown → même application (decay repoussé)
      return 'defend';
  }
}

/** Insert idempotent du run : une course 23505 (retry concurrent) est rejouée. */
async function insertRun(
  row: Record<string, unknown>,
  userId: string,
  clientRunId: string,
  streakWeeks: number,
): Promise<{ replayed: false; runId: string } | { replayed: true; payload: IngestRunResponse }> {
  const { data, error } = await supabase.from('runs').insert(row).select('id').single();
  if (!error && data) return { replayed: false, runId: data.id };
  // 23505 = violation de runs_user_client_run_unique → un retry concurrent a gagné.
  if (error && error.code === '23505') {
    const { data: existing } = await supabase
      .from('runs')
      .select('id, status, reject_reason, distance_m, duration_s, avg_pace_s_km, points_awarded, xp_awarded, celebration')
      .eq('user_id', userId)
      .eq('client_run_id', clientRunId)
      .single();
    if (existing) {
      const payload = existing.celebration as IngestRunResponse | null;
      return {
        replayed: true,
        payload: payload ? { ...payload, replayed: true } : fallbackResponse(existing, streakWeeks),
      };
    }
  }
  throw new Error(`runs insert: ${error?.message ?? 'unknown'}`);
}

async function persistCelebration(
  runId: string,
  response: IngestRunResponse,
  pointsAwarded: number,
): Promise<void> {
  const { error } = await supabase
    .from('runs')
    .update({ celebration: response, points_awarded: pointsAwarded })
    .eq('id', runId);
  if (error) throw new Error(`runs celebration update: ${error.message}`);
}
