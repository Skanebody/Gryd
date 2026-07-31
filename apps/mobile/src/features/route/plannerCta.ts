/**
 * GRYD — CE QUE PORTE LE BOUTON UNIQUE DU PLANIFICATEUR.
 *
 * ─── POURQUOI CETTE DÉCISION EST UNE FONCTION, ET PAS UN TERNAIRE DANS LE JSX ──
 * L'écran n'a qu'UN CTA chartreuse (§A4). Il devait donc arbitrer, en une seule
 * expression, entre quatre situations qui n'appellent pas le même geste — et il
 * s'en tirait par un `disabled` : le bouton « CONQUÉRIR » restait peint en
 * chartreuse à 40 % d'opacité tant que la position n'était pas confirmée.
 *
 * Deux fautes en une :
 *   · un bouton d'accent qui ne répond jamais se lit CASSÉ, pas « pas encore » ;
 *   · c'était le seul CTA de l'écran, donc le pouce n'avait AUCUN geste utile à
 *     faire à l'endroit exact où il le cherche.
 *
 * Or il y a toujours un geste utile : sans position, c'est « Ma position » ;
 * après un échec, c'est « Réessayer » ; après un routage muet, c'est « Réessayer
 * le tracé ». Le bouton porte ce geste-là. Il n'est jamais mort, donc jamais
 * grisé — « aucun bouton mort » se respecte en changeant l'action, pas en
 * désactivant la seule qu'on propose.
 *
 * PUR et testé : c'est la logique la plus facile à casser d'un revers de patch
 * (quatre entrées booléennes, un ordre de priorité), et la plus coûteuse à
 * casser (elle décide si l'écran a une sortie).
 *
 * ─── LE CINQUIÈME GESTE (E18, 28/07/2026) ─────────────────────────────────────
 * « Réessayer le tracé » couvrait DEUX situations, dont une où il ne pouvait pas
 * aboutir : quand le routeur a RÉPONDU qu'il n'y a pas de boucle ici, refaire la
 * même demande rend la même absence (la rosace de waypoints est semée, donc
 * déterministe). Un bouton qui relance à l'identique une requête dont on connaît
 * déjà le verdict est un bouton mort maquillé en réessai. Il devient alors
 * « Autre boucle » — une semence différente, donc une requête réellement
 * différente, qui peut réussir.
 */
import { sameRequestCanSucceed, type RoutingFailure } from './routingOutcome';

/** Le geste que porte le bouton unique. Un seul à la fois, jamais deux. */
export type PlannerCtaKind =
  /** Rien n'a été demandé au capteur : le geste utile est de le demander. */
  | 'locate'
  /** Une tentative a échoué : même geste, autre verbe (on ne « réessaie » pas ce qu'on n'a jamais tenté). */
  | 'retryLocation'
  /** Position acquise, tracé en cours de calcul : le bouton attend, visiblement. */
  | 'routing'
  /** Position acquise, routeur muet : le geste utile est de relancer le calcul. */
  | 'retryRoute'
  /**
   * Position acquise, le routeur a RÉPONDU qu'il n'y a pas de boucle ici :
   * relancer à l'identique rendrait la même absence (rosace semée). Le geste
   * utile est d'en demander une AUTRE — autre semence, autre requête.
   */
  | 'newLoop'
  /** Tout est là : partir. C'est le SEUL état où le bouton lance la course. */
  | 'start';

export interface PlannerCtaInput {
  /** État du capteur — les quatre états de l'écran, jamais fondus. */
  gps: 'unasked' | 'locating' | 'ok' | 'error';
  /** Un tracé RÉEL est affiché (OSRM a répondu). */
  hasRoute: boolean;
  /** Un calcul d'itinéraire est en vol. */
  routing: boolean;
  /**
   * La cause OBSERVÉE du dernier échec de routage, `null` si la dernière
   * tentative a réussi ou si rien n'a encore été tenté (`routingOutcome.ts`).
   * Sans elle, le bouton proposait « Recalculer le tracé » là où recalculer ne
   * pouvait rien changer.
   */
  failure: RoutingFailure | null;
}

/**
 * L'ordre de priorité est celui de la RÉALITÉ, pas celui du confort : sans
 * position il n'y a pas de boucle possible, donc la localisation passe avant
 * tout — y compris avant un tracé qui traînerait d'une origine précédente.
 *
 * `locating` retombe sur `locate` : le bouton reste le même, c'est l'appelant
 * qui le passe en `loading` (le libellé demeure, l'action est verrouillée) —
 * remplacer le libellé pendant la recherche ferait clignoter le seul repère
 * stable du bas d'écran.
 */
export function plannerCta(input: PlannerCtaInput): PlannerCtaKind {
  if (input.gps === 'error') return 'retryLocation';
  if (input.gps !== 'ok') return 'locate';
  if (input.routing) return 'routing';
  if (!input.hasRoute) {
    // Le routeur a parlé : refaire la même demande rendrait la même absence.
    // On ne peint donc pas un « Réessayer » qui ne peut pas aboutir.
    return input.failure !== null && !sameRequestCanSucceed(input.failure)
      ? 'newLoop'
      : 'retryRoute';
  }
  return 'start';
}

/** Le bouton lance-t-il vraiment la course ? (le seul cas où il engage le joueur) */
export function ctaStartsRun(kind: PlannerCtaKind): boolean {
  return kind === 'start';
}
