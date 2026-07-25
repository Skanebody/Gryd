/**
 * GRYD — MINUTAGE DU REPLAY DE CONQUÊTE (planche E10, « Replay conquête 6-8 s »).
 *
 * La planche fige la partition, à la seconde près :
 *   0 → 0,8 s   contexte     (la carte s'installe, rien ne bouge encore)
 *   0,8 → 3,5 s tracé        (le parcours SE DESSINE)
 *   3,5 → 4,5 s fermeture    (la jonction départ/arrivée s'affirme)
 *   4,5 → 5,8 s remplissage  (la zone se remplit — le payoff)
 *   5,8 → 7,5 s résultat     (l'image finale, partageable telle quelle)
 *
 * Avant ce fichier, `ShareMap` avait UNE rampe unique de 2 400 ms coupée en deux
 * (72 % trace / 28 % remplissage) : ni contexte, ni temps de fermeture, ni
 * respiration finale. La partition vivait dans deux constantes de rendu.
 *
 * PUR : zéro import (Deno-testable). Ne décide RIEN du jeu — c'est du minutage
 * d'animation, et il est normalisé sur [0,1] pour pouvoir être joué à vitesse
 * réduite (animation d'ENTRÉE de l'aperçu) SANS déformer les proportions.
 */

/** Bornes de la partition, en millisecondes depuis le début du replay. */
export const REPLAY_MARKS_MS = {
  contextEnd: 800,
  traceEnd: 3_500,
  closeEnd: 4_500,
  fillEnd: 5_800,
  end: 7_500,
} as const;

/** Durée totale du replay (planche : 6-8 s → 7,5 s). */
export const REPLAY_TOTAL_MS = REPLAY_MARKS_MS.end;

/**
 * Durée de l'animation d'ENTRÉE de l'aperçu. La planche réserve les 7,5 s au
 * bouton « Rejouer » : à l'ouverture de l'écran, la même partition est jouée
 * COMPRIMÉE (mêmes proportions, 2,5× plus vite) pour que la preview soit
 * actionnable tout de suite — un compositeur qui fait attendre 7,5 s avant
 * d'être utilisable serait un temps mort (§A).
 */
export const PREVIEW_INTRO_MS = 3_000;

export type ReplayPhaseId = 'context' | 'trace' | 'close' | 'fill' | 'result';

export interface ReplayPhase {
  /** Phase courante de la partition. */
  phase: ReplayPhaseId;
  /** 0→1 : part du tracé DESSINÉE. */
  traceP: number;
  /** 0→1 : mise en évidence de la fermeture (jonction départ/arrivée). */
  closeP: number;
  /** 0→1 : remplissage de la zone. */
  fillP: number;
  /** La partition est terminée (état final atteint). */
  done: boolean;
}

/** Rampe linéaire bornée de `from`→`to` évaluée en `t` (0 avant, 1 après). */
function ramp(t: number, from: number, to: number): number {
  if (to <= from) return t >= to ? 1 : 0;
  if (t <= from) return 0;
  if (t >= to) return 1;
  return (t - from) / (to - from);
}

/**
 * État du replay à l'instant `tMs` (0 = début). Les valeurs sont MONOTONES : une
 * phase franchie ne redescend jamais — un replay qui « défait » ce qu'il vient de
 * montrer se lirait comme une perte de territoire.
 */
export function replayPhase(tMs: number): ReplayPhase {
  const t = Number.isFinite(tMs) ? Math.max(0, tMs) : 0;
  const m = REPLAY_MARKS_MS;
  const traceP = ramp(t, m.contextEnd, m.traceEnd);
  const closeP = ramp(t, m.traceEnd, m.closeEnd);
  const fillP = ramp(t, m.closeEnd, m.fillEnd);
  const phase: ReplayPhaseId =
    t < m.contextEnd
      ? 'context'
      : t < m.traceEnd
        ? 'trace'
        : t < m.closeEnd
          ? 'close'
          : t < m.fillEnd
            ? 'fill'
            : 'result';
  return { phase, traceP, closeP, fillP, done: t >= m.end };
}

/**
 * Même partition, pilotée par une progression normalisée `p` ∈ [0,1] — ce que
 * fournit une `Animated.Value`. Permet de jouer les 7,5 s (Rejouer) OU l'entrée
 * comprimée avec EXACTEMENT les mêmes proportions.
 */
export function replayPhaseAtProgress(p: number): ReplayPhase {
  const clamped = Number.isFinite(p) ? Math.max(0, Math.min(1, p)) : 0;
  return replayPhase(clamped * REPLAY_TOTAL_MS);
}

/** État FINAL de la partition — reduce motion, ou animation désactivée. */
export const REPLAY_FINAL: ReplayPhase = {
  phase: 'result',
  traceP: 1,
  closeP: 1,
  fillP: 1,
  done: true,
};
