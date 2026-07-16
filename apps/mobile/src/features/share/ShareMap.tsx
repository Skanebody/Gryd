/**
 * GRYD — ShareMap : mini-carte SVG pour les cards de partage (AMENDEMENT-20 §3
 * + doc « partage social viral »). « Fond carte sombre, trace chartreuse, zone
 * capturée en glow. » La géométrie est un VRAI tracé de rues (BOUCLE_REPUBLIQUE,
 * realAnchors : av. Parmentier → rue Saint-Ambroise → bd Voltaire, coins réels) —
 * jamais une ellipse. Aucune cellule H3, aucun label — juste la conquête.
 *
 * ANIMÉ (`animated`) : la trace SE DESSINE (sous-polyligne par progression —
 * fiable sur natif ET react-native-web, contrairement à strokeDashoffset), puis
 * la zone SE REMPLIT et le point de départ pulse. `replayKey` rejoue l'animation
 * (bouton Replay du partage). Reduce motion → état final direct, jamais une
 * info portée par l'animation seule. Piloté par Animated + listener → state
 * (même pattern éprouvé que l'onboarding CaptureStep).
 *
 * Deux modes :
 *  - `loop`    : polygone de la boucle rempli + trace (Carte simple / Conquête /
 *                Boucle / Crew).
 *  - `defense` : frontière rivale (orange net) tenue derrière la boucle crew
 *                (Défense — « la ligne que tu as gardée »).
 */
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Path, Polyline } from 'react-native-svg';
import { colors } from '@klaim/shared';
import { useReduceMotion } from '../../ui/game';
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
  /**
   * Trace du coureur à dessiner (défaut : boucle République fermée). Le partage
   * passe une trace DÉJÀ passée par applySharePrivacy (départ/arrivée retirés) —
   * la zone conquise, elle, reste entière : c'est le territoire public, pas la
   * position du coureur.
   */
  trace?: readonly LatLngPoint[];
  /** Anime le dessin de la trace puis le remplissage de la zone. */
  animated?: boolean;
  /** Incrémenter pour REJOUER l'animation (bouton Replay du partage). */
  replayKey?: number;
  /** Fin d'animation (le Replay sait quand il est terminé). */
  onAnimationEnd?: () => void;
  /**
   * `false` = zone NON capturée (état « avant » du before/after) : le tracé
   * reste visible mais la zone ne se remplit jamais en chartreuse. Défaut `true`.
   */
  captured?: boolean;
}

/** Durée totale du replay : dessin de trace puis remplissage. */
const REPLAY_DURATION_MS = 2400;
/** Part de l'animation consacrée au dessin de la trace (le reste = fill). */
const TRACE_PHASE = 0.72;

/**
 * Rendu carte partage. Géométrie déterministe (démo République) — en prod la
 * boucle vient du run. Aspect carré : la card gère la taille via `style`.
 */
