/**
 * GRYD — RealMap, variante NATIVE (AMENDEMENT-13 §1/§4/§4bis) : mêmes vraies
 * tuiles sombres (styleURL dark-matter) via `@maplibre/maplibre-react-native`
 * (déjà intégré), même API que ./RealMap.web.tsx (fork de plateforme —
 * interfaces dupliquées à l'identique, Metro résout la bonne variante par
 * extension). MONDE librement navigable : aucun maxBounds, aucun verrou de
 * zoom (§4bis) — le cadrage initial (camera OU bounds fitBounds) n'est qu'une
 * ouverture. Chaque entrée `geojsonLayers` devient ShapeSource +
 * FillLayer/LineLayer (styles MÉMOÏSÉS — AMENDEMENT-13 §5 : pas de nouvel
 * objet style par render) ; `pointLayers` = marqueurs-points villes en
 * CircleLayer/SymbolLayer bornés par minZoomLevel/maxZoomLevel (§4bis : la
 * lisibilité au dézoom suit le zoom RÉEL, jamais un état React) ; les markers
 * passent par MarkerView. `pulse` (contesté) est isolé dans PulsingLineLayer :
 * un toggle basse fréquence + lineOpacityTransition anime le fondu CÔTÉ STYLE
 * (GPU) — plus de setState 80 ms qui re-rendait tout l'arbre —, coupé si
 * reduce motion (useReduceMotion). Attribution © OpenStreetMap © CARTO
 * compacte (obligation légale) ; échec de chargement → fond noir + « Carte
 * indisponible — tes zones restent à toi » (onDidFailLoadingMap), jamais
 * d'écran blanc. Compilable sans device — la vérification visuelle prioritaire
 * reste la variante web (Expo Web).
 */
import {
  Camera,
  CircleLayer,
  FillExtrusionLayer,
  FillLayer,
  LineLayer,
  MapView,
  MarkerView,
  ShapeSource,
  SymbolLayer,
  VectorSource,
  type CameraRef,
  type MapViewRef,
  type CircleLayerStyle,
  type Expression,
  type FillExtrusionLayerStyle,
  type FillLayerStyle,
  type LineLayerStyle,
  type SymbolLayerStyle,
} from '@maplibre/maplibre-react-native';
import type { Map as MapLibreGlMap } from 'maplibre-gl';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fonts, fontSizes, motion } from '@klaim/shared';
import {
  MAP_3D,
  MAP_BASEMAP_STYLES,
  basemapAttribution,
  buildings3dStyle,
  satelliteStyleSpec,
  type BasemapKey,
} from '../../features/map/mapStyle';
import { useReduceMotion } from './anim';

// ─── API commune (dupliquée à l'identique dans RealMap.web.tsx — fork RN) ───

/** Style vectoriel sombre de dev SANS CLÉ (AMENDEMENT-13 §1 — O6 pour la prod). */
export const DARK_MAP_STYLE_URL = MAP_BASEMAP_STYLES.dark;

/**
 * Résout le style du fond demandé (défaut sombre). `dark`/`color` = styleURL
 * vectoriel CARTO ; `satellite` (AMENDEMENT-28) = le StyleSpecification RASTER
 * Esri sérialisé en JSON (le binding natif `mapStyle` accepte une URL OU une
 * chaîne JSON de style) — keyless, une seule source raster + un layer raster.
 */
