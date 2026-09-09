/**
 * GRYD — G28 : « États : achat en attente, annulé, refusé, réussi, déjà détenu,
 * restauration sans droit, résiliation en fin de période. »
 *
 * ── CE QUE CE MODULE RÉPARE ────────────────────────────────────────────────
 * `purchasePremiumPackage` ne distinguait QUE l'annulation : tout le reste
 * devenait `{kind:'failed'}`, et l'écran écrivait « L'action n'a pas abouti.
 * Réessaie ou contacte le support. » Deux cas RÉELS y étaient noyés :
 *  · le Store a REFUSÉ (moyen de paiement invalide, achat non autorisé sur
 *    l'appareil) — réessayer ne changera rien, et le support non plus ;
 *  · le produit est DÉJÀ DÉTENU — proposer « réessaie » revient à proposer de
 *    payer deux fois ce qu'on possède.
 * Un achat DIFFÉRÉ (« Demander à acheter », authentification forte) tombait
 * lui aussi dans le même sac quand le SDK le remonte en erreur.
 *
 * ── POURQUOI DEUX LECTURES DU MÊME FAIT ────────────────────────────────────
 * `client.ts` est la SEULE frontière avec RevenueCat et n'importe aucun type du
 * SDK. On lit donc la forme STRUCTURELLE de l'erreur : `readableErrorCode` (le
 * nom, stable et lisible) ET `code` (numérique ou numérique-en-chaîne selon les
 * versions). Un code inconnu reste `unknown` : on ne requalifie jamais une
 * nouveauté du SDK en diagnostic inventé.
 */
export type PurchaseFailure2026 =
  | 'cancelled' | 'pending' | 'declined' | 'already_owned' | 'store_problem' | 'network' | 'unknown';

/** Codes RevenueCat (PURCHASES_ERROR_CODE) réellement distingués ici. */
const BY_NAME: Readonly<Record<string, PurchaseFailure2026>> = {
  PURCHASE_CANCELLED_ERROR: 'cancelled',
  PAYMENT_PENDING_ERROR: 'pending',
  PURCHASE_NOT_ALLOWED_ERROR: 'declined',
  PURCHASE_INVALID_ERROR: 'declined',
  PRODUCT_ALREADY_PURCHASED_ERROR: 'already_owned',
  STORE_PROBLEM_ERROR: 'store_problem',
  PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR: 'store_problem',
  NETWORK_ERROR: 'network',
};
const BY_CODE: Readonly<Record<string, PurchaseFailure2026>> = {
  '1': 'cancelled', '2': 'store_problem', '3': 'declined', '4': 'declined',
  '5': 'store_problem', '6': 'already_owned', '10': 'network', '23': 'pending',
};

export interface StoreErrorLike2026 {
  readonly userCancelled?: boolean;
  readonly code?: string | number;
  readonly readableErrorCode?: string;
  readonly message?: string;
}

export function readPurchaseFailure2026(error: unknown): PurchaseFailure2026 {
  if (!error || typeof error !== 'object') return 'unknown';
  const value = error as StoreErrorLike2026;
  // Fermer la feuille du Store est le seul geste que TOUS les SDK signalent
  // de la même façon : il prime sur un code éventuellement plus vague.
  if (value.userCancelled === true) return 'cancelled';
  const named = typeof value.readableErrorCode === 'string' ? BY_NAME[value.readableErrorCode] : undefined;
  if (named) return named;
  const code = typeof value.code === 'number' || typeof value.code === 'string' ? String(value.code) : null;
  return code !== null && Object.hasOwn(BY_CODE, code) ? BY_CODE[code]! : 'unknown';
}
