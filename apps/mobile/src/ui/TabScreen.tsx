/**
 * GRYD — gabarit d'onglet (placeholders MVP) : fond noir, kicker mono gris,
 * titre display, scroll avec dégagement bas pour la nav flottante + bouton
 * COURIR permanents (rendus par le layout (tabs)).
 */
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, spacing } from '@klaim/shared';
import { TAB_CONTENT_BOTTOM_CLEARANCE } from '../features/nav/metrics';

interface TabScreenProps {
  title: string;
  /** Sur-titre mono gris (ex. « SAISON 0 · PARIS »). */
  kicker?: string;
  subtitle?: string;
  children: ReactNode;
}

export function TabScreen({ title, kicker, subtitle, children }: TabScreenProps) {
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
        {/* TODO fonts : Space Grotesk 700, tracking -2 % (addendum §E) */}
        <Text style={styles.title}>{title}</Text>
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
  title: {
    color: colors.blanc,
    fontSize: fontSizes.xl,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
    marginTop: 6,
  },
});
