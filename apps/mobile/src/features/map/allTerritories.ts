/**
 * GRYD — SOURCE UNIQUE des possessions démo (AMENDEMENT-13 §4bis + §4ter).
 * « Tous les territoires pris rendent sur les DEUX cartes » et « la frontière
 * EST le tracé du coureur » : ce module construit TOUTES les possessions
 * Saison 0 en GÉOMÉTRIES TRACÉ-BASED depuis les tracés réels (realAnchors /
 * franceTerritories — ROUTÉS SUR LE RÉSEAU VIAIRE : OSRM foot / ways OSM
 * figés à l'authoring, « pas de vol d'oiseau », aucun segment ne coupe un
 * îlot bâti) — plus AUCUN lissage Chaikin de cellules à l'affichage (fini les
 * contours « pétales » ; les cellules H3 restent la vérité serveur invisible,
 * capture/score) :
 *   - ZONE (boucle fermée) : le polygone affiché EST le tracé de course —
 *     grande boucle République/Parmentier/Voltaire, petite boucle de la place
 *     (protégé), square Villemin (objectif), place de la Bastille
 *     (avant-poste), boucle Lille ;
 *   - COULOIR (course sans boucle) : ruban NET le long du tracé (~2 zones
 *     ≈ 60 m de large, bords parallèles, extrémités arrondies) — quai de
 *     Valmy (crew), queue d'avenue de la République (decay), Faubourg-du-
 *     Temple (rival), berges du Rhône à Lyon (rival) ;
 *   - CONTESTÉ : plus de blob — la PORTION de tracé partagée entre deux crews
 *     (croisement du canal) servie en LineString, rendue en double trait
 *     chartreuse+orange décalé (line-offset), pulse conservé.
 * S'y ajoutent (§4bis) : le calque de MARQUEURS-POINTS villes pour la
 * lisibilité au dézoom (sous TERRITORY_DOT_MAX_ZOOM — layers MapLibre
 * minzoom/maxzoom, le seuil suit le zoom RÉEL de la caméra, jamais un état de
 * vue React) et les bounds de l'ENSEMBLE des possessions (ouverture « Mon
 * territoire » en fitBounds, pas un cadrage France codé en dur). Aucun
 * filtrage par viewport (volumes MVP négligeables). UI pure — aucune règle de
 * jeu (la CAPTURE reste France entière, AMENDEMENT-02).
 */
import { colors, gameColors } from '@klaim/shared';
import type { RealMapBounds, RealMapPointLayer } from '../../ui/game';
import {
  FRANCE_CITIES_DEMO,
  LILLE_BOUCLE,
  LYON_BERGES_RHONE,
} from '../territory/franceTerritories';
import {
  AVENUE_DE_LA_REPUBLIQUE,
  BOUCLE_BASTILLE,
  BOUCLE_PLACE_REPUBLIQUE,
  BOUCLE_REPUBLIQUE,
  BOUCLE_SQUARE_VILLEMIN,
  QUAI_VALMY,
  REAL_M_PER_DEG_LAT,
  RUE_FAUBOURG_DU_TEMPLE,
  type LatLngPoint,
} from './realAnchors';
import type { TerritoryState } from './territory';

// ─── Constantes de rendu (UI uniquement — pas des règles de jeu) ────────────

/**
 * Zoom SEUIL de lisibilité (§4bis) : en dessous, les tracés sont sub-pixel —
 * chaque territoire est représenté par un marqueur-point + label ville ;
 * au-dessus, les tracés nets reprennent (et les gros labels disparaissent).
 * Appliqué en maxzoom MapLibre sur les DEUX cartes.
 */
export const TERRITORY_DOT_MAX_ZOOM = 9;

/** Marqueur-point : taille minimale lisible au niveau monde (~10 px de Ø). */
const TERRITORY_DOT_RADIUS_PX = 5;
/** Cerclage noir du point (détache le point des tuiles sombres). */
const TERRITORY_DOT_STROKE_PX = 2;
/** Label ville sous le point (mêmes proportions que l'ex-CityMarkerBadge). */
const TERRITORY_LABEL_SIZE_PX = 10;
const TERRITORY_LABEL_OFFSET_EM = 0.8;
const TERRITORY_LABEL_LETTER_SPACING_EM = 0.1;

/**
 * Demi-largeur du ruban couloir (§4ter : ~2 zones ≈ 60 m au total).
 * Exporté : Route Planner / Course Live / before-after réutilisent LE MÊME
 * ruban (§4ter vaut pour toutes les surfaces — jamais recréé ailleurs).
 */
