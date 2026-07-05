/**
 * GRYD — COURSE LIVE (AMENDEMENT-10 §3 + AMENDEMENT-11) : DEUX modes, Nike
 * d'abord, ZÉRO hexagone visible.
 *   - MODE STATS (défaut) : écran minimal type Nike — fond noir PLEIN, zéro
 *     glass, zéro décor. Distance GÉANTE (fontSizes.heroMax), « +N ZONES »
 *     chartreuse, allure, temps, pill GRYD VERIFIED. Contrôles bas gros,
 *     une main : [Pause] [Carte] [Terminer (appui maintenu)].
 *   - MODE CARTE : la navigation type Uber (LiveNavMap) sur les VRAIES tuiles
 *     (RealMap — AMENDEMENT-16 §0) : la route à suivre + le ruban chartreuse
 *     NET qui S'ÉTEND derrière le coureur le long des vraies rues (zones H3
 *     invisibles — jamais une grille, zéro halo), virage suivant,
 *     destination. Chiffres dans la MapBottomSheet (anti-bruit).
 * La pill ARRIVÉE X MIN · Y % / EN PAUSE reste TOUJOURS visible : un événement
 * (zone privée, GPS faible, contesté…) s'EMPILE dessous — il enrichit la
 * lecture, il ne remplace jamais l'ETA ni l'état pause. Toasts vocabulaire
 * territoire (« Secteur pris · +N zones ») dans les DEUX modes. `?route=<id>`
 * → nom de la route démo en tête. Terminer = appui MAINTENU
 * (motion.holdToStopMs, stop protégé §G) → /course-result (inchangé).
 * Le client n'attribue jamais une zone : tout est « estimé », le serveur
 * (ingest_run) reste seul décideur.
 *
 * AMENDEMENT-15 §2 — sélecteur réel/simulation : sur NATIF avec permission,
 * useRealRun branche le vrai tracker GPS (RealCourseLive) ; sur web ou sans
 * permission, la simulation démo ci-dessous reste INCHANGÉE (une phrase de
 * mode dégradé s'empile en haut si le GPS a été refusé — jamais bloquant).
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
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
  useReduceMotion,
  useSlideIn,
} from '../src/ui/game';
import { LiveNavMap, type LiveNavMapHandle } from '../src/features/run/LiveNavMap';
import { buildRunLoop, loopStatusAt } from '../src/features/run/loop';
import {
  NAV_MAP_METERS_PER_PIXEL,
  NAV_SCALE_BAR_METERS,
  buildLiveNav,
  etaSecondsAt,
  nextCheckpointAt,
  progressPctAt,
  routeInfoFromParam,
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
  type LiveRunMode,
} from '../src/features/run/simulation';
import { useRealRun } from '../src/features/run/gps/useRealRun';
import { RealCourseLive } from '../src/features/run/gps/RealCourseLive';

/** Marge entre la sheet compacte et l'UI flottante (boutons, échelle). */
const ABOVE_SHEET_GAP = 12;
/** Diamètre du bouton Terminer (appui maintenu) dans la sheet compacte. */
const STOP_BUTTON_SIZE = 48;
/** Diamètre des GROS contrôles une-main du mode Stats (Nike). */
const BIG_CONTROL_SIZE = 68;
/** Distance au checkpoint arrondie à 10 m (lecture nav, pas de fausse précision). */
const CHECKPOINT_ROUND_M = 10;

/** Les deux modes d'affichage du live (AMENDEMENT-10 §3 — Nike d'abord). */
type LiveView = 'stats' | 'carte';

/**
 * Saut « +N zones » à la fermeture de boucle (AMENDEMENT-12 §C) : one-shot,
 * scale up puis retour en ressort. Reduce motion → aucun mouvement.
 */
function useZoneJump(active: boolean): Animated.Value {
  const reduce = useReduceMotion();
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!active || reduce) {
      scale.setValue(1);
      return;
    }
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.28,
        duration: motion.transitionMs,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
  }, [active, reduce, scale]);
  return scale;
}

export default function CourseLiveScreen() {
  const params = useLocalSearchParams<{ mode?: string; route?: string }>();
  const mode = runModeFromParam(params.mode);
  // GPS réel (AMENDEMENT-15 §2) : natif + permission → vrai tracker ; web ou
  // refus → simulation démo INCHANGÉE (variante useRealRun.web.ts = stub).
  const gate = useRealRun(mode);
  if (gate.kind === 'starting') {
    // Permission en cours de résolution (natif, quelques instants) : fond noir
    // plein sous la boîte de dialogue système — jamais de démo fantôme derrière.
    return <View style={styles.root} />;
  }
  if (gate.kind === 'real') return <RealCourseLive run={gate.run} />;
  return <DemoCourseLive mode={mode} routeParam={params.route} notice={gate.notice} />;
}

