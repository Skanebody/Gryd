/**
 * GRYD — « La boucle fait la zone » côté DÉMO Live Run (AMENDEMENT-12 §B/§C).
 * Rejoue les MÊMES gardes que le moteur serveur (packages/engine/src/hexing.ts :
 * detectClosedLoop + enclosedCells) sur la trace démo, pour que l'UI raconte
 * exactement ce qu'ingest_run décidera : fermeture par tolérance départ/arrivée
 * (LOOP_CLOSE_TOLERANCE_M), périmètre minimal (LOOP_MIN_PERIMETER_M), aire non
 * dégénérée (≥ 1 zone res 10 — dérivée de la grille h3, pas un nombre magique),
 * intérieur = polygonToCells MOINS le couloir, trié par distance croissante au
 * tracé. Comme crew/rules.ts et motivation/rules.ts, on MIROIRE le moteur au
 * lieu d'importer @klaim/engine (imports Deno `.ts` non résolus par Metro) —
 * toute divergence de règle serait un bug. Le client n'attribue JAMAIS une
 * zone : tout ce qui sort d'ici est « estimé », le serveur reste seul décideur.
 */
import { cellToLatLng, getHexagonAreaAvg, polygonToCells, UNITS } from 'h3-js';
import {
  H3_RESOLUTION,
  LOOP_CLOSE_TOLERANCE_M,
  LOOP_HINT_DISTANCE_M,
  LOOP_MIN_PERIMETER_M,
  LOOP_PREVIEW_DISTANCE_M,
} from '@klaim/shared';
import type { RoutePoint } from '../../ui/game';
import { NAV_METERS_PER_PIXEL, worldToGeo, type LiveNav } from './liveNav';
import type { RunSimulation } from './simulation';

// Seuils d'affichage 600/300 m (AMENDEMENT-12 §C) : définis dans game-rules.ts
// comme toute constante spécifiée par un amendement — ré-exportés pour l'UI.
export { LOOP_HINT_DISTANCE_M, LOOP_PREVIEW_DISTANCE_M };

// ─── Géométrie sphérique locale (physique, pas des règles de jeu) ────────────

const EARTH_RADIUS_M = 6_371_000;
const RAD_PER_DEG = Math.PI / 180;

interface GeoPoint {
  lat: number;
  lng: number;
}

/** Distance haversine (m) — même formule que engine/validation.ts. */
function haversineM(a: GeoPoint, b: GeoPoint): number {
  const dLat = (b.lat - a.lat) * RAD_PER_DEG;
  const dLng = (b.lng - a.lng) * RAD_PER_DEG;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(a.lat * RAD_PER_DEG) * Math.cos(b.lat * RAD_PER_DEG) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Aire (m²) du polygone de la trace refermée (shoelace équirectangulaire,
 * coordonnées relatives au 1er point) — miroir de engine/hexing.ts
 * traceAreaM2 : sert uniquement à écarter l'aller-retour (aire ~0).
 */
function traceAreaM2(points: readonly GeoPoint[]): number {
  const first = points[0];
  if (first === undefined) return 0;
  let latSum = 0;
  for (const p of points) latSum += p.lat;
  const cosLat0 = Math.cos((latSum / points.length) * RAD_PER_DEG);
  const x = (p: GeoPoint): number =>
    (p.lng - first.lng) * RAD_PER_DEG * cosLat0 * EARTH_RADIUS_M;
  const y = (p: GeoPoint): number => (p.lat - first.lat) * RAD_PER_DEG * EARTH_RADIUS_M;
  let doubled = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    doubled += x(a) * y(b) - x(b) * y(a);
  }
  return Math.abs(doubled) / 2;
}

/** Boucle fermée ? Miroir STRICT des 3 gardes de engine detectClosedLoop. */
function isClosedLoop(points: readonly GeoPoint[], perimeterM: number): boolean {
  if (points.length < 3) return false;
  if (haversineM(points[0]!, points[points.length - 1]!) > LOOP_CLOSE_TOLERANCE_M) return false;
  if (perimeterM < LOOP_MIN_PERIMETER_M) return false;
  return traceAreaM2(points) >= getHexagonAreaAvg(H3_RESOLUTION, UNITS.m2);
}

/**
 * Cellules INTÉRIEURES de la boucle — miroir de engine enclosedCells :
 * polygonToCells res 10 MOINS le couloir, triées par distance croissante au
 * tracé ; polygone dégénéré → [] (fallback couloir seul, jamais de crash).
 */
