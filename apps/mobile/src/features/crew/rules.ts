/**
 * GRYD — accès UI mobile aux règles crew (AMENDEMENT-06 §2, doc v3 §33-§53).
 * Point d'entrée UNIQUE des écrans Crew / War Room aux barèmes crew. Comme le
 * catalogue de badges (features/badges/catalog.ts), on importe les constantes
 * RÉELLES depuis la racine @klaim/shared (le tsconfig Expo ne résout pas les
 * subpath exports, et @klaim/engine tirerait h3-js dans le bundle) et on
 * ré-implémente ICI les mêmes lookups PURS que packages/engine/src/crew.ts —
 * mêmes tables, mêmes seuils. AUCUN nombre magique : tout vient de shared.
 *
 * ⚠ Miroir logique de engine/crew.ts (crewLevelForXp, tierForLevel,
 * crewFrameTierForLevel, chestTierFor, playerLevelForXp/Table,
 * activityStatusForScore). Toute évolution du barème se fait dans game-rules ;
 * ces fonctions restent de simples lectures de table.
 */
import {
  ACTIVITY_STATUS_THRESHOLDS,
  CREW_CHEST_TIERS,
  CREW_CHEST_TIER_ORDER,
  CREW_CHEST_WEEKLY_TARGET,
  CREW_FRAME_THRESHOLDS,
  CREW_LEVEL_MAX,
  CREW_PERMISSIONS,
  CREW_REFERENCE_MEMBERS,
  CREW_XP_TABLE,
  GRIP_RANK_LEVELS,
  PLAYER_LEVEL_MAX,
  PLAYER_LEVEL_XP_BASE,
  PLAYER_LEVEL_XP_RATIO,
  PLAYER_TIER_THRESHOLDS,
  ROOKIE_TRIAL_DAYS,
  type BadgeTier,
  type CrewActivityStatus,
  type GripRank,
  type CrewChestTier,
  type CrewFrameTier,
  type CrewPermissionAction,
  type CrewRecruitmentStatus,
  type CrewRole,
  type IconName,
  type PlayerTier,
} from '@klaim/shared';
import { C as RANG } from '../../i18n/catalog/rang';
import type { Entry } from '../../i18n/types';

/**
 * Multiplicateur de taille — miroir de `engine/crew.ts#crewSizeFactor`.
 * Jamais sous 1 : aucun crew ne reçoit de remise parce qu'il est petit.
 */
function sizeFactor(memberCount: number): number {
  if (!Number.isFinite(memberCount) || memberCount <= 0) return 1;
  return Math.max(1, memberCount / CREW_REFERENCE_MEMBERS);
}

/**
 * Niveau crew (1..CREW_LEVEL_MAX) atteint pour une XP cumulée dans un crew de
 * `memberCount` membres actifs (§34.3, normalisé par la migration 0107).
 *
 * ⚠️ `memberCount` est REQUIS, et ce n'est pas du zèle : le SERVEUR écrit
 * `crews.level` avec le barème normalisé (`add_crew_xp` reçoit la table déjà
 * mise à l'échelle). Un miroir client qui garderait le barème brut afficherait
 * un niveau que le serveur n'a jamais écrit — l'app mentirait sur l'état du
 * crew, et l'écart grandirait avec la taille du crew.
 */
export function crewLevelForXp(xp: number, memberCount: number): number {
  let level = 1;
  for (let i = 1; i < CREW_XP_TABLE.length; i++) {
    if (xp >= crewXpForLevel(i + 1, memberCount)) level = i + 1;
    else break;
  }
  return Math.min(level, CREW_LEVEL_MAX);
}

/** XP cumulée pour atteindre un niveau crew (borne du palier), ou dernier palier. */
export function crewXpForLevel(level: number, memberCount: number): number {
  const idx = Math.min(Math.max(1, level), CREW_LEVEL_MAX) - 1;
  // `ceil` comme le moteur : un arrondi ne rend jamais un niveau moins cher.
  return Math.ceil(CREW_XP_TABLE[idx]! * sizeFactor(memberCount));
}

/**
 * Progression 0..1 vers le palier de niveau crew suivant. 1 si niveau max.
 * `memberCount` requis pour la même raison que `crewLevelForXp` : une jauge
 * calculée sur le barème brut se remplirait plus vite que le niveau réel
 * n'arrive, et promettrait une marche qui ne tombe pas.
 */
export function crewLevelProgress(xp: number, level: number, memberCount: number): number {
  if (level >= CREW_LEVEL_MAX) return 1;
  const floor = crewXpForLevel(level, memberCount);
  const next = crewXpForLevel(level + 1, memberCount);
  if (next <= floor) return 1;
  return Math.min(1, Math.max(0, (xp - floor) / (next - floor)));
}

/** Tier du cadre de blason crew pour un niveau (§43.2). */
export function crewFrameTierForLevel(level: number): CrewFrameTier {
  const entries = Object.entries(CREW_FRAME_THRESHOLDS) as [CrewFrameTier, number][];
  let tier: CrewFrameTier = 'road';
  for (const [name, min] of entries) if (level >= min) tier = name;
  return tier;
}

