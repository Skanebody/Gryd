/**
 * GRYD — War Log + chat crew fusionnés (AMENDEMENT-08 §6, doc §13/§14) +
 * réactions GRYD custom (AMENDEMENT-07 §8). DATA d'affichage démo DÉTERMINISTE.
 * Le feed devient un WAR LOG : 10 types d'événements (reprise/défense/badge/
 * rank up/coffre/offensive/recrutement/niveau/route/avant-poste) rendus en
 * WarEventCard, entrelacés avec les messages de chat ACTIONNABLES (sortie
 * défense → RSVP ; ping zone → Ouvrir la carte). 8 réactions GRYD en ICÔNES
 * (pas d'emojis, décision fondateur) mappées sur le set @klaim/shared.
 * TODO(O1) brancher crew_feed_events (0011). Zéro position live : aucune
 * entrée ne porte de coordonnée — secteurs/quartiers agrégés uniquement.
 */
import { gameColors, type GameColorName, type IconName } from '@klaim/shared';

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

// ─── War Log §13 : 10 types d'événements ──────────────────────────────────────
export type WarLogType =
  | 'reprise'
  | 'defense'
  | 'badge'
  | 'rankup'
  | 'coffre'
  | 'offensive'
  | 'recrutement'
  | 'niveau'
  | 'route'
  | 'avantposte'
  // AMENDEMENT-16 §14 : contribution/gifting — message SOBRE, jamais de montant
  // ni de classement de payeurs. Offrande anonyme rendue « Un membre a offert… ».
  | 'contribution';

/**
 * Icône + teinte fonctionnelle par type d'événement. La couleur lit l'ÉTAT DE
 * JEU (§5) : chartreuse = action de MON crew ; or = victoire/récompense
 * (badge, rank up, coffre, niveau) ; violet = événement majeur (offensive).
 */
export const WAR_LOG_META: Record<WarLogType, { icon: IconName; tint: GameColorName }> = {
  reprise: { icon: 'raid', tint: 'crew' },
  defense: { icon: 'bouclier', tint: 'crew' },
  badge: { icon: 'badge', tint: 'gold' },
  rankup: { icon: 'medaille', tint: 'gold' },
  coffre: { icon: 'coffre', tint: 'gold' },
  offensive: { icon: 'guerre', tint: 'contested' },
  recrutement: { icon: 'ajoutami', tint: 'crew' },
  niveau: { icon: 'niveau', tint: 'gold' },
  route: { icon: 'route', tint: 'crew' },
  avantposte: { icon: 'avantposte', tint: 'crew' },
  // Cadeau = geste positif de contribution (or), pas une action de jeu.
  contribution: { icon: 'cadeau', tint: 'gold' },
};

/** Résout la teinte d'une entrée (surcharge éventuelle, ex. attaque rivale). */
export function warLogTint(entry: WarLogEntryDemo): string {
  return gameColors[entry.tint ?? WAR_LOG_META[entry.type].tint];
}

// ─── Timeline fusionnée War Log + chat (§13/§14) ──────────────────────────────

export interface WarLogEntryDemo {
  kind: 'event';
  id: string;
  type: WarLogType;
  /** Phrase courte (« MOLOKAÏ a repris 14 hexes »), POSITIVE (anti-shame §11). */
  message: string;
  /** Secteur/quartier agrégé — jamais de coordonnée (zéro position live). */
  zone?: string;
  points?: number;
  minutesAgo: number;
  /** Surcharge de teinte fonctionnelle (ex. 'rival' si événement subi). */
  tint?: GameColorName;
  /** Réactions déjà posées (compteur par clé) — démo. */
  reactions: Partial<Record<CrewReactionKey, number>>;
}

/** Action rapide d'un message : RSVP de sortie défense, ou ping zone → carte. */
export type ChatMessageAction = 'rsvp' | 'openMap';

export interface CrewMessageDemo {
  kind: 'message';
  id: string;
  author: string;
  text: string;
  minutesAgo: number;
  me?: boolean;
  action?: ChatMessageAction;
  reactions: Partial<Record<CrewReactionKey, number>>;
}

export type ChatTimelineItem = WarLogEntryDemo | CrewMessageDemo;

