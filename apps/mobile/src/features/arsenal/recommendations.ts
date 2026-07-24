/**
 * GRYD — recommandations Arsenal.
 *
 * Le client affiche le conseil ; il ne décide jamais un avantage de jeu.
 * Les signaux viennent de `signals.ts` : profil local + crew/carte, enrichis en
 * lecture seule par Supabase quand une session existe.
 */
import {
  BONUS_CREW_CHEST_MIN_RATIO,
  CREW_BOOST_CHEST_MULTIPLIER,
  SECTOR_PRESSURE_BANDS,
  SHIELD_DURATION_HOURS,
  SKUS,
} from '@klaim/shared';
import { ARSENAL_ADVICE_I18N as A } from '../../i18n/catalog/arsenalAdvice';
import { C } from '../../i18n/catalog/flagged';
import type { Entry } from '../../i18n/types';
import { ARSENAL_CATALOG, type ArsenalCatalogItem } from './catalog';
import { equipScopeOf, type EquipMap } from './inventory';

export type ArsenalNeedKey = 'for_you' | 'defense' | 'crew' | 'identity' | 'share';
export type ArsenalAdviceNeed = Exclude<ArsenalNeedKey, 'for_you'>;

export interface ArsenalPlayerSignals {
  /** Score de pression du secteur actif (0-100, source serveur V1). */
  pressureScore: number;
  /** Le joueur appartient à un crew, donc les contributions crew peuvent être utiles. */
  hasCrew: boolean;
  /** Pourcentage restant avant le prochain coffre crew. */
  crewChestRemainingPct: number;
  /** La série hebdo est fragile. */
  weeklyStreakAtRisk: boolean;
  /** Le joueur partage souvent ses runs ou vient de capturer une zone. */
  shareIntent: boolean;
  /** Le joueur a déjà équipé/consulté des cosmétiques de carte. */
  wantsMapIdentity: boolean;
  /** Fenêtre sociale utile pour un boost collectif. */
  nextCrewWindow: 'today' | 'weekend' | 'season';
}

export interface ArsenalItemAdvice {
  need: ArsenalAdviceNeed;
  /** Chaque champ est une Entry i18n (traduite au rendu par le t() réactif). */
  headline: Entry;
  mechanic: Entry;
  benefit: Entry;
  whyNow: Entry;
  guardrail: Entry;
  /** Valeurs interpolées ({hours}/{boostLabel}/{duration}) résolues au rendu. */
  vars?: Record<string, string | number>;
}

export interface ArsenalRecommendation {
  item: ArsenalCatalogItem;
  advice: ArsenalItemAdvice;
  score: number;
}

const HIGH_PRESSURE_SCORE = SECTOR_PRESSURE_BANDS.contestee;
const CHEST_CLOSE_REMAINING_PCT = Math.round((1 - BONUS_CREW_CHEST_MIN_RATIO) * 100);

const RECOMMENDATION_WEIGHTS = {
  base: 10,
  highPressureDefense: 42,
  streakRisk: 32,
  crewMember: 24,
  chestClose: 30,
  weekendBoost: 26,
  identityIntent: 22,
  shareIntent: 24,
  affordable: 10,
  ownedPenalty: 34,
  equippedPenalty: 48,
  packOnlyPenalty: 28,
  draftPenalty: 80,
  eurFrictionPenalty: 6,
} as const;

export const DEMO_ARSENAL_SIGNALS: ArsenalPlayerSignals = {
  pressureScore: 78,
  hasCrew: true,
  crewChestRemainingPct: 18,
  weeklyStreakAtRisk: true,
  shareIntent: true,
  wantsMapIdentity: true,
  nextCrewWindow: 'weekend',
};

export const ARSENAL_NEED_OPTIONS: readonly { id: ArsenalNeedKey; label: string }[] = [
  { id: 'for_you', label: 'Pour toi' },
  { id: 'defense', label: 'Défense' },
  { id: 'crew', label: 'Crew' },
  { id: 'identity', label: 'Style' },
  { id: 'share', label: 'Partage' },
];

