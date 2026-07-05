/**
 * GRYD — engine/scoring.ts
 * Points de course → multiplicateurs → Foulées / XP.
 * SPEC §3.4 + AMENDEMENT-02 §3/§6 + AMENDEMENT-23 §D (formule §23 MULTIPLICATIVE).
 * Fonctions PURES. Tous les arrondis se font à l'entier INFÉRIEUR (Math.floor).
 *
 * ORDRE DE CALCUL (documenté, gelé) — du doc §23 puis modificateurs GRYD :
 *
 *   1. FORMULE DOC (§23), PAR ZONE, dans decideClaims :
 *        base_zone = POINTS_BASE_PER_ZONE × coeff_action × coeff_contexte
 *      (+ bonus pionnier ADDITIF de première capture). Somme = `basePoints`.
 *   2. VERIFY (§23), au niveau course, dans computeScore :
 *        × verifyFactor(trust)  — 1,0 (≥80) / 0,5 (≥60) / 0 (<60, stats only).
 *   3. STREAK (régularité, orthogonal, NON pay-to-win) : × streakMultiplier (cap ×1,5).
 *   4. PERFORMANCE (effort/fiabilité, orthogonal) : × performanceModifier (0,9-1,15).
 *
 *   points_finaux = floor(basePoints × verify × streak × perf).
 *
 * Streak et performance sont des MULTIPLICATEURS EXTERNES à la formule doc
 * (régularité & effort) — jamais des bonus achetés. Les bonus PAYANTS
 * (bonuses.ts) ne touchent JAMAIS ce calcul (coffre/XP/cosmétiques seulement).
 * verify_factor fait partie de la formule doc §23 ; il précède streak/perf.
 */
import {
  ACTION_COEFF,
  type ActionCoeffKey,
  CLUB_FOULEES_MULTIPLIER,
  CONTEXT_COEFF,
  type ContextCoeffKey,
  FOULEES_RATE_OF_POINTS,
  PERFORMANCE_BONUS_CAP,
  PERFORMANCE_BONUS_FLOOR,
  POINTS_BASE_PER_ZONE,
  STREAK_MULTIPLIER_CAP,
  STREAK_MULTIPLIER_STEP,
  VERIFY_FACTOR_FULL,
  VERIFY_FACTOR_NONE,
  VERIFY_FACTOR_PARTIAL,
  VERIFY_FULL_MIN,
  VERIFY_PARTIAL_MIN,
  XP_RATE_OF_POINTS,
} from '@klaim/shared/game-rules';

// ═══════════════════════════════════════════════════════════════════════════
// AMENDEMENT-23 §D / doc §23 — FORMULE DE POINTS MULTIPLICATIVE (primitives).
// ═══════════════════════════════════════════════════════════════════════════

/** Coefficient d'action (doc §23) — conquête 1 / reprise 1,3 / défense 1,2 /
 * boucle propre 1,1 / route 0,5. PURE. */
export function actionCoeff(action: ActionCoeffKey): number {
  return ACTION_COEFF[action];
}

/**
 * Coefficient de CONTEXTE effectif (doc §23) : le PLUS FORT contexte applicable
 * (un seul multiplicateur de contexte, jamais de cumul) ; 1,0 si aucun. PURE.
 * `zone_bonus` = hotspot de carte (gagné par le lieu, PAS acheté).
 */
export function contextCoeff(contexts: readonly ContextCoeffKey[] = []): number {
  let best = 1;
  for (const c of contexts) {
    const v = CONTEXT_COEFF[c];
    if (v > best) best = v;
  }
  return best;
}

/**
 * Facteur VERIFY (doc §23) selon le score de confiance `trust` (0-100,
 * min(gpsTrust, motionTrust)) : ≥80 → 1,0 (plein) ; ≥60 → 0,5 (partiel) ;
 * <60 → 0 (stats only, aucune capture). PURE.
 */
export function verifyFactor(trust: number): number {
  if (trust >= VERIFY_FULL_MIN) return VERIFY_FACTOR_FULL;
  if (trust >= VERIFY_PARTIAL_MIN) return VERIFY_FACTOR_PARTIAL;
  return VERIFY_FACTOR_NONE;
}

/**
 * Palier de verify nommé (pour l'UI/le statut de course) : `full` / `partial` /
 * `stats_only`. PURE. Miroir de verifyFactor.
 */
