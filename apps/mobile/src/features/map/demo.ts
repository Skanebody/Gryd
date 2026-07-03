/**
 * GRYD — données démo DÉTERMINISTES de la Battle Map (AMENDEMENT-08 §4,
 * doc §7). HUD (saison, zone, rang crew) + mini war feed flottant (3 events
 * qui défilent). Aucun réseau : TODO(O1) brancher seasons / crew_rankings /
 * war log réels. Les points des events dérivent des règles §3 (pas de nombre
 * magique) ; les noms/zones sont des étiquettes démo.
 */
import {
  POINTS_DEFENDED_HEX,
  POINTS_STOLEN_HEX,
  gameColors,
  type IconName,
} from '@klaim/shared';
import type { GameVisualState } from '../../ui/game';

/** Bandeau HUD haut : SAISON 0 · J-12 / Paris Est · Zone contestée / Crew #8. */
export const MAP_HUD: {
  seasonLabel: string;
  daysLeft: number;
  zoneName: string;
  zoneState: GameVisualState;
  crewRank: number;
} = {
  seasonLabel: 'Saison 0',
  daysLeft: 12,
  zoneName: 'Paris Est',
  zoneState: 'contested',
  crewRank: 8,
};

export interface MapWarFeedEventDemo {
  icon: IconName;
  message: string;
  zone?: string;
  points?: number;
  minutesAgo: number;
  /** Teinte fonctionnelle (gameColors.*) — lit l'état de jeu de l'event. */
  tint: string;
}

/** 3 events du mini war feed (doc §7 « Mini War Feed sur la carte »). */
export const MAP_WAR_FEED: readonly MapWarFeedEventDemo[] = [
  {
    icon: 'bouclier',
    message: 'LÉNA a défendu 8 hexes',
    zone: 'République',
    points: 8 * POINTS_DEFENDED_HEX,
    minutesAgo: 4,
    tint: gameColors.crew,
  },
  {
    icon: 'raid',
    message: 'CANAL CREW a repris 14 hexes',
    zone: 'Canal',
    points: 14 * POINTS_STOLEN_HEX,
    minutesAgo: 12,
    tint: gameColors.rival,
  },
  {
    icon: 'classement',
    message: 'NIGHT PACERS passe #8 en Paris League',
    minutesAgo: 26,
    tint: gameColors.contested,
  },
];

/** Cadence de défilement du feed (UI, pas une règle de jeu). */
export const WAR_FEED_CYCLE_MS = 5_000;
