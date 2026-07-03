/**
 * GRYD — COURSE LIVE (AMENDEMENT-09 §3) : navigation type UBER pendant
 * l'effort. La carte plein écran est le cœur de l'écran (LiveNavMap : même
 * basemap quartier que la Battle Map, caméra qui suit le coureur, itinéraire
 * gris peint en chartreuse au fil de la course, hexes conquis au passage,
 * déviation scriptée, destination + checkpoints). AUCUN chiffre sur la carte
 * (anti-bruit) : distance/temps/allure/hexes vivent dans la MapBottomSheet
 * (compact 4 chiffres → semi objectif/checkpoint/récompense/jauges → ouvert
 * splits + états). 3 boutons flottants max : pause/reprendre, recentrer,
 * partager live (démo — jamais de position publique, AMENDEMENT-07). Feedback
 * temps réel scripté : toasts + haptics (zone capturée +N, record segment,
 * déviation, checkpoint, arrivée). Mode via `?mode=` (conquete | social_run |
 * course_privee) — hors conquête : bandeau « Stats uniquement ». Terminer =
 * appui MAINTENU (motion.holdToStopMs, stop protégé §G) → /course-result
 * (inchangé). Le client n'attribue jamais un hex : tout est « estimé ».
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import {
  VERIFIED_MIN_TRUST,
  colors,
  fontSizes,
  gameColors,
  motion,
  radii,
  spacing,
  type IconName,
} from '@klaim/shared';
import { EVENTS, screen, track } from '../src/lib/analytics';
import { haptics } from '../src/lib/haptics';
import { Icon } from '../src/ui/Icon';
import { ProgressBar } from '../src/ui/ProgressBar';
import { formatInt } from '../src/ui/format';
import {
  FloatingMapButton,
  MAP_SHEET_COMPACT_HEIGHT,
  MapBottomSheet,
  StatePill,
  usePulse,
  useSlideIn,
} from '../src/ui/game';
import { LiveNavMap, type LiveNavMapHandle } from '../src/features/run/LiveNavMap';
import {
  NAV_METERS_PER_PIXEL,
  NAV_SCALE_BAR_METERS,
  buildLiveNav,
  etaSecondsAt,
  nextCheckpointAt,
  progressPctAt,
  splitsAt,
  type NavToast,
} from '../src/features/run/liveNav';
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
  liveEventLogAt,
  resultStats,
  runModeFromParam,
} from '../src/features/run/simulation';

/** Marge entre la sheet compacte et l'UI flottante (boutons, échelle). */
const ABOVE_SHEET_GAP = 12;
/** Diamètre du bouton Terminer (appui maintenu) dans la sheet compacte. */
const STOP_BUTTON_SIZE = 48;
/** Distance au checkpoint arrondie à 10 m (lecture nav, pas de fausse précision). */
const CHECKPOINT_ROUND_M = 10;

