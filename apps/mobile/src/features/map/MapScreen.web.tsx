/**
 * GRYD — BATTLE MAP, variante WEB (aperçu navigateur — cible visuelle
 * prioritaire AMENDEMENT-08 §4, doc §7). Metro résout `.web.tsx` avant `.tsx`
 * sur la cible web : MapLibre (natif-only) n'est JAMAIS importé ici.
 * ÉCHELLE COUREUR : projection à échelle FIXE (~4,3 m/px → hex res 10 ≈ 30 px,
 * viewport 375 px ≈ 1,6 km), égocentrée AMENDEMENT-01 (le cluster maison reste
 * au centre) — la grille remplit tout l'écran, plus de vide noir. Une barre
 * d'échelle discrète (500 m) ancre la perception en bas à gauche.
 * 4 couches, toutes dessinées à partir du MÊME jeu démo (battleMapData) :
 *   1. basemap Uber-night (AMENDEMENT-09 §0) : ÎLOTS URBAINS PLEINS (aplats
 *      carbon, liseré subtil) séparés par les rues — le vide entre îlots EST
 *      la rue ; axes larges creusés puis repeints légèrement plus clairs,
 *      canal en bande d'eau sombre, parcs en aplat vert très sombre, noms de
 *      secteurs discrets ;
 *   2. hex grid (contours neutres) ;
 *   3. ownership/états de jeu : crew (chartreuse+glow), rival (orange sombre),
 *      contesté (double contour + pulse), protégé (shield+halo), decay
 *      (pointillé + sablier, muted red si urgent), objectif (pin+halo),
 *      avant-poste (marker), route ouverte (ligne chartreuse) ;
 *   4. couche « situation live » AMENDEMENT-09 §2 : moi (point chartreuse +
 *      halo), 2 MateMarker opt-in (AMENDEMENT-07 — jamais de position
 *      publique), ≤ 4 PoiMarker, 1 marker défi + 1 zone bonus pulsante MAX,
 *      parcours sélectionné en aperçu (RouteProgress, progress 0) ;
 *   5. HUD Uber (BattleMapOverlays : pill fine, war feed 1 event, 3 boutons
 *      flottants, MapBottomSheet objectif/défis/parcours).
 * Performance : ~400-600 hexes visibles → le rendu est REGROUPÉ par état (un
 * seul <Path> par état, `d` concaténés) et les hexes hors écran sont exclus ;
 * le pulse (contesté) n'anime QUE le path des hexes contestés.
 * Animations RN Animated core : vague de capture au mount (useReveal), pulse
 * des hexes contestés (usePulse), recentrage = settle spring de la scène
 * (pas de pan en démo web : déjà égocentré) — reduce motion respecté.
 * Le CTA COURIR reste rendu par le layout (tabs) — pas de doublon ici.
 * Track EVENTS.mapLoadMs comme l'original (au montage).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';
import { colors, gameColors } from '@klaim/shared';
import { EVENTS, track } from '../../lib/analytics';
import { Icon } from '../../ui/Icon';
import {
  MATE_MARKER_SIZE,
  MateMarker,
  PoiMarker,
  RouteProgress,
  usePulse,
  useReduceMotion,
  useReveal,
  type RoutePoint,
} from '../../ui/game';
import { deriveRunButtonMode } from '../nav/runContext';
import { RUN_BUTTON_BOTTOM } from '../nav/metrics';
import {
  BLOCKS,
  CANAL,
  CANAL_BANK_WIDTH_M,
  CANAL_WIDTH_M,
  MAIN_AXES,
  MINOR_AXES,
  M_PER_DEG_LAT,
  M_PER_DEG_LNG,
  PARKS,
  SECTOR_LABELS,
  STREET_MAJOR_WIDTH_M,
  STREET_MINOR_WIDTH_M,
  type LatLngPoint,
} from './basemap';
import {
  BattleMapOverlays,
  DEFAULT_MAP_LAYERS,
  type MapLayerKey,
} from './BattleMapOverlays';
import { battleMapData, battleMapSummary, type HexState } from './fakeHexes';
import { battleMapStyle as ms, withAlpha } from './mapStyle';
import {
  MAP_BONUS_ZONE,
  MAP_CHALLENGE,
  MATES_OPT_IN,
  PARCOURS_DEMO,
  POIS_ON_MAP,
  type MateOnMapDemo,
  type PoiOnMapDemo,
} from './demo';

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
/** Culling des îlots : marge = plus grand îlot (~150 m) converti en px. */
const BLOCK_CULL_MARGIN_PX = 150 / METERS_PER_PIXEL;

