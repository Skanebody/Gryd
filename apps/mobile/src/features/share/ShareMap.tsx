/**
 * GRYD — ShareMap : mini-carte SVG PROPRE pour les cards de partage
 * (AMENDEMENT-20 §3). « Fond carte sombre, trace chartreuse, zone capturée en
 * glow. » Rendu pur, silencieux : la BOUCLE ROUTÉE est la frontière (traits
 * nets §4ter), le remplissage de la zone gagnée pulse en glow chartreuse, la
 * trace brille par-dessus. Aucune cellule H3, aucun label — juste la conquête.
 *
 * Deux modes :
 *  - `loop`    : polygone de la boucle rempli + trace (Carte simple / Conquête /
 *                Boucle / Crew).
 *  - `defense` : frontière rivale (orange net) tenue derrière la boucle crew
 *                (Défense — « la ligne que tu as gardée »).
 */
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Path, Polyline } from 'react-native-svg';
import { colors, gameColors } from '@klaim/shared';
import {
  CORRIDOR_HALF_WIDTH_M,
  loopRing,
  ribbonRing,
} from '../map/allTerritories';
import {
  BOUCLE_REPUBLIQUE,
  REAL_M_PER_DEG_LAT,
  REAL_M_PER_DEG_LNG,
  RUE_FAUBOURG_DU_TEMPLE,
  type LatLngPoint,
} from '../map/realAnchors';
import { territoryStyle } from '../map/mapStyle';

const VB = 100;
const PAD = 12;
const ROUTE_W = 2.4;
const RIVAL_W = 2.2;

type Project = (lng: number, lat: number) => { x: number; y: number };

/** Cadrage à aspect conservé d'un ensemble d'anneaux vers une viewBox carrée. */
function fit(
  rings: readonly (readonly [number, number][])[],
): { project: Project; vbW: number; vbH: number } {
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
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
  const k = (VB - PAD * 2) / Math.max(spanX, spanY);
  return {
    vbW: spanX * k + PAD * 2,
    vbH: spanY * k + PAD * 2,
    project: (lng, lat) => ({
      x: PAD + (lng - minLng) * REAL_M_PER_DEG_LNG * k,
      y: PAD + (maxLat - lat) * REAL_M_PER_DEG_LAT * k,
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

export type ShareMapMode = 'loop' | 'defense';

export interface ShareMapProps {
  mode?: ShareMapMode;
  /** Teinte de la zone/trace (défaut chartreuse). Toujours un token. */
  accent?: string;
  style?: ViewStyle;
}

/**
 * Rendu carte partage. Géométrie déterministe (démo République) — en prod la
 * boucle vient du run. Aspect carré : la card gère la taille via `style`.
 */
export function ShareMap({ mode = 'loop', accent = colors.chartreuse, style }: ShareMapProps) {
  const loop = loopRing(BOUCLE_REPUBLIQUE);
  const rival = ribbonRing(RUE_FAUBOURG_DU_TEMPLE, CORRIDOR_HALF_WIDTH_M);
  const { project } = fit(mode === 'defense' ? [loop, rival] : [loop]);
  const loopPath = ringPath(loop, project);
  const rivalPath = ringPath(rival, project);
  const route = tracePoints(
    [...BOUCLE_REPUBLIQUE, BOUCLE_REPUBLIQUE[0] ?? { lat: 0, lng: 0 }],
    project,
  );
  return (
    <View style={[styles.wrap, style]}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${VB} ${VB}`}>
        {/* Frontière rivale tenue (mode défense) — orange net dessous. */}
        {mode === 'defense' ? (
          <Path
            d={rivalPath}
            fill={territoryStyle.rivalFill}
            stroke={territoryStyle.rivalStroke}
            strokeWidth={RIVAL_W}
            strokeLinejoin="round"
          />
        ) : null}

        {/* Glow de la zone capturée : couche large et translucide sous le fill. */}
        <Path d={loopPath} fill={accent} opacity={0.14} />
        <Path
          d={loopPath}
          fill="none"
          stroke={accent}
          strokeWidth={5}
          strokeLinejoin="round"
          opacity={0.18}
        />

        {/* Zone remplie nette (le tracé EST la frontière). */}
        <Path
          d={loopPath}
          fill={territoryStyle.crewFill}
          stroke={accent}
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* Trace brillante par-dessus (la boucle du coureur). */}
        <Polyline
          points={route}
          fill="none"
          stroke={accent}
          strokeWidth={ROUTE_W}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Polyline
          points={route}
          fill="none"
          stroke={colors.blanc}
          strokeWidth={0.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.75}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    aspectRatio: 1,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: gameColors.carbon,
    borderWidth: 1,
    borderColor: colors.grisLigne,
  },
});
