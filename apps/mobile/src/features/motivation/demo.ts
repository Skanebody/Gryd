/**
 * GRYD — data démo DÉTERMINISTE des écrans motivation (AMENDEMENT-07 §8,
 * motivation §17). Comme features/warroom/demo.ts : valeurs figées, aucune
 * horloge, aucun aléatoire → rendu stable en preview. TODO(O1) : brancher
 * challenge_progress / stats réelles (0012). Les OBJECTIFS chiffrés viennent des
 * seeds @klaim/shared (CHALLENGE_SEEDS) — aucun nombre magique ici ; seuls les
 * « où en est le joueur » (progress) sont des valeurs de démo, bornées ≤ cible.
 */
import {
  CHALLENGE_SEEDS,
  CREW_CHEST_WEEKLY_TARGET,
  type ChallengeDifficulty,
  type ChallengeType,
} from '@klaim/shared';
import { MY_CREW } from '../crew/demo';
import { MAP_HUD } from '../map/demo';
import { MY_SOCIAL_PROFILE } from '../social/demo';

// ─── Page Aujourd'hui (Focus Solo, §17.1) ───────────────────────────────────

export interface TodayState {
  /** Score Forme 0..100 (indice santé, JAMAIS un rang) — signal doux. */
  formScore: number;
  /** Libellé qualitatif du Score Forme (anti-shame, jamais « faible »). */
  formLabel: string;
  /** Objectif du jour : texte court non prescriptif. */
  todayGoal: string;
  /** Courses faites cette semaine ISO / cible perso hebdo (Consistency). */
  weekRuns: number;
  weekTarget: number;
  /** Prochaine action suggérée (pas une injonction). */
  nextAction: string;
}

/** État démo « Aujourd'hui » — la cible hebdo reprend le seed Consistency II. */
export const TODAY: TodayState = {
  // Score Forme unique dans toute la démo (profil social + badges demo = 78).
  formScore: MY_SOCIAL_PROFILE.formeScore,
  formLabel: 'En forme',
  todayGoal: 'Une sortie tranquille de 20 min suffit à tenir ta série.',
  weekRuns: 2,
  weekTarget: CHALLENGE_SEEDS.consistency_ii.target, // 3 (seed, pas de magie)
  nextAction: 'Sortie récup 20 min',
};

// ─── Today porte d'entrée (AMENDEMENT-10 §4 + AMENDEMENT-11 vocabulaire) ────

/**
 * Route recommandée du jour — étiquette démo alignée sur la « Route C Défense »
 * d'AMENDEMENT-10 §2 (`Route défense République — 4,8 km · +86 zones`).
 * TODO(O1) : brancher la vraie reco du Route Planner (génération = V1).
 */
export interface TodayRouteReco {
  /** Nom social de la route (AMENDEMENT-11 §6 — routes = objets sociaux). */
  name: string;
  /** KPI géant de l'écran Today (AMENDEMENT-10 §1). */
  distanceKm: number;
  durationMin: number;
  /** Zones capturables sur l'itinéraire (vocabulaire AMENDEMENT-11 §4). */
  zones: number;
  kind: 'Boucle' | 'Aller simple';
}

export interface TodayHero {
  /** Prénom de jeu affiché (« BONJOUR KORO ») — profil social démo. */
  greetingName: string;
  /** La situation du quartier en UNE phrase (« Paris Est est contesté. »). */
  situation: string;
  route: TodayRouteReco;
  /** Coffre crew (%) — DÉRIVÉ du coffre démo /cible hebdo §39.1 (66 %). */
  crewChestPct: number;
}

/** Porte d'entrée quotidienne — 1 objectif, 2-3 indicateurs, 1 CTA. */
export const TODAY_HERO: TodayHero = {
  greetingName: MY_SOCIAL_PROFILE.displayName,
  situation: `${MAP_HUD.zoneName} est contesté.`,
  route: {
    name: 'Route défense République',
    distanceKm: 4.8,
    durationMin: 28,
    zones: 86,
    kind: 'Boucle',
  },
  crewChestPct: Math.round((MY_CREW.chestProgress / CREW_CHEST_WEEKLY_TARGET) * 100),
};

