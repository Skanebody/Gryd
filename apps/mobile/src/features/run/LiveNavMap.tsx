/**
 * GRYD — carte de navigation de la Course Live (AMENDEMENT-09 §3, revu
 * AMENDEMENT-11 : ZÉRO hexagone visible ; AMENDEMENT-16 §0 : VRAIE CARTE,
 * ZÉRO HALO) : les VRAIES tuiles (RealMap — même carte que la Battle Map)
 * sous les couches de jeu, caméra qui SUIT le coureur (easing fluide, échelle
 * coureur RUNNER_SCALE_ZOOM, le coureur vit au-dessus du centre — la sheet
 * occupe le bas). La simulation suit des polylignes ROUTÉES en géo réel
 * (liveNav) : tout est projeté en sources GeoJSON réelles :
 *   - RUBAN NET le long de la trace parcourue qui S'ÉTEND derrière le coureur
 *     (allTerritories.ribbonRing — remplissage faible + trait 2,2 px, RIEN
 *     d'autre : plus aucune couche de lueur/glow) ; frontière contestée =
 *     double trait chartreuse+orange décalé (l'orange pulse) ;
 *   - boucle fermée = le polygone DU TRACÉ se remplit ; aperçu « zone
 *     fantôme » = polygone NET du tracé prévu en pointillé ; boucle ouverte =
 *     pointillé discret position → départ + marqueur départ ;
 *   - itinéraire type Uber : gris en avance, parcouru peint chartreuse,
 *     flèche au prochain virage — remonté à la déviation (la route restante
 *     se redessine, démo scriptée) ;
 *   - SOBRE (AMENDEMENT-11 §3) : la route, le coureur, sa zone qui grandit,
 *     la destination — pas tout le territoire, pas les rivaux ;
 *   - avatar coureur : disque chartreuse orienté selon le déplacement, halo
 *     type Uber (SEUL halo conservé — AMENDEMENT-16 §0) ; destination pin +
 *     anneau pulsé ; anneau pulsé au front de capture (violet si contesté).
 * Glisser la carte (web) coupe le suivi, `recenter()` (ref) le rétablit.
 * Position DÉMO locale, jamais publiée (AMENDEMENT-07). Reduce motion : snap
 * caméra/avatar directs, pulses fixes. AUCUN chiffre ici : tous les compteurs
 * vivent dans la bottom sheet (anti-bruit AMENDEMENT-09). Offline : fallback
 * RealMap (« Carte indisponible — tes zones restent à toi »).
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Animated, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { cellToLatLng } from 'h3-js';
import { colors, gameColors } from '@klaim/shared';
import { Icon } from '../../ui/Icon';
import {
  RealMap,
  usePulse,
  useReduceMotion,
  type RealMapGeoJSONLayer,
  type RealMapMarker,
  type RealMapRef,
} from '../../ui/game';
import type { RoutePoint } from '../../ui/game';
import { territoryStyle, withAlpha } from '../map/mapStyle';
import {
  CORRIDOR_HALF_WIDTH_M,
  loopRing,
  ribbonRing,
} from '../map/allTerritories';
import { REAL_M_PER_DEG_LAT, RUNNER_SCALE_ZOOM, type LatLngPoint } from '../map/realAnchors';
import type { LoopPhase, RunLoop } from './loop';
import { SIM_TICK_MS, type RunSimulation } from './simulation';
import { NAV_MAP_METERS_PER_PIXEL, worldToGeo, type LiveNav } from './liveNav';

// ─── Constantes de rendu (UI uniquement — pas des règles de jeu) ────────────

/** Diamètre du disque coureur. */
const AVATAR_SIZE = 24;
/** Halo type Uber autour du coureur (SEUL halo conservé — A-16 §0). */
const AVATAR_HALO_SIZE = 44;
/** Le coureur vit un peu AU-DESSUS du centre (la sheet occupe le bas). */
const CAMERA_CENTER_Y_RATIO = 0.4;
/** Anneau autour de la destination. */
const DEST_HALO_SIZE = 40;
/** Anneau de pulse du front de capture / checkpoint atteint (≈ 1 zone). */
const PULSE_RING_SIZE = 30;
/** Le pulse checkpoint reste visible N ticks après le franchissement. */
const CHECKPOINT_PULSE_TICKS = 4;
/** Frontière du territoire (§4ter : trait NET 2,2 px — parité mapStyle). */
const TERRITORY_BORDER_WIDTH = 2.2;
/** Écart latéral du DOUBLE trait contesté (line-offset — parité mapStyle). */
const CONTESTED_OFFSET_PX = 2.5;
/** Itinéraire type Uber (parité RouteProgress : gris/chartreuse, liseré noir). */
const ROUTE_WIDTH = 4;
const ROUTE_CASING_EXTRA = 3;
/** Virage signalé à partir de ce changement de cap (degrés). */
const TURN_MIN_DEG = 25;
/** Pastille de la flèche de virage. */
const TURN_BADGE_SIZE = 18;
/** Pointillés MapLibre (multiples de la largeur du trait). */
const LOOP_OPEN_DASH: readonly number[] = [3.5, 3.5];
const LOOP_GHOST_DASH: readonly number[] = [2.5, 2.5];
/** Marqueur départ (anneau chartreuse) tant que la boucle est ouverte. */
const LOOP_START_SIZE = 12;
/** Pas d'interpolation entre deux ticks (position + caméra glissent). */
const INTERP_STEPS = 8;
/** Points quasi confondus absorbés dans la trace géo (~2 m — anti-bruit ruban). */
const TRACE_DEDUP_DEG = 2e-5;

