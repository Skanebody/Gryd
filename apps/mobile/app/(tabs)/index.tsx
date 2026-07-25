/**
 * GRYD — onglet Carte (home) : la carte EST le produit (SPEC §4.2.1).
 * Vague 1 · E02/E03 : header + sheet (PREMIÈRE MISSION / VOTRE TERRITOIRE) +
 * capsule + CTA RUN sneaker. Pill de contexte et badge notif vivent dans
 * BattleMapOverlays (données réelles uniquement).
 */
import { StyleSheet, View } from 'react-native';
import { colors } from '@klaim/shared';
import { MapScreen } from '../../src/features/map/MapScreen';
import { RunCta } from '../../src/features/nav/RunCta';

export default function CarteTab() {
  return (
    <View style={styles.root}>
      <MapScreen />
      <RunCta />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
});
