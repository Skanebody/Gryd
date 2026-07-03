/**
 * GRYD — RankUpCard : célébration de rang gagné (AMENDEMENT-08 §1, doc §24).
 * « #8 → #7 · Paris League » : reveal animé, ancien rang barré-grisé, nouveau
 * rang en gros, médaille si podium, glow or si top 3 (victoire). Haptic medium
 * au reveal (doc §25). Anti-shame : ne sert QUE les rangs GAGNÉS.
 */
import { useEffect } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, gameColors, radii, spacing } from '@klaim/shared';
import { haptics } from '../../lib/haptics';
import { Icon } from '../Icon';
import { LeagueMedal } from './LeagueMedal';
import { useReveal } from './anim';

export interface RankUpCardProps {
  fromRank: number;
  toRank: number;
  /** Ligue affichée (« Paris League »). */
  leagueLabel: string;
  /** Points au moment du gain (« 1 284 pts »). */
  points?: number;
  /** Joue le reveal + haptic à l'apparition (défaut true). */
  celebrate?: boolean;
  onShare?: () => void;
}

export function RankUpCard({
  fromRank,
  toRank,
  leagueLabel,
  points,
  celebrate = true,
  onShare,
}: RankUpCardProps) {
  const { opacity, scale } = useReveal(celebrate);
  const podium = toRank <= 3;

  useEffect(() => {
    if (celebrate) haptics.medium();
  }, [celebrate]);

  return (
    <Animated.View
      style={[
        styles.card,
        podium && styles.cardPodium,
        celebrate ? { opacity, transform: [{ scale }] } : undefined,
      ]}
    >
      <Text style={styles.kicker}>RANG GAGNÉ</Text>

      <View style={styles.rankRow}>
        <Text style={styles.fromRank}>#{fromRank}</Text>
        <Icon name="niveau" size={20} color={gameColors.crew} />
        <Text style={[styles.toRank, podium && styles.toRankPodium]}>#{toRank}</Text>
        {podium ? <LeagueMedal rank={toRank} size={44} /> : null}
      </View>

      <Text style={styles.league} numberOfLines={1}>
        {leagueLabel}
        {points !== undefined ? ` · ${points.toLocaleString('fr-FR')} pts` : ''}
      </Text>

      {onShare ? (
        <Pressable
          accessibilityRole="button"
          onPress={onShare}
          style={({ pressed }) => [styles.share, pressed && styles.pressed]}
        >
          <Icon name="partage" size={14} color={colors.blanc} />
          <Text style={styles.shareLabel}>Partager</Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
    alignItems: 'center',
    gap: 8,
  },
  // Top 3 : la bordure passe à l'or victoire (état de jeu, pas décor).
  cardPodium: { borderColor: gameColors.gold },
  kicker: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    letterSpacing: 1,
  },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fromRank: {
    color: colors.gris,
    fontSize: fontSizes.xl,
    fontWeight: '600',
    textDecorationLine: 'line-through',
  },
  toRank: { color: gameColors.crew, fontSize: fontSizes.xxl, fontWeight: '800' },
  toRankPodium: { color: gameColors.gold },
  league: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  share: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
  },
  shareLabel: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '600' },
  pressed: { opacity: 0.85 },
});
