#!/usr/bin/env node
/**
 * Génère packages/shared/src/france-geo.ts : la VRAIE géographie de France
 * (contours Etalab/IGN via france-geojson, licence ouverte) projetée dans un
 * viewBox 1000×H, + la couverture H3 res 4 réelle (cellules dont le centre
 * tombe en France) pour le quadrillage territorial national.
 *
 * Usage : node scripts/generate-france-geo.mjs <chemin metropole.geojson>
 * Rendu : les composants dessinent des hexagones pointy-top de rayon
 * FRANCE_HEX_R autour des centres projetés (l'aire H3 res 4 varie peu à
 * l'échelle nationale — approximation documentée, les ids H3 réels sont
 * conservés pour brancher de vraies données plus tard).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { polygonToCells, cellToLatLng } = require('h3-js');

const src = process.argv[2];
if (!src) throw new Error('usage: node scripts/generate-france-geo.mjs <metropole.geojson>');
const gj = JSON.parse(readFileSync(src, 'utf8'));
const geom = gj.type === 'Feature' ? gj.geometry : gj.features ? gj.features[0].geometry : gj;
const polys = geom.type === 'MultiPolygon' ? geom.coordinates : [geom.coordinates];

// ─── Projection équirectangulaire corrigée (cos de la latitude moyenne) ─────
let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
for (const poly of polys) for (const ring of poly) for (const [lon, lat] of ring) {
  if (lon < minLon) minLon = lon;
  if (lon > maxLon) maxLon = lon;
  if (lat < minLat) minLat = lat;
  if (lat > maxLat) maxLat = lat;
}
const midLat = (minLat + maxLat) / 2;
const kx = Math.cos((midLat * Math.PI) / 180);
const W = 1000;
const scale = W / ((maxLon - minLon) * kx);
const H = Math.round((maxLat - minLat) * scale);
const px = (lon, lat) => [
  Math.round((lon - minLon) * kx * scale * 10) / 10,
  Math.round((maxLat - lat) * scale * 10) / 10,
];

// ─── Simplification Douglas-Peucker (en unités projetées) ───────────────────
function dp(points, tol) {
  if (points.length < 3) return points;
  const sqTol = tol * tol;
  const [ax, ay] = points[0];
  const [bx, by] = points[points.length - 1];
  let maxD = 0, idx = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const [x, y] = points[i];
    const dx = bx - ax, dy = by - ay;
    const l2 = dx * dx + dy * dy;
    let d;
    if (l2 === 0) d = (x - ax) ** 2 + (y - ay) ** 2;
    else {
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2));
      d = (x - ax - t * dx) ** 2 + (y - ay - t * dy) ** 2;
    }
    if (d > maxD) { maxD = d; idx = i; }
  }
  if (maxD <= sqTol) return [points[0], points[points.length - 1]];
  return [...dp(points.slice(0, idx + 1), tol).slice(0, -1), ...dp(points.slice(idx), tol)];
}

const TOL = 1.6; // ~11 km réels — silhouette fidèle, poids maîtrisé
const outline = [];
for (const poly of polys) {
  const ring = poly[0].map(([lon, lat]) => px(lon, lat));
  const simplified = dp(ring, TOL);
  if (simplified.length >= 12) outline.push(simplified); // écarte les îlots minuscules
}

// ─── Couverture H3 res 4 réelle ──────────────────────────────────────────────
const RES = 4;
const cells = new Set();
for (const poly of polys) {
  // h3-js v4 : polygonToCells(coords GeoJSON [lng,lat] avec trous, res, true)
  for (const c of polygonToCells(poly, RES, true)) cells.add(c);
}
const hexes = [...cells].sort().map((h) => {
  const [lat, lng] = cellToLatLng(h);
  const [x, y] = px(lng, lat);
  return { h, x, y };
});

// Rayon rendu : l'arête H3 res 4 ≈ 22,6 km → en unités projetées.
const kmPerUnit = ((maxLon - minLon) * kx * 111.32) / W;
const R = Math.round((22.6 / kmPerUnit) * 10) / 10;

const CITIES = {
  paris: [2.3522, 48.8566], lille: [3.0573, 50.6292], rouen: [1.0993, 49.4432],
  dieppe: [1.0783, 49.9229], lyon: [4.8357, 45.764], bordeaux: [-0.5792, 44.8378],
  marseille: [5.3698, 43.2965], toulouse: [1.4442, 43.6047], nantes: [-1.5536, 47.2184],
  strasbourg: [7.7521, 48.5734], offranville: [1.0508, 49.8722],
};
const cities = Object.fromEntries(
  Object.entries(CITIES).map(([k, [lon, lat]]) => { const [x, y] = px(lon, lat); return [k, { x, y }]; }),
);

const out = `/**
 * GRYD — GÉNÉRÉ par scripts/generate-france-geo.mjs — ne pas éditer à la main.
 * Vraie géographie de France (contours Etalab/IGN via france-geojson, licence
 * ouverte) + couverture H3 res 4 réelle (${hexes.length} cellules), projection
 * équirectangulaire corrigée cos(${midLat.toFixed(1)}°), viewBox ${W}×${H}.
 * Rendu : hexagones pointy-top de rayon FRANCE_HEX_R autour des centres —
 * l'aire H3 varie peu à l'échelle nationale (approximation assumée) ; les ids
 * H3 réels permettent de brancher de vraies données de territoire.
 */

export const FRANCE_VIEWBOX = { w: ${W}, h: ${H} } as const;

/** Rayon de rendu d'une cellule H3 res 4 (unités viewBox). */
export const FRANCE_HEX_R = ${R};

/** Contours réels simplifiés (Douglas-Peucker ~11 km) — [x,y][] par polygone (continent, Corse…). */
export const FRANCE_OUTLINE: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = ${JSON.stringify(
  outline.map((ring) => ring.map(([x, y]) => [x, y])),
)};

/** Cellules H3 res 4 couvrant la France : id réel + centre projeté. */
export const FRANCE_HEX_CELLS: ReadonlyArray<{ h: string; x: number; y: number }> = ${JSON.stringify(hexes)};

/** Villes projetées (repères produit — SPEC/AMENDEMENT-02). */
export const FRANCE_CITIES: Readonly<Record<string, { x: number; y: number }>> = ${JSON.stringify(cities)};
`;

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dest = join(root, 'packages', 'shared', 'src', 'france-geo.ts');
writeFileSync(dest, out);
const pts = outline.reduce((n, r) => n + r.length, 0);
console.log(`france-geo.ts : ${outline.length} polygones (${pts} pts), ${hexes.length} cellules H3 res ${RES}, hexR=${R}, viewBox ${W}x${H}, ~${Math.round(out.length / 1024)} Ko`);
