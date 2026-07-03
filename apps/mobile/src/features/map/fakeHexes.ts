/**
 * GRYD — hexes factices Milestone 1 (DISCOVERY D16), enrichis Battle Map
 * (AMENDEMENT-08 §4, doc §7). Générés à la volée avec h3-js autour de Paris —
 * aucune dépendance réseau, 100 % déterministe (indices d'anneaux, jamais de
 * hasard). Le rendu égocentré AMENDEMENT-01 (« à moi ou pas à moi ») reste la
 * base, augmenté des ÉTATS DE JEU de la Battle Map :
 *   neutral   contour discret
 *   mine      chartreuse + glow (mon crew)
 *   protected shield + halo (sous protection)
 *   decay     pointillé + sablier — `urgent` = muted red
 *   contested double contour crew/rival + pulse
 *   foe       rival (orange sombre + motif de crew)
 *   objective zone neutre ciblée par le crew (pin + halo)
 *   outpost   avant-poste (marker)
 * + une « route ouverte » (polyline chartreuse) vers l'objectif.
 * Remplacé par la lecture temps réel de hex_claims (Supabase) au Milestone 2.
 */
import {
  cellToBoundary,
  cellToLatLng,
  gridDisk,
  gridDistance,
  gridPathCells,
  gridRingUnsafe,
  latLngToCell,
} from 'h3-js';
import {
  CITIES,
  H3_RESOLUTION,
  POINTS_DEFENDED_HEX,
  POINTS_NEUTRAL_HEX,
  POINTS_STOLEN_HEX,
  foePatterns,
  type FoePattern,
} from '@klaim/shared';

export type HexState =
  | 'neutral'
  | 'mine'
  | 'foe'
  | 'contested'
  | 'protected'
  | 'decay'
  | 'objective'
  | 'outpost';

/** GeoJSON minimal typé localement (pas de dépendance @types/geojson). */
export interface HexFeature {
  type: 'Feature';
  geometry: {
    type: 'Polygon';
    /** Anneaux de positions [lng, lat] — ordre MapLibre/GeoJSON, PAS lat/lng. */
    coordinates: number[][][];
  };
  properties: {
    h3: string;
    state: HexState;
    /** Motif de différenciation des crews adverses (addendum §D) — null hors foe. */
    pattern: FoePattern | null;
    /** Étiquette de crew factice (différenciation motif + label, jamais teinte). */
    crewLabel: string | null;
    /** Decay urgent (muted red) — false partout ailleurs. */
    urgent: boolean;
  };
}

export interface HexFeatureCollection {
  type: 'FeatureCollection';
  features: HexFeature[];
}

export interface LatLngPoint {
  lat: number;
  lng: number;
}

/** Points remarquables de la scène (markers/route des couches 3-4). */
export interface BattleMapPoints {
  /** Centre du cluster protégé (icône shield). */
  protectedCenter: LatLngPoint;
  /** Centre de la zone objectif crew (pin + halo). */
  objectiveCenter: LatLngPoint;
  /** Avant-poste isolé (marker). */
  outpost: LatLngPoint;
  /** Hexes en decay urgent (sablier). */
  urgentDecay: LatLngPoint[];
  /** Route ouverte : centres des cellules du chemin cluster → objectif. */
  route: LatLngPoint[];
}

export interface BattleMapData {
  collection: HexFeatureCollection;
  points: BattleMapPoints;
}

/** Rayon du disque de génération (~15 anneaux ≈ 721 hexes res 10 ≈ un quartier). */
const DISK_RADIUS = 15;
/** Mon cluster : contigu, ~30 hexes (gridDisk k=3 → 37). */
const MINE_RADIUS = 3;
/** Cœur protégé du cluster (shield + halo) : gridDisk k=1 → 7. */
const PROTECTED_RADIUS = 1;
/** Clusters adverses : 2 clusters de ~20 hexes (gridDisk k=2 → 19 chacun). */
const FOE_RADIUS = 2;
/** Anneau où placer les centres des crews adverses (assez loin pour ne pas chevaucher). */
const FOE_CENTER_RING = 8;
/** Hexes de MON cluster qui expirent (bord côté rival) — « Défendre 12 hexes ». */
const DECAY_COUNT = 12;
/** Dont urgents (muted red + sablier). */
const DECAY_URGENT_COUNT = 4;
/** Hexes contestés : juste hors de mon cluster, côté rival A. */
const CONTESTED_RING = MINE_RADIUS + 1;
const CONTESTED_COUNT = 5;
/** Zone objectif crew : disque k=1 (7 hexes neutres) sur cet anneau. */
const OBJECTIVE_RING = 6;
/** Position angulaire de l'objectif sur son anneau (fraction de l'anneau). */
const OBJECTIVE_RING_FRACTION = 0.72;
/** Avant-poste isolé. */
const OUTPOST_RING = 11;
const OUTPOST_RING_FRACTION = 0.3;

