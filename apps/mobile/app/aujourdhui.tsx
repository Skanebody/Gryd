/**
 * GRYD — Page « Aujourd'hui » refondue : PORTE D'ENTRÉE quotidienne
 * (AMENDEMENT-10 §4, AMENDEMENT-11 vocabulaire zones/territoires). Règle
 * stricte « un écran = une décision » : 1 objectif (la ROUTE RECOMMANDÉE,
 * KPI géant), 2-3 indicateurs (bandeau semaine : runs · Score Forme · coffre
 * crew), 1 CTA (START RUN → Route Planner), pas de feed. Le prochain badge
 * proche (1 carte compacte) reste une invitation douce, jamais une injonction.
 * Régime usage réel : fond plein, pas de glass, contraste max.
 *
 * Data démo déterministe (features/motivation/demo TODAY + TODAY_HERO,
 * badge dérivé du catalogue + stats démo). Anti-shame (§11) conservé.
 */
import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, fontSizes, radii, spacing } from '@klaim/shared';
import { screen } from '../src/lib/analytics';
import { Icon } from '../src/ui/Icon';
import { ProgressBar } from '../src/ui/ProgressBar';
import { StackScreen } from '../src/ui/StackScreen';
import { BadgeCard } from '../src/ui/game';
import {
  COLLECTION_BADGES,
  BADGE_FAMILIES,
  badgeColor,
  badgeProgress,
  badgeRewardLabel,
} from '../src/features/badges/catalog';
import { UNLOCKED_IDS, demoStat } from '../src/features/badges/demo';
import { TODAY, TODAY_HERO } from '../src/features/motivation/demo';

/** « 4,8 » — le KPI géant est la distance, la virgule est FR. */
function kmLabel(km: number): string {
  return km.toFixed(1).replace('.', ',');
}

