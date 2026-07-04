/**
 * GRYD — données démo DÉTERMINISTES du Route Planner (AMENDEMENT-10 §2,
 * AMENDEMENT-11 §3/§6). 3 propositions de routes tracées LE LONG DES RUES de
 * la basemap (axes est / boulevard NS / quai du canal / rue NE — offsetMeters
 * depuis le centre égocentré, jamais de hasard) + options de génération +
 * bloc objectif défense + partage crew. La vraie génération d'itinéraires est
 * V1 : ici tout est scripté. Les POINTS possibles sont DÉRIVÉS des règles §3
 * (@klaim/shared — aucun nombre magique) ; distances/zones/rues sont des
 * étiquettes démo comme dans warroom/demo.ts. Les zones capturables AFFICHÉES
 * sur la carte sortent du moteur invisible (cellules H3 le long du tracé,
 * jamais rendues en grille : territory.ts les lisse en bande organique).
 */
import { gridPathCells, latLngToCell } from 'h3-js';
import {
  H3_RESOLUTION,
  POINTS_DEFENDED_HEX,
  POINTS_NEUTRAL_HEX,
} from '@klaim/shared';
import { offsetMeters } from '../map/basemap';
import { battleMapData, type HexState } from '../map/fakeHexes';
import {
  OBJECTIVE_BY_ROUTE_TYPE,
  ROUTE_OBJECTIVE_NOUNS,
  type PlannedRouteDemo,
  type RouteObjective,
  type RoutePriority,
  type RouteTypeKey,
} from './types';

/**
 * Allure démo pour l'ESTIMATION de durée des propositions (5'50 /km — cohérente
 * avec la course simulée). Étiquette UI, pas une règle de jeu (§3 borne
 * seulement les allures valides).
 */
export const ROUTE_PACE_S_PER_KM = 350;

/** Durée estimée affichée (min) d'une proposition. */
export function routeDurationMin(route: PlannedRouteDemo): number {
  return Math.round((route.distanceKm * ROUTE_PACE_S_PER_KM) / 60);
}

// ─── Les 3 propositions (AMENDEMENT-10 §2 — Route A / B / C) ────────────────
/**
 * Tracés en BOUCLE (départ = retour = « moi » égocentré, à côté du boulevard
 * NS). Chaque sommet suit un axe/rue de basemap.ts : axe Est (République→Est),
 * boulevard NS, quai du canal, rue NE (couloir rival), diagonale sud-ouest.
 * `loopZones` (AMENDEMENT-12 §C) = part de `zones` estimée en intérieur de
 * boucle (« +86 zones dont 52 en boucle » — la Route C reprend le 86/52 de
 * l'onboarding écran 2). Étiquettes démo, le remplissage réel est serveur.
 */
