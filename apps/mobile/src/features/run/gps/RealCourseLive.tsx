/**
 * GRYD — COURSE LIVE RÉELLE (AMENDEMENT-15 §2) : l'écran Nike du mode Stats
 * branché sur le VRAI tracker GPS (distance/allure/temps/zones estimées réels,
 * jauge GPS Trust réelle, états faible/perdu/autorisation coupée depuis
 * signalState). Composant PUR côté imports natifs : tout passe par RealRunApi
 * (useRealRun) — il peut vivre dans le bundle web sans jamais y être rendu.
 *
 * Différences assumées avec la démo (honnêteté AMENDEMENT-15 §0) :
 *  - pas de mode Carte ici : la navigation LiveNavMap est construite sur la
 *    route DÉMO — brancher la carte réelle = AMENDEMENT-13 (autre chantier).
 *    À la place : bouton AIDE GPS (« Courir écran éteint » par constructeur) ;
 *  - Motion Trust (podomètre) en phase suivante : seule la jauge GPS TRUST
 *    est affichée, jamais une fausse jauge ;
 *  - à la fin : le VRAI IngestRunRequest part (si session réelle) et la
 *    célébration course-result est rejouée à l'échelle de la distance réelle
 *    (résultat réel branché en phase suivante — O8).
 * Textes FR courts, vocabulaire zones, anti-shame. Tokens uniquement.
 */
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { VERIFIED_MIN_TRUST, colors, fontSizes, gameColors, motion, radii, spacing } from '@klaim/shared';
import { screen } from '../../../lib/analytics';
import { haptics } from '../../../lib/haptics';
import { Icon } from '../../../ui/Icon';
import { ProgressBar } from '../../../ui/ProgressBar';
import { formatInt } from '../../../ui/format';
import {
  DEMO_TOTAL_DISTANCE_M,
  RUN_MODE_LABEL,
  SIM_LAST_TICK,
  formatClock,
  formatKm,
  formatPace,
  type LiveRunMode,
} from '../simulation';
import type { RealRunApi } from './gateTypes';
import { loopHint, roundLoopM } from './engine/loopHint';
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
function statusLabel(run: RealRunApi): string {
  const s = run.snapshot;
  if (s.phase === 'paused-user') return 'EN PAUSE';
  if (s.phase === 'paused-auto') return 'EN PAUSE AUTO';
  if (s.phase === 'finished') return 'COURSE TERMINÉE';
  if (s.totalFixes === 0) return 'RECHERCHE GPS…';
  return 'EN COURSE';
}

