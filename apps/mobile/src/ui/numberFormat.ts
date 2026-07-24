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
