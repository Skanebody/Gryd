/**
 * GRYD — couche 4 de la Battle Map : le HUD gameplay, ALLÉGÉ (AMENDEMENT-17
 * §1.2 : « un écran = une action », route-first, UN seul GO). Vocabulaire
 * TERRITOIRES ORGANIQUES (zones/secteurs/rues/routes). Partagé entre MapScreen
 * natif et .web :
 *   haut      UNE pill `PARIS EST · ZONE CONTESTÉE · #8` + UNE phrase rivale
 *             (« Canal Crew gagne du terrain. 3 zones à défendre. »). Les % de
 *             contrôle (42/38/20) NE sont PLUS affichés en permanence : détail
 *             AU TAP de la pill. Sous la pill, quand une menace est fraîche :
 *             ALERTE RIVAL actionnable (`CANAL CREW attaque République ·
 *             14 zones reprises · il y a 12 min` + CTA [Défendre]).
 *   droite    2 boutons flottants (recentrer / stats) + UN bouton « Couches »
 *             (icône calques) qui ouvre un petit sélecteur de calque. Plus de
 *             RANGÉE de 5 filtres : le calque est AUTO selon le contexte
 *             (MapScreen dérive defense→calque défense, sinon route-first).
 *   bas       MapBottomSheet DIRECTIVE + UN SEUL CTA (RunButton, le flux départ
 *             unique de la phase 1 — plus aucun FAB flottant central) :
 *             COMPACT  la consigne (`DÉFENSE RECOMMANDÉE — République est
 *                      attaqué. Cours 4,4 km pour sauver 3 zones.`) + [DÉFENDRE]
 *                      + « Changer de route » (lien discret).
 *             SEMI     + défi à proximité, zone bonus, membres crew dispo.
 *             OUVERT   + choix de PARCOURS + run d'ami à rejoindre. Les %
 *                      de contrôle DÉTAILLÉS vivent ici (semi), jamais sur la
 *                      carte.
 * Anti-shame : objectifs crew, jamais de retard individuel.
 * Events : screen('map_sheet_open') / screen('map_parcours_select') /
 * screen('map_mode_select') / screen('map_shares_expand') (génériques) ;
 * EVENTS.runStart au départ réel (porté par RunButton).
 */
import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, gameColors, radii, type IconName } from '@klaim/shared';
import { screen } from '../../lib/analytics';
import { haptics } from '../../lib/haptics';
import { Icon } from '../../ui/Icon';
import {
  FloatingMapButton,
  InlineRunCTA,
  MAP_SHEET_COMPACT_HEIGHT,
  MapBottomSheet,
  timeAgoLabel,
  useSlideIn,
  type MapSheetState,
} from '../../ui/game';
import { RunButton } from '../nav/RunButton';
import { RUN_BUTTON_BOTTOM, RUN_BUTTON_SIZE } from '../nav/metrics';
import { deriveAutoPlan, intentionHref, mapDirective } from '../nav/runContext';
import { MISSIONS } from '../warroom/demo';
import {
  FRIEND_RUN_DEMO,
  MAP_BONUS_ZONE,
  MAP_CHALLENGE,
  MAP_CONTROL_HUD,
  MAP_HUD,
  MAP_RIVAL_ALERT,
  MAP_WAR_FEED,
  MATES_OPT_IN,
  MATES_SHARING_LABEL,
  PARCOURS_DEMO,
  WAR_FEED_CYCLE_MS,
  parcoursMeta,
  type MapWarFeedEventDemo,
} from './demo';
import type { BattleMapSummary } from './fakeHexes';
import {
  MAP_MODE_ICON,
  MAP_MODE_LABELS,
  MAP_MODE_ORDER,
  type MapMode,
} from './territory';

/**
 * Libellés AFFICHÉS des calques : « Raid » devient « Rival » à l'écran
 * (AMENDEMENT-12 §A — calque de lecture du territoire rival ; la clé interne
 * `raid` de territory.ts ne change pas).
 */
const MODE_CHIP_LABELS: Record<MapMode, string> = {
  ...MAP_MODE_LABELS,
  raid: 'Rival',
};