/** Table d'XP cumulée par niveau joueur (index 0 = L1 = 0 XP), courbe §43.1. */
export function playerLevelXpTable(): number[] {
  const table: number[] = [];
  for (let level = 1; level <= PLAYER_LEVEL_MAX; level++) {
    const cumulative =
      (PLAYER_LEVEL_XP_BASE * (Math.pow(PLAYER_LEVEL_XP_RATIO, level - 1) - 1)) /
      (PLAYER_LEVEL_XP_RATIO - 1);
    table.push(Math.round(cumulative));
  }
  return table;
}

/** Niveau joueur (1..PLAYER_LEVEL_MAX) pour une XP cumulée (§43.1). */
export function playerLevelForXp(xp: number): number {
  const table = playerLevelXpTable();
  let level = 1;
  for (let i = 1; i < table.length; i++) {
    if (xp >= table[i]!) level = i + 1;
    else break;
  }
  return Math.min(level, PLAYER_LEVEL_MAX);
}

/** Tier visuel joueur d'un niveau (§43.1 : 1-9 road … 50 legend). */
export function playerTierForLevel(level: number): PlayerTier {
  const entries = Object.entries(PLAYER_TIER_THRESHOLDS) as [PlayerTier, number][];
  let tier: PlayerTier = 'road';
  for (const [name, min] of entries) if (level >= min) tier = name;
  return tier;
}

/** Rang du personnage GRIP pour un niveau joueur (§43.3) — MIROIR engine/crew. */
export function gripRankForLevel(level: number): GripRank {
  const entries = Object.entries(GRIP_RANK_LEVELS) as [GripRank, number][];
  let rank: GripRank = 'rookie';
  for (const [name, min] of entries) if (level >= min) rank = name;
  return rank;
}

/**
 * Libellés d'affichage des rangs GRIP — des `Entry` i18n, plus des chaînes.
 *
 * ⚠ CORRIGÉ LE 27/07/2026. C'était un `Record<GripRank, string>` de sept mots
 * FRANÇAIS rendus tels quels par le Profil (app/(tabs)/profil.tsx) dans les cinq
 * langues : un joueur allemand lisait « Conquérant · NIV. 22 ». Les sept noms
 * vivent maintenant dans `i18n/catalog/rang.ts` (source unique, partagée avec
 * E59/E60) et cette table ne fait que les indexer par `GripRank`. L'appelant
 * résout avec `t(...)` — règle 17 : jamais une chaîne déjà résolue.
 */
export const GRIP_RANK_LABELS: Record<GripRank, Entry> = {
  rookie: RANG.rankRookie,
  runner: RANG.rankRunner,
  scout: RANG.rankScout,
  defender: RANG.rankDefender,
  conqueror: RANG.rankConqueror,
  veteran: RANG.rankVeteran,
  legend: RANG.rankLegend,
};

/** État d'affichage du coffre hebdo (ChestCard) — dérivation UNIQUE partagée. */
export interface CrewChestState {
  /** Réclamable dès qu'UN palier est atteint (§39.2) — pas seulement à 100 %. */
  state: 'claimable' | 'inprogress';
  /** Plus haut palier atteint, null si aucun. */
  tier: CrewChestTier | null;
}

/**
 * Dérive l'état du coffre hebdo pour une progression `pct` (0..1+ de la cible).
 * Source unique War Room / Crew HQ : le coffre est réclamable dès le premier
 * palier atteint (§39.2), avec le palier correspondant.
 */
export function chestStateFor(pct: number): CrewChestState {
  let tier: CrewChestTier | null = null;
  for (const t of CREW_CHEST_TIER_ORDER) {
    if (pct >= CREW_CHEST_TIERS[t]) tier = t;
    else break;
  }
  return { state: tier !== null ? 'claimable' : 'inprogress', tier };
}

/** Plus haut palier de coffre atteint pour `progress` points pondérés (§39.2). */
export function chestTierFor(progress: number): CrewChestTier | null {
  const pct = CREW_CHEST_WEEKLY_TARGET > 0 ? progress / CREW_CHEST_WEEKLY_TARGET : 0;
  return chestStateFor(pct).tier;
}

/** Statut de santé crew pour un score 0-100 (§45). */
export function activityStatusForScore(score: number): CrewActivityStatus {
  const entries = Object.entries(ACTIVITY_STATUS_THRESHOLDS) as [CrewActivityStatus, number][];
  let status: CrewActivityStatus = 'dormant';
  for (const [name, min] of entries) if (score >= min) status = name;
  return status;
}

// ─── Libellés FR d'affichage (données, pas de logique) ────────────────────────

/**
 * Nom FR de rôle crew (§8, AMENDEMENT-16 §3). Le rookie affiche sa période
 * d'essai (ROOKIE_TRIAL_DAYS — jamais de « 7 » en dur).
 */
