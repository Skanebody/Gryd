/**
 * GRYD — données démo DÉTERMINISTES de la War Room (AMENDEMENT-08 §10, doc
 * §15). La scène stratégique complète : statut de saison, « À faire »
 * (missions), offensive crew (République), défense urgente (Canal), routes
 * ouvertes/à défendre, scout reports, historique War Log. Rien n'est câblé :
 * TODO(O1) brancher offensives / offensive_contributions / defense_missions /
 * missions / scout_pings / crew_chests (0010). Les paliers/niveaux de coffre
 * sont DÉRIVÉS des règles réelles côté écran (features/crew/rules) — pas
 * saisis en dur. Valeurs figées = données démo, pas des constantes de jeu.
 * Zéro position live : tout est agrégé au niveau zone/crew (§37.3).
 */
import type { GameColorName, IconName } from '@klaim/shared';

/** Bandeau de scène (saison / jours restants / rang crew local) — doc §7 HUD. */
export interface WarStatusDemo {
  seasonLabel: string;
  daysLeft: number;
  city: string;
  crewRank: number;
}
export const WAR_STATUS: WarStatusDemo = {
  seasonLabel: 'SAISON 0',
  daysLeft: 12,
  city: 'PARIS',
  crewRank: 8,
};

/** Mission de défense urgente (§38.3, exemple doc §15 : Canal, 34 hexes/48 h). */
export interface DefenseMissionDemo {
  zone: string;
  hexes: number;
  /** Heures avant expiration (decay). */
  expiresInH: number;
  assignedRole: string;
}
export const DEFENSE_MISSION: DefenseMissionDemo = {
  zone: 'Canal',
  hexes: 34,
  expiresInH: 48,
  assignedRole: 'defender',
};

/**
 * Offensive crew en cours (§38.2, exemple doc §15 : République) — affichée
 * « Conquête collective » à l'écran (AMENDEMENT-12 §A). Objectif
 * 800 hexes, 496 pris → 62 %. remainingS = point de départ du compte à rebours
 * animé (04:21:08). 6/10 participants. myHexes = contribution perso.
 */
export interface OffensiveDemo {
  zone: string;
  objectiveHexes: number;
  hexesTaken: number;
  remainingS: number;
  activeMembers: number;
  totalMembers: number;
  myHexes: number;
  /** Récompense de l'offensive (« Crew Chest Gold »). */
  reward: string;
}
export const OFFENSIVE: OffensiveDemo = {
  zone: 'République',
  objectiveHexes: 800,
  hexesTaken: 496,
  remainingS: 4 * 3600 + 21 * 60 + 8,
  activeMembers: 6,
  totalMembers: 10,
  myHexes: 58,
  reward: 'Crew Chest Gold',
};

/** Mission « À faire » de la War Room (§7.12, types quotidienne/hebdo/crew). */
export interface MissionDemo {
  key: string;
  kind: 'quotidienne' | 'hebdomadaire' | 'crew';
  label: string;
  progress: number;
  target: number;
}
// AMENDEMENT-12 §A : libellés missions/notifications sur les 2 verbes joueur.
export const MISSIONS: readonly MissionDemo[] = [
  { key: 'daily_capture_10', kind: 'quotidienne', label: 'Conquiers 10 zones aujourd\'hui', progress: 6, target: 10 },
  { key: 'weekly_verified_4', kind: 'hebdomadaire', label: '4 courses vérifiées cette semaine', progress: 2, target: 4 },
  { key: 'crew_defend_50', kind: 'crew', label: 'Le crew défend 50 zones', progress: 38, target: 50 },
];

/**
 * Routes du crew (doc §7 « route ouverte » / AMENDEMENT-08 §10) : lignes
 * stratégiques entre zones tenues. `open` = active (chartreuse) ; `defend` =
 * menacée, à re-courir avant expiration.
 */
export interface WarRouteDemo {
  key: string;
  /** Tracé lisible (« Base → République »). */
  label: string;
  km: number;
  status: 'open' | 'defend';
  /** Heures restantes avant fermeture (routes à défendre uniquement). */
  expiresInH?: number;
}
export const WAR_ROUTES: readonly WarRouteDemo[] = [
  { key: 'route_republique', label: 'Base → République', km: 4.2, status: 'open' },
  { key: 'route_buttes', label: 'Belleville → Buttes-Chaumont', km: 3.1, status: 'open' },
  { key: 'route_ourcq', label: 'Quai de l\'Ourcq', km: 2.6, status: 'defend', expiresInH: 24 },
];

/**
 * Scout reports (perk Scout Ping §34, AMENDEMENT-08 §10) : renseignement
 * agrégé par zone — jamais de position live d'un joueur (§37.3). La teinte
 * lit l'état de jeu : rival affaibli = opportunité de conquête (rival),
 * secteur neutre dense = info de conquête (verify).
 */
export interface ScoutReportDemo {
  key: string;
  kind: 'rival_weak' | 'neutral_dense';
  zone: string;
  message: string;
  /** Pseudo du scout auteur du ping. */
  scout: string;
  minutesAgo: number;
  icon: IconName;
  tint: GameColorName;
}
export const SCOUT_REPORTS: readonly ScoutReportDemo[] = [
  {
    key: 'scout_volt_faible',
    kind: 'rival_weak',
    zone: 'Buttes-Chaumont',
    message: 'Zone rivale affaiblie — VOLT·19 n\'y a plus couru depuis 3 jours',
    scout: 'PACER·20E',
    minutesAgo: 42,
    icon: 'radar',
    tint: 'rival',
  },
  {
    key: 'scout_villette_dense',
    kind: 'neutral_dense',
    zone: 'Villette',
    message: 'Secteur neutre dense — 120 zones libres à moins de 2 km de la base',
    scout: 'PACER·20E',
    minutesAgo: 180,
    icon: 'scout',
    tint: 'verify',
  },
];

/** Réaction GRYD posée sur un événement d'historique (icônes react*, §13). */
export interface WarHistoryReactionDemo {
  icon: IconName;
  count: number;
  mine?: boolean;
}

/** Événement du War Log / historique (doc §13, rendu WarEventCard). */
export interface WarHistoryEventDemo {
  key: string;
  icon: IconName;
  message: string;
  zone: string;
  points?: number;
  minutesAgo: number;
  /** Teinte fonctionnelle : crew = notre action, rival = attaque subie. */
  tint: GameColorName;
  reactions: readonly WarHistoryReactionDemo[];
}
export const WAR_HISTORY: readonly WarHistoryEventDemo[] = [
  {
    key: 'hist_raid_molokai',
    icon: 'raid',
    message: 'MOLOKAÏ a repris 14 zones à VOLT·19',
    zone: 'Buttes-Chaumont',
    points: 176,
    minutesAgo: 8,
    tint: 'crew',
    reactions: [
      { icon: 'reactRaid', count: 3 },
      { icon: 'reactRespect', count: 5, mine: true },
    ],
  },
  {
    key: 'hist_defense_jog',
    icon: 'bouclier',
    message: 'JOG.PARMENTIER a tenu la zone sous pression',
    zone: 'Canal Saint-Martin',
    points: 92,
    minutesAgo: 55,
    tint: 'crew',
    reactions: [{ icon: 'reactDefense', count: 4 }],
  },
  {
    key: 'hist_attaque_volt',
    icon: 'guerre',
    message: 'VOLT·19 attaque le secteur est',
    zone: 'Pelleport',
    minutesAgo: 130,
    tint: 'rival',
    reactions: [{ icon: 'reactHold', count: 2 }],
  },
];