type NavCollection = RealMapGeoJSONLayer['data'];

/** Collection vide : chaque couche existe TOUJOURS (ordre de peinture stable). */
const EMPTY_COLLECTION: NavCollection = { type: 'FeatureCollection', features: [] };

/** Anneau [lng, lat] fermé → FeatureCollection Polygon. */
function polygonCollection(ring: readonly [number, number][]): NavCollection {
  const first = ring[0];
  if (!first || ring.length < 3) return EMPTY_COLLECTION;
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[...ring.map((p) => [...p]), [...first]]] },
        properties: {},
      },
    ],
  };
}

/** Polyline lat/lng → FeatureCollection LineString ('' si < 2 points). */
function lineCollection(points: readonly LatLngPoint[]): NavCollection {
  if (points.length < 2) return EMPTY_COLLECTION;
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

// ─── Géométrie de polyline px (progression le long de l'itinéraire) ─────────

function cumulativeLengths(points: readonly RoutePoint[]): number[] {
  const cum: number[] = [0];
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    cum.push((cum[i - 1] ?? 0) + (a && b ? Math.hypot(b.x - a.x, b.y - a.y) : 0));
  }
  return cum;
}

function pointAt(points: readonly RoutePoint[], cum: readonly number[], len: number): RoutePoint {
  const first = points[0] ?? { x: 0, y: 0 };
  for (let i = 1; i < points.length; i += 1) {
    const end = cum[i] ?? 0;
    if (end < len) continue;
    const start = cum[i - 1] ?? 0;
    const a = points[i - 1] ?? first;
    const b = points[i] ?? a;
    const t = end === start ? 0 : (len - start) / (end - start);
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }
  return points[points.length - 1] ?? first;
}

/** Sommets parcourus jusqu'à `len` px (+ la tête interpolée). */
function traveledPoints(
  points: readonly RoutePoint[],
  cum: readonly number[],
  len: number,
): RoutePoint[] {
  if (len <= 0 || points.length < 2) return [];
  const out: RoutePoint[] = [];
  const first = points[0];
  if (!first) return [];
  out.push(first);
  for (let i = 1; i < points.length; i += 1) {
    const p = points[i];
    if (!p) break;
    if ((cum[i] ?? 0) <= len) {
      out.push(p);
    } else {
      out.push(pointAt(points, cum, len));
      break;
    }
  }
  return out;
}

/** Prochain virage APRÈS la tête de progression : position + cap sortant. */
function nextTurn(
  points: readonly RoutePoint[],
  cum: readonly number[],
  len: number,
): { x: number; y: number; headingDeg: number } | null {
  for (let k = 1; k < points.length - 1; k += 1) {
    if ((cum[k] ?? 0) <= len) continue;
    const a = points[k - 1];
    const b = points[k];
    const c = points[k + 1];
    if (!a || !b || !c) return null;
    const inDeg = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
    const outDeg = (Math.atan2(c.y - b.y, c.x - b.x) * 180) / Math.PI;
    let turn = outDeg - inDeg;
    while (turn > 180) turn -= 360;
    while (turn < -180) turn += 360;
    if (Math.abs(turn) >= TURN_MIN_DEG) return { x: b.x, y: b.y, headingDeg: outDeg };
  }
  return null;
}

