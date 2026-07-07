/**
 * GRYD — MIROIR mobile de engine/route.ts (garde-fous de walkabilité). Metro ne
 * résout pas @klaim/engine ; on reproduit ICI la logique PURE, en important les
 * MÊMES constantes depuis @klaim/shared (source de vérité unique — aucun nombre
 * magique dupliqué). Le moteur (packages/engine/src/route.ts) reste la référence
 * testée Deno ; ce fichier doit rester ISO-comportement.
 *
 * But : ne JAMAIS proposer une route non accessible à pied (autoroute/voie
 * rapide) ni un tracé déconnecté (téléport hors réseau).
 */
import {
  ROUTE_FORBIDDEN_HIGHWAY_CLASSES,
  ROUTE_MAX_STEP_M,
  ROUTE_MIN_POINTS,
  ROUTE_WALKABLE_HIGHWAY_CLASSES,
} from '@klaim/shared';

export interface RouteGeoPoint {
  lat: number;
  lng: number;
}

export interface RouteToCheck {
  points: readonly RouteGeoPoint[];
  /** Classe OSM highway=* par segment (len = points.length - 1) — optionnel. */
  roadClasses?: readonly string[];
}

export type RouteViolationKind =
  | 'too_short'
  | 'disconnected'
  | 'forbidden_class'
  | 'unknown_class';

export interface RouteViolation {
  kind: RouteViolationKind;
  index?: number;
  detail?: string;
}

export interface RouteWalkabilityResult {
  walkable: boolean;
  ok: boolean;
  violations: readonly RouteViolation[];
}

const EARTH_RADIUS_M = 6_371_000;
const FORBIDDEN = new Set(ROUTE_FORBIDDEN_HIGHWAY_CLASSES);
const WALKABLE = new Set(ROUTE_WALKABLE_HIGHWAY_CLASSES);

/** Distance haversine en mètres — même formule que engine/validation.ts. */
function haversineM(a: RouteGeoPoint, b: RouteGeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Contrôle de walkabilité — ISO engine/route.ts.validateRouteWalkability. */
export function validateRouteWalkability(route: RouteToCheck): RouteWalkabilityResult {
  const violations: RouteViolation[] = [];
  const pts = route.points;

  if (pts.length < ROUTE_MIN_POINTS) {
    violations.push({ kind: 'too_short', detail: `${pts.length} point(s) < ${ROUTE_MIN_POINTS}` });
    return { walkable: false, ok: false, violations };
  }

  for (let i = 1; i < pts.length; i++) {
    const gap = haversineM(pts[i - 1]!, pts[i]!);
    if (gap > ROUTE_MAX_STEP_M) {
      violations.push({ kind: 'disconnected', index: i, detail: `${Math.round(gap)} m` });
    }
  }

  if (route.roadClasses) {
    route.roadClasses.forEach((cls, i) => {
      if (FORBIDDEN.has(cls)) violations.push({ kind: 'forbidden_class', index: i, detail: cls });
      else if (!WALKABLE.has(cls)) violations.push({ kind: 'unknown_class', index: i, detail: cls });
    });
  }

  const hard = violations.some(
    (v) => v.kind === 'forbidden_class' || v.kind === 'disconnected' || v.kind === 'too_short',
  );
  const soft = violations.some((v) => v.kind === 'unknown_class');
  return { walkable: !hard, ok: !hard && !soft, violations };
}

/** VRAI si la route est praticable à pied (aucune violation dure). */
export function isRouteWalkable(route: RouteToCheck): boolean {
  return validateRouteWalkability(route).walkable;
}
