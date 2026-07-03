/**
 * Constantes d'AFFICHAGE de la landing — pas des règles de jeu §3
 * (celles-ci vivent dans @klaim/shared/game-rules). Précédent : lib/waitlist.ts.
 *
 * AMENDEMENT-05 §4 (non négociable) : TOUTES les données de DÉMO de la landing
 * (leaderboards, feed, countdown, offensives, jauges de villes) sont fictives
 * assumées, DÉTERMINISTES (aucun Math.random/Date.now au rendu : SSR stable)
 * et centralisées ICI. Les décomptes animés démarrent de ces valeurs fixes
 * côté client. Les chiffres de RÈGLES (lock, decay, saison, taille de crew)
 * restent dans @klaim/shared — rien de tout cela n'est dupliqué ici.
 */

import { FAKE_WAITLIST_COUNTS, WAITLIST_UNLOCK_THRESHOLD } from './waitlist';

/** Superficie de la France métropolitaine (km², IGN) — AMENDEMENT-02 §2 : France entière capturable. */
export const FRANCE_CAPTURABLE_KM2 = 551_695;

/**
 * Valeurs de démonstration des visuels marketing (mockup téléphone, reward,
 * performance). Ce sont des CHIFFRES DE SHOWCASE, pas des constantes de jeu.
 */
export const DEMO = {
  zoneControlPct: 62,
  hexesGained: 214,
  hexesStolen: 38,
  hexesDefended: 57,
  simHexGainMin: 160,
  simHexGainMax: 320,
  simZonePctMin: 40,
  simZonePctMax: 80,
  levelPct: 62,
  passPct: 38,
  formScore: 82,
  weekKm: 24.8,
  weekRuns: 4,
  weekPace: '5:42',
  weekDeltaPct: 7,
} as const;

// ─── Saison 0 : compte à rebours du hero (AMENDEMENT-05 §3.1) ────────────────

/** Chiffres de showcase Saison 0 — le décompte démarre de cette valeur FIXE. */
export const SEASON0 = {
  daysLeft: 18,
  hoursLeft: 6,
  minutesLeft: 42,
  secondsLeft: 17,
  crews: 30,
  runnersWaiting: 1_240,
} as const;

// ─── Trio leaderboard partagé (hero §3.1 · gameplay loop §3.3 · crews §3.8) ──

export type DemoBoardKind = 'neutral' | 'rival' | 'mine';
export type DemoBoardRow = {
  rank: number;
  name: string;
  points: number;
  /** §1 : UN SEUL récit de rivalité — `rival` (violet --rival) = Canal Crew, `mine` = Night Pacers. */
  kind: DemoBoardKind;
};

const BOARD_LEADER: DemoBoardRow = { rank: 1, name: 'Bastille Runners', points: 18_420, kind: 'neutral' };
const BOARD_RIVAL: DemoBoardRow = { rank: 2, name: 'Canal Crew', points: 16_870, kind: 'rival' };
const BOARD_MINE: DemoBoardRow = { rank: 3, name: 'Night Pacers', points: 15_240, kind: 'mine' };

/** LA source unique du mini-classement 3 crews — importé par Hero, GameplayLoop, BOARD_TABS, WAR_DEMO. */
export const DEMO_LEADERBOARD = [BOARD_LEADER, BOARD_RIVAL, BOARD_MINE] as const;

// ─── Téléphone HUD « RAID LIVE » (AMENDEMENT-05 §3.2) ────────────────────────

/** Chiffres de showcase du raid (fictifs assumés, déterministes). */
export const RAID = {
  crewPct: DEMO.zoneControlPct, // 62
  rivalPct: 31,
  neutralPct: 7,
  hexesTaken: 18,
  membersActive: 4,
  minutesLeft: 22,
} as const;

// ─── Offensive en cours (carte War Room §3.5) ────────────────────────────────

export const OFFENSIVE = {
  zoneName: 'Canal Saint-Martin',
  objectiveHexes: 800,
  progressPct: 62,
  /** 04:21:08 — point de départ fixe du décompte animé. */
  timeLeftSeconds: 4 * 3600 + 21 * 60 + 8,
  activeMembers: 7,
} as const;

/** Hexes déjà pris, dérivés (déterministes) de l'objectif et de la progression. */
export const OFFENSIVE_HEXES_TAKEN = Math.round(
  (OFFENSIVE.objectiveHexes * OFFENSIVE.progressPct) / 100,
);

// ─── Mini-carte du secteur : grille d'hexes contestés ────────────────────────

export type HexOwner = 'crew' | 'enemy' | 'neutral' | 'contested';
export type DemoHex = { points: string; owner: HexOwner };

const HEX_R = 12;
const HEX_W = Math.sqrt(3) * HEX_R;
const PAD = 4;

/**
 * Ligne de front du secteur (7 colonnes × 5 rangées) :
 * C = mon crew · E = ennemi · X = contesté · N = neutre.
 */
