/**
 * GRYD — couche 4 de la Battle Map : le HUD gameplay façon UBER (AMENDEMENT-09
 * §2), vocabulaire TERRITOIRES ORGANIQUES (AMENDEMENT-11 §3-4 : plus aucun
 * « hex » visible — zones/secteurs/rues, % de contrôle). Partagé entre
 * MapScreen natif (MapLibre) et MapScreen.web (SVG) :
 *   haut      UNE pill fine « PARIS EST · ZONE CONTESTÉE » + parts de contrôle
 *             « Ton crew 42 % · Canal Crew 38 % · Neutre 20 % » (les % ont
 *             remplacé les comptes d'hex) + mini war feed (1 SEUL event).
 *   droite    2 boutons flottants : recentrer / stats.
 *   bas       chips des 5 MODES de carte (Territoire / Route / Défense / Rival /
 *             Exploration — un seul actif ; AMENDEMENT-12 §A : ce sont des
 *             CALQUES de lecture, pas des objectifs — « Raid » est renommé
 *             « Rival », calque de lecture du territoire rival), puis
 *             MapBottomSheet 3 états, posée AU-DESSUS du bouton central
 *             ContextualRunButton (AMENDEMENT-08 §3 — il reste l'unique CTA
 *             chartreuse, la sheet ne le duplique pas) :
 *             COMPACT  objectif crew + pts possibles + CTA texte contextuel
 *                      (CONQUÉRIR/DÉFENDRE → même flux RunModeSheet).
 *             SEMI     + défi à proximité (1 carte), zone bonus, membres crew
 *                      dispo (« 2 partagent leur position (opt-in) »).
 *             OUVERT   + choix de PARCOURS (3 démo — aperçu RouteProgress sur
 *                      la carte au tap) + run d'ami à rejoindre (1 démo).
 * Anti-shame : la sheet parle d'objectifs crew, jamais de retard individuel.
 * Events : screen('map_sheet_open') / screen('map_parcours_select') (génériques
 * — pas de nom §8 dédié dans events.ts) ; EVENTS.runStart au départ réel.
 */
import { useEffect, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, gameColors, radii, type RunMode } from '@klaim/shared';
import { EVENTS, screen, track } from '../../lib/analytics';
import { haptics } from '../../lib/haptics';
import { Icon } from '../../ui/Icon';
import {
  FloatingMapButton,
  MAP_SHEET_COMPACT_HEIGHT,
  MapBottomSheet,
  timeAgoLabel,
  useSlideIn,
  type MapSheetState,
  type RunButtonMode,
} from '../../ui/game';
import { RunModeSheet } from '../motivation/RunModeSheet';
import { RUN_BUTTON_BOTTOM, RUN_BUTTON_SIZE } from '../nav/metrics';
import { DEFENSE_MISSION, MISSIONS, OFFENSIVE } from '../warroom/demo';
import {
  FRIEND_RUN_DEMO,
  MAP_BONUS_ZONE,
  MAP_CHALLENGE,
  MAP_CONTROL_HUD,
  MAP_HUD,
  MAP_WAR_FEED,
  MATES_OPT_IN,
  MATES_SHARING_LABEL,
  PARCOURS_DEMO,
  WAR_FEED_CYCLE_MS,
  parcoursMeta,
  type MapWarFeedEventDemo,
} from './demo';
import type { BattleMapSummary } from './fakeHexes';
import { MAP_MODE_LABELS, MAP_MODE_ORDER, type MapMode } from './territory';

/** CTA contextuel de la sheet — les 2 verbes du bouton central (AMENDEMENT-12 §A). */
const CTA_LABELS: Record<RunButtonMode, string> = {
  CONQUERIR: 'Conquérir',
  DEFENDRE: 'Défendre',
};

/**
 * Libellé objectif — DÉRIVÉ du même runMode que le CTA (cohérence), vocabulaire
 * AMENDEMENT-11 §4 (zones/secteurs, jamais « hex ») + AMENDEMENT-12 §A (2
 * verbes) : CONQUÉRIR → la zone de la conquête collective (warroom/demo
 * OFFENSIVE), DÉFENDRE → la zone de la mission défense (« Défendre le Canal »).
 */
