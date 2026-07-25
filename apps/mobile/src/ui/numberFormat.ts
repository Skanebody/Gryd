/**
 * GRYD — cœur PUR du formatage de nombres locale-aware (§26), SANS Intl (parité
 * Hermes) et SANS store i18n → testable en Deno. `ui/format.ts` l'enveloppe avec
 * getLocale(). Le français reste inchangé (espace milliers, virgule décimale).
 */
import type { Locale } from '../i18n/types';

/** Séparateur de MILLIERS par langue (fr = espace, en = virgule, de/es/pt = point). */
export const THOUSANDS_SEP: Record<Locale, string> = {
  fr: ' ',
  en: ',',
  de: '.',
  es: '.',
  pt: '.',
};

/** Séparateur DÉCIMAL par langue (anglais = point ; toutes les autres = virgule). */
export const DECIMAL_SEP: Record<Locale, string> = {
  fr: ',',
  en: '.',
  de: ',',
  es: ',',
  pt: ',',
};

/** Entier groupé par milliers selon la langue : 2147 → « 2 147 » (fr) / « 2,147 » (en). */
export function formatIntFor(n: number, locale: Locale): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS_SEP[locale]);
}

/** Multiplicateur : 1.30004 → « ×1,3 » (fr) / « ×1.3 » (en). */
export function formatMultiplierFor(x: number, locale: Locale): string {
  return `×${x.toFixed(1).replace('.', DECIMAL_SEP[locale])}`;
}

/**
 * Distance en kilomètres, à UNE décimale, avec le séparateur de la langue :
 * 4.2 → « 4,2 » (fr/es/de/pt) · « 4.2 » (en).
 *
 * POURQUOI CETTE FONCTION EXISTE : il y avait NEUF implémentations locales de
 * `formatKm` dans l'app, et elles ne disaient pas la même chose. L'une d'elles
 * appelait `toLocaleString('fr-FR')` EN DUR (route-planner) : un joueur anglais,
 * allemand ou portugais y lisait un séparateur décimal faux. Une autre était
 * correcte mais enfermée dans un composant de carte. Une règle d'affichage qui
 * existe en neuf exemplaires n'est pas une règle : c'est neuf occasions de diverger.
 *
 * SANS `Intl` : Hermes n'embarque pas ICU, le rendu doit être identique sur iOS,
 * Android et Deno (c'est déjà la contrainte de tout ce fichier).
 *
 * RETOURNE `null` SI LA VALEUR N'EST PAS UNE DISTANCE — non finie, ou négative.
 * On ne rend jamais « NaN km », et on ne replie pas non plus sur « 0,0 » : zéro
 * est une valeur VRAIE que certains écrans affichent légitimement, la confondre
 * avec « je ne sais pas » serait exactement le mensonge que la charte interdit.
 * L'appelant décide alors quoi montrer (masquer la ligne, dire l'échec…).
 *
 * L'UNITÉ N'EST PAS INCLUSE : les blocs de métriques rendent le chiffre et son
 * label « km » avec deux typographies distinctes (loi R6). Les appelants qui
 * veulent la forme en ligne concatènent eux-mêmes ` km`.
 */
export function formatKmFor(km: number, locale: Locale): string | null {
  if (!Number.isFinite(km) || km < 0) return null;
  return km.toFixed(1).replace('.', DECIMAL_SEP[locale]);
}
