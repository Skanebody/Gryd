/**
 * GRYD — paywall doux (matrice free vs premium).
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, fontSizes, gameColors, radii, spacing } from '@klaim/shared';
import { EVENTS, track } from '../lib/analytics';
import { haptics } from '../lib/haptics';
import { Icon } from './Icon';

export interface SoftPaywallProps {
  title: string;
  body: string;
  /** Contexte analytics (ex. performance, route_planner). */
  trigger: string;
  onLater?: () => void;
}

export function SoftPaywall({ title, body, trigger, onLater }: SoftPaywallProps) {
  const openArsenal = () => {
    haptics.light();
    track(EVENTS.paywallView, { trigger });
    router.push('/arsenal');
  };

  const later = () => {
    haptics.light();
    onLater?.();
  };

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Icon name="coffre" size={18} color={gameColors.crew} />
        <Text style={styles.title}>{title}</Text>
      </View>
      <Text style={styles.body}>{body}</Text>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={openArsenal}
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
        >
          <Text style={styles.ctaLabel}>Voir GRYD Club</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={later}
          style={({ pressed }) => [styles.later, pressed && styles.pressed]}
        >
          <Text style={styles.laterLabel}>Plus tard</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone,
    padding: spacing.cardPadding,
    gap: 10,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '700', flex: 1 },
  body: { color: colors.gris, fontSize: fontSizes.sm, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cta: {
    flex: 1,
    backgroundColor: colors.chartreuse,
    borderRadius: radii.pill,
    paddingVertical: 12,
    alignItems: 'center',
  },
  ctaLabel: { color: colors.noir, fontSize: fontSizes.sm, fontWeight: '800' },
  later: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  laterLabel: { color: colors.gris, fontSize: fontSizes.sm, fontWeight: '600' },
  pressed: { opacity: 0.75 },
});
