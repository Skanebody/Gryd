/**
 * GRYD — écran « Mon territoire » plein écran (AMENDEMENT-13 §3) : la VRAIE
 * carte de France (tuiles sombres réelles) avec les possessions en blobs
 * organiques — Paris (scène République) + Lille chartreuse, crew adverse vers
 * Lyon. « Digital twin » : tap sur un territoire → flyTo vers la ville à
 * l'échelle coureur, bouton retour France (tout est dans TerritoryFranceMap).
 * KPI pill au-dessus : zones tenues · villes — DÉRIVÉ des mêmes données que la
 * carte (jamais codé en dur). screen('territoire') au montage (§8, écran sans
 * event dédié). Offline : géré par RealMap (fond noir + message).
 */
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, radii, spacing } from '@klaim/shared';
import { TerritoryFranceMap } from '../src/features/territory/TerritoryFranceMap';
import { franceKpi } from '../src/features/territory/franceTerritories';
import { screen } from '../src/lib/analytics';
import { Icon } from '../src/ui/Icon';
import { formatInt } from '../src/ui/format';

export default function TerritoireScreen() {
  const insets = useSafeAreaInsets();
  const kpi = franceKpi();

  useEffect(() => {
    screen('territoire');
  }, []);

  return (
    <View style={styles.root}>
      {/* ── Header : retour + kicker + KPI pill (au-dessus de la carte) ── */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Revenir au profil"
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}
          >
            <View style={styles.backChevron}>
              <Icon name="chevron" size={20} color={colors.blanc} />
            </View>
          </Pressable>
          <Text style={styles.kicker}>PROFIL · MON TERRITOIRE</Text>
          <View style={styles.back} />
        </View>
        <View style={styles.kpiRow}>
          <View style={styles.kpiPill}>
            <Text style={styles.kpiValue}>
              {formatInt(kpi.totalZones)} zones
              <Text style={styles.kpiCities}> · {kpi.citiesLabel}</Text>
            </Text>
          </View>
        </View>
      </View>

      {/* ── La France réelle, tes vraies zones (monde librement navigable) ── */}
      <TerritoryFranceMap style={styles.map} testID="territoire-france-map" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  pressed: { opacity: 0.7 },
  header: {
    paddingHorizontal: spacing.cardPadding,
    paddingBottom: 12,
    backgroundColor: colors.noir,
  },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 32, alignItems: 'flex-start' },
  backChevron: { transform: [{ scaleX: -1 }] },
  kicker: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 2 },
  kpiRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 12 },
  kpiPill: {
    backgroundColor: colors.carbone,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  kpiValue: {
    color: colors.chartreuse,
    fontSize: fontSizes.sm,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.3,
  },
  kpiCities: { color: colors.blanc, fontWeight: '600' },
  map: { flex: 1 },
});
