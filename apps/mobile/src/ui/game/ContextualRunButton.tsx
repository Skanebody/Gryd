/**
 * GRYD — ContextualRunButton : le bouton central de jeu (AMENDEMENT-08 §1 & §3,
 * doc §8). Disque chartreuse 64-72 px (l'UNIQUE CTA chartreuse global), label
 * contextuel dérivé des données démo : RUN / DEFEND / RAID / CAPTURE / SCOUT.
 * L'anneau extérieur lit l'ÉTAT de jeu (rival si défense, contesté si raid,
 * verify si scout). Pulse léger (reduce motion → statique), APPUI LONG 500 ms
 * pour déclencher `onStart` (anti-faux départ), haptic au lancement.
 */
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, gameColors } from '@klaim/shared';
import { haptics } from '../../lib/haptics';
import { usePressScale, usePulse } from './anim';

export type RunButtonMode = 'RUN' | 'DEFEND' | 'RAID' | 'CAPTURE' | 'SCOUT';

/** Appui long requis pour lancer (doc §8 — évite le départ accidentel). */
export const RUN_BUTTON_LONG_PRESS_MS = 500;

/** Mode → anneau d'état + sous-libellé court (vocabulaire de jeu §27). */
const MODE_META: Record<RunButtonMode, { ring: string; hint: string }> = {
  RUN: { ring: gameColors.crew, hint: 'Run libre' },
  DEFEND: { ring: gameColors.rival, hint: 'Zone menacée' },
  RAID: { ring: gameColors.contested, hint: 'Offensive active' },
  CAPTURE: { ring: gameColors.crew, hint: 'Zone neutre proche' },
  SCOUT: { ring: gameColors.verify, hint: 'Mission exploration' },
};

export interface ContextualRunButtonProps {
  mode: RunButtonMode;
  /** Déclenché à l'APPUI LONG (500 ms) — navigue vers le RunModeSheet/Course Live. */
  onStart: () => void;
  /** Tap court optionnel (ex. afficher l'aide « maintiens pour partir »). */
  onPress?: () => void;
  /** Diamètre du disque en px (64-72, défaut 68). */
  size?: number;
  disabled?: boolean;
  /** Affiche le sous-libellé contextuel sous le bouton. */
  showHint?: boolean;
}

export function ContextualRunButton({
  mode,
  onStart,
  onPress,
  size = 68,
  disabled = false,
  showHint = false,
}: ContextualRunButtonProps) {
  const meta = MODE_META[mode];
  const pulse = usePulse(!disabled, 1.05);
  const { scale, onPressIn, onPressOut } = usePressScale(0.93);
  const ringSize = size + 12;

  return (
    <View style={styles.wrap}>
      <View style={styles.discZone}>
        <Animated.View
          style={[
            styles.ring,
            {
              width: ringSize,
              height: ringSize,
              borderRadius: ringSize / 2,
              borderColor: meta.ring,
              transform: [{ scale: pulse }],
            },
          ]}
        />
        <Animated.View style={{ transform: [{ scale }] }}>
          <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${mode} — ${meta.hint}. Maintiens pour lancer.`}
          accessibilityState={{ disabled }}
          disabled={disabled}
          delayLongPress={RUN_BUTTON_LONG_PRESS_MS}
          onLongPress={() => {
            haptics.medium();
            onStart();
          }}
          onPress={() => {
            haptics.light();
            onPress?.();
          }}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          style={[
            styles.disc,
            { width: size, height: size, borderRadius: size / 2 },
            disabled && styles.disabled,
          ]}
        >
          <Text style={styles.label} numberOfLines={1}>
            {mode}
          </Text>
          </Pressable>
        </Animated.View>
      </View>
      {showHint ? (
        <Text style={[styles.hint, { color: meta.ring }]} numberOfLines={1}>
          {meta.hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  discZone: { alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    borderWidth: 1.5,
    opacity: 0.6,
  },
  disc: {
    backgroundColor: gameColors.crew,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.5 },
  // Libellé NOIR sur chartreuse (jamais l'inverse — charte contraste).
  label: { color: colors.noir, fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  hint: { marginTop: 10, fontSize: 11, fontWeight: '600' },
});
