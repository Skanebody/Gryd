/**
 * GRYD — RealMap, variante WEB (AMENDEMENT-13 §1/§4bis) : VRAIES tuiles
 * vectorielles MONDE ENTIER sous les couches de jeu — aucun maxBounds, aucun
 * verrou de zoom : pan/zoom libres du niveau rue au niveau planète (§4bis).
 * `maplibre-gl` (la seule nouvelle dépendance autorisée) est monté dans un
 * conteneur react-native-web ; le CSS MapLibre est importé globalement (Metro
 * web, SDK 52). Style de dev sans clé (dark-matter CARTO) surchargé aux tokens
 * GRYD après chargement — la prod passera à Protomaps (O6) en ne changeant QUE
 * le styleURL.
 *
 * API COMMUNE avec ./RealMap.tsx (natif — fork de plateforme, interfaces
 * dupliquées à l'identique) :
 *   props  { camera?, bounds?, geojsonLayers, pointLayers?, markers?, onPress?,
 *            onZoomChange?, onMapReady?, attributionCompact }
 *   ref    { flyTo(camera), fitBounds(bounds) } — coupés si reduce motion
 * Les couches de jeu restent les polygones ORGANIQUES de territory.ts
 * (AMENDEMENT-11 : zéro hexagone visible). `pointLayers` = marqueurs-points
 * villes bornés par zoom via minzoom/maxzoom MapLibre (§4bis : la lisibilité
 * au dézoom suit le zoom RÉEL, jamais un état React). Les `markers` sont des
 * maplibregl.Marker NATIFS (contenu RN rendu par portal dans l'élément du
 * marker) : ils suivent la caméra sans re-render React par frame
 * (AMENDEMENT-13 §5 — perf). `pulse` anime l'opacité du contour (contesté) via
 * requestAnimationFrame (setPaintProperty — aucun re-render), coupé si
 * prefers-reduced-motion. Attribution © OpenStreetMap © CARTO discrète
 * (obligation légale). Tuiles indisponibles / offline / CONTEXTE WEBGL PERDU →
 * fond noir + message « Carte indisponible — tes zones restent à toi », jamais
 * d'écran blanc — et l'état SE RELÈVE toujours : `webglcontextrestored` et le
 * retour de visibilité de l'onglet tentent map.resize() + rendu, la relève
 * écoute `idle` + succès tuile et un re-test périodique force un rendu.
 */
// CSS global MapLibre — import Metro web (supporté SDK 52).
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Map as MapLibreMap,
  Marker as MapLibreMarker,
  type GeoJSONSource,
  type MapMouseEvent,
  type MapSourceDataEvent,
} from 'maplibre-gl';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fonts, fontSizes, mapTokens, motion } from '@klaim/shared';
import {
  MAP_3D,
  MAP_BASEMAP_STYLES,
  buildings3dStyle,
  type BasemapKey,
} from '../../features/map/mapStyle';

// ─── API commune (dupliquée à l'identique dans RealMap.tsx — fork RN) ───────

/** Style vectoriel sombre de dev SANS CLÉ (AMENDEMENT-13 §1 — O6 pour la prod). */
export const DARK_MAP_STYLE_URL = MAP_BASEMAP_STYLES.dark;

/**
 * Résout le styleURL du fond demandé (défaut sombre). Le fond COULEUR (Voyager)
 * est plutôt clair/beige : les traits de jeu chartreuse reçoivent alors un
 * liseré sombre porteur (withColorCasing, mapStyle) pour rester lisibles.
 */
function basemapStyleUrl(basemap: BasemapKey | undefined): string {
  return MAP_BASEMAP_STYLES[basemap ?? 'dark'];
}

export interface RealMapCamera {
  lng: number;
  lat: number;
  zoom: number;
}

/** Cadrage sur un ensemble de possessions (fitBounds — §4bis). */
export interface RealMapBounds {
  /** Coin sud-ouest [lng, lat]. */
  sw: [number, number];
  /** Coin nord-est [lng, lat]. */
  ne: [number, number];
  /** Marge intérieure du cadrage (px). */
  paddingPx: number;
}

/** Une couche de jeu : source GeoJSON + aplat (fill*) et/ou frontière (line*). */
export interface RealMapGeoJSONLayer {
  /** Identifiant stable de la source (les layers dérivés sont `${id}-fill/-line`). */
  id: string;
  data: GeoJSON.FeatureCollection;
  fillColor?: string;
  fillOpacity?: number;
  lineColor?: string;
  lineWidth?: number;
  /** Pointillé (traitement decay AMENDEMENT-11/§4ter). */
  lineDash?: readonly number[];
  /**
   * Décalage latéral du trait (px, line-offset MapLibre) — double trait du
   * tracé contesté (§4ter : chartreuse/orange de part et d'autre du tracé).
   */
  lineOffset?: number;
  /** Pulse lent du contour (contesté) — coupé si reduce motion. */
  pulse?: boolean;
  /**
   * AMENDEMENT-24 — CARTE 3D : rend l'aplat de cette couche en `fill-extrusion`
   * (volume 3D chartreuse translucide, le look signature GRYD) AU LIEU d'un
   * `fill` plat, MAIS seulement si la carte est en mode 3D (`extrudeZones`).
   * Défaut (`extrude` absent OU `extrudeZones` false) : la zone reste un aplat
   * plat — non-régression totale (Battle Map / Course Live inchangées). La
   * hauteur/base/opacité/couleur du volume sont propres à la couche.
   */
  extrude?: boolean;
  /** Couleur de base du volume extrudé (défaut : `fillColor`). Token only. */
  extrudeColor?: string;
  /** Hauteur du volume (m MapLibre) — douce, le territoire « monte » sans tour. */
  extrudeHeight?: number;
  /** Base du volume (m) — sol par défaut (0). */
  extrudeBase?: number;
  /** Opacité du volume (perLayer — translucide, les rues restent devinables). */
  extrudeOpacity?: number;
}

/**
 * Calque de MARQUEURS-POINTS borné par zoom (AMENDEMENT-13 §4bis — lisibilité
 * au dézoom) : cercle à taille minimale + label, rendus en LAYERS MapLibre
 * (circle + symbol) avec minzoom/maxzoom — le seuil suit le zoom RÉEL de la
 * caméra, jamais un état de vue React. Features attendues : des Points avec
 * properties { label: string; color: string } (couleurs = tokens en amont).
 */
