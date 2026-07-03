/**
 * GRYD — engine/validation.ts
 * Validité d'une course (SPEC §3.2) + signal de cohérence pas/distance
 * (GRYD Verify MVP, docs/product/GRYD_verify_motion_intelligence_antitriche.md §11).
 *
 * Fonctions PURES : aucune I/O, aucune horloge, aucun accès réseau/DB.
 * Toutes les constantes de jeu viennent de @klaim/shared/game-rules.
 */
import {
  POINT_MAX_ACCURACY_M,
  POINT_MAX_JUMP_M,
  POINT_MAX_SPEED_KMH,
  RUN_AVG_PACE_MAX_S_KM,
  RUN_AVG_PACE_MIN_S_KM,
  RUN_MIN_DISTANCE_M,
  RUN_MIN_DURATION_S,
  SEGMENT_PACE_MAX_S_KM,
  SEGMENT_PACE_MIN_S_KM,
} from '@klaim/shared/game-rules';
import type { RejectReason, RunPoint } from '@klaim/shared/types';

/** Segment continu de points GPS conservés (coupé sur saut > POINT_MAX_JUMP_M). */
export type Segment = RunPoint[];

// Constantes physiques / d'unités — pas des règles de jeu.
const EARTH_RADIUS_M = 6_371_000;
const MS_PER_S = 1_000;
const M_PER_KM = 1_000;
const KMH_PER_M_S = 3.6;

/** Distance haversine en mètres entre deux points (implémentation pure). */
export function haversineM(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(s)));
}

export interface FilterResult {
  /** Segments continus d'au moins 2 points, prêts pour stats + hexing. */
  segments: Segment[];
  /** Nombre de points reçus. */
  totalPoints: number;
  /** Nombre de points conservés dans les segments retournés. */
  keptPoints: number;
}

/**
 * Filtrage des points GPS (§3.2) :
 *  - précision `acc` > POINT_MAX_ACCURACY_M (si présente) → point rejeté ;
 *  - saut > POINT_MAX_JUMP_M entre points consécutifs → segment COUPÉ (le
 *    point ouvre un nouveau segment, il n'est pas rejeté) ;
 *  - vitesse instantanée > POINT_MAX_SPEED_KMH → point rejeté ;
 *  - timestamp dupliqué ou désordonné (dt ≤ 0) → point rejeté.
 * Les points sont triés par timestamp avant traitement. Les segments d'un seul
 * point sont écartés (aucune distance ni durée exploitables).
 */
export function filterPoints(points: RunPoint[]): FilterResult {
  const sorted = [...points].sort((a, b) => a.t - b.t);
  const segments: Segment[] = [];
  let current: Segment = [];

  const closeCurrent = () => {
    if (current.length >= 2) segments.push(current);
    current = [];
  };

  for (const p of sorted) {
    if (p.acc !== undefined && p.acc > POINT_MAX_ACCURACY_M) continue;
    const last = current[current.length - 1];
    if (last === undefined) {
      current.push(p);
      continue;
    }
    const dtS = (p.t - last.t) / MS_PER_S;
    if (dtS <= 0) continue; // dupliqué / désordonné
    const dM = haversineM(last, p);
    if (dM > POINT_MAX_JUMP_M) {
      // Saut GPS : on coupe le segment, le point démarre le suivant.
      closeCurrent();
      current.push(p);
      continue;
    }
    const speedKmh = (dM / dtS) * KMH_PER_M_S;
    if (speedKmh > POINT_MAX_SPEED_KMH) continue; // spike de vitesse → point rejeté
    current.push(p);
  }
  closeCurrent();

  const keptPoints = segments.reduce((n, s) => n + s.length, 0);
  return { segments, totalPoints: points.length, keptPoints };
}

export interface RunStats {
  distanceM: number;
  durationS: number;
  /** Allure moyenne en s/km (0 si distance nulle). */
  avgPaceSKm: number;
}

/**
 * Stats agrégées sur les segments conservés. La durée est la somme des durées
 * de segments (le temps des trous coupés par saut GPS n'est pas compté, par
 * cohérence avec la distance qui ne compte pas non plus ces trous).
 */
export function computeStats(segments: Segment[]): RunStats {
  let distanceM = 0;
  let durationS = 0;
  for (const seg of segments) {
    for (let i = 1; i < seg.length; i++) {
      distanceM += haversineM(seg[i - 1]!, seg[i]!);
    }
    durationS += (seg[seg.length - 1]!.t - seg[0]!.t) / MS_PER_S;
  }
  const avgPaceSKm = distanceM > 0 ? durationS / (distanceM / M_PER_KM) : 0;
  return { distanceM, durationS, avgPaceSKm };
}

