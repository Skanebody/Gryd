/**
 * GRYD — ROUTING PIÉTON EN CONTINU (façon Waze live). Route À LA VOLÉE une boucle
 * fermée d'une distance quelconque, RUE PAR RUE, via OSRM foot (même service que
 * les boucles pré-routées). Waypoints en rosace autour de l'ego → route OSRM →
 * géométrie qui SUIT LES RUES, calée en 2 passes sur la distance cible.
 *
 * Réseau AU RUNTIME (assumé — décision fondateur « go ») : en cas d'échec / hors
 * ligne, l'appelant garde la boucle pré-routée (loops.generated.ts) en repli, si
 * bien que l'écran fonctionne toujours. Aucune clé/API payante (serveur foot
 * communautaire). Résultat = PlannedRouteDemo (carte/KPI/CTA inchangés).
 */
import { POINTS_DEFENDED_HEX, POINTS_NEUTRAL_HEX } from '@klaim/shared';
import { EGO_REPUBLIQUE, REAL_M_PER_DEG_LAT, type LatLngPoint } from '../map/realAnchors';
import type { PlannerIntention } from './generator';
import type { PlannedRouteDemo, RouteTypeKey } from './types';

const OSRM_FOOT = 'https://routing.openstreetmap.de/routed-foot/route/v1/foot';
const M_PER_DEG_LNG = REAL_M_PER_DEG_LAT * Math.cos((EGO_REPUBLIQUE.lat * Math.PI) / 180);

const ZONES_PER_KM = 15.3;
const LOOP_ZONE_RATIO = 0.6;
/** Plus de waypoints pour les grandes boucles (tour plus rond, jusqu'au trail). */
function nWpFor(km: number): number {
  return Math.min(12, Math.max(6, Math.round(km / 3)));
}
/** Décimation bornée : ~150 points/boucle quelle que soit la distance. */
function gapFor(distanceM: number): number {
  return Math.max(8, distanceM / 150);
}

/** Cap (deg, 0 = est) par intention — dirige la boucle vers le bon secteur. */
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
const INTENTION_ZONE: Record<PlannerIntention, string> = {
  conquerir: 'République',
  attaquer: 'Belleville',
  defendre: 'République',
};

function rng(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 48271) % 2147483647) / 2147483647;
}
const d2r = (d: number) => (d * Math.PI) / 180;

function metersToLatLng(x: number, y: number): LatLngPoint {
  return { lat: EGO_REPUBLIQUE.lat + y / REAL_M_PER_DEG_LAT, lng: EGO_REPUBLIQUE.lng + x / M_PER_DEG_LNG };
}

/** Waypoints d'une rosace fermée (ego = 1er = dernier). */
function waypoints(bearingDeg: number, radiusM: number, jitter: readonly number[], n: number): LatLngPoint[] {
  const cx = radiusM * Math.cos(d2r(bearingDeg));
  const cy = radiusM * Math.sin(d2r(bearingDeg));
  const start = bearingDeg + 180;
  const pts: LatLngPoint[] = [];
  for (let k = 0; k < n; k += 1) {
    const a = d2r(start + (360 * k) / n);
    const r = radiusM * (1 + (jitter[k] ?? 0));
    pts.push(metersToLatLng(cx + r * Math.cos(a), cy + r * Math.sin(a)));
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
    // réseau/CORS/abort → repli côté appelant
  }
  return null;
}

/** Décime la polyligne : garde un point tous les >= minGapM. */
function decimate(coords: readonly [number, number][], minGapM: number): LatLngPoint[] {
  const out: LatLngPoint[] = [];
  let last: LatLngPoint | null = null;
  for (const [lng, lat] of coords) {
    if (last) {
      const dx = (lng - last.lng) * M_PER_DEG_LNG;
      const dy = (lat - last.lat) * REAL_M_PER_DEG_LAT;
      if (Math.hypot(dx, dy) < minGapM) continue;
    }
    const p = { lat: Number(lat.toFixed(5)), lng: Number(lng.toFixed(5)) };
    out.push(p);
    last = p;
  }
  return out;
}

/**
 * Route en direct une boucle piétonne d'une distance cible (km). Renvoie null en
 * cas d'échec réseau (l'appelant garde alors la boucle pré-routée). 2 passes de
 * calage sur la distance.
 */
export async function routeLoop(
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
    result = await routeFoot(waypoints(INTENTION_BEARING[intention], radius, jitter, n), signal);
    if (!result || result.distanceM <= 0) return null;
    radius *= (targetKm * 1000) / result.distanceM;
  }
  if (!result) return null;

  const line = decimate(result.coords, gapFor(result.distanceM));
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
    zone: INTENTION_ZONE[intention],
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
