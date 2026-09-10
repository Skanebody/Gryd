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
export { useGrydPlusAccess, refreshServerGrydPlusAccess } from './useGrydPlusAccess';
// ── G28 : les sept états nommés d'un achat et d'un droit ────────────────────
export { readPurchaseFailure2026 } from './purchaseFailure2026';
export type { PurchaseFailure2026, StoreErrorLike2026 } from './purchaseFailure2026';
export { grydPlusAccessState2026, readServerGrydPlusAccess2026 } from './access2026';
export type { GrydPlusAccessStatus2026, ServerGrydPlusAccess2026 } from './access2026';
// ── L'OFFRE DÉCIDÉE (game-rules) + LA BOUTIQUE RÉELLE (§16.1, retour 10/09) ──
export {
  GRYD_PLUS_BENEFITS_2026,
  GRYD_PLUS_PLANNED_PRICES_2026,
  PERMANENT_COLLECTION_PRICES_2026,
  formatEurCents2026,
  noPaidGameAdvantage2026,
  plannedYearlySavingsPercent2026,
  showsPlannedPrices2026,
  storeAvailability2026,
  storeSaysNotOnSale2026,
} from './plan2026';
export {
  GRYD_PLUS_BENEFIT_COPY_2026,
  NO_PAID_ADVANTAGE_COPY_2026,
  NO_TRIAL_NOTICE_2026,
  PERIOD_COPY_2026,
  PERMANENT_COLLECTION_COPY_2026,
  PLANNED_PRICE_NOTICE_2026,
  RENEWAL_NOTICE_2026,
  STORE_CLOSED_COPY_2026,
  STORE_CLOSED_TITLE_2026,
  benefitLabel2026,
  pick2026,
} from './planCopy2026';
export type { Copy2026 } from './planCopy2026';
export type {
  GrydPlusBenefit2026,
  GrydPlusBenefitId2026,
  GrydPlusPeriod2026,
  GrydPlusPlannedPrice2026,
  PermanentCollectionId2026,
  PermanentCollectionPrice2026,
  StoreAvailability2026,
  StoreClosedReason2026,
} from './plan2026';
export type { CommercialActionResult2026 } from './useCommercialCollections2026';
