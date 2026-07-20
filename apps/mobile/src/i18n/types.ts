/**
 * GRYD — i18n : types du catalogue (demande fondateur 20/07/2026).
 *
 * Langues : le français (source) + celles les plus susceptibles d'exploser vite
 * pour un jeu de run clubs — anglais (global), espagnol (Espagne + LatAm),
 * allemand (Berlin/Munich, marché UE), portugais (São Paulo + Lisbonne).
 *
 * RÈGLE CENTRALE — « chaque nouveau texte est traduit automatiquement » :
 * la parité est imposée PAR LE TYPE. Une `Entry` est un Record<Locale, string>
 * COMPLET : ajouter un texte sans ses 5 langues = erreur TypeScript = gate
 * rouge. Impossible d'expédier une chaîne non traduite.
 *
 * Ce module est PUR (zéro import RN) : importable par les modules partagés,
 * les tests Deno et le web. La résolution réactive vit dans ./store.
 */

export const LOCALES = ['fr', 'en', 'es', 'de', 'pt'] as const;
export type Locale = (typeof LOCALES)[number];

/** Libellés natifs du sélecteur de langue (jamais traduits — on se reconnaît). */
export const LOCALE_LABELS: Readonly<Record<Locale, string>> = {
  fr: 'Français',
  en: 'English',
  es: 'Español',
  de: 'Deutsch',
  pt: 'Português',
};

/** Un texte de l'app : TOUTES les langues, obligatoires. */
export type Entry = Readonly<Record<Locale, string>>;

/**
 * Déclare un catalogue de domaine. Purement identitaire : le générique force
 * l'inférence précise des clés (autocomplétion + refus des clés inconnues).
 */
export function defineCatalog<T extends Record<string, Entry>>(catalog: T): T {
  return catalog;
}

/** Résolution PURE (modules partagés / tests) : entry + locale → texte. */
export function resolve(entry: Entry, locale: Locale): string {
  return entry[locale];
}

/**
 * Interpolation `{nom}` — les valeurs viennent du code, jamais du catalogue.
 * Ex. format(C.zonesPrises, { n: 3 }, 'fr') avec « {n} zones prises ».
 */
export function format(
  entry: Entry,
  vars: Record<string, string | number>,
  locale: Locale,
): string {
  let out = entry[locale];
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(String(v));
  }
  return out;
}
