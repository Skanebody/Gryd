/**
 * GRYD — engine/hexing.ts
 * Trace validée → cellules H3 res 10 (SPEC §3.1).
 *
 * Fonctions PURES (h3-js est un calcul déterministe, aucune I/O).
 *
 * APPROXIMATION DU BUFFER TRACE_BUFFER_M (15 m) :
 * Un vrai buffer serait le corridor de ±15 m autour de la polyline (polygonToCells
 * sur la polyline bufferisée). À res 10 (arête ~66 m), 15 m est petit devant la
 * taille d'un hex ; on approxime donc le corridor par :
 *   1. les cellules des points GPS mesurés ;
 *   2. les cellules de la ligne H3 entre points consécutifs (gridPathCells),
 *      qui couvrent l'interpolation entre mesures ;
 *   3. pour chaque point mesuré, 6 échantillons décalés de TRACE_BUFFER_M aux
 *      caps 0°, 60°, …, 300° : si le point est à < 15 m d'une frontière d'hex
 *      (bruit GPS sur une limite), l'hex voisin est inclus.
 * Le disque de tolérance n'est donc exact qu'autour des points mesurés, pas le
 * long des interpolations — acceptable au MVP : l'échantillonnage GPS en course
 * (~1 pt/s-5 s, soit tous les 3-15 m) est bien plus dense que la taille d'hex.
 */
import {
  cellToLatLng,
  getHexagonAreaAvg,
  gridPathCells,
  latLngToCell,
  polygonToCells,
  UNITS,
} from 'h3-js';
import {
  H3_RESOLUTION,
  LOOP_CLOSE_TOLERANCE_M,
  LOOP_MIN_PERIMETER_M,
  TRACE_BUFFER_M,
} from '@klaim/shared/game-rules';
import { haversineM, type Segment } from './validation.ts';

// Constantes physiques / géométriques — pas des règles de jeu.
const EARTH_RADIUS_M = 6_371_000;
const RAD_PER_DEG = Math.PI / 180;
const BUFFER_SAMPLE_BEARINGS = 6; // 6 caps à 60° — épouse la géométrie hexagonale

/** Point situé à `distM` mètres de `p` au cap `bearingRad` (sphère). */
function destination(
  p: { lat: number; lng: number },
  bearingRad: number,
  distM: number,
): { lat: number; lng: number } {
  const dR = distM / EARTH_RADIUS_M;
  const lat1 = (p.lat * Math.PI) / 180;
  const lng1 = (p.lng * Math.PI) / 180;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(dR) + Math.cos(lat1) * Math.sin(dR) * Math.cos(bearingRad),
  );
  const lng2 = lng1 + Math.atan2(
    Math.sin(bearingRad) * Math.sin(dR) * Math.cos(lat1),
    Math.cos(dR) - Math.sin(lat1) * Math.sin(lat2),
  );
  return { lat: (lat2 * 180) / Math.PI, lng: (lng2 * 180) / Math.PI };
}

/**
 * Cellules H3 res 10 traversées par les segments claimables, dédupliquées,
 * en représentation string H3 (la conversion BIGINT est un détail DB).
 * Retourne le COULOIR seul : les hexes traversés (+ tolérance GPS). Le
 * remplissage d'intérieur de boucle fermée (AMENDEMENT-12 §B, delta sur
 * AMENDEMENT-02 §2) est une étape SÉPARÉE : detectClosedLoop + enclosedCells.
 */
export function hexesForSegments(segments: Segment[]): string[] {
  const cells = new Set<string>();

  for (const seg of segments) {
    let prevCell: string | null = null;
    for (const p of seg) {
      const cell = latLngToCell(p.lat, p.lng, H3_RESOLUTION);
      cells.add(cell);

      // Approximation du buffer : 6 échantillons à TRACE_BUFFER_M autour du point.
      for (let k = 0; k < BUFFER_SAMPLE_BEARINGS; k++) {
        const bearing = (k * 2 * Math.PI) / BUFFER_SAMPLE_BEARINGS;
        const q = destination(p, bearing, TRACE_BUFFER_M);
        cells.add(latLngToCell(q.lat, q.lng, H3_RESOLUTION));
      }

      // Ligne H3 entre points consécutifs (couvre l'interpolation).
      if (prevCell !== null && prevCell !== cell) {
        try {
          for (const c of gridPathCells(prevCell, cell)) cells.add(c);
        } catch {
          // gridPathCells peut échouer près d'un pentagone / d'une distorsion
          // de grille : les deux extrémités sont déjà incluses, on continue.
        }
      }
      prevCell = cell;
    }
  }
  return [...cells];
}

