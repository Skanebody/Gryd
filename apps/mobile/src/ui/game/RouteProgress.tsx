/**
 * GRYD — RouteProgress : primitive SVG d'itinéraire type Uber (AMENDEMENT-09
 * §3 & §5). UNE polyline (coordonnées ÉCRAN en px, projetées par l'appelant) :
 * la route recommandée est tracée EN AVANCE en gris clair ; la portion
 * PARCOURUE se peint en chartreuse (la route « conquiert ») pilotée par
 * `progress` 0..1, animée en douceur à chaque changement (reduce motion →
 * saut direct). Une flèche de virage marque le prochain changement de
 * direction (checkpoint suivant). Consommée par la Battle Map (parcours
 * proposé, progress = 0) et la Course Live (navigation temps réel).
 * Couleurs : tokens uniquement — gris (à venir), chartreuse (parcouru = moi).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { colors, gameColors, motion } from '@klaim/shared';
import { useReduceMotion } from './anim';

export interface RoutePoint {
  x: number;
  y: number;
}

/** Épaisseur par défaut du trait de route. */
const DEFAULT_STROKE_WIDTH = 4;
/** Virage signalé à partir de ce changement de cap (degrés). */
const TURN_MIN_DEG = 25;
/** Rayon de la pastille de flèche de virage. */
const TURN_BADGE_RADIUS = 9;

export interface RouteProgressProps {
  /** Polyline de la route en coordonnées écran (px), ≥ 2 points. */
  points: readonly RoutePoint[];
  /** Portion parcourue 0..1 — chaque changement est animé (reduce motion → direct). */
  progress: number;
  /** Taille du canevas SVG (px) — l'écran le positionne (souvent en absolu). */
  width: number;
  height: number;
  strokeWidth?: number;
  /** Flèche au prochain virage (défaut true). */
  showTurnArrow?: boolean;
}

/** Longueurs cumulées le long de la polyline (cum[0] = 0). */
function cumulativeLengths(points: readonly RoutePoint[]): number[] {
  const cum: number[] = [0];
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const prev = cum[i - 1] ?? 0;
    cum.push(prev + (a && b ? Math.hypot(b.x - a.x, b.y - a.y) : 0));
  }
  return cum;
}

/** Point à `len` px du départ, par interpolation sur le segment courant. */
function pointAt(points: readonly RoutePoint[], cum: number[], len: number): RoutePoint {
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

/** `d` SVG de la portion parcourue (coupée à `len` px du départ). */
function traveledD(points: readonly RoutePoint[], cum: number[], len: number): string {
  if (len <= 0) return '';
  const first = points[0];
  if (!first) return '';
  let d = `M${first.x.toFixed(1)} ${first.y.toFixed(1)}`;
  for (let i = 1; i < points.length; i += 1) {
    const p = points[i];
    if (!p) break;
    if ((cum[i] ?? 0) <= len) {
      d += ` L${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    } else {
      const head = pointAt(points, cum, len);
      d += ` L${head.x.toFixed(1)} ${head.y.toFixed(1)}`;
      break;
    }
  }
  return d;
}

/** Prochain virage APRÈS la tête de progression : position + cap sortant. */
function nextTurn(
  points: readonly RoutePoint[],
  cum: number[],
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

export function RouteProgress({
  points,
  progress,
  width,
  height,
  strokeWidth = DEFAULT_STROKE_WIDTH,
  showTurnArrow = true,
}: RouteProgressProps) {
  const reduce = useReduceMotion();
  // Progression AFFICHÉE : suit `progress` en douceur (listener JS → state,
  // même mécanique que useCountUp — pilote une géométrie, pas un style natif).
  const [shown, setShown] = useState(reduce ? progress : 0);
  const anim = useRef(new Animated.Value(reduce ? progress : 0)).current;
  useEffect(() => {
    if (reduce) {
      anim.stopAnimation();
      setShown(progress);
      return;
    }
    const id = anim.addListener(({ value }) => setShown(value));
    Animated.timing(anim, {
      toValue: progress,
      duration: motion.transitionMs,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
    return () => {
      anim.removeListener(id);
      anim.stopAnimation();
    };
  }, [progress, reduce, anim]);

  const cum = useMemo(() => cumulativeLengths(points), [points]);
  const total = cum[cum.length - 1] ?? 0;
  const fullD = useMemo(() => {
    const first = points[0];
    if (!first) return '';
    return points
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ');
  }, [points]);

  if (points.length < 2 || total <= 0) return null;

  const len = Math.min(Math.max(shown, 0), 1) * total;
  const doneD = traveledD(points, cum, len);
  const head = len > 0 ? pointAt(points, cum, len) : null;
  const end = points[points.length - 1];
  const turn = showTurnArrow ? nextTurn(points, cum, len) : null;

  return (
    <Svg width={width} height={height} pointerEvents="none">
      {/* Liseré sombre sous la route : lisible par-dessus hexes et îlots. */}
      <Path
        d={fullD}
        stroke={colors.noir}
        opacity={0.5}
        strokeWidth={strokeWidth + 3}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Route recommandée, tracée EN AVANCE (gris clair). */}
      <Path
        d={fullD}
        stroke={colors.gris}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Portion PARCOURUE : la route se peint en chartreuse. */}
      {doneD ? (
        <Path
          d={doneD}
          stroke={colors.chartreuse}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
      {/* Point d'arrivée (repère discret) + tête de progression. */}
      {end ? <Circle cx={end.x} cy={end.y} r={3} fill={colors.blanc} opacity={0.8} /> : null}
      {head ? <Circle cx={head.x} cy={head.y} r={3.5} fill={colors.chartreuse} /> : null}
      {/* Flèche de virage au checkpoint suivant (cap sortant). */}
      {turn ? (
        <G transform={`translate(${turn.x.toFixed(1)} ${turn.y.toFixed(1)}) rotate(${turn.headingDeg.toFixed(1)})`}>
          <Circle
            r={TURN_BADGE_RADIUS}
            fill={gameColors.carbon}
            stroke={colors.grisLigne}
            strokeWidth={1}
          />
          <Path
            d="M-3.5 -4.5 L3 0 L-3.5 4.5"
            stroke={colors.blanc}
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </G>
      ) : null}
    </Svg>
  );
}
