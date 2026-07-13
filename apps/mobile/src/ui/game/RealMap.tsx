/**
 * GRYD — RealMap, point d'entrée natif.
 *
 * Expo Go ne contient pas `@maplibre/maplibre-react-native`. On évite donc de
 * charger MapLibre quand l'app tourne dans Expo Go, tout en gardant la vraie
 * carte native pour les development builds EAS et les builds App Store.
 */
import Constants from 'expo-constants';
import { forwardRef, useImperativeHandle, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect, Text as SvgText } from 'react-native-svg';
import { colors, fonts, withAlpha } from '@klaim/shared';
import { MAP_BASEMAP_STYLES, basemapAttribution } from '../../features/map/mapStyle';
import type {
  RealMapBounds,
  RealMapCamera,
  RealMapGeoJSONLayer,
  RealMapMarker,
  RealMapPointLayer,
  RealMapPressEvent,
  RealMapProps,
  RealMapRef,
} from './RealMapNative';

export type {
  RealMapBounds,
  RealMapCamera,
  RealMapGeoJSONLayer,
  RealMapMarker,
  RealMapPointLayer,
  RealMapPressEvent,
  RealMapProps,
  RealMapRef,
} from './RealMapNative';

export const DARK_MAP_STYLE_URL = MAP_BASEMAP_STYLES.dark;

const VIEWBOX_SIZE = 1000;
const FALLBACK_PADDING = 84;
const FALLBACK_CAMERA_ZOOM = 14.6;
const FALLBACK_ATTRIBUTION = '© GRYD';

type RealMapNativeModule = typeof import('./RealMapNative');
type BoundsBox = {
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
};
type ProjectedPoint = { x: number; y: number };

let nativeModule: RealMapNativeModule | null = null;

function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

function loadNativeMap(): RealMapNativeModule['RealMap'] {
  nativeModule ??= require('./RealMapNative') as RealMapNativeModule;
  return nativeModule.RealMap;
}

function visitCoordinates(value: unknown, visit: (lng: number, lat: number) => void): void {
  if (!Array.isArray(value)) return;
  const [lng, lat] = value;
  if (typeof lng === 'number' && typeof lat === 'number') {
    visit(lng, lat);
    return;
  }
  for (const child of value) visitCoordinates(child, visit);
}

function visitGeometry(geometry: GeoJSON.Geometry, visit: (lng: number, lat: number) => void): void {
  if (geometry.type === 'GeometryCollection') {
    for (const child of geometry.geometries) visitGeometry(child, visit);
    return;
  }
  visitCoordinates(geometry.coordinates, visit);
}

function boundsFromProps({
  bounds,
  camera,
  geojsonLayers,
  pointLayers,
  markers,
}: Pick<RealMapProps, 'bounds' | 'camera' | 'geojsonLayers' | 'pointLayers' | 'markers'>): BoundsBox {
  if (bounds) {
    return {
      minLng: bounds.sw[0],
      minLat: bounds.sw[1],
      maxLng: bounds.ne[0],
      maxLat: bounds.ne[1],
    };
  }

  const box: BoundsBox = {
    minLng: Number.POSITIVE_INFINITY,
    maxLng: Number.NEGATIVE_INFINITY,
    minLat: Number.POSITIVE_INFINITY,
    maxLat: Number.NEGATIVE_INFINITY,
  };

  const add = (lng: number, lat: number) => {
    box.minLng = Math.min(box.minLng, lng);
    box.maxLng = Math.max(box.maxLng, lng);
    box.minLat = Math.min(box.minLat, lat);
    box.maxLat = Math.max(box.maxLat, lat);
  };

  for (const layer of geojsonLayers) {
    for (const feature of layer.data.features) visitGeometry(feature.geometry, add);
  }
  for (const layer of pointLayers ?? []) {
    for (const feature of layer.data.features) visitGeometry(feature.geometry, add);
  }
  for (const marker of markers ?? []) add(marker.lng, marker.lat);

  if (!Number.isFinite(box.minLng) || !Number.isFinite(box.minLat)) {
    const center = camera ?? { lng: 2.3522, lat: 48.8566, zoom: FALLBACK_CAMERA_ZOOM };
    const span = Math.max(0.006, 0.16 / Math.max(1, center.zoom));
    return {
      minLng: center.lng - span,
      maxLng: center.lng + span,
      minLat: center.lat - span,
      maxLat: center.lat + span,
    };
  }

  const lngPad = Math.max((box.maxLng - box.minLng) * 0.18, 0.002);
  const latPad = Math.max((box.maxLat - box.minLat) * 0.18, 0.002);
  return {
    minLng: box.minLng - lngPad,
    maxLng: box.maxLng + lngPad,
    minLat: box.minLat - latPad,
    maxLat: box.maxLat + latPad,
  };
}