const BOOST_BONUS_LABEL = `+${Math.round((CREW_BOOST_CHEST_MULTIPLIER - 1) * 100)} % coffre`;

function defaultWhy(signals: ArsenalPlayerSignals, need: ArsenalAdviceNeed): Entry {
  switch (need) {
    case 'defense':
      return signals.pressureScore >= HIGH_PRESSURE_SCORE
        ? A['advice.why.defense.highPressure']
        : A['advice.why.defense.default'];
    case 'crew':
      return signals.crewChestRemainingPct <= CHEST_CLOSE_REMAINING_PCT
        ? A['advice.why.crew.closeChest']
        : A['advice.why.crew.default'];
    case 'identity':
      return signals.wantsMapIdentity
        ? A['advice.why.identity.wantsMap']
        : A['advice.why.identity.default'];
    case 'share':
      return signals.shareIntent
        ? A['advice.why.share.intent']
        : A['advice.why.share.default'];
  }
}

/** Interpolation d'un boost crew : label du bonus (game-rules) + durée selon la SKU. */
function boostVars(item: ArsenalCatalogItem): Record<string, string | number> {
  return { boostLabel: BOOST_BONUS_LABEL, duration: item.key === SKUS.crewBoost24 ? '24 h' : '72 h' };
}

export function explainArsenalItem(
  item: ArsenalCatalogItem,
  signals: ArsenalPlayerSignals = DEMO_ARSENAL_SIGNALS,
): ArsenalItemAdvice {
  // Garde-fous shield/streak_gel/scout_ping : Entry DÉJÀ i18n (flagged.ts). Le
  // reste des chaînes vient de ARSENAL_ADVICE_I18N (A). Tout est une Entry —
  // explainArsenalItem reste PUR (aucun t ici) ; le rendu traduit.
  if (item.key === 'shield') {
    return {
      need: 'defense',
      headline: A['advice.shield.headline'],
      mechanic: A['advice.shield.mechanic'],
      benefit: A['advice.shield.benefit'],
      whyNow: defaultWhy(signals, 'defense'),
      guardrail: C.guardrailShield,
      vars: { hours: SHIELD_DURATION_HOURS },
    };
  }

  if (item.key === 'streak_gel') {
    // La série porte un multiplicateur ×1,5 sur les POINTS de territoire : la
    // protéger est FONCTIONNEL, donc l'objet est invendable — le garde-fou (déjà
    // i18n) le dit sans mentir « aucun effet territoire ».
    return {
      need: 'defense',
      headline: A['advice.streakGel.headline'],
      mechanic: A['advice.streakGel.mechanic'],
      benefit: A['advice.streakGel.benefit'],
      whyNow: signals.weeklyStreakAtRisk
        ? A['advice.streakGel.whyNow.atRisk']
        : A['advice.streakGel.whyNow.default'],
      guardrail: C.guardrailStreakGel,
    };
  }

  if (item.key === 'scout_ping') {
    return {
      need: 'defense',
      headline: A['advice.scoutPing.headline'],
      mechanic: A['advice.scoutPing.mechanic'],
      benefit: A['advice.scoutPing.benefit'],
      whyNow: defaultWhy(signals, 'defense'),
      guardrail: C.guardrailScoutPing,
    };
  }

  if (item.key === SKUS.crewBoost24 || item.key === SKUS.crewBoost72) {
    return {
      need: 'crew',
      headline: A['advice.crewBoost.headline'],
      mechanic: A['advice.crewBoost.mechanic'],
      benefit: A['advice.crewBoost.benefit'],
      whyNow: defaultWhy(signals, 'crew'),
      guardrail: A['advice.crewBoost.guardrail'],
      vars: boostVars(item),
    };
  }

  if (item.key === SKUS.crewBoostWeekend) {
    return {
      need: 'crew',
      headline: A['advice.crewBoostWeekend.headline'],
      mechanic: A['advice.crewBoostWeekend.mechanic'],
      benefit: A['advice.crewBoostWeekend.benefit'],
      whyNow:
        signals.nextCrewWindow === 'weekend'
          ? A['advice.crewBoostWeekend.whyNow']
          : defaultWhy(signals, 'crew'),
      guardrail: A['advice.crewBoostWeekend.guardrail'],
      vars: { boostLabel: BOOST_BONUS_LABEL },
    };
  }

  if (item.key === SKUS.crewBoostSeason) {
    return {
      need: 'crew',
      headline: A['advice.crewBoostSeason.headline'],
      mechanic: A['advice.crewBoostSeason.mechanic'],
      benefit: A['advice.crewBoostSeason.benefit'],
      whyNow:
        signals.nextCrewWindow === 'season'
          ? A['advice.crewBoostSeason.whyNow.season']
          : A['advice.crewBoostSeason.whyNow.default'],
      guardrail: A['advice.crewBoostSeason.guardrail'],
      vars: { boostLabel: BOOST_BONUS_LABEL },
    };
  }

  if (item.key === 'crew_cosmetic_chest') {
    return {
      need: 'crew',
      headline: A['advice.cosmeticChest.headline'],
      mechanic: A['advice.cosmeticChest.mechanic'],
      benefit: A['advice.cosmeticChest.benefit'],
      whyNow: defaultWhy(signals, 'crew'),
      guardrail: A['advice.cosmeticChest.guardrail'],
    };
  }

  if (item.section === 'banners' || item.section === 'emblems') {
    return {
      need: 'crew',
      headline: A['advice.crewIdentity.headline'],
      mechanic: A['advice.crewIdentity.mechanic'],
      benefit: A['advice.crewIdentity.benefit'],
      whyNow: signals.hasCrew
        ? A['advice.crewIdentity.whyNow.hasCrew']
        : A['advice.crewIdentity.whyNow.default'],
      guardrail: A['advice.crewIdentity.guardrail'],
    };
  }

  if (item.section === 'templates') {
    return {
      need: 'share',
      headline: A['advice.templates.headline'],
      mechanic: A['advice.templates.mechanic'],
      benefit: A['advice.templates.benefit'],
      whyNow: defaultWhy(signals, 'share'),
      guardrail: A['advice.templates.guardrail'],
    };
  }

  if (item.section === 'skins_trace') {
    return {
      need: 'identity',
      headline: A['advice.skinsTrace.headline'],
      mechanic: A['advice.skinsTrace.mechanic'],
      benefit: A['advice.skinsTrace.benefit'],
      whyNow: defaultWhy(signals, 'identity'),
      guardrail: A['advice.skinsTrace.guardrail'],
    };
  }

  if (item.section === 'skins_territory') {
    return {
      need: 'identity',
      headline: A['advice.skinsTerritory.headline'],
      mechanic: A['advice.skinsTerritory.mechanic'],
      benefit: A['advice.skinsTerritory.benefit'],
      whyNow: defaultWhy(signals, 'identity'),
      guardrail: A['advice.skinsTerritory.guardrail'],
    };
  }

  if (item.section === 'frames') {
    return {
      need: 'identity',
      headline: A['advice.frames.headline'],
      mechanic: A['advice.frames.mechanic'],
      benefit: A['advice.frames.benefit'],
      whyNow: defaultWhy(signals, 'identity'),
      guardrail: A['advice.frames.guardrail'],
    };
  }

  if (item.section === 'subscriptions') {
    return {
      need: 'identity',
      headline: A['advice.subscriptions.headline'],
      mechanic: item.draft
        ? A['advice.subscriptions.mechanic.draft']
        : A['advice.subscriptions.mechanic.active'],
      benefit: item.draft
        ? A['advice.subscriptions.benefit.draft']
        : A['advice.subscriptions.benefit.active'],
      whyNow: item.draft ? A['advice.subscriptions.whyNow.draft'] : defaultWhy(signals, 'identity'),
      guardrail: A['advice.subscriptions.guardrail'],
    };
  }

  if (item.key === SKUS.starterPack || item.key === SKUS.founderPack) {
    return {
      need: 'identity',
      headline: A['advice.pack.headline'],
      mechanic: A['advice.pack.mechanic'],
      benefit: A['advice.pack.benefit'],
      whyNow: defaultWhy(signals, 'identity'),
      guardrail: A['advice.pack.guardrail'],
    };
  }

  if (item.section === 'packs') {
    return {
      need: 'identity',
      headline: A['advice.packs.headline'],
      mechanic: A['advice.packs.mechanic'],
      benefit: A['advice.packs.benefit'],
      whyNow: A['advice.packs.whyNow'],
      guardrail: A['advice.packs.guardrail'],
    };
  }

  return {
    need: 'identity',
    headline: A['advice.fallback.headline'],
    mechanic: A['advice.fallback.mechanic'],
    benefit: A['advice.fallback.benefit'],
    whyNow: defaultWhy(signals, 'identity'),
    guardrail: A['advice.fallback.guardrail'],
  };
}

