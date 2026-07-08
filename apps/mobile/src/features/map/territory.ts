/**
 * GRYD — modes de carte + fusion H3 « comptes » (AMENDEMENT-11, réduit par
 * AMENDEMENT-13 §4ter). Les frontières AFFICHÉES sont désormais les TRACÉS DE
 * COURSE nets d'allTerritories (« la frontière EST le tracé du coureur ») :
 * tout le pipeline de RENDU Chaikin (territoryPath, battleTerritories,
 * territoriesToGeoJSON) est MORT et a été retiré. Restent ici :
 *   - les MODES de carte et leurs emphases (MODE_EMPHASIS — AMENDEMENT-11 §3) ;
 *   - `cellsToTerritory`, conservé UNIQUEMENT pour les clusters France démo
 *     (franceTerritories.franceClusters → zoneCount des KPI « digital twin ») —
 *     ses polygones ne sont plus jamais DESSINÉS (le lissage Chaikin interne
 *     ne produit plus un seul pixel ; les cellules H3 restent le moteur
 *     invisible des comptes).
 * Aucune règle de jeu ici — pur module de présentation, 100 % déterministe.
 */
import { cellsToMultiPolygon } from 'h3-js';
import type { IconName } from '@klaim/shared';
import { M_PER_DEG_LAT, M_PER_DEG_LNG, type LatLngPoint } from './basemap';

// ─── Constantes du pipeline (rendu UI — pas des règles de jeu) ──────────────
/** Itérations de lissage Chaikin (doc §6 : 1-2 — 2 = frontières bien rondes). */
export const CHAIKIN_ITERATIONS = 2;
/** Coupe des coins Chaikin : 0,25 / 0,75 (valeurs canoniques). */
export const CHAIKIN_RATIO = 0.25;
/**
 * Simplification LÉGÈRE avant lissage : un sommet à moins de N mètres du
 * précédent conservé est absorbé (arête d'hex res 10 ≈ 70 m → on ne retire
 * que le bruit, jamais la forme).
 */
export const SIMPLIFY_TOLERANCE_M = 24;
/** En dessous de 4 sommets un anneau n'est plus une surface : jamais simplifié plus bas. */
const MIN_RING_VERTICES = 4;

// ─── Types exportés (états de territoire — consommés par toutes les cartes) ─

/** États de TERRITOIRE rendus (le neutre n'existe pas : c'est la basemap). */
export type TerritoryState =
  | 'crew'
  | 'protected'
  | 'decay'
  | 'decayUrgent'
  | 'rival'
  | 'contested'
  | 'objective'
  | 'outpost';

/** Position [lng, lat] — ordre GeoJSON (h3.cellsToMultiPolygon(_, true)). */
export type LngLat = [number, number];

/** Anneau OUVERT (dernier point ≠ premier) de positions [lng, lat]. */
export type TerritoryRing = LngLat[];

/** Un polygone : anneau extérieur + trous éventuels (index 1+). */
export type TerritoryPolygon = TerritoryRing[];

export interface Territory {
  state: TerritoryState;
  /** Multi-polygone fusionné et LISSÉ : polygones → anneaux → [lng, lat]. */
  polygons: TerritoryPolygon[];
  /** Ancre du plus grand polygone — 1 icône/label PAR SECTEUR (shield, sablier…). */
  labelAnchor: LatLngPoint;
  /** Nombre de ZONES (cellules H3 sous-jacentes) — vocabulaire visible. */
  zoneCount: number;
}

// ─── Modes de carte (UX Phase 2 — 3 calques : Contrôle / Action / Crew) ─────

export type MapMode = 'controle' | 'action' | 'crew';

export const MAP_MODE_ORDER: readonly MapMode[] = ['controle', 'action', 'crew'];

export const MAP_MODE_LABELS: Record<MapMode, string> = {
  controle: 'Contrôle',
  action: 'Action',
  crew: 'Crew',
};

/** Sous-titre court du calque (menu Couches). */
export const MAP_MODE_HINTS: Record<MapMode, string> = {
  controle: 'Qui tient quoi · rival · protection',
  action: 'Défense · route reco · objectif',
  crew: 'Alliés · raids · HQ',
};

export const DEFAULT_MAP_MODE: MapMode = 'controle';

/** Icône du calque (menu « Couches » — 3 modes, UX_UI_SPEC §3.1). */
export const MAP_MODE_ICON: Record<MapMode, IconName> = {
  controle: 'carte',
  action: 'cible',
  crew: 'crew',
};

/** Calque AUTO : défense active → Action ; sinon Contrôle. */
export function autoMapMode(lecture: 'conquete' | 'defense'): MapMode {
  return lecture === 'defense' ? 'action' : 'controle';
}

/**
 * Emphase par mode : opacité (0-1) de chaque famille de couches. UN SEUL mode
 * actif — le reste de la carte s'atténue, jamais ne disparaît brutalement.
 *   crew      aplat + frontière de mon crew (dont avant-poste)
 *   rival     territoire rival
 *   contested zone contestée (double contour)
 *   defense   traitements décay/protégé (pointillé, halo, shield, sablier)
 *   objective objectif / zones à prendre (pin + zone chaude)
 *   route     route ouverte + itinéraires
 */
export interface ModeEmphasis {
  crew: number;
  rival: number;
  contested: number;
  defense: number;
  objective: number;
  route: number;
  /** Alliés opt-in (calque Crew). */
  mates: number;
}

