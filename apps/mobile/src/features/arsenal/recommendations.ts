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
  headline: string;
  mechanic: string;
  benefit: string;
  whyNow: string;
  guardrail: string;
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

function defaultWhy(signals: ArsenalPlayerSignals, need: ArsenalAdviceNeed): string {
  switch (need) {
    case 'defense':
      return signals.pressureScore >= HIGH_PRESSURE_SCORE
        ? 'Un secteur actif est sous pression : GRYD privilégie les outils qui clarifient ou temporisent.'
        : 'Utile quand tu veux choisir une zone avant de courir.';
    case 'crew':
      return signals.crewChestRemainingPct <= CHEST_CLOSE_REMAINING_PCT
        ? 'Ton crew est proche du prochain coffre : une contribution collective devient plus lisible.'
        : 'Utile quand le crew prépare une sortie ou veut mieux s’organiser.';
    case 'identity':
      return signals.wantsMapIdentity
        ? 'Tu personnalises déjà ta trace : GRYD pousse les items visibles dans ton style de run.'
        : 'Utile pour rendre ton profil et ta carte plus reconnaissables.';
    case 'share':
      return signals.shareIntent
        ? 'Tu as une capture à raconter : GRYD privilégie les formats qui expliquent ton run en un coup d’œil.'
        : 'Utile après une zone prise, une boucle fermée ou une sortie crew.';
  }
}