function toLatLngPoint(h3: string): LatLngPoint {
  const pair = cellToLatLng(h3);
  return { lat: pair[0] ?? 0, lng: pair[1] ?? 0 };
}

function toFeature(
  h3: string,
  state: HexState,
  pattern: FoePattern | null,
  crewLabel: string | null,
  urgent = false,
): HexFeature {
  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      // cellToBoundary(_, true) → boucle fermée au format GeoJSON [lng, lat].
      coordinates: [cellToBoundary(h3, true)],
    },
    properties: { h3, state, pattern, crewLabel, urgent },
  };
}

/** Tri déterministe : distance H3 croissante vers `target`, index en départage. */
function closestTo(target: string, cells: readonly string[]): string[] {
  return cells
    .slice()
    .sort((a, b) => gridDistance(a, target) - gridDistance(b, target) || (a < b ? -1 : 1));
}

/** Scène calculée une seule fois (déterministe) — h3-js n'est pas gratuit. */
let cachedData: BattleMapData | null = null;

/**
 * Jeu de données Battle Map : mon cluster (cœur protégé + bord en decay côté
 * rival), 2 crews adverses (motifs distincts), une bande contestée entre les
 * deux fronts, une zone objectif neutre, un avant-poste et une route ouverte.
 */
export function battleMapData(): BattleMapData {
  if (cachedData) return cachedData;

  const origin = latLngToCell(CITIES.paris.center.lat, CITIES.paris.center.lng, H3_RESOLUTION);

  const mine = new Set<string>(gridDisk(origin, MINE_RADIUS));
  const protectedSet = new Set<string>(gridDisk(origin, PROTECTED_RADIUS));

  // Deux centres adverses opposés sur l'anneau FOE_CENTER_RING
  // (pas de pentagone à res 10 sur Paris → gridRingUnsafe est sûr ici).
  const foeRing = gridRingUnsafe(origin, FOE_CENTER_RING);
  const foeCenterA = foeRing[0] ?? origin;
  const foeCenterB = foeRing[Math.floor(foeRing.length / 2)] ?? origin;
  const foeA = new Set<string>(gridDisk(foeCenterA, FOE_RADIUS));
  const foeB = new Set<string>(gridDisk(foeCenterB, FOE_RADIUS));

  // Decay : le bord de MON cluster le plus proche du rival A (12 hexes, 4 urgents).
  const mineEdge = gridRingUnsafe(origin, MINE_RADIUS);
  const decayCells = closestTo(foeCenterA, mineEdge).slice(0, DECAY_COUNT);
  const decaySet = new Set<string>(decayCells);
  const urgentSet = new Set<string>(decayCells.slice(0, DECAY_URGENT_COUNT));

  // Contesté : juste hors de mon cluster, entre moi et le rival A.
  const contestedSet = new Set<string>(
    closestTo(foeCenterA, gridRingUnsafe(origin, CONTESTED_RING)).slice(0, CONTESTED_COUNT),
  );

  // Objectif crew : petite zone neutre dans une direction sans rival.
  const objectiveRing = gridRingUnsafe(origin, OBJECTIVE_RING);
  const objectiveCenter =
    objectiveRing[Math.floor(objectiveRing.length * OBJECTIVE_RING_FRACTION)] ?? origin;
  const objectiveSet = new Set<string>(gridDisk(objectiveCenter, 1));

  // Avant-poste isolé, encore une autre direction.
  const outpostRing = gridRingUnsafe(origin, OUTPOST_RING);
  const outpostCell = outpostRing[Math.floor(outpostRing.length * OUTPOST_RING_FRACTION)] ?? origin;

  // Route ouverte : chemin H3 du cluster vers l'objectif (ligne chartreuse).
  const routeCells = gridPathCells(origin, objectiveCenter);

  const patternA: FoePattern = foePatterns[0]; // 'hatch45'
  const patternB: FoePattern = foePatterns[2]; // 'dots'

  const features: HexFeature[] = [];
  for (const h3 of gridDisk(origin, DISK_RADIUS)) {
    if (contestedSet.has(h3)) {
      features.push(toFeature(h3, 'contested', null, null));
    } else if (decaySet.has(h3)) {
      features.push(toFeature(h3, 'decay', null, null, urgentSet.has(h3)));
    } else if (protectedSet.has(h3)) {
      features.push(toFeature(h3, 'protected', null, null));
    } else if (mine.has(h3)) {
      features.push(toFeature(h3, 'mine', null, null));
    } else if (objectiveSet.has(h3)) {
      features.push(toFeature(h3, 'objective', null, null));
    } else if (h3 === outpostCell) {
      features.push(toFeature(h3, 'outpost', null, null));
    } else if (foeA.has(h3)) {
      features.push(toFeature(h3, 'foe', patternA, 'CREW NORD·XI'));
    } else if (foeB.has(h3)) {
      features.push(toFeature(h3, 'foe', patternB, 'LES PAVÉS 12'));
    } else {
      features.push(toFeature(h3, 'neutral', null, null));
    }
  }

  cachedData = {
    collection: { type: 'FeatureCollection', features },
    points: {
      protectedCenter: toLatLngPoint(origin),
      objectiveCenter: toLatLngPoint(objectiveCenter),
      outpost: toLatLngPoint(outpostCell),
      urgentDecay: decayCells.slice(0, DECAY_URGENT_COUNT).map(toLatLngPoint),
      route: routeCells.map(toLatLngPoint),
    },
  };
  return cachedData;
}

