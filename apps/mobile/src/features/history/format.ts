/**
 * GRYD — formatage de l'EFFORT (distance · durée · allure), partagé par toutes
 * les surfaces d'historique.
 *
 * Pourquoi ce fichier existe : ces trois fonctions vivaient dans `demo.ts`, au
 * milieu des courses fabriquées. Le jour où l'historique s'est branché sur la
 * VRAIE table `runs`, du code réel s'est mis à importer un module de démo — et
 * le nettoyage de la démo aurait cassé l'app. Une fonction de formatage n'est ni
 * réelle ni fictive : elle n'appartient pas à `demo.ts`.
 *
 * ─── CE QUI A CHANGÉ LE 25/07/2026 ──────────────────────────────────────────
 * `fmtKm` écrivait la virgule française EN DUR (`toFixed(1).replace('.', ',')`).
 * Un joueur en anglais, en allemand ou en portugais lisait donc « 4,8 km » là
 * où sa langue écrit « 4.8 km » — la même faute que le `toLocaleString('fr-FR')`
 * relevé ailleurs dans l'app. Il consomme maintenant `formatKm` (socle partagé,
 * SANS `Intl` : Hermes n'embarque pas ICU).
 *
 * Deuxième changement : distance et durée renvoient `null` quand la valeur
 * n'est PAS une mesure (non finie, négative). Un « NaN km » affiché est une
 * affirmation fausse sur la course du joueur ; l'appelant fait disparaître le
 * segment (règle : un segment sans source disparaît, jamais un « — »).
 */
import { formatKm } from '../../ui/format';

/** Distance : 4.8 → « 4,8 km » (fr) / « 4.8 km » (en). `null` si ce n'en est pas une. */
export function fmtKm(km: number): string | null {
  const value = formatKm(km);
  return value === null ? null : `${value} km`;
}

/** Durée : 1692 s → « 28:12 ». `null` si ce n'est pas une durée. */
export function fmtDuration(totalS: number): string | null {
  if (!Number.isFinite(totalS) || totalS < 0) return null;
  const m = Math.floor(totalS / 60);
  const s = Math.round(totalS % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Allure : 352 s/km → « 5’52/km ».
 *
 * Signature INCHANGÉE (`string`, jamais `null`) : ce formateur est aussi
 * consommé par `features/performance/stats/RecordsSection`, qui appartient à un
 * périmètre gelé. Les appelants de ce lot gardent donc leur propre garde de
 * finitude avant de l'appeler.
 */
export function fmtPace(sPerKm: number): string {
  const m = Math.floor(sPerKm / 60);
  const s = Math.round(sPerKm % 60);
  return `${m}’${s.toString().padStart(2, '0')}/km`;
}
