/**
 * GRYD — couple E14 : Run/Bike + Solo/Crew (une rangée, gap 8).
 * Réutilisé Carte (sous header), Crew, Classement, Profil, Historique.
 */
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { ActivityModeToggle } from './ActivityModeToggle';
import { SocialScopeToggle } from './SocialScopeToggle';

export function PlayContextToggles({
  locked = false,
  style,
}: {
  locked?: boolean;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.row, style]} accessibilityRole="summary">
      <ActivityModeToggle locked={locked} />
      <SocialScopeToggle locked={locked} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
