/**
 * GRYD — D4 : GUIDAGE LIVE DE BOUCLE de la course RÉELLE (module PUR).
 *
 * La démo guide sur une route scriptée (% de progression) — impossible
 * honnêtement en réel : il n'y a PAS de route connue. Ce qu'on sait vraiment :
 * l'écart À VOL D'OISEAU entre la position courante et le point de départ.
 * C'est une ESTIMATION affichée comme telle (« ~ ») — le serveur reste seul
 * juge de la fermeture (mêmes constantes : LOOP_CLOSE_TOLERANCE_M).
 *
 * Règles d'affichage (live minimal §A — pas de ligne morte) :
 *  - hors conquête ou trace vide → rien (aucune capture possible) ;
 *  - distance < LOOP_MIN_PERIMETER_M → rien (une boucle valide n'existe pas
 *    encore ; afficher « retour 12 m » au départ serait du bruit) ;
 *  - écart ≤ LOOP_CLOSE_TOLERANCE_M → « prête » (le coureur peut terminer,
 *    la tolérance serveur couvre l'écart) ;
 *  - sinon → « retour ~N m » (vol d'oiseau, arrondi lisible 10 m).
 *
 * Les deux seuils cités ci-dessus sont ceux de la DISCIPLINE de la sortie
 * (26/07/2026) : 1 km de périmètre minimal à pied, 5 km à vélo. Les lire en dur
 * revenait à promettre au cycliste une boucle quatre fois trop courte.
 *
 * Zéro import React/natif : testé en Deno comme le reste du moteur.
 */
import { type Activity, activityRules } from '@klaim/shared';
import { haversineM } from './validation';

/** Écart départ ↔ position courante (m), null tant que la trace a < 2 points. */
export function loopGapM(
  points: readonly { lat: number; lng: number }[],
): number | null {
  const first = points[0];
  const last = points[points.length - 1];
  if (first === undefined || last === undefined || points.length < 2) return null;
  return haversineM(first, last);
}

/**
 * Écart MAXIMAL atteint depuis le départ (m) — le point le plus éloigné de la
 * course, mesuré, jamais estimé. C'est la seule référence honnête pour dire
 * « où en est le retour » (E07 : progression de fermeture) : sans elle, un
 * pourcentage serait une invention. null tant que la trace a < 2 points.
 */
export function farthestGapM(
  points: readonly { lat: number; lng: number }[],
): number | null {
  const first = points[0];
  if (first === undefined || points.length < 2) return null;
  let max = 0;
  for (const p of points) max = Math.max(max, haversineM(first, p));
  return max;
}

/** L'indication de boucle affichable — null = rien à dire (pas de ligne morte). */
export type LoopHint =
  /** Retour au départ possible : « BOUCLE · retour ~N m » (vol d'oiseau). */
  | { kind: 'closing'; gapM: number }
  /** Écart sous la tolérance serveur : « BOUCLE PRÊTE — termine quand tu veux ». */
  | { kind: 'ready' };

export function loopHint(input: {
  conquest: boolean;
  /** DISCIPLINE de la sortie — obligatoire : elle porte les deux seuils. */
  activity: Activity;
  distanceM: number;
  gapM: number | null;
}): LoopHint | null {
  const rules = activityRules(input.activity);
  if (!input.conquest || input.gapM === null) return null;
  if (input.distanceM < rules.loopMinPerimeterM) return null;
  if (input.gapM <= rules.loopCloseToleranceM) return { kind: 'ready' };
  return { kind: 'closing', gapM: input.gapM };
}

/** Arrondi lisible 10 m — même règle que les cards live (CARD_ROUND_M). */
const HINT_ROUND_M = 10;
export function roundLoopM(m: number): number {
  return Math.max(HINT_ROUND_M, Math.round(m / HINT_ROUND_M) * HINT_ROUND_M);
}