function needScore(need: ArsenalAdviceNeed, signals: ArsenalPlayerSignals): number {
  switch (need) {
    case 'defense':
      return (
        (signals.pressureScore >= HIGH_PRESSURE_SCORE ? RECOMMENDATION_WEIGHTS.highPressureDefense : 0) +
        (signals.weeklyStreakAtRisk ? RECOMMENDATION_WEIGHTS.streakRisk : 0)
      );
    case 'crew':
      return (
        (signals.hasCrew ? RECOMMENDATION_WEIGHTS.crewMember : 0) +
        (signals.crewChestRemainingPct <= CHEST_CLOSE_REMAINING_PCT
          ? RECOMMENDATION_WEIGHTS.chestClose
          : 0) +
        (signals.nextCrewWindow === 'weekend' ? RECOMMENDATION_WEIGHTS.weekendBoost : 0)
      );
    case 'identity':
      return signals.wantsMapIdentity ? RECOMMENDATION_WEIGHTS.identityIntent : 0;
    case 'share':
      return signals.shareIntent ? RECOMMENDATION_WEIGHTS.shareIntent : 0;
  }
}

function itemSpecificScore(item: ArsenalCatalogItem, signals: ArsenalPlayerSignals): number {
  if (item.key === 'shield' && signals.pressureScore >= HIGH_PRESSURE_SCORE) return 18;
  if (item.key === 'streak_gel' && signals.weeklyStreakAtRisk) return 16;
  if (item.key === SKUS.crewBoostWeekend && signals.nextCrewWindow === 'weekend') return 18;
  if (item.section === 'templates' && signals.shareIntent) return 10;
  if (item.section === 'skins_trace' && signals.wantsMapIdentity) return 8;
  return 0;
}

