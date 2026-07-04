/**
 * GRYD — carte du ROUTE PLANNER (AMENDEMENT-10 §2, AMENDEMENT-11 §3 — régime
 * USAGE RÉEL : contraste max, zéro glass, zéro décor). HIÉRARCHIE ABSOLUE
 * (doc territoires §9/§10) — « la route écrase tout le reste » :
 *   1. ROUTE ÉPAISSE chartreuse (liseré sombre, flèches de direction,
 *      départ/arrivée) ;
 *   2. position actuelle (point « moi ») ;
 *   3. rues / chemins / parcs (basemap quartier Uber-night) ;
 *   4. zones capturables LÉGÈREMENT LUMINEUSES — bande organique lissée par
 *      territory.ts le long du tracé (AUCUN hexagone, moteur H3 invisible) ;
 *   5. territoires colorés en TRANSPARENCE (opacités MODE_EMPHASIS.route) ;
 *   6. frontières secondaires (traits fins, jamais dominants).
 * Rendu SVG pur (react-native-svg — web ET natif), échelle ajustée pour cadrer
 * la proposition entière (plancher = échelle coureur gelée ~4,33 m/px).
 * Statique et déterministe : aucune animation (lecture 1 seconde, plein
 * soleil) — le changement de route re-projette simplement la scène.
 */
import { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';
import { colors } from '@klaim/shared';
import {
  BLOCKS,
  CANAL,
  CANAL_BANK_WIDTH_M,
  CANAL_WIDTH_M,
  BASEMAP_CENTER,
  MAIN_AXES,
  MINOR_AXES,
  M_PER_DEG_LAT,
  M_PER_DEG_LNG,
  PARKS,
  SECTOR_LABELS,
  STREET_MAJOR_WIDTH_M,
  STREET_MINOR_WIDTH_M,
  type LatLngPoint,
} from '../map/basemap';
import { battleMapStyle as ms, territoryStyle as terr } from '../map/mapStyle';
import {
  MODE_EMPHASIS,
  battleTerritories,
  cellsToTerritory,
  territoryPath,
  type TerritoryState,
} from '../map/territory';
import { capturableCellsFor } from './demo';
import type { PlannedRouteDemo } from './types';

// ─── Échelle (AMENDEMENT-08 §4 gelée : ~130 m ≈ 30 px → ~4,33 m/px) ─────────
const ZONE_DIAMETER_M = 130;
const ZONE_TARGET_PX = 30;
const BASE_METERS_PER_PIXEL = ZONE_DIAMETER_M / ZONE_TARGET_PX;
/** Marge de cadrage autour du tracé (px) — la route ne colle jamais au bord. */
const FIT_PADDING_PX = 34;
/** Culling des îlots : marge = plus grand îlot (~150 m). */
const BLOCK_CULL_MARGIN_M = 150;

// ─── Hiérarchie 1 : la route (plus épaisse que la Battle Map — route-first) ──
const ROUTE_WIDTH = 6;
const ROUTE_CASING_EXTRA = 3;
/** Une flèche de direction tous les N px du tracé. */
const ARROW_SPACING_PX = 84;
/** Première flèche décalée du départ (le marker départ occupe la place). */
const ARROW_FIRST_OFFSET_PX = 46;
/** Marker départ/arrivée. */
const START_DOT_R = 6;
const END_DOT_R = 4.5;

// ─── Hiérarchie 2 : position actuelle ───────────────────────────────────────
const EGO_DOT_R = 5;
const EGO_HALO_R = 11;

// ─── Hiérarchies 4-6 : zones capturables + territoires en transparence ──────
/** Lueur douce de la bande capturable (LÉGÈREMENT lumineuse, pas de bord dur). */
const CAPTURABLE_SOFT_WIDTH = 6;
/** Frontières SECONDAIRES : plus fines que sur la Battle Map (route-first). */
const SECONDARY_BORDER_WIDTH = 1.2;
const SECONDARY_RIVAL_WIDTH = 1.6;
const SECONDARY_DECAY_DASH = '5 5';

// ─── Voirie (mêmes conversions que la Battle Map, à l'échelle de la scène) ──

interface XY {
  x: number;
  y: number;
}

interface PlannerScene {
  /** Mètres par pixel de la scène (cadrage de la route). */
  mpp: number;
  blocksD: string;
  minorAxesD: string[];
  axesCasingPx: number;
  axesPx: number;
  axesD: string[];
  canalD: string;
  canalPx: number;
  canalBankPx: number;
  parksD: string[];
  labels: { name: string; x: number; y: number }[];
  /** Territoires organiques par état (transparence — '' si absent). */
  terri: Record<TerritoryState, string>;
  /** Bande organique des zones capturables le long du tracé. */
  capturableD: string;
  routeD: string;
  arrows: { x: number; y: number; deg: number }[];
  start: XY;
  end: XY;
  loop: boolean;
  ego: XY;
}

/** Longueurs cumulées d'une polyline écran. */
function cumulative(points: readonly XY[]): number[] {
  const cum: number[] = [0];
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    cum.push((cum[i - 1] ?? 0) + (a && b ? Math.hypot(b.x - a.x, b.y - a.y) : 0));
  }
  return cum;
}

