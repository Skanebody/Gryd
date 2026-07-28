/**
 * GRYD — présentation pure de la « première mission » (planche E02 / E14).
 * Distances et durées depuis `game-rules.ts` ; géométrie indicatif autour du fix GPS.
 */
import type { Activity } from './game-rules';
import {
  ACTIVITY_REFERENCE_LOOP_DURATION_MIN,
  ACTIVITY_REFERENCE_LOOP_PERIMETER_M,
} from './game-rules';

export interface GeoPoint {
  lat: number;
  lng: number;
}

const M_PER_DEG_LAT = 111_320;

function mPerDegLng(lat: number): number {
  return M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
}

export function referenceLoopPerimeterM(activity: Activity): number {
  return ACTIVITY_REFERENCE_LOOP_PERIMETER_M[activity];
}

export function referenceLoopDurationMin(activity: Activity): number {
  return ACTIVITY_REFERENCE_LOOP_DURATION_MIN[activity];
}

/** (x m est, y m nord) depuis un centre réel → lat/lng. */
export function offsetFromCenter(center: GeoPoint, xEast: number, yNorth: number): GeoPoint {
  return {
    lat: center.lat + yNorth / M_PER_DEG_LAT,
    lng: center.lng + xEast / mPerDegLng(center.lat),
  };
}

/**
 * Boucle carrée centrée sur `center`, périmètre `perimeterM`.
 * Anneau GeoJSON [lng, lat], fermé.
 */
export function referenceSquareLoopRing(center: GeoPoint, perimeterM: number): [number, number][] {
  const halfSide = perimeterM / 8;
  const nw = offsetFromCenter(center, -halfSide, halfSide);
  const ne = offsetFromCenter(center, halfSide, halfSide);
  const se = offsetFromCenter(center, halfSide, -halfSide);
  const sw = offsetFromCenter(center, -halfSide, -halfSide);
  return [
    [nw.lng, nw.lat],
    [ne.lng, ne.lat],
    [se.lng, se.lat],
    [sw.lng, sw.lat],
    [nw.lng, nw.lat],
  ];
}

/** Point au nord de la boucle pour le label de distance (planche « 900 M »). */
export function referenceLoopLabelPoint(center: GeoPoint, perimeterM: number): GeoPoint {
  const halfSide = perimeterM / 8;
  return offsetFromCenter(center, 0, halfSide + 24);
}
