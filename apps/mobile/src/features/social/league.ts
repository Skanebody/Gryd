/**
 * GRYD — données démo DÉTERMINISTES de la League (AMENDEMENT-08 §7, doc §17).
 * Six tableaux (Joueurs / Crews / Ville / France / Pionniers / Performance),
 * cohérents avec les demos existantes : KORO #8 Paris à 4 210 pts (342 pts du
 * #7 — social/demo), crews de crew/demo (CREW NORD·XI, LES PAVÉS 12, BPM
 * BASTILLE), pioneerHexes 210 et formeScore 78 (badges/demo). DATA d'affichage
 * uniquement : l'écart en hexes neutres est DÉRIVÉ côté écran via
 * POINTS_NEUTRAL_HEX — aucun barème ici. TODO(O1) brancher les leaderboards
 * Supabase et supprimer ce fichier.
 */
import type { IconName } from '@klaim/shared';

export type LeagueTabId =
  | 'joueurs'
  | 'crews'
  | 'ville'
  | 'france'
  | 'pionniers'
  | 'performance';

export interface LeagueRow {
  rank: number;
  name: string;
  /** Sous-ligne (crew d'appartenance, ville, région…). */
  sub?: string;
  /** Valeur classée (pts, hexes, score) — l'unité vient du board. */
  value: number;
  /** MA ligne (ou mon crew / ma ville) — ancre chartreuse. */
  me?: boolean;
  /** Seed de blason (boards crew) — mêmes seeds que features/crew/demo. */
  crewSeed?: string;
  /** Rupture de séquence avant cette ligne (« ··· » entre #8 et #23). */
  gapBefore?: boolean;
}

export interface LeagueBoard {
  id: LeagueTabId;
  label: string;
  /** Nature des lignes — décide du visuel (avatar / blason / ville). */
  kind: 'player' | 'crew' | 'city';
  /** Unité courte affichée sous la valeur (« pts », « hexes »…). */
  valueLabel: string;
  rows: readonly LeagueRow[];
}

/** Semaine de saison courante (DATA démo — la vraie vient du serveur). */
export const LEAGUE_SEASON_WEEK = 2;

/**
 * Les 6 tableaux démo. Chaque board est ANCRÉ sur moi quand j'y figure
 * (jamais un top-100 anonyme) ; les valeurs recoupent les autres demos.
 */
