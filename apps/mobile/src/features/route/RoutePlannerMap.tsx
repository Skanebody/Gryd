/**
 * GRYD — carte du ROUTE PLANNER (AMENDEMENT-10 §2, AMENDEMENT-11 §3 ;
 * AMENDEMENT-16 §0 : VRAIES TUILES + ZÉRO HALO). La carte est un RealMap
 * (maplibre — même carte réelle que la Battle Map et la Course Live), la
 * basemap procédurale a disparu : les vraies rues portent le décor.
 * HIÉRARCHIE ABSOLUE (doc territoires §9/§10) — « la route écrase tout » :
 *   1. ROUTE ÉPAISSE chartreuse (liseré sombre, flèches de direction,
 *      départ/arrivée) — polyligne ROUTÉE rue par rue (demo.ts) en source
 *      GeoJSON réelle ;
 *   2. position actuelle (point « moi » — halo type Uber, seul halo conservé) ;
 *   3. vraies tuiles (rues/parcs/eau réels) ;
 *   4. zones capturables : RUBAN NET (~2 zones de large) le long du tracé
 *      (allTerritories.ribbonRing — remplissage faible + trait fin, AUCUNE
 *      lueur, AUCUN hexagone) ;
 *   5. territoires en TRANSPARENCE (territoryStateLayers × MODE_EMPHASIS.route
 *      — MÊME builder que la Battle Map, une seule source, traits nets §4ter).
 * Le changement de route RECADRE la caméra (fitBounds de la polyligne — le
 * tap A/B/C recentre). Statique par ailleurs : lecture 1 seconde, plein
 * soleil. Offline : fallback RealMap (fond noir + message), jamais d'écran
 * blanc. UI pure — aucune règle de jeu.
 */
import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '@klaim/shared';
import {
  RealMap,
  type RealMapBounds,
  type RealMapGeoJSONLayer,
  type RealMapMarker,
  type RealMapRef,
} from '../../ui/game';
import {
  territoryStateLayers,
  territoryStyle as terr,
  withAlpha,
} from '../map/mapStyle';
import {
  EGO_REPUBLIQUE,
  REAL_M_PER_DEG_LAT,
  type LatLngPoint,
} from '../map/realAnchors';
import { MODE_EMPHASIS } from '../map/territory';
import type { PlannedRouteDemo } from './types';

// ─── Constantes de rendu (UI uniquement — pas des règles de jeu) ────────────

/** Marge de cadrage autour du tracé (px) — la route ne colle jamais au bord. */
const FIT_PADDING_PX = 34;

// Hiérarchie 1 : la route (plus épaisse que la Battle Map — route-first).
const ROUTE_WIDTH = 6;
const ROUTE_CASING_EXTRA = 3;
/** Une flèche de direction tous les N mètres du tracé. */
const ARROW_SPACING_M = 360;
/** Première flèche décalée du départ (le marker départ occupe la place). */
const ARROW_FIRST_OFFSET_M = 200;
/** Marker départ/arrivée. */
const START_DOT_SIZE = 12;
const END_DOT_SIZE = 9;
/** Boucle si départ et arrivée à moins de N mètres. */
const LOOP_CLOSE_EPSILON_M = 26;

// Hiérarchie 2 : position actuelle (« moi »).
const EGO_DOT_SIZE = 10;
const EGO_HALO_SIZE = 22;

type PlannerCollection = RealMapGeoJSONLayer['data'];

/** Polyline lat/lng → FeatureCollection LineString. */
function lineCollection(points: readonly LatLngPoint[]): PlannerCollection {
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

/** Bounds de cadrage de la proposition (fitBounds — le tap A/B/C recentre). */
function routeBounds(line: readonly LatLngPoint[]): RealMapBounds {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const p of line) {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
  }
  return { sw: [minLng, minLat], ne: [maxLng, maxLat], paddingPx: FIT_PADDING_PX };
}

