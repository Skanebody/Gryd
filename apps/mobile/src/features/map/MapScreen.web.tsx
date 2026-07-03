/**
 * GRYD — BATTLE MAP, variante WEB (aperçu navigateur — cible visuelle
 * prioritaire AMENDEMENT-08 §4, doc §7). Metro résout `.web.tsx` avant `.tsx`
 * sur la cible web : MapLibre (natif-only) n'est JAMAIS importé ici.
 * ÉCHELLE COUREUR : projection à échelle FIXE (~4,3 m/px → hex res 10 ≈ 30 px,
 * viewport 375 px ≈ 1,6 km), égocentrée AMENDEMENT-01 (le cluster maison reste
 * au centre) — la grille remplit tout l'écran, plus de vide noir. Une barre
 * d'échelle discrète (500 m) ancre la perception en bas à gauche.
 * 4 couches, toutes dessinées à partir du MÊME jeu démo (battleMapData) :
 *   1. basemap urbaine stylisée type plan de quartier : trame de rues dense
 *      très fine, 2-3 axes épais, canal, parcs, noms de secteurs discrets ;
 *   2. hex grid (contours neutres) ;
 *   3. ownership/états de jeu : crew (chartreuse+glow), rival (orange sombre),
 *      contesté (double contour + pulse), protégé (shield+halo), decay
 *      (pointillé + sablier, muted red si urgent), objectif (pin+halo),
 *      avant-poste (marker), route ouverte (ligne chartreuse) ;
 *   4. HUD (BattleMapOverlays : bandeau saison/zone/rang, chips layers,
 *      mini war feed, bandeau objectif crew).
 * Performance : ~400-600 hexes visibles → le rendu est REGROUPÉ par état (un
 * seul <Path> par état, `d` concaténés) et les hexes hors écran sont exclus ;
 * le pulse (contesté) n'anime QUE le path des hexes contestés.
 * Animations RN Animated core : vague de capture au mount (useReveal), pulse
 * des hexes contestés (usePulse) — reduce motion respecté par les hooks.
 * Le CTA COURIR reste rendu par le layout (tabs) — pas de doublon ici.
 * Track EVENTS.mapLoadMs comme l'original (au montage).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';
import { colors } from '@klaim/shared';
import { EVENTS, track } from '../../lib/analytics';
import { Icon } from '../../ui/Icon';
import { usePulse, useReveal } from '../../ui/game';
import { deriveRunButtonMode } from '../nav/runContext';
import { RUN_BUTTON_BOTTOM } from '../nav/metrics';
import {
  CANAL,
  MAIN_AXES,
  M_PER_DEG_LAT,
  M_PER_DEG_LNG,
  PARKS,
  SECTOR_LABELS,
  STREETS,
  type LatLngPoint,
} from './basemap';
import {
  BattleMapOverlays,
  DEFAULT_MAP_LAYERS,
  type MapLayerKey,
} from './BattleMapOverlays';
import { battleMapData, battleMapSummary, type HexState } from './fakeHexes';
import { battleMapStyle as ms } from './mapStyle';

// ─── Échelle coureur (AMENDEMENT-08 §4 — « la rue où on court ») ────────────
/** Règle gelée : un hex H3 res 10 fait ~130 m de diamètre. */
const HEX_DIAMETER_M = 130;
/** Cible visuelle : un hex ≈ 30 px à l'écran (28-32 px). */
const HEX_TARGET_PX = 30;
/** ≈ 4,33 m/px → un viewport de 375 px couvre ≈ 1,6 km. */
const METERS_PER_PIXEL = HEX_DIAMETER_M / HEX_TARGET_PX;
/** Barre d'échelle graphique discrète (bas gauche) : 500 m ≈ 115 px. */
const SCALE_BAR_METERS = 500;
/** Culling : marge hors écran (px) au-delà de laquelle un hex n'est pas rendu. */
const CULL_MARGIN_PX = HEX_TARGET_PX * 1.5;

/** Cadence du pulse des hexes contestés (UI). */
const CONTESTED_PULSE_MS = 1_600;
/** Un point de liaison de route tous les N sommets (doc §7 « points de liaison »). */
const ROUTE_DOT_EVERY = 3;
/** Taille des markers d'état posés sur la carte. */
const MARKER_SIZE = 18;
/** La barre d'échelle flotte à gauche du bouton COURIR, au-dessus de la nav. */
const SCALE_BAR_ABOVE_RUN_BOTTOM = 6;

