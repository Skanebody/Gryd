/**
 * GRYD — formatage des valeurs de l'écran « Mes parcours ». PUR (aucun import
 * RN, aucun Intl : rendu Hermes stable, même patron que motivation/demo.ts).
 *
 * Séparé de features/run/simulation.ts volontairement : ce module-là est le
 * moteur de la course simulée, on ne tire pas tout son graphe d'imports dans un
 * écran de réglages pour deux formatages de trois lignes. Les règles décimales
 * sont en revanche LOCALISÉES ici (l'anglais met un point, les quatre autres
 * langues du catalogue mettent une virgule) — `formatKm` de simulation.ts force
 * la virgule, ce qui serait faux en anglais.
 */
import type { Locale } from '../../i18n/types';

/** Séparateur décimal de la langue (en : point ; fr/es/de/pt : virgule). */
function decimal(value: string, locale: Locale): string {
  return locale === 'en' ? value : value.replace('.', ',');
}

/**
 * Distance en km : « 8 km » quand c'est rond, « 6,2 km » sinon. Une distance
 * habituelle affichée « 6,20 km » sur-promet une précision que la déduction n'a
 * pas — une décimale suffit et dit la vérité.
 */
export function formatDistanceKm(distanceM: number, locale: Locale): string {
  const km = Math.max(0, distanceM) / 1000;
  const rounded = Math.round(km * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${decimal(text, locale)} km`;
}

/** Allure « 5'40 /km » (s/km). Le format min'sec est international. */
export function formatPaceSKm(paceSKm: number): string {
  const s = Math.round(Math.max(0, paceSKm));
  return `${Math.floor(s / 60)}'${String(s % 60).padStart(2, '0')} /km`;
}
