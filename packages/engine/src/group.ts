/**
 * GRYD — engine/group.ts (AMENDEMENT-41 §4 : avantages de GROUPE, anti pay-to-win).
 *
 * Fonctions PURES : aucune I/O, aucune horloge, aucun nombre magique (tout vient
 * de @klaim/shared/game-rules). Deux avantages qui se GAGNENT en jouant, jamais
 * achetés :
 *  1. groupCaptureBonusPct — bonus de VITESSE de remplissage du contrôle quand
 *     des coéquipiers capturent ensemble (barème croissant CAPÉ, solo viable) ;
 *  2. crewStreakTier — palier de régularité collective (streak crew).
 */
import {
  CREW_STREAK_THRESHOLDS,
  GROUP_CAPTURE_BONUS_BY_RUNNERS,
  GROUP_CAPTURE_BONUS_MAX_PCT,
  type CrewStreakTier,
} from '@klaim/shared/game-rules';

// ─── §1 Bonus de capture collectif (CAPÉ) ─────────────────────────────────────

/**
 * Bonus de VITESSE de remplissage du contrôle (part 0-1) pour `runnersOnCapture`
 * coéquipiers co-présents sur la capture. PURE.
 *
 * Anti pay-to-win : se GAGNE par l'effort collectif, s'applique UNIQUEMENT à la
 * vitesse de remplissage (jamais aux points/territoire), et est CAPÉ.
 *  - plancher 0 : `runnersOnCapture ≤ 1` (solo) → 0 % (le solo reste viable) ;
 *  - valeurs négatives / non finies / non entières → tronquées vers le plancher
 *    (max(1, floor)) : jamais un bonus « hors barème » ;
 *  - plafond GROUP_CAPTURE_BONUS_MAX_PCT (+40 %) : au-delà de la table on sature
 *    au cap absolu (5, 6, 100 runners → même cap) ;
 *  - monotone croissant sur le barème.
 */
export function groupCaptureBonusPct(runnersOnCapture: number): number {
  const table = GROUP_CAPTURE_BONUS_BY_RUNNERS;
  // Normalise : plancher 1 (solo), entier, indices hors table → dernier pas (cap).
  const n = Number.isFinite(runnersOnCapture) ? Math.floor(runnersOnCapture) : 1;
  const idx = Math.min(Math.max(1, n), table.length - 1);
  const pct = table[idx] ?? 0;
  // Ceinture-bretelles : ne dépasse JAMAIS le cap absolu, ne descend jamais < 0.
  return Math.min(Math.max(0, pct), GROUP_CAPTURE_BONUS_MAX_PCT);
}

// ─── §2 Crew Streak (régularité collective) ──────────────────────────────────

/**
 * Tier de streak crew pour `activeDays` jours actifs consécutifs. PURE.
 * On prend le PLUS HAUT palier franchi (bornes basses CREW_STREAK_THRESHOLDS) ;
 * sous le 1er palier (ou jours négatifs / non finis) → 'none'. Monotone : plus
 * de jours actifs ne fait jamais RECULER le tier.
 */
export function crewStreakTier(activeDays: number): CrewStreakTier {
  const days = Number.isFinite(activeDays) ? Math.floor(activeDays) : 0;
  const entries = Object.entries(CREW_STREAK_THRESHOLDS) as [
    Exclude<CrewStreakTier, 'none'>,
    number,
  ][];
  let tier: CrewStreakTier = 'none';
  for (const [name, min] of entries) if (days >= min) tier = name;
  return tier;
}
