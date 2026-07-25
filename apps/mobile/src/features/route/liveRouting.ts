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
 *
 * ─── CE MODULE NE DÉCIDE PLUS RIEN DU JEU (25/07/2026) ─────────────────────────
 * Il renvoyait `zones`, `loopZones`, `points`, `streetsToSave`, `expiresInH` et
 * `difficulty`, tous FABRIQUÉS ICI à partir de `ZONES_PER_KM = 15.3` et
 * `LOOP_ZONE_RATIO = 0.6` — deux nombres qui ne venaient pas de `game-rules.ts`
 * et n'avaient été mesurés nulle part. Une boucle planifiée annonçait donc au
 * joueur, avant qu'il ait couru un mètre, un gain de territoire et un score que
 * le serveur seul décide, APRÈS la course, cellule par cellule (ingest_run).
 *
 * Ce n'était pas une décoration : c'était une PROMESSE DE RÉCOMPENSE. Elle est
 * supprimée, pas déplacée. Ce module ne connaît plus que de la géométrie — une
 * polyligne réellement renvoyée par OSRM et sa longueur mesurée.
 */
import { REAL_M_PER_DEG_LAT, type LatLngPoint } from '../map/realAnchors';
import type { PlannedLoop, PlannerIntention } from './types';

const OSRM_FOOT = 'https://routing.openstreetmap.de/routed-foot/route/v1/foot';

/**
 * Cap (deg, 0 = est) par intention — oriente la boucle autour de l'origine.
 * MESURE DE COMPOSITION GÉOMÉTRIQUE, pas une règle de jeu : deux objectifs
 * doivent proposer deux boucles distinctes plutôt que la même, et ces caps ne
 * rapportent ni point ni zone.
 */
const INTENTION_BEARING: Record<PlannerIntention, number> = {
  conquerir: 25,
  defendre: 210,
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
): Promise<PlannedLoop | null> {
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

  // La SEULE métrique que ce module a le droit de produire : la longueur que
  // le routeur a réellement mesurée sur les rues (pas la distance demandée).
  const km = Math.round((result.distanceM / 1000) * 10) / 10;
  return {
    id: `live_${intention}_${Math.round(targetKm * 10)}_${seed}`,
    zone: zoneLabel,
    distanceKm: km,
    intention,
    line,
  };
}
