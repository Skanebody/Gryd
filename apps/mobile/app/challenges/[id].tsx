/**
 * GRYD — Détail d'un Challenge (AMENDEMENT-07 §8, motivation §17.3-17.6). Solo,
 * crew (coffre + minimum perso souple §8.3) et rivalry (deux camps, respect).
 * Écran POUSSÉ, id via useLocalSearchParams. Anti-shame (§11) : le crew montre
 * « tu as contribué à X » (jamais un rang), la rivalry compare les deux scores
 * sans « perdant ».
 *
 * DONNÉES (21/07/2026) : objectif ET progression viennent du serveur
 * (`challengeState` → `challenges` + `challenge_progress`). Conséquence sur les
 * états : tant que la lecture est en cours on affiche un chargement, JAMAIS
 * « ce challenge n'est plus disponible » — cette phrase est une conclusion, et
 * on ne conclut pas avant d'avoir la réponse.
 */
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { colors, fontSizes, iconSizes, radii, spacing } from '@klaim/shared';
import { screen } from '../../src/lib/analytics';
import { Icon } from '../../src/ui/Icon';
import { ProgressBar } from '../../src/ui/ProgressBar';
import { StackScreen } from '../../src/ui/StackScreen';
import { formatChallengeValue } from '../../src/features/motivation/demo';
import { useChallenge } from '../../src/features/motivation/challengeState';
import {
  CHALLENGE_DIFFICULTY_LABELS,
  CHALLENGE_TYPE_LABELS,
  challengeUnitLabel,
  encouragement,
} from '../../src/features/motivation/labels';
import { C } from '../../src/i18n/catalog/motivation';
import { useT } from '../../src/i18n/store';

export default function ChallengeDetailScreen() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { challenge: c, loading } = useChallenge(typeof id === 'string' ? id : undefined);

  useEffect(() => {
    screen('challenge_detail', { id: id ?? '' });
  }, [id]);

  if (loading) {
    return (
      <StackScreen title={t(C.challengeTitle)} icon="mission">
        <ActivityIndicator color={colors.gris} style={styles.loader} />
      </StackScreen>
    );
  }

  if (!c) {
    return (
      <StackScreen title={t(C.challengeTitle)} icon="mission">
        <Text style={styles.empty}>{t(C.challengeUnavailable)}</Text>
      </StackScreen>
    );
  }

  const pct = c.target > 0 ? c.current / c.target : 0.5;
  const remaining = Math.max(0, c.target - c.current);
  const done = c.target > 0 && c.current >= c.target;
  // « {n} » est remplacé au rendu par un <Text> stylé — même place, 5 langues.
  const contribParts = t(C.crewContrib).split('{n}');

  return (
    <StackScreen
      title={c.name}
      icon="mission"
      kicker={`${t(CHALLENGE_TYPE_LABELS[c.type]).toUpperCase()} · ${t(CHALLENGE_DIFFICULTY_LABELS[c.difficulty]).toUpperCase()}`}
    >
      <Text style={styles.blurb}>{c.blurb}</Text>

      {c.type === 'rivalry' ? (
        <View style={styles.card}>
          <Text style={styles.cardKicker}>{t(C.bothSidesKicker)}</Text>
          <View style={styles.rivalRow}>
            <View style={styles.rivalSide}>
              <Text style={styles.rivalScore}>{c.rivalMine}</Text>
              <Text style={styles.rivalName}>{t(C.yourCrew)}</Text>
            </View>
            <Text style={styles.rivalVs}>vs</Text>
            <View style={styles.rivalSide}>
              <Text style={styles.rivalScore}>{c.rivalOther}</Text>
              <Text style={styles.rivalName}>{c.partnerName}</Text>
            </View>
          </View>
          <Text style={styles.hint}>{t(C.rivalryFairPlay)}</Text>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardKicker}>{t(C.progressKicker)}</Text>
          <View style={styles.progressNums}>
            <Text style={styles.current}>{formatChallengeValue(c.current, c.unit)}</Text>
            <Text style={styles.target}>
              / {formatChallengeValue(c.target, c.unit)} {challengeUnitLabel(c.unit)}
            </Text>
          </View>
          <ProgressBar value={pct} />
          <Text style={styles.hint}>
            {encouragement(
              done,
              `${formatChallengeValue(remaining, c.unit)} ${challengeUnitLabel(c.unit)}`.trim(),
            )}
          </Text>
        </View>
      )}

      {c.type === 'crew' ? (
        <View style={styles.card}>
          <Text style={styles.cardKicker}>{t(C.contributionKicker)}</Text>
          <Text style={styles.contrib}>
            {contribParts[0]}
            <Text style={styles.contribNum}>{c.myContrib}</Text>
            {contribParts[1]}
          </Text>
          {c.personalMinimum ? (
            <Text style={styles.hint}>{t(C.teamMinimum, { n: c.personalMinimum })}</Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.rewardRow}>
        <Icon name="coffre" size={iconSizes.md} color={colors.chartreuse} />
        <Text style={styles.rewardText}>{c.reward}</Text>
      </View>

      {c.sponsor ? (
        // Bloc sponsor (§3) : blason discret + « Offert par … » + garde-fou
        // anti pay-to-win explicite. Le sponsor finance des lots/cosmétiques,
        // JAMAIS du territoire, des points ni une victoire ; entrée gratuite.
        <View style={styles.card}>
          <Text style={styles.cardKicker}>{t(C.offeredByKicker)}</Text>
          <View style={styles.sponsorHead}>
            <View style={styles.sponsorBlason}>
              <Icon name={c.sponsor.blason} size={iconSizes.md} color={colors.blanc} />
            </View>
            <Text style={styles.sponsorName}>{c.sponsor.name}</Text>
          </View>
          <Text style={styles.hint}>{c.sponsor.prizeNote}</Text>
          <Text style={styles.hint}>{t(C.sponsorGuard)}</Text>
        </View>
      ) : null}
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  empty: { color: colors.gris, fontSize: fontSizes.md, marginTop: 20 },
  loader: { marginTop: 32 },
  blurb: {
    color: colors.gris,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * 1.5,
    marginTop: 4,
    marginBottom: 16,
  },
  card: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    padding: spacing.cardPadding,
    marginBottom: 12,
  },
  cardKicker: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    marginBottom: 12,
    fontVariant: ['tabular-nums'],
  },
  progressNums: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs, marginBottom: 8 },
  current: {
    color: colors.blanc,
    fontSize: fontSizes.xxl,
    fontWeight: '700',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  target: { color: colors.gris, fontSize: fontSizes.md },
  hint: { color: colors.gris, fontSize: fontSizes.xs, lineHeight: fontSizes.xs * 1.5, marginTop: 12 },
  contrib: { color: colors.blanc, fontSize: fontSizes.md, lineHeight: fontSizes.md * 1.4 },
  contribNum: { color: colors.chartreuse, fontWeight: '700' },
  rivalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: spacing.xs,
  },
  rivalSide: { alignItems: 'center', flex: 1 },
  rivalScore: {
    color: colors.blanc,
    fontSize: fontSizes.xxl,
    fontWeight: '700',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  rivalName: { color: colors.gris, fontSize: fontSizes.sm, marginTop: 4 },
  rivalVs: { color: colors.gris, fontSize: fontSizes.md, marginHorizontal: spacing.xs },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderColor: colors.grisLigne,
  },
  rewardText: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '500', flex: 1 },
  sponsorHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  sponsorBlason: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.carbone2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sponsorName: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '600', flex: 1 },
});
