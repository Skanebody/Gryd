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
  FillLayer,
  LineLayer,
  MapView,
  MarkerView,
  ShapeSource,
  SymbolLayer,
  type CameraRef,
  type CircleLayerStyle,
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
import { MAP_BASEMAP_STYLES, type BasemapKey } from '../../features/map/mapStyle';
import { useReduceMotion } from './anim';

// ─── API commune (dupliquée à l'identique dans RealMap.web.tsx — fork RN) ───

/** Style vectoriel sombre de dev SANS CLÉ (AMENDEMENT-13 §1 — O6 pour la prod). */
export const DARK_MAP_STYLE_URL = MAP_BASEMAP_STYLES.dark;

/** Résout le styleURL du fond demandé (défaut sombre). */
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
  lineWidth: number;
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
    style,
    testID,
  }: RealMapProps,
  ref,
) {
  const cameraRef = useRef<CameraRef>(null);
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
      geojsonLayers.map((spec) => ({
        fill:
          spec.fillColor !== undefined
            ? ({
                fillColor: spec.fillColor,
                fillOpacity: spec.fillOpacity ?? 1,
              } satisfies FillLayerStyle)
            : null,
        line:
          spec.lineColor !== undefined && spec.pulse !== true
            ? ({
                lineColor: spec.lineColor,
                lineWidth: spec.lineWidth ?? 1,
                // §4ter : coins à jointure arrondie légère, extrémités rondes.
                lineCap: 'round',
                lineJoin: 'round',
                ...(spec.lineDash ? { lineDasharray: [...spec.lineDash] } : {}),
                ...(spec.lineOffset !== undefined ? { lineOffset: spec.lineOffset } : {}),
              } satisfies LineLayerStyle)
            : null,
      })),
    [geojsonLayers],
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
          if (lng !== undefined && lat !== undefined) onPress({ lng, lat });
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
            animationMode="easeTo"
            animationDuration={reduceMotion ? 0 : motion.transitionMs}
          />
        ) : (
          <Camera
            ref={cameraRef}
            centerCoordinate={[openCamera.lng, openCamera.lat]}
            zoomLevel={openCamera.zoom}
            animationMode="easeTo"
            animationDuration={reduceMotion ? 0 : motion.transitionMs}
          />
        )}

        {geojsonLayers.map((spec, index) => {
          const memo = layerStyles[index];
          return (
            <ShapeSource key={spec.id} id={spec.id} shape={spec.data}>
              {memo?.fill ? <FillLayer id={`${spec.id}-fill`} style={memo.fill} /> : null}
              {spec.pulse && spec.lineColor !== undefined ? (
                <PulsingLineLayer
                  id={`${spec.id}-line`}
                  lineColor={spec.lineColor}
                  lineWidth={spec.lineWidth ?? 1}
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
