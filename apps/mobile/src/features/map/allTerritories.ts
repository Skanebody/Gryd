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
import {
  colors,
  gameColors,
  roleColor,
  type SectorStatusKey,
  SECTOR_STATUS_LEVELS,
} from '@klaim/shared';
import type { RealMapBounds, RealMapPointLayer } from '../../ui/game';
// Type seul (effacé à la compilation) : allTerritories reste un module UI pur,
// il n'embarque ni React ni le client Supabase de hexClaims.
import type { RealTerritory } from './hexClaims';
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
import { territoryId, type TerritoryId, type TerritoryState } from './territory';

// ─── Constantes de rendu (UI uniquement — pas des règles de jeu) ────────────

/**
 * Zoom SEUIL de lisibilité (§4bis) : en dessous, les tracés sont sub-pixel —
 * chaque territoire est représenté par un marqueur-point + label ville ;
 * au-dessus, les tracés nets reprennent (et les gros labels disparaissent).
 * Appliqué en maxzoom MapLibre sur les DEUX cartes.
 * AMENDEMENT-37 §6 (couture LOD) : porté 9 → 10 pour que les MARQUEURS-POINTS
 * villes tiennent jusqu'au seuil des SECTEURS (SECTOR_MIN_ZOOM = 10) — plus de
 * trou de lecture z9-11 entre dots et secteurs (handoff net au bord de bande
 * pays z6-9 / métropole z10-12).
 */
export const TERRITORY_DOT_MAX_ZOOM = 10;

/** Marqueur-point : taille minimale lisible au niveau monde (~10 px de Ø). */
const TERRITORY_DOT_RADIUS_PX = 5;
/**
 * Cerclage (casing) noir du point ville. AMENDEMENT-37 §9 (contraste satellite) :
 * porté 2 → 2,5 px — le dot chartreuse/rival est au « point limite » du garde-fou
 * sur imagerie satellite CLAIRE ; un casing noir plus épais le détache franchement
 * du fond clair sans toucher sa teinte (tokens-only). Neutre sur dark/color.
 */
const TERRITORY_DOT_STROKE_PX = 2.5;
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

/**
 * AMENDEMENT-37 §3 (contrat C1/C4) — IDENTIFIANT DE ZONE stable et unique par
 * FEATURE de territoire. Il est posé dans les `properties` GeoJSON (lu par
 * `['get','zoneId']` côté rendu et par le TAP → sheet de zone, contrat partagé).
 * Source UNIQUE des clés : `ZONE_DETAILS` (demo.ts) les réutilise à l'identique
 * pour que le tap retrouve toujours le bon détail. Étiquettes Paris/Lille/Lyon —
 * données démo déterministes, ZÉRO ranking européen fabriqué (garde-fou CLAUDE.md).
 */
// Zones DÉMO : slugs lisibles, passés par `territoryId()` — le type est opaque, donc
// démo et réel (cellules H3) cohabitent sans que l'un ferme la porte à l'autre.
export const TERRITORY_ZONE_IDS = {
  republique: territoryId('republique'),
  quaiValmy: territoryId('quai-valmy'),
  lilleCentre: territoryId('lille-centre'),
  placeRepublique: territoryId('place-republique'),
  avenueRepublique: territoryId('avenue-republique'),
  avenueRepubliqueFin: territoryId('avenue-republique-fin'),
  faubourgTemple: territoryId('faubourg-temple'),
  lyonRhone: territoryId('lyon-rhone'),
  canalEst: territoryId('canal-est'),
  squareVillemin: territoryId('square-villemin'),
  bastille: territoryId('bastille'),
} as const;

/**
 * Id de zone d'une feature de territoire.
 *
 * AMENDEMENT-39 P0.2 : ce n'est PLUS l'union fermée des 11 zones démo — c'était le
 * verrou qui empêchait d'afficher de vraies captures (hex_claims ne connaît aucun de
 * ces slugs) et qui se serait re-fermé au prochain ajout. C'est désormais un
 * identifiant OPAQUE (`TerritoryId`) : les zones démo gardent leurs slugs lisibles,
 * les zones réelles utilisent leur cellule H3 parente (stable, deep-linkable).
 * Alias conservé pour ne pas casser les consommateurs (tap, dimming).
 */
