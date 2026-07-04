/**
 * GRYD — TERRITOIRES ORGANIQUES (AMENDEMENT-11 §2-3, doc §6/§25).
 * « Pas une grille. Une ville à prendre. » : les hexagones H3 restent le moteur
 * INVISIBLE (fakeHexes → hex_claims au Milestone 2) ; ce module est le pipeline
 * de RENDU qui transforme les cellules par état en zones organiques lissées :
 *   cellules H3 par état → groupement owner/état → fusion des adjacentes
 *   (h3.cellsToMultiPolygon) → simplification légère des contours → lissage
 *   Chaikin (1-2 itérations) → multi-polygones lisses + ancre de label.
 * Les états deviennent des traitements de FRONTIÈRE (doc §8) appliqués par les
 * consommateurs (MapScreen.web SVG / MapScreen natif MapLibre / Route Planner) :
 *   crew       aplat teinté + contour fin semi-lumineux (chartreuse)
 *   rival      contour orange marqué
 *   contested  DOUBLE contour chartreuse+orange, pulse lent
 *   protected  halo verify + UNE icône shield par secteur (labelAnchor)
 *   decay      pointillé + sablier au secteur (muted red si urgent)
 *   objective  zone chaude douce + pin
 *   outpost    petit blob organique
 * AUCUNE cellule neutre n'est produite : le fond neutre = les îlots basemap.
 * Aucune règle de jeu ici — pur rendu, 100 % déterministe (données démo).
 */
import { cellsToMultiPolygon } from 'h3-js';
import { M_PER_DEG_LAT, M_PER_DEG_LNG, type LatLngPoint } from './basemap';
import { battleMapData, type HexState } from './fakeHexes';

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

// ─── Types exportés (consommés par Route Planner / activation en course) ────

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

/** Projection lng/lat → px écran (fournie par l'écran consommateur). */
export type ProjectPoint = (lng: number, lat: number) => { x: number; y: number };

// ─── Modes de carte (AMENDEMENT-11 §3 — remplacent les chips layers) ────────

export type MapMode = 'territoire' | 'route' | 'defense' | 'raid' | 'exploration';

export const MAP_MODE_ORDER: readonly MapMode[] = [
  'territoire',
  'route',
  'defense',
  'raid',
  'exploration',
];

export const MAP_MODE_LABELS: Record<MapMode, string> = {
  territoire: 'Territoire',
  route: 'Route',
  defense: 'Défense',
  raid: 'Raid',
  exploration: 'Exploration',
};

export const DEFAULT_MAP_MODE: MapMode = 'territoire';

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
}