/** Distance locale (m) entre deux points (équirectangulaire — échelle quartier). */
function localDistanceM(a: LatLngPoint, b: LatLngPoint): number {
  const mPerDegLng = REAL_M_PER_DEG_LAT * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot((b.lng - a.lng) * mPerDegLng, (b.lat - a.lat) * REAL_M_PER_DEG_LAT);
}

/**
 * Flèches de direction le long du tracé : une tous les ARROW_SPACING_M, cap
 * du segment courant (angle ÉCRAN : x = est, y = sud — la carte est nord-haut).
 */
function directionArrows(
  line: readonly LatLngPoint[],
): { lat: number; lng: number; deg: number }[] {
  const out: { lat: number; lng: number; deg: number }[] = [];
  let total = 0;
  const cum: number[] = [0];
  for (let i = 1; i < line.length; i += 1) {
    const a = line[i - 1];
    const b = line[i];
    total += a && b ? localDistanceM(a, b) : 0;
    cum.push(total);
  }
  for (let len = ARROW_FIRST_OFFSET_M; len < total - ARROW_FIRST_OFFSET_M; len += ARROW_SPACING_M) {
    for (let i = 1; i < line.length; i += 1) {
      const end = cum[i] ?? 0;
      if (end < len) continue;
      const start = cum[i - 1] ?? 0;
      const a = line[i - 1];
      const b = line[i];
      if (!a || !b) break;
      const t = end === start ? 0 : (len - start) / (end - start);
      const mPerDegLng = REAL_M_PER_DEG_LAT * Math.cos((a.lat * Math.PI) / 180);
      const dx = (b.lng - a.lng) * mPerDegLng;
      const dy = -(b.lat - a.lat) * REAL_M_PER_DEG_LAT;
      out.push({
        lat: a.lat + (b.lat - a.lat) * t,
        lng: a.lng + (b.lng - a.lng) * t,
        deg: (Math.atan2(dy, dx) * 180) / Math.PI,
      });
      break;
    }
  }
  return out;
}

export interface RoutePlannerMapProps {
  route: PlannedRouteDemo;
}

export function RoutePlannerMap({ route }: RoutePlannerMapProps) {
  const mapRef = useRef<RealMapRef>(null);
  /** Opacités du mode ROUTE : l'itinéraire domine, le reste en transparence. */
  const emph = MODE_EMPHASIS.route;

  /** Cadrage d'ouverture figé au montage (RealMap), puis fitBounds au tap. */
  const openBoundsRef = useRef<RealMapBounds>(routeBounds(route.line));
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    // Tap A/B/C : la caméra RECADRE la nouvelle proposition (fitBounds).
    mapRef.current?.fitBounds(routeBounds(route.line));
  }, [route.id, route.line]);

  // ── Couches : territoires transparents → ruban capturable → LA ROUTE ──────
  const layers = useMemo<RealMapGeoJSONLayer[]>(() => {
    const routeData = lineCollection(route.line);
    return [
      // 5. Territoires en transparence — MÊME builder §4ter que la Battle Map
      //    (traits nets, contesté double trait, decay pointillé — zéro glow).
      ...territoryStateLayers(emph),
      // 1. LA ROUTE : liseré sombre + trait épais chartreuse (route-first).
      //    AMENDEMENT-16 §0 (retour fondateur) : « juste le tracé » — plus de
      //    ruban de capture rempli sous la route ; la route dominante EST le
      //    tracé, elle se suffit.
      {
        id: 'planner-route-casing',
        data: routeData,
        lineColor: withAlpha(colors.noir, 0.6),
        lineWidth: ROUTE_WIDTH + ROUTE_CASING_EXTRA,
      },
      {
        id: 'planner-route',
        data: routeData,
        lineColor: terr.routeStroke,
        lineWidth: ROUTE_WIDTH,
      },
    ];
  }, [route.line, emph]);

  // ── Markers : flèches de direction, départ/arrivée, « moi » ───────────────
  const markers = useMemo<RealMapMarker[]>(() => {
    const out: RealMapMarker[] = [];
    directionArrows(route.line).forEach((a, k) => {
      out.push({
        id: `planner-arrow-${k}`,
        lng: a.lng,
        lat: a.lat,
        children: <DirectionChevron deg={a.deg} />,
      });
    });
    const first = route.line[0];
    const last = route.line[route.line.length - 1];
    const loop = first && last ? localDistanceM(first, last) < LOOP_CLOSE_EPSILON_M : false;
    if (last && !loop) {
      out.push({
        id: 'planner-end',
        lng: last.lng,
        lat: last.lat,
        children: <View style={styles.endDot} />,
      });
    }
    if (first) {
      out.push({
        id: 'planner-start',
        lng: first.lng,
        lat: first.lat,
        children: <StartMarker label={loop ? 'DÉPART · RETOUR' : 'DÉPART'} />,
      });
    }
    // 2. Position actuelle : « moi » = l'ego démo RÉEL (République).
    out.push({
      id: 'planner-ego',
      lng: EGO_REPUBLIQUE.lng,
      lat: EGO_REPUBLIQUE.lat,
      children: <EgoDot />,
    });
    return out;
  }, [route.line]);

  return (
    <View style={styles.map}>
      <RealMap
        ref={mapRef}
        bounds={openBoundsRef.current}
        geojsonLayers={layers}
        markers={markers}
        style={StyleSheet.absoluteFill}
        testID="route-planner-carte-reelle"
      />
    </View>
  );
}

