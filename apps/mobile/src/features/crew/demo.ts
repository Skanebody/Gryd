/**
 * GRYD — données démo DÉTERMINISTES du crew de l'utilisateur (Crew HQ V2 /
 * War Room, AMENDEMENT-06 §2). Cohérentes avec le classement et le profil
 * factices (LES FOULÉES 9³). Aucun câblage : TODO(O1) brancher crews /
 * crew_members / crew_chests / offensives / defense_missions (0010).
 * Les niveaux/tiers/paliers sont DÉRIVÉS des règles réelles (features/crew/rules)
 * — jamais saisis en dur — pour rester cohérents avec CREW_XP_TABLE §34.3.
 */
import type { CrewRole, WarAvailability } from '@klaim/shared';

export interface CrewMemberDemo {
  pseudo: string;
  role: CrewRole;
  availability: WarAvailability;
  /** Contribution d'hexes de la semaine (affichage seulement). */
  weekHexes: number;
  me?: boolean;
}

export interface CrewDemo {
  name: string;
  tag: string;
  city: string;
  /** XP crew cumulée — pilote le niveau via crewLevelForXp (§34.3). */
  xp: number;
  /** Score d'activité 0-100 (§45) — pilote le statut via activityStatusForScore. */
  activityScore: number;
  /** Points pondérés accumulés cette semaine dans le coffre (§39.1). */
  chestProgress: number;
  members: readonly CrewMemberDemo[];
}

/**
 * Crew de l'utilisateur. xp = 42 000 → niveau 6 (palier 30k franchi, 60k non) ;
 * activityScore 74 → statut Competitive ; chestProgress 1 320 / 2 000 → palier
 * gold (75 % non atteint : 66 % → silver). Valeurs choisies pour illustrer une
 * jauge « en cours » sur chaque système.
 */
export const MY_CREW: CrewDemo = {
  name: 'LES FOULÉES 9³',
  tag: '9³',
  city: 'Paris',
  xp: 42_000,
  activityScore: 74,
  chestProgress: 1_320,
  members: [
    { pseudo: 'KORO', role: 'leader', availability: 'war', weekHexes: 214, me: true },
    { pseudo: 'LENA_RUN', role: 'co_captain', availability: 'war', weekHexes: 188 },
    { pseudo: 'MOLOKAÏ', role: 'raider', availability: 'war', weekHexes: 176 },
    { pseudo: 'JOG.PARMENTIER', role: 'defender', availability: 'defense', weekHexes: 142 },
    { pseudo: 'PACER·20E', role: 'scout', availability: 'exploration', weekHexes: 96 },
    { pseudo: 'TOUTDROIT', role: 'runner', availability: 'casual', weekHexes: 61 },
    { pseudo: 'NOX.11', role: 'runner', availability: 'absent', weekHexes: 0 },
  ],
};

/** Achievements crew (teaser §44) — état factice, non câblé. */
export interface CrewAchievementDemo {
  key: string;
  label: string;
  done: boolean;
}
export const CREW_ACHIEVEMENTS: readonly CrewAchievementDemo[] = [
  { key: 'first_sector', label: 'Premier secteur tenu', done: true },
  { key: 'hold_7', label: 'Tenir une zone 7 jours', done: true },
  { key: 'ten_members', label: '10 membres actifs', done: false },
  { key: 'city_top_100', label: 'Top 100 ville', done: false },
];

// ─── Crew Discovery (§46) : crews à rejoindre, signaux d'activité ─────────────

export interface DiscoveryCrewDemo {
  name: string;
  tag: string;
  city: string;
  /** XP → niveau dérivé. */
  xp: number;
  activityScore: number;
  members: number;
  openSpots: number;
  policy: 'open' | 'request';
  language: string;
  objective: 'casual' | 'competitif' | 'pionnier';
  /** Signaux rapides §46 (booléens) — rendus en chips. */
  warActive: boolean;
  defenseActive: boolean;
  beginnerFriendly: boolean;
  pioneer: boolean;
  weeklyRuns: number;
}

/** Crews découvrables — mêmes noms que la carte/classement factices (§46). */
export const DISCOVERY_CREWS: readonly DiscoveryCrewDemo[] = [
  {
    name: 'CREW NORD·XI', tag: 'N11', city: 'Paris', xp: 96_000, activityScore: 92,
    members: 9, openSpots: 1, policy: 'request', language: 'FR', objective: 'competitif',
    warActive: true, defenseActive: true, beginnerFriendly: false, pioneer: false, weeklyRuns: 84,
  },
  {
    name: 'LES PAVÉS 12', tag: 'PV', city: 'Paris', xp: 28_000, activityScore: 61,
    members: 6, openSpots: 4, policy: 'open', language: 'FR', objective: 'casual',
    warActive: false, defenseActive: true, beginnerFriendly: true, pioneer: false, weeklyRuns: 41,
  },
  {
    name: 'BPM BASTILLE', tag: 'BPM', city: 'Paris', xp: 12_500, activityScore: 48,
    members: 4, openSpots: 6, policy: 'open', language: 'FR', objective: 'casual',
    warActive: false, defenseActive: false, beginnerFriendly: true, pioneer: false, weeklyRuns: 22,
  },
  {
    name: 'PAYS DE CAUX RC', tag: 'PDC', city: 'Dieppe', xp: 6_200, activityScore: 55,
    members: 5, openSpots: 5, policy: 'open', language: 'FR', objective: 'pionnier',
    warActive: false, defenseActive: false, beginnerFriendly: true, pioneer: true, weeklyRuns: 18,
  },
];
