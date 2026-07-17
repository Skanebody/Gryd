/**
 * GRYD — BOUTON UNIQUE (audit UI 2026, COMPONENT_INVENTORY §1).
 *
 * Fusionne les 21 recodes du bouton primaire chartreuse (9 hauteurs de fait) et
 * les 17 recodes du secondaire (GhostButton + sous-familles). UN rôle = UN
 * composant = une famille : hauteur (`sizes.buttonLg/Md`), rayon (`radii.pill`),
 * label (`typography.button` = R5, IDENTIQUE partout), états.
 *
 * Ce que ce composant NE remplace PAS (spécialisés à comportement propre) :
 *  - `InlineRunCTA` (game/ContextualRunButton) : lancement de course, haptique +
 *    long-press + autoshrink du libellé héros ;
 *  - la capsule `GO` (GrydNavBar) : décision fondateur, spec dédiée ;
 *  - `AppleButton` (contraintes de marque Apple).
 *
 * Charte : primary = chartreuse/noir (jamais l'inverse) · ghost = bordure
 * grisLigne/blanc · raised = surface N2 (elevation.raised)/blanc. Un seul gros
 * CTA chartreuse par écran (§A) — c'est à l'écran de n'avoir qu'un `primary`.
 */
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  colors,
  elevation,
  gameColors,
  radii,
  sizes,
  typography,
  type IconName,
} from '@klaim/shared';
import { Icon } from './Icon';
import { usePressScale } from './game/anim';
import { haptics } from '../lib/haptics';

export type ButtonVariant = 'primary' | 'ghost' | 'raised';
export type ButtonSize = 'lg' | 'md';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Icône filaire de la famille, posée à gauche du libellé (optionnelle). */
  icon?: IconName;
  /** Spinner in-button : le libellé reste, l'action est verrouillée. */
  loading?: boolean;
  disabled?: boolean;
  /** Nom accessible si différent du libellé. */
  accessibilityLabel?: string;
}

/** Hauteur par taille — jamais sous le plancher tactile (sizes.touchTarget). */
const HEIGHT: Record<ButtonSize, number> = {
  lg: sizes.buttonLg, // 56
  md: sizes.buttonMd, // 48
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  icon,
  loading = false,
  disabled = false,
  accessibilityLabel,
}: ButtonProps) {
  const { scale, onPressIn, onPressOut } = usePressScale(0.97);
  const blocked = disabled || loading;
  const onDark = variant === 'primary'; // texte noir sur chartreuse ; blanc sinon
  const fg = onDark ? colors.noir : colors.blanc;

  return (
    <Animated.View style={[styles.wrap, { transform: [{ scale }] }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled: blocked, busy: loading }}
        disabled={blocked}
        onPress={() => {
          haptics.light();
          onPress();
        }}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[
          styles.base,
          { height: HEIGHT[size] },
          variant === 'primary' && styles.primary,
          variant === 'ghost' && styles.ghost,
          variant === 'raised' && styles.raised,
          blocked && styles.blocked,
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={fg} />
        ) : icon ? (
          <View style={styles.leading}>
            <Icon name={icon} size={20} color={fg} />
          </View>
        ) : null}
        {/* §A « textes jamais coupés » : le libellé rétrécit pour tenir (jamais
            l'ellipse « … »), comme le CTA héros. */}
        <Text
          style={[typography.button, { color: fg }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          ellipsizeMode="clip"
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'stretch' },
  base: {
    alignSelf: 'stretch',
    minHeight: sizes.touchTarget,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 22,
  },
  primary: { backgroundColor: gameColors.crew }, // = colors.chartreuse
  ghost: { borderWidth: 1, borderColor: colors.grisLigne },
  raised: { backgroundColor: elevation.raised },
  blocked: { opacity: 0.5 },
  leading: { alignItems: 'center', justifyContent: 'center' },
});