const SECTOR_LAYOUT = ['NNEEEEN', 'NCXEEEN', 'CCCXEEN', 'CCCCXEN', 'NCCCCXN'] as const;

const OWNER_BY_CHAR: Record<string, HexOwner> = {
  C: 'crew',
  E: 'enemy',
  X: 'contested',
  N: 'neutral',
};

function hexPoints(cx: number, cy: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = ((60 * i - 30) * Math.PI) / 180;
    pts.push(
      `${(cx + HEX_R * Math.cos(angle)).toFixed(1)},${(cy + HEX_R * Math.sin(angle)).toFixed(1)}`,
    );
  }
  return pts.join(' ');
}

function buildSector(): DemoHex[] {
  const hexes: DemoHex[] = [];
  SECTOR_LAYOUT.forEach((rowChars, row) => {
    for (let col = 0; col < rowChars.length; col++) {
      const owner = OWNER_BY_CHAR[rowChars.charAt(col)];
      if (!owner) continue;
      const cx = PAD + HEX_W / 2 + col * HEX_W + (row % 2 === 1 ? HEX_W / 2 : 0);
      const cy = PAD + HEX_R + row * HEX_R * 1.5;
      hexes.push({ points: hexPoints(cx, cy), owner });
    }
  });
  return hexes;
}

export const SECTOR_HEXES: DemoHex[] = buildSector();

const FIRST_ROW = SECTOR_LAYOUT[0];
export const SECTOR_VIEW_W = Math.ceil(PAD * 2 + HEX_W * (FIRST_ROW.length + 0.5));
export const SECTOR_VIEW_H = Math.ceil(PAD * 2 + HEX_R * 2 + HEX_R * 1.5 * (SECTOR_LAYOUT.length - 1));

// ─── Live Territory Feed (§3.5) ──────────────────────────────────────────────

export type FeedKind = 'captured' | 'contested' | 'defended' | 'attacked';
/** Palette de conflit AMENDEMENT-05 §1 : crew = --ch, rival = --rival, enemy = --ennemi, autres = blanc. */
export type FeedFaction = 'crew' | 'rival' | 'enemy' | 'neutral';

export type FeedEntry = {
  zone: string;
  crew: string;
  kind: FeedKind;
  faction: FeedFaction;
  /** Hexes gagnés (kind 'captured' uniquement). */
  delta?: number;
  /** Ancienneté fictive fixe, en minutes (déterministe). */
  minutesAgo: number;
};

export const FEED_ENTRIES: FeedEntry[] = [
  { zone: 'République', crew: BOARD_MINE.name, kind: 'captured', faction: 'crew', delta: 42, minutesAgo: 2 },
  { zone: 'Croix-Rousse', crew: BOARD_RIVAL.name, kind: 'contested', faction: 'rival', minutesAgo: 5 },
  { zone: 'Vieux-Lille', crew: 'Braderie Pack', kind: 'defended', faction: 'neutral', minutesAgo: 9 },
  { zone: 'Paris Est', crew: BOARD_LEADER.name, kind: 'attacked', faction: 'enemy', minutesAgo: 12 },
  { zone: 'Canal Saint-Martin', crew: BOARD_MINE.name, kind: 'captured', faction: 'crew', delta: 18, minutesAgo: 16 },
  { zone: 'Wazemmes', crew: BOARD_RIVAL.name, kind: 'captured', faction: 'rival', delta: 31, minutesAgo: 21 },
  { zone: 'Belleville', crew: 'Ménilmontant Milers', kind: 'contested', faction: 'enemy', minutesAgo: 27 },
  { zone: 'Citadelle de Lille', crew: 'Deûle Runners', kind: 'defended', faction: 'neutral', minutesAgo: 33 },
  { zone: 'Offranville', crew: 'Caux Pioneers', kind: 'captured', faction: 'neutral', delta: 12, minutesAgo: 40 },
];

// ─── Classements (onglets France / Paris / Lille / Pionniers / Crews §3.5) ───

export type BoardTabId = 'france' | 'paris' | 'lille' | 'pioneers' | 'crews';

export type BoardRow = {
  name: string;
  points: number;
  /** Ville/secteur — noms propres, non traduits. */
  meta: string;
  /** « Toi » : Night Pacers, ancré/surligné en chartreuse. */
  isYou?: boolean;
  /** Crew rival (Canal Crew) — violet --rival. */
  isRival?: boolean;
};

export type BoardTab = { id: BoardTabId; unit: 'pts' | 'hexes'; rows: BoardRow[] };

