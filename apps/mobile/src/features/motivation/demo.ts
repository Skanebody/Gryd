/**
 * GRYD — data démo DÉTERMINISTE des écrans motivation (AMENDEMENT-07 §8,
 * motivation §17). Comme features/warroom/demo.ts : valeurs figées, aucune
 * horloge, aucun aléatoire → rendu stable en preview. TODO(O1) : brancher
 * challenge_progress / stats réelles (0012). Les OBJECTIFS chiffrés viennent des
 * seeds @klaim/shared (CHALLENGE_SEEDS) — aucun nombre magique ici ; seuls les
 * « où en est le joueur » (progress) sont des valeurs de démo, bornées ≤ cible.
 */
import { CHALLENGE_SEEDS, type ChallengeDifficulty, type ChallengeType } from '@klaim/shared';

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
  formScore: 72,
  formLabel: 'En forme',
  todayGoal: 'Une sortie tranquille de 20 min suffit à tenir ta série.',
  weekRuns: 2,
  weekTarget: CHALLENGE_SEEDS.consistency_ii.target, // 3 (seed, pas de magie)
  nextAction: 'Sortie récup 20 min',
};

// ─── Challenges (§17.3-17.6) ─────────────────────────────────────────────────

/**
 * Carte d'un challenge pour la liste/détail. `current`/`target` alimentent une
 * jauge ; `target` vient TOUJOURS d'un seed (single ou collectif). `myContrib`
 * (crew) sert la formulation positive « tu as contribué à X » (§11), jamais un
 * rang. `partnerName` (rivalry) = l'autre équipe, sans « tu perds/gagnes ».
 */
export interface ChallengeCard {
  id: keyof typeof CHALLENGE_SEEDS;
  type: ChallengeType;
  name: string;
  blurb: string;
  difficulty: ChallengeDifficulty;
  metric: string;
  current: number;
  target: number;
  /** Unité affichée après les nombres (ex. « courses », « km », « hexes »). */
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
    blurb: '30 hexagones défendus. Tenir le quartier compte autant que conquérir.',
    difficulty: CHALLENGE_SEEDS.defense_30.difficulty,
    metric: CHALLENGE_SEEDS.defense_30.metric,
    current: 18,
    target: CHALLENGE_SEEDS.defense_30.target,
    unit: 'hexes',
    reward: 'Badge Defender',
  },
  {
    id: 'crew_defense_week',
    type: CHALLENGE_SEEDS.crew_defense_week.type,
    name: 'Defense Week',
    blurb: 'Objectif collectif du crew. Chaque hexe défendu compte pour le coffre.',
    difficulty: CHALLENGE_SEEDS.crew_defense_week.difficulty,
    metric: CHALLENGE_SEEDS.crew_defense_week.metric,
    current: 214,
    target: CHALLENGE_SEEDS.crew_defense_week.collectiveTarget, // 300
    unit: 'hexes',
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
    unit: 'hexes',
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
