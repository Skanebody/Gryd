/**
 * GRYD — BATTLE MAP, variante WEB (aperçu navigateur — cible visuelle
 * prioritaire). AMENDEMENT-11 §2-3 : PLUS AUCUN HEXAGONE VISIBLE — H3 reste le
 * moteur invisible (fakeHexes), le rendu affiche des TERRITOIRES ORGANIQUES
 * (pipeline territory.ts : fusion → simplification → lissage Chaikin).
 * Metro résout `.web.tsx` avant `.tsx` sur la cible web : MapLibre (natif-only)
 * n'est JAMAIS importé ici. ÉCHELLE COUREUR : projection à échelle FIXE
 * (~4,3 m/px), égocentrée AMENDEMENT-01 (le secteur maison reste au centre).
 * Couches, toutes dessinées à partir du MÊME jeu démo :
 *   1. basemap Uber-night (AMENDEMENT-09 §0) : ÎLOTS URBAINS PLEINS — le fond
 *      NEUTRE de la carte, c'est EUX (aucune cellule grise) ;
 *   2. TERRITOIRES ORGANIQUES + FRONTIÈRES par état : crew (aplat sombre teinté
 *      + contour fin semi-lumineux + glow), rival (contour orange marqué),
 *      contesté (DOUBLE contour chartreuse+orange, pulse lent sur le path
 *      contesté seulement), protégé (halo + UNE icône shield par secteur),
 *      decay (frontière pointillée + UN sablier au secteur, muted red si
 *      urgent), objectif (pin + zone chaude douce), avant-poste (petit blob
 *      organique), route ouverte (ligne épaisse) ;
 *   3. couche « situation live » AMENDEMENT-09 §2 : moi (point chartreuse +
 *      halo), 2 MateMarker opt-in (AMENDEMENT-07 — jamais de position
 *      publique), ≤ 4 PoiMarker, 1 marker défi + 1 zone bonus pulsante MAX,
 *      parcours sélectionné en aperçu (RouteProgress, progress 0) ;
 *   4. HUD (BattleMapOverlays : pill % de contrôle, war feed 1 event, chips des
 *      5 MODES de carte, MapBottomSheet objectif/défis/parcours).
 * 5 MODES (AMENDEMENT-11 §3, un seul actif) : Territoire / Route / Défense /
 * Raid / Exploration — MODE_EMPHASIS atténue les familles de couches hors
 * décision, transition douce (fondu court, reduce motion → bascule sèche).
 * Anti-patchwork : max 3-4 aplats simultanés (crew, rival, contesté, objectif).
 * Animations RN Animated core : vague de capture au mount (useReveal), pulse
 * de la frontière contestée (usePulse), recentrage = settle spring de la scène
 * — reduce motion respecté.
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
import { BattleMapOverlays } from './BattleMapOverlays';
import { battleMapData, battleMapSummary } from './fakeHexes';
import { battleMapStyle as ms, territoryStyle as terr, withAlpha } from './mapStyle';
import {
  DEFAULT_MAP_MODE,
  MODE_EMPHASIS,
  battleTerritories,
  territoryPath,
  type MapMode,
  type TerritoryState,
} from './territory';
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
/** Échelle gelée depuis AMENDEMENT-08 : ~130 m (une zone H3 res 10, moteur
 * invisible) rendus sur ~30 px → ≈ 4,33 m/px, viewport 375 px ≈ 1,6 km. */
const ZONE_DIAMETER_M = 130;
const ZONE_TARGET_PX = 30;
const METERS_PER_PIXEL = ZONE_DIAMETER_M / ZONE_TARGET_PX;
/** Barre d'échelle graphique discrète (bas gauche) : 500 m ≈ 115 px. */
const SCALE_BAR_METERS = 500;
/** Culling des îlots : marge = plus grand îlot (~150 m) converti en px. */
const BLOCK_CULL_MARGIN_PX = 150 / METERS_PER_PIXEL;

