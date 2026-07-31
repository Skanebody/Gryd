/**
 * GRYD — E18 : « LE ROUTEUR N'A PAS RÉPONDU » N'EST PAS « IL N'Y A PAS DE BOUCLE ».
 *
 * ─── LE DÉFAUT QUE CE MODULE SUPPRIME (28/07/2026) ────────────────────────────
 * `routeLoop` rendait `null` pour TOUT : coupure réseau, serveur OSRM en panne,
 * CORS, abort — mais aussi « j'ai bien reçu ta demande et il n'existe aucune
 * boucle de cette longueur ici ». L'écran n'avait donc qu'un seul discours
 * (« Parcours indisponible — réessaie dans un instant ») et qu'un seul geste
 * (« Recalculer le tracé »), pour deux situations qui n'ont PAS la même suite :
 *
 *   · le routeur n'a pas répondu  ⇒ la même demande, refaite dans un instant,
 *     peut réussir. Réessayer est le geste juste ;
 *   · le routeur A répondu, et il n'a rien trouvé ⇒ refaire la MÊME demande
 *     rendra la MÊME réponse. La rosace de waypoints est semée (`seed`), donc
 *     déterministe : « Recalculer » était, dans ce cas précis, un bouton qui ne
 *     pouvait pas aboutir. Le geste juste est de demander une AUTRE boucle
 *     (autre semence ⇒ autres waypoints ⇒ autre requête).
 *
 * La constitution interdit le bouton mort et interdit d'affirmer une cause qu'on
 * n'a pas observée. Ce module tient les deux : il ne connaît QUE des faits
 * observés pendant la tentative.
 *
 * ─── POURQUOI PAS DE TROISIÈME CAS « HORS LIGNE » ─────────────────────────────
 * Une version antérieure de cette copie annonçait « Hors ligne — aucun tracé
 * calculable ». On ne peut pas le savoir : React Native ne polyfille PAS
 * `navigator.onLine` (`Libraries/Core/setUpNavigator.js` ne définit que
 * `product`), et aucune dépendance de connectivité (`expo-network`,
 * `@react-native-community/netinfo`) n'est dans la stack. Sur l'app installée —
 * c'est-à-dire sur le produit réel — cet état aurait donc été soit inatteignable,
 * soit DEVINÉ. Accuser le réseau du joueur sans l'avoir mesuré est exactement le
 * genre d'affirmation que l'app ne s'autorise pas. On nomme donc ce qu'on sait :
 * le routeur n'a pas répondu.
 *
 * PUR : zéro React, zéro réseau, zéro horloge.
 */

/** Ce qui a empêché une boucle d'exister. Deux causes, deux suites différentes. */
export type RoutingFailure =
  /** Aucune réponse du routeur (coupure, serveur muet, CORS, abandon). */
  | 'unreachable'
  /** Le routeur a répondu : il n'y a pas de boucle jouable ici, à cette longueur. */
  | 'noRoute';

/** Les seuls faits observables d'une tentative de routage. */
export interface RoutingAttemptFacts {
  /**
   * Le routeur a-t-il RÉPONDU ? Vrai dès qu'une réponse HTTP est revenue et a pu
   * être lue — quel que soit son verdict. Faux si la requête n'a jamais abouti.
   */
  routerAnswered: boolean;
}

/**
 * Classe un échec à partir du SEUL fait qu'on observe. Une fonction d'une ligne,
 * mais nommée et testée : c'est elle qui empêche l'écran de re-fusionner les
 * deux causes au prochain patch, et elle rend la règle lisible au prochain
 * lecteur sans qu'il ait à relire le corps de `routeLoopOutcome`.
 */
export function classifyRoutingFailure(facts: RoutingAttemptFacts): RoutingFailure {
  return facts.routerAnswered ? 'noRoute' : 'unreachable';
}

/**
 * Refaire la MÊME demande a-t-il une chance d'aboutir ?
 *
 * `noRoute` ⇒ non : la géométrie de la rosace est déterministe (semence + cible),
 * donc la même requête produira la même absence. L'écran doit alors changer
 * quelque chose (la semence, la distance) plutôt que peindre un « Réessayer »
 * qui tournerait à vide.
 */
export function sameRequestCanSucceed(failure: RoutingFailure): boolean {
  return failure === 'unreachable';
}
