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
  type Activity,
  BONUS_MIN_MOTION_TRUST,
  BONUS_PRIORITY,
  BONUS_RETURN_ABSENCE_MAX_DAYS,
  BONUS_RETURN_ABSENCE_MIN_DAYS,
  CITIES,
  CO_CAPTURE_DAILY_POINTS_CAP,
  type ContextCoeffKey,
  DEFAULT_ACTIVITY,
  DEFEND_COOLDOWN_HOURS,
  FRESH_CAPTURE_PROTECT_HOURS,
  GROUP_RUN_HEX_SHARE_MIN,
  GROUP_RUN_START_TOLERANCE_MIN,
  H3_RESOLUTION,
  HEX_LOCK_HOURS,
  INGEST_MAX_RUNS_PER_HOUR,
  OUTPOST_RADIUS_KM,
  PARTIAL_BOUNDARY_TTL_H,
  PARTIAL_JOIN_TOLERANCE_M,
  RUN_MAX_POINTS,
  SEASON_DURATION_WEEKS,
  STREAK_HISTORY_WEEKS,
  type ZoneDensity,
} from '../_shared/game-rules.ts';
import { bonusWindowOpposable, effectiveActivity, isActivityShape } from './activity.ts';
// Verdict §3.2 + GRYD Verify : fonction PURE, extraite de ce fichier pour être
// testable (index.ts n'est pas importable — `Deno.serve` au chargement).
import { type ValidationOutcome, validateOrStatus } from './validate.ts';
import { type CityZoneRow, isCityIdShape, pickCityZone } from './city_zone.ts';
import { communeCityId, reverseGeocodeCommune, shouldAutoOpenCommune } from './commune_open.ts';
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
import { computeStats, filterPoints, haversineM } from '../_shared/engine/validation.ts';
import {
  detectLoop,
  enclosedCells,
  type GeoJsonPolygonal,
  hexesForSegments,
  loopInteriorCellCap,
  loopTracePoints,
  pointInGeoJson,
} from '../_shared/engine/hexing.ts';
// LOT 1 ÉTAPE 2 — la ligne `territories` (polygone autoritaire) d'une course.
// Décision PURE et testable, hors de ce fichier (index.ts n'est pas importable).
import { buildTerritoryRow, reportableAreaM2 } from './territory.ts';
// LOT 3 (suite) — la CONTESTATION (§9) : une boucle rivale n'emporte plus le
// polygone, elle ouvre une fenêtre de défense. Décision PURE et testable, hors
// de ce fichier ; l'échéance est tranchée par `resolve_due_contests()` (0080).
import {
  type CandidateTerritory,
  type ExistingContest,
  planContestWiring,
  TERRITORY_STATE_CONTESTED,
  TERRITORY_STATE_DEFENDED,
} from './contest_wiring.ts';
// §11 — L'ANTI-TRICHE EN SERVICE. `scoreRun` (moteur pur, 20 tests) existait
// depuis le lot 9 mais n'était appelé par PERSONNE : `anticheat_reviews` (0081)
// restait vide à jamais et l'écran d'appel (E28) n'aurait jamais montré autre
// chose que son état vide. Décision PURE et testable, hors de ce fichier ; la
// correspondance « 4 décisions moteur → runs.status » y est écrite en toutes
// lettres, avec la raison de chaque ligne.
import {
  buildReviewRow,
  isDuplicateReview,
  planAntiCheat,
} from './anticheat_wiring.ts';
import {
  canComplete,
  contributionSplit,
  type OpenBoundary,
} from '../_shared/engine/boundary.ts';
// `detectOpenBoundary` n'est VOLONTAIREMENT pas importé ici : son argument
// `activity` est optionnel, et c'est cette option qui a produit le défaut
// « une frontière vélo ouverte aux seuils de la course ». On passe par
// `decideOpenBoundary`, dont la discipline est REQUISE — et `boundary_open_test.ts`
// refuse que ce fichier réimporte le moteur en direct.
import { decideOpenBoundary } from './boundary_open.ts';
import {
  decideClaims,
  deriveContextByHex,
  type HexState,
  loopInteriorPartial,
} from '../_shared/engine/claims.ts';
import {
  distributePointsAdjustment,
  streakMultiplier,
} from '../_shared/engine/scoring.ts';
import { computeStreak, weekKey, type StreakState } from '../_shared/streak.ts';
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
  emptyLifetimeStats,
  evaluateBadges,
  localClock,
  shouldCreateOutpost,
  shouldOpenRoute,
  statsDelta,
  weatherFlags,
  type BadgeRunInput,
  type LifetimeStats,
} from '../_shared/engine/badges.ts';
// Le VERDICT de doublon reste `dedupeActivity` (moteur pur) : `dedup.ts`
// l'appelle, `index.ts` ne fournit que les deux lectures.
import {
  type DedupCandidate,
  type DedupReader,
  findDuplicateRun,
  traceShape,
} from './dedup.ts';
// Masquage §12.1 AVANT ecriture de `runs.polyline_masked` (voir tracePersist.ts).
import { maskedPolylineFor } from './tracePersist.ts';
import { BADGES_BY_KEY } from '../_shared/badges.ts';
import {
  boostChestMultiplier,
  boostedChestProgress,
  cappedCrewXp,
  chestProgressDelta,
  crewXpForRun,
  crewXpTableFor,
  type CrewBoostWindow,
  withinOffensiveZone,
  type CrewChestInput,
} from '../_shared/engine/crew.ts';
import {
  coCaptureShare,
  collusionPenalty,
  resolveContestedHex,
  sameCrewRunnerCount,
  type ContestedCrewPresence,
} from '../_shared/engine/social.ts';
import { challengeProgress } from '../_shared/engine/challenge.ts';
import { retroactiveLockUntil } from '../_shared/engine/group.ts';
import {
  applyBonusReward,
  type BonusApplyBase,
  type BonusEligibilityContext,
  bonusEffectLabel,
  eligible,
} from '../_shared/engine/bonus.ts';
import { bonusById } from '../_shared/bonuses.ts';
import type { BonusDefinition, BonusId } from '../_shared/types.ts';

const MS_PER_DAY = 86_400_000;
const M_PER_KM = 1_000;
const DB_IN_CHUNK = 500; // taille des batches pour les clauses `in(...)`
const DB_PAGE = 1_000; // pagination des lectures larges (plafond PostgREST)
const REWARD_PRIORITY = 3; // P3 récompense (GRYD_notifications_logic.md §2)
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
    (b.source === 'gps' || b.source === 'healthkit' || b.source === 'gpx') &&
    typeof b.startedAt === 'string' &&
    Array.isArray(b.points) &&
    // Borne AVANT le .every()/parsing (audit sécurité) : un tableau géant (millions
    // de points) est rejeté en O(1) au lieu de faire itérer tout le pipeline.
    b.points.length <= RUN_MAX_POINTS &&
    b.points.every((p) =>
      typeof p === 'object' && p !== null &&
      typeof (p as Record<string, unknown>).lat === 'number' &&
      typeof (p as Record<string, unknown>).lng === 'number' &&
      typeof (p as Record<string, unknown>).t === 'number'
    ) &&
    (b.stepCount === undefined || typeof b.stepCount === 'number') &&
    (b.gpsTrust === undefined || (typeof b.gpsTrust === 'number' && Number.isFinite(b.gpsTrust))) &&
    // cityId : ici on ne juge que la FORME. L'EXISTENCE se tranche contre
    // `city_zones` (autorité serveur, plus bas dans le handler) et non plus
    // contre `CITIES` — cet `in CITIES` était le plafond dur n°2 : il refusait en
    // 400 toute ville hors de la liste de DÉMARRAGE, donc toutes celles que la
    // demande fondateur vient d'ouvrir. Le risque que le test couvrait — déclarer
    // une ville dense au hasard pour majorer ses points — est traité ailleurs, et
    // mieux : la ville déclarée doit CONTENIR le départ GPS, sinon le serveur
    // ré-arbitre (`resolveRunCity`). Une déclaration ne décide plus rien.
    (b.cityId === undefined || isCityIdShape(b.cityId)) &&
    // Discipline (E14) : ABSENTE = course à pied (fait, pas repli) ; INCONNUE =
    // 400. On ne replie jamais un « scooter » sur « run » — ce serait décider à
    // la place du joueur puis lui rendre le résultat comme le sien.
    (b.activity === undefined || isActivityShape(b.activity)) &&
    (b.runMode === undefined || (typeof b.runMode === 'string' && RUN_MODES.has(b.runMode as RunMode)));
}

interface UserProfile {
  created_at: string;
  streak_weeks: number;
  is_club: boolean;
  /** Ville d'attache (blocage n°5). `null` tant qu'aucune course ne l'a posée. */
  city_id: string | null;
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

/**
 * LOT 1 « LA SÉRIE VISIBLE » — faits bruts de la série, DÉRIVÉS du réel.
 *
 * Avant ce lot, `users.streak_weeks` n'était JAMAIS écrit par personne : la
 * colonne restait à 0 à vie, donc le multiplicateur de série valait ×1,0 pour
 * tout le monde. On ne lit plus la colonne pour scorer — on recalcule la série
 * depuis les courses réellement enregistrées (statuts 'valid'/'partial' : un run
 * rejeté ne construit pas de série) et depuis les gels réellement activés
 * (streak_gels, migration 0024). Le moteur PUR (engine/streak) fait le reste :
 * une seule règle, une seule implémentation, zéro drift SQL.
 */
async function loadStreakFacts(
  userId: string,
  now: Date,
): Promise<{ runStartedAt: Date[]; frozenWeekKeys: string[] }> {
  const since = new Date(now.getTime() - STREAK_HISTORY_WEEKS * 7 * 86_400_000);
  const [runsRes, gelsRes] = await Promise.all([
    supabase
      .from('runs')
      .select('started_at')
      .eq('user_id', userId)
      .in('status', ['valid', 'partial'])
      .gte('started_at', since.toISOString()),
    supabase
      .from('streak_gels')
      .select('activated_at, expires_at')
      .eq('user_id', userId)
      .gte('expires_at', since.toISOString()),
  ]);
  if (runsRes.error) throw new Error(`streak runs read: ${runsRes.error.message}`);
  // Les gels sont un CONFORT : si leur lecture échoue, la série reste calculable
  // sans eux (aucune semaine protégée) — jamais un 500 sur une course valide.
  if (gelsRes.error) console.error('[ingest_run] streak_gels:', gelsRes.error.message);

  const runStartedAt = (runsRes.data ?? [])
    .map((r) => new Date(r.started_at as string))
    .filter((d) => Number.isFinite(d.getTime()));

  // Un gel couvre TOUTES les semaines entre son activation et son expiration.
  const frozen = new Set<string>();
  for (const g of gelsRes.data ?? []) {
    const from = new Date(g.activated_at as string).getTime();
    const to = new Date(g.expires_at as string).getTime();
    if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) continue;
    for (let t = from; t <= to; t += 86_400_000) frozen.add(weekKey(new Date(t)));
    frozen.add(weekKey(new Date(to)));
  }
  return { runStartedAt, frozenWeekKeys: [...frozen] };
}

/**
 * Met en cache la série courante dans `users.streak_weeks` (lue par le digest et
 * les écrans serveur). Non bloquant : une erreur d'écriture ne doit jamais faire
 * échouer l'ingestion d'une course déjà validée. Le CLIENT, lui, ne fait pas
 * confiance à ce cache — il recalcule depuis ses propres courses, sinon un
 * joueur qui s'arrête de courir verrait un chiffre périmé (= un mensonge).
 */
async function cacheStreakWeeks(userId: string, weeks: number): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ streak_weeks: weeks })
    .eq('id', userId);
  if (error) console.error('[ingest_run] cache streak_weeks:', error.message);
}

/**
 * Payload `streakAfter` de la réponse — ce que l'écran de résultat affichera.
 * `status: 'none'` (aucune course connue) n'est PAS renvoyé : l'app n'a alors
 * rien de vrai à dire et doit ne rien montrer plutôt qu'un « 0 ».
 */
function streakAfterPayload(
  after: StreakState,
  weeksBefore: number,
): IngestRunResponse['streakAfter'] {
  if (after.status === 'none') return undefined;
  return {
    status: after.status,
    weeks: after.weeks,
    multiplier: after.multiplier,
    weeksBefore,
    runsThisWeek: after.runsThisWeek,
    runsToValidate: after.runsToValidate,
    best: after.best,
    frozen: after.frozen,
  };
}

/**
 * État des hexes DANS L'UNIVERS DE LA DISCIPLINE (E14, migration 0070). Le
 * filtre `activity` n'est pas une optimisation : sans lui, le moteur verrait le
 * propriétaire de l'autre monde, déciderait un « vol » contre quelqu'un qui ne
 * joue pas au même jeu, et la garde TOCTOU de claim_hexes comparerait des
 * propriétaires incomparables.
 */
