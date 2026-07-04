/**
 * GRYD — RealMap, variante NATIVE (AMENDEMENT-13 §1/§4) : mêmes vraies tuiles
 * sombres (styleURL dark-matter) via `@maplibre/maplibre-react-native` (déjà
 * intégré), même API que ./RealMap.web.tsx (fork de plateforme — interfaces
 * dupliquées à l'identique, Metro résout la bonne variante par extension).
 * Chaque entrée `geojsonLayers` devient ShapeSource + FillLayer/LineLayer ;
 * les markers passent par MarkerView. `pulse` (contesté) est animé par un
 * timer JS → lineOpacity, coupé si reduce motion (useReduceMotion).
 * Attribution © OpenStreetMap © CARTO compacte (obligation légale) ; échec de
 * chargement → fond noir + « Carte indisponible — tes zones restent à toi »
 * (onDidFailLoadingMap), jamais d'écran blanc. Compilable sans device — la
 * vérification visuelle prioritaire reste la variante web (Expo Web).
 */
import {
  Camera,
  FillLayer,
  LineLayer,
  MapView,
  MarkerView,
  ShapeSource,
  type CameraRef,
} from '@maplibre/maplibre-react-native';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fonts, fontSizes, motion } from '@klaim/shared';
import { useReduceMotion } from './anim';

// ─── API commune (dupliquée à l'identique dans RealMap.web.tsx — fork RN) ───

/** Style vectoriel sombre de dev SANS CLÉ (AMENDEMENT-13 §1 — O6 pour la prod). */
export const DARK_MAP_STYLE_URL =
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

export interface RealMapCamera {
  lng: number;
  lat: number;
  zoom: number;
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
  /** Pointillé (traitement decay AMENDEMENT-11). */
  lineDash?: readonly number[];
  /** Pulse lent du contour (contesté) — coupé si reduce motion. */
  pulse?: boolean;
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
}

export interface RealMapProps {
  /** Caméra contrôlée : appliquée au montage puis à chaque changement (easeTo). */
  camera: RealMapCamera;
  /** Couches de jeu, peintes dans l'ordre du tableau (la dernière au-dessus). */
  geojsonLayers: readonly RealMapGeoJSONLayer[];
  markers?: readonly RealMapMarker[];
  onPress?: (event: RealMapPressEvent) => void;
  /** Zoom courant, notifié à chaque mouvement de caméra (seuil marqueurs §4bis). */
  onZoomChange?: (zoom: number) => void;
  /** Attribution compacte © OpenStreetMap © CARTO (défaut true — obligatoire). */
  attributionCompact?: boolean;
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
/** Pas du timer de pulse natif (setPaintProperty n'existe pas côté RN). */
const PULSE_TICK_MS = 80;
/** Durée du flyTo natif. */
const FLY_TO_MS = 800;

export const RealMap = forwardRef<RealMapRef, RealMapProps>(function RealMap(
  {
    camera,
    geojsonLayers,
    markers,
    onPress,
    onZoomChange,
    attributionCompact = true,
    style,
    testID,
  }: RealMapProps,
  ref,
) {
  const cameraRef = useRef<CameraRef>(null);
  const reduceMotion = useReduceMotion();
  const [offline, setOffline] = useState(false);
  /** Opacité animée des contours `pulse` (state → LineLayer.lineOpacity). */
  const [pulseOpacity, setPulseOpacity] = useState(1);

  const hasPulse = geojsonLayers.some((l) => l.pulse && l.lineColor !== undefined);
  useEffect(() => {
    if (!hasPulse || reduceMotion) {
      setPulseOpacity(1);
      return undefined;
    }
    const start = Date.now();
    const timer = setInterval(() => {
      const phase = ((Date.now() - start) % PULSE_PERIOD_MS) / PULSE_PERIOD_MS;
      setPulseOpacity(
        PULSE_MIN_OPACITY_RATIO +
          (1 - PULSE_MIN_OPACITY_RATIO) * (0.5 + 0.5 * Math.sin(phase * Math.PI * 2)),
      );
    }, PULSE_TICK_MS);
    return () => clearInterval(timer);
  }, [hasPulse, reduceMotion]);

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
    }),
    [reduceMotion],
  );

  return (
    <View style={[styles.root, style]} testID={testID}>
      <MapView
        style={styles.map}
        mapStyle={DARK_MAP_STYLE_URL}
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
        <Camera
          ref={cameraRef}
          centerCoordinate={[camera.lng, camera.lat]}
          zoomLevel={camera.zoom}
          animationMode="easeTo"
          animationDuration={reduceMotion ? 0 : motion.transitionMs}
        />

        {geojsonLayers.map((layer) => (
          <ShapeSource key={layer.id} id={layer.id} shape={layer.data}>
            {layer.fillColor !== undefined ? (
              <FillLayer
                id={`${layer.id}-fill`}
                style={{ fillColor: layer.fillColor, fillOpacity: layer.fillOpacity ?? 1 }}
              />
            ) : null}
            {layer.lineColor !== undefined ? (
              <LineLayer
                id={`${layer.id}-line`}
                style={{
                  lineColor: layer.lineColor,
                  lineWidth: layer.lineWidth ?? 1,
                  lineOpacity: layer.pulse ? pulseOpacity : 1,
                  ...(layer.lineDash ? { lineDasharray: [...layer.lineDash] } : {}),
                }}
              />
            ) : null}
          </ShapeSource>
        ))}

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