export default function CourseLiveScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ mode?: string }>();
  const mode = runModeFromParam(params.mode);
  const sim = useMemo(() => buildRunSimulation(mode), [mode]);
  const nav = useMemo(() => buildLiveNav(sim), [sim]);
  const lastIndex = sim.ticks.length - 1;

  const [tickIndex, setTickIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [following, setFollowing] = useState(true);
  const mapRef = useRef<LiveNavMapHandle>(null);
  const finishedRef = useRef(false);

  useEffect(() => {
    screen('course_live', { mode });
  }, [mode]);

  // Horloge de simulation : temps réel accéléré, gelée en pause et à l'arrivée.
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setTickIndex((t) => (t >= lastIndex ? t : t + 1));
    }, SIM_TICK_MS);
    return () => clearInterval(id);
  }, [lastIndex, paused]);

  const tick = sim.ticks[Math.min(tickIndex, lastIndex)] ?? sim.ticks[0]!;
  const simDone = tickIndex >= lastIndex;
  const conquest = mode === 'conquete';
  const elapsedS = (Math.min(tickIndex, lastIndex) + 1) * SIM_SECONDS_PER_TICK;
  const paceSPerKm = tick.distanceM > 0 ? elapsedS / (tick.distanceM / 1000) : 0;
  const zonePct = crewZonePctAt(sim, tickIndex);
  const etaS = etaSecondsAt(sim, tickIndex);
  const pct = progressPctAt(sim, tickIndex);
  const checkpoint = nextCheckpointAt(nav, tickIndex);

  // ── Feedback temps réel scripté : toast + haptic (anti-bruit : 1 à la fois) ─
  const [toast, setToast] = useState<{ key: number; toast: NavToast } | null>(null);
  const toastKeyRef = useRef(0);
  const showToast = (t: NavToast) => {
    toastKeyRef.current += 1;
    setToast({ key: toastKeyRef.current, toast: t });
  };
  useEffect(() => {
    const scripted = nav.toasts.get(tickIndex);
    if (!scripted) return;
    haptics[scripted.haptic]();
    showToast(scripted);
  }, [tickIndex, nav.toasts]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), motion.toastDismissMs);
    return () => clearTimeout(id);
  }, [toast]);

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

  const onStopShortPress = () => {
    // Stop protégé §G : un appui court ne termine jamais — on guide.
    track(EVENTS.runCancelAttempt);
    showToast({
      kind: 'checkpoint',
      text: 'Maintiens pour terminer',
      icon: 'verrou',
      tint: colors.blanc,
      haptic: 'light',
    });
  };

  const togglePause = () => {
    setPaused((p) => !p);
  };

  const shareLive = () => {
    // Démo : AUCUNE position publique (AMENDEMENT-07) — lien fictif copié.
    track(EVENTS.shareCompleted, { channel: 'live_demo' });
    showToast({
      kind: 'checkpoint',
      text: 'Lien de partage copié',
      icon: 'lien',
      tint: colors.blanc,
      haptic: 'light',
    });
  };

  const donePulse = usePulse(simDone, 1.06, 1_600);
  const floatingBottom = insets.bottom + MAP_SHEET_COMPACT_HEIGHT + ABOVE_SHEET_GAP;

  return (
    <View style={styles.root}>
      {/* ── LA CARTE = l'écran (caméra qui suit, itinéraire, hexes conquis) ── */}
      <LiveNavMap
        ref={mapRef}
        nav={nav}
        sim={sim}
        tickIndex={tickIndex}
        capturing={conquest}
        contested={tick.event === 'conteste'}
        onFollowChange={setFollowing}
      />

      {/* ── Pill d'état unique en haut (lecture 1 s — jamais d'empilement) ── */}
      <View style={[styles.topArea, { top: insets.top + 10 }]} pointerEvents="none">
        {tick.event !== null ? (
          <View style={styles.eventPillWrap}>
            <StatePill
              state={LIVE_EVENT_META[tick.event].state}
              label={LIVE_EVENT_META[tick.event].label}
            />
          </View>
        ) : (
          <View style={styles.topPill}>
            <View style={[styles.liveDot, paused && styles.liveDotPaused]} />
            <Text style={styles.topPillText}>
              {paused
                ? 'EN PAUSE'
                : simDone
                  ? 'DESTINATION ATTEINTE'
                  : `ARRIVÉE ${Math.max(1, Math.ceil(etaS / 60))} MIN · ${pct} %`}
            </Text>
          </View>
        )}
        {!conquest ? (
          <View style={styles.statsOnlyPill}>
            <Icon name={mode === 'course_privee' ? 'discret' : 'feed'} size={13} color={colors.gris} />
            <Text style={styles.statsOnlyText}>
              {RUN_MODE_LABEL[mode]} — stats uniquement, aucune capture
            </Text>
          </View>
        ) : null}
      </View>

      {/* ── Toast de feedback scripté (1 seul, remplacé par le suivant) ── */}
      {toast ? (
        <View style={[styles.toastArea, { top: insets.top + (conquest ? 52 : 86) }]} pointerEvents="none">
          <FeedbackToast key={toast.key} toast={toast.toast} />
        </View>
      ) : null}

      {/* ── 3 boutons flottants max (anti-bruit) : pause · recentrer · partager ── */}
      <View style={[styles.floatColumn, { bottom: floatingBottom }]}>
        <PausePlayButton paused={paused} onPress={togglePause} />
        <FloatingMapButton
          icon="gps"
          accessibilityLabel={following ? 'Carte centrée sur toi' : 'Recentrer la carte sur toi'}
          active={following}
          onPress={() => mapRef.current?.recenter()}
        />
        <FloatingMapButton
          icon="partage"
          accessibilityLabel="Partager la course en direct (démo)"
          onPress={shareLive}
        />
      </View>

      {/* ── Échelle graphique discrète (parité échelle coureur) ── */}
      <View style={[styles.scaleBar, { bottom: floatingBottom }]} pointerEvents="none">
        <View style={[styles.scaleLine, { width: NAV_SCALE_BAR_METERS / NAV_METERS_PER_PIXEL }]} />
        <Text style={styles.scaleLabel}>{NAV_SCALE_BAR_METERS} m</Text>
      </View>

      {/* ── Bottom sheet : TOUS les chiffres vivent ici ─────────────────── */}
      <MapBottomSheet
        compactSlot={
          <View style={styles.compactRow}>
            <Stat label="DISTANCE" value={formatKm(tick.distanceM)} unit="km" mono />
            <Stat label="TEMPS" value={formatClock(elapsedS)} mono />
            <Stat label="ALLURE" value={formatPace(paceSPerKm)} mono />
            <Stat
              label="HEXES"
              value={conquest ? formatInt(tick.hexes) : '—'}
              accent={conquest}
            />
            <Animated.View style={{ transform: [{ scale: donePulse }] }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Terminer la course (maintenir)"
                onLongPress={finish}
                delayLongPress={motion.holdToStopMs}
                onPress={onStopShortPress}
                style={({ pressed }) => [
                  styles.stopButton,
                  simDone && styles.stopButtonDone,
                  pressed && styles.stopPressed,
                ]}
              >
                <View style={[styles.stopSquare, simDone && styles.stopSquareDone]} />
              </Pressable>
            </Animated.View>
          </View>
        }
        semiSlot={
          <View style={styles.semiSlot}>
            {/* Prochain checkpoint : virage + distance (« à 200 m ») */}
            <View style={styles.rowCard}>
              <Icon name="virage" size={18} color={colors.blanc} />
              <View style={styles.rowTextWrap}>
                <Text style={styles.rowKicker}>PROCHAIN CHECKPOINT</Text>
                <Text style={styles.rowValue} numberOfLines={1}>
                  {checkpoint.label}
                </Text>
              </View>
              <Text style={styles.rowRight}>
                à {formatInt(Math.max(CHECKPOINT_ROUND_M, Math.round(checkpoint.distanceM / CHECKPOINT_ROUND_M) * CHECKPOINT_ROUND_M))} m
              </Text>
            </View>

            {/* Récompense potentielle (points estimés — le serveur décide) */}
            <View style={styles.rowCard}>
              <Icon name="coffre" size={18} color={conquest ? gameColors.gold : colors.gris} />
              <View style={styles.rowTextWrap}>
                <Text style={styles.rowKicker}>RÉCOMPENSE POTENTIELLE</Text>
                <Text style={styles.rowValue} numberOfLines={1}>
                  {conquest ? `+${formatInt(tick.points)} pts estimés` : 'Aucune (stats uniquement)'}
                </Text>
              </View>
            </View>

            {/* Objectif crew (conquête) */}
            {conquest ? (
              <View style={styles.objectiveCard}>
                <View style={styles.objectiveHead}>
                  <Icon name="cible" size={16} color={gameColors.crew} />
                  <Text style={styles.rowKicker}>OBJECTIF CREW</Text>
                  <Text style={styles.objectivePct}>{zonePct} %</Text>
                </View>
                <Text style={styles.objectiveText}>{sim.crew.objective}</Text>
                <ProgressBar value={zonePct / 100} height={5} />
              </View>
            ) : null}

            {/* GRYD Verify : jauges de confiance */}
            <View style={styles.trustRow}>
              <TrustGauge icon="gps" label="GPS TRUST" value={tick.gpsTrust} />
              <TrustGauge icon="radar" label="MOTION TRUST" value={tick.motionTrust} />
            </View>
          </View>
        }
        openSlot={
          <View style={styles.openSlot}>
            <Text style={styles.sectionKicker}>SPLITS</Text>
            <View style={styles.splitsGrid}>
              {splitsAt(sim, tickIndex).map((s) => (
                <View key={s.km} style={styles.splitCell}>
                  <Text style={styles.splitKm}>KM {s.km}</Text>
                  <Text style={styles.splitPace}>{formatPace(s.paceS)}</Text>
                </View>
              ))}
              {tick.distanceM < 1000 ? (
                <Text style={styles.splitEmpty}>Premier kilomètre en cours…</Text>
              ) : null}
            </View>

            <Text style={styles.sectionKicker}>ÉTATS DU RUN</Text>
            <View style={styles.eventLog}>
              {liveEventLogAt(tickIndex).map((e) => (
                <View key={e.kind} style={styles.eventRow}>
                  <StatePill state={LIVE_EVENT_META[e.kind].state} label={LIVE_EVENT_META[e.kind].label} />
                  <Text style={styles.eventTime}>{formatClock(e.atS)}</Text>
                </View>
              ))}
              {liveEventLogAt(tickIndex).length === 0 ? (
                <Text style={styles.splitEmpty}>Aucun événement pour l'instant.</Text>
              ) : null}
            </View>
          </View>
        }
      />
    </View>
  );
}

