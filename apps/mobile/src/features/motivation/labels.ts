/**
 * GRYD — libellés FR des écrans motivation (AMENDEMENT-07 §1/§7/§8, motivation
 * §10/§11/§17/§21). Copie ANTI-SHAME partout (§11) : jamais « lent / dernier /
 * tu fais perdre » ; formulations positives et choisies. Séparé des règles pour
 * que la data (@klaim/shared) reste la source unique des enums — ici, uniquement
 * de la présentation.
 */
import type {
  ActivitySharing,
  ChallengeDifficulty,
  ChallengeType,
  LeaderboardLevel,
  MapSharing,
  PlayStyle,
  ProfileVisibility,
  RunMode,
} from '@klaim/shared';
import type { NotifChannel } from './store';

/** Style de jeu (§2) : titre + sous-titre non prescriptif (aucun n'est « mieux »). */
export const PLAY_STYLE_LABELS: Record<PlayStyle, { title: string; subtitle: string }> = {
  focus_solo: {
    title: 'Focus Solo',
    subtitle: 'Ta forme, tes objectifs, à ton rythme. Le territoire en bonus.',
  },
  mixte: {
    title: 'Mixte',
    subtitle: 'Un peu de tout : progression perso et vie de crew, sans pression.',
  },
  crew_war: {
    title: 'Crew War',
    subtitle: 'Conquête, défense, classements. Tu joues pour ton crew.',
  },
};

/** Visibilité du profil (§4). */
export const PROFILE_VISIBILITY_LABELS: Record<ProfileVisibility, string> = {
  private: 'Moi seul',
  friends: 'Mes amis',
  crew: 'Mon crew',
  public: 'Public',
};

/** Partage d'activité (§4). */
export const ACTIVITY_SHARING_LABELS: Record<ActivitySharing, string> = {
  private: 'Personne',
  friends: 'Mes amis',
  crew: 'Mon crew',
  stats_only: 'Stats seules (sans trace)',
};

/** Partage de carte / trace (§4) — jamais de position live, quel que soit le choix. */
export const MAP_SHARING_LABELS: Record<MapSharing, string> = {
  precise: 'Trace précise',
  simplified: 'Trace simplifiée',
  territory_only: 'Territoire seul',
  none: 'Rien',
};

/** Modes de course au départ (§2/§8). Explication courte de l'effet. */
export const RUN_MODE_LABELS: Record<
  Extract<RunMode, 'conquete' | 'social_run' | 'course_privee'>,
  { title: string; subtitle: string; icon: 'carte' | 'crew' | 'verrou' }
> = {
  conquete: {
    title: 'Conquête',
    subtitle: 'Capture et défends des zones. Le mode complet.',
    icon: 'carte',
  },
  social_run: {
    title: 'Social Run',
    subtitle: 'Cours en groupe pour le plaisir : stats, badges et XP, sans capture.',
    icon: 'crew',
  },
  course_privee: {
    title: 'Course privée',
    subtitle: 'Juste pour toi : stats perso, rien de partagé, rien sur la carte.',
    icon: 'verrou',
  },
};

/** Niveaux de classement (§10) — du plus intime au plus large. */
export const LEADERBOARD_LABELS: Record<LeaderboardLevel, string> = {
  personnel: 'Personnel',
  crew: 'Crew',
  amis: 'Amis',
  local: 'Local',
  ville: 'Ville',
  region: 'Région',
  france: 'France',
  global: 'Tous',
};

/** Canaux de notification (§21). */
export const NOTIF_CHANNEL_LABELS: Record<NotifChannel, { title: string; subtitle: string }> = {
  solo: { title: 'Solo', subtitle: 'Objectif du jour, records, séries.' },
  crew: { title: 'Crew', subtitle: 'Coffre, défense, activité du crew.' },
  competition: { title: 'Compétition', subtitle: 'Rivalités, classements, offensives.' },
  off: { title: 'Silence', subtitle: 'Aucune notification. Tu ouvres quand tu veux.' },
};

/** Type de challenge (§17) → étiquette courte. */
export const CHALLENGE_TYPE_LABELS: Record<ChallengeType, string> = {
  solo: 'Solo',
  crew: 'Crew',
  rivalry: 'Rivalité',
  event: 'Événement',
  season: 'Saison',
};

/** Difficulté (§16) → étiquette DOUCE (jamais « facile/dur » culpabilisant). */
export const CHALLENGE_DIFFICULTY_LABELS: Record<ChallengeDifficulty, string> = {
  chill: 'Tranquille',
  standard: 'Régulier',
  intense: 'Ambitieux',
};

/**
 * Message anti-shame de progression (§11) : jamais de rang négatif, toujours du
 * chemin parcouru ou restant. PURE. `remaining` en unités déjà formatées par
 * l'appelant (ex. « 1 course », « 2,3 km »).
 */
export function encouragement(done: boolean, remaining: string): string {
  if (done) return 'Objectif atteint. Beau travail.';
  return `Plus que ${remaining} — tu y es presque.`;
}
