/**
 * GRYD — Liste des Challenges (AMENDEMENT-07 §8, motivation §17.3-17.6). Solo,
 * crew (coffre) et rivalry, depuis le seed 0012 (features/motivation/demo →
 * @klaim/shared CHALLENGE_SEEDS). Écran POUSSÉ (depuis Aujourd'hui / War Room).
 * Anti-shame (§11) : la jauge montre la progression, jamais un rang ; la rivalry
 * affiche les deux scores côte à côte sans « en retard / tu perds ». Tap → détail.
 *
 * ÉTATS (21/07/2026) : la progression vient du serveur (`challengeState`), donc
 * l'écran a quatre situations et pas une seule. Pendant la LECTURE il n'affiche
 * NI cartes NI phrase d'absence — un chargement n'est pas un état vide, et une
 * phrase du type « aucun défi » posée avant la réponse serait fausse la moitié
 * du temps. Ensuite : cartes, ou l'une des trois raisons (pas de compte, serveur
 * injoignable, aucun défi actif), chacune avec sa propre copie.
 */
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, fontSizes, iconSizes, radii, spacing } from '@klaim/shared';
import { screen } from '../../src/lib/analytics';
import { GhostButton } from '../../src/ui/GhostButton';
import { Icon } from '../../src/ui/Icon';
import { ProgressBar } from '../../src/ui/ProgressBar';
import { StackScreen } from '../../src/ui/StackScreen';
import { formatChallengeValue, type ChallengeCard } from '../../src/features/motivation/demo';
import {
  useChallenges,
  type ChallengesEmptyReason,
} from '../../src/features/motivation/challengeState';
import {
  CHALLENGES_NONE_ACTIVE_BODY,
  CHALLENGES_NONE_ACTIVE_TITLE,
  CHALLENGE_DIFFICULTY_LABELS,
  CHALLENGE_TYPE_LABELS,
  challengeUnitLabel,
} from '../../src/features/motivation/labels';
import { C } from '../../src/i18n/catalog/motivation';
import { useT } from '../../src/i18n/store';

const TYPE_ICON = { solo: 'aujourdhui', crew: 'crew', rivalry: 'cible' } as const;

function Row({ c }: { c: ChallengeCard }) {
  const t = useT();
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
            {t(CHALLENGE_TYPE_LABELS[c.type])} · {t(CHALLENGE_DIFFICULTY_LABELS[c.difficulty])}
          </Text>
        </View>
        <Icon name="chevron" size={16} color={colors.gris} />
      </View>

      {isRivalry ? (
        // Deux camps côte à côte — respect, pas de « perdant ».
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
      ) : (
        <>
          <View style={styles.progressNums}>
            <Text style={styles.current}>{formatChallengeValue(c.current, c.unit)}</Text>
            <Text style={styles.target}>
              / {formatChallengeValue(c.target, c.unit)} {challengeUnitLabel(c.unit)}
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
          <Text style={styles.sponsorText}>{t(C.sponsorLine, { name: c.sponsor.name })}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/**
 * État vide — une seule carte, une seule raison, une seule action au maximum
 * (§A). Les trois raisons ne se ressemblent pas et ne se remplacent pas :
 *   · pas de compte  → on invite à se connecter (GhostButton : le CTA
 *     chartreuse de l'app reste le départ de course) ;
 *   · serveur injoignable → on l'explique, on ne propose rien à tenter ici ;
 *   · aucun défi actif → on le dit comme un fait sur le jeu, sans reprocher au
 *     joueur une absence qui n'est pas la sienne.
 */
function EmptyState({ reason }: { reason: Exclude<ChallengesEmptyReason, 'none'> }) {
  const t = useT();
  const signedOut = reason === 'signedOut';
  const noneActive = reason === 'noneActive';
  const title = noneActive
    ? CHALLENGES_NONE_ACTIVE_TITLE
    : signedOut
      ? C.challengesEmptySignedOutTitle
      : C.challengesEmptyOfflineTitle;
  const body = noneActive
    ? CHALLENGES_NONE_ACTIVE_BODY
    : signedOut
      ? C.challengesEmptySignedOutBody
      : C.challengesEmptyOfflineBody;
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyTitle}>{t(title)}</Text>
      <Text style={styles.emptyBody}>{t(body)}</Text>
      {signedOut ? (
        <View style={styles.emptyAction}>
          <GhostButton label={t(C.todaySignIn)} onPress={() => router.push('/sign-in')} />
        </View>
      ) : null}
    </View>
  );
}

export default function ChallengesScreen() {
  const t = useT();

  useEffect(() => {
    screen('challenges');
  }, []);

  // Défis actifs du serveur + MA progression réelle. `empty` porte la RAISON
  // d'une liste vide : l'écran ne reste jamais muet — mais il ne parle pas non
  // plus avant d'avoir la réponse (`loading`).
  const { challenges, empty, loading } = useChallenges();

  return (
    <StackScreen
      title={t(C.challengesTitle)}
      icon="mission"
      subtitle={t(C.challengesSubtitle)}
    >
      {loading ? (
        <ActivityIndicator color={colors.gris} style={styles.loader} />
      ) : empty === 'none' ? (
        challenges.map((c) => <Row key={c.id} c={c} />)
      ) : (
        <EmptyState reason={empty} />
      )}
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 32 },
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

  // État vide : même carbone que les cards, jamais de card-in-card (§A).
  emptyCard: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
    marginTop: spacing.sm,
  },
  emptyTitle: {
    color: colors.blanc,
    fontSize: fontSizes.lg,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  emptyBody: {
    color: colors.gris,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * 1.5,
    marginTop: spacing.xs,
  },
  emptyAction: { marginTop: spacing.md },
});