export type RunValidation =
  | { status: 'valid' }
  | { status: 'rejected'; reason: RejectReason };

/** Validité globale d'une course (§3.2). L'ordre des raisons est stable. */
export function validateRun(stats: RunStats): RunValidation {
  if (stats.distanceM <= 0) return { status: 'rejected', reason: 'no_valid_points' };
  if (stats.distanceM < RUN_MIN_DISTANCE_M) return { status: 'rejected', reason: 'too_short' };
  if (stats.durationS < RUN_MIN_DURATION_S) return { status: 'rejected', reason: 'too_brief' };
  if (stats.avgPaceSKm < RUN_AVG_PACE_MIN_S_KM) {
    return { status: 'rejected', reason: 'pace_too_fast' };
  }
  if (stats.avgPaceSKm > RUN_AVG_PACE_MAX_S_KM) {
    return { status: 'rejected', reason: 'pace_too_slow' };
  }
  return { status: 'valid' };
}

export interface ClaimableResult {
  /** Segments dont l'allure permet le claim. */
  claimable: Segment[];
  /** Segments conservés en stats mais exclus du claim. */
  excluded: Segment[];
  /**
   * 'partial' dès qu'au moins un segment est exclu (AMENDEMENT-02 §4) —
   * la course reste valide, seuls les segments sûrs claiment.
   */
  status: 'valid' | 'partial';
}

/**
 * Segments autorisés à claimer (§3.2) : allure segment ∈
 * [SEGMENT_PACE_MIN_S_KM ; SEGMENT_PACE_MAX_S_KM]. Un segment sans distance
 * mesurable est exclu (allure indéfinie → non claimable).
 */
export function claimableSegments(segments: Segment[]): ClaimableResult {
  const claimable: Segment[] = [];
  const excluded: Segment[] = [];
  for (const seg of segments) {
    const stats = computeStats([seg]);
    const ok = stats.distanceM > 0 &&
      stats.avgPaceSKm >= SEGMENT_PACE_MIN_S_KM &&
      stats.avgPaceSKm <= SEGMENT_PACE_MAX_S_KM;
    (ok ? claimable : excluded).push(seg);
  }
  return {
    claimable,
    excluded,
    status: excluded.length > 0 ? 'partial' : 'valid',
  };
}

// ─── GRYD Verify MVP — cohérence pas/distance (doc anti-triche §11, règle 3) ──
//
// Ces seuils sont des heuristiques GRYD Verify MVP (pas des règles de jeu §3,
// donc absents de game-rules.ts ; à promouvoir dans les constantes partagées
// quand la motion intelligence V1 les raffinera).

/** motionTrust neutre : aucun signal podomètre → on ne pénalise pas. */
export const MOTION_TRUST_NEUTRAL = 100;
/** En dessous de ce motionTrust, la course est 'flagged' : claims gelés. */
export const MOTION_TRUST_FLAGGED_BELOW = 50;
/**
 * Plancher de plausibilité : une vraie course fait ~1,1-1,5 pas/m ; sous
 * 0,5 pas/m le déplacement n'est clairement pas pédestre (voiture/vélo avec
 * téléphone posé → quasi 0 pas). Le trust est proportionnel jusqu'à ce seuil.
 */
export const STEP_COHERENCE_MIN_STEPS_PER_M = 0.5;

/**
 * Signal motionTrust 0-100 :
 *  - `stepCount` absent → MOTION_TRUST_NEUTRAL (signal indisponible, neutre) ;
 *  - distance non significative (< RUN_MIN_DISTANCE_M) → neutre aussi (le
 *    signal n'est pas fiable sur une distance trop courte) ;
 *  - sinon trust = clamp(100 × (pas/m) / STEP_COHERENCE_MIN_STEPS_PER_M).
 *    Distance significative + pas quasi nuls → trust ≈ 0 → course 'flagged'.
 */
export function stepCoherence(distanceM: number, stepCount?: number): number {
  if (stepCount === undefined) return MOTION_TRUST_NEUTRAL;
  if (distanceM < RUN_MIN_DISTANCE_M) return MOTION_TRUST_NEUTRAL;
  const stepsPerM = Math.max(0, stepCount) / distanceM;
  const trust = Math.floor((stepsPerM / STEP_COHERENCE_MIN_STEPS_PER_M) * 100);
  return Math.min(100, Math.max(0, trust));
}