// ─── Voirie Uber-night (AMENDEMENT-09 §0) : largeurs basemap converties en px ─
const STREET_MINOR_PX = STREET_MINOR_WIDTH_M / METERS_PER_PIXEL;
const STREET_MAJOR_PX = STREET_MAJOR_WIDTH_M / METERS_PER_PIXEL;
/** Creusage des axes : légèrement plus large que la surface repeinte. */
const STREET_MAJOR_CASING_PX = STREET_MAJOR_PX + 2;
const CANAL_PX = CANAL_WIDTH_M / METERS_PER_PIXEL;
const CANAL_BANK_PX = CANAL_BANK_WIDTH_M / METERS_PER_PIXEL;

/** Cadence du pulse des hexes contestés (UI). */
const CONTESTED_PULSE_MS = 1_600;
/** Pulse LENT de la zone bonus (1 seule couche bruyante à la fois — discret). */
const BONUS_PULSE_MS = 3_200;
/** Pulse du halo « moi » (position live, respiration lente). */
const EGO_PULSE_MS = 2_000;
/** Point « moi » (dot chartreuse cerclé) + halo. */
const EGO_DOT_SIZE = 14;
const EGO_HALO_SIZE = 40;
/** Le shield du cluster maison s'écarte du point « moi » (pas de collision). */
const SHIELD_ABOVE_EGO_PX = 26;
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
  /** Îlots urbains pleins — UN path concaténé (AMENDEMENT-09 §0). */
  blocksD: string;
  /** Rues secondaires hors trame (quai, rue NE) — creusées couleur fond. */
  minorAxesD: string[];
  axesD: string[];
  labels: { name: string; x: number; y: number }[];
  routeD: string;
  routeDots: XY[];
  shield: XY;
  objectivePin: XY;
  outpostMarker: XY;
  urgentMarkers: SceneMarker[];
  // ── Situation live AMENDEMENT-09 §2 (positions écran des couches 4) ──
  mates: (MateOnMapDemo & XY)[];
  pois: (PoiOnMapDemo & XY)[];
  challenge: XY;
  bonus: XY & { rPx: number };
  /** Tracés des parcours proposés (px écran) — aperçu RouteProgress au tap. */
  parcours: Record<string, RoutePoint[]>;
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

  // Îlots : culling large (un coin visible suffit), UN path concaténé.
  const blockVisible = (ring: readonly LatLngPoint[]): boolean =>
    ring.some((p) => {
      const { x, y } = pointXY(p);
      return (
        x >= -BLOCK_CULL_MARGIN_PX &&
        x <= width + BLOCK_CULL_MARGIN_PX &&
        y >= -BLOCK_CULL_MARGIN_PX &&
        y <= height + BLOCK_CULL_MARGIN_PX
      );
    });
  const blocksD = BLOCKS.filter(blockVisible)
    .map((ring) => lineD(ring, true))
    .join(' ');

  // Parcours proposés : chaque tracé projeté en px écran (RouteProgress).
  const parcours: Record<string, RoutePoint[]> = {};
  for (const p of PARCOURS_DEMO) parcours[p.id] = p.line.map(pointXY);

  return {
    hexD,
    canalD: lineD(CANAL),
    parksD: PARKS.map((ring) => lineD(ring, true)),
    blocksD,
    minorAxesD: MINOR_AXES.map((street) => lineD(street)),
    axesD: MAIN_AXES.map((axis) => lineD(axis)),
    labels: SECTOR_LABELS.map((s) => ({ name: s.name, ...toXY(s.lng, s.lat) })),
    routeD: lineD(points.route),
    routeDots: points.route.filter((_, i) => i % ROUTE_DOT_EVERY === 0).map(pointXY),
    shield: pointXY(points.protectedCenter),
    objectivePin: pointXY(points.objectiveCenter),
    outpostMarker: pointXY(points.outpost),
    urgentMarkers: points.urgentDecay.map((p, i) => ({ key: `urgent-${i}`, ...pointXY(p) })),
    mates: MATES_OPT_IN.map((m) => ({ ...m, ...pointXY(m.position) })),
    pois: POIS_ON_MAP.map((p) => ({ ...p, ...pointXY(p.position) })),
    challenge: pointXY(MAP_CHALLENGE.position),
    bonus: { ...pointXY(MAP_BONUS_ZONE.center), rPx: MAP_BONUS_ZONE.radiusM / METERS_PER_PIXEL },
    parcours,
  };
}

