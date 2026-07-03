/**
 * GRYD — Page « Aujourd'hui » (AMENDEMENT-07 §8, motivation §17.1). Vue Focus Solo :
 * Score Forme, objectif du jour, progression de la semaine, prochaine action et
 * CTA Courir. Écran POUSSÉ (accessible depuis Profil/Carte selon play_style —
 * lien ajouté côté Profil par l'autre agent / entrée depuis la nav). Le disque
 * COURIR global n'est PAS rendu ici (il vit sur les tabs) : le CTA chartreuse de
 * cet écran est donc l'unique accent (§C.3). Anti-shame (§11) partout : jamais de
 * rang négatif, toujours du chemin fait ou une invitation douce.
 *
 * Data démo déterministe (features/motivation/demo). Aucun nombre magique : la
 * cible hebdo vient du seed Consistency (@klaim/shared).
 */
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, fontSizes, radii, spacing } from '@klaim/shared';
import { screen } from '../src/lib/analytics';
import { Icon } from '../src/ui/Icon';
import { ProgressBar } from '../src/ui/ProgressBar';
import { StackScreen } from '../src/ui/StackScreen';
import { TODAY } from '../src/features/motivation/demo';

/** Carte Score Forme — indice santé 0..100, jamais présenté comme un classement. */
function FormScoreCard() {
  return (
    <View style={styles.formCard}>
      <View style={styles.formHead}>
        <Text style={styles.cardKicker}>SCORE FORME</Text>
        <Text style={styles.formLabel}>{TODAY.formLabel}</Text>
      </View>
      <Text style={styles.formScore}>{TODAY.formScore}</Text>
      <ProgressBar value={TODAY.formScore / 100} height={10} />
      <Text style={styles.formHint}>
        Un indicateur perso de ta charge — pas un classement. Il monte avec la régularité, pas la vitesse.
      </Text>
    </View>
  );
}

export default function AujourdhuiScreen() {
  useEffect(() => {
    screen('today');
  }, []);

  const weekPct = TODAY.weekTarget > 0 ? TODAY.weekRuns / TODAY.weekTarget : 1;
  const remainingRuns = Math.max(0, TODAY.weekTarget - TODAY.weekRuns);

  return (
    <StackScreen title="Aujourd'hui" icon="aujourdhui" kicker="FOCUS SOLO">
      <FormScoreCard />

      {/* Objectif du jour — invitation douce, jamais une injonction. */}
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <Icon name="cible" size={18} color={colors.chartreuse} />
          <Text style={styles.cardKicker}>OBJECTIF DU JOUR</Text>
        </View>
        <Text style={styles.goalText}>{TODAY.todayGoal}</Text>
      </View>

      {/* Progression de la semaine — chemin parcouru + reste, sans rang. */}
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <Icon name="serie" size={18} color={colors.blanc} />
          <Text style={styles.cardKicker}>TA SEMAINE</Text>
        </View>
        <View style={styles.weekNums}>
          <Text style={styles.weekBig}>{TODAY.weekRuns}</Text>
          <Text style={styles.weekTarget}>/ {TODAY.weekTarget} courses</Text>
        </View>
        <ProgressBar value={weekPct} />
        <Text style={styles.weekHint}>
          {remainingRuns === 0
            ? 'Objectif de la semaine atteint. Chaque sortie en plus est du bonus.'
            : `Plus que ${remainingRuns} course${remainingRuns > 1 ? 's' : ''} pour boucler ta semaine.`}
        </Text>
      </View>

      {/* Prochaine action suggérée. */}
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <Icon name="performance" size={18} color={colors.blanc} />
          <Text style={styles.cardKicker}>PROCHAINE ACTION</Text>
        </View>
        <Text style={styles.nextAction}>{TODAY.nextAction}</Text>
      </View>

      {/* Lien vers les challenges solo (ghost — l'accent est réservé au CTA Courir). */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Voir mes challenges"
        onPress={() => router.push('/challenges')}
        style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
      >
        <Icon name="mission" size={20} color={colors.blanc} />
        <Text style={styles.linkLabel}>Mes challenges</Text>
        <Icon name="chevron" size={16} color={colors.gris} />
      </Pressable>

      {/* CTA Courir — unique accent chartreuse de l'écran (§C.3). */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Démarrer une course"
        onPress={() => router.replace('/')}
        style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
      >
        <Text style={styles.ctaLabel}>Courir</Text>
      </Pressable>
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  formCard: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
    marginTop: 6,
  },
  formHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  formLabel: { color: colors.chartreuse, fontSize: fontSizes.sm, fontWeight: '600' },
  formScore: {
    color: colors.blanc,
    fontSize: fontSizes.xxl,
    fontWeight: '700',
    letterSpacing: -1,
    marginTop: 4,
    marginBottom: 10,
    fontVariant: ['tabular-nums'],
  },
  formHint: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.5,
    marginTop: 10,
  },

  card: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
    marginTop: 12,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  cardKicker: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },
  goalText: { color: colors.blanc, fontSize: fontSizes.md, lineHeight: fontSizes.md * 1.4 },
  weekNums: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 10 },
  weekBig: {
    color: colors.blanc,
    fontSize: fontSizes.xl,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  weekTarget: { color: colors.gris, fontSize: fontSizes.sm },
  weekHint: { color: colors.gris, fontSize: fontSizes.xs, lineHeight: fontSizes.xs * 1.5, marginTop: 10 },
  nextAction: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '500' },

  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    marginTop: 8,
    borderTopWidth: 1,
    borderColor: colors.grisLigne,
  },
  linkLabel: { flex: 1, color: colors.blanc, fontSize: fontSizes.md, fontWeight: '500' },

  cta: {
    height: 54,
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  ctaLabel: { color: colors.noir, fontSize: fontSizes.md, fontWeight: '600', letterSpacing: 0.3 },
  pressed: { opacity: 0.85 },
});