export interface RealMapPointLayer {
  /** Identifiant stable de la source (layers dérivés `${id}-dot/-label`). */
  id: string;
  data: GeoJSON.FeatureCollection;
  /** Peint seulement SOUS ce zoom (maxzoom MapLibre). */
  maxZoom?: number;
  /** Peint seulement AU-DESSUS de ce zoom (minzoom MapLibre). */
  minZoom?: number;
  /** Rayon du point (px) — taille minimale lisible au niveau monde. */
  circleRadius: number;
  circleStrokeColor: string;
  circleStrokeWidth: number;
  /** Taille du label (px), posé sous le point. */
  textSize: number;
  /** Décalage vertical du label sous le point (em). */
  textOffsetEm: number;
  textHaloColor: string;
  textLetterSpacing?: number;
}

/** Marker RN positionné au point géo (shield, sablier, pin, mates, POI…). */
export interface RealMapMarker {
  id: string;
  lng: number;
  lat: number;
  children: ReactNode;
}

export interface RealMapPressEvent {
  lng: number;
  lat: number;
}

export interface RealMapRef {
  /** Recentrage fluide (flyTo) — saut direct si reduce motion. */
  flyTo(camera: Partial<RealMapCamera> & { lng: number; lat: number }): void;
  /** Cadre un ensemble de possessions (fitBounds) — saut direct si reduce motion. */
  fitBounds(bounds: RealMapBounds): void;
}

export interface RealMapProps {
  /**
   * Caméra contrôlée : appliquée au montage puis à chaque changement (easeTo).
   * Fournir `camera` OU `bounds` — sans l'un ni l'autre, ouverture monde.
   */
  camera?: RealMapCamera;
  /**
   * Cadrage d'OUVERTURE en fitBounds (§4bis — « Mon territoire » s'ouvre sur
   * l'ensemble des possessions). Prioritaire sur `camera`.
   */
  bounds?: RealMapBounds;
  /** Couches de jeu, peintes dans l'ordre du tableau (la dernière au-dessus). */
  geojsonLayers: readonly RealMapGeoJSONLayer[];
  /** Calques de points bornés par zoom (§4bis), peints AU-DESSUS des couches. */
  pointLayers?: readonly RealMapPointLayer[];
  markers?: readonly RealMapMarker[];
  onPress?: (event: RealMapPressEvent) => void;
  /** Zoom courant, notifié à chaque mouvement de caméra (seuils UI §4bis). */
  onZoomChange?: (zoom: number) => void;
  /**
   * WEB UNIQUEMENT : reçoit l'instance maplibre-gl dès sa création — permet de
   * scoper échelle/outils à CETTE carte (plusieurs cartes montées en même
   * temps : aperçu Profil + onglet Carte). Jamais appelé par le fork natif.
   */
  onMapReady?: (map: MapLibreMap) => void;
  /** Attribution compacte © OpenStreetMap © CARTO (défaut true — obligatoire). */
  attributionCompact?: boolean;
  /**
   * Fond de carte : 'dark' (défaut, dark-matter) | 'color' (Voyager, type Plan).
   * `setStyle()` MapLibre EFFACE les sources/couches custom : le parent remonte
   * donc la carte via une `key` incluant ce fond (unmount/remount → l'effet
   * `load` réajoute les couches de jeu sur le nouveau style).
   */
  basemap?: BasemapKey;
  /**
   * AMENDEMENT-20 §1 — CARTE SILENCIEUSE pendant le run : masque les labels de
   * quartiers/lieux/plans d'eau/POI (le tracé vert prime) et amincit les rues
   * secondaires. Activé aussi implicitement pour la carte de Course Live
   * (testID `course-live-carte-reelle`). Sans effet sur le fond COULEUR (Voyager)
   * et sur la Battle Map (labels conservés). N'affecte JAMAIS les couches de jeu.
   */
  silent?: boolean;
  /**
   * AMENDEMENT-24 — CARTE 3D : inclinaison de la caméra (degrés). Défaut 0 =
   * carte PLATE (2D actuelle) — non-régression totale. La « Carte 3D » de
   * partage passe ~55° : le fond dark se PITCHE (relief de perspective) et les
   * zones marquées `extrude` s'élèvent en volume. Aucun provider requis (pitch
   * et fill-extrusion sont natifs MapLibre — données de zone = les nôtres).
   */
  pitch?: number;
  /** Cap de la caméra (degrés). Défaut 0. La perspective 3D de partage cape ~-18°. */
  bearing?: number;
  /**
   * AMENDEMENT-24 — CARTE 3D : rend les couches marquées `extrude` en volume 3D
   * (`fill-extrusion`) plutôt qu'en aplat plat. Défaut false = aplat plat
   * (2D actuelle). N'affecte QUE les couches qui portent elles-mêmes `extrude`.
   */
  extrudeZones?: boolean;
  /**
   * AMENDEMENT-26 — VUE 3D, prop de CONVENANCE : `true` = GRYD 3D Conquest
   * (carte pitchée ~52° + zones capturées extrudées en volume). Elle ne fait que
   * fournir un DÉFAUT à `pitch` et `extrudeZones` : un `pitch`/`extrudeZones`
   * passés EXPLICITEMENT priment toujours (le partage/l'historique gardent leur
   * pitch ~55° et leur extrusion — aucune régression). `false` (défaut) = 2D
   * actuelle STRICTEMENT inchangée (pitch 0, aplats plats). C'est le SEUL levier
   * dont les surfaces de carte ont besoin : elles branchent `mode3d={map3d}` sur
   * la préférence `gryd.map3d` (mapPref) et laissent RealMap gérer le rendu.
   * Pur affichage — zéro impact gameplay (le serveur décide du claim).
   */
  mode3d?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

// ─── Constantes de rendu (UI uniquement — pas des règles de jeu) ────────────

/** Message offline imposé (AMENDEMENT-13 §5). */
const OFFLINE_MESSAGE = 'Carte indisponible — tes zones restent à toi';
/**
 * AMENDEMENT-26 — VUE 3D : pitch de convenance appliqué quand `mode3d` est vrai
 * SANS `pitch` explicite (dans la fourchette ~50-55° de l'amendement). Le partage
 * et l'historique passent leur propre pitch (~55°) et ne sont donc pas touchés.
 * UI pure — aucune règle de jeu.
 */
const MODE_3D_DEFAULT_PITCH = 52;
/** Période du pulse contesté (lent, doc §8). */
const PULSE_PERIOD_MS = 2_400;
/** Amplitude du pulse : l'opacité du contour oscille entre min et 1. */
const PULSE_MIN_OPACITY_RATIO = 0.35;
/** Labels des tuiles atténués (sobriété AMENDEMENT-13 §5). */
const TILE_LABEL_OPACITY = 0.55;
const TILE_ICON_OPACITY = 0.35;
/**
 * AMENDEMENT-20 §1 — CARTE SILENCIEUSE pendant le run. Les labels de QUARTIERS /
 * lieux / plans d'eau / POI sont MASQUÉS (le tracé vert doit primer sur tout) :
 * on éteint les calques `symbol` dont la `source-layer` de tuile vectorielle
 * appartient à ce set. `place` = quartiers/arrondissements/villes (RÉPUBLIQUE,
 * 3E ARRONDISSEMENT, GRANGE AUX BELLES), `water_name`/`waterway` = bassins/canaux
 * (Bassin de la Villette, Écluse du Temple), `poi`/`housenumber`/`mountain_peak`
 * = points d'intérêt et numéros. Les NOMS DE RUES (`transportation_name`) restent
 * (repère utile au coureur), mais les rues secondaires (lignes) sont amincies.
 */
const SILENT_HIDDEN_SYMBOL_SOURCE_LAYERS: readonly string[] = [
  'place',
  'water_name',
  'waterway',
  'poi',
  'housenumber',
  'mountain_peak',
];
/** Facteur d'amincissement des rues secondaires en mode silencieux (§1). */
const SILENT_MINOR_ROAD_WIDTH_FACTOR = 0.6;
/** TestID de la carte de Course Live (LiveNavMap) → mode silencieux implicite. */
const LIVE_RUN_TEST_ID = 'course-live-carte-reelle';
/** Caméra de secours si ni `camera` ni `bounds` : monde entier (§4bis). */
const WORLD_FALLBACK_CAMERA: RealMapCamera = { lng: 0, lat: 20, zoom: 1 };
/**
 * Polices des labels de points : piles de glyphes présentes dans le style
 * CARTO dark-matter (la prod Protomaps devra fournir les mêmes stacks — O6).
 */
const POINT_LABEL_FONTS = ['Montserrat Medium', 'Open Sans Bold', 'Noto Sans Regular'];
const POINT_LABEL_HALO_WIDTH = 1.2;
/**
 * L'état offline ne se relève (`idle`/succès tuile) que si aucune erreur
 * tuile n'est survenue récemment (les tuiles en échec produisent aussi un
 * `idle`).
 */
const OFFLINE_CLEAR_QUIET_MS = 1_500;
/**
 * Tant que l'état offline est affiché, on force un rendu à cette période
 * (> OFFLINE_CLEAR_QUIET_MS) pour que `idle` retombe et relève l'état après
 * une erreur TRANSITOIRE (blip réseau, une tuile isolée) même sans
 * interaction — l'overlay ne doit JAMAIS rester bloqué (AMENDEMENT-13 §5).
 */
const OFFLINE_RECHECK_MS = 2_000;

/**
 * `map.on('error')` capte N'IMPORTE quelle erreur MapLibre — on ne passe
 * offline que pour une vraie indisponibilité tuiles/style : jamais pour une
 * source de JEU locale (GeoJSON — toujours disponible), et seulement pour
 * les échecs réseau (AJAXError = HTTP tuiles/style/glyphes, fetch coupé…).
 * Événement sans cause identifiable → prudence : offline (l'état se relève
 * tout seul désormais).
 */
function isTilesAvailabilityError(event: unknown, gameSourceIds: readonly string[]): boolean {
  const e = event as { error?: unknown; sourceId?: string };
  if (typeof e.sourceId === 'string' && gameSourceIds.includes(e.sourceId)) return false;
  if (e.error instanceof Error) {
    if (e.error.name === 'AJAXError') return true;
    return /fetch|network|tile|glyph|sprite/i.test(e.error.message);
  }
  return true;
}

/** prefers-reduced-motion (web) — jamais d'animation si actif. */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Un calque de tuile vectorielle (JEU exclu) : les couches de JEU sont ajoutées
 * par upsertLayer/upsertPointLayer et n'ont PAS de `source-layer` (source GeoJSON
 * locale). On ne silence donc jamais un tracé/territoire GRYD.
 */
