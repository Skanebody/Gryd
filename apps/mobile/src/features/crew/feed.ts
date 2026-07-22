/**
 * GRYD — RÉACTIONS crew (AMENDEMENT-07 §8) : le catalogue des 8 réactions GRYD
 * en ICÔNES (pas d'emojis, décision fondateur), mappées sur le set @klaim/shared.
 *
 * ─── Constat (22/07/2026) : ce fichier a été RÉDUIT ─────────────────────────
 * Il portait aussi 500+ lignes de War Log et de chat crew de DÉMONSTRATION
 * (« KORO a ouvert une frontière · République », « LENA_RUN · 4,2 km », coffres
 * et sorties fabriqués). Toute cette donnée n'était plus RENDUE : son unique
 * chaîne de consommation (`chatStore` → `useCrewChat`) n'avait aucun écran
 * appelant — l'onglet Crew rend `RealCrewScreen`, branché sur les vraies RPC.
 * C'était donc du code mort qui fabriquait des joueurs. Supprimé, avec
 * `chatStore.ts` et `raid.ts` (eux aussi sans appelant). Le War Log réel se
 * rebranchera sur `crew_feed_events` (0011) le jour où il existera — pas sur de
 * la démo.
 *
 * Ce qui reste ici est le SEUL export vivant : le catalogue de réactions, lu par
 * `ReactionBar`. Il ne décrit AUCUN joueur : ce sont des définitions d'UI
 * (clé, icône, libellé), pas des données.
 */
import type { IconName } from '@klaim/shared';
import type { Entry } from '../../i18n/types';
import { C } from '../../i18n/catalog/crew';

// ─── Réactions GRYD custom (§8) : icônes, jamais emojis ───────────────────────
export type CrewReactionKey =
  | 'raid'
  | 'defense'
  | 'clean'
  | 'fast'
  | 'rankup'
  | 'hold'
  | 'respect'
  | 'legend';

export interface CrewReactionDef {
  key: CrewReactionKey;
  /** Icône du set partagé (ajoutées à icons.ts, ADDITIF). */
  icon: IconName;
  /** Libellé court localisé (accessibilité + tooltip) — résolu par t(). */
  label: Entry;
}

/** Ordre stable des 8 réactions (barre de réactions). */
export const CREW_REACTIONS: readonly CrewReactionDef[] = [
  { key: 'raid', icon: 'reactRaid', label: C.reactRaid },
  { key: 'defense', icon: 'reactDefense', label: C.reactDefenseWord },
  { key: 'clean', icon: 'reactClean', label: C.reactClean },
  { key: 'fast', icon: 'reactFast', label: C.reactFast },
  { key: 'rankup', icon: 'reactRankup', label: C.reactRankup },
  { key: 'hold', icon: 'reactHold', label: C.reactHold },
  { key: 'respect', icon: 'reactRespect', label: C.reactRespect },
  { key: 'legend', icon: 'reactLegend', label: C.reactLegend },
];

export const CREW_REACTION_BY_KEY: Record<CrewReactionKey, CrewReactionDef> = Object.fromEntries(
  CREW_REACTIONS.map((r) => [r.key, r]),
) as Record<CrewReactionKey, CrewReactionDef>;