export const CORRIDOR_HALF_WIDTH_M = 30;
/** Segments des extrémités ARRONDIES du ruban (§4ter). */
const RIBBON_CAP_STEPS = 6;
/** Limite de miter des coins du ruban (évite les pointes aux angles fermés). */
const RIBBON_MITER_LIMIT = 2;

/**
 * Découpe du tracé avenue de la République (§4ter) : la boucle crew tourne
 * rue Saint-Maur au métro Parmentier (waypoint 2) — la QUEUE du tracé
 * au-delà est le couloir en DECAY (pointillé), dont la fin est URGENTE.
 */
const DECAY_FROM_WAYPOINT = 2;
const DECAY_URGENT_FROM_WAYPOINT = 4;
/**
 * Bout de tracé PARTAGÉ entre les deux crews (§4ter — contesté) : les 2
 * derniers waypoints du Faubourg-du-Temple (croisement du canal), rendus en
 * double trait décalé. Le reste du tracé rival est un ruban orange.
 */
const CONTESTED_TRACE_WAYPOINTS = 2;

type GameCollection = RealMapPointLayer['data'];
type GameFeature = GameCollection['features'][number];

// ─── Géométrie tracé → polygone (§4ter — coins nets, jamais de Chaikin) ─────

/** Projection locale en mètres (précision largement suffisante à ces échelles). */
function toLocalMeters(points: readonly LatLngPoint[]): { x: number; y: number }[] {
  const first = points[0];
  const lat0 = first?.lat ?? 0;
  const lng0 = first?.lng ?? 0;
  const mPerDegLng = REAL_M_PER_DEG_LAT * Math.cos((lat0 * Math.PI) / 180);
  return points.map((p) => ({
    x: (p.lng - lng0) * mPerDegLng,
    y: (p.lat - lat0) * REAL_M_PER_DEG_LAT,
  }));
}

function fromLocalMeters(
  origin: LatLngPoint,
  pts: readonly { x: number; y: number }[],
): [number, number][] {
  const mPerDegLng = REAL_M_PER_DEG_LAT * Math.cos((origin.lat * Math.PI) / 180);
  return pts.map((p) => [origin.lng + p.x / mPerDegLng, origin.lat + p.y / REAL_M_PER_DEG_LAT]);
}

/**
 * RUBAN net le long d'un tracé (couloir §4ter) : bords parallèles au tracé à
 * ±halfWidth, coins en miter borné, extrémités en demi-cercles — un polygone
 * propre qui se lit « itinéraire de course », pas un lobe. Exporté : c'est LA
 * géométrie couloir de toutes les surfaces (Battle Map, planner, live, résultat).
 */
export function ribbonRing(trace: readonly LatLngPoint[], halfWidthM: number): [number, number][] {
  const origin = trace[0];
  if (!origin || trace.length < 2) return [];
  const pts = toLocalMeters(trace);
  const n = pts.length;
  const dirs: { x: number; y: number }[] = [];
  for (let i = 0; i < n - 1; i += 1) {
    const a = pts[i];
    const b = pts[i + 1];
    if (!a || !b) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    dirs.push({ x: dx / len, y: dy / len });
  }
  const left: { x: number; y: number }[] = [];
  const right: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i += 1) {
    const p = pts[i];
    if (!p) continue;
    const dPrev = dirs[Math.max(0, i - 1)] ?? dirs[0];
    const dNext = dirs[Math.min(dirs.length - 1, i)] ?? dPrev;
    if (!dPrev || !dNext) continue;
    // Normale moyenne (miter) bornée par RIBBON_MITER_LIMIT.
    let nx = -(dPrev.y + dNext.y) / 2;
    let ny = (dPrev.x + dNext.x) / 2;
    const nLen = Math.hypot(nx, ny) || 1;
    nx /= nLen;
    ny /= nLen;
    const cosHalf = Math.max(nx * -dNext.y + ny * dNext.x, 1 / RIBBON_MITER_LIMIT);
    const w = halfWidthM / cosHalf;
    left.push({ x: p.x + nx * w, y: p.y + ny * w });
    right.push({ x: p.x - nx * w, y: p.y - ny * w });
  }
  const lastP = pts[n - 1];
  const lastDir = dirs[dirs.length - 1];
  const firstP = pts[0];
  const firstDir = dirs[0];
  if (!lastP || !lastDir || !firstP || !firstDir) return [];
  // Demi-cercle d'extrémité : de la normale gauche vers la droite en passant
  // par la direction du tracé (cap arrondi).
  const cap = (
    center: { x: number; y: number },
    dir: { x: number; y: number },
  ): { x: number; y: number }[] => {
    const startAngle = Math.atan2(dir.x, -dir.y); // angle de la normale gauche
    const out: { x: number; y: number }[] = [];
    for (let s = 1; s < RIBBON_CAP_STEPS; s += 1) {
      const angle = startAngle - (Math.PI * s) / RIBBON_CAP_STEPS;
      out.push({
        x: center.x + Math.cos(angle) * halfWidthM,
        y: center.y + Math.sin(angle) * halfWidthM,
      });
    }
    return out;
  };
  const ring = [
    ...left,
    ...cap(lastP, lastDir),
    ...right.reverse(),
    ...cap(firstP, { x: -firstDir.x, y: -firstDir.y }),
  ];
  return fromLocalMeters(origin, ring);
}