export type TerritoryZoneId = TerritoryId;

/** GeoJSON exige un anneau FERMÉ (dernier point = premier). */
function closeRing(ring: [number, number][]): [number, number][] {
  const first = ring[0];
  return first ? [...ring, first] : ring;
}

function polygonFeature(
  state: TerritoryState,
  zoneId: TerritoryZoneId,
  ring: [number, number][],
): GameFeature {
  const closed = closeRing(ring);
  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [closed] },
    // `zoneId` (contrat C1) : lu au TAP (queryRenderedFeatures) et au dimming.
    properties: { state, zoneId },
  };
}

function lineFeature(
  state: TerritoryState,
  zoneId: TerritoryZoneId,
  trace: readonly LatLngPoint[],
): GameFeature {
  return {
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: trace.map((p) => [p.lng, p.lat]) },
    properties: { state, zoneId },
  };
}

function collection(features: GameFeature[]): GameCollection {
  return { type: 'FeatureCollection', features };
}

// ─── Possessions par état (une seule source pour les deux cartes) ───────────

/**
 * Territoires RÉELS (hex_claims fusionnés) → GeoJSON par état.
 *
 * P0.2 : un territoire réel est un multi-polygone d'hexes fusionnés — il peut
 * légitimement avoir des TROUS (un hex volé au milieu de ma zone). On garde donc
 * TOUS les anneaux (`rings`), là où `polygonFeature` n'en prend qu'un : perdre un
 * trou ferait mentir la carte en peignant comme mien un hex qui ne l'est pas.
 *
 * `zoneId` porte le `territoryId` (cellule H3 parente) → le tap (contrat C1) et le
 * dimming marchent sur le réel EXACTEMENT comme sur la démo, sans les toucher.
 */
export function realTerritoriesToGeo(
  real: readonly RealTerritory[],
): ReadonlyMap<TerritoryState, GameCollection> {
  const byState = new Map<TerritoryState, GameFeature[]>();
  for (const territory of real) {
    const { status, territoryId: zoneId } = territory.props;
    const features = byState.get(status) ?? [];
    for (const rings of territory.polygons) {
      if (rings.length === 0) continue;
      features.push({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: rings.map(closeRing) },
        properties: { state: status, zoneId },
      });
    }
    byState.set(status, features);
  }
  const out = new Map<TerritoryState, GameCollection>();
  for (const [state, features] of byState) out.set(state, collection(features));
  return out;
}

/**
 * GeoJSON par état de territoire — LA source des deux cartes.
 *
 * FIN DU MODE VITRINE (21/07/2026) : `real` est REQUIS et NON-NULLABLE. Il n'y a
 * plus de branche démo. `real: []` rend une carte VIDE — c'est volontaire : un
 * joueur qui n'a rien capturé doit voir qu'il n'a rien capturé, y compris pendant
 * que la lecture est en vol (l'appelant passe `[]`, jamais un faux Paris conquis).
 *
 * Aucun cache ici : le réel change à chaque capture, et un cache de module
 * survivrait au changement de joueur — la carte afficherait le territoire du
 * compte précédent.
 */
export function territoryGeoByState(
  real: readonly RealTerritory[],
): ReadonlyMap<TerritoryState, GameCollection> {
  return realTerritoriesToGeo(real);
}


/**
 * §C — Zoom SEUIL d'apparition des SECTEURS agrégés (disques de statut) + de
 * leurs badges texte. Sous ce zoom (pays/monde) un disque de ~130 m est
 * sub-pixel et un badge serait un amas → les MARQUEURS-POINTS villes
 * (territory-dots, borné en maxZoom TERRITORY_DOT_MAX_ZOOM) portent seuls la
 * lecture ; au-dessus, les secteurs et badges prennent le relais. Défini ICI
 * (sibling de TERRITORY_DOT_MAX_ZOOM, la LOD des points) et RÉUTILISÉ par
 * mapStyle pour les disques — dépendance à sens unique mapStyle → allTerritories
 * (aucun cycle). Constante de RENDU (LOD), pas une règle de jeu.
 * AMENDEMENT-37 §6 (couture LOD) : abaissé 11 → 10 pour ALIGNER les secteurs sur
 * la bande MÉTROPOLE (z10-12) de l'étude §11 et FERMER le trou z9-11 : les dots
 * villes tiennent jusqu'à z10 (TERRITORY_DOT_MAX_ZOOM), les secteurs prennent le
 * relais dès z10 — handoff continu, plus de bande morte.
 */