function tileSourceLayer(layer: { 'source-layer'?: string }): string | undefined {
  return layer['source-layer'];
}

/**
 * Amincit une `line-width` MapLibre par un facteur, que ce soit un nombre plat
 * OU une fonction à paliers `{ base?, stops: [[zoom, w], …] }` (cas des styles
 * vectoriels comme CARTO où la largeur dépend du zoom). Renvoie undefined si la
 * forme n'est pas reconnue (on ne touche alors pas au calque).
 */
function scaledLineWidth(width: unknown, factor: number): number | Record<string, unknown> | undefined {
  if (typeof width === 'number') return width * factor;
  if (
    width &&
    typeof width === 'object' &&
    Array.isArray((width as { stops?: unknown }).stops)
  ) {
    const fn = width as { base?: number; stops: [number, number][] };
    return {
      ...fn,
      stops: fn.stops.map(([zoom, w]) => [zoom, w * factor] as [number, number]),
    };
  }
  return undefined;
}

/**
 * AMENDEMENT-20 §1 — CARTE SILENCIEUSE : masque les labels de quartiers/lieux/
 * plans d'eau/POI (source-layer ∈ SILENT_HIDDEN_SYMBOL_SOURCE_LAYERS) et amincit
 * les rues secondaires (lignes `transportation` minor/service). N'agit QUE sur
 * les calques de TUILE (avec `source-layer`) : les calques de jeu (GeoJSON local,
 * sans source-layer) sont laissés intacts. Défensif (try/catch par calque).
 */
function applySilentRunOverrides(map: MapLibreMap): void {
  const layers = map.getStyle()?.layers ?? [];
  for (const layer of layers) {
    try {
      const sourceLayer = tileSourceLayer(layer as { 'source-layer'?: string });
      if (sourceLayer === undefined) continue; // calque de JEU → jamais touché
      if (layer.type === 'symbol') {
        if (SILENT_HIDDEN_SYMBOL_SOURCE_LAYERS.includes(sourceLayer)) {
          // Quartiers/lieux/bassins/POI : totalement masqués pendant le run.
          map.setLayoutProperty(layer.id, 'visibility', 'none');
        }
      } else if (layer.type === 'line' && sourceLayer === 'transportation') {
        // Rues secondaires (minor/service/path) : amincies pour laisser primer
        // le tracé. La largeur peut être un nombre OU une fonction à paliers.
        const id = layer.id.toLowerCase();
        if (id.includes('minor') || id.includes('service') || id.includes('path')) {
          const current = map.getPaintProperty(layer.id, 'line-width');
          const thinned = scaledLineWidth(current, SILENT_MINOR_ROAD_WIDTH_FACTOR);
          if (thinned !== undefined) {
            map.setPaintProperty(layer.id, 'line-width', thinned);
          }
        }
      }
    } catch {
      // Calque sans cette propriété — on n'interrompt jamais le rendu.
    }
  }
}

