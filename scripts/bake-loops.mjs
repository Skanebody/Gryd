/**
 * Génère de VRAIES boucles piétonnes (OSRM foot) autour de l'ego République et
 * les fige dans apps/mobile/src/features/route/loops.generated.ts.
 * Chaque boucle = waypoints en rosace → route OSRM foot RUE PAR RUE (fermée),
 * calée en 2-3 passes sur la distance cible. Aucun réseau au runtime ensuite.
 */
import { writeFileSync } from 'node:fs';

const EGO = { lat: 48.867, lng: 2.3641 };
const M_PER_DEG_LAT = 111_320;
const M_PER_DEG_LNG = 111_320 * Math.cos((EGO.lat * Math.PI) / 180);
const OSRM = 'https://routing.openstreetmap.de/routed-foot/route/v1/foot';

const OBJECTIVES = [
  { key: 'conquerir', bearing: 25 },
  { key: 'attaquer', bearing: 70 },
  { key: 'defendre', bearing: 210 },
];
// Amplitude large : du footing au trail (des coureurs font 50 km).
const DISTANCES_KM = [1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50];
/** Plus de waypoints pour les grandes boucles (tour plus rond). */
function nWpFor(km) {
  return Math.min(12, Math.max(6, Math.round(km / 3)));
}
/** Espacement de décimation : borne le nb de points (~150/boucle) quelle que soit la distance. */
function gapFor(distanceM) {
  return Math.max(8, distanceM / 150);
}

function rng(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 48271) % 2147483647) / 2147483647;
}
const d2r = (d) => (d * Math.PI) / 180;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function metersToLatLng(x, y) {
  return { lat: EGO.lat + y / M_PER_DEG_LAT, lng: EGO.lng + x / M_PER_DEG_LNG };
}

/** Waypoints d'une rosace fermée (ego = 1er = dernier). */
function waypoints(bearingDeg, radiusM, jitter, n) {
  const cx = radiusM * Math.cos(d2r(bearingDeg));
  const cy = radiusM * Math.sin(d2r(bearingDeg));
  const start = bearingDeg + 180;
  const pts = [];
  for (let k = 0; k < n; k += 1) {
    const a = d2r(start + (360 * k) / n);
    const r = radiusM * (1 + (jitter[k] ?? 0));
    pts.push(metersToLatLng(cx + r * Math.cos(a), cy + r * Math.sin(a)));
  }
  pts.push(pts[0]); // fermeture
  return pts;
}

async function routeFoot(wps) {
  const coords = wps.map((p) => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`).join(';');
  const url = `${OSRM}/${coords}?overview=full&geometries=geojson`;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res = await fetch(url);
      const json = await res.json();
      if (json.code === 'Ok' && json.routes?.[0]) {
        const r = json.routes[0];
        return { distanceM: r.distance, coords: r.geometry.coordinates };
      }
    } catch (e) {
      // retry
    }
    await sleep(600);
  }
  return null;
}

/** Décime une polyligne : garde un point tous les >= minGapM. */
function decimate(coords, minGapM) {
  const out = [];
  let last = null;
  for (const [lng, lat] of coords) {
    if (last) {
      const dx = (lng - last.lng) * M_PER_DEG_LNG;
      const dy = (lat - last.lat) * M_PER_DEG_LAT;
      if (Math.hypot(dx, dy) < minGapM) continue;
    }
    const p = { lat: Number(lat.toFixed(5)), lng: Number(lng.toFixed(5)) };
    out.push(p);
    last = p;
  }
  return out;
}

async function bakeLoop(objective, bearing, targetKm) {
  const n = nWpFor(targetKm);
  const rand = rng(Math.round(bearing * 100 + targetKm * 10));
  const jitter = Array.from({ length: n }, () => (rand() - 0.5) * 0.34);
  jitter[0] = 0;
  let radius = (targetKm * 1000) / (2 * Math.PI);
  let result = null;
  for (let pass = 0; pass < 3; pass += 1) {
    const wps = waypoints(bearing, radius, jitter, n);
    result = await routeFoot(wps);
    await sleep(300);
    if (!result || result.distanceM <= 0) return null;
    radius *= (targetKm * 1000) / result.distanceM;
    if (Math.abs(result.distanceM - targetKm * 1000) < targetKm * 40) break; // < ~4%
  }
  if (!result) return null;
  const line = decimate(result.coords, gapFor(result.distanceM));
  if (line.length < 4) return null;
  return {
    id: `real_${objective}_${Math.round(targetKm * 10)}`,
    objective,
    distanceKm: Math.round((result.distanceM / 1000) * 10) / 10,
    line,
  };
}

const loops = [];
for (const obj of OBJECTIVES) {
  for (const km of DISTANCES_KM) {
    const loop = await bakeLoop(obj.key, obj.bearing, km);
    if (loop) {
      loops.push(loop);
      console.error(`ok ${loop.id} → ${loop.distanceKm} km (${loop.line.length} pts)`);
    } else {
      console.error(`SKIP ${obj.key} ${km}km`);
    }
  }
}

const header = `/**
 * GRYD — boucles piétonnes RÉELLES pré-routées (OSRM foot), FIGÉES au build par
 * scripts/bake-loops.mjs. Elles SUIVENT LES RUES (aucun bâtiment traversé) et
 * sont chargées HORS LIGNE (zéro réseau au runtime). Le route planner y pioche
 * par objectif + distance. NE PAS ÉDITER À LA MAIN — régénérer avec le script.
 */
export interface RealLoop {
  id: string;
  objective: 'conquerir' | 'attaquer' | 'defendre';
  distanceKm: number;
  line: readonly { lat: number; lng: number }[];
}

export const REAL_LOOPS: readonly RealLoop[] = ${JSON.stringify(loops, null, 2)} as const;
`;

const outPath = new URL('../apps/mobile/src/features/route/loops.generated.ts', import.meta.url);
writeFileSync(process.argv[2] ?? outPath, header);
console.error(`\n${loops.length} boucles réelles écrites.`);
