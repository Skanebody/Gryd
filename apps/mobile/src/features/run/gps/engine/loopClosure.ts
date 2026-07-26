/**
 * GRYD — E07/E08 : FERMETURE DE BOUCLE, machine PURE (testée Deno).
 *
 * Ce que le client peut affirmer, et RIEN de plus. À mi-course, `ingest_run`
 * n'a pas encore parlé : aucune capture, aucun nom de zone, aucune aire ne
 * peut être annoncée (le serveur reste seul juge, cf. loopHint.ts). Le SEUL
 * fait mesuré ici est géométrique : la trace est revenue à ≤
 * LOOP_CLOSE_TOLERANCE_M de son départ ALORS qu'elle a déjà parcouru au moins
 * LOOP_MIN_PERIMETER_M. C'est ce fait — et lui seul — qu'E08 met en scène.
 *
 * Quatre phases, toutes dérivées du snapshot (aucun état) :
 *  - idle     : rien à dire (hors conquête, pas de trace, périmètre insuffisant) ;
 *  - open     : boucle ouverte, il reste de la distance à couvrir ;
 *  - nearMiss : on est REVENU à portée sans passer sous la tolérance —
 *               « boucle non fermée · N m manquants » (pill AMBRE factuelle,
 *               jamais rouge, la course continue) ;
 *  - closed   : fermée géométriquement.
 *
 * L'anti-rebond, lui, a besoin d'une mémoire minuscule (`LoopClosureMemory`) :
 * une boucle ne se re-célèbre pas à chaque tick tant qu'on reste au départ. On
 * ne se ré-arme qu'une fois REPARTI au-delà de la bande de bruit GPS — la
 * bande n'est pas un réglage, c'est GPS_ACCURACY_MAX_M, le budget d'erreur que
 * le moteur s'autorise déjà sur un fix.
 *
 * ─── LES SEUILS SONT CEUX DE LA DISCIPLINE (26/07/2026) ─────────────────────
 * Ce module lisait `LOOP_MIN_PERIMETER_M` et `LOOP_CLOSE_TOLERANCE_M` en dur,
 * c'est-à-dire les seuils de la COURSE À PIED. Depuis que le vélo s'enregistre
 * vraiment, c'était devenu un mensonge d'écran : un cycliste voyait « BOUCLE
 * FERMÉE » à 1 km alors que le serveur exige 5 km à vélo
 * (`BIKE_LOOP_MIN_PERIMETER_M`), et la séquence E08 lui montrait une capture
 * que `ingest_run` allait refuser. La discipline est donc OBLIGATOIRE dans
 * l'entrée — comme dans `RunPipelineState` — et les seuils viennent
 * exclusivement d'`activityRules`, jamais d'une constante recopiée.
 */
import { type Activity, activityRules, GPS_ACCURACY_MAX_M } from '@klaim/shared';

/**
 * Bande d'hystérésis autour de la tolérance serveur : à l'intérieur, l'écart
 * mesuré et la tolérance ne se distinguent pas du bruit GPS. On y refuse à la
 * fois de célébrer (phase `nearMiss`) et de se ré-armer.
 *
 * La tolérance vient de la discipline ; le budget d'erreur GPS, lui, est le
 * MÊME dans les deux mondes (c'est une propriété du capteur, pas de l'effort).
 */
export function loopNearBandM(activity: Activity): number {
  return activityRules(activity).loopCloseToleranceM + GPS_ACCURACY_MAX_M;
}

export type LoopClosurePhase = 'idle' | 'open' | 'nearMiss' | 'closed';

export interface LoopClosureInput {
  /** Hors conquête, aucune capture n'est possible → aucune fermeture à annoncer. */
  readonly conquest: boolean;
  /**
   * DISCIPLINE de la sortie EN COURS — OBLIGATOIRE, sans valeur par défaut :
   * c'est elle qui fixe le périmètre minimal (1 km à pied, 5 km à vélo) et la
   * tolérance de fermeture. Un défaut silencieux ici ferait annoncer une
   * boucle que le serveur refuserait.
   */
  readonly activity: Activity;
  readonly distanceM: number;
  /** Écart vol d'oiseau départ ↔ position (m), `null` si la trace a < 2 points. */
  readonly gapM: number | null;
}