/**
 * Surcharge du style dark-matter aux tokens GRYD (AMENDEMENT-13 §1) : eau plus
 * sombre, parcs quasi éteints, labels gris discrets. En mode `silent`
 * (AMENDEMENT-20 §1, Course Live) les labels de quartiers/lieux sont ensuite
 * MASQUÉS via applySilentRunOverrides. Défensif : les ids de calques varient
 * selon le style hébergé → filtres par sous-chaîne + try/catch (un style
 * différent ne doit JAMAIS faire tomber la carte).
 */
function applyGrydStyleOverrides(map: MapLibreMap, silent = false): void {
  const layers = map.getStyle()?.layers ?? [];
  for (const layer of layers) {
    try {
      const id = layer.id.toLowerCase();
      if (layer.type === 'background') {
        map.setPaintProperty(layer.id, 'background-color', colors.noir);
      } else if (layer.type === 'fill' && id.includes('water')) {
        map.setPaintProperty(layer.id, 'fill-color', mapTokens.water);
      } else if (
        layer.type === 'fill' &&
        (id.includes('park') || id.includes('green') || id.includes('wood'))
      ) {
        map.setPaintProperty(layer.id, 'fill-color', mapTokens.parks);
      } else if (layer.type === 'symbol') {
        map.setPaintProperty(layer.id, 'text-color', colors.gris);
        map.setPaintProperty(layer.id, 'text-opacity', TILE_LABEL_OPACITY);
        map.setPaintProperty(layer.id, 'icon-opacity', TILE_ICON_OPACITY);
      }
    } catch {
      // Calque sans cette propriété — on n'interrompt jamais le rendu.
    }
  }
  // Carte silencieuse en run : masque quartiers/lieux, amincit rues secondaires.
  if (silent) applySilentRunOverrides(map);
}

/**
 * AMENDEMENT-27 — VRAI 3D : id du layer `fill-extrusion` des bâtiments de la
 * ville (empreintes CARTO extrudées). Séparé des zones de JEU (le territoire),
 * qui montent via leur propre `${id}-extrude` (AMENDEMENT-24).
 */
const CITY_BUILDINGS_LAYER_ID = 'gryd-3d-buildings';

/**
 * AMENDEMENT-27 — VRAI 3D (mode 3D SEULEMENT) : branche le RELIEF du terrain
 * (DEM Terrarium) + extrude les BÂTIMENTS de la ville (source CARTO, source-layer
 * `building`). Charte : bâtiments SOMBRES/désaturés (fond) — insérés SOUS les
 * couches de JEU (`beforeId` = 1re couche de jeu si déjà présente ; sinon
 * appendus AVANT l'upsert des couches de jeu par l'appelant → le JEU passe
 * DEVANT). Hauteur = `render_height` (repli doux si absente/0), base =
 * `render_min_height`, `hide_3d` exclu. Défensif (le style hébergé peut changer).
 */
function apply3dTerrainAndBuildings(map: MapLibreMap, beforeId?: string): void {
  // ── Relief : source raster-dem Terrarium (keyless) + setTerrain. ──
  try {
    if (!map.getSource(MAP_3D.demSourceId)) {
      map.addSource(MAP_3D.demSourceId, {
        type: 'raster-dem',
        tiles: [...MAP_3D.demTiles],
        encoding: MAP_3D.demEncoding,
        tileSize: MAP_3D.demTileSize,
        // Terrarium ne fournit le DEM que jusqu'à z15 : on borne le maxzoom à sa
        // vraie résolution — MapLibre sur-zoome ces tuiles au niveau rue (évite
        // de fetcher des tuiles z16+ inexistantes). Au-delà de z15, MapLibre logge
        // un warning BÉNIN « cannot calculate elevation… » (résolution DEM
        // dépassée) — sans erreur ni impact rendu ; en prod un DEM propre (O6)
        // repoussera cette borne.
        maxzoom: MAP_3D.demMaxZoom,
      });
    }
    map.setTerrain({ source: MAP_3D.demSourceId, exaggeration: MAP_3D.demExaggeration });
    // Atmosphère discrète à fort pitch (zéro halo sur les zones — c'est le ciel).
    if (typeof map.setSky === 'function') {
      map.setSky({
        'sky-color': colors.noir,
        'horizon-color': colors.carbone,
        'fog-color': colors.noir,
        'sky-horizon-blend': 0.5,
        'horizon-fog-blend': 0.5,
        'fog-ground-blend': 0.5,
        'atmosphere-blend': 0.4,
      });
    }
  } catch {
    // DEM indisponible (offline/blip) : le relief est un CONFORT — on n'échoue
    // jamais le rendu, la carte reste utilisable (zones/trace intactes).
  }
  // ── Bâtiments 3D : fill-extrusion sur la source vectorielle CARTO. ──
  try {
    if (!map.getSource(MAP_3D.vectorSourceId)) return; // pas de fond vectoriel → rien
    const insertBefore = beforeId && map.getLayer(beforeId) ? beforeId : undefined;
    if (!map.getLayer(CITY_BUILDINGS_LAYER_ID)) {
      map.addLayer(
        {
          id: CITY_BUILDINGS_LAYER_ID,
          type: 'fill-extrusion',
          source: MAP_3D.vectorSourceId,
          'source-layer': MAP_3D.buildingSourceLayer,
          // Le flag OpenMapTiles `hide_3d` marque les empreintes à ne pas lever.
          filter: ['!=', ['get', 'hide_3d'], true],
          // Les empreintes de bâtiments n'existent qu'au niveau rue.
          minzoom: 14,
          paint: {
            'fill-extrusion-color': buildings3dStyle.fillColor,
            // Hauteur RÉELLE de la tuile ; repli doux si absente ou 0 (toujours 3D).
            'fill-extrusion-height': [
              'case',
              ['>', ['coalesce', ['get', 'render_height'], 0], 0],
              ['get', 'render_height'],
              buildings3dStyle.defaultHeightM,
            ],
            'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
            'fill-extrusion-opacity': buildings3dStyle.fillOpacity,
          },
        },
        insertBefore,
      );
    }
  } catch {
    // Source-layer/champ absent d'un futur style : on laisse la carte telle quelle.
  }
}

/**
 * AMENDEMENT-27 — retour en 2D : retire le relief (setTerrain(null)) et
 * l'extrusion des bâtiments — la 2D reste STRICTEMENT plate (aucun résidu). Le
 * `sky` est retiré aussi (pas d'atmosphère sur une carte plate). La source DEM
 * peut rester en cache (inerte sans terrain) — on la laisse pour éviter des
 * re-fetch au prochain passage 3D. Défensif.
 */
