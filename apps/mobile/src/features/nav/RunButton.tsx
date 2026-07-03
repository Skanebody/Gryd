/**
 * GRYD — bouton COURIR global (addendum §F) : disque 72 px chartreuse flottant
 * bas-centre AU-DESSUS de la nav (AMENDEMENT-02 §5), halo pulsé 2 s
 * (motion.runButtonPulseMs), driver natif. Rendu au niveau du layout (tabs) :
 * permanent sur les 5 onglets — c'est LE CTA chartreuse global, les CTA
 * d'écran restent ghost (§C.3 : 1 seul CTA chartreuse par écran).
 * TODO §G : couper la boucle du halo si reduce-motion (AccessibilityInfo) — V0.2.
 */
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, motion, radii } from '@klaim/shared';
import { EVENTS, track } from '../../lib/analytics';
import { RUN_BUTTON_BOTTOM, RUN_BUTTON_SIZE, RUN_HALO_OVERFLOW } from './metrics';

export function RunButton() {
  const insets = useSafeAreaInsets();

  // Halo pulsé 2 s (§F) — Animated simple, driver natif.
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: motion.runButtonPulseMs,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const haloScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.35] });
  const haloOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] });

  const handlePress = () => {
    track(EVENTS.runStart);
    // TODO Milestone 2 : navigation vers l'écran « Course en cours » (§4.2.2).
    if (__DEV__) console.log('[run] run_start — écran course à venir (Milestone 2)');
  };

  return (
    <View
      style={[styles.wrap, { bottom: insets.bottom + RUN_BUTTON_BOTTOM }]}
      pointerEvents="box-none"
    >
      <Animated.View
        pointerEvents="none"
        style={[styles.halo, { opacity: haloOpacity, transform: [{ scale: haloScale }] }]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Démarrer une course"
        onPress={handlePress}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      >
        <Text style={styles.label}>GO</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    alignSelf: 'center',
    width: RUN_BUTTON_SIZE,
    height: RUN_BUTTON_SIZE,
  },
  halo: {
    position: 'absolute',
    top: -RUN_HALO_OVERFLOW,
    left: -RUN_HALO_OVERFLOW,
    right: -RUN_HALO_OVERFLOW,
    bottom: -RUN_HALO_OVERFLOW,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.chartreuse40,
  },
  button: {
    width: RUN_BUTTON_SIZE,
    height: RUN_BUTTON_SIZE,
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse, // emploi §C.3 (2) : action primaire
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: { opacity: 0.85 },
  label: {
    color: colors.noir, // noir sur chartreuse ≈ 17:1 (§C.2) — jamais l'inverse clair
    fontSize: fontSizes.sm,
    fontWeight: '700',
    letterSpacing: 1,
    // TODO fonts : Space Grotesk 700 (addendum §E) — police système en attendant
  },
});
