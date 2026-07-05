// GÉNÉRÉ par scripts/sync-game-rules.mjs — ne pas éditer.
// Source : packages/engine/src/hexing.ts

/**
 * GRYD — engine/hexing.ts
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
import {
  cellToLatLng,
  getHexagonAreaAvg,
  gridPathCells,
  latLngToCell,
  polygonToCells,
  UNITS,
} from 'npm:h3-js@^4.1';
import {
  H3_RESOLUTION,
  LOOP_CLOSE_TOLERANCE_M,
  LOOP_MAX_AREA_BY_DISTANCE_KM2,
  LOOP_MIN_COMPACTNESS,
  LOOP_MIN_PERIMETER_M,
  LOOP_MIN_WIDTH_M,
  TRACE_BUFFER_M,
} from '../game-rules.ts';
import { haversineM, type Segment } from './validation.ts';

// Constantes physiques / géométriques — pas des règles de jeu.
const EARTH_RADIUS_M = 6_371_000;
const RAD_PER_DEG = Math.PI / 180;
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
 * Retourne le COULOIR seul : les hexes traversés (+ tolérance GPS). Le
 * remplissage d'intérieur de boucle fermée (AMENDEMENT-12 §B, delta sur
 * AMENDEMENT-02 §2) est une étape SÉPARÉE : detectClosedLoop + enclosedCells.
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

// ─── AMENDEMENT-12 §B — « La boucle fait la zone » ───────────────────────────

/** Point minimal lat/lng (un RunPoint est structurellement compatible). */
export interface LatLngPoint {
  lat: number;
  lng: number;
}

/**
 * Aire (m²) du polygone formé par la trace refermée sur elle-même : shoelace
 * sur une projection équirectangulaire centrée (coordonnées relatives au 1er
 * point pour la stabilité numérique). Précision largement suffisante à
 * l'échelle d'une course ; ne sert qu'à écarter les polygones DÉGÉNÉRÉS
 * (aller-retour → aire ~0), jamais à compter des zones (ça, c'est h3).
 */
function traceAreaM2(points: readonly LatLngPoint[]): number {
  const first = points[0];
  if (first === undefined) return 0;
  let latSum = 0;
  for (const p of points) latSum += p.lat;
  const cosLat0 = Math.cos((latSum / points.length) * RAD_PER_DEG);
  const x = (p: LatLngPoint): number => (p.lng - first.lng) * RAD_PER_DEG * cosLat0 * EARTH_RADIUS_M;
  const y = (p: LatLngPoint): number => (p.lat - first.lat) * RAD_PER_DEG * EARTH_RADIUS_M;
  let doubled = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    doubled += x(a) * y(b) - x(b) * y(a);
  }
  return Math.abs(doubled) / 2;
}

/**
 * Trace candidate au polygone de boucle (AMENDEMENT-12 §B). PURE. La boucle
 * n'est détectable que sur une trace claimable CONTIGUË : exactement UN
 * segment claimable — aucun segment exclu du claim (§3.2 : allure hors
 * bornes, véhicule) ni coupure GPS entre le départ et la fermeture. Sinon,
 * aplatir les segments restants relierait leurs extrémités en ligne droite :
 * l'aire parcourue en segment exclu (voiture…) resterait ENFERMÉE dans le
 * polygone et serait capturée en intérieur, alors que le périmètre n'a pas
 * été couru en entier. Retourne le segment unique, ou null si la trace n'est
 * pas contiguë → couloir seul (« trait »), jamais d'intérieur.
 */
export function loopTracePoints<P extends LatLngPoint>(
  segments: readonly (readonly P[])[],
): readonly P[] | null {
  return segments.length === 1 ? segments[0]! : null;
}