export const ROUTES_DEMO: readonly PlannedRouteDemo[] = [
  {
    id: 'route_a_rapide',
    letter: 'A',
    name: 'Rapide',
    typeKey: 'capture_rapide',
    zone: 'Bastille',
    distanceKm: 3.4,
    zones: 52,
    loopZones: 28,
    points: 52 * POINTS_NEUTRAL_HEX,
    shape: 'boucle',
    difficulty: 'Facile',
    // Axe Est vers l'est, redescente par la trame Bastille, retour diagonale.
    line: [
      offsetMeters(-100, 0),
      offsetMeters(0, 55),
      offsetMeters(250, 90),
      offsetMeters(520, 150),
      offsetMeters(490, -160),
      offsetMeters(250, -520),
      offsetMeters(40, -20),
      offsetMeters(-100, 0),
    ],
  },
  {
    id: 'route_b_optimisee',
    letter: 'B',
    name: 'Optimisée',
    typeKey: 'raid',
    zone: 'Canal',
    distanceKm: 5.1,
    zones: 94,
    loopZones: 57,
    points: 94 * POINTS_NEUTRAL_HEX,
    shape: 'boucle',
    difficulty: 'Exigeant',
    // Boulevard NS vers le nord, traversée en haut, descente rue NE (couloir
    // rival — le raid passe par la frontière contestée), retour par le quai.
    line: [
      offsetMeters(-100, 0),
      offsetMeters(-60, 600),
      offsetMeters(-75, 1_250),
      offsetMeters(60, 1_330),
      offsetMeters(330, 1_300),
      offsetMeters(520, 1_000),
      offsetMeters(400, 800),
      offsetMeters(340, 690),
      offsetMeters(270, 300),
      offsetMeters(250, 90),
      offsetMeters(0, 55),
      offsetMeters(-100, 0),
    ],
  },
  {
    id: 'route_c_defense',
    letter: 'C',
    name: 'Défense',
    typeKey: 'defense',
    zone: 'République',
    distanceKm: 4.8,
    zones: 86,
    loopZones: 52,
    points: 86 * POINTS_DEFENDED_HEX,
    shape: 'boucle',
    difficulty: 'Modéré',
    streetsToSave: 12,
    expiresInH: 48,
    // Boulevard NS vers République, square Villemin, redescente par la trame.
    line: [
      offsetMeters(-100, 0),
      offsetMeters(-60, 600),
      offsetMeters(-75, 1_250),
      offsetMeters(-350, 1_250),
      offsetMeters(-520, 870),
      offsetMeters(-460, 300),
      offsetMeters(-160, 200),
      offsetMeters(-100, 0),
    ],
  },
];

/** Route par défaut (recommandée) et routage des entrées War Room `?type=`. */
export const DEFAULT_ROUTE_ID = 'route_c_defense';

/**
 * Entrées externes (`/route-planner?type=raid|defense`, AMENDEMENT-10 §2) :
 * chaque type connu sélectionne la proposition démo correspondante.
 */
export function routeIdForType(type: string | undefined): string {
  switch (type) {
    case 'raid':
      return 'route_b_optimisee';
    case 'defense':
      return 'route_c_defense';
    case 'capture':
    case 'capture_rapide':
      return 'route_a_rapide';
    default:
      return DEFAULT_ROUTE_ID;
  }
}

/**
 * Onglet objectif (AMENDEMENT-12 §A) → proposition présélectionnée : Conquérir
 * ouvre la Route A (rapide), Défendre la Route C (défense République).
 */
export const ROUTE_ID_BY_OBJECTIVE: Record<RouteObjective, string> = {
  conquerir: 'route_a_rapide',
  defendre: 'route_c_defense',
};

/** La priorité (chips) sélectionne une proposition — et réciproquement. */
export const ROUTE_ID_BY_PRIORITY: Record<RoutePriority, string> = {
  capture: 'route_b_optimisee',
  defense: 'route_c_defense',
  performance: 'route_a_rapide',
  exploration: 'route_b_optimisee',
};

export const PRIORITY_BY_ROUTE_ID: Record<string, RoutePriority> = {
  route_a_rapide: 'performance',
  route_b_optimisee: 'capture',
  route_c_defense: 'defense',
};

/** Catalogue → proposition démo la plus proche (null = pas encore de démo). */
export const ROUTE_ID_BY_TYPE: Record<RouteTypeKey, string | null> = {
  capture_rapide: 'route_a_rapide',
  defense: 'route_c_defense',
  raid: 'route_b_optimisee',
  exploration: 'route_b_optimisee',
  boucle_facile: 'route_a_rapide',
  sortie_longue: 'route_b_optimisee',
  social_run: null,
  course_privee: null,
};

/** Types sans démo : message court (routes sociales/privées — V1, §6). */
export const ROUTE_TYPE_SOON_TOAST: Partial<Record<RouteTypeKey, string>> = {
  social_run: 'Social run — invite ton crew depuis le Crew HQ',
  course_privee: 'Course privée — stats uniquement, aucune capture',
};

