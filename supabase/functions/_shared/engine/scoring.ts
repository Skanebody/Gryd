// GÉNÉRÉ par scripts/sync-game-rules.mjs — ne pas éditer.
// Source : packages/engine/src/scoring.ts

/**
 * GRYD — engine/scoring.ts
 * Points de course → multiplicateurs → Foulées / XP (SPEC §3.4 + AMENDEMENT-02 §3/§6).
 * Fonctions PURES. Tous les arrondis se font à l'entier INFÉRIEUR (Math.floor).
 */
import {
  CLUB_FOULEES_MULTIPLIER,
  FOULEES_RATE_OF_POINTS,
  PERFORMANCE_BONUS_CAP,
  PERFORMANCE_BONUS_FLOOR,
  STREAK_MULTIPLIER_CAP,
  STREAK_MULTIPLIER_STEP,
  XP_RATE_OF_POINTS,
} from '../game-rules.ts';

/**
 * Multiplicateur de streak hebdomadaire (§3.4) : +STREAK_MULTIPLIER_STEP par
 * semaine consécutive (streakWeeks = semaines consécutives déjà validées,
 * 0 → ×1), plafonné à STREAK_MULTIPLIER_CAP (×1,5, atteint à 5 semaines).
 */
export function streakMultiplier(streakWeeks: number): number {
  const raw = 1 + Math.max(0, streakWeeks) * STREAK_MULTIPLIER_STEP;
  return Math.min(raw, STREAK_MULTIPLIER_CAP);
}

export interface PerformanceInput {
  /**
   * Fiabilité des données de la course, 0-1 (MVP : gpsTrust/100).
   * 0,5 = baseline neutre ; absente → neutre.
   */
  dataReliability?: number;
  /** Coureur régulier (MVP : streak en cours). */
  isRegular?: boolean;
}

// Poids heuristiques du modificateur performance MVP (AMENDEMENT-02 §3 :
// « appliqué simplement — régularité + fiabilité des données », raffinement V1).
// Ce ne sont pas des règles §3 gelées : seules les BORNES le sont
// (PERFORMANCE_BONUS_FLOOR / PERFORMANCE_BONUS_CAP, importées de game-rules).
const PERF_REGULARITY_BONUS = 0.1;
const PERF_RELIABILITY_BASELINE = 0.5;
const PERF_RELIABILITY_WEIGHT = 0.3;

/**
 * Modificateur performance MVP, TOUJOURS borné à
 * [PERFORMANCE_BONUS_FLOOR ; PERFORMANCE_BONUS_CAP] (jamais dominant).
 * Sans entrée → 1,0 exactement (défaut neutre).
 *   raw = 1 + (régulier ? +0,1 : 0) + (fiabilité − 0,5) × 0,3
 */
export function performanceModifier(input: PerformanceInput = {}): number {
  const reliability = Math.min(
    1,
    Math.max(0, input.dataReliability ?? PERF_RELIABILITY_BASELINE),
  );
  const raw = 1 +
    (input.isRegular ? PERF_REGULARITY_BONUS : 0) +
    (reliability - PERF_RELIABILITY_BASELINE) * PERF_RELIABILITY_WEIGHT;
  return Math.min(PERFORMANCE_BONUS_CAP, Math.max(PERFORMANCE_BONUS_FLOOR, raw));
}

export interface ScoreInput {
  /** Points BRUTS de la course : somme du barème §3.4 par hex (decideClaims). */
  basePoints: number;
  streakWeeks: number;
  performance?: PerformanceInput;
  isClub: boolean;
}

export interface ScoreResult {
  /** Points finaux : floor(bruts × streak × performance). */
  points: number;
  /** Foulées : floor(points finaux × 10 % × (×1,5 si Club)). */
  foulees: number;
  /** XP permanent : floor(points BRUTS × XP_RATE_OF_POINTS) — D18, jamais boosté. */
  xp: number;
  streakMultiplier: number;
  performanceModifier: number;
}

export function computeScore(input: ScoreInput): ScoreResult {
  const streak = streakMultiplier(input.streakWeeks);
  const perf = performanceModifier(input.performance);
  const points = Math.floor(input.basePoints * streak * perf);
  const foulees = Math.floor(
    points * FOULEES_RATE_OF_POINTS * (input.isClub ? CLUB_FOULEES_MULTIPLIER : 1),
  );
  const xp = Math.floor(input.basePoints * XP_RATE_OF_POINTS);
  return { points, foulees, xp, streakMultiplier: streak, performanceModifier: perf };
}

/**
 * Répartit un total FINAL (après multiplicateurs) sur des points par hex, sans
 * jamais passer un hex sous 0 : la RPC claim_hexes crédite season_scores et les
 * Foulées à partir de la somme des points par hex — cette somme doit donc
 * valoir exactement le total multiplié/floored.
 *  - delta > 0 (streak/perf > 1) : ajouté au premier hex à points ;
 *  - delta < 0 (perf < 1)        : retiré séquentiellement sans passer sous 0.
 */
export function distributePointsAdjustment(
  perHexPoints: readonly number[],
  targetTotal: number,
): number[] {
  const adjusted = [...perHexPoints];
  const base = adjusted.reduce((s, p) => s + p, 0);
  let delta = targetTotal - base;
  if (delta === 0 || adjusted.length === 0) return adjusted;

  if (delta > 0) {
    // Bonus : sur le premier hex qui score (ou le premier tout court).
    const i = Math.max(0, adjusted.findIndex((p) => p > 0));
    adjusted[i]! += delta;
    return adjusted;
  }
  // Malus : retiré hex par hex, borné à 0.
  for (let i = 0; i < adjusted.length && delta < 0; i++) {
    const take = Math.min(adjusted[i]!, -delta);
    adjusted[i]! -= take;
    delta += take;
  }
  return adjusted;
}
