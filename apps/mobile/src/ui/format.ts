/**
 * GRYD — formatage d'affichage LOCALE-AWARE (§26). Enveloppe mince autour de
 * `numberFormat` (cœur pur, testé) + `getLocale()`. SANS Intl : rendu déterministe
 * identique iOS/Android/Deno (Hermes n'embarque pas ICU). Français inchangé.
 */
import { getLocale } from '../i18n/store';
import { DECIMAL_SEP, formatIntFor, formatKmFor, formatMultiplierFor } from './numberFormat';

/** Le séparateur décimal de la langue courante — réutilisable (ex. formatKm). */
export function decimalSeparator(): string {
  return DECIMAL_SEP[getLocale()];
}

/** Entier avec séparateur de milliers de la langue : 2147 → « 2 147 » (fr) / « 2,147 » (en). */
export function formatInt(n: number): string {
  return formatIntFor(n, getLocale());
}

/** Multiplicateur : 1.3000000004 → « ×1,3 » (fr) / « ×1.3 » (en). */
export function formatMultiplier(x: number): string {
  return formatMultiplierFor(x, getLocale());
}

/**
 * Distance en km à une décimale, dans la langue courante : 4.2 → « 4,2 » (fr) /
 * « 4.2 » (en). `null` si ce n'est pas une distance (non finie ou négative) —
 * l'appelant montre alors son état vide plutôt qu'un « NaN » ou un faux zéro.
 * L'unité n'est pas incluse (les blocs de métriques la rendent à part).
 */
export function formatKm(km: number): string | null {
  return formatKmFor(km, getLocale());
}