/** Compteur net de la sheet compacte (distance/temps/allure/hexes). */
function Stat({
  label,
  value,
  unit,
  accent = false,
  mono = false,
}: {
  label: string;
  value: string;
  unit?: string;
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
        {unit ? <Text style={styles.statUnit}> {unit}</Text> : null}
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
        <Icon name={icon} size={14} color={tint} />
        <Text style={styles.trustLabel}>{label}</Text>
        <Text style={[styles.trustValue, { color: tint }]}>{value}</Text>
      </View>
      <ProgressBar value={value / 100} height={4} fill={tint} />
    </View>
  );
}

/** Toast de feedback live (slide-in, teinte fonctionnelle, auto-dismiss). */
function FeedbackToast({ toast }: { toast: NavToast }) {
  const { opacity, translateY } = useSlideIn(-8);
  return (
    <Animated.View style={[styles.toast, { opacity, transform: [{ translateY }] }]}>
      <Icon name={toast.icon as IconName} size={16} color={toast.tint} />
      <Text style={[styles.toastText, { color: toast.tint }]} numberOfLines={1}>
        {toast.text}
      </Text>
    </Animated.View>
  );
}

/**
 * Pause/reprendre — même gabarit que FloatingMapButton (44 px, carbone),
 * glyphe pause/lecture local (icônes shared sans pictogramme lecteur).
 */
