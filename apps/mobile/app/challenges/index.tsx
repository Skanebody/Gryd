/**
 * GRYD — Liste des Challenges (AMENDEMENT-07 §8, motivation §17.3-17.6). Solo,
 * crew (coffre) et rivalry, depuis le seed 0012 (features/motivation/demo →
 * @klaim/shared CHALLENGE_SEEDS). Écran POUSSÉ (depuis Aujourd'hui / War Room).
 * Anti-shame (§11) : la jauge montre la progression, jamais un rang ; la rivalry
 * affiche les deux scores côte à côte sans « en retard / tu perds ». Tap → détail.
 */
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, fontSizes, iconSizes, radii, spacing } from '@klaim/shared';
import { screen } from '../../src/lib/analytics';
import { Icon } from '../../src/ui/Icon';
import { ProgressBar } from '../../src/ui/ProgressBar';
import { StackScreen } from '../../src/ui/StackScreen';
import { formatChallengeValue, type ChallengeCard } from '../../src/features/motivation/demo';
import { useChallenges } from '../../src/features/motivation/challengeState';
import {
  CHALLENGE_DIFFICULTY_LABELS,
  CHALLENGE_TYPE_LABELS,
} from '../../src/features/motivation/labels';

const TYPE_ICON = { solo: 'aujourdhui', crew: 'crew', rivalry: 'cible' } as const;

function Row({ c }: { c: ChallengeCard }) {
  const isRivalry = c.type === 'rivalry';
  const pct = c.target > 0 ? c.current / c.target : 0.5;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={c.name}
      onPress={() => router.push(`/challenges/${c.id}`)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.head}>
        <View style={styles.iconWrap}>
          <Icon name={TYPE_ICON[c.type as keyof typeof TYPE_ICON] ?? 'mission'} size={20} color={colors.blanc} />
        </View>
        <View style={styles.headText}>
          <Text style={styles.name}>{c.name}</Text>
          <Text style={styles.meta}>
            {CHALLENGE_TYPE_LABELS[c.type]} · {CHALLENGE_DIFFICULTY_LABELS[c.difficulty]}
          </Text>
        </View>
        <Icon name="chevron" size={16} color={colors.gris} />
      </View>

      {isRivalry ? (
        // Deux camps côte à côte — respect, pas de « perdant ».
        <View style={styles.rivalRow}>
          <View style={styles.rivalSide}>
            <Text style={styles.rivalScore}>{c.rivalMine}</Text>
            <Text style={styles.rivalName}>Ton crew</Text>
          </View>
          <Text style={styles.rivalVs}>vs</Text>
          <View style={styles.rivalSide}>
            <Text style={styles.rivalScore}>{c.rivalOther}</Text>
            <Text style={styles.rivalName}>{c.partnerName}</Text>
          </View>
        </View>
      ) : (
        <>
          <View style={styles.progressNums}>
            <Text style={styles.current}>{formatChallengeValue(c.current, c.unit)}</Text>
            <Text style={styles.target}>
              / {formatChallengeValue(c.target, c.unit)} {c.unit === 'km' ? '' : c.unit}
            </Text>
          </View>
          <ProgressBar value={pct} />
        </>
      )}

      {c.sponsor ? (
        // Mention sponsor DISCRÈTE (§3) : blason filaire + « Offert par … ».
        // Anti pay-to-win : le sponsor n'influe sur aucun chiffre au-dessus.
        <View style={styles.sponsorRow}>
          <Icon name={c.sponsor.blason} size={iconSizes.sm} color={colors.gris} />
          <Text style={styles.sponsorText}>Offert par {c.sponsor.name} · entrée gratuite</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export default function ChallengesScreen() {
  useEffect(() => {
    screen('challenges');
  }, []);

  // Catalogue légitime, progression RÉELLE (0 pour un vrai user), démo showcase.
  const challenges = useChallenges();

  return (
    <StackScreen
      title="Challenges"
      icon="mission"
      subtitle="Des objectifs choisis, à ton rythme. La régularité compte autant que la performance."
    >
      {challenges.map((c) => (
        <Row key={c.id} c={c} />
      ))}
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
    marginBottom: 12,
  },
  pressed: { opacity: 0.8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: spacing.sm },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.carbone2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headText: { flex: 1 },
  name: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '600' },
  meta: { color: colors.gris, fontSize: fontSizes.xs, marginTop: spacing.xxs },
  progressNums: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs, marginBottom: 8 },
  current: {
    color: colors.blanc,
    fontSize: fontSizes.lg,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  target: { color: colors.gris, fontSize: fontSizes.sm },
  rivalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  rivalSide: { alignItems: 'center', flex: 1 },
  rivalScore: {
    color: colors.blanc,
    fontSize: fontSizes.xl,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  rivalName: { color: colors.gris, fontSize: fontSizes.xs, marginTop: spacing.xxs },
  rivalVs: { color: colors.gris, fontSize: fontSizes.sm, marginHorizontal: 8 },
  sponsorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: colors.grisLigne,
  },
  sponsorText: { color: colors.gris, fontSize: fontSizes.xs, flex: 1 },
});