/** Compat Milestone 1 : la collection seule. */
export function fakeHexesGeoJSON(): HexFeatureCollection {
  return battleMapData().collection;
}

/** États qui comptent comme « tenus » par mon crew (mine + cœur protégé + decay). */
const HELD_STATES: readonly HexState[] = ['mine', 'protected', 'decay'];

/** Compte des hexes tenus (chip/bandeau de l'écran carte). */
export function countMine(collection: HexFeatureCollection): number {
  return collection.features.reduce(
    (n, f) => (HELD_STATES.includes(f.properties.state) ? n + 1 : n),
    0,
  );
}

/** Résumé de situation pour le HUD/bandeau + bouton contextuel (AMENDEMENT-08 §3/§4). */
export interface BattleMapSummary {
  /** Hexes tenus par mon crew (mine + protected + decay). */
  held: number;
  decay: number;
  decayUrgent: number;
  contested: number;
  objectiveHexes: number;
  /**
   * Points possibles de l'objectif courant, dérivés des règles §3 (jamais de
   * nombre magique) : défendre le decay + reprendre le contesté + capturer
   * la zone objectif neutre.
   */
  possiblePoints: number;
}

export function battleMapSummary(collection: HexFeatureCollection): BattleMapSummary {
  let decay = 0;
  let decayUrgent = 0;
  let contested = 0;
  let objectiveHexes = 0;
  let held = 0;
  for (const f of collection.features) {
    const { state, urgent } = f.properties;
    if (HELD_STATES.includes(state)) held += 1;
    if (state === 'decay') {
      decay += 1;
      if (urgent) decayUrgent += 1;
    } else if (state === 'contested') {
      contested += 1;
    } else if (state === 'objective') {
      objectiveHexes += 1;
    }
  }
  return {
    held,
    decay,
    decayUrgent,
    contested,
    objectiveHexes,
    possiblePoints:
      decay * POINTS_DEFENDED_HEX +
      contested * POINTS_STOLEN_HEX +
      objectiveHexes * POINTS_NEUTRAL_HEX,
  };
}