export const CREW_ROLE_LABELS: Record<CrewRole, string> = {
  founder: 'Fondateur',
  co_captain: 'Co-Capitaine',
  captain: 'Capitaine',
  strategist: 'Stratège',
  scout: 'Éclaireur',
  runner: 'Runner',
  rookie: `Rookie · essai ${ROOKIE_TRIAL_DAYS} j`,
};

/** Statut de recrutement (§9, crews.recruitment_status 0013) — libellés FR. */
export const RECRUITMENT_STATUS_LABELS: Record<CrewRecruitmentStatus, string> = {
  open: 'Ouvert à tous',
  on_request: 'Sur demande',
  invite_only: 'Sur invitation',
  closed: 'Fermé',
};

/**
 * Gating visuel par rôle (matrice §8) — MIROIR de engine/crew.ts
 * hasCrewPermission (même lecture de CREW_PERMISSIONS, le serveur reste seul
 * juge). Utilisé par Crew HQ / War Room pour désactiver les actions.
 */
export function roleCan(role: CrewRole, action: CrewPermissionAction): boolean {
  return (CREW_PERMISSIONS[action] as readonly CrewRole[]).includes(role);
}

/** Jours d'essai restants d'un rookie entré il y a `joinedDaysAgo` jours (§8.7). */
export function rookieTrialDaysLeft(joinedDaysAgo: number): number {
  return Math.max(0, ROOKIE_TRIAL_DAYS - Math.max(0, joinedDaysAgo));
}

/** Nom FR de disponibilité de guerre (§37.2). */
export const WAR_AVAILABILITY_LABELS: Record<string, string> = {
  war: 'Dispo guerre',
  defense: 'Défense',
  exploration: 'Exploration',
  casual: 'Casual',
  absent: 'Absent',
};

/** Nom FR de statut d'activité crew (§45) — vocabulaire de jeu AMENDEMENT-08 §11. */
export const ACTIVITY_STATUS_LABELS: Record<CrewActivityStatus, string> = {
  dormant: 'Dormant',
  casual: 'Casual',
  active: 'Active',
  competitive: 'Competitive',
  war_ready: 'Prêt guerre',
};

/**
 * Libellés d'activité crew 100 % FRANÇAIS (§45) — SOURCE UNIQUE consommée par
 * Crew HQ et la page publique (jamais de jargon anglais à l'écran dans une UI
 * FR). ACTIVITY_STATUS_LABELS garde le vocabulaire de jeu original ; ces
 * libellés-ci sont la version localisée à afficher, fallback dessus si absent.
 */
export const CREW_STATUS_LABELS_FR: Record<CrewActivityStatus, string> = {
  dormant: 'En sommeil',
  casual: 'Tranquille',
  active: 'Actif',
  competitive: 'Compétitif',
  war_ready: 'Prêt guerre',
};

/** Nom FR de palier de coffre (§39.2). */
export const CHEST_TIER_LABELS: Record<CrewChestTier, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  carbon: 'Carbon',
  elite: 'Elite',
};

/** Label court d'un tier de cadre/joueur (partagé road…legend). */
export const FRAME_TIER_LABELS: Record<string, string> = {
  road: 'Road',
  tempo: 'Tempo',
  race: 'Race',
  carbon: 'Carbon',
  elite: 'Elite',
  legend: 'Legend',
};

/** Libellé de ligue affiché au header HQ (« Carbon League », doc §11). */
export function leagueLabelFor(tier: BadgeTier): string {
  return `${FRAME_TIER_LABELS[tier] ?? tier} League`;
}

/**
 * COMPAT : MemberCard consomme désormais directement les clés shared
 * (AMENDEMENT-16 §3 — plus de divergence `cocaptain`). Identité conservée pour
 * les appels existants.
 */
export function memberCardRole(role: CrewRole): CrewRole {
  return role;
}

/**
 * Habillage visuel des perks crew (§35.1) : icône filaire + rareté par clé.
 * Pure présentation (les niveaux/effets restent dans CREW_PERKS shared) —
 * rareté croissante avec le niveau requis, même logique que BadgeHex (§8.3).
 */
export const PERK_VISUALS: Record<string, { icon: IconName; rarity: BadgeTier }> = {
  crew_marker: { icon: 'pin', rarity: 'road' },
  badge_frame_1: { icon: 'crest', rarity: 'tempo' },
  war_room_basic: { icon: 'guerre', rarity: 'race' },
  weekly_crew_chest: { icon: 'coffre', rarity: 'race' },
  outpost_slot_1: { icon: 'avantposte', rarity: 'carbon' },
  scout_ping: { icon: 'scout', rarity: 'carbon' },
  share_templates: { icon: 'partage', rarity: 'elite' },
  badge_frame_carbon: { icon: 'crest', rarity: 'elite' },
  war_banner: { icon: 'guerre', rarity: 'legend' },
};

/** Habillage par défaut d'un perk sans entrée dédiée (robustesse démo). */
export const PERK_VISUAL_FALLBACK: { icon: IconName; rarity: BadgeTier } = {
  icon: 'badge',
  rarity: 'road',
};
