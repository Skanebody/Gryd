/**
 * GRYD — données démo DÉTERMINISTES de la Battle Map (AMENDEMENT-08 §4,
 * AMENDEMENT-09 §2, doc §7). HUD (saison, zone, rang crew), mini war feed,
 * membres crew opt-in (AMENDEMENT-07 — JAMAIS de position publique), POI
 * running, défi + zone bonus, PARCOURS proposés, run d'ami à rejoindre.
 * Aucun réseau : TODO(O1) brancher seasons / crew_rankings / war log réels.
 * Les points dérivent des règles §3 (pas de nombre magique) ; les noms/zones
 * sont des étiquettes démo. AMENDEMENT-13 : les positions sont ancrées sur le
 * VRAI Paris (realAnchors — offsetFromEgo depuis la place de la République,
 * lieux réels : square Villemin, canal Saint-Martin, Bastille) — 100 %
 * déterministe, jamais de vraie géoloc.
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
  POINTS_DEFENDED_HEX,
  POINTS_STOLEN_HEX,
  gameColors,
  type BonusDefinition,
  type BonusId,
  type BonusVisibility,
  type IconName,
} from '@klaim/shared';
import type { GameVisualState, PoiKind } from '../../ui/game';
import { parcoursConquest, type ParcoursConquest } from './fakeHexes';
import {
  AVENUE_DE_LA_REPUBLIQUE,
  BD_RICHARD_LENOIR,
  BOULEVARD_VOLTAIRE,
  EGO_REPUBLIQUE,
  QUAI_VALMY,
  REAL_M_PER_DEG_LAT,
  REAL_M_PER_DEG_LNG,
  SQUARE_VILLEMIN,
  offsetFromEgo,
  type LatLngPoint,
} from './realAnchors';

/** Bandeau HUD haut : SAISON 0 · J-12 / Paris Est · Zone contestée / Crew #8. */
export const MAP_HUD: {
  seasonLabel: string;
  daysLeft: number;
  zoneName: string;
  zoneState: GameVisualState;
  crewRank: number;
} = {
  seasonLabel: 'Saison 0',
  daysLeft: 12,
  zoneName: 'Paris Est',
  zoneState: 'contested',
  crewRank: 8,
};

/**
 * Parts de CONTRÔLE du secteur (AMENDEMENT-11 §3 — les % remplacent les comptes
 * d'hex du HUD) : `PARIS EST · Zone contestée — Ton crew 42 % · Canal Crew 38 %
 * · Neutre 20 %`. Étiquettes démo comme le reste de MAP_HUD — TODO(O1) dérivées
 * des parts réelles de hex_claims par secteur au Milestone 2.
 */
export const MAP_CONTROL_HUD = {
  stateLabel: 'Zone contestée',
  crewPct: 42,
  rivalName: 'Canal Crew',
  rivalPct: 38,
  neutralPct: 20,
} as const;

/** Secteur défendu par l'objectif crew (vocabulaire zones/rues — étiquette démo). */
export const DEFENSE_SECTOR = 'République';

export interface MapWarFeedEventDemo {
  icon: IconName;
  message: string;
  zone?: string;
  points?: number;
  minutesAgo: number;
  /** Teinte fonctionnelle (gameColors.*) — lit l'état de jeu de l'event. */
  tint: string;
}

/** 3 events du mini war feed (doc §7 « Mini War Feed sur la carte »). */
export const MAP_WAR_FEED: readonly MapWarFeedEventDemo[] = [
  {
    icon: 'bouclier',
    message: 'LÉNA a défendu 8 zones',
    zone: 'République',
    points: 8 * POINTS_DEFENDED_HEX,
    minutesAgo: 4,
    tint: gameColors.crew,
  },
  {
    icon: 'raid',
    message: 'CANAL CREW a repris 14 zones',
    zone: 'Canal',
    points: 14 * POINTS_STOLEN_HEX,
    minutesAgo: 12,
    tint: gameColors.rival,
  },
  {
    icon: 'classement',
    message: 'NIGHT PACERS passe #8 en Paris League',
    minutesAgo: 26,
    tint: gameColors.contested,
  },
];

/** Cadence de défilement du feed (UI, pas une règle de jeu). */
export const WAR_FEED_CYCLE_MS = 5_000;