function PausePlayButton({ paused, onPress }: { paused: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={paused ? 'Reprendre la course' : 'Mettre la course en pause'}
      accessibilityState={{ selected: paused }}
      onPress={() => {
        haptics.light();
        onPress();
      }}
      style={({ pressed }) => [
        styles.pauseDisc,
        paused && styles.pauseDiscActive,
        pressed && styles.stopPressed,
      ]}
    >
      <Svg width={20} height={20} viewBox="0 0 20 20">
        {paused ? (
          <Path d="M7 4.5 L15.5 10 L7 15.5 Z" fill={colors.chartreuse} />
        ) : (
          <>
            <Path d="M7 4.5v11" stroke={colors.blanc} strokeWidth={3} strokeLinecap="round" />
            <Path d="M13 4.5v11" stroke={colors.blanc} strokeWidth={3} strokeLinecap="round" />
          </>
        )}
      </Svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },

  topArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 6,
  },
  topPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: gameColors.carbon,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  topPillText: {
    color: colors.blanc,
    fontSize: fontSizes.xs,
    fontWeight: '800',
    letterSpacing: 1.2,
    fontVariant: ['tabular-nums'],
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.chartreuse,
  },
  liveDotPaused: { backgroundColor: colors.gris },
  /** Neutralise l'alignSelf flex-start du StatePill (pill centrée en haut). */
  eventPillWrap: { flexDirection: 'row', justifyContent: 'center' },
  statsOnlyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: gameColors.carbon,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statsOnlyText: { color: colors.gris, fontSize: 11 },

  toastArea: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: gameColors.carbon,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxWidth: 320,
  },
  toastText: { fontSize: fontSizes.sm, fontWeight: '700', letterSpacing: 0.3 },

  floatColumn: { position: 'absolute', right: 14, gap: 10, alignItems: 'center' },
  pauseDisc: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.carbone,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseDiscActive: {
    backgroundColor: colors.chartreuse14,
    borderColor: colors.chartreuse40,
  },

  scaleBar: { position: 'absolute', left: 14 },
  scaleLine: {
    height: 4,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.gris,
    opacity: 0.7,
  },
  scaleLabel: { color: colors.gris, fontSize: 9, marginTop: 3, fontVariant: ['tabular-nums'] },

  // ── Sheet compacte : 4 chiffres nets + Terminer (appui maintenu) ──
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.cardPadding,
    paddingTop: 2,
  },
  stat: { flex: 1, gap: 1 },
  statValue: { color: colors.blanc, fontSize: 17, fontWeight: '800' },
  statValueAccent: { color: colors.chartreuse },
  statValueMono: { fontVariant: ['tabular-nums'] },
  statUnit: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600' },
  statLabel: { color: colors.gris, fontSize: 9.5, fontWeight: '700', letterSpacing: 0.8 },
  stopButton: {
    width: STOP_BUTTON_SIZE,
    height: STOP_BUTTON_SIZE,
    borderRadius: STOP_BUTTON_SIZE / 2,
    borderWidth: 1.5,
    borderColor: 'rgba(250,250,247,0.35)',
    backgroundColor: colors.carbone2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopButtonDone: { borderColor: colors.chartreuse40 },
  stopPressed: { opacity: 0.7 },
  stopSquare: { width: 13, height: 13, borderRadius: 2.5, backgroundColor: colors.blanc },
  stopSquareDone: { backgroundColor: colors.chartreuse },

  // ── Sheet semi : contexte de jeu ──
  semiSlot: { paddingHorizontal: spacing.cardPadding, paddingTop: 14, gap: 8 },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.carbone,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  rowTextWrap: { flex: 1, gap: 1 },
  rowKicker: { color: colors.gris, fontSize: 9.5, fontWeight: '700', letterSpacing: 1.2 },
  rowValue: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '700' },
  rowRight: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  objectiveCard: {
    backgroundColor: colors.carbone,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 6,
  },
  objectiveHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  objectivePct: {
    color: gameColors.crew,
    fontSize: fontSizes.sm,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    marginLeft: 'auto',
  },
  objectiveText: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  trustRow: { flexDirection: 'row', gap: 12, paddingTop: 2 },
  trustGauge: { flex: 1, gap: 5 },
  trustHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trustLabel: { color: colors.gris, fontSize: 9.5, fontWeight: '700', letterSpacing: 0.8, flex: 1 },
  trustValue: { fontSize: fontSizes.sm, fontWeight: '700', fontVariant: ['tabular-nums'] },

  // ── Sheet ouverte : splits + états ──
  openSlot: { paddingHorizontal: spacing.cardPadding, paddingTop: 16, gap: 8 },
  sectionKicker: { color: colors.gris, fontSize: 10, fontWeight: '800', letterSpacing: 1.6 },
  splitsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 6 },
  splitCell: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    backgroundColor: colors.carbone,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  splitKm: { color: colors.gris, fontSize: 10, fontWeight: '700', letterSpacing: 0.6 },
  splitPace: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  splitEmpty: { color: colors.gris, fontSize: fontSizes.xs },
  eventLog: { gap: 6 },
  eventRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eventTime: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontVariant: ['tabular-nums'],
  },
});
