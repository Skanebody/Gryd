/**
 * GRYD — pill Run / Bike (40 pt, cible 44+). Planche E14.
 * Chartreuse = mode actif. Verrouillé pendant une course live (prop locked).
 * Couple avec SocialScopeToggle (Solo/Crew) via playContext.
 */
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, elevation, radii } from '@klaim/shared';
import { useActivityMode, type ActivityMode } from '../features/activity/activityMode';
import { haptics } from '../lib/haptics';
import { Icon } from './Icon';

interface ActivityModeToggleProps {
  /** Empêche le basculement (course en cours). */
  locked?: boolean;
  /** Override contrôlé (tests) — sinon lit le store. */
  value?: ActivityMode;
  onChange?: (mode: ActivityMode) => void;
}

export function ActivityModeToggle({ locked = false, value, onChange }: ActivityModeToggleProps) {
  const store = useActivityMode();
  const mode = value ?? store.mode;

  const pick = (next: ActivityMode) => {
    if (locked || next === mode) return;
    haptics.light();
    if (onChange) onChange(next);
    else store.setMode(next);
  };

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel="Activité Run ou Bike"
      style={[styles.wrap, locked && styles.locked]}
    >
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: mode === 'run', disabled: locked }}
        accessibilityLabel="Activité : Run. Bouton. Basculer en Bike."
        disabled={locked}
        hitSlop={6}
        onPress={() => pick('run')}
        style={[styles.slot, mode === 'run' && styles.slotOn]}
      >
        <Icon name="basket" size={18} color={mode === 'run' ? colors.noir : colors.gris} />
      </Pressable>
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: mode === 'bike', disabled: locked }}
        accessibilityLabel="Activité : Bike. Bouton. Basculer en Run."
        disabled={locked}
        hitSlop={6}
        onPress={() => pick('bike')}
        style={[styles.slot, mode === 'bike' && styles.slotOn]}
      >
        <Icon name="bike" size={18} color={mode === 'bike' ? colors.noir : colors.gris} />
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
