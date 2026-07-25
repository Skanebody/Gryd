/**
 * GRYD — SÉQUENCE NARRATIVE DU RÉSULTAT (planche E09).
 *
 * « Motion narrative < 1,8 s, skippable au tap : hero → zone finale → chiffre →
 * rang/XP → PARTAGER actif. » Cinq temps, un ordre, un plafond dur.
 *
 * Ce qu'il remplace : `StepId` + `STEPS_BY_MODE`, deux constantes MORTES (zéro
 * lecture) laissées dans `course-result.tsx` par une ancienne séquence retirée —
 * l'écran se montrait d'un bloc tout en gardant la carcasse d'un séquenceur.
 *
 * Deux invariants tenus ICI plutôt qu'à l'œil :
 *   1. la séquence entière tient sous 1 800 ms, quelle que soit la base ;
 *   2. l'ordre des temps est celui de la planche, et il ne peut pas se réordonner
 *      (les délais sont strictement croissants).
 * Le SKIP saute directement au dernier temps : la séquence n'est jamais le seul
 * chemin vers l'information (§A — une info portée par la seule animation est une
 * info perdue pour qui coupe les animations).
 *
 * PUR : zéro import (Deno-testable, comme rivalChallenge.ts). La base de temps
 * est passée par l'écran depuis `motion.transitionMs` — aucun nombre magique.
 */

/** Les cinq temps de la planche, dans l'ordre. */
export const REVEAL_STEPS = ['hero', 'zone', 'chiffre', 'progression', 'partage'] as const;
export type RevealStep = (typeof REVEAL_STEPS)[number];

/** Index du dernier temps = état FINAL (skip / reduce motion y vont directement). */
export const REVEAL_LAST_STEP = REVEAL_STEPS.length - 1;

/** Plafond IMPOSÉ par la planche : la séquence entière dure moins que ça. */
export const REVEAL_BUDGET_MS = 1_800;

/**
 * Base de temps MAXIMALE tolérée. Le budget doit couvrir les 5 temps (4 écarts
 * depuis le hero) PLUS le fondu du dernier — soit 5 bases — et on garde une base
 * de marge pour rester STRICTEMENT sous le plafond. D'où la division par 6.
 * Avec la base réelle du projet (motion.transitionMs = 225) le plafond n'est
 * jamais atteint : il n'existe que pour qu'un futur token exotique ne puisse pas
 * faire déborder la séquence sans que ce fichier le sache.
 */
export const REVEAL_MAX_BASE_MS = Math.floor(REVEAL_BUDGET_MS / (REVEAL_STEPS.length + 1));

/**
 * Délai d'apparition de chaque temps, en ms depuis l'ouverture de l'écran.
 * `stepMs` = base de temps (l'écran passe `motion.transitionMs`). Bornée pour que
 * l'ensemble — dernier délai + sa propre transition — reste sous le budget : une
 * base absurde ne peut pas faire déborder la séquence.
 */
export function revealDelaysMs(stepMs: number): readonly number[] {
  const safe = Number.isFinite(stepMs) && stepMs > 0 ? stepMs : 1;
  const base = Math.min(safe, REVEAL_MAX_BASE_MS);
  return REVEAL_STEPS.map((_, i) => Math.round(i * base));
}

/** Durée totale (dernier temps + son fondu) — toujours < REVEAL_BUDGET_MS. */
export function revealTotalMs(stepMs: number): number {
  const delays = revealDelaysMs(stepMs);
  const last = delays[delays.length - 1] ?? 0;
  const base = delays[1] ?? 0;
  return last + base;
}

/**
 * Index du temps atteint à `elapsedMs`. Sert au rendu ET aux tests : le même
 * calcul décide ce qui est monté à l'écran.
 */
export function revealStepAt(elapsedMs: number, stepMs: number): number {
  const t = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  const delays = revealDelaysMs(stepMs);
  let step = 0;
  for (let i = 0; i < delays.length; i += 1) {
    if (t >= (delays[i] ?? 0)) step = i;
  }
  return step;
}

/** Le temps `step` est-il atteint ? (garde de rendu, lisible côté écran). */
export function revealReached(currentStep: number, step: RevealStep): boolean {
  return currentStep >= REVEAL_STEPS.indexOf(step);
}