export const MODE_EMPHASIS: Record<MapMode, ModeEmphasis> = {
  controle: {
    crew: 1,
    rival: 1,
    contested: 1,
    defense: 1,
    objective: 0.55,
    route: 0.35,
    mates: 0.4,
  },
  action: {
    crew: 0.55,
    rival: 0.7,
    contested: 0.85,
    defense: 1,
    objective: 1,
    route: 1,
    mates: 0.45,
  },
  crew: {
    crew: 1,
    rival: 0.65,
    contested: 0.7,
    defense: 0.6,
    objective: 0.45,
    route: 0.55,
    mates: 1,
  },
};

// ─── Pipeline géométrique ───────────────────────────────────────────────────

/** Distance approchée (m) entre deux positions [lng, lat] (plan local Paris). */
function metersBetween(a: LngLat, b: LngLat): number {
  return Math.hypot((b[0] - a[0]) * M_PER_DEG_LNG, (b[1] - a[1]) * M_PER_DEG_LAT);
}

/** Retire le point de fermeture éventuel (GeoJSON ferme ses anneaux). */
function openRing(ring: readonly (readonly number[])[]): TerritoryRing {
  const pts: TerritoryRing = ring.map((p) => [p[0] ?? 0, p[1] ?? 0]);
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (pts.length > 1 && first && last && first[0] === last[0] && first[1] === last[1]) {
    pts.pop();
  }
  return pts;
}

/**
 * Simplification légère (distance radiale) : absorbe les sommets à moins de
 * SIMPLIFY_TOLERANCE_M du dernier sommet conservé — jamais sous MIN_RING_VERTICES.
 */
function simplifyRing(ring: TerritoryRing, toleranceM: number): TerritoryRing {
  if (ring.length <= MIN_RING_VERTICES) return ring;
  const out: TerritoryRing = [];
  let kept: LngLat | null = null;
  for (const pt of ring) {
    if (kept === null || metersBetween(kept, pt) >= toleranceM) {
      out.push(pt);
      kept = pt;
    }
  }
  return out.length >= MIN_RING_VERTICES ? out : ring;
}

/** Une passe de lissage Chaikin (coupe de coins) sur un anneau fermé. */
function chaikinOnce(ring: TerritoryRing): TerritoryRing {
  const out: TerritoryRing = [];
  const n = ring.length;
  for (let i = 0; i < n; i += 1) {
    const p = ring[i];
    const q = ring[(i + 1) % n];
    if (!p || !q) continue;
    const r = CHAIKIN_RATIO;
    out.push([p[0] + (q[0] - p[0]) * r, p[1] + (q[1] - p[1]) * r]);
    out.push([p[0] + (q[0] - p[0]) * (1 - r), p[1] + (q[1] - p[1]) * (1 - r)]);
  }
  return out;
}

function smoothRing(ring: TerritoryRing): TerritoryRing {
  let smoothed = simplifyRing(ring, SIMPLIFY_TOLERANCE_M);
  for (let i = 0; i < CHAIKIN_ITERATIONS; i += 1) smoothed = chaikinOnce(smoothed);
  return smoothed;
}

/** Aire signée approx. (m²) d'un anneau — sert à trouver le plus grand polygone. */
function ringAreaM2(ring: TerritoryRing): number {
  let sum = 0;
  const n = ring.length;
  for (let i = 0; i < n; i += 1) {
    const a = ring[i];
    const b = ring[(i + 1) % n];
    if (!a || !b) continue;
    sum += a[0] * M_PER_DEG_LNG * (b[1] * M_PER_DEG_LAT) - b[0] * M_PER_DEG_LNG * (a[1] * M_PER_DEG_LAT);
  }
  return Math.abs(sum / 2);
}

/** Centroïde simple (moyenne des sommets) d'un anneau — suffisant pour un label. */
function ringCentroid(ring: TerritoryRing): LatLngPoint {
  let lng = 0;
  let lat = 0;
  for (const p of ring) {
    lng += p[0];
    lat += p[1];
  }
  const n = Math.max(1, ring.length);
  return { lat: lat / n, lng: lng / n };
}

/**
 * Fusion d'un groupe de cellules en Territory (null si vide). §4ter : SES
 * POLYGONES NE SONT PLUS JAMAIS DESSINÉS — seul consommateur restant :
 * franceTerritories.franceClusters (zoneCount des KPI). Supprimer ce dernier
 * usage emportera tout le pipeline Chaikin ci-dessus avec lui.
 */
export function cellsToTerritory(
  cells: readonly string[],
  state: TerritoryState,
): Territory | null {
  if (cells.length === 0) return null;
  // formatAsGeoJson=true → [lng, lat], anneaux fermés.
  const multi = cellsToMultiPolygon([...cells], true);
  const polygons: TerritoryPolygon[] = multi.map((poly) =>
    poly.map((ring) => smoothRing(openRing(ring))),
  );
  // Ancre = centroïde de l'anneau extérieur du plus grand polygone.
  let bestRing: TerritoryRing | null = null;
  let bestArea = -1;
  for (const poly of polygons) {
    const outer = poly[0];
    if (!outer) continue;
    const area = ringAreaM2(outer);
    if (area > bestArea) {
      bestArea = area;
      bestRing = outer;
    }
  }
  return {
    state,
    polygons,
    labelAnchor: bestRing ? ringCentroid(bestRing) : { lat: 0, lng: 0 },
    zoneCount: cells.length,
  };
}

// (§4ter — battleTerritories / territoryPath / territoriesToGeoJSON, le rendu
// Chaikin de la Battle Map, sont MORTS et retirés : toutes les surfaces
// consomment les tracés nets d'allTerritories. Voir l'en-tête du module.)
