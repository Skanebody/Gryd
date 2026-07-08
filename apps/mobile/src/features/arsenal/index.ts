/**
 * GRYD — barrel Arsenal V2 (AMENDEMENT-16 §4). Les écrans importent d'ici :
 * `import { ARSENAL_CATALOG, startBoost } from '../src/features/arsenal'`.
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
  type ArsenalScope,
  type ArsenalSectionKey,
} from './catalog';
export {
  activateAttackAlert,
  activateStreakGel,
  fetchFreshOwnedHex,
  type ActivateArsenalError,
  type ActivateArsenalResult,
  type ActivateAttackAlertResult,
  type ActivateStreakGelResult,
} from './activateApi';
export {
  formatArsenalRemaining,
  useActiveAttackAlerts,
  type ActiveAttackAlert,
} from './useAttackAlerts';
export {
  useActiveStreakGel,
  type ActiveStreakGel,
} from './useStreakGels';
export {
  BOOST_CHEST_BONUS_LABEL,
  EQUIP_SCOPE_LABEL,
  INITIAL_CREW_WALL,
  INITIAL_EQUIPPED,
  INITIAL_OWNED,
  boostDurationH,
  boostRemainingMs,
  equipScopeOf,
  equippedItemForScope,
  formatBoostRemaining,
  isFrameItem,
  isTitleItem,
  startBoost,
  supporterLabel,
  useEquippedCosmetics,
  type CrewBoostState,
  type CrewWallEntry,
  type EquipMap,
  type EquipScope,
  type EquipStore,
} from './inventory';
