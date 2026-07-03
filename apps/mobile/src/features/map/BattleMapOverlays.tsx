/**
 * GRYD — couche 4 de la Battle Map : le HUD gameplay (AMENDEMENT-08 §4, doc §7).
 * Partagé entre MapScreen natif (MapLibre) et MapScreen.web (SVG) :
 *   haut   BattleMapHUD (SAISON 0 · J-12 / Paris Est · contesté / Crew #8)
 *          + chips de layers (Decay/Routes/Crew/Rivals/Missions, défaut simple)
 *   flottant  mini war feed (3 events qui défilent, slide-in, tag LIVE)
 *   bas    bandeau OBJECTIF CREW (« Défendre 12 hexes · +N pts possibles »)
 *          avec CTA contextuel — posé au-dessus du bouton central.
 * Le bouton COURIR lui-même vit dans le layout (tabs) — pas de doublon ici.
 * Anti-shame : le bandeau parle d'objectifs crew, jamais de retard individuel.
 */
import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, gameColors, radii } from '@klaim/shared';
import { haptics } from '../../lib/haptics';
import { Icon } from '../../ui/Icon';
import { BattleMapHUD, timeAgoLabel, useSlideIn, type RunButtonMode } from '../../ui/game';
import { RUN_BUTTON_BOTTOM, RUN_BUTTON_SIZE } from '../nav/metrics';
import { OFFENSIVE } from '../warroom/demo';
import { MAP_HUD, MAP_WAR_FEED, WAR_FEED_CYCLE_MS, type MapWarFeedEventDemo } from './demo';
import type { BattleMapSummary } from './fakeHexes';

export type MapLayerKey = 'decay' | 'routes' | 'crew' | 'rivals' | 'missions';

/** Défaut SIMPLE (doc §7) : territoire + rival + objectif — decay/routes au tap. */
export const DEFAULT_MAP_LAYERS: Record<MapLayerKey, boolean> = {
  decay: false,
  routes: false,
  crew: true,
  rivals: true,
  missions: true,
};

const LAYER_ORDER: readonly MapLayerKey[] = ['decay', 'routes', 'crew', 'rivals', 'missions'];
const LAYER_LABELS: Record<MapLayerKey, string> = {
  decay: 'Decay',
  routes: 'Routes',
  crew: 'Crew',
  rivals: 'Rivals',
  missions: 'Missions',
};

/** CTA contextuel du bandeau objectif — même vocabulaire que le bouton central. */
const CTA_LABELS: Record<RunButtonMode, string> = {
  RUN: 'Courir',
  DEFEND: 'Défendre',
  RAID: 'Rejoindre',
  CAPTURE: 'Capturer',
  SCOUT: 'Scouter',
};

/**
 * Titre du bandeau objectif — DÉRIVÉ du même runMode que le CTA (cohérence) :
 * RAID → prendre la zone de l'offensive (warroom/demo OFFENSIVE), DEFEND →
 * défendre le decay, CAPTURE → la zone neutre ; RUN/SCOUT → libellé existant.
 */
function bannerTitleFor(mode: RunButtonMode, summary: BattleMapSummary): string {
  switch (mode) {
    case 'RAID':
      return `Prendre ${OFFENSIVE.zone}`;
    case 'CAPTURE':
      return 'Capturer la zone neutre';
    case 'DEFEND':
    case 'RUN':
    case 'SCOUT':
      return `Défendre ${summary.decay} hexes`;
  }
}

/** Un event est LIVE s'il date de moins de 10 min (même seuil que WarEventCard). */
const LIVE_MAX_MINUTES = 10;
/** Dégagement du bandeau objectif au-dessus du bouton central. */
const BANNER_ABOVE_RUN_BUTTON = 14;

export interface BattleMapOverlaysProps {
  layers: Record<MapLayerKey, boolean>;
  onToggleLayer: (key: MapLayerKey) => void;
  summary: BattleMapSummary;
  runMode: RunButtonMode;
}

export function BattleMapOverlays({
  layers,
  onToggleLayer,
  summary,
  runMode,
}: BattleMapOverlaysProps) {
  const insets = useSafeAreaInsets();
  const [chipsOpen, setChipsOpen] = useState(false);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* ── HUD haut + chips de layers + mini war feed ─────────────────── */}
      <View style={[styles.top, { top: insets.top + 10 }]} pointerEvents="box-none">
        <BattleMapHUD
          seasonLabel={MAP_HUD.seasonLabel}
          daysLeft={MAP_HUD.daysLeft}
          zoneName={MAP_HUD.zoneName}
          zoneState={MAP_HUD.zoneState}
          crewRank={MAP_HUD.crewRank}
          onLayersPress={() => {
            haptics.light();
            setChipsOpen((v) => !v);
          }}
        />
        {chipsOpen ? (
          <View style={styles.chipsRow}>
            {LAYER_ORDER.map((key) => {
              const active = layers[key];
              return (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Layer ${LAYER_LABELS[key]}`}
                  onPress={() => {
                    haptics.light();
                    onToggleLayer(key);
                  }}
                  style={({ pressed }) => [
                    styles.chip,
                    active && styles.chipActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                    {LAYER_LABELS[key]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
        <View style={styles.feedWrap} pointerEvents="none">
          <WarFeedTicker />
        </View>
      </View>

      {/* ── Bandeau OBJECTIF CREW, au-dessus du bouton central ─────────── */}
      <View
        style={[
          styles.bannerWrap,
          {
            bottom:
              insets.bottom + RUN_BUTTON_BOTTOM + RUN_BUTTON_SIZE + BANNER_ABOVE_RUN_BUTTON,
          },
        ]}
        pointerEvents="box-none"
      >
        <View style={styles.banner}>
          <View style={styles.bannerBody}>
            <Text style={styles.bannerKicker}>OBJECTIF CREW</Text>
            <Text style={styles.bannerTitle} numberOfLines={1}>
              {bannerTitleFor(runMode, summary)}
            </Text>
            <Text style={styles.bannerMeta} numberOfLines={1}>
              {summary.held} hexes tenus · +{summary.possiblePoints} pts possibles
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${CTA_LABELS[runMode]} — objectif crew`}
            onPress={() => {
              haptics.medium();
              // Démo : le départ réel passe par le bouton central (appui long).
              if (__DEV__) console.log(`[map] objectif crew CTA — mode ${runMode}`);
            }}
            style={({ pressed }) => [styles.bannerCta, pressed && styles.pressed]}
          >
            <Icon name="cible" size={14} color={gameColors.crew} />
            <Text style={styles.bannerCtaLabel}>{CTA_LABELS[runMode]}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/** Mini war feed flottant : un event compact à la fois, slide-in à chaque cycle. */
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

const styles = StyleSheet.create({
  top: { position: 'absolute', left: 14, right: 14, gap: 8 },
  pressed: { opacity: 0.7 },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
    backgroundColor: 'rgba(16,18,16,0.88)', // même surface translucide que le HUD
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

  bannerWrap: { position: 'absolute', left: 14, right: 14, alignItems: 'center' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    alignSelf: 'stretch',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: 'rgba(16,18,16,0.88)',
  },
  bannerBody: { flex: 1, gap: 2 },
  bannerKicker: {
    color: gameColors.crew,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  bannerTitle: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '700' },
  bannerMeta: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontVariant: ['tabular-nums'],
  },
  bannerCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: gameColors.carbon,
  },
  bannerCtaLabel: { color: gameColors.crew, fontSize: fontSizes.xs, fontWeight: '700' },
});
