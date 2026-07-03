/**
 * GRYD — BATTLE MAP, variante WEB (aperçu navigateur — cible visuelle
 * prioritaire AMENDEMENT-08 §4, doc §7). Metro résout `.web.tsx` avant `.tsx`
 * sur la cible web : MapLibre (natif-only) n'est JAMAIS importé ici.
 * 4 couches, toutes dessinées à partir du MÊME jeu démo (battleMapData) :
 *   1. basemap urbaine stylisée SUBTILE (Seine/canal, parcs, axes, noms de
 *      secteurs discrets) — SVG, pas une carte Google ;
 *   2. hex grid (contours neutres) ;
 *   3. ownership/états de jeu : crew (chartreuse+glow), rival (orange sombre),
 *      contesté (double contour + pulse), protégé (shield+halo), decay
 *      (pointillé + sablier, muted red si urgent), objectif (pin+halo),
 *      avant-poste (marker), route ouverte (ligne chartreuse) ;
 *   4. HUD (BattleMapOverlays : bandeau saison/zone/rang, chips layers,
 *      mini war feed, bandeau objectif crew).
 * Animations RN Animated core : vague de capture au mount (useReveal), pulse
 * des hexes contestés (usePulse) — reduce motion respecté par les hooks.
 * Le CTA COURIR reste rendu par le layout (tabs) — pas de doublon ici.
 * Track EVENTS.mapLoadMs comme l'original (au montage).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';
import { CITIES, colors } from '@klaim/shared';
import { EVENTS, track } from '../../lib/analytics';
import { Icon } from '../../ui/Icon';
import { usePulse, useReveal } from '../../ui/game';
import { deriveRunButtonMode } from '../nav/runContext';
import { AXES, CANAL, PARKS, SECTOR_LABELS, SEINE, type LatLngPoint } from './basemap';
import {
  BattleMapOverlays,
  DEFAULT_MAP_LAYERS,
  type MapLayerKey,
} from './BattleMapOverlays';
import { battleMapData, battleMapSummary, type HexState } from './fakeHexes';
import { battleMapStyle as ms } from './mapStyle';

/** Facteur d'échelle : approxime le zoom natif (HOME_ZOOM = 13) — marge autour du cluster. */
const FIT_PADDING = 0.08;
/** Cadence du pulse des hexes contestés (UI). */
const CONTESTED_PULSE_MS = 1_600;
/** Un point de liaison de route tous les N sommets (doc §7 « points de liaison »). */
const ROUTE_DOT_EVERY = 3;
/** Taille des markers d'état posés sur la carte. */
const MARKER_SIZE = 18;

interface XY {
  x: number;
  y: number;
}

interface SceneHex {
  key: string;
  state: HexState;
  urgent: boolean;
  d: string;
}

interface SceneMarker extends XY {
  key: string;
}

interface Scene {
  hexes: SceneHex[];
  seineD: string;
  canalD: string;
  parksD: string[];
  axesD: string[];
  labels: { name: string; x: number; y: number }[];
  routeD: string;
  routeDots: XY[];
  shield: XY;
  objectivePin: XY;
  outpostMarker: XY;
  urgentMarkers: SceneMarker[];
}

/**
 * Projette hexes + basemap + points (lng/lat) dans un repère width×height.
 * Projection équirectangulaire locale (corrigée en longitude par cos(lat)) —
 * suffisante à l'échelle d'un quartier. Les bornes viennent des hexes seuls
 * (stables) ; la basemap déborde et se fait rogner par le Svg.
 */