/**
 * Boucle fermée par TOLÉRANCE départ/arrivée (AMENDEMENT-12 §B, mode 1 de
 * detectLoop — le mode 2 auto-intersection est AMENDEMENT-16 §2) ? PURE.
 * Trois conditions, dans l'ordre :
 *  1. la trace revient à ≤ LOOP_CLOSE_TOLERANCE_M (haversine, 80 m durci
 *     AMENDEMENT-16 §2) de son départ ;
 *  2. distance totale de la trace ≥ LOOP_MIN_PERIMETER_M (anti micro-boucle) ;
 *  3. le polygone n'est pas dégénéré : son aire doit pouvoir contenir au moins
 *     UNE zone res 10 (aire moyenne getHexagonAreaAvg, dérivée de la grille h3 —
 *     pas une constante de jeu). Un aller-retour (aire ~0) n'est PAS une
 *     boucle : il reste pleinement récompensé en couloir (« trait »).
 */
export function detectClosedLoop(points: readonly LatLngPoint[]): boolean {
  if (points.length < 3) return false; // un polygone exige ≥ 3 sommets
  const first = points[0]!;
  const last = points[points.length - 1]!;
  if (haversineM(first, last) > LOOP_CLOSE_TOLERANCE_M) return false;
  let totalM = 0;
  for (let i = 1; i < points.length; i++) totalM += haversineM(points[i - 1]!, points[i]!);
  if (totalM < LOOP_MIN_PERIMETER_M) return false;
  return traceAreaM2(points) >= getHexagonAreaAvg(H3_RESOLUTION, UNITS.m2);
}

/**
 * Cellules INTÉRIEURES d'une boucle fermée (AMENDEMENT-12 §B) : polygonToCells
 * (h3, containment centre) sur le polygone de la trace en `res`, MOINS les
 * cellules du couloir déjà capturées (`corridorCells`) — aucun doublon. Les
 * cellules retournées sont triées par DISTANCE CROISSANTE au tracé : en cas de
 * dépassement du plafond quotidien couloir + intérieur, l'appelant tronque la
 * FIN de la liste (les plus proches du tracé sont servies d'abord).
 *
 * Trace bruitée : une légère auto-intersection est tolérée par h3 ; si
 * polygonToCells jette (polygone dégénéré, coordonnées invalides…), FALLBACK
 * couloir seul (retour []) — jamais de crash, la course reste récompensée en
 * « trait ». Chaque cellule retournée reste UNE CANDIDATE : c'est decideClaims
 * qui la passe par les règles (lock, bouclier, protection, vol, plafond).
 */
export function enclosedCells(
  points: readonly LatLngPoint[],
  corridorCells: readonly string[],
  res: number = H3_RESOLUTION,
): string[] {
  if (points.length < 3) return []; // pas de polygone → couloir seul
  let polygonCells: string[];
  try {
    polygonCells = polygonToCells(points.map((p) => [p.lat, p.lng]), res);
  } catch {
    return []; // polygone dégénéré → fallback couloir seul, jamais de crash
  }
  const corridor = new Set(corridorCells);
  const interior = polygonCells.filter((cell) => !corridor.has(cell));
  if (interior.length <= 1) return interior;

  // Tri par distance au tracé (centre de cellule → point de trace le plus
  // proche). O(intérieur × points), assumé MVP : l'auto-limite isopérimétrique
  // borne l'intérieur (~130 zones pour 5 km de boucle).
  const distanceToTrace = (cell: string): number => {
    const [lat, lng] = cellToLatLng(cell);
    let best = Infinity;
    for (const p of points) {
      const d = haversineM({ lat, lng }, p);
      if (d < best) best = d;
    }
    return best;
  };
  return interior
    .map((cell) => ({ cell, d: distanceToTrace(cell) }))
    .sort((a, b) => a.d - b.d)
    .map((entry) => entry.cell);
}

// ─── AMENDEMENT-16 §2 — auto-intersection + anti-abus boucle (doc §4-§6) ─────

export type LoopClosure = 'tolerance' | 'self_intersection';

