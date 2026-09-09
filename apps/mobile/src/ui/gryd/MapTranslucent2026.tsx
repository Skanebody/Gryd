import { StyleSheet, View } from 'react-native';
import {
  TranslucentBackdrop2026,
  type TranslucentBackdrop2026Props,
} from './TranslucentBackdrop2026';

/** Compatibility entry point for map controls using the shared flat material. */
export function MapTranslucent2026({ tone = 'dark', radius = 0 }: TranslucentBackdrop2026Props) {
  return <View
    testID={`gryd-map-translucent-${tone}`}
    pointerEvents="none"
    accessible={false}
    accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants"
    style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}
  >
    <TranslucentBackdrop2026 tone={tone} radius={radius} />
  </View>;
}
