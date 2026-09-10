/**
 * GRYD — « COMBIEN DE CHOSES M'ATTENDENT DANS LA GESTION ? » Module PUR
 * (LOT Q4, 11/09/2026).
 *
 * ═══ POURQUOI CE COMPTEUR EXISTE ═══════════════════════════════════════════
 * La porte « Gérer mon crew » était peinte pour les officiers, toujours à
 * l'identique, qu'il y ait trois candidatures en attente ou rien du tout. Un
 * capitaine ne pouvait donc apprendre qu'on lui avait demandé d'entrer qu'en
 * ouvrant l'écran au hasard. C'est le seul endroit de la page du crew où un
 * chiffre a une conséquence : il dit qu'une PERSONNE attend une réponse.
 *
 * ═══ CE QU'IL COMPTE, ET CE QU'IL NE COMPTE PAS ════════════════════════════
 * DEUX faits, tous deux rendus par une RPC réelle :
 *   · les candidatures en attente (`crew_join_requests`, 0083) — quelqu'un
 *     attend qu'on lui réponde ;
 *   · les membres « à risque » (`crew_member_board_2026`, 0189, `standing =
 *     at_risk`) — le serveur va les retirer si personne n'intervient.
 * PAS les membres simplement « avertis » : un avertissement ouvert n'appelle
 * aucun geste du capitaine (c'est le MEMBRE qui l'acquitte, sur sa situation).
 * Le compter ferait clignoter une porte que personne ne doit franchir.
 *
 * ═══ TROIS ÉTATS, JAMAIS DEUX ══════════════════════════════════════════════
 * « Je n'ai pas lu » n'est PAS « il n'y a rien ». Un compteur qui retomberait
 * à zéro pendant une panne de lecture dirait « aucune candidature » à un
 * capitaine qui en a trois. `known` sépare les deux, et l'écran n'affiche un
 * chiffre que sur la moitié RÉELLEMENT lue.
 *
 * ⚠ JAMAIS UNE PASTILLE PERMANENTE : à zéro lu, `total` vaut 0 et l'écran
 * n'écrit rien de plus que le libellé de la porte. Un badge « 0 » est un « 0 »
 * nu, interdit par L8/L14.
 */

/** Ce que les deux lectures ont donné, chacune avec son « je sais / je ne sais pas ». */
export interface CrewAlertInput2026 {
  /** `crew_join_requests` a-t-elle abouti ET reconnu le droit de décider ? */
  readonly requestsKnown: boolean;
  readonly requests: number;
  /** `crew_member_board_2026` a-t-elle abouti ? */
  readonly boardKnown: boolean;
  readonly atRisk: number;
}

export interface CrewAlertCount2026 {
  /** Candidatures en attente, ou 0 si la lecture n'a pas abouti. */
  readonly pending: number;
  /** Membres que le serveur retirera faute d'intervention, ou 0 si non lu. */
  readonly atRisk: number;
  /** La somme de ce qu'on SAIT. Zéro = rien à signaler, ou rien de lisible. */
  readonly total: number;
  /** Les DEUX lectures ont abouti : un `total` de 0 signifie alors vraiment 0. */
  readonly known: boolean;
  /** Au moins une lecture n'a pas abouti : le chiffre est un PLANCHER. */
  readonly partial: boolean;
}

/** Un compte négatif ou non fini n'est pas un compte : il vaut 0. */
function safe(n: number): number {
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

export function crewAlertCount2026(input: CrewAlertInput2026): CrewAlertCount2026 {
  const pending = input.requestsKnown ? safe(input.requests) : 0;
  const atRisk = input.boardKnown ? safe(input.atRisk) : 0;
  const known = input.requestsKnown && input.boardKnown;
  return {
    pending,
    atRisk,
    total: pending + atRisk,
    known,
    // Un plancher n'a de sens que s'il compte quelque chose : « 0 et je n'ai
    // pas tout lu » ne se dit pas « au moins 0 », ça ne se dit pas du tout.
    partial: !known && pending + atRisk > 0,
  };
}
