/**
 * GRYD — Page « Aujourd'hui » : PORTE D'ENTRÉE quotidienne (AMENDEMENT-10 §4,
 * AMENDEMENT-11 vocabulaire zones/territoires). Règle stricte « un écran = une
 * décision » : 1 objectif (la ROUTE RECOMMANDÉE, KPI géant), 2-3 indicateurs
 * (bandeau semaine : courses · Score Forme · coffre crew), 1 CTA verbe
 * (AMENDEMENT-29 : « GO » retiré) — le libellé du CTA ET la destination du
 * départ viennent de la MÊME source `battleContext()` (jamais deux lectures
 * divergentes) ; la card route reste tappable vers le Route Planner, outil
 * optionnel. Pas de feed. Le prochain badge proche (1 carte compacte) reste
 * une invitation douce, jamais une injonction. Fond plein, contraste max.
 *
 * Data démo déterministe (features/motivation/demo TODAY + TODAY_HERO,
 * badge dérivé du catalogue + stats démo). Anti-shame (§11) conservé.
 */
import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, fontSizes, radii, spacing } from '@klaim/shared';
import { flags } from '../src/lib/flags';
import { EVENTS, screen, track } from '../src/lib/analytics';
import { haptics } from '../src/lib/haptics';
import { battleContext, goHref } from '../src/features/nav/runContext';
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
import { useMyBadges } from '../src/features/badges/myBadges';
import { TODAY, TODAY_HERO } from '../src/features/motivation/demo';
import { ROUTES_DEMO, routeDurationMin, routeSocialName } from '../src/features/route/demo';

/** « 4,8 » — le KPI géant est la distance, la virgule est FR. */
function kmLabel(km: number): string {
  return km.toFixed(1).replace('.', ',');
}

export default function AujourdhuiScreen() {
  useEffect(() => {
    screen('today');
  }, []);

  // AMENDEMENT-12 §A : 2 verbes joueur. SOURCE UNIQUE battleContext() — le
  // verbe affiché (card + CTA) et le départ goNow() partagent le même plan.
  const { mode: battleMode, plan } = useMemo(() => battleContext(), []);
  const objectiveTag = battleMode === 'DEFENDRE' ? 'DÉFENDRE' : 'CONQUÉRIR';

  // L'app ne ment jamais : la card héros DÉCRIT la course que le CTA lance
  // vraiment. km/zones/durée/nom sont dérivés de LA route du plan (plan.routeId,
  // la même que goNow()), jamais d'un KPI figé qui divergerait du départ réel.
  const route = useMemo(() => {
    const r = ROUTES_DEMO.find((x) => x.id === plan.routeId) ?? ROUTES_DEMO[0];
    return {
      name: r ? routeSocialName(r) : objectiveTag,
      distanceKm: r?.distanceKm ?? 0,
      zones: r?.zones ?? 0,
      durationMin: r ? routeDurationMin(r) : 0,
    };
  }, [plan.routeId, objectiveTag]);

  // Débloqués + progression : réels (user_badges/user_stats) si session, sinon démo.
  const { unlockedIds, stat } = useMyBadges();

  // Prochain badge proche : top 1 verrouillé non secret par ratio (même calcul
  // que la section « Proches du déblocage » de la Collection — cohérence).
  const nextBadge = useMemo(() => {
    return COLLECTION_BADGES
      .filter((b) => !unlockedIds.has(b.id) && !b.secret)
      .map((b) => ({ def: b, prog: badgeProgress(b.id, stat(b.metric)) }))
      .filter((x) => x.prog !== null && x.prog.ratio > 0 && !x.prog.unlocked)
      .sort((a, b) => b.prog!.ratio - a.prog!.ratio)[0];
  }, [unlockedIds, stat]);

  const goPlanner = () => router.push('/route-planner');

  /** Départ immédiat (AMENDEMENT-14 §2) sur le plan auto — zéro question. */
  const goNow = () => {
    haptics.medium();
    track(EVENTS.runStart, { mode: 'conquete', context: battleMode, route: plan.routeId });
    router.push(goHref(plan));
  };

  return (
    <StackScreen title="Aujourd'hui" icon="aujourdhui" kicker="TA JOURNÉE GRYD">
      {/* Bonjour + situation en UNE phrase — le contexte avant la décision. */}
      <Text style={styles.greeting}>BONJOUR {TODAY_HERO.greetingName}</Text>
      <Text style={styles.situation}>{TODAY_HERO.situation}</Text>

      {/* L'OBJECTIF : carte héros ROUTE RECOMMANDÉE (tap → Route Planner). */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Route recommandée — objectif ${objectiveTag} : ${route.name}, ${kmLabel(route.distanceKm)} kilomètres`}
        onPress={goPlanner}
        style={({ pressed }) => [styles.hero, pressed && styles.pressed]}
      >
        <View style={styles.heroHead}>
          <Icon name="route" size={18} color={colors.chartreuse} />
          <Text style={styles.heroKicker}>
            ROUTE RECOMMANDÉE · <Text style={styles.heroObjective}>{objectiveTag}</Text>
          </Text>
          <Icon name="chevron" size={16} color={colors.gris} />
        </View>

        {/* KPI GÉANT (AMENDEMENT-10 §1) : la distance domine l'écran. */}
        <View style={styles.kpiRow}>
          <Text style={styles.kpi}>{kmLabel(route.distanceKm)}</Text>
          <Text style={styles.kpiUnit}>km</Text>
        </View>

        {/* ≤ 3 infos sur la card : km (KPI) + zones + durée estimée (~). */}
        <View style={styles.metaRow}>
          <Text style={styles.metaStrong}>+{route.zones} zones</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.meta}>~{route.durationMin} min</Text>
        </View>
        <Text style={styles.heroName}>{route.name}</Text>
      </Pressable>

      {/* LE CTA unique — VERBE contextuel, départ immédiat (AMENDEMENT-29 :
          « GO » retiré ; le libellé = l'objectif du plan du jour). */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${objectiveTag} — départ immédiat sur le plan du jour`}
        onPress={goNow}
        style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
      >
        <Text style={styles.ctaLabel}>{objectiveTag}</Text>
      </Pressable>

      {/* Bandeau semaine : 3 indicateurs, pas un feed. */}
      <View style={styles.weekBand}>
        <View style={styles.weekCell}>
          <Text style={styles.weekValue}>
            {TODAY.weekRuns}
            <Text style={styles.weekTarget}>/{TODAY.weekTarget}</Text>
          </Text>
          <Text style={styles.weekLabel}>COURSES</Text>
        </View>
        <View style={styles.weekSep} />
        <View style={styles.weekCell}>
          <Text style={styles.weekValue}>
            {TODAY.formScore}
            <Text style={styles.weekTarget}>/100</Text>
          </Text>
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
      {/* D8 : War Room masquée hors MVP. */}
      {flags.warRoom ? (
        <>
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
        </>
      ) : null}
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
  // Étiquette objectif (AMENDEMENT-12 §A) — blanc sur carbone (contraste ok).
  heroObjective: { color: colors.blanc, fontWeight: '700' },
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
  weekLabel: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 1.5 },

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
