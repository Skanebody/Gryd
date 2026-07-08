/**
 * GRYD — carte live GPS réelle (AMENDEMENT-13 §2, AMENDEMENT-15 §2).
 * Trace chartreuse le long des vraies rues — pas de route démo, pas de hexes.
 */
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { colors } from '@klaim/shared';
import { RealMap, type RealMapGeoJSONLayer, type RealMapRef } from '../../../ui/game';
import { REAL_M_PER_DEG_LAT, RUNNER_SCALE_ZOOM, type LatLngPoint } from '../../map/realAnchors';
import { runTraceLayers } from '../../map/mapStyle';
import { NAV_MAP_METERS_PER_PIXEL } from '../liveNav';
import type { TraceGeoPoint } from './gateTypes';

const CAMERA_CENTER_Y_RATIO = 0.4;
const AVATAR_SIZE = 24;

function lineCollection(points: readonly LatLngPoint[]): RealMapGeoJSONLayer['data'] {
  if (points.length < 2) {
    return { type: 'FeatureCollection', features: [] };
  }
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: points.map((p) => [p.lng, p.lat]) },
        properties: {},
      },
    ],
  };
}

function headingDeg(from: LatLngPoint, to: LatLngPoint): number {
  const dLng = to.lng - from.lng;
  const dLat = to.lat - from.lat;
  return (Math.atan2(dLng, dLat) * 180) / Math.PI;
}

export interface RealGpsLiveMapProps {
  traceGeo: readonly TraceGeoPoint[];
  capturing: boolean;
  mode3d?: boolean;
  onFollowChange?: (following: boolean) => void;
}

export interface RealGpsLiveMapHandle {
  recenter: () => void;
}

export const RealGpsLiveMap = forwardRef<RealGpsLiveMapHandle, RealGpsLiveMapProps>(
  function RealGpsLiveMap({ traceGeo, capturing, mode3d = false, onFollowChange }, ref) {
    const mapRef = useRef<RealMapRef>(null);
    const followingRef = useRef(true);
    const [size, setSize] = useState<{ w: number; h: number } | null>(null);

    const pos = traceGeo[traceGeo.length - 1] ?? null;
    const prev = traceGeo.length >= 2 ? traceGeo[traceGeo.length - 2]! : null;
    const heading = pos && prev ? headingDeg(prev, pos) : 0;

    const onLayout = (e: LayoutChangeEvent) => {
      const { width, height } = e.nativeEvent.layout;
      setSize((prevSize) =>
        prevSize && prevSize.w === width && prevSize.h === height ? prevSize : { w: width, h: height },
      );
    };

    const camOffsetLat = size
      ? ((0.5 - CAMERA_CENTER_Y_RATIO) * size.h * NAV_MAP_METERS_PER_PIXEL) / REAL_M_PER_DEG_LAT
      : 0;

    const cameraTarget = useMemo(
      () =>
        pos
          ? { lng: pos.lng, lat: pos.lat - camOffsetLat, zoom: RUNNER_SCALE_ZOOM }
          : undefined,
      [pos, camOffsetLat],
    );

    const frozenCameraRef = useRef(cameraTarget);
    if (followingRef.current && cameraTarget) frozenCameraRef.current = cameraTarget;

    const onMapReady = useCallback(
      (map: { on(type: string, listener: () => void): unknown }) => {
        map.on('dragstart', () => {
          if (!followingRef.current) return;
          followingRef.current = false;
          onFollowChange?.(false);
        });
      },
      [onFollowChange],
    );

    useImperativeHandle(
      ref,
      () => ({
        recenter: () => {
          followingRef.current = true;
          onFollowChange?.(true);
          if (frozenCameraRef.current) mapRef.current?.flyTo(frozenCameraRef.current);
        },
      }),
      [onFollowChange],
    );

    const traceData = useMemo(() => lineCollection(traceGeo), [traceGeo]);
    const geojsonLayers = useMemo(
      () =>
        capturing && traceGeo.length >= 2
          ? runTraceLayers('real-gps-trace', traceData, { glow: false })
          : [],
      [capturing, traceData, traceGeo.length],
    );

    const markers = useMemo(
      () =>
        pos
          ? [
              {
                id: 'runner',
                lng: pos.lng,
                lat: pos.lat,
                children: (
                  <View
                    style={[styles.runner, { transform: [{ rotate: `${heading}deg` }] }]}
                  />
                ),
              },
            ]
          : [],
      [heading, pos],
    );

    return (
      <View style={styles.root} onLayout={onLayout}>
        <RealMap
          ref={mapRef}
          camera={cameraTarget}
          geojsonLayers={geojsonLayers}
          markers={markers}
          onMapReady={onMapReady}
          silent
          mode3d={mode3d}
          attributionCompact
        />
        {!pos ? (
          <View style={styles.waiting} pointerEvents="none">
            <Text style={styles.waitingText}>RECHERCHE GPS…</Text>
          </View>
        ) : null}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  runner: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.chartreuse,
    borderWidth: 2,
    borderColor: colors.noir,
  },
  waiting: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitingText: { color: colors.gris, fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
});
