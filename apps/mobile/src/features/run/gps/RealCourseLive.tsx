/**
 * GRYD — COURSE LIVE RÉELLE (AMENDEMENT-15 §2) : l'écran Nike du mode Stats
 * branché sur le VRAI tracker GPS (distance/allure/temps/zones estimées réels,
 * jauge GPS Trust réelle, états faible/perdu/autorisation coupée depuis
 * signalState). Composant PUR côté imports natifs : tout passe par RealRunApi
 * (useRealRun) — il peut vivre dans le bundle web sans jamais y être rendu.
 *
 * Mode Carte (AMENDEMENT-13 §2) : trace GPS réelle sur vraies tuiles via
 * RealGpsLiveMap — pas de route démo Uber, juste le ruban qui s'étend.
 *
 * Différences assumées avec la démo (honnêteté AMENDEMENT-15 §0) :
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
import { FloatingMapButton } from '../../../ui/game';
import { useMap3d } from '../../map/mapPref';
import { RealGpsLiveMap, type RealGpsLiveMapHandle } from './RealGpsLiveMap';
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
import {
  BackgroundRationaleCard,
  GpsSignalPill,
  PreciseLocationBanner,
  RestoreRunCard,
} from './GpsStatusUI';

/** Diamètre des GROS contrôles une-main (même gabarit que la démo Nike). */
const BIG_CONTROL_SIZE = 68;

type LiveView = 'stats' | 'carte';

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
  const [view, setView] = useState<LiveView>('stats');
  const [following, setFollowing] = useState(true);
  const mapRef = useRef<RealGpsLiveMapHandle>(null);
  const { map3d } = useMap3d();
  const finishedRef = useRef(false);
  const s = run.snapshot;
  const mode = run.effectiveMode;
  const conquest = mode === 'conquete';
  const paused = s.phase === 'paused-user';
  const verified = s.gpsTrust >= VERIFIED_MIN_TRUST && s.keptPoints > 0;

  useEffect(() => {
    screen('course_live', { mode, gps: 'real' });
  }, [mode]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    haptics.success();
    void run.finish().then(({ distanceM, uploadQueued, clientRunId, ingestSent }) => {
      const t = Math.max(
        1,
        Math.min(SIM_LAST_TICK, Math.round((distanceM / DEMO_TOTAL_DISTANCE_M) * SIM_LAST_TICK)),
      );
      router.replace({
        pathname: '/course-result',
        params: {
          mode,
          t: String(t),
          source: 'real',
          runId: clientRunId,
          ...(uploadQueued ? { queued: '1' } : {}),
          ...(ingestSent ? { ingest: '1' } : {}),
        },
      });
    });
  };

  const modeLabel = RUN_MODE_LABEL[mode as LiveRunMode] ?? 'Conquête';

  if (view === 'carte') {
    return (
      <View style={styles.root}>
        <RealGpsLiveMap
          ref={mapRef}
          traceGeo={run.traceGeo}
          capturing={conquest}
          mode3d={map3d}
          onFollowChange={setFollowing}
        />
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
        </View>
        <View style={[styles.mapFloatColumn, { bottom: insets.bottom + 120 }]}>
          <BigControl
            label={paused ? 'REPRENDRE' : 'PAUSE'}
            accessibilityLabel={paused ? 'Reprendre la course' : 'Mettre la course en pause'}
            active={paused}
            onPress={run.togglePause}
          >
            <PausePlayGlyph paused={paused} size={24} />
          </BigControl>
          <FloatingMapButton
            icon="gps"
            accessibilityLabel={following ? 'Carte centrée sur toi' : 'Recentrer la carte sur toi'}
            active={following}
            onPress={() => mapRef.current?.recenter()}
          />
          <FloatingMapButton
            icon="performance"
            accessibilityLabel="Revenir aux stats"
            onPress={() => setView('stats')}
          />
        </View>
        <View style={[styles.mapBottomBar, { paddingBottom: insets.bottom + 12 }]}>
          <Text style={styles.mapStat}>
            {formatKm(s.distanceM)} km · {formatClock(s.activeS)}
          </Text>
          {conquest ? (
            <Text style={styles.mapZones}>+{formatInt(s.zonesEstimated)} zones est.</Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Terminer la course (maintenir)"
            onLongPress={finish}
            delayLongPress={motion.holdToStopMs}
            onPress={() => haptics.light()}
            style={({ pressed }) => [styles.mapStop, pressed && styles.pressed]}
          >
            <View style={styles.bigStopSquare} />
          </Pressable>
        </View>
      </View>
    );
  }

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
          label="CARTE"
          accessibilityLabel="Voir la carte avec ta trace GPS"
          onPress={() => setView('carte')}
        >
          <Icon name="carte" size={24} color={colors.blanc} />
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
    borderColor: 'rgba(250,250,247,0.35)',
  },
  bigStopSquare: { width: 18, height: 18, borderRadius: 3.5, backgroundColor: colors.blanc },
  bigLabel: { color: colors.gris, fontSize: 9.5, fontWeight: '800', letterSpacing: 1.2 },

  mapFloatColumn: {
    position: 'absolute',
    right: 14,
    alignItems: 'center',
    gap: 12,
    zIndex: 3,
  },
  mapBottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.cardPadding,
    paddingTop: 12,
    backgroundColor: gameColors.carbon,
    borderTopWidth: 1,
    borderTopColor: colors.grisLigne,
    zIndex: 3,
  },
  mapStat: {
    flex: 1,
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  mapZones: {
    color: colors.chartreuse,
    fontSize: fontSizes.sm,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  mapStop: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.carbone2,
    borderWidth: 1.5,
    borderColor: 'rgba(250,250,247,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
