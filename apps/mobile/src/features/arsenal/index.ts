/**
 * GRYD — barrel Arsenal V2 (AMENDEMENT-16 §4). Les écrans importent d'ici :
 * `import { ARSENAL_CATALOG, shopItems } from '../src/features/arsenal'`.
 */
export {
  ARSENAL_CATALOG,
  ARSENAL_SECTIONS,
  FEATURED_KEYS,
  GIFTABLE_ITEMS,
  defaultCurrency,
  itemByKey,
  itemsInSection,
  type ArsenalCatalogItem,
  type ArsenalCurrency,
  type ArsenalPriceCurrency,
  type ArsenalScope,
  type ArsenalSectionKey,
} from './catalog';
export {
  BOOST_CHEST_BONUS_LABEL,
  INITIAL_CREW_WALL,
  boostDurationH,
  boostRemainingMs,
  equipScopeOf,
  equippedItemForScope,
  formatBoostRemaining,
  isFrameItem,
  isTitleItem,
  startBoost,
  supporterLabel,
  useArsenalInventory,
  useEquippedCosmetics,
  type ArsenalInventorySource,
  type ArsenalInventoryStore,
  type ArsenalWallet,
  type CrewBoostState,
  type CrewWallEntry,
  type EquipMap,
  type EquipScope,
  type EquipStore,
} from './inventory';
export {
  DEMO_ARSENAL_SIGNALS,
  explainArsenalItem,
  rankArsenalItems,
  type ArsenalAdviceNeed,
  type ArsenalItemAdvice,
  type ArsenalNeedKey,
  type ArsenalPlayerSignals,
  type ArsenalRecommendation,
} from './recommendations';
export {
  useArsenalSignals,
  type ArsenalSignalsSource,
  type ArsenalSignalsState,
} from './signals';
// ─── Planche E17 « Boutique & Premium » ──────────────────────────────────────
export {
  PREMIUM_MAX_BENEFITS,
  monthlyEquivalentEur,
  ownershipKindOf,
  premiumItem,
  premiumPrices,
  shopCategoryKeys,
  shopItems,
  shopSectionKeys,
  type PremiumPrices,
  type ShopCategoryKey,
  type ShopOwnership,
} from './shop';
export { useRunInProgress, type RunInProgressState } from './useRunInProgress';
export { ShopGridCard } from './ShopGridCard';
