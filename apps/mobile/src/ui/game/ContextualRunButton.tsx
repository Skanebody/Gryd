/**
 * GRYD — ContextualRunButton : le bouton disque de lancement de course
 * (AMENDEMENT-08 §1 & §3, AMENDEMENT-29 — CONTEXTUEL). Disque chartreuse
 * 64-72 px dont le LIBELLÉ vient TOUJOURS du contexte (VERBE court : RUN /
 * DÉFENDRE / CONQUÉRIR / TERMINER / REJOINDRE) — **« GO » est retiré
 * définitivement** (AMENDEMENT-29 : toujours un verbe qui dit POURQUOI tu cours).
 * Icône propriétaire + texte (charte §10 : CTA principal = icône + texte).
 *   TAP        = départ immédiat (haptic medium) — aucun écran intermédiaire.
 *   APPUI LONG = choix avancés (500 ms → RunModeSheet côté appelant).
 * Pulse léger conservé (reduce motion → statique via usePulse).
 *
 * AMENDEMENT-29 : le bouton d'action est désormais FLOTTANT + CONTEXTUEL (pas un
 * onglet). `FloatingActionButton` = la variante flottante chartreuse, centrée
 * AU-DESSUS de la barre de nav, gatée par route dans (tabs)/_layout. Le disque
 * inline (`ContextualRunButton`) et le CTA plein-largeur (`InlineRunCTA`)
 * restent pour les usages en contenu (bottom sheet Carte, CTA d'écran).
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
  /**
   * Libellé CONTEXTUEL du bouton — un VERBE court (RUN / DÉFENDRE / CONQUÉRIR /
   * TERMINER / REJOINDRE). Jamais « GO » (retiré, AMENDEMENT-29).
   */
  label: string;
  /** TAP = départ immédiat sur le plan auto (l'appelant navigue vers Course Live). */
  onGo: () => void;
  /** APPUI LONG (500 ms) = choix avancés (RunModeSheet + changer d'itinéraire). */
  onLongPress?: () => void;
  /** Icône propriétaire optionnelle sous/à-côté du libellé (déjà colorée noir). */
  leading?: ReactNode;
  /** Diamètre du disque en px (64-72, défaut 68). */
  size?: number;
  disabled?: boolean;
  /** Sous-libellé optionnel (la phrase du plan auto) sous le bouton. */
  hint?: string;
  /** Contexte lecteur d'écran (défaut dérivé du libellé). */
  accessibilityLabel?: string;
}

