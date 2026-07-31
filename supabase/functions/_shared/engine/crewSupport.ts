// GÉNÉRÉ par scripts/sync-game-rules.mjs — ne pas éditer.
// Source : packages/engine/src/crewSupport.ts

/**
 * GRYD — engine/crewSupport.ts (AMENDEMENT-48, 01/08/2026).
 *
 * « La course fait avancer le crew. L'argent le distingue. Jamais l'inverse,
 * jamais de raccourci. »
 *
 * Fonctions PURES : aucune I/O, aucune horloge, aucun nombre magique (tout
 * vient de @klaim/shared/game-rules).
 *
 * ─── CE QUE CE MODULE DÉCIDE, ET CE QU'IL NE DÉCIDERA JAMAIS ────────────────
 * Il décide quels EMPLACEMENTS COSMÉTIQUES un crew peut équiper. Rien d'autre.
 * Aucune de ses sorties n'est lue — et ne doit jamais l'être — par la capture,
 * la défense, le decay, le scoring ou le classement. Un `if` qui ferait dépendre
 * une règle de jeu d'un palier de soutien serait un défaut de conformité, pas
 * une feature. `crewSupport.guard.test.ts` monte la garde sur ce point : il
 * échoue si un module de règles se met à importer ces constantes.
 *
 * ─── LES DEUX PORTES ────────────────────────────────────────────────────────
 * Un emplacement s'équipe si, ET SEULEMENT SI, les deux sont franchies :
 *   · la COURSE (`crewLevel`, gagné en jouant) ouvre le DROIT à l'emplacement ;
 *   · le SOUTIEN (`supportTier`) ouvre sa variante DISTINCTIVE.
 * Un crew qui paie sans courir n'a rien de plus qu'un crew qui court sans
 * payer : il a la même chose, en plus beau.
 *
 * `blockedBy` nomme laquelle des deux manque, parce qu'un écran honnête doit
 * pouvoir dire « il vous manque du terrain » plutôt que « il vous manque de
 * l'argent » quand c'est le terrain qui manque.
 *
 * ─── DETTE CONNUE, DÉCLARÉE ICI PARCE QU'ELLE SE PAIE ICI (A-48 §5) ─────────
 * L'axe COURSE n'est PAS normalisé par la taille du crew :
 * `CREW_XP_DAILY_CAP_PER_MEMBER` plafonne PAR MEMBRE, donc un crew de 50 franchit
 * `CREW_XP_TABLE` dix fois plus vite qu'un crew de 5 à engagement par tête égal.
 * L'axe SOUTIEN, lui, EST normalisé (voir `crewSupportRequirement`). Tant que la
 * course ne l'est pas — la correction vit dans la RPC serveur `add_crew_xp`,
 * donc dans une migration — brancher les deux axes en production
 * COMPOUNDERAIT la taille et l'argent. Le moteur est écrit ; le branchement
 * attend. Ne pas retirer cet avertissement avant que la migration existe.
 */
import {
  CREW_COSMETIC_SLOTS,
  CREW_SUPPORT_REFERENCE_MEMBERS,
  CREW_SUPPORT_TIER_MAX,
  CREW_SUPPORT_TIERS,
  CREW_SUPPORT_UNITS,
  type CrewSupportOrigin,
} from '../game-rules.ts';

/**
 * Unités de soutien générées par UN achat, selon son origine.
 *
 * `crewFunded` rend TOUJOURS 0 : un crew ne peut jamais financer son propre
 * palier. Sans cette ligne, il suffirait d'offrir des cosmétiques à ses membres
 * pour blanchir de l'argent en palier.
 *
 * Une origine inconnue rend 0 — dans le doute sur la provenance d'un achat, on
 * n'accorde rien. C'est la position par défaut, pas un oubli : l'erreur doit
 * aller dans le sens qui ne peut pas être exploité.
 */
export function supportUnitsFor(origin: CrewSupportOrigin | string): number {
  const units = (CREW_SUPPORT_UNITS as Record<string, number | undefined>)[origin];
  return typeof units === 'number' && Number.isFinite(units) && units > 0 ? units : 0;
}

