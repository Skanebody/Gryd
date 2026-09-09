import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { refonteColors as c, type Activity } from '@klaim/shared';
import { GrydIcon } from '../../ui/gryd/GrydIcon';
import { MapTranslucent2026 } from '../../ui/gryd/MapTranslucent2026';
import { useControlMotion2026 } from '../../ui/gryd/Motion2026';

const TARGET = 44;
const INSET = 4;

/** One connected rail: only the selection moves, never the two touch targets. */
export function MapActivitySwitch2026({ activity, onChange, labels }: {
  activity: Activity;
  onChange: (activity: Activity) => void;
  labels: { group: string; run: string; bike: string };
}) {
  const motion = useControlMotion2026();
  const selectedY = activity === 'bike' ? TARGET : 0;
  const y = useRef(new Animated.Value(selectedY)).current;
  const [focused, setFocused] = useState<Activity | null>(null);

  useEffect(() => {
    y.stopAnimation();
    if (!motion) { y.setValue(selectedY); return; }
    const animation = Animated.spring(y, {
      toValue: selectedY, stiffness: 420, damping: 38, mass: .8,
      overshootClamping: true, useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [motion, selectedY, y]);

  return <View testID="gryd-map-activity-switch" style={styles.rail}
    accessibilityRole="tablist" accessibilityLabel={labels.group} aria-orientation="vertical">
    <MapTranslucent2026 tone="dark" radius={26} />
    <Animated.View testID="gryd-map-activity-selection" pointerEvents="none" accessible={false}
      style={[styles.selection, { transform: [{ translateY: y }] }]}>
      <MapTranslucent2026 tone="light" radius={22} />
    </Animated.View>
    {(['run', 'bike'] as const).map(sport => {
      const selected = activity === sport;
      return <Pressable key={sport} accessibilityRole="tab" accessibilityLabel={labels[sport]}
        accessibilityState={{ selected }} aria-selected={selected}
        onPress={() => onChange(sport)} onFocus={() => setFocused(sport)} onBlur={() => setFocused(null)}
        style={({ pressed }) => [styles.target,
          focused === sport && { borderColor: selected ? c.ink : c.surface },
          pressed && styles.pressed]}>
        <GrydIcon name={sport} size={22} color={selected ? c.ink : c.darkInk} />
      </Pressable>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  rail: { width: TARGET + INSET * 2, padding: INSET, borderRadius: 26 },
  selection: { position: 'absolute', top: INSET, left: INSET, width: TARGET, height: TARGET, borderRadius: 22 },
  target: { width: TARGET, height: TARGET, alignItems: 'center', justifyContent: 'center', borderRadius: 22, borderWidth: 1.5, borderColor: 'transparent' },
  pressed: { opacity: .65 },
});