/** Écart angulaire normalisé [-180, 180] (rotation continue sans tour complet). */
function normalizeDeg(deg: number): number {
  let d = deg % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

export interface LiveNavMapHandle {
  /** Ramène la caméra sur le coureur et réactive le suivi. */
  recenter(): void;
}

export interface LiveNavMapProps {
  nav: LiveNav;
  sim: RunSimulation;
  /** Tick courant de la simulation. */
  tickIndex: number;
  /** true = conquête (territoire qui s'étend) ; false = stats only. */
  capturing: boolean;
  /** Fenêtre « zone contestée » active → frontière double contour + pulse violet. */
  contested?: boolean;
  /** État boucle démo (AMENDEMENT-12 §C) — null hors conquête. */
  loop?: RunLoop | null;
  /** Phase d'affichage de la boucle au tick courant. */
  loopPhase?: LoopPhase;
  /** Notifié quand le suivi caméra change (geste = off, recenter = on). */
  onFollowChange?: (following: boolean) => void;
}

interface DisplayPos {
  lat: number;
  lng: number;
  headingDeg: number;
}

export const LiveNavMap = forwardRef<LiveNavMapHandle, LiveNavMapProps>(function LiveNavMap(
  { nav, sim, tickIndex, capturing, contested = false, loop = null, loopPhase = 'none', onFollowChange },
  ref,
) {
  const reduce = useReduceMotion();
  const mapRef = useRef<RealMapRef>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  const lastIndex = nav.ticks.length - 1;
  const i = Math.min(Math.max(tickIndex, 0), lastIndex);
  const tick = nav.ticks[i] ?? nav.ticks[0];

  // ── Position AFFICHÉE (géo réelle) : interpolée entre deux ticks ──────────
  const startTick = nav.ticks[0];
  const startGeo = startTick ? worldToGeo(startTick.x, startTick.y) : { lat: 0, lng: 0 };
  const [pos, setPos] = useState<DisplayPos>({
    ...startGeo,
    headingDeg: startTick?.headingDeg ?? 0,
  });
  const posRef = useRef(pos);
  posRef.current = pos;

  useEffect(() => {
    if (!tick) return undefined;
    const g = worldToGeo(tick.x, tick.y);
    const target: DisplayPos = { lat: g.lat, lng: g.lng, headingDeg: tick.headingDeg };
    if (reduce) {
      setPos(target);
      return undefined;
    }
    const from = posRef.current;
    const dh = normalizeDeg(target.headingDeg - from.headingDeg);
    let step = 0;
    const id = setInterval(() => {
      step += 1;
      const t = step / INTERP_STEPS;
      setPos({
        lat: from.lat + (target.lat - from.lat) * t,
        lng: from.lng + (target.lng - from.lng) * t,
        headingDeg: from.headingDeg + dh * t,
      });
      if (step >= INTERP_STEPS) clearInterval(id);
    }, SIM_TICK_MS / INTERP_STEPS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- la cible ne dépend que du tick
  }, [i, reduce]);

  // ── Caméra : suit le coureur (easing RealMap), coupée par un glisser ──────
  const followingRef = useRef(true);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) =>
      prev && prev.w === width && prev.h === height ? prev : { w: width, h: height },
    );
  };
  /** Le coureur au-dessus du centre : la caméra vise un point plus au sud
      (mètres/px RÉELS de la carte au zoom coureur — pas l'échelle interne). */
  const camOffsetLat = size
    ? ((0.5 - CAMERA_CENTER_Y_RATIO) * size.h * NAV_MAP_METERS_PER_PIXEL) / REAL_M_PER_DEG_LAT
    : 0;
  const cameraTarget = useMemo(
    () => ({ lng: pos.lng, lat: pos.lat - camOffsetLat, zoom: RUNNER_SCALE_ZOOM }),
    [pos.lng, pos.lat, camOffsetLat],
  );
  /** Caméra FIGÉE tant que le suivi est coupé (le geste garde la main). */
  const frozenCameraRef = useRef(cameraTarget);
  if (followingRef.current) frozenCameraRef.current = cameraTarget;

  /** WEB : un glisser sur la carte coupe le suivi (dragstart maplibre-gl). */
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
        mapRef.current?.flyTo(frozenCameraRef.current);
      },
    }),
    [onFollowChange],
  );

  // ── Territoire en TRAITS NETS derrière le coureur (§4ter, A-16 : zéro halo) ─
  const litCount = tick?.litCount ?? 0;
  const lastCell = litCount > 0 ? nav.litCells[litCount - 1] : undefined;
  const loopClosed = loopPhase === 'closed';
  const traceGeo = useMemo(() => {
    const pts: LatLngPoint[] = [];
    for (let k = 0; k <= i; k += 1) {
      if (!sim.ticks[k]?.capturing) continue;
      const t = nav.ticks[k];
      if (!t) continue;
      const g = worldToGeo(t.x, t.y);
      const prev = pts[pts.length - 1];
      if (
        prev &&
        Math.abs(prev.lat - g.lat) < TRACE_DEDUP_DEG &&
        Math.abs(prev.lng - g.lng) < TRACE_DEDUP_DEG
      ) {
        continue;
      }
      pts.push(g);
    }
    return pts;
  }, [i, nav.ticks, sim.ticks]);
  /** Ruban net (~2 zones ≈ 60 m) le long de la trace parcourue. */
  const corridorData = useMemo(
    () =>
      traceGeo.length >= 2
        ? polygonCollection(ribbonRing(traceGeo, CORRIDOR_HALF_WIDTH_M))
        : EMPTY_COLLECTION,
    [traceGeo],
  );
  /** Boucle fermée : le polygone affiché EST le tracé (remplissage §4ter). */
  const loopFillData = useMemo(
    () =>
      loopClosed && loop && loop.traceGeo.length >= 3
        ? polygonCollection(loopRing(loop.traceGeo))
        : EMPTY_COLLECTION,
    [loopClosed, loop],
  );
  /** Zone fantôme (aperçu < 300 m) : polygone NET du tracé prévu, pointillé. */
  const ghostData = useMemo(
    () =>
      loopPhase === 'approach' && traceGeo.length >= 3
        ? polygonCollection(loopRing(traceGeo))
        : EMPTY_COLLECTION,
    [loopPhase, traceGeo],
  );
  /** Boucle ouverte : pointillé discret position → départ. */
  const loopStartGeo = useMemo(
    () => (loop ? worldToGeo(loop.startXY.x, loop.startXY.y) : null),
    [loop],
  );
  const loopOpen = loop !== null && !loopClosed && (loopPhase === 'open' || loopPhase === 'approach');
  const loopOpenData = useMemo(
    () =>
      loopOpen && loopStartGeo
        ? lineCollection([{ lat: pos.lat, lng: pos.lng }, loopStartGeo])
        : EMPTY_COLLECTION,
    [loopOpen, loopStartGeo, pos.lat, pos.lng],
  );

  // ── Itinéraire affiché : plan court, puis tracé recalculé (déviation) ─────
  const deviated = i >= nav.deviationTick;
  const routePoints = deviated ? nav.actualPoints : nav.plannedPoints;
  const routeCum = useMemo(() => cumulativeLengths(routePoints), [routePoints]);
  const routeTotal = routeCum[routeCum.length - 1] ?? 0;
  const routeLen = Math.min(tick?.lenPx ?? 0, routeTotal);
  const routeGeo = useMemo(
    () => routePoints.map((p) => worldToGeo(p.x, p.y)),
    [routePoints],
  );
  const routeData = useMemo(() => lineCollection(routeGeo), [routeGeo]);
  const routeDoneData = useMemo(
    () => lineCollection(traveledPoints(routePoints, routeCum, routeLen).map((p) => worldToGeo(p.x, p.y))),
    [routePoints, routeCum, routeLen],
  );
  /** Prochain virage (pastille flèche — parité RouteProgress). */
  const turn = useMemo(() => nextTurn(routePoints, routeCum, routeLen), [routePoints, routeCum, routeLen]);

  // ── Couches GeoJSON (ordre de peinture stable — sources vidées, jamais
  //    retirées). AMENDEMENT-16 §0 : remplissage faible + trait net, RIEN d'autre.
  const layers = useMemo<RealMapGeoJSONLayer[]>(
    () => [
      // Ruban de capture : fill faible + trait 2,2 px (double trait si contesté).
      {
        id: 'live-corridor',
        data: corridorData,
        fillColor: territoryStyle.crewFill,
        fillOpacity: 1,
        lineColor: contested
          ? territoryStyle.contestedInnerStroke
          : territoryStyle.crewStroke,
        lineWidth: TERRITORY_BORDER_WIDTH,
      },
      {
        id: 'live-corridor-contested',
        data: contested ? corridorData : EMPTY_COLLECTION,
        lineColor: territoryStyle.contestedOuterStroke,
        lineWidth: TERRITORY_BORDER_WIDTH,
        lineOffset: CONTESTED_OFFSET_PX,
        pulse: true,
      },
      // Boucle fermée : le polygone DU TRACÉ rempli, trait net.
      {
        id: 'live-loop-fill',
        data: loopFillData,
        fillColor: territoryStyle.crewFill,
        fillOpacity: 1,
        lineColor: territoryStyle.crewStroke,
        lineWidth: TERRITORY_BORDER_WIDTH,
      },
      // Zone fantôme : polygone NET du tracé prévu en pointillé (< 300 m).
      {
        id: 'live-ghost',
        data: ghostData,
        fillColor: territoryStyle.objectiveSoft,
        fillOpacity: 1,
        lineColor: colors.chartreuse40,
        lineWidth: TERRITORY_BORDER_WIDTH,
        lineDash: LOOP_GHOST_DASH,
      },
      // Boucle ouverte : pointillé discret position → départ.
      {
        id: 'live-loop-open',
        data: loopOpenData,
        lineColor: colors.chartreuse40,
        lineWidth: 2,
        lineDash: LOOP_OPEN_DASH,
      },
      // Itinéraire type Uber : liseré sombre, gris en avance, parcouru chartreuse.
      {
        id: 'live-route-casing',
        data: routeData,
        lineColor: withAlpha(colors.noir, 0.5),
        lineWidth: ROUTE_WIDTH + ROUTE_CASING_EXTRA,
      },
      {
        id: 'live-route-ahead',
        data: routeData,
        lineColor: colors.gris,
        lineWidth: ROUTE_WIDTH,
      },
      {
        id: 'live-route-done',
        data: routeDoneData,
        lineColor: colors.chartreuse,
        lineWidth: ROUTE_WIDTH,
      },
    ],
    [corridorData, contested, loopFillData, ghostData, loopOpenData, routeData, routeDoneData],
  );

  // ── Markers (le dernier au-dessus : « moi » reste au sommet) ──────────────
  const destGeo = useMemo(
    () => worldToGeo(nav.destination.x, nav.destination.y),
    [nav.destination],
  );
  const reachedCp = nav.checkpointsActual.find(
    (cp) => cp.tick >= 0 && i >= cp.tick && i - cp.tick <= CHECKPOINT_PULSE_TICKS,
  );
  const frontGeo = useMemo(() => {
    if (!lastCell) return null;
    const [lat, lng] = cellToLatLng(lastCell);
    return { lat: lat ?? 0, lng: lng ?? 0 };
  }, [lastCell]);

  const markers = useMemo<RealMapMarker[]>(() => {
    const out: RealMapMarker[] = [];
    if (turn && !(i >= lastIndex)) {
      const g = worldToGeo(turn.x, turn.y);
      out.push({
        id: 'live-turn',
        lng: g.lng,
        lat: g.lat,
        children: <TurnBadge deg={turn.headingDeg} />,
      });
    }
    out.push({
      id: 'live-destination',
      lng: destGeo.lng,
      lat: destGeo.lat,
      children: <DestinationMarker />,
    });
    if (loopOpen && loopStartGeo) {
      out.push({
        id: 'live-loop-start',
        lng: loopStartGeo.lng,
        lat: loopStartGeo.lat,
        children: <LoopStartDot />,
      });
    }
    if (reachedCp) {
      const g = worldToGeo(reachedCp.x, reachedCp.y);
      out.push({
        id: 'live-checkpoint-pulse',
        lng: g.lng,
        lat: g.lat,
        children: <PulseRing color={colors.chartreuse40} speed="fast" />,
      });
    }
    if (capturing && frontGeo) {
      out.push({
        id: 'live-capture-front',
        lng: frontGeo.lng,
        lat: frontGeo.lat,
        children: (
          <PulseRing color={contested ? gameColors.contested : colors.chartreuse40} />
        ),
      });
    }
    // Avatar coureur — TOUJOURS au-dessus. Position DÉMO locale, jamais
    // publiée (AMENDEMENT-07).
    out.push({
      id: 'live-ego',
      lng: pos.lng,
      lat: pos.lat,
      children: <RunnerMarker headingDeg={pos.headingDeg} />,
    });
    return out;
  }, [turn, i, lastIndex, destGeo, loopOpen, loopStartGeo, reachedCp, capturing, frontGeo, contested, pos]);

  return (
    <View style={styles.root} onLayout={onLayout}>
      <RealMap
        ref={mapRef}
        camera={frozenCameraRef.current}
        geojsonLayers={layers}
        markers={markers}
        onMapReady={onMapReady}
        attributionCompact={false}
        style={StyleSheet.absoluteFill}
        testID="course-live-carte-reelle"
      />
    </View>
  );
});