export const BOARD_TABS: BoardTab[] = [
  {
    id: 'france',
    unit: 'pts',
    rows: [
      { name: BOARD_LEADER.name, points: BOARD_LEADER.points, meta: 'Paris' },
      { name: BOARD_RIVAL.name, points: BOARD_RIVAL.points, meta: 'Paris', isRival: true },
      { name: BOARD_MINE.name, points: BOARD_MINE.points, meta: 'Paris', isYou: true },
      { name: 'Braderie Pack', points: 12_980, meta: 'Lille' },
      { name: 'Presqu’île Pacers', points: 11_760, meta: 'Lyon' },
      { name: 'Caux Pioneers', points: 9_410, meta: 'Pays de Caux' },
    ],
  },
  {
    id: 'paris',
    unit: 'pts',
    rows: [
      { name: BOARD_LEADER.name, points: BOARD_LEADER.points, meta: 'Bastille' },
      { name: BOARD_RIVAL.name, points: BOARD_RIVAL.points, meta: 'Canal Saint-Martin', isRival: true },
      { name: BOARD_MINE.name, points: BOARD_MINE.points, meta: 'Paris Est', isYou: true },
      { name: 'Butte Squad', points: 11_430, meta: 'Montmartre' },
      { name: 'Ménilmontant Milers', points: 10_120, meta: 'Belleville' },
      { name: 'Rive Gauche RC', points: 8_890, meta: 'Montparnasse' },
    ],
  },
  {
    id: 'lille',
    unit: 'pts',
    rows: [
      { name: 'Braderie Pack', points: 12_980, meta: 'Vieux-Lille' },
      { name: 'Deûle Runners', points: 11_840, meta: 'Citadelle' },
      { name: 'Wazemmes Wolves', points: 9_310, meta: 'Wazemmes' },
      { name: 'Citadelle Squad', points: 8_470, meta: 'Vauban' },
      { name: 'Vieux-Lille Vipers', points: 7_220, meta: 'Vieux-Lille' },
      { name: 'Euralille Express', points: 6_080, meta: 'Euralille' },
    ],
  },
  {
    id: 'pioneers',
    unit: 'pts',
    rows: [
      { name: 'Léa M.', points: 4_210, meta: 'Offranville' },
      { name: 'Marco V.', points: 3_860, meta: 'Dieppe' },
      { name: 'Aïcha B.', points: 3_540, meta: 'Pays de Caux' },
      { name: 'Tom L.', points: 2_980, meta: 'Arques-la-Bataille' },
      { name: 'Sacha R.', points: 2_410, meta: 'Veules-les-Roses' },
      { name: 'Nina K.', points: 2_260, meta: 'Luneray' },
    ],
  },
  {
    id: 'crews',
    unit: 'hexes',
    rows: [
      { name: BOARD_LEADER.name, points: 5_120, meta: 'Paris' },
      { name: BOARD_RIVAL.name, points: 4_480, meta: 'Paris', isRival: true },
      { name: BOARD_MINE.name, points: 4_020, meta: 'Paris', isYou: true },
      { name: 'Braderie Pack', points: 3_310, meta: 'Lille' },
      { name: 'Presqu’île Pacers', points: 2_940, meta: 'Lyon' },
      { name: 'Caux Pioneers', points: 2_150, meta: 'Pays de Caux' },
    ],
  },
];

// ─── Crew War Room (§3.8) : état de guerre du builder ────────────────────────

/** État de guerre de démonstration — dérivé du trio DEMO_LEADERBOARD (source unique). */
export const WAR_DEMO = {
  sectorRank: BOARD_MINE.rank,
  activeToday: 4,
  offensives: 1,
  sectorControlPct: 42,
  myPoints: BOARD_MINE.points,
  rivals: [
    { name: BOARD_LEADER.name, points: BOARD_LEADER.points },
    { name: BOARD_RIVAL.name, points: BOARD_RIVAL.points },
  ],
} as const;

// ─── Performance = arme (§3.9) ───────────────────────────────────────────────

/** Chiffres de SHOWCASE du lien performance → territoire — fictifs assumés, déterministes. */
export const TERRITORY_DEMO = {
  verifiedPct: 88,
  seasonRecords: 3,
  weekHexes: 412,
} as const;

// ─── Porte de la Saison 0 (§3.11) : vague d'accès fondateurs ─────────────────

/**
 * La taille de vague EST le seuil produit WAITLIST_UNLOCK_THRESHOLD (500) de
 * lib/waitlist — une seule source. `founderCrews` réutilise SEASON0.crews.
 */
export const WAVE = {
  size: WAITLIST_UNLOCK_THRESHOLD,
  spotsLeft: 173,
  number: 1,
  founderCrews: SEASON0.crews,
} as const;

/**
 * City Activation Progress (§3.4) : remplissage fictif assumé des villes de la
 * Saison 0 (déterministe). Paris/Lille réutilisent FAKE_WAITLIST_COUNTS
 * (lib/waitlist) — mêmes chiffres que les jauges du formulaire waitlist.
 */
export const CITY_FILL = [
  { name: 'Paris', count: FAKE_WAITLIST_COUNTS.paris },
  { name: 'Lille', count: FAKE_WAITLIST_COUNTS.lille },
  { name: 'Rouen', count: 89 },
  { name: 'Dieppe', count: 34 },
] as const;
