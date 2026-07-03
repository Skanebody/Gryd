/**
 * GRYD — ingest_run/hexing.ts
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
import { gridPathCells, latLngToCell } from 'npm:h3-js@^4.1';
import { H3_RESOLUTION, TRACE_BUFFER_M } from '../_shared/game-rules.ts';
import type { Segment } from './validation.ts';

// Constantes physiques / géométriques — pas des règles de jeu.
const EARTH_RADIUS_M = 6_371_000;
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
 * Jamais de remplissage d'intérieur de boucle (AMENDEMENT-02 §2) : seuls les
 * hexes traversés (+ tolérance GPS) sont retournés.
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
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects = (yi > lat) !== (yj > lat) &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
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
