/**
 * GRYD — Edge Function ingest_run (SPEC §6.3, AMENDEMENT-02 §2/§3/§4).
 *
 * Pipeline : auth JWT → idempotence (user_id, client_run_id) → validation §3.2
 * → hexing H3 → lecture état (hexes, privacy, no-capture, densité) →
 * decideClaims (pur) → RPC claim_hexes (application atomique) → mécaniques
 * badges (météo Open-Meteo fail-open, événement, avant-poste/route V0) →
 * attribution badges → runs.celebration.
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
import { cellToLatLng, latLngToCell } from 'npm:h3-js@^4.1';
import {
  BONUS_MIN_MOTION_TRUST,
  BONUS_PRIORITY,
  BONUS_RETURN_ABSENCE_MAX_DAYS,
  BONUS_RETURN_ABSENCE_MIN_DAYS,
  CITIES,
  type ContextCoeffKey,
  CREW_XP_TABLE,
  GROUP_RUN_HEX_SHARE_MIN,
  GROUP_RUN_START_TOLERANCE_MIN,
  H3_RESOLUTION,
  HEX_LOCK_HOURS,
  OUTPOST_RADIUS_KM,
  ONBOARDING_IMPORT_MAX_CAPTURE_RUNS,
  ONBOARDING_IMPORT_NEUTRAL_ONLY,
  PARTIAL_BOUNDARY_TTL_H,
  PARTIAL_JOIN_TOLERANCE_M,
  VERIFY_PARTIAL_MIN,
  type ZoneDensity,
} from '../_shared/game-rules.ts';
import { ROUTE_ENDPOINT_MATCH_KM, VERIFIED_MIN_TRUST } from '../_shared/badges.ts';
import type {
  BoundaryEnd,
  BoundarySegment,
  ChallengeUpdate,
  HexClaimResult,
  IngestRunRequest,
  IngestRunResponse,
  RunMode,
  RunPoint,
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
  enclosedCells,
  type GeoJsonPolygonal,
  hexesForSegments,
  loopInteriorCellCap,
  loopTracePoints,
  pointInGeoJson,
} from '../_shared/engine/hexing.ts';
import {
  canComplete,
  contributionSplit,
  detectOpenBoundary,
  type OpenBoundary,
} from '../_shared/engine/boundary.ts';
import { decideClaims, deriveContextByHex, type HexState } from '../_shared/engine/claims.ts';
import {
  distributePointsAdjustment,
  streakMultiplier,
} from '../_shared/engine/scoring.ts';
import { defenseHoursForCoverage, frontierCoverage } from '../_shared/engine/coverage.ts';
import { extendDecay } from '../_shared/engine/zone.ts';
import {
  type CrewOwnershipResolution,
  type OwnershipResolution,
  runCrewBoundaryClose,
  runTerritoryEngine,
} from '../_shared/engine/engine.ts';
import {
  applyRejectedRun,
  applyRunToStats,
  dedupeActivity,
  emptyLifetimeStats,
  evaluateBadges,
  localClock,
  shouldCreateOutpost,
  shouldOpenRoute,
  weatherFlags,
  type BadgeRunInput,
  type DedupActivity,
  type LifetimeStats,
} from '../_shared/engine/badges.ts';
import { BADGES_BY_KEY } from '../_shared/badges.ts';
import {
  boostChestMultiplier,
  boostedChestProgress,
  cappedCrewXp,
  chestProgressDelta,
  crewXpForRun,
  type CrewBoostWindow,
  withinOffensiveZone,
  type CrewChestInput,
} from '../_shared/engine/crew.ts';
import {
  collusionPenalty,
  resolveContestedHex,
  type ContestedCrewPresence,
} from '../_shared/engine/social.ts';
import { challengeProgress } from '../_shared/engine/challenge.ts';
import {
  applyBonusReward,
  type BonusApplyBase,
  type BonusEligibilityContext,
  bonusEffectLabel,
  eligible,
} from '../_shared/engine/bonus.ts';
import { bonusById } from '../_shared/bonuses.ts';
import type { BonusDefinition, BonusId } from '../_shared/types.ts';
import { isWithinOnboardingImportWindow } from '../_shared/engine/onboarding.ts';
import {
  buildAttackAlertNotifications,
  collectAttackAlertHits,
} from '../_shared/engine/attack_alerts.ts';

const MS_PER_DAY = 86_400_000;
const M_PER_KM = 1_000;
const DB_IN_CHUNK = 500; // taille des batches pour les clauses `in(...)`
const DB_PAGE = 1_000; // pagination des lectures larges (plafond PostgREST)
const REWARD_PRIORITY = 3; // P3 récompense (GRYD_notifications_logic.md §2)
const STEAL_ALERT_PRIORITY = 1; // P1 attaque territoire (alerte défense)
const WEATHER_TIMEOUT_MS = 3_000; // budget I/O Open-Meteo — technique, pas une règle de jeu

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

/** Outcomes rivaux qui déclenchent une alerte d'attaque (sans bloquer la capture). */
async function notifyAttackAlerts(
  attackerId: string,
  results: readonly HexClaimResult[],
  states: ReadonlyMap<string, HexState>,
  now: Date,
): Promise<void> {
  const hits = collectAttackAlertHits(attackerId, results, states);
  if (hits.length === 0) return;

  const hexIds = [...new Set(hits.map((h) => h.h3Db))];
  const { data: alerts, error } = await supabase
    .from('attack_alerts')
    .select('user_id, h3index')
    .in('h3index', hexIds)
    .gt('expires_at', now.toISOString());
  if (error || !alerts?.length) return;

  const rows = buildAttackAlertNotifications(
    hits,
    alerts.map((a) => ({ userId: a.user_id, h3Db: String(a.h3index) })),
    STEAL_ALERT_PRIORITY,
  );
  if (rows.length === 0) return;
  const { error: insertError } = await supabase.from('notifications').insert(rows);
  if (insertError) {
    console.error('attack_alert notification insert:', insertError.message);
  }
}

const ZONE_DENSITIES = new Set(['active', 'emerging', 'pioneer', 'wild']);
const RUN_MODES = new Set<RunMode>(['conquete', 'social_run', 'course_privee', 'race_mode', 'event_run']);

/**
 * Mode de course effectif (AMENDEMENT-07 §2). Défaut `conquete`. `race_mode`/
 * `event_run` sont V1 (désactivés) → repliés sur `conquete` en MVP.
 */
function effectiveRunMode(mode: RunMode | undefined): RunMode {
  if (mode === 'social_run' || mode === 'course_privee') return mode;
  return 'conquete';
}

function isIngestRunRequest(body: unknown): body is IngestRunRequest {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  return typeof b.clientRunId === 'string' && b.clientRunId.length > 0 &&
    (b.source === 'gps' || b.source === 'healthkit' || b.source === 'strava') &&
    typeof b.startedAt === 'string' &&
    Array.isArray(b.points) &&
    b.points.every((p) =>
      typeof p === 'object' && p !== null &&
      typeof (p as Record<string, unknown>).lat === 'number' &&
      typeof (p as Record<string, unknown>).lng === 'number' &&
      typeof (p as Record<string, unknown>).t === 'number'
    ) &&
    (b.stepCount === undefined || typeof b.stepCount === 'number') &&
    (b.gpsTrust === undefined || (typeof b.gpsTrust === 'number' && Number.isFinite(b.gpsTrust))) &&
    (b.runMode === undefined || (typeof b.runMode === 'string' && RUN_MODES.has(b.runMode as RunMode))) &&
    (b.onboardingRetro === undefined || typeof b.onboardingRetro === 'boolean');
}

interface UserProfile {
  created_at: string;
  streak_weeks: number;
  is_club: boolean;
  onboarding_import_at?: string | null;
}

