/**
 * GRYD — Mini-carte AVANT/APRÈS d'une course de l'Historique (AMENDEMENT-17
 * CHANTIER 3, réutilise §4ter « la frontière EST le tracé »). AVANT = le TRAIT
 * (ruban net le long de la course) ; APRÈS = LA BOUCLE (polygone refermé
 * rempli faible) + la trace brillante par-dessus. Aucune cellule H3, aucun blob
 * lissé, aucun score de géométrie : traits nets uniquement. Rendu pur — les
 * chiffres viennent des stats déjà décidées serveur. Géométries d'authoring
 * réutilisées d'allTerritories/realAnchors (une seule source de surfaces).
 */
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Polyline } from 'react-native-svg';
import { colors, fontSizes } from '@klaim/shared';
import {
  CORRIDOR_HALF_WIDTH_M,
  loopRing,
  ribbonRing,
} from '../map/allTerritories';
import {
  REAL_M_PER_DEG_LAT,
  REAL_M_PER_DEG_LNG,
  type LatLngPoint,
} from '../map/realAnchors';
import { territoryStyle } from '../map/mapStyle';
import { Icon } from '../../ui/Icon';

const VB_MAX = 100;
const VB_PAD = 6;
const BORDER_W = 2;
const ROUTE_W = 2.2;

type Project = (lng: number, lat: number) => { x: number; y: number };

/** Projection à aspect conservé d'anneaux [lng,lat] vers une viewBox paddée. */
function fitProjection(
  rings: readonly (readonly [number, number][])[],
  vbMax: number,
  pad: number,
): { project: Project; vbW: number; vbH: number } {
  let minLng = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  for (const ring of rings) {
    for (const [lng, lat] of ring) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  }
  const spanX = Math.max(1, (maxLng - minLng) * REAL_M_PER_DEG_LNG);
  const spanY = Math.max(1, (maxLat - minLat) * REAL_M_PER_DEG_LAT);
  const k = (vbMax - pad * 2) / Math.max(spanX, spanY);
  return {
    vbW: spanX * k + pad * 2,
    vbH: spanY * k + pad * 2,
    project: (lng, lat) => ({
      x: pad + (lng - minLng) * REAL_M_PER_DEG_LNG * k,
      y: pad + (maxLat - lat) * REAL_M_PER_DEG_LAT * k,
    }),
  };
}

function ringPath(ring: readonly [number, number][], project: Project): string {
  let d = '';
  ring.forEach(([lng, lat], i) => {
    const { x, y } = project(lng, lat);
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
  });
  return `${d} Z`;
}

function tracePoints(trace: readonly LatLngPoint[], project: Project): string {
  return trace
    .map((p) => {
      const { x, y } = project(p.lng, p.lat);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

interface LoopGeometry {
  vbW: number;
  vbH: number;
  beforePath: string;
  afterPath: string;
  routePoints: string;
}

function buildLoopGeometry(trace: readonly LatLngPoint[]): LoopGeometry | null {
  if (trace.length < 3) return null;
  const corridorRing = ribbonRing(trace, CORRIDOR_HALF_WIDTH_M);
  const loopPolyRing = loopRing(trace);
  if (corridorRing.length === 0) return null;
  const { project, vbW, vbH } = fitProjection([corridorRing], VB_MAX, VB_PAD);
  return {
    vbW,
    vbH,
    beforePath: ringPath(corridorRing, project),
    afterPath: ringPath(loopPolyRing, project),
    routePoints: tracePoints(trace, project),
  };
}

/** Un côté (trait net + trace) — fill nonzero pour un ruban qui se recouvre. */
function MiniMap({ d, route, vbW, vbH }: { d: string; route?: string; vbW: number; vbH: number }) {
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${vbW.toFixed(0)} ${vbH.toFixed(0)}`}>
      <Path d={d} fill={colors.noir} />
      <Path
        d={d}
        fill={territoryStyle.crewFill}
        stroke={territoryStyle.crewStroke}
        strokeWidth={BORDER_W}
        strokeLinejoin="round"
      />
      {route ? (
        <Polyline
          points={route}
          fill="none"
          stroke={territoryStyle.routeStroke}
          strokeWidth={ROUTE_W}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
    </Svg>
  );
}

interface RunLoopMapProps {
  trace: readonly LatLngPoint[];
  /** Zones estimées du seul TRAIT (avant fermeture). */
  beforeZones: number;
  /** Zones estimées de la BOUCLE refermée (après). */
  afterZones: number;
}

/** AVANT/APRÈS : « le trait » → « la boucle », traits nets uniquement. */
export function RunLoopMap({ trace, beforeZones, afterZones }: RunLoopMapProps) {
  const geo = buildLoopGeometry(trace);
  if (!geo) return null;
  const aspect = geo.vbW / geo.vbH;
  return (
    <View style={styles.card}>
      <Text style={styles.title}>LA BOUCLE FAIT LA ZONE</Text>
      <View style={styles.row}>
        <View style={styles.side}>
          <View style={[styles.map, { aspectRatio: aspect }]}>
            <MiniMap d={geo.beforePath} route={geo.routePoints} vbW={geo.vbW} vbH={geo.vbH} />
          </View>
          <Text style={styles.sideLabel}>LE TRAIT</Text>
          <Text style={styles.pct}>+{beforeZones}</Text>
        </View>
        <Icon name="chevron" size={20} color={colors.gris} />
        <View style={styles.side}>
          <View style={[styles.map, { aspectRatio: aspect }]}>
            <MiniMap d={geo.afterPath} route={geo.routePoints} vbW={geo.vbW} vbH={geo.vbH} />
          </View>
          <Text style={styles.sideLabel}>LA BOUCLE</Text>
          <Text style={[styles.pct, styles.pctAfter]}>+{afterZones}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.carbone,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: 16,
    gap: 12,
  },
  title: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 2 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  side: { flex: 1, alignItems: 'center', gap: 6 },
  map: {
    width: '100%',
    maxWidth: 120,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.noir,
  },
  sideLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 1.5,
    fontWeight: '600',
  },
  pct: { color: colors.blanc, fontSize: fontSizes.lg, fontWeight: '700', fontVariant: ['tabular-nums'] },
  pctAfter: { color: colors.chartreuse },
});
