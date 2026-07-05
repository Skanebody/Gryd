/**
 * GRYD — Paramètres (AMENDEMENT-17 §CHANTIER 3). Écran POUSSÉ depuis Profil :
 * une LISTE de sous-pages courtes, chaque ligne = icône + label + chevron. La
 * liste tient (presque) sans scroll ; le détail de chaque réglage est au tap
 * dans sa sous-page. Réglages techniques regroupés sous « Avancé ». Réutilise
 * l'existant : Sources, Arsenal, Support, Confidentialité. Aucun réglage câblé
 * ici — c'est de la navigation. Style dark GRYD, texte court.
 */
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, fontSizes, radii, spacing } from '@klaim/shared';
import { SETTINGS_GROUPS, type SettingsRow } from '../src/features/settings/sections';
import { screen } from '../src/lib/analytics';
import { Icon } from '../src/ui/Icon';
import { StackScreen } from '../src/ui/StackScreen';

function Row({ row }: { row: SettingsRow }) {
  const go = () => {
    if (row.section !== undefined) router.push(`/parametres/${row.section}`);
    else if (row.href !== undefined) router.push(row.href);
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={row.label}
      onPress={go}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.iconWrap}>
        <Icon name={row.icon} size={18} color={colors.blanc} />
      </View>
      <View style={styles.info}>
        <Text style={styles.label} numberOfLines={1}>
          {row.label}
        </Text>
        <Text style={styles.detail} numberOfLines={1}>
          {row.detail}
        </Text>
      </View>
      <Icon name="chevron" size={16} color={colors.gris} />
    </Pressable>
  );
}

export default function ParametresScreen() {
  useEffect(() => {
    screen('parametres');
  }, []);

  return (
    <StackScreen title="Paramètres" icon="reglages" kicker="RÉGLAGES">
      {SETTINGS_GROUPS.map((group) => (
        <View key={group.label}>
          <Text style={styles.groupLabel}>{group.label}</Text>
          {group.rows.map((row) => (
            <Row key={row.label} row={row} />
          ))}
        </View>
      ))}
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  groupLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    marginTop: 24,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 13,
    paddingHorizontal: spacing.cardPadding,
    marginBottom: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  label: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  detail: { color: colors.gris, fontSize: fontSizes.xs, marginTop: 3 },
});
