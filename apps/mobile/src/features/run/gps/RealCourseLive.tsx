/**
 * GRYD — COURSE LIVE RÉELLE (AMENDEMENT-15 §2) : l'écran Nike du mode Stats
 * branché sur le VRAI tracker GPS (distance/allure/temps/zones estimées réels,
 * jauge GPS Trust réelle, états faible/perdu/autorisation coupée depuis
 * signalState). Composant PUR côté imports natifs : tout passe par RealRunApi
 * (useRealRun) — il vit donc AUSSI dans le bundle web, où il est bel et bien
 * rendu depuis le 21/07/2026 : le navigateur enregistre de VRAIES courses via
 * `navigator.geolocation` (useRealRun.web.ts). Les seules différences visibles
 * y sont les limites RÉELLES de la plateforme (pas d'arrière-plan, pas de
 * réglages système), annoncées au lieu d'être masquées.
 *
 * C'est désormais le SEUL écran de course qui existe : la course de
 * démonstration et toute sa chaîne (`DemoCourseLive`, `liveNav`, `route/demo`,
 * `loop`, `livemates`, `indications`, `LiveNavMap`) ont été supprimées le
 * 21/07/2026 (A-47). Cet écran ne dépend plus d'aucune donnée de scénario.
 *
 * Ce qu'il ne fait PAS, et le dit plutôt que de le simuler :
 *  - pas de mode Carte : la seule carte de course qui ait existé était bâtie
 *    sur les polylignes d'authoring du planner (Paris), pas sur le tracé
 *    mesuré. La rebrancher sur `gps/tracker.ts` est un chantier à part ; en
 *    attendant, aucune carte vaut mieux qu'une carte qui montre ailleurs.
 *    À la place : bouton AIDE GPS (« Courir écran éteint » par constructeur) ;
 *  - Motion Trust (podomètre) en phase suivante : seule la jauge GPS TRUST
 *    est affichée, jamais une fausse jauge ;
 *  - à la fin : le VRAI IngestRunRequest part (si session réelle) et seules les
 *    mesures (distance, durée) accompagnent la navigation vers le Résultat.
 * Textes FR courts, vocabulaire zones, anti-shame. Tokens uniquement.
 */
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import {
  GPS_SIGNAL_LOST_AFTER_S,
  VERIFIED_MIN_TRUST,
  colors,
  fonts,
  fontSizes,
  gameColors,
  iconSizes,
  motion,
  radii,
  spacing,
} from '@klaim/shared';
import { C } from '../../../i18n/catalog/runGps';
import { useT } from '../../../i18n/store';
import type { Entry } from '../../../i18n/types';
import { screen } from '../../../lib/analytics';
import { haptics } from '../../../lib/haptics';
import { Icon } from '../../../ui/Icon';
import { ProgressBar } from '../../../ui/ProgressBar';
import { StatusPill } from '../../../ui/StatusPill';
import { formatInt } from '../../../ui/format';
import { RUN_MODE_LABEL, formatClock, formatKm, formatPace, type LiveRunMode } from '../simulation';
import type { RealRunApi } from './gateTypes';
import { LiveTraceThumb } from './LiveTraceThumb';
import { loopHint, roundLoopM } from './engine/loopHint';
import { selectLiveNotice } from './liveNotice';
import {
  BackgroundHelpSheet,
  BackgroundRationaleCard,
  GpsSignalPill,
  PreciseLocationBanner,
  RestoreRunCard,
} from './GpsStatusUI';

/** Diamètre des GROS contrôles une-main (même gabarit que la démo Nike). */
const BIG_CONTROL_SIZE = 68;