/** Boucle fermée : l'anneau du polygone EST le tracé (waypoints tels quels). */
export function loopRing(trace: readonly LatLngPoint[]): [number, number][] {
  return trace.map((p) => [p.lng, p.lat]);
}

function polygonFeature(state: TerritoryState, ring: [number, number][]): GameFeature {
  const first = ring[0];
  const closed = first ? [...ring, first] : ring;
  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [closed] },
    properties: { state },
  };
}

function lineFeature(state: TerritoryState, trace: readonly LatLngPoint[]): GameFeature {
  return {
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: trace.map((p) => [p.lng, p.lat]) },
    properties: { state },
  };
}

function collection(features: GameFeature[]): GameCollection {
  return { type: 'FeatureCollection', features };
}

// ─── Possessions par état (une seule source pour les deux cartes) ───────────

let geoByStateCache: ReadonlyMap<TerritoryState, GameCollection> | null = null;

/**
 * GeoJSON par état de territoire — calculé une fois (démo déterministe).
 * Les DEUX cartes consomment cette map : la Battle Map rend AUSSI les
 * possessions hors Paris (boucle Lille crew + couloir rival Lyon, mêmes
 * traitements de frontière) — naviguer jusqu'à Lille montre son territoire.
 * Toutes les géométries sont TRACÉ-BASED (§4ter).
 */
export function territoryGeoByState(): ReadonlyMap<TerritoryState, GameCollection> {
  if (geoByStateCache) return geoByStateCache;
  const rivalTraceParis = RUE_FAUBOURG_DU_TEMPLE.slice(
    0,
    RUE_FAUBOURG_DU_TEMPLE.length - CONTESTED_TRACE_WAYPOINTS + 1,
  );
  const contestedTrace = RUE_FAUBOURG_DU_TEMPLE.slice(-CONTESTED_TRACE_WAYPOINTS);
  // AMENDEMENT-16 §0 (retour fondateur) : « je veux JUSTE le tracé ». Un couloir
  // de course (run non bouclé) = LE TRACÉ, une simple ligne le long de la rue —
  // plus de ruban rempli de 60 m qui se lit comme un halo. Seules les BOUCLES
  // fermées gardent un aplat (l'aire enfermée = la zone). ribbonRing n'est donc
  // plus utilisé pour l'affichage des couloirs.
  const byState = new Map<TerritoryState, GameCollection>([
    [
      'crew',
      collection([
        polygonFeature('crew', loopRing(BOUCLE_REPUBLIQUE)),
        lineFeature('crew', QUAI_VALMY),
        polygonFeature('crew', loopRing(LILLE_BOUCLE)),
      ]),
    ],
    [
      'protected',
      collection([polygonFeature('protected', loopRing(BOUCLE_PLACE_REPUBLIQUE))]),
    ],
    [
      'decay',
      collection([lineFeature('decay', AVENUE_DE_LA_REPUBLIQUE.slice(DECAY_FROM_WAYPOINT))]),
    ],
    [
      'decayUrgent',
      collection([
        lineFeature('decayUrgent', AVENUE_DE_LA_REPUBLIQUE.slice(DECAY_URGENT_FROM_WAYPOINT)),
      ]),
    ],
    [
      'rival',
      collection([
        lineFeature('rival', rivalTraceParis),
        lineFeature('rival', LYON_BERGES_RHONE),
      ]),
    ],
    ['contested', collection([lineFeature('contested', contestedTrace)])],
    [
      'objective',
      collection([polygonFeature('objective', loopRing(BOUCLE_SQUARE_VILLEMIN))]),
    ],
    ['outpost', collection([polygonFeature('outpost', loopRing(BOUCLE_BASTILLE))])],
  ]);
  geoByStateCache = byState;
  return byState;
}