/**
 * ALERTE RIVAL ACTIONNABLE (AMENDEMENT-17 §1.2) : une attaque en cours,
 * lisible en 1 seconde + CTA [Défendre]. Remplace la lecture passive du war
 * feed quand une menace est fraîche : `CANAL CREW attaque République ·
 * 14 zones reprises · il y a 12 min`. Dérivée de l'event rival du feed —
 * étiquettes démo, TODO(O1) branchée sur le war log réel au Milestone 2.
 */
export interface MapRivalAlertDemo {
  rivalName: string;
  /** Secteur attaqué (vocabulaire zones/secteurs — AMENDEMENT-17 §1.4). */
  zone: string;
  /** Zones reprises par le rival (frontières perdues). */
  zonesLost: number;
  /** Fraîcheur de la menace (min) — sous LIVE_MAX_MINUTES = attaque LIVE. */
  minutesAgo: number;
}

export const MAP_RIVAL_ALERT: MapRivalAlertDemo = {
  rivalName: MAP_CONTROL_HUD.rivalName.toUpperCase(),
  zone: DEFENSE_SECTOR,
  zonesLost: 14,
  minutesAgo: 12,
};

// ─── Membres crew SUR la carte (AMENDEMENT-09 §2) ───────────────────────────
/**
 * INVARIANT AMENDEMENT-07 : jamais de position live publique. Ces 2 membres
 * sont les CONSENTANTS démo (opt-in `map_sharing`) — pseudos du crew démo
 * (crew/demo.ts). La distance affichée correspond à la position ancrée.
 */
export interface MateOnMapDemo {
  name: string;
  /** Écart avec moi (km) — cohérent avec `position`. */
  distanceKm: number;
  isLeader?: boolean;
  position: LatLngPoint;
}

export const MATES_OPT_IN: readonly MateOnMapDemo[] = [
  { name: 'LENA_RUN', distanceKm: 1.0, position: offsetFromEgo(560, 860) },
  { name: 'JOG.PARMENTIER', distanceKm: 0.6, position: offsetFromEgo(-460, -360) },
];

/** Légende sheet (semi) — rappel explicite du consentement. */
export const MATES_SHARING_LABEL = '2 membres partagent leur position (opt-in)';

// ─── POI running légers (≤ 4 visibles — anti-bruit) ────────────────────────
export interface PoiOnMapDemo {
  kind: PoiKind;
  label?: string;
  position: LatLngPoint;
}

export const POIS_ON_MAP: readonly PoiOnMapDemo[] = [
  // Le VRAI square Villemin (10e) — cohérent avec la zone objectif.
  { kind: 'parc', label: 'Villemin', position: SQUARE_VILLEMIN },
  { kind: 'fontaine', position: offsetFromEgo(210, -420) },
  // Berge du canal Saint-Martin, passerelle Alibert / Hôtel du Nord.
  { kind: 'spot', label: 'Spot canal', position: { lat: 48.8736, lng: 2.3668 } },
  { kind: 'depart', label: 'Départ conseillé', position: offsetFromEgo(-160, 200) },
];

// ─── Défi à proximité (1 marker MAX) + zone bonus (1 MAX — anti-bruit) ─────
/** Le défi pointe la mission quotidienne War Room (warroom/demo MISSIONS[0]). */
export const MAP_CHALLENGE = {
  missionKey: 'daily_capture_10',
  position: offsetFromEgo(520, 620),
  /** Distance démo depuis moi (cohérente avec la position ~0,8 km). */
  distanceLabel: 'à 800 m',
} as const;

export const MAP_BONUS_ZONE = {
  /** Nord du square Villemin, vers la gare de l'Est (lieu réel). */
  center: offsetFromEgo(-330, 1_050),
  radiusM: 170,
  label: 'Zone bonus',
  /** Fenêtre d'activation (étiquette démo, pas une règle). */
  window: 'ce soir · 19h–21h',
} as const;

// ─── PARCOURS proposés (sheet ouverte — 3 démo) ─────────────────────────────
export interface ParcoursDemo {
  id: string;
  name: string;
  /** Tracé le long des VRAIS axes (realAnchors — aperçu RouteProgress). */
  line: readonly LatLngPoint[];
  /** Dénivelé positif (étiquette démo — Paris Est est plat). */
  elevGainM: number;
  difficulty: 'Facile' | 'Modéré' | 'Exigeant';
}