// ─── Markers (contenu RN) ────────────────────────────────────────────────────

/** Chevron sombre SUR le trait chartreuse : sens de course. */
function DirectionChevron({ deg }: { deg: number }) {
  return (
    <View pointerEvents="none" style={{ transform: [{ rotate: `${deg}deg` }] }}>
      <Svg width={10} height={10} viewBox="-5 -5 10 10">
        <Path
          d="M-2.6 -3.2 L2.6 0 L-2.6 3.2"
          stroke={colors.noir}
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

/** Départ (= retour si boucle) : pastille chartreuse cerclée + label. */
function StartMarker({ label }: { label: string }) {
  return (
    <View pointerEvents="none" style={styles.startWrap}>
      <View style={styles.startDot} />
      <Text style={styles.startLabel}>{label}</Text>
    </View>
  );
}

/** Point « moi » : dot chartreuse cerclé + halo doux (type Uber — conservé). */
function EgoDot() {
  return (
    <View pointerEvents="none" style={styles.egoWrap}>
      <View style={styles.egoHalo} />
      <View style={styles.egoDot} />
    </View>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1, backgroundColor: colors.noir, overflow: 'hidden' },

  startWrap: { alignItems: 'center', gap: 4 },
  startDot: {
    width: START_DOT_SIZE,
    height: START_DOT_SIZE,
    borderRadius: START_DOT_SIZE / 2,
    backgroundColor: colors.chartreuse,
    borderWidth: 2,
    borderColor: colors.blanc,
  },
  startLabel: {
    color: colors.blanc,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  endDot: {
    width: END_DOT_SIZE,
    height: END_DOT_SIZE,
    borderRadius: END_DOT_SIZE / 2,
    backgroundColor: colors.blanc,
    borderWidth: 1.5,
    borderColor: colors.noir,
  },

  egoWrap: {
    width: EGO_HALO_SIZE,
    height: EGO_HALO_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  egoHalo: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: EGO_HALO_SIZE / 2,
    backgroundColor: colors.chartreuse14,
  },
  egoDot: {
    width: EGO_DOT_SIZE,
    height: EGO_DOT_SIZE,
    borderRadius: EGO_DOT_SIZE / 2,
    backgroundColor: colors.chartreuse,
    borderWidth: 1.5,
    borderColor: colors.blanc,
  },
});

export default RoutePlannerMap;
