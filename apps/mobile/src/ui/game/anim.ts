/**
 * GRYD — helpers d'animation du design system jeu (AMENDEMENT-08 §1, doc §24).
 * RN `Animated` CORE uniquement (pas de reanimated). Chaque hook respecte
 * `useReduceMotion` (AccessibilityInfo) : si le reduce motion est actif, les
 * mouvements sont remplacés par des fades courts (ou rien), jamais supprimés
 * au point de casser la lisibilité (doc §25).
 */
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing } from 'react-native';
import { motion } from '@klaim/shared';

/** Fade court utilisé à la place des mouvements quand reduce motion est actif. */
const REDUCED_FADE_MS = 120;

/**
 * Reduce motion système (fallback false si l'API échoue — web/anciens OS).
 * S'abonne aux changements pour réagir sans relancer l'app.
 */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted) setReduce(value);
      })
      .catch(() => {}); // fallback : false
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

/**
 * Pulse léger en boucle (bouton RUN, coffre claimable, hex contesté).
 * Retourne une Animated.Value à brancher sur `transform: [{ scale }]`.
 * Reduce motion → valeur fixe 1 (aucun battement).
 */
export function usePulse(
  active = true,
  scaleTo = 1.05,
  durationMs: number = motion.runButtonPulseMs,
): Animated.Value {
  const reduce = useReduceMotion();
  const value = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!active || reduce) {
      value.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, {
          toValue: scaleTo,
          duration: durationMs / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: 1,
          duration: durationMs / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, reduce, scaleTo, durationMs, value]);
  return value;
}

/**
 * Scale au press (cartes, boutons de jeu) : brancher les 3 retours sur un
 * Pressable (`onPressIn`/`onPressOut`) et `transform: [{ scale }]`.
 * Reduce motion → scale inerte (reste à 1).
 */
export function usePressScale(scaleTo = 0.96): {
  scale: Animated.Value;
  onPressIn: () => void;
  onPressOut: () => void;
} {
  const reduce = useReduceMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) =>
    Animated.timing(scale, {
      toValue: v,
      duration: 90,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  return {
    scale,
    onPressIn: () => {
      if (!reduce) to(scaleTo);
    },
    onPressOut: () => {
      if (!reduce) to(1);
    },
  };
}

/**
 * Compteur qui monte (+214 hexes, pts, XP) : renvoie la valeur ENTIÈRE affichable.
 * Repart de l'ancienne cible à chaque changement. Reduce motion → saut direct.
 */
export function useCountUp(target: number, durationMs: number = motion.celebrationCountMs): number {
  const reduce = useReduceMotion();
  const [display, setDisplay] = useState(reduce ? target : 0);
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) {
      setDisplay(target);
      return;
    }
    const id = anim.addListener(({ value }) => setDisplay(Math.round(value)));
    Animated.timing(anim, {
      toValue: target,
      duration: durationMs,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // listener JS : pilote un <Text>, pas un style natif
    }).start();
    return () => {
      anim.removeListener(id);
      anim.stopAnimation();
    };
  }, [target, durationMs, reduce, anim]);
  return display;
}

/**
 * Slide-in au montage (WarEventCard, lignes de league) : opacity + translateY.
 * Reduce motion → fade court sans translation.
 */
export function useSlideIn(
  offsetY = 16,
  durationMs: number = motion.transitionMs,
  delayMs = 0,
): { opacity: Animated.Value; translateY: Animated.Value } {
  const reduce = useReduceMotion();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(reduce ? 0 : offsetY)).current;
  useEffect(() => {
    if (reduce) {
      translateY.setValue(0);
      Animated.timing(opacity, {
        toValue: 1,
        duration: REDUCED_FADE_MS,
        useNativeDriver: true,
      }).start();
      return;
    }
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: durationMs,
        delay: delayMs,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: durationMs,
        delay: delayMs,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, [reduce, durationMs, delayMs, opacity, translateY]);
  return { opacity, translateY };
}

/**
 * Reveal (badge unlock, item d'arsenal acheté) : opacity + scale 0.85 → 1
 * quand `visible` passe à true. Reduce motion → fade court sans zoom.
 */
export function useReveal(
  visible: boolean,
  durationMs: number = motion.celebrationWaveMs,
): { opacity: Animated.Value; scale: Animated.Value } {
  const reduce = useReduceMotion();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(reduce ? 1 : 0.85)).current;
  useEffect(() => {
    if (!visible) {
      opacity.setValue(0);
      scale.setValue(reduce ? 1 : 0.85);
      return;
    }
    if (reduce) {
      scale.setValue(1);
      Animated.timing(opacity, {
        toValue: 1,
        duration: REDUCED_FADE_MS,
        useNativeDriver: true,
      }).start();
      return;
    }
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: durationMs,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
    ]).start();
  }, [visible, reduce, durationMs, opacity, scale]);
  return { opacity, scale };
}