function remove3dTerrainAndBuildings(map: MapLibreMap): void {
  try {
    if (map.getTerrain()) map.setTerrain(null);
  } catch {
    /* déjà absent */
  }
  try {
    // maplibre-gl v5 : `setSky` n'accepte pas `undefined` (type) — un objet
    // vide réinitialise le ciel aux défauts (aucune atmosphère custom en 2D).
    if (typeof map.setSky === 'function') map.setSky({});
  } catch {
    /* pas de sky */
  }
  try {
    if (map.getLayer(CITY_BUILDINGS_LAYER_ID)) map.removeLayer(CITY_BUILDINGS_LAYER_ID);
  } catch {
    /* déjà retiré */
  }
}

/**
 * AMENDEMENT-24 — CARTE 3D : une couche extrudée (spec.extrude) en mode 3D
 * (extrudeZones) est peinte en `fill-extrusion` (volume) ; sinon elle retombe
 * sur l'aplat plat (`fill`) de sa `fillColor` — non-régression. On calcule ici
 * si CETTE couche doit s'élever en volume.
 */
function isExtruded(spec: RealMapGeoJSONLayer, extrudeZones: boolean): boolean {
  return extrudeZones && spec.extrude === true;
}

/**
 * Ajoute (ou remplace) la source + les layers d'une couche de jeu. `extrudeZones`
 * (AMENDEMENT-24) fait rendre les couches `extrude` en volume 3D — défaut false
 * = comportement 2D historique inchangé.
 */
function upsertLayer(map: MapLibreMap, spec: RealMapGeoJSONLayer, extrudeZones = false): void {
  const existing = map.getSource(spec.id) as GeoJSONSource | undefined;
  if (existing) {
    existing.setData(spec.data);
  } else {
    map.addSource(spec.id, { type: 'geojson', data: spec.data });
  }
  const extruded = isExtruded(spec, extrudeZones);
  // ── Volume 3D (fill-extrusion) : uniquement en mode 3D pour une couche
  //    `extrude`. Le look signature GRYD (le territoire monte). ──
  const extrudeId = `${spec.id}-extrude`;
  if (extruded && !map.getLayer(extrudeId)) {
    map.addLayer({
      id: extrudeId,
      type: 'fill-extrusion',
      source: spec.id,
      paint: {
        'fill-extrusion-color': spec.extrudeColor ?? spec.fillColor ?? '#ffffff',
        'fill-extrusion-height': spec.extrudeHeight ?? 0,
        'fill-extrusion-base': spec.extrudeBase ?? 0,
        'fill-extrusion-opacity': spec.extrudeOpacity ?? spec.fillOpacity ?? 1,
      },
    });
  } else if (extruded) {
    map.setPaintProperty(extrudeId, 'fill-extrusion-color', spec.extrudeColor ?? spec.fillColor ?? '#ffffff');
    map.setPaintProperty(extrudeId, 'fill-extrusion-height', spec.extrudeHeight ?? 0);
    map.setPaintProperty(extrudeId, 'fill-extrusion-base', spec.extrudeBase ?? 0);
    map.setPaintProperty(extrudeId, 'fill-extrusion-opacity', spec.extrudeOpacity ?? spec.fillOpacity ?? 1);
  }
  // ── Aplat plat (fill) : peint sauf si CETTE couche est actuellement extrudée
  //    (le volume la remplace). En 2D, tout reste comme avant. ──
  const fillId = `${spec.id}-fill`;
  if (spec.fillColor !== undefined && !extruded && !map.getLayer(fillId)) {
    map.addLayer({
      id: fillId,
      type: 'fill',
      source: spec.id,
      paint: { 'fill-color': spec.fillColor, 'fill-opacity': spec.fillOpacity ?? 1 },
    });
  } else if (spec.fillColor !== undefined && !extruded && map.getLayer(fillId)) {
    map.setPaintProperty(fillId, 'fill-color', spec.fillColor);
    map.setPaintProperty(fillId, 'fill-opacity', spec.fillOpacity ?? 1);
  }
  const lineId = `${spec.id}-line`;
  if (spec.lineColor !== undefined && !map.getLayer(lineId)) {
    map.addLayer({
      id: lineId,
      type: 'line',
      source: spec.id,
      // §4ter : coins nets à jointure arrondie légère, extrémités arrondies.
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': spec.lineColor,
        'line-width': spec.lineWidth ?? 1,
        ...(spec.lineDash ? { 'line-dasharray': [...spec.lineDash] } : {}),
        ...(spec.lineOffset !== undefined ? { 'line-offset': spec.lineOffset } : {}),
      },
    });
  } else if (spec.lineColor !== undefined) {
    map.setPaintProperty(lineId, 'line-color', spec.lineColor);
    map.setPaintProperty(lineId, 'line-width', spec.lineWidth ?? 1);
    if (spec.lineDash) map.setPaintProperty(lineId, 'line-dasharray', [...spec.lineDash]);
    if (spec.lineOffset !== undefined) {
      map.setPaintProperty(lineId, 'line-offset', spec.lineOffset);
    }
  }
}

/**
 * Ajoute (ou met à jour) un calque de marqueurs-points (§4bis) : circle +
 * symbol MapLibre bornés par minzoom/maxzoom — la visibilité suit le zoom
 * réel, pas un état React. Couleur lue par feature (propriété `color`).
 */
function upsertPointLayer(map: MapLibreMap, spec: RealMapPointLayer): void {
  const existing = map.getSource(spec.id) as GeoJSONSource | undefined;
  if (existing) {
    existing.setData(spec.data);
  } else {
    map.addSource(spec.id, { type: 'geojson', data: spec.data });
  }
  const zoomRange = {
    ...(spec.minZoom !== undefined ? { minzoom: spec.minZoom } : {}),
    ...(spec.maxZoom !== undefined ? { maxzoom: spec.maxZoom } : {}),
  };
  const dotId = `${spec.id}-dot`;
  if (!map.getLayer(dotId)) {
    map.addLayer({
      id: dotId,
      type: 'circle',
      source: spec.id,
      ...zoomRange,
      paint: {
        'circle-color': ['get', 'color'],
        'circle-radius': spec.circleRadius,
        'circle-stroke-color': spec.circleStrokeColor,
        'circle-stroke-width': spec.circleStrokeWidth,
      },
    });
  }
  const labelId = `${spec.id}-label`;
  if (!map.getLayer(labelId)) {
    map.addLayer({
      id: labelId,
      type: 'symbol',
      source: spec.id,
      ...zoomRange,
      layout: {
        'text-field': ['get', 'label'],
        'text-font': POINT_LABEL_FONTS,
        'text-size': spec.textSize,
        'text-anchor': 'top',
        'text-offset': [0, spec.textOffsetEm],
        'text-letter-spacing': spec.textLetterSpacing ?? 0,
        'text-allow-overlap': true,
      },
      paint: {
        'text-color': ['get', 'color'],
        'text-halo-color': spec.textHaloColor,
        'text-halo-width': POINT_LABEL_HALO_WIDTH,
      },
    });
  }
}

