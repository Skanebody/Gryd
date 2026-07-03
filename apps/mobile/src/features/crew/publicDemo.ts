/**
 * GRYD — DATA démo de la page CREW PUBLIQUE / recrutement (AMENDEMENT-07 §8,
 * doc social §27). ADDITIF au module crew : n'écrase pas demo.ts (AMENDEMENT-06).
 * Porte les champs affichés sur une fiche crew publique (level via XP, league,
 * statut de recrutement, rôles recherchés, langue, objectif). La league et le
 * statut de recrutement sont des ÉTIQUETTES (colonnes crews.league /
 * recruitment_status en 0011), pas des barèmes numériques — donc pas de « nombre
 * magique ». Le niveau reste DÉRIVÉ de l'XP (crewLevelForXp). TODO(O1) brancher
 * crews / crew_applications. Zéro position live.
 */
import type { CrewRole } from '@klaim/shared';

/** Statut de recrutement (crews.recruitment_status, 0011) — étiquette UI. */
export type RecruitmentStatus = 'open' | 'request' | 'closed';

/** League nommée (crews.league, 0011) — palier de compétition, pas un barème. */
export type CrewLeague = 'bronze' | 'silver' | 'gold' | 'carbon' | 'elite';

export const RECRUITMENT_LABELS: Record<RecruitmentStatus, string> = {
  open: 'Ouvert à tous',
  request: 'Sur demande',
  closed: 'Fermé',
};

export const LEAGUE_LABELS: Record<CrewLeague, string> = {
  bronze: 'Ligue Bronze',
  silver: 'Ligue Silver',
  gold: 'Ligue Gold',
  carbon: 'Ligue Carbon',
  elite: 'Ligue Elite',
};

export interface PublicCrewDemo {
  name: string;
  tag: string;
  city: string;
  /** XP crew → niveau DÉRIVÉ (crewLevelForXp). */
  xp: number;
  activityScore: number;
  league: CrewLeague;
  recruitment: RecruitmentStatus;
  members: number;
  weeklyRuns: number;
  language: string;
  bio: string;
  /** Rôles activement recherchés (recherche de rôles §27). */
  rolesWanted: readonly CrewRole[];
  /** Lien de partage/copie (Copier lien + toast, §8). */
  inviteLink: string;
}

/**
 * Crew publique démo — cohérente avec DISCOVERY_CREWS (CREW NORD·XI). Sert de
 * cible par défaut à app/crew-public.tsx.
 */
export const PUBLIC_CREW: PublicCrewDemo = {
  name: 'CREW NORD·XI',
  tag: 'N11',
  city: 'Paris',
  xp: 96_000,
  activityScore: 92,
  league: 'gold',
  recruitment: 'request',
  members: 9,
  weeklyRuns: 84,
  language: 'FR',
  bio: 'On tient le nord-est parisien. Défense sérieuse, ambiance saine, zéro pression sur l’allure — on veut des coureurs réguliers, pas des machines.',
  rolesWanted: ['defender', 'scout'],
  inviteLink: 'gryd.run/c/nord11',
};
