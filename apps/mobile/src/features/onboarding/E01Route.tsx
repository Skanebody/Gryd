/**
 * GRYD — E01 : BOUCLE de parcours ANIMÉE (remplace « VOTRE RUE »). Illustre LA
 * mécanique : on court un parcours qui suit les RUES (segments droits, angles —
 * pas des courbes lisses), on FERME la boucle, et l'intérieur SE REMPLIT en
 * chartreuse (= la zone est prise). Deux temps :
 *   1. le tracé se dessine le long des rues (strokeDashoffset, ~1,5 s) ;
 *   2. la boucle refermée, l'aire intérieure se remplit en chartreuse (~0,6 s).
 * Terminaisons/jointures rondes discrètes (§B). Reduce Motion → boucle pleine +
 * remplie d'emblée.
 *
 * PUREMENT DÉCORATIF (onboarding) — pas une donnée GPS/joueur : l'illustration de
 * « ferme une boucle → prends la zone ».
 */
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '@klaim/shared';
import { useReduceMotion } from '../../ui/game/anim';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// Boucle FERMÉE le long des rues (viewBox plein écran 375×812), segments droits
// + angles = un vrai parcours urbain autour de quelques pâtés de maisons.
const LOOP_D =
  'M95 495 L95 370 L155 370 L155 285 L250 285 L250 350 L300 350 L300 455 L205 455 L205 495 Z';
// Périmètre approximatif (pour le « draw »).
const LOOP_LEN = 840;
const DRAW_MS = 1500;
const FILL_MS = 600;
/** Opacité du remplissage intérieur (chartreuse translucide = zone prise). */
const FILL_OPACITY = 0.18;
/** Départ de la boucle (1er point de LOOP_D). */
const START = { x: 95, y: 495 };

export function E01Route() {
  const reduce = useReduceMotion();
  const offset = useRef(new Animated.Value(reduce ? 0 : LOOP_LEN)).current;
  const fill = useRef(new Animated.Value(reduce ? FILL_OPACITY : 0)).current;

  useEffect(() => {
    if (reduce) {
      offset.setValue(0);
      fill.setValue(FILL_OPACITY);
      return;
    }
    offset.setValue(LOOP_LEN);
    fill.setValue(0);
    const anim = Animated.sequence([
      // 1. dessine la boucle le long des rues
      Animated.timing(offset, {
        toValue: 0,
        duration: DRAW_MS,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }),
      // 2. boucle fermée → l'intérieur se remplit en chartreuse
      Animated.timing(fill, {
        toValue: FILL_OPACITY,
        duration: FILL_MS,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [reduce, offset, fill]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox="0 0 375 812">
        {/* Remplissage intérieur (zone prise) — sous le tracé. */}
        <AnimatedPath d={LOOP_D} fill={colors.chartreuse} fillOpacity={fill} stroke="none" />
        {/* Casing sombre — contraste sur la photo. */}
        <AnimatedPath
          d={LOOP_D}
          stroke="rgba(6,8,7,0.55)"
          strokeWidth={9}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={LOOP_LEN}
          strokeDashoffset={offset}
        />
        {/* Cœur chartreuse qui se dessine le long des rues. */}
        <AnimatedPath
          d={LOOP_D}
          stroke={colors.chartreuse}
          strokeWidth={4.5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={LOOP_LEN}
          strokeDashoffset={offset}
        />
        {/* Point de départ (= arrivée, la boucle est fermée). */}
        <Circle cx={START.x} cy={START.y} r={6} fill={colors.chartreuse} stroke="#060807" strokeWidth={2} />
      </Svg>
    </View>
  );
}
