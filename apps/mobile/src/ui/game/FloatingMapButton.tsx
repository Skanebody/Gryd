/**
 * GRYD — FloatingMapButton : bouton rond flottant de carte type Uber
 * (AMENDEMENT-09 §1 & §5) — recentrer / couches / stats. 44 px, icône shared
 * (Icon), fond carbone, variante `active` (contour + icône chartreuse — ton
 * action de la charte, jamais de chartreuse sur fond clair : le fond reste
 * sombre). pressScale + haptic light. Anti-bruit : MAXIMUM 3 par écran, en
 * PILE VERTICALE À DROITE — le parent les empile (gap conseillé 10 px).
 */
import { Animated, Pressable, StyleSheet } from 'react-native';
import { colors, type IconName } from '@klaim/shared';
import { haptics } from '../../lib/haptics';
import { Icon } from '../Icon';
import { usePressScale } from './anim';

/** Diamètre gelé du bouton flottant (44 px — cible tactile minimale). */
export const FLOATING_MAP_BUTTON_SIZE = 44;
/** Taille de l'icône dans le disque. */
const ICON_SIZE = 20;

export interface FloatingMapButtonProps {
  /** Icône shared (ex. 'gps' recentrer, 'radar' couches, 'performance' stats). */
  icon: IconName;
  /** Libellé a11y obligatoire — le bouton n'a pas de texte. */
  accessibilityLabel: string;
  onPress: () => void;
  /** Variante active (couche affichée, suivi centré…) — lisible d'un œil. */
  active?: boolean;
  disabled?: boolean;
}

export function FloatingMapButton({
  icon,
  accessibilityLabel,
  onPress,
  active = false,
  disabled = false,
}: FloatingMapButtonProps) {
  const { scale, onPressIn, onPressOut } = usePressScale(0.9);
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled, selected: active }}
        disabled={disabled}
        onPress={() => {
          haptics.light();
          onPress();
        }}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[styles.disc, active && styles.active, disabled && styles.disabled]}
      >
        <Icon name={icon} size={ICON_SIZE} color={active ? colors.chartreuse : colors.blanc} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  disc: {
    width: FLOATING_MAP_BUTTON_SIZE,
    height: FLOATING_MAP_BUTTON_SIZE,
    borderRadius: FLOATING_MAP_BUTTON_SIZE / 2,
    backgroundColor: colors.carbone,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
  },
  active: {
    backgroundColor: colors.chartreuse14,
    borderColor: colors.chartreuse40,
  },
  disabled: { opacity: 0.5 },
});
