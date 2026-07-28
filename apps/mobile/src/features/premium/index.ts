/**
 * GRYD — PREMIUM : la porte d'entrée du domaine (E74).
 *
 * Trois couches, dans l'ordre de pureté :
 *   · `capability` / `entitlement` / `offerings` / `labels` — PURS, testés Deno ;
 *   · `client` — la SEULE frontière avec `react-native-purchases` ;
 *   · `usePremium` — la machine d'états que l'écran consomme.
 *
 * ANTI PAY-TO-WIN (§1.6) : rien d'exporté ici ne doit être lu par le moteur de
 * capture, de défense ou de classement. Premium est cosmétique, statutaire et
 * social — jamais une capacité de jeu.
 */
export { purchaseCapability, purchasePlatform } from './capability';
export type { PurchaseBlockedReason, PurchaseCapability, PurchasePlatform } from './capability';
export {
  DEFAULT_PRO_ENTITLEMENT_ID,
  isProActive,
  managementUrlOf,
  readProStatus,
} from './entitlement';
export type { CustomerInfoLike, EntitlementInfoLike, ProStatus } from './entitlement';
export {
  defaultOfferPeriod,
  freeTrialOf,
  isPurchasable,
  readOffers,
  yearlyIsCheaper,
  yearlySavingsPercent,
} from './offerings';
export type { FreeTrial, OfferPeriod, OfferingLike, PackageLike, PremiumOffer } from './offerings';
export type { StoreProductLike } from './offerings';
export { offerLabelEntry, trialUnitEntry } from './labels';
export { PRO_ENTITLEMENT_ID, purchasesCapability } from './client';
export { usePremium } from './usePremium';
export type { PremiumActionResult, PremiumStatus, UsePremiumResult } from './usePremium';
// ── E72/E73 : les prix d'argent réel de la BOUTIQUE (constitution §9) ────────
export { catalogKeyOfProductId, readStorePrices, storePriceOf } from './storePrices';
export type { StorePriceMap } from './storePrices';
export { useStorePrices } from './useStorePrices';
export type { StorePricesStatus, UseStorePricesResult } from './useStorePrices';
// ── E75 : historique minimal d'achats ───────────────────────────────────────
export {
  PURCHASE_HISTORY_MAX_ROWS,
  readPurchaseHistory,
  recentPurchases,
} from './purchaseHistory';
export type { PurchaseRecord } from './purchaseHistory';