/** Point + cap (degrés) à `len` px du départ le long de la polyline. */
function pointHeadingAt(
  points: readonly XY[],
  cum: number[],
  len: number,
): { x: number; y: number; deg: number } | null {
  for (let i = 1; i < points.length; i += 1) {
    const end = cum[i] ?? 0;
    if (end < len) continue;
    const start = cum[i - 1] ?? 0;
    const a = points[i - 1];
    const b = points[i];
    if (!a || !b) return null;
    const t = end === start ? 0 : (len - start) / (end - start);
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      deg: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
    };
  }
  return null;
}

/** Projette basemap + territoires + route dans un canevas width×height. */
function buildScene(route: PlannedRouteDemo, width: number, height: number): PlannerScene {
  // Cadrage : bbox du tracé, échelle plancher = échelle coureur gelée.
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const p of route.line) {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
  }
  const centre: LatLngPoint = { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 };
  const spanXm = (maxLng - minLng) * M_PER_DEG_LNG;
  const spanYm = (maxLat - minLat) * M_PER_DEG_LAT;
  const fitW = Math.max(1, width - FIT_PADDING_PX * 2);
  const fitH = Math.max(1, height - FIT_PADDING_PX * 2);
  const mpp = Math.max(BASE_METERS_PER_PIXEL, spanXm / fitW, spanYm / fitH);

  const toXY = (lng: number, lat: number): XY => ({
    x: width / 2 + ((lng - centre.lng) * M_PER_DEG_LNG) / mpp,
    y: height / 2 - ((lat - centre.lat) * M_PER_DEG_LAT) / mpp,
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

  // Hiérarchie 3 : îlots (culling large) + voirie + canal + parcs.
  const cullPx = BLOCK_CULL_MARGIN_M / mpp;
  const blockVisible = (ring: readonly LatLngPoint[]): boolean =>
    ring.some((p) => {
      const { x, y } = pointXY(p);
      return x >= -cullPx && x <= width + cullPx && y >= -cullPx && y <= height + cullPx;
    });
  const blocksD = BLOCKS.filter(blockVisible)
    .map((ring) => lineD(ring, true))
    .join(' ');

  // Hiérarchie 5 : territoires organiques en transparence (jamais d'hexagone).
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
  for (const territory of battleTerritories()) {
    terri[territory.state] = territoryPath(territory, toXY);
  }

  // Hiérarchie 4 : bande organique des zones capturables du tracé.
  const capturable = cellsToTerritory(capturableCellsFor(route), 'objective');
  const capturableD = capturable ? territoryPath(capturable, toXY) : '';

  // Hiérarchie 1 : la route + flèches de direction + départ/arrivée.
  const routePts = route.line.map(pointXY);
  const cum = cumulative(routePts);
  const total = cum[cum.length - 1] ?? 0;
  const arrows: { x: number; y: number; deg: number }[] = [];
  for (let len = ARROW_FIRST_OFFSET_PX; len < total - ARROW_FIRST_OFFSET_PX; len += ARROW_SPACING_PX) {
    const a = pointHeadingAt(routePts, cum, len);
    if (a) arrows.push(a);
  }
  const first = routePts[0] ?? { x: width / 2, y: height / 2 };
  const last = routePts[routePts.length - 1] ?? first;
  const loop = Math.hypot(last.x - first.x, last.y - first.y) < START_DOT_R;

  return {
    mpp,
    blocksD,
    minorAxesD: MINOR_AXES.map((street) => lineD(street)),
    axesCasingPx: STREET_MAJOR_WIDTH_M / mpp + 2,
    axesPx: STREET_MAJOR_WIDTH_M / mpp,
    axesD: MAIN_AXES.map((axis) => lineD(axis)),
    canalD: lineD(CANAL),
    canalPx: CANAL_WIDTH_M / mpp,
    canalBankPx: CANAL_BANK_WIDTH_M / mpp,
    parksD: PARKS.map((ring) => lineD(ring, true)),
    labels: SECTOR_LABELS.map((s) => ({ name: s.name, ...toXY(s.lng, s.lat) })),
    terri,
    capturableD,
    routeD: routePts
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' '),
    arrows,
    start: first,
    end: last,
    loop,
    ego: toXY(BASEMAP_CENTER.lng, BASEMAP_CENTER.lat),
  };
}

