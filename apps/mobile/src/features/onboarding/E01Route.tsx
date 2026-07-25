/**
 * GRYD — E01 : PARCOURS chartreuse ANIMÉ (remplace le label « VOTRE RUE »). Un
 * tracé illustratif d'onboarding qui SE DESSINE tout seul au montage, « comme si
 * un run avait été fait » : casing sombre (lisibilité sur la photo) + cœur
 * chartreuse, terminaisons rondes (§B), animés par strokeDashoffset. Point de
 * départ marqué. Reduce Motion → tracé plein d'emblée (aucun mouvement).
 *
 * PUREMENT DÉCORATIF (onboarding) — ce n'est PAS un vrai parcours GPS, ni une
 * donnée joueur : c'est l'illustration de la mécanique (« ferme une boucle »).
 */
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '@klaim/shared';
import { useReduceMotion } from '../../ui/game/anim';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// Boucle organique (viewBox plein écran 375×812) — départ bas-gauche, revient
// près du départ (boucle « fermée » = le geste signature de GRYD).
const ROUTE_D =
  'M70 486 C70 410 124 366 196 378 C270 391 304 336 288 272 C273 218 208 204 163 236 C124 264 142 312 206 306';
// Longueur approximative du tracé (pour le dash du « draw »). Légèrement généreux.
const ROUTE_LEN = 900;
const DRAW_MS = 1700;
/** Départ de la boucle (doit coïncider avec le 1er point de ROUTE_D). */
const START = { x: 70, y: 486 };

export function E01Route() {
  const reduce = useReduceMotion();
  const offset = useRef(new Animated.Value(reduce ? 0 : ROUTE_LEN)).current;

  useEffect(() => {
    if (reduce) {
      offset.setValue(0);
      return;
    }
    offset.setValue(ROUTE_LEN);
    const anim = Animated.timing(offset, {
      toValue: 0,
      duration: DRAW_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // strokeDashoffset (prop SVG) — pilote JS, pas natif
    });
    anim.start();
    return () => anim.stop();
  }, [reduce, offset]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox="0 0 375 812">
        {/* Casing sombre — contraste du tracé sur la photo. */}
        <AnimatedPath
          d={ROUTE_D}
          stroke="rgba(6,8,7,0.55)"
          strokeWidth={9}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={ROUTE_LEN}
          strokeDashoffset={offset}
        />
        {/* Cœur chartreuse qui se dessine. */}
        <AnimatedPath
          d={ROUTE_D}
          stroke={colors.chartreuse}
          strokeWidth={4.5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={ROUTE_LEN}
          strokeDashoffset={offset}
        />
        {/* Point de départ. */}
        <Circle cx={START.x} cy={START.y} r={6} fill={colors.chartreuse} stroke="#060807" strokeWidth={2} />
      </Svg>
    </View>
  );
}
