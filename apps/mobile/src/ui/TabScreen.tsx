/**
 * GRYD — gabarit d'onglet : fond noir, kicker mono, titre display Md,
 * trailing optionnel (ex. ActivityModeToggle), scroll avec dégagement nav.
 */
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, spacing, type IconName } from '@klaim/shared';
import { TAB_CONTENT_BOTTOM_CLEARANCE } from '../features/nav/metrics';
import { Icon } from './Icon';

interface TabScreenProps {
  title: string;
  /** Icône filaire d'en-tête (charte §F) — posée à gauche du titre. */
  icon?: IconName;
  /** Sur-titre mono gris (ex. « SAISON 0 · PARIS »). */
  kicker?: string;
  subtitle?: string;
  /** Coin droit du header (toggle Run/Bike, action…). */
  trailing?: ReactNode;
  children: ReactNode;
}

export function TabScreen({ title, icon, kicker, subtitle, trailing, children }: TabScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 18,
            paddingBottom: insets.bottom + TAB_CONTENT_BOTTOM_CLEARANCE,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
        <View style={styles.titleRow}>
          <View style={styles.titleLeft}>
            {icon ? <Icon name={icon} size={24} color={colors.blanc} /> : null}
            <Text style={styles.title}>{title}</Text>
          </View>
          {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
        </View>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  content: { paddingHorizontal: spacing.cardPadding },
  kicker: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    marginBottom: 10,
    fontVariant: ['tabular-nums'],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  trailing: { flexShrink: 0 },
  title: {
    color: colors.blanc,
    fontSize: fontSizes.xl,
    fontWeight: '500',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
    marginTop: 6,
  },
});