async function countOnboardingRetroRuns(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('runs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_onboarding_retro', true);
  if (error) throw new Error(`runs onboarding retro count: ${error.message}`);
  return count ?? 0;
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
    newBadges: [],
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
      .select(
        'h3index, owner_user_id, claimed_at, locked_until, shielded_until, decay_at, last_defended_at',
      )
      .in('h3index', batch);
    if (error) throw new Error(`hex_claims read: ${error.message}`);
    for (const row of data ?? []) {
      const decayAt = row.decay_at ? new Date(row.decay_at) : null;
      states.set(dbToH3(row.h3index), {
        ownerUserId: row.owner_user_id,
        lockedUntil: row.locked_until ? new Date(row.locked_until) : null,
        shieldedUntil: row.shielded_until ? new Date(row.shielded_until) : null,
        decayAt,
        // AMENDEMENT-23 §D : last_defended_at est désormais une VRAIE colonne
        // (posée par claim_hexes à chaque capture/défense) — plus de reverse-calc
        // decay_at − DECAY_DAYS (fausse depuis la défense graduée). Fallback
        // claimed_at pour les lignes pré-0017 non backfillées (défensif).
        lastDefendedAt: row.last_defended_at
          ? new Date(row.last_defended_at)
          : new Date(row.claimed_at),
        // last_captured_at = claimed_at : posé à now() à CHAQUE capture
        // (neutral/steal/pioneer), jamais touché par une défense. Sert la
        // protection anti-harcèlement d'une capture fraîche (decideClaims →
        // blocked_fresh_protection). Déjà sélectionné : zéro migration.
        lastCapturedAt: row.claimed_at ? new Date(row.claimed_at) : null,
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

/** Crew actif du coureur (id + taille ; size 0 = sans crew) — badges Crew/Solitaire (§3),
 * rattachement crew des avant-postes/routes. */
async function loadCrew(userId: string): Promise<{ crewId: string | null; size: number }> {
  const { data, error } = await supabase
    .from('crew_members')
    .select('crew_id')
    .eq('user_id', userId)
    .is('left_at', null)
    .maybeSingle();
  if (error) throw new Error(`crew_members read: ${error.message}`);
  if (!data) return { crewId: null, size: 0 };
  const { count, error: countError } = await supabase
    .from('crew_members')
    .select('user_id', { count: 'exact', head: true })
    .eq('crew_id', data.crew_id)
    .is('left_at', null);
  if (countError) throw new Error(`crew_members count: ${countError.message}`);
  return { crewId: data.crew_id as string, size: count ?? 1 };
}

/** true si le départ tombe dans un événement actif (badge Événement) — bornes
 * INCLUSES des deux côtés, MIROIR de inEventWindow (engine/badges.ts). */
async function loadDuringEvent(startedAt: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .lte('starts_at', startedAt)
    .gte('ends_at', startedAt);
  if (error) throw new Error(`events read: ${error.message}`);
  return (count ?? 0) > 0;
}

// ─── Météo réelle (badges Météo/Hiver/Chaleur) — Open-Meteo, fail-open ───────

/**
 * Flags météo de l'heure LOCALE du départ via Open-Meteo (gratuit, sans clé).
 * FAIL-OPEN STRICT : timeout WEATHER_TIMEOUT_MS, toute erreur (réseau, format,
 * heure introuvable) → null, AUCUN impact sur la course. La décision de seuil
 * est la fonction PURE weatherFlags (engine/badges.ts) — seule partie testée.
 */
async function fetchWeather(
  lat: number,
  lng: number,
  startedAt: string,
): Promise<{ rain: boolean; snow: boolean; heat: boolean } | null> {
  const clock = localClock(startedAt);
  if (!clock) return null;
  const hour = `${clock.date}T${String(Math.floor(clock.minutes / 60)).padStart(2, '0')}:00`;
  const url = 'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}` +
    '&hourly=temperature_2m,precipitation,snowfall&timezone=auto' +
    `&start_date=${clock.date}&end_date=${clock.date}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(WEATHER_TIMEOUT_MS) });
    if (!res.ok) return null;
    const body = await res.json() as {
      hourly?: {
        time?: string[];
        temperature_2m?: (number | null)[];
        precipitation?: (number | null)[];
        snowfall?: (number | null)[];
      };
    };
    const idx = body.hourly?.time?.indexOf(hour) ?? -1;
    if (idx < 0) return null;
    const tempC = body.hourly?.temperature_2m?.[idx];
    const precipMmH = body.hourly?.precipitation?.[idx];
    const snowCmH = body.hourly?.snowfall?.[idx];
    if (typeof tempC !== 'number' || typeof precipMmH !== 'number' || typeof snowCmH !== 'number') {
      return null;
    }
    return weatherFlags({ tempC, precipMmH, snowCmH });
  } catch {
    return null; // fail-open : la météo ne bloque JAMAIS une course
  }
}

// ─── Avant-postes V0 (badges Bâtisseur/Stratège) ─────────────────────────────

/** Centres lat/lng de TOUS les hex_claims du user (paginé : PostgREST plafonne à 1000). */
async function loadUserHexCenters(userId: string): Promise<{ lat: number; lng: number }[]> {
  const centers: { lat: number; lng: number }[] = [];
  for (let from = 0; ; from += DB_PAGE) {
    const { data, error } = await supabase
      .from('hex_claims')
      .select('h3index')
      .eq('owner_user_id', userId)
      .range(from, from + DB_PAGE - 1);
    if (error) throw new Error(`hex_claims owned read: ${error.message}`);
    for (const row of data ?? []) {
      const [lat, lng] = cellToLatLng(dbToH3(row.h3index));
      centers.push({ lat, lng });
    }
    if ((data ?? []).length < DB_PAGE) return centers;
  }
}

/**
 * Détection avant-poste V0 (AMENDEMENT-02 §8) — appelée APRÈS la RPC claims
 * (les hexes de cette course comptent). Zone peu dense uniquement ; fondation
 * si ≥ OUTPOST_MIN_HEXES hexes du user à ≤ OUTPOST_RADIUS_KM du centroïde de
 * la course et aucun avant-poste existant du user dans ce rayon
 * (décision pure shouldCreateOutpost, engine/badges.ts).
 */
async function detectOutpost(
  userId: string,
  crewId: string | null,
  density: ZoneDensity,
  centroid: { lat: number; lng: number },
): Promise<{ newOutposts: number; newCrewOutposts: number }> {
  const none = { newOutposts: 0, newCrewOutposts: 0 };
  if (density !== 'pioneer' && density !== 'wild' && density !== 'emerging') return none;

  const radiusM = OUTPOST_RADIUS_KM * M_PER_KM;
  const owned = await loadUserHexCenters(userId);
  const ownedNearby = owned.filter((c) => haversineM(c, centroid) <= radiusM).length;

  const { data: existing, error } = await supabase
    .from('outposts')
    .select('center_h3')
    .eq('user_id', userId);
  if (error) throw new Error(`outposts read: ${error.message}`);
  const existingNearby = (existing ?? []).filter((o) => {
    const [lat, lng] = cellToLatLng(dbToH3(o.center_h3));
    return haversineM({ lat, lng }, centroid) <= radiusM;
  }).length;

  if (!shouldCreateOutpost(ownedNearby, existingNearby)) return none;

  const { error: insertError } = await supabase.from('outposts').insert({
    user_id: userId,
    crew_id: crewId,
    center_h3: h3ToDb(latLngToCell(centroid.lat, centroid.lng, H3_RESOLUTION)),
    hex_count: ownedNearby,
  });
  if (insertError) throw new Error(`outposts insert: ${insertError.message}`);
  return { newOutposts: 1, newCrewOutposts: crewId !== null ? 1 : 0 };
}

// ─── Routes V0 (badges Connecteur/Bâtisseur Crew) ────────────────────────────

/**
 * Détection route V0 : les hexes de DÉPART et d'ARRIVÉE de la trace claimable
 * appartenaient tous deux au user AVANT la course (état `states` lu pour
 * decideClaims — decay échu = plus possédé), distants de ≥ ROUTE_MIN_KM, et
 * pas déjà une route du user entre ces deux bouts (à ROUTE_ENDPOINT_MATCH_KM
 * près, dans un sens ou l'autre). Décision pure shouldOpenRoute (engine).
 */
async function detectRoute(
  userId: string,
  crewId: string | null,
  runId: string,
  states: ReadonlyMap<string, HexState>,
  startHex: string | undefined,
  endHex: string | undefined,
  now: Date,
): Promise<{ newRoutes: number; newCrewRoutes: number }> {
  const none = { newRoutes: 0, newCrewRoutes: 0 };
  if (startHex === undefined || endHex === undefined || startHex === endHex) return none;

  const ownedBefore = (hex: string): boolean => {
    const state = states.get(hex);
    if (!state) return false;
    const decayed = state.decayAt !== null && state.decayAt.getTime() <= now.getTime();
    return !decayed && state.ownerUserId === userId;
  };
  const toPoint = (h3: string): { lat: number; lng: number } => {
    const [lat, lng] = cellToLatLng(h3);
    return { lat, lng };
  };

  const startOwned = ownedBefore(startHex);
  const endOwned = ownedBefore(endHex);
  const start = toPoint(startHex);
  const end = toPoint(endHex);
  const distanceKm = haversineM(start, end) / M_PER_KM;

  // Lecture anti-doublon seulement si les critères géométriques passent déjà.
  let existing = false;
  if (shouldOpenRoute(startOwned, endOwned, distanceKm, false)) {
    const { data, error } = await supabase
      .from('routes')
      .select('from_h3, to_h3')
      .eq('user_id', userId);
    if (error) throw new Error(`routes read: ${error.message}`);
    const matchM = ROUTE_ENDPOINT_MATCH_KM * M_PER_KM;
    existing = (data ?? []).some((r) => {
      const from = toPoint(dbToH3(r.from_h3));
      const to = toPoint(dbToH3(r.to_h3));
      return (haversineM(from, start) <= matchM && haversineM(to, end) <= matchM) ||
        (haversineM(from, end) <= matchM && haversineM(to, start) <= matchM);
    });
  }

  if (!shouldOpenRoute(startOwned, endOwned, distanceKm, existing)) return none;

  const { error: insertError } = await supabase.from('routes').insert({
    user_id: userId,
    crew_id: crewId,
    from_h3: h3ToDb(startHex),
    to_h3: h3ToDb(endHex),
    run_id: runId,
  });
  if (insertError) throw new Error(`routes insert: ${insertError.message}`);
  return { newRoutes: 1, newCrewRoutes: crewId !== null ? 1 : 0 };
}

// ─── Badges (AMENDEMENT-04 §5) : user_stats ↔ LifetimeStats + attribution ────

/** LifetimeStats camelCase ↔ colonnes user_stats snake_case (mapping mécanique). */
const camelToSnake = (key: string): string => key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

function rowToStats(row: Record<string, unknown> | null): LifetimeStats {
  const stats = emptyLifetimeStats();
  if (!row) return stats;
  const bag = stats as unknown as Record<string, unknown>;
  for (const key of Object.keys(stats)) {
    const value = row[camelToSnake(key)];
    if (value !== undefined && value !== null) bag[key] = value;
  }
  return stats;
}

function statsToRow(userId: string, stats: LifetimeStats): Record<string, unknown> {
  const row: Record<string, unknown> = { user_id: userId, updated_at: new Date().toISOString() };
  for (const [key, value] of Object.entries(stats)) row[camelToSnake(key)] = value;
  return row;
}

/**
 * Lit user_stats + user_badges, applique la course (applyRunToStats, pur),
 * évalue les badges (evaluateBadges, jamais le déjà-gagné),
 * upsert les stats, insère user_badges + UNE notification 'reward' groupée.
 * Idempotence : appelé uniquement après un INSERT runs frais ; l'upsert
 * ignoreDuplicates protège d'une double attribution résiduelle.
 */
async function awardBadges(userId: string, run: BadgeRunInput): Promise<string[]> {
  const { data: statsRow, error: statsError } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (statsError) throw new Error(`user_stats read: ${statsError.message}`);
  const { data: earnedRows, error: earnedError } = await supabase
    .from('user_badges')
    .select('badge_key')
    .eq('user_id', userId);
  if (earnedError) throw new Error(`user_badges read: ${earnedError.message}`);

  const before = rowToStats(statsRow);
  const after = applyRunToStats(before, run);
  const newBadges = evaluateBadges(
    before,
    after,
    new Set((earnedRows ?? []).map((r) => r.badge_key as string)),
  );

  const { error: upsertError } = await supabase
    .from('user_stats')
    .upsert(statsToRow(userId, after), { onConflict: 'user_id' });
  if (upsertError) throw new Error(`user_stats upsert: ${upsertError.message}`);

  if (newBadges.length === 0) return newBadges;

  const { error: badgesError } = await supabase.from('user_badges').upsert(
    newBadges.map((key) => ({ user_id: userId, badge_key: key })),
    { onConflict: 'user_id,badge_key', ignoreDuplicates: true },
  );
  if (badgesError) throw new Error(`user_badges insert: ${badgesError.message}`);

  // 1 notification groupée, même à plusieurs badges (inbox §4.2.8, type 'reward').
  const names = newBadges.map((key) => BADGES_BY_KEY.get(key)?.name ?? key);
  const { error: notifError } = await supabase.from('notifications').insert({
    user_id: userId,
    type: 'reward',
    priority: REWARD_PRIORITY,
    payload: {
      title: newBadges.length > 1
        ? `${newBadges.length} nouveaux badges débloqués`
        : 'Nouveau badge débloqué',
      body: names.join(' · '),
      badges: newBadges,
    },
  });
  if (notifError) throw new Error(`notifications insert: ${notifError.message}`);
  return newBadges;
}

/**
 * Course REJETÉE (rejected/flagged) : applyRunToStats l'ignore, mais Clean
 * Runner a besoin de connaître le jour du rejet (cleanDays repart de 0).
 * Lit user_stats, applique applyRejectedRun (pur) et upsert. Aucun badge ici.
 */
async function awardRejectedRun(userId: string, dateISO: string): Promise<void> {
  const { data: statsRow, error: statsError } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (statsError) throw new Error(`user_stats read: ${statsError.message}`);
  const after = applyRejectedRun(rowToStats(statsRow), dateISO);
  const { error: upsertError } = await supabase
    .from('user_stats')
    .upsert(statsToRow(userId, after), { onConflict: 'user_id' });
  if (upsertError) throw new Error(`user_stats upsert (rejected): ${upsertError.message}`);
}

// ─── Déduplication d'activité (AMENDEMENT-06 §4, Activity Hub) ────────────────

/** sha-256 (hex) des points arrondis à ~6 décimales — clé de dédup polyline. */
async function polylineHash(points: readonly RunPoint[]): Promise<string> {
  const sorted = [...points].sort((a, b) => a.t - b.t);
  const canon = sorted
    .map((p) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`)
    .join(';');
  const bytes = new TextEncoder().encode(canon);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * L'activité entrante est-elle un DOUBLON d'une course déjà ingérée par ce user
 * (AMENDEMENT-06 §4) ? Charge les courses récentes (fenêtre ± jours) et applique
 * dedupeActivity (pur : hash OU départ±3min & durée±10 % & distance±10 %).
 * Retourne l'id de la course matchée, ou null.
 */
async function findDuplicateRun(
  userId: string,
  candidate: DedupActivity,
): Promise<string | null> {
  const t = Date.parse(candidate.startedAt);
  const windowMs = 2 * MS_PER_DAY; // large : le filtre fin est dedupeActivity
  const { data, error } = await supabase
    .from('runs')
    .select('id, started_at, duration_s, distance_m, polyline_hash')
    .eq('user_id', userId)
    .gte('started_at', new Date(t - windowMs).toISOString())
    .lte('started_at', new Date(t + windowMs).toISOString());
  if (error) throw new Error(`runs dedup read: ${error.message}`);
  for (const row of data ?? []) {
    const existing: DedupActivity = {
      startedAt: row.started_at as string,
      durationS: row.duration_s as number,
      distanceM: row.distance_m as number,
      polylineHash: (row.polyline_hash as string | null) ?? null,
    };
    if (dedupeActivity(candidate, existing)) return row.id as string;
  }
  return null;
}

// ─── Crews Supercell (AMENDEMENT-06 §2) : XP crew + coffre + offensive ───────

/** Lundi ISO ('YYYY-MM-DD') de la semaine d'une date (week_start du coffre). */
function isoWeekStart(now: Date): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dow = (d.getUTCDay() + 6) % 7; // lundi=0 … dimanche=6
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

/** Jour UTC ('YYYY-MM-DD') — clé du cap quotidien crew_xp_daily. */
const utcDay = (now: Date): string => now.toISOString().slice(0, 10);

/**
 * Fenêtres de crew boost ACTIVES du crew (miroir CrewBoostWindow) + fin de la
 * saison active (epoch ms, null si aucune). Lit crew_boosts (status='active')
 * et la saison active via crews.city_id (même source que rc_webhook). Le moteur
 * pur boostChestMultiplier tranche ensuite fenêtre/blackout — ici, QUE l'I/O.
 * L'effet ne porte QUE sur le coffre (§4, doc §13.1) : jamais points/XP/leaderboard.
 */
async function loadCrewBoostContext(
  crewId: string,
): Promise<{ boosts: CrewBoostWindow[]; seasonEndMs: number | null }> {
  const { data: boostRows, error: boostErr } = await supabase
    .from('crew_boosts')
    .select('starts_at, ends_at, multiplier, status')
    .eq('crew_id', crewId)
    .eq('status', 'active');
  if (boostErr) throw new Error(`crew_boosts read: ${boostErr.message}`);
  const boosts: CrewBoostWindow[] = (boostRows ?? []).map((b) => ({
    startsAtMs: new Date(b.starts_at as string).getTime(),
    endsAtMs: new Date(b.ends_at as string).getTime(),
    multiplier: Number(b.multiplier),
    status: b.status as CrewBoostWindow['status'],
  }));

  // Fin de saison active du crew (pour le blackout de fin de saison). Absence de
  // crew/city/saison → null : le blackout ne s'applique pas (fail-open côté effet).
  let seasonEndMs: number | null = null;
  const { data: crew, error: crewErr } = await supabase
    .from('crews')
    .select('city_id')
    .eq('id', crewId)
    .maybeSingle();
  if (crewErr) throw new Error(`crews read: ${crewErr.message}`);
  if (crew?.city_id) {
    const { data: season, error: seasonErr } = await supabase
      .from('seasons')
      .select('ends_at')
      .eq('city_id', crew.city_id)
      .eq('status', 'active')
      .maybeSingle();
    if (seasonErr) throw new Error(`seasons read: ${seasonErr.message}`);
    if (season?.ends_at) seasonEndMs = new Date(season.ends_at as string).getTime();
  }
  return { boosts, seasonEndMs };
}

interface CrewRunOutcome {
  hexesCaptured: number; // neutres + volés
  hexesDefended: number;
  newCrewRoutes: number;
  newCrewOutposts: number;
  verified: boolean;
  /** true si aucune contribution crew de ce membre cette semaine avant celle-ci. */
  firstOfWeek: boolean;
}

/**
 * Résultat de processCrew : XP/level-up pour la réponse + base de bonus
 * (AMENDEMENT-19 §7). `chestDelta` = progression de coffre effectivement
 * appliquée par ce run (déjà boostée) ; `boostMultiplier` = multiplicateur
 * Crew Boost actif (1 si aucun) — sert le CAP +35 % (systemPct = mult − 1).
 */
interface CrewProcessResult {
  crewXp?: number;
  crewLevelUp?: { from: number; to: number };
  chestDelta?: number;
  boostMultiplier?: number;
}

/**
 * Traite la contribution crew d'une course (§34/§39/§38). Retourne l'XP crew
 * créditée et l'éventuelle montée de niveau, pour IngestRunResponse.
 *   1. XP crew (crewXpForRun) cappée au reste quotidien du membre (§34.1) ;
 *   2. crédit atomique via RPC add_crew_xp (recalcul du niveau depuis CREW_XP_TABLE) ;
 *   3. progression du coffre de la semaine (chestProgressDelta, §39) ;
 *   4. contribution aux offensives ACTIVES du crew dont la zone couvre des
 *      hexes claimés (§38).
 * Sans crew : no-op (retourne {}).
 */
async function processCrew(
  userId: string,
  crewId: string | null,
  now: Date,
  outcome: CrewRunOutcome,
  claimedCentroids: { lat: number; lng: number }[],
): Promise<CrewProcessResult> {
  if (crewId === null) return {};

  const rawXp = crewXpForRun({
    hexesCaptured: outcome.hexesCaptured,
    hexesDefended: outcome.hexesDefended,
    routesOpened: outcome.newCrewRoutes,
    routesDuplicated: 0, // détection de doublon de route = V1 (routes uniques MVP)
    outpostsMaintained: outcome.newCrewOutposts,
    missionsCompleted: 0, // missions crew complétées = V1 (endpoint dédié)
    offensivesCompleted: 0, // clôture d'offensive = job, pas la course
    verified: outcome.verified,
    firstOfWeek: outcome.firstOfWeek,
  });

  // Cap quotidien : XP crew déjà générée par ce membre aujourd'hui.
  const day = utcDay(now);
  const { data: dailyRow, error: dailyReadErr } = await supabase
    .from('crew_xp_daily')
    .select('xp')
    .eq('crew_id', crewId)
    .eq('user_id', userId)
    .eq('day', day)
    .maybeSingle();
  if (dailyReadErr) throw new Error(`crew_xp_daily read: ${dailyReadErr.message}`);
  const alreadyToday = (dailyRow?.xp as number | undefined) ?? 0;
  const xp = cappedCrewXp(rawXp, alreadyToday);

  const result: CrewProcessResult = {};

  if (xp > 0) {
    // Compteur quotidien (upsert : +xp).
    const { error: dailyErr } = await supabase
      .from('crew_xp_daily')
      .upsert({ crew_id: crewId, user_id: userId, day, xp: alreadyToday + xp }, {
        onConflict: 'crew_id,user_id,day',
      });
    if (dailyErr) throw new Error(`crew_xp_daily upsert: ${dailyErr.message}`);

    // Crédit atomique + recalcul du niveau (RPC security definer).
    const { data: lvl, error: rpcErr } = await supabase.rpc('add_crew_xp', {
      p_crew_id: crewId,
      p_xp: xp,
      p_xp_table: CREW_XP_TABLE,
    });
    if (rpcErr) throw new Error(`add_crew_xp rpc: ${rpcErr.message}`);
    result.crewXp = xp;
    const row = Array.isArray(lvl) ? lvl[0] : lvl;
    if (row && row.level_to > row.level_from) {
      result.crewLevelUp = { from: row.level_from as number, to: row.level_to as number };
    }
  }

  // ── Coffre de la semaine (§39) : progression pondérée, boost §4 appliqué ──
  // AMENDEMENT-16 §4 (doc §13.1) : un Crew Boost actif multiplie le delta de
  // progression du COFFRE (+25 %), borné/non-cumulable/éteint en blackout de
  // fin de saison — jamais points/XP/leaderboard. boostedChestProgress (pur)
  // tranche fenêtre/blackout ; ici on ne fait QUE lire boosts + fin de saison.
  const chestInput: CrewChestInput = {
    hexCaptured: outcome.hexesCaptured,
    hexDefended: outcome.hexesDefended,
    routeOpened: outcome.newCrewRoutes,
    verifiedRun: outcome.verified ? 1 : 0,
  };
  const baseDelta = chestProgressDelta(chestInput);
  if (baseDelta > 0) {
    const { boosts, seasonEndMs } = await loadCrewBoostContext(crewId);
    const delta = boostedChestProgress(baseDelta, boosts, now.getTime(), seasonEndMs);
    // AMENDEMENT-19 §7 : le bonus ciblé s'appuiera sur CE delta (déjà boosté) et
    // sur le multiplicateur système actif — pour appliquer le CAP +35 %.
    result.chestDelta = delta;
    result.boostMultiplier = boostChestMultiplier(boosts, now.getTime(), seasonEndMs);
    const weekStart = isoWeekStart(now);
    const { data: chestRow, error: chestReadErr } = await supabase
      .from('crew_chests')
      .select('progress')
      .eq('crew_id', crewId)
      .eq('week_start', weekStart)
      .maybeSingle();
    if (chestReadErr) throw new Error(`crew_chests read: ${chestReadErr.message}`);
    const progress = ((chestRow?.progress as number | undefined) ?? 0) + delta;
    const { error: chestErr } = await supabase
      .from('crew_chests')
      .upsert({ crew_id: crewId, week_start: weekStart, progress }, {
        onConflict: 'crew_id,week_start',
      });
    if (chestErr) throw new Error(`crew_chests upsert: ${chestErr.message}`);

    const { data: memberContrib, error: contribReadErr } = await supabase
      .from('crew_chest_contributions')
      .select('points')
      .eq('crew_id', crewId)
      .eq('user_id', userId)
      .eq('week_start', weekStart)
      .maybeSingle();
    if (contribReadErr) throw new Error(`crew_chest_contributions read: ${contribReadErr.message}`);
    const contribPoints = ((memberContrib?.points as number | undefined) ?? 0) + delta;
    const { error: contribErr } = await supabase
      .from('crew_chest_contributions')
      .upsert(
        { crew_id: crewId, user_id: userId, week_start: weekStart, points: contribPoints },
        { onConflict: 'crew_id,user_id,week_start' },
      );
    if (contribErr) throw new Error(`crew_chest_contributions upsert: ${contribErr.message}`);
  }

  // ── Offensives actives (§38) : hexes claimés dans la zone cible ──────────
  if (claimedCentroids.length > 0) {
    const nowIso = now.toISOString();
    const { data: offs, error: offErr } = await supabase
      .from('offensives')
      .select('id, center_h3, radius_km')
      .eq('crew_id', crewId)
      .eq('status', 'active')
      .lte('starts_at', nowIso)
      .gte('ends_at', nowIso);
    if (offErr) throw new Error(`offensives read: ${offErr.message}`);
    for (const off of offs ?? []) {
      const [clat, clng] = cellToLatLng(dbToH3(off.center_h3));
      const inZone = claimedCentroids.filter((c) =>
        withinOffensiveZone(c, { lat: clat, lng: clng }, Number(off.radius_km))
      ).length;
      if (inZone === 0) continue;
      const { data: contribRow, error: cReadErr } = await supabase
        .from('offensive_contributions')
        .select('hexes')
        .eq('offensive_id', off.id)
        .eq('user_id', userId)
        .maybeSingle();
      if (cReadErr) throw new Error(`offensive_contributions read: ${cReadErr.message}`);
      const hexes = ((contribRow?.hexes as number | undefined) ?? 0) + inZone;
      const { error: cErr } = await supabase
        .from('offensive_contributions')
        .upsert({ offensive_id: off.id, user_id: userId, hexes }, {
          onConflict: 'offensive_id,user_id',
        });
      if (cErr) throw new Error(`offensive_contributions upsert: ${cErr.message}`);
    }
  }

  return result;
}

// ─── AMENDEMENT-07 §2 : run SANS capture (social_run / course_privee) ─────────

interface NoClaimRunArgs {
  request: IngestRunRequest;
  runMode: RunMode;
  userId: string;
  profile: UserProfile;
  baseRow: Record<string, unknown>;
  validation: Extract<ValidationOutcome, { kind: 'claimable' }>;
  distanceM: number;
  durationS: number;
  avgPaceSKm: number;
  streak: { weeks: number; multiplier: number };
  now: Date;
}

/**
 * Course en mode SANS capture (§2). Insère le run (stats), attribue les badges +
 * XP perso pour `social_run` (0 hex claimé), aucun badge/partage pour
 * `course_privee` (stats perso only). Aucune écriture hex, aucune XP crew de
 * capture, aucune entrée feed. Statut social des hexes = stats_only (implicite,
 * aucun claim écrit). Réponse : hexes à 0, résumé explicite via runMode.
 */
async function handleNoClaimRun(args: NoClaimRunArgs): Promise<IngestRunResponse> {
  const { request, runMode, userId, profile, baseRow, validation } = args;
  const isPrivate = runMode === 'course_privee';

  const inserted = await insertRun({
    ...baseRow,
    status: validation.status,
    reject_reason: null,
    points_awarded: 0, // aucun point territoire hors conquête
    xp_awarded: 0,
  }, userId, request.clientRunId, profile.streak_weeks);
  if (inserted.replayed) return inserted.payload;
  const runId = inserted.runId;

  const sorted = [...request.points].sort((a, b) => a.t - b.t);
  const crew = await loadCrew(userId);

  // course_privee : stats perso pures, aucun badge (pas de partage/feed). social_run :
  // badges + XP PERSO (0 hex, mais distance/régularité/healthy restent attribuables).
  const newBadges = isPrivate ? [] : await awardBadges(userId, {
    status: validation.status,
    startedAt: request.startedAt,
    distanceM: args.distanceM,
    durationS: args.durationS,
    avgPaceSKm: args.avgPaceSKm,
    hexes: { claimed: 0, stolen: 0, defended: 0, pioneer: 0 },
    startPoint: sorted[0] ?? null,
    endPoint: sorted[sorted.length - 1] ?? null,
    crewSize: crew.size,
    duringSeasonZero: true,
    inPioneerZone: false,
    motionTrust: validation.motionTrust,
    flagged: false,
    shared: request.shared === true,
    allPioneer: false,
    newOutposts: 0,
    newRoutes: 0,
  });

  // AMENDEMENT-07 §2/§5 : un social_run alimente les challenges actifs (stats +
  // badges + XP perso conservés §2 ; « ingest_run met à jour challenge_progress
  // des challenges actifs du user/crew » §5). 0 hex claimé (capture désactivée)
  // → seule la métrique runs/distance avance. course_privee = stats perso pures
  // (§2), aucun challenge, comme aucun badge/partage/feed.
  const challengeUpdates = isPrivate ? [] : await processChallenges(
    userId,
    crew.crewId,
    { runs: 1, distanceM: args.distanceM, hexes: 0, defends: 0 },
    args.now,
  );

  const response: IngestRunResponse = {
    runId,
    status: validation.status,
    replayed: false,
    runMode,
    distanceM: args.distanceM,
    durationS: args.durationS,
    avgPaceSKm: args.avgPaceSKm,
    hexes: { claimed: 0, stolen: 0, defended: 0, pioneer: 0, blocked: 0 },
    pointsAwarded: 0,
    fouleesAwarded: 0,
    xpAwarded: 0,
    streak: args.streak,
    results: [], // aucun claim : les hexes traversés restent stats_only
    newBadges,
    ...(challengeUpdates.length > 0 ? { challengeUpdates } : {}),
  };
  await persistCelebration(runId, response, 0);
  return response;
}

// ─── AMENDEMENT-07 §3/§6 : détection Group Run (proxy MVP mono-course) ────────

const MS_PER_HOUR = 3_600_000;
const MS_PER_MIN = 60_000;

/**
 * Proxy MVP de détection de run groupé sans ingestion de la 2ᵉ course : parmi
 * les hexes touchés par CETTE course, on compte ceux fraîchement verrouillés
 * (lock démarré ≤ GROUP_RUN_START_TOLERANCE_MIN de now) par UN même autre
 * coureur. Si cette part ≥ GROUP_RUN_HEX_SHARE_MIN des hexes touchés → group run.
 * PURE (ne lit que `states` déjà chargé). Documenté : approximation assumée du
 * chevauchement de trace ≥ 70 % (le moteur pur detectGroupRun reste la règle,
 * réutilisée dès qu'on ingérera les deux courses — V1).
 */
function detectGroupRunProxy(
  hexes: readonly string[],
  states: ReadonlyMap<string, HexState>,
  now: Date,
): boolean {
  if (hexes.length === 0) return false;
  const nowMs = now.getTime();
  const freshBy = new Map<string, number>(); // autre coureur → nb hexes partagés frais
  for (const h of hexes) {
    const st = states.get(h);
    if (!st || !st.ownerUserId || !st.lockedUntil) continue;
    const lockStartMs = st.lockedUntil.getTime() - HEX_LOCK_HOURS * MS_PER_HOUR;
    if (Math.abs(nowMs - lockStartMs) / MS_PER_MIN > GROUP_RUN_START_TOLERANCE_MIN) continue;
    freshBy.set(st.ownerUserId, (freshBy.get(st.ownerUserId) ?? 0) + 1);
  }
  let best = 0;
  for (const n of freshBy.values()) best = Math.max(best, n);
  return best / hexes.length >= GROUP_RUN_HEX_SHARE_MIN;
}

// ─── AMENDEMENT-07 §5 : challenges (mise à jour du progrès) ───────────────────

/** Contribution d'UNE course valide par métrique de challenge (CHALLENGE_METRICS). */
interface ChallengeRunDelta {
  runs: number;
  distanceM: number;
  hexes: number;
  defends: number;
}

/**
 * Met à jour challenge_progress des challenges ACTIFS (starts_at ≤ now ≤ ends_at)
 * qui concernent le joueur (type solo → sujet user) et son crew (type crew/rivalry
 * → sujet crew). Incrémente `progress` sur la métrique du primary_goal, pose
 * `done_at` au 1er franchissement, et ventile `contribution` (multi-critères §9.2).
 * Le moteur PUR challengeProgress décide ratio/done. Retourne les updates pour la
 * réponse (feedback sain §12). Idempotence : appelé une seule fois par INSERT frais.
 */
async function processChallenges(
  userId: string,
  crewId: string | null,
  delta: ChallengeRunDelta,
  now: Date,
): Promise<ChallengeUpdate[]> {
  const nowIso = now.toISOString();
  const { data: active, error } = await supabase
    .from('challenges')
    .select('id, type, name, primary_goal')
    .lte('starts_at', nowIso)
    .gte('ends_at', nowIso);
  if (error) throw new Error(`challenges read: ${error.message}`);
  if (!active || active.length === 0) return [];

  const metricValue = (metric: string): number =>
    metric === 'runs' ? delta.runs
      : metric === 'distanceM' ? delta.distanceM
        : metric === 'hexes' ? delta.hexes
          : metric === 'defends' ? delta.defends
            : 0;

  const updates: ChallengeUpdate[] = [];
  for (const ch of active) {
    const type = ch.type as string;
    const kind: 'user' | 'crew' = type === 'solo' ? 'user' : 'crew';
    const subjectId = kind === 'user' ? userId : crewId;
    if (subjectId === null) continue; // challenge crew mais coureur sans crew → ignore

    const goal = (ch.primary_goal ?? {}) as { metric?: string; target?: number };
    const inc = metricValue(goal.metric ?? '');
    if (inc <= 0) continue; // cette course n'apporte rien à ce challenge

    // Lecture du progrès existant (unique par challenge+kind+subject).
    const { data: prevRow, error: prevErr } = await supabase
      .from('challenge_progress')
      .select('progress, contribution, done_at')
      .eq('challenge_id', ch.id)
      .eq('kind', kind)
      .eq('subject_id', subjectId)
      .maybeSingle();
    if (prevErr) throw new Error(`challenge_progress read: ${prevErr.message}`);

    const prev = Number(prevRow?.progress ?? 0);
    const next = prev + inc;
    const target = Number(goal.target ?? 0);
    const prog = challengeProgress({ target }, next);

    // Ventilation multi-critères (résumé de fin §9.2) : cumul par métrique.
    const contribution = { ...(prevRow?.contribution as Record<string, number> ?? {}) };
    contribution.runs = (contribution.runs ?? 0) + delta.runs;
    contribution.distanceM = (contribution.distanceM ?? 0) + delta.distanceM;
    contribution.hexes = (contribution.hexes ?? 0) + delta.hexes;
    contribution.defends = (contribution.defends ?? 0) + delta.defends;

    const doneAt = (prevRow?.done_at as string | null) ??
      (prog.done ? nowIso : null);

    const { error: upErr } = await supabase.from('challenge_progress').upsert({
      challenge_id: ch.id,
      kind,
      subject_id: subjectId,
      progress: next,
      done_at: doneAt,
      contribution,
      updated_at: nowIso,
    }, { onConflict: 'challenge_id,kind,subject_id' });
    if (upErr) throw new Error(`challenge_progress upsert: ${upErr.message}`);

    updates.push({
      challengeId: ch.id as string,
      kind,
      name: ch.name as string,
      progress: next,
      target,
      done: prog.done,
    });
  }
  return updates;
}

// ─── AMENDEMENT-07 §3 : hexes contestés entre crews (approx MVP) ──────────────

/** Crew actif (id) des propriétaires d'un lot d'hexes bloqués_lock. */
async function loadOwnerCrews(
  ownerUserIds: readonly string[],
): Promise<ReadonlyMap<string, string>> {
  const map = new Map<string, string>();
  const ids = [...new Set(ownerUserIds)];
  for (const batch of chunk(ids, DB_IN_CHUNK)) {
    const { data, error } = await supabase
      .from('crew_members')
      .select('user_id, crew_id')
      .in('user_id', batch)
      .is('left_at', null);
    if (error) throw new Error(`crew_members owners read: ${error.message}`);
    for (const row of data ?? []) map.set(row.user_id as string, row.crew_id as string);
  }
  return map;
}

// ─── AMENDEMENT-23 §D / doc §23 : coefficient de CONTEXTE par hex ──────────────

/**
 * Construit le `contextByHex` de la formule §23 (coeff_contexte, décidé SERVEUR
 * AVANT le scoring — résout l'ordonnancement : le contexte majore le run QUI le
 * rencontre, pas un post-traitement). Deux contextes RÉELS câblés au MVP ; le
 * 3ᵉ (`zone_bonus`) reste un point d'extension non actif (comme `route` côté
 * action), faute de source de données de hotspots de carte (voir NB plus bas) :
 *
 *  - `contested` ×1,2 (doc §18) : l'hex est, AVANT ce run, détenu (non-decayé)
 *    par un crew RIVAL (owner ≠ moi, crew ≠ le mien). C'est une cellule
 *    réellement disputée que ce run vole/conteste. Approximation MVP assumée du
 *    seuil de secteur §18 (>15 % rival/24 h ; 2 crews ≥30 %) : le calcul de
 *    contestation au niveau SECTEUR n'existe pas encore (AMENDEMENT-23 §A), on
 *    travaille à la maille cellule à partir de l'état pré-run déjà chargé —
 *    honnête et non pay-to-win (le rival gagne le contexte par sa présence, pas
 *    par un achat). N'inclut PAS les cellules bloquées par le lock d'un run
 *    concurrent (celles-là passent par handleContested → statut de zone, pas un
 *    coeff de points sur CE run qui ne les prend pas).
 *  - `crew_mission` ×1,1 (doc §23) : l'hex tombe dans la zone d'une OFFENSIVE
 *    crew ACTIVE du coureur (même géométrie que la contribution d'offensive,
 *    withinOffensiveZone). La zone compte pour une mission crew en cours.
 *
 * `zone_bonus` ×1,15 : NON câblé — aucun registre de hotspots de carte au MVP.
 * Dès qu'une table de hotspots existera, l'ajouter ici (gagné par le LIEU, PAS
 * acheté : anti pay-to-win intact, cf. game-rules CONTEXT_COEFF). Sans crew et
 * hors zone rivale, la map est vide → coeff_contexte = 1,0 (comportement neutre).
 */
async function loadContextByHex(
  userId: string,
  crewId: string | null,
  hexes: readonly string[],
  states: ReadonlyMap<string, HexState>,
  now: Date,
): Promise<ReadonlyMap<string, ContextCoeffKey[]>> {
  if (hexes.length === 0) return new Map();

  // ── I/O 1 : crews actifs des propriétaires RIVAUX (owner ≠ moi, non-decayé) ─
  // pour départager `contested` (rival) d'un simple re-parcours du même crew.
  const nowMs = now.getTime();
  const rivalOwnerIds = new Set<string>();
  for (const hex of hexes) {
    const st = states.get(hex);
    if (!st || !st.ownerUserId || st.ownerUserId === userId) continue;
    const decayed = st.decayAt !== null && st.decayAt.getTime() <= nowMs;
    if (!decayed) rivalOwnerIds.add(st.ownerUserId);
  }
  const ownerCrewByUser = rivalOwnerIds.size > 0
    ? await loadOwnerCrews([...rivalOwnerIds])
    : new Map<string, string>();

  // ── I/O 2 : cellules couvertes par une offensive crew ACTIVE du coureur ────
  // Géométrie (withinOffensiveZone) résolue ICI (accès lat/lng H3) ; la RÈGLE
  // de contexte est ensuite décidée par la fonction PURE deriveContextByHex.
  let crewMissionHexes: Set<string> | undefined;
  if (crewId !== null) {
    const nowIso = now.toISOString();
    const { data: offs, error } = await supabase
      .from('offensives')
      .select('center_h3, radius_km')
      .eq('crew_id', crewId)
      .eq('status', 'active')
      .lte('starts_at', nowIso)
      .gte('ends_at', nowIso);
    if (error) throw new Error(`offensives context read: ${error.message}`);
    const zones = (offs ?? []).map((o) => {
      const [lat, lng] = cellToLatLng(dbToH3(o.center_h3));
      return { lat, lng, radiusKm: Number(o.radius_km) };
    });
    if (zones.length > 0) {
      crewMissionHexes = new Set<string>();
      for (const hex of hexes) {
        const [lat, lng] = cellToLatLng(hex);
        if (zones.some((z) => withinOffensiveZone({ lat, lng }, z, z.radiusKm))) {
          crewMissionHexes.add(hex);
        }
      }
    }
  }

  // ── Décision PURE (testée dans claims_test.ts) ─────────────────────────────
  return deriveContextByHex({
    hexes,
    states,
    userId,
    crewId,
    ownerCrewByUser,
    ...(crewMissionHexes !== undefined ? { crewMissionHexes } : {}),
    now,
  });
}

/**
 * Bascule en `contested` les hexes bloqués_lock détenus par un AUTRE crew (§3,
 * approx MVP mono-course). Pour chacun : resolveContestedHex (pur) décide, on
 * insère contested_group_runs + un crew_feed_events, et on applique l'anti-
 * collusion (collusionPenalty sur l'historique du hex → stats_only doux si
 * reprises répétées). Retourne les h3 (string) réellement contestés (réponse).
 * Sans crew côté coureur → no-op (un solo ne conteste pas au nom d'un crew).
 */
async function handleContested(
  userId: string,
  crewId: string | null,
  runId: string,
  cityId: string | undefined,
  results: readonly HexClaimResult[],
  states: ReadonlyMap<string, HexState>,
  now: Date,
): Promise<string[]> {
  if (crewId === null) return [];
  const blocked = results.filter((r) => r.outcome === 'blocked_lock');
  if (blocked.length === 0) return [];

  // Propriétaires (users) des hexes bloqués → leurs crews actifs.
  const ownerIds = blocked
    .map((r) => states.get(r.h3)?.ownerUserId)
    .filter((id): id is string => !!id);
  const ownerCrews = await loadOwnerCrews(ownerIds);

  const contested: string[] = [];
  for (const r of blocked) {
    const ownerUserId = states.get(r.h3)?.ownerUserId ?? null;
    const ownerCrewId = ownerUserId ? ownerCrews.get(ownerUserId) ?? null : null;
    // Même crew (ou propriétaire sans crew) → pas de contestation entre crews.
    if (ownerCrewId === null || ownerCrewId === crewId) continue;

    // Résolution pondérée (MVP mono-course : 1 coureur validé par crew, trust=1).
    const presences: ContestedCrewPresence[] = [
      { crewId, runners: 1, trust: 1 },
      { crewId: ownerCrewId, runners: 1, trust: 1 },
    ];
    const resolved = resolveContestedHex({ currentOwnerCrewId: ownerCrewId, presences });

    // Anti-collusion (§11) : historique des reprises de CE hex entre crews.
    const h3db = h3ToDb(r.h3);
    const { data: hist, error: histErr } = await supabase
      .from('contested_group_runs')
      .select('winner_crew_id')
      .eq('h3index', h3db)
      .order('created_at', { ascending: true });
    if (histErr) throw new Error(`contested history read: ${histErr.message}`);
    const historyCrews = (hist ?? [])
      .map((h) => h.winner_crew_id as string | null)
      .filter((c): c is string => !!c);
    // On projette la reprise courante en fin d'historique pour le compteur.
    const projected = [...historyCrews, resolved.ownerCrewId ?? ownerCrewId];
    const penalty = collusionPenalty(projected);
    const status = penalty === 'stats_only' ? 'stats_only' : resolved.status;

    const { error: insErr } = await supabase.from('contested_group_runs').insert({
      h3index: h3db,
      city_id: cityId ?? null,
      prev_owner_crew_id: ownerCrewId,
      winner_crew_id: status === 'stats_only' || status === 'neutralized'
        ? null
        : resolved.ownerCrewId,
      challenger_crew_id: crewId,
      run_id: runId,
      status,
    });
    if (insErr) throw new Error(`contested_group_runs insert: ${insErr.message}`);

    // Feed crew (§50) — message doux, jamais de shame. Deux crews notifiés.
    const feedBody = penalty === 'stats_only'
      ? 'Bonus territoire réduit : reprise répétée entre mêmes crews'
      : 'Hex contesté lors d’un run groupé';
    const { error: feedErr } = await supabase.from('crew_feed_events').insert([
      { crew_id: crewId, actor_id: userId, event_type: 'contested', payload: { h3: r.h3, status, body: feedBody } },
      { crew_id: ownerCrewId, actor_id: userId, event_type: 'contested', payload: { h3: r.h3, status, body: feedBody } },
    ]);
    if (feedErr) throw new Error(`crew_feed_events insert: ${feedErr.message}`);

    contested.push(r.h3);
  }
  return contested;
}

// ─── AMENDEMENT-17 §CH2 : frontières partielles crew (ouverture + complétion) ─

const MS_PER_HOUR_BOUNDARY = 3_600_000;

/** Ligne partial_boundaries `open` chargée pour tenter une complétion. */
interface OpenBoundaryRow {
  id: string;
  name: string;
  segments: BoundarySegment[];
  opener_ring: BoundaryEnd[];
  total_length_m: number;
  missing_m: number;
  missing_segment: [BoundaryEnd, BoundaryEnd];
  opener_user_id: string;
}

/** Contexte de décision de claims réutilisé pour l'intérieur d'une frontière fermée. */
interface BoundaryClaimContext {
  userId: string;
  userCreatedAt: Date;
  now: Date;
  cityId: string | undefined;
  density: ZoneDensity;
  crewId: string;
}

/**
 * Tente de FERMER une frontière partielle OUVERTE du crew du coureur avec la
 * trace claimable de CETTE course (AMENDEMENT-17 §CH2). ANTI-ABUS appliqué :
 *  - MÊME CREW only : on ne charge QUE les frontières `open` du crew du coureur
 *    → un rival ne voit jamais la frontière d'un autre crew, il ne peut donc pas
 *    la compléter (rival overlap → reste `open`/`contested` en V1, pas de
 *    complétion au MVP) ;
 *  - GRYD VERIFIED : le run du finisher doit être vérifié (motionTrust ≥
 *    VERIFIED_MIN_TRUST) — un segment douteux ne referme pas une boucle ;
 *  - TTL : seules les `open` non expirées (expires_at > now) sont chargées ;
 *  - CONTRIBUTION du finisher : canComplete (pur) exige connexion ≤ tolérance
 *    aux deux bouts + segment ≥ FINISHER_MIN_SEGMENT_M OU part ≥ FINISHER_MIN_SHARE.
 * À la 1ʳᵉ frontière complétable : ferme la boucle (intérieur via enclosedCells
 * sur l'anneau ouvreur + trace finisher, moteur AMENDEMENT-12), décide les
 * claims SERVEUR (decideClaims → claim_hexes, zone attribuée au CREW via le
 * cache crew de claim_hexes), insère boundary_contributions (ouvreur + finisher
 * au prorata, contributionSplit), passe la frontière `completed`. Retourne le
 * payload `boundaryCompleted` + les hexes intérieurs pris (pour la contribution
 * crew de l'appelant), ou null si aucune complétion.
 */
async function completeBoundaries(
  ctx: BoundaryClaimContext,
  finisherTrace: readonly { lat: number; lng: number }[],
  finisherVerified: boolean,
  runId: string,
): Promise<
  | {
    payload: NonNullable<IngestRunResponse['boundaryCompleted']>;
    interiorClaimed: { lat: number; lng: number }[];
  }
  | null
> {
  // GRYD Verified obligatoire : un finisher non vérifié ne referme jamais.
  if (!finisherVerified) return null;
  if (finisherTrace.length < 2) return null;

  const nowIso = ctx.now.toISOString();
  const { data: rows, error } = await supabase
    .from('partial_boundaries')
    .select('id, name, segments, opener_ring, total_length_m, missing_m, missing_segment, opener_user_id')
    .eq('crew_id', ctx.crewId)
    .eq('status', 'open')
    .gt('expires_at', nowIso)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`partial_boundaries read: ${error.message}`);
  if (!rows || rows.length === 0) return null;

  for (const row of rows as OpenBoundaryRow[]) {
    const verdict = canComplete(
      {
        openEnds: row.missing_segment,
        missingM: Number(row.missing_m),
        totalLengthM: Number(row.total_length_m),
      },
      finisherTrace,
      true, // même crew (structurellement garanti par le filtre crew_id ci-dessus)
    );
    if (!verdict.completes) continue;

    // ── Boucle fermée : intérieur = anneau ouvreur + trace finisher (pont
    //    end→start). enclosedCells (moteur AMENDEMENT-12) sur le polygone
    //    complet, MOINS le couloir du finisher déjà pris par cette course. ──
    const openerRing = (row.opener_ring ?? []).map((p) => ({ lat: p.lat, lng: p.lng }));
    if (openerRing.length < 2) continue; // anneau ouvreur manquant → on ne devine pas

    // ── Fermeture de boucle CREW (algo #8) : UN point d'entrée pur ────────────
    // AMENDEMENT-17 §CH2. `runCrewBoundaryClose` EMBALLE la séquence fullRing →
    // finisherCorridor → enclosedCells → plafond d'aire → decideClaims qui était
    // câblée ici à la main. Le SEUL accès I/O est le résolveur `resolveOwnership`
    // injecté ci-dessous : il fait EXACTEMENT les mêmes lectures DB, dans le MÊME
    // ordre (loadHexStates(capped) puis Promise.all[owners/privacy/noCapture/
    // claimsToday] puis loadContextByHex), qu'avant l'extraction. Extraction
    // mécanique, iso-comportement : mêmes hexes intérieurs, mêmes claims, même
    // plafond, même ordre d'écriture. Le moteur rend `decision` + l'intérieur
    // plafonné, réutilisés à l'identique par tout le reste de la fonction.
    const resolveOwnership = async (
      capped: readonly string[],
    ): Promise<CrewOwnershipResolution> => {
      const states = await loadHexStates(capped);
      const [ownersCreatedAt, privacyHexes, noCaptureHexes, claimsToday] = await Promise.all([
        loadOwnersCreatedAt(states, ctx.userId),
        loadPrivacyHexes(ctx.userId, capped),
        loadNoCaptureHexes(capped),
        loadClaimsToday(ctx.userId, ctx.now),
      ]);
      // coeff_contexte §23 de l'intérieur d'une boucle CREW fermée : une zone crew
      // qui referme dans une offensive active (`crew_mission`) ou sur du rival
      // (`contested`) est majorée comme un run normal. Même règle SERVEUR.
      const contextByHex = await loadContextByHex(ctx.userId, ctx.crewId, capped, states, ctx.now);
      return {
        states,
        ownersCreatedAt,
        privacyHexes,
        noCaptureHexes,
        claimsToday,
        ...(contextByHex.size > 0 ? { contextByHex } : {}),
      };
    };

    // Plafond d'aire par distance courue par le FINISHER (réutilise la règle
    // boucle) : seules les cellules proches du tracé sont conservées au plafond.
    // finisher + accumulé = loopInteriorCellCap(verdict.finisherLengthM +
    // row.total_length_m), à l'identique.
    const { decision } = await runCrewBoundaryClose({
      openerRing,
      finisherTrace,
      finisherLengthM: verdict.finisherLengthM,
      accumulatedLengthM: Number(row.total_length_m),
      userId: ctx.userId,
      userCreatedAt: ctx.userCreatedAt,
      now: ctx.now,
      zoneDensity: ctx.density,
      resolveOwnership,
    });
    const actionable = decision.results.filter((r) =>
      r.outcome === 'claimed_neutral' || r.outcome === 'stolen'
    );
    if (actionable.length > 0) {
      const rpcClaims = actionable.map((r) => ({
        h3index: h3ToDb(r.h3),
        outcome: rpcOutcome(r),
        points: r.points,
        locked_until: decision.lockedUntil.toISOString(),
        decay_at: decision.decayExempt ? null : decision.decayAt.toISOString(),
      }));
      const { error: rpcError } = await supabase.rpc('claim_hexes', {
        p_run_id: runId,
        p_user_id: ctx.userId,
        p_city_id: ctx.cityId ?? null,
        p_claims: rpcClaims,
      });
      if (rpcError) throw new Error(`claim_hexes boundary rpc: ${rpcError.message}`);
    }
    const interiorClaimed = actionable.map((r) => {
      const [lat, lng] = cellToLatLng(r.h3);
      return { lat, lng };
    });

    // ── Contributions : ouvreur (segments existants) + finisher, au prorata ──
    const mergedSegments: BoundarySegment[] = [
      ...row.segments,
      { userId: ctx.userId, validatedLengthM: Math.round(verdict.finisherLengthM) },
    ];
    const split = contributionSplit(mergedSegments);
    const crewPoints = decision.totals.points;

    // Persistance : frontière `completed` + lignes boundary_contributions.
    const { error: updErr } = await supabase
      .from('partial_boundaries')
      .update({ status: 'completed', segments: mergedSegments })
      .eq('id', row.id)
      .eq('status', 'open'); // garde anti-course concurrente (double fermeture)
    if (updErr) throw new Error(`partial_boundaries complete: ${updErr.message}`);

    const lengthByUser = new Map<string, number>();
    for (const seg of mergedSegments) {
      lengthByUser.set(seg.userId, (lengthByUser.get(seg.userId) ?? 0) + seg.validatedLengthM);
    }
    const { error: contribErr } = await supabase.from('boundary_contributions').upsert(
      split.map((s) => ({
        boundary_id: row.id,
        user_id: s.userId,
        validated_length_m: Math.round(lengthByUser.get(s.userId) ?? 0),
        share: Number(s.share.toFixed(5)),
      })),
      { onConflict: 'boundary_id,user_id' },
    );
    if (contribErr) throw new Error(`boundary_contributions insert: ${contribErr.message}`);

    // Feed crew (§50) : célébration collective, jamais technique.
    const { error: feedErr } = await supabase.from('crew_feed_events').insert({
      crew_id: ctx.crewId,
      actor_id: ctx.userId,
      event_type: 'boundary_completed',
      payload: {
        name: row.name,
        contributions: split.map((s) => ({ user: s.userId, share: s.share })),
        crewPoints,
      },
    });
    if (feedErr) throw new Error(`crew_feed_events boundary insert: ${feedErr.message}`);

    return {
      payload: {
        name: row.name,
        contributions: split.map((s) => ({ user: s.userId, share: s.share })),
        crewPoints,
      },
      interiorClaimed,
    };
  }
  return null;
}

/**
 * OUVRE une frontière partielle si CETTE course est un run VALIDE, long, NON
 * bouclé mais FERMABLE (AMENDEMENT-17 §CH2). ANTI-ABUS : réservé au crew (sans
 * crew → pas de frontière crew), run GRYD Verified only. Pas de doublon : si une
 * frontière `open` équivalente du crew existe déjà (même ouvreur, bouts ouverts
 * ≤ tolérance), on n'en recrée pas. `name` = ville déclarée (secteur) ou défaut.
 * Retourne le payload `openBoundary`, ou null (rien ouvert).
 */
async function openBoundary(
  ctx: BoundaryClaimContext,
  boundary: OpenBoundary,
  openerRing: readonly { lat: number; lng: number }[],
  boundaryName: string,
): Promise<NonNullable<IngestRunResponse['openBoundary']> | null> {
  const nowIso = ctx.now.toISOString();
  // Anti-doublon : frontière `open` du même ouvreur dont un bout ouvert coïncide
  // (≤ PARTIAL_JOIN_TOLERANCE_M) avec l'un des nouveaux bouts.
  const { data: existing, error: exErr } = await supabase
    .from('partial_boundaries')
    .select('missing_segment')
    .eq('crew_id', ctx.crewId)
    .eq('opener_user_id', ctx.userId)
    .eq('status', 'open')
    .gt('expires_at', nowIso);
  if (exErr) throw new Error(`partial_boundaries dup read: ${exErr.message}`);
  const [newA, newB] = boundary.openEnds;
  const isDuplicate = (existing ?? []).some((r) => {
    const seg = r.missing_segment as [BoundaryEnd, BoundaryEnd] | null;
    if (!seg) return false;
    const [a, b] = seg;
    const close = (p: BoundaryEnd, q: BoundaryEnd) => haversineM(p, q) <= PARTIAL_JOIN_TOLERANCE_M;
    return (close(a, newA) && close(b, newB)) || (close(a, newB) && close(b, newA));
  });
  if (isDuplicate) return null;

  const expiresAt = new Date(ctx.now.getTime() + PARTIAL_BOUNDARY_TTL_H * MS_PER_HOUR_BOUNDARY);
  const segments: BoundarySegment[] = [
    { userId: ctx.userId, validatedLengthM: Math.round(boundary.tracedLengthM) },
  ];
  const { error: insErr } = await supabase.from('partial_boundaries').insert({
    crew_id: ctx.crewId,
    opener_user_id: ctx.userId,
    city_id: ctx.cityId ?? null,
    name: boundaryName,
    segments,
    // Anneau ouvreur complet (serveur only) : requis pour recalculer l'intérieur
    // à la fermeture. On stocke les points arrondis (~6 décimales suffisent).
    opener_ring: openerRing.map((p) => ({
      lat: Number(p.lat.toFixed(6)),
      lng: Number(p.lng.toFixed(6)),
    })),
    total_length_m: Math.round(boundary.tracedLengthM),
    missing_m: Math.round(boundary.missingM),
    missing_segment: boundary.missingSegment,
    zone_estimate_km2: Number(boundary.zoneEstimateKm2.toFixed(4)),
    expires_at: expiresAt.toISOString(),
  });
  if (insErr) throw new Error(`partial_boundaries insert: ${insErr.message}`);

  return {
    name: boundaryName,
    missingM: Math.round(boundary.missingM),
    expiresAt: expiresAt.toISOString(),
  };
}

// ─── AMENDEMENT-19 §7 : application serveur d'UN bonus ciblé ──────────────────

/** Ligne active_bonuses `active` chargée pour tenter une récompense. */
interface ActiveBonusRow {
  id: string;
  scope: 'crew' | 'player';
  bonus_id: BonusId;
}

/** Contexte serveur de récompense d'un bonus (signaux du run + base capée). */
interface BonusApplyContext {
  userId: string;
  crewId: string | null;
  now: Date;
  motionTrust: number;
  /** Progression de coffre de base de ce run (déjà boostée) — base du delta bonus. */
  chestBase: number;
  /** XP perso de base de ce run — base du delta bonus. */
  xpBase: number;
  /** % de multiplicateur SYSTÈME déjà actif (Crew Boost coffre) — pour le CAP. */
  systemPct: number;
  /** Ids de bonus « répondus » par CE run (trigger satisfait) — filtre serveur. */
  answered: Set<BonusId>;
}

/** Bucket semaine ISO 'YYYY-Www' (UTC) — cap joueur/semaine. */
function isoWeekBucket(now: Date): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = (d.getUTCDay() + 6) % 7; // lundi=0
  d.setUTCDate(d.getUTCDate() - day + 3); // jeudi de la semaine ISO
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 +
    Math.round(((d.getTime() - firstThursday.getTime()) / MS_PER_DAY - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/**
 * Applique AU PLUS UN bonus ciblé à ce run (AMENDEMENT-19 §7). SERVEUR seul juge.
 * « GRYD ne te donne pas des bonus au hasard. » : on ne récompense QUE si une
 * fenêtre `active_bonuses` est ouverte pour ce crew/joueur ET que le run y
 * RÉPOND (trigger satisfait, `ctx.answered`). Étapes :
 *  1. charge les bonus `active` non expirés du joueur (scope player) et de son
 *     crew (scope crew) ;
 *  2. ne garde que ceux « répondus » par ce run ;
 *  3. choisit le PLUS PRIORITAIRE (BONUS_PRIORITY, via bonusById), UN SEUL ;
 *  4. vérifie l'ÉLIGIBILITÉ (eligible pur : GRYD Verified, même crew, caps
 *     joueur/semaine + crew/jour + crew/semaine, cooldown zone) avec les
 *     compteurs RÉELS (player_bonus_claims) ;
 *  5. applique la récompense CAPÉE +35 % (applyBonusReward, systemPct du Crew
 *     Boost — UN multiplicateur, jamais de cumul) : +coffre crew (delta ajouté
 *     au coffre de la semaine), +progrès badge, +durée de protection, cosmétique ;
 *  6. marque le bonus `claimed`, trace le player_bonus_claim (caps futurs).
 * Retourne le payload `bonusApplied` (bonusId/name/effect court), ou null.
 * Idempotence : appelé UNIQUEMENT sur le chemin frais (le replay renvoie la
 * célébration persistée sans recalcul) → jamais deux récompenses pour un run.
 */
async function applyActiveBonus(
  ctx: BonusApplyContext,
): Promise<IngestRunResponse['bonusApplied'] | null> {
  if (ctx.answered.size === 0) return null;
  const nowIso = ctx.now.toISOString();

  // 1. Fenêtres actives du joueur + de son crew (subjects concernés).
  const subjectIds = [ctx.userId, ...(ctx.crewId !== null ? [ctx.crewId] : [])];
  const { data: rows, error } = await supabase
    .from('active_bonuses')
    .select('id, scope, bonus_id')
    .in('subject_id', subjectIds)
    .eq('status', 'active')
    .gt('expires_at', nowIso);
  if (error) throw new Error(`active_bonuses read: ${error.message}`);
  if (!rows || rows.length === 0) return null;

  // 2. Candidats « répondus » par ce run + cohérence de scope (un bonus crew
  //    exige un crew ; un bonus player vise bien ce joueur).
  const candidates = (rows as ActiveBonusRow[]).filter((r) => {
    if (!ctx.answered.has(r.bonus_id)) return false;
    if (r.scope === 'crew' && ctx.crewId === null) return false;
    return true;
  });
  if (candidates.length === 0) return null;

  // 3. Le PLUS PRIORITAIRE (un seul bonus principal — doc §4). Départage
  //    déterministe par bonus_id (jamais de tirage au hasard).
  candidates.sort((a, b) => {
    const d = priorityRank(b.bonus_id) - priorityRank(a.bonus_id);
    return d !== 0 ? d : (a.bonus_id < b.bonus_id ? -1 : 1);
  });
  const chosen = candidates[0]!;
  const def: BonusDefinition = bonusById(chosen.bonus_id);

  // 4. Compteurs réels pour l'anti-abus (caps/cooldown).
  const week = isoWeekBucket(ctx.now);
  const day = utcDay(ctx.now);
  const elig = await buildEligibility(def, ctx, week, day);
  const verdict = eligible(def, elig);
  if (!verdict.eligible) return null; // caps/cooldown/verify non satisfaits → rien

  // 5. Récompense CAPÉE +35 % (un multiplicateur, systemPct = Crew Boost).
  const base: BonusApplyBase = {
    chestBase: ctx.chestBase,
    xpBase: ctx.xpBase,
    systemPct: ctx.systemPct,
  };
  const applied = applyBonusReward(def, base);

  // 5a. Coffre crew : +chestDelta sur le coffre de la semaine (jamais points/rang).
  const chestDelta = Math.round(applied.chestDelta);
  if (chestDelta > 0 && ctx.crewId !== null) {
    const weekStart = isoWeekStart(ctx.now);
    const { data: chestRow, error: chestReadErr } = await supabase
      .from('crew_chests')
      .select('progress')
      .eq('crew_id', ctx.crewId)
      .eq('week_start', weekStart)
      .maybeSingle();
    if (chestReadErr) throw new Error(`crew_chests bonus read: ${chestReadErr.message}`);
    const progress = ((chestRow?.progress as number | undefined) ?? 0) + chestDelta;
    const { error: chestErr } = await supabase
      .from('crew_chests')
      .upsert({ crew_id: ctx.crewId, week_start: weekStart, progress }, {
        onConflict: 'crew_id,week_start',
      });
    if (chestErr) throw new Error(`crew_chests bonus upsert: ${chestErr.message}`);
  }

  // NB(MVP) : le crédit d'XP perso (applied.xpDelta), le progrès de badge
  // (applied.badgeProgress) et la durée de protection (applied.protectionH)
  // sont RENVOYÉS au client via bonusApplied.effect et appliqués par leurs
  // pipelines dédiés (XP/badges/bouclier) — la source de vérité de la
  // récompense reste ce bonus. Aucun effet sur territoire/points/classement.

  // 6. Fenêtre `claimed` (une seule récompense par fenêtre) + trace du claim.
  const { error: updErr } = await supabase
    .from('active_bonuses')
    .update({ status: 'claimed' })
    .eq('id', chosen.id)
    .eq('status', 'active'); // garde anti-course concurrente
  if (updErr) throw new Error(`active_bonuses claim: ${updErr.message}`);

  const { error: claimErr } = await supabase.from('player_bonus_claims').insert({
    bonus_id: def.id,
    user_id: ctx.userId,
    week,
    day,
    claimed_at: nowIso,
  });
  if (claimErr) throw new Error(`player_bonus_claims insert: ${claimErr.message}`);

  return { bonusId: def.id, name: def.name, effect: bonusEffectLabel(def) };
}

/** Rang de priorité d'un bonus — DÉRIVÉ de BONUS_PRIORITY (game-rules, source
 * unique) : toute réorganisation de l'ordre y est suivie ici sans drift. */
function priorityRank(id: BonusId): number {
  return (BONUS_PRIORITY as Record<string, number>)[id] ?? 0;
}

/**
 * Construit le contexte d'éligibilité anti-abus (compteurs réels lus dans
 * player_bonus_claims) pour `def`. Lit : occurrences de CE bonus par CE joueur
 * cette semaine / ce jour, occurrences du crew ce jour / cette semaine, jours
 * depuis le dernier claim du joueur (Retour), heures depuis le dernier claim
 * (cooldown zone — approx MVP : dernier claim de ce bonus par ce joueur).
 */
async function buildEligibility(
  def: BonusDefinition,
  ctx: BonusApplyContext,
  week: string,
  day: string,
): Promise<BonusEligibilityContext> {
  // Claims de CE bonus par CE joueur (semaine courante + historique récent).
  const { data: mine, error: mineErr } = await supabase
    .from('player_bonus_claims')
    .select('week, day, claimed_at')
    .eq('user_id', ctx.userId)
    .eq('bonus_id', def.id)
    .order('claimed_at', { ascending: false })
    .limit(200);
  if (mineErr) throw new Error(`player_bonus_claims read: ${mineErr.message}`);
  const claims = mine ?? [];
  const playerClaimsThisWeek = claims.filter((c) => c.week === week).length;

  // Cooldown zone / intervalle joueur : depuis le dernier claim de ce joueur.
  let daysSinceLastPlayerClaim: number | undefined;
  let hoursSinceLastZoneClaim: number | undefined;
  const last = claims[0];
  if (last) {
    const lastMs = new Date(last.claimed_at as string).getTime();
    const diffMs = ctx.now.getTime() - lastMs;
    daysSinceLastPlayerClaim = diffMs / MS_PER_DAY;
    hoursSinceLastZoneClaim = diffMs / MS_PER_HOUR_BOUNDARY;
  }

  // Caps CREW (jour/semaine) : claims de CE bonus par les MEMBRES du crew.
  let crewClaimsToday = 0;
  let crewClaimsThisWeek = 0;
  if (ctx.crewId !== null && (def.cap.perCrewPerDay != null || def.cap.perCrewPerWeek != null)) {
    const { data: members, error: memErr } = await supabase
      .from('crew_members')
      .select('user_id')
      .eq('crew_id', ctx.crewId)
      .is('left_at', null);
    if (memErr) throw new Error(`crew_members bonus read: ${memErr.message}`);
    const memberIds = (members ?? []).map((m) => m.user_id as string);
    if (memberIds.length > 0) {
      const { data: crewClaims, error: ccErr } = await supabase
        .from('player_bonus_claims')
        .select('week, day')
        .eq('bonus_id', def.id)
        .in('user_id', memberIds)
        .eq('week', week);
      if (ccErr) throw new Error(`player_bonus_claims crew read: ${ccErr.message}`);
      crewClaimsThisWeek = (crewClaims ?? []).length;
      crewClaimsToday = (crewClaims ?? []).filter((c) => c.day === day).length;
    }
  }

  const elig: BonusEligibilityContext = {
    motionTrust: ctx.motionTrust,
    sameCrew: ctx.crewId !== null,
    playerClaimsThisWeek,
    crewClaimsToday,
    crewClaimsThisWeek,
  };
  if (daysSinceLastPlayerClaim !== undefined) elig.daysSinceLastPlayerClaim = daysSinceLastPlayerClaim;
  if (hoursSinceLastZoneClaim !== undefined) elig.hoursSinceLastZoneClaim = hoursSinceLastZoneClaim;
  return elig;
}

/**
 * Ce joueur REVIENT-il après une absence dans la fenêtre du bonus Retour
 * (AMENDEMENT-19 §6.4, anti-shame) ? PURE côté logique (l'I/O lit la course
 * PRÉCÉDENTE). Vrai si l'écart entre CE run et le run valide précédent (hors
 * celui-ci, `runId`) tombe dans [BONUS_RETURN_ABSENCE_MIN_DAYS,
 * BONUS_RETURN_ABSENCE_MAX_DAYS]. Aucune course antérieure → non (le Retour
 * cible un joueur qui revient, pas un tout nouveau). Jamais de menace ni de
 * culpabilisation : c'est un signal d' APPARITION, la copy reste douce.
 */
async function isReturningPlayer(userId: string, runId: string, now: Date): Promise<boolean> {
  const { data, error } = await supabase
    .from('runs')
    .select('started_at')
    .eq('user_id', userId)
    .in('status', ['valid', 'partial'])
    .neq('id', runId)
    .order('started_at', { ascending: false })
    .limit(1);
  if (error) throw new Error(`runs return read: ${error.message}`);
  const prev = (data ?? [])[0];
  if (!prev) return false;
  const days = (now.getTime() - new Date(prev.started_at as string).getTime()) / MS_PER_DAY;
  return days >= BONUS_RETURN_ABSENCE_MIN_DAYS && days <= BONUS_RETURN_ABSENCE_MAX_DAYS;
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
  const runMode = effectiveRunMode(request.runMode);
  const isOnboardingRetro = request.onboardingRetro === true;

  try {
    // Profil (streak, club, ancienneté) — nécessaire même pour le replay/rejet.
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('created_at, streak_weeks, is_club, onboarding_import_at')
      .eq('id', userId)
      .single<UserProfile>();
    if (profileError || !profile) return json({ error: 'unknown_user' }, 403);

    const now = new Date();

    if (isOnboardingRetro) {
      if (profile.onboarding_import_at) {
        return json({ error: 'onboarding_import_already_done' }, 409);
      }
      if (!isWithinOnboardingImportWindow(new Date(request.startedAt), now)) {
        return json({ error: 'onboarding_import_outside_window' }, 400);
      }
    }

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

    if (isOnboardingRetro) {
      const retroCount = await countOnboardingRetroRuns(userId);
      if (retroCount >= ONBOARDING_IMPORT_MAX_CAPTURE_RUNS) {
        return json({ error: 'onboarding_import_run_cap' }, 400);
      }
    }

    // ── Stats §3.2 (pur) — calculées AVANT la dédup pour que la branche
    //    métrique de dedupeActivity (durée±10 % & distance±10 %) puisse jouer :
    //    deux imports de la même activité produisent des polylignes arrondies
    //    différentes, seul l'appariement durée/distance/départ les rattrape.
    const filtered = filterPoints(request.points);
    const stats = computeStats(filtered.segments);
    const validation = validateOrStatus(filtered, stats, request.stepCount, request.gpsTrust);

    const distanceM = Math.round(stats.distanceM);
    const durationS = Math.round(stats.durationS);
    const avgPaceSKm = Math.round(stats.avgPaceSKm);

    // ── polyline_hash + déduplication Activity Hub (§4) ──────────────────────
    // Le hash sert de clé de dédup forte ET est persisté sur la course. La dédup
    // « OU triple » du §4 est désormais pleinement câblée : hash identique OU
    // (départ±3 min & durée±10 % & distance±10 %) via les vraies valeurs ci-dessus.
    // Un doublon d'une course déjà ingérée → réponse DOUCE 'duplicate'
    // (idempotente, pas d'erreur), et on trace l'import dans imported_activities.
    const runHash = request.polylineHash ?? await polylineHash(request.points);
    const dupOf = await findDuplicateRun(userId, {
      startedAt: request.startedAt,
      durationS,
      distanceM,
      polylineHash: runHash,
    });
    if (dupOf) {
      await supabase.from('imported_activities').insert({
        user_id: userId,
        source: request.source === 'healthkit' ? 'healthkit' : 'gryd_live',
        external_id: request.clientRunId,
        started_at: request.startedAt,
        duration_s: durationS,
        distance_m: distanceM,
        polyline_hash: runHash,
        status: 'duplicate',
        matched_run_id: dupOf,
      });
      return json({ status: 'duplicate', runId: dupOf, replayed: false }, 200);
    }
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
      polyline_hash: runHash,
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
        newBadges: [], // course non valide : aucune stat, aucun badge (§3)
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
      // Clean Runner : un run rejeté remet cleanDays à 0 (applyRunToStats ignore
      // les rejets ; applyRejectedRun mémorise le jour du rejet). Flagged compte
      // comme rejet côté fair-play (non vérifié, casse la série propre).
      await awardRejectedRun(userId, request.startedAt);
      return json(response);
    }

    // ── Hexing (pur) ─────────────────────────────────────────────────────────
    const hexes = hexesForSegments(validation.claimable);

    // ── AMENDEMENT-07 §2 : modes SANS capture (social_run / course_privee) ────
    // Aucun claim territoire (hexes traversés → statut stats_only), aucune écriture
    // hex, aucune XP crew de capture. social_run garde stats + badges + XP PERSO.
    // course_privee = stats perso uniquement, aucun partage, aucune entrée feed.
    if (runMode !== 'conquete') {
      return json(await handleNoClaimRun({
        request,
        runMode,
        userId,
        profile,
        baseRow,
        validation,
        distanceM,
        durationS,
        avgPaceSKm,
        streak,
        now,
      }));
    }

    // ── AMENDEMENT-12 §B + AMENDEMENT-16 §2 : la boucle fait la zone (pur) ───
    // INTÉGRITÉ : le polygone n'est construit que sur une trace claimable
    // CONTIGUË (loopTracePoints : exactement UN segment claimable). Un run
    // `partial` dont des segments sont exclus (voiture, allure hors bornes,
    // saut GPS) ne peut PAS fermer de boucle : aplatir les segments restants
    // relierait leurs extrémités en ligne droite et l'aire parcourue en
    // véhicule resterait enfermée puis capturée. Le couloir des segments
    // claimables reste pleinement récompensé (« trait »).
    // DEUX modes de fermeture MVP (detectLoop) : tolérance départ/arrivée
    // ≤ 80 m OU auto-intersection (le tracé se recroise → la partie fermée
    // fait la boucle, un 8 = la plus grande boucle). Puis anti-abus doc §6 :
    //  - forme trop fine (compacité 4πA/P² < LOOP_MIN_COMPACTNESS ou largeur
    //    2A/P < LOOP_MIN_WIDTH_M) → intérieur REFUSÉ, couloir + course
    //    conservés, loopRejectedReason='narrow' → UI « Zone non capturée :
    //    forme trop étroite. » ;
    //  - boucle trop grande → intérieur TRONQUÉ au plafond d'aire par
    //    distance courue (loopInteriorCellCap ← LOOP_MAX_AREA_BY_DISTANCE_KM2,
    //    interpolation linéaire) par distance croissante au tracé (tri
    //    enclosedCells), capReached=true → UI « Boucle validée. Capture
    //    plafonnée : seuls les secteurs proches du tracé sont capturés. »
    // Le couloir passe AVANT l'intérieur dans decideClaims : au plafond
    // MAX_CLAIMS_PER_DAY (total couloir + intérieur), c'est l'intérieur le
    // plus loin du tracé qui est tronqué (blocked_daily_cap). Chaque cellule
    // intérieure passe par les MÊMES règles, une par une.
    // `loopTrace` reste calculé ICI (trace claimable contiguë) : le moteur le
    // recalcule à l'identique en interne, mais le reste du handler (frontières
    // crew partielles, §CH2) le réutilise tel quel plus bas.
    const loopTrace = loopTracePoints(validation.claimable);

    // ── Pipeline territorial (chemin CONQUÊTE) : UN point d'entrée pur ────────
    // AMENDEMENT-12 §B + AMENDEMENT-16 §2 + AMENDEMENT-23 §D. `runTerritoryEngine`
    // EMBALLE la séquence hexing → boucle/intérieur (gate forme + GPS < 80 + cap
    // d'aire) → decideClaims → scoring qui était câblée ici à la main. Le SEUL
    // accès I/O est le résolveur `resolveOwnership` injecté ci-dessous : il fait
    // EXACTEMENT les mêmes lectures DB, dans le MÊME ordre, qu'avant l'extraction.
    // Extraction mécanique, iso-comportement : mêmes hexes, mêmes claims, même
    // score, même ordre d'écriture.
    //
    // `states`/`crew`/`density` sont chargés DANS le résolveur mais réutilisés par
    // tout le reste du handler (défense graduée, processCrew, frontières,
    // avant-postes/routes, célébration) : on les capture depuis le résolveur pour
    // les garder disponibles à l'identique en aval.
    let states!: ReadonlyMap<string, HexState>;
    let crew!: { crewId: string | null; size: number };
    let density!: ZoneDensity;
    const resolveOwnership = async (
      allHexes: readonly string[],
    ): Promise<OwnershipResolution> => {
      // `crew` est chargé ICI (et non plus après la RPC) : le coeff_contexte de la
      // formule §23 (crew_mission/contested) dépend du crew du coureur ET doit être
      // décidé AVANT le scoring. Réutilisé tel quel par tout le reste du handler.
      states = await loadHexStates(allHexes);
      const [
        loadedCrew,
        ownersCreatedAt,
        privacyHexes,
        noCaptureHexes,
        loadedDensity,
        claimsToday,
      ] = await Promise.all([
        loadCrew(userId),
        loadOwnersCreatedAt(states, userId),
        loadPrivacyHexes(userId, allHexes),
        loadNoCaptureHexes(allHexes),
        loadDensity(request.cityId),
        loadClaimsToday(userId, now),
      ]);
      crew = loadedCrew;
      density = loadedDensity;

      // AMENDEMENT-23 §D / doc §23 : coeff_contexte par hex (contested/crew_mission),
      // décidé SERVEUR depuis l'état pré-run + les offensives crew actives. Sans ce
      // câblage, coeff_contexte valait toujours 1,0 et la moitié « contexte » de la
      // formule §23 restait inerte (finding). Non pay-to-win : le contexte se gagne
      // par la situation (rival présent / mission crew), jamais par un achat.
      const contextByHex = await loadContextByHex(userId, crew.crewId, allHexes, states, now);

      return {
        states,
        ownersCreatedAt,
        privacyHexes,
        noCaptureHexes,
        zoneDensity: density,
        claimsToday,
        ...(contextByHex.size > 0 ? { contextByHex } : {}),
      };
    };

    const territory = await runTerritoryEngine({
      claimable: validation.claimable,
      gpsTrust: validation.gpsTrust,
      trustScore: validation.trustScore,
      distanceM,
      now,
      userId,
      userCreatedAt: new Date(profile.created_at),
      streakWeeks: isOnboardingRetro ? 0 : profile.streak_weeks,
      isClub: profile.is_club,
      neutralOnly: isOnboardingRetro && ONBOARDING_IMPORT_NEUTRAL_ONLY,
      resolveOwnership,
    });
    // `hexes` (couloir) reste la constante calculée plus haut (§Hexing, ligne
    // `hexesForSegments`) : le moteur la recalcule à l'identique en interne, mais
    // le reste du handler la référence déjà — on ne la re-déclare pas. Le moteur
    // rend le RESTE (intérieur, décision, score, verdict de boucle).
    const { interiorCells, loopClosed, capReached, decision, score: territoryScore } = territory;
    const loopRejectedReason = territory.loopRejectedReason;
    let onboardingXpCandidate = 0;
    let score = territoryScore;
    if (isOnboardingRetro) {
      onboardingXpCandidate = score.xp;
      score = { ...score, points: 0, foulees: 0, xp: 0 };
    }
    // `interiorSet` reste dérivé ici (le couloir vs l'intérieur d'une boucle sert
    // au comptage des zones fermées de la célébration, plus bas).
    const interiorSet = new Set(interiorCells);

    // ── Insert runs PUIS RPC (claim_hexes vérifie l'existence du run) ────────
    const inserted = await insertRun({
      ...baseRow,
      status: validation.status,
      reject_reason: null,
      points_awarded: score.points,
      xp_awarded: score.xp,
      is_onboarding_retro: isOnboardingRetro,
      onboarding_xp_candidate: isOnboardingRetro ? onboardingXpCandidate : 0,
    }, userId, request.clientRunId, profile.streak_weeks);
    if (inserted.replayed) return json(inserted.payload);
    const runId = inserted.runId;

    // ── DÉFENSE GRADUÉE (AMENDEMENT-23 §D, doc §16/§17) ──────────────────────
    // La défense d'une zone déjà à soi ÉTEND sa stabilité de +24/48/72 h selon la
    // COUVERTURE de la frontière défendue par le tracé (frontier coverage %) :
    //  - couvrir/fermer (coverage ≥ 0,80 OU boucle fermée sur la zone) → +72 h ;
    //  - longer          (0,40 ≤ coverage < 0,80)                       → +48 h ;
    //  - traverser       (coverage < 0,40)                               → +24 h.
    // La frontière défendue = le CONTOUR des cellules re-parcourues du joueur
    // (centres des hexes `defended`, ordonnés le long du tracé) ; le tracé = la
    // trace claimable. Une boucle fermée = défense maximale (doc §16 niveau 3).
    // On REPOUSSE l'échéance de decay EXISTANTE de ce nombre d'heures (la
    // stabilité s'étend, elle ne se reset pas — engine/zone.extendDecay), plafonné
    // à ZONE_DECAY_DAYS. Les CAPTURES (neutral/steal) gardent now + 14 j.
    const defendedResults = decision.results.filter((r) => r.outcome === 'defended');
    let defenseHours = 0;
    if (defendedResults.length > 0) {
      const defendedFrontier = defendedResults.map((r) => {
        const [lat, lng] = cellToLatLng(r.h3);
        return { lat, lng };
      });
      const traceLine = validation.claimable.flat().map((p) => ({ lat: p.lat, lng: p.lng }));
      const coverage = frontierCoverage(defendedFrontier, traceLine);
      defenseHours = defenseHoursForCoverage(coverage, loopClosed);
    }
    // decay_at de DÉFENSE (par hex défendu) : extension depuis l'échéance actuelle.
    const defenseDecayIso = (h3: string): string | null => {
      if (decision.decayExempt) return null; // nouveau joueur : jamais de decay
      const current = states.get(h3)?.decayAt ?? null;
      return extendDecay(now, current, defenseHours).toISOString();
    };

    // ── Application atomique via la RPC claim_hexes ──────────────────────────
    const actionable = decision.results.filter((r) =>
      r.outcome === 'claimed_neutral' || r.outcome === 'stolen' ||
      r.outcome === 'defended' || r.outcome === 'already_owned_cooldown'
    );
    if (actionable.length > 0) {
      // La RPC crédite season_scores/Foulées depuis la somme des points par hex :
      // on y répartit le total FINAL (verify × streak × performance, floored).
      const finalPerHex = distributePointsAdjustment(
        actionable.map((r) => r.points),
        score.points,
      );
      const rpcClaims = actionable.map((r, i) => {
        const isCapture = r.outcome === 'claimed_neutral' || r.outcome === 'stolen';
        return {
          h3index: h3ToDb(r.h3),
          outcome: rpcOutcome(r),
          points: finalPerHex[i],
          locked_until: isCapture ? decision.lockedUntil.toISOString() : null,
          // Capture : now + 14 j (ou null si nouveau joueur, §3.3). Défense :
          // échéance ÉTENDUE de +24/48/72 h (défense graduée). already_owned_
          // cooldown : traité comme défense (decay repoussé, cf. rpcOutcome).
          decay_at: isCapture
            ? (decision.decayExempt ? null : decision.decayAt.toISOString())
            : defenseDecayIso(r.h3),
        };
      });
      const { error: rpcError } = await supabase.rpc('claim_hexes', {
        p_run_id: runId,
        p_user_id: userId,
        p_city_id: request.cityId ?? null,
        p_claims: rpcClaims,
      });
      if (rpcError) throw new Error(`claim_hexes rpc: ${rpcError.message}`);
    }

    await notifyAttackAlerts(userId, decision.results, states, now);

    // ── Mécaniques nourrissant les badges (décision fondateur 03/07/2026 :
    //    tous attribuables) : météo, événement, avant-poste, route. Les
    //    détections avant-poste/route tournent APRÈS la RPC (les claims de
    //    cette course comptent) ; la météo est fail-open (null = sans effet).
    const sorted = [...request.points].sort((a, b) => a.t - b.t);
    const startPoint = sorted[0] ?? null;
    const centroid = {
      lat: sorted.reduce((sum, p) => sum + p.lat, 0) / sorted.length,
      lng: sorted.reduce((sum, p) => sum + p.lng, 0) / sorted.length,
    };
    // `crew` déjà chargé plus haut (pour le coeff_contexte §23) — réutilisé ici.
    const [weather, duringEvent, outpost, route] = await Promise.all([
      startPoint !== null
        ? fetchWeather(startPoint.lat, startPoint.lng, request.startedAt)
        : Promise.resolve(null),
      loadDuringEvent(request.startedAt),
      detectOutpost(userId, crew.crewId, density, centroid),
      detectRoute(userId, crew.crewId, runId, states, hexes[0], hexes[hexes.length - 1], now),
    ]);

    // ── Badges (AMENDEMENT-04 §5) : stats vie entière + attribution ──────────
    // N'arrive qu'après un INSERT runs frais — jamais rejoué (le replay renvoie
    // la célébration persistée, qui contient déjà newBadges).
    // No Map Run (§2) : course valide dont TOUS les hexes claimés sont pionniers.
    const claimedTotal = decision.totals.claimed + decision.totals.stolen;
    const allPioneer = claimedTotal > 0 && decision.totals.pioneer === claimedTotal;
    // Météo/événement/routes crew : encore détectés (tables events/routes/weather
    // alimentées) mais ne nourrissent plus de badge dans le catalogue V2. On les
    // référence pour rester cohérent avec les insertions annexes.
    void weather;
    void duringEvent;
    // outpost.newCrewOutposts / route.newCrewRoutes : consommés par processCrew (§2).

    const newBadges = await awardBadges(userId, {
      status: validation.status,
      startedAt: request.startedAt,
      distanceM,
      durationS,
      avgPaceSKm,
      hexes: {
        claimed: decision.totals.claimed,
        stolen: decision.totals.stolen,
        defended: decision.totals.defended,
        pioneer: decision.totals.pioneer,
      },
      startPoint,
      endPoint: sorted[sorted.length - 1] ?? null,
      crewSize: crew.size,
      // Saison 0 en cours : toute course validée aujourd'hui en fait partie (MVP).
      duringSeasonZero: true,
      // Héritage Explorateur : capture en zone pionnière/sauvage.
      inPioneerZone: density === 'pioneer' || density === 'wild',
      // GRYD Verified : motion_trust réel de la validation (seuil VERIFIED_MIN_TRUST).
      motionTrust: validation.motionTrust,
      flagged: false, // course 'claimable' = valide/partielle sans flag bloquant
      // First Share : le client signale un partage explicite (défaut : non).
      shared: request.shared === true,
      // No Map Run : 100 % pionnier.
      allPioneer,
      newOutposts: outpost.newOutposts,
      newRoutes: route.newRoutes,
      // Easy/Recovery Run (§6) : mode facile choisi au départ (signal client).
      easyMode: request.easyMode === true,
      // Group Run (§3/§6, approx MVP) : une part ≥ HEX_SHARE des hexes touchés
      // est fraîchement verrouillée (≤ lock) par UN même autre coureur — proxy
      // de co-présence sans ingestion de la 2ᵉ course. Documenté MVP.
      groupRun: detectGroupRunProxy(hexes, states, now),
    });

    // ── Crews Supercell (§2) : XP crew + coffre + offensive ──────────────────
    // Contribution crew de la course. `firstOfWeek` = 1re contribution de ce
    // membre cette semaine (crew_xp_daily de la semaine vide) → participation.
    // `claimedCentroids` = centres des hexes réellement pris (neutres + volés),
    // pour compter la contribution aux offensives dont la zone les couvre.
    let crewOutcome: CrewProcessResult = {};
    if (!isOnboardingRetro && crew.crewId !== null) {
      const claimedCentroids = decision.results
        .filter((r) => r.outcome === 'claimed_neutral' || r.outcome === 'stolen')
        .map((r) => {
          const [lat, lng] = cellToLatLng(r.h3);
          return { lat, lng };
        });
      const weekStart = isoWeekStart(now);
      const { data: weekRows, error: weekErr } = await supabase
        .from('crew_xp_daily')
        .select('day')
        .eq('crew_id', crew.crewId)
        .eq('user_id', userId)
        .gte('day', weekStart);
      if (weekErr) throw new Error(`crew_xp_daily week read: ${weekErr.message}`);
      const firstOfWeek = (weekRows ?? []).length === 0;
      crewOutcome = await processCrew(userId, crew.crewId, now, {
        hexesCaptured: decision.totals.claimed + decision.totals.stolen,
        hexesDefended: decision.totals.defended,
        newCrewRoutes: route.newCrewRoutes,
        newCrewOutposts: outpost.newCrewOutposts,
        verified: (validation.motionTrust ?? 0) >= VERIFIED_MIN_TRUST,
        firstOfWeek,
      }, claimedCentroids);
    }

    // ── AMENDEMENT-07 §3 : hexes contestés (approx MVP mono-course) ───────────
    // Le 1ᵉʳ coureur a claimé (lock) ; ce 2ᵉ ingest d'un AUTRE crew ≤ lock aurait
    // été bloqué_lock — on le bascule `contested` via resolveContestedHex (pur),
    // insère contested_group_runs + crew_feed_events, applique l'anti-collusion.
    const contestedHexes = isOnboardingRetro ? [] : await handleContested(
      userId,
      crew.crewId,
      runId,
      request.cityId,
      decision.results,
      states,
      now,
    );

    // ── AMENDEMENT-17 §CH2 : frontières partielles crew ──────────────────────
    // « Ouvre une frontière. Ton crew peut la fermer. » Deux temps, dans cet
    // ordre (une même course peut fermer une frontière OU en ouvrir une, jamais
    // les deux au même endroit) :
    //  (b) COMPLÉTION d'abord : si le coureur a un crew et sa trace claimable
    //      referme une frontière `open` du MÊME crew (canComplete pur : même
    //      crew structurel + connexion ≤ tolérance aux 2 bouts + contribution
    //      finisher suffisante) → zone crew (intérieur via enclosedCells,
    //      claims SERVEUR) + contributions au prorata. Run GRYD Verified only ;
    //      rival → jamais de complétion (il ne voit pas la frontière).
    //  (a) OUVERTURE ensuite : sinon, si la trace est VALIDE, longue, NON
    //      bouclée mais FERMABLE (detectOpenBoundary), on crée une frontière
    //      `open` du crew (TTL PARTIAL_BOUNDARY_TTL_H) — sauf doublon.
    // Sans crew : aucune frontière crew (mécanique collaborative). Boucle
    // déjà fermée (loopClosed) : la zone est prise seul, rien à ouvrir.
    let boundaryCompleted: IngestRunResponse['boundaryCompleted'];
    let openBoundaryPayload: IngestRunResponse['openBoundary'];
    if (!isOnboardingRetro && crew.crewId !== null && loopTrace !== null) {
      const boundaryCtx: BoundaryClaimContext = {
        userId,
        userCreatedAt: new Date(profile.created_at),
        now,
        cityId: request.cityId,
        density,
        crewId: crew.crewId,
      };
      const finisherVerified = (validation.motionTrust ?? 0) >= VERIFIED_MIN_TRUST;

      const completion = await completeBoundaries(
        boundaryCtx,
        loopTrace,
        finisherVerified,
        runId,
      );
      if (completion) {
        boundaryCompleted = completion.payload;
      } else if (!loopClosed && finisherVerified) {
        // Pas de complétion + pas une boucle fermée : peut-on OUVRIR ?
        const open = detectOpenBoundary(loopTrace);
        if (open) {
          // Nom de la frontière : ville déclarée (secteur) ou défaut sobre.
          // MVP : le vrai secteur (« République ») viendra d'un géocodage V1 ;
          // ici on rattache à la ville déclarée pour un libellé lisible.
          const boundaryName = request.cityId ? CITIES[request.cityId].name : 'Secteur';
          openBoundaryPayload = await openBoundary(boundaryCtx, open, loopTrace, boundaryName) ??
            undefined;
        }
      }
    }

    // ── AMENDEMENT-19 §7 : application serveur d'UN bonus ciblé ───────────────
    // « GRYD révèle les bons moments pour agir. » On ne récompense que si une
    // fenêtre active_bonuses est ouverte pour ce crew/joueur ET que CE run y
    // RÉPOND. `answered` traduit les signaux du run en ids de bonus « répondus » :
    //  - finisher : ce run a FERMÉ une frontière crew (boundaryCompleted) — la
    //    fenêtre Finisher qui couvrait cette frontière est honorée ;
    //  - defense_critical : ce run a défendu des hexes (une zone menacée tenue) ;
    //  - crew_chest : run crew vérifié qui fait progresser le coffre (chestDelta) ;
    //  - exploration : ce run a ouvert une route/avant-poste ou un hex pionnier ;
    //  - clean_loop : boucle fermée, non refusée, run vérifié ;
    //  - return : ce joueur revient après une absence (fenêtre 5-10 j).
    // applyActiveBonus tranche ensuite priorité + éligibilité (caps/cooldown) et
    // applique la récompense CAPÉE +35 % (un multiplicateur, jamais de cumul).
    const runVerified = (validation.motionTrust ?? 0) >= BONUS_MIN_MOTION_TRUST;
    let bonusApplied: IngestRunResponse['bonusApplied'];
    if (!isOnboardingRetro && runVerified) {
      const answered = new Set<BonusId>();
      if (boundaryCompleted !== undefined) answered.add('finisher');
      if (decision.totals.defended > 0) answered.add('defense_critical');
      if (crew.crewId !== null && (crewOutcome.chestDelta ?? 0) > 0) answered.add('crew_chest');
      if (route.newRoutes > 0 || outpost.newOutposts > 0 || decision.totals.pioneer > 0) {
        answered.add('exploration');
      }
      if (loopClosed && loopRejectedReason === undefined) answered.add('clean_loop');
      if (await isReturningPlayer(userId, runId, now)) answered.add('return');

      // systemPct = (multiplicateur Crew Boost − 1), 0 si aucun boost. Sert le CAP.
      const systemPct = Math.max(0, (crewOutcome.boostMultiplier ?? 1) - 1);
      bonusApplied = await applyActiveBonus({
        userId,
        crewId: crew.crewId,
        now,
        motionTrust: validation.motionTrust ?? 0,
        chestBase: crewOutcome.chestDelta ?? 0,
        xpBase: score.xp,
        systemPct,
        answered,
      }) ?? undefined;
    }

    // ── AMENDEMENT-07 §5 : challenges actifs (user + crew) ────────────────────
    // Une course valide alimente les challenges solo (sujet user) et crew/rivalry
    // (sujet crew). challengeProgress (pur) décide ratio/done ; feedback sain §12.
    const challengeUpdates = isOnboardingRetro ? [] : await processChallenges(
      userId,
      crew.crewId,
      {
        runs: 1,
        distanceM,
        hexes: decision.totals.claimed + decision.totals.stolen,
        defends: decision.totals.defended,
      },
      now,
    );

    // ── AMENDEMENT-12 §B : zones intérieures réellement GAGNÉES par la boucle
    //    (claimed_neutral + stolen, déjà comptées dans totals/results) — le
    //    « dont N en boucle fermée » du post-run. Les intérieures bloquées
    //    (lock, bouclier, plafond…) ne comptent pas. `interiorSet` est hoisté
    //    plus haut (bloc boucle, réutilisé par decideClaims interiorHexes).
    const enclosedZones = interiorSet.size === 0 ? 0 : decision.results.filter((r) =>
      interiorSet.has(r.h3) && (r.outcome === 'claimed_neutral' || r.outcome === 'stolen')
    ).length;

    // ── Célébration persistée (source du replay idempotent) ──────────────────
    const response: IngestRunResponse = {
      runId,
      status: validation.status,
      replayed: false,
      runMode,
      distanceM,
      durationS,
      avgPaceSKm,
      loopClosed,
      enclosedZones,
      // AMENDEMENT-16 §2 (messages doux côté client, copy gelée types.ts) :
      // capReached → « Boucle validée. Capture plafonnée : seuls les secteurs
      // proches du tracé sont capturés. » ; loopRejectedReason='narrow' →
      // « Zone non capturée : forme trop étroite. »
      ...(capReached ? { capReached: true } : {}),
      ...(loopRejectedReason !== undefined ? { loopRejectedReason } : {}),
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
      newBadges,
      ...(isOnboardingRetro ? {
        onboardingRetro: true,
        onboardingXpCandidate,
      } : {}),
      ...(crewOutcome.crewXp !== undefined ? { crewXp: crewOutcome.crewXp } : {}),
      ...(crewOutcome.crewLevelUp !== undefined ? { crewLevelUp: crewOutcome.crewLevelUp } : {}),
      ...(contestedHexes.length > 0 ? { contestedHexes } : {}),
      ...(challengeUpdates.length > 0 ? { challengeUpdates } : {}),
      // AMENDEMENT-17 §CH2 : frontière crew fermée / ouverte par cette course.
      // Copy UX gelée (types.ts) : « Boucle crew fermée · {name} capturée · … »
      // et « Frontière ouverte · Il manque {missingM} m … » — jamais de polyline.
      ...(boundaryCompleted !== undefined ? { boundaryCompleted } : {}),
      ...(openBoundaryPayload !== undefined ? { openBoundary: openBoundaryPayload } : {}),
      // AMENDEMENT-19 §7 : UN bonus ciblé appliqué (coffre/XP/badge/protection,
      // capé +35 %). Copy gelée (types.ts) : « effet » court, jamais tronqué.
      ...(bonusApplied !== undefined ? { bonusApplied } : {}),
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
  clientGpsTrust: number | undefined,
): ValidationOutcome {
  // Ratio de points §3.2 gardés sur le payload reçu — seul calcul possible ici :
  // la trace arrive DÉCIMÉE, les compteurs de rejets bruts n'existent que côté
  // client (moteur gps.ts).
  const serverGpsTrust = filtered.totalPoints > 0
    ? Math.floor((100 * filtered.keptPoints) / filtered.totalPoints)
    : 0;
  // AMENDEMENT-15 §1 : le client envoie son GPS Trust (accuracy moyenne, pertes
  // de signal, ratio d'outliers sur la trace brute). Signal INDICATIF borné par
  // min() — il ne peut qu'ABAISSER la confiance, jamais la gonfler ; la décision
  // de claim reste 100 % serveur (§3.2).
  const gpsTrust = clientGpsTrust === undefined
    ? serverGpsTrust
    : Math.min(serverGpsTrust, Math.max(0, Math.min(100, Math.round(clientGpsTrust))));
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
  // AMENDEMENT-23 §D / doc §23 : palier VERIFY « stats only » — trustScore
  // (min gpsTrust/motionTrust) < VERIFY_PARTIAL_MIN (60) → verify_factor = 0 :
  // la course compte SPORTIVEMENT (stats/streak) mais ne capture RIEN. On la
  // classe `flagged` (même traitement : claims gelés, aucune écriture hex) —
  // au-dessus de 60, la capture est partielle (×0,5) ou pleine (×1,0), gérée
  // par verifyFactor dans computeScore. Un seul point de décision « capture ? ».
  if (trustScore < VERIFY_PARTIAL_MIN) {
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
