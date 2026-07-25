/**
 * GRYD — engine/validation.ts
 * Validité d'une course (SPEC §3.2) + signal de cohérence pas/distance
 * (GRYD Verify MVP, docs/product/GRYD_verify_motion_intelligence_antitriche.md §11).
 *
 * Fonctions PURES : aucune I/O, aucune horloge, aucun accès réseau/DB.
 * Toutes les constantes de jeu viennent de @klaim/shared/game-rules.
 */
import { type Activity, activityRules, DEFAULT_ACTIVITY } from '@klaim/shared/game-rules';
import type { RejectReason, RunPoint } from '@klaim/shared/types';

/** Segment continu de points GPS conservés (coupé sur saut > `pointMaxJumpM`). */
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
 * Filtrage des points GPS (§3.2), bornes lues dans la DISCIPLINE :
 *  - précision `acc` > `pointMaxAccuracyM` (si présente) → point rejeté ;
 *  - saut > `pointMaxJumpM` entre points consécutifs → segment COUPÉ (le
 *    point ouvre un nouveau segment, il n'est pas rejeté) ;
 *  - vitesse instantanée > `pointMaxSpeedKmh` → point rejeté ;
 *  - timestamp dupliqué ou désordonné (dt ≤ 0) → point rejeté.
 * Les points sont triés par timestamp avant traitement. Les segments d'un seul
 * point sont écartés (aucune distance ni durée exploitables).
 *
 * `activity` absente ⇒ 'run' : comportement historique STRICTEMENT inchangé
 * (les bornes `run` d'ACTIVITY_RULES RÉFÉRENCENT les constantes §3.2 d'origine).
 * À vélo la borne de vitesse monte à 80 km/h : sans elle, chaque point d'un
 * cycliste à 30 km/h serait jeté un par un et la sortie finirait
 * `no_valid_points` — le jeu traiterait un pratiquant honnête en tricheur.
 */
export function filterPoints(
  points: RunPoint[],
  activity: Activity = DEFAULT_ACTIVITY,
): FilterResult {
  const rules = activityRules(activity);
  const sorted = [...points].sort((a, b) => a.t - b.t);
  const segments: Segment[] = [];
  let current: Segment = [];

  const closeCurrent = () => {
    if (current.length >= 2) segments.push(current);
    current = [];
  };

  for (const p of sorted) {
    if (p.acc !== undefined && p.acc > rules.pointMaxAccuracyM) continue;
    const last = current[current.length - 1];
    if (last === undefined) {
      current.push(p);
      continue;
    }
    const dtS = (p.t - last.t) / MS_PER_S;
    if (dtS <= 0) continue; // dupliqué / désordonné
    const dM = haversineM(last, p);
    if (dM > rules.pointMaxJumpM) {
      // Saut GPS : on coupe le segment, le point démarre le suivant.
      closeCurrent();
      current.push(p);
      continue;
    }
    const speedKmh = (dM / dtS) * KMH_PER_M_S;
    if (speedKmh > rules.pointMaxSpeedKmh) continue; // spike de vitesse → point rejeté
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

/**
 * Validité globale d'une sortie (§3.2). L'ordre des raisons est stable.
 * Les bornes sont lues dans la DISCIPLINE déclarée ; `activity` absente ⇒ 'run'
 * (comportement historique inchangé). Une trace à 30 km/h reste donc
 * `pace_too_fast` tant que la discipline n'est pas DÉCLARÉE : le vélo se dit,
 * il ne se devine pas — c'est la seule lecture honnête d'une donnée muette.
 */
export function validateRun(
  stats: RunStats,
  activity: Activity = DEFAULT_ACTIVITY,
): RunValidation {
  const rules = activityRules(activity);
  if (stats.distanceM <= 0) return { status: 'rejected', reason: 'no_valid_points' };
  if (stats.distanceM < rules.minDistanceM) return { status: 'rejected', reason: 'too_short' };
  if (stats.durationS < rules.minDurationS) return { status: 'rejected', reason: 'too_brief' };
  if (stats.avgPaceSKm < rules.avgPaceMinSKm) {
    return { status: 'rejected', reason: 'pace_too_fast' };
  }
  if (stats.avgPaceSKm > rules.avgPaceMaxSKm) {
    return { status: 'rejected', reason: 'pace_too_slow' };
  }
  // Plafond anti-abus (audit sécurité) : au-delà, le payload est implausible pour UNE
  // session → rejet. Coupe les traces forgées géantes et l'amplification DoS. (La durée
  // est déjà bornée par l'allure max : pas de plafond de durée dédié — voir game-rules.)
  if (stats.distanceM > rules.maxDistanceM) return { status: 'rejected', reason: 'too_far' };
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
 * [`segmentPaceMinSKm` ; `segmentPaceMaxSKm`] de la DISCIPLINE. Un segment sans
 * distance mesurable est exclu (allure indéfinie → non claimable).
 * `activity` absente ⇒ 'run' (comportement historique inchangé).
 */
export function claimableSegments(
  segments: Segment[],
  activity: Activity = DEFAULT_ACTIVITY,
): ClaimableResult {
  const rules = activityRules(activity);
  const claimable: Segment[] = [];
  const excluded: Segment[] = [];
  for (const seg of segments) {
    const stats = computeStats([seg]);
    const ok = stats.distanceM > 0 &&
      stats.avgPaceSKm >= rules.segmentPaceMinSKm &&
      stats.avgPaceSKm <= rules.segmentPaceMaxSKm;
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
 * Signal motionTrust 0-100, LU DANS LE SENS DE LA DISCIPLINE. Dans les deux
 * cas la règle physiologique est la MÊME et le seuil est le MÊME
 * (STEP_COHERENCE_MIN_STEPS_PER_M) — seul le sens de lecture s'inverse, parce
 * que pédaler ne produit pas de pas :
 *  - `stepCount` absent → MOTION_TRUST_NEUTRAL (signal indisponible, neutre) ;
 *  - distance non significative (< `minDistanceM` de la discipline) → neutre
 *    aussi (le signal n'est pas fiable sur une distance trop courte) ;
 *  - `run`  : trust = clamp(100 × (pas/m) / seuil). Distance significative +
 *    pas quasi nuls → trust ≈ 0 → sortie 'flagged' (véhicule ou vélo non
 *    déclaré) ;
 *  - `bike` : trust = clamp(100 × (1 − (pas/m) / seuil)). Zéro pas → 100 (c'est
 *    l'attendu d'un cycliste) ; au-dessus du seuil « c'est pédestre » → 0, donc
 *    'flagged' : une COURSE À PIED déclarée en vélo n'ira pas capturer un
 *    territoire vélo avec des foulées. Aucun nouveau nombre n'est inventé : la
 *    frontière « pédestre / non pédestre » est celle qui existait déjà.
 *
 * ⚠️ Le signal reste OPTIONNEL des deux côtés : un client qui n'envoie pas de
 * `stepCount` n'est JAMAIS pénalisé, et 'flagged' ne rejette pas la sortie (les
 * stats restent, seule la capture est gelée). Le calibrage terrain de la
 * branche vélo (un podomètre peut-il compter des « pas » sur des pavés ?) reste
 * à faire — aucune donnée réelle ne l'a encore éprouvé.
 */
export function stepCoherence(
  distanceM: number,
  stepCount?: number,
  activity: Activity = DEFAULT_ACTIVITY,
): number {
  if (stepCount === undefined) return MOTION_TRUST_NEUTRAL;
  if (distanceM < activityRules(activity).minDistanceM) return MOTION_TRUST_NEUTRAL;
  const stepsPerM = Math.max(0, stepCount) / distanceM;
  const ratio = stepsPerM / STEP_COHERENCE_MIN_STEPS_PER_M;
  const trust = Math.floor((activity === 'bike' ? 1 - ratio : ratio) * 100);
  return Math.min(100, Math.max(0, trust));
}