/** Options RSVP d'une sortie défense (§14) — ordre stable d'affichage. */
export const DEFENSE_RSVP_OPTIONS = ['Je participe', 'Peut-être', 'Indispo'] as const;
export type DefenseRsvp = (typeof DEFENSE_RSVP_OPTIONS)[number];

/**
 * Timeline crew démo — du plus récent au plus ancien, tous les types §13
 * représentés + 3 messages actionnables §14. LIVE = < 10 min (WarEventCard).
 */
export const CHAT_TIMELINE: readonly ChatTimelineItem[] = [
  {
    kind: 'event', id: 'w1', type: 'reprise',
    message: 'MOLOKAÏ a repris 14 zones', zone: 'Buttes-Chaumont', points: 176, minutesAgo: 8,
    reactions: { raid: 5, fast: 2, respect: 1 },
  },
  {
    kind: 'message', id: 'm1', author: 'LENA_RUN', minutesAgo: 22, action: 'rsvp',
    text: 'Sortie défense Canal demain 7 h, qui est chaud ?',
    reactions: { defense: 3 },
  },
  {
    kind: 'event', id: 'w2', type: 'offensive',
    message: 'Offensive prête · 5 runners engagés', zone: 'Canal Saint-Martin', minutesAgo: 35,
    reactions: { raid: 4, legend: 1 },
  },
  // Gifting SOBRE (§14) : nom quand non anonyme, jamais de montant.
  {
    kind: 'event', id: 'gift1', type: 'contribution',
    message: 'LENA_RUN a boosté le crew pendant 24 h', minutesAgo: 40,
    reactions: { respect: 3, hold: 1 },
  },
  {
    kind: 'message', id: 'm2', author: 'KORO', me: true, minutesAgo: 47,
    text: 'Je prends l’aile est. Ramenez du monde, on tient la zone.',
    reactions: { respect: 4 },
  },
  {
    kind: 'message', id: 'm3', author: 'PACER·20E', minutesAgo: 58, action: 'openMap',
    text: 'Zone faible repérée vers Pantin — quelqu’un dans le coin ce soir ?',
    reactions: { fast: 1 },
  },
  {
    kind: 'event', id: 'w3', type: 'defense',
    message: 'JOG.PARMENTIER a tenu la ligne canal 3 jours', zone: 'Canal', points: 120, minutesAgo: 95,
    reactions: { defense: 7, hold: 4 },
  },
  {
    kind: 'event', id: 'w4', type: 'badge',
    message: 'LENA_RUN a débloqué Clean Runner II', zone: '30 jours fair-play', minutesAgo: 130,
    reactions: { clean: 6, respect: 3 },
  },
  {
    kind: 'event', id: 'w5', type: 'route',
    message: 'KORO a ouvert une route · 4,2 km', zone: 'Villette → Pantin', minutesAgo: 190,
    reactions: { fast: 3 },
  },
  {
    kind: 'event', id: 'w6', type: 'avantposte',
    message: 'Avant-poste consolidé', zone: 'Parc de la Villette', minutesAgo: 310,
    reactions: { hold: 5, respect: 2 },
  },
  // Offrande ANONYME (§14) : « Un membre a offert… », aucun nom, aucun montant.
  {
    kind: 'event', id: 'gift2', type: 'contribution',
    message: 'Un membre a offert un coffre cosmétique au crew', minutesAgo: 360,
    reactions: { respect: 4 },
  },
  {
    kind: 'event', id: 'w7', type: 'coffre',
    message: 'Coffre hebdo au palier Silver — 66 %', minutesAgo: 480,
    reactions: { hold: 3, respect: 2 },
  },
  {
    kind: 'event', id: 'w8', type: 'rankup',
    message: 'Le crew passe #8 à Paris · +2 places', zone: 'Paris', minutesAgo: 1_450,
    reactions: { rankup: 9, legend: 2, respect: 4 },
  },
  {
    kind: 'event', id: 'w9', type: 'niveau',
    message: 'Le crew passe niveau 6 · Avant-poste I débloqué', minutesAgo: 1_530,
    reactions: { rankup: 4, respect: 4 },
  },
  {
    kind: 'event', id: 'w10', type: 'recrutement',
    message: 'TOUTDROIT a rejoint le crew', minutesAgo: 2_950,
    reactions: { respect: 6 },
  },
];
