/** September 2026: physical trace faces. No H3 ownership, buffering or convex hull. */
import { TERRITORY_RULES_2026, type Activity } from '@klaim/shared/game-rules';
import type { RunPoint } from '@klaim/shared/types';
import { polygonAreaM2, normalizeRing, toGeoJsonPolygon, type GeoJsonPolygon } from './polygon.ts';
import { haversineM } from './validation.ts';

export interface PhysicalFace2026 {
  key: string;
  geometry: GeoJsonPolygon;
  closedAt: string;
  lengthM: number;
  areaM2: number;
  closureConnector?: { type: 'LineString'; coordinates: number[][] };
}
export interface TraceAnalysis2026 {
  segments: RunPoint[][];
  faces: PhysicalFace2026[];
  distanceM: number;
  movingIntervals: { start: string; end: string }[];
  durationS: number;
  qualityBreaks: number;
  rejectedSmallLoops: number;
}

const EPSILON = 1e-10; // Numeric tolerance in coordinates, not a game parameter.
function cross(ax: number, ay: number, bx: number, by: number): number {
  return ax * by - ay * bx;
}

/** Proper segment intersection, including a return to an older vertex. */
function crossing(a: RunPoint, b: RunPoint, c: RunPoint, d: RunPoint): RunPoint | null {
  const ux = b.lng - a.lng, uy = b.lat - a.lat;
  const vx = d.lng - c.lng, vy = d.lat - c.lat;
  const den = cross(ux, uy, vx, vy);
  if (Math.abs(den) < EPSILON * EPSILON) return null;
  const wx = c.lng - a.lng, wy = c.lat - a.lat;
  const t = cross(wx, wy, vx, vy) / den;
  const s = cross(wx, wy, ux, uy) / den;
  if (t < -EPSILON || t > 1 + EPSILON || s <= EPSILON || s > 1 + EPSILON) return null;
  return { lat: c.lat + s * vy, lng: c.lng + s * vx, t: c.t + s * (d.t - c.t), acc: Math.max(a.acc!, b.acc!, c.acc!, d.acc!) };
}

function validPoint(p: RunPoint): boolean {
  return Number.isFinite(p.lat) && Math.abs(p.lat) <= 90 &&
    Number.isFinite(p.lng) && Math.abs(p.lng) <= 180 && Number.isFinite(p.t) &&
    Number.isFinite(p.acc) && p.acc! >= 0 && p.acc! <= TERRITORY_RULES_2026.endpointMaxAccuracyM;
}

/** Missing accuracy or a discontinuity breaks the boundary; never reconnect across it. */
export function analyzeTrace2026(points: readonly RunPoint[], activity: Activity): TraceAnalysis2026 {
  const segments: RunPoint[][] = [];
  let segment: RunPoint[] = [];
  let qualityBreaks = 0;
  for (const point of points) {
    const last = segment.at(-1);
    if (!validPoint(point)) {
      if (segment.length) segments.push(segment);
      segment = [];
      qualityBreaks++;
      continue;
    }
    if (last && ((point as RunPoint & { breakBefore?: boolean }).breakBefore === true || point.t <= last.t || point.t - last.t > TERRITORY_RULES_2026.maxContinuousGapSeconds * 1000)) {
      segments.push(segment);
      segment = [];
      qualityBreaks++;
    }
    segment.push(point);
  }
  if (segment.length) segments.push(segment);

  const rules = TERRITORY_RULES_2026[activity];
  const faces: PhysicalFace2026[] = [];
  const movingIntervals: { start: string; end: string }[] = [];
  let rejectedSmallLoops = 0;
  let distanceM = 0;
  let durationS = 0;
  // Sporting motion accepts uncertainty above the capture threshold. A weak
  // boundary must not withhold a valid sporting day or erase its statistics.
  let movementAnchor = points[0];
  for (let i = 1; i < points.length; i++) {
      const before = points[i - 1]!;
      const current = points[i]!;
      const gap = current.t - before.t;
      if ((current as RunPoint & { breakBefore?: boolean }).breakBefore === true || gap <= 0 || gap > TERRITORY_RULES_2026.maxContinuousGapSeconds * 1000) { movementAnchor = current; continue; }
      distanceM += haversineM(before, current);
      durationS += (current.t - before.t) / 1000;
      if (movementAnchor && Number.isFinite(movementAnchor.acc) && Number.isFinite(current.acc) &&
          haversineM(movementAnchor, current) > Math.max(movementAnchor.acc!, current.acc!)) {
        if (current.t - movementAnchor.t <= TERRITORY_RULES_2026.maxContinuousGapSeconds * 1000) {
          movingIntervals.push({ start: new Date(movementAnchor.t).toISOString(), end: new Date(current.t).toISOString() });
        }
        movementAnchor = current;
      } else if (movementAnchor && current.t - movementAnchor.t > TERRITORY_RULES_2026.maxContinuousGapSeconds * 1000) movementAnchor = current;
  }
  for (const [segmentIndex, continuous] of segments.entries()) {
    // Loop erasure decomposes the walk as each face physically closes.
    let path: RunPoint[] = [];
    for (const p of continuous) {
      const last = path.at(-1);
      let closure: { index: number; point: RunPoint; exact: boolean } | null = null;
      if (last && path.length >= 3) {
        const crossings: { index: number; point: RunPoint; exact: boolean }[] = [];
        for (let i = 0; i < path.length - 2; i++) {
          const hit = crossing(path[i]!, path[i + 1]!, last, p);
          if (hit) crossings.push({ index: i, point: hit, exact: true });
        }
        closure = crossings.sort((a, b) => a.point.t - b.point.t || b.index - a.index)[0] ?? null;
        if (!closure) {
          for (let i = path.length - 3; i >= 0; i--) {
            if (haversineM(path[i]!, p) <= rules.closureMaxGapM) {
              const candidate = path.slice(i);
              const length = candidate.slice(1).reduce((n, q, j) => n + haversineM(candidate[j]!, q), 0) + haversineM(last, p);
              if (length >= rules.minLoopDistanceM) {
                closure = { index: i, point: p, exact: false };
                break;
              }
            }
          }
        }
      }
      if (closure) {
        const ring = closure.exact
          ? [closure.point, ...path.slice(closure.index + 1)]
          : [...path.slice(closure.index), p];
        const lengthM = ring.slice(1).reduce((n, q, j) => n + haversineM(ring[j]!, q), 0) + haversineM(ring.at(-1)!, ring[0]!);
        const geometryRing = normalizeRing(ring);
        const areaM2 = polygonAreaM2(geometryRing);
        if (lengthM >= rules.minLoopDistanceM && areaM2 >= rules.minAreaM2) {
          faces.push({ key: `${segmentIndex}:${faces.length}`, geometry: toGeoJsonPolygon(geometryRing), closedAt: new Date(closure.point.t).toISOString(), lengthM, areaM2,
            ...(!closure.exact ? { closureConnector: { type: 'LineString' as const, coordinates: [[p.lng,p.lat],[path[closure.index]!.lng,path[closure.index]!.lat]] } } : {}),
          });
        } else if (areaM2 > 0) rejectedSmallLoops++;
        path = [...path.slice(0, closure.index + 1), closure.point];
        if (closure.exact && haversineM(closure.point, p) > 0) path.push(p);
      } else path.push(p);
    }
  }
  return { segments, faces, distanceM, durationS, movingIntervals, qualityBreaks, rejectedSmallLoops };
}
