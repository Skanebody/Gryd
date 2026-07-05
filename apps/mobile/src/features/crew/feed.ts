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
import {
  BONUS_CREW_CHEST_MAX_RATIO,
  BONUS_CREW_CHEST_MIN_RATIO,
  BONUS_DEFENSE_DECAY_MAX_H,
  BONUS_DEFINITIONS,
  BONUS_PRIORITY,
  BONUS_RETURN_ABSENCE_MAX_DAYS,
  BONUS_RETURN_ABSENCE_MIN_DAYS,
  FINISHER_BONUS_MISSING_MAX_M,
  gameColors,
  type BonusDefinition,
  type BonusId,
  type GameColorName,
  type IconName,
} from '@klaim/shared';

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
  | 'contribution'
  // AMENDEMENT-17 §CH2 : cycle de la boucle crew collaborative. `boundaryOpen` =
  // un membre a ouvert une frontière (« Il manque 620 m pour capturer
  // République. ») → appel à finir la boucle ; `boundaryCompleted` = un membre
  // du crew a couru le segment manquant, la zone est prise (crew_feed_events
  // event_type 'boundary_completed', migration 0015). Jamais de polyline ni de
  // géométrie : la phrase suffit (§UX-17).
  | 'boundaryOpen'
  | 'boundaryCompleted';

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
  // AMENDEMENT-17 §CH2 : frontière ouverte = appel au crew (chartreuse, action
  // en attente) ; frontière fermée = zone capturée par le crew (raid crew).
  boundaryOpen: { icon: 'avantposte', tint: 'crew' },
  boundaryCompleted: { icon: 'raid', tint: 'crew' },
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

// ─── AMENDEMENT-18 A.2 : CHAT ACTIONNABLE ─────────────────────────────────────
// « Ton crew ne parle pas seulement. Il agit. » Le chat = centre d'ACTION, pas
// un WhatsApp. 3 sections : À FAIRE (cartes d'action), MESSAGES (fil humain),
// LOG (War Log compressé). Filtres : Tout/Demandes/Missions/Dons/Résultats.

/** Filtres en chips (A.2) — pilotent l'affichage des 3 sections. */
export type ChatFilter = 'tout' | 'demandes' | 'missions' | 'dons' | 'resultats';
export const CHAT_FILTERS: readonly { key: ChatFilter; label: string }[] = [
  { key: 'tout', label: 'Tout' },
  { key: 'demandes', label: 'Demandes' },
  { key: 'missions', label: 'Missions' },
  { key: 'dons', label: 'Dons' },
  { key: 'resultats', label: 'Résultats' },
];

/**
 * Type d'une carte d'action « À FAIRE » — pilote l'icône, la teinte et le CTA.
 * `finish` = terminer une frontière ouverte (boucle crew) ; `defense` = défense
 * urgente d'un secteur sous pression ; `outing` = sortie crew à rejoindre ;
 * `request` = demande d'un membre (route/scout/aide) façon donation Clash.
 */
export type ActionCardKind = 'finish' | 'defense' | 'outing' | 'request';

/**
 * Destination du CTA d'une carte d'action. `live` route vers /course-live avec
 * une intention (complete/defense) ; `planner` vers /route-planner ; `toast` =
 * feedback démo (RSVP sortie, demande relayée). Le client NE décide jamais d'un
 * claim — il ne fait que router vers l'écran de course (décision serveur §3).
 */
export type ActionCardCta = 'live' | 'planner' | 'toast';

export interface ActionCardDemo {
  id: string;
  kind: ActionCardKind;
  /** Filtres qui font apparaître cette carte (A.2 : Demandes/Missions…). */
  filters: readonly ChatFilter[];
  /** Titre court non tronqué (« Terminer une frontière »). */
  title: string;
  /** Zone concernée (« République ») — jamais de coordonnée. */
  zone: string;
  /** 1-2 infos compactes (« 620 m », « expire 23 h », « ouvert par KORO »). */
  infos: readonly string[];
  /** Libellé du CTA — COURT, jamais coupé (« TERMINER », « DÉFENDRE »…). */
  cta: string;
  ctaKind: ActionCardCta;
  /** Intention passée à /course-live quand ctaKind = 'live'. */
  intention?: 'complete' | 'defense';
  /** Id de frontière partielle (course-live) quand intention = 'complete'. */
  boundary?: string;
  /**
   * Nature du DON GRATUIT que produit l'aide sur cette carte (A.3 : « quelqu'un
   * aide »). Quand défini, agir sur le CTA enregistre un `SentDonation` (route/
   * scout/défense) → carte dans DONS + Merci. Absent = pas un don (frontière à
   * terminer, sortie, boost proposé). Miroir de `DonationKind` (requests.ts) —
   * inliné ici pour éviter un cycle d'import (requests.ts importe feed.ts). ZÉRO
   * territoire, ZÉRO point : le claim reste décidé serveur (§3).
   */
  donationKind?: 'route' | 'scout' | 'defense';
}

