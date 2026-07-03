/**
 * GRYD — RÉSULTAT DE COURSE (AMENDEMENT-08 §5, doc §10) : LE moment dopamine.
 * Séquence animée en étapes (reveal + haptic par étape, doc §25) : 1 COURSE
 * VALIDÉE + GRYD VERIFIED → 2 +hexes (compteur) → 3 zone modifiée (avant/
 * après) → 4 contribution crew (rang gagné) → 5 bonus performance → 6 BADGE
 * DÉBLOQUÉ (reveal plein écran, glow par tier) → 7 share card. « Passer »
 * saute à la fin ; reduce motion = fondus simples (useReveal/useCountUp).
 * Hors conquête, la séquence s'adapte (AMENDEMENT-07) : social_run = stats +
 * partage sans capture ; course_privee = stats seules, aucun partage.
 * Les stats sont REJOUÉES depuis la simulation déterministe (params mode + t).
 */
import { useEffect, useMemo, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, gameColors, radii, spacing } from '@klaim/shared';
import { EVENTS, screen, track } from '../src/lib/analytics';
import { haptics } from '../src/lib/haptics';
import { Icon } from '../src/ui/Icon';
import { GhostButton } from '../src/ui/GhostButton';
import { formatInt } from '../src/ui/format';
import {
  BadgeCard,
  CrewCrest,
  RankUpCard,
  ShareCard,
  StatePill,
  useCountUp,
  useReduceMotion,
  useReveal,
} from '../src/ui/game';
import {
  BADGE_FAMILIES,
  BADGE_TIER_STYLE,
  badgeById,
  badgeColor,
  type BadgeDef,
} from '../src/features/badges/catalog';
import { BeforeAfterZone } from '../src/features/run/BeforeAfterZone';
import { ResultReveal } from '../src/features/run/ResultReveal';
import {
  buildRunSimulation,
  formatClock,
  formatKm,
  formatPace,
  resultStats,
  runModeFromParam,
  type LiveRunMode,
} from '../src/features/run/simulation';

/** Cadence de la séquence (présentation) — raccourcie si reduce motion. */
const STEP_MS = 1_500;
const STEP_REDUCED_MS = 650;

/**
 * Badge débloqué du SCÉNARIO démo (doc §10 : « Badge Route Opened débloqué »).
 * Mise en scène : cette course ouvre la 10ᵉ route → Route Opened III (tier race).
 * TODO(O1) : brancher la réponse `newBadges` d'ingest_run.
 */
const DEMO_UNLOCKED_BADGE_ID = 'route_opened_3';

type StepId = 'validated' | 'hexes' | 'zone' | 'crew' | 'perf' | 'badge' | 'share' | 'stats';

const STEPS_BY_MODE: Record<LiveRunMode, readonly StepId[]> = {
  conquete: ['validated', 'hexes', 'zone', 'crew', 'perf', 'badge', 'share'],
  social_run: ['validated', 'stats', 'share'],
  course_privee: ['validated', 'stats'],
};