function objectiveTitleFor(mode: RunButtonMode): string {
  switch (mode) {
    case 'CONQUERIR':
      return `Conquérir ${OFFENSIVE.zone}`;
    case 'DEFENDRE':
      return `Défendre le ${DEFENSE_MISSION.zone}`;
  }
}

/** Sous-ligne objectif : « N zones à sauver · +pts » ou « N zones tenues · +pts ». */
function objectiveMetaFor(mode: RunButtonMode, summary: BattleMapSummary): string {
  if (mode === 'DEFENDRE') {
    return `${summary.decay} zones à sauver · +${summary.possiblePoints} pts`;
  }
  return `${summary.held} zones tenues · +${summary.possiblePoints} pts possibles`;
}

/**
 * Libellés AFFICHÉS des modes de carte : les 5 calques AMENDEMENT-11 restent,
 * seul « Raid » devient « Rival » à l'écran (AMENDEMENT-12 §A — calque de
 * lecture du territoire rival ; la clé interne `raid` de territory.ts ne
 * change pas, ce n'est pas un objectif joueur).
 */
const MODE_CHIP_LABELS: Record<MapMode, string> = {
  ...MAP_MODE_LABELS,
  raid: 'Rival',
};

/** Un event est LIVE s'il date de moins de 10 min (même seuil que WarEventCard). */
const LIVE_MAX_MINUTES = 10;
/** Dégagement de la sheet au-dessus du bouton central (il reste LE CTA). */
const SHEET_ABOVE_RUN_BUTTON = 12;
/** Pile de boutons flottants : dégagement au-dessus de la sheet compacte. */
const FAB_ABOVE_SHEET = 12;
/** Rangée des chips de mode (chip ~30 px + marge) — réserve au-dessus de la sheet. */
const MODE_CHIPS_HEIGHT = 40;

/** « 4,2 km » — décimale française, pas d'Intl (parité Hermes). */
function formatKm(km: number): string {
  return `${km.toFixed(1).replace('.', ',')} km`;
}

export interface BattleMapOverlaysProps {
  /** Mode de carte actif (AMENDEMENT-11 §3 — un seul à la fois). */
  mode: MapMode;
  onSelectMode: (mode: MapMode) => void;
  summary: BattleMapSummary;
  runMode: RunButtonMode;
  /** Retour ego fluide (anim caméra/scène côté écran) — bouton Recentrer. */
  onRecenter?: () => void;
  /** Parcours affiché en aperçu sur la carte (RouteProgress, progress 0). */
  selectedParcoursId?: string | null;
  onSelectParcours?: (id: string | null) => void;
}