export const MODE_EMPHASIS: Record<MapMode, ModeEmphasis> = {
  // Qui contrôle quoi : tous les territoires pleins, routes en retrait.
  territoire: { crew: 1, rival: 1, contested: 1, defense: 0.85, objective: 0.9, route: 0.45 },
  // Où courir : l'itinéraire domine, les territoires passent en transparence.
  route: { crew: 0.35, rival: 0.35, contested: 0.5, defense: 0.3, objective: 0.75, route: 1 },
  // Zones/rues à sauver en surbrillance, le reste atténué.
  defense: { crew: 0.9, rival: 0.35, contested: 0.6, defense: 1, objective: 0.25, route: 0.5 },
  // Territoires rivaux à traverser.
  raid: { crew: 0.4, rival: 1, contested: 1, defense: 0.3, objective: 0.5, route: 0.7 },
  // Zones vierges + routes à ouvrir.
  exploration: { crew: 0.35, rival: 0.3, contested: 0.35, defense: 0.25, objective: 1, route: 1 },
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
 * PIPELINE COMPLET pour un groupe de cellules (doc §25) : fusion des adjacentes
 * → simplification → lissage Chaikin → Territory. Retourne null si le groupe
 * est vide. Utilisable tel quel par le Route Planner (zones capturables d'un
 * itinéraire) et par la course live (zones qui s'activent au passage).
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

// ─── Territoires de la Battle Map (démo déterministe) ───────────────────────

/**
 * Regroupement owner/état des cellules démo (fakeHexes — H3 invisible) :
 *   crew        = mine + protected + decay (UN territoire fusionné : l'aplat
 *                 et la frontière normale couvrent tout ce que je tiens)
 *   protected   = sous-territoire protégé (halo + shield par-dessus l'aplat crew)
 *   decay       = sous-territoire à défendre (frontière pointillée par-dessus)
 *   decayUrgent = portion urgente (pointillé muted red)
 *   rival / contested / objective / outpost = leurs cellules propres.
 * Les cellules NEUTRES ne produisent AUCUN territoire.
 */
export function battleTerritories(): readonly Territory[] {
  if (cachedTerritories) return cachedTerritories;
  const { collection } = battleMapData();

  const byState = new Map<HexState, string[]>();
  const urgent: string[] = [];
  for (const f of collection.features) {
    const { state, h3, urgent: isUrgent } = f.properties;
    if (state === 'neutral') continue;
    const list = byState.get(state);
    if (list) list.push(h3);
    else byState.set(state, [h3]);
    if (state === 'decay' && isUrgent) urgent.push(h3);
  }

  const crewCells = [
    ...(byState.get('mine') ?? []),
    ...(byState.get('protected') ?? []),
    ...(byState.get('decay') ?? []),
  ];

  const territories: (Territory | null)[] = [
    cellsToTerritory(crewCells, 'crew'),
    cellsToTerritory(byState.get('protected') ?? [], 'protected'),
    cellsToTerritory(byState.get('decay') ?? [], 'decay'),
    cellsToTerritory(urgent, 'decayUrgent'),
    cellsToTerritory(byState.get('foe') ?? [], 'rival'),
    cellsToTerritory(byState.get('contested') ?? [], 'contested'),
    cellsToTerritory(byState.get('objective') ?? [], 'objective'),
    cellsToTerritory(byState.get('outpost') ?? [], 'outpost'),
  ];
  cachedTerritories = territories.filter((t): t is Territory => t !== null);
  return cachedTerritories;
}

let cachedTerritories: readonly Territory[] | null = null;

// ─── Sorties de rendu ───────────────────────────────────────────────────────

/**
 * Chemin SVG (fill-rule evenodd : les trous restent des trous) d'un territoire
 * projeté en px écran — pour le rendu SVG web.
 */
export function territoryPath(territory: Territory, project: ProjectPoint): string {
  let d = '';
  for (const poly of territory.polygons) {
    for (const ring of poly) {
      ring.forEach((pt, i) => {
        const { x, y } = project(pt[0], pt[1]);
        d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
      });
      d += ' Z ';
    }
  }
  return d.trim();
}

/** GeoJSON minimal typé localement (pas de dépendance @types/geojson). */
export interface TerritoryFeature {
  type: 'Feature';
  geometry: {
    type: 'MultiPolygon';
    /** polygones → anneaux FERMÉS (GeoJSON) → positions [lng, lat]. */
    coordinates: number[][][][];
  };
  properties: {
    state: TerritoryState;
    /** Vocabulaire visible : nombre de zones du territoire. */
    zones: number;
  };
}

export interface TerritoryFeatureCollection {
  type: 'FeatureCollection';
  features: TerritoryFeature[];
}

/**
 * Multi-polygones fusionnés au format GeoJSON — source unique pour le rendu
 * natif MapLibre (FillLayer/LineLayer filtrés par `state`).
 */
export function territoriesToGeoJSON(
  territories: readonly Territory[],
): TerritoryFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: territories.map((t) => ({
      type: 'Feature',
      geometry: {
        type: 'MultiPolygon',
        coordinates: t.polygons.map((poly) =>
          poly.map((ring) => {
            const closed = ring.map((p) => [p[0], p[1]]);
            const first = ring[0];
            if (first) closed.push([first[0], first[1]]);
            return closed;
          }),
        ),
      },
      properties: { state: t.state, zones: t.zoneCount },
    })),
  };
}