function buildScene(width: number, height: number): Scene {
  const { collection, points } = battleMapData();
  const lat0 = CITIES.paris.center.lat;
  const cosLat = Math.cos((lat0 * Math.PI) / 180);

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const f of collection.features) {
    const ring = f.geometry.coordinates[0] ?? [];
    for (const pt of ring) {
      const x = (pt[0] ?? 0) * cosLat;
      const y = -(pt[1] ?? 0);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const pad = Math.max(spanX, spanY) * FIT_PADDING;
  const boxX = spanX + pad * 2;
  const boxY = spanY + pad * 2;
  // Échelle « cover » (comme une carte plein écran), centrée.
  const scale = Math.max(width / boxX, height / boxY);
  const offsetX = (width - spanX * scale) / 2;
  const offsetY = (height - spanY * scale) / 2;

  const toXY = (lng: number, lat: number): XY => ({
    x: (lng * cosLat - minX) * scale + offsetX,
    y: (-lat - minY) * scale + offsetY,
  });
  const pointXY = (p: LatLngPoint): XY => toXY(p.lng, p.lat);
  const lineD = (pts: readonly LatLngPoint[], close = false): string => {
    const d = pts
      .map((p, i) => {
        const { x, y } = pointXY(p);
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ');
    return close ? `${d} Z` : d;
  };

  const hexes: SceneHex[] = collection.features.map((f) => {
    const ring = f.geometry.coordinates[0] ?? [];
    const d =
      ring
        .map((pt, i) => {
          const { x, y } = toXY(pt[0] ?? 0, pt[1] ?? 0);
          return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
        })
        .join(' ') + ' Z';
    return { key: f.properties.h3, state: f.properties.state, urgent: f.properties.urgent, d };
  });

  return {
    hexes,
    seineD: lineD(SEINE),
    canalD: lineD(CANAL),
    parksD: PARKS.map((ring) => lineD(ring, true)),
    axesD: AXES.map((axis) => lineD(axis)),
    labels: SECTOR_LABELS.map((s) => ({ name: s.name, ...toXY(s.lng, s.lat) })),
    routeD: lineD(points.route),
    routeDots: points.route.filter((_, i) => i % ROUTE_DOT_EVERY === 0).map(pointXY),
    shield: pointXY(points.protectedCenter),
    objectivePin: pointXY(points.objectiveCenter),
    outpostMarker: pointXY(points.outpost),
    urgentMarkers: points.urgentDecay.map((p, i) => ({ key: `urgent-${i}`, ...pointXY(p) })),
  };
}

export function MapScreen() {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [layers, setLayers] = useState(DEFAULT_MAP_LAYERS);

  const summary = useMemo(() => battleMapSummary(battleMapData().collection), []);
  const runMode = useMemo(() => deriveRunButtonMode(), []);

  // map_load_ms (§8) — du montage au premier rendu de la carte (parité native).
  const mountedAtRef = useRef<number>(Date.now());
  const loadTrackedRef = useRef(false);
  useEffect(() => {
    if (loadTrackedRef.current) return;
    loadTrackedRef.current = true;
    track(EVENTS.mapLoadMs, { ms: Date.now() - mountedAtRef.current });
  }, []);

  // Vague de capture légère au mount (reduce motion → fade court via le hook).
  const reveal = useReveal(true);
  // Pulse des hexes contestés : le contour rival respire (reduce motion → fixe).
  const pulse = usePulse(layers.rivals, 1.06, CONTESTED_PULSE_MS);
  const pulseOpacity = pulse.interpolate({ inputRange: [1, 1.06], outputRange: [1, 0.25] });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) =>
      prev && prev.w === width && prev.h === height ? prev : { w: width, h: height },
    );
  };

  const scene = useMemo(() => (size ? buildScene(size.w, size.h) : null), [size]);

  const toggleLayer = (key: MapLayerKey) =>
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));

  const held = scene?.hexes.filter(
    (h) => h.state === 'mine' || h.state === 'protected' || h.state === 'decay',
  );
  const contested = scene?.hexes.filter((h) => h.state === 'contested');

  return (
    <View style={styles.root}>
      <View style={styles.map} onLayout={onLayout}>
        {size && scene ? (
          <>
            {/* ── Couche 1 : basemap urbaine stylisée subtile ─────────── */}
            <Svg width={size.w} height={size.h} style={StyleSheet.absoluteFill}>
              <Path d={scene.seineD} stroke={ms.waterRim} strokeWidth={24} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <Path d={scene.seineD} stroke={ms.water} strokeWidth={20} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <Path d={scene.canalD} stroke={ms.waterRim} strokeWidth={8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <Path d={scene.canalD} stroke={ms.water} strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              {scene.parksD.map((d, i) => (
                <Path key={`park-${i}`} d={d} fill={ms.parks} stroke="none" />
              ))}
              {scene.axesD.map((d, i) => (
                <Path key={`axis-${i}`} d={d} stroke={ms.roads} strokeWidth={1.5} fill="none" strokeLinecap="round" />
              ))}
              {scene.labels.map((l) => (
                <SvgText
                  key={l.name}
                  x={l.x}
                  y={l.y}
                  fill={ms.sectorLabel}
                  opacity={0.55}
                  fontSize={10}
                  fontWeight="600"
                  letterSpacing={2}
                  textAnchor="middle"
                >
                  {l.name}
                </SvgText>
              ))}
            </Svg>

            {/* ── Couche 2 : hex grid neutre ───────────────────────────── */}
            <Svg width={size.w} height={size.h} style={StyleSheet.absoluteFill}>
              {scene.hexes
                .filter((h) => h.state === 'neutral')
                .map((h) => (
                  <Path key={h.key} d={h.d} fill="transparent" stroke={ms.neutralStroke} strokeWidth={1} />
                ))}
            </Svg>

            {/* ── Couche 3 : ownership/états — vague de capture au mount ─ */}
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                { opacity: reveal.opacity, transform: [{ scale: reveal.scale }] },
              ]}
              pointerEvents="none"
            >
              <Svg width={size.w} height={size.h}>
                {/* Rival (orange sombre) + contesté (double contour) */}
                {layers.rivals
                  ? scene.hexes
                      .filter((h) => h.state === 'foe')
                      .map((h) => (
                        <Path key={h.key} d={h.d} fill={ms.rivalFill} stroke={ms.rivalStroke} strokeWidth={1} />
                      ))
                  : null}
                {layers.rivals && contested
                  ? contested.map((h) => (
                      <Path
                        key={h.key}
                        d={h.d}
                        fill={ms.contestedFill}
                        stroke={ms.contestedInnerStroke}
                        strokeWidth={1.4}
                      />
                    ))
                  : null}

                {/* Mon crew : glow léger sous le trait chartreuse */}
                {layers.crew && held
                  ? held.map((h) => (
                      <Path key={`glow-${h.key}`} d={h.d} fill="none" stroke={ms.heldGlow} strokeWidth={5} />
                    ))
                  : null}
                {layers.crew && held
                  ? held.map((h) => (
                      <Path
                        key={h.key}
                        d={h.d}
                        fill={layers.decay && h.state === 'decay' && h.urgent ? ms.decayUrgentFill : ms.heldFill}
                        stroke={ms.heldStroke}
                        strokeWidth={1.4}
                      />
                    ))
                  : null}
                {/* Protégé : halo verify autour du cœur */}
                {layers.crew
                  ? scene.hexes
                      .filter((h) => h.state === 'protected')
                      .map((h) => (
                        <Path key={`halo-${h.key}`} d={h.d} fill="none" stroke={ms.protectedHalo} strokeWidth={2.5} />
                      ))
                  : null}
                {/* Decay : contour pointillé (muted red si urgent) */}
                {layers.crew && layers.decay
                  ? scene.hexes
                      .filter((h) => h.state === 'decay')
                      .map((h) => (
                        <Path
                          key={`decay-${h.key}`}
                          d={h.d}
                          fill="none"
                          stroke={h.urgent ? ms.decayUrgentStroke : ms.decayStroke}
                          strokeWidth={1.6}
                          strokeDasharray="3 3"
                        />
                      ))
                  : null}

                {/* Objectif crew : halo chartreuse sur zone neutre */}
                {layers.missions
                  ? scene.hexes
                      .filter((h) => h.state === 'objective')
                      .map((h) => (
                        <Path key={h.key} d={h.d} fill={ms.objectiveHalo} stroke={ms.objectiveStroke} strokeWidth={1.2} />
                      ))
                  : null}
                {/* Avant-poste */}
                {layers.missions
                  ? scene.hexes
                      .filter((h) => h.state === 'outpost')
                      .map((h) => (
                        <Path key={h.key} d={h.d} fill={ms.outpostFill} stroke={ms.outpostStroke} strokeWidth={1.4} />
                      ))
                  : null}

                {/* Route ouverte : ligne GPS chartreuse + points de liaison */}
                {layers.routes ? (
                  <>
                    <Path d={scene.routeD} fill="none" stroke={ms.routeStroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    {scene.routeDots.map((p, i) => (
                      <Circle key={`route-dot-${i}`} cx={p.x} cy={p.y} r={2.5} fill={ms.routeDot} />
                    ))}
                  </>
                ) : null}
              </Svg>
            </Animated.View>

            {/* ── Pulse des hexes contestés (contour rival qui respire) ── */}
            {layers.rivals && contested && contested.length > 0 ? (
              <Animated.View
                style={[StyleSheet.absoluteFill, { opacity: pulseOpacity }]}
                pointerEvents="none"
              >
                <Svg width={size.w} height={size.h}>
                  {contested.map((h) => (
                    <Path key={h.key} d={h.d} fill="none" stroke={ms.contestedOuterStroke} strokeWidth={2.5} />
                  ))}
                </Svg>
              </Animated.View>
            ) : null}

            {/* ── Markers d'état (icônes @klaim/shared) ─────────────────── */}
            {layers.crew ? (
              <Marker x={scene.shield.x} y={scene.shield.y} icon="bouclier" />
            ) : null}
            {layers.crew && layers.decay
              ? scene.urgentMarkers.map((m) => (
                  <Marker key={m.key} x={m.x} y={m.y} icon="sablier" danger />
                ))
              : null}
            {layers.missions ? (
              <>
                <Marker x={scene.objectivePin.x} y={scene.objectivePin.y} icon="pin" crew />
                <Marker x={scene.outpostMarker.x} y={scene.outpostMarker.y} icon="avantposte" />
              </>
            ) : null}
          </>
        ) : null}
      </View>

      {/* ── Couche 4 : HUD gameplay ─────────────────────────────────────── */}
      <BattleMapOverlays
        layers={layers}
        onToggleLayer={toggleLayer}
        summary={summary}
        runMode={runMode}
      />
    </View>
  );
}

/** Icône d'état posée sur la carte (shield/sablier/pin/avant-poste). */
function Marker({
  x,
  y,
  icon,
  crew = false,
  danger = false,
}: {
  x: number;
  y: number;
  icon: 'bouclier' | 'sablier' | 'pin' | 'avantposte';
  crew?: boolean;
  danger?: boolean;
}) {
  return (
    <View
      pointerEvents="none"
      style={[styles.marker, { left: x - MARKER_SIZE / 2, top: y - MARKER_SIZE / 2 }]}
    >
      <Icon
        name={icon}
        size={MARKER_SIZE}
        color={crew ? markerColors.crew : danger ? markerColors.danger : markerColors.neutral}
      />
    </View>
  );
}

/** Teintes des markers — tokens uniquement (états de jeu). */
const markerColors = {
  crew: colors.chartreuse,
  danger: ms.decayUrgentStroke,
  neutral: colors.blanc,
} as const;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  map: { flex: 1, backgroundColor: colors.noir, overflow: 'hidden' },
  marker: { position: 'absolute', width: MARKER_SIZE, height: MARKER_SIZE },
});

export default MapScreen;
