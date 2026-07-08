/**
 * GRYD — données démo DÉTERMINISTES du crew de l'utilisateur (Crew HQ,
 * AMENDEMENT-06 §2 enrichi AMENDEMENT-08 §6). Cohérentes avec le classement et
 * le profil factices (LES FOULÉES 9³). Aucun câblage : TODO(O1) brancher crews /
 * crew_members / crew_chests / offensives / defense_missions (0010).
 * Les niveaux/tiers/paliers sont DÉRIVÉS des règles réelles (features/crew/rules)
 * — jamais saisis en dur — pour rester cohérents avec CREW_XP_TABLE §34.3.
 */
import type {
  BadgeTier,
  CrewRecruitmentStatus,
  CrewRole,
  CrewTag,
  IconName,
  WarAvailability,
} from '@klaim/shared';

export interface CrewMemberDemo {
  pseudo: string;
  role: CrewRole;
  availability: WarAvailability;
  /** Contribution d'hexes/points de la semaine (affichage seulement). */
  weekHexes: number;
  /** Tier visuel joueur (frame d'avatar, §43.1) — étiquette démo. */
  tier: BadgeTier;
  /** Dernière action courte, formulée POSITIVE (anti-shame §11). */
  lastAction: string;
  /** Points pondérés versés au coffre hebdo cette semaine (§39.1). */
  chestPoints: number;
  /** Ancienneté en jours (rookie : jours d'essai restants dérivés §8.7). */
  joinedDaysAgo?: number;
  me?: boolean;
}

export interface CrewDemo {
  name: string;
  tag: string;
  /** Seed déterministe du blason (CrewCrest). */
  seed: string;
  city: string;
  /** Ligue affichée (frame du blason, étiquette type crews.league 0011). */
  league: BadgeTier;
  /** XP crew cumulée — pilote le niveau via crewLevelForXp (§34.3). */
  xp: number;
  /** Score d'activité 0-100 (§45) — pilote le statut via activityStatusForScore. */
  activityScore: number;
  /** Points pondérés accumulés cette semaine dans le coffre (§39.1). */
  chestProgress: number;
  /** Rang local (ville) du crew — cohérent avec le classement démo. */
  localRank: number;
  /** Offensive de crew prête à être lancée (War Room). */
  offensiveReady: boolean;
  /**
   * Défense urgente du bento Base (AMENDEMENT-10 §6) — vocabulaire
   * AMENDEMENT-11 : des RUES à sauver, jamais de cellules visibles.
   */
  urgentDefense: { sector: string; streets: number; hoursLeft: number };
  /** Places ouvertes au recrutement (politique du crew, ≤ places libres). */
  recruitSpots: number;
  /** Statut de recrutement (§9, crews.recruitment_status 0013). */
  recruitment: CrewRecruitmentStatus;
  /** Tags de style du crew (§10, crews.tags 0013) — identité, pas hiérarchie. */
  tags: readonly CrewTag[];
  /**
   * Bloc TERRITOIRE CREW (AMENDEMENT-11 §4) : contrôle du secteur, zones
   * tenues, frontières contestées, routes ouvertes. controlPct cohérent avec
   * le HUD de la Battle Map (MAP_CONTROL_HUD : 42 %). TODO(O1) parts réelles.
   */
  territory: {
    sector: string;
    controlPct: number;
    zonesHeld: number;
    contestedBorders: number;
    openRoutes: number;
  };
  members: readonly CrewMemberDemo[];
}

/**
 * Crew de l'utilisateur. xp = 42 000 → niveau 6 (palier 30k franchi, 60k non) ;
 * activityScore 91 → statut war_ready (≥ 90, « Prêt guerre » header HQ §6) ;
 * chestProgress 1 320 / 2 000 → 66 % : palier silver atteint, gold (75 %) non.
 * Valeurs choisies pour illustrer une jauge « en cours » sur chaque système.
 * chestPoints des membres = ventilation EXACTE de chestProgress (somme 1 320).
 */
