/**
 * GRYD — COURSE LIVE (AMENDEMENT-08 §5, doc §9) : faire ressentir que la carte
 * change PENDANT l'effort. Simulation démo déterministe rejouée en accéléré
 * (src/features/run/simulation) : trace qui se dessine, hexes qui s'allument,
 * compteurs distance/temps/allure/hexes/points, jauges GPS & Motion Trust,
 * objectif crew, événements live (GPS faible, zone privée, segment exclu, run
 * groupé, contesté). Mode via `?mode=` (conquete | social_run | course_privee,
 * défaut conquete) — hors conquête : bandeau « Stats uniquement, aucune
 * capture ». Terminer = appui MAINTENU (motion.holdToStopMs, stop protégé §G)
 * → /course-result. Le client n'attribue jamais un hex : tout est « estimé ».
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  VERIFIED_MIN_TRUST,
  colors,
  fontSizes,
  gameColors,
  motion,
  radii,
  spacing,
} from '@klaim/shared';
import { EVENTS, screen, track } from '../src/lib/analytics';
import { haptics } from '../src/lib/haptics';
import { Icon } from '../src/ui/Icon';
import { ProgressBar } from '../src/ui/ProgressBar';
import { formatInt } from '../src/ui/format';
import { StatePill, usePulse, useSlideIn } from '../src/ui/game';
import { LiveHexMap } from '../src/features/run/LiveHexMap';
import {
  LIVE_EVENT_META,
  RUN_MODE_LABEL,
  SIM_SECONDS_PER_TICK,
  SIM_TICK_MS,
  buildRunSimulation,
  crewZonePctAt,
  formatClock,
  formatKm,
  formatPace,
  resultStats,
  runModeFromParam,
  type LiveEventKind,
} from '../src/features/run/simulation';

/** Ping haptique de capture : 1 léger toutes les N hexes (rythme, pas de spam). */
const HEX_PING_EVERY = 25;

