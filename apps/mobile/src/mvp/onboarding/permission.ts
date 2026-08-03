/**
 * GRYD — CE QUE L'ÉCRAN FAIT D'UNE RÉPONSE DE PERMISSION. PUR (lot M2).
 *
 * ─── POURQUOI CETTE LOGIQUE EST SORTIE DE L'ÉCRAN ───────────────────────────
 * Parce que c'est le seul endroit du MVP où l'app peut fabriquer un CUL-DE-SAC.
 * Trois réponses de l'OS, trois suites qui n'ont RIEN à voir — et deux d'entre
 * elles ne se testent pas à la main : un refus définitif ne se rejoue qu'en
 * réinstallant l'app, et l'état « refusé mais redemandable » n'existe que sur
 * une plateforme. Une logique enfouie dans un composant serait donc écrite une
 * fois, jamais vérifiée, et son cas le plus rare est précisément celui qui
 * laisse un joueur devant un bouton mort.
 *
 * ─── LES TROIS SUITES ───────────────────────────────────────────────────────
 *   · `granted`  → on va à la carte. Rien à dire, on ne félicite pas quelqu'un
 *     d'avoir appuyé sur « Autoriser ».
 *   · `retry`    → refusé MAIS l'OS acceptera de redemander. Le bon geste est
 *     de re-proposer, pas d'envoyer dans les réglages : y envoyer quelqu'un
 *     pour un dialogue qu'on peut rouvrir est une corvée gratuite.
 *   · `settings` → refusé DÉFINITIVEMENT (`canAskAgain: false`). Là, et là
 *     seulement, les réglages système sont la seule sortie réelle.
 *
 * ⚠️ « Aucun bouton mort » (constitution) : `settings` n'est proposé QUE quand
 * l'OS a réellement fermé la porte. Peindre « Ouvrir les réglages » sur un
 * refus redemandable enverrait le joueur chercher un interrupteur qui n'est pas
 * encore là — le bouton marcherait, et ne servirait à rien.
 */

/** Sous-ensemble STRUCTUREL de la réponse `expo-location` réellement lu. */
export interface PermissionAnswer {
  readonly granted: boolean;
  /**
   * L'OS acceptera-t-il de reposer la question ? `undefined` = l'API ne l'a pas
   * dit : on suppose alors que OUI (voir `permissionOutcome`).
   */
  readonly canAskAgain?: boolean;
}

export type PermissionOutcome = 'granted' | 'retry' | 'settings';

/**
 * Réponse de l'OS → suite à donner. PURE.
 *
 * `canAskAgain` absent ⇒ on suppose qu'on PEUT redemander. C'est le choix
 * prudent dans le bon sens : se tromper vers `retry` coûte un tap de plus ;
 * se tromper vers `settings` envoie le joueur dans les réglages système alors
 * qu'un simple « Autoriser » suffisait — un aller-retour hors de l'app dont
 * beaucoup ne reviennent pas.
 */
export function permissionOutcome(answer: PermissionAnswer | null | undefined): PermissionOutcome {
  if (answer?.granted === true) return 'granted';
  // `=== false` et non `!answer.canAskAgain` : `undefined` ne doit PAS être lu
  // comme un refus définitif (voir ci-dessus).
  return answer?.canAskAgain === false ? 'settings' : 'retry';
}

/** Le joueur peut-il encore atteindre la carte sans autoriser ? Toujours OUI. */
export const MAP_REACHABLE_WITHOUT_PERMISSION = true;

/**
 * L'onboarding est-il terminé ? PURE.
 *
 * ⚠️ NE DÉPEND PAS DE LA PERMISSION, et c'est délibéré. Lier les deux
 * enfermerait dans l'onboarding quiconque refuse — or refuser est un choix
 * légitime, et la carte a un état vide honnête qui se suffit (« Ta ville est
 * vierge. Ferme ta première boucle. »). Un joueur qui a VU les deux écrans les
 * a vus : le lui reproposer à chaque ouverture serait un mur, pas un tutoriel.
 */
export function onboardingDone(seenAt: number | null | undefined): boolean {
  return typeof seenAt === 'number' && Number.isFinite(seenAt) && seenAt > 0;
}