export function RealCourseLive({ run }: { run: RealRunApi }) {
  const insets = useSafeAreaInsets();
  const [helpVisible, setHelpVisible] = useState(false);
  const finishedRef = useRef(false);
  const s = run.snapshot;
  const mode = run.effectiveMode;
  const conquest = mode === 'conquete';
  const paused = s.phase === 'paused-user';
  const verified = s.gpsTrust >= VERIFIED_MIN_TRUST && s.keptPoints > 0;
  // D4 — guidage de boucle (pur) : rien avant le périmètre minimal, « prête »
  // sous la tolérance serveur, sinon l'écart au départ à vol d'oiseau.
  const hint = loopHint({ conquest, distanceM: s.distanceM, gapM: s.loopGapM });

  useEffect(() => {
    screen('course_live', { mode, gps: 'real' });
  }, [mode]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    haptics.success();
    void run.finish().then(({ distanceM, durationS, uploadQueued }) => {
      // `t` ne rythme plus que l'ANIMATION de célébration (rejouée depuis la
      // démo) — plus jamais les chiffres : P0 C1, les KPI du résultat viennent
      // du serveur (serverResult) ou des mesures réelles dist/dur ci-dessous.
      // Le clamp 8,2 km ne borne donc plus aucune donnée affichée.
      const t = Math.max(
        1,
        Math.min(SIM_LAST_TICK, Math.round((distanceM / DEMO_TOTAL_DISTANCE_M) * SIM_LAST_TICK)),
      );
      router.replace({
        pathname: '/course-result',
        // Fin hors-ligne : ligne discrète « envoi dès que possible » (anti-shame).
        params: {
          mode,
          t: String(t),
          dist: String(Math.round(distanceM)),
          dur: String(Math.round(durationS)),
          ...(uploadQueued ? { queued: '1' } : {}),
        },
      });
    });
  };

  const modeLabel = RUN_MODE_LABEL[mode as LiveRunMode] ?? 'Conquête';

  return (
    <View style={styles.root}>
      {/* ── Pile du haut : état (TOUJOURS) → signal GPS → bandeaux (empilés) ── */}
      <View style={[styles.topArea, { top: insets.top + 10 }]}>
        <View style={styles.topPill}>
          <View
            style={[
              styles.liveDot,
              (paused || s.phase === 'paused-auto' || s.totalFixes === 0) && styles.liveDotPaused,
            ]}
          />
          <Text style={styles.topPillText}>{statusLabel(run)}</Text>
        </View>
        {/* En pause MANUELLE les fixes sont volontairement ignorés : ne jamais
             afficher un faux « Signal perdu » (états honnêtes, anti-shame). */}
        {s.phase !== 'paused-user' ? (
          <GpsSignalPill signal={s.signal} permissionRevoked={run.permissionRevoked} />
        ) : null}
        {!conquest ? (
          <View style={styles.statsOnlyPill}>
            <Icon name={mode === 'course_privee' ? 'discret' : 'feed'} size={13} color={colors.gris} />
            <Text style={styles.statsOnlyText}>{modeLabel} — stats uniquement, aucune capture</Text>
          </View>
        ) : null}
        {run.approxLocation ? <PreciseLocationBanner onOpenSettings={run.openSettings} /> : null}
        {run.bgPrompt === 'denied' ? (
          <View style={styles.statsOnlyPill}>
            <Icon name="gps" size={13} color={colors.gris} />
            <Text style={styles.statsOnlyText}>Course enregistrée quand l’app est ouverte.</Text>
          </View>
        ) : null}
        {run.bgPrompt === 'offer' ? (
          <BackgroundRationaleCard onAllow={run.allowBackground} onLater={run.dismissBackground} />
        ) : null}
        {run.restore !== null ? (
          <RestoreRunCard
            distanceLabel={`${formatKm(run.restore.distanceM)} km retrouvés`}
            onResume={run.restore.resume}
            onDiscard={run.restore.discard}
          />
        ) : null}
      </View>

      {/* ── Centre Nike : KPI géants RÉELS ── */}
      <View style={styles.center}>
        <Text style={styles.heroKicker}>DISTANCE</Text>
        <Text style={styles.heroValue} numberOfLines={1} adjustsFontSizeToFit>
          {formatKm(s.distanceM)}
          <Text style={styles.heroUnit}> KM</Text>
        </Text>

        {conquest ? (
          <Text style={styles.zonesValue} numberOfLines={1}>
            +{formatInt(s.zonesEstimated)} ZONES ESTIMÉES
          </Text>
        ) : null}

        {/* D4 — guidage de boucle honnête : écart au départ à vol d'oiseau
            (« ~ »), seuils = les règles SERVEUR (le serveur reste seul juge).
            Une seule ligne, jamais de pill de plus (live minimal §A). */}
        {hint ? (
          <Text
            style={[styles.loopHint, hint.kind === 'ready' && styles.loopHintReady]}
            numberOfLines={1}
          >
            {hint.kind === 'ready'
              ? 'BOUCLE PRÊTE — termine quand tu veux'
              : `BOUCLE · retour ~${formatInt(roundLoopM(hint.gapM))} m`}
          </Text>
        ) : null}

        <View style={styles.secondaryRow}>
          <View style={styles.secondaryStat}>
            <Text style={styles.secondaryValue}>{formatPace(s.paceSPerKm)}</Text>
            <Text style={styles.secondaryLabel}>ALLURE /KM</Text>
          </View>
          <View style={styles.secondaryDivider} />
          <View style={styles.secondaryStat}>
            <Text style={styles.secondaryValue}>{formatClock(s.activeS)}</Text>
            <Text style={styles.secondaryLabel}>TEMPS</Text>
          </View>
        </View>

        {verified ? (
          <View style={styles.verifiedPill}>
            <Icon name="bouclier" size={13} color={gameColors.verify} />
            <Text style={styles.verifiedText}>GRYD VERIFIED</Text>
          </View>
        ) : null}

        {/* Jauge GPS Trust réelle (Motion Trust : phase suivante — jamais de fausse jauge). */}
        <View style={styles.trustGauge}>
          <View style={styles.trustHead}>
            <Icon
              name="gps"
              size={14}
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

      {/* ── Contrôles bas GROS, une main : [Pause] [Aide GPS] [Terminer] ── */}
      <View style={[styles.controls, { paddingBottom: insets.bottom + 18 }]}>
        <BigControl
          label={paused ? 'REPRENDRE' : 'PAUSE'}
          accessibilityLabel={paused ? 'Reprendre la course' : 'Mettre la course en pause'}
          active={paused}
          onPress={run.togglePause}
        >
          <PausePlayGlyph paused={paused} size={24} />
        </BigControl>
        <BigControl
          label="AIDE GPS"
          accessibilityLabel="Aide GPS : courir écran éteint"
          onPress={() => setHelpVisible(true)}
        >
          <Icon name="gps" size={24} color={colors.blanc} />
        </BigControl>
        <View style={styles.bigControlWrap}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Terminer la course (maintenir)"
            onLongPress={finish}
            delayLongPress={motion.holdToStopMs}
            onPress={() => {
              // Stop protégé §G : un appui court ne termine jamais — on guide.
              haptics.light();
            }}
            style={({ pressed }) => [styles.bigDisc, styles.bigStopDisc, pressed && styles.pressed]}
          >
            <View style={styles.bigStopSquare} />
          </Pressable>
          <Text style={styles.bigLabel}>TERMINER</Text>
        </View>
      </View>

      <BackgroundHelpSheet
        visible={helpVisible}
        onClose={() => setHelpVisible(false)}
        onOpenSettings={run.openSettings}
      />
    </View>
  );
}