export const LEAGUE_BOARDS: readonly LeagueBoard[] = [
  {
    id: 'joueurs',
    label: 'Joueurs',
    kind: 'player',
    valueLabel: 'pts',
    rows: [
      { rank: 1, name: 'SPRINTEUSE·88', sub: 'CREW NORD·XI', value: 9480 },
      { rank: 2, name: 'K.RUNNER', sub: 'LES PAVÉS 12', value: 8102 },
      { rank: 3, name: 'MOLOKAÏ', sub: 'LES FOULÉES 9³', value: 7645 },
      { rank: 4, name: 'INES.11', sub: 'CREW NORD·XI', value: 6890 },
      { rank: 5, name: 'BPM_BASTILLE', sub: 'BPM BASTILLE', value: 5120 },
      { rank: 6, name: 'JOG.PARMENTIER', sub: 'LES FOULÉES 9³', value: 4780 },
      { rank: 7, name: 'LENA_RUN', sub: 'LES FOULÉES 9³', value: 4552 },
      { rank: 8, name: 'KORO', sub: 'LES FOULÉES 9³', value: 4210, me: true },
      { rank: 9, name: 'PACER·20E', sub: 'LES FOULÉES 9³', value: 4188 },
      { rank: 10, name: 'TOUTDROIT', sub: 'LES FOULÉES 9³', value: 3901 },
    ],
  },
  {
    id: 'crews',
    label: 'Crews',
    kind: 'crew',
    valueLabel: 'pts',
    rows: [
      { rank: 1, name: 'CREW NORD·XI', sub: 'Paris', value: 38_410, crewSeed: 'crew-nord-xi' },
      { rank: 2, name: 'LES PAVÉS 12', sub: 'Paris', value: 31_200, crewSeed: 'les-paves-12' },
      { rank: 3, name: 'BPM BASTILLE', sub: 'Paris', value: 27_840, crewSeed: 'bpm-bastille' },
      { rank: 4, name: 'CANAL RUNNERS', sub: 'Paris', value: 21_050, crewSeed: 'canal-runners' },
      { rank: 5, name: 'PANAME PACERS', sub: 'Paris', value: 19_730, crewSeed: 'paname-pacers' },
      { rank: 6, name: 'LES PUCES RC', sub: 'Paris', value: 17_410, crewSeed: 'les-puces-rc' },
      { rank: 7, name: 'RIVE DROITE 16', sub: 'Paris', value: 15_980, crewSeed: 'rive-droite-16' },
      { rank: 8, name: 'LES FOULÉES 9³', sub: 'Paris', value: 15_240, me: true, crewSeed: 'les-foulees-93' },
      { rank: 9, name: 'MONTMARTRE HILLS', sub: 'Paris', value: 14_100, crewSeed: 'montmartre-hills' },
      { rank: 10, name: 'BERCY BEARS', sub: 'Paris', value: 12_760, crewSeed: 'bercy-bears' },
    ],
  },
  {
    id: 'ville',
    label: 'Ville',
    kind: 'city',
    valueLabel: 'hexes',
    rows: [
      { rank: 1, name: 'Paris', sub: 'Île-de-France', value: 48_210, me: true },
      { rank: 2, name: 'Lille', sub: 'Hauts-de-France', value: 22_480 },
      { rank: 3, name: 'Lyon', sub: 'Auvergne-Rhône-Alpes', value: 18_340 },
      { rank: 4, name: 'Marseille', sub: 'PACA', value: 16_900 },
      { rank: 5, name: 'Bordeaux', sub: 'Nouvelle-Aquitaine', value: 12_750 },
      { rank: 6, name: 'Nantes', sub: 'Pays de la Loire', value: 11_230 },
      { rank: 7, name: 'Rennes', sub: 'Bretagne', value: 9840 },
      { rank: 8, name: 'Strasbourg', sub: 'Grand Est', value: 9310 },
    ],
  },
  {
    id: 'france',
    label: 'France',
    kind: 'player',
    valueLabel: 'pts',
    rows: [
      { rank: 1, name: 'TRAILMAN·13', sub: 'Marseille', value: 12_480 },
      { rank: 2, name: 'SPRINTEUSE·88', sub: 'Paris', value: 9480 },
      { rank: 3, name: 'NORDISTE.59', sub: 'Lille', value: 9120 },
      { rank: 4, name: 'K.RUNNER', sub: 'Paris', value: 8102 },
      { rank: 5, name: 'MOLOKAÏ', sub: 'Paris', value: 7645 },
      { rank: 6, name: 'SOFIA.TRAIL', sub: 'Dieppe', value: 7420 },
      { rank: 7, name: 'LYON.PACER', sub: 'Lyon', value: 6980 },
      { rank: 8, name: 'INES.11', sub: 'Paris', value: 6890 },
      { rank: 23, name: 'KORO', sub: 'Paris', value: 4210, me: true, gapBefore: true },
    ],
  },
  {
    id: 'pionniers',
    label: 'Pionniers',
    kind: 'player',
    valueLabel: 'hexes pionniers',
    rows: [
      { rank: 1, name: 'SOFIA.TRAIL', sub: 'Dieppe', value: 1840 },
      { rank: 2, name: 'NADIA.K', sub: 'Lille', value: 1120 },
      { rank: 3, name: 'RURAL.KING', sub: 'Perche', value: 940 },
      { rank: 4, name: 'TRAILMAN·13', sub: 'Marseille', value: 720 },
      { rank: 5, name: 'KORO', sub: 'Paris', value: 210, me: true },
      { rank: 6, name: 'MAYA.PDC', sub: 'Rouen', value: 184 },
      { rank: 7, name: 'YANIS_EP', sub: 'Paris', value: 96 },
    ],
  },
  {
    id: 'performance',
    label: 'Performance',
    kind: 'player',
    valueLabel: 'Score Forme',
    rows: [
      { rank: 1, name: 'K.RUNNER', sub: 'Paris', value: 94 },
      { rank: 2, name: 'INES.11', sub: 'Paris', value: 91 },
      { rank: 3, name: 'MOLOKAÏ', sub: 'Paris', value: 88 },
      { rank: 4, name: 'SPRINTEUSE·88', sub: 'Paris', value: 86 },
      { rank: 5, name: 'LENA_RUN', sub: 'Paris', value: 82 },
      { rank: 6, name: 'KORO', sub: 'Paris', value: 78, me: true },
      { rank: 7, name: 'JOG.PARMENTIER', sub: 'Paris', value: 74 },
      { rank: 8, name: 'PACER·20E', sub: 'Paris', value: 71 },
    ],
  },
] as const;

/**
 * Rang gagné cette semaine (démo) — alimente le RankUpCard « #9 → #8 ».
 * Anti-shame : ce bloc ne sert QUE les montées, jamais les descentes.
 */
export const LEAGUE_RANK_UP = {
  fromRank: 9,
  toRank: 8,
  points: 4210,
} as const;

export interface LeagueRewardDemo {
  icon: IconName;
  label: string;
  sublabel: string;
}

/** Récompenses Top 10 de fin de saison (doc §17) — rendues en RewardCards. */
export const TOP10_REWARDS: readonly LeagueRewardDemo[] = [
  { icon: 'badge', label: 'Badge Paris Race', sublabel: 'Badge exclusif Saison 0' },
  { icon: 'skin', label: 'Frame Tempo', sublabel: 'Cadre de profil · cosmétique' },
  { icon: 'coffre', label: 'Coffre saison', sublabel: "S'ouvre au reset de saison" },
];