async function loadHexStates(
  hexes: readonly string[],
  activity: Activity = DEFAULT_ACTIVITY,
): Promise<ReadonlyMap<string, HexState>> {
  const states = new Map<string, HexState>();
  for (const batch of chunk(hexes.map(h3ToDb), DB_IN_CHUNK)) {
    const { data, error } = await supabase
      .from('hex_claims')
      .select(
        'h3index, owner_user_id, claimed_at, locked_until, shielded_until, decay_at, last_defended_at',
      )
      .eq('activity', activity)
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
/**
 * Zones floutees du joueur, dans la forme geometrique attendue par le moteur.
 * MEME lecture que `loadPrivacyHexes` (table `privacy_zones`, RLS owner-only) :
 * une seule source, deux usages — exclure des hexes, et masquer la trace.
 */
async function loadPrivacyZones(
  userId: string,
): Promise<readonly { center: { lat: number; lng: number }; radiusM: number }[]> {
  const { data, error } = await supabase
    .from('privacy_zones')
    .select('center_h3_res8, radius_m')
    .eq('user_id', userId);
  if (error) throw new Error(`privacy_zones read: ${error.message}`);
  return (data ?? []).map((z) => {
    const [lat, lng] = cellToLatLng(dbToH3(z.center_h3_res8));
    return { center: { lat, lng }, radiusM: z.radius_m as number };
  });
}

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

const CITY_ZONE_COLUMNS = 'city_id, name, status, geojson, min_lat, max_lat, min_lng, max_lng';

/**
 * Zones dont la BOÎTE ENGLOBANTE contient le point (pré-filtre SQL, migration
 * 0066). Le test exact reste le point-in-polygon du moteur pur, appliqué par
 * `pickCityZone` sur les seules candidates.
 *
 * POURQUOI CE PRÉ-FILTRE EXISTE : la version précédente chargeait TOUTES les
 * zones actives et faisait le point-in-polygon sur chacune. À deux villes c'est
 * gratuit ; le jour où l'ouverture de villes marche, c'est un scan complet de
 * `city_zones` — polygones compris — à chaque course. L'ouverture se serait
 * payée en latence d'ingestion pour tout le monde.
 *
 * ⚠️ CE FILTRE NE FILTRE PLUS SUR `status`. C'était un bug latent, pas un
 * détail : une ville fraîchement ouverte est `status = 'wild'` (la seule mesure
 * vraie quand personne n'y court encore). Restreindre aux zones `'active'`
 * aurait rendu tout rattachement impossible pour elles — donc `p_city_id` NULL
 * dans `claim_hexes`, donc `season_scores` jamais incrémenté, donc le classement
 * de la ville ouverte VIDE À JAMAIS. Le statut est une densité, pas un
 * interrupteur d'existence.
 */
async function loadCityZonesAt(lat: number, lng: number): Promise<readonly CityZoneRow[]> {
  const { data, error } = await supabase
    .from('city_zones')
    .select(CITY_ZONE_COLUMNS)
    .lte('min_lat', lat)
    .gte('max_lat', lat)
    .lte('min_lng', lng)
    .gte('max_lng', lng);
  if (!error && data) return data as unknown as CityZoneRow[];

  // Repli : couvre la fenêtre de déploiement où cette fonction est en ligne
  // avant la migration 0066 (colonnes de boîte absentes → erreur PostgREST
  // 42703). Sans lui, le rattachement s'arrêterait net pour Paris et Lille — un
  // silence, pas une panne visible.
  //
  // ⚠ IL EST BORNÉ AUX VILLES DE DÉMARRAGE, et ce n'est pas un compromis : AVANT
  // 0066, `provision_city` n'existe pas, donc AUCUNE ville n'a pu être ouverte —
  // les seules zones en base sont celles seedées par 0004/0033, c'est-à-dire
  // exactement `CITIES`. Le repli couvre donc 100 % de la fenêtre qu'il vise,
  // sans jamais redevenir le scan complet de `city_zones` (géométries comprises)
  // que 0066 a fermé. Aucune borne numérique arbitraire n'est écrite ici : la
  // liste vient de sa source unique, game-rules.
  //
  // Si le pré-filtre échoue APRÈS 0066 (réseau, index absent), ce repli ne voit
  // pas les villes ouvertes : c'est DIT dans le journal plutôt que silencieux —
  // la course reste valide, son rattachement peut manquer.
  console.error('[ingest_run] bbox city_zones indisponible:', error?.message ?? 'no data');
  const starterIds = Object.keys(CITIES);
  const fallback = await supabase
    .from('city_zones')
    .select('city_id, name, status, geojson')
    .in('city_id', starterIds)
    .limit(starterIds.length);
  if (fallback.error || !fallback.data) {
    console.error('[ingest_run] city_zones:', fallback.error?.message ?? 'no data');
    return []; // fail-open : la course reste valide, densité 'wild'
  }
  console.error(
    '[ingest_run] repli city_zones borné aux villes de démarrage — une ville ouverte via open_city ne sera PAS rattachée sur cet appel',
  );
  return (fallback.data as unknown as Omit<CityZoneRow, 'min_lat' | 'max_lat' | 'min_lng' | 'max_lng'>[])
    .map((z) => ({ ...z, min_lat: lat, max_lat: lat, min_lng: lng, max_lng: lng }));
}

/**
 * BLOCAGE N°5 DE L'AUDIT — `users.city_id` n'était JAMAIS écrit par aucun chemin
 * de code (le grant existe depuis 0003_rls.sql l.39-40, personne ne s'en
 * servait). Conséquence en chaîne : `season_current()` sans argument résout la
 * ville du joueur via `users.city_id` (0060) et rendait donc ZÉRO ligne pour
 * tout le monde ; le board Joueurs se rabattait sur `active[0]`
 * (features/social/leagueBoard.ts:78-80) — arbitraire à 2 villes, MENSONGE
 * AFFICHÉ dès qu'il y en a 30.
 *
 * POURQUOI ICI, ET PAS AILLEURS. C'est le point d'écriture le plus SÛR du repo :
 *  · la valeur n'est pas déclarée, elle est DÉRIVÉE d'un fait — un vrai GPS,
 *    tranché serveur par point-in-polygon. On n'enregistre pas une intention
 *    (« je dirai que j'habite Paris »), on enregistre où le joueur a couru ;
 *  · elle passe par le service-role : aucune écriture client n'est ouverte ;
 *  · elle ne peut pas mentir sur une ville qui n'existe pas : `cityId` sort de
 *    `city_zones`, la FK `users.city_id → city_zones` est donc satisfaite par
 *    construction.
 *
 * DEUX GARDES, délibérées :
 *  1. `.is('city_id', null)` — on ne RÉÉCRIT JAMAIS une ville déjà posée. Un
 *     joueur qui a choisi sa ville (création de crew, profil) reste chez lui
 *     même s'il court en déplacement. Sa ville d'attache n'est pas déduite de sa
 *     dernière sortie.
 *  2. best-effort — un échec est journalisé et n'invalide RIEN. La course est
 *     déjà écrite et créditée ; la faire échouer pour une préférence
 *     d'affichage serait exactement le blocage n°1 en miroir.
 */
async function ensureHomeCity(userId: string, cityId: string | undefined): Promise<void> {
  if (!cityId) return;
  const { error } = await supabase
    .from('users')
    .update({ city_id: cityId })
    .eq('id', userId)
    .is('city_id', null);
  if (error) console.error('[ingest_run] ensureHomeCity:', error.message);
}

/** Ligne `city_zones` d'un id donné, ou `undefined` si la ville n'existe pas. */
async function loadCityZoneById(cityId: string): Promise<CityZoneRow | undefined> {
  const { data, error } = await supabase
    .from('city_zones')
    .select(CITY_ZONE_COLUMNS)
    .eq('city_id', cityId)
    .maybeSingle();
  if (error) {
    console.error('[ingest_run] loadCityZoneById:', error.message);
    return undefined;
  }
  return (data as unknown as CityZoneRow | null) ?? undefined;
}

/** Densité d'une zone : son `status` s'il est connu du jeu, sinon 'wild'. */
function zoneDensity(zone: CityZoneRow | undefined): ZoneDensity {
  if (!zone || !ZONE_DENSITIES.has(zone.status)) return 'wild';
  return zone.status as ZoneDensity;
}

/**
 * Ville de rattachement de la course — DÉCIDÉE SERVEUR (§ « tout claim est
 * décidé serveur »), en une lecture, pour tous les usages aval (densité,
 * `runs.city_id`, `claim_hexes` → `season_scores`, nom de frontière).
 *
 * P0 C4 (MVP_CHANGESET) : le client n'émet JAMAIS `cityId` (buildPayload,
 * tracker.ts) — sans dérivation, `p_city_id` restait NULL et le classement local
 * ne se peuplait jamais. La dérivation reste donc le chemin normal.
 *
 * QUAND LE CLIENT DÉCLARE QUAND MÊME UNE VILLE : elle doit CONTENIR le départ.
 * L'ancienne garde (`cityId in CITIES`) prétendait empêcher le « choix
 * opportuniste de densité » ; elle ne l'empêchait pas (Paris et Lille sont
 * toutes deux `active`), elle ne faisait que plafonner le monde à deux villes.
 * Ici la déclaration est CONFRONTÉE au GPS : si elle ne tient pas, le serveur
 * garde la ville dérivée. Une déclaration ne peut donc rien majorer.
 *
 * Aucun rattachement est une réponse valide : la capture n'est bornée par
 * aucune ville (AMENDEMENT-02 §2). Hors zone, la course reste pleinement
 * valide, densité 'wild'.
 */
async function resolveRunCity(
  declared: string | undefined,
  points: readonly RunPoint[],
): Promise<CityZoneRow | undefined> {
  const first = points[0];
  if (!first) return declared ? await loadCityZoneById(declared) : undefined;
  const zones = await loadCityZonesAt(first.lat, first.lng);
  const derived = pickCityZone(first.lat, first.lng, zones);
  if (declared === undefined) return derived;
  // La déclaration n'est honorée que si elle passe le MÊME test exact que la
  // dérivation (boîte + point-in-polygon), pas seulement la boîte englobante.
  const honored = pickCityZone(first.lat, first.lng, zones.filter((z) => z.city_id === declared));
  return honored ?? derived;
}

/**
 * OUVERTURE PAR PRÉSENCE — le coureur est le PIONNIER de sa commune.
 *
 * Résout le point de DÉPART → commune réelle (geo.api.gouv.fr), puis l'ouvre via
 * `provision_city` avec son CONTOUR administratif réel. `p_open_limit = null`
 * BYPASSE le plafond d'ouverture (0066 ne l'arme que si non-null) : la présence
 * remplace le plafond — on ne peut ouvrir que là où on court vraiment.
 *
 * BEST-EFFORT STRICT (l'app ne ment jamais) : reverse-geocode qui échoue, RPC en
 * erreur, ou `ok:false` → renvoie `undefined`, l'appelant laisse la course « hors
 * zone » (comportement honnête existant). JAMAIS de disque ni de nom fabriqué.
 */
async function autoOpenCommuneAt(
  point: RunPoint,
  userId: string,
): Promise<{ insee: string; nom: string; created: boolean } | undefined> {
  const resolved = await reverseGeocodeCommune(point.lat, point.lng);
  if (!resolved) return undefined;
  const { data, error } = await supabase.rpc('provision_city', {
    p_city_id: communeCityId(resolved.insee),
    p_name: resolved.nom,
    p_geojson: resolved.geojson,
    p_season_weeks: SEASON_DURATION_WEEKS,
    p_opened_by: userId,
    // Présence, pas plafond : null désarme le garde-fou de quota de 0066.
    p_open_limit: null,
    p_window_hours: null,
  });
  if (error) {
    console.error('[ingest_run] autoOpenCommuneAt provision_city:', error.message);
    return undefined;
  }
  // `provision_city` rend { ok, zoneCreated, ... }. Un refus (géométrie/nom
  // invalides…) n'est PAS une ouverture. `zoneCreated` distingue le VRAI pionnier
  // (il a écrit la zone) d'un second coureur quasi simultané dont l'insert est
  // tombé sur `on conflict do nothing` : ce dernier se rattache bien à la commune,
  // mais ne s'entend pas dire « tu l'as ouverte » (il ne l'a pas fait).
  const body = (data ?? {}) as { ok?: unknown; zoneCreated?: unknown };
  if (body.ok !== true) return undefined;
  return { insee: resolved.insee, nom: resolved.nom, created: body.zoneCreated === true };
}

/** Hexes déjà pris/défendus aujourd'hui (UTC) — approximation MVP du plafond §6.4
 * (les hexes volés au coureur depuis ce matin sortent du compte).
 *
 * ⚠ PAS DE FILTRE `activity`, VOLONTAIREMENT (E14). `MAX_CLAIMS_PER_DAY` reste
 * un plafond PAR COMPTE : un cycliste consomme le quota du coureur. Le passer
 * par (compte × discipline) doublerait le plafond quotidien d'un hybride — un
 * arbitrage FONDATEUR, pas une décision d'implémentation. Le statu quo est la
 * seule position honnête tant que la question n'est pas posée ; il est inscrit
 * en suspens dans game-rules.ts et dans la migration 0070. */
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
async function loadCrew(
  userId: string,
): Promise<{ crewId: string | null; size: number; memberIds: ReadonlySet<string> }> {
  const { data, error } = await supabase
    .from('crew_members')
    .select('crew_id')
    .eq('user_id', userId)
    .is('left_at', null)
    .maybeSingle();
  if (error) throw new Error(`crew_members read: ${error.message}`);
  if (!data) return { crewId: null, size: 0, memberIds: new Set() };
  // Membres ACTIFS du crew : user_ids réels — servent (a) la taille (badges/
  // outposts) ET (b) le comptage SAME-CREW du bonus de groupe (jamais un rival).
  const { data: members, error: membersError } = await supabase
    .from('crew_members')
    .select('user_id')
    .eq('crew_id', data.crew_id)
    .is('left_at', null);
  if (membersError) throw new Error(`crew_members list: ${membersError.message}`);
  const memberIds = new Set<string>((members ?? []).map((m) => m.user_id as string));
  return { crewId: data.crew_id as string, size: memberIds.size || 1, memberIds };
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
async function loadUserHexCenters(
  userId: string,
  activity: Activity = DEFAULT_ACTIVITY,
): Promise<{ lat: number; lng: number }[]> {
  const centers: { lat: number; lng: number }[] = [];
  for (let from = 0; ; from += DB_PAGE) {
    const { data, error } = await supabase
      .from('hex_claims')
      .select('h3index')
      .eq('owner_user_id', userId)
      // E14 : un avant-poste se fonde sur une densité de territoire RÉELLE dans
      // SON monde. Compter les deux gonflerait la densité d'un hybride.
      .eq('activity', activity)
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
  activity: Activity = DEFAULT_ACTIVITY,
): Promise<{ newOutposts: number; newCrewOutposts: number }> {
  const none = { newOutposts: 0, newCrewOutposts: 0 };
  if (density !== 'pioneer' && density !== 'wild' && density !== 'emerging') return none;

  const radiusM = OUTPOST_RADIUS_KM * M_PER_KM;
  const owned = await loadUserHexCenters(userId, activity);
  const ownedNearby = owned.filter((c) => haversineM(c, centroid) <= radiusM).length;

  const { data: existing, error } = await supabase
    .from('outposts')
    .select('center_h3')
    .eq('user_id', userId)
    .eq('activity', activity);
  if (error) throw new Error(`outposts read: ${error.message}`);
  const existingNearby = (existing ?? []).filter((o) => {
    const [lat, lng] = cellToLatLng(dbToH3(o.center_h3));
    return haversineM({ lat, lng }, centroid) <= radiusM;
  }).length;

  if (!shouldCreateOutpost(ownedNearby, existingNearby)) return none;

  const { error: insertError } = await supabase.from('outposts').insert({
    user_id: userId,
    crew_id: crewId,
    activity,
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
  // E14 : une route relie deux bouts de SON territoire. Un trajet vélo ne
  // « connecte » pas deux zones de course, et l'anti-doublon ne doit pas
  // confondre une route vélo avec une route à pied sur le même itinéraire.
  activity: Activity = DEFAULT_ACTIVITY,
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
      .eq('user_id', userId)
      .eq('activity', activity);
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
    activity,
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

/**
 * Ligne d'upsert `user_stats`. On ne passe ici QUE le delta de la course
 * (statsDelta, pur) : les colonnes absentes ne figurent pas dans l'UPDATE, donc
 * la course n'écrase JAMAIS une métrique écrite par un job — au premier chef
 * `offensives_joined`, que `finalize_offensive` (migration 0064) incrémente à
 * la clôture d'une offensive et qui porte la famille de badges Raid Leader et
 * la skill Strategist. À l'INSERT, les colonnes omises prennent leur DEFAULT
 * SQL (0 / NULL), identique à `emptyLifetimeStats()`.
 */
function statsToRow(userId: string, stats: Partial<LifetimeStats>): Record<string, unknown> {
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
    .upsert(statsToRow(userId, statsDelta(before, after)), { onConflict: 'user_id' });
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
  const before = rowToStats(statsRow);
  const after = applyRejectedRun(before, dateISO);
  const { error: upsertError } = await supabase
    .from('user_stats')
    .upsert(statsToRow(userId, statsDelta(before, after)), { onConflict: 'user_id' });
  if (upsertError) throw new Error(`user_stats upsert (rejected): ${upsertError.message}`);
}

// ─── Déduplication d'activité (AMENDEMENT-06 §4, Activity Hub) ────────────────

/**
 * sha-256 (hex) de la FORME CANONIQUE d'une trace — clé de dédup polyline.
 *
 * La canonisation elle-même vit dans `dedup.ts` (`traceShape`) : le hash et le
 * COMPTE de positions distinctes doivent dériver de la MÊME chaîne, sinon une
 * trace pourrait être jugée « avec forme » alors que son empreinte n'en a pas.
 * Ici, il ne reste que le digest.
 */
async function polylineHash(canonical: string): Promise<string> {
  const bytes = new TextEncoder().encode(canonical);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Colonnes de `runs` nécessaires à la dédup — une seule liste, deux lectures. */
const DEDUP_COLUMNS = 'id, started_at, duration_s, distance_m, polyline_hash';

/** Ligne `runs` → candidat de dédup. Aucun repli inventé : hash absent = null. */
const toDedupCandidate = (row: Record<string, unknown>): DedupCandidate => ({
  runId: row.id as string,
  startedAt: row.started_at as string,
  durationS: row.duration_s as number,
  distanceM: row.distance_m as number,
  polylineHash: (row.polyline_hash as string | null) ?? null,
});

/**
 * Les deux lectures de la dédup, adossées à Supabase (le VERDICT est pur, il
 * vit dans `dedup.ts` + `dedupeActivity`).
 *
 * ⚠️ AUCUNE des deux ne filtre sur `activity`, et c'est le cœur du correctif :
 * une même trace ne peut pas être à la fois une course et une sortie vélo.
 * L'étiquette de discipline est DÉCLARÉE par le client ; la géométrie, non.
 * Filtrer par discipline reviendrait à laisser un GPX déjà ingéré redevenir une
 * sortie neuve dans le monde vierge d'en face — donc une capture PIONNIÈRE
 * complète, un second classement de saison, et de l'XP recréditée, sans le
 * moindre effort supplémentaire.
 *
 * `byFingerprint` ne borne pas non plus le TEMPS : `started_at` est déclaré lui
 * aussi, et borner une recherche par une valeur que l'attaquant choisit revient
 * à lui donner la clé. Le coût est nul — `runs_user_hash_idx (user_id,
 * polyline_hash) where polyline_hash is not null` (0009) sert cette égalité.
 */
function dedupReader(userId: string): DedupReader {
  return {
    byFingerprint: async (polylineHash: string): Promise<DedupCandidate[]> => {
      const { data, error } = await supabase
        .from('runs')
        .select(DEDUP_COLUMNS)
        .eq('user_id', userId)
        .eq('polyline_hash', polylineHash)
        // La PLUS ANCIENNE d'abord : le doublon pointe sur l'originale, pas sur
        // le rejeu précédent (sinon une chaîne de rejeux se référencerait
        // elle-même et l'historique perdrait son origine).
        .order('started_at', { ascending: true });
      if (error) throw new Error(`runs dedup fingerprint read: ${error.message}`);
      return (data ?? []).map(toDedupCandidate);
    },
    aroundStart: async (startedAt: string): Promise<DedupCandidate[]> => {
      const t = Date.parse(startedAt);
      const windowMs = 2 * MS_PER_DAY; // large : le filtre fin est dedupeActivity
      const { data, error } = await supabase
        .from('runs')
        .select(DEDUP_COLUMNS)
        .eq('user_id', userId)
        .gte('started_at', new Date(t - windowMs).toISOString())
        .lte('started_at', new Date(t + windowMs).toISOString());
      if (error) throw new Error(`runs dedup read: ${error.message}`);
      return (data ?? []).map(toDedupCandidate);
    },
  };
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
 *   2. crédit atomique via RPC add_crew_xp (barème NORMALISÉ par la taille : crewXpTableFor) ;
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
    // Une course ne CLÔT jamais une offensive : la clôture est un job
    // (claim_offensive_close → finalize_offensive, migration 0064), déclenché
    // par l'échéance `ends_at`, et c'est LUI qui crédite les 200 XP crew UNE
    // fois, collectivement. Mettre ici un compteur d'offensives terminées
    // rejouerait ce crédit à CHAQUE course du membre, indéfiniment — et
    // l'imputerait à un membre via crew_xp_daily alors que l'XP de clôture est
    // collective. 0 est donc la seule valeur honnête. Verrouillé par
    // offensive_metric_test.ts.
    offensivesCompleted: 0,
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

    // Le barème de niveau est NORMALISÉ par la taille du crew (migration 0107) :
    // sans ça, un crew de 50 franchirait `CREW_XP_TABLE` dix fois plus vite
    // qu'un crew de 5 à engagement par tête égal, et le niveau mesurerait la
    // taille. On compte les membres ACTIFS (`left_at is null` — la table garde
    // l'historique des adhésions pour le cooldown de changement de crew).
    const { count: memberCount, error: memberErr } = await supabase
      .from('crew_members')
      .select('user_id', { count: 'exact', head: true })
      .eq('crew_id', crewId)
      .is('left_at', null);
    if (memberErr) throw new Error(`crew_members count: ${memberErr.message}`);

    // Crédit atomique + recalcul du niveau (RPC security definer). La table
    // passée est DÉJÀ normalisée — jamais `CREW_XP_TABLE` brute.
    const { data: lvl, error: rpcErr } = await supabase.rpc('add_crew_xp', {
      p_crew_id: crewId,
      p_xp: xp,
      p_xp_table: crewXpTableFor(memberCount ?? 0),
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
  }

  // ── Offensives actives (§38) : hexes claimés dans la zone cible ──────────
  if (claimedCentroids.length > 0) {
    const nowIso = now.toISOString();
    // `center_h3` est un BIGINT : lu sans cast, PostgREST le sérialise en NOMBRE
    // JSON. Un index H3 res 7 dépasse 2^53, donc JSON.parse en perd les chiffres
    // de poids faible — et `dbToH3` rendait alors une AUTRE cellule, c'est-à-dire
    // un théâtre décalé. Sur l'UNIQUE chemin par lequel une offensive reçoit de la
    // donnée réelle, ça revenait à compter les hexes autour du mauvais centre.
    // Le `::text` est la même parade que celle déjà posée côté client.
    const { data: offs, error: offErr } = await supabase
      .from('offensives')
      .select('id, center_h3::text, radius_km')
      .eq('crew_id', crewId)
      // C'EST LA FENÊTRE QUI DÉCIDE, PAS LA CADENCE DU CRON. On filtrait sur
      // `status = 'active'` — or ce statut est POSÉ par le job d'activation, qui
      // passe toutes les 10 min. Une offensive dont la fenêtre venait de s'ouvrir
      // restait donc 'preparation' jusqu'au tick suivant, et une course ingérée
      // dans cet intervalle ne comptait pour RIEN : de l'effort réel perdu parce
      // qu'un job n'était pas encore passé. Le statut est une MATÉRIALISATION du
      // temps, pas sa source. On exclut seulement ce qui est déjà clôturé.
      .neq('status', 'done')
      .lte('starts_at', nowIso)
      .gte('ends_at', nowIso)
      .order('id', { ascending: true });
    if (offErr) throw new Error(`offensives read: ${offErr.message}`);

    // UN HEX NE COMPTE QUE POUR UNE OFFENSIVE. La boucle créditait `inZone` à
    // CHACUNE des offensives actives : rien n'interdisant deux théâtres qui se
    // recouvrent, un crew pouvait en ouvrir trois superposées et faire compter la
    // MÊME course trois fois — un objectif atteint sans course supplémentaire,
    // c'est-à-dire une victoire fabriquée. Chaque hex est donc attribué à une
    // seule offensive, dans un ordre déterministe (par id, cf. `.order` ci-dessus)
    // pour que deux exécutions donnent le même résultat.
    const consumed = new Set<number>();
    for (const off of offs ?? []) {
      const [clat, clng] = cellToLatLng(dbToH3(off.center_h3));
      const matched: number[] = [];
      claimedCentroids.forEach((c, i) => {
        if (consumed.has(i)) return;
        if (withinOffensiveZone(c, { lat: clat, lng: clng }, Number(off.radius_km))) matched.push(i);
      });
      const inZone = matched.length;
      if (inZone === 0) continue;
      for (const i of matched) consumed.add(i);
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
  /**
   * LOT 1 — série APRÈS cette course. Un social_run / une course privée est une
   * course VALIDE : elle compte pour la régularité (elle ne capture simplement
   * pas de territoire). On ne prive pas le joueur de sa série parce qu'il a
   * couru sans conquérir.
   */
  streakAfter: IngestRunResponse['streakAfter'];
  /** Série mise en cache côté serveur si elle a changé. */
  streakWeeksAfter: number;
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
    ...(args.streakAfter !== undefined ? { streakAfter: args.streakAfter } : {}),
    results: [], // aucun claim : les hexes traversés restent stats_only
    newBadges,
    ...(challengeUpdates.length > 0 ? { challengeUpdates } : {}),
  };
  await persistCelebration(runId, response, 0);
  if (args.streakWeeksAfter !== args.streak.weeks) {
    await cacheStreakWeeks(userId, args.streakWeeksAfter);
  }
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
/**
 * AMENDEMENT-41 (LE RELAIS) — contexte de co-capture pour decideClaims.
 * Pour chaque hex du couloir possédé par un AUTRE et FRAÎCHEMENT capturé
 * (< FRESH_CAPTURE_PROTECT_HOURS, la fenêtre exacte du moteur), on calcule :
 *  - le RANG de ce coureur : 2 + nb de coureurs DISTINCTS déjà crédités d'un
 *    relais sur cet hex DEPUIS la capture observée (le propriétaire = rang 1) ;
 *  - le COOLDOWN : ce coureur a déjà été crédité sur cet hex < 24 h ;
 *  - le BUDGET quotidien restant (CO_CAPTURE_DAILY_POINTS_CAP − points du jour).
 * Fail-safe : toute erreur de lecture → maps vides (comportement historique
 * blocked_fresh_protection, jamais un paiement non fiable).
 */
async function loadCoCaptureContext(
  userId: string,
  hexes: readonly string[],
  states: ReadonlyMap<string, HexState>,
  now: Date,
  // E14 : un relais appartient à UNE fenêtre de capture, et une capture à UN
  // monde. Sans ce filtre, les relayeurs d'un coureur feraient monter le rang
  // (donc baisser la part 1/rang) des relayeurs d'un cycliste sur le même
  // hexagone — un paiement faussé par une simple coïncidence géographique.
  activity: Activity = DEFAULT_ACTIVITY,
): Promise<{
  rankByHex: ReadonlyMap<string, number>;
  cooldownHexes: ReadonlySet<string>;
  budget: number;
}> {
  const empty = { rankByHex: new Map<string, number>(), cooldownHexes: new Set<string>(), budget: 0 };
  const nowMs = now.getTime();
  // Hexes candidats au relais : possédés par un autre, capture fraîche, non decayés.
  const fresh = hexes.filter((h) => {
    const st = states.get(h);
    if (!st || !st.ownerUserId || st.ownerUserId === userId) return false;
    if (st.decayAt !== null && st.decayAt.getTime() <= nowMs) return false;
    const cap = st.lastCapturedAt ?? null;
    return cap !== null && nowMs - cap.getTime() < FRESH_CAPTURE_PROTECT_HOURS * 3_600_000;
  });
  if (fresh.length === 0) return empty;

  try {
    const dbIds = fresh.map((h) => h3ToDb(h));
    const dbToH3 = new Map(fresh.map((h) => [h3ToDb(h), h]));
    const [{ data: rows, error: rowsErr }, { data: todayRows, error: todayErr }] =
      await Promise.all([
        supabase
          .from('hex_co_captures')
          .select('h3index, user_id, credited_at')
          .eq('activity', activity)
          .in('h3index', dbIds),
        // Budget quotidien de relais : PAR COMPTE, toutes disciplines
        // confondues — statu quo assumé (même arbitrage fondateur en suspens
        // que MAX_CLAIMS_PER_DAY). Pas de filtre `activity` ici, volontairement.
        supabase
          .from('hex_co_captures')
          .select('points')
          .eq('user_id', userId)
          .gte('credited_at', new Date(nowMs - 24 * 3_600_000).toISOString()),
      ]);
    if (rowsErr) throw new Error(rowsErr.message);
    if (todayErr) throw new Error(todayErr.message);

    const rankByHex = new Map<string, number>();
    const cooldownHexes = new Set<string>();
    const othersByHex = new Map<string, Set<string>>();
    for (const row of rows ?? []) {
      const h3 = dbToH3.get(String(row.h3index as number | string));
      if (h3 === undefined) continue;
      const st = states.get(h3);
      const windowStart = st?.lastCapturedAt?.getTime() ?? 0;
      const creditedMs = new Date(row.credited_at as string).getTime();
      const rowUser = row.user_id as string;
      // Cooldown : MON crédit < DEFEND_COOLDOWN_HOURS (au-delà même de la fenêtre).
      if (rowUser === userId && nowMs - creditedMs < DEFEND_COOLDOWN_HOURS * 3_600_000) {
        cooldownHexes.add(h3);
      }
      // Rang : coureurs DISTINCTS (autres que moi) crédités depuis CETTE capture.
      if (rowUser !== userId && creditedMs >= windowStart) {
        let set = othersByHex.get(h3);
        if (set === undefined) {
          set = new Set<string>();
          othersByHex.set(h3, set);
        }
        set.add(rowUser);
      }
    }
    for (const h3 of fresh) rankByHex.set(h3, 2 + (othersByHex.get(h3)?.size ?? 0));

    const spentToday = (todayRows ?? []).reduce(
      (sum, r) => sum + ((r.points as number) ?? 0),
      0,
    );
    return {
      rankByHex,
      cooldownHexes,
      budget: Math.max(0, CO_CAPTURE_DAILY_POINTS_CAP - spentToday),
    };
  } catch (e) {
    console.error('[A-41] loadCoCaptureContext fail-safe (relais désactivé ce run):', e);
    return empty;
  }
}

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
  // E14 : l'anti-collusion compte les ALTERNANCES de crews sur un hexagone.
  // Deux disciplines sur le même hexagone ne sont pas des alternances : sans
  // discipline, la pénalité tomberait sur une coïncidence géographique.
  activity: Activity = DEFAULT_ACTIVITY,
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
      .eq('activity', activity)
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
      activity,
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
  /**
   * E14 : une frontière crew appartient à UN monde. Une frontière ouverte en
   * courant ne se referme pas à vélo — ce serait mélanger deux lectures
   * compétitives, et l'intérieur capturé atterrirait dans le mauvais univers.
   */
  activity: Activity;
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
    .eq('activity', ctx.activity)
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
    // `states` est chargé DANS le résolveur mais réutilisé en aval (garde TOCTOU 0031 :
    // expected_owner du payload claim_hexes) → on le capture ici, comme le fait déjà le
    // chemin course principal. Sans ça, `states` restait local à la closure (ReferenceError).
    let states!: ReadonlyMap<string, HexState>;
    const resolveOwnership = async (
      capped: readonly string[],
    ): Promise<CrewOwnershipResolution> => {
      states = await loadHexStates(capped, ctx.activity);
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
      // E14 : le plafond d'aire de la boucle crew suit la discipline (×25 à
      // vélo — loi du carré), comme sur le chemin course principal.
      activity: ctx.activity,
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
        // Garde TOCTOU (0031) : owner observé → skip si l'hex a changé depuis la décision.
        expected_owner: states.get(r.h3)?.ownerUserId ?? null,
        locked_until: decision.lockedUntil.toISOString(),
        decay_at: decision.decayExempt ? null : decision.decayAt.toISOString(),
      }));
      const { error: rpcError } = await supabase.rpc('claim_hexes', {
        p_run_id: runId,
        p_user_id: ctx.userId,
        p_city_id: ctx.cityId ?? null,
        p_claims: rpcClaims,
        // E14 : l'intérieur d'une frontière fermée atterrit dans le monde de la
        // frontière, jamais dans l'autre.
        p_activity: ctx.activity,
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
    .eq('activity', ctx.activity)
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
    activity: ctx.activity,
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
  /**
   * Monde de la fenêtre (0071). Typé `unknown` À DESSEIN : c'est une valeur
   * BRUTE de PostgREST, et `bonusWindowOpposable` est seul juge de sa forme.
   * La typer `Activity | null` ici ferait CROIRE au lecteur qu'elle a été
   * validée quelque part — elle ne l'a été nulle part.
   */
  activity: unknown;
}

/** Contexte serveur de récompense d'un bonus (signaux du run + base capée). */
interface BonusApplyContext {
  userId: string;
  crewId: string | null;
  now: Date;
  /**
   * Discipline de CE run. Oppose le monde de la sortie à celui de la fenêtre :
   * une « Défense critique » ouverte sur une zone vélo ne se réclame pas à
   * pied (0071 posait la colonne, personne ne la lisait).
   */
  activity: Activity;
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
    // `activity` (0071) : SANS elle, la discipline d'une fenêtre n'atteint
    // jamais le filtre ci-dessous et une récompense vélo reste réclamable à
    // pied. Le filtre est fait en TS (fonction pure testée) et non en SQL :
    // `.or('activity.is.null,activity.eq.…')` cacherait la règle dans une
    // chaîne qu'aucun test ne peut exécuter ici.
    .select('id, scope, bonus_id, activity')
    .in('subject_id', subjectIds)
    .eq('status', 'active')
    .gt('expires_at', nowIso);
  if (error) throw new Error(`active_bonuses read: ${error.message}`);
  if (!rows || rows.length === 0) return null;

  // 2. Candidats « répondus » par ce run + cohérence de scope (un bonus crew
  //    exige un crew ; un bonus player vise bien ce joueur) + MÊME MONDE que
  //    la sortie (une fenêtre sans monde — le Coffre crew — reste ouverte aux
  //    deux disciplines, cf. bonusWindowOpposable).
  const candidates = (rows as ActiveBonusRow[]).filter((r) => {
    if (!ctx.answered.has(r.bonus_id)) return false;
    if (r.scope === 'crew' && ctx.crewId === null) return false;
    if (!bonusWindowOpposable(r.activity, ctx.activity)) return false;
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

  // 5b. XP perso du bonus (applied.xpDelta) : crédité sur users.xp. C'est un
  // gain GAGNÉ par la course (pas un achat) → hors anti-P2W, et distinct de
  // l'XP territoire (score.xp) crédité par claim_hexes. Même motif read→write
  // que le coffre ci-dessus. N'affecte JAMAIS territoire/points/classement.
  const xpDelta = Math.round(applied.xpDelta);
  if (xpDelta > 0) {
    const { data: uRow, error: uReadErr } = await supabase
      .from('users')
      .select('xp')
      .eq('id', ctx.userId)
      .maybeSingle();
    if (uReadErr) throw new Error(`bonus xp read: ${uReadErr.message}`);
    const newXp = ((uRow?.xp as number | undefined) ?? 0) + xpDelta;
    const { error: uErr } = await supabase
      .from('users')
      .update({ xp: newXp })
      .eq('id', ctx.userId);
    if (uErr) throw new Error(`bonus xp update: ${uErr.message}`);
  }

  // NB(V1) : le progrès de badge (applied.badgeProgress) et la durée de
  // protection (applied.protectionH) NE SONT PAS ENCORE persistés — leurs
  // pipelines dédiés (badges / activation de bouclier) restent à câbler (le
  // bouclier n'a d'ailleurs aucun chemin d'activation aujourd'hui, cf. audit).
  // Ils sont seulement RENVOYÉS au client via bonusApplied.effect (libellé). À
  // implémenter avant de promettre ces effets en prod. Aucun effet, aujourd'hui
  // comme demain, sur territoire/points/classement.

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
  // ── DISCIPLINE (E14) : décidée UNE fois, ici, pour tout l'aval ─────────────
  // Elle commande (a) les BORNES §3.2 appliquées à la trace (ACTIVITY_RULES —
  // un cycliste à 28 km/h est honnête, un coureur à 28 km/h ne l'est pas), et
  // (b) l'UNIVERS de territoire lu et écrit (colonne `activity`, migration
  // 0070). Absente ⇒ 'run' : un client qui ignore le vélo se comporte
  // EXACTEMENT comme avant, sans un seul `if` chez lui.
  const activity = effectiveActivity(request.activity);

  try {
    // Profil (streak, club, ancienneté, requis même au replay) + idempotence
    // (course déjà ingérée ?) : deux lectures INDÉPENDANTES (l'une par id, l'autre
    // par user_id+client_run_id, aucune ne dépend de l'autre) → une seule salve
    // Promise.all pour ne pas tenir la connexion sur deux aller-retours séquentiels
    // (réduction du temps de connexion tenu, cf. cible 200 concurrents). Précédence
    // d'erreur inchangée : on juge le profil AVANT l'idempotence.
    const [rateRes, profileRes, existingRes] = await Promise.all([
      // Throttle anti-DoS (audit sécurité) : plafonne les ingests lourds par utilisateur,
      // dans la MÊME salve que profil+idempotence (zéro aller-retour en plus). Fenêtre 1 h.
      supabase.rpc('hit_rate_limit', {
        p_key: `ingest:${userId}`,
        p_max: INGEST_MAX_RUNS_PER_HOUR,
        p_window_s: 3600,
      }),
      supabase
        .from('users')
        // `city_id` est lu ICI (et non par une requête dédiée) pour que
        // `ensureHomeCity` ne coûte un aller-retour QUE la première fois — une
        // fois la ville d'attache posée, la lecture suffit à s'en abstenir.
        .select('created_at, streak_weeks, is_club, city_id')
        .eq('id', userId)
        .single<UserProfile>(),
      supabase
        .from('runs')
        .select('id, status, reject_reason, distance_m, duration_s, avg_pace_s_km, points_awarded, xp_awarded, celebration')
        .eq('user_id', userId)
        .eq('client_run_id', request.clientRunId)
        .maybeSingle(),
    ]);
    // Fail-OPEN si l'infra du limiteur échoue (dispo > throttle strict — c'est de la défense
    // en profondeur, pas la barrière d'auth) ; fail-CLOSED 429 quand le quota est dépassé.
    if (rateRes.error) console.error('[ingest_run] hit_rate_limit:', rateRes.error.message);
    else if (rateRes.data === false) return json({ error: 'rate_limited' }, 429);

    const { data: profile, error: profileError } = profileRes;
    if (profileError || !profile) return json({ error: 'unknown_user' }, 403);

    // ── Idempotence : zéro recalcul sur retry ────────────────────────────────
    const { data: existing, error: existingError } = existingRes;
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

    // ── Ville de rattachement : UNE résolution serveur, ici, pour tout l'aval ──
    // (densité, insert runs.city_id, claim_hexes→season_scores, contested, nom de
    // frontière) — tous lisent `request.cityId` / `cityZone` et en héritent.
    //
    // Un `cityId` DÉCLARÉ mais inconnu de `city_zones` est refusé NOMMÉMENT :
    // c'est une ville qui n'a pas été ouverte (voie serveur `open_city` +
    // migration 0066). Le silence serait pire que le refus — le coureur croirait
    // courir pour une ville qui ne compte rien.
    if (request.cityId !== undefined) {
      const declaredZone = await loadCityZoneById(request.cityId);
      if (!declaredZone) return json({ error: 'unknown_city' }, 400);
    }
    // `let` : l'auto-ouverture par présence (plus bas) peut la RÉ-RÉSOUDRE vers
    // la commune fraîchement ouverte, pour que tout l'aval en hérite.
    let cityZone = await resolveRunCity(request.cityId, request.points);
    request.cityId = cityZone?.city_id;
    let communeOpened: IngestRunResponse['communeOpened'];

    // ── Stats §3.2 (pur) — calculées AVANT la dédup pour que la branche
    //    métrique de dedupeActivity (durée±10 % & distance±10 %) puisse jouer :
    //    deux imports de la même activité produisent des polylignes arrondies
    //    différentes, seul l'appariement durée/distance/départ les rattrape.
    // Les bornes sont celles de la DISCIPLINE DÉCLARÉE : sans ça, une sortie
    // vélo est rejetée deux fois (chaque point au-dessus de 25 km/h, puis
    // l'allure moyenne sous 2:50/km) — le jeu traiterait un cycliste honnête de
    // tricheur, exactement l'inverse de « l'app ne ment jamais ».
    const filtered = filterPoints(request.points, activity);
    const stats = computeStats(filtered.segments);
    // ⚠️ `gameVerdict`, PAS `validation` : c'est le verdict des RÈGLES DE JEU
    // (§3.2 + GRYD Verify) SEUL. L'anti-triche §11 se prononce plus bas (après
    // la dédup) et peut le DÉCLASSER ; c'est le résultat de cette seconde étape
    // qui s'appelle `validation` et que tout l'aval consomme. Deux noms
    // distincts pour deux états distincts — un seul nom laisserait une branche
    // lire le verdict d'avant l'anti-triche sans que rien ne le signale.
    const gameVerdict = validateOrStatus(
      filtered,
      stats,
      request.stepCount,
      request.gpsTrust,
      activity,
    );

    const distanceM = Math.round(stats.distanceM);
    const durationS = Math.round(stats.durationS);
    const avgPaceSKm = Math.round(stats.avgPaceSKm);

    // ── polyline_hash + déduplication Activity Hub (§4) ──────────────────────
    // Le hash sert de clé de dédup forte ET est persisté sur la course. La dédup
    // « OU triple » du §4 est désormais pleinement câblée : hash identique OU
    // (départ±3 min & durée±10 % & distance±10 %) via les vraies valeurs ci-dessus.
    // Un doublon d'une course déjà ingérée → réponse DOUCE 'duplicate'
    // (idempotente, pas d'erreur), et on trace l'import dans imported_activities.
    // Sécurité anti-rejeu (audit) : le hash de dédup est TOUJOURS calculé serveur,
    // JAMAIS celui fourni par le client — sinon un hash aléatoire à chaque envoi rend
    // la branche « hash identique » de findDuplicateRun morte, et la même course se
    // rejoue à volonté (farming XP/streak/challenges). request.polylineHash est ignoré.
    //
    // ⚠️ AVANT l'auto-ouverture : un doublon ne doit produire AUCUN effet de bord.
    // Sans ce placement, une course GPS Live qui rejoue un import GPX antérieur
    // ouvrirait une commune (écriture city_zones + saison) puis serait jetée en
    // 'duplicate' — un provisionnement fantôme sans crédit pionnier.
    //
    // ⚠️ LA DÉDUP EST TRANS-DISCIPLINE, et depuis le correctif elle l'est aussi
    // HORS de la fenêtre de ±2 jours : l'empreinte de trace est cherchée sur
    // TOUT l'historique du joueur. Sans cela, redater le même GPX et le
    // réétiqueter `bike` en refaisait une sortie neuve — dans un monde vierge,
    // donc en capture PIONNIÈRE, avec un second classement et de l'XP en prime.
    // Voir `dedup.ts` pour le raisonnement complet.
    //
    // ⚠ UNE EMPREINTE N'EST UNE PREUVE QUE SI LA TRACE A UNE FORME. `runs` porte
    // `polyline_hash` même sur les courses rejetées, et le payload accepte une
    // trace d'un seul point : le hash d'un point unique ne dépend alors QUE de
    // ses coordonnées arrondies, donc deux arrêts au même endroit à six mois
    // d'écart le partagent. On passe le nombre de positions DISTINCTES à la
    // dédup, qui n'interroge l'empreinte — et ne la retient dans son verdict —
    // que si la trace en porte assez (cf. `dedup.ts`, seuil justifié).
    const shape = traceShape(request.points);
    const runHash = await polylineHash(shape.canonical);
    const dupOf = await findDuplicateRun(dedupReader(userId), {
      startedAt: request.startedAt,
      durationS,
      distanceM,
      polylineHash: runHash,
      distinctPoints: shape.distinctPoints,
    });
    if (dupOf) {
      await supabase.from('imported_activities').insert({
        user_id: userId,
        // Provenance HONNÊTE dans l'Activity Hub : un import GPX n'est pas une
        // capture GRYD Live et n'est pas non plus un import santé OS.
        source: request.source === 'healthkit'
          ? 'healthkit'
          : request.source === 'gpx'
            ? 'gpx'
            : 'gryd_live',
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

    // ── §11 ANTI-TRICHE : le moteur se prononce, ICI et pas ailleurs ─────────
    // PLACÉ APRÈS LA DÉDUP, et c'est un choix : un doublon est déjà sorti par
    // `return` juste au-dessus, donc il ne coûte pas un scoring — et surtout, un
    // renvoi d'une course déjà ingérée ne doit produire AUCUN effet de bord,
    // ligne de revue comprise.
    // PLACÉ AVANT l'auto-ouverture de commune, `ensureHomeCity` et la branche
    // « non claimable » : toutes lisent `validation.kind`, et toutes doivent
    // hériter du verdict FINAL. Sans ce placement, une trace invraisemblable
    // pourrait ouvrir une commune en pionnière puis être déclassée ensuite —
    // un provisionnement gagné par une course que le système vient de refuser.
    //
    // `nowMs` est INJECTÉ depuis l'horloge du handler : le moteur ne lit jamais
    // `Date.now()`, et le signal « horodatages dans le futur » se juge donc à
    // l'instant d'INGESTION, seul instant que le serveur constate lui-même.
    const antiCheat = planAntiCheat({
      verdict: gameVerdict,
      // Trace BRUTE : `filterPoints` retire justement les points trop rapides,
      // donc mesurer la vitesse soutenue sur `filtered` rendrait toujours zéro.
      points: request.points,
      activity,
      stepCount: request.stepCount,
      source: request.source,
      nowMs: now.getTime(),
      // `priorTraceFingerprints` NON FOURNI, volontairement : aucune trace
      // antérieure exploitable n'est conservée (cf. le champ dans
      // `anticheat_wiring.ts`). Passer `[]` affirmerait « aucun antécédent ne
      // colle », ce qu'aucune lecture ne soutient. Le rejeu reste attrapé en
      // amont par `findDuplicateRun`.
    });
    // À partir d'ici, `validation` = le verdict §3.2 ET §11 réunis. Tout l'aval
    // (auto-ouverture, ville d'attache, statut inséré, hexing, contestation)
    // n'en connaît qu'un seul.
    const validation = antiCheat.verdict;

    // ── Auto-ouverture par PRÉSENCE (23/07/2026) ──────────────────────────────
    // Si la course est CLAIMABLE, part d'un point HORS de toute city_zone, et
    // vient du GPS LIVE (jamais un import — vecteur de « zone vide au loin »),
    // alors le coureur est le PIONNIER de sa commune : elle s'ouvre avec son
    // CONTOUR RÉEL (geo.api.gouv.fr). On la charge ensuite par son id pour que
    // domiciliation, densité, claim→season_scores et nom de frontière héritent de
    // la zone fraîche. Best-effort strict : tout échec laisse la course « hors
    // zone » (comportement honnête), jamais un disque ni un nom fabriqué. Placé
    // APRÈS la dédup (aucun effet de bord sur un doublon) et AVANT `ensureHomeCity`
    // (le pionnier est domicilié dans la commune qu'il vient d'ouvrir).
    if (
      shouldAutoOpenCommune({
        hasCityZone: cityZone !== undefined,
        validationKind: validation.kind,
        runMode,
        source: request.source,
        pointCount: request.points.length,
      })
    ) {
      const opened = await autoOpenCommuneAt(request.points[0], userId);
      if (opened) {
        // Le flag « tu as ouvert » n'est posé que pour le VRAI pionnier (created).
        if (opened.created) communeOpened = { insee: opened.insee, nom: opened.nom };
        // RATTACHEMENT PAR ID, pas par re-géométrie. Le géocodeur fait autorité
        // sur « quelle commune » ; on charge donc SA zone directement. Refaire un
        // point-in-polygon sur le contour SIMPLIFIÉ (Douglas-Peucker, ~33 m)
        // pourrait rejeter un départ à quelques mètres du bord — la course dirait
        // « ouverte » mais ne se rattacherait à rien (0 en classement, non
        // domiciliée). On se rattache dans TOUS les cas (pionnier comme second
        // coureur) à la commune désormais ouverte.
        const reZone = await loadCityZoneById(communeCityId(opened.insee));
        if (reZone) {
          cityZone = reZone;
          request.cityId = reZone.city_id;
        }
      }
    }

    // ── Ville d'attache (blocage n°5) ─────────────────────────────────────────
    // Posée ICI, une seule fois, avant que le handler ne se ramifie (conquête /
    // sans claim / doublon) : toutes les branches en héritent. Une course
    // REFUSÉE (`rejected`) ou SUSPECTE (`flagged`, GRYD Verify) ne pose rien —
    // on ne domicilie personne sur un fait de jeu qu'on vient d'invalider ou
    // qu'on n'a pas su créditer.
    if (profile.city_id === null && validation.kind === 'claimable') {
      await ensureHomeCity(userId, request.cityId);
    }
    // ── Série (LOT 1) : DÉRIVÉE des courses réelles, plus jamais d'une colonne
    // que personne n'écrivait. `streakBefore` = les semaines DÉJÀ validées avant
    // cette course (la course en cours n'est pas encore en base) — c'est bien
    // elle qui multiplie les points, conformément à §3.4. `streakAfter` inclut
    // la course : c'est l'état que le joueur verra sur son écran de résultat.
    const streakFacts = await loadStreakFacts(userId, now);
    const streakBefore = computeStreak({
      runStartedAt: streakFacts.runStartedAt,
      now,
      frozenWeekKeys: streakFacts.frozenWeekKeys,
    });
    const streakAfterRun = (counted: boolean): StreakState =>
      computeStreak({
        runStartedAt: counted
          ? [...streakFacts.runStartedAt, new Date(request.startedAt)]
          : streakFacts.runStartedAt,
        now,
        frozenWeekKeys: streakFacts.frozenWeekKeys,
      });
    // ⚠ `scoringWeeks`, PAS `weeks` (correctif anti-pay-to-win 21/07). Un gel de
    // série s'achète avec des Éclats, eux-mêmes achetables en argent réel. La
    // série AFFICHÉE (`weeks`) laisse le gel enjamber une semaine ratée — c'est
    // son rôle, anti-shame. Mais si cette chaîne-là multipliait les POINTS,
    // payer 60 Éclats transformerait un ×1,0 en ×1,4 : des points de classement
    // achetés, interdits par la constitution. Le multiplicateur ne compte donc
    // que les semaines RÉELLEMENT COURUES.
    const streak = {
      weeks: streakBefore.scoringWeeks,
      multiplier: streakMultiplier(streakBefore.scoringWeeks),
    };

    const baseRow = {
      user_id: userId,
      client_run_id: request.clientRunId,
      source: request.source,
      // `source` dit d'OÙ vient la trace (gps/healthkit/strava/gpx),
      // `activity` dit CE QU'ON FAISAIT. Orthogonaux : on importe un GPX de
      // vélo comme on enregistre une course en GPS live (migration 0070).
      activity,
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
        // Course non comptabilisée : la série est INCHANGÉE. On l'affiche quand
        // même (anti-shame : « ta série tient », pas « tu as perdu »).
        ...(streakAfterPayload(streakAfterRun(false), streakBefore.weeks) !== undefined
          ? { streakAfter: streakAfterPayload(streakAfterRun(false), streakBefore.weeks) }
          : {}),
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
      // ── §11.3/§11.4 : LA REVUE EXISTE ENFIN, ET ELLE EST ÉCRITE ICI ────────
      // PLACÉE JUSTE APRÈS `insertRun` (elle a besoin du `run_id`) et AVANT le
      // reste : c'est la fenêtre la plus courte possible entre « la course est
      // refusée » et « la raison chiffrée du refus est consultable ». Un plantage
      // dans cet intervalle laisse une course `flagged` sans revue — soit
      // EXACTEMENT le comportement d'avant ce chantier, jamais pire.
      //
      // BEST-EFFORT ASSUMÉ (`console.error`, pas de `throw`) : la course a déjà
      // été jugée et n'est déjà pas créditée. Faire échouer l'ingestion entière
      // parce que la ligne d'audit n'est pas passée priverait le joueur de sa
      // réponse sans rien protéger — et son client renverrait le même
      // `clientRunId`, qui ressortirait par l'idempotence sans jamais rejouer ce
      // bloc. Même patron que `territories` / `territory_contests`.
      if (antiCheat.review) {
        try {
          const { error: reviewErr } = await supabase
            .from('anticheat_reviews')
            .insert(buildReviewRow({
              runId: inserted.runId,
              userId,
              review: antiCheat.review,
            }));
          // IDEMPOTENCE PAR LA CONTRAINTE, pas par un `select` préalable :
          // `anticheat_reviews.run_id` est `unique` (0081). Deux renvois
          // simultanés du même `clientRunId` ne peuvent pas empiler deux
          // dossiers du même fait — le second retombe sur 23505 et se tait,
          // parce que la ligne déjà présente porte le MÊME contenu
          // (`planAntiCheat` est déterministe).
          if (reviewErr && !isDuplicateReview(reviewErr.code)) {
            console.error(
              '[ingest_run] anticheat_reviews insert (best-effort, course déjà non créditée):',
              reviewErr.message,
            );
          }
        } catch (e) {
          console.error('[ingest_run] anticheat fail-safe (verdict inchangé):', e);
        }
      }
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
      const noClaimStreak = streakAfterRun(true);
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
        streakAfter: streakAfterPayload(noClaimStreak, streakBefore.weeks),
        streakWeeksAfter: noClaimStreak.weeks,
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
    let crew!: { crewId: string | null; size: number; memberIds: ReadonlySet<string> };
    let density!: ZoneDensity;
    const resolveOwnership = async (
      allHexes: readonly string[],
    ): Promise<OwnershipResolution> => {
      // `crew` est chargé ICI (et non plus après la RPC) : le coeff_contexte de la
      // formule §23 (crew_mission/contested) dépend du crew du coureur ET doit être
      // décidé AVANT le scoring. Réutilisé tel quel par tout le reste du handler.
      states = await loadHexStates(allHexes, activity);
      const [
        loadedCrew,
        ownersCreatedAt,
        privacyHexes,
        noCaptureHexes,
        claimsToday,
      ] = await Promise.all([
        loadCrew(userId),
        loadOwnersCreatedAt(states, userId),
        loadPrivacyHexes(userId, allHexes),
        loadNoCaptureHexes(allHexes),
        loadClaimsToday(userId, now),
      ]);
      crew = loadedCrew;
      // La densité n'est plus une lecture séparée : `resolveRunCity` a déjà lu la
      // ligne `city_zones` (statut compris) pour trancher le rattachement — la
      // relire ici était un aller-retour pour la même donnée.
      density = zoneDensity(cityZone);

      // AMENDEMENT-23 §D / doc §23 : coeff_contexte par hex (contested/crew_mission),
      // décidé SERVEUR depuis l'état pré-run + les offensives crew actives. Sans ce
      // câblage, coeff_contexte valait toujours 1,0 et la moitié « contexte » de la
      // formule §23 restait inerte (finding). Non pay-to-win : le contexte se gagne
      // par la situation (rival présent / mission crew), jamais par un achat.
      const contextByHex = await loadContextByHex(userId, crew.crewId, allHexes, states, now);
      // A-41 LE RELAIS : rang/cooldown/budget de co-capture — le rang est
      // conservé hors du callback (coCaptureRanks) pour l'insertion du
      // registre hex_co_captures après la RPC.
      const coCap = await loadCoCaptureContext(userId, allHexes, states, now, activity);
      coCaptureRanks = coCap.rankByHex;

      return {
        states,
        ownersCreatedAt,
        privacyHexes,
        noCaptureHexes,
        zoneDensity: density,
        claimsToday,
        // Bonus de groupe : coéquipiers SAME-CREW co-présents (moi + eux), calculé
        // ICI avec les états chargés → allonge le LOCK côté decideClaims (capé +40 %).
        runners: sameCrewRunnerCount(allHexes, states, userId, crew.memberIds, now.getTime()),
        ...(contextByHex.size > 0 ? { contextByHex } : {}),
        ...(coCap.rankByHex.size > 0
          ? {
              coCaptureRankByHex: coCap.rankByHex,
              coCapturePointsBudget: coCap.budget,
              ...(coCap.cooldownHexes.size > 0
                ? { coCaptureCooldownHexes: coCap.cooldownHexes }
                : {}),
            }
          : {}),
      };
    };

    // A-41 : rangs de co-capture observés par resolveOwnership (pour le registre).
    let coCaptureRanks: ReadonlyMap<string, number> = new Map();
    const territory = await runTerritoryEngine({
      claimable: validation.claimable,
      // E14 : les plafonds de BOUCLE suivent aussi la discipline (périmètre
      // minimal ×5, aire ×25 — loi du carré). Une sortie vélo « échelle ville »
      // ne peut pas fermer une zone avec les seuils d'un tour de quartier.
      activity,
      gpsTrust: validation.gpsTrust,
      trustScore: validation.trustScore,
      distanceM,
      now,
      userId,
      userCreatedAt: new Date(profile.created_at),
      // Série DÉRIVÉE du réel (LOT 1) — plus la colonne jamais écrite.
      streakWeeks: streakBefore.weeks,
      isClub: profile.is_club,
      resolveOwnership,
    });
    // `hexes` (couloir) reste la constante calculée plus haut (§Hexing, ligne
    // `hexesForSegments`) : le moteur la recalcule à l'identique en interne, mais
    // le reste du handler la référence déjà — on ne la re-déclare pas. Le moteur
    // rend le RESTE (intérieur, décision, score, verdict de boucle).
    const { interiorCells, loopClosed, capReached, decision, score } = territory;
    const loopRejectedReason = territory.loopRejectedReason;
    // LOT G1c — le verdict de fermeture voyage jusqu'au client. `loopAssisted`
    // dit ce que le produit a DONNÉ (bande assistée) ; `loopMissingM` dit ce
    // qu'il MANQUAIT quand la phrase a un sens. Les deux sont décidés par le
    // moteur PUR : rien n'est recalculé ici, sinon les deux versions
    // divergeraient au premier réglage de Saison 0.
    const loopAssisted = territory.loopAssisted;
    const loopMissingM = territory.loopMissingM;
    // `interiorSet` reste dérivé ici (le couloir vs l'intérieur d'une boucle sert
    // au comptage des zones fermées de la célébration, plus bas).
    const interiorSet = new Set(interiorCells);

    // ── Insert runs PUIS RPC (claim_hexes vérifie l'existence du run) ────────
    // TRACE MASQUEE (§12.1) — uniquement sur une course RETENUE : une course
    // `rejected` ou `flagged` n'ecrit aucune geometrie. Le masquage tourne ICI,
    // cote serveur, avec le meme code que le partage mobile ; il ne peut pas
    // faire echouer l'insertion (voir tracePersist.ts).
    const maskedPolyline = maskedPolylineFor(request.points, await loadPrivacyZones(userId));
    const inserted = await insertRun({
      ...baseRow,
      status: validation.status,
      reject_reason: null,
      points_awarded: score.points,
      xp_awarded: score.xp,
      polyline_masked: maskedPolyline,
    }, userId, request.clientRunId, profile.streak_weeks);
    if (inserted.replayed) return json(inserted.payload);
    const runId = inserted.runId;

    // ── Série APRÈS cette course (LOT 1) : ce que le joueur verra sur son écran
    // de résultat, et le cache serveur `users.streak_weeks` remis à jour.
    const streakState = streakAfterRun(true);
    const streakAfter = streakAfterPayload(streakState, streakBefore.weeks);
    if (streakState.weeks !== streakBefore.weeks) {
      await cacheStreakWeeks(userId, streakState.weeks);
    }

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
      r.outcome === 'defended' || r.outcome === 'already_owned_cooldown' ||
      // A-41 : les relais sont PAYÉS par la même RPC (outcome 'support' —
      // points sans aucune écriture hex_claims) et participent à la même
      // répartition des points finaux (verify × streak × perf).
      r.outcome === 'co_captured'
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
        // A-41 : un relais ('support') ne porte AUCUNE horloge ni garde — la
        // RPC ne touche pas hex_claims pour lui (invariant structurel 0041).
        const isSupport = r.outcome === 'co_captured';
        return {
          h3index: h3ToDb(r.h3),
          outcome: rpcOutcome(r),
          points: finalPerHex[i],
          // Garde TOCTOU (0031) : owner OBSERVÉ par le moteur → claim_hexes n'applique
          // que si l'état DB n'a pas changé depuis (sinon conflit de concurrence → skip).
          expected_owner: isSupport ? null : states.get(r.h3)?.ownerUserId ?? null,
          locked_until: isCapture ? decision.lockedUntil.toISOString() : null,
          // Capture : now + 14 j (ou null si nouveau joueur, §3.3). Défense :
          // échéance ÉTENDUE de +24/48/72 h (défense graduée). already_owned_
          // cooldown : traité comme défense (decay repoussé, cf. rpcOutcome).
          decay_at: isSupport
            ? null
            : isCapture
              ? (decision.decayExempt ? null : decision.decayAt.toISOString())
              : defenseDecayIso(r.h3),
        };
      });
      const { error: rpcError } = await supabase.rpc('claim_hexes', {
        p_run_id: runId,
        p_user_id: userId,
        p_city_id: request.cityId ?? null,
        p_claims: rpcClaims,
        // XP D18 (migration 0018) : le CUMUL lifetime users.xp est crédité de
        // score.xp (SANS streak/perf), comme runs.xp_awarded — plus du total points.
        p_xp: score.xp,
        // E14 (migration 0070) : l'univers dans lequel ces claims s'appliquent.
        // `on conflict (h3index, activity)` côté RPC — un cycliste ne peut plus
        // écraser la ligne d'un coureur, et les points ne sont plus sommés.
        p_activity: activity,
      });
      if (rpcError) throw new Error(`claim_hexes rpc: ${rpcError.message}`);

      // ── A-41 : registre des relais (rang, part, points FINAUX crédités) ────
      // Après la RPC (les points sont réellement payés). Il nourrit le rang du
      // prochain relayeur, le cooldown 24 h et le cap quotidien. Best-effort
      // assumé : un échec ici ne doit pas invalider la course déjà créditée —
      // il rend juste le prochain rang trop généreux d'un cran (bénin).
      const coCapturedRows = actionable
        .map((r, i) => ({ r, points: finalPerHex[i] ?? 0 }))
        .filter(({ r }) => r.outcome === 'co_captured')
        .map(({ r, points }) => {
          const st = states.get(r.h3);
          const rank = coCaptureRanks.get(r.h3) ?? 2;
          return {
            h3index: h3ToDb(r.h3),
            // E14 : le registre du relais appartient au monde de la capture
            // relayée — sinon le rang du prochain relayeur mélangerait les deux.
            activity,
            user_id: userId,
            run_id: runId,
            crew_id: crew.crewId,
            owner_user_id: st?.ownerUserId ?? userId,
            capture_claimed_at: (st?.lastCapturedAt ?? now).toISOString(),
            share: coCaptureShare(rank),
            points,
          };
        });
      if (coCapturedRows.length > 0) {
        const { error: coErr } = await supabase.from('hex_co_captures').insert(coCapturedRows);
        if (coErr) {
          console.error('[A-41] hex_co_captures insert (best-effort):', coErr.message);
        } else {
          // ── A-41 §4 « Ensemble ça tient » : extension rétroactive du lock ────
          // POURQUOI : « le solo conquiert, le groupe fait TENIR ». Un relais
          // crédité (co_captured) sur un hex FRAÎCHEMENT capturé RALLONGE le lock
          // du PROPRIÉTAIRE — anti pay-to-win : on n'accorde QUE du TEMPS de lock,
          // jamais des points ni de la surface.
          // INVARIANT : le SYSTÈME (service-role) étend AU NOM DU PROPRIÉTAIRE,
          // jamais le relayeur pour lui-même ; on n'écrit QUE pour ALLONGER ; on
          // ne touche NI decay_at / owner_user_id / claimed_at / fresh. Un
          // co_captured_cooldown ne figure PAS dans coCapturedRows (filtre
          // 'co_captured' strict) → aucune extension. Best-effort STRICT : un
          // échec loggue et ne change NI la réponse NI le verdict du run déjà
          // crédité.
          try {
            for (const r of actionable.filter((x) => x.outcome === 'co_captured')) {
              const st = states.get(r.h3);
              // Double garde owner + claimed_at OBLIGATOIRE : sans propriétaire ET
              // capture datés (contexte de rang chargé au début), on n'étend RIEN
              // — on ne classe jamais une capture qu'on n'a pas observée, et le
              // couple owner+claimed_at neutralise la course « zone re-capturée
              // entre-temps » (le lock d'une autre capture ne sera jamais touché).
              const expectedOwner = st?.ownerUserId ?? null;
              const capturedAt = st?.lastCapturedAt ?? null;
              if (expectedOwner === null || capturedAt === null) continue;
              const newLock = retroactiveLockUntil({
                claimedAt: capturedAt,
                currentLockedUntil: st?.lockedUntil ?? null,
                runnersTotal: coCaptureRanks.get(r.h3) ?? 2,
              });
              if (newLock === null) continue; // rang 1, ou lock courant déjà ≥ : ne rien écrire
              // Garde claimed_at par PLAGE d'une milliseconde, pas par égalité :
              // Postgres stocke claimed_at en MICROSECONDES (now() de claim_hexes),
              // JS Date tronque en ms → un .eq() sur l'ISO ms ne matcherait ~jamais
              // (…123Z vs .123456) et le mécanisme serait un no-op silencieux
              // (bloquant relevé par la vérif adversariale). La plage [ms, ms+1)
              // matche exactement la capture observée, et une re-capture (autre
              // now(), autre ms) reste hors plage : la garde anti-course tient.
              const msFloor = new Date(capturedAt.getTime()).toISOString();
              const msCeil = new Date(capturedAt.getTime() + 1).toISOString();
              const { error: lockErr } = await supabase
                .from('hex_claims')
                .update({ locked_until: newLock.toISOString() })
                .eq('h3index', h3ToDb(r.h3))
                // E14 : la clé est (h3index, activity) — sans ce filtre, le lock
                // rétroactif d'un relais course s'appliquerait AUSSI à la zone
                // vélo du même hexagone, qui n'a rien demandé.
                .eq('activity', activity)
                .eq('owner_user_id', expectedOwner)
                .gte('claimed_at', msFloor)
                .lt('claimed_at', msCeil);
              if (lockErr) {
                console.warn(
                  '[ingest_run] A-41 retro-lock update (best-effort, lock inchangé):',
                  lockErr.message,
                );
              }
            }
          } catch (e) {
            console.warn('[ingest_run] A-41 retro-lock fail-safe (lock inchangé ce run):', e);
          }
        }
      }

      // ── VOL SUBI : mise en file de « quelqu'un a pris ton territoire » ─────
      // C'est la boucle de rétention du jeu : on te prend ta zone, tu reviens
      // la reprendre. Le vol est déjà appliqué et payé ci-dessus ; il ne reste
      // qu'à prévenir le DÉPOSSÉDÉ — et il ne le sera jamais depuis ici.
      //
      // POURQUOI UNE FILE, ET PAS L'ENVOI. ingest_run est sur le chemin
      // critique de la fin de course : le coureur attend son résultat. Envoyer
      // demanderait 3 lectures (appareils, journal de push, dernier push de
      // vol) + un aller-retour vers exp.host — ~200-600 ms qui ne servent EN
      // RIEN à celui qui attend. Ici : UN insert local, quelques millisecondes.
      // Et une file agrège plusieurs courses adverses en un seul message avec
      // le VRAI total, ce qu'un envoi par course ne peut pas faire (voir
      // migration 0056 et supabase/functions/steal_push_job/).
      //
      // BEST-EFFORT STRICT. La course est déjà créditée : un échec ici loggue
      // et ne change NI la réponse NI le verdict. Le coureur ne doit jamais
      // perdre son résultat parce qu'une notification destinée à quelqu'un
      // d'autre n'est pas partie.
      //
      // HONNÊTETÉ SUR CE QU'ON MET EN FILE : ce sont les vols DÉCIDÉS par le
      // moteur sur l'état lu avant la RPC. Dans le cas rare où la garde TOCTOU
      // de claim_hexes a écarté un claim, l'hex a changé de mains entre-temps —
      // au profit de quelqu'un d'autre : la victime l'a bel et bien perdu, et
      // comme le message ne nomme JAMAIS l'attaquant, il reste vrai.
      try {
        const stealRows = decision.results
          .filter((r) => r.outcome === 'stolen')
          .map((r) => ({ h3: r.h3, victim: states.get(r.h3)?.ownerUserId ?? null }))
          // Un vol sans propriétaire observé n'a pas de dépossédé ; se voler
          // soi-même n'existe pas (le moteur route ce cas en `defended`).
          .filter((x): x is { h3: string; victim: string } =>
            x.victim !== null && x.victim !== userId
          )
          .map((x) => ({
            victim_user_id: x.victim,
            thief_user_id: userId,
            h3index: h3ToDb(x.h3),
            // E14 : le dépossédé doit savoir DANS QUEL MONDE il a perdu. Sans
            // ça, un coureur recevrait « reprends ta zone » pour un hexagone
            // qu'il tient toujours en courant — un message faux.
            activity,
          }));
        if (stealRows.length > 0) {
          const { error: stealErr } = await supabase.from('steal_push_queue').insert(stealRows);
          if (stealErr) {
            console.error('[ingest_run] steal_push_queue insert (best-effort):', stealErr.message);
          }
        }
      } catch (e) {
        console.error('[ingest_run] steal_push_queue fail-safe (course créditée):', e);
      }
    }

    // ── LOT 1 ÉTAPE 2 : DOUBLE ÉCRITURE DU TERRITOIRE (polygone) ─────────────
    // Spec §1.4 : « un territoire est un POLYGONE issu de la trace réelle ». La
    // table `territories` (0074) existait mais PERSONNE n'écrivait dedans. Ici
    // on l'alimente — EN PLUS de `hex_claims`, jamais à sa place.
    //
    // CE QUI NE CHANGE PAS, ET C'EST LE POINT DE CETTE ÉTAPE : la propriété
    // effective reste HEXAGONALE, aucune lecture ne bascule, aucun écran ne
    // bouge, aucun point ne change. Les deux représentations COEXISTENT. Un
    // joueur ne verra pas la différence — et prétendre l'inverse serait une doc
    // qui promet au-delà du code (la bascule des lectures est l'étape 4).
    //
    // POURQUOI `detectLoop` EST RAPPELÉ ICI. Le polygone existe déjà : le moteur
    // le calcule dans `runTerritoryEngine` (engine.ts) puis le JETTE après en
    // avoir tiré les cellules intérieures — `RunTerritoryResult` n'expose pas la
    // boucle. On le RECALCULE donc, avec les MÊMES entrées (`loopTrace`,
    // `activity`) et la MÊME fonction PURE et déterministe : le résultat ne peut
    // pas diverger, seul le coût est payé deux fois (un scan de la trace, sur un
    // chemin qui fait déjà des dizaines d'allers-retours DB). Ce n'est pas la
    // bonne forme définitive — exposer `loop` dans `RunTerritoryResult` est le
    // correctif, et il appartient au moteur, hors périmètre de cette étape.
    //
    // BEST-EFFORT STRICT, comme `hex_co_captures` et `steal_push_queue` juste
    // au-dessus : la course est DÉJÀ créditée et la propriété hexagonale déjà
    // appliquée. Un échec ici loggue et ne change NI la réponse, NI le verdict,
    // NI un seul point. Écrire dans une table que personne ne lit encore n'a pas
    // le droit de faire échouer une course qui, elle, compte.
    //
    // IDEMPOTENCE À DEUX ÉTAGES : (1) un renvoi du même `clientRunId` sort AVANT
    // ce point (`insertRun` → `replayed`), donc on ne repasse pas ici ; (2) si
    // deux requêtes concurrentes franchissent quand même cette garde, l'index
    // unique `territories_source_run_unique` (0075) refuse le second insert avec
    // un 23505 — qu'on traite comme un SUCCÈS, parce que c'en est un : le
    // territoire de cette course existe.
    // L'ANNEAU DE LA BOUCLE, calculé UNE FOIS pour les deux consommateurs qui
    // suivent : la ligne `territories` (lot 1) et la contestation §9 (lot 3).
    // Avant ce hoist, `detectLoop` était rappelé dans le bloc `territories` ;
    // deux appels à une fonction pure et déterministe ne peuvent pas diverger,
    // mais un troisième aurait fini par le faire croire. `null` = la course n'a
    // fermé aucune boucle : ni territoire à écrire, ni surface à opposer.
    const runLoopRing = loopClosed && loopTrace !== null
      ? detectLoop(loopTrace, activity)?.polygon ?? null
      : null;

    // AIRE RENVOYÉE AU CLIENT — déclarée ICI, hors du `try`, parce que l'écran
    // de résultat en a besoin et que le bloc ci-dessous est best-effort.
    // ⚠️ Elle n'est renseignée QUE si la ligne `territories` est réellement en
    // base (insert OK, ou 23505 = un retry concurrent l'a déjà écrite). Sinon
    // le résultat annoncerait « +42 000 m² » pour un polygone que la carte ne
    // montrerait jamais — deux écrans de la même app se contrediraient.
    let loopAreaM2: number | undefined;
    try {
      const capturedCellCount = decision.results.filter(
        (r) => r.outcome === 'claimed_neutral' || r.outcome === 'stolen',
      ).length;
      // Le calcul géométrique n'est fait QUE si une capture a réellement eu lieu
      // ET qu'une boucle a été fermée — sinon il n'y a rien à décrire.
      if (capturedCellCount > 0 && loopClosed && loopTrace !== null) {
        const territoryRow = buildTerritoryRow({
          polygon: runLoopRing,
          // Forme trop étroite ou GPS sous le seuil : le moteur a REFUSÉ
          // l'intérieur. La surface n'a pas été gagnée, on n'en écrit pas.
          interiorRejected: loopRejectedReason !== undefined,
          capturedCellCount,
          activity,
          ownerUserId: userId,
          // MÊME ville que celle passée à `claim_hexes` (arbitrée serveur par
          // `resolveRunCity`) : deux rattachements divergents pour une même
          // course rendraient les deux représentations incomparables.
          cityId: request.cityId ?? null,
          runId,
          now,
        });
        if (territoryRow !== null) {
          const { error: territoryErr } = await supabase
            .from('territories')
            .insert(territoryRow);
          // 23505 = `territories_source_run_unique` → un retry concurrent a
          // gagné. Le territoire existe : ce n'est pas une erreur.
          // Décision PURE et testée (`reportableAreaM2`) : l'aire ne sort que
          // si le polygone est réellement en base — 23505 compris, qui signifie
          // qu'un retry concurrent l'a déjà écrit.
          loopAreaM2 = reportableAreaM2(territoryRow, territoryErr ?? null);
          if (territoryErr && territoryErr.code !== '23505') {
            console.error(
              '[ingest_run] territories insert (best-effort, propriété hexagonale intacte):',
              territoryErr.message,
            );
          }
        }
      }
    } catch (e) {
      console.error('[ingest_run] territories fail-safe (course créditée):', e);
    }

    // ── LOT 3 (suite) : LA CONTESTATION (§9) — LE VOL DU POLYGONE N'EST PLUS
    //    INSTANTANÉ ────────────────────────────────────────────────────────────
    // Spec §9.1 : « une zone devient contestée lorsqu'une boucle rivale valide
    // couvre le seuil de surface ». Jusqu'ici les briques existaient
    // (`contest.ts` 36 tests, table `territory_contests` 0078) et PERSONNE ne
    // les appelait. Ici on les appelle.
    //
    // CE QUI CHANGE : recouvrir la zone POLYGONALE d'un rival ouvre une fenêtre
    // de défense au lieu de la lui prendre ; courir chez soi pendant une
    // contestation la referme et FORTIFIE la zone ; à l'échéance,
    // `resolve_due_contests()` (0080) transfère faute de défense.
    //
    // CE QUI NE CHANGE PAS, ET IL FAUT LE DIRE : `claim_hexes` continue de
    // transférer les CELLULES dans la transaction (0070:610). Les points, les
    // classements et le decay suivent toujours les hexagones. Pendant la
    // transition, une zone peut donc être « contestée » côté polygone alors que
    // ses cellules ont déjà changé de main côté hexagones — écart RÉEL, décrit
    // dans `contest_wiring.ts` (suspens 1) et refermable seulement en retirant
    // le vol instantané ET les protections d'AMENDEMENT-23 §D en même temps.
    //
    // BEST-EFFORT STRICT, comme les trois blocs précédents : la course est déjà
    // créditée et la propriété hexagonale déjà appliquée. Un échec ici loggue et
    // ne change NI la réponse, NI le verdict, NI un seul point.
    //
    // IDEMPOTENCE À TROIS ÉTAGES : (1) un renvoi du même `clientRunId` sort bien
    // avant ce point ; (2) le PLAN refuse d'ouvrir sur un territoire qui porte
    // déjà une contestation active ; (3) l'index unique partiel de 0078 refuse
    // le dernier cas de concurrence avec un 23505, traité comme un succès (une
    // contestation existe, c'est ce qu'on voulait).
    try {
      if (runLoopRing !== null) {
        // ─── LES CANDIDATS ────────────────────────────────────────────────────
        // BORNE ASSUMÉE : même discipline (E14 — `run` et `bike` ne se mélangent
        // jamais) et même ville (ou territoire sans ville). `territories.geometry`
        // est du jsonb SANS index spatial (0074 §1) : il n'existe aucun moyen de
        // filtrer par géométrie en SQL aujourd'hui. Conséquence réelle, inscrite
        // en suspens : un territoire rattaché à une AUTRE ville n'est pas
        // contesté, même si les polygones se chevauchent à une frontière.
        const contestCityId = request.cityId ?? null;
        let candidateQuery = supabase
          .from('territories')
          .select('id, owner_type, owner_id, state, defense_level, geometry')
          .eq('activity', activity)
          // Un territoire `unowned`/`expired`/`invalidated` n'a pas de
          // propriétaire à contester ; `transfer_pending`/`protected_by_privacy`
          // ne sont produits par rien aujourd'hui.
          .in('state', ['owned_personal', 'owned_crew', 'contested', 'defended']);
        candidateQuery = contestCityId === null
          ? candidateQuery.is('city_id', null)
          // `or()` prend une chaîne de filtre PostgREST : on ne l'interpole que
          // pour un identifiant à la forme vérifiée (les `city_id` sont des
          // slugs). Sinon on retombe sur un `eq` paramétré, qui perd les
          // territoires ruraux mais ne construit aucune requête douteuse.
          : /^[A-Za-z0-9_-]+$/.test(contestCityId)
          ? candidateQuery.or(`city_id.eq.${contestCityId},city_id.is.null`)
          : candidateQuery.eq('city_id', contestCityId);
        const { data: candidateRows, error: candidateErr } = await candidateQuery;
        // `throw` ICI est sans danger — et volontairement nommé « contest … » et
        // non « territories … » : la lecture est enfermée dans le fail-safe de ce
        // bloc, et `territory_test.ts` interdit précisément qu'un `throw new
        // Error(\`territories…` apparaisse dans ce fichier (le bloc d'écriture du
        // lot 1 doit rester best-effort). Le garde textuel reste donc juste.
        if (candidateErr) throw new Error(`contest candidates read: ${candidateErr.message}`);

        const rows = candidateRows ?? [];
        if (rows.length > 0) {
          // ─── LES CONTESTATIONS CONNUES ────────────────────────────────────
          // `active` : pour ne pas ré-ouvrir (idempotence) et pour juger une
          // défense. `defended` : sa `resolved_at` est la DERNIÈRE DÉFENSE
          // RÉUSSIE, entrée de `decayedDefenseLevel` (§9.2, axe temporel) — sans
          // elle un territoire fortifié il y a une semaine ouvrirait encore une
          // fenêtre de 36 h.
          const territoryIds = rows.map((r) => r.id as string);
          const { data: contestRows, error: contestErr } = await supabase
            .from('territory_contests')
            .select(
              'id, territory_id, status, attacker_type, attacker_id, started_at, expires_at, resolved_at',
            )
            .in('territory_id', territoryIds)
            .in('status', ['active', 'defended']);
          if (contestErr) throw new Error(`territory_contests read: ${contestErr.message}`);

          // ─── LA PROTECTION D'ONBOARDING DU DÉFENSEUR (§3.3 réexprimée) ────
          // Elle empêche l'OUVERTURE de la contestation. On ne la lit que pour
          // les propriétaires JOUEURS : un crew n'a pas d'âge de compte, et le
          // garde-fou n'est alors simplement pas évalué (contrat de `ContestGate`).
          const ownerIds = [
            ...new Set(
              rows
                .filter((r) => r.owner_type === 'user' && r.owner_id !== null)
                .map((r) => r.owner_id as string),
            ),
          ];
          const createdAtByOwner = new Map<string, number>();
          for (const batch of chunk(ownerIds, DB_IN_CHUNK)) {
            const { data: owners, error: ownersErr } = await supabase
              .from('users')
              .select('id, created_at')
              .in('id', batch);
            if (ownersErr) throw new Error(`users read (contest): ${ownersErr.message}`);
            for (const o of owners ?? []) {
              createdAtByOwner.set(o.id as string, new Date(o.created_at as string).getTime());
            }
          }

          const candidates: CandidateTerritory[] = rows
            .filter((r) => r.owner_type !== null && r.owner_id !== null)
            .map((r) => ({
              id: r.id as string,
              ownerType: r.owner_type as 'user' | 'crew',
              ownerId: r.owner_id as string,
              state: r.state as string,
              defenseLevel: Number(r.defense_level ?? 0),
              geometry: r.geometry,
              ownerCreatedAtMs: r.owner_type === 'user'
                ? createdAtByOwner.get(r.owner_id as string) ?? null
                : null,
            }));

          const contests: ExistingContest[] = (contestRows ?? []).map((c) => ({
            id: c.id as string,
            territoryId: c.territory_id as string,
            status: c.status as ExistingContest['status'],
            attackerType: c.attacker_type as 'user' | 'crew',
            attackerId: c.attacker_id as string,
            startedAtMs: new Date(c.started_at as string).getTime(),
            expiresAtMs: new Date(c.expires_at as string).getTime(),
            resolvedAtMs: c.resolved_at === null
              ? null
              : new Date(c.resolved_at as string).getTime(),
          }));

          // FIN DE COURSE : `runs` ne porte pas de `finished_at` — c'est
          // `started_at + duration_s`, la vraie fin de l'activité (et non
          // l'instant d'ingestion, qui serait faux pour un GPX importé).
          // Bornée à `now` : une horloge client en avance ne doit pas produire
          // une activité « terminée dans le futur », que §9.3 rejetterait alors
          // qu'elle a bel et bien eu lieu.
          const finishedAtMs = Math.min(
            new Date(request.startedAt).getTime() + durationS * 1000,
            now.getTime(),
          );

          const contestPlan = planContestWiring({
            activity: {
              runId,
              actorUserId: userId,
              actorCrewId: crew.crewId,
              polygon: runLoopRing,
              loopClosed,
              // §11 : le verdict du pipeline, jamais re-décidé ici. À ce point du
              // handler `validation.kind` vaut 'claimable' (les autres cas sont
              // sortis bien plus haut) — on le DÉRIVE quand même plutôt que
              // d'écrire `true`, pour que le jour où le flux change, la
              // contestation cesse d'elle-même au lieu de mentir.
              antiCheatPassed: validation.kind === 'claimable',
              finishedAtMs,
            },
            candidates,
            contests,
            nowMs: now.getTime(),
          });

          // ─── (a) LES DÉFENSES D'ABORD ────────────────────────────────────
          // La garde `.eq('status', 'active')` est LE verrou : si le job
          // d'échéance (0080) a tranché entre la lecture et l'écriture, la mise
          // à jour ne touche rien et on ne fortifie pas un territoire perdu.
          for (const d of contestPlan.defenses) {
            const { data: closed, error: closeErr } = await supabase
              .from('territory_contests')
              .update({
                status: 'defended',
                resolved_at: new Date(d.resolvedAtMs).toISOString(),
              })
              .eq('id', d.contestId)
              .eq('status', 'active')
              .select('id');
            if (closeErr) {
              console.error('[ingest_run] contest defend (best-effort):', closeErr.message);
              continue;
            }
            if ((closed?.length ?? 0) === 0) continue; // déjà tranchée ailleurs
            const { error: fortifyErr } = await supabase
              .from('territories')
              .update({ state: TERRITORY_STATE_DEFENDED, defense_level: d.defenseLevel })
              .eq('id', d.territoryId);
            if (fortifyErr) {
              console.error('[ingest_run] territory fortify (best-effort):', fortifyErr.message);
            }
          }

          // ─── (b) PUIS LES OUVERTURES ─────────────────────────────────────
          for (const o of contestPlan.opens) {
            const { error: openErr } = await supabase.from('territory_contests').insert({
              territory_id: o.territoryId,
              attacker_type: o.attackerType,
              attacker_id: o.attackerId,
              source_activity_id: o.sourceActivityId,
              overlap_ratio: o.overlapRatio,
              started_at: new Date(o.startedAtMs).toISOString(),
              expires_at: new Date(o.expiresAtMs).toISOString(),
            });
            if (openErr) {
              // 23505 = `territory_contests_one_active_per_territory` : un rival
              // a ouvert la contestation entre notre lecture et notre écriture.
              // Une contestation existe sur cette zone — c'est le résultat voulu,
              // et c'est LUI qui passera le territoire en `contested`.
              if (openErr.code !== '23505') {
                console.error('[ingest_run] contest open (best-effort):', openErr.message);
              }
              continue;
            }
            // §5.3 : la zone passe CONTESTÉE (la carte la peint en violet). La
            // garde `in('state', …)` évite d'écraser un état qui aurait changé
            // entre-temps (transfert par le job, purge…).
            const { error: markErr } = await supabase
              .from('territories')
              .update({ state: TERRITORY_STATE_CONTESTED })
              .eq('id', o.territoryId)
              .in('state', ['owned_personal', 'owned_crew', 'defended']);
            if (markErr) {
              console.error('[ingest_run] territory contested (best-effort):', markErr.message);
            }
          }
        }
      }
    } catch (e) {
      console.error('[ingest_run] contest fail-safe (course créditée):', e);
    }

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
      detectOutpost(userId, crew.crewId, density, centroid, activity),
      detectRoute(
        userId,
        crew.crewId,
        runId,
        states,
        hexes[0],
        hexes[hexes.length - 1],
        now,
        activity,
      ),
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
    if (crew.crewId !== null) {
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
    const contestedHexes = await handleContested(
      userId,
      crew.crewId,
      runId,
      request.cityId,
      decision.results,
      states,
      now,
      activity,
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
    if (crew.crewId !== null && loopTrace !== null) {
      const boundaryCtx: BoundaryClaimContext = {
        userId,
        userCreatedAt: new Date(profile.created_at),
        now,
        cityId: request.cityId,
        density,
        crewId: crew.crewId,
        activity,
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
      } else {
        // Pas de complétion : peut-on OUVRIR ? La décision (boucle déjà fermée,
        // run vérifié, géométrie fermable) est PURE et vit dans boundary_open.ts.
        //
        // ⚠️ `activity` EST OBLIGATOIRE ICI, et ce n'est pas une précaution de
        // style : l'appel précédent était `detectOpenBoundary(loopTrace)`, sans
        // discipline. Un cycliste ouvrait donc une frontière au plancher de la
        // COURSE (périmètre complété 1 km au lieu de 5 km — facteur 5), puis en
        // capturait l'intérieur au plafond d'aire VÉLO. Symétriquement, une
        // sortie vélo qui s'auto-intersecte sur ~2,4 km était lue comme une
        // BOUCLE sous les règles course et n'ouvrait rien du tout.
        const open = decideOpenBoundary({
          trace: loopTrace,
          activity: boundaryCtx.activity,
          loopClosed,
          finisherVerified,
        });
        if (open) {
          // Nom de la frontière : ville déclarée (secteur) ou défaut sobre.
          // MVP : le vrai secteur (« République ») viendra d'un géocodage V1 ;
          // ici on rattache à la ville déclarée pour un libellé lisible.
          //
          // ⚠️ BLOCAGE N°1 DE L'AUDIT, fermé à la source. `CITIES[request.cityId]`
          // était un accès NON gardé sur un cityId venu de la BASE et non de
          // `CITIES` : dès qu'une 3e ville existait, il levait un TypeError avalé
          // par le catch global → 500 sur une course pourtant ÉCRITE. Le coureur
          // voyait un échec après avoir capturé.
          // Le nom vient maintenant de la LIGNE `city_zones` déjà lue (donc de la
          // même source que le rattachement lui-même), et non d'une table compilée
          // dans le binaire. Hors zone, aucun nom n'est inventé : « Secteur ».
          const boundaryName = cityZone?.name ?? 'Secteur';
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
    if (runVerified) {
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
        // Le monde de CETTE sortie : il sera OPPOSÉ à celui de chaque fenêtre.
        activity,
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
    const challengeUpdates = await processChallenges(
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
      // L'AIRE DE LA BOUCLE DÉCRIT-ELLE LE GAIN ? `territories.area_m2` porte
      // l'anneau ENTIER, et `buildTerritoryRow` l'écrit dès qu'UNE cellule a
      // été capturée. Ce drapeau dit au client que l'intérieur n'est pas
      // intégralement à lui — plafond d'aire, plafond quotidien, zone privée,
      // zone interdite, ou cellule qu'un rival garde — donc que cette aire
      // SURESTIME ce qu'il a obtenu. Décidé par le moteur PUR, jamais ici.
      ...(loopInteriorPartial({ interiorCells, results: decision.results, capReached })
        ? { interiorPartial: true }
        : {}),
      ...(loopRejectedReason !== undefined ? { loopRejectedReason } : {}),
      ...(loopAssisted ? { loopAssisted: true as const } : {}),
      // `undefined` plutôt que 0 : « il ne manquait rien » et « on ne dit rien »
      // ne sont pas la même phrase, et l'écran doit pouvoir les distinguer.
      ...(loopMissingM !== undefined ? { loopMissingM } : {}),
      // Le CHIFFRE HÉROS de l'écran de résultat (L12 — « les m² dominent »).
      // Absent quand aucun territoire n'a été écrit : l'app affiche alors une
      // phrase, jamais un « 0 m² » (constitution — pas de zéro nu).
      // ⚠️ À lire AVEC `interiorPartial` : quand ce drapeau est là, cette aire
      // SURESTIME ce qui a été obtenu, et ne doit pas être présentée comme le
      // gain (voir son commentaire plus haut).
      ...(loopAreaM2 !== undefined ? { loopAreaM2 } : {}),
      hexes: {
        claimed: decision.totals.claimed,
        stolen: decision.totals.stolen,
        defended: decision.totals.defended,
        pioneer: decision.totals.pioneer,
        blocked: decision.totals.blocked,
        // A-41 : zones co-courues payées en relais (jamais dans blocked).
        ...(decision.totals.coCaptured > 0 ? { coCaptured: decision.totals.coCaptured } : {}),
      },
      pointsAwarded: score.points,
      fouleesAwarded: score.foulees,
      xpAwarded: score.xp,
      streak,
      ...(streakAfter !== undefined ? { streakAfter } : {}),
      results: decision.results,
      newBadges,
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
      // PIONNIER : cette course a ouvert une commune vierge (nom RÉEL de
      // geo.api.gouv.fr). Le client logge city_opened et peut célébrer d'ici.
      ...(communeOpened !== undefined ? { communeOpened } : {}),
    };
    await persistCelebration(runId, response, score.points);
    return json(response);

  } catch (err) {
    // Le détail reste dans les logs serveur ; la réponse est GÉNÉRIQUE (audit sécurité) :
    // `${err}` exposait des internals (noms de tables/colonnes, messages Postgres, chemins)
    // à tout utilisateur authentifié → cartographie gratuite du backend pour un attaquant.
    // Aligné sur strava_import:239, qui faisait déjà ça correctement.
    console.error('ingest_run:', err);
    return json({ error: 'internal_error' }, 500);
  }
});

// ─── Étapes du handler ───────────────────────────────────────────────────────

/** Vocabulaire d'outcome attendu par la RPC claim_hexes (0005). */
function rpcOutcome(r: HexClaimResult): 'neutral' | 'steal' | 'defend' | 'pioneer' | 'support' {
  switch (r.outcome) {
    case 'claimed_neutral':
      return r.pioneer ? 'pioneer' : 'neutral';
    case 'stolen':
      return 'steal';
    // A-41 : relais → points par la RPC SANS écriture hex_claims (0041).
    case 'co_captured':
      return 'support';
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