/** Boucle détectée par detectLoop : polygone + mode de fermeture + géométrie. */
export interface DetectedLoop {
  /** Sommets de l'anneau (non répété : le dernier ne re-liste pas le premier). */
  polygon: LatLngPoint[];
  closure: LoopClosure;
  /** Aire (m²) du polygone (shoelace équirectangulaire, même approx que le reste). */
  areaM2: number;
  /** Périmètre (m) de l'anneau, segment de fermeture inclus. */
  perimeterM: number;
}

/** Périmètre (m) d'un anneau : somme des segments + fermeture dernier→premier. */
function ringPerimeterM(points: readonly LatLngPoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += haversineM(points[i - 1]!, points[i]!);
  if (points.length >= 2) total += haversineM(points[points.length - 1]!, points[0]!);
  return total;
}

/**
 * Boucles fermées par AUTO-INTERSECTION (AMENDEMENT-16 §2, doc §4.2 : « le
 * tracé se recroise »). PURE. Scan des paires de segments NON adjacents
 * (j ≥ i+2 — deux segments consécutifs partagent un sommet : contact, jamais
 * croisement → les « faux-croisements » de points adjacents sont exclus par
 * construction) en projection équirectangulaire locale ; croisement STRICT
 * uniquement (0 < t < 1 et 0 < u < 1) : un aller-retour colinéaire ou un
 * simple frôlement ne croisent pas. Chaque croisement (i, j) ferme la partie
 * [X, points[i+1..j]] ; le candidat n'est retenu que si son périmètre ≥
 * LOOP_MIN_PERIMETER_M (filtre O(1) par sommes cumulées — élimine les
 * micro-croisements du bruit GPS) et son aire ≥ 1 zone res 10 (dégénéré).
 * O(n²) sur la trace décimée (≤ GPS_MAX_PAYLOAD_POINTS = 2000 pts) — assumé
 * MVP ; l'aire n'est calculée que pour les rares paires réellement croisées.
 */
function selfIntersectionLoops(points: readonly LatLngPoint[]): DetectedLoop[] {
  const n = points.length;
  if (n < 4) return []; // il faut ≥ 3 segments pour un croisement non adjacent
  const first = points[0]!;
  let latSum = 0;
  for (const p of points) latSum += p.lat;
  const cosLat0 = Math.cos((latSum / n) * RAD_PER_DEG);
  const xs = new Float64Array(n);
  const ys = new Float64Array(n);
  const cum = new Float64Array(n); // distance cumulée (m) le long de la trace
  for (let i = 0; i < n; i++) {
    const p = points[i]!;
    xs[i] = (p.lng - first.lng) * RAD_PER_DEG * cosLat0 * EARTH_RADIUS_M;
    ys[i] = (p.lat - first.lat) * RAD_PER_DEG * EARTH_RADIUS_M;
    if (i > 0) cum[i] = cum[i - 1]! + haversineM(points[i - 1]!, p);
  }
  const minHexAreaM2 = getHexagonAreaAvg(H3_RESOLUTION, UNITS.m2);

  const loops: DetectedLoop[] = [];
  for (let i = 0; i + 1 < n; i++) {
    const rx = xs[i + 1]! - xs[i]!;
    const ry = ys[i + 1]! - ys[i]!;
    for (let j = i + 2; j + 1 < n; j++) {
      const sx = xs[j + 1]! - xs[j]!;
      const sy = ys[j + 1]! - ys[j]!;
      const denom = rx * sy - ry * sx;
      if (denom === 0) continue; // parallèles/colinéaires (aller-retour) : pas de croisement
      const qpx = xs[j]! - xs[i]!;
      const qpy = ys[j]! - ys[i]!;
      const t = (qpx * sy - qpy * sx) / denom;
      const u = (qpx * ry - qpy * rx) / denom;
      if (t <= 0 || t >= 1 || u <= 0 || u >= 1) continue; // croisement STRICT seulement

      // Point d'intersection (planaire → lat/lng, inverse de la projection).
      const ix = xs[i]! + t * rx;
      const iy = ys[i]! + t * ry;
      const crossing: LatLngPoint = {
        lat: first.lat + iy / (RAD_PER_DEG * EARTH_RADIUS_M),
        lng: first.lng + ix / (RAD_PER_DEG * EARTH_RADIUS_M * cosLat0),
      };

      // Filtre périmètre O(1) AVANT tout calcul d'aire (bruit GPS → dehors).
      const perimeterM = haversineM(crossing, points[i + 1]!) +
        (cum[j]! - cum[i + 1]!) + haversineM(points[j]!, crossing);
      if (perimeterM < LOOP_MIN_PERIMETER_M) continue;

      const polygon: LatLngPoint[] = [crossing, ...points.slice(i + 1, j + 1)];
      if (polygon.length < 3) continue;
      const areaM2 = traceAreaM2(polygon);
      if (areaM2 < minHexAreaM2) continue; // dégénéré : pas une zone
      loops.push({ polygon, closure: 'self_intersection', areaM2, perimeterM });
    }
  }
  return loops;
}