// ─── Challenges (§17.3-17.6) ─────────────────────────────────────────────────

/**
 * Carte d'un challenge pour la liste/détail. `current`/`target` alimentent une
 * jauge ; `target` vient TOUJOURS d'un seed (single ou collectif). `myContrib`
 * (crew) sert la formulation positive « tu as contribué à X » (§11), jamais un
 * rang. `partnerName` (rivalry) = l'autre équipe, sans « tu perds/gagnes ».
 */
/**
 * Sponsor local d'un challenge (AMENDEMENT-32 §3, stratégie §3.5). ANTI PAY-TO-WIN
 * STRICT : le sponsor finance des LOTS/COSMÉTIQUES, JAMAIS du territoire, des points
 * ni une victoire ; l'entrée est GRATUITE (aucune loterie payante). Présence
 * DISCRÈTE : un blason filaire + « Offert par … », jamais du branding envahissant.
 * Démo (le vrai sponsor = back-office V1).
 */
export interface ChallengeSponsor {
  /** Nom commercial du sponsor (ex. « Magasin Pas de Côté »). */
  name: string;
  /** Icône blason discrète (token @klaim/shared) — jamais un logo importé. */
  blason: 'boutique' | 'cadeau' | 'medaille';
  /** Nature des lots offerts — LOTS/COSMÉTIQUES uniquement, jamais du jeu. */
  prizeNote: string;
}

export interface ChallengeCard {
  /**
   * Id de la carte. Les challenges du catalogue reprennent une clé de
   * `CHALLENGE_SEEDS` ; un challenge sponsorisé de démo (§3) porte son propre id
   * (le vrai vient du back-office V1) — d'où le type large.
   */
  id: keyof typeof CHALLENGE_SEEDS | (string & {});
  type: ChallengeType;
  name: string;
  blurb: string;
  difficulty: ChallengeDifficulty;
  metric: string;
  current: number;
  target: number;
  /** Unité affichée après les nombres (ex. « courses », « km », « zones »). */
  unit: string;
  /** Crew : minimum perso souple (§8.3), 0 si non applicable. */
  personalMinimum?: number;
  /** Crew : contribution perso déjà réalisée (formulation « tu as contribué »). */
  myContrib?: number;
  /** Rivalry : nom de l'autre équipe (respect, pas d'adversaire diabolisé). */
  partnerName?: string;
  /** Rivalry : score des deux camps (jamais « en retard/en tête » en dur). */
  rivalMine?: number;
  rivalOther?: number;
  /** Récompense annoncée (badge/coffre) — micro-victoire, pas d'échec puni. */
  reward: string;
  /**
   * Sponsor local optionnel (§3). Présent → la carte affiche « Offert par … » et
   * un blason discret. Ne change RIEN au gameplay (anti pay-to-win).
   */
  sponsor?: ChallengeSponsor;
}

/**
 * Seed 0012 rendu en cartes de démo. Les `target`/`collectiveTarget`/`personalMinimum`
 * proviennent des seeds partagés ; les `current`/contrib sont des valeurs de
 * démo bornées. L'ordre est stable (solo → crew → rivalry).
 */
