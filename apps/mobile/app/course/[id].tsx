/**
 * GRYD — DÉTAIL D'UNE COURSE (AMENDEMENT-17 CHANTIER 3). « Effort + impact
 * territorial », résumé + détail : au-dessus du fold on lit le nom, l'effort
 * (3 stats), l'impact OU la raison honnête d'un refus. Plus bas : mini-carte
 * AVANT/APRÈS (si boucle fermée — traits nets §4ter, jamais de cellule/blob),
 * lignes d'impact variées, segments (valide / GPS faible / pause), et le bloc
 * RAISON explicite quand la capture n'a pas eu lieu (« Boucle non fermée · il
 * manquait 240 m » / « Zone trop fine » / « GPS instable → stats only » /
 * « Vitesse incohérente → refusé »). CTA : Partager · Voir sur la carte ·
 * Signaler. Aucune valeur de jeu calculée ici (miroir des runs/claims serveur).
 * Analytics : screen('course_detail'), recordShared au partage.
 */
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, fontSizes, gameColors, radii } from '@klaim/shared';
import { EVENTS, screen, track } from '../../src/lib/analytics';
import { haptics } from '../../src/lib/haptics';
import { Icon } from '../../src/ui/Icon';
import { GhostButton } from '../../src/ui/GhostButton';
import { StackScreen } from '../../src/ui/StackScreen';
import { StatePill, type GameVisualState } from '../../src/ui/game';
import { RunLoopMap } from '../../src/features/history/RunLoopMap';
import {
  fmtDuration,
  fmtKm,
  fmtPace,
  findRun,
  REFUSAL_TITLES,
  VERIFY_LABELS,
  type RunHistoryEntry,
  type SegmentState,
} from '../../src/features/history/demo';
import {
  BOUCLE_BASTILLE,
  BOUCLE_REPUBLIQUE,
  type LatLngPoint,
} from '../../src/features/map/realAnchors';

/** Trace d'authoring pour la mini-carte avant/après (réutilise realAnchors). */
const LOOP_TRACE: Record<string, readonly LatLngPoint[]> = {
  republique: BOUCLE_REPUBLIQUE,
  bastille: BOUCLE_BASTILLE,
};

/** Métadonnées d'affichage d'un état de segment (couleur + libellé + icône). */
const SEGMENT_META: Record<
  SegmentState,
  { label: string; tint: string; icon: import('@klaim/shared').IconName }
> = {
  valid: { label: 'Validé', tint: gameColors.verify, icon: 'gps' },
  weak_gps: { label: 'GPS faible · exclu', tint: colors.gris, icon: 'alerte' },
  pause: { label: 'Pause', tint: colors.gris, icon: 'sablier' },
};