export const MY_CREW: CrewDemo = {
  name: 'LES FOULÉES 9³',
  tag: '9³',
  seed: 'les-foulees-93',
  city: 'Paris',
  league: 'carbon',
  xp: 42_000,
  activityScore: 91,
  chestProgress: 1_320,
  localRank: 8,
  offensiveReady: true,
  urgentDefense: { sector: 'République', streets: 12, hoursLeft: 48 },
  // 3 places libres (7/10) mais le crew n'en ouvre que 2 au recrutement.
  recruitSpots: 2,
  // Recrutement « Sur demande » (défaut recommandé §9) + tags de style §10.
  recruitment: 'on_request',
  tags: ['competitif', 'defense', 'run_club'],
  territory: {
    sector: 'Paris Est',
    controlPct: 42,
    zonesHeld: 2_147,
    contestedBorders: 3,
    openRoutes: 6,
  },
  // Rôles clan §8 (AMENDEMENT-16 §3) : les 7 rôles sont représentés — l'ancien
  // raider est devenu captain terrain, l'ancien defender strategist (le style
  // attaque/défense vit dans les tags du crew + la war_availability).
  members: [
    {
      pseudo: 'KORO', role: 'founder', availability: 'war', weekHexes: 214, tier: 'carbon',
      lastAction: '12 zones capturées · Villette', chestPoints: 320, me: true,
    },
    {
      pseudo: 'LENA_RUN', role: 'co_captain', availability: 'war', weekHexes: 188, tier: 'race',
      lastAction: 'Offensive préparée · Canal', chestPoints: 260,
    },
    {
      pseudo: 'MOLOKAÏ', role: 'captain', availability: 'war', weekHexes: 176, tier: 'race',
      lastAction: '14 zones reprises · Buttes-Chaumont', chestPoints: 240,
    },
    {
      pseudo: 'JOG.PARMENTIER', role: 'strategist', availability: 'defense', weekHexes: 142, tier: 'tempo',
      lastAction: 'Plan de défense Canal tracé', chestPoints: 200,
    },
    {
      pseudo: 'PACER·20E', role: 'scout', availability: 'exploration', weekHexes: 96, tier: 'tempo',
      lastAction: 'Zone scoutée · Pantin', chestPoints: 160,
    },
    {
      pseudo: 'TOUTDROIT', role: 'runner', availability: 'casual', weekHexes: 61, tier: 'road',
      lastAction: 'Course validée · 6 km', chestPoints: 100,
    },
    {
      // Rookie en période d'essai (§8.7) : contribution COMPTÉE, droits limités.
      pseudo: 'NOX.11', role: 'rookie', availability: 'casual', weekHexes: 14, tier: 'road',
      lastAction: 'A rejoint le crew · 1ʳᵉ course validée', chestPoints: 40, joinedDaysAgo: 2,
    },
  ],
};

/** Récompense de coffre révélée à l'ouverture (affichage démo, icônes charte). */
export interface ChestRewardDemo {
  icon: IconName;
  label: string;
  sublabel: string;
}

/** Contenu démo du palier atteint du coffre hebdo (révélé par « Ouvrir »). */
export const CHEST_REWARDS: readonly ChestRewardDemo[] = [
  { icon: 'eclats', label: '+40 Éclats', sublabel: 'Palier Silver · monnaie capée' },
  { icon: 'skin', label: 'Trace Tempo', sublabel: 'Skin de trace crew' },
  { icon: 'niveau', label: '+600 XP crew', sublabel: 'Vers le niveau 7' },
];

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
  /** Statut de recrutement (§9, crews.recruitment_status 0013). */
  recruitment: CrewRecruitmentStatus;
  /** Tags de style du crew (§10, crews.tags 0013) — chips discovery/matching. */
  tags: readonly CrewTag[];
  /** Code d'invitation 6 caractères (crews.code) — présent si recrutement ouvert. */
  joinCode?: string;
  language: string;
  objective: 'casual' | 'competitif' | 'pionnier';
  /** Signaux rapides §46 (booléens) — rendus en chips. */
  warActive: boolean;
  defenseActive: boolean;
  beginnerFriendly: boolean;
  pioneer: boolean;
  weeklyRuns: number;
}

/** Crews découvrables — mêmes noms que la carte/classement factices (§46).
 * Les 4 statuts de recrutement §9 sont représentés (invite_only/open/on_request). */
export const DISCOVERY_CREWS: readonly DiscoveryCrewDemo[] = [
  {
    name: 'CREW NORD·XI', tag: 'N11', city: 'Paris', xp: 96_000, activityScore: 92,
    members: 9, openSpots: 1, recruitment: 'invite_only',
    tags: ['competitif', 'defense', 'raid', 'performance'],
    language: 'FR', objective: 'competitif',
    warActive: true, defenseActive: true, beginnerFriendly: false, pioneer: false, weeklyRuns: 84,
  },
  {
    name: 'LES PAVÉS 12', tag: 'PV', city: 'Paris', xp: 28_000, activityScore: 61,
    members: 6, openSpots: 4, recruitment: 'open', joinCode: 'PAVES1',
    tags: ['casual', 'defense', 'debutants_ok'],
    language: 'FR', objective: 'casual',
    warActive: false, defenseActive: true, beginnerFriendly: true, pioneer: false, weeklyRuns: 41,
  },
  {
    name: 'BPM BASTILLE', tag: 'BPM', city: 'Paris', xp: 12_500, activityScore: 48,
    members: 4, openSpots: 6, recruitment: 'on_request',
    tags: ['casual', 'debutants_ok'],
    language: 'FR', objective: 'casual',
    warActive: false, defenseActive: false, beginnerFriendly: true, pioneer: false, weeklyRuns: 22,
  },
  {
    name: 'PAYS DE CAUX RC', tag: 'PDC', city: 'Dieppe', xp: 6_200, activityScore: 55,
    members: 5, openSpots: 5, recruitment: 'open', joinCode: 'CAUXRC',
    tags: ['exploration', 'pionnier', 'run_club', 'debutants_ok'],
    language: 'FR', objective: 'pionnier',
    warActive: false, defenseActive: false, beginnerFriendly: true, pioneer: true, weeklyRuns: 18,
  },
];