export const SECTOR_MIN_ZOOM = 10;

/**
 * AMENDEMENT-37 §5/§6 — Zoom SEUIL d'apparition des TRACÉS DE TERRITOIRE (bande
 * QUARTIER, étude §11 : z13-15). Sous ce zoom, la lecture « qui possède quoi »
 * est portée par les VILLES (dots, ≤ TERRITORY_DOT_MAX_ZOOM) puis les SECTEURS
 * (disques + badges, ≥ SECTOR_MIN_ZOOM) ; les tracés fins de territoire
 * n'apparaissent qu'au quartier, sinon ils sont sub-pixel et bruités au dézoom.
 * Consommé par mapStyle (territoryStateLayers gèle la largeur des couches ligne
 * de territoire à 0 sous ce zoom). Constante de RENDU (LOD), pas une règle de jeu.
 */
export const TERRITORY_TRACE_MIN_ZOOM = 13;

/**
 * AMENDEMENT-37 §6 + étude §11 (bande MÉTROPOLE z10-12) — Zoom SEUIL du % de
 * CONTRÔLE dominant par secteur. Aligné sur SECTOR_MIN_ZOOM : le % apparaît AVEC
 * les disques de secteur, pour répondre « qui contrôle quoi » DÈS le dézoom
 * métropole — sans attendre le tap (le blason/nom du crew, eux, restent au tap,
 * §9 : jamais de nom de crew fabriqué au dézoom). Constante de RENDU (LOD), pas
 * une règle de jeu.
 */
export const SECTOR_PCT_MIN_ZOOM = SECTOR_MIN_ZOOM;

/**
 * AMENDEMENT-37 §6 + étude §11 (bord QUARTIER z13) — Zoom PLAFOND du % de
 * contrôle : au quartier, les TRACÉS de territoire + frontières + missions
 * (≥ TERRITORY_TRACE_MIN_ZOOM) prennent le relais de l'agrégat « % de secteur »,
 * qui s'efface pour ne pas DOUBLER l'info fine (et rester hors du budget ≤ 3
 * labels du quartier, §15). Constante de RENDU (LOD), pas une règle de jeu.
 */
export const SECTOR_PCT_MAX_ZOOM = TERRITORY_TRACE_MIN_ZOOM;

/**
 * §C — Libellés COURTS des badges de statut (jamais tronqués, §A9). Source
 * UNIQUE de ce wording, réutilisée par mapStyle (SECTOR_STATUS_SPEC.badgeLabel)
 * — pas de duplication. `null` = pas de badge (stable muet ; pression = simple
 * halo orange sur la carte, sans bandeau permanent — §C).
 */
export const SECTOR_BADGE_LABELS: Record<SectorStatusKey, string | null> = {
  stable: null,
  pression: 'Canal actif',
  contestee: 'Zone contestée',
  attaque: 'Attaque en cours',
  urgence: 'À sauver',
} as const;

/**
 * §A (anti-redondance §A20 + §A9 texte-non-masqué) — Secteur du FOYER de l'ego
 * (« République », DEFENSE_SECTOR) dont le badge de statut est SUPPRIMÉ sur la
 * Carte : le header permanent dit déjà « République attaquée » / « 3 zones à
 * sauver ». Un second badge « Zone contestée » posé sur ce même secteur ferait
 * DOUBLON avec le header ET, l'ego étant centré, tomberait sous le bandeau
 * (texte partiellement masqué — interdit §A9). Les badges des AUTRES secteurs
 * (Canal « Attaque en cours », Louis-Blanc « À sauver »…) restent affichés :
 * eux seuls apportent une info que le header ne porte pas.
 */
