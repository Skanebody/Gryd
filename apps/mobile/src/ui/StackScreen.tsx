/**
 * GRYD — gabarit d'écran POUSSÉ par-dessus les tabs (Arsenal, Sources, Support,
 * Crew Discovery). Comme TabScreen mais avec une barre de retour (chevron
 * inversé + titre) au lieu du gros titre display : ces écrans sont secondaires
 * (§7.11/§7.13/§7.15/§46). Fond noir, scroll, dégagement bas standard. Le
 * retour utilise router.back() (pile expo-router).
 */
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, spacing, type IconName } from '@klaim/shared';
import { TAB_CONTENT_BOTTOM_CLEARANCE } from '../features/nav/metrics';
import { Icon } from './Icon';

interface StackScreenProps {
  title: string;
  /** Icône filaire d'en-tête (charte §F) — à gauche du titre de barre. */
  icon?: IconName;
  /** Sur-titre mono gris optionnel sous la barre. */
  kicker?: string;
  subtitle?: string;
  children: ReactNode;
}

export function StackScreen({ title, icon, kicker, subtitle, children }: StackScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <View style={[styles.bar, { paddingTop: insets.top + 10 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retour"
          hitSlop={12}
          onPress={() => router.back()}
          style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
        >
          {/* Chevron pointé à gauche (le tracé pointe à droite → miroir). */}
          <View style={styles.mirror}>
            <Icon name="chevron" size={22} color={colors.blanc} />
          </View>
        </Pressable>
        <View style={styles.barTitleWrap}>
          {icon ? <Icon name={icon} size={20} color={colors.blanc} /> : null}
          <Text style={styles.barTitle} numberOfLines={1}>
            {title}
          </Text>
        </View>
        {/* Cale symétrique pour centrer visuellement le titre. */}
        <View style={styles.back} />
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + TAB_CONTENT_BOTTOM_CLEARANCE },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    paddingHorizontal: spacing.cardPadding - 6,
  },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backPressed: { opacity: 0.6 },
  mirror: { transform: [{ scaleX: -1 }] },
  barTitleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  barTitle: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '600', letterSpacing: 0.2 },
  content: { paddingHorizontal: spacing.cardPadding, paddingTop: 6 },
  kicker: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    marginBottom: 8,
    fontVariant: ['tabular-nums'],
  },
  subtitle: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
    marginBottom: 4,
  },
});
