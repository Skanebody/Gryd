/**
 * GRYD — E72/E73 : LE PRIX EN ARGENT RÉEL D'UN OBJET DE BOUTIQUE VIENT DU STORE.
 *
 * ══ POURQUOI CE FICHIER EXISTE (28/07/2026) ═══════════════════════════════
 * La constitution est catégorique : « LES PRIX VIENNENT DU STORE OU D'UNE
 * REMOTE CONFIG — jamais codés en dur dans l'app ». La boutique mobile faisait
 * l'inverse : `app/arsenal.tsx` et `features/arsenal/ShopGridCard.tsx`
 * rendaient `formatEur(item.priceEur)`, c'est-à-dire `SKU_PRICES_EUR` de
 * `game-rules.ts` — « 4,99 € », « 34,99 € », « 2,99 € »… écrits dans le code.
 *
 * Ces montants sont une RÉFÉRENCE DE CATALOGUE (ils servent au seed serveur et
 * au site web), pas un prix de vente : le montant réellement débité dépend de la
 * boutique du joueur — devise, TVA, palier régional App Store, promotion en
 * cours. « 4,99 € » devient faux dès le premier joueur brésilien, et une app qui
 * affiche un montant qu'elle ne fera pas payer MENT au sens exact de CLAUDE.md.
 * Apple refuse d'ailleurs les prix codés en dur pour cette raison précise.
 *
 * `offerings.ts` tenait déjà cette règle pour l'abonnement (E74). Ce module la
 * tient pour LE RESTE DU CATALOGUE (packs, Éclats, boosts, cosmétiques crew).
 *
 * ══ CE QU'IL NE FAIT PAS ══════════════════════════════════════════════════
 * Il ne CONVERTIT pas, ne FORMATE pas, n'ARRONDIT pas et n'invente aucun repli.
 * `priceString` arrive du store déjà localisé ; on le recopie tel quel ou on
 * n'affiche RIEN. Un prix inconnu n'est pas « 0 », ni « — €», ni le prix
 * catalogue : c'est une absence, que l'écran dit avec ses mots.
 *
 * ══ APPARIEMENT PRODUIT ↔ OBJET DE CATALOGUE ══════════════════════════════
 * Les clés du catalogue GRYD sont nues (`club_monthly`, `eclats_l`) ; les
 * identifiants de produit des stores sont souvent préfixés du bundle
 * (`fr.nexus1993.gryd.club_monthly`). On accepte donc l'égalité exacte OU un
 * identifiant dont le DERNIER segment pointé vaut exactement la clé.
 * Et si DEUX produits revendiquent la même clé, on n'en retient AUCUN :
 * attribuer un prix au mauvais objet serait pire que ne pas l'afficher.
 *
 * PUR : aucun import du SDK, de React Native ou d'`Intl`. Testable sous Deno.
 */
import type { StoreProductLike } from './offerings';

/** Prix lisibles, indexés par CLÉ DE CATALOGUE GRYD (jamais par id store). */
export type StorePriceMap = ReadonlyMap<string, string>;

function nonEmpty(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  return v.length > 0 ? v : null;
}

/**
 * Clé de catalogue désignée par un identifiant de produit store, ou `null`.
 * `fr.nexus1993.gryd.eclats_l` → `eclats_l` ; `eclats_l` → `eclats_l`.
 */
export function catalogKeyOfProductId(productId: string | null | undefined): string | null {
  const id = nonEmpty(productId);
  if (id === null) return null;
  const dot = id.lastIndexOf('.');
  if (dot < 0) return id;
  return nonEmpty(id.slice(dot + 1));
}

/**
 * Produits du store → prix affichables par clé de catalogue.
 *
 * Trois refus, chacun pour une raison distincte :
 *  · produit sans identifiant → on ne sait pas à quoi il se rapporte ;
 *  · produit sans `priceString` → le store n'a pas donné de montant, on n'en
 *    fabrique pas ;
 *  · deux produits pour une même clé → ambiguïté, donc AUCUN prix pour elle.
 */
export function readStorePrices(
  products: readonly StoreProductLike[] | null | undefined,
): StorePriceMap {
  const seen = new Map<string, string | null>();
  for (const product of products ?? []) {
    const key = catalogKeyOfProductId(product?.identifier);
    if (key === null) continue;
    const label = nonEmpty(product?.priceString);
    if (seen.has(key)) {
      // Collision : on invalide la clé au lieu de choisir arbitrairement.
      seen.set(key, null);
      continue;
    }
    seen.set(key, label);
  }
  const out = new Map<string, string>();
  for (const [key, label] of seen) {
    if (label !== null) out.set(key, label);
  }
  return out;
}

/** Le prix d'un objet, ou `null`. C'est le SEUL accès autorisé à un montant. */
export function storePriceOf(prices: StorePriceMap, catalogKey: string): string | null {
  return prices.get(catalogKey) ?? null;
}
