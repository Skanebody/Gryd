/**
 * GRYD — cellules H3 factices Milestone 1 (DISCOVERY D16) : le MOTEUR INVISIBLE
 * de la Battle Map. AMENDEMENT-11 : ces cellules ne sont PLUS JAMAIS rendues
 * telles quelles — territory.ts les fusionne/lisse en TERRITOIRES ORGANIQUES
 * (le mot « hex » ne sort jamais de la couche technique). Enrichies Battle Map
 * (AMENDEMENT-08 §4, doc §7) à l'ÉCHELLE COUREUR : un coureur capture LE LONG
 * DES RUES, donc le territoire n'est plus des blobs ronds mais des COULOIRS
 * d'1-2 hexes de large qui serpentent le long des rues. AMENDEMENT-13 : la
 * scène est ANCRÉE SUR LE VRAI PARIS (./realAnchors) — l'ego démo est place
 * de la République et les couloirs suivent de VRAIS axes (avenue de la
 * République, quai de Valmy/canal Saint-Martin, boulevard Voltaire ; rival
 * qui descend de Belleville par le Faubourg-du-Temple). Généré à la volée
 * avec h3-js — aucune dépendance réseau, 100 % déterministe (waypoints réels
 * fixes, jamais de hasard). Le rendu égocentré AMENDEMENT-01 (« moi » au
 * centre) reste la base : le cluster maison entoure le centre. États de jeu :
 *   neutral   contour discret
 *   mine      chartreuse + glow (couloirs de mon crew)
 *   protected shield + halo (cluster maison, sous protection)
 *   decay     pointillé + sablier, en queue de couloir — `urgent` = muted red
 *   contested double contour + pulse, à l'intersection couloir quai ↔ rival
 *   foe       rival (orange sombre) — couloir qui descend de Belleville
 *   objective zone neutre ciblée par le crew (pin + halo, secteur Villemin)
 *   outpost   avant-poste, mini cluster isolé vers Bastille (marker)
 * + une « route ouverte » (polyline chartreuse le long du bd Richard-Lenoir,
 * entre 2 hexes tenus : le cluster maison et l'avant-poste).
 * Total tenu = 7 (maison) + 9 + 12 + 9 (couloirs) = 37 hexes — cohérent avec
 * « 37 hex tenus » des métriques HUD.
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
  H3_RESOLUTION,
  POINTS_DEFENDED_HEX,
  POINTS_NEUTRAL_HEX,
  POINTS_STOLEN_HEX,
  foePatterns,
  type FoePattern,
} from '@klaim/shared';
import {
  EGO_REPUBLIQUE,
  OBJECTIVE_VILLEMIN,
  REAL_CORRIDOR_HOSTS,
  ROUTE_OUVERTE_REELLE,
} from './realAnchors';

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
  /** Centre du cluster maison protégé (icône shield — le « moi » égocentré). */
  protectedCenter: LatLngPoint;
  /** Centre de la zone objectif crew (pin + halo). */
  objectiveCenter: LatLngPoint;
  /** Avant-poste isolé (marker). */
  outpost: LatLngPoint;
  /** Hexes en decay urgent (sablier). */
  urgentDecay: LatLngPoint[];
  /** Route ouverte : polyline le long d'une rue, entre 2 hexes tenus. */
  route: LatLngPoint[];
}

export interface BattleMapData {
  collection: HexFeatureCollection;
  points: BattleMapPoints;
}

/**
 * Rayon du disque de génération : à l'échelle coureur (~4,3 m/px, hex ≈ 30 px),
 * un viewport 375×812 px couvre ~1,6 × 3,5 km ; le coin d'écran est à
 * ~17 anneaux res 10 du centre → la grille REMPLIT tout l'écran.
 */
const DISK_RADIUS = 17;
/** Cluster « maison » autour de moi (égocentré AMENDEMENT-01) : k=1 → 7 hexes. */
const HOME_RADIUS = 1;
/** Longueurs des couloirs (hexes) — tenu total = 7 + 9 + 12 + 9 = 37. */
const CORRIDOR_EST_LEN = 9;
const CORRIDOR_QUAI_LEN = 12;
const CORRIDOR_SO_LEN = 9;
/** Élargissement d'un couloir : 1 hex de flanc tous les N hexes (1-2 de large). */
const CORRIDOR_EST_WIDEN_EVERY = 3;
const CORRIDOR_QUAI_WIDEN_EVERY = 4;
const CORRIDOR_SO_WIDEN_EVERY = 4;
/** Queue du couloir Est qui expire (pointillé), dont urgents (muted red). */
const DECAY_TAIL_COUNT = 3;
const DECAY_URGENT_COUNT = 2;
/** Hexes contestés à l'intersection couloir quai ↔ couloir rival (2-3). */
const CONTESTED_MAX = 3;
/** Le rival s'élargit à 2 hexes un hex sur deux (couloir massif qui avance). */
const RIVAL_WIDEN_EVERY = 2;
/** Avant-poste : mini cluster isolé au bout de la route ouverte. */
const OUTPOST_CLUSTER_SIZE = 3;
/** Zone objectif crew : disque k=1 → 7 hexes neutres. */
const OBJECTIVE_RADIUS = 1;

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

