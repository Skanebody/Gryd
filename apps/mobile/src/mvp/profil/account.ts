/**
 * GRYD — LE COMPTE : ce que l'écran propose, et ce qu'il refuse. PUR (lot M12).
 *
 * ─── POURQUOI CE MODULE EXISTE ──────────────────────────────────────────────
 * La suppression de compte est une EXIGENCE App Store (5.1.1(v) : une app qui
 * permet de créer un compte doit permettre de le supprimer DANS l'app) et une
 * obligation RGPD. C'est aussi l'action la plus irréversible du produit.
 *
 * Le serveur fait déjà tout le travail — `request_account_deletion`,
 * `account_deletion_status`, `cancel_account_deletion`, `purge_due_accounts`,
 * avec un DÉLAI DE GRÂCE. Ce module ne réimplémente rien : il décide ce que
 * l'écran AFFICHE d'un état de suppression, et cette décision est ici parce
 * qu'elle a exactement deux façons de mal tourner, toutes deux graves.
 *
 * ─── LES DEUX FAÇONS DE MAL TOURNER ─────────────────────────────────────────
 * 1. PROPOSER « SUPPRIMER » À QUELQU'UN QUI L'A DÉJÀ DEMANDÉ. Il croirait que
 *    sa première demande n'a pas pris, et redemanderait — sans jamais voir
 *    qu'il lui reste des jours pour changer d'avis. Le délai de grâce existe
 *    précisément pour ça ; le cacher l'annule.
 * 2. LAISSER CROIRE QUE C'EST IMMÉDIAT. Une suppression annoncée « faite »
 *    alors qu'elle est programmée est un mensonge sur la donnée la plus
 *    sensible qui soit.
 *
 * ⚠️ CE MODULE NE SUPPRIME RIEN. Il ne connaît ni réseau ni identifiant : il
 * traduit un état en écran.
 */

/** La réponse de `account_deletion_status()`, réduite à ce qu'on en lit. */
export interface DeletionStatus {
  readonly ok: boolean;
  readonly pending?: boolean;
  /** Jours de grâce restants avant purge. */
  readonly graceDays?: number;
}

/**
 * Ce que la section « compte » propose.
 *
 *   · `unknown`   — la lecture n'a pas abouti. On ne propose RIEN : offrir de
 *     supprimer sans savoir où en est la demande précédente est le pire des
 *     deux mondes.
 *   · `deletable` — aucune demande en cours. On peut demander la suppression.
 *   · `pending`   — une demande court. On DIT le délai, et on offre d'ANNULER.
 */
export type AccountView =
  | { readonly kind: 'unknown' }
  | { readonly kind: 'deletable' }
  | { readonly kind: 'pending'; readonly graceDays: number };

/**
 * État serveur → ce que l'écran montre. PURE.
 *
 * `graceDays` absent ou aberrant ⇒ `unknown`, PAS `pending` avec un zéro : « il
 * te reste 0 jour » se lit comme « c'est déjà fait », alors qu'on ne sait
 * simplement pas. Sur cette action-là, se taire vaut mieux qu'approximer.
 */
export function accountView(status: DeletionStatus | null | undefined): AccountView {
  if (status?.ok !== true) return { kind: 'unknown' };
  if (status.pending !== true) return { kind: 'deletable' };
  const j = status.graceDays;
  if (typeof j !== 'number' || !Number.isFinite(j) || j < 0) return { kind: 'unknown' };
  return { kind: 'pending', graceDays: j };
}

/**
 * La suppression demande-t-elle une CONFIRMATION explicite ? Toujours OUI.
 *
 * L17 interdit les dark patterns, et son symétrique vaut aussi : une action
 * irréversible atteinte en un seul tap est un piège, pas une simplification.
 * Constante plutôt que règle implicite, pour qu'un écran ne puisse pas
 * « oublier » la confirmation en croyant gagner un geste.
 */
export const DELETION_NEEDS_CONFIRMATION = true;

/**
 * L'export des données est-il proposé ? Toujours OUI dès qu'il y a un compte.
 *
 * RGPD : la portabilité ne se mérite pas et ne se négocie pas. Elle n'est PAS
 * conditionnée au fait d'avoir des données — un export vide est une réponse
 * légitime, et refuser l'export à quelqu'un qui n'a rien couru lui ferait
 * croire que le droit dépend de l'usage.
 */
export function canExport(signedIn: boolean): boolean {
  return signedIn;
}