/**
 * Détection de boucle UNIFIÉE (AMENDEMENT-16 §2 — remplace l'appel direct à
 * detectClosedLoop dans ingest_run). PURE. Deux modes de fermeture MVP :
 *  1. TOLÉRANCE (AMENDEMENT-12 §B) : la trace entière revient à ≤ 80 m de son
 *     départ (detectClosedLoop) → polygone = toute la trace ;
 *  2. AUTO-INTERSECTION (doc §4.2) : le tracé se recroise → la PARTIE FERMÉE
 *     fait la boucle (trace en P : la queue reste couloir, la boucle capture).
 * Un 8 produit plusieurs candidates → LA PLUS GRANDE boucle gagne (MVP,
 * AMENDEMENT-16 §2) : on retourne la candidate d'aire maximale (sur un 8
 * refermé au départ, le shoelace du polygone complet s'auto-annule lobe
 * contre lobe — le plus grand lobe gagne naturellement). PRÉFÉRENCE aux
 * candidates qui PASSENT le verdict de forme (loopShapeVerdict) : une trace
 * multi-tours du même pâté (N tours → aire et périmètre shoelace ×N →
 * compacité ÷N, artificiellement « étroite ») est secourue par la boucle d'UN
 * tour trouvée par auto-intersection — jamais de faux « forme trop étroite »
 * pour un coureur honnête qui enchaîne les tours. Si AUCUNE candidate ne
 * passe la forme, la plus grande est retournée quand même (l'appelant décide
 * loopRejectedReason='narrow' : boucle fermée, intérieur refusé).
 * null = pas de boucle → couloir seul (« trait »), jamais d'intérieur.
 */
export function detectLoop(points: readonly LatLngPoint[]): DetectedLoop | null {
  if (points.length < 3) return null;
  const candidates: DetectedLoop[] = selfIntersectionLoops(points);
  if (detectClosedLoop(points)) {
    candidates.push({
      polygon: [...points],
      closure: 'tolerance',
      areaM2: traceAreaM2(points),
      perimeterM: ringPerimeterM(points),
    });
  }
  let best: DetectedLoop | null = null;
  let bestOk: DetectedLoop | null = null;
  for (const c of candidates) {
    if (best === null || c.areaM2 > best.areaM2) best = c;
    if (loopShapeVerdict(c).ok && (bestOk === null || c.areaM2 > bestOk.areaM2)) bestOk = c;
  }
  return bestOk ?? best;
}

export type LoopRejectedReason = 'narrow';

/** Verdict de forme d'une boucle (AMENDEMENT-16 §2, doc §6 « boucle trop fine »). */
export interface LoopShapeVerdict {
  ok: boolean;
  /** 'narrow' si compacité < LOOP_MIN_COMPACTNESS OU largeur < LOOP_MIN_WIDTH_M. */
  reason?: LoopRejectedReason;
  /** Compacité 4πA/P² (1 = cercle, 0 = trait). */
  compactness: number;
  /** Largeur moyenne estimée 2A/P (m) — doc §6 : pas de calcul exotique. */
  widthM: number;
}

