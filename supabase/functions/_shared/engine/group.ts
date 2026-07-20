// GÉNÉRÉ par scripts/sync-game-rules.mjs — ne pas éditer.
// Source : packages/engine/src/group.ts

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
  HEX_LOCK_HOURS,
  type CrewStreakTier,
} from '../game-rules.ts';

const MS_PER_HOUR = 3_600_000;

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

// ─── §3 Extension rétroactive du lock propriétaire (LE RELAIS, A-41 §4) ───────

/**
 * Contexte MINIMAL pour recalculer la borne de lock d'un hex fraîchement capturé
 * quand un relais (co_captured) est crédité au PROPRIÉTAIRE.
 */
export interface RetroLockInput {
  /** Instant de la capture fraîche = hex_claims.claimed_at du PROPRIÉTAIRE. */
  claimedAt: Date;
  /** locked_until courant du propriétaire, ou null si aucun lock posé. */
  currentLockedUntil: Date | null;
  /** Rang du relayeur = coureurs sur la capture (rang 2 = propriétaire + 1 relais). */
  runnersTotal: number;
}

/**
 * Nouvelle borne `locked_until` du PROPRIÉTAIRE quand « Ensemble ça tient » (A-41
 * §4) : un relais crédité sur un hex FRAÎCHEMENT capturé ÉTEND le lock du
 * propriétaire. PURE (aucune horloge, aucune I/O, aucun nombre magique de jeu).
 *
 *   locked_until = claimedAt + HEX_LOCK_HOURS × (1 + groupCaptureBonusPct(runnersTotal))
 *
 * Même barème CAPÉ (+40 %) que la vitesse de capture — anti pay-to-win : on
 * n'accorde QUE du TEMPS de lock, jamais des points ni de la surface.
 *
 * Invariants (A-41 §1, les trois horloges) — retourne `null` (⇒ ne RIEN écrire,
 * on ne touche jamais decay_at / owner / claimed_at / fresh) si :
 *  - `runnersTotal < 2` (solo / rang 1, ou non fini) : le relayeur ne gagne
 *    AUCUNE protection pour lui-même ;
 *  - `claimedAt` invalide (getTime NaN) : entrée inexploitable ;
 *  - la borne calculée n'ALLONGE pas le lock courant (≤ `currentLockedUntil`) :
 *    on n'écrit QUE pour rallonger, JAMAIS pour raccourcir.
 * `currentLockedUntil` null (ou Date invalide) = aucune borne basse → on étend
 * dès `runnersTotal ≥ 2`. Le cooldown (co_captured_cooldown) est décidé en amont
 * par l'appelant : il ne fournit tout simplement pas d'entrée à étendre.
 */
export function retroactiveLockUntil(input: RetroLockInput): Date | null {
  const { claimedAt, currentLockedUntil, runnersTotal } = input;
  // Rang < 2 (ou non fini) : pas de relais → aucune extension. On ne protège
  // jamais le relayeur, et on n'écrit rien sur une entrée dégénérée.
  if (!Number.isFinite(runnersTotal) || Math.floor(runnersTotal) < 2) return null;
  // claimedAt inexploitable (Invalid Date) → on ne calcule rien.
  const claimedMs = claimedAt?.getTime?.();
  if (claimedMs === undefined || Number.isNaN(claimedMs)) return null;

  const bonus = groupCaptureBonusPct(runnersTotal); // barème CAPÉ (+40 %), partagé
  const extendedMs = claimedMs + HEX_LOCK_HOURS * (1 + bonus) * MS_PER_HOUR;

  // On n'écrit QUE pour ALLONGER : borne courante valide et ≥ calcul → null
  // (ne JAMAIS raccourcir un lock). Borne courante nulle/invalide → on étend.
  const currentMs = currentLockedUntil?.getTime?.();
  if (currentMs !== undefined && !Number.isNaN(currentMs) && extendedMs <= currentMs) {
    return null;
  }
  return new Date(extendedMs);
}