/**
 * Cartes d'action « À FAIRE » démo (A.2), tirées du contexte existant : la
 * frontière République ouverte par KORO (feed bopen_republique), la pression
 * Canal (offensive w2), la sortie défense Canal (message m1). Anti-scroll :
 * l'écran n'en montre que 2, le reste sous « Voir tout ».
 */
export const ACTION_CARDS_DEMO: readonly ActionCardDemo[] = [
  {
    id: 'act_finish_republique',
    kind: 'finish',
    filters: ['demandes', 'missions'],
    title: 'Terminer une frontière',
    zone: 'République',
    infos: ['620 m', 'expire 23 h', 'Ouvert par KORO'],
    cta: 'TERMINER',
    ctaKind: 'live',
    intention: 'complete',
    boundary: 'republique',
  },
  {
    id: 'act_defense_canal',
    kind: 'defense',
    filters: ['demandes', 'missions'],
    title: 'Défense urgente',
    zone: 'Canal',
    infos: ['48 h', '34 zones'],
    cta: 'DÉFENDRE',
    ctaKind: 'live',
    intention: 'defense',
  },
  {
    id: 'act_outing_republique',
    kind: 'outing',
    filters: ['missions'],
    title: 'Sortie crew',
    zone: 'République',
    infos: ['19:00', '4 participants'],
    cta: 'REJOINDRE',
    ctaKind: 'toast',
  },
  {
    id: 'act_request_route',
    kind: 'request',
    filters: ['demandes'],
    title: 'Route demandée',
    zone: 'Villette',
    infos: ['LENA_RUN', '4,2 km'],
    cta: 'DONNER UNE ROUTE',
    ctaKind: 'planner',
    // Aider = donner une route → enregistre un DON ROUTE (A.3) visible en DONS.
    donationKind: 'route',
  },
];

/**
 * Type d'un DON dans le fil (A.3/A.4). Chaque don porte des réactions « Merci /
 * Respect / Bien joué » (reactions.ts, persistées). `boost` = Crew Boost 24 h
 * offert (cohérent gifting AMENDEMENT-16) ; `chest` = coffre cosmétique offert ;
 * `route`/`segment`/`scout`/`defense` = dons GRATUITS (route donnée, boucle d'un
 * autre terminée, scout report partagé, défense prise). ZÉRO montant, ZÉRO
 * classement des payeurs.
 */
export type GiftKind = 'boost' | 'chest' | 'route' | 'segment' | 'scout' | 'defense';

/** Destination du CTA « Voir » d'un don (coffre, carte, arsenal). */
export type GiftCta = 'chest' | 'map' | 'arsenal';

export interface GiftCardDemo {
  id: string;
  kind: GiftKind;
  /** Kicker court en capitales (« BOOST OFFERT », « ROUTE DONNÉE »). */
  kicker: string;
  /** Nom du donateur, ou null si offrande ANONYME (don anonyme possible A.4). */
  by: string | null;
  /** Phrase du don (« a offert un Crew Boost 24 h »). */
  message: string;
  /** Effet en clair (« le coffre se remplit +25 % plus vite »). */
  effect: string;
  /** Libellé du CTA « Voir » — court (« Voir coffre »). */
  cta: string;
  ctaKind: GiftCta;
  minutesAgo: number;
  /** Compteurs de départ Merci/Respect/Bien joué (démo, fusionnés reactions.ts). */
  seed: { merci?: number; respect?: number; bienjoue?: number };
}

/**
 * Dons du fil démo (A.4). La carte BOOST OFFERT de Benjamin est l'exemple
 * canonique de l'amendement. Un don anonyme est aussi présent (coffre) pour
 * montrer « ce membre » sans nom. Rendus dans MESSAGES (secondaire) + filtre Dons.
 */