/** Un event est LIVE s'il date de moins de 10 min (même seuil que WarEventCard). */
const LIVE_MAX_MINUTES = 10;
/** Dégagement de la sheet au-dessus de la barre de nav. */
const SHEET_ABOVE_RUN_BUTTON = 12;
/** Pile de boutons flottants : dégagement au-dessus de la sheet compacte. */
const FAB_ABOVE_SHEET = 12;
/** Un event rival est une ATTAQUE (alerte actionnable) via l'icône raid. */
const RIVAL_ALERT_ICON: IconName = 'raid';

/**
 * UNE phrase rivale sous la pill (AMENDEMENT-17 §1.2) : « Canal Crew gagne du
 * terrain. 3 zones à défendre. ». Le compte de zones vient du decay réel du
 * secteur (summary) — pas de nombre magique.
 */
function rivalPhrase(zonesToDefend: number): string {
  const n = Math.max(1, zonesToDefend);
  return `${MAP_CONTROL_HUD.rivalName} gagne du terrain. ${n} zone${n > 1 ? 's' : ''} à défendre.`;
}

export interface BattleMapOverlaysProps {
  /** Calque de carte actif (un seul à la fois) — AUTO par défaut (MapScreen). */
  mode: MapMode;
  onSelectMode: (mode: MapMode) => void;
  summary: BattleMapSummary;
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
  onRecenter,
  selectedParcoursId = null,
  onSelectParcours,
}: BattleMapOverlaysProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  // La sheet n'expose pas de contrôle impératif : le bouton Stats la REMONTE
  // en semi (remount key + initialState — snap direct, façon reduce motion).
  const [sheet, setSheet] = useState<{ key: number; initial: MapSheetState }>({
    key: 0,
    initial: 'compact',
  });
  /** % de contrôle : cachés par défaut, révélés AU TAP de la pill (détail). */
  const [sharesOpen, setSharesOpen] = useState(false);
  /** Sélecteur de calque « Couches » — fermé par défaut (un seul bouton). */
  const [layersOpen, setLayersOpen] = useState(false);

  /** Bas de l'écran réservé à la barre de nav (le FAB central est supprimé). */
  const sheetBottom = insets.bottom + RUN_BUTTON_BOTTOM + SHEET_ABOVE_RUN_BUTTON;

  const openSheetSemi = () => {
    setSheet((s) => ({ key: s.key + 1, initial: 'semi' }));
    screen('map_sheet_open', { state: 'semi', via: 'stats_button' });
  };

  const toggleShares = () => {
    haptics.light();
    setSharesOpen((v) => {
      if (!v) screen('map_shares_expand', {});
      return !v;
    });
  };

  const selectMode = (key: MapMode) => {
    setLayersOpen(false);
    if (mode === key) return;
    haptics.light();
    onSelectMode(key);
    screen('map_mode_select', { mode: key });
  };

  /** Directive de la carte (AMENDEMENT-17 §1.2) — la consigne + le libellé du CTA. */
  const directive = mapDirective();
  /** Départ défense téinté par intention (client-seul) — AMENDEMENT-16 §1. */
  const plan = deriveAutoPlan();

  /**
   * ALERTE RIVAL actionnable : dès qu'une attaque du secteur existe, elle PREND
   * la place du war feed (la menace prioritaire, lisible en 1 s + CTA). Le war
   * feed passif ne réapparaît que sans menace active.
   */
  const rivalThreat = MAP_RIVAL_ALERT.zonesLost > 0;
  const defendRival = () => {
    haptics.medium();
    router.push(intentionHref('defense', plan.routeId));
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
      {/* ── Haut : UNE pill (tap = détail % contrôle) + phrase + alerte rival ── */}
      <View style={[styles.top, { top: insets.top + 10 }]} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: sharesOpen }}
          accessibilityLabel={
            sharesOpen
              ? 'Masquer les parts de contrôle du secteur'
              : `${MAP_HUD.zoneName} — ${MAP_CONTROL_HUD.stateLabel}. Voir les parts de contrôle.`
          }
          onPress={toggleShares}
          style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
        >
          <Text style={styles.pillText} numberOfLines={1}>
            {MAP_HUD.zoneName.toUpperCase()} · {MAP_CONTROL_HUD.stateLabel} ·{' '}
            <Text style={styles.pillRank}>#{MAP_HUD.crewRank}</Text>
          </Text>
          {sharesOpen ? (
            <Text style={styles.pillShares} numberOfLines={1}>
              <Text style={styles.pillSharesCrew}>Ton crew {MAP_CONTROL_HUD.crewPct} %</Text>
              {' · '}
              {MAP_CONTROL_HUD.rivalName} {MAP_CONTROL_HUD.rivalPct} % · Neutre{' '}
              {MAP_CONTROL_HUD.neutralPct} %
            </Text>
          ) : (
            <Text style={styles.pillPhrase} numberOfLines={1}>
              {rivalPhrase(summary.decay)}
            </Text>
          )}
        </Pressable>

        {/* ── Alerte rival actionnable (AMENDEMENT-17 §1.2) ─────────────────── */}
        {rivalThreat ? (
          <RivalAlertCard onDefend={defendRival} />
        ) : (
          <View style={styles.feedWrap} pointerEvents="none">
            <WarFeedTicker />
          </View>
        )}
      </View>

      {/* ── Droite : Couches + recentrer + stats (flottants, anti-bruit) ───── */}
      <View
        style={[
          styles.fabColumn,
          { bottom: sheetBottom + MAP_SHEET_COMPACT_HEIGHT + FAB_ABOVE_SHEET },
        ]}
        pointerEvents="box-none"
      >
        {layersOpen ? (
          <LayerSelector active={mode} onSelect={selectMode} />
        ) : null}
        <FloatingMapButton
          icon="calques"
          accessibilityLabel="Couches de la carte"
          active={layersOpen}
          onPress={() => {
            haptics.light();
            setLayersOpen((v) => !v);
          }}
        />
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

      {/* ── Bas : bottom sheet DIRECTIVE, au-dessus de la barre de nav ─────── */}
      <View style={[styles.sheetWrap, { bottom: sheetBottom }]} pointerEvents="box-none">
        <MapBottomSheet
          key={sheet.key}
          initialState={sheet.initial}
          onStateChange={(state) => {
            if (state !== 'compact') screen('map_sheet_open', { state });
          }}
          compactSlot={
            <View style={styles.compactBody}>
              <Text
                style={[
                  styles.kicker,
                  { color: directive.lecture === 'defense' ? gameColors.verify : gameColors.crew },
                ]}
                numberOfLines={1}
              >
                {directive.kicker}
              </Text>
              <Text style={styles.directiveTitle} numberOfLines={1}>
                {directive.headline}
              </Text>
              <Text style={styles.directiveOrder} numberOfLines={1}>
                {directive.order}
              </Text>
              {/* UN SEUL CTA de départ (RunButton = flux unique phase 1). */}
              <View style={styles.ctaWrap}>
                <RunButton label={directive.ctaLabel} />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Changer de route — ouvrir le Route Planner"
                hitSlop={8}
                onPress={() => router.push('/route-planner')}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <Text style={styles.routeLink} numberOfLines={1}>
                  Changer de route
                </Text>
              </Pressable>
            </View>
          }
          semiSlot={
            <View style={styles.semiBlock}>
              {/* % de contrôle DÉTAILLÉS : ils vivent ICI (détail), pas sur la carte. */}
              <View style={styles.row}>
                <View style={styles.rowIcon}>
                  <Icon name="crew" size={14} color={gameColors.crew} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    Contrôle du secteur
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    Ton crew {MAP_CONTROL_HUD.crewPct} % · {MAP_CONTROL_HUD.rivalName}{' '}
                    {MAP_CONTROL_HUD.rivalPct} % · Neutre {MAP_CONTROL_HUD.neutralPct} %
                  </Text>
                </View>
              </View>
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
                  style={({ pressed }) => [styles.joinCta, pressed && styles.pressed]}
                >
                  <Text style={styles.joinCtaLabel}>Rejoindre</Text>
                </Pressable>
              </View>
            </View>
          }
        />
      </View>
    </View>
  );
}