export function rankArsenalItems(
  signals: ArsenalPlayerSignals,
  state: {
    ownedKeys: ReadonlySet<string>;
    equipped: EquipMap;
    walletEclats: number;
  },
): ArsenalRecommendation[] {
  const equippedKeys = new Set(Object.values(state.equipped).filter(Boolean));

  return ARSENAL_CATALOG.map((item) => {
    const advice = explainArsenalItem(item, signals);
    const owned = state.ownedKeys.has(item.key);
    const equipped = equippedKeys.has(item.key);
    const equipable = equipScopeOf(item.key) !== null;
    let score =
      RECOMMENDATION_WEIGHTS.base + needScore(advice.need, signals) + itemSpecificScore(item, signals);

    if (item.priceShards !== undefined && state.walletEclats >= item.priceShards) {
      score += RECOMMENDATION_WEIGHTS.affordable;
    }
    if (item.priceEur !== undefined && item.priceShards === undefined) {
      score -= RECOMMENDATION_WEIGHTS.eurFrictionPenalty;
    }
    if (item.packOnly && !owned) score -= RECOMMENDATION_WEIGHTS.packOnlyPenalty;
    if (item.draft) score -= RECOMMENDATION_WEIGHTS.draftPenalty;
    if (owned && (!equipable || equipped)) score -= RECOMMENDATION_WEIGHTS.ownedPenalty;
    if (equipped) score -= RECOMMENDATION_WEIGHTS.equippedPenalty;

    return { item, advice, score };
  }).sort((a, b) => b.score - a.score);
}