/**
 * Anti-abus « boucle trop fine » (AMENDEMENT-16 §2) : une boucle fermée dont
 * la forme est trop étroite (aller-retour sur deux rues parallèles proches)
 * garde sa course et son couloir, mais son INTÉRIEUR est refusé. PURE.
 * Copy UI gelée : « Zone non capturée : forme trop étroite. »
 */
export function loopShapeVerdict(
  loop: Pick<DetectedLoop, 'areaM2' | 'perimeterM'>,
): LoopShapeVerdict {
  const compactness = loop.perimeterM > 0
    ? (4 * Math.PI * loop.areaM2) / (loop.perimeterM * loop.perimeterM)
    : 0;
  const widthM = loop.perimeterM > 0 ? (2 * loop.areaM2) / loop.perimeterM : 0;
  return compactness >= LOOP_MIN_COMPACTNESS && widthM >= LOOP_MIN_WIDTH_M
    ? { ok: true, compactness, widthM }
    : { ok: false, reason: 'narrow', compactness, widthM };
}

// Conversions d'unités — pas des règles de jeu.
const M2_PER_KM2 = 1_000_000;
const M_PER_KM = 1_000;

/**
 * Aire capturable MAXIMALE (m²) d'une boucle pour une course de `distanceM`
 * (AMENDEMENT-16 §2, doc §6 « boucle trop grande ») : interpolation LINÉAIRE
 * de LOOP_MAX_AREA_BY_DISTANCE_KM2 (3→0,25 ; 5→0,8 ; 10→1,8 km²), extrapolée
 * BORNÉE au ratio du palier le plus proche hors bornes (< 3 km : × 0,25/3 par
 * km ; > 10 km : × 1,8/10 par km). PURE, monotone croissante.
 */
export function loopMaxAreaM2(distanceM: number): number {
  const table = LOOP_MAX_AREA_BY_DISTANCE_KM2;
  const dKm = Math.max(0, distanceM) / M_PER_KM;
  const [firstKm, firstKm2] = table[0]!;
  if (dKm <= firstKm) return dKm * (firstKm2 / firstKm) * M2_PER_KM2;
  const [lastKm, lastKm2] = table[table.length - 1]!;
  if (dKm >= lastKm) return dKm * (lastKm2 / lastKm) * M2_PER_KM2;
  for (let i = 1; i < table.length; i++) {
    const [d1, a1] = table[i]!;
    if (dKm > d1) continue;
    const [d0, a0] = table[i - 1]!;
    return (a0 + ((a1 - a0) * (dKm - d0)) / (d1 - d0)) * M2_PER_KM2;
  }
  return lastKm2 * M2_PER_KM2; // inatteignable (dKm < lastKm couvert ci-dessus)
}

/**
 * Plafond de CELLULES INTÉRIEURES d'une boucle pour une course de `distanceM` :
 * aire max (loopMaxAreaM2) ÷ aire moyenne d'une zone res 10 (grille h3, pas
 * une constante de jeu). L'appelant tronque la FIN de la liste enclosedCells
 * (triée par distance croissante au tracé) : seuls les secteurs les plus
 * PROCHES du tracé sont capturés (capReached=true). Le couloir n'est JAMAIS
 * tronqué par ce plafond (la rue courue reste prise) ; MAX_CLAIMS_PER_DAY
 * reste la borne dure du total couloir + intérieur (decideClaims).
 */
export function loopInteriorCellCap(distanceM: number): number {
  return Math.floor(loopMaxAreaM2(distanceM) / getHexagonAreaAvg(H3_RESOLUTION, UNITS.m2));
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
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    const intersects = (yi! > lat) !== (yj! > lat) &&
      lng < ((xj! - xi!) * (lat - yi!)) / (yj! - yi!) + xi!;
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
