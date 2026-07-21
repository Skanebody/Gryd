/**
 * GRYD — formatage de l'EFFORT (distance · durée · allure), partagé par toutes
 * les surfaces d'historique.
 *
 * Pourquoi ce fichier existe : ces trois fonctions vivaient dans `demo.ts`, au
 * milieu des courses fabriquées. Le jour où l'historique s'est branché sur la
 * VRAIE table `runs`, du code réel s'est mis à importer un module de démo — et
 * le nettoyage de la démo aurait cassé l'app. Une fonction de formatage n'est ni
 * réelle ni fictive : elle n'appartient pas à `demo.ts`. `demo.ts` les
 * ré-exporte pour ne rien casser chez ses consommateurs historiques.
 *
 * Pas d'`Intl` ici (cohérent avec run/simulation) : le séparateur décimal FR est
 * assumé, comme dans le reste des écrans de course.
 */

/** Distance : 4.8 → « 4,8 km ». */
export function fmtKm(km: number): string {
  return `${km.toFixed(1).replace('.', ',')} km`;
}

/** Durée : 1692 s → « 28:12 ». */
export function fmtDuration(totalS: number): string {
  const m = Math.floor(totalS / 60);
  const s = Math.round(totalS % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Allure : 352 s/km → « 5’52/km ». */
export function fmtPace(sPerKm: number): string {
  const m = Math.floor(sPerKm / 60);
  const s = Math.round(sPerKm % 60);
  return `${m}’${s.toString().padStart(2, '0')}/km`;
}