/** « 4,2 km » — décimale française, pas d'Intl (parité Hermes). */
function formatKm(km: number): string {
  return `${km.toFixed(1).replace('.', ',')} km`;
}

/**
 * ALERTE RIVAL actionnable (AMENDEMENT-17 §1.2) : lisible en 1 s + CTA
 * [Défendre]. Slide-in à l'apparition. Orange (rival) = la menace, chartreuse
 * (crew) = l'action de défense.
 */
function RivalAlertCard({ onDefend }: { onDefend: () => void }) {
  const { opacity, translateY } = useSlideIn(10);
  return (
    <Animated.View style={[styles.rivalCard, { opacity, transform: [{ translateY }] }]}>
      <View style={styles.rivalBody}>
        <Text style={styles.rivalTitle} numberOfLines={1}>
          <Icon name={RIVAL_ALERT_ICON} size={12} color={gameColors.rival} />{' '}
          {MAP_RIVAL_ALERT.rivalName} attaque {MAP_RIVAL_ALERT.zone}
        </Text>
        <Text style={styles.rivalMeta} numberOfLines={1}>
          {MAP_RIVAL_ALERT.zonesLost} zones reprises · {timeAgoLabel(MAP_RIVAL_ALERT.minutesAgo)}
        </Text>
      </View>
      <View style={styles.rivalCtaSlot}>
        <InlineRunCTA
          label="DÉFENDRE"
          size="md"
          onPress={onDefend}
          accessibilityLabel={`Défendre ${MAP_RIVAL_ALERT.zone} contre ${MAP_RIVAL_ALERT.rivalName}`}
        />
      </View>
    </Animated.View>
  );
}

