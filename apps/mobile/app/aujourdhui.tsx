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
import { Button } from '../src/ui/Button';
import { Icon } from '../src/ui/Icon';
import { ProgressBar } from '../src/ui/ProgressBar';
import { StackScreen } from '../src/ui/StackScreen';
import { BadgeCard, DailyFocusBlock, StreakBlock } from '../src/ui/game';
import { useMyStreak } from '../src/features/social/streak';
import { useDailyFocus } from '../src/features/daily/useDailyFocus';
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
import { useMyProfile } from '../src/features/social/profileStore';
import { useSession } from '../src/lib/session';
import { C } from '../src/i18n/catalog/motivation';
import { useLocale, useT } from '../src/i18n/store';
import type { Locale } from '../src/i18n/types';

/** « 4,8 » — le KPI géant est la distance ; séparateur décimal selon la langue. */
function kmLabel(km: number, locale: Locale): string {
  const s = km.toFixed(1);
  return locale === 'en' ? s : s.replace('.', ',');
}

export default function AujourdhuiScreen() {
  const t = useT();
  const locale = useLocale();

  useEffect(() => {
    screen('today');
  }, []);

  // AMENDEMENT-12 §A : 2 verbes joueur. SOURCE UNIQUE battleContext() — le
  // verbe affiché (card + CTA) et le départ goNow() partagent le même plan.
  const { mode: battleMode, plan } = useMemo(() => battleContext(), []);
  const objectiveTag = battleMode === 'DEFENDRE' ? t(C.objectiveDefend) : t(C.objectiveConquer);

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

  // O1 (états vides) : le prénom, la « situation » (MAP_HUD.zoneName démo) et le
  // bandeau semaine (weekRuns/formScore/coffre crew — aucun câblé au réel) sont de
  // la DÉMO. Un vrai user (session) reçoit un accueil HONNÊTE : son vrai prénom, une
  // situation neutre sans quartier inventé, et pas de faux chiffres de semaine tant
  // que rien n'est câblé (mêmes stats masquées que sur le Profil). Showcase inchangé.
  const { session, configured } = useSession();
  const { profile } = useMyProfile();
  const realUser = configured && !!session;

  // LOT 1 « LA SÉRIE VISIBLE » : la SEULE donnée réelle du bandeau motivation.
  // Dérivée des vraies courses du joueur (features/social/streak) — `null` tant
  // qu'on ne sait rien (pas de session, lecture en cours, aucune course) : dans
  // ce cas le bloc ne s'affiche PAS, plutôt qu'un « 0 » qui ne veut rien dire.
  const { state: streak } = useMyStreak();

  // LOT 3 : Zone du Jour / défi d'accueil. `null` tant qu'on ne sait rien —
  // aucune zone de démonstration ne remplace une zone réelle absente.
  const { focus: dailyFocus } = useDailyFocus();
  const greetingName = realUser ? profile.displayName : TODAY_HERO.greetingName;
  const situation = realUser ? t(C.todayNextRunAwaits) : TODAY_HERO.situation;

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
    <StackScreen title={t(C.todayTitle)} icon="aujourdhui" kicker={t(C.todayKicker)}>
      {/* Bonjour + situation en UNE phrase — le contexte avant la décision. */}
      <Text style={styles.greeting}>{t(C.todayGreeting, { name: greetingName })}</Text>
      <Text style={styles.situation}>{situation}</Text>

      {/* L'OBJECTIF : carte héros ROUTE RECOMMANDÉE (tap → Route Planner). */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(C.todayHeroA11y, {
          objective: objectiveTag,
          name: route.name,
          km: kmLabel(route.distanceKm, locale),
        })}
        onPress={goPlanner}
        style={({ pressed }) => [styles.hero, pressed && styles.pressed]}
      >
        <View style={styles.heroHead}>
          <Icon name="route" size={18} color={colors.chartreuse} />
          <Text style={styles.heroKicker}>
            {t(C.todayRouteKicker)} · <Text style={styles.heroObjective}>{objectiveTag}</Text>
          </Text>
          <Icon name="chevron" size={16} color={colors.gris} />
        </View>

        {/* KPI GÉANT (AMENDEMENT-10 §1) : la distance domine l'écran. */}
        <View style={styles.kpiRow}>
          <Text style={styles.kpi}>{kmLabel(route.distanceKm, locale)}</Text>
          <Text style={styles.kpiUnit}>km</Text>
        </View>

        {/* ≤ 3 infos sur la card : km (KPI) + zones + durée estimée (~). */}
        <View style={styles.metaRow}>
          <Text style={styles.metaStrong}>{t(C.todayZonesPlus, { n: route.zones })}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.meta}>~{route.durationMin} min</Text>
        </View>
        <Text style={styles.heroName}>{route.name}</Text>
      </Pressable>

      {/* LE CTA unique — VERBE contextuel, départ immédiat (AMENDEMENT-29 :
          « GO » retiré ; le libellé = l'objectif du plan du jour). Composant
          Button partagé (audit UI L2) : famille, autoshrink, plancher tactile. */}
      <View style={styles.ctaWrap}>
        <Button
          label={objectiveTag}
          onPress={goNow}
          accessibilityLabel={t(C.todayCtaA11y, { objective: objectiveTag })}
        />
      </View>

      {/* LA SÉRIE (LOT 1) — sous le CTA : elle motive la décision sans la
          concurrencer (aucun bouton, une seule ligne de détail). Elle ne
          s'affiche que si elle est RÉELLE ; sinon rien du tout. */}
      <StreakBlock state={streak} />

      {/* LOT 3 (A-45 §3) — LA raison de revenir aujourd'hui : le parcours
          d'accueil tant qu'il n'est pas fini, puis la Zone du Jour. UN SEUL des
          deux (§A « 1 écran = 1 décision ») — l'arbitrage est dans le hook.
          Aucun CTA ici : le seul CTA chartreuse de l'écran reste le départ.
          Rien n'est affiché sans donnée réelle (showcase / hors session). */}
      <DailyFocusBlock focus={dailyFocus} />

      {/* Bandeau semaine : 3 indicateurs, pas un feed. Aucun n'est câblé au réel
          (O1) — masqué pour un vrai user (comme la stats-row du Profil) plutôt que
          de présenter de la démo comme sa semaine. Showcase : bandeau démo intact. */}
      {realUser ? null : (
        <>
          <View style={styles.weekBand}>
            <View style={styles.weekCell}>
              <Text style={styles.weekValue}>
                {TODAY.weekRuns}
                <Text style={styles.weekTarget}>/{TODAY.weekTarget}</Text>
              </Text>
              <Text style={styles.weekLabel}>{t(C.todayWeekRuns)}</Text>
            </View>
            <View style={styles.weekSep} />
            <View style={styles.weekCell}>
              <Text style={styles.weekValue}>
                {TODAY.formScore}
                <Text style={styles.weekTarget}>/100</Text>
              </Text>
              <Text style={styles.weekLabel}>{t(C.todayWeekForm)}</Text>
            </View>
            <View style={styles.weekSep} />
            <View style={styles.weekCell}>
              <Text style={styles.weekValue}>{t(C.pctValue, { n: TODAY_HERO.crewChestPct })}</Text>
              <Text style={styles.weekLabel}>{t(C.todayWeekChest)}</Text>
            </View>
          </View>
          <ProgressBar
            value={TODAY.weekTarget > 0 ? TODAY.weekRuns / TODAY.weekTarget : 1}
            height={6}
          />
        </>
      )}

      {/* Prochain badge proche — 1 seule carte, invitation douce. */}
      {nextBadge ? (
        <View style={styles.badgeBlock}>
          <Text style={styles.blockKicker}>{t(C.todayNextBadge)}</Text>
          <BadgeCard
            name={nextBadge.def.name}
            family={nextBadge.def.family}
            familyLabel={
              BADGE_FAMILIES.find((f) => f.id === nextBadge.def.family)?.name ??
              t(C.badgeFamilySecret)
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
        accessibilityLabel={t(C.todayMyChallengesA11y)}
        onPress={() => router.push('/challenges')}
        style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
      >
        <Icon name="mission" size={20} color={colors.blanc} />
        <Text style={styles.linkLabel}>{t(C.todayMyChallenges)}</Text>
        <Icon name="chevron" size={16} color={colors.gris} />
      </Pressable>
      {/* D8 : War Room masquée hors MVP. */}
      {flags.warRoom ? (
        <>
          <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(C.todayWarRoomA11y)}
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

  ctaWrap: { marginTop: spacing.sm },

  weekBand: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
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
