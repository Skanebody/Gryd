/**
 * GRYD — ContextualRunButton : le bouton central de jeu (AMENDEMENT-08 §1 & §3,
 * AMENDEMENT-12 §A). Disque chartreuse 64-72 px (l'UNIQUE CTA chartreuse
 * global), 2 SEULS objectifs joueur : CONQUÉRIR (défaut — absorbe capture,
 * raid, exploration) / DÉFENDRE (decay urgent ou mission défense active).
 * L'anneau extérieur lit l'ÉTAT de jeu (chartreuse = moi/action, orange rival
 * si défense). Pulse léger (reduce motion → statique), APPUI LONG 500 ms pour
 * déclencher `onStart` (anti-faux départ), haptic au lancement.
 */
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, gameColors } from '@klaim/shared';
import { haptics } from '../../lib/haptics';
import { usePressScale, usePulse } from './anim';

/** AMENDEMENT-12 §A : 2 objectifs, plus jamais RUN/RAID/CAPTURE/SCOUT. */
export type RunButtonMode = 'CONQUERIR' | 'DEFENDRE';

/** Appui long requis pour lancer (doc §8 — évite le départ accidentel). */
export const RUN_BUTTON_LONG_PRESS_MS = 500;

/** Objectif → libellé accentué + anneau d'état + sous-libellé court. */
const MODE_META: Record<RunButtonMode, { label: string; ring: string; hint: string }> = {
  CONQUERIR: { label: 'CONQUÉRIR', ring: gameColors.crew, hint: 'Prends du territoire' },
  DEFENDRE: { label: 'DÉFENDRE', ring: gameColors.rival, hint: 'Zone menacée' },
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
          accessibilityLabel={`${meta.label} — ${meta.hint}. Maintiens pour lancer.`}
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
          <Text
            style={styles.label}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {meta.label}
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
  // 10 px serré : « CONQUÉRIR » (9 lettres) tient dans le disque 64-72 px
  // (adjustsFontSizeToFit ne réduit pas sur web — la taille de base suffit).
  label: {
    color: colors.noir,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
    paddingHorizontal: 2,
  },
  hint: { marginTop: 10, fontSize: 11, fontWeight: '600' },
});
