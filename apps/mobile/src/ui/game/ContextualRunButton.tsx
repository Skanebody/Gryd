/**
 * GRYD — ContextualRunButton : le bouton disque de lancement de course
 * (AMENDEMENT-08 §1 & §3, AMENDEMENT-14 §2 — GO-first). Disque chartreuse
 * 64-72 px qui affiche TOUJOURS « GO » — plus jamais CONQUÉRIR/DÉFENDRE sur le
 * bouton : l'objectif est un RÉSULTAT, pas une question (la teinte/le kicker de
 * lecture restent dans la sheet).
 *   TAP        = départ immédiat (haptic medium) — aucun écran intermédiaire.
 *   APPUI LONG = choix avancés (500 ms → RunModeSheet côté appelant).
 * Pulse léger conservé (reduce motion → statique via usePulse).
 *
 * AMENDEMENT-17 §1.1 : le disque ne FLOTTE plus jamais en overlay central. Il
 * est rendu INLINE (dans la bottom sheet de la Carte). Pour les CTA principaux
 * des AUTRES écrans (War Room, Crew, League, Profil), utiliser `InlineRunCTA` :
 * un bouton plein-largeur chartreuse dont le LIBELLÉ vient du contexte
 * (GO / DÉFENDRE / CONQUÉRIR / REJOINDRE / TERMINER / PARTAGER…), jamais un GO
 * générique imposé. Un écran = une action ; le CTA vit DANS le contenu.
 */
import type { ReactNode } from 'react';
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

/**
 * AMENDEMENT-17 §1.1 — CTA de course INLINE, plein-largeur, contextuel.
 * L'action principale d'un écran vit DANS son contenu (jamais un FAB flottant).
 * Le libellé vient TOUJOURS du contexte appelant (GO / DÉFENDRE / CONQUÉRIR /
 * REJOINDRE / TERMINER / PARTAGER…) — plus jamais un « GO » générique imposé.
 *   `primary`   plein chartreuse, texte noir (l'action forte de l'écran).
 *   `secondary` contour discret (action alternative, ex. « Changer de route »).
 * Long-press optionnel pour rebrancher le flux intentions (AMENDEMENT-16).
 */
export type InlineRunCTAVariant = 'primary' | 'secondary';
export type InlineRunCTASize = 'md' | 'lg';

export interface InlineRunCTAProps {
  /** Libellé contextuel (jamais imposé) : GO, DÉFENDRE, REJOINDRE, TERMINER… */
  label: string;
  /** Action principale (l'appelant navigue / lance la course). */
  onPress: () => void;
  /** Appui long optionnel : choix avancés / intentions (AMENDEMENT-16). */
  onLongPress?: () => void;
  variant?: InlineRunCTAVariant;
  size?: InlineRunCTASize;
  /** Icône optionnelle à gauche du libellé (déjà colorée par l'appelant). */
  leading?: ReactNode;
  disabled?: boolean;
  /** Contexte lecteur d'écran (défaut = label). */
  accessibilityLabel?: string;
}

export function InlineRunCTA({
  label,
  onPress,
  onLongPress,
  variant = 'primary',
  size = 'lg',
  leading,
  disabled = false,
  accessibilityLabel,
}: InlineRunCTAProps) {
  const { scale, onPressIn, onPressOut } = usePressScale(0.97);
  const isPrimary = variant === 'primary';

  return (
    <Animated.View style={[styles.ctaWrap, { transform: [{ scale }] }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled }}
        disabled={disabled}
        delayLongPress={RUN_BUTTON_LONG_PRESS_MS}
        onLongPress={
          onLongPress
            ? () => {
                haptics.light();
                onLongPress();
              }
            : undefined
        }
        onPress={() => {
          haptics.medium();
          onPress();
        }}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[
          styles.cta,
          size === 'md' && styles.ctaMd,
          isPrimary ? styles.ctaPrimary : styles.ctaSecondary,
          disabled && styles.disabled,
        ]}
      >
        {leading ? <View style={styles.ctaLeading}>{leading}</View> : null}
        <Text
          style={[
            styles.ctaLabel,
            size === 'md' && styles.ctaLabelMd,
            isPrimary ? styles.ctaLabelPrimary : styles.ctaLabelSecondary,
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
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

  // --- CTA inline plein-largeur (AMENDEMENT-17 §1.1) ---
  ctaWrap: { width: '100%' },
  cta: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
  },
  ctaMd: { height: 48, borderRadius: 14 },
  ctaPrimary: { backgroundColor: gameColors.crew },
  ctaSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.grisLigne,
  },
  ctaLeading: { alignItems: 'center', justifyContent: 'center' },
  ctaLabel: { fontSize: 16, fontWeight: '800', letterSpacing: 0.6 },
  ctaLabelMd: { fontSize: 15 },
  // Noir sur chartreuse (jamais l'inverse — charte contraste) ; blanc sur contour.
  ctaLabelPrimary: { color: colors.noir },
  ctaLabelSecondary: { color: colors.blanc },
});