// ─── Markers (contenu RN — RealMap les ancre au point géo) ──────────────────

/** Avatar coureur : halo type Uber + disque chartreuse orienté (flèche). */
function RunnerMarker({ headingDeg }: { headingDeg: number }) {
  const halo = usePulse(true, 1.15, 1_800);
  return (
    <View pointerEvents="none" style={styles.avatarWrap}>
      <Animated.View style={[styles.avatarHalo, { transform: [{ scale: halo }] }]} />
      <View style={[styles.avatarDisc, { transform: [{ rotate: `${headingDeg}deg` }] }]}>
        <Svg width={AVATAR_SIZE} height={AVATAR_SIZE} viewBox="0 0 24 24">
          <Path d="M12 5 L17 16 L12 13.4 L7 16 Z" fill={colors.noir} />
        </Svg>
      </View>
    </View>
  );
}

/** Destination : repère fort (pin + anneau pulsé). */
function DestinationMarker() {
  const pulse = usePulse(true, 1.18, 2_200);
  return (
    <View pointerEvents="none" style={styles.destWrap}>
      <Animated.View style={[styles.destHalo, { transform: [{ scale: pulse }] }]} />
      <Icon name="pin" size={18} color={colors.chartreuse} />
    </View>
  );
}

/** Anneau pulsé (front de capture / checkpoint atteint). */
function PulseRing({ color, speed = 'slow' }: { color: string; speed?: 'slow' | 'fast' }) {
  const pulse = usePulse(true, speed === 'fast' ? 1.6 : 1.3, speed === 'fast' ? 800 : 1_400);
  return (
    <View pointerEvents="none" style={styles.pulseWrap}>
      <Animated.View
        style={[styles.pulseRing, { borderColor: color, transform: [{ scale: pulse }] }]}
      />
    </View>
  );
}

