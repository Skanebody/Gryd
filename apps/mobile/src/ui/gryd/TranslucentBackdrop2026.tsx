import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, View } from 'react-native';
import { refonteColors as c } from '@klaim/shared';

export type TranslucentBackdrop2026Tone = 'light' | 'dark';

export interface TranslucentBackdrop2026Props {
  tone?: TranslucentBackdrop2026Tone;
  radius?: number;
}

function useReduceTransparency2026() {
  const [enabled, setEnabled] = useState(Platform.OS === 'ios');

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      const preference = window.matchMedia('(prefers-reduced-transparency: reduce)');
      const update = () => setEnabled(preference.matches);
      update();
      preference.addEventListener?.('change', update);
      if (!preference.addEventListener) preference.addListener(update);
      return () => {
        preference.removeEventListener?.('change', update);
        if (!preference.removeEventListener) preference.removeListener(update);
      };
    }

    if (Platform.OS !== 'ios') return;
    let mounted = true;
    let receivedChange = false;
    void AccessibilityInfo.isReduceTransparencyEnabled()
      .then(value => {
        if (mounted && !receivedChange) setEnabled(value);
      })
      .catch(() => {});
    const listener = AccessibilityInfo.addEventListener('reduceTransparencyChanged', value => {
      receivedChange = true;
      setEnabled(value);
    });
    return () => {
      mounted = false;
      listener.remove();
    };
  }, []);

  return enabled;
}

/** Flat translucent fill behind sharp content. It never blurs or casts a shadow. */
export function TranslucentBackdrop2026({ tone = 'light', radius = 0 }: TranslucentBackdrop2026Props) {
  const reduceTransparency = useReduceTransparency2026();
  const backgroundColor = reduceTransparency
    ? (tone === 'dark' ? c.carbon : c.surface)
    : (tone === 'dark' ? c.translucentDark : c.translucentLight);

  return <View
    testID={`gryd-translucent-${tone}`}
    pointerEvents="none"
    accessible={false}
    accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants"
    style={[StyleSheet.absoluteFill, styles.fill, { borderRadius: radius, backgroundColor }]}
  />;
}

const styles = StyleSheet.create({
  fill: { overflow: 'hidden', shadowOpacity: 0, elevation: 0 },
});