// ─── Voirie Uber-night (AMENDEMENT-09 §0) : largeurs basemap converties en px ─
const STREET_MINOR_PX = STREET_MINOR_WIDTH_M / METERS_PER_PIXEL;
const STREET_MAJOR_PX = STREET_MAJOR_WIDTH_M / METERS_PER_PIXEL;
/** Creusage des axes : légèrement plus large que la surface repeinte. */
const STREET_MAJOR_CASING_PX = STREET_MAJOR_PX + 2;
const CANAL_PX = CANAL_WIDTH_M / METERS_PER_PIXEL;
const CANAL_BANK_PX = CANAL_BANK_WIDTH_M / METERS_PER_PIXEL;

/** Cadence du pulse LENT de la frontière contestée (UI). */
const CONTESTED_PULSE_MS = 2_400;
/** Fondu court entre deux modes de carte (transition douce). */
const MODE_FADE_MS = 260;
const MODE_FADE_DIP = 0.35;
// ── Frontières organiques (traitements d'état — AMENDEMENT-11 §2) ──
/** Frontière normale : contour fin semi-lumineux. */
const BORDER_WIDTH = 1.8;
/** Frontière rivale : contour orange MARQUÉ. */
const RIVAL_BORDER_WIDTH = 2.6;
/** Double contour contesté : chartreuse dedans, orange pulsé dehors. */
const CONTESTED_INNER_WIDTH = 1.8;
const CONTESTED_OUTER_WIDTH = 3;
/** Glow sous la frontière crew + halo du secteur protégé. */
const CREW_GLOW_WIDTH = 7;
const PROTECTED_HALO_WIDTH = 5;
/** Frontière decay : pointillé organique. */
const DECAY_DASH = '6 5';
const DECAY_WIDTH = 1.8;
/** Zone chaude douce de l'objectif : lueur large sans bord dur. */
const OBJECTIVE_SOFT_WIDTH = 12;
/** Route ouverte ÉPAISSE (route-first, lisible au soleil). */
const ROUTE_WIDTH = 4;
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

interface Scene {
  /** Chemins SVG des TERRITOIRES ORGANIQUES par état ('' si absent). */
  terri: Record<TerritoryState, string>;
  /** UN sablier PAR SECTEUR en decay (ancre du territoire urgent, sinon decay). */
  decaySablier: XY | null;
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
  // ── Situation live AMENDEMENT-09 §2 (positions écran des couches 4) ──
  mates: (MateOnMapDemo & XY)[];
  pois: (PoiOnMapDemo & XY)[];
  challenge: XY;
  bonus: XY & { rPx: number };
  /** Tracés des parcours proposés (px écran) — aperçu RouteProgress au tap. */
  parcours: Record<string, RoutePoint[]>;
}

/**
 * Projette territoires organiques + basemap + points (lng/lat) dans un repère
 * width×height à ÉCHELLE FIXE (METERS_PER_PIXEL), centré sur le secteur maison
 * (égocentré AMENDEMENT-01). Les territoires sortent du pipeline territory.ts
 * (fusion → simplification → lissage) — UN path par état, AUCUN hexagone.
 */
