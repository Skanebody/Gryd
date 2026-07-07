/**
 * GRYD — ROUTING PIÉTON EN CONTINU (façon Waze live), N'IMPORTE OÙ EN FRANCE.
 * Route À LA VOLÉE une boucle fermée d'une distance quelconque, RUE PAR RUE, via
 * OSRM foot, autour d'une ORIGINE quelconque (ta position GPS ou un lieu cherché
 * — plus aucun point de départ figé). Waypoints en rosace autour de l'origine →
 * route OSRM → géométrie qui SUIT LES RUES, calée en 2 passes sur la distance.
 *
 * Réseau AU RUNTIME (assumé — décision fondateur) : le calcul temps réel se fait
 * via l'internet de l'utilisateur, gratuitement (serveur foot communautaire, sans
 * clé). Échec / hors ligne → renvoie null (l'appelant garde le tracé courant).
 */
import { POINTS_DEFENDED_HEX, POINTS_NEUTRAL_HEX } from '@klaim/shared';
import { REAL_M_PER_DEG_LAT, type LatLngPoint } from '../map/realAnchors';
import type { PlannerIntention } from './generator';
import type { PlannedRouteDemo, RouteTypeKey } from './types';

const OSRM_FOOT = 'https://routing.openstreetmap.de/routed-foot/route/v1/foot';

const ZONES_PER_KM = 15.3;
const LOOP_ZONE_RATIO = 0.6;

/** Cap (deg, 0 = est) par intention — oriente la boucle autour de l'origine. */
const INTENTION_BEARING: Record<PlannerIntention, number> = {
  conquerir: 25,
  attaquer: 70,
  defendre: 210,
};
const INTENTION_TYPE: Record<PlannerIntention, RouteTypeKey> = {
  conquerir: 'capture_rapide',
  attaquer: 'raid',
  defendre: 'defense',
};

/** Plus de waypoints pour les grandes boucles (tour plus rond, jusqu'au trail). */
function nWpFor(km: number): number {
  return Math.min(12, Math.max(6, Math.round(km / 3)));
}
/** Décimation bornée : ~150 points/boucle quelle que soit la distance. */
function gapFor(distanceM: number): number {
  return Math.max(8, distanceM / 150);
}
function mPerDegLng(lat: number): number {
  return REAL_M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
}
function rng(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 48271) % 2147483647) / 2147483647;
}
const d2r = (d: number) => (d * Math.PI) / 180;

/** Waypoints d'une rosace fermée autour de `origin` (origine = 1er = dernier). */
function waypoints(
  origin: LatLngPoint,
  bearingDeg: number,
  radiusM: number,
  jitter: readonly number[],
  n: number,
): LatLngPoint[] {
  const mLng = mPerDegLng(origin.lat);
  const cx = radiusM * Math.cos(d2r(bearingDeg));
  const cy = radiusM * Math.sin(d2r(bearingDeg));
  const start = bearingDeg + 180;
  const pts: LatLngPoint[] = [];
  for (let k = 0; k < n; k += 1) {
    const a = d2r(start + (360 * k) / n);
    const r = radiusM * (1 + (jitter[k] ?? 0));
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    pts.push({ lat: origin.lat + y / REAL_M_PER_DEG_LAT, lng: origin.lng + x / mLng });
  }
  pts.push(pts[0]!);
  return pts;
}

interface OsrmResult {
  distanceM: number;
  coords: [number, number][];
}

async function routeFoot(wps: readonly LatLngPoint[], signal?: AbortSignal): Promise<OsrmResult | null> {
  const coords = wps.map((p) => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`).join(';');
  const url = `${OSRM_FOOT}/${coords}?overview=full&geometries=geojson`;
  try {
    const res = await fetch(url, signal ? { signal } : undefined);
    const json = await res.json();
    if (json.code === 'Ok' && json.routes?.[0]) {
      return { distanceM: json.routes[0].distance, coords: json.routes[0].geometry.coordinates };
    }
  } catch {
    // réseau / CORS / abort → repli côté appelant
  }
  return null;
}

/** Décime la polyligne : garde un point tous les >= minGapM (mètres). */
function decimate(coords: readonly [number, number][], lat: number, minGapM: number): LatLngPoint[] {
  const mLng = mPerDegLng(lat);
  const out: LatLngPoint[] = [];
  let last: LatLngPoint | null = null;
  for (const [lng, latPt] of coords) {
    if (last) {
      const dx = (lng - last.lng) * mLng;
      const dy = (latPt - last.lat) * REAL_M_PER_DEG_LAT;
      if (Math.hypot(dx, dy) < minGapM) continue;
    }
    const p = { lat: Number(latPt.toFixed(5)), lng: Number(lng.toFixed(5)) };
    out.push(p);
    last = p;
  }
  return out;
}

/**
 * Route en direct une boucle piétonne autour de `origin` (n'importe où), à la
 * distance cible (km). `zoneLabel` nomme le secteur affiché (lieu de départ).
 * Renvoie null en cas d'échec réseau. 2 passes de calage sur la distance.
 */
export async function routeLoop(
  origin: LatLngPoint,
  zoneLabel: string,
  targetKm: number,
  intention: PlannerIntention,
  seed: number,
  signal?: AbortSignal,
): Promise<PlannedRouteDemo | null> {
  const n = nWpFor(targetKm);
  const rand = rng(seed * 131 + Math.round(targetKm * 10));
  const jitter: number[] = [];
  for (let k = 0; k < n; k += 1) jitter.push((rand() - 0.5) * 0.34);
  jitter[0] = 0;

  let radius = (targetKm * 1000) / (2 * Math.PI);
  let result: OsrmResult | null = null;
  for (let pass = 0; pass < 2; pass += 1) {
    result = await routeFoot(waypoints(origin, INTENTION_BEARING[intention], radius, jitter, n), signal);
    if (!result || result.distanceM <= 0) return null;
    radius *= (targetKm * 1000) / result.distanceM;
  }
  if (!result) return null;

  const line = decimate(result.coords, origin.lat, gapFor(result.distanceM));
  if (line.length < 4) return null;

  const km = Math.round((result.distanceM / 1000) * 10) / 10;
  const zones = Math.round(km * ZONES_PER_KM);
  const loopZones = Math.round(zones * LOOP_ZONE_RATIO);
  const defend = intention === 'defendre';
  return {
    id: `live_${intention}_${Math.round(targetKm * 10)}_${seed}`,
    letter: 'A',
    name: 'Live',
    typeKey: INTENTION_TYPE[intention],
    zone: zoneLabel,
    distanceKm: km,
    zones,
    loopZones,
    points: zones * (defend ? POINTS_DEFENDED_HEX : POINTS_NEUTRAL_HEX),
    shape: 'boucle',
    difficulty: km <= 3 ? 'Facile' : km <= 6 ? 'Modéré' : 'Exigeant',
    ...(defend ? { streetsToSave: Math.max(6, Math.round(km * 3)), expiresInH: 48 } : {}),
    line,
  };
}
