/**
 * GRYD — LES CHIFFRES DU JOURNAL, MIS EN FORME.
 *
 * Trois règles, les mêmes que partout dans le produit :
 *  · une valeur NON MESURÉE rend `null` — l'appelant fait disparaître la ligne
 *    plutôt que d'écrire un « 0 » qui se lirait comme une performance (L14) ;
 *  · aucun `Intl` : Hermes n'embarque pas ICU, et le rendu doit être identique
 *    sur iOS, Android, web et sous Deno. Le séparateur décimal est PASSÉ par
 *    l'appelant (même contrat que `ui/numberFormat` et `run/effortRate`) ;
 *  · la grandeur suit la DISCIPLINE (allure à pied, vitesse à vélo — cahier
 *    §8.2), et c'est `effortRate` qui tranche : une seconde conversion finirait
 *    par diverger de la première.
 *
 * PUR : zéro React, zéro i18n, zéro horloge.
 */
import type { Activity } from '@klaim/shared';
import { effortRate, formatSpeedKmh } from '../run/effortRate';

const S_PER_MIN = 60;
const MIN_PER_H = 60;

/** L'unité d'allure, INVARIANTE (jamais traduite) — cf. `RateLabel.unit`. */
const PACE_UNIT = 'min/km';

/**
 * Chronomètre : « 31:42 » sous l'heure, « 1:02:31 » au-delà. `fmtDuration`
 * (features/history/format) ne porte QUE des minutes : une sortie de 95 minutes
 * s'y lit « 95:12 », ce qui est juste mais illisible pour une durée de sortie.
 * `null` quand ce n'est pas une durée.
 */
export function formatClock(totalS: number): string | null {
  if (!Number.isFinite(totalS) || totalS < 0) return null;
  const whole = Math.round(totalS);
  const h = Math.floor(whole / (S_PER_MIN * MIN_PER_H));
  const m = Math.floor((whole % (S_PER_MIN * MIN_PER_H)) / S_PER_MIN);
  const s = whole % S_PER_MIN;
  const two = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${m}:${two(s)}`;
}

/**
 * Allure NUE : « 5’28 », sans l'unité. Le tableau des splits porte son unité en
 * en-tête de colonne ; la répéter sur chaque ligne rendrait la colonne illisible.
 * `null` quand ce n'est pas une allure.
 */
export function formatPaceShort(sPerKm: number): string | null {
  if (!Number.isFinite(sPerKm) || sPerKm <= 0) return null;
  const m = Math.floor(sPerKm / S_PER_MIN);
  const s = Math.round(sPerKm % S_PER_MIN);
  // 5’59,6 arrondi à 60 s doit devenir 6’00, pas 5’60.
  if (s === S_PER_MIN) return `${m + 1}’00`;
  return `${m}’${s.toString().padStart(2, '0')}`;
}

/** La grandeur d'effort de la discipline, prête à peindre. */
export interface RateLabel {
  readonly value: string;
  /**
   * Unité affichée à côté du chiffre. Jamais traduite (« min/km », « km/h »).
   *
   * ⚠ « min/km » et non « /km » : `scripts/audit-routes.mjs` lit TOUTE chaîne
   * qui commence par « / » comme un lien de route, et un littéral `'/km'` a
   * réellement fait échouer l'audit sur une unité de mesure. « min/km » est en
   * outre l'écriture complète, celle des montres et des plans d'entraînement.
   */
  readonly unit: string;
}

/**
 * Allure (course) ou vitesse (vélo), à partir de la SEULE allure mesurée —
 * jamais recalculée depuis la distance et la durée : deux voies pour une même
 * grandeur finissent toujours par se contredire à l'arrondi.
 */
export function formatRate(
  activity: Activity,
  sPerKm: number | null | undefined,
  decimalSep: string,
): RateLabel | null {
  if (typeof sPerKm !== 'number') return null;
  const rate = effortRate(activity, sPerKm);
  if (rate === null) return null;
  if (rate.kind === 'speed') return { value: formatSpeedKmh(rate.kmh, decimalSep), unit: 'km/h' };
  const value = formatPaceShort(rate.sPerKm);
  return value === null ? null : { value, unit: PACE_UNIT };
}

/**
 * Une distance en mètres, arrondie à l'entier : « 640 ». Sert au dernier split
 * (« dernier 640 m »), jamais à une distance totale (qui se lit en km).
 */
export function formatMeters(m: number): string | null {
  if (!Number.isFinite(m) || m < 0) return null;
  return String(Math.round(m));
}

/**
 * Distance en kilomètres avec deux décimales : « 8,42 ». Deux et pas une —
 * c'est la précision que le Résultat affiche déjà (`RunResult`), et deux
 * écrans qui arrondissent la même sortie différemment se contredisent.
 * `null` quand ce n'est pas une distance.
 */
export function formatKm2(km: number, decimalSep: string): string | null {
  if (!Number.isFinite(km) || km < 0) return null;
  return km.toFixed(2).replace('.', decimalSep);
}