function buildScene(width: number, height: number): Scene {
  const { points } = battleMapData();
  const centre = points.protectedCenter;

  const toXY = (lng: number, lat: number): XY => ({
    x: width / 2 + ((lng - centre.lng) * M_PER_DEG_LNG) / METERS_PER_PIXEL,
    y: height / 2 - ((lat - centre.lat) * M_PER_DEG_LAT) / METERS_PER_PIXEL,
  });
  const pointXY = (p: LatLngPoint): XY => toXY(p.lng, p.lat);
  const lineD = (pts: readonly LatLngPoint[], close = false): string => {
    const d = pts
      .map((p, i) => {
        const { x, y } = pointXY(p);
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
    return close ? `${d} Z` : d;
  };

  // Territoires organiques : un chemin SVG lissé par état (jamais de neutre).
  const terri: Record<TerritoryState, string> = {
    crew: '',
    protected: '',
    decay: '',
    decayUrgent: '',
    rival: '',
    contested: '',
    objective: '',
    outpost: '',
  };
  let decaySablier: XY | null = null;
  for (const territory of battleTerritories()) {
    terri[territory.state] = territoryPath(territory, toXY);
    if (territory.state === 'decayUrgent' || (territory.state === 'decay' && !decaySablier)) {
      decaySablier = pointXY(territory.labelAnchor);
    }
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
    terri,
    decaySablier,
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
    mates: MATES_OPT_IN.map((m) => ({ ...m, ...pointXY(m.position) })),
    pois: POIS_ON_MAP.map((p) => ({ ...p, ...pointXY(p.position) })),
    challenge: pointXY(MAP_CHALLENGE.position),
    bonus: { ...pointXY(MAP_BONUS_ZONE.center), rPx: MAP_BONUS_ZONE.radiusM / METERS_PER_PIXEL },
    parcours,
  };
}

export function MapScreen() {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [mode, setMode] = useState<MapMode>(DEFAULT_MAP_MODE);
  const [selectedParcours, setSelectedParcours] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();

  const summary = useMemo(() => battleMapSummary(battleMapData().collection), []);
  const runMode = useMemo(() => deriveRunButtonMode(), []);
  /** Emphase des familles de couches selon le mode actif (AMENDEMENT-11 §3). */
  const emph = MODE_EMPHASIS[mode];

  // Changement de mode : fondu court de la couche territoires (transition
  // douce) — reduce motion → bascule sèche.
  const modeFade = useRef(new Animated.Value(1)).current;
  const selectMode = (next: MapMode) => {
    setMode(next);
    if (reduce) return;
    modeFade.setValue(MODE_FADE_DIP);
    Animated.timing(modeFade, {
      toValue: 1,
      duration: MODE_FADE_MS,
      useNativeDriver: true,
    }).start();
  };

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
  // Pulse LENT de la frontière contestée SEULE (reduce motion → fixe).
  const pulse = usePulse(true, 1.06, CONTESTED_PULSE_MS);
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

            {/* ── Couche 2 : TERRITOIRES ORGANIQUES + FRONTIÈRES par état ──
                 (AMENDEMENT-11 §2 — vague de capture au mount + fondu de mode.
                 Le fond neutre = les îlots basemap : AUCUNE cellule grise.) */}
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                {
                  opacity: Animated.multiply(reveal.opacity, modeFade),
                  transform: [{ scale: reveal.scale }],
                },
              ]}
              pointerEvents="none"
            >
              <Svg width={size.w} height={size.h}>
                {/* Rival : aplat sombre teinté + FRONTIÈRE orange marquée */}
                <Path
                  d={scene.terri.rival}
                  fill={terr.rivalFill}
                  fillRule="evenodd"
                  stroke={terr.rivalStroke}
                  strokeWidth={RIVAL_BORDER_WIDTH}
                  strokeLinejoin="round"
                  opacity={emph.rival}
                />

                {/* Objectif : zone chaude DOUCE (lueur large, pas de bord dur) */}
                <Path
                  d={scene.terri.objective}
                  fill="none"
                  stroke={terr.objectiveSoft}
                  strokeWidth={OBJECTIVE_SOFT_WIDTH}
                  strokeLinejoin="round"
                  opacity={emph.objective}
                />
                <Path
                  d={scene.terri.objective}
                  fill={terr.objectiveFill}
                  fillRule="evenodd"
                  opacity={emph.objective}
                />

                {/* Mon crew : glow + aplat + frontière fine semi-lumineuse */}
                <Path
                  d={scene.terri.crew}
                  fill="none"
                  stroke={terr.crewGlow}
                  strokeWidth={CREW_GLOW_WIDTH}
                  strokeLinejoin="round"
                  opacity={emph.crew}
                />
                <Path
                  d={scene.terri.crew}
                  fill={terr.crewFill}
                  fillRule="evenodd"
                  stroke={terr.crewStroke}
                  strokeWidth={BORDER_WIDTH}
                  strokeLinejoin="round"
                  opacity={emph.crew}
                />

                {/* Avant-poste : petit blob organique tenu */}
                <Path
                  d={scene.terri.outpost}
                  fill={terr.outpostFill}
                  fillRule="evenodd"
                  stroke={terr.outpostStroke}
                  strokeWidth={BORDER_WIDTH}
                  strokeLinejoin="round"
                  opacity={emph.crew}
                />

                {/* Zone à défendre (decay) : frontière pointillée, muted red si urgent */}
                <Path
                  d={scene.terri.decayUrgent}
                  fill={terr.decayUrgentFill}
                  fillRule="evenodd"
                  opacity={emph.defense}
                />
                <Path
                  d={scene.terri.decay}
                  fill="none"
                  stroke={terr.decayStroke}
                  strokeWidth={DECAY_WIDTH}
                  strokeDasharray={DECAY_DASH}
                  strokeLinejoin="round"
                  opacity={emph.defense}
                />
                <Path
                  d={scene.terri.decayUrgent}
                  fill="none"
                  stroke={terr.decayUrgentStroke}
                  strokeWidth={DECAY_WIDTH}
                  strokeDasharray={DECAY_DASH}
                  strokeLinejoin="round"
                  opacity={emph.defense}
                />

                {/* Secteur protégé : halo verify (l'icône shield est UNIQUE, posée plus bas) */}
                <Path
                  d={scene.terri.protected}
                  fill="none"
                  stroke={terr.protectedHalo}
                  strokeWidth={PROTECTED_HALO_WIDTH}
                  strokeLinejoin="round"
                  opacity={emph.defense}
                />

                {/* Contesté : aplat + contour intérieur chartreuse (l'orange pulse à part) */}
                <Path
                  d={scene.terri.contested}
                  fill={terr.contestedFill}
                  fillRule="evenodd"
                  stroke={terr.contestedInnerStroke}
                  strokeWidth={CONTESTED_INNER_WIDTH}
                  strokeLinejoin="round"
                  opacity={emph.contested}
                />

                {/* Route ouverte : ligne ÉPAISSE le long d'une rue + points de liaison */}
                <Path
                  d={scene.routeD}
                  fill="none"
                  stroke={terr.routeStroke}
                  strokeWidth={ROUTE_WIDTH}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={emph.route}
                />
                {scene.routeDots.map((p, i) => (
                  <Circle
                    key={`route-dot-${i}`}
                    cx={p.x}
                    cy={p.y}
                    r={2.5}
                    fill={terr.routeDot}
                    opacity={emph.route}
                  />
                ))}
              </Svg>
            </Animated.View>

            {/* ── Pulse lent : UNIQUEMENT la frontière contestée (2e contour) ── */}
            {scene.terri.contested ? (
              <Animated.View
                style={[StyleSheet.absoluteFill, { opacity: pulseOpacity }]}
                pointerEvents="none"
              >
                <Svg width={size.w} height={size.h}>
                  <Path
                    d={scene.terri.contested}
                    fill="none"
                    stroke={terr.contestedOuterStroke}
                    strokeWidth={CONTESTED_OUTER_WIDTH}
                    strokeLinejoin="round"
                    opacity={emph.contested}
                  />
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

            {/* ── Markers d'état : UNE icône par SECTEUR (jamais par cellule) ── */}
            <View style={{ opacity: emph.defense }} pointerEvents="none">
              {/* Protection : 1 shield sur le secteur maison */}
              <Marker
                x={scene.shield.x}
                y={scene.shield.y - SHIELD_ABOVE_EGO_PX}
                icon="bouclier"
              />
              {/* Zone à défendre : 1 sablier sur le secteur en decay */}
              {scene.decaySablier ? (
                <Marker x={scene.decaySablier.x} y={scene.decaySablier.y} icon="sablier" danger />
              ) : null}
            </View>
            <View style={{ opacity: emph.objective }} pointerEvents="none">
              <Marker x={scene.objectivePin.x} y={scene.objectivePin.y} icon="pin" crew />
              {/* Défi à proximité : 1 marker MAX (anti-bruit) */}
              <Marker x={scene.challenge.x} y={scene.challenge.y} icon="cible" />
            </View>
            <View style={{ opacity: emph.crew }} pointerEvents="none">
              <Marker x={scene.outpostMarker.x} y={scene.outpostMarker.y} icon="avantposte" />
            </View>

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

      {/* ── Couche 4 : HUD (pill % contrôle, feed, modes, sheet) ────────── */}
      <BattleMapOverlays
        mode={mode}
        onSelectMode={selectMode}
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