export function BattleMapOverlays({
  mode,
  onSelectMode,
  summary,
  runMode,
  onRecenter,
  selectedParcoursId = null,
  onSelectParcours,
}: BattleMapOverlaysProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [runPickerOpen, setRunPickerOpen] = useState(false);
  // La sheet n'expose pas de contrôle impératif : le bouton Stats la REMONTE
  // en semi (remount key + initialState — snap direct, façon reduce motion).
  const [sheet, setSheet] = useState<{ key: number; initial: MapSheetState }>({
    key: 0,
    initial: 'compact',
  });

  /** Bas de l'écran réservé au bouton central + nav (layout tabs). */
  const sheetBottom = insets.bottom + RUN_BUTTON_BOTTOM + RUN_BUTTON_SIZE + SHEET_ABOVE_RUN_BUTTON;

  const openSheetSemi = () => {
    setSheet((s) => ({ key: s.key + 1, initial: 'semi' }));
    screen('map_sheet_open', { state: 'semi', via: 'stats_button' });
  };

  const startRun = (mode: RunMode) => {
    setRunPickerOpen(false);
    track(EVENTS.runStart, { mode, context: runMode });
    router.push(`/course-live?mode=${mode}`);
  };

  const selectParcours = (id: string) => {
    haptics.light();
    const next = selectedParcoursId === id ? null : id;
    onSelectParcours?.(next);
    if (next) {
      screen('map_parcours_select', { id });
      // Aperçu : la sheet redescend en semi pour laisser voir le tracé.
      setSheet((s) => ({ key: s.key + 1, initial: 'semi' }));
    }
  };

  const mission = MISSIONS[0];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* ── Haut : UNE pill (secteur + % de contrôle) + mini war feed ────── */}
      <View style={[styles.top, { top: insets.top + 10 }]} pointerEvents="box-none">
        <View style={styles.pill}>
          <Text style={styles.pillText} numberOfLines={1}>
            {MAP_HUD.zoneName.toUpperCase()} · {MAP_CONTROL_HUD.stateLabel} ·{' '}
            <Text style={styles.pillRank}>#{MAP_HUD.crewRank}</Text>
          </Text>
          <Text style={styles.pillShares} numberOfLines={1}>
            <Text style={styles.pillSharesCrew}>Ton crew {MAP_CONTROL_HUD.crewPct} %</Text>
            {' · '}
            {MAP_CONTROL_HUD.rivalName} {MAP_CONTROL_HUD.rivalPct} % · Neutre{' '}
            {MAP_CONTROL_HUD.neutralPct} %
          </Text>
        </View>
        <View style={styles.feedWrap} pointerEvents="none">
          <WarFeedTicker />
        </View>
      </View>

      {/* ── Droite : 2 boutons flottants (anti-bruit) ────────────────────── */}
      <View
        style={[
          styles.fabColumn,
          {
            bottom:
              sheetBottom + MAP_SHEET_COMPACT_HEIGHT + MODE_CHIPS_HEIGHT + FAB_ABOVE_SHEET,
          },
        ]}
        pointerEvents="box-none"
      >
        <FloatingMapButton
          icon="gps"
          accessibilityLabel="Recentrer sur moi"
          onPress={() => onRecenter?.()}
        />
        <FloatingMapButton
          icon="performance"
          accessibilityLabel="Stats rapides"
          onPress={openSheetSemi}
        />
      </View>

      {/* ── Modes de carte (AMENDEMENT-11 §3) : 5 chips, UN SEUL actif ───── */}
      <View
        style={[styles.modesWrap, { bottom: sheetBottom + MAP_SHEET_COMPACT_HEIGHT + 8 }]}
        pointerEvents="box-none"
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.modesRow}
        >
          {MAP_MODE_ORDER.map((key) => {
            const active = mode === key;
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Mode ${MODE_CHIP_LABELS[key]}`}
                onPress={() => {
                  if (active) return;
                  haptics.light();
                  onSelectMode(key);
                  screen('map_mode_select', { mode: key });
                }}
                style={({ pressed }) => [
                  styles.chip,
                  active && styles.chipActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                  {MODE_CHIP_LABELS[key]}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Bas : bottom sheet Uber, au-dessus du bouton central ─────────── */}
      <View style={[styles.sheetWrap, { bottom: sheetBottom }]} pointerEvents="box-none">
        <MapBottomSheet
          key={sheet.key}
          initialState={sheet.initial}
          onStateChange={(state) => {
            if (state !== 'compact') screen('map_sheet_open', { state });
          }}
          compactSlot={
            <View style={styles.compactRow}>
              <View style={styles.compactBody}>
                <Text style={styles.kicker}>OBJECTIF CREW</Text>
                <Text style={styles.objectiveTitle} numberOfLines={1}>
                  {objectiveTitleFor(runMode)}
                </Text>
                <Text style={styles.objectiveMeta} numberOfLines={1}>
                  {objectiveMetaFor(runMode, summary)}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${CTA_LABELS[runMode]} — objectif crew`}
                onPress={() => {
                  haptics.medium();
                  setRunPickerOpen(true);
                }}
                style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
              >
                <Icon name="cible" size={14} color={gameColors.crew} />
                <Text style={styles.ctaLabel}>{CTA_LABELS[runMode]}</Text>
              </Pressable>
            </View>
          }
          semiSlot={
            <View style={styles.semiBlock}>
              {mission ? (
                <View style={styles.row}>
                  <View style={styles.rowIcon}>
                    <Icon name="cible" size={14} color={colors.blanc} />
                  </View>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {mission.label}
                    </Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {mission.progress}/{mission.target} · {MAP_CHALLENGE.distanceLabel}
                    </Text>
                  </View>
                </View>
              ) : null}
              <View style={styles.row}>
                <View style={[styles.rowIcon, styles.rowIconGold]}>
                  <Icon name="eclats" size={14} color={gameColors.gold} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {MAP_BONUS_ZONE.label}
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {MAP_BONUS_ZONE.window}
                  </Text>
                </View>
              </View>
              <View style={styles.row}>
                <View style={styles.rowIcon}>
                  <Icon name="ami" size={14} color={gameColors.crew} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {MATES_OPT_IN.map((m) => m.name).join(' · ')}
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {MATES_SHARING_LABEL}
                  </Text>
                </View>
              </View>
            </View>
          }
          openSlot={
            <View style={styles.openBlock}>
              <Text style={styles.sectionTitle}>PARCOURS</Text>
              {PARCOURS_DEMO.map((p) => {
                const meta = parcoursMeta(p);
                const selected = selectedParcoursId === p.id;
                return (
                  <Pressable
                    key={p.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`Parcours ${p.name}, ${formatKm(meta.distanceKm)}`}
                    onPress={() => selectParcours(p.id)}
                    style={({ pressed }) => [
                      styles.parcours,
                      selected && styles.parcoursSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.rowBody}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {p.name}
                      </Text>
                      <Text style={styles.rowMeta} numberOfLines={1}>
                        {formatKm(meta.distanceKm)} · D+ {p.elevGainM} m · {p.difficulty}
                      </Text>
                      <Text style={styles.rowMeta} numberOfLines={1}>
                        {meta.hexes} zones à prendre · +{meta.points} pts
                      </Text>
                    </View>
                    {selected ? (
                      <Text style={styles.onMapTag}>SUR LA CARTE</Text>
                    ) : (
                      <Icon name="chevron" size={14} color={colors.gris} />
                    )}
                  </Pressable>
                );
              })}
              <Text style={styles.sectionTitle}>RUNS D'AMIS</Text>
              <View style={styles.parcours}>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {FRIEND_RUN_DEMO.name} · {FRIEND_RUN_DEMO.modeLabel}
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {FRIEND_RUN_DEMO.startLabel} · {FRIEND_RUN_DEMO.zone} ·{' '}
                    {FRIEND_RUN_DEMO.distanceKm} km
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Rejoindre le run de ${FRIEND_RUN_DEMO.name}`}
                  onPress={() => {
                    haptics.medium();
                    // Démo : le run groupé réel passera par l'invitation AMENDEMENT-07.
                    if (__DEV__) console.log('[map] rejoindre run ami (démo)');
                  }}
                  style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
                >
                  <Text style={styles.ctaLabel}>Rejoindre</Text>
                </Pressable>
              </View>
            </View>
          }
        />
      </View>

      {/* Même flux que le bouton central : RunModeSheet → run_start → course. */}
      <RunModeSheet
        visible={runPickerOpen}
        onSelect={startRun}
        onClose={() => setRunPickerOpen(false)}
      />
    </View>
  );
}

/** Mini war feed flottant : UN event compact à la fois, slide-in à chaque cycle. */
function WarFeedTicker() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (MAP_WAR_FEED.length < 2) return;
    const id = setInterval(
      () => setIndex((i) => (i + 1) % MAP_WAR_FEED.length),
      WAR_FEED_CYCLE_MS,
    );
    return () => clearInterval(id);
  }, []);
  const event = MAP_WAR_FEED[index];
  if (!event) return null;
  // key={index} → remonte la ligne à chaque cycle (rejoue le slide-in).
  return <WarFeedRow key={index} event={event} />;
}

function WarFeedRow({ event }: { event: MapWarFeedEventDemo }) {
  const { opacity, translateY } = useSlideIn(10);
  const live = event.minutesAgo < LIVE_MAX_MINUTES;
  const metaParts = [
    event.zone,
    event.points !== undefined ? `+${event.points} pts` : undefined,
    timeAgoLabel(event.minutesAgo),
  ].filter((p): p is string => p !== undefined);

  return (
    <Animated.View style={[styles.feedRow, { opacity, transform: [{ translateY }] }]}>
      <View style={[styles.feedIcon, { borderColor: event.tint }]}>
        <Icon name={event.icon} size={14} color={event.tint} />
      </View>
      <View style={styles.feedBody}>
        <Text style={styles.feedMessage} numberOfLines={1}>
          {event.message}
        </Text>
        <Text style={styles.feedMeta} numberOfLines={1}>
          {metaParts.join(' · ')}
        </Text>
      </View>
      {live ? (
        <View style={styles.liveTag}>
          <View style={styles.liveDot} />
          <Text style={styles.liveLabel}>LIVE</Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

/** Surface profonde translucide commune aux flottants (HUD sur carte). */
const OVERLAY_SURFACE = 'rgba(16,18,16,0.88)';

const styles = StyleSheet.create({
  top: { position: 'absolute', left: 14, right: 14, gap: 8, alignItems: 'center' },
  pressed: { opacity: 0.7 },

  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: OVERLAY_SURFACE,
  },
  pillText: {
    color: colors.blanc,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  pillRank: { color: gameColors.crew },
  // Parts de contrôle (AMENDEMENT-11 §3 — remplacent les comptes d'hex).
  pillShares: {
    color: colors.gris,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  pillSharesCrew: { color: gameColors.crew },

  modesWrap: { position: 'absolute', left: 0, right: 0, height: MODE_CHIPS_HEIGHT },
  modesRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: gameColors.carbon,
  },
  chipActive: { borderColor: gameColors.crew },
  chipLabel: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600' },
  chipLabelActive: { color: gameColors.crew },

  feedWrap: { alignSelf: 'flex-start', maxWidth: 300 },
  feedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: OVERLAY_SURFACE,
  },
  feedIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: gameColors.carbon,
  },
  feedBody: { flexShrink: 1 },
  feedMessage: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '600' },
  feedMeta: { color: colors.gris, fontSize: 10, marginTop: 1 },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: gameColors.crew,
  },
  liveDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: gameColors.crew },
  liveLabel: { color: gameColors.crew, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },

  fabColumn: { position: 'absolute', right: 14, gap: 10, alignItems: 'center' },

  // Le wrapper CLIPPE la sheet (elle glisse vers le bas en compact — sans
  // overflow hidden elle réapparaîtrait derrière le bouton central/nav).
  sheetWrap: { position: 'absolute', left: 0, right: 0, top: 0, overflow: 'hidden' },

  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    // Hauteur EXACTE du compact visible (96) moins la poignée (18) : le slot
    // semi ne dépasse jamais dans l'état compact.
    height: MAP_SHEET_COMPACT_HEIGHT - 18,
    paddingBottom: 8,
  },
  compactBody: { flex: 1, gap: 1 },
  kicker: { color: gameColors.crew, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  objectiveTitle: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '700' },
  objectiveMeta: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontVariant: ['tabular-nums'],
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone,
  },
  ctaLabel: { color: gameColors.crew, fontSize: fontSizes.xs, fontWeight: '700' },

  semiBlock: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    gap: 8,
    borderTopWidth: 1,
    borderColor: colors.grisLigne,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.carbone,
  },
  rowIconGold: { borderColor: gameColors.gold },
  rowBody: { flex: 1, gap: 1 },
  rowTitle: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '600' },
  rowMeta: { color: colors.gris, fontSize: 10, fontVariant: ['tabular-nums'] },

  openBlock: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 8,
    borderTopWidth: 1,
    borderColor: colors.grisLigne,
  },
  sectionTitle: {
    color: colors.gris,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 2,
  },
  parcours: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone,
  },
  parcoursSelected: { borderColor: colors.chartreuse40 },
  onMapTag: { color: gameColors.crew, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
});
