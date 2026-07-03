/**
 * GRYD — point d'accès UNIQUE de l'UI mobile au catalogue de badges
 * (AMENDEMENT-04). Tous les composants importent d'ici, jamais du catalogue
 * directement. Branché sur la source de vérité @klaim/shared/badges — ce
 * fichier ne fait que du mapping de forme pour l'UI.
 */
// Import racine (et pas '@klaim/shared/badges') : le tsconfig Expo ne résout
// pas les subpath exports (moduleResolution non-bundler).
import {
  BADGES as SHARED_BADGES,
  BADGE_FAMILY_COLORS,
  type BadgeDef as SharedBadgeDef,
} from '@klaim/shared';

export type BadgeFamilyId = 'fondateur' | 'performance' | 'territoire' | 'crew' | 'special';

export interface BadgeFamilyDef {
  id: BadgeFamilyId;
  name: string;
  color: string;
}

export interface BadgeDef {
  id: string;
  name: string;
  family: BadgeFamilyId;
  /** Condition de déblocage, formulée joueur (interprétations gelées §3). */
  requirement: string;
  /** Masqué en UI (« ? ») tant que non débloqué (AMENDEMENT-04 §2). */
  secret: boolean;
}

/** Fondateur violet · Performance cyan · Territoire vert · Crew orange · Spécial rose. */
export const BADGE_FAMILIES: readonly BadgeFamilyDef[] = [
  { id: 'fondateur', name: 'Fondateur', color: BADGE_FAMILY_COLORS.fondateur },
  { id: 'performance', name: 'Performance', color: BADGE_FAMILY_COLORS.performance },
  { id: 'territoire', name: 'Territoire', color: BADGE_FAMILY_COLORS.territoire },
  { id: 'crew', name: 'Crew', color: BADGE_FAMILY_COLORS.crew },
  { id: 'special', name: 'Spécial', color: BADGE_FAMILY_COLORS.special },
] as const;

/** Or des badges secrets — DATA du catalogue, comme les couleurs de famille (§1). */
export const SECRET_BADGE_COLOR: string = BADGE_FAMILY_COLORS.secret;

function toUiBadge(b: SharedBadgeDef): BadgeDef {
  const secret = b.secret === true || b.family === 'secret';
  return {
    id: b.key,
    name: b.name,
    // Les secrets sont hors familles visibles : rattachés à 'special' pour le
    // typage, mais toujours filtrés par le flag `secret` (jamais listés là-bas).
    family: b.family === 'secret' ? 'special' : b.family,
    requirement: b.requirement,
    secret,
  };
}

export const BADGES: readonly BadgeDef[] = SHARED_BADGES.map(toUiBadge);

/** Total affiché partout : « x / 59 » (50 visibles + 9 secrets, §2). */
export const BADGE_TOTAL = BADGES.length;

/** Couleur d'accent d'un badge — or pour les secrets, couleur de famille sinon (§1). */
export function badgeColor(def: BadgeDef): string {
  if (def.secret) return SECRET_BADGE_COLOR;
  const family = BADGE_FAMILIES.find((f) => f.id === def.family);
  return family ? family.color : SECRET_BADGE_COLOR;
}

/** Badges visibles d'une famille (les secrets vivent dans leur propre section). */
export function familyBadges(familyId: BadgeFamilyId): readonly BadgeDef[] {
  return BADGES.filter((b) => b.family === familyId && !b.secret);
}

/** Les 9 badges secrets (section « Secrets » en bas de la collection). */
export function secretBadges(): readonly BadgeDef[] {
  return BADGES.filter((b) => b.secret);
}

export function badgeById(id: string): BadgeDef | undefined {
  return BADGES.find((b) => b.id === id);
}