export function ContextualRunButton({
  label,
  onGo,
  onLongPress,
  leading,
  size = 68,
  disabled = false,
  hint,
  accessibilityLabel,
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
            accessibilityLabel={
              accessibilityLabel ?? `${label} — départ immédiat. Maintiens pour les choix avancés.`
            }
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
            {leading ? <View style={styles.discLeading}>{leading}</View> : null}
            <Text style={styles.label} numberOfLines={1}>
              {label}
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
 * AMENDEMENT-29 — BOUTON D'ACTION FLOTTANT CONTEXTUEL. Une capsule chartreuse
 * centrée AU-DESSUS de la barre de nav (rendue en overlay par (tabs)/_layout,
 * gatée par route). Le LIBELLÉ + l'icône viennent du CONTEXTE (RUN / DÉFENDRE /
 * CONQUÉRIR / TERMINER / REJOINDRE) — jamais « GO ». C'est le SEUL gros CTA
 * chartreuse de l'écran (§A.4) : sur la Carte il remplace le [Défendre] de
 * l'Info (anti double-CTA).
 *   TAP        = départ immédiat (haptic medium) → l'appelant navigue au live.
 *   APPUI LONG = choix avancés (optionnel — RunModeSheet côté appelant).
 * Pulse discret (reduce motion → statique). Icône noire sur chartreuse (charte
 * contraste : jamais de chartreuse sur clair, ici c'est noir sur chartreuse).
 */
export interface FloatingActionButtonProps {
  /** VERBE court contextuel (RUN / DÉFENDRE / CONQUÉRIR / TERMINER / REJOINDRE). */
  label: string;
  /** TAP = lance la course (l'appelant navigue vers /course-live). */
  onPress: () => void;
  /** APPUI LONG optionnel = choix avancés / intentions (AMENDEMENT-16). */
  onLongPress?: () => void;
  /** Icône propriétaire à gauche du libellé (déjà colorée noir par l'appelant). */
  leading?: ReactNode;
  disabled?: boolean;
  /** Contexte lecteur d'écran (défaut dérivé du libellé). */
  accessibilityLabel?: string;
}

export function FloatingActionButton({
  label,
  onPress,
  onLongPress,
  leading,
  disabled = false,
  accessibilityLabel,
}: FloatingActionButtonProps) {
  const pulse = usePulse(!disabled, 1.04);
  const { scale, onPressIn, onPressOut } = usePressScale(0.95);

  return (
    <View style={styles.fabWrap} pointerEvents="box-none">
      {/* Halo pulsant discret derrière la capsule (le CTA « respire »). */}
      <Animated.View
        style={[styles.fabHalo, { transform: [{ scale: pulse }] }]}
        pointerEvents="none"
      />
      <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            accessibilityLabel ?? `${label} — départ immédiat. Maintiens pour les choix avancés.`
          }
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
          style={[styles.fab, disabled && styles.disabled]}
        >
          {leading ? <View style={styles.fabLeading}>{leading}</View> : null}
          <Text style={styles.fabLabel} numberOfLines={1}>
            {label}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

/**
 * AMENDEMENT-17 §1.1 — CTA de course INLINE, plein-largeur, contextuel.
 * L'action principale d'un écran vit DANS son contenu (jamais un FAB flottant).
 * Le libellé vient TOUJOURS du contexte appelant (DÉFENDRE / CONQUÉRIR /
 * REJOINDRE / TERMINER / PARTAGER…) — plus jamais un « GO » générique imposé.
 *   `primary`   plein chartreuse, texte noir (l'action forte de l'écran).
 *   `secondary` contour discret (action alternative, ex. « Changer de route »).
 * Long-press optionnel pour rebrancher le flux intentions (AMENDEMENT-16).
 */
export type InlineRunCTAVariant = 'primary' | 'secondary';
export type InlineRunCTASize = 'md' | 'lg';

export interface InlineRunCTAProps {
  /** Libellé contextuel (jamais imposé) : DÉFENDRE, REJOINDRE, TERMINER, RUN… */
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
  // Anneau chartreuse — le bouton lit l'ACTION contextuelle (jamais « GO »).
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
  discLeading: { alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  disabled: { opacity: 0.5 },
  // Libellé NOIR sur chartreuse (jamais l'inverse — charte contraste).
  label: {
    color: colors.noir,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  hint: { marginTop: 10, fontSize: 11, fontWeight: '600', color: colors.gris },

  // --- Bouton d'action FLOTTANT (AMENDEMENT-29) : capsule chartreuse ----------
  fabWrap: { alignItems: 'center', justifyContent: 'center' },
  // Halo pulsant : disque chartreuse translucide un peu plus large que la pill.
  fabHalo: {
    position: 'absolute',
    left: -10,
    right: -10,
    top: -6,
    bottom: -6,
    borderRadius: 40,
    backgroundColor: gameColors.crew,
    opacity: 0.18,
  },
  fab: {
    minHeight: 56,
    minWidth: 168,
    paddingHorizontal: 28,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: gameColors.crew,
    // Ombre portée douce (le CTA flotte au-dessus de la carte / des listes).
    shadowColor: colors.noir,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  fabLeading: { alignItems: 'center', justifyContent: 'center' },
  // Libellé NOIR sur chartreuse (jamais l'inverse — charte contraste).
  fabLabel: {
    color: colors.noir,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 1,
  },

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
