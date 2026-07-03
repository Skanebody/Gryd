/**
 * GRYD — hexes factices Milestone 1 (DISCOVERY D16).
 * Générés à la volée avec h3-js autour de Paris — aucune dépendance réseau
 * pour valider le rendu 60 fps. Rendu égocentré AMENDEMENT-01 (addendum §D) :
 * la seule question visuelle est « à moi ou pas à moi » → 3 états.
 * Remplacé par la lecture temps réel de hex_claims (Supabase) au Milestone 2.
 */
import { cellToBoundary, gridDisk, gridRingUnsafe, latLngToCell } from 'h3-js';
import { CITIES, H3_RESOLUTION, foePatterns, type FoePattern } from '@klaim/shared';

export type HexState = 'mine' | 'foe' | 'neutral';

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
  };
}

export interface HexFeatureCollection {
  type: 'FeatureCollection';
  features: HexFeature[];
}

/** Rayon du disque de génération (~15 anneaux ≈ 721 hexes res 10 ≈ un quartier). */
const DISK_RADIUS = 15;
/** Mon cluster : contigu, ~30 hexes (gridDisk k=3 → 37). */
const MINE_RADIUS = 3;
/** Clusters adverses : 2 clusters de ~20 hexes (gridDisk k=2 → 19 chacun). */
const FOE_RADIUS = 2;
/** Anneau où placer les centres des crews adverses (assez loin pour ne pas chevaucher). */
const FOE_CENTER_RING = 8;

function toFeature(h3: string, state: HexState, pattern: FoePattern | null, crewLabel: string | null): HexFeature {
  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      // cellToBoundary(_, true) → boucle fermée au format GeoJSON [lng, lat].
      coordinates: [cellToBoundary(h3, true)],
    },
    properties: { h3, state, pattern, crewLabel },
  };
}

/**
 * Jeu de données factice : 1 cluster « mine » contigu autour du centre de Paris,
 * 2 clusters « foe » (motifs distincts), tout le reste du disque en « neutral ».
 */
export function fakeHexesGeoJSON(): HexFeatureCollection {
  const origin = latLngToCell(CITIES.paris.center.lat, CITIES.paris.center.lng, H3_RESOLUTION);

  const mine = new Set<string>(gridDisk(origin, MINE_RADIUS));

  // Deux centres adverses opposés sur l'anneau FOE_CENTER_RING
  // (pas de pentagone à res 10 sur Paris → gridRingUnsafe est sûr ici).
  const ring = gridRingUnsafe(origin, FOE_CENTER_RING);
  const foeCenterA = ring[0];
  const foeCenterB = ring[Math.floor(ring.length / 2)];

  const foeA = new Set<string>(foeCenterA ? gridDisk(foeCenterA, FOE_RADIUS) : []);
  const foeB = new Set<string>(foeCenterB ? gridDisk(foeCenterB, FOE_RADIUS) : []);

  const patternA: FoePattern = foePatterns[0]; // 'hatch45'
  const patternB: FoePattern = foePatterns[2]; // 'dots'

  const features: HexFeature[] = [];
  for (const h3 of gridDisk(origin, DISK_RADIUS)) {
    if (mine.has(h3)) {
      features.push(toFeature(h3, 'mine', null, null));
    } else if (foeA.has(h3)) {
      features.push(toFeature(h3, 'foe', patternA, 'CREW NORD·XI'));
    } else if (foeB.has(h3)) {
      features.push(toFeature(h3, 'foe', patternB, 'LES PAVÉS 12'));
    } else {
      features.push(toFeature(h3, 'neutral', null, null));
    }
  }
  return { type: 'FeatureCollection', features };
}

/** Compte des hexes « mine » du jeu factice (chip « hex tenus » de l'écran carte). */
export function countMine(collection: HexFeatureCollection): number {
  return collection.features.reduce((n, f) => (f.properties.state === 'mine' ? n + 1 : n), 0);
}