function basemapStyleUrl(basemap: BasemapKey | undefined): string {
  if (basemap === 'satellite') return JSON.stringify(satelliteStyleSpec());
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
  /**
   * AMENDEMENT-37 §1 — FILL DE POSSESSION LOD : opacité DYNAMIQUE par zoom
   * (paliers `[zoom, opacité]`). Quand présent, `fillOpacity` devient une
   * interpolation MapLibre — l'aplat de propriété ne vit qu'au dézoom
   * ville/quartier puis s'efface au niveau rue (z16+) où la trace-héros domine
   * seule (esprit -36). `fillOpacity` reste le repli. Parité avec le fork web.
   */
  fillOpacityStops?: readonly (readonly [number, number])[];
  lineColor?: string;
  lineWidth?: number;
  /**
   * GRYD_REGLES §B — TRACE HÉROS : largeur DYNAMIQUE par zoom (paliers
   * `[zoom, px]`). Quand présent, `lineWidth` devient une interpolation MapLibre
   * (`interpolate` linéaire) au lieu d'un scalaire — la trace grossit du niveau
   * ville au niveau rue comme sur Strava. `lineWidth` reste le repli. Constantes
   * de STYLE (mapStyle : TRACE_WIDTH_STOPS…), jamais des règles de jeu.
   */
  lineWidthStops?: readonly (readonly [number, number])[];
  /**
   * Opacité STATIQUE du trait (0-1) — §B : route restante ~60 %, segment exclu
   * ~35 %. Distinct du `pulse` (qui anime l'opacité). Défaut 1 (plein).
   */
  lineOpacity?: number;
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
   * AMENDEMENT-24 — CARTE 3D : rend l'aplat de cette couche en FillExtrusion
   * (volume 3D chartreuse translucide) AU LIEU d'un aplat plat, MAIS seulement
   * si la carte est en mode 3D (`extrudeZones`). Défaut (`extrude` absent OU
   * `extrudeZones` false) : aplat plat — non-régression (Battle Map/Live
   * inchangées). Hauteur/base/opacité/couleur propres à la couche.
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
  /**
   * AMENDEMENT-37 §3 (contrat C2) — `zoneId` de la zone de TERRITOIRE tapée (lu
   * par queryRenderedFeaturesAtPoint sur les couches territoire au point du tap).
   * `null` = tap sur le vide (aucune zone) → l'écran désélectionne.
   */
  zoneId?: string | null;
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
   * scoper échelle/outils à CETTE carte. JAMAIS appelé par le fork natif
   * (déclaré ici pour garder les interfaces des deux forks identiques).
   */
  onMapReady?: (map: MapLibreGlMap) => void;
  /** Attribution compacte © OpenStreetMap © CARTO (défaut true — obligatoire). */
  attributionCompact?: boolean;
  /**
   * Fond de carte : 'dark' (défaut, dark-matter) | 'color' (Voyager, type Plan).
   * Le parent remonte la carte via une `key` incluant ce fond (parité web —
   * un simple changement de mapStyle ne réajouterait pas les couches de jeu).
   */
  basemap?: BasemapKey;
  /**
   * CARTE SILENCIEUSE (AMENDEMENT-20 §1) — parité d'INTERFACE avec le fork web
   * (les deux forks exposent la même API). Le fork web éteint les labels de
   * quartiers ; côté natif le style dark-matter est chargé tel quel (pas de
   * surcharge de calques de tuile ici) — la prop est donc acceptée sans effet
   * visuel dédié pour l'instant. N'affecte JAMAIS les couches de jeu.
   */
  silent?: boolean;
  /**
   * AMENDEMENT-24 — CARTE 3D : inclinaison de la caméra (degrés). Défaut 0 =
   * carte PLATE (2D actuelle) — non-régression totale. La « Carte 3D » de
   * partage passe ~55° : le fond dark se PITCHE et les zones marquées `extrude`
   * s'élèvent en volume. Aucun provider requis (pitch et FillExtrusion sont
   * natifs MapLibre — données de zone = les nôtres).
   */
  pitch?: number;
  /** Cap de la caméra (degrés). Défaut 0. La perspective 3D de partage cape ~-18°. */
  bearing?: number;
  /**
   * AMENDEMENT-24 — CARTE 3D : rend les couches marquées `extrude` en volume 3D
   * (FillExtrusionLayer) plutôt qu'en aplat plat. Défaut false = aplat plat
   * (2D actuelle). N'affecte QUE les couches qui portent elles-mêmes `extrude`.
   */
  extrudeZones?: boolean;
  /**
   * AMENDEMENT-26 — VUE 3D, prop de CONVENANCE (parité d'interface avec le fork
   * web) : `true` = GRYD 3D Conquest (carte pitchée ~52° + zones capturées
   * extrudées en volume). Elle ne fait que fournir un DÉFAUT à `pitch` et
   * `extrudeZones` : un `pitch`/`extrudeZones` passés EXPLICITEMENT priment
   * toujours (le partage/l'historique gardent leur ~55° et leur extrusion —
   * aucune régression). `false` (défaut) = 2D actuelle STRICTEMENT inchangée
   * (pitch 0, aplats plats). C'est le SEUL levier dont les surfaces de carte ont
   * besoin : elles branchent `mode3d={map3d}` sur la préférence `gryd.map3d`
   * (mapPref). Pur affichage — zéro impact gameplay (le serveur décide du claim).
   */
  mode3d?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

// ─── Constantes de rendu (UI uniquement — pas des règles de jeu) ────────────

/** Message offline imposé (AMENDEMENT-13 §5). */
const OFFLINE_MESSAGE = 'Carte indisponible — tes zones restent à toi';
/** Période du pulse contesté (lent, doc §8). */
const PULSE_PERIOD_MS = 2_400;
/** Amplitude du pulse : l'opacité du contour oscille entre min et 1. */
const PULSE_MIN_OPACITY_RATIO = 0.35;
/**
 * Demi-période du pulse natif : le toggle basse fréquence bascule l'opacité
 * cible, `lineOpacityTransition` fait le fondu côté style/GPU (§5 perf —
 * remplace l'ex-setState 80 ms qui re-rendait tout l'arbre).
 */
const PULSE_HALF_PERIOD_MS = PULSE_PERIOD_MS / 2;
/** Durée du flyTo natif. */
const FLY_TO_MS = 800;
/**
 * AMENDEMENT-26 — VUE 3D : pitch de convenance appliqué quand `mode3d` est vrai
 * SANS `pitch` explicite (dans la fourchette ~50-55° de l'amendement). Le partage
 * et l'historique passent leur propre pitch (~55°) et ne sont donc pas touchés.
 * UI pure — aucune règle de jeu.
 */
const MODE_3D_DEFAULT_PITCH = 52;
/** Caméra de secours si ni `camera` ni `bounds` : monde entier (§4bis). */
const WORLD_FALLBACK_CAMERA: RealMapCamera = { lng: 0, lat: 20, zoom: 1 };
/**
 * Polices des labels de points : piles de glyphes présentes dans le style
 * CARTO dark-matter (la prod Protomaps devra fournir les mêmes stacks — O6).
 */
const POINT_LABEL_FONTS = ['Montserrat Medium', 'Open Sans Bold', 'Noto Sans Regular'];
const POINT_LABEL_HALO_WIDTH = 1.2;
/** Couleur/label des points lus PAR FEATURE (tokens posés en amont). */
const POINT_COLOR_EXPR = ['get', 'color'] as const;
const POINT_LABEL_EXPR = ['get', 'label'] as const;

/**
 * AMENDEMENT-37 §3 (contrat C2/C4) — couches de TERRITOIRE interrogées au tap
 * (queryRenderedFeaturesAtPoint). Ids DÉRIVÉS de battleGameLayers (mapStyle) :
 * fills `${id}-fill` des états à AIRE (crew/rival/contesté) + traces `${id}-line`
 * (core/casing) des tracés de rôle. STABLES quel que soit le fond : les liserés
 * `-casing` sur fond clair sont EN PLUS, mais le core (même id de base) reste au
 * sommet et porte le `zoneId`. Le binding natif exige un `layerIDs: string[]` —
 * on scope donc à cette liste (perf + on ignore le décor). Une feature manquée
 * (trait fin) ⇒ zoneId null ⇒ tap traité comme « vide » (désélection).
 */
const TERRITORY_QUERY_BASE_IDS: readonly string[] = [
  // Ligne de capture invisible LARGE (§3 P2) : élargit la cible tactile des
  // zones-couloirs fines — interrogée EN PREMIER (elle est peinte tout au fond).
  'terr-hit-line',
  'terr-crew-fill-fill',
  'terr-rival-fill-fill',
  'terr-contested-fill-fill',
  'terr-crew-casing-line',
  'terr-crew-core-line',
  'terr-rival-casing-line',
  'terr-rival-core-line',
  'terr-objective-line',
  'terr-outpost-line',
  'terr-decay-line',
  'terr-decay-urgent-line',
  'terr-protected-line',
  'terr-contested-line',
  'terr-contested-outer-line',
];
// AMENDEMENT-37 §2 : à la sélection, applySelectionDim (mapStyle) déplace les
// zones NON sélectionnées dans des couches jumelles `${id}-dim` (sublayers
// `-dim-fill` / `-dim-line`). Sans elles dans le scope, taper une AUTRE zone
// pendant qu'une est sélectionnée n'interrogerait que les couches base élaguées
// → zoneId null → désélection au lieu de bascule (parité avec le fork web qui,
// lui, filtre par préfixe `terr-` et inclut donc déjà les jumelles). On dérive
// donc la variante `-dim` de chaque id (insérée avant le suffixe -fill/-line).
const TERRITORY_QUERY_LAYER_IDS: string[] = [
  ...TERRITORY_QUERY_BASE_IDS,
  ...TERRITORY_QUERY_BASE_IDS.map((id) => id.replace(/-(fill|line)$/, '-dim-$1')),
];

/** 1ʳᵉ feature portant un `zoneId` string non vide dans une collection (§3). */
function firstZoneId(features: readonly GeoJSON.Feature[] | undefined): string | null {
  for (const f of features ?? []) {
    const z = f.properties?.zoneId;
    if (typeof z === 'string' && z.length > 0) return z;
  }
  return null;
}

/**
 * AMENDEMENT-27 — VRAI 3D : bâtiments de la ville extrudés (fork natif). Id du
 * FillExtrusionLayer + expressions data-driven partagées (indépendantes des
 * props → hors render). Hauteur = `render_height` RÉELLE (repli doux si absente
 * ou 0), base = `render_min_height`, `hide_3d` exclu. Charte : couleur SOMBRE
 * désaturée (fond) — inséré SOUS les couches de jeu (les zones/trace GRYD
 * passent DEVANT). Le relief DEM n'est pas disponible côté natif (binding v10).
 */
const CITY_BUILDINGS_LAYER_ID = 'gryd-3d-buildings';
/** Ne pas lever les empreintes marquées `hide_3d` (schéma OpenMapTiles CARTO). */
const CITY_BUILDINGS_FILTER: Expression = ['!=', ['get', 'hide_3d'], true];
/** Hauteur : `render_height` si > 0, sinon repli doux (toujours du volume). */
const CITY_BUILDINGS_HEIGHT_EXPR: Expression = [
  'case',
  ['>', ['coalesce', ['get', 'render_height'], 0], 0],
  ['get', 'render_height'],
  buildings3dStyle.defaultHeightM,
];
const CITY_BUILDINGS_BASE_EXPR: Expression = ['coalesce', ['get', 'render_min_height'], 0];
/** Zoom mini d'apparition des empreintes (niveau rue). */
const CITY_BUILDINGS_MIN_ZOOM = 14;

/**
 * GRYD_REGLES §B — TRACE HÉROS : valeur `lineWidth` d'une couche. Si
 * `lineWidthStops` est fourni (paliers `[zoom, px]`), renvoie une interpolation
 * LINÉAIRE par zoom (la trace grossit au zoom, façon Strava) ; sinon le scalaire
 * `lineWidth` (défaut 1) — non-régression totale. Parité avec le fork web.
 */
function lineWidthValue(spec: RealMapGeoJSONLayer): number | Expression {
  if (spec.lineWidthStops && spec.lineWidthStops.length >= 2) {
    return [
      'interpolate',
      ['linear'],
      ['zoom'],
      ...spec.lineWidthStops.flatMap(([zoom, px]) => [zoom, px]),
    ] as Expression;
  }
  return spec.lineWidth ?? 1;
}

/**
 * AMENDEMENT-37 §1 — FILL DE POSSESSION LOD : valeur `fillOpacity` d'une couche.
 * Si `fillOpacityStops` est fourni (paliers `[zoom, opacité]`), renvoie une
 * interpolation LINÉAIRE par zoom (l'aplat naît au dézoom ville puis s'efface au
 * niveau rue) ; sinon le scalaire `fillOpacity` (défaut 1) — non-régression.
 * Parité avec le fork web / avec `lineWidthValue`.
 */
function fillOpacityValue(spec: RealMapGeoJSONLayer): number | Expression {
  if (spec.fillOpacityStops && spec.fillOpacityStops.length >= 2) {
    return [
      'interpolate',
      ['linear'],
      ['zoom'],
      ...spec.fillOpacityStops.flatMap(([zoom, op]) => [zoom, op]),
    ] as Expression;
  }
  return spec.fillOpacity ?? 1;
}

/**
 * Contour PULSÉ (contesté §4ter) isolé dans sa propre feuille : le toggle
 * d'opacité ne re-rend QUE ce composant, et le fondu min↔1 est fait par la
 * transition de style MapLibre (GPU). Reduce motion → contour plein fixe.
 * `sourceID` est injecté par ShapeSource (cloneReactChildrenWithProps) et
 * transmis tel quel au LineLayer.
 */
function PulsingLineLayer({
  id,
  lineColor,
  lineWidth,
  lineDash,
  lineOffset,
  sourceID,
}: {
  id: string;
  lineColor: string;
  /** Scalaire OU interpolation par zoom (§B — parité `lineWidthValue`). */
  lineWidth: number | Expression;
  lineDash?: readonly number[];
  lineOffset?: number;
  sourceID?: string;
}) {
  const reduceMotion = useReduceMotion();
  const [low, setLow] = useState(false);
  useEffect(() => {
    if (reduceMotion) {
      setLow(false);
      return undefined;
    }
    const timer = setInterval(() => setLow((v) => !v), PULSE_HALF_PERIOD_MS);
    return () => clearInterval(timer);
  }, [reduceMotion]);
  const style = useMemo<LineLayerStyle>(
    () => ({
      lineColor,
      lineWidth,
      lineCap: 'round',
      lineJoin: 'round',
      lineOpacity: low ? PULSE_MIN_OPACITY_RATIO : 1,
      lineOpacityTransition: { duration: PULSE_HALF_PERIOD_MS, delay: 0 },
      ...(lineDash ? { lineDasharray: [...lineDash] } : {}),
      ...(lineOffset !== undefined ? { lineOffset } : {}),
    }),
    [lineColor, lineWidth, lineDash, lineOffset, low],
  );
  return <LineLayer id={id} sourceID={sourceID} style={style} />;
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
    attributionCompact = true,
    basemap,
    // Parité d'interface web (AMENDEMENT-20 §1) — accepté, sans surcharge de
    // calques de tuile côté natif (voir doc de la prop). Non destructuré vers MapView.
    silent: _silent = false,
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
   * AMENDEMENT-27 — VRAI 3D (bâtiments extrudés) : actif dès que la caméra est
   * inclinée (`mode3d` OU `pitch` explicite > 0, partage/historique). Pitch 0
   * (2D) ⇒ jamais d'extrusion bâtiment : la 2D reste STRICTEMENT plate.
   * NOTE relief : le binding natif @maplibre/maplibre-react-native v10 n'expose
   * PAS encore de `Terrain`/`RasterDemSource` (aucune API DEM côté natif) — le
   * relief du terrain (Terrarium) est branché côté WEB et reste un point ouvert
   * natif (upgrade du binding, cf. O6). Les BÂTIMENTS 3D, eux, sont rendus ici.
   */
  const is3d = pitch > 0;
  const cameraRef = useRef<CameraRef>(null);
  /** Réf MapView — queryRenderedFeaturesAtPoint au tap (§3 tap→zone). */
  const mapViewRef = useRef<MapViewRef>(null);
  const reduceMotion = useReduceMotion();
  const [offline, setOffline] = useState(false);
  const openCamera = camera ?? WORLD_FALLBACK_CAMERA;

  /**
   * Styles des couches MÉMOÏSÉS par identité du tableau (§5 perf : les écrans
   * mémoïsent leurs layers — aucun nouvel objet style par render). Le contour
   * pulsé est exclu : il vit dans PulsingLineLayer.
   */
  const layerStyles = useMemo(
    () =>
      geojsonLayers.map((spec) => {
        // AMENDEMENT-24 — CARTE 3D : cette couche s'élève en volume seulement en
        // mode 3D. Sinon (défaut), l'aplat plat historique — non-régression.
        const extruded = extrudeZones && spec.extrude === true;
        return {
          // L'aplat plat est SUPPRIMÉ quand le volume le remplace (extruded).
          fill:
            spec.fillColor !== undefined && !extruded
              ? ({
                  fillColor: spec.fillColor,
                  // §1 : opacité par zoom (interpolate) si stops, sinon scalaire.
                  fillOpacity: fillOpacityValue(spec),
                } satisfies FillLayerStyle)
              : null,
          // Volume 3D chartreuse translucide (le look signature GRYD).
          extrusion: extruded
            ? ({
                fillExtrusionColor: spec.extrudeColor ?? spec.fillColor ?? '#ffffff',
                fillExtrusionHeight: spec.extrudeHeight ?? 0,
                fillExtrusionBase: spec.extrudeBase ?? 0,
                fillExtrusionOpacity: spec.extrudeOpacity ?? spec.fillOpacity ?? 1,
              } satisfies FillExtrusionLayerStyle)
            : null,
          line:
            spec.lineColor !== undefined && spec.pulse !== true
              ? ({
                  lineColor: spec.lineColor,
                  // §B : largeur par zoom (interpolate) si stops, sinon scalaire.
                  lineWidth: lineWidthValue(spec),
                  // §4ter / §B : jointures ET extrémités ARRONDIES — trace fluide,
                  // sportive, jamais anguleuse.
                  lineCap: 'round',
                  lineJoin: 'round',
                  // Opacité STATIQUE (route restante 60 %, exclu 35 %).
                  ...(spec.lineOpacity !== undefined ? { lineOpacity: spec.lineOpacity } : {}),
                  ...(spec.lineDash ? { lineDasharray: [...spec.lineDash] } : {}),
                  ...(spec.lineOffset !== undefined ? { lineOffset: spec.lineOffset } : {}),
                } satisfies LineLayerStyle)
              : null,
        };
      }),
    [geojsonLayers, extrudeZones],
  );

  /** Styles des calques de points (§4bis) — mémoïsés eux aussi. */
  const pointStyles = useMemo(
    () =>
      (pointLayers ?? []).map((spec) => ({
        circle: {
          circleColor: POINT_COLOR_EXPR,
          circleRadius: spec.circleRadius,
          circleStrokeColor: spec.circleStrokeColor,
          circleStrokeWidth: spec.circleStrokeWidth,
        } satisfies CircleLayerStyle,
        symbol: {
          textField: POINT_LABEL_EXPR,
          textFont: POINT_LABEL_FONTS,
          textSize: spec.textSize,
          textColor: POINT_COLOR_EXPR,
          textHaloColor: spec.textHaloColor,
          textHaloWidth: POINT_LABEL_HALO_WIDTH,
          textAnchor: 'top',
          textOffset: [0, spec.textOffsetEm],
          textLetterSpacing: spec.textLetterSpacing ?? 0,
          textAllowOverlap: true,
        } satisfies SymbolLayerStyle,
      })),
    [pointLayers],
  );

  useImperativeHandle(
    ref,
    (): RealMapRef => ({
      flyTo(target) {
        cameraRef.current?.setCamera({
          centerCoordinate: [target.lng, target.lat],
          ...(target.zoom !== undefined ? { zoomLevel: target.zoom } : {}),
          animationMode: 'flyTo',
          animationDuration: reduceMotion ? 0 : FLY_TO_MS,
        });
      },
      fitBounds(target) {
        cameraRef.current?.fitBounds(
          target.ne,
          target.sw,
          target.paddingPx,
          reduceMotion ? 0 : FLY_TO_MS,
        );
      },
    }),
    [reduceMotion],
  );

  return (
    <View style={[styles.root, style]} testID={testID}>
      <MapView
        ref={mapViewRef}
        style={styles.map}
        mapStyle={basemapStyleUrl(basemap)}
        attributionEnabled={false}
        logoEnabled={false}
        compassEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        onDidFailLoadingMap={() => setOffline(true)}
        onDidFinishLoadingMap={() => setOffline(false)}
        onRegionIsChanging={(feature) => onZoomChange?.(feature.properties.zoomLevel)}
        onRegionDidChange={(feature) => onZoomChange?.(feature.properties.zoomLevel)}
        onPress={(feature) => {
          if (!onPress || feature.geometry.type !== 'Point') return;
          const [lng, lat] = feature.geometry.coordinates;
          if (lng === undefined || lat === undefined) return;
          // §3 : id de la zone tapée via queryRenderedFeaturesAtPoint (point
          // ÉCRAN porté par le feature onPress) → sheet de zone. NE casse pas les
          // markers (MarkerView, hors des couches de la carte).
          const props = feature.properties as { screenPointX?: number; screenPointY?: number } | null;
          const sx = props?.screenPointX;
          const sy = props?.screenPointY;
          const view = mapViewRef.current;
          if (view && typeof sx === 'number' && typeof sy === 'number') {
            void view
              .queryRenderedFeaturesAtPoint([sx, sy], undefined, TERRITORY_QUERY_LAYER_IDS)
              .then((fc) => onPress({ lng, lat, zoneId: firstZoneId(fc?.features) }))
              .catch(() => onPress({ lng, lat, zoneId: null }));
          } else {
            onPress({ lng, lat, zoneId: null });
          }
        }}
      >
        {/* §4bis : cadrage d'OUVERTURE seulement (camera OU fitBounds) — le
            monde reste librement navigable (aucun maxBounds, aucun minZoom). */}
        {bounds ? (
          <Camera
            ref={cameraRef}
            bounds={{
              ne: bounds.ne,
              sw: bounds.sw,
              paddingLeft: bounds.paddingPx,
              paddingRight: bounds.paddingPx,
              paddingTop: bounds.paddingPx,
              paddingBottom: bounds.paddingPx,
            }}
            // AMENDEMENT-24 — CARTE 3D : inclinaison/cap (défaut 0/0 = plat).
            pitch={pitch}
            heading={bearing}
            animationMode="easeTo"
            animationDuration={reduceMotion ? 0 : motion.transitionMs}
          />
        ) : (
          <Camera
            ref={cameraRef}
            centerCoordinate={[openCamera.lng, openCamera.lat]}
            zoomLevel={openCamera.zoom}
            // AMENDEMENT-24 — CARTE 3D : inclinaison/cap (défaut 0/0 = plat).
            pitch={pitch}
            heading={bearing}
            animationMode="easeTo"
            animationDuration={reduceMotion ? 0 : motion.transitionMs}
          />
        )}

        {/* AMENDEMENT-27 — VRAI 3D : BÂTIMENTS de la ville extrudés (mode 3D
            SEULEMENT). Source vectorielle CARTO DÉDIÉE (id propre, keyless
            tilejson) + FillExtrusion sur la source-layer `building` — hauteur
            RÉELLE (render_height), couleur SOMBRE désaturée (fond). Placé AVANT
            les couches de jeu → celles-ci, montées après, passent DEVANT (les
            zones/trace GRYD restent dominantes — charte). En 2D : non monté →
            aucune extrusion, carte STRICTEMENT plate (non-régression). Le relief
            DEM n'est pas exposé par le binding natif v10 (branché côté web).
            AMENDEMENT-28 — sur le fond SATELLITE : PAS d'extrusion vectorielle
            (les toits sont déjà dans la photo → doublon/clash évité ; le style
            raster n'a d'ailleurs pas la source vectorielle `carto`). */}
        {is3d && basemap !== 'satellite' ? (
          <VectorSource
            id={MAP_3D.nativeVectorSourceId}
            url={MAP_3D.vectorTileJsonUrl}
            maxZoomLevel={14}
          >
            <FillExtrusionLayer
              id={CITY_BUILDINGS_LAYER_ID}
              sourceLayerID={MAP_3D.buildingSourceLayer}
              minZoomLevel={CITY_BUILDINGS_MIN_ZOOM}
              filter={CITY_BUILDINGS_FILTER}
              style={{
                fillExtrusionColor: buildings3dStyle.fillColor,
                fillExtrusionHeight: CITY_BUILDINGS_HEIGHT_EXPR,
                fillExtrusionBase: CITY_BUILDINGS_BASE_EXPR,
                fillExtrusionOpacity: buildings3dStyle.fillOpacity,
              }}
            />
          </VectorSource>
        ) : null}

        {geojsonLayers.map((spec, index) => {
          const memo = layerStyles[index];
          return (
            <ShapeSource key={spec.id} id={spec.id} shape={spec.data}>
              {memo?.fill ? <FillLayer id={`${spec.id}-fill`} style={memo.fill} /> : null}
              {/* AMENDEMENT-24 — CARTE 3D : volume extrudé (le territoire monte). */}
              {memo?.extrusion ? (
                <FillExtrusionLayer id={`${spec.id}-extrude`} style={memo.extrusion} />
              ) : null}
              {spec.pulse && spec.lineColor !== undefined ? (
                <PulsingLineLayer
                  id={`${spec.id}-line`}
                  lineColor={spec.lineColor}
                  lineWidth={lineWidthValue(spec)}
                  lineDash={spec.lineDash}
                  lineOffset={spec.lineOffset}
                />
              ) : memo?.line ? (
                <LineLayer id={`${spec.id}-line`} style={memo.line} />
              ) : null}
            </ShapeSource>
          );
        })}

        {/* Marqueurs-points villes (§4bis) : bornés par minzoom/maxzoom — la
            visibilité suit le zoom réel, jamais un état React. */}
        {pointLayers?.map((spec, index) => {
          const memo = pointStyles[index];
          if (!memo) return null;
          const zoomProps = {
            ...(spec.minZoom !== undefined ? { minZoomLevel: spec.minZoom } : {}),
            ...(spec.maxZoom !== undefined ? { maxZoomLevel: spec.maxZoom } : {}),
          };
          return (
            <ShapeSource key={spec.id} id={spec.id} shape={spec.data}>
              <CircleLayer id={`${spec.id}-dot`} {...zoomProps} style={memo.circle} />
              <SymbolLayer id={`${spec.id}-label`} {...zoomProps} style={memo.symbol} />
            </ShapeSource>
          );
        })}

        {markers?.map((marker) => (
          <MarkerView
            key={marker.id}
            coordinate={[marker.lng, marker.lat]}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            {/* MarkerView exige UN ReactElement — on enveloppe le contenu. */}
            <View>{marker.children}</View>
          </MarkerView>
        ))}
      </MapView>

      {/* Attribution compacte OBLIGATOIRE — source du fond actif (CARTO/OSM, ou
          Esri/Maxar sur satellite — AMENDEMENT-28). */}
      {attributionCompact ? (
        <Text style={styles.attribution} accessibilityRole="text">
          {basemapAttribution(basemap)}
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
  map: {
    ...StyleSheet.absoluteFillObject,
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