export function loopClosurePhase(i: LoopClosureInput): LoopClosurePhase {
  const rules = activityRules(i.activity);
  if (!i.conquest || i.gapM === null) return 'idle';
  if (i.distanceM < rules.loopMinPerimeterM) return 'idle';
  if (i.gapM <= rules.loopCloseToleranceM) return 'closed';
  if (i.gapM <= loopNearBandM(i.activity)) return 'nearMiss';
  return 'open';
}

/**
 * Mètres qu'il reste à couvrir pour que la boucle COMPTE — l'écart au départ
 * MOINS la tolérance serveur DE LA DISCIPLINE. C'est la formulation honnête de
 * « N m à fermer » : pas la distance au point de départ (le coureur n'a pas à
 * revenir dessus), pas une promesse de capture (le serveur reste juge).
 */
export function loopMissingM(gapM: number, activity: Activity): number {
  return Math.max(0, gapM - activityRules(activity).loopCloseToleranceM);
}

/**
 * Progression de fermeture 0→1, ou `null` si indéterminable. Le pourcentage de
 * la planche (« 72 % ») n'a AUCUNE source directe : il se dérive de deux
 * conditions mesurées, et vaut la PLUS EXIGEANTE des deux (une boucle n'est
 * fermée que si les deux tiennent) :
 *   - distance : part du périmètre minimal déjà parcourue ;
 *   - retour   : part du chemin refait depuis le point le PLUS ÉLOIGNÉ atteint
 *                (`farthestGapM`, mesuré) jusqu'à la tolérance serveur.
 * Toujours affiché comme une approximation (« ~ ») : deux mesures à vol
 * d'oiseau ne font pas une précision au pourcent près.
 */
export function loopClosureProgress(i: {
  /** Même exigence que `LoopClosureInput.activity` : les deux axes en dépendent. */
  readonly activity: Activity;
  readonly distanceM: number;
  readonly gapM: number | null;
  readonly farthestGapM: number | null;
}): number | null {
  if (i.gapM === null || i.farthestGapM === null) return null;
  const rules = activityRules(i.activity);
  const distanceRatio = clamp01(i.distanceM / rules.loopMinPerimeterM);
  const span = i.farthestGapM - rules.loopCloseToleranceM;
  // Jamais sorti de la tolérance : sur l'axe « retour », il n'y a rien à refaire.
  const returnRatio = span <= 0 ? 1 : clamp01((i.farthestGapM - i.gapM) / span);
  return Math.min(distanceRatio, returnRatio);
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

/** Pourcentage entier affichable (0-100) d'une progression 0-1. */
export function progressPercent(progress: number): number {
  return Math.round(clamp01(progress) * 100);
}

/** Mémoire d'anti-rebond de la séquence E08 (une valeur, aucun effet de bord). */
export interface LoopClosureMemory {
  /** Une fermeture peut être célébrée (on est reparti depuis la dernière). */
  readonly armed: boolean;
  /** Fermetures géométriques déjà célébrées pendant cette course. */
  readonly closures: number;
}

export const INITIAL_LOOP_CLOSURE: LoopClosureMemory = { armed: true, closures: 0 };

/**
 * Fait avancer la mémoire d'un tick. `celebrate` n'est vrai qu'à la TRANSITION
 * « pas encore célébrée → fermée ». `nearMiss` ne ré-arme PAS (c'est la bande
 * de bruit : sans hystérésis, un aller-retour du GPS relancerait la séquence).
 */
export function stepLoopClosure(
  prev: LoopClosureMemory,
  phase: LoopClosurePhase,
): { memory: LoopClosureMemory; celebrate: boolean } {
  if (phase === 'closed') {
    if (!prev.armed) return { memory: prev, celebrate: false };
    return { memory: { armed: false, closures: prev.closures + 1 }, celebrate: true };
  }
  if (phase === 'open' && !prev.armed) {
    return { memory: { armed: true, closures: prev.closures }, celebrate: false };
  }
  return { memory: prev, celebrate: false };
}