/** Libellé de la pill principale selon la phase réelle (toujours visible). */
function statusLabel(run: RealRunApi): Entry {
  const s = run.snapshot;
  if (s.phase === 'paused-user') return C.statusPaused;
  // Retour terrain 20/07 : « EN PAUSE AUTO » seul se lisait comme un problème
  // GPS. On dit POURQUOI (l'arrêt) et COMMENT reprendre — pas un bug, un état.
  if (s.phase === 'paused-auto') return C.statusPausedAuto;
  if (s.phase === 'finished') return C.statusFinished;
  if (s.totalFixes === 0) return C.statusSearchingGps;
  return C.statusRunning;
}

export function RealCourseLive({ run }: { run: RealRunApi }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const [helpVisible, setHelpVisible] = useState(false);
  const finishedRef = useRef(false);
  const s = run.snapshot;
  const mode = run.effectiveMode;
  /**
   * `null` = la plateforme n'a pas de réglages système à ouvrir (navigateur).
   * On ne rend alors NI le bouton Aide GPS NI la feuille d'aide : les deux
   * finissent sur « ouvrir les réglages de GRYD », qui n'existe pas dans un
   * onglet. Un bouton qui ne mène nulle part est un mensonge d'interface.
   */
  const openSettings = run.openSettings;
  const conquest = mode === 'conquete';
  const paused = s.phase === 'paused-user';
  const verified = s.gpsTrust >= VERIFIED_MIN_TRUST && s.keptPoints > 0;
  /**
   * LECTURE EN COURS ≠ ÉCHEC. Aucune position n'est encore arrivée : « signal
   * perdu » serait faux (on n'a rien perdu — on n'a jamais rien eu). Passé le
   * délai moteur (GPS_SIGNAL_LOST_AFTER_S, jamais un nombre en dur), on cesse
   * d'attendre en silence et on dit que rien n'arrive.
   */
  const awaitingFirstFix = s.totalFixes === 0;
  const firstFixOverdue = awaitingFirstFix && s.activeS > GPS_SIGNAL_LOST_AFTER_S;
  // D4 — guidage de boucle (pur) : rien avant le périmètre minimal, « prête »
  // sous la tolérance serveur, sinon l'écart au départ à vol d'oiseau.
  const hint = loopHint({ conquest, distanceM: s.distanceM, gapM: s.loopGapM });

  // §10 — UN SEUL avis temporaire à la fois (sûreté d'abord). La pill d'ÉTAT et la
  // pill de MODE restent en contexte permanent ; tout le reste (signal, reprise,
  // permission, précision, guidage de boucle) passe par cette priorité unique.
  const notice = selectLiveNotice({
    pausedByUser: s.phase === 'paused-user',
    permissionRevoked: run.permissionRevoked,
    awaitingFirstFix,
    firstFixOverdue,
    signal: s.signal,
    hasRestore: run.restore !== null,
    bgPrompt: run.bgPrompt,
    approxLocation: run.approxLocation,
    foregroundOnlyPlatform: run.foregroundOnlyPlatform,
    // Remap EXPLICITE du kind moteur ('ready' | 'closing') vers le vocabulaire du
    // sélecteur ('ready' | 'return'). Un futur 3e variant → null (pas d'avis boucle)
    // plutôt qu'un 'return' silencieux — dégradation sûre.
    loopHint: hint?.kind === 'ready' ? 'ready' : hint?.kind === 'closing' ? 'return' : null,
  });

  useEffect(() => {
    screen('course_live', { mode, gps: 'real' });
  }, [mode]);

  // « Aucun run perdu » (analyse stratégique 21/07 — la fiabilité EST le
  // produit) : le signal GPS perdu n'était que VISUEL (pill), or un coureur
  // regarde la route, pas son écran. Transition →'lost' pendant le tracking =
  // haptique FORTE (avertissement immédiat, sans son — on ne coupe pas la
  // musique) ; récupération 'lost'→ok = haptique légère (rassure sans regarder).
  // La trace, elle, est déjà protégée (autosave 30 s + reprise après kill).
  const prevSignalRef = useRef(s.signal);
  useEffect(() => {
    const prev = prevSignalRef.current;
    prevSignalRef.current = s.signal;
    if (s.phase !== 'tracking') return; // en pause volontaire : pas d'alarme
    if (prev !== 'lost' && s.signal === 'lost') haptics.error();
    else if (prev === 'lost' && s.signal !== 'lost') haptics.light();
  }, [s.signal, s.phase]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    haptics.success();
    void run.finish().then(({ distanceM, durationS, uploadQueued }) => {
      // DERNIER LIEN AVEC LA SIMULATION, COUPÉ LE 21/07/2026. On passait ici un
      // paramètre `t` : un index de tick de la course fabriquée, obtenu en
      // rapportant la distance réelle aux 8,2 km du scénario démo puis en la
      // bornant à ses 96 ticks. Le Résultat ne le lit plus depuis qu'il a cessé
      // de rejouer la démo — c'était donc un nombre inventé, dérivé de
      // constantes inventées, transporté pour rien. Il n'est plus envoyé, et la
      // course réelle ne dépend plus d'aucune valeur de scénario.
      router.replace({
        pathname: '/course-result',
        // Ce qui part maintenant est exclusivement MESURÉ : la distance et la
        // durée du tracker. Fin hors-ligne : ligne discrète « envoi dès que
        // possible » (anti-shame).
        params: {
          mode,
          dist: String(Math.round(distanceM)),
          dur: String(Math.round(durationS)),
          ...(uploadQueued ? { queued: '1' } : {}),
        },
      });
    });
  };

  const modeLabel = RUN_MODE_LABEL[mode as LiveRunMode] ?? t(C.modeConquete);

  const loopPillLabel =
    hint?.kind === 'ready'
      ? t(C.loopReady)
      : hint?.kind === 'closing'
        ? t(C.loopReturn, { m: formatInt(roundLoopM(hint.gapM)) })
        : null;
  const loopPillTone = hint?.kind === 'ready' ? 'accent' : 'neutral';

  return (
    <View style={styles.root}>
      {/* ── Métriques héros (maquette Live Run) : TEMPS · DISTANCE · ALLURE ── */}
      <View style={[styles.metricsBar, { paddingTop: insets.top + 12 }]}>
        <View style={styles.metricCell}>
          <Text style={styles.metricValue}>{formatClock(s.activeS)}</Text>
          <Text style={styles.metricLabel}>{t(C.timeLabel)}</Text>
        </View>
        <View style={styles.metricCell}>
          <Text style={[styles.metricValue, styles.metricHero]}>{formatKm(s.distanceM)}</Text>
          <Text style={styles.metricLabel}>{t(C.kickerDistance)}</Text>
        </View>
        <View style={styles.metricCell}>
          <Text style={styles.metricValue}>{formatPace(s.paceSPerKm)}</Text>
          <Text style={styles.metricLabel}>{t(C.paceLabel)}</Text>
        </View>
      </View>

      {/* ── Pile d'état : statut live → boucle → alertes GPS ── */}
      <View style={styles.topArea}>
        <StatusPill
          label={t(statusLabel(run))}
          tone={paused || s.phase === 'paused-auto' || s.totalFixes === 0 ? 'warn' : 'neutral'}
        />
        {!conquest ? (
          <View style={styles.statsOnlyPill}>
            <Icon name={mode === 'course_privee' ? 'discret' : 'feed'} size={iconSizes.xs} color={colors.gris} />
            <Text style={styles.statsOnlyText}>{t(C.statsOnlyMode, { mode: modeLabel })}</Text>
          </View>
        ) : null}
        {(notice === 'loop_ready' || notice === 'loop_return') && loopPillLabel ? (
          <StatusPill label={loopPillLabel} tone={loopPillTone} />
        ) : null}
        {notice === 'signal_critical' || notice === 'signal_weak' ? (
          <GpsSignalPill
            signal={s.signal}
            permissionRevoked={run.permissionRevoked}
            awaitingFirstFix={awaitingFirstFix}
            firstFixOverdue={firstFixOverdue}
          />
        ) : notice === 'restore' && run.restore !== null ? (
          <RestoreRunCard
            distanceLabel={t(C.restoreKmFound, { km: formatKm(run.restore.distanceM) })}
            onResume={run.restore.resume}
            onDiscard={run.restore.discard}
          />
        ) : notice === 'bg_offer' ? (
          <BackgroundRationaleCard onAllow={run.allowBackground} onLater={run.dismissBackground} />
        ) : notice === 'precise' ? (
          <PreciseLocationBanner onOpenSettings={run.openSettings} />
        ) : notice === 'foreground' ? (
          <View style={styles.statsOnlyPill}>
            <Icon name="gps" size={iconSizes.xs} color={colors.gris} />
            <Text style={styles.statsOnlyText}>
              {t(run.foregroundOnlyPlatform ? C.browserForegroundOnly : C.foregroundOnly)}
            </Text>
          </View>
        ) : null}
      </View>

      {/* ── Centre : trace + zones + trust ── */}
      <View style={styles.center}>
        {s.tracePoints.length >= 2 ? (
          <View style={styles.liveTrace}>
            <LiveTraceThumb points={s.tracePoints} accessibilityLabel={t(C.a11yLiveTrace)} />
          </View>
        ) : null}

        {conquest ? (
          <Text style={styles.zonesValue} numberOfLines={1} adjustsFontSizeToFit>
            {t(C.zonesEstimated, { n: formatInt(s.zonesEstimated) })}
          </Text>
        ) : null}

        {verified ? (
          <View style={styles.verifiedPill}>
            <Icon name="bouclier" size={iconSizes.xs} color={gameColors.verify} />
            <Text style={styles.verifiedText}>GRYD VERIFIED</Text>
          </View>
        ) : null}

        <View style={styles.trustGauge}>
          <View style={styles.trustHead}>
            <Icon
              name="gps"
              size={iconSizes.sm}
              color={s.gpsTrust >= VERIFIED_MIN_TRUST ? gameColors.verify : gameColors.danger}
            />
            <Text style={styles.trustLabel}>GPS TRUST</Text>
            <Text
              style={[
                styles.trustValue,
                { color: s.gpsTrust >= VERIFIED_MIN_TRUST ? gameColors.verify : gameColors.danger },
              ]}
            >
              {s.gpsTrust}
            </Text>
          </View>
          <ProgressBar
            value={s.gpsTrust / 100}
            height={4}
            fill={s.gpsTrust >= VERIFIED_MIN_TRUST ? gameColors.verify : gameColors.danger}
          />
        </View>
      </View>

      {/* ── Contrôles : [Aide] [Pause chartreuse] [Terminer] ── */}
      <View style={[styles.controls, { paddingBottom: insets.bottom + 18 }]}>
        {openSettings === null ? (
          <View style={styles.bigControlWrap} />
        ) : (
          <BigControl
            label={t(C.ctrlGpsHelp)}
            accessibilityLabel={t(C.a11yGpsHelp)}
            onPress={() => setHelpVisible(true)}
          >
            <Icon name="gps" size={24} color={colors.blanc} />
          </BigControl>
        )}
        <BigControl
          label={paused ? t(C.ctrlResume) : t(C.ctrlPause)}
          accessibilityLabel={paused ? t(C.a11yResumeRun) : t(C.a11yPauseRun)}
          active={!paused}
          primary
          onPress={run.togglePause}
        >
          <PausePlayGlyph paused={paused} size={26} onPrimary={!paused} />
        </BigControl>
        <View style={styles.bigControlWrap}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(C.a11yFinishRun)}
            onLongPress={finish}
            delayLongPress={motion.holdToStopMs}
            onPress={() => {
              haptics.light();
            }}
            style={({ pressed }) => [styles.bigDisc, styles.bigStopDisc, pressed && styles.pressed]}
          >
            <View style={styles.bigStopSquare} />
          </Pressable>
          <Text style={styles.bigLabel}>{t(C.ctrlFinish)}</Text>
        </View>
      </View>

      {openSettings === null ? null : (
        <BackgroundHelpSheet
          visible={helpVisible}
          onClose={() => setHelpVisible(false)}
          onOpenSettings={openSettings}
        />
      )}
    </View>
  );
}