export function MapScreen() {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [layers, setLayers] = useState(DEFAULT_MAP_LAYERS);
  const [selectedParcours, setSelectedParcours] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();

  const summary = useMemo(() => battleMapSummary(battleMapData().collection), []);
  const runMode = useMemo(() => deriveRunButtonMode(), []);

  // Recentrer : la carte est déjà égocentrée (pas de pan en démo web) — le
  // retour ego est un settle spring discret de la scène (reduce motion → rien).
  const settle = useRef(new Animated.Value(1)).current;
  const recenter = () => {
    if (reduce) return;
    settle.setValue(1.04);
    Animated.spring(settle, {
      toValue: 1,
      friction: 7,
      tension: 60,
      useNativeDriver: true,
    }).start();
  };

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
  // Zone bonus : respiration LENTE (l'unique autre pulse — anti-bruit).
  const bonusPulse = usePulse(true, 1.05, BONUS_PULSE_MS);
  const bonusOpacity = bonusPulse.interpolate({ inputRange: [1, 1.05], outputRange: [0.9, 0.35] });

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
          <Animated.View
            style={[StyleSheet.absoluteFill, { transform: [{ scale: settle }] }]}
            pointerEvents="box-none"
          >
            {/* ── Couche 1 : plan de quartier Uber-night (AMENDEMENT-09 §0) ── */}
            <Svg width={size.w} height={size.h} style={StyleSheet.absoluteFill}>
              {/* Îlots urbains PLEINS : le vide entre eux = la rue secondaire */}
              <Path
                d={scene.blocksD}
                fill={ms.block}
                stroke={ms.blockEdge}
                strokeWidth={1}
                strokeLinejoin="round"
              />
              {/* Rues hors trame (quai, rue NE) : creusées couleur fond */}
              {scene.minorAxesD.map((d, i) => (
                <Path key={`minor-axis-${i}`} d={d} stroke={ms.streetCasing} strokeWidth={STREET_MINOR_PX} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              ))}
              {/* Axes larges : creusés puis surface repeinte plus claire */}
              {scene.axesD.map((d, i) => (
                <Path key={`axis-casing-${i}`} d={d} stroke={ms.streetCasing} strokeWidth={STREET_MAJOR_CASING_PX} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              ))}
              {scene.axesD.map((d, i) => (
                <Path key={`axis-${i}`} d={d} stroke={ms.streetMajor} strokeWidth={STREET_MAJOR_PX} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              ))}
              {/* Canal : berges creusées + bande d'eau sombre */}
              <Path d={scene.canalD} stroke={ms.streetCasing} strokeWidth={CANAL_BANK_PX} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <Path d={scene.canalD} stroke={ms.water} strokeWidth={CANAL_PX} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              {/* Parcs : base opaque puis aplat vert très sombre */}
              {scene.parksD.map((d, i) => (
                <Path key={`park-base-${i}`} d={d} fill={ms.parkBase} />
              ))}
              {scene.parksD.map((d, i) => (
                <Path key={`park-${i}`} d={d} fill={ms.parkFill} stroke={ms.parkEdge} strokeWidth={1} />
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

            {/* ── Zone bonus (1 MAX) : anneau or pulsé lentement ─────────── */}
            <Animated.View
              style={[StyleSheet.absoluteFill, { opacity: bonusOpacity }]}
              pointerEvents="none"
            >
              <Svg width={size.w} height={size.h}>
                <Circle
                  cx={scene.bonus.x}
                  cy={scene.bonus.y}
                  r={scene.bonus.rPx}
                  fill={withAlpha(gameColors.gold, 0.12)}
                  stroke={gameColors.gold}
                  strokeOpacity={0.75}
                  strokeWidth={2}
                  strokeDasharray="6 4"
                />
              </Svg>
            </Animated.View>

            {/* ── Parcours sélectionné : aperçu type Uber (progress 0) ───── */}
            {selectedParcours && scene.parcours[selectedParcours] ? (
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <RouteProgress
                  points={scene.parcours[selectedParcours] ?? []}
                  progress={0}
                  width={size.w}
                  height={size.h}
                />
              </View>
            ) : null}

            {/* ── Markers d'état (icônes @klaim/shared) ─────────────────── */}
            {layers.crew ? (
              <Marker
                x={scene.shield.x}
                y={scene.shield.y - SHIELD_ABOVE_EGO_PX}
                icon="bouclier"
              />
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
                {/* Défi à proximité : 1 marker MAX (anti-bruit) */}
                <Marker x={scene.challenge.x} y={scene.challenge.y} icon="cible" />
              </>
            ) : null}

            {/* ── POI running discrets (≤ 4 — AMENDEMENT-09 §2) ─────────── */}
            {scene.pois.map((p) => (
              <View
                key={p.kind}
                style={[styles.poiWrap, { left: p.x - 36, top: p.y - 12 }]}
                pointerEvents="none"
              >
                <PoiMarker kind={p.kind} label={p.label} />
              </View>
            ))}

            {/* ── Membres crew OPT-IN uniquement (AMENDEMENT-07) ─────────── */}
            {scene.mates.map((m) => (
              <View
                key={m.name}
                style={[
                  styles.mateWrap,
                  { left: m.x - 70, bottom: size.h - m.y - MATE_MARKER_SIZE / 2 },
                ]}
                pointerEvents="box-none"
              >
                <MateMarker name={m.name} distanceKm={m.distanceKm} isLeader={m.isLeader} />
              </View>
            ))}

            {/* ── Moi : point chartreuse + halo respirant (égocentré) ───── */}
            <EgoMarker x={size.w / 2} y={size.h / 2} />

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
          </Animated.View>
        ) : null}
      </View>

      {/* ── Couche 5 : HUD Uber (pill, feed, boutons flottants, sheet) ──── */}
      <BattleMapOverlays
        layers={layers}
        onToggleLayer={toggleLayer}
        summary={summary}
        runMode={runMode}
        onRecenter={recenter}
        selectedParcoursId={selectedParcours}
        onSelectParcours={setSelectedParcours}
      />
    </View>
  );
}