/** Marqueur départ de boucle (anneau chartreuse sur fond noir). */
function LoopStartDot() {
  return <View pointerEvents="none" style={styles.loopStart} />;
}

/** Pastille flèche du prochain virage (parité RouteProgress). */
function TurnBadge({ deg }: { deg: number }) {
  return (
    <View pointerEvents="none" style={styles.turnBadge}>
      <View style={{ transform: [{ rotate: `${deg}deg` }] }}>
        <Svg width={12} height={12} viewBox="-6 -6 12 12">
          <Path
            d="M-3.5 -4.5 L3 0 L-3.5 4.5"
            stroke={colors.blanc}
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir, overflow: 'hidden' },

  avatarWrap: {
    width: AVATAR_HALO_SIZE,
    height: AVATAR_HALO_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHalo: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: AVATAR_HALO_SIZE / 2,
    backgroundColor: colors.chartreuse14,
    borderWidth: 1,
    borderColor: colors.chartreuse40,
  },
  avatarDisc: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.chartreuse,
    borderWidth: 2,
    borderColor: colors.noir,
    alignItems: 'center',
    justifyContent: 'center',
  },

  destWrap: {
    width: DEST_HALO_SIZE,
    height: DEST_HALO_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destHalo: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: DEST_HALO_SIZE / 2,
    borderWidth: 1.5,
    borderColor: colors.chartreuse40,
    backgroundColor: colors.chartreuse14,
  },

  pulseWrap: {
    width: PULSE_RING_SIZE,
    height: PULSE_RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: PULSE_RING_SIZE / 2,
    borderWidth: 1.5,
  },

  loopStart: {
    width: LOOP_START_SIZE,
    height: LOOP_START_SIZE,
    borderRadius: LOOP_START_SIZE / 2,
    backgroundColor: colors.noir,
    borderWidth: 2,
    borderColor: colors.chartreuse,
  },

  turnBadge: {
    width: TURN_BADGE_SIZE,
    height: TURN_BADGE_SIZE,
    borderRadius: TURN_BADGE_SIZE / 2,
    backgroundColor: gameColors.carbon,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