/**
 * Ancre du SABLIER du secteur en decay (une icône PAR SECTEUR) : milieu de la
 * portion URGENTE du tracé — remplace l'ancre du pipeline Chaikin (§4ter).
 */
export function decaySablierAnchor(): LatLngPoint {
  const trace = AVENUE_DE_LA_REPUBLIQUE.slice(DECAY_URGENT_FROM_WAYPOINT);
  let lat = 0;
  let lng = 0;
  for (const p of trace) {
    lat += p.lat;
    lng += p.lng;
  }
  const count = Math.max(1, trace.length);
  return { lat: lat / count, lng: lng / count };
}

// ─── Marqueurs-points villes (lisibilité au dézoom, §4bis) ──────────────────

let dotLayersCache: readonly RealMapPointLayer[] | null = null;

/**
 * Calque partagé des possessions au niveau monde/pays : un point coloré
 * (tokens — chartreuse possession / orange rival) + label ville par
 * territoire, borné par TERRITORY_DOT_MAX_ZOOM via minzoom/maxzoom MapLibre.
 * Branché tel quel sur les DEUX cartes (`pointLayers` de RealMap).
 */
export function territoryDotLayers(): readonly RealMapPointLayer[] {
  if (dotLayersCache) return dotLayersCache;
  const data: GameCollection = {
    type: 'FeatureCollection',
    features: FRANCE_CITIES_DEMO.map((city) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [city.center.lng, city.center.lat] },
      properties: {
        label: city.rival ? `${city.label.toUpperCase()} · RIVAL` : city.label.toUpperCase(),
        color: city.rival ? gameColors.rival : colors.chartreuse,
      },
    })),
  };
  dotLayersCache = [
    {
      id: 'territory-dots',
      data,
      maxZoom: TERRITORY_DOT_MAX_ZOOM,
      circleRadius: TERRITORY_DOT_RADIUS_PX,
      circleStrokeColor: colors.noir,
      circleStrokeWidth: TERRITORY_DOT_STROKE_PX,
      textSize: TERRITORY_LABEL_SIZE_PX,
      textOffsetEm: TERRITORY_LABEL_OFFSET_EM,
      textHaloColor: colors.noir,
      textLetterSpacing: TERRITORY_LABEL_LETTER_SPACING_EM,
    },
  ];
  return dotLayersCache;
}

// ─── Bounds de l'ensemble des possessions (caméra d'ouverture, §4bis) ───────

let extentCache: { sw: [number, number]; ne: [number, number] } | null = null;

/** Étend l'enveloppe courante avec une liste de positions [lng, lat]. */
function extendExtent(
  extent: { minLng: number; minLat: number; maxLng: number; maxLat: number },
  positions: readonly (readonly number[])[],
): void {
  for (const pos of positions) {
    const lng = pos[0];
    const lat = pos[1];
    if (lng === undefined || lat === undefined) continue;
    if (lng < extent.minLng) extent.minLng = lng;
    if (lng > extent.maxLng) extent.maxLng = lng;
    if (lat < extent.minLat) extent.minLat = lat;
    if (lat > extent.maxLat) extent.maxLat = lat;
  }
}

/**
 * Enveloppe [sw, ne] de TOUTES les possessions (tous états, toutes villes) —
 * « Mon territoire » s'ouvre en fitBounds dessus, jamais sur un cadrage
 * France figé (les lieux démo sont des DONNÉES, pas une limite du produit).
 */
export function possessionsBounds(paddingPx: number): RealMapBounds {
  if (!extentCache) {
    const extent = { minLng: Infinity, minLat: Infinity, maxLng: -Infinity, maxLat: -Infinity };
    for (const geo of territoryGeoByState().values()) {
      for (const feature of geo.features) {
        const { geometry } = feature;
        if (geometry.type === 'Polygon') {
          for (const ring of geometry.coordinates) extendExtent(extent, ring);
        } else if (geometry.type === 'LineString') {
          extendExtent(extent, geometry.coordinates);
        }
      }
    }
    extentCache = {
      sw: [extent.minLng, extent.minLat],
      ne: [extent.maxLng, extent.maxLat],
    };
  }
  return { sw: [...extentCache.sw], ne: [...extentCache.ne], paddingPx };
}