/** Point « moi » : dot chartreuse cerclé blanc + halo pulsé (reduce motion → fixe). */
function EgoMarker({ x, y }: XY) {
  const halo = usePulse(true, 1.3, EGO_PULSE_MS);
  const haloOpacity = halo.interpolate({ inputRange: [1, 1.3], outputRange: [0.4, 0.05] });
  return (
    <View
      pointerEvents="none"
      style={[styles.ego, { left: x - EGO_HALO_SIZE / 2, top: y - EGO_HALO_SIZE / 2 }]}
    >
      <Animated.View
        style={[styles.egoHalo, { opacity: haloOpacity, transform: [{ scale: halo }] }]}
      />
      <View style={styles.egoDot} />
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
  icon: 'bouclier' | 'sablier' | 'pin' | 'avantposte' | 'cible';
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
  poiWrap: { position: 'absolute', width: 72, alignItems: 'center' },
  mateWrap: { position: 'absolute', width: 140, alignItems: 'center' },
  ego: {
    position: 'absolute',
    width: EGO_HALO_SIZE,
    height: EGO_HALO_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  egoHalo: {
    position: 'absolute',
    width: EGO_HALO_SIZE,
    height: EGO_HALO_SIZE,
    borderRadius: EGO_HALO_SIZE / 2,
    backgroundColor: colors.chartreuse14,
    borderWidth: 1.5,
    borderColor: colors.chartreuse40,
  },
  egoDot: {
    width: EGO_DOT_SIZE,
    height: EGO_DOT_SIZE,
    borderRadius: EGO_DOT_SIZE / 2,
    backgroundColor: colors.chartreuse,
    borderWidth: 2,
    borderColor: colors.blanc,
  },
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