/** Simulation démo (flux historique, INCHANGÉ hors pill de mode dégradé). */
function DemoCourseLive({
  mode,
  routeParam,
  notice,
}: {
  mode: LiveRunMode;
  routeParam: string | string[] | undefined;
  notice: string | null;
}) {
  const insets = useSafeAreaInsets();
  const routeInfo = useMemo(() => routeInfoFromParam(routeParam), [routeParam]);
  const sim = useMemo(() => buildRunSimulation(mode), [mode]);
  // §4ter : la simulation SUIT l'itinéraire ROUTÉ du parcours choisi (`route=`).
  const nav = useMemo(() => buildLiveNav(sim, routeParam), [sim, routeParam]);
  /** Boucle démo (AMENDEMENT-12 §C) — null hors conquête (aucune capture). */
  const loop = useMemo(() => buildRunLoop(sim, nav), [sim, nav]);
  const lastIndex = sim.ticks.length - 1;

  const [view, setView] = useState<LiveView>('stats');
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
  /** GRYD Verify : confiance instantanée ≥ seuil réel (jamais décoratif). */
  const verified = Math.min(tick.gpsTrust, tick.motionTrust) >= VERIFIED_MIN_TRUST;

  // ── Boucle (AMENDEMENT-12 §C) : phase au tick + compteur qui saute ────────
  const loopStatus = loopStatusAt(loop, sim, tickIndex);
  const loopClosed = loopStatus.phase === 'closed';
  const enclosedZones = loopClosed && loop ? loop.enclosedZones : 0;
  /** Zones estimées AFFICHÉES : couloir + intérieur dès la fermeture. */
  const zonesTotal = conquest ? tick.hexes + enclosedZones : 0;
  const zoneJump = useZoneJump(loopClosed);
  /** « départ à ~N m » — même arrondi 10 m que la lecture nav. */
  const loopDistLabel = formatInt(
    Math.max(CHECKPOINT_ROUND_M, Math.round(loopStatus.distM / CHECKPOINT_ROUND_M) * CHECKPOINT_ROUND_M),
  );

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
    // La fermeture de boucle EST l'arrivée de la démo : son burst prime,
    // « Destination atteinte » ne le recouvre jamais (anti-bruit).
    if (loopClosed && (scripted.kind === 'arrivee' || tickIndex === loop?.closeTick)) return;
    haptics[scripted.haptic]();
    showToast(scripted);
  }, [tickIndex, nav.toasts, loopClosed, loop]);
  // Burst « BOUCLE FERMÉE » : toast + haptic FORT, une seule fois (§C).
  useEffect(() => {
    if (!loopClosed || enclosedZones === 0) return;
    haptics.heavy();
    showToast({
      kind: 'boucle',
      text: 'BOUCLE FERMÉE — la zone est à toi',
      icon: 'carte',
      tint: colors.chartreuse,
      haptic: 'heavy',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- transition unique
  }, [loopClosed]);
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
    // Le résultat rejoue la MÊME course : le parcours routé suit (§4ter).
    const routeId = Array.isArray(routeParam) ? routeParam[0] : routeParam;
    router.replace({
      pathname: '/course-result',
      params: routeId
        ? { mode, t: String(tickIndex), route: routeId }
        : { mode, t: String(tickIndex) },
    });
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

  const switchView = (next: LiveView) => {
    haptics.light();
    setView(next);
    screen('live_view_mode', { view: next });
  };

  const donePulse = usePulse(simDone, 1.06, 1_600);
  const floatingBottom = insets.bottom + MAP_SHEET_COMPACT_HEIGHT + ABOVE_SHEET_GAP;
  /** Pill boucle du mode Carte (aperçu « Ferme ta boucle » / état fermé). */
  const loopPillVisible =
    view === 'carte' && conquest && (loopStatus.phase === 'approach' || loopClosed);
  /** Hauteur de la pile de pills du haut (le toast se place dessous). */
  const topStackOffset =
    56 +
    (routeInfo ? 30 : 0) +
    (tick.event !== null ? 38 : 0) +
    (loopPillVisible ? 30 : 0) +
    (!conquest ? 28 : 0);

  return (
    <View style={styles.root}>
      {view === 'carte' ? (
        <>
          {/* ── LA CARTE = l'écran (caméra qui suit, route, territoire qui s'étend) ── */}
          <LiveNavMap
            ref={mapRef}
            nav={nav}
            sim={sim}
            tickIndex={tickIndex}
            capturing={conquest}
            contested={tick.event === 'conteste'}
            loop={loop}
            loopPhase={loopStatus.phase}
            onFollowChange={setFollowing}
          />

          {/* ── 3 boutons flottants max : pause · recentrer · stats ── */}
          <View style={[styles.floatColumn, { bottom: floatingBottom }]}>
            <PausePlayButton paused={paused} onPress={togglePause} />
            <FloatingMapButton
              icon="gps"
              accessibilityLabel={following ? 'Carte centrée sur toi' : 'Recentrer la carte sur toi'}
              active={following}
              onPress={() => mapRef.current?.recenter()}
            />
            <FloatingMapButton
              icon="performance"
              accessibilityLabel="Revenir aux stats"
              onPress={() => switchView('stats')}
            />
          </View>

          {/* ── Échelle graphique discrète (parité échelle coureur) +
               attribution tuiles réelles (AMENDEMENT-16 §0 — obligation
               légale, relogée au-dessus de la sheet comme sur la Battle Map) ── */}
          <View style={[styles.scaleBar, { bottom: floatingBottom }]} pointerEvents="none">
            <View style={[styles.scaleLine, { width: NAV_SCALE_BAR_METERS / NAV_MAP_METERS_PER_PIXEL }]} />
            <Text style={styles.scaleLabel}>{NAV_SCALE_BAR_METERS} m</Text>
            <Text style={styles.attribution}>© OpenStreetMap © CARTO</Text>
          </View>

          {/* ── Bottom sheet : TOUS les chiffres vivent ici ─────────────────── */}
          <MapBottomSheet
            compactSlot={
              <View style={styles.compactRow}>
                <Stat label="DISTANCE" value={formatKm(tick.distanceM)} unit="km" mono />
                <Stat label="TEMPS" value={formatClock(elapsedS)} mono />
                <Stat label="ALLURE" value={formatPace(paceSPerKm)} mono />
                {/* Le compteur SAUTE de +N à la fermeture de boucle (§12 C). */}
                <Animated.View style={[styles.zoneStatWrap, { transform: [{ scale: zoneJump }] }]}>
                  <Stat
                    label="ZONES"
                    value={conquest ? formatInt(zonesTotal) : '—'}
                    accent={conquest}
                  />
                </Animated.View>
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
                      pressed && styles.pressed,
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
        </>
      ) : (
        /* ── MODE STATS (défaut) : Nike épuré, fond noir plein, zéro décor ── */
        <View style={[styles.statsBody, { paddingTop: insets.top + topStackOffset + 26 }]}>
          <View style={styles.statsCenter}>
            <Text style={styles.heroKicker}>DISTANCE</Text>
            <Text style={styles.heroValue} numberOfLines={1} adjustsFontSizeToFit>
              {formatKm(tick.distanceM)}
              <Text style={styles.heroUnit}> KM</Text>
            </Text>

            {conquest ? (
              <Animated.Text
                style={[styles.zonesValue, { transform: [{ scale: zoneJump }] }]}
                numberOfLines={1}
              >
                +{formatInt(zonesTotal)} ZONES
              </Animated.Text>
            ) : null}

            {/* Boucle en texte (mode Stats, §12 C : même info sans carte). */}
            {conquest && loopStatus.phase !== 'none' ? (
              <Text
                style={[styles.loopLine, loopStatus.phase !== 'open' && styles.loopLineAccent]}
                numberOfLines={1}
              >
                {loopClosed
                  ? `BOUCLE FERMÉE · +${formatInt(enclosedZones)} ZONES`
                  : loopStatus.phase === 'approach'
                    ? `FERME TA BOUCLE · DÉPART À ~${loopDistLabel} M`
                    : `BOUCLE OUVERTE · DÉPART À ~${loopDistLabel} M`}
              </Text>
            ) : null}

            <View style={styles.secondaryRow}>
              <View style={styles.secondaryStat}>
                <Text style={styles.secondaryValue}>{formatPace(paceSPerKm)}</Text>
                <Text style={styles.secondaryLabel}>ALLURE /KM</Text>
              </View>
              <View style={styles.secondaryDivider} />
              <View style={styles.secondaryStat}>
                <Text style={styles.secondaryValue}>{formatClock(elapsedS)}</Text>
                <Text style={styles.secondaryLabel}>TEMPS</Text>
              </View>
            </View>

            {verified ? (
              <View style={styles.verifiedPill}>
                <Icon name="bouclier" size={13} color={gameColors.verify} />
                <Text style={styles.verifiedText}>GRYD VERIFIED</Text>
              </View>
            ) : null}
          </View>

          {/* ── Contrôles bas GROS, une main : [Pause] [Carte] [Terminer] ── */}
          <View style={[styles.statsControls, { paddingBottom: insets.bottom + 18 }]}>
            <BigControl
              label={paused ? 'REPRENDRE' : 'PAUSE'}
              accessibilityLabel={paused ? 'Reprendre la course' : 'Mettre la course en pause'}
              active={paused}
              onPress={togglePause}
            >
              <PausePlayGlyph paused={paused} size={24} />
            </BigControl>
            <BigControl
              label="CARTE"
              accessibilityLabel="Afficher la carte de navigation"
              onPress={() => switchView('carte')}
            >
              <Icon name="carte" size={24} color={colors.blanc} />
            </BigControl>
            <View style={styles.bigControlWrap}>
              <Animated.View style={{ transform: [{ scale: donePulse }] }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Terminer la course (maintenir)"
                  onLongPress={finish}
                  delayLongPress={motion.holdToStopMs}
                  onPress={onStopShortPress}
                  style={({ pressed }) => [
                    styles.bigDisc,
                    styles.bigStopDisc,
                    simDone && styles.stopButtonDone,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={[styles.bigStopSquare, simDone && styles.stopSquareDone]} />
                </Pressable>
              </Animated.View>
              <Text style={styles.bigLabel}>TERMINER</Text>
            </View>
          </View>
        </View>
      )}

      {/* ── Pile du haut (2 modes) : route → ETA/pause (TOUJOURS visible) →
           événement (s'empile, ne remplace JAMAIS) → stats only ── */}
      <View style={[styles.topArea, { top: insets.top + 10 }]} pointerEvents="none">
        {routeInfo ? (
          <View style={styles.routePill}>
            <Icon name="route" size={13} color={colors.gris} />
            <Text style={styles.routePillText} numberOfLines={1}>
              {routeInfo.name.toUpperCase()}
              {routeInfo.summary ? `  ·  ${routeInfo.summary}` : ''}
            </Text>
          </View>
        ) : null}
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
        {tick.event !== null ? (
          <View style={styles.eventPillWrap}>
            <StatePill
              state={LIVE_EVENT_META[tick.event].state}
              label={LIVE_EVENT_META[tick.event].label}
            />
          </View>
        ) : null}
        {/* Boucle (mode Carte) : « Ferme ta boucle » à l'approche, état fermé ensuite. */}
        {loopPillVisible ? (
          <View style={styles.loopPill}>
            <Icon name="route" size={13} color={colors.chartreuse} />
            <Text style={styles.loopPillText} numberOfLines={1}>
              {loopClosed
                ? `BOUCLE FERMÉE · +${formatInt(enclosedZones)} ZONES`
                : `FERME TA BOUCLE · À ~${loopDistLabel} M`}
            </Text>
          </View>
        ) : null}
        {!conquest ? (
          <View style={styles.statsOnlyPill}>
            <Icon name={mode === 'course_privee' ? 'discret' : 'feed'} size={13} color={colors.gris} />
            <Text style={styles.statsOnlyText}>
              {RUN_MODE_LABEL[mode]} — stats uniquement, aucune capture
            </Text>
          </View>
        ) : null}
        {/* Mode dégradé GPS (AMENDEMENT-15 §2) : UNE phrase, jamais bloquant. */}
        {notice !== null ? (
          <View style={styles.statsOnlyPill}>
            <Icon name="gps" size={13} color={colors.gris} />
            <Text style={styles.statsOnlyText} numberOfLines={2}>
              {notice}
            </Text>
          </View>
        ) : null}
      </View>

      {/* ── Toast de feedback scripté (1 seul, remplacé par le suivant) ── */}
      {toast ? (
        <View style={[styles.toastArea, { top: insets.top + topStackOffset }]} pointerEvents="none">
          <FeedbackToast key={toast.key} toast={toast.toast} />
        </View>
      ) : null}
    </View>
  );
}

/** Compteur net de la sheet compacte (distance/temps/allure/zones). */
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

/** Glyphe pause/lecture local (icônes shared sans pictogramme lecteur). */
function PausePlayGlyph({ paused, size }: { paused: boolean; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      {paused ? (
        <Path d="M7 4.5 L15.5 10 L7 15.5 Z" fill={colors.chartreuse} />
      ) : (
        <>
          <Path d="M7 4.5v11" stroke={colors.blanc} strokeWidth={3} strokeLinecap="round" />
          <Path d="M13 4.5v11" stroke={colors.blanc} strokeWidth={3} strokeLinecap="round" />
        </>
      )}
    </Svg>
  );
}

/** GROS contrôle une-main du mode Stats (disque 68 px + label court). */
function BigControl({
  label,
  accessibilityLabel,
  active = false,
  onPress,
  children,
}: {
  label: string;
  accessibilityLabel: string;
  active?: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <View style={styles.bigControlWrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ selected: active }}
        onPress={() => {
          haptics.light();
          onPress();
        }}
        style={({ pressed }) => [
          styles.bigDisc,
          active && styles.bigDiscActive,
          pressed && styles.pressed,
        ]}
      >
        {children}
      </Pressable>
      <Text style={styles.bigLabel}>{label}</Text>
    </View>
  );
}

/**
 * Pause/reprendre — même gabarit que FloatingMapButton (44 px, carbone),
 * glyphe pause/lecture local (mode Carte).
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
        pressed && styles.pressed,
      ]}
    >
      <PausePlayGlyph paused={paused} size={20} />
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
  routePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: gameColors.carbon,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingHorizontal: 12,
    paddingVertical: 5,
    maxWidth: 340,
  },
  routePillText: {
    color: colors.gris,
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
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
  // ── Boucle (AMENDEMENT-12 §C) : pill carte + ligne texte du mode Stats ──
  loopPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: gameColors.carbon,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.chartreuse40,
    paddingHorizontal: 12,
    paddingVertical: 5,
    maxWidth: 340,
  },
  loopPillText: {
    color: colors.chartreuse,
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
  },
  loopLine: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '800',
    letterSpacing: 1.2,
    fontVariant: ['tabular-nums'],
    marginTop: 6,
  },
  loopLineAccent: { color: colors.chartreuse },
  /** Le Stat ZONES garde sa part de rangée quand il saute (scale). */
  zoneStatWrap: { flex: 1 },
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

  // ── MODE STATS (Nike) : fond noir plein, KPI géants, contrôles gros ──
  statsBody: { flex: 1, backgroundColor: colors.noir },
  statsCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.cardPadding,
    gap: 4,
  },
  heroKicker: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '800',
    letterSpacing: 2.4,
  },
  heroValue: {
    color: colors.blanc,
    fontSize: fontSizes.heroMax,
    fontWeight: '900',
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },
  heroUnit: {
    color: colors.gris,
    fontSize: fontSizes.xl,
    fontWeight: '800',
    letterSpacing: 0,
  },
  zonesValue: {
    color: colors.chartreuse,
    fontSize: fontSizes.xxl,
    fontWeight: '900',
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 22,
    marginTop: 18,
  },
  secondaryStat: { alignItems: 'center', gap: 2 },
  secondaryValue: {
    color: colors.blanc,
    fontSize: fontSizes.xl,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  secondaryLabel: {
    color: colors.gris,
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  secondaryDivider: { width: 1, height: 30, backgroundColor: colors.grisLigne },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: gameColors.verify,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 16,
  },
  verifiedText: {
    color: gameColors.verify,
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.4,
  },

  statsControls: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 26,
  },
  bigControlWrap: { alignItems: 'center', gap: 7 },
  bigDisc: {
    width: BIG_CONTROL_SIZE,
    height: BIG_CONTROL_SIZE,
    borderRadius: BIG_CONTROL_SIZE / 2,
    backgroundColor: colors.carbone,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigDiscActive: {
    backgroundColor: colors.chartreuse14,
    borderColor: colors.chartreuse40,
  },
  bigStopDisc: {
    backgroundColor: colors.carbone2,
    borderWidth: 1.5,
    borderColor: 'rgba(250,250,247,0.35)',
  },
  bigStopSquare: { width: 18, height: 18, borderRadius: 3.5, backgroundColor: colors.blanc },
  bigLabel: {
    color: colors.gris,
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 1.2,
  },

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
  attribution: { color: colors.gris, opacity: 0.7, fontSize: 9, marginTop: 2 },

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
  pressed: { opacity: 0.7 },
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