function enclosedCellsDemo(
  points: readonly GeoPoint[],
  corridorCells: readonly string[],
): string[] {
  if (points.length < 3) return [];
  let polygonCells: string[];
  try {
    polygonCells = polygonToCells(points.map((p) => [p.lat, p.lng]), H3_RESOLUTION);
  } catch {
    return [];
  }
  const corridor = new Set(corridorCells);
  const interior = polygonCells.filter((cell) => !corridor.has(cell));
  if (interior.length <= 1) return interior;
  const distanceToTrace = (cell: string): number => {
    const [lat, lng] = cellToLatLng(cell);
    let best = Infinity;
    for (const p of points) {
      const d = haversineM({ lat: lat ?? 0, lng: lng ?? 0 }, p);
      if (d < best) best = d;
    }
    return best;
  };
  return interior
    .map((cell) => ({ cell, d: distanceToTrace(cell) }))
    .sort((a, b) => a.d - b.d)
    .map((entry) => entry.cell);
}

// ─── État boucle de la démo ──────────────────────────────────────────────────

export interface RunLoop {
  /** Premier tick où la boucle est fermée au sens moteur — -1 si jamais. */
  closeTick: number;
  /** Zones intérieures estimées (couloir EXCLU), distance croissante au tracé. */
  interiorCells: readonly string[];
  /** interiorCells.length — le « +N zones » de la fermeture. */
  enclosedZones: number;
  /** Départ de la trace en pixels-monde (pointillé + marqueur départ). */
  startXY: RoutePoint;
  /** Distance à vol d'oiseau au départ (m), par tick. */
  distToStartM: readonly number[];
  /** Trace géo (ticks capturants) — polyline des mini-cartes du résultat. */
  traceGeo: readonly GeoPoint[];
}

/**
 * Construit l'état boucle de la démo (déterministe). La trace = les positions
 * des ticks CAPTURANTS uniquement — miroir d'ingest_run qui ne donne au
 * polygone que les segments claimables (une fenêtre zone privée / GPS faible /
 * segment exclu ne participe pas à la boucle). Hors conquête : null (le moteur
 * bifurque avant tout calcul de boucle — jamais de claims).
 */
export function buildRunLoop(sim: RunSimulation, nav: LiveNav): RunLoop | null {
  if (sim.mode !== 'conquete') return null;
  const start = nav.ticks[0];
  if (!start) return null;

  const trace: GeoPoint[] = [];
  const distToStartM: number[] = [];
  let closeTick = -1;
  let perimeterM = 0;
  for (let i = 0; i < nav.ticks.length; i += 1) {
    const t = nav.ticks[i]!;
    distToStartM.push(Math.hypot(t.x - start.x, t.y - start.y) * NAV_METERS_PER_PIXEL);
    if (!sim.ticks[i]?.capturing) continue;
    const g = worldToGeo(t.x, t.y);
    const prev = trace[trace.length - 1];
    if (prev) perimeterM += haversineM(prev, g);
    trace.push(g);
    if (closeTick === -1 && isClosedLoop(trace, perimeterM)) closeTick = i;
  }

  const interiorCells = closeTick >= 0 ? enclosedCellsDemo(trace, nav.litCells) : [];
  return {
    closeTick,
    interiorCells,
    enclosedZones: interiorCells.length,
    startXY: { x: start.x, y: start.y },
    distToStartM,
    traceGeo: trace,
  };
}

// ─── Lectures dérivées (écrans) ──────────────────────────────────────────────

/** Phase d'affichage de la boucle (AMENDEMENT-12 §C). */
export type LoopPhase = 'none' | 'open' | 'approach' | 'closed';

export interface LoopStatus {
  phase: LoopPhase;
  /** Distance au départ (m) au tick — pour « départ à ~N m ». */
  distM: number;
}

/**
 * Phase au tick : `closed` dès le tick de fermeture ; sinon `open`/`approach`
 * quand le pointillé/l'aperçu ont un sens — périmètre déjà ≥
 * LOOP_MIN_PERIMETER_M (jamais de teasing de micro-boucle) ET départ à portée.
 */
export function loopStatusAt(
  loop: RunLoop | null,
  sim: RunSimulation,
  tickIndex: number,
): LoopStatus {
  if (!loop) return { phase: 'none', distM: 0 };
  const last = sim.ticks.length - 1;
  const i = Math.min(Math.max(Math.round(tickIndex), 0), last);
  const distM = loop.distToStartM[i] ?? 0;
  if (loop.closeTick >= 0 && i >= loop.closeTick) return { phase: 'closed', distM };
  if ((sim.ticks[i]?.distanceM ?? 0) < LOOP_MIN_PERIMETER_M) return { phase: 'none', distM };
  if (distM <= LOOP_PREVIEW_DISTANCE_M) return { phase: 'approach', distM };
  if (distM <= LOOP_HINT_DISTANCE_M) return { phase: 'open', distM };
  return { phase: 'none', distM };
}

/** Résumé pour resultStats (simulation.ts) — jamais de zones hors fermeture. */
export function loopSummaryAt(
  loop: RunLoop | null,
  tickIndex: number,
): { loopClosed: boolean; enclosedZones: number } {
  const loopClosed = loop !== null && loop.closeTick >= 0 && tickIndex >= loop.closeTick;
  return { loopClosed, enclosedZones: loopClosed ? loop.enclosedZones : 0 };
}