/** Glyphe pause/lecture local (même dessin que la démo). */
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

/** GROS contrôle une-main (disque 68 px + label court — gabarit démo). */
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  pressed: { opacity: 0.7 },

  topArea: {
    position: 'absolute',
    left: 12,
    right: 12,
    alignItems: 'center',
    gap: 6,
    zIndex: 2,
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
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.chartreuse },
  liveDotPaused: { backgroundColor: colors.gris },
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

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.cardPadding,
    gap: 4,
  },
  heroKicker: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '800', letterSpacing: 2.4 },
  heroValue: {
    color: colors.blanc,
    fontSize: fontSizes.heroMax,
    fontWeight: '900',
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },
  heroUnit: { color: colors.gris, fontSize: fontSizes.xl, fontWeight: '800', letterSpacing: 0 },
  zonesValue: {
    color: colors.chartreuse,
    fontSize: fontSizes.xxl,
    fontWeight: '900',
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  // D4 — ligne de guidage boucle : discrète (gris) tant qu'on est loin,
  // chartreuse quand la boucle est prête (le SEUL moment qui appelle une action).
  loopHint: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    fontWeight: '700',
    letterSpacing: 0.8,
    fontVariant: ['tabular-nums'],
    marginTop: 4,
  },
  loopHintReady: { color: colors.chartreuse },
  secondaryRow: { flexDirection: 'row', alignItems: 'center', gap: 22, marginTop: 18 },
  secondaryStat: { alignItems: 'center', gap: 2 },
  secondaryValue: {
    color: colors.blanc,
    fontSize: fontSizes.xl,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  secondaryLabel: { color: colors.gris, fontSize: 9.5, fontWeight: '700', letterSpacing: 1.4 },
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
  verifiedText: { color: gameColors.verify, fontSize: 10.5, fontWeight: '800', letterSpacing: 1.4 },
  trustGauge: { width: 190, gap: 5, marginTop: 18 },
  trustHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trustLabel: { color: colors.gris, fontSize: 9.5, fontWeight: '700', letterSpacing: 0.8, flex: 1 },
  trustValue: { fontSize: fontSizes.sm, fontWeight: '700', fontVariant: ['tabular-nums'] },

  controls: {
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
  bigDiscActive: { backgroundColor: colors.chartreuse14, borderColor: colors.chartreuse40 },
  bigStopDisc: {
    backgroundColor: colors.carbone2,
    borderWidth: 1.5,
    borderColor: colors.blanc35,
  },
  bigStopSquare: { width: 18, height: 18, borderRadius: 3.5, backgroundColor: colors.blanc },
  bigLabel: { color: colors.gris, fontSize: 9.5, fontWeight: '800', letterSpacing: 1.2 },
});