export type VerifyTier = 'full' | 'partial' | 'stats_only';
export function verifyTier(trust: number): VerifyTier {
  if (trust >= VERIFY_FULL_MIN) return 'full';
  if (trust >= VERIFY_PARTIAL_MIN) return 'partial';
  return 'stats_only';
}

/**
 * Points de BASE d'une zone (doc §23), AVANT verify/streak/perf : arrondi entier
 * INFÉRIEUR de POINTS_BASE_PER_ZONE × coeff_action × coeff_contexte, + un bonus
 * pionnier ADDITIF (première capture, hors formule multiplicative). PURE.
 * L'arrondi par zone garde la somme `basePoints` en entiers et rend le calcul
 * explicable zone par zone (une zone = un nombre entier de points de base).
 */
export function zoneBasePoints(
  action: ActionCoeffKey,
  contexts: readonly ContextCoeffKey[] = [],
  pioneerBonus = 0,
): number {
  const base = POINTS_BASE_PER_ZONE * actionCoeff(action) * contextCoeff(contexts);
  return Math.floor(base) + Math.max(0, pioneerBonus);
}

// ═══════════════════════════════════════════════════════════════════════════
// Multiplicateurs EXTERNES à la formule doc (régularité + effort, orthogonaux).
// ═══════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════
// Assemblage : basePoints (formule §23) × verify × streak × perf → Foulées / XP.
// ═══════════════════════════════════════════════════════════════════════════

export interface ScoreInput {
  /**
   * Points de BASE de la course (doc §23) : somme de zoneBasePoints par hex
   * (POINTS_BASE_PER_ZONE × action × contexte + pionnier), calculée par
   * decideClaims. AVANT verify/streak/perf.
   */
  basePoints: number;
  streakWeeks: number;
  performance?: PerformanceInput;
  isClub: boolean;
  /**
   * Facteur VERIFY (doc §23) déjà résolu par l'appelant via verifyFactor(trust)
   * — 1,0 (plein) / 0,5 (partiel) / 0 (stats only). DÉFAUT 1,0 : un appelant qui
   * gère le verify en amont (gel des claims) ou n'en a pas (démo) garde le
   * comportement historique. Appliqué AVANT streak/perf.
   */
  verifyFactor?: number;
}

export interface ScoreResult {
  /** Points finaux : floor(base × verify × streak × perf). */
  points: number;
  /** Foulées : floor(points finaux × 10 % × (×1,5 si Club)). */
  foulees: number;
  /**
   * XP permanent : floor(base × verify × XP_RATE_OF_POINTS) — D18, jamais boosté
   * par streak/perf. Le verify_factor fait partie de la formule doc §23 (une
   * capture partielle vaut moitié en XP aussi), streak/perf restent EXCLUS.
   */
  xp: number;
  streakMultiplier: number;
  performanceModifier: number;
  /** Facteur verify appliqué (1,0 / 0,5 / 0) — pour l'explicabilité post-run. */
  verifyFactor: number;
}

export function computeScore(input: ScoreInput): ScoreResult {
  const streak = streakMultiplier(input.streakWeeks);
  const perf = performanceModifier(input.performance);
  const verify = input.verifyFactor ?? VERIFY_FACTOR_FULL;
  const verified = input.basePoints * verify;
  const points = Math.floor(verified * streak * perf);
  const foulees = Math.floor(
    points * FOULEES_RATE_OF_POINTS * (input.isClub ? CLUB_FOULEES_MULTIPLIER : 1),
  );
  const xp = Math.floor(verified * XP_RATE_OF_POINTS);
  return {
    points,
    foulees,
    xp,
    streakMultiplier: streak,
    performanceModifier: perf,
    verifyFactor: verify,
  };
}

/**
 * Répartit un total FINAL (après multiplicateurs) sur des points par hex, sans
 * jamais passer un hex sous 0 : la RPC claim_hexes crédite season_scores et les
 * Foulées à partir de la somme des points par hex — cette somme doit donc
 * valoir exactement le total multiplié/floored.
 *  - delta > 0 (streak/perf > 1) : ajouté au premier hex à points ;
 *  - delta < 0 (verify/perf < 1)  : retiré séquentiellement sans passer sous 0.
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
