/**
 * GRYD — TRACÉ DU RÉSULTAT (§25, pic peak-end). Le VRAI parcours couru se
 * DESSINE à l'ouverture de l'écran de résultat, la « plume » avançant jusqu'au
 * point d'arrivée — qui, sur une boucle fermée, revient sur le départ : la
 * fermeture se VOIT. Le composant est monté DANS le hero (`ResultReveal
 * haptic="success"`), donc le dessin démarre exactement à l'instant du retour
 * haptique de validation — on renforce le pic, on ne s'y substitue pas.
 *
 * Rendu SVG (react-native-svg) → visible en preview web ET natif. Le dessin
 * progressif réutilise `tracePrefix` (features/map/projectTrace), sous-polyligne
 * fiable natif + react-native-web (contrairement à strokeDashoffset). Piloté par
 * une Animated.Value à listener JS (même patron que `useCountUp`) : reduce motion
 * → tracé complet d'emblée, aucun mouvement.
 *
 * HONNÊTE : ne rend RIEN sous 2 points (jamais un segment fabriqué). Le halo de
 * fermeture n'est renforcé QUE si le SERVEUR a jugé la boucle fermée
 * (`loopClosed`) — jamais une fermeture déduite d'une géométrie approximative.
 * Aucune donnée d'authoring : c'est la trace mesurée du coureur, et rien d'autre.
 * PUR d'i18n : le libellé accessible arrive en prop, résolu par l'écran.
 */
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { colors, motion } from '@klaim/shared';
import { fitTracesToBox, tracePrefix } from '../map/projectTrace';
import { traceStyle, withAlpha } from '../map/mapStyle';
import { useReduceMotion } from '../../ui/game/anim';

/** ViewBox de la vignette (même ratio large-court que la trace live). */
const VB_W = 260;
const VB_H = 92;

export function ResultTrace({
  points,
  loopClosed,
  accessibilityLabel,
  width = VB_W,
}: {
  points: readonly { lat: number; lng: number }[];
  /** Le SERVEUR a-t-il jugé la boucle fermée ? (renforce le halo d'arrivée). */
  loopClosed: boolean;
  accessibilityLabel: string;
  width?: number;
}) {
  const reduce = useReduceMotion();
  const anim = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  const [progress, setProgress] = useState(reduce ? 1 : 0);

  const drawable = points.length >= 2;
  useEffect(() => {
    if (!drawable) return;
    if (reduce) {
      setProgress(1);
      return;
    }
    setProgress(0);
    const id = anim.addListener(({ value }) => setProgress(value));
    Animated.timing(anim, {
      toValue: 1,
      duration: motion.traceDrawMs,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // listener JS : pilote la sous-polyligne, pas un style natif
    }).start();
    return () => {
      anim.removeListener(id);
      anim.stopAnimation();
    };
  }, [drawable, reduce, anim]);

  // Rien à tracer : pas de tracé fabriqué (l'écran dit déjà ce qu'il sait).
  if (!drawable) return null;

  const proj = fitTracesToBox([points], VB_W, VB_H, 12);
  const drawn = tracePrefix(points, progress);
  const poly = proj.points(drawn);
  const tip = drawn[drawn.length - 1];
  const head = tip ? proj.project(tip) : null;
  const closed = progress >= 1 && loopClosed; // fermeture confirmée serveur

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      <Svg width={width} height={width * (VB_H / VB_W)} viewBox={`0 0 ${VB_W} ${VB_H}`}>
        {/* §B : casing sombre puis core chartreuse, joints/bouts arrondis. */}
        <Polyline
          points={poly}
          stroke={traceStyle.casing}
          strokeWidth={6}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Polyline
          points={poly}
          stroke={traceStyle.core}
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Plume : halo + point plein chartreuse. Renforcé quand la boucle est
            fermée (verdict serveur) — la jonction départ/arrivée s'affirme. */}
        {head ? (
          <>
            <Circle
              cx={head.x}
              cy={head.y}
              r={closed ? 11 : 8}
              fill={withAlpha(colors.chartreuse, closed ? 0.3 : 0.18)}
            />
            <Circle cx={head.x} cy={head.y} r={4} fill={colors.chartreuse} />
          </>
        ) : null}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
});