/** Cellules H3 traversées par une polyligne de rue (chemin continu, dédupliqué). */
function cellsAlong(line: readonly LatLngPoint[]): string[] {
  const out: string[] = [];
  let prev: string | null = null;
  for (const p of line) {
    const cell = latLngToCell(p.lat, p.lng, H3_RESOLUTION);
    if (prev === null) {
      out.push(cell);
    } else if (prev !== cell) {
      for (const step of gridPathCells(prev, cell)) {
        if (!out.includes(step)) out.push(step);
      }
    }
    prev = cell;
  }
  return out;
}

/**
 * Couloir de course le long d'une rue : le chemin de cellules de la rue,
 * élargi d'un hex de flanc tous les `widenEvery`, en excluant `taken`
 * (cellules déjà tenues) — tronqué à `len` cellules exactement.
 */
function corridorAlong(
  line: readonly LatLngPoint[],
  len: number,
  widenEvery: number,
  taken: ReadonlySet<string>,
): string[] {
  const path = cellsAlong(line).filter((c) => !taken.has(c));
  const out: string[] = [];
  for (let i = 0; i < path.length && out.length < len; i += 1) {
    const cell = path[i];
    if (cell === undefined) break;
    out.push(cell);
    if (i > 0 && i % widenEvery === 0 && out.length < len) {
      const flank = gridRingUnsafe(cell, 1).find(
        (c) => !taken.has(c) && !out.includes(c) && !path.includes(c),
      );
      if (flank) out.push(flank);
    }
  }
  return out;
}

/** Scène calculée une seule fois (déterministe) — h3-js n'est pas gratuit. */
let cachedData: BattleMapData | null = null;

/**
 * Jeu de données Battle Map « échelle coureur », ancré sur le VRAI Paris :
 * cluster maison protégé place de la République + 3 couloirs chartreuse le
 * long des vrais axes (avenue de la République / quai de Valmy / boulevard
 * Voltaire), queue du couloir Est en decay, couloir rival qui descend de
 * Belleville par le Faubourg-du-Temple, hexes contestés au croisement du
 * canal, zone objectif neutre au square Villemin, avant-poste isolé vers
 * Bastille et route ouverte le long du bd Richard-Lenoir.
 */