/** Pastille Verify d'en-tête (miroir de la card). */
function headerPill(entry: RunHistoryEntry): { state: GameVisualState; label: string } {
  if (entry.refusal === 'speed_incoherent') return { state: 'rejected', label: 'Refusé' };
  if (entry.verify === 'verified') return { state: 'verified', label: VERIFY_LABELS.verified };
  if (entry.verify === 'partial') return { state: 'contested', label: VERIFY_LABELS.partial };
  return { state: 'statsonly', label: VERIFY_LABELS.statsonly };
}

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const entry = typeof id === 'string' ? findRun(id) : undefined;

  useEffect(() => {
    screen('course_detail', { id: id ?? '' });
  }, [id]);

  if (!entry) {
    return (
      <StackScreen title="Course" icon="historique">
        <Text style={styles.empty}>Cette course n’est plus disponible.</Text>
      </StackScreen>
    );
  }

  const pill = headerPill(entry);
  const loopTrace = entry.loopMap ? LOOP_TRACE[entry.loopMap.anchor] : undefined;

  const share = () => {
    haptics.light();
    track(EVENTS.shareCardGenerated, { source: 'course_detail', run: entry.id });
    router.push('/course-result?mode=social_run');
  };
  const seeOnMap = () => {
    haptics.light();
    router.push('/(tabs)');
  };
  const report = () => {
    haptics.light();
    router.push('/support');
  };

  return (
    <StackScreen
      title={entry.name}
      icon="historique"
      kicker={`${entry.area} · ${entry.when}`.toUpperCase()}
    >
      {/* Effort héro : 3 stats sans scroll */}
      <View style={styles.effortCard}>
        <View style={styles.effortCell}>
          <Text style={styles.effortValue}>{fmtKm(entry.km)}</Text>
          <Text style={styles.effortLabel}>DISTANCE</Text>
        </View>
        <View style={styles.effortDivider} />
        <View style={styles.effortCell}>
          <Text style={styles.effortValue}>{fmtDuration(entry.durationS)}</Text>
          <Text style={styles.effortLabel}>DURÉE</Text>
        </View>
        <View style={styles.effortDivider} />
        <View style={styles.effortCell}>
          <Text style={styles.effortValue}>{fmtPace(entry.paceSPerKm)}</Text>
          <Text style={styles.effortLabel}>ALLURE</Text>
        </View>
      </View>

      <View style={styles.pillRow}>
        <StatePill state={pill.state} label={pill.label} />
      </View>

      {/* RAISON (si capture refusée / partielle) — factuelle, jamais de blâme */}
      {entry.refusal || entry.refusalDetail ? (
        <View
          style={[
            styles.reasonCard,
            entry.refusal === 'speed_incoherent' && styles.reasonCardHot,
          ]}
        >
          <View style={styles.reasonHead}>
            <Icon
              name={entry.verify === 'partial' ? 'gps' : 'alerte'}
              size={18}
              color={entry.refusal === 'speed_incoherent' ? gameColors.danger : colors.gris}
            />
            <Text style={styles.reasonTitle}>
              {entry.refusal
                ? REFUSAL_TITLES[entry.refusal]
                : 'Capture partielle'}
            </Text>
          </View>
          {entry.refusalDetail ? (
            <Text style={styles.reasonBody}>{entry.refusalDetail}</Text>
          ) : null}
        </View>
      ) : null}

      {/* Mini-carte AVANT/APRÈS (boucle fermée uniquement) */}
      {loopTrace && entry.loopMap ? (
        <View style={styles.block}>
          <RunLoopMap
            trace={loopTrace}
            beforeZones={entry.loopMap.beforeZones}
            afterZones={entry.loopMap.afterZones}
          />
        </View>
      ) : null}

      {/* Impact territorial : lignes variées */}
      <Text style={styles.sectionLabel}>IMPACT SUR LE TERRAIN</Text>
      <View style={styles.impactList}>
        {entry.impactLines.map((line, i) => (
          <View key={i} style={styles.impactRow}>
            <View
              style={[styles.impactIcon, line.gain && { borderColor: gameColors.crew }]}
            >
              <Icon
                name={line.icon}
                size={16}
                color={line.gain ? gameColors.crew : colors.gris}
              />
            </View>
            <Text
              style={[styles.impactText, line.gain && styles.impactTextGain]}
              numberOfLines={2}
            >
              {line.label}
            </Text>
          </View>
        ))}
      </View>

      {entry.crewNote ? <Text style={styles.crewNote}>{entry.crewNote}</Text> : null}

      {/* Segments : valide / GPS faible / pause */}
      <Text style={styles.sectionLabel}>SEGMENTS</Text>
      <View style={styles.segList}>
        {entry.segments.map((seg, i) => {
          const meta = SEGMENT_META[seg.state];
          return (
            <View key={i} style={styles.segRow}>
              <Icon name={meta.icon} size={16} color={meta.tint} />
              <Text style={styles.segLabel} numberOfLines={1}>
                {seg.label}
              </Text>
              {seg.km > 0 ? (
                <Text style={styles.segKm}>{fmtKm(seg.km)}</Text>
              ) : null}
              <Text style={[styles.segState, { color: meta.tint }]}>{meta.label}</Text>
            </View>
          );
        })}
      </View>

      {/* CTA : Partager · Voir sur la carte · Signaler */}
      <View style={styles.ctaBlock}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Partager cette course"
          onPress={share}
          style={({ pressed }) => [styles.primaryCta, pressed && styles.pressed]}
        >
          <Icon name="partage" size={18} color={colors.noir} />
          <Text style={styles.primaryLabel}>Partager</Text>
        </Pressable>
        <GhostButton label="Voir sur la carte" icon="carte" onPress={seeOnMap} />
        <GhostButton label="Signaler un problème" icon="alerte" onPress={report} />
      </View>
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  empty: { color: colors.gris, fontSize: fontSizes.sm, marginTop: 20 },
  // ── Effort héro ──
  effortCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 18,
    marginTop: 8,
  },
  effortCell: { flex: 1, alignItems: 'center', gap: 4 },
  effortValue: {
    color: colors.blanc,
    fontSize: fontSizes.lg,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  effortLabel: { color: colors.gris, fontSize: 10, letterSpacing: 1.5 },
  effortDivider: { width: 1, height: 34, backgroundColor: colors.grisLigne },
  pillRow: { flexDirection: 'row', marginTop: 14 },
  // ── Raison de refus ──
  reasonCard: {
    marginTop: 14,
    backgroundColor: gameColors.carbon,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: 16,
    gap: 8,
  },
  reasonCardHot: { borderColor: gameColors.danger },
  reasonHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reasonTitle: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '700' },
  reasonBody: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
  },
  block: { marginTop: 16 },
  // ── Sections ──
  sectionLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    marginTop: 24,
    marginBottom: 12,
  },
  impactList: { gap: 10 },
  impactRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  impactIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: gameColors.carbon,
  },
  impactText: { flex: 1, color: colors.gris, fontSize: fontSizes.sm, lineHeight: fontSizes.sm * 1.4 },
  impactTextGain: { color: colors.blanc, fontWeight: '600' },
  crewNote: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.6,
    marginTop: 14,
    fontStyle: 'italic',
  },
  // ── Segments ──
  segList: { gap: 8 },
  segRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.carbone,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  segLabel: { flex: 1, color: colors.blanc, fontSize: fontSizes.sm },
  segKm: { color: colors.gris, fontSize: fontSizes.xs, fontVariant: ['tabular-nums'] },
  segState: { fontSize: fontSizes.xs, fontWeight: '700' },
  // ── CTA ──
  ctaBlock: { gap: 10, marginTop: 26 },
  primaryCta: {
    height: 52,
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryLabel: { color: colors.noir, fontSize: fontSizes.md, fontWeight: '700' },
  pressed: { opacity: 0.8 },
});
