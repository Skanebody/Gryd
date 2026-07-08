/**
 * GRYD — DATA démo des pages CREW PUBLIQUES (AMENDEMENT-08 §10, doc §16).
 * ADDITIF au module crew : n'écrase pas demo.ts. Chaque crew découvrable
 * (DISCOVERY_CREWS) a un PROFIL PUBLIC (recrutement, bio, rôles recherchés,
 * hexes tenus, lien d'invitation) — la fusion garantit la COHÉRENCE entre
 * Crew Discovery et la page publique (« Voir la base »). Le niveau, le tier de
 * ligue et le statut d'activité restent DÉRIVÉS des règles réelles
 * (features/crew/rules) côté écran — pas de nombre magique. TODO(O1) brancher
 * crews / crew_applications. Zéro position live (§37.3).
 */
import type { CrewRecruitmentStatus, CrewRole } from '@klaim/shared';
import { RECRUITMENT_STATUS_LABELS } from './rules';
import { DISCOVERY_CREWS, type DiscoveryCrewDemo } from './demo';

/** Statut de recrutement (crews.recruitment_status, 0013) — clés SHARED (§9). */
export type RecruitmentStatus = CrewRecruitmentStatus;

/** Ré-export compat : les libellés FR vivent dans rules.ts (source unique). */
export const RECRUITMENT_LABELS = RECRUITMENT_STATUS_LABELS;

/** Peut-on candidater/rejoindre depuis l'app (§9) ? invite_only/closed = non. */
export function canApplyTo(status: RecruitmentStatus): boolean {
  return status === 'open' || status === 'on_request';
}

/** Tags de style de jeu affichés en chips d'état (mêmes clés que ui/game). */
export type CrewPlayTagKey = 'war' | 'defense' | 'competitive';

/**
 * Tags de jeu d'un crew découvrable — DÉRIVÉS des signaux d'activité §46
 * (warActive/defenseActive/objective), partagés par Discovery et page publique.
 */
export function playTagsFor(
  crew: Pick<DiscoveryCrewDemo, 'warActive' | 'defenseActive' | 'objective'>,
): CrewPlayTagKey[] {
  const tags: CrewPlayTagKey[] = [];
  if (crew.warActive) tags.push('war');
  if (crew.defenseActive) tags.push('defense');
  if (crew.objective === 'competitif') tags.push('competitive');
  return tags;
}

/** Volet PUBLIC d'un crew (ce que voit un joueur hors du crew). Le statut de
 * recrutement et les tags vivent sur DiscoveryCrewDemo (source unique 0013). */
export interface PublicCrewProfileDemo {
  bio: string;
  /** Rôles activement recherchés (« Recherche : Stratège / Éclaireur », §16). */
  rolesWanted: readonly CrewRole[];
  /** Territoire tenu (agrégé zone/crew — jamais de tracé individuel). */
  heldHexes: number;
  /** Lien de partage/copie (Copier lien + toast, §8). */
  inviteLink: string;
}

/** Fiche publique complète = crew découvrable + volet public. */
export interface PublicCrewDemo extends DiscoveryCrewDemo, PublicCrewProfileDemo {
  /** UUID serveur — présent quand chargé depuis Supabase. */
  id?: string;
}

/** Profils publics par tag de crew — mêmes crews que DISCOVERY_CREWS. */
const PROFILES: Record<string, PublicCrewProfileDemo> = {
  N11: {
    bio: 'On tient le nord-est parisien. Défense sérieuse, ambiance saine, zéro pression sur l\'allure — on veut des coureurs réguliers, pas des machines.',
    rolesWanted: ['strategist', 'captain'],
    heldHexes: 612,
    inviteLink: 'gryd.run/c/nord11',
  },
  PV: {
    bio: 'Le 12ᵉ pavé par pavé. Sorties défense le mardi, run tranquille le dimanche. Débutants bienvenus, on t\'apprend le jeu de zone.',
    rolesWanted: ['runner', 'scout'],
    heldHexes: 238,
    inviteLink: 'gryd.run/c/paves12',
  },
  BPM: {
    bio: 'Crew de quartier autour de Bastille. On court au feeling, on capture ce qui passe. Zéro compétition forcée.',
    rolesWanted: ['runner'],
    heldHexes: 121,
    inviteLink: 'gryd.run/c/bpmbastille',
  },
  PDC: {
    bio: 'Pionniers du pays de Caux : tout est à ouvrir ici. Chaque course dessine la carte — rejoins les premiers.',
    rolesWanted: ['scout', 'runner'],
    heldHexes: 74,
    inviteLink: 'gryd.run/c/paysdecaux',
  },
};

/** Volet public de secours si un crew n'a pas de profil (guard §0 — jamais d'écran cassé). */
const FALLBACK_PROFILE: PublicCrewProfileDemo = {
  bio: 'Ce crew court dans son secteur. Demande à rejoindre pour en savoir plus.',
  rolesWanted: [],
  heldHexes: 0,
  inviteLink: 'gryd.run/c/crew',
};

/** Fiches publiques de tous les crews découvrables (fusion déterministe). */
export const PUBLIC_CREWS: readonly PublicCrewDemo[] = DISCOVERY_CREWS.map((crew) => ({
  ...crew,
  ...(PROFILES[crew.tag] ?? FALLBACK_PROFILE),
}));

/**
 * Résout la fiche publique d'un crew depuis son tag (param de route
 * /crew-public?crew=N11). Fallback sur la première fiche : la page ne casse
 * jamais sur un param absent/inconnu (AMENDEMENT-08 §0).
 */
export function publicCrewForTag(tag?: string): PublicCrewDemo {
  const found = tag ? PUBLIC_CREWS.find((c) => c.tag === tag) : undefined;
  return found ?? PUBLIC_CREWS[0]!;
}

/** Fiche par défaut (compat) — CREW NORD·XI, cohérente avec la Discovery. */
export const PUBLIC_CREW: PublicCrewDemo = publicCrewForTag('N11');
