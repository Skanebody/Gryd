import { StyleSheet, View } from 'react-native';
import {
  TranslucentBackdrop2026,
  type TranslucentBackdrop2026Props,
} from './TranslucentBackdrop2026';

/** @deprecated Use TranslucentBackdrop2026. Retained as a blur-free compatibility alias. */
export function FrostedBackdrop2026({ tone = 'light', radius = 0 }: TranslucentBackdrop2026Props) {
  return <View
    testID={`gryd-glass-${tone}`}
    pointerEvents="none"
    accessible={false}
    accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants"
    style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}
  >
    <TranslucentBackdrop2026 tone={tone} radius={radius} />
  </View>;
}