export interface RoutePlannerMapProps {
  route: PlannedRouteDemo;
}

export function RoutePlannerMap({ route }: RoutePlannerMapProps) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) =>
      prev && prev.w === width && prev.h === height ? prev : { w: width, h: height },
    );
  };

  const scene = useMemo(
    () => (size ? buildScene(route, size.w, size.h) : null),
    [route, size],
  );
  /** Opacités du mode ROUTE : l'itinéraire domine, le reste en transparence. */
  const emph = MODE_EMPHASIS.route;
  const minorPx = scene ? STREET_MINOR_WIDTH_M / scene.mpp : 0;

  return (
    <View style={styles.map} onLayout={onLayout}>
      {size && scene ? (
        <Svg width={size.w} height={size.h}>
          {/* ── 3. Plan de quartier : îlots pleins, rues, canal, parcs ── */}
          <Path
            d={scene.blocksD}
            fill={ms.block}
            stroke={ms.blockEdge}
            strokeWidth={1}
            strokeLinejoin="round"
          />
          {scene.minorAxesD.map((d, i) => (
            <Path key={`minor-${i}`} d={d} stroke={ms.streetCasing} strokeWidth={minorPx} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {scene.axesD.map((d, i) => (
            <Path key={`axis-casing-${i}`} d={d} stroke={ms.streetCasing} strokeWidth={scene.axesCasingPx} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {scene.axesD.map((d, i) => (
            <Path key={`axis-${i}`} d={d} stroke={ms.streetMajor} strokeWidth={scene.axesPx} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          ))}
          <Path d={scene.canalD} stroke={ms.streetCasing} strokeWidth={scene.canalBankPx} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <Path d={scene.canalD} stroke={ms.water} strokeWidth={scene.canalPx} fill="none" strokeLinecap="round" strokeLinejoin="round" />
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
              opacity={0.5}
              fontSize={10}
              fontWeight="600"
              letterSpacing={2}
              textAnchor="middle"
            >
              {l.name}
            </SvgText>
          ))}

          {/* ── 5-6. Territoires en TRANSPARENCE + frontières secondaires ── */}
          <Path
            d={scene.terri.rival}
            fill={terr.rivalFill}
            fillRule="evenodd"
            stroke={terr.rivalStroke}
            strokeWidth={SECONDARY_RIVAL_WIDTH}
            strokeLinejoin="round"
            opacity={emph.rival}
          />
          <Path
            d={scene.terri.crew}
            fill={terr.crewFill}
            fillRule="evenodd"
            stroke={terr.crewStroke}
            strokeWidth={SECONDARY_BORDER_WIDTH}
            strokeLinejoin="round"
            opacity={emph.crew}
          />
          <Path
            d={scene.terri.outpost}
            fill={terr.outpostFill}
            fillRule="evenodd"
            stroke={terr.outpostStroke}
            strokeWidth={SECONDARY_BORDER_WIDTH}
            strokeLinejoin="round"
            opacity={emph.crew}
          />
          <Path
            d={scene.terri.decay}
            fill="none"
            stroke={terr.decayStroke}
            strokeWidth={SECONDARY_BORDER_WIDTH}
            strokeDasharray={SECONDARY_DECAY_DASH}
            strokeLinejoin="round"
            opacity={emph.defense}
          />
          <Path
            d={scene.terri.decayUrgent}
            fill={terr.decayUrgentFill}
            fillRule="evenodd"
            stroke={terr.decayUrgentStroke}
            strokeWidth={SECONDARY_BORDER_WIDTH}
            strokeDasharray={SECONDARY_DECAY_DASH}
            strokeLinejoin="round"
            opacity={emph.defense}
          />
          {/* Contesté : double contour statique atténué (pas de pulse ici). */}
          <Path
            d={scene.terri.contested}
            fill={terr.contestedFill}
            fillRule="evenodd"
            stroke={terr.contestedInnerStroke}
            strokeWidth={SECONDARY_BORDER_WIDTH}
            strokeLinejoin="round"
            opacity={emph.contested}
          />
          <Path
            d={scene.terri.contested}
            fill="none"
            stroke={terr.contestedOuterStroke}
            strokeWidth={SECONDARY_BORDER_WIDTH + 1}
            strokeLinejoin="round"
            opacity={emph.contested * 0.6}
          />

          {/* ── 4. Zones capturables : bande organique légèrement lumineuse ── */}
          {scene.capturableD ? (
            <>
              <Path
                d={scene.capturableD}
                fill="none"
                stroke={terr.objectiveSoft}
                strokeWidth={CAPTURABLE_SOFT_WIDTH}
                strokeLinejoin="round"
                opacity={emph.objective}
              />
              <Path
                d={scene.capturableD}
                fill={terr.objectiveFill}
                fillRule="evenodd"
                opacity={emph.objective}
              />
            </>
          ) : null}

          {/* ── 1. LA ROUTE : liseré sombre + trait épais + flèches ── */}
          <Path
            d={scene.routeD}
            stroke={colors.noir}
            opacity={0.6}
            strokeWidth={ROUTE_WIDTH + ROUTE_CASING_EXTRA}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d={scene.routeD}
            stroke={terr.routeStroke}
            strokeWidth={ROUTE_WIDTH}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {scene.arrows.map((a, i) => (
            <G
              key={`arrow-${i}`}
              transform={`translate(${a.x.toFixed(1)} ${a.y.toFixed(1)}) rotate(${a.deg.toFixed(1)})`}
            >
              {/* Chevron sombre SUR le trait chartreuse : sens de course. */}
              <Path
                d="M-2.6 -3.2 L2.6 0 L-2.6 3.2"
                stroke={colors.noir}
                strokeWidth={2}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </G>
          ))}

          {/* Arrivée (aller simple uniquement — sinon le départ dit tout). */}
          {!scene.loop ? (
            <Circle
              cx={scene.end.x}
              cy={scene.end.y}
              r={END_DOT_R}
              fill={colors.blanc}
              stroke={colors.noir}
              strokeWidth={1.5}
            />
          ) : null}

          {/* Départ (= retour si boucle) : pastille chartreuse cerclée. */}
          <Circle
            cx={scene.start.x}
            cy={scene.start.y}
            r={START_DOT_R}
            fill={colors.chartreuse}
            stroke={colors.blanc}
            strokeWidth={2}
          />
          <SvgText
            x={scene.start.x}
            y={scene.start.y + START_DOT_R + 12}
            fill={colors.blanc}
            fontSize={9}
            fontWeight="700"
            letterSpacing={1.2}
            textAnchor="middle"
          >
            {scene.loop ? 'DÉPART · RETOUR' : 'DÉPART'}
          </SvgText>

          {/* ── 2. Position actuelle : point « moi » (statique, sans bruit) ── */}
          <Circle cx={scene.ego.x} cy={scene.ego.y} r={EGO_HALO_R} fill={colors.chartreuse14} />
          <Circle
            cx={scene.ego.x}
            cy={scene.ego.y}
            r={EGO_DOT_R}
            fill={colors.chartreuse}
            stroke={colors.blanc}
            strokeWidth={1.5}
          />
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1, backgroundColor: colors.noir, overflow: 'hidden' },
});

export default RoutePlannerMap;