export function battleMapData(): BattleMapData {
  if (cachedData) return cachedData;

  // AMENDEMENT-13 : le « moi » démo est la VRAIE place de la République.
  const origin = latLngToCell(EGO_REPUBLIQUE.lat, EGO_REPUBLIQUE.lng, H3_RESOLUTION);

  // Cluster maison (protégé : shield + halo) autour du « moi » égocentré.
  const homeCells = gridDisk(origin, HOME_RADIUS);
  const protectedSet = new Set<string>(homeCells);
  const taken = new Set<string>(homeCells);

  // 3 couloirs de course de mon crew, le long des VRAIS axes (realAnchors) :
  // avenue de la République (est), quai de Valmy (canal) et bd Voltaire.
  const corridorEst = corridorAlong(
    REAL_CORRIDOR_HOSTS.est,
    CORRIDOR_EST_LEN,
    CORRIDOR_EST_WIDEN_EVERY,
    taken,
  );
  for (const c of corridorEst) taken.add(c);
  const corridorQuai = corridorAlong(
    REAL_CORRIDOR_HOSTS.quai,
    CORRIDOR_QUAI_LEN,
    CORRIDOR_QUAI_WIDEN_EVERY,
    taken,
  );
  for (const c of corridorQuai) taken.add(c);
  const corridorSudOuest = corridorAlong(
    REAL_CORRIDOR_HOSTS.sudOuest,
    CORRIDOR_SO_LEN,
    CORRIDOR_SO_WIDEN_EVERY,
    taken,
  );
  for (const c of corridorSudOuest) taken.add(c);

  const mineSet = new Set<string>([...corridorEst, ...corridorQuai, ...corridorSudOuest]);

  // Decay : la queue (bout éloigné) du couloir Est expire — dont 2 urgents.
  const decayCells = corridorEst.slice(-DECAY_TAIL_COUNT);
  const decaySet = new Set<string>(decayCells);
  const urgentCells = decayCells.slice(-DECAY_URGENT_COUNT);
  const urgentSet = new Set<string>(urgentCells);

  // Couloir rival : descend de Belleville par le Faubourg-du-Temple ; les
  // cellules au contact de mon couloir quai (croisement du canal) deviennent
  // CONTESTÉES (2-3, à l'intersection des deux couloirs).
  const quaiSet = new Set<string>(corridorQuai);
  const rivalPath = cellsAlong(REAL_CORRIDOR_HOSTS.rivalNordEst).filter((c) => !taken.has(c));
  const contestedSet = new Set<string>();
  const rivalCells: string[] = [];
  for (const cell of rivalPath) {
    const touchesQuai = corridorQuai.some((b) => gridDistance(cell, b) <= 1);
    if (touchesQuai && contestedSet.size < CONTESTED_MAX && !quaiSet.has(cell)) {
      contestedSet.add(cell);
    } else {
      rivalCells.push(cell);
    }
  }
  const foeSet = new Set<string>(rivalCells);
  rivalCells.forEach((cell, i) => {
    if (i % RIVAL_WIDEN_EVERY === 0) {
      const flank = gridRingUnsafe(cell, 1).find(
        (c) => !foeSet.has(c) && !taken.has(c) && !contestedSet.has(c),
      );
      if (flank) foeSet.add(flank);
    }
  });

  // Zone objectif crew : disque neutre ciblé — secteur du square Villemin.
  const objectiveCenter = latLngToCell(
    OBJECTIVE_VILLEMIN.lat,
    OBJECTIVE_VILLEMIN.lng,
    H3_RESOLUTION,
  );
  const objectiveSet = new Set<string>(gridDisk(objectiveCenter, OBJECTIVE_RADIUS));

  // Avant-poste : mini cluster isolé au bout de la route ouverte, vers
  // Bastille (bd Richard-Lenoir).
  const routeEnd = ROUTE_OUVERTE_REELLE[ROUTE_OUVERTE_REELLE.length - 1];
  const outpostCell = routeEnd
    ? latLngToCell(routeEnd.lat, routeEnd.lng, H3_RESOLUTION)
    : origin;
  const outpostSet = new Set<string>([
    outpostCell,
    ...gridRingUnsafe(outpostCell, 1).slice(0, OUTPOST_CLUSTER_SIZE - 1),
  ]);

  const rivalPattern: FoePattern = foePatterns[0]; // 'hatch45'

  const features: HexFeature[] = [];
  for (const h3 of gridDisk(origin, DISK_RADIUS)) {
    if (contestedSet.has(h3)) {
      features.push(toFeature(h3, 'contested', null, null));
    } else if (decaySet.has(h3)) {
      features.push(toFeature(h3, 'decay', null, null, urgentSet.has(h3)));
    } else if (protectedSet.has(h3)) {
      features.push(toFeature(h3, 'protected', null, null));
    } else if (mineSet.has(h3)) {
      features.push(toFeature(h3, 'mine', null, null));
    } else if (objectiveSet.has(h3)) {
      features.push(toFeature(h3, 'objective', null, null));
    } else if (outpostSet.has(h3)) {
      features.push(toFeature(h3, 'outpost', null, null));
    } else if (foeSet.has(h3)) {
      features.push(toFeature(h3, 'foe', rivalPattern, 'CREW NORD·XI'));
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
      urgentDecay: urgentCells.map(toLatLngPoint),
      route: ROUTE_OUVERTE_REELLE.map((p) => ({ lat: p.lat, lng: p.lng })),
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

/**
 * Conquête potentielle le long d'une polyline de PARCOURS (AMENDEMENT-09 §2 —
 * sheet ouverte « zones à conquérir ») : cellules H3 traversées par le tracé
 * qui ne sont PAS déjà tenues par mon crew. Points dérivés des règles §3
 * (neutre vs volé) — jamais de nombre magique. Déterministe (mêmes données
 * démo que la carte). L'avant-poste compte comme tenu (c'est le mien).
 */
export interface ParcoursConquest {
  /** Hexes gagnables sur le tracé (neutres + repris au rival). */
  hexes: number;
  /** Points possibles correspondants (règles §3). */
  points: number;
}

export function parcoursConquest(line: readonly LatLngPoint[]): ParcoursConquest {
  const { collection } = battleMapData();
  const stateByCell = new Map<string, HexState>(
    collection.features.map((f) => [f.properties.h3, f.properties.state]),
  );
  let neutral = 0;
  let stolen = 0;
  for (const cell of cellsAlong(line)) {
    // Hors du disque démo → neutre (la France entière est capturable).
    const state = stateByCell.get(cell) ?? 'neutral';
    if (state === 'neutral' || state === 'objective') neutral += 1;
    else if (state === 'foe' || state === 'contested') stolen += 1;
  }
  return {
    hexes: neutral + stolen,
    points: neutral * POINTS_NEUTRAL_HEX + stolen * POINTS_STOLEN_HEX,
  };
}

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