export default function AujourdhuiScreen() {
  useEffect(() => {
    screen('today');
  }, []);

  const { route } = TODAY_HERO;

  // Prochain badge proche : top 1 verrouillé non secret par ratio (même calcul
  // que la section « Proches du déblocage » de la Collection — cohérence).
  const nextBadge = useMemo(() => {
    return COLLECTION_BADGES
      .filter((b) => !UNLOCKED_IDS.has(b.id) && !b.secret)
      .map((b) => ({ def: b, prog: badgeProgress(b.id, demoStat(b.metric)) }))
      .filter((x) => x.prog !== null && x.prog.ratio > 0 && !x.prog.unlocked)
      .sort((a, b) => b.prog!.ratio - a.prog!.ratio)[0];
  }, []);

  const goPlanner = () => router.push('/route-planner');

  return (
    <StackScreen title="Aujourd'hui" icon="aujourdhui" kicker="TA JOURNÉE GRYD">
      {/* Bonjour + situation en UNE phrase — le contexte avant la décision. */}
      <Text style={styles.greeting}>BONJOUR {TODAY_HERO.greetingName}</Text>
      <Text style={styles.situation}>{TODAY_HERO.situation}</Text>

      {/* L'OBJECTIF : carte héros ROUTE RECOMMANDÉE (tap → Route Planner). */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Route recommandée : ${route.name}, ${kmLabel(route.distanceKm)} kilomètres`}
        onPress={goPlanner}
        style={({ pressed }) => [styles.hero, pressed && styles.pressed]}
      >
        <View style={styles.heroHead}>
          <Icon name="route" size={18} color={colors.chartreuse} />
          <Text style={styles.heroKicker}>ROUTE RECOMMANDÉE</Text>
          <Icon name="chevron" size={16} color={colors.gris} />
        </View>

        {/* KPI GÉANT (AMENDEMENT-10 §1) : la distance domine l'écran. */}
        <View style={styles.kpiRow}>
          <Text style={styles.kpi}>{kmLabel(route.distanceKm)}</Text>
          <Text style={styles.kpiUnit}>km</Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaStrong}>+{route.zones} zones</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.meta}>{route.durationMin} min</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.meta}>{route.kind}</Text>
        </View>
        <Text style={styles.heroName}>{route.name}</Text>
      </Pressable>

      {/* LE CTA unique — accent chartreuse de l'écran. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Démarrer : ouvrir le Route Planner"
        onPress={goPlanner}
        style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
      >
        <Text style={styles.ctaLabel}>START RUN</Text>
      </Pressable>

      {/* Bandeau semaine : 3 indicateurs, pas un feed. */}
      <View style={styles.weekBand}>
        <View style={styles.weekCell}>
          <Text style={styles.weekValue}>
            {TODAY.weekRuns}
            <Text style={styles.weekTarget}>/{TODAY.weekTarget}</Text>
          </Text>
          <Text style={styles.weekLabel}>RUNS</Text>
        </View>
        <View style={styles.weekSep} />
        <View style={styles.weekCell}>
          <Text style={styles.weekValue}>{TODAY.formScore}</Text>
          <Text style={styles.weekLabel}>SCORE FORME</Text>
        </View>
        <View style={styles.weekSep} />
        <View style={styles.weekCell}>
          <Text style={styles.weekValue}>{TODAY_HERO.crewChestPct} %</Text>
          <Text style={styles.weekLabel}>COFFRE CREW</Text>
        </View>
      </View>
      <ProgressBar value={TODAY.weekTarget > 0 ? TODAY.weekRuns / TODAY.weekTarget : 1} height={6} />

      {/* Prochain badge proche — 1 seule carte, invitation douce. */}
      {nextBadge ? (
        <View style={styles.badgeBlock}>
          <Text style={styles.blockKicker}>PROCHAIN BADGE</Text>
          <BadgeCard
            name={nextBadge.def.name}
            family={nextBadge.def.family}
            familyLabel={
              BADGE_FAMILIES.find((f) => f.id === nextBadge.def.family)?.name ?? 'Secret'
            }
            familyColor={badgeColor(nextBadge.def)}
            tier={nextBadge.def.tier}
            state="locked"
            requirement={nextBadge.def.requirement}
            progress={
              nextBadge.prog
                ? { value: nextBadge.prog.value, threshold: nextBadge.prog.threshold }
                : undefined
            }
            reward={badgeRewardLabel(nextBadge.def)}
            onPress={() => router.push('/badges')}
          />
        </View>
      ) : null}

      {/* Accès existants (ghost — l'accent reste au CTA). */}
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ouvrir la War Room"
        onPress={() => router.push('/warroom')}
        style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
      >
        <Icon name="guerre" size={20} color={colors.blanc} />
        <Text style={styles.linkLabel}>War Room</Text>
        <Icon name="chevron" size={16} color={colors.gris} />
      </Pressable>
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  greeting: {
    color: colors.blanc,
    fontSize: fontSizes.xl,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginTop: 6,
  },
  situation: {
    color: colors.gris,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * 1.4,
    marginTop: 4,
  },

  hero: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
    marginTop: 16,
  },
  heroHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroKicker: {
    flex: 1,
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },
  kpiRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 6 },
  kpi: {
    color: colors.blanc,
    fontSize: fontSizes.hero,
    fontWeight: '700',
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },
  kpiUnit: { color: colors.gris, fontSize: fontSizes.lg, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  metaStrong: { color: colors.chartreuse, fontSize: fontSizes.md, fontWeight: '700' },
  metaDot: { color: colors.gris, fontSize: fontSizes.md },
  meta: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '500' },
  heroName: { color: colors.gris, fontSize: fontSizes.sm, marginTop: 10 },

  cta: {
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  ctaLabel: {
    color: colors.noir,
    fontSize: fontSizes.md,
    fontWeight: '700',
    letterSpacing: 1.2,
  },

  weekBand: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 14,
    marginTop: 16,
    marginBottom: 10,
  },
  weekCell: { flex: 1, alignItems: 'center', gap: 2 },
  weekSep: { width: 1, height: 28, backgroundColor: colors.grisLigne },
  weekValue: {
    color: colors.blanc,
    fontSize: fontSizes.lg,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  weekTarget: { color: colors.gris, fontSize: fontSizes.sm, fontWeight: '500' },
  weekLabel: { color: colors.gris, fontSize: fontSizes.xs - 2, letterSpacing: 1.5 },

  badgeBlock: { marginTop: 18 },
  blockKicker: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    marginBottom: 10,
    fontVariant: ['tabular-nums'],
  },

  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    marginTop: 4,
    borderTopWidth: 1,
    borderColor: colors.grisLigne,
  },
  linkLabel: { flex: 1, color: colors.blanc, fontSize: fontSizes.md, fontWeight: '500' },
  pressed: { opacity: 0.85 },
});
