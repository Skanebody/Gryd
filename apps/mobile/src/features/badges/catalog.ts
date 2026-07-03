/**
 * GRYD — point d'accès UNIQUE de l'UI mobile au catalogue de badges V2
 * (AMENDEMENT-06 §1). Tous les composants importent d'ici, jamais du catalogue
 * partagé directement. Branché sur la source de vérité @klaim/shared/badges —
 * ce fichier ne fait que du mapping de forme + des helpers d'affichage. AUCUN
 * nombre magique / couleur ici : tout (seuils, couleurs famille, recettes de
 * tier) vient de @klaim/shared.
 */
// Import racine (et pas '@klaim/shared/badges') : le tsconfig Expo ne résout
// pas les subpath exports (moduleResolution non-bundler).
import {
  BADGES as SHARED_BADGES,
  BADGES_BY_KEY,
  BADGE_FAMILY_COLORS,
  BADGE_TIERS,
  BADGE_TIER_RANK,
  BADGE_TIER_LABEL,
  BADGE_TIER_STYLE,
  badgeProgress,
  familyLevels as sharedFamilyLevels,
  nextLevelOf as sharedNextLevelOf,
  type BadgeDef as SharedBadgeDef,
  type BadgeMetric,
  type BadgeTier,
  type BadgeTierStyle,
} from '@klaim/shared';

export type { BadgeMetric, BadgeTier, BadgeTierStyle };
export { BADGE_TIERS, BADGE_TIER_STYLE, BADGE_TIER_LABEL };

export type BadgeFamilyId =
  | 'onboarding'
  | 'distance'
  | 'territoire'
  | 'attaque'
  | 'defense'
  | 'exploration'
  | 'routes'
  | 'crew'
  | 'performance'
  | 'saison'
  | 'verified'
  | 'secret';

export interface BadgeFamilyDef {
  id: BadgeFamilyId;
  name: string;
  color: string;
}

export interface BadgeDef {
  id: string;
  name: string;
  /** Famille RÉELLE (les secrets restent 'secret' — teinte or). */
  family: BadgeFamilyId;
  /** Tier visuel du badge/niveau (road…legend). Décide anneau/glow/halo. */
  tier: BadgeTier;
  /** Métrique de progression (alimente la jauge). */
  metric: BadgeMetric;
  /** Seuil de déblocage (stat >= threshold). */
  threshold: number;
  /** Slug de la famille progressive (undefined = badge simple/secret). */
  familySlug?: string;
  /** Niveau 1..6 (6 = legend) dans la famille progressive. */
  level?: number;
  /** Condition de déblocage, formulée joueur (interprétations gelées §3). */
  requirement: string;
  /** Masqué en UI (« ? ») tant que non débloqué (§2). */
  secret: boolean;
  /** Badge héritage Saison 0 — caché par défaut de la collection (§1.5). */
  legacy: boolean;
}

/** 12 familles V2 (AMENDEMENT-06 §1.2), 'secret' incluse (sa propre section). */
export const BADGE_FAMILIES: readonly BadgeFamilyDef[] = [
  { id: 'onboarding', name: 'Onboarding', color: BADGE_FAMILY_COLORS.onboarding },
  { id: 'distance', name: 'Distance', color: BADGE_FAMILY_COLORS.distance },
  { id: 'territoire', name: 'Territoire', color: BADGE_FAMILY_COLORS.territoire },
  { id: 'attaque', name: 'Attaque', color: BADGE_FAMILY_COLORS.attaque },
  { id: 'defense', name: 'Défense', color: BADGE_FAMILY_COLORS.defense },
  { id: 'exploration', name: 'Exploration', color: BADGE_FAMILY_COLORS.exploration },
  { id: 'routes', name: 'Routes', color: BADGE_FAMILY_COLORS.routes },
  { id: 'crew', name: 'Crew', color: BADGE_FAMILY_COLORS.crew },
  { id: 'performance', name: 'Performance', color: BADGE_FAMILY_COLORS.performance },
  { id: 'saison', name: 'Saison', color: BADGE_FAMILY_COLORS.saison },
  { id: 'verified', name: 'Verified', color: BADGE_FAMILY_COLORS.verified },
] as const;

