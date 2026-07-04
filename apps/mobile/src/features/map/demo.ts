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
  POINTS_DEFENDED_HEX,
  POINTS_STOLEN_HEX,
  gameColors,
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