/**
 * Sélecteur de calque « Couches » (AMENDEMENT-17 §1.2) : petit menu vertical
 * ouvert par le bouton calques — remplace la rangée de 5 filtres permanente.
 * Un calque actif à la fois ; le défaut est AUTO (MapScreen).
 */
function LayerSelector({
  active,
  onSelect,
}: {
  active: MapMode;
  onSelect: (mode: MapMode) => void;
}) {
  return (
    <View style={styles.layerMenu}>
      {MAP_MODE_ORDER.map((key) => {
        const on = active === key;
        return (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`Calque ${MODE_CHIP_LABELS[key]}`}
            onPress={() => onSelect(key)}
            style={({ pressed }) => [
              styles.layerItem,
              on && styles.layerItemActive,
              pressed && styles.pressed,
            ]}
          >
            <Icon
              name={MAP_MODE_ICON[key]}
              size={15}
              color={on ? gameColors.crew : colors.blanc}
            />
            <Text style={[styles.layerLabel, on && styles.layerLabelActive]} numberOfLines={1}>
              {MODE_CHIP_LABELS[key]}
            </Text>
          </Pressable>
        );
      })}
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
    maxWidth: '100%',
  },
  pillText: {
    color: colors.blanc,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  pillRank: { color: gameColors.crew },
  // UNE phrase rivale sous la pill (remplace les % permanents — détail au tap).
  pillPhrase: {
    color: colors.gris,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  // Parts de contrôle — révélées AU TAP seulement.
  pillShares: {
    color: colors.gris,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  pillSharesCrew: { color: gameColors.crew },

  // ── Alerte rival actionnable ──
  rivalCard: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 10,
    paddingRight: 8,
    paddingVertical: 8,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: gameColors.rival,
    backgroundColor: OVERLAY_SURFACE,
  },
  rivalBody: { flex: 1, gap: 1 },
  rivalTitle: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '700' },
  rivalMeta: { color: colors.gris, fontSize: 10, fontVariant: ['tabular-nums'] },
  // Le CTA [Défendre] garde une largeur bornée (l'InlineRunCTA est plein-largeur).
  rivalCtaSlot: { width: 132 },

  // ── Sélecteur de calque « Couches » ──
  layerMenu: {
    alignSelf: 'flex-end',
    gap: 6,
    padding: 6,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: OVERLAY_SURFACE,
    marginBottom: 4,
  },
  layerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  layerItemActive: { borderColor: gameColors.crew, backgroundColor: gameColors.carbon },
  layerLabel: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '600' },
  layerLabelActive: { color: gameColors.crew },

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
  // overflow hidden elle réapparaîtrait derrière la barre de nav).
  sheetWrap: { position: 'absolute', left: 0, right: 0, top: 0, overflow: 'hidden' },

  // ── Compact = la DIRECTIVE + UN CTA (RunButton) + lien secondaire ──
  compactBody: { paddingHorizontal: 16, paddingBottom: 10, gap: 2 },
  // Teinte inline par la LECTURE (défense = verify, conquête = chartreuse).
  kicker: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  directiveTitle: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '700' },
  directiveOrder: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600' },
  ctaWrap: { marginTop: 6 },
  // « Changer de route » — lien discret (le planner est OPTIONNEL, A-14 §3).
  routeLink: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    textDecorationLine: 'underline',
    textAlign: 'center',
    marginTop: 6,
  },

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
  joinCta: {
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
  joinCtaLabel: { color: gameColors.crew, fontSize: fontSizes.xs, fontWeight: '700' },
});