function project(bounds: BoundsBox, lng: number, lat: number): ProjectedPoint {
  const width = Math.max(bounds.maxLng - bounds.minLng, 0.000001);
  const height = Math.max(bounds.maxLat - bounds.minLat, 0.000001);
  return {
    x: FALLBACK_PADDING + ((lng - bounds.minLng) / width) * (VIEWBOX_SIZE - FALLBACK_PADDING * 2),
    y: FALLBACK_PADDING + ((bounds.maxLat - lat) / height) * (VIEWBOX_SIZE - FALLBACK_PADDING * 2),
  };
}

function geometryPaths(
  coordinates: unknown,
  bounds: BoundsBox,
  closed: boolean,
): string[] {
  if (!Array.isArray(coordinates)) return [];
  const first = coordinates[0];
  if (Array.isArray(first) && typeof first[0] === 'number' && typeof first[1] === 'number') {
    const points = coordinates
      .map((coord) => project(bounds, coord[0], coord[1]))
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`);
    return points.length ? [`${points.join(' ')}${closed ? ' Z' : ''}`] : [];
  }
  return coordinates.flatMap((child) => geometryPaths(child, bounds, closed));
}

function layerPaths(layer: RealMapGeoJSONLayer, bounds: BoundsBox): string[] {
  return layer.data.features.flatMap((feature) => {
    if (feature.geometry.type === 'GeometryCollection') {
      return feature.geometry.geometries.flatMap((geometry) =>
        geometry.type === 'GeometryCollection'
          ? []
          : geometryPaths(geometry.coordinates, bounds, geometry.type.includes('Polygon')),
      );
    }
    return geometryPaths(
      feature.geometry.coordinates,
      bounds,
      feature.geometry.type.includes('Polygon'),
    );
  });
}

function pointFeatures(layer: RealMapPointLayer, bounds: BoundsBox) {
  return layer.data.features.flatMap((feature) => {
    if (feature.geometry.type !== 'Point') return [];
    const [lng, lat] = feature.geometry.coordinates;
    if (lng === undefined || lat === undefined) return [];
    const point = project(bounds, lng, lat);
    const props = feature.properties ?? {};
    return [{
      ...point,
      color: typeof props.color === 'string' ? props.color : colors.chartreuse,
      label: typeof props.label === 'string' ? props.label : '',
      radius: layer.circleRadius,
      textSize: layer.textSize,
      textOffset: layer.textOffsetEm,
    }];
  });
}

function ExpoGoMapFallback({
  camera,
  bounds,
  geojsonLayers,
  pointLayers,
  markers,
  attributionCompact = true,
  basemap,
  style,
  testID,
}: RealMapProps) {
  const mapBounds = useMemo(
    () => boundsFromProps({ bounds, camera, geojsonLayers, pointLayers, markers }),
    [bounds, camera, geojsonLayers, pointLayers, markers],
  );
  const markerPositions = useMemo(
    () =>
      (markers ?? []).map((marker) => ({
        marker,
        point: project(mapBounds, marker.lng, marker.lat),
      })),
    [mapBounds, markers],
  );
  const attribution = basemap ? basemapAttribution(basemap) : FALLBACK_ATTRIBUTION;

  return (
    <View style={[styles.root, style]} testID={testID}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}>
        <Rect width={VIEWBOX_SIZE} height={VIEWBOX_SIZE} fill={colors.noir} />
        {Array.from({ length: 12 }, (_, index) => (
          <Path
            key={`grid-a-${index}`}
            d={`M ${index * 120 - 240} 0 L ${index * 120 + 280} ${VIEWBOX_SIZE}`}
            stroke={withAlpha(colors.blanc, 0.08)}
            strokeWidth={2}
          />
        ))}
        {Array.from({ length: 12 }, (_, index) => (
          <Path
            key={`grid-b-${index}`}
            d={`M ${index * 120 + 280} 0 L ${index * 120 - 240} ${VIEWBOX_SIZE}`}
            stroke={withAlpha(colors.blanc, 0.05)}
            strokeWidth={2}
          />
        ))}
        {geojsonLayers.flatMap((layer) =>
          layerPaths(layer, mapBounds).flatMap((path, index) => {
            const key = `${layer.id}-${index}`;
            return [
              layer.fillColor ? (
                <Path
                  key={`${key}-fill`}
                  d={path}
                  fill={layer.fillColor}
                  fillOpacity={layer.fillOpacity ?? 1}
                />
              ) : null,
              layer.lineColor ? (
                <Path
                  key={`${key}-line`}
                  d={path}
                  fill="none"
                  stroke={layer.lineColor}
                  strokeOpacity={layer.lineOpacity ?? 1}
                  strokeWidth={layer.lineWidth ?? 3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={layer.lineDash?.join(' ')}
                />
              ) : null,
            ];
          }),
        )}
        {(pointLayers ?? []).flatMap((layer) =>
          pointFeatures(layer, mapBounds).map((point, index) => (
            <SvgText
              key={`${layer.id}-${index}-label`}
              x={point.x}
              y={point.y + point.radius + point.textSize * point.textOffset}
              fill={point.color}
              fontSize={point.textSize}
              fontWeight="700"
              textAnchor="middle"
            >
              {point.label}
            </SvgText>
          )),
        )}
        {(pointLayers ?? []).flatMap((layer) =>
          pointFeatures(layer, mapBounds).map((point, index) => (
            <Circle
              key={`${layer.id}-${index}-dot`}
              cx={point.x}
              cy={point.y}
              r={point.radius}
              fill={point.color}
              stroke={layer.circleStrokeColor}
              strokeWidth={layer.circleStrokeWidth}
            />
          )),
        )}
      </Svg>

      {markerPositions.map(({ marker, point }) => (
        <View
          key={marker.id}
          pointerEvents="none"
          style={[
            styles.marker,
            {
              left: `${(point.x / VIEWBOX_SIZE) * 100}%`,
              top: `${(point.y / VIEWBOX_SIZE) * 100}%`,
            },
          ]}
        >
          {marker.children}
        </View>
      ))}

      {attributionCompact ? <Text style={styles.attribution}>{attribution}</Text> : null}
    </View>
  );
}

export const RealMap = forwardRef<RealMapRef, RealMapProps>(function RealMap(props, ref) {
  useImperativeHandle(
    ref,
    (): RealMapRef => ({
      flyTo() {},
      fitBounds() {},
    }),
    [],
  );

  if (isExpoGo()) return <ExpoGoMapFallback {...props} />;

  const NativeMap = loadNativeMap();
  return <NativeMap {...props} ref={ref} />;
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.noir,
    overflow: 'hidden',
  },
  marker: {
    position: 'absolute',
    transform: [{ translateX: -18 }, { translateY: -18 }],
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
});