// ─── Options de génération (chips — démo : la sélection est locale) ─────────

export const ROUTE_DISTANCE_OPTIONS = ['3 km', '5 km', '10 km', 'Libre'] as const;
export type RouteDistanceOption = (typeof ROUTE_DISTANCE_OPTIONS)[number];

/** Distance pré-cochée par proposition (cohérence chips ↔ route affichée). */
export function distanceOptionFor(route: PlannedRouteDemo): RouteDistanceOption {
  if (route.distanceKm <= 3.5) return '3 km';
  if (route.distanceKm <= 6) return '5 km';
  if (route.distanceKm <= 11) return '10 km';
  return 'Libre';
}

/** Contraintes toggles (sécurité / dénivelé — AMENDEMENT-10 §2). */
export interface RouteConstraintOption {
  key: string;
  label: string;
}

export const ROUTE_CONSTRAINTS: readonly RouteConstraintOption[] = [
  { key: 'eviter_grands_axes', label: 'Éviter grands axes' },
  { key: 'denivele_mini', label: 'Dénivelé mini' },
];

// ─── Bloc objectif (War Room ↔ Route Planner — vocabulaire zones/rues) ──────

/** Objectif courant du crew : la défense République (cohérent DEFENSE_SECTOR). */
export const ROUTE_OBJECTIVE = {
  title: 'Défendre République',
  streetsToSave: 12,
  expiresInH: 48,
  routeId: 'route_c_defense',
} as const;

// ─── Route = objet social (AMENDEMENT-11 §6 — MVP léger) ────────────────────

/**
 * Nom social complet d'une route — sur les 2 verbes (AMENDEMENT-12 §A) :
 * « Route conquête Canal » / « Route défense République ».
 */
export function routeSocialName(route: PlannedRouteDemo): string {
  const noun = ROUTE_OBJECTIVE_NOUNS[OBJECTIVE_BY_ROUTE_TYPE[route.typeKey]];
  return `Route ${noun} ${route.zone}`;
}

/** Entrée de feed crew après partage (démo : affichée localement + toast). */
export function routeShareFeedEntry(route: PlannedRouteDemo): string {
  return `${routeSocialName(route)} partagée au crew`;
}

// ─── Zones capturables le long du tracé (moteur H3 invisible) ───────────────

/** États déjà tenus par mon crew : rien à capturer/défendre en les traversant. */
const HELD_STATES: readonly HexState[] = ['mine', 'protected', 'outpost'];

const capturableCache = new Map<string, readonly string[]>();

/**
 * Cellules H3 traversées par le tracé qui ne sont PAS déjà tenues (neutres,
 * rivales, contestées, en decay à re-défendre) — la « bande » de zones
 * capturables du Route Planner. JAMAIS rendues en grille : l'écran les passe
 * à cellsToTerritory() qui les fusionne/lisse en zone organique lumineuse.
 * Déterministe (mêmes données démo que la Battle Map).
 */
export function capturableCellsFor(route: PlannedRouteDemo): readonly string[] {
  const cached = capturableCache.get(route.id);
  if (cached) return cached;

  const { collection } = battleMapData();
  const stateByCell = new Map<string, HexState>(
    collection.features.map((f) => [f.properties.h3, f.properties.state]),
  );

  const path: string[] = [];
  let prev: string | null = null;
  for (const p of route.line) {
    const cell = latLngToCell(p.lat, p.lng, H3_RESOLUTION);
    if (prev === null) {
      path.push(cell);
    } else if (prev !== cell) {
      for (const step of gridPathCells(prev, cell)) {
        if (!path.includes(step)) path.push(step);
      }
    }
    prev = cell;
  }

  const capturable = path.filter((cell) => {
    const state = stateByCell.get(cell);
    // Hors du disque démo → neutre (la France entière est capturable).
    return state === undefined || !HELD_STATES.includes(state);
  });
  capturableCache.set(route.id, capturable);
  return capturable;
}