export const GIFT_CARDS_DEMO: readonly GiftCardDemo[] = [
  {
    id: 'gift_boost_benjamin',
    kind: 'boost',
    kicker: 'BOOST OFFERT',
    by: 'Benjamin',
    message: 'a offert un Crew Boost 24 h',
    effect: 'le coffre se remplit +25 % plus vite',
    cta: 'Voir coffre',
    ctaKind: 'chest',
    minutesAgo: 12,
    seed: { merci: 11, respect: 4 },
  },
  {
    id: 'gift_segment_lena',
    kind: 'segment',
    kicker: 'SEGMENT TERMINÉ',
    by: 'LENA_RUN',
    message: 'a terminé la boucle de KORO · République',
    effect: 'la zone est prise par le crew',
    cta: 'Voir la carte',
    ctaKind: 'map',
    minutesAgo: 20,
    seed: { merci: 6, respect: 5, bienjoue: 3 },
  },
  // Don GRATUIT — une route proposée à une requête route (A.3 : « Lena propose :
  // Canal · 3,4 km · 12 zones · [Utiliser] »). Zéro point, zéro territoire.
  {
    id: 'gift_route_lena',
    kind: 'route',
    kicker: 'ROUTE DONNÉE',
    by: 'LENA_RUN',
    message: 'propose une route · Canal',
    effect: '3,4 km · 12 zones · prête à courir',
    cta: 'Utiliser',
    ctaKind: 'map',
    minutesAgo: 32,
    seed: { merci: 4, respect: 2 },
  },
  // Don GRATUIT — un scout report partagé (A.3 : « Zone rivale faible · VOLT.19
  // inactif 3 j · [Voir cible] »). Activité agrégée, jamais de position live.
  {
    id: 'gift_scout_pacer',
    kind: 'scout',
    kicker: 'SCOUT REPORT',
    by: 'PACER·20E',
    message: 'a partagé un scout · Pantin',
    effect: 'zone rivale faible · VOLT.19 inactif 3 j',
    cta: 'Voir cible',
    ctaKind: 'map',
    minutesAgo: 44,
    seed: { merci: 5, respect: 3 },
  },
  {
    id: 'gift_chest_anon',
    kind: 'chest',
    kicker: 'COFFRE OFFERT',
    by: null,
    message: 'a offert un coffre cosmétique au crew',
    effect: 'skins à réclamer par tout le crew',
    cta: 'Voir l’Arsenal',
    ctaKind: 'arsenal',
    minutesAgo: 55,
    seed: { merci: 8, respect: 2 },
  },
];

/**
 * Timeline crew démo — du plus récent au plus ancien, tous les types §13
 * représentés + 3 messages actionnables §14. LIVE = < 10 min (WarEventCard).
 */
