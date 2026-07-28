/**
 * GRYD — E75 « Gestion d'abonnement et achats » : L'HISTORIQUE MINIMAL.
 *
 * La spec E75 demande « historique minimal ». Le mot MINIMAL est pris au sérieux
 * ici, et dans les deux sens :
 *
 *  · minimal en CONTENU — un achat, une date. Ni prix (le montant débité vient
 *    du Store et n'est PAS dans `CustomerInfo` : l'écrire serait le fabriquer),
 *    ni statut de remboursement, ni moyen de paiement ;
 *  · minimal en SOURCE — uniquement ce que `CustomerInfo` porte réellement.
 *    GRYD n'a AUCUNE table d'achats côté serveur qu'on pourrait relire : la
 *    seule mémoire disponible est celle du Store, via RevenueCat. Un historique
 *    reconstruit autrement serait inventé.
 *
 * ── UNE DATE ILLISIBLE N'EST PAS UNE LIGNE ────────────────────────────────
 * `allPurchaseDatesByProduct` peut porter `null` pour un produit connu du SDK
 * mais jamais acheté sur ce compte. Une entrée sans date exploitable est
 * ÉCARTÉE plutôt que datée d'aujourd'hui ou affichée sans date : « tu as acheté
 * ceci » sans savoir quand est une demi-affirmation, et un écran de facturation
 * n'a pas le droit d'en faire.
 *
 * ── L'ORDRE EST UN FAIT, PAS UN CHOIX ─────────────────────────────────────
 * Du plus récent au plus ancien, et à date égale par identifiant de produit —
 * pour que deux lectures du même `CustomerInfo` rendent toujours la même liste.
 *
 * PUR : aucun import du SDK, aucune horloge, aucun `Intl`. Testable sous Deno.
 */
import type { CustomerInfoLike } from './entitlement';

/** Une ligne d'historique : QUOI, QUAND. Rien d'autre n'est connu. */
export interface PurchaseRecord {
  /** Identifiant de produit tel que le Store le nomme. */
  readonly productId: string;
  readonly atMs: number;
}

function parseIsoMs(iso: unknown): number | null {
  if (typeof iso !== 'string' || iso.trim().length === 0) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Historique d'achats lisible d'un `CustomerInfo`, du plus récent au plus
 * ancien. Liste VIDE = rien à montrer (état vide de première classe), à ne pas
 * confondre avec « pas encore lu » — ce dernier est l'affaire de l'écran, qui
 * n'appelle cette fonction qu'avec un `CustomerInfo` réellement obtenu.
 */
export function readPurchaseHistory(info: CustomerInfoLike): PurchaseRecord[] {
  const byProduct = info.allPurchaseDatesByProduct;
  if (typeof byProduct !== 'object' || byProduct === null) return [];
  const out: PurchaseRecord[] = [];
  for (const [productId, iso] of Object.entries(byProduct)) {
    const id = typeof productId === 'string' ? productId.trim() : '';
    if (id.length === 0) continue;
    const atMs = parseIsoMs(iso);
    if (atMs === null) continue;
    out.push({ productId: id, atMs });
  }
  out.sort((a, b) => (b.atMs - a.atMs) || a.productId.localeCompare(b.productId));
  return out;
}

/**
 * Combien de lignes E75 affiche au maximum. « Minimal » (spec) : la page de
 * gestion sert à VÉRIFIER un abonnement, pas à tenir une comptabilité —
 * l'historique complet vit dans le Store, où le bouton « Gérer » emmène.
 */
export const PURCHASE_HISTORY_MAX_ROWS = 5;

/**
 * Les N lignes les plus récentes. L'écran compare `records.length` au résultat
 * pour DIRE qu'il en cache — une troncature silencieuse laisserait croire que
 * le compte n'a jamais rien acheté d'autre.
 */
export function recentPurchases(
  records: readonly PurchaseRecord[],
  max: number = PURCHASE_HISTORY_MAX_ROWS,
): PurchaseRecord[] {
  if (!Number.isFinite(max) || max <= 0) return [];
  return records.slice(0, Math.floor(max));
}
