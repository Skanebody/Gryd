/**
 * GRYD — données démo DÉTERMINISTES de la War Room (AMENDEMENT-06 §2, doc v3
 * §5/§38/§7.5). « À faire maintenant » (defense_missions), offensive 24 h,
 * missions quotidienne/hebdo/crew, jauge de coffre. Rien n'est câblé :
 * TODO(O1) brancher offensives / offensive_contributions / defense_missions /
 * missions / crew_chests (0010). Les paliers/niveaux de coffre sont DÉRIVÉS des
 * règles réelles côté écran (features/crew/rules) — pas saisis en dur.
 */

/** Mission de défense urgente (§38.3, exemple doc v3 §5). */
export interface DefenseMissionDemo {
  zone: string;
  hexes: number;
  /** Heures avant expiration (decay). */
  expiresInH: number;
  assignedRole: string;
}
export const DEFENSE_MISSION: DefenseMissionDemo = {
  zone: 'République',
  hexes: 34,
  expiresInH: 48,
  assignedRole: 'defender',
};

/**
 * Offensive crew en cours (§38.2). Objectif 800 hexes, 496 pris → 62 %.
 * remainingS = décompte figé pour la démo (04:21:08). 7/10 membres actifs.
 * myHexes = contribution perso de l'utilisateur dans la zone.
 */
export interface OffensiveDemo {
  zone: string;
  objectiveHexes: number;
  hexesTaken: number;
  remainingS: number;
  activeMembers: number;
  totalMembers: number;
  myHexes: number;
}
export const OFFENSIVE: OffensiveDemo = {
  zone: 'Canal Saint-Martin',
  objectiveHexes: 800,
  hexesTaken: 496,
  remainingS: 4 * 3600 + 21 * 60 + 8,
  activeMembers: 7,
  totalMembers: 10,
  myHexes: 58,
};

/** Mission de la War Room (§7.12, types quotidienne/hebdo/crew). */
export interface MissionDemo {
  key: string;
  kind: 'quotidienne' | 'hebdomadaire' | 'crew';
  label: string;
  progress: number;
  target: number;
}
export const MISSIONS: readonly MissionDemo[] = [
  { key: 'daily_capture_10', kind: 'quotidienne', label: 'Capture 10 hexes aujourd\'hui', progress: 6, target: 10 },
  { key: 'weekly_verified_4', kind: 'hebdomadaire', label: '4 courses vérifiées cette semaine', progress: 2, target: 4 },
  { key: 'crew_defend_50', kind: 'crew', label: 'Le crew défend 50 hexes', progress: 38, target: 50 },
];
