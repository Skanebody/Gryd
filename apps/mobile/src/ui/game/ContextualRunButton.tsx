/**
 * GRYD — ContextualRunButton : le bouton central de jeu (AMENDEMENT-08 §1 & §3,
 * AMENDEMENT-14 §2 — GO-first). Disque chartreuse 64-72 px (l'UNIQUE CTA
 * chartreuse global) qui affiche TOUJOURS « GO » — plus jamais
 * CONQUÉRIR/DÉFENDRE sur le bouton : l'objectif est un RÉSULTAT, pas une
 * question (la teinte/le kicker de lecture restent dans la sheet).
 *   TAP        = départ immédiat (haptic medium) — aucun écran intermédiaire.
 *   APPUI LONG = choix avancés (500 ms → RunModeSheet côté appelant).
 * Pulse léger conservé (reduce motion → statique via usePulse).
 */
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, gameColors } from '@klaim/shared';
import { haptics } from '../../lib/haptics';
import { usePressScale, usePulse } from './anim';

/** AMENDEMENT-12 §A : la LECTURE 2 objectifs (kicker/teinte sheet — plus le bouton). */
export type RunButtonMode = 'CONQUERIR' | 'DEFENDRE';

/** Appui long = choix avancés (AMENDEMENT-14 §2 — power users). */
export const RUN_BUTTON_LONG_PRESS_MS = 500;

export interface ContextualRunButtonProps {
  /** TAP = départ immédiat sur le plan auto (l'appelant navigue vers Course Live). */
  onGo: () => void;
  /** APPUI LONG (500 ms) = choix avancés (RunModeSheet + changer d'itinéraire). */
  onLongPress?: () => void;
  /** Diamètre du disque en px (64-72, défaut 68). */
  size?: number;
  disabled?: boolean;
  /** Sous-libellé optionnel (la phrase du plan auto) sous le bouton. */
  hint?: string;
}

export function ContextualRunButton({
  onGo,
  onLongPress,
  size = 68,
  disabled = false,
  hint,
}: ContextualRunButtonProps) {
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
              transform: [{ scale: pulse }],
            },
          ]}
        />
        <Animated.View style={{ transform: [{ scale }] }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="GO — départ immédiat. Maintiens pour les choix avancés."
            accessibilityState={{ disabled }}
            disabled={disabled}
            delayLongPress={RUN_BUTTON_LONG_PRESS_MS}
            onLongPress={() => {
              haptics.light();
              onLongPress?.();
            }}
            onPress={() => {
              haptics.medium();
              onGo();
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
              GO
            </Text>
          </Pressable>
        </Animated.View>
      </View>
      {hint ? (
        <Text style={styles.hint} numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  discZone: { alignItems: 'center', justifyContent: 'center' },
  // Anneau chartreuse — le bouton lit l'ACTION (GO), plus jamais un objectif.
  ring: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: gameColors.crew,
    opacity: 0.6,
  },
  disc: {
    backgroundColor: gameColors.crew,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.5 },
  // Libellé NOIR sur chartreuse (jamais l'inverse — charte contraste).
  label: {
    color: colors.noir,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  hint: { marginTop: 10, fontSize: 11, fontWeight: '600', color: colors.gris },
});