// ─── AMENDEMENT-12 §B — « La boucle fait la zone » ───────────────────────────

/** Point minimal lat/lng (un RunPoint est structurellement compatible). */
export interface LatLngPoint {
  lat: number;
  lng: number;
}

/**
 * Aire (m²) du polygone formé par la trace refermée sur elle-même : shoelace
 * sur une projection équirectangulaire centrée (coordonnées relatives au 1er
 * point pour la stabilité numérique). Précision largement suffisante à
 * l'échelle d'une course ; ne sert qu'à écarter les polygones DÉGÉNÉRÉS
 * (aller-retour → aire ~0), jamais à compter des zones (ça, c'est h3).
 */
function traceAreaM2(points: readonly LatLngPoint[]): number {
  const first = points[0];
  if (first === undefined) return 0;
  let latSum = 0;
  for (const p of points) latSum += p.lat;
  const cosLat0 = Math.cos((latSum / points.length) * RAD_PER_DEG);
  const x = (p: LatLngPoint): number => (p.lng - first.lng) * RAD_PER_DEG * cosLat0 * EARTH_RADIUS_M;
  const y = (p: LatLngPoint): number => (p.lat - first.lat) * RAD_PER_DEG * EARTH_RADIUS_M;
  let doubled = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    doubled += x(a) * y(b) - x(b) * y(a);
  }
  return Math.abs(doubled) / 2;
}

/**
 * Trace candidate au polygone de boucle (AMENDEMENT-12 §B). PURE. La boucle
 * n'est détectable que sur une trace claimable CONTIGUË : exactement UN
 * segment claimable — aucun segment exclu du claim (§3.2 : allure hors
 * bornes, véhicule) ni coupure GPS entre le départ et la fermeture. Sinon,
 * aplatir les segments restants relierait leurs extrémités en ligne droite :
 * l'aire parcourue en segment exclu (voiture…) resterait ENFERMÉE dans le
 * polygone et serait capturée en intérieur, alors que le périmètre n'a pas
 * été couru en entier. Retourne le segment unique, ou null si la trace n'est
 * pas contiguë → couloir seul (« trait »), jamais d'intérieur.
 */
export function loopTracePoints<P extends LatLngPoint>(
  segments: readonly (readonly P[])[],
): readonly P[] | null {
  return segments.length === 1 ? segments[0]! : null;
}

/**
 * Boucle fermée (AMENDEMENT-12 §B) ? PURE. Trois conditions, dans l'ordre :
 *  1. la trace revient à ≤ LOOP_CLOSE_TOLERANCE_M (haversine) de son départ
 *     (MVP : fermeture par tolérance départ/arrivée uniquement, figure-8 = V1) ;
 *  2. distance totale de la trace ≥ LOOP_MIN_PERIMETER_M (anti micro-boucle) ;
 *  3. le polygone n'est pas dégénéré : son aire doit pouvoir contenir au moins
 *     UNE zone res 10 (aire moyenne getHexagonAreaAvg, dérivée de la grille h3 —
 *     pas une constante de jeu). Un aller-retour (aire ~0) n'est PAS une
 *     boucle : il reste pleinement récompensé en couloir (« trait »).
 */
export function detectClosedLoop(points: readonly LatLngPoint[]): boolean {
  if (points.length < 3) return false; // un polygone exige ≥ 3 sommets
  const first = points[0]!;
  const last = points[points.length - 1]!;
  if (haversineM(first, last) > LOOP_CLOSE_TOLERANCE_M) return false;
  let totalM = 0;
  for (let i = 1; i < points.length; i++) totalM += haversineM(points[i - 1]!, points[i]!);
  if (totalM < LOOP_MIN_PERIMETER_M) return false;
  return traceAreaM2(points) >= getHexagonAreaAvg(H3_RESOLUTION, UNITS.m2);
}

