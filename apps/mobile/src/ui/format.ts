/**
 * GRYD — formatage d'affichage (fr). Pas d'Intl : rendu identique iOS/Android
 * quel que soit le build Hermes.
 */

/** Entier avec séparateur de milliers en espace fine insécable : 2147 → « 2 147 ». */
export function formatInt(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** Multiplicateur : 1.3000000004 → « ×1,3 ». */
export function formatMultiplier(x: number): string {
  return `×${x.toFixed(1).replace('.', ',')}`;
}
