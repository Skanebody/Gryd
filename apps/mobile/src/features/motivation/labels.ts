/**
 * GRYD — libellés des écrans motivation (AMENDEMENT-07 §1/§7/§8, motivation
 * §10/§11/§17/§21). Copie ANTI-SHAME partout (§11) : jamais « lent / dernier /
 * tu fais perdre » ; formulations positives et choisies. Séparé des règles pour
 * que la data (@klaim/shared) reste la source unique des enums — ici, uniquement
 * de la présentation.
 *
 * i18n : les valeurs sont des `Entry` (5 langues, parité forcée par le type)
 * issues du catalogue src/i18n/catalog/motivation.ts. Les composants résolvent
 * à l'affichage via `t()` (useT / t du store i18n).
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
import type { Entry } from '../../i18n/types';
import { C } from '../../i18n/catalog/motivation';
import { t } from '../../i18n/store';
import type { NotifChannel } from './store';

/** Style de jeu (§2) : titre + sous-titre non prescriptif (aucun n'est « mieux »). */
export const PLAY_STYLE_LABELS: Record<PlayStyle, { title: Entry; subtitle: Entry }> = {
  focus_solo: { title: C.playStyleFocusSoloTitle, subtitle: C.playStyleFocusSoloSubtitle },
  mixte: { title: C.playStyleMixteTitle, subtitle: C.playStyleMixteSubtitle },
  crew_war: { title: C.playStyleCrewWarTitle, subtitle: C.playStyleCrewWarSubtitle },
};

/** Visibilité du profil (§4). */
export const PROFILE_VISIBILITY_LABELS: Record<ProfileVisibility, Entry> = {
  private: C.visPrivate,
  friends: C.visFriends,
  crew: C.visCrew,
  public: C.visPublic,
};

/** Partage d'activité (§4). */
export const ACTIVITY_SHARING_LABELS: Record<ActivitySharing, Entry> = {
  private: C.actPrivate,
  friends: C.visFriends,
  crew: C.visCrew,
  stats_only: C.actStatsOnly,
};

/** Partage de carte / trace (§4) — jamais de position live, quel que soit le choix. */
export const MAP_SHARING_LABELS: Record<MapSharing, Entry> = {
  precise: C.mapPrecise,
  simplified: C.mapSimplified,
  territory_only: C.mapTerritoryOnly,
  none: C.mapNone,
};

/** Modes de course au départ (§2/§8). Explication courte de l'effet. */
export const RUN_MODE_LABELS: Record<
  Extract<RunMode, 'conquete' | 'social_run' | 'course_privee'>,
  { title: Entry; subtitle: Entry; icon: 'carte' | 'crew' | 'verrou' }
> = {
  conquete: {
    title: C.runModeConqueteTitle,
    subtitle: C.runModeConqueteSubtitle,
    icon: 'carte',
  },
  social_run: {
    title: C.runModeSocialTitle,
    subtitle: C.runModeSocialSubtitle,
    icon: 'crew',
  },
  course_privee: {
    title: C.runModePriveeTitle,
    subtitle: C.runModePriveeSubtitle,
    icon: 'verrou',
  },
};

/** Niveaux de classement (§10) — du plus intime au plus large. */
export const LEADERBOARD_LABELS: Record<LeaderboardLevel, Entry> = {
  personnel: C.lbPersonnel,
  crew: C.lbCrew,
  amis: C.lbAmis,
  local: C.lbLocal,
  ville: C.lbVille,
  region: C.lbRegion,
  france: C.lbFrance,
  global: C.lbGlobal,
};

/** Canaux de notification (§21). */
export const NOTIF_CHANNEL_LABELS: Record<NotifChannel, { title: Entry; subtitle: Entry }> = {
  solo: { title: C.notifSoloTitle, subtitle: C.notifSoloSubtitle },
  crew: { title: C.notifCrewTitle, subtitle: C.notifCrewSubtitle },
  competition: { title: C.notifCompetitionTitle, subtitle: C.notifCompetitionSubtitle },
  off: { title: C.notifOffTitle, subtitle: C.notifOffSubtitle },
};

/** Type de challenge (§17) → étiquette courte. */
export const CHALLENGE_TYPE_LABELS: Record<ChallengeType, Entry> = {
  solo: C.chTypeSolo,
  crew: C.chTypeCrew,
  rivalry: C.chTypeRivalry,
  event: C.chTypeEvent,
  season: C.chTypeSeason,
};

/** Difficulté (§16) → étiquette DOUCE (jamais « facile/dur » culpabilisant). */
export const CHALLENGE_DIFFICULTY_LABELS: Record<ChallengeDifficulty, Entry> = {
  chill: C.chDiffChill,
  standard: C.chDiffStandard,
  intense: C.chDiffIntense,
};

/**
 * Unité d'affichage d'un challenge (le seed fournit la clé technique : 'km' est
 * déjà rendu par formatChallengeValue, les autres sont traduites ici). Langue
 * courante du store — les écrans re-rendent au changement (useT ailleurs).
 */
export function challengeUnitLabel(unit: string): string {
  if (unit === 'km') return '';
  if (unit === 'courses') return t(C.unitCourses);
  if (unit === 'zones') return t(C.unitZones);
  return unit;
}

/**
 * Message anti-shame de progression (§11) : jamais de rang négatif, toujours du
 * chemin parcouru ou restant. `remaining` en unités déjà formatées par
 * l'appelant (ex. « 1 course », « 2,3 km »). Langue courante du store.
 */
export function encouragement(done: boolean, remaining: string): string {
  if (done) return t(C.goalReached);
  return t(C.almostThere, { remaining });
}

/**
 * ÉTAT VIDE « aucun défi en cours » (21/07/2026) — le 4e cas de
 * `ChallengesEmptyReason`, apparu avec la lecture réelle de `challenges`.
 *
 * Il ne pouvait pas exister tant que la liste était le catalogue en dur : le
 * serveur peut parfaitement n'avoir AUCUN challenge dans sa fenêtre d'activité
 * (les seeds 0012 sont hebdomadaires et expirent). Ce n'est ni une panne
 * (`backendOff` mentirait) ni un manque du joueur : c'est un fait sur le jeu, et
 * il se dit sans reproche — anti-shame §11, aucune allusion à ce qu'il n'a pas
 * fait.
 *
 * Ces deux `Entry` vivent ici plutôt que dans `i18n/catalog/motivation.ts` parce
 * que le catalogue est édité en parallèle par d'autres chantiers ; la parité
 * 5 langues reste imposée par le type `Entry`, qui est la seule garantie qui
 * compte.
 */
export const CHALLENGES_NONE_ACTIVE_TITLE: Entry = {
  fr: 'Aucun défi en cours.',
  en: 'No challenge running right now.',
  es: 'Ningún desafío en curso.',
  de: 'Gerade läuft keine Challenge.',
  pt: 'Nenhum desafio em andamento.',
};

export const CHALLENGES_NONE_ACTIVE_BODY: Entry = {
  fr: 'GRYD n’en propose pas cette semaine. Tes courses comptent quand même : elles alimentent ton territoire et ta série.',
  en: 'GRYD isn’t running one this week. Your runs still count: they feed your territory and your streak.',
  es: 'GRYD no propone ninguno esta semana. Tus carreras cuentan igual: alimentan tu territorio y tu racha.',
  de: 'GRYD bietet diese Woche keine an. Deine Läufe zählen trotzdem: für dein Revier und deine Serie.',
  pt: 'O GRYD não propõe nenhum esta semana. Suas corridas contam mesmo assim: elas alimentam seu território e sua sequência.',
};
