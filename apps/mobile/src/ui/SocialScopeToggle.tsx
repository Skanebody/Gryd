/**
 * GRYD — pill Solo / Crew (40 pt, cible 44+).
 * Chartreuse = scope actif. Couple avec ActivityModeToggle (Run/Bike).
 */
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, elevation, radii } from '@klaim/shared';
import { usePlayContext, type SocialScope } from '../features/activity/playContext';
import { haptics } from '../lib/haptics';
import { Icon } from './Icon';

interface SocialScopeToggleProps {
  locked?: boolean;
  value?: SocialScope;
  onChange?: (scope: SocialScope) => void;
}

export function SocialScopeToggle({ locked = false, value, onChange }: SocialScopeToggleProps) {
  const store = usePlayContext();
  const scope = value ?? store.social;

  const pick = (next: SocialScope) => {
    if (locked || next === scope) return;
    haptics.light();
    if (onChange) onChange(next);
    else store.setSocial(next);
  };

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel="Portée Solo ou Crew"
      style={[styles.wrap, locked && styles.locked]}
    >
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: scope === 'solo', disabled: locked }}
        accessibilityLabel="Portée : Solo. Bouton. Basculer en Crew."
        disabled={locked}
        hitSlop={6}
        onPress={() => pick('solo')}
        style={[styles.slot, scope === 'solo' && styles.slotOn]}
      >
        <Icon name="profil" size={18} color={scope === 'solo' ? colors.noir : colors.gris} />
      </Pressable>
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: scope === 'crew', disabled: locked }}
        accessibilityLabel="Portée : Crew. Bouton. Basculer en Solo."
        disabled={locked}
        hitSlop={6}
        onPress={() => pick('crew')}
        style={[styles.slot, scope === 'crew' && styles.slotOn]}
      >
        <Icon name="crew" size={18} color={scope === 'crew' ? colors.noir : colors.gris} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 40,
    minWidth: 84,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 3,
    borderRadius: radii.pill,
    backgroundColor: elevation.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.grisLigne,
  },
  locked: { opacity: 0.45 },
  slot: {
    width: 38,
    height: 34,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotOn: { backgroundColor: colors.chartreuse },
});