export const PARCOURS_DEMO: readonly ParcoursDemo[] = [
  {
    id: 'boucle_canal',
    name: 'Boucle du Canal',
    elevGainM: 24,
    difficulty: 'Modéré',
    // République → quai de Valmy (rive ouest) jusqu'à l'écluse des Récollets,
    // traversée, retour par le quai de Jemmapes (rive est).
    line: [
      EGO_REPUBLIQUE,
      ...QUAI_VALMY.slice(0, 6),
      { lat: 48.8764, lng: 2.3672 }, // traversée (passerelle des Récollets)
      { lat: 48.8748, lng: 2.3668 }, // quai de Jemmapes — Hôpital Saint-Louis
      { lat: 48.8724, lng: 2.3671 },
      { lat: 48.8702, lng: 2.3672 },
      { lat: 48.8687, lng: 2.3672 },
      EGO_REPUBLIQUE,
    ],
  },
  {
    id: 'diagonale_bastille',
    name: 'Diagonale Bastille',
    elevGainM: 12,
    difficulty: 'Facile',
    // République → Bastille par le bd Richard-Lenoir (canal couvert),
    // retour par le bd Beaumarchais / Filles-du-Calvaire / bd du Temple.
    line: [
      EGO_REPUBLIQUE,
      ...BD_RICHARD_LENOIR,
      { lat: 48.8557, lng: 2.3679 }, // bd Beaumarchais
      { lat: 48.8592, lng: 2.3665 },
      { lat: 48.8621, lng: 2.3655 }, // Saint-Sébastien–Froissart
      { lat: 48.865, lng: 2.3644 }, // bd du Temple
      EGO_REPUBLIQUE,
    ],
  },
  {
    id: 'traversee_est',
    name: 'Traversée Est',
    elevGainM: 46,
    difficulty: 'Exigeant',
    // République → Père-Lachaise par l'avenue de la République, bascule vers
    // la place Léon-Blum, retour par le boulevard Voltaire.
    line: [
      EGO_REPUBLIQUE,
      ...AVENUE_DE_LA_REPUBLIQUE,
      { lat: 48.8605, lng: 2.3838 }, // descente vers Voltaire (rue de la Roquette)
      ...[...BOULEVARD_VOLTAIRE].reverse(),
      EGO_REPUBLIQUE,
    ],
  },
];

/** Métriques dérivées d'un parcours : distance (géométrie) + conquête (§3). */
export interface ParcoursMeta extends ParcoursConquest {
  distanceKm: number;
}

const parcoursMetaCache = new Map<string, ParcoursMeta>();

export function parcoursMeta(parcours: ParcoursDemo): ParcoursMeta {
  const cached = parcoursMetaCache.get(parcours.id);
  if (cached) return cached;
  let meters = 0;
  for (let i = 1; i < parcours.line.length; i += 1) {
    const a = parcours.line[i - 1];
    const b = parcours.line[i];
    if (!a || !b) continue;
    meters += Math.hypot(
      (b.lng - a.lng) * REAL_M_PER_DEG_LNG,
      (b.lat - a.lat) * REAL_M_PER_DEG_LAT,
    );
  }
  const meta: ParcoursMeta = {
    distanceKm: Math.round(meters / 100) / 10,
    ...parcoursConquest(parcours.line),
  };
  parcoursMetaCache.set(parcours.id, meta);
  return meta;
}