export function ShareMap({
  mode = 'loop',
  accent = colors.chartreuse,
  style,
  trace,
  animated = false,
  replayKey = 0,
  onAnimationEnd,
  captured = true,
}: ShareMapProps) {
  const reduce = useReduceMotion();
  const play = animated && !reduce;

  // 0→1 : dessin de la trace (0→TRACE_PHASE) puis remplissage (→1). Pattern
  // Animated + listener → state (CaptureStep) : fiable natif ET RN-web.
  const anim = useRef(new Animated.Value(play ? 0 : 1)).current;
  const [progress, setProgress] = useState(play ? 0 : 1);

  useEffect(() => {
    if (!play) {
      setProgress(1);
      return;
    }
    const id = anim.addListener(({ value }) => setProgress(value));
    anim.setValue(0);
    setProgress(0);
    const run = Animated.timing(anim, {
      toValue: 1,
      duration: REPLAY_DURATION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    run.start(({ finished }) => {
      if (finished) onAnimationEnd?.();
    });
    return () => {
      anim.removeListener(id);
      run.stop();
    };
    // replayKey : chaque incrément rejoue l'animation depuis zéro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play, replayKey]);

  // P1 C9 (MVP_CHANGESET) — le cadrage suit la VRAIE trace quand elle existe :
  // fit() ne recevait que la boucle démo République, donc une course ailleurs
  // sortait de la viewBox. Et la ZONE dessinée est la boucle réellement courue
  // (« la boucle fait la zone ») — plus jamais la forme démo sous un vrai run.
  // Le couloir rival est une géométrie DÉMO : jamais dessiné sous une vraie trace.
  const hasRealTrace = trace !== undefined && trace.length >= 3;
  const loop = hasRealTrace ? loopRing(trace) : loopRing(BOUCLE_REPUBLIQUE);
  const rival = ribbonRing(RUE_FAUBOURG_DU_TEMPLE, CORRIDOR_HALF_WIDTH_M);
  const showRival = mode === 'defense' && !hasRealTrace;
  const { project } = fit(showRival ? [loop, rival] : [loop]);
  const loopPath = ringPath(loop, project);
  const rivalPath = showRival ? ringPath(rival, project) : '';

  // Trace du run : par défaut la boucle fermée ; une trace fournie (privacy)
  // reste OUVERTE — le trou départ/arrivée EST le masquage, on ne le referme pas.
  const runTrace: readonly LatLngPoint[] = trace ?? [
    ...BOUCLE_REPUBLIQUE,
    BOUCLE_REPUBLIQUE[0] ?? { lat: 0, lng: 0 },
  ];

  // Dessin progressif : sous-polyligne (slice) selon la phase trace.
  const traceP = Math.min(1, progress / TRACE_PHASE);
  // Zone : ne se remplit QUE si capturée (l'« avant » du before/after = 0).
  const fillP = captured ? Math.max(0, (progress - TRACE_PHASE) / (1 - TRACE_PHASE)) : 0;
  const visibleCount = Math.max(2, Math.ceil(traceP * runTrace.length));
  const visibleTrace = runTrace.slice(0, visibleCount);
  const route = tracePoints(visibleTrace, project);
  const head = visibleTrace[visibleTrace.length - 1];
  const headPt = head ? project(head.lng, head.lat) : null;
  const start = runTrace[0];
  const startPt = start ? project(start.lng, start.lat) : null;

  return (
    <View style={[styles.wrap, style]}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${VB} ${VB}`}>
        {/* Frontière rivale tenue (mode défense, géométrie démo) — jamais sous une vraie trace. */}
        {mode === 'defense' && rivalPath ? (
          <Path
            d={rivalPath}
            fill={territoryStyle.rivalFill}
            stroke={territoryStyle.rivalStroke}
            strokeWidth={RIVAL_W}
            strokeLinejoin="round"
          />
        ) : null}

        {/* Glow de la zone capturée : monte avec la phase de remplissage. */}
        <Path d={loopPath} fill={accent} opacity={0.14 * fillP} />
        <Path
          d={loopPath}
          fill="none"
          stroke={accent}
          strokeWidth={5}
          strokeLinejoin="round"
          opacity={0.18 * fillP}
        />

        {/* Zone : contour discret pendant le dessin, remplissage à la capture. */}
        <Path
          d={loopPath}
          fill={territoryStyle.crewFill}
          fillOpacity={fillP}
          stroke={accent}
          strokeWidth={fillP > 0 ? 2 : 0.6}
          strokeOpacity={fillP > 0 ? 1 : 0.35}
          strokeLinejoin="round"
        />

        {/* Trace brillante par-dessus — SE DESSINE point par point (vraies rues). */}
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

        {/* Point de départ + tête de course pendant le dessin. */}
        {startPt ? <Circle cx={startPt.x} cy={startPt.y} r={2.2} fill={colors.blanc} /> : null}
        {headPt && traceP < 1 ? (
          <>
            <Circle cx={headPt.x} cy={headPt.y} r={3.6} fill={accent} opacity={0.35} />
            <Circle cx={headPt.x} cy={headPt.y} r={1.8} fill={accent} />
          </>
        ) : null}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  // AMENDEMENT-22 : PAS de double container. La zone dessinée flotte sur le fond
  // sombre de la card (elle-même l'unique surface) — ni cadre, ni mini-carré. Le
  // trace/glow clippe proprement (overflow) sans frontière visible.
  wrap: {
    aspectRatio: 1,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
});