function tickParam(param: string | string[] | undefined, fallback: number): number {
  const raw = Array.isArray(param) ? param[0] : param;
  const n = raw !== undefined ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export default function CourseResultScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ mode?: string; t?: string }>();
  const mode = runModeFromParam(params.mode);
  const sim = useMemo(() => buildRunSimulation(mode), [mode]);
  const tickIndex = tickParam(params.t, sim.ticks.length - 1);
  const stats = useMemo(() => resultStats(sim, tickIndex), [sim, tickIndex]);
  const reduce = useReduceMotion();

  const steps = STEPS_BY_MODE[mode];
  const lastStep = steps.length - 1;
  const badgeIdx = steps.indexOf('badge');
  const [step, setStep] = useState(0);

  const badge = mode === 'conquete' ? badgeById(DEMO_UNLOCKED_BADGE_ID) : undefined;
  const badgeFamily = badge ? BADGE_FAMILIES.find((f) => f.id === badge.family) : undefined;

  useEffect(() => {
    screen('course_result', { mode });
    track(EVENTS.celebrationViewed, { mode });
  }, [mode]);

  // Avance automatique — PAUSE sur le badge plein écran (le joueur savoure).
  useEffect(() => {
    if (step >= lastStep) return;
    if (badgeIdx >= 0 && step === badgeIdx) return;
    const id = setTimeout(
      () => setStep((s) => Math.min(s + 1, lastStep)),
      reduce ? STEP_REDUCED_MS : STEP_MS,
    );
    return () => clearTimeout(id);
  }, [step, lastStep, badgeIdx, reduce]);

  const reached = (id: StepId) => {
    const i = steps.indexOf(id);
    return i >= 0 && step >= i;
  };
  const skip = () => {
    haptics.light();
    setStep(lastStep);
  };
  const goMap = () => router.replace('/(tabs)');
  const share = () => {
    haptics.light();
    track(EVENTS.shareCardGenerated);
  };

  const conquest = mode === 'conquete';
  const isPrivate = mode === 'course_privee';

  return (
    <View style={[styles.root, { paddingTop: insets.top + 10 }]}>
      {/* Barre : kicker + Passer (visible tant que la séquence n'est pas finie). */}
      <View style={styles.bar}>
        <Text style={styles.barKicker}>RÉSULTAT DE COURSE</Text>
        {step < lastStep ? (
          <Pressable accessibilityRole="button" onPress={skip} hitSlop={10} style={styles.skip}>
            <Text style={styles.skipLabel}>Passer</Text>
          </Pressable>
        ) : (
          <View style={styles.skip} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 1 — Course validée + GRYD VERIFIED. */}
        <ResultReveal visible={reached('validated')} haptic="success" style={styles.block}>
          <View style={styles.validated}>
            <Text style={styles.validatedTitle}>
              {isPrivate ? 'COURSE ENREGISTRÉE' : 'COURSE VALIDÉE'}
            </Text>
            {isPrivate ? (
              <StatePill state="statsonly" label="Course privée" />
            ) : stats.verified ? (
              <StatePill state="verified" label="GRYD VERIFIED" />
            ) : (
              <StatePill state="statsonly" label="Stats enregistrées" />
            )}
            <Text style={styles.validatedSub}>
              {isPrivate
                ? 'Visible par toi seul. Aucune capture, aucun partage.'
                : `Effort vérifié — GPS ${stats.gpsTrust} · Motion ${stats.motionTrust}.`}
            </Text>
          </View>
        </ResultReveal>

        {/* 2 — +HEXES (compteur qui monte). */}
        {conquest ? (
          <ResultReveal visible={reached('hexes')} style={styles.block}>
            <View style={styles.hexBlock}>
              <HexCountUp value={stats.hexes} />
              <Text style={styles.hexLabel}>HEXES CAPTURÉS</Text>
              <Text style={styles.hexSub}>
                ≈ {formatInt(stats.basePoints)} pts estimés — confirmés par le serveur.
              </Text>
            </View>
          </ResultReveal>
        ) : null}

        {/* Stats (social / privé) — la distance domine. */}
        {!conquest ? (
          <ResultReveal visible={reached('stats')} style={styles.block}>
            <View style={styles.statsCard}>
              <Text style={styles.statsHero}>
                {formatKm(stats.distanceM)}
                <Text style={styles.statsHeroUnit}> km</Text>
              </Text>
              <View style={styles.statsRow}>
                <MiniStat label="TEMPS" value={formatClock(stats.durationS)} />
                <MiniStat label="ALLURE" value={`${formatPace(stats.paceSPerKm)}/km`} />
              </View>
              <Text style={styles.statsNote}>
                {isPrivate
                  ? 'Course privée — rien n\'apparaît sur la carte ni dans le feed.'
                  : 'Social Run — stats et badges comptent, aucune capture.'}
              </Text>
            </View>
          </ResultReveal>
        ) : null}

        {/* 3 — Zone modifiée (avant / après). */}
        {conquest ? (
          <ResultReveal visible={reached('zone')} style={styles.block}>
            <Text style={styles.stepKicker}>ZONE MODIFIÉE</Text>
            <BeforeAfterZone
              zoneName={stats.zoneName}
              pctBefore={stats.zonePctBefore}
              pctAfter={stats.zonePctAfter}
            />
          </ResultReveal>
        ) : null}

        {/* 4 — Contribution crew : la zone monte ; rang gagné SEULEMENT si la
            course couvre assez du scénario (stats.rankGained — démo écourtée
            = contribution de zone seule, sans RankUpCard). */}
        {conquest ? (
          <ResultReveal visible={reached('crew')} style={styles.block}>
            <Text style={styles.stepKicker}>CONTRIBUTION CREW</Text>
            <View style={styles.crewLine}>
              <CrewCrest seed={stats.crewName} name={stats.crewName} size="s" />
              <Text style={styles.crewText}>
                {stats.zoneName} passe à{' '}
                <Text style={styles.crewPct}>{stats.zonePctAfter} %</Text>
                {stats.rankGained
                  ? ` — ${stats.crewName} gagne 1 rang.`
                  : ` — chaque hex compte pour ${stats.crewName}.`}
              </Text>
            </View>
            {stats.rankGained ? (
              <RankUpCard
                fromRank={stats.crewRankBefore}
                toRank={stats.crewRankAfter}
                leagueLabel="PARIS LEAGUE · CREWS"
                points={stats.totalPoints}
                celebrate={false}
              />
            ) : null}
          </ResultReveal>
        ) : null}

        {/* 5 — Bonus performance (borné par les règles §3). */}
        {conquest ? (
          <ResultReveal visible={reached('perf')} style={styles.block}>
            <View style={styles.perfCard}>
              <Icon name="performance" size={22} color={gameColors.crew} />
              <View style={styles.perfTextWrap}>
                <Text style={styles.perfTitle}>+{stats.bonusPct} % bonus performance</Text>
                <Text style={styles.perfSub}>
                  {formatInt(stats.basePoints)} → {formatInt(stats.totalPoints)} pts — ton allure
                  progresse.
                </Text>
              </View>
            </View>
          </ResultReveal>
        ) : null}

        {/* 6 — Badge (version inline une fois le plein écran passé). */}
        {conquest && badge && badgeFamily && badgeIdx >= 0 && step > badgeIdx ? (
          <ResultReveal visible haptic="none" style={styles.block}>
            <Text style={styles.stepKicker}>BADGE DÉBLOQUÉ</Text>
            <BadgeCard
              name={badge.name}
              family={badge.family}
              familyLabel={badgeFamily.name}
              familyColor={badgeColor(badge)}
              tier={badge.tier}
              state="unlocked"
              requirement={badge.requirement}
              reward="Frame de profil Routes"
            />
          </ResultReveal>
        ) : null}

        {/* 7 — Share card + actions. */}
        {!isPrivate ? (
          <ResultReveal visible={reached('share')} style={styles.block}>
            <Text style={styles.stepKicker}>PARTAGE</Text>
            <ShareCard
              stat={conquest ? `+${formatInt(stats.hexes)}` : `${formatKm(stats.distanceM)} km`}
              statLabel={conquest ? 'HEXES CAPTURÉS' : 'SOCIAL RUN'}
              title={`${stats.playerName} · ${stats.crewName}`}
              subtitle={
                conquest
                  ? `${stats.zoneName} passe à ${stats.zonePctAfter} %`
                  : `${formatClock(stats.durationS)} · ${formatPace(stats.paceSPerKm)}/km`
              }
            >
              <CrewCrest seed={stats.crewName} name={stats.crewName} size="m" />
            </ShareCard>
          </ResultReveal>
        ) : null}

        {/* Actions finales. */}
        <ResultReveal visible={step >= lastStep} haptic="none" style={styles.actions}>
          {!isPrivate ? (
            <Pressable
              accessibilityRole="button"
              onPress={share}
              style={({ pressed }) => [styles.shareButton, pressed && styles.pressed]}
            >
              <Icon name="partage" size={18} color={colors.noir} />
              <Text style={styles.shareLabel}>
                {conquest ? 'Partager la conquête' : 'Partager la sortie'}
              </Text>
            </Pressable>
          ) : null}
          <GhostButton label="Voir la carte" icon="carte" onPress={goMap} />
        </ResultReveal>
      </ScrollView>

      {/* 6 — BADGE DÉBLOQUÉ plein écran (pause : Continuer pour la suite). */}
      {conquest && badge && badgeFamily && badgeIdx >= 0 && step === badgeIdx ? (
        <BadgeOverlay
          badge={badge}
          familyLabel={badgeFamily.name}
          familyColor={badgeColor(badge)}
          onContinue={() => {
            haptics.light();
            setStep(badgeIdx + 1);
          }}
        />
      ) : null}
    </View>
  );
}