export const CHALLENGES: ChallengeCard[] = [
  {
    id: 'consistency_ii',
    type: CHALLENGE_SEEDS.consistency_ii.type,
    name: 'Consistency II',
    blurb: '3 courses cette semaine, à ton rythme. La régularité prime, pas la vitesse.',
    difficulty: CHALLENGE_SEEDS.consistency_ii.difficulty,
    metric: CHALLENGE_SEEDS.consistency_ii.metric,
    current: 2,
    target: CHALLENGE_SEEDS.consistency_ii.target,
    unit: 'courses',
    reward: 'Badge Consistency',
  },
  {
    id: 'distance_10k',
    type: CHALLENGE_SEEDS.distance_10k.type,
    name: 'Distance',
    blurb: '10 km cumulés sur la semaine. En une fois ou en plusieurs, comme tu veux.',
    difficulty: CHALLENGE_SEEDS.distance_10k.difficulty,
    metric: CHALLENGE_SEEDS.distance_10k.metric,
    current: 6_400,
    target: CHALLENGE_SEEDS.distance_10k.target, // 10 000 m
    unit: 'km',
    reward: 'Badge Distance',
  },
  {
    id: 'defense_30',
    type: CHALLENGE_SEEDS.defense_30.type,
    name: 'Defense',
    blurb: '30 zones défendues. Tenir le quartier compte autant que conquérir.',
    difficulty: CHALLENGE_SEEDS.defense_30.difficulty,
    metric: CHALLENGE_SEEDS.defense_30.metric,
    current: 18,
    target: CHALLENGE_SEEDS.defense_30.target,
    unit: 'zones',
    reward: 'Badge Defender',
  },
  {
    // Challenge sponsorisé de démo (§3). Objectif de distance (comme distance_10k)
    // mais porté par un commerçant local. current borné ≤ cible. ANTI PAY-TO-WIN :
    // la seule récompense est un LOT offert ; l'entrée est GRATUITE.
    id: 'sponsor_store_50k',
    type: 'solo',
    name: 'Défi du quartier',
    blurb:
      '50 km cette semaine, en une ou plusieurs sorties. Un défi de distance offert par un commerçant du coin — participation libre et gratuite, pour le plaisir de courir.',
    difficulty: 'standard',
    metric: 'distanceM',
    current: 32_000,
    target: 50_000,
    unit: 'km',
    reward: 'Lots offerts par le sponsor (tirage libre, sans achat)',
    sponsor: {
      name: 'Magasin Pas de Côté',
      blason: 'boutique',
      prizeNote: 'Le sponsor offre des lots et cosmétiques. Aucun avantage en jeu.',
    },
  },
  {
    id: 'crew_defense_week',
    type: CHALLENGE_SEEDS.crew_defense_week.type,
    name: 'Defense Week',
    blurb: 'Objectif collectif du crew. Chaque zone défendue compte pour le coffre.',
    difficulty: CHALLENGE_SEEDS.crew_defense_week.difficulty,
    metric: CHALLENGE_SEEDS.crew_defense_week.metric,
    current: 214,
    target: CHALLENGE_SEEDS.crew_defense_week.collectiveTarget, // 300
    unit: 'zones',
    personalMinimum: CHALLENGE_SEEDS.crew_defense_week.personalMinimum, // 20
    myContrib: 23,
    reward: 'Coffre crew · palier Or',
  },
  {
    id: 'rivalry_night_canal',
    type: CHALLENGE_SEEDS.rivalry_night_canal.type,
    name: 'Night Pacers vs Canal',
    blurb: '48 h sur Paris Est. Deux crews, un quartier. Fair-play avant tout.',
    difficulty: CHALLENGE_SEEDS.rivalry_night_canal.difficulty,
    metric: CHALLENGE_SEEDS.rivalry_night_canal.metric,
    current: 128,
    target: 0, // rivalry : pas de cible fixe, on compare les deux camps
    unit: 'zones',
    partnerName: 'Canal Runners',
    rivalMine: 128,
    rivalOther: 121,
    reward: 'Respect + badge Rivalry',
  },
];

/** Recherche une carte de challenge par id (détail). PURE. */
export function findChallenge(id: string): ChallengeCard | undefined {
  return CHALLENGES.find((c) => c.id === id);
}

// ─── Formatage local ─────────────────────────────────────────────────────────

/** Mètres → « 6,4 km » (une décimale, virgule FR). PURE. */
export function formatKm(m: number): string {
  return `${(m / 1000).toFixed(1).replace('.', ',')} km`;
}

/**
 * Valeur d'un challenge dans son unité d'affichage : `distanceM` en km, le reste
 * en entier. PURE — pas d'Intl (rendu Hermes stable). `unit` gouverne le rendu.
 */
export function formatChallengeValue(value: number, unit: string): string {
  if (unit === 'km') return formatKm(value);
  return `${Math.round(value)}`;
}