// ─── Run d'ami à rejoindre (1 démo — sheet ouverte) ─────────────────────────
export const FRIEND_RUN_DEMO = {
  name: 'MOLOKAÏ',
  modeLabel: 'Social Run',
  startLabel: '18h30',
  zone: 'Canal',
  distanceKm: 6,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// BONUS CIBLÉS (AMENDEMENT-19 §4) — « GRYD ne te donne pas des bonus au hasard.
// Il révèle les bons moments pour agir. » 1 SEUL bonus par écran (Carte / War
// Room). Le moteur PUR de sélection vit dans packages/engine/src/bonus.ts (testé
// Deno) ; le tsconfig Expo ne résout pas @klaim/engine (subpath exports + Deno
// `.ts`) — comme features/crew/rules.ts, on RÉ-IMPLÉMENTE ici le MÊME lookup pur
// (isRelevant → priorité BONUS_PRIORITY → départage par id) en lisant les MÊMES
// fenêtres/priorités depuis @klaim/shared. AUCUN nombre magique ; miroir strict
// d'engine/bonus.ts.selectBonus (limité au besoin d'AFFICHAGE — pertinence +
// priorité par écran, pas d'éligibilité anti-abus, tranchée serveur).
// ═══════════════════════════════════════════════════════════════════════════

/** Signaux JOUEUR de pertinence (miroir de BonusPlayerContext, engine/bonus.ts). */
export interface BonusPlayerContextDemo {
  daysSinceLastRun?: number;
  hasUnexploredSectorNear?: boolean;
  cleanLoopClosed?: boolean;
}

/** Signaux CREW de pertinence (miroir de BonusCrewContext, engine/bonus.ts). */
export interface BonusCrewContextDemo {
  hasCrew: boolean;
  nearestOpenBoundaryMissingM?: number;
  soonestZoneDecayH?: number;
  chestRatio?: number;
}

/** Contexte complet de sélection (miroir de BonusSelectionContext). */
export interface BonusSelectionContextDemo {
  player: BonusPlayerContextDemo;
  crew: BonusCrewContextDemo;
}

/** Un bonus pertinent + affichable sur un écran, avec sa priorité (miroir SelectedBonus). */
export interface SelectedBonusDemo {
  def: BonusDefinition;
  priority: number;
}

/** Priorité d'un bonus (BONUS_PRIORITY, 0 si non priorisé). */
function bonusPriorityOf(id: BonusId): number {
  return (BONUS_PRIORITY as Record<string, number>)[id] ?? 0;
}

/**
 * Le bonus `id` est-il PERTINENT (« bon moment pour agir ») dans ce contexte ?
 * Miroir strict de engine/bonus.ts.isRelevant — mêmes fenêtres game-rules, même
 * garde « pas de bonus crew sans crew ». Jamais random nu.
 */
export function isBonusRelevant(id: BonusId, ctx: BonusSelectionContextDemo): boolean {
  const { player, crew } = ctx;
  switch (id) {
    case 'finisher': {
      if (!crew.hasCrew) return false;
      const m = crew.nearestOpenBoundaryMissingM;
      return m !== undefined && m > 0 && m <= FINISHER_BONUS_MISSING_MAX_M;
    }
    case 'defense_critical': {
      if (!crew.hasCrew) return false;
      const h = crew.soonestZoneDecayH;
      return h !== undefined && h >= 0 && h <= BONUS_DEFENSE_DECAY_MAX_H;
    }
    case 'crew_chest': {
      if (!crew.hasCrew) return false;
      const r = crew.chestRatio;
      return r !== undefined && r >= BONUS_CREW_CHEST_MIN_RATIO && r <= BONUS_CREW_CHEST_MAX_RATIO;
    }
    case 'return': {
      const d = player.daysSinceLastRun;
      return (
        d !== undefined &&
        d >= BONUS_RETURN_ABSENCE_MIN_DAYS &&
        d <= BONUS_RETURN_ABSENCE_MAX_DAYS
      );
    }
    case 'exploration':
      return player.hasUnexploredSectorNear === true;
    case 'clean_loop':
      return player.cleanLoopClosed === true;
    default:
      return false;
  }
}

/**
 * LE bonus le plus pertinent pour `screen` (doc §4, un seul par écran). Miroir de
 * engine/bonus.ts.selectBonus : filtre par visibilité d'écran (def.visibility),
 * puis pertinence de contexte, puis choisit la PRIORITÉ la plus forte (défense >
 * finisher > coffre > retour > exploration > boucle), départage déterministe par
 * id. Renvoie null si rien n'est pertinent → l'écran n'affiche RIEN (pas de
 * placeholder). L'ÉLIGIBILITÉ à la récompense reste tranchée serveur.
 */
export function selectMapBonus(
  ctx: BonusSelectionContextDemo,
  screen: BonusVisibility,
): SelectedBonusDemo | null {
  let best: SelectedBonusDemo | null = null;
  const ids = Object.keys(BONUS_DEFINITIONS) as BonusId[];
  for (const id of ids) {
    const def = BONUS_DEFINITIONS[id];
    if (!def.visibility.includes(screen)) continue;
    if (!isBonusRelevant(id, ctx)) continue;
    const priority = bonusPriorityOf(id);
    if (
      best === null ||
      priority > best.priority ||
      (priority === best.priority && id < best.def.id)
    ) {
      best = { def, priority };
    }
  }
  return best;
}

/**
 * Heures de decay de la zone crew menacée (miroir de warroom/demo DEFENSE_MISSION
 * — 8 h, sous BONUS_DEFENSE_DECAY_MAX_H). Déclaré ici pour garder demo.ts
 * autonome (pas d'import croisé warroom→map). Étiquette démo.
 */
const DEFENSE_MISSION_DECAY_H = 8;

/**
 * CONTEXTE DÉMO déterministe (aucune géoloc, aucun réseau). Cohérent avec le
 * reste de la démo : le crew a une frontière ouverte proche (République, 620 m —
 * sous FINISHER_BONUS_MISSING_MAX_M) ET une zone qui décline (< 12 h). Sur la
 * Carte, la priorité (défense 70 > finisher 60) fait ressortir le bon bonus ;
 * en War Room, le même contexte révèle le bonus CREW. TODO(O1) : dérivé du
 * contexte réel (partial_boundaries / defense_missions / crew_chests) au M2.
 */
export const MAP_BONUS_CONTEXT: BonusSelectionContextDemo = {
  player: {
    // Joueur actif dans la démo (aucun retour/exploration/boucle en attente) —
    // les bonus perso ne « polluent » pas la Carte : le bonus crew prime.
    daysSinceLastRun: 1,
  },
  crew: {
    hasCrew: true,
    // Frontière crew ouverte à fermer, court segment (Finisher pertinent).
    nearestOpenBoundaryMissingM: 620,
    // Zone crew en decay imminent (Défense Critique pertinente, priorité max).
    soonestZoneDecayH: DEFENSE_MISSION_DECAY_H,
    // Coffre dans la dernière ligne droite (Coffre Crew pertinent en War Room).
    chestRatio: 0.88,
  },
};

/**
 * Distance affichée du bonus Carte le plus proche (« BONUS ACTIF · Terminer
 * République · 620 m »). Étiquette démo cohérente avec la frontière ouverte
 * (nearestOpenBoundaryMissingM) et la zone défendue. Sur la Carte, le libellé
 * combine le CTA de la fiche + la zone + cette distance.
 */
export const MAP_BONUS_NEAR = {
  /** Zone concernée par le bonus Carte (vocabulaire zones/frontières). */
  zone: DEFENSE_SECTOR,
  /** Distance jusqu'au point d'action (m). */
  distanceM: MAP_BONUS_CONTEXT.crew.nearestOpenBoundaryMissingM ?? 0,
} as const;

/**
 * Libellé COURT et NON TRONQUÉ de l'effet d'un bonus (miroir de engine/bonus.ts.
 * bonusEffectLabel) : coffre > XP > protection > progrès badge > cosmétique.
 * Utilise le POURCENTAGE de la fiche (la promesse affichée « +25 % coffre
 * crew »), jamais « points » ni « territoire ». Sert la card War Room et la
 * bande Carte.
 */
export function bonusEffectLabelDemo(def: BonusDefinition): string {
  const r = def.reward;
  const pct = (p: number) => `${Math.round(p * 100)} %`;
  if (r.chestPct !== undefined) return `+${pct(r.chestPct)} coffre crew`;
  if (r.xpPct !== undefined) return `+${pct(r.xpPct)} XP`;
  if (r.protectionH !== undefined) return `+${r.protectionH} h de protection`;
  if (r.badgeProgress !== undefined) return 'Progrès badge';
  if (r.cosmetic !== undefined) return 'Cosmétique débloqué';
  return def.name;
}

/** Icône d'affichage d'un bonus par famille (design tokens ; jamais de couleur hors charte). */
export const BONUS_ICON: Record<BonusId, IconName> = {
  finisher: 'avantposte',
  defense_critical: 'bouclier',
  crew_chest: 'coffre',
  return: 'serie',
  exploration: 'scout',
  clean_loop: 'cible',
};