/** Compteur « +214 » qui monte (useCountUp — saut direct si reduce motion). */
function HexCountUp({ value }: { value: number }) {
  const display = useCountUp(value);
  return <Text style={styles.hexHero}>+{formatInt(display)}</Text>;
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniStatValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.miniStatLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** Reveal plein écran du badge — glow par tier (BADGE_TIER_STYLE), haptic medium. */
function BadgeOverlay({
  badge,
  familyLabel,
  familyColor,
  onContinue,
}: {
  badge: BadgeDef;
  familyLabel: string;
  familyColor: string;
  onContinue: () => void;
}) {
  const { opacity, scale } = useReveal(true);
  const tier = BADGE_TIER_STYLE[badge.tier];
  const glow = tier.glow ?? tier.ring;
  useEffect(() => {
    // Grammaire §25 : badge Race/Carbon = medium (Legend serait heavy).
    if (badge.tier === 'legend') haptics.heavy();
    else haptics.medium();
  }, [badge.tier]);
  return (
    <View style={styles.overlay}>
      <Animated.View style={[styles.overlayInner, { opacity, transform: [{ scale }] }]}>
        <Text style={styles.overlayKicker}>BADGE DÉBLOQUÉ</Text>
        <View
          style={[
            styles.badgeGlow,
            { borderColor: tier.ring, shadowColor: glow, shadowOpacity: tier.glow ? 0.8 : 0.4 },
          ]}
        >
          <BadgeCard
            name={badge.name}
            family={badge.family}
            familyLabel={familyLabel}
            familyColor={familyColor}
            tier={badge.tier}
            state="unlocked"
            requirement={badge.requirement}
            reward="Frame de profil Routes"
          />
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onContinue}
          style={({ pressed }) => [styles.continueButton, pressed && styles.pressed]}
        >
          <Text style={styles.continueLabel}>Continuer</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.cardPadding,
    paddingBottom: 8,
  },
  barKicker: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    letterSpacing: 2,
  },
  skip: { minWidth: 56, alignItems: 'flex-end' },
  skipLabel: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  content: { paddingHorizontal: spacing.cardPadding, gap: 18, paddingTop: 8 },
  block: { gap: 10 },
  pressed: { opacity: 0.75 },

  stepKicker: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    letterSpacing: 2,
  },

  validated: { alignItems: 'center', gap: 10, paddingVertical: 8 },
  validatedTitle: {
    color: colors.blanc,
    fontSize: fontSizes.xl,
    fontWeight: '800',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  validatedSub: { color: colors.gris, fontSize: fontSizes.sm, textAlign: 'center' },

  hexBlock: { alignItems: 'center', gap: 4, paddingVertical: 6 },
  hexHero: {
    color: colors.chartreuse,
    fontSize: fontSizes.hero,
    fontWeight: '800',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  hexLabel: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '700',
    letterSpacing: 2,
  },
  hexSub: { color: colors.gris, fontSize: fontSizes.xs, textAlign: 'center' },

  statsCard: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
    gap: 12,
  },
  statsHero: {
    color: colors.blanc,
    fontSize: fontSizes.xxl,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  statsHeroUnit: { color: colors.gris, fontSize: fontSizes.lg, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 12 },
  miniStat: { flex: 1, gap: 2 },
  miniStatValue: {
    color: colors.blanc,
    fontSize: fontSizes.lg,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  miniStatLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    letterSpacing: 1,
  },
  statsNote: { color: colors.gris, fontSize: fontSizes.xs, lineHeight: 16 },

  crewLine: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  crewText: { color: colors.blanc, fontSize: fontSizes.sm, flex: 1, lineHeight: 20 },
  crewPct: { color: colors.chartreuse, fontWeight: '800' },

  perfCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: gameColors.carbon,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: 14,
  },
  perfTextWrap: { flex: 1, gap: 2 },
  perfTitle: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '700' },
  perfSub: { color: colors.gris, fontSize: fontSizes.xs },

  actions: { gap: 10, marginTop: 4 },
  shareButton: {
    height: 54,
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  // Libellé NOIR sur chartreuse (charte — jamais de chartreuse sur fond clair).
  shareLabel: { color: colors.noir, fontSize: fontSizes.md, fontWeight: '800' },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.noir,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.cardPadding,
  },
  overlayInner: { alignSelf: 'stretch', alignItems: 'center', gap: 18 },
  overlayKicker: {
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontWeight: '800',
    letterSpacing: 3,
  },
  badgeGlow: {
    alignSelf: 'stretch',
    borderRadius: radii.card,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 28,
    elevation: 12,
  },
  continueButton: {
    height: 48,
    minWidth: 180,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  continueLabel: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
});