export const CHAT_TIMELINE: readonly ChatTimelineItem[] = [
  // AMENDEMENT-17 §CH2 — les 2 temps de la boucle crew collaborative.
  // 2/2 (le plus récent) : Lena a couru le segment manquant, la frontière est
  // refermée → zone crew. Copy UX : « … Republique est capturé par le crew. »
  // (jamais de %, jamais de géométrie ; contributions vivent dans le résultat run).
  {
    kind: 'event', id: 'bcomplete_republique', type: 'boundaryCompleted',
    message: 'Lena a terminé la boucle. République est capturé par le crew.',
    zone: 'République', points: 420, minutesAgo: 3,
    reactions: { raid: 6, respect: 4, legend: 1 },
  },
  {
    kind: 'event', id: 'w1', type: 'reprise',
    message: 'MOLOKAÏ a repris 14 zones', zone: 'Buttes-Chaumont', points: 176, minutesAgo: 8,
    reactions: { raid: 5, fast: 2, respect: 1 },
  },
  // 1/2 : KORO a ouvert la frontière (run fermable non fermé) → appel au crew.
  // Copy UX : « … Il manque 620 m pour capturer République. »
  {
    kind: 'event', id: 'bopen_republique', type: 'boundaryOpen',
    message: 'KORO a ouvert une frontière. Il manque 620 m pour capturer République.',
    zone: 'République', minutesAgo: 26,
    reactions: { defense: 2, hold: 1 },
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

// ─── AMENDEMENT-19 §4/§7 — CARTE BONUS dans le Crew Chat (bonus social actif) ──
// « GRYD ne te donne pas des bonus au hasard. Il révèle les bons moments pour
// agir. » Quand un bonus VISIBLE sur l'écran crew_chat est PERTINENT (sa fenêtre
// game-rules est ouverte), le chat montre UNE carte d'action bonus en tête de
// À FAIRE — cohérente avec les cartes d'action existantes (ActionCard), 1 seul
// bonus principal (doc §4). Le SERVEUR reste seul juge de la récompense : cette
// carte ne fait qu'INVITER (router vers la course / carte), jamais claim.
//
// ⚠ Miroir logique de engine/bonus.ts (selectBonus + isRelevant + bonusEffect
// Label) restreint à l'écran crew_chat : le tsconfig Expo ne résout pas les
// subpath imports Deno de @klaim/engine, donc on ré-implémente ICI la même
// sélection PURE à partir de la DATA (BONUS_DEFINITIONS) et des fenêtres game-
// rules — mêmes seuils, mêmes priorités. AUCUN nombre magique : tout vient de
// @klaim/shared. Toute évolution des règles se fait dans game-rules/bonuses.

/**
 * Contexte de pertinence du Crew Chat (sous-ensemble des signaux moteur utiles
 * aux bonus visibles sur crew_chat : finisher/défense/coffre/retour). Fourni par
 * l'écran (démo déterministe ; O1 : viendra des active_bonuses réels).
 */
export interface CrewChatBonusContext {
  /** Le joueur a un crew (sinon aucun bonus crew ne s'affiche). */
  hasCrew: boolean;
  /** Mètres manquants de la frontière crew ouverte la plus proche (Finisher). */
  nearestOpenBoundaryMissingM?: number;
  /** Zone concernée par le bonus (« République ») — jamais de coordonnée. */
  zone?: string;
  /** Heures avant decay de la zone crew la plus menacée (Défense Critique). */
  soonestZoneDecayH?: number;
  /** Progression du coffre crew hebdo, part 0-1 du prochain palier (Coffre Crew). */
  chestRatio?: number;
  /** Jours depuis la dernière course du joueur (Retour, anti-shame). */
  daysSinceLastRun?: number;
}

/** Priorité d'un bonus (BONUS_PRIORITY, 0 si non priorisé — ne devrait pas arriver). */
function bonusPriorityOf(id: BonusId): number {
  return (BONUS_PRIORITY as Record<string, number>)[id] ?? 0;
}

/**
 * Le bonus `id` est-il PERTINENT sur le Crew Chat dans ce contexte ? PURE.
 * Miroir de engine/isRelevant restreint aux fenêtres game-rules. Un bonus crew
 * exige un crew ; chaque bonus n'apparaît que si son signal est dans sa fenêtre.
 */
function crewChatBonusRelevant(id: BonusId, ctx: CrewChatBonusContext): boolean {
  switch (id) {
    case 'finisher': {
      if (!ctx.hasCrew) return false;
      const m = ctx.nearestOpenBoundaryMissingM;
      return m !== undefined && m > 0 && m <= FINISHER_BONUS_MISSING_MAX_M;
    }
    case 'defense_critical': {
      if (!ctx.hasCrew) return false;
      const h = ctx.soonestZoneDecayH;
      return h !== undefined && h >= 0 && h <= BONUS_DEFENSE_DECAY_MAX_H;
    }
    case 'crew_chest': {
      if (!ctx.hasCrew) return false;
      const r = ctx.chestRatio;
      return r !== undefined && r >= BONUS_CREW_CHEST_MIN_RATIO && r <= BONUS_CREW_CHEST_MAX_RATIO;
    }
    case 'return': {
      const d = ctx.daysSinceLastRun;
      return d !== undefined &&
        d >= BONUS_RETURN_ABSENCE_MIN_DAYS &&
        d <= BONUS_RETURN_ABSENCE_MAX_DAYS;
    }
    default:
      // exploration/clean_loop ne sont pas visibles sur crew_chat (def.visibility).
      return false;
  }
}

/**
 * LE bonus le plus pertinent pour le Crew Chat (doc §4 : un seul bonus principal
 * par écran). PURE. Miroir de engine/selectBonus(context, 'crew_chat') : filtre
 * par visibilité crew_chat (def.visibility) puis pertinence de contexte, choisit
 * la PRIORITÉ la plus forte (BONUS_PRIORITY), départage déterministe par id.
 * Renvoie null si rien n'est pertinent (le chat n'affiche alors aucune carte
 * bonus). Jamais de tirage aléatoire — « ciblé, pas random nu ».
 */
export function selectCrewChatBonus(ctx: CrewChatBonusContext): BonusDefinition | null {
  let best: BonusDefinition | null = null;
  let bestPriority = -1;
  const ids = Object.keys(BONUS_DEFINITIONS) as BonusId[];
  for (const id of ids) {
    const def = BONUS_DEFINITIONS[id];
    if (!def.visibility.includes('crew_chat')) continue;
    if (!crewChatBonusRelevant(id, ctx)) continue;
    const priority = bonusPriorityOf(id);
    if (
      best === null ||
      priority > bestPriority ||
      (priority === bestPriority && id < best.id)
    ) {
      best = def;
      bestPriority = priority;
    }
  }
  return best;
}

/**
 * Libellé COURT et NON TRONQUÉ de l'effet PROMIS d'un bonus (doc §4). PURE.
 * Miroir de engine/bonusEffectLabel : coffre > XP > protection > badge >
 * cosmétique. Jamais « points » ni « territoire ». Utilisé sous le titre de la
 * carte bonus du Crew Chat comme sur le post-run.
 */
export function bonusEffectLabel(bonus: BonusDefinition): string {
  const r = bonus.reward;
  const pct = (p: number) => `${Math.round(p * 100)} %`;
  if (r.chestPct !== undefined) return `+${pct(r.chestPct)} coffre crew`;
  if (r.xpPct !== undefined) return `+${pct(r.xpPct)} XP`;
  if (r.protectionH !== undefined) return `+${r.protectionH} h de protection`;
  if (r.badgeProgress !== undefined) return 'Progrès badge';
  if (r.cosmetic !== undefined) return 'Cosmétique débloqué';
  return bonus.name;
}

/**
 * Icône + teinte fonctionnelle d'une carte BONUS crew_chat, par famille de bonus
 * (état de jeu, pas déco §5) : social/finisher = chartreuse (action crew) ;
 * défense = violet contesté ; crew/coffre = or (récompense). Fallback chartreuse.
 */
export const BONUS_CARD_META: Record<BonusId, { icon: IconName; tint: string }> = {
  finisher: { icon: 'avantposte', tint: gameColors.crew },
  defense_critical: { icon: 'bouclier', tint: gameColors.contested },
  crew_chest: { icon: 'coffre', tint: gameColors.gold },
  return: { icon: 'cadeau', tint: gameColors.gold },
  exploration: { icon: 'route', tint: gameColors.crew },
  clean_loop: { icon: 'route', tint: gameColors.crew },
};

/**
 * Carte d'action BONUS affichée dans À FAIRE (Crew Chat) — cohérente avec
 * ActionCardDemo mais dérivée d'un bonus ciblé. `bonus` porte la fiche (nom,
 * cta, effet) ; `zone` + `detail` composent la ligne d'infos (« Il manque 620 m
 * pour capturer République »). ZÉRO territoire/point : le CTA ne fait qu'inviter.
 */
export interface BonusActionCard {
  id: string;
  bonus: BonusDefinition;
  /** Titre court en capitales (« BONUS FINISHER »). */
  title: string;
  /** Effet promis, libellé court non tronqué (« +25 % coffre crew »). */
  effect: string;
  /** Zone concernée (« République ») — jamais de coordonnée. */
  zone?: string;
  /** Détail contextuel court (« Il manque 620 m pour capturer »). */
  detail: string;
  /** Icône + teinte (BONUS_CARD_META). */
  icon: IconName;
  tint: string;
}

/** Détail contextuel court d'un bonus crew_chat (« Il manque 620 m … »). PURE. */
function crewChatBonusDetail(bonus: BonusDefinition, ctx: CrewChatBonusContext): string {
  const zone = ctx.zone;
  switch (bonus.id) {
    case 'finisher': {
      const m = ctx.nearestOpenBoundaryMissingM;
      return m !== undefined
        ? `Il manque ${m} m pour capturer ${zone ?? 'la zone'}`
        : bonus.copy.body;
    }
    case 'defense_critical': {
      const h = ctx.soonestZoneDecayH;
      return h !== undefined
        ? `${zone ?? 'Une zone'} s’efface dans ${h} h — défends-la`
        : bonus.copy.body;
    }
    case 'crew_chest': {
      const r = ctx.chestRatio;
      return r !== undefined
        ? `Coffre à ${Math.round(r * 100)} % — chaque sortie compte`
        : bonus.copy.body;
    }
    default:
      return bonus.copy.body;
  }
}

/**
 * Construit la carte BONUS d'À FAIRE à partir du contexte crew_chat — ou null
 * (aucun bonus pertinent). C'est le point d'entrée UNIQUE de l'écran : un seul
 * bonus principal, libellé court, cohérent avec les cartes d'action. PURE.
 */
export function buildCrewChatBonusCard(ctx: CrewChatBonusContext): BonusActionCard | null {
  const bonus = selectCrewChatBonus(ctx);
  if (!bonus) return null;
  const meta = BONUS_CARD_META[bonus.id];
  return {
    id: `bonus_${bonus.id}`,
    bonus,
    title: `BONUS ${bonus.name.replace(/^Bonus\s+/i, '').toUpperCase()}`,
    effect: bonusEffectLabel(bonus),
    zone: ctx.zone,
    detail: crewChatBonusDetail(bonus, ctx),
    icon: meta.icon,
    tint: meta.tint,
  };
}
