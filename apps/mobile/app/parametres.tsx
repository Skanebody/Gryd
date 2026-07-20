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
import { colors, fontSizes, iconSizes, radii, spacing } from '@klaim/shared';
import { SETTINGS_GROUPS, type SettingsRow } from '../src/features/settings/sections';
import { C } from '../src/i18n/catalog/reglages';
import { useT } from '../src/i18n/store';
import type { Entry } from '../src/i18n/types';
import { screen } from '../src/lib/analytics';
import { Icon } from '../src/ui/Icon';
import { StackScreen } from '../src/ui/StackScreen';
import { SectionLabel } from '../src/features/privacy/ui';

/**
 * Lignes d'explicabilité (AMENDEMENT-23 §B), ajoutées côté écran plutôt que
 * dans le catalogue partagé : elles pointent vers les 2 nouvelles routes
 * (calcul-zones, faq). Icônes propriétaires, détails au tap. Les textes sont
 * des Entries i18n, résolues à l'affichage (structure conservée).
 */
const EXPLAIN_ROWS = [
  {
    href: '/calcul-zones',
    label: C.explainZonesTitle,
    detail: C.explainZonesDetail,
    icon: 'info',
  },
  {
    href: '/faq',
    label: C.explainFaqTitle,
    detail: C.explainFaqDetail,
    icon: 'aide',
  },
] satisfies readonly { href: string; label: Entry; detail: Entry; icon: SettingsRow['icon'] }[];

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
      {/* Icône d'identité de la ligne EN CHARTREUSE (21/07) : la liste était
          entièrement monochrome, donc plate et lente à parcourir. L'accent porte
          le RÔLE « voici le sujet du réglage » (§C) — fond `carbone` (sombre),
          donc jamais de chartreuse sur clair. Le chevron, lui, reste gris :
          c'est une affordance de navigation, pas une identité. */}
      <View style={styles.iconWrap}>
        <Icon name={row.icon} size={iconSizes.md} color={colors.chartreuse} />
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
  const t = useT();
  useEffect(() => {
    screen('parametres');
  }, []);

  return (
    <StackScreen title={t(C.paramsTitle)} icon="reglages" kicker={t(C.paramsKicker)}>
      {SETTINGS_GROUPS.map((group) => (
        <View key={group.label}>
          <SectionLabel>{group.label}</SectionLabel>
          {group.rows.map((row) => (
            <Row key={row.label} row={row} />
          ))}
        </View>
      ))}
      {/* Explicabilité (AMENDEMENT-23 §B) : accès direct aux règles depuis les
          Paramètres, en plus de l'Aide. Détails au tap dans la page dédiée. */}
      <View>
        <SectionLabel>{t(C.paramsSecExplicabilite)}</SectionLabel>
        {EXPLAIN_ROWS.map((row) => (
          <Row
            key={row.href}
            row={{ href: row.href, icon: row.icon, label: t(row.label), detail: t(row.detail) }}
          />
        ))}
      </View>

      {/* Langue (20/07) : une ligne dédiée, pas noyée dans « Course » — c'est le
          réglage qui conditionne la lecture de TOUT le reste. */}
      <View>
        <SectionLabel>{t(C.langueTitle).toUpperCase()}</SectionLabel>
        <Row
          row={{
            href: '/langue',
            icon: 'info',
            label: t(C.langueTitle),
            detail: t(C.langueDetail),
          }}
        />
      </View>
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  // Géométrie de card ALIGNÉE sur Confidentialité (21/07) : même respiration
  // verticale, même retrait horizontal, même écart entre lignes — les écrans de
  // réglages se lisent comme un seul écran, pas comme trois maquettes voisines.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 14,
    paddingHorizontal: spacing.cardPadding - 2,
    marginBottom: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  label: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  detail: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.5,
    marginTop: spacing.xxs,
  },
});
