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
 * Zéro import React/natif : testé en Deno comme le reste du moteur.
 */
import { LOOP_CLOSE_TOLERANCE_M, LOOP_MIN_PERIMETER_M } from '@klaim/shared';
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

/** L'indication de boucle affichable — null = rien à dire (pas de ligne morte). */
export type LoopHint =
  /** Retour au départ possible : « BOUCLE · retour ~N m » (vol d'oiseau). */
  | { kind: 'closing'; gapM: number }
  /** Écart sous la tolérance serveur : « BOUCLE PRÊTE — termine quand tu veux ». */
  | { kind: 'ready' };

export function loopHint(input: {
  conquest: boolean;
  distanceM: number;
  gapM: number | null;
}): LoopHint | null {
  if (!input.conquest || input.gapM === null) return null;
  if (input.distanceM < LOOP_MIN_PERIMETER_M) return null;
  if (input.gapM <= LOOP_CLOSE_TOLERANCE_M) return { kind: 'ready' };
  return { kind: 'closing', gapM: input.gapM };
}

/** Arrondi lisible 10 m — même règle que les cards live (CARD_ROUND_M). */
const HINT_ROUND_M = 10;
export function roundLoopM(m: number): number {
  return Math.max(HINT_ROUND_M, Math.round(m / HINT_ROUND_M) * HINT_ROUND_M);
}