export default function CourseLiveScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ mode?: string }>();
  const mode = runModeFromParam(params.mode);
  const sim = useMemo(() => buildRunSimulation(mode), [mode]);
  const lastIndex = sim.ticks.length - 1;

  const [tickIndex, setTickIndex] = useState(0);
  const finishedRef = useRef(false);

  useEffect(() => {
    screen('course_live', { mode });
  }, [mode]);

  // Horloge de simulation : temps réel accéléré, s'arrête au dernier tick.
  useEffect(() => {
    const id = setInterval(() => {
      setTickIndex((t) => (t >= lastIndex ? t : t + 1));
    }, SIM_TICK_MS);
    return () => clearInterval(id);
  }, [lastIndex]);

  const tick = sim.ticks[Math.min(tickIndex, lastIndex)] ?? sim.ticks[0]!;
  const simDone = tickIndex >= lastIndex;
  const conquest = mode === 'conquete';
  const elapsedS = (Math.min(tickIndex, lastIndex) + 1) * SIM_SECONDS_PER_TICK;
  const paceSPerKm = tick.distanceM > 0 ? elapsedS / (tick.distanceM / 1000) : 0;
  const zonePct = crewZonePctAt(sim, tickIndex);

  // Petit ping haptique : palier d'hexes franchi ou nouvel événement live.
  const prevRef = useRef<{ hexes: number; event: LiveEventKind | null }>({
    hexes: 0,
    event: null,
  });
  useEffect(() => {
    const prev = prevRef.current;
    if (Math.floor(tick.hexes / HEX_PING_EVERY) > Math.floor(prev.hexes / HEX_PING_EVERY)) {
      haptics.light();
    }
    if (tick.event !== null && tick.event !== prev.event) haptics.light();
    prevRef.current = { hexes: tick.hexes, event: tick.event };
  }, [tick.hexes, tick.event]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    haptics.success();
    const stats = resultStats(sim, tickIndex);
    track(EVENTS.runComplete, {
      distance: Math.round(stats.distanceM),
      duration: stats.durationS,
      source: 'gps',
    });
    router.replace({ pathname: '/course-result', params: { mode, t: String(tickIndex) } });
  };

  // Anneau pulsé du bouton Terminer quand la démo est finie (invite douce).
  const donePulse = usePulse(simDone, 1.06, 1_600);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 10 }]}>
      {/* En-tête de scène : kicker + mode + état live courant. */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.kicker}>COURSE LIVE</Text>
          <Text style={styles.modeLabel}>{RUN_MODE_LABEL[mode].toUpperCase()}</Text>
        </View>
        {tick.event !== null ? (
          <StatePill state={LIVE_EVENT_META[tick.event].state} label={LIVE_EVENT_META[tick.event].label} />
        ) : (
          <StatePill state="verified" label="Verify actif" />
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <LiveHexMap
          sim={sim}
          tickIndex={tickIndex}
          capturing={conquest}
          contested={tick.event === 'conteste'}
        />

        {/* Bandeau permanent hors conquête (AMENDEMENT-07 : pas de capture). */}
        {!conquest ? (
          <View style={styles.statsOnlyBanner}>
            <Icon name={mode === 'course_privee' ? 'discret' : 'feed'} size={18} color={colors.gris} />
            <Text style={styles.statsOnlyText}>
              Stats uniquement, aucune capture.
              {mode === 'course_privee' ? ' Visible par toi seul.' : ''}
            </Text>
          </View>
        ) : null}

        {/* Événement live courant (slide-in, teinte fonctionnelle). */}
        {tick.event !== null ? <EventBanner key={tick.event} kind={tick.event} /> : null}

        {/* Compteurs — la distance domine (échelle typo §E). */}
        <View style={styles.statsCard}>
          <Text style={styles.heroValue}>
            {formatKm(tick.distanceM)}
            <Text style={styles.heroUnit}> km</Text>
          </Text>
          <View style={styles.statRow}>
            <Stat label="TEMPS" value={formatClock(elapsedS)} mono />
            <Stat label="ALLURE" value={`${formatPace(paceSPerKm)}/km`} mono />
          </View>
          {conquest ? (
            <View style={styles.statRow}>
              <Stat label="HEXES · ESTIMÉS" value={formatInt(tick.hexes)} accent />
              <Stat label="POINTS · ESTIMÉS" value={formatInt(tick.points)} accent />
            </View>
          ) : (
            <View style={styles.statRow}>
              <Stat label="HEXES" value="—" />
              <Stat label="POINTS" value="—" />
            </View>
          )}
        </View>

        {/* GRYD Verify : jauges de confiance GPS + mouvement. */}
        <View style={styles.trustCard}>
          <TrustGauge icon="gps" label="GPS TRUST" value={tick.gpsTrust} />
          <TrustGauge icon="radar" label="MOTION TRUST" value={tick.motionTrust} />
        </View>

        {/* Objectif crew (conquête uniquement). */}
        {conquest ? (
          <View style={styles.objectiveCard}>
            <View style={styles.objectiveHead}>
              <Icon name="cible" size={18} color={gameColors.crew} />
              <Text style={styles.objectiveKicker}>OBJECTIF CREW</Text>
              <Text style={styles.objectivePct}>{zonePct} %</Text>
            </View>
            <Text style={styles.objectiveText}>{sim.crew.objective}</Text>
            <ProgressBar value={zonePct / 100} height={6} />
          </View>
        ) : null}
      </ScrollView>

      {/* Terminer : appui MAINTENU (stop protégé §G — jamais de fin accidentelle). */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        <Animated.View style={{ alignSelf: 'stretch', transform: [{ scale: donePulse }] }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Terminer la course (maintenir)"
            onLongPress={finish}
            delayLongPress={motion.holdToStopMs}
            style={({ pressed }) => [
              styles.finishButton,
              simDone && styles.finishButtonDone,
              pressed && styles.finishPressed,
            ]}
          >
            <Text style={[styles.finishLabel, simDone && styles.finishLabelDone]}>TERMINER</Text>
          </Pressable>
        </Animated.View>
        <Text style={styles.finishHint}>
          {simDone ? 'Course terminée — maintiens pour valider' : 'Maintiens pour terminer'}
        </Text>
      </View>
    </View>
  );
}

/** Compteur secondaire (temps, allure, hexes, points). */
function Stat({
  label,
  value,
  accent = false,
  mono = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
  mono?: boolean;
}) {
  return (
    <View style={styles.stat}>
      <Text
        style={[styles.statValue, accent && styles.statValueAccent, mono && styles.statValueMono]}
        numberOfLines={1}
      >
        {value}
      </Text>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** Jauge de confiance GRYD Verify — bleu verify OK, rouge éteint si dégradé. */
function TrustGauge({ icon, label, value }: { icon: 'gps' | 'radar'; label: string; value: number }) {
  const ok = value >= VERIFIED_MIN_TRUST;
  const tint = ok ? gameColors.verify : gameColors.danger;
  return (
    <View style={styles.trustGauge}>
      <View style={styles.trustHead}>
        <Icon name={icon} size={16} color={tint} />
        <Text style={styles.trustLabel}>{label}</Text>
        <Text style={[styles.trustValue, { color: tint }]}>{value}</Text>
      </View>
      <ProgressBar value={value / 100} height={4} fill={tint} />
    </View>
  );
}

/** Bandeau d'événement live (états doc §9) — slide-in, teinte fonctionnelle. */
function EventBanner({ kind }: { kind: LiveEventKind }) {
  const meta = LIVE_EVENT_META[kind];
  const { opacity, translateY } = useSlideIn(10);
  return (
    <Animated.View
      style={[styles.eventBanner, { borderColor: meta.tint, opacity, transform: [{ translateY }] }]}
    >
      <Icon name={meta.icon} size={18} color={meta.tint} />
      <View style={styles.eventTextWrap}>
        <Text style={[styles.eventLabel, { color: meta.tint }]} numberOfLines={1}>
          {meta.label}
        </Text>
        <Text style={styles.eventDetail} numberOfLines={2}>
          {meta.detail}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.cardPadding,
    paddingBottom: 10,
  },
  headerLeft: { gap: 2 },
  kicker: {
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontWeight: '800',
    letterSpacing: 2,
  },
  modeLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  content: {
    paddingHorizontal: spacing.cardPadding,
    paddingBottom: 16,
    gap: 12,
  },

  statsOnlyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: gameColors.carbon,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  statsOnlyText: { color: colors.gris, fontSize: fontSizes.sm, flex: 1 },

  eventBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: gameColors.carbon,
    borderRadius: radii.card,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  eventTextWrap: { flex: 1, gap: 2 },
  eventLabel: { fontSize: fontSizes.sm, fontWeight: '700', letterSpacing: 0.4 },
  eventDetail: { color: colors.gris, fontSize: fontSizes.xs, lineHeight: 16 },

  statsCard: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
    gap: 14,
  },
  heroValue: {
    color: colors.blanc,
    fontSize: fontSizes.xxl,
    fontWeight: '800',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  heroUnit: { color: colors.gris, fontSize: fontSizes.lg, fontWeight: '600', letterSpacing: 0 },
  statRow: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, gap: 2 },
  statValue: { color: colors.blanc, fontSize: fontSizes.lg, fontWeight: '700' },
  statValueAccent: { color: colors.chartreuse },
  statValueMono: { fontVariant: ['tabular-nums'] },
  statLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    letterSpacing: 1,
  },

  trustCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: gameColors.carbon,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: 14,
  },
  trustGauge: { flex: 1, gap: 6 },
  trustHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trustLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    letterSpacing: 0.8,
    flex: 1,
  },
  trustValue: { fontSize: fontSizes.sm, fontWeight: '700', fontVariant: ['tabular-nums'] },

  objectiveCard: {
    backgroundColor: gameColors.carbon,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: 14,
    gap: 8,
  },
  objectiveHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  objectiveKicker: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    letterSpacing: 1.5,
    flex: 1,
  },
  objectivePct: {
    color: gameColors.crew,
    fontSize: fontSizes.sm,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  objectiveText: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },

  footer: {
    paddingHorizontal: spacing.cardPadding,
    paddingTop: 10,
    gap: 8,
    alignItems: 'center',
  },
  finishButton: {
    alignSelf: 'stretch',
    height: 54,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: 'rgba(250,250,247,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.carbone,
    minWidth: 240,
  },
  finishButtonDone: { borderColor: colors.chartreuse40 },
  finishPressed: { opacity: 0.7 },
  finishLabel: {
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontWeight: '800',
    letterSpacing: 2,
  },
  finishLabelDone: { color: colors.chartreuse },
  finishHint: { color: colors.gris, fontSize: fontSizes.xs },
});
