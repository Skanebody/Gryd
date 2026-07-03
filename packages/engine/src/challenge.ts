/**
 * GRYD — engine/challenge.ts (AMENDEMENT-07 §5/§7/§9, motivation §15-§16/§9.2/§10).
 * Fonctions PURES : aucune I/O, aucune horloge. L'appelant (ingest_run / jobs)
 * lit l'état, appelle ces fonctions, persiste. Tous les seuils/poids viennent de
 * @klaim/shared/game-rules — AUCUN nombre magique ici.
 *
 * Couvre :
 *  - challengeProgress(goal, stat) : avancement 0..1 + done vers l'objectif ;
 *  - meetsPersonalMinimum(min, contribution) : le minimum perso souple (§8.3) ;
 *  - coopetitionScore(inputs) : score coopétitif MULTI-CRITÈRES (§9.2, pas que
 *    la vitesse — régularité/défense/participation/exploration/fiabilité) ;
 *  - leaderboardVisibility(playStyle, discreet) : niveaux visibles par défaut
 *    (§10.2) amputés du global en mode discret (§10.3).
 */
import {
  COOPETITION_WEIGHTS,
  LEADERBOARD_DEFAULT_VISIBILITY,
  type CoopetitionCriterion,
  type LeaderboardLevel,
  type PlayStyleKey,
} from '@klaim/shared/game-rules';

// ─── §5 Avancement d'un challenge ─────────────────────────────────────────────

/** Objectif d'un challenge : atteindre `target` sur une métrique. */
export interface ChallengeGoal {
  target: number;
}

export interface ChallengeProgressResult {
  /** Valeur courante (clampée ≥ 0). */
  current: number;
  /** Objectif. */
  target: number;
  /** Ratio [0..1] vers l'objectif (1 si target ≤ 0). */
  ratio: number;
  /** Objectif atteint (`current >= target`). */
  done: boolean;
  /** Reste à faire (≥ 0). */
  remaining: number;
}

/**
 * Avancement d'un challenge pour une stat courante. PURE. `target ≤ 0` (challenge
 * sans objectif chiffré) → considéré fait (ratio 1). La valeur négative est
 * clampée à 0 (jamais de régression affichée).
 */
export function challengeProgress(goal: ChallengeGoal, stat: number): ChallengeProgressResult {
  const target = goal.target;
  const current = Math.max(0, stat);
  if (target <= 0) {
    return { current, target, ratio: 1, done: true, remaining: 0 };
  }
  const ratio = Math.min(1, current / target);
  return {
    current,
    target,
    ratio,
    done: current >= target,
    remaining: Math.max(0, target - current),
  };
}

// ─── §8.3 Minimum personnel souple ────────────────────────────────────────────

/**
 * Le membre atteint-il le minimum personnel d'un challenge crew (§8.3) ? PURE.
 * `min ≤ 0` → toujours vrai (aucun minimum). Ne juge JAMAIS « pas assez » : sert
 * uniquement à décider si la contribution du membre COMPTE pour l'objectif
 * collectif (anti-passager clandestin), pas à exposer/humilier (§18.2).
 */
export function meetsPersonalMinimum(min: number, contribution: number): boolean {
  if (min <= 0) return true;
  return Math.max(0, contribution) >= min;
}

// ─── §9.2 Score coopétitif multi-critères ─────────────────────────────────────

/**
 * Entrées NORMALISÉES [0..1] par critère (§9.2). L'appelant normalise chaque
 * mesure brute (ex. hexes défendus / cible) AVANT d'appeler cette fonction, pour
 * que le score reste borné et comparable. Une entrée absente = 0.
 */
export type CoopetitionInputs = Partial<Record<CoopetitionCriterion, number>>;

/**
 * Score coopétitif [0..1] d'un membre/crew : somme pondérée des critères
 * (COOPETITION_WEIGHTS). PURE. La vitesse n'est PAS un critère — un coureur
 * régulier, défenseur ou fiable score autant qu'un rapide (§9.2). Chaque entrée
 * est clampée [0..1] avant pondération ; les poids somment à 1.
 */
export function coopetitionScore(inputs: CoopetitionInputs): number {
  let score = 0;
  for (const [criterion, weight] of Object.entries(COOPETITION_WEIGHTS)) {
    const raw = inputs[criterion as CoopetitionCriterion] ?? 0;
    const clamped = Math.min(1, Math.max(0, raw));
    score += clamped * weight;
  }
  return Math.min(1, Math.max(0, score));
}

// ─── §10 Visibilité des leaderboards ──────────────────────────────────────────

/**
 * Niveaux de classement VISIBLES par défaut pour un joueur (§10.2) selon son
 * play_style, amputés du `global` (et de l'exposition large) en mode discret
 * (§10.3 : jamais en leaderboard global). PURE. Renvoie une NOUVELLE liste
 * ordonnée (du plus intime au plus exposé), jamais l'array partagé de constante.
 */
export function leaderboardVisibility(
  playStyle: PlayStyleKey,
  discreet: boolean,
): LeaderboardLevel[] {
  const levels = [...(LEADERBOARD_DEFAULT_VISIBILITY[playStyle] ?? [])];
  if (!discreet) return levels;
  // Mode discret : jamais de global (ni exposition large au-delà de la ville).
  return levels.filter((l) => l !== 'global');
}
