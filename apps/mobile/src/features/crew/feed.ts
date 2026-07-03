/**
 * GRYD — Crew Feed + réactions GRYD custom + chat crew (AMENDEMENT-07 §8, doc
 * social §28/§50). DATA d'affichage démo DÉTERMINISTE, ADDITIVE au module crew
 * existant (n'écrase ni demo.ts ni rules.ts d'AMENDEMENT-06). Entrées de feed
 * §28 (capture/défense/badge/rank up/coffre) + 8 réactions GRYD en ICÔNES (pas
 * d'emojis, décision fondateur) mappées sur le set @klaim/shared. Chat crew MVP
 * = liste de messages + réactions (PAS de DM). TODO(O1) brancher
 * crew_feed_events (0011). Zéro position live : aucune entrée ne porte de
 * coordonnée.
 */
import type { IconName } from '@klaim/shared';

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
  /** Libellé court FR (accessibilité + tooltip). */
  label: string;
}

/** Ordre stable des 8 réactions (barre de réactions). */
export const CREW_REACTIONS: readonly CrewReactionDef[] = [
  { key: 'raid', icon: 'reactRaid', label: 'Raid' },
  { key: 'defense', icon: 'reactDefense', label: 'Défense' },
  { key: 'clean', icon: 'reactClean', label: 'Clean' },
  { key: 'fast', icon: 'reactFast', label: 'Fast' },
  { key: 'rankup', icon: 'reactRankup', label: 'Rank up' },
  { key: 'hold', icon: 'reactHold', label: 'Hold' },
  { key: 'respect', icon: 'reactRespect', label: 'Respect' },
  { key: 'legend', icon: 'reactLegend', label: 'Legend' },
];

export const CREW_REACTION_BY_KEY: Record<CrewReactionKey, CrewReactionDef> = Object.fromEntries(
  CREW_REACTIONS.map((r) => [r.key, r]),
) as Record<CrewReactionKey, CrewReactionDef>;

// ─── Entrées de feed §28 ──────────────────────────────────────────────────────
export type FeedEventType = 'capture' | 'defense' | 'badge' | 'rankup' | 'chest';

export interface FeedEventDemo {
  id: string;
  type: FeedEventType;
  /** Acteur (handle en minuscules). */
  actor: string;
  /** Texte formulé POSITIF (anti-shame §11) — jamais « lent/dernier ». */
  text: string;
  /** Ancienneté relative affichable (« il y a 12 min »). */
  ago: string;
  /** Réactions déjà posées (compteur par clé) — démo. */
  reactions: Partial<Record<CrewReactionKey, number>>;
}

/** Icône d'entête d'une entrée de feed selon son type (set partagé). */
export const FEED_TYPE_ICON: Record<FeedEventType, IconName> = {
  capture: 'carte',
  defense: 'bouclier',
  badge: 'badge',
  rankup: 'reactRankup',
  chest: 'coffre',
};

/**
 * Fil d'activité crew démo — du plus récent au plus ancien. Aucune coordonnée
 * (zéro position live) : on parle de secteurs/quartiers agrégés, pas de points.
 */
export const CREW_FEED: readonly FeedEventDemo[] = [
  {
    id: 'f1',
    type: 'capture',
    actor: 'molokai',
    text: 'MOLOKAÏ a repris 14 hexes secteur Buttes-Chaumont',
    ago: 'il y a 8 min',
    reactions: { raid: 5, fast: 2, respect: 1 },
  },
  {
    id: 'f2',
    type: 'defense',
    actor: 'jog.parmentier',
    text: 'JOG.PARMENTIER a tenu la ligne canal 3 jours',
    ago: 'il y a 40 min',
    reactions: { defense: 7, hold: 4 },
  },
  {
    id: 'f3',
    type: 'badge',
    actor: 'lena_run',
    text: 'LENA_RUN a débloqué Clean Runner II — 30 jours fair-play',
    ago: 'il y a 2 h',
    reactions: { clean: 6, respect: 3 },
  },
  {
    id: 'f4',
    type: 'rankup',
    actor: 'koro',
    text: 'Le crew passe niveau 6 · cadre Race débloqué',
    ago: 'hier',
    reactions: { rankup: 9, legend: 2, respect: 4 },
  },
  {
    id: 'f5',
    type: 'chest',
    actor: 'pacer20e',
    text: 'Coffre hebdo au palier Silver — 66 % de l’objectif',
    ago: 'hier',
    reactions: { hold: 3, respect: 2 },
  },
];

// ─── Chat crew (MVP : liste + réactions, PAS de DM) ───────────────────────────
export interface CrewMessageDemo {
  id: string;
  author: string;
  text: string;
  ago: string;
  me?: boolean;
  reactions: Partial<Record<CrewReactionKey, number>>;
}

export const CREW_CHAT: readonly CrewMessageDemo[] = [
  { id: 'm1', author: 'LENA_RUN', text: 'Sortie défense canal demain 7h, qui est chaud ?', ago: '18:04', reactions: { defense: 3 } },
  { id: 'm2', author: 'MOLOKAÏ', text: 'Présent. On verrouille les Buttes après.', ago: '18:07', reactions: { raid: 2, hold: 1 } },
  { id: 'm3', author: 'KORO', text: 'Je prends l’aile est. Ramenez du monde, on tient la zone.', ago: '18:12', me: true, reactions: { respect: 4 } },
  { id: 'm4', author: 'PACER·20E', text: 'Coffre presque au palier Gold, encore 2 sorties.', ago: '18:20', reactions: { rankup: 2 } },
];