/** Glyphe pause/lecture — noir sur chartreuse quand primary. */
function PausePlayGlyph({
  paused,
  size,
  onPrimary = false,
}: {
  paused: boolean;
  size: number;
  onPrimary?: boolean;
}) {
  const ink = onPrimary ? colors.noir : colors.blanc;
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      {paused ? (
        <Path d="M7 4.5 L15.5 10 L7 15.5 Z" fill={onPrimary ? colors.noir : colors.chartreuse} />
      ) : (
        <>
          <Path d="M7 4.5v11" stroke={ink} strokeWidth={3} strokeLinecap="round" />
          <Path d="M13 4.5v11" stroke={ink} strokeWidth={3} strokeLinecap="round" />
        </>
      )}
    </Svg>
  );
}

/** GROS contrôle une-main (disque 68 px + label court). primary = chartreuse. */
function BigControl({
  label,
  accessibilityLabel,
  active = false,
  primary = false,
  onPress,
  children,
}: {
  label: string;
  accessibilityLabel: string;
  active?: boolean;
  primary?: boolean;
  onPress: () => void;
  children: React.ReactNode;
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
          primary && styles.bigDiscPrimary,
          active && !primary && styles.bigDiscActive,
          pressed && styles.pressed,
        ]}
      >
        {children}
      </Pressable>
      <Text style={styles.bigLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  pressed: { opacity: 0.7 },

  metricsBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.cardPadding,
    paddingBottom: 10,
    gap: 8,
  },
  metricCell: { flex: 1, alignItems: 'center', gap: 4 },
  metricValue: {
    color: colors.blanc,
    fontSize: fontSizes.xl,
    fontFamily: fonts.display,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  metricHero: { fontSize: fontSizes.xxl, color: colors.chartreuse },
  metricLabel: {
    color: colors.gris,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },

  topArea: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  statsOnlyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: gameColors.carbon,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingHorizontal: 10,
    paddingVertical: spacing.xxs,
  },
  statsOnlyText: { color: colors.gris, fontSize: fontSizes.xs },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.cardPadding,
    gap: spacing.xxs,
  },
  liveTrace: { marginBottom: spacing.sm },
  zonesValue: {
    color: colors.chartreuse,
    fontSize: fontSizes.xxl,
    fontFamily: fonts.display,
    fontWeight: '500',
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: gameColors.verify,
    paddingHorizontal: 12,
    paddingVertical: spacing.xxs,
    marginTop: 16,
  },
  verifiedText: { color: gameColors.verify, fontSize: fontSizes.xs, fontWeight: '800', letterSpacing: 1.4 },
  trustGauge: { width: 190, gap: 5, marginTop: 18 },
  trustHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trustLabel: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '700', letterSpacing: 0.8, flex: 1 },
  trustValue: { fontSize: fontSizes.sm, fontWeight: '700', fontVariant: ['tabular-nums'] },

  controls: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: spacing.xl,
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
  bigDiscActive: { backgroundColor: colors.chartreuse14, borderColor: colors.chartreuse40 },
  bigDiscPrimary: {
    backgroundColor: colors.chartreuse,
    borderColor: colors.chartreuse,
    width: BIG_CONTROL_SIZE + 8,
    height: BIG_CONTROL_SIZE + 8,
    borderRadius: (BIG_CONTROL_SIZE + 8) / 2,
  },
  bigStopDisc: {
    backgroundColor: colors.carbone2,
    borderWidth: 1.5,
    borderColor: colors.blanc35,
  },
  bigStopSquare: { width: 18, height: 18, borderRadius: 3.5, backgroundColor: colors.blanc },
  bigLabel: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '800', letterSpacing: 1.2 },
});