const EGO_HOME_SECTOR_ID = 'paris-villemin';

/**
 * AMENDEMENT-37 §7.1 (étude carte 2026) — OPACITÉ = FORCE de contrôle, au niveau
 * SECTEUR. La teinte des LABELS de secteur (badge de statut + % de contrôle) est
 * modulée en OPACITÉ par MON emprise (view.minePercent) : un secteur tenu FORT se
 * lit à pleine opacité, un secteur faiblement tenu est LÉGÈREMENT atténué — une
 * nuance de PROFONDEUR (« qui tient fort vs faiblement »), jamais un clignotement
 * ni un label qui disparaît. Bande VOLONTAIREMENT ÉTROITE : le plancher reste très
 * lisible. Seule la TEINTE du label porte l'atténuation ; le halo/casing noir
 * restent PLEINS (contraste garanti sur les deux fonds, §9). N'affecte JAMAIS les
 * aplats de possession des territoires (tunés). Constantes de RENDU (LOD/force),
 * pas des règles de jeu.
 */
const SECTOR_FORCE_ALPHA_MIN = 0.75;
const SECTOR_FORCE_ALPHA_MAX = 1;

/**
 * Teinte de token de RÔLE (#RRGGBB) modulée en opacité par la FORCE (minePercent
 * 0-1) → chaîne `rgba()` (forme la plus portable web + natif/Hermes ; on n'ajoute
 * jamais d'alpha à un token déjà en rgba()). Format DÉTERMINISTE (pas d'Intl).
 * Emprise faible → SECTOR_FORCE_ALPHA_MIN ; emprise pleine → SECTOR_FORCE_ALPHA_MAX.
 */
function withForceAlpha(hexColor: string, minePercent: number): string {
  // Défensif : ne module QUE des tokens hex #RRGGBB. Tout autre format (déjà en
  // rgba(), nommé…) est renvoyé tel quel plutôt que produire un rgba(NaN,…).
  if (hexColor.length !== 7 || hexColor[0] !== '#') return hexColor;
  const clamped = minePercent < 0 ? 0 : minePercent > 1 ? 1 : minePercent;
  const alpha =
    SECTOR_FORCE_ALPHA_MIN + (SECTOR_FORCE_ALPHA_MAX - SECTOR_FORCE_ALPHA_MIN) * clamped;
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
}

/** Point du badge de statut (rayon) — petit, le libellé porte l'info. */
const SECTOR_BADGE_DOT_RADIUS_PX = 3;
/**
 * Casing noir du point de secteur (badge de statut + ancre du % de contrôle).
 * AMENDEMENT-37 §9 (contraste satellite) : porté 1,5 → 2 px — un casing plus épais
 * détache le disque de statut/% de l'imagerie satellite CLAIRE (point limite du
 * garde-fou « jamais chartreuse sur fond clair »), sans changer la teinte. Neutre
 * sur fond dark/color (le casing noir se fond dans les tuiles sombres).
 */
const SECTOR_BADGE_DOT_STROKE_PX = 2;
const SECTOR_BADGE_LABEL_SIZE_PX = 11;
const SECTOR_BADGE_LABEL_OFFSET_EM = 1;
const SECTOR_BADGE_LABEL_LETTER_SPACING_EM = 0.02;

/**
 * Label % de contrôle : posé AU-DESSUS du point (offset NÉGATIF) pour ne pas
 * entrer en collision avec le badge de statut du même secteur (posé EN DESSOUS,
 * SECTOR_BADGE_LABEL_OFFSET_EM). Le point réutilise la taille du badge de statut
 * (même ancre visuelle — si les deux calques coïncident, un seul disque se voit).
 */
const SECTOR_PCT_LABEL_SIZE_PX = 12;
const SECTOR_PCT_LABEL_OFFSET_EM = -1;
const SECTOR_PCT_LABEL_LETTER_SPACING_EM = 0.02;

// ─── Bounds de l'ensemble des possessions (caméra d'ouverture, §4bis) ───────