export function explainArsenalItem(
  item: ArsenalCatalogItem,
  signals: ArsenalPlayerSignals = DEMO_ARSENAL_SIGNALS,
): ArsenalItemAdvice {
  if (item.key === 'shield') {
    return {
      need: 'defense',
      headline: 'Gagner du temps sur une zone sensible',
      mechanic: 'Tu l’actives sur une zone tenue : elle passe en protection temporaire.',
      benefit: `Protège un secteur pendant ${SHIELD_DURATION_HOURS} h pour laisser ton crew répondre.`,
      whyNow: defaultWhy(signals, 'defense'),
      guardrail: 'Ne capture rien, ne donne pas de points et ne rend pas invincible.',
    };
  }

  if (item.key === 'streak_gel') {
    return {
      need: 'defense',
      headline: 'Sauver ta régularité',
      mechanic: 'Tu le consommes sur ta série hebdo : GRYD garde la continuité une fois.',
      benefit: 'Protège ta série hebdo si une semaine saute.',
      whyNow: signals.weeklyStreakAtRisk
        ? 'Ta série est le signal fragile du moment : GRYD le remonte avant les cosmétiques.'
        : 'Utile quand tu sais déjà qu’une semaine sera compliquée.',
      guardrail: 'Aucun effet territoire, aucun point, aucune capture.',
    };
  }

  if (item.key === 'scout_ping') {
    return {
      need: 'defense',
      headline: 'Savoir où courir',
      mechanic: 'GRYD analyse une zone et te montre une opportunité lisible avant la sortie.',
      benefit: 'Révèle une zone fragile ou rentable pour éviter de choisir au hasard.',
      whyNow: defaultWhy(signals, 'defense'),
      guardrail: 'Donne une information temporaire, jamais une capture automatique.',
    };
  }

  if (item.key === SKUS.crewBoost24 || item.key === SKUS.crewBoost72) {
    return {
      need: 'crew',
      headline: 'Accélérer le coffre du crew',
      mechanic: 'Le boost s’applique aux contributions de coffre pendant la fenêtre affichée.',
      benefit: `${BOOST_BONUS_LABEL} pendant ${item.key === SKUS.crewBoost24 ? '24 h' : '72 h'}.`,
      whyNow: defaultWhy(signals, 'crew'),
      guardrail: 'Un seul boost actif, pas de cumul, aucun point leaderboard direct.',
    };
  }

  if (item.key === SKUS.crewBoostWeekend) {
    return {
      need: 'crew',
      headline: 'Préparer une fenêtre collective',
      mechanic: 'Le boost couvre le weekend pour synchroniser les runs du crew.',
      benefit: `${BOOST_BONUS_LABEL} sur le weekend, avec un moment crew plus visible.`,
      whyNow:
        signals.nextCrewWindow === 'weekend'
          ? 'Le prochain temps fort est le weekend : c’est le boost le plus adapté.'
          : defaultWhy(signals, 'crew'),
      guardrail: 'Contribution optionnelle, plafonnée, jamais une victoire achetée.',
    };
  }

  if (item.key === SKUS.crewBoostSeason) {
    return {
      need: 'crew',
      headline: 'Installer un statut de saison',
      mechanic: 'Le boost reste actif jusqu’à la fin de saison avec un statut visible au crew.',
      benefit: `${BOOST_BONUS_LABEL} jusqu’à la fin de saison + statut crew.`,
      whyNow:
        signals.nextCrewWindow === 'season'
          ? 'Pertinent si ton crew prépare toute la saison, pas seulement une sortie.'
          : 'À garder pour un engagement long, pas pour une décision rapide.',
      guardrail: 'Toujours capé, sans effet dans les dernières heures critiques de saison.',
    };
  }

  if (item.key === 'crew_cosmetic_chest') {
    return {
      need: 'crew',
      headline: 'Récompenser le crew sans pression',
      mechanic: 'Tu offres un coffre au crew : les récompenses restent cosmétiques et partagées.',
      benefit: 'Ajoute des récompenses cosmétiques partagées au crew.',
      whyNow: defaultWhy(signals, 'crew'),
      guardrail: 'Zéro zone, zéro point, zéro classement de contributeurs.',
    };
  }

  if (item.section === 'banners' || item.section === 'emblems') {
    return {
      need: 'crew',
      headline: 'Rendre le crew identifiable',
      mechanic: 'L’item s’équipe côté crew et modifie la vitrine, pas la carte de contrôle.',
      benefit: 'Améliore la vitrine du Crew HQ et les moments de recrutement.',
      whyNow: signals.hasCrew
        ? 'Tu joues en crew : GRYD privilégie ce qui sert au groupe avant les vitrines solo.'
        : 'Utile après avoir rejoint ou créé un crew.',
      guardrail: 'Statut visuel seulement, aucun pouvoir sur la carte.',
    };
  }

  if (item.section === 'templates') {
    return {
      need: 'share',
      headline: 'Raconter ton run plus vite',
      mechanic: 'Le template prépare une carte de partage avec ton run, ta zone ou ton crew.',
      benefit: 'Transforme une capture, une route ou une progression en carte partageable.',
      whyNow: defaultWhy(signals, 'share'),
      guardrail: 'N’ajoute rien au score : c’est de la lisibilité sociale.',
    };
  }

  if (item.section === 'skins_trace') {
    return {
      need: 'identity',
      headline: 'Faire lire ta trace',
      mechanic: 'Le skin change le rendu visuel de ta ligne GPS dans les vues GRYD.',
      benefit: 'Change le style de ta trace pour rendre ton run plus reconnaissable.',
      whyNow: defaultWhy(signals, 'identity'),
      guardrail: 'Style d’affichage uniquement, aucun bonus de distance.',
    };
  }

  if (item.section === 'skins_territory') {
    return {
      need: 'identity',
      headline: 'Signer tes territoires',
      mechanic: 'Le skin modifie le rendu de tes territoires déjà détenus.',
      benefit: 'Change le rendu visuel de tes zones sans toucher à leur contrôle.',
      whyNow: defaultWhy(signals, 'identity'),
      guardrail: 'Ne protège pas, ne capture pas, ne change aucun pourcentage.',
    };
  }

  if (item.section === 'frames') {
    return {
      need: 'identity',
      headline: 'Clarifier ton statut de joueur',
      mechanic: 'L’item s’affiche sur ta Player Card, ton badge ou ton titre.',
      benefit: 'Habille ta Player Card, ton badge ou ton titre.',
      whyNow: defaultWhy(signals, 'identity'),
      guardrail: 'Statut visuel seulement : le rang se gagne en courant.',
    };
  }

  if (item.section === 'subscriptions') {
    return {
      need: 'identity',
      headline: 'Débloquer du confort avancé',
      mechanic: item.draft
        ? 'Le contenu est visible en aperçu, mais il n’est pas achetable maintenant.'
        : 'Le Club débloque des outils de lecture personnelle et d’export.',
      benefit: item.draft ? 'Prévu pour les récompenses de saison.' : 'Ajoute stats, heatmap et exports HD.',
      whyNow: item.draft ? 'Pas recommandé maintenant : le contenu n’est pas lancé.' : defaultWhy(signals, 'identity'),
      guardrail: 'Aucun avantage territoire, aucun bouclier inclus.',
    };
  }

  if (item.key === SKUS.starterPack || item.key === SKUS.founderPack) {
    return {
      need: 'identity',
      headline: 'Démarrer avec une panoplie claire',
      mechanic: 'Le pack regroupe plusieurs items pour éviter de choisir chaque pièce séparément.',
      benefit: 'Regroupe Éclats, skins, frame et templates pour éviter de choisir item par item.',
      whyNow: defaultWhy(signals, 'identity'),
      guardrail: 'Pack de style et statut : aucune zone, aucun kilomètre, aucun rang.',
    };
  }

  if (item.section === 'packs') {
    return {
      need: 'identity',
      headline: 'Recharger la personnalisation',
      mechanic: 'Tu achètes des Éclats, puis tu les dépenses dans les items de style.',
      benefit: 'Ajoute des Éclats pour acheter skins, frames et templates.',
      whyNow: 'À utiliser seulement si ton solde bloque l’item que tu veux vraiment.',
      guardrail: 'Les Éclats n’achètent jamais le territoire.',
    };
  }

  return {
    need: 'identity',
    headline: 'Personnaliser ton expérience',
    mechanic: 'L’item modifie l’apparence ou le confort d’affichage.',
    benefit: item.description,
    whyNow: defaultWhy(signals, 'identity'),
    guardrail: 'Aucun effet sur la conquête ou le classement.',
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