// ─── Composant ──────────────────────────────────────────────────────────────

/** Un marker natif maplibre-gl + son élément hôte du portal RN. */
interface MarkerEntry {
  marker: MapLibreMarker;
  el: HTMLDivElement;
}

export const RealMap = forwardRef<RealMapRef, RealMapProps>(function RealMap(
  {
    camera,
    bounds,
    geojsonLayers,
    pointLayers,
    markers,
    onPress,
    onZoomChange,
    onMapReady,
    attributionCompact = true,
    basemap,
    silent = false,
    pitch: pitchProp,
    bearing = 0,
    extrudeZones: extrudeZonesProp,
    mode3d = false,
    style,
    testID,
  }: RealMapProps,
  ref,
) {
  // AMENDEMENT-26 — VUE 3D : `mode3d` n'est qu'un DÉFAUT pour `pitch`/
  // `extrudeZones`. Un `pitch`/`extrudeZones` EXPLICITE prime toujours (partage/
  // historique gardent leur ~55° et leur extrusion — non-régression). Absent des
  // deux : 2D actuelle (pitch 0, aplats plats) — comportement historique intact.
  const pitch = pitchProp ?? (mode3d ? MODE_3D_DEFAULT_PITCH : 0);
  const extrudeZones = extrudeZonesProp ?? mode3d;
  /**
   * AMENDEMENT-27 — VRAI 3D (relief + bâtiments) : actif dès que la caméra est
   * inclinée — `mode3d` (pitch de convenance ~52°) OU un `pitch` explicite > 0
   * (partage/historique ~55°). Pitch 0 (2D) ⇒ jamais de terrain ni d'extrusion
   * bâtiment : la 2D reste STRICTEMENT plate (non-régression). Découplé de
   * `extrudeZones` (qui ne concerne que le VOLUME des zones de jeu).
   */
  const is3d = pitch > 0;
  /**
   * Carte silencieuse (AMENDEMENT-20 §1) : demandée explicitement OU carte de
   * Course Live (LiveNavMap → testID stable). Figé au montage (le handler `load`
   * le lit une fois : les labels de quartiers restent masqués durant tout le run).
   */
  const silentRef = useRef(silent || testID === LIVE_RUN_TEST_ID);
  silentRef.current = silent || testID === LIVE_RUN_TEST_ID;
  const containerRef = useRef<View>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const layersRef = useRef<readonly RealMapGeoJSONLayer[]>(geojsonLayers);
  layersRef.current = geojsonLayers;
  const pointLayersRef = useRef<readonly RealMapPointLayer[] | undefined>(pointLayers);
  pointLayersRef.current = pointLayers;
  const onPressRef = useRef<RealMapProps['onPress']>(onPress);
  onPressRef.current = onPress;
  const onZoomChangeRef = useRef<RealMapProps['onZoomChange']>(onZoomChange);
  onZoomChangeRef.current = onZoomChange;
  const onMapReadyRef = useRef<RealMapProps['onMapReady']>(onMapReady);
  onMapReadyRef.current = onMapReady;
  /** Fond au montage (le remount par `key` du parent porte la bascule). */
  const basemapRef = useRef<BasemapKey | undefined>(basemap);
  basemapRef.current = basemap;
  /**
   * Mode 3D (AMENDEMENT-24) lisible par le handler `load` (posé une fois) et
   * l'upsert. `extrudeZones` de partage ne change jamais après montage (la
   * carte 3D est un template dédié), mais on garde le miroir à jour par sûreté.
   */
  const extrudeZonesRef = useRef(extrudeZones);
  extrudeZonesRef.current = extrudeZones;
  /**
   * AMENDEMENT-27 — VRAI 3D lisible par le handler `load` (posé une fois) : au
   * premier rendu 3D (partage/historique montés directement pitchés), le relief
   * et les bâtiments sont branchés dès le chargement du style, SOUS les couches
   * de jeu.
   */
  const is3dRef = useRef(is3d);
  is3dRef.current = is3d;
  /** Cadrage d'ouverture : figé au premier rendu (la caméra vit ensuite). */
  const openBoundsRef = useRef<RealMapBounds | undefined>(bounds);
  const [styleReady, setStyleReady] = useState(false);
  const [offline, setOffline] = useState(false);
  /** Miroir de `offline` lisible par les handlers MapLibre (posés une fois). */
  const offlineRef = useRef(false);
  /** Horodatage de la dernière erreur tuiles/style (voir OFFLINE_CLEAR_QUIET_MS). */
  const lastErrorAtRef = useRef(0);
  /** Timer du re-test périodique tant que l'état offline est affiché. */
  const offlineRecheckRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * Markers natifs maplibre-gl par id (AMENDEMENT-13 §5 — perf) : ils suivent
   * la caméra SANS re-render React ; le contenu RN est rendu par portal dans
   * l'élément du marker. `markersVersion` re-rend les portals quand le SET de
   * markers change (jamais pendant un mouvement de caméra).
   */
  const markerEntriesRef = useRef<Map<string, MarkerEntry>>(new Map());
  const [, setMarkersVersion] = useState(0);

  /** Ids des sources de JEU locales (jamais offline pour leurs erreurs). */
  const gameSourceIds = () => [
    ...layersRef.current.map((l) => l.id),
    ...(pointLayersRef.current ?? []).map((l) => l.id),
  ];

  // Création de la carte (une seule fois — le conteneur RNW est un div).
  // §4bis : AUCUN maxBounds, AUCUN minZoom restrictif — monde librement
  // navigable ; le cadrage initial (camera OU bounds) n'est qu'une ouverture.
  useEffect(() => {
    const node = containerRef.current as unknown as HTMLElement | null;
    if (!node) return undefined;
    const openBounds = openBoundsRef.current;
    const openCamera = camera ?? WORLD_FALLBACK_CAMERA;
    const map = new MapLibreMap({
      container: node,
      // Fond choisi au MONTAGE (le parent remonte via `key` à chaque bascule —
      // pas de setStyle qui effacerait les couches de jeu).
      style: basemapStyleUrl(basemapRef.current),
      ...(openBounds
        ? {
            bounds: [openBounds.sw, openBounds.ne] as [[number, number], [number, number]],
            fitBoundsOptions: { padding: openBounds.paddingPx },
          }
        : { center: [openCamera.lng, openCamera.lat] as [number, number], zoom: openCamera.zoom }),
      // AMENDEMENT-24 — CARTE 3D : pitch/bearing d'OUVERTURE (défaut 0 = plat,
      // 2D historique). ~55° pour la carte de partage → relief de perspective.
      pitch,
      bearing,
      attributionControl: false, // remplacée par la mention compacte GRYD
      dragRotate: false,
      pitchWithRotate: false,
    });
    mapRef.current = map;
    // Poignée de debug non énumérée par React (vérifs preview/dev uniquement).
    (node as unknown as { __grydMap?: MapLibreMap }).__grydMap = map;
    // L'instance est exposée au parent (échelle scopée à CETTE carte — §5/§6).
    onMapReadyRef.current?.(map);

    const setOfflineState = (value: boolean) => {
      offlineRef.current = value;
      setOffline(value);
    };
    const clearOfflineIfQuiet = () => {
      if (!offlineRef.current) return;
      if (Date.now() - lastErrorAtRef.current > OFFLINE_CLEAR_QUIET_MS) setOfflineState(false);
    };
    // Tant que l'état offline persiste : force un rendu (→ `idle` retombe →
    // relève si la période calme est passée). Appareil hors ligne avéré
    // (navigator.onLine === false) : inutile de re-tester, on attend.
    const scheduleOfflineRecheck = () => {
      if (offlineRecheckRef.current !== null) return;
      offlineRecheckRef.current = setTimeout(() => {
        offlineRecheckRef.current = null;
        if (!offlineRef.current || mapRef.current !== map) return;
        if (typeof navigator === 'undefined' || navigator.onLine !== false) {
          map.triggerRepaint();
        }
        scheduleOfflineRecheck();
      }, OFFLINE_RECHECK_MS);
    };

    map.on('load', () => {
      // Le fond COULEUR (Voyager) est laissé TEL QUEL : les overrides GRYD
      // n'éteignent le décor (eau/parcs/labels) que pour le fond sombre. En
      // Course Live (silentRef), les labels de quartiers sont EN PLUS masqués (§1).
      if (basemapRef.current !== 'color') applyGrydStyleOverrides(map, silentRef.current);
      // AMENDEMENT-27 — VRAI 3D : si la carte s'ouvre déjà pitchée (partage/
      // historique, ou mode3d), branche le relief + les bâtiments AVANT les
      // couches de jeu → celles-ci (upsert juste après, sans beforeId) sont
      // appendues au-dessus et passent DEVANT les bâtiments (charte).
      if (is3dRef.current) apply3dTerrainAndBuildings(map);
      for (const spec of layersRef.current) upsertLayer(map, spec, extrudeZonesRef.current);
      for (const spec of pointLayersRef.current ?? []) upsertPointLayer(map, spec);
      setStyleReady(true);
      onZoomChangeRef.current?.(map.getZoom());
    });
    // Tuiles/style indisponibles → état offline (fond noir + message).
    // Erreurs de sources de jeu locales / non-réseau : jamais offline.
    map.on('error', (event) => {
      if (!isTilesAvailabilityError(event, gameSourceIds())) return;
      lastErrorAtRef.current = Date.now();
      setOfflineState(true);
      scheduleOfflineRecheck();
    });
    // CONTEXTE WEBGL PERDU (§7) : même fallback offline (fond noir + message,
    // jamais d'écran blanc). `webglcontextrestored` retaille et force un rendu
    // → la relève standard (`idle` après période calme) fait le reste.
    map.on('webglcontextlost', () => {
      lastErrorAtRef.current = Date.now();
      setOfflineState(true);
      scheduleOfflineRecheck();
    });
    map.on('webglcontextrestored', () => {
      map.resize();
      map.triggerRepaint();
    });
    // Retour sur l'écran/onglet pendant l'état offline : tentative de
    // restauration (resize + rendu) — certains navigateurs ne rendent le
    // contexte qu'à la re-visibilité.
    const onVisibilityChange = () => {
      if (typeof document === 'undefined' || document.visibilityState !== 'visible') return;
      if (!offlineRef.current || mapRef.current !== map) return;
      map.resize();
      map.triggerRepaint();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    // Relève : `idle` (le pulse est suspendu tant qu'offline — il retombe
    // donc toujours) + succès tuile réel (`sourcedata` avec tile, hors
    // sources de jeu locales) — signal qui survit à toute animation.
    map.on('idle', clearOfflineIfQuiet);
    map.on('sourcedata', (event: MapSourceDataEvent) => {
      if (!event.tile) return;
      if (gameSourceIds().includes(event.sourceId)) return;
      clearOfflineIfQuiet();
    });
    // Le zoom courant est notifié au parent (seuils UI) — AUCUN setState
    // interne par frame : les markers natifs suivent la caméra tout seuls (§5).
    map.on('move', () => {
      onZoomChangeRef.current?.(map.getZoom());
    });
    map.on('click', (e: MapMouseEvent) => {
      onPressRef.current?.({ lng: e.lngLat.lng, lat: e.lngLat.lat });
    });

    return () => {
      if (offlineRecheckRef.current !== null) {
        clearTimeout(offlineRecheckRef.current);
        offlineRecheckRef.current = null;
      }
      document.removeEventListener('visibilitychange', onVisibilityChange);
      markerEntriesRef.current.clear(); // map.remove() retire leur DOM
      mapRef.current = null;
      map.remove();
    };
    // Caméra initiale seulement — les changements suivants passent par easeTo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Caméra contrôlée : ease fluide (saut direct si reduce motion). Ignorée si
  // la carte s'est ouverte en fitBounds (§4bis — la caméra vit librement).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !camera || openBoundsRef.current) return;
    const target = { center: [camera.lng, camera.lat] as [number, number], zoom: camera.zoom };
    if (prefersReducedMotion()) map.jumpTo(target);
    else map.easeTo({ ...target, duration: motion.transitionMs });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera?.lng, camera?.lat, camera?.zoom]);

  // AMENDEMENT-24 — CARTE 3D : pitch/bearing contrôlés (saut direct si reduce
  // motion — pitch FIXE, aucune animation caméra imposée, charte §G). Défaut
  // 0/0 = plat : n'exécute rien de visible sur les cartes 2D (Battle Map, Live).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (prefersReducedMotion()) {
      map.jumpTo({ pitch, bearing });
    } else {
      map.easeTo({ pitch, bearing, duration: motion.transitionMs });
    }
  }, [pitch, bearing]);

  // AMENDEMENT-27 — VRAI 3D (relief terrain DEM + bâtiments extrudés) : suit le
  // basculement 2D↔3D EN PLACE (toggle AMENDEMENT-26, sans remount). En 3D :
  // branche le terrain Terrarium + l'extrusion des bâtiments CARTO, insérée
  // SOUS la 1re couche de jeu (les zones/trace GRYD passent DEVANT — charte). En
  // 2D : retire tout (la carte redevient STRICTEMENT plate — non-régression).
  // Le `load` initial couvre l'ouverture déjà pitchée ; cet effet couvre la
  // bascule live et les remontages (styleReady rejoué).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady || !map.isStyleLoaded()) return;
    if (is3d) {
      // beforeId = 1re couche de JEU présente (ordre de peinture) → les
      // bâtiments s'insèrent dessous. Les derived ids sont `${id}-fill/-line`.
      let beforeId: string | undefined;
      for (const spec of geojsonLayers) {
        for (const suffix of ['-extrude', '-fill', '-line'] as const) {
          const candidate = `${spec.id}${suffix}`;
          if (map.getLayer(candidate)) {
            beforeId = candidate;
            break;
          }
        }
        if (beforeId) break;
      }
      apply3dTerrainAndBuildings(map, beforeId);
    } else {
      remove3dTerrainAndBuildings(map);
    }
  }, [is3d, styleReady, geojsonLayers]);

  // Couches de jeu + points : upsert mémoïsé par identité des tableaux. Si le
  // style n'est pas (encore/plus) chargé — remontage, fast refresh — on laisse
  // le handler `load` poser les refs : jamais de throw en rendu.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady || !map.isStyleLoaded()) return;
    try {
      for (const spec of geojsonLayers) upsertLayer(map, spec, extrudeZones);
      for (const spec of pointLayers ?? []) upsertPointLayer(map, spec);
    } catch {
      // Style en cours de rechargement — le prochain `load` réappliquera tout.
    }
  }, [geojsonLayers, pointLayers, styleReady, extrudeZones]);

  // Markers NATIFS maplibre-gl (§5 perf) : synchronisés sur le tableau de
  // props (création/déplacement/retrait), ré-appendus dans l'ordre (le dernier
  // au-dessus). Ils suivent la caméra sans aucun re-render React.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const entries = markerEntriesRef.current;
    const nextIds = new Set((markers ?? []).map((m) => m.id));
    let changed = false;
    for (const [id, entry] of entries) {
      if (!nextIds.has(id)) {
        entry.marker.remove();
        entries.delete(id);
        changed = true;
      }
    }
    for (const m of markers ?? []) {
      const existing = entries.get(m.id);
      if (existing) {
        existing.marker.setLngLat([m.lng, m.lat]);
      } else {
        const el = document.createElement('div');
        const marker = new MapLibreMarker({ element: el, anchor: 'center' })
          .setLngLat([m.lng, m.lat])
          .addTo(map);
        entries.set(m.id, { marker, el });
        changed = true;
      }
    }
    // Ordre de peinture : ré-appende chaque élément dans l'ordre du tableau
    // (le DOM empile les suivants au-dessus — « moi » reste dernier/au-dessus).
    for (const m of markers ?? []) {
      const el = entries.get(m.id)?.el;
      el?.parentElement?.appendChild(el);
    }
    if (changed) setMarkersVersion((v) => v + 1);
  }, [markers]);

  // Pulse du/des calques contestés : line-opacity animée en rAF via
  // setPaintProperty (AUCUN re-render React), coupée si reduce motion (le
  // contour reste alors plein — jamais invisible) et SUSPENDUE tant que l'état
  // offline est affiché (l'overlay cache le contour et la carte doit pouvoir
  // retomber `idle` pour relever l'état).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady || offline) return undefined;
    const pulseIds = geojsonLayers
      .filter((l) => l.pulse && l.lineColor !== undefined)
      .map((l) => `${l.id}-line`);
    if (pulseIds.length === 0 || prefersReducedMotion()) return undefined;
    let raf = 0;
    const start = Date.now();
    const tick = () => {
      const phase = ((Date.now() - start) % PULSE_PERIOD_MS) / PULSE_PERIOD_MS;
      const opacity =
        PULSE_MIN_OPACITY_RATIO +
        (1 - PULSE_MIN_OPACITY_RATIO) * (0.5 + 0.5 * Math.sin(phase * Math.PI * 2));
      for (const id of pulseIds) {
        try {
          if (map.getLayer(id)) map.setPaintProperty(id, 'line-opacity', opacity);
        } catch {
          // Style rechargé entre deux frames — frame suivante.
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [geojsonLayers, styleReady, offline]);

  useImperativeHandle(
    ref,
    (): RealMapRef => ({
      flyTo(target) {
        const map = mapRef.current;
        if (!map) return;
        const stop = {
          center: [target.lng, target.lat] as [number, number],
          ...(target.zoom !== undefined ? { zoom: target.zoom } : {}),
        };
        if (prefersReducedMotion()) map.jumpTo(stop);
        else map.flyTo(stop);
      },
      fitBounds(target) {
        const map = mapRef.current;
        if (!map) return;
        map.fitBounds([target.sw, target.ne], {
          padding: target.paddingPx,
          ...(prefersReducedMotion() ? { duration: 0 } : {}),
        });
      },
    }),
    [],
  );

  return (
    <View style={[styles.root, style]} testID={testID}>
      {/* Conteneur DOM de maplibre-gl (div via RNW). */}
      <View ref={containerRef} style={styles.mapHost} />

      {/* Contenu RN des markers natifs, rendu par PORTAL dans l'élément de
          chaque maplibregl.Marker (le marker suit la caméra sans React). */}
      {markers?.map((m) => {
        const entry = markerEntriesRef.current.get(m.id);
        if (!entry) return null;
        return createPortal(
          <View pointerEvents="box-none" style={styles.markerContent}>
            {m.children}
          </View>,
          entry.el,
          m.id,
        );
      })}

      {/* Attribution compacte OBLIGATOIRE (données © OpenStreetMap, tuiles CARTO). */}
      {attributionCompact ? (
        <Text style={styles.attribution} accessibilityRole="text">
          © OpenStreetMap © CARTO
        </Text>
      ) : null}

      {/* Tuiles indisponibles : fond noir + message — jamais d'écran blanc. */}
      {offline ? (
        <View style={styles.offline} pointerEvents="none">
          <Text style={styles.offlineText}>{OFFLINE_MESSAGE}</Text>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.noir, // le fond derrière les tuiles reste noir
    overflow: 'hidden',
  },
  // PAS d'absoluteFill : la classe .maplibregl-map (CSS global) impose
  // position:relative et écraserait les classes atomiques RNW → flex:1.
  mapHost: {
    flex: 1,
    backgroundColor: colors.noir,
  },
  /** Contenu centré sur le point géo (l'élément du Marker est ancré center). */
  markerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  attribution: {
    position: 'absolute',
    right: 8,
    bottom: 6,
    color: colors.gris,
    opacity: 0.7,
    fontFamily: fonts.mono,
    fontSize: 9,
  },
  offline: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.noir,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  offlineText: {
    color: colors.blanc,
    fontFamily: fonts.text,
    fontSize: fontSizes.md,
    textAlign: 'center',
  },
});