interface XY {
  x: number;
  y: number;
}

interface SceneMarker extends XY {
  key: string;
}

/** `d` SVG concaténés par état de jeu — UN path par état (perf RN-web). */
type HexPathByState = Record<HexState, string> & {
  /** Decay urgents seuls (fill/contour muted red distincts). */
  decayUrgent: string;
  /** Tous les hexes tenus (glow commun mine+protected+decay). */
  heldAll: string;
};

interface Scene {
  hexD: HexPathByState;
  canalD: string;
  parksD: string[];
  streetsD: string;
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
 * Projette hexes + basemap + points (lng/lat) dans un repère width×height à
 * ÉCHELLE FIXE (METERS_PER_PIXEL), centré sur le cluster maison (égocentré
 * AMENDEMENT-01). Les hexes hors écran (+ marge) sont exclus du rendu, et les
 * `d` sont concaténés par état — un seul <Path> par état de jeu.
 */
function buildScene(width: number, height: number): Scene {
  const { collection, points } = battleMapData();
  const centre = points.protectedCenter;

  const toXY = (lng: number, lat: number): XY => ({
    x: width / 2 + ((lng - centre.lng) * M_PER_DEG_LNG) / METERS_PER_PIXEL,
    y: height / 2 - ((lat - centre.lat) * M_PER_DEG_LAT) / METERS_PER_PIXEL,
  });
  const pointXY = (p: LatLngPoint): XY => toXY(p.lng, p.lat);
  const inViewport = ({ x, y }: XY): boolean =>
    x >= -CULL_MARGIN_PX &&
    x <= width + CULL_MARGIN_PX &&
    y >= -CULL_MARGIN_PX &&
    y <= height + CULL_MARGIN_PX;
  const lineD = (pts: readonly LatLngPoint[], close = false): string => {
    const d = pts
      .map((p, i) => {
        const { x, y } = pointXY(p);
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
    return close ? `${d} Z` : d;
  };

  const hexD: HexPathByState = {
    neutral: '',
    mine: '',
    foe: '',
    contested: '',
    protected: '',
    decay: '',
    objective: '',
    outpost: '',
    decayUrgent: '',
    heldAll: '',
  };
  for (const f of collection.features) {
    const ring = f.geometry.coordinates[0] ?? [];
    const first = ring[0];
    if (!first) continue;
    if (!inViewport(toXY(first[0] ?? 0, first[1] ?? 0))) continue; // culling
    const d =
      ring
        .map((pt, i) => {
          const { x, y } = toXY(pt[0] ?? 0, pt[1] ?? 0);
          return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
        })
        .join(' ') + ' Z';
    const { state, urgent } = f.properties;
    if (state === 'decay' && urgent) hexD.decayUrgent += d;
    else hexD[state] += d;
    if (state === 'mine' || state === 'protected' || state === 'decay') hexD.heldAll += d;
  }

  return {
    hexD,
    canalD: lineD(CANAL),
    parksD: PARKS.map((ring) => lineD(ring, true)),
    streetsD: STREETS.map((street) => lineD(street)).join(' '),
    axesD: MAIN_AXES.map((axis) => lineD(axis)),
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
  const insets = useSafeAreaInsets();

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
  // Pulse des hexes contestés SEULS : le contour rival respire (reduce motion → fixe).
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

  return (
    <View style={styles.root}>
      <View style={styles.map} onLayout={onLayout}>
        {size && scene ? (
          <>
            {/* ── Couche 1 : plan de quartier stylisé (rues denses, subtil) ── */}
            <Svg width={size.w} height={size.h} style={StyleSheet.absoluteFill}>
              {/* Trame de rues secondaires : UN path, traits très fins */}
              <Path d={scene.streetsD} stroke={ms.roads} strokeWidth={1} fill="none" strokeLinecap="round" />
              {/* Parcs par-dessus la trame (les rues s'y arrêtent visuellement) */}
              {scene.parksD.map((d, i) => (
                <Path key={`park-${i}`} d={d} fill={ms.parks} stroke={ms.parksEdge} strokeWidth={1} />
              ))}
              {/* Canal : bande d'eau sombre discrète */}
              <Path d={scene.canalD} stroke={ms.waterRim} strokeWidth={10} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <Path d={scene.canalD} stroke={ms.water} strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              {/* 2-3 axes principaux, plus épais que la trame */}
              {scene.axesD.map((d, i) => (
                <Path key={`axis-${i}`} d={d} stroke={ms.roadsMajor} strokeWidth={2.5} fill="none" strokeLinecap="round" />
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

            {/* ── Couche 2 : hex grid neutre (UN path concaténé) ─────────── */}
            <Svg width={size.w} height={size.h} style={StyleSheet.absoluteFill}>
              <Path d={scene.hexD.neutral} fill="transparent" stroke={ms.neutralStroke} strokeWidth={1} />
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
                {layers.rivals ? (
                  <Path d={scene.hexD.foe} fill={ms.rivalFill} stroke={ms.rivalStroke} strokeWidth={1} />
                ) : null}
                {layers.rivals && scene.hexD.contested ? (
                  <Path
                    d={scene.hexD.contested}
                    fill={ms.contestedFill}
                    stroke={ms.contestedInnerStroke}
                    strokeWidth={1.4}
                  />
                ) : null}

                {/* Mon crew : glow léger sous le trait chartreuse (couloirs + maison) */}
                {layers.crew ? (
                  <>
                    <Path d={scene.hexD.heldAll} fill="none" stroke={ms.heldGlow} strokeWidth={5} />
                    <Path
                      d={scene.hexD.mine + scene.hexD.protected + scene.hexD.decay}
                      fill={ms.heldFill}
                      stroke={ms.heldStroke}
                      strokeWidth={1.4}
                    />
                    <Path
                      d={scene.hexD.decayUrgent}
                      fill={layers.decay ? ms.decayUrgentFill : ms.heldFill}
                      stroke={ms.heldStroke}
                      strokeWidth={1.4}
                    />
                    {/* Protégé : halo verify autour du cluster maison */}
                    <Path d={scene.hexD.protected} fill="none" stroke={ms.protectedHalo} strokeWidth={2.5} />
                  </>
                ) : null}
                {/* Decay : contour pointillé en queue de couloir (muted red si urgent) */}
                {layers.crew && layers.decay ? (
                  <>
                    <Path
                      d={scene.hexD.decay}
                      fill="none"
                      stroke={ms.decayStroke}
                      strokeWidth={1.6}
                      strokeDasharray="3 3"
                    />
                    <Path
                      d={scene.hexD.decayUrgent}
                      fill="none"
                      stroke={ms.decayUrgentStroke}
                      strokeWidth={1.6}
                      strokeDasharray="3 3"
                    />
                  </>
                ) : null}

                {/* Objectif crew : halo chartreuse sur zone neutre */}
                {layers.missions ? (
                  <Path d={scene.hexD.objective} fill={ms.objectiveHalo} stroke={ms.objectiveStroke} strokeWidth={1.2} />
                ) : null}
                {/* Avant-poste : mini cluster isolé */}
                {layers.missions ? (
                  <Path d={scene.hexD.outpost} fill={ms.outpostFill} stroke={ms.outpostStroke} strokeWidth={1.4} />
                ) : null}

                {/* Route ouverte : ligne chartreuse LE LONG D'UNE RUE + points de liaison */}
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

            {/* ── Pulse : UNIQUEMENT le path des hexes contestés ────────── */}
            {layers.rivals && scene.hexD.contested ? (
              <Animated.View
                style={[StyleSheet.absoluteFill, { opacity: pulseOpacity }]}
                pointerEvents="none"
              >
                <Svg width={size.w} height={size.h}>
                  <Path d={scene.hexD.contested} fill="none" stroke={ms.contestedOuterStroke} strokeWidth={2.5} />
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

            {/* ── Échelle graphique discrète : ancre la perception (500 m) ── */}
            <View
              pointerEvents="none"
              style={[
                styles.scaleBar,
                { bottom: insets.bottom + RUN_BUTTON_BOTTOM + SCALE_BAR_ABOVE_RUN_BOTTOM },
              ]}
            >
              <View style={[styles.scaleLine, { width: SCALE_BAR_METERS / METERS_PER_PIXEL }]} />
              <Text style={styles.scaleLabel}>{SCALE_BAR_METERS} m</Text>
            </View>
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
  scaleBar: { position: 'absolute', left: 14 },
  scaleLine: {
    height: 4,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: ms.scaleBar,
    opacity: 0.7,
  },
  scaleLabel: { color: ms.scaleBar, fontSize: 9, marginTop: 3, fontVariant: ['tabular-nums'] },
});

export default MapScreen;
