/**
 * GRYD — LA DURÉE D'UNE BOUCLE, ET LE DROIT DE NE PAS LA DONNER.
 *
 * ─── LE MENSONGE QUE CE MODULE SUPPRIME (25/07/2026) ───────────────────────────
 * Le planificateur portait `EST_PACE_SEC_PER_KM = 350` : une allure forfaitaire
 * de 5'50/km appliquée à TOUT LE MONDE. Elle pilotait toutes les durées de
 * l'écran — l'en-tête, le bloc de métriques, les trois formats, les variantes et
 * la microcopie du bouton de départ. Un coureur à 4'10/km lisait « ~29 min » pour
 * une boucle qu'il boucle en 21 ; un marcheur lisait l'inverse.
 *
 * Le « ~ » ne rachetait rien : il annonce une IMPRÉCISION, pas une INVENTION.
 * Une estimation est honnête quand elle est bâtie sur une mesure du joueur ;
 * sinon ce n'est pas une estimation, c'est un nombre choisi par le développeur.
 *
 * Et l'allure RÉELLE était déjà lue par ailleurs : `computeHabitsProfile`
 * (@klaim/shared) la calcule en médiane sur les courses récentes de l'appelant,
 * et `features/route/suggestion.ts` la fait remonter jusqu'à l'écran. Il n'y
 * avait donc même pas de donnée manquante — juste une constante qui court-
 * circuitait la mesure.
 *
 * ─── LA RÈGLE ─────────────────────────────────────────────────────────────────
 * Pas d'allure apprise ⇒ PAS DE MINUTES. L'écran documente l'absence en gris
 * plutôt que d'afficher un chiffre que rien ne soutient. C'est le même arbitrage
 * que le gain territorial : une case vide dit la vérité, un chiffre inventé non.
 *
 * PUR : aucune I/O, aucune horloge, aucun accès au store i18n → testable en Deno.
 * Aucune constante de JEU non plus : une durée d'affichage ne rapporte rien et
 * n'entre dans aucune formule de score (anti pay-to-win, §22).
 */

/**
 * Minutes estimées pour parcourir `km` à l'allure `paceSKm` (secondes par km),
 * ou `null` quand la question n'a pas de réponse honnête.
 *
 * `null` dans QUATRE cas, tous réels :
 *   · aucune allure apprise (`paceSKm === null`) — le cas le plus fréquent ;
 *   · une allure non finie ou négative (payload serveur abîmé) ;
 *   · une distance non finie ou négative ;
 *   · une distance nulle — il n'y a pas de boucle, donc pas de durée.
 *
 * L'arrondi est à la minute : afficher des secondes sur une estimation
 * suggérerait une précision que la médiane d'un profil n'a pas. Le plancher à
 * 1 min évite d'annoncer « ~0 min » sur une boucle très courte, ce qui se lirait
 * comme « instantané » alors que la vraie réponse est « moins d'une minute ».
 */
export function estimatedMinutes(km: number, paceSKm: number | null): number | null {
  if (paceSKm === null || !Number.isFinite(paceSKm) || paceSKm <= 0) return null;
  if (!Number.isFinite(km) || km <= 0) return null;
  return Math.max(1, Math.round((km * paceSKm) / 60));
}

/** Les métriques que le bloc à séparateurs a le droit d'afficher. */
export type PlannerMetricKey = 'distance' | 'duration';

/**
 * Quelles cellules le bloc de métriques rend — et donc lesquelles DISPARAISSENT.
 *
 * Loi 15 du système : « chaque valeur est adossée à une source nommée, et un
 * segment sans source disparaît ». Une cellule « — » ou « 0 min » serait un
 * mensonge poli. Zéro clé ⇒ `SheetMetrics` ne rend rien du tout (il retourne
 * `null` sur une liste vide), et l'écran n'affiche pas un bloc vide.
 *
 * La planche E05 prévoit quatre cellules (distance · durée · gain km² ·
 * difficulté). Les deux dernières n'ont AUCUNE source côté client : le gain
 * territorial est décidé serveur après la course, et aucun modèle de difficulté
 * (dénivelé, revêtement) n'existe dans le dépôt. Elles ne sont pas listables ici,
 * ce qui rend l'écart structurel plutôt que discipliné.
 */
export function plannerMetricKeys(input: {
  distanceKm: number | null;
  minutes: number | null;
}): readonly PlannerMetricKey[] {
  const keys: PlannerMetricKey[] = [];
  if (input.distanceKm !== null && Number.isFinite(input.distanceKm) && input.distanceKm > 0) {
    keys.push('distance');
  }
  if (input.minutes !== null && Number.isFinite(input.minutes) && input.minutes > 0) {
    keys.push('duration');
  }
  return keys;
}