/**
 * Cellules INTÉRIEURES d'une boucle fermée (AMENDEMENT-12 §B) : polygonToCells
 * (h3, containment centre) sur le polygone de la trace en `res`, MOINS les
 * cellules du couloir déjà capturées (`corridorCells`) — aucun doublon. Les
 * cellules retournées sont triées par DISTANCE CROISSANTE au tracé : en cas de
 * dépassement du plafond quotidien couloir + intérieur, l'appelant tronque la
 * FIN de la liste (les plus proches du tracé sont servies d'abord).
 *
 * Trace bruitée : une légère auto-intersection est tolérée par h3 ; si
 * polygonToCells jette (polygone dégénéré, coordonnées invalides…), FALLBACK
 * couloir seul (retour []) — jamais de crash, la course reste récompensée en
 * « trait ». Chaque cellule retournée reste UNE CANDIDATE : c'est decideClaims
 * qui la passe par les règles (lock, bouclier, protection, vol, plafond).
 */
export function enclosedCells(
  points: readonly LatLngPoint[],
  corridorCells: readonly string[],
  res: number = H3_RESOLUTION,
): string[] {
  if (points.length < 3) return []; // pas de polygone → couloir seul
  let polygonCells: string[];
  try {
    polygonCells = polygonToCells(points.map((p) => [p.lat, p.lng]), res);
  } catch {
    return []; // polygone dégénéré → fallback couloir seul, jamais de crash
  }
  const corridor = new Set(corridorCells);
  const interior = polygonCells.filter((cell) => !corridor.has(cell));
  if (interior.length <= 1) return interior;

  // Tri par distance au tracé (centre de cellule → point de trace le plus
  // proche). O(intérieur × points), assumé MVP : l'auto-limite isopérimétrique
  // borne l'intérieur (~130 zones pour 5 km de boucle).
  const distanceToTrace = (cell: string): number => {
    const [lat, lng] = cellToLatLng(cell);
    let best = Infinity;
    for (const p of points) {
      const d = haversineM({ lat, lng }, p);
      if (d < best) best = d;
    }
    return best;
  };
  return interior
    .map((cell) => ({ cell, d: distanceToTrace(cell) }))
    .sort((a, b) => a.d - b.d)
    .map((entry) => entry.cell);
}

// ─── Géométrie GeoJSON (zones no-capture) ────────────────────────────────────

type Ring = number[][]; // anneaux GeoJSON : [lng, lat]
interface GeoPolygon {
  type: 'Polygon';
  coordinates: Ring[];
}
interface GeoMultiPolygon {
  type: 'MultiPolygon';
  coordinates: Ring[][];
}
export type GeoJsonPolygonal = GeoPolygon | GeoMultiPolygon;

/** Ray casting even-odd sur un anneau ([lng, lat], convention GeoJSON). */
function ringContains(ring: Ring, lat: number, lng: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    const intersects = (yi! > lat) !== (yj! > lat) &&
      lng < ((xj! - xi!) * (lat - yi!)) / (yj! - yi!) + xi!;
    if (intersects) inside = !inside;
  }
  return inside;
}

/**
 * Appartenance d'un point à un Polygon/MultiPolygon GeoJSON (pur).
 * Règle even-odd appliquée sur tous les anneaux : les trous sont gérés
 * naturellement (un point dans un trou croise 2 anneaux → dehors).
 */
export function pointInGeoJson(lat: number, lng: number, geo: GeoJsonPolygonal): boolean {
  if (geo.type === 'Polygon') {
    let crossings = 0;
    for (const ring of geo.coordinates) if (ringContains(ring, lat, lng)) crossings++;
    return crossings % 2 === 1;
  }
  for (const polygon of geo.coordinates) {
    let crossings = 0;
    for (const ring of polygon) if (ringContains(ring, lat, lng)) crossings++;
    if (crossings % 2 === 1) return true;
  }
  return false;
}