/** Les 12 familles « en avant » + la section Secrets (pour les filtres). */
export const SECRET_BADGE_COLOR: string = BADGE_FAMILY_COLORS.secret;

function toUiBadge(b: SharedBadgeDef): BadgeDef {
  const secret = b.secret === true || b.family === 'secret';
  return {
    id: b.key,
    name: b.name,
    family: b.family as BadgeFamilyId,
    tier: b.tier,
    metric: b.metric,
    threshold: b.threshold,
    familySlug: b.familySlug,
    level: b.level,
    requirement: b.requirement,
    secret,
    legacy: b.legacy === true,
  };
}

export const BADGES: readonly BadgeDef[] = SHARED_BADGES.map(toUiBadge);

/** Badges « collection » = tout sauf l'héritage caché (§1.5). */
export const COLLECTION_BADGES: readonly BadgeDef[] = BADGES.filter((b) => !b.legacy);

/** Total affiché dans le header « x / N débloqués » (héritage exclu). */
export const BADGE_TOTAL = COLLECTION_BADGES.length;

/** Couleur d'accent d'un badge — or pour les secrets, couleur de famille sinon (§1). */
export function badgeColor(def: BadgeDef): string {
  if (def.secret) return SECRET_BADGE_COLOR;
  const family = BADGE_FAMILIES.find((f) => f.id === def.family);
  return family ? family.color : SECRET_BADGE_COLOR;
}

/** Style visuel du tier d'un badge (recette de la maquette, DATA §1). */
export function tierStyle(def: BadgeDef): BadgeTierStyle {
  return BADGE_TIER_STYLE[def.tier];
}

/** Badges visibles (non-héritage) d'une famille — secrets exclus (autre section). */
export function familyBadges(familyId: BadgeFamilyId): readonly BadgeDef[] {
  if (familyId === 'secret') return secretBadges();
  return COLLECTION_BADGES.filter((b) => b.family === familyId && !b.secret);
}

/** Les badges secrets (section « Secrets »). */
export function secretBadges(): readonly BadgeDef[] {
  return COLLECTION_BADGES.filter((b) => b.secret);
}

export function badgeById(id: string): BadgeDef | undefined {
  return BADGES.find((b) => b.id === id);
}

/** Les 6 niveaux d'une famille progressive, ordonnés 1..6 (UI shape). */
export function familyLevels(slug: string): BadgeDef[] {
  return sharedFamilyLevels(slug).map(toUiBadge);
}

/** Le niveau au-dessus de `id` (ou null si legend / non progressif). */
export function nextLevelOf(id: string): BadgeDef | null {
  const n = sharedNextLevelOf(id);
  return n ? toUiBadge(n) : null;
}

/**
 * Tier maximum atteint parmi un ensemble de badges débloqués (pour le header
 * « Tier max : X »). Renvoie null si aucun débloqué.
 */
export function maxTierLabel(unlockedIds: ReadonlySet<string>): string | null {
  let best = -1;
  for (const id of unlockedIds) {
    const b = BADGES_BY_KEY.get(id);
    if (!b) continue;
    const rank = BADGE_TIER_RANK[b.tier];
    if (rank > best) best = rank;
  }
  if (best < 0) return null;
  const tier = BADGE_TIERS[best]!;
  return BADGE_TIER_LABEL[tier];
}

/**
 * Récompense affichable au déblocage (doc §23 : « Récompense : titre “Hex
 * Hunter” »). DÉRIVÉE du catalogue — les badges rares (tier ≥ race) et les
 * secrets accordent leur nom en TITRE de profil ; les autres n'affichent rien.
 * Aucune donnée inventée : lecture pure du tier.
 */
export function badgeRewardLabel(def: BadgeDef): string | undefined {
  if (def.secret || BADGE_TIER_RANK[def.tier] >= BADGE_TIER_RANK.race) {
    return `Titre « ${def.name} »`;
  }
  return undefined;
}

/** Progression d'un badge pour une valeur de stat (jauge + « proches »). */
export { badgeProgress };