/** Multiplicateur de normalisation : jamais sous 1 (aucune remise aux petits crews). */
function sizeFactor(memberCount: number): number {
  if (!Number.isFinite(memberCount) || memberCount <= 0) return 1;
  return Math.max(1, memberCount / CREW_SUPPORT_REFERENCE_MEMBERS);
}

/**
 * Unités cumulées requises pour atteindre `tier` dans un crew de `memberCount`.
 *
 * La normalisation (leçon Telegram) rend le TEMPS pour monter INDÉPENDANT de la
 * taille : un crew de 50 produit dix fois le soutien d'un crew de 5, et il lui
 * en faut dix fois plus. Ce qui varie, c'est l'engagement par tête — donc ce que
 * le palier mesure, c'est bien l'engagement, jamais le nombre de membres.
 *
 * Un palier hors table rend `Infinity` : inatteignable, jamais « déjà atteint ».
 */
export function crewSupportRequirement(tier: number, memberCount: number): number {
  if (!Number.isInteger(tier) || tier < 0 || tier > CREW_SUPPORT_TIER_MAX) {
    return Number.POSITIVE_INFINITY;
  }
  return CREW_SUPPORT_TIERS[tier]! * sizeFactor(memberCount);
}

/**
 * Palier de soutien atteint. Monotone croissant en `units` — le soutien est
 * DÉFINITIF (A-48 §3.3) : rien ici ne peut faire redescendre un crew, et aucune
 * horloge n'entre dans ce calcul. Un crew ne perd jamais son palier parce qu'un
 * membre a résilié ou est parti.
 */
export function crewSupportTier(units: number, memberCount: number): number {
  const have = Number.isFinite(units) && units > 0 ? units : 0;
  let tier = 0;
  for (let t = 1; t <= CREW_SUPPORT_TIER_MAX; t++) {
    if (have >= crewSupportRequirement(t, memberCount)) tier = t;
  }
  return tier;
}

/** Ce qui manque pour équiper un emplacement — jamais les deux à la fois. */
export type CrewSlotBlocker = 'course' | 'soutien' | 'les_deux' | null;

export interface CrewSlotState {
  readonly key: string;
  readonly unlocked: boolean;
  /** `null` ⇔ `unlocked`. Nomme l'axe manquant, pour que l'écran dise le vrai. */
  readonly blockedBy: CrewSlotBlocker;
  readonly needsCrewLevel: number;
  readonly needsSupportTier: number;
}

export interface CrewCosmeticInput {
  /** Unités de soutien CUMULÉES du crew (jamais décroissantes). */
  readonly supportUnits: number;
  readonly memberCount: number;
  /** Niveau de crew gagné en COURANT (`crewLevelForXp`). */
  readonly crewLevel: number;
}

export interface CrewCosmeticState {
  readonly supportTier: number;
  readonly slots: readonly CrewSlotState[];
}

/**
 * État cosmétique complet d'un crew. Rend TOUS les emplacements, y compris
 * verrouillés : un écran qui ne montrerait que les emplacements acquis
 * cacherait la trajectoire, qui est le vrai produit — et la trajectoire est
 * gratuite.
 */
export function crewCosmeticState(input: CrewCosmeticInput): CrewCosmeticState {
  const supportTier = crewSupportTier(input.supportUnits, input.memberCount);
  const level = Number.isFinite(input.crewLevel) ? input.crewLevel : 0;

  const slots = CREW_COSMETIC_SLOTS.map((slot): CrewSlotState => {
    const courseOk = level >= slot.crewLevel;
    const soutienOk = supportTier >= slot.supportTier;
    const blockedBy: CrewSlotBlocker = courseOk
      ? soutienOk
        ? null
        : 'soutien'
      : soutienOk
        ? 'course'
        : 'les_deux';
    return {
      key: slot.key,
      unlocked: courseOk && soutienOk,
      blockedBy,
      needsCrewLevel: slot.crewLevel,
      needsSupportTier: slot.supportTier,
    };
  });

  return { supportTier, slots };
}
