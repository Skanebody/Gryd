/**
 * GRYD — la Carte comme ÉCRAN MISSION (AMENDEMENT-21). La Carte n'est plus un
 * « dashboard de guerre » (header empilé + alerte rival avec CTA + gros bandeau
 * bonus + colonne de 4 FABs + double card « défense recommandée »). Règle
 * absolue : 1 écran = 1 décision — « Est-ce que je pars défendre MAINTENANT ? ».
 * Formule : carte épurée + 1 mission prioritaire + 1 bouton principal + le reste
 * dans un BOTTOM SHEET. L'utilisateur comprend + appuie [Défendre] en < 3 s.
 * Vocabulaire TERRITOIRES ORGANIQUES (zones/frontières/rues/routes — JAMAIS
 * hexagone). Partagé entre MapScreen natif et .web :
 *
 *   4 ÉLÉMENTS EN PERMANENCE (rien d'autre) :
 *   1. HEADER COMPACT — UNE ligne : « République attaquée » + sous-ligne
 *      « 3 zones à sauver ». Un seul message : va défendre République.
 *   2. CARTE : 70-75 % de l'écran (silencieuse — pilotée par MapScreen/mapStyle).
 *   3. CARD STICKY BASSE (compact du sheet) + 1 CTA UNIQUE : « Défendre
 *      République » + méta « 4,4 km · 3 zones · bonus actif » + micro-ligne
 *      bonus (« bonus actif · +120 pts ») + gros [Défendre] + lien discret
 *      [Voir les options].
 *   4. BOTTOM NAV : inchangée (layout).
 *
 *   ALERTE RIVAL : pill compacte INFORMATIVE, SANS CTA (« Canal Crew reprend du
 *   terrain · 14 zones perdues »). L'alerte informe, la card convertit — le seul
 *   CTA de l'écran est [Défendre].
 *
 *   BOUTONS FLOTTANTS DROITE : 2 MAX — « Recentrer/ma position » + « Calques »
 *   (le fond dark/couleur et les calques de lecture vivent DANS le menu Calques,
 *   fermé par défaut ; l'ancien 3ᵉ FAB Info est SUPPRIMÉ — sa situation devient
 *   le 1er bloc RÉSUMÉ du sheet). Fini l'effet cockpit.
 *
 *   BOTTOM SHEET 2 ÉTATS (MapBottomSheet) :
 *   - FERMÉ  : la card sticky (Défendre République · [Défendre] · Voir options).
 *   - OUVERT (tap « Voir les options ») : 4 blocs MAX — RÉSUMÉ (ex-SituationCard :
 *     zone · crew % vs rival % · bonus · temps restant) · PARCOURS (2-3) ·
 *     ÉQUIPE (2 alliés opt-in + « Courir ensemble ») · DÉTAILS (missions +
 *     historique, liens vers les pages existantes).
 *
 * Anti-shame : objectifs crew, jamais de retard individuel. Anti pay-to-win : le
 * serveur tranche territoire et récompenses ; les km/pts sont des labels de
 * scénario (demo.ts). Reduce motion respecté (useSlideIn/useReduceMotion, snap
 * direct de la sheet). Haptics à chaque intention.
 * Events : screen('map_sheet_open') / screen('map_parcours_select') /
 * screen('map_mode_select') (génériques) ; EVENTS.runStart au départ réel
 * (porté par RunButton).
 */
import { useCallback, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, gameColors, radii } from '@klaim/shared';
import { screen } from '../../lib/analytics';
import { haptics } from '../../lib/haptics';
import { Icon } from '../../ui/Icon';
import {
  FloatingMapButton,
  MAP_SHEET_COMPACT_HEIGHT,
  MapBottomSheet,
  useSlideIn,
  type MapSheetState,
} from '../../ui/game';
import { RunButton } from '../nav/RunButton';
import { RUN_BUTTON_BOTTOM } from '../nav/metrics';
import { deriveAutoPlan, intentionHref } from '../nav/runContext';
import { MISSIONS } from '../warroom/demo';
import {
  FRIEND_RUN_DEMO,
  MAP_MISSION,
  MAP_MISSION_SUMMARY,
  MAP_RIVAL_PILL,
  MATES_OPT_IN,
  PARCOURS_DEMO,
  parcoursMeta,
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

/** Dégagement de la sheet au-dessus de la barre de nav. */
const SHEET_ABOVE_RUN_BUTTON = 12;
/** Pile de boutons flottants : dégagement au-dessus de la sheet compacte. */
const FAB_ABOVE_SHEET = 12;

/** « 4,4 km » — décimale française, pas d'Intl (parité Hermes). */
function formatKm(km: number): string {
  return `${km.toFixed(1).replace('.', ',')} km`;
}

/** « 3 zones » / « 1 zone » — accord singulier/pluriel (jamais tronqué). */
function zonesLabel(n: number): string {
  const v = Math.max(1, n);
  return `${v} zone${v > 1 ? 's' : ''}`;
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
  /** Fond de carte courant + bascule sombre↔couleur (dans le menu Calques). */
  basemap?: 'dark' | 'color';
  onToggleBasemap?: () => void;
}

export function BattleMapOverlays({
  mode,
  onSelectMode,
  summary,
  onRecenter,
  selectedParcoursId = null,
  onSelectParcours,
  basemap = 'dark',
  onToggleBasemap,
}: BattleMapOverlaysProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  // La sheet n'expose pas de contrôle impératif : « Voir les options » la
  // remonte en OUVERT (remount key + initialState — snap direct, façon reduce
  // motion). FERMÉE = la card sticky ; OUVERTE = les 4 blocs.
  const [sheet, setSheet] = useState<{ key: number; initial: MapSheetState }>({
    key: 0,
    initial: 'compact',
  });
  /** Menu « Calques » (fond + calques de lecture) — fermé par défaut. */
  const [layersOpen, setLayersOpen] = useState(false);

  // Chaque entrée sur la Carte repart de la card mission FERMÉE : les onglets
  // restent montés (expo-router), donc on force la sheet en compact au focus —
  // règle des 3 s garantie au retour (remount key + initial compact, snap).
  useFocusEffect(
    useCallback(() => {
      setSheet((s) => ({ key: s.key + 1, initial: 'compact' }));
      setLayersOpen(false);
    }, []),
  );

  /** Bas de l'écran réservé à la barre de nav (le FAB central est supprimé). */
  const sheetBottom = insets.bottom + RUN_BUTTON_BOTTOM + SHEET_ABOVE_RUN_BUTTON;

  /** Départ défense téinté par intention (client-seul) — le serveur tranche. */
  const plan = deriveAutoPlan();

  const openOptions = () => {
    haptics.light();
    setSheet((s) => ({ key: s.key + 1, initial: 'open' }));
  };

  const selectMode = (key: MapMode) => {
    setLayersOpen(false);
    if (mode === key) return;
    haptics.light();
    onSelectMode(key);
    screen('map_mode_select', { mode: key });
  };

  const selectParcours = (id: string) => {
    haptics.light();
    const next = selectedParcoursId === id ? null : id;
    onSelectParcours?.(next);
    if (next) screen('map_parcours_select', { id });
  };

  const mission = MISSIONS[0];

  /** Allié opt-in le PLUS proche (bloc ÉQUIPE — libellé court non tronqué). */
  const nearestMate = MATES_OPT_IN.reduce<(typeof MATES_OPT_IN)[number] | null>(
    (best, m) => (best === null || m.distanceKm < best.distanceKm ? m : best),
    null,
  );
  const nearestMateName = nearestMate?.name ?? '';
  const nearestMateKm = nearestMate?.distanceKm ?? 0;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* ── HEADER COMPACT — UNE ligne (titre + sous-ligne) + pill rival ──── */}
      <View style={[styles.top, { top: insets.top + 10 }]} pointerEvents="box-none">
        <View style={styles.header}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {MAP_MISSION.headerTitle}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {MAP_MISSION.headerSubtitle}
          </Text>
        </View>

        {/* Pill RIVAL : compacte, INFORMATIVE, SANS CTA (l'alerte informe). */}
        <RivalPill />
      </View>

      {/* ── Droite : 2 FABs MAX (Recentrer + Calques) — fini l'effet cockpit ── */}
      <View
        style={[
          styles.fabColumn,
          { bottom: sheetBottom + MAP_SHEET_COMPACT_HEIGHT + FAB_ABOVE_SHEET },
        ]}
        pointerEvents="box-none"
      >
        {layersOpen ? (
          <LayerMenu
            active={mode}
            onSelect={selectMode}
            basemap={basemap}
            onToggleBasemap={
              onToggleBasemap
                ? () => {
                    haptics.light();
                    onToggleBasemap();
                  }
                : undefined
            }
          />
        ) : null}
        <FloatingMapButton
          icon="calques"
          accessibilityLabel="Calques et fond de carte"
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
      </View>

      {/* ── Bas : bottom sheet 2 états — FERMÉ = card sticky, OUVERT = 4 blocs ── */}
      <View style={[styles.sheetWrap, { bottom: sheetBottom }]} pointerEvents="box-none">
        <MapBottomSheet
          key={sheet.key}
          initialState={sheet.initial}
          onStateChange={(state) => {
            if (state !== 'compact') screen('map_sheet_open', { state });
          }}
          compactSlot={
            <MissionCard
              onDefend={() => {
                haptics.medium();
                router.push(intentionHref('defense', plan.routeId));
              }}
              onOptions={openOptions}
            />
          }
          openSlot={
            <View style={styles.openBlock}>
              {/* BLOC 1 — RÉSUMÉ (ex-SituationCard AMENDEMENT-17, fusionnée). */}
              <SummaryBlock />

              {/* BLOC 2 — PARCOURS (2-3 max : km + gain). */}
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
                      styles.rowCard,
                      selected && styles.rowCardSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.rowBody}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {p.name}
                      </Text>
                      <Text style={styles.rowMeta} numberOfLines={1}>
                        {formatKm(meta.distanceKm)} · {zonesLabel(meta.hexes)} · +{meta.points} pts
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

              {/* BLOC 3 — ÉQUIPE (2 alliés opt-in proches + « Courir ensemble »).
                  Libellé COURT non tronqué : le nombre d'alliés + le plus proche
                  (les pseudos entiers déborderaient — pet peeve #1). */}
              <Text style={styles.sectionTitle}>ÉQUIPE</Text>
              <View style={styles.rowCard}>
                <View style={styles.rowIcon}>
                  <Icon name="ami" size={14} color={gameColors.crew} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {MATES_OPT_IN.length} alliés proches
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {nearestMateName} · {formatKm(nearestMateKm)}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Courir ensemble avec les alliés proches"
                  onPress={() => {
                    haptics.medium();
                    // Démo : le run groupé réel passera par l'invitation AMENDEMENT-07.
                    if (__DEV__) console.log('[map] courir ensemble (démo)');
                  }}
                  style={({ pressed }) => [styles.joinCta, pressed && styles.pressed]}
                >
                  <Text style={styles.joinCtaLabel} numberOfLines={1}>
                    Courir ensemble
                  </Text>
                </Pressable>
              </View>

              {/* BLOC 4 — DÉTAILS (missions liées + historique local). */}
              <Text style={styles.sectionTitle}>DÉTAILS</Text>
              {mission ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Mission ${mission.label} — ouvrir la War Room`}
                  onPress={() => {
                    haptics.light();
                    router.push('/warroom');
                  }}
                  style={({ pressed }) => [styles.rowCard, pressed && styles.pressed]}
                >
                  <View style={styles.rowIcon}>
                    <Icon name="cible" size={14} color={colors.blanc} />
                  </View>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {mission.label}
                    </Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {mission.progress}/{mission.target} · mission du jour
                    </Text>
                  </View>
                  <Icon name="chevron" size={14} color={colors.gris} />
                </Pressable>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Historique de mes courses"
                onPress={() => {
                  haptics.light();
                  router.push('/historique');
                }}
                style={({ pressed }) => [styles.rowCard, pressed && styles.pressed]}
              >
                <View style={styles.rowIcon}>
                  <Icon name="historique" size={14} color={colors.blanc} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    Mon historique
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {FRIEND_RUN_DEMO.name} · {FRIEND_RUN_DEMO.zone} · {FRIEND_RUN_DEMO.distanceKm} km
                  </Text>
                </View>
                <Icon name="chevron" size={14} color={colors.gris} />
              </Pressable>
            </View>
          }
        />
      </View>
    </View>
  );
}

/**
 * CARD STICKY (compact du sheet) : la mission prioritaire + le CTA UNIQUE.
 * Titre « Défendre République » · méta « 4,4 km · 3 zones · bonus actif » ·
 * micro-ligne bonus (« bonus actif · +120 pts ») · gros [Défendre] (chartreuse)
 * · lien discret [Voir les options]. RIEN de tronqué.
 */
function MissionCard({
  onDefend,
  onOptions,
}: {
  onDefend: () => void;
  onOptions: () => void;
}) {
  // Meta = distance + zones ; le bonus vit dans SA micro-ligne (pas de doublon).
  const meta = `${formatKm(MAP_MISSION.distanceKm)} · ${zonesLabel(MAP_MISSION.zones)}`;
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle} numberOfLines={1}>
        {MAP_MISSION.cardTitle}
      </Text>
      <Text style={styles.cardMeta} numberOfLines={1}>
        {meta}
      </Text>
      {/* Micro-ligne bonus (plus de gros bandeau BONUS ACTIF horizontal). */}
      <View style={styles.bonusMicro}>
        <Icon name="eclats" size={12} color={gameColors.crew} />
        <Text style={styles.bonusMicroText} numberOfLines={1}>
          {MAP_MISSION.bonusMicroLabel} · +{MAP_MISSION.bonusPoints} pts
        </Text>
      </View>
      {/* UN SEUL CTA de départ (RunButton = flux unique phase 1). */}
      <View style={styles.ctaWrap}>
        <RunButton label={MAP_MISSION.ctaLabel} />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Voir les options — ouvrir le panneau de mission"
        hitSlop={8}
        onPress={onOptions}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <Text style={styles.optionsLink} numberOfLines={1}>
          {MAP_MISSION.optionsLabel}
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * Pill RIVAL (AMENDEMENT-21 §5) : compacte, INFORMATIVE seulement, SANS CTA —
 * « Canal Crew reprend du terrain · 14 zones perdues ». Petite ligne discrète
 * (point orange = la menace), jamais un gros bloc rouge alarmiste permanent.
 * Slide-in doux à l'apparition (reduce motion → fondu). Le seul CTA de l'écran
 * reste [Défendre] dans la card.
 */
function RivalPill() {
  const { opacity, translateY } = useSlideIn(6);
  return (
    <Animated.View style={[styles.rivalPill, { opacity, transform: [{ translateY }] }]}>
      <View style={styles.rivalDot} />
      <Text style={styles.rivalText} numberOfLines={1}>
        {MAP_RIVAL_PILL.message}
      </Text>
      <Text style={styles.rivalSep}>·</Text>
      <Text style={styles.rivalLost} numberOfLines={1}>
        {zonesLabel(MAP_RIVAL_PILL.zonesLost)} perdues
      </Text>
    </Animated.View>
  );
}

/**
 * BLOC RÉSUMÉ du sheet (ex-SituationCard AMENDEMENT-17, fusionnée ici — plus de
 * 3ᵉ FAB Info) : zone · état · crew % vs rival % · bonus · temps restant. Les %
 * de contrôle vivent ICI (détail au tap), jamais en permanence sur la carte.
 */
function SummaryBlock() {
  const s = MAP_MISSION_SUMMARY;
  return (
    <View style={styles.summary}>
      <Text style={styles.summaryTitle} numberOfLines={1}>
        {s.zone} · {s.stateLabel}
      </Text>
      <Text style={styles.summaryShares} numberOfLines={1}>
        <Text style={styles.summaryCrew}>Ton crew {s.crewPct} %</Text>
        {`  ·  ${s.rivalName} ${s.rivalPct} %`}
      </Text>
      <View style={styles.summaryFoot}>
        <View style={styles.summaryChip}>
          <Icon name="eclats" size={12} color={gameColors.crew} />
          <Text style={styles.summaryChipText} numberOfLines={1}>
            {MAP_MISSION.bonusMicroLabel} · +{MAP_MISSION.bonusPoints} pts
          </Text>
        </View>
        <View style={styles.summaryChip}>
          <Icon name="sablier" size={12} color={gameColors.danger} />
          <Text style={styles.summaryChipText} numberOfLines={1}>
            {s.timeLeftLabel}
          </Text>
        </View>
      </View>
    </View>
  );
}

/**
 * Menu « Calques » (AMENDEMENT-21) : ouvert par le FAB Calques — remplace la
 * rangée de 5 filtres permanente ET absorbe la bascule de fond (plus de 3ᵉ FAB
 * Fond). En haut, le fond de carte (Sombre/Couleur) ; en dessous, les calques
 * de lecture (un actif à la fois ; le défaut est AUTO selon le contexte). Fermé
 * par défaut — il ne s'ouvre jamais tout seul.
 */
function LayerMenu({
  active,
  onSelect,
  basemap,
  onToggleBasemap,
}: {
  active: MapMode;
  onSelect: (mode: MapMode) => void;
  basemap: 'dark' | 'color';
  onToggleBasemap?: () => void;
}) {
  return (
    <View style={styles.layerMenu}>
      {onToggleBasemap ? (
        <>
          <Text style={styles.layerHeading}>FOND</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              basemap === 'color'
                ? 'Fond de carte couleur (toucher pour repasser en sombre)'
                : 'Fond de carte sombre (toucher pour passer en couleur)'
            }
            onPress={onToggleBasemap}
            style={({ pressed }) => [styles.layerItem, pressed && styles.pressed]}
          >
            <Icon name="carte" size={15} color={colors.blanc} />
            <Text style={styles.layerLabel} numberOfLines={1}>
              {basemap === 'color' ? 'Couleur' : 'Sombre'}
            </Text>
          </Pressable>
          <View style={styles.layerDivider} />
        </>
      ) : null}
      <Text style={styles.layerHeading}>CALQUES</Text>
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

/** Surface profonde translucide commune aux flottants (HUD sur carte). */
const OVERLAY_SURFACE = 'rgba(16,18,16,0.92)';

const styles = StyleSheet.create({
  top: { position: 'absolute', left: 14, right: 14, gap: 8, alignItems: 'center' },
  pressed: { opacity: 0.7 },

  // ── HEADER COMPACT : UNE ligne titre + sous-ligne (un seul message) ──
  header: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: OVERLAY_SURFACE,
  },
  headerTitle: {
    color: colors.blanc,
    fontSize: fontSizes.lg, // 20 px
    fontWeight: '800',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  headerSubtitle: {
    color: colors.gris,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 1,
    textAlign: 'center',
  },

  // ── Pill RIVAL : compacte, INFORMATIVE, SANS CTA ──
  rivalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: OVERLAY_SURFACE,
    maxWidth: '100%',
  },
  rivalDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: gameColors.rival },
  rivalText: { color: colors.blanc, fontSize: 12, fontWeight: '600', flexShrink: 1 },
  rivalSep: { color: colors.gris, fontSize: 12 },
  rivalLost: { color: colors.gris, fontSize: 12, fontVariant: ['tabular-nums'] },

  // ── FAB column : 2 MAX (Recentrer + Calques) ──
  fabColumn: { position: 'absolute', right: 14, gap: 10, alignItems: 'flex-end' },

  // ── Menu Calques (fond + calques de lecture) ──
  layerMenu: {
    alignSelf: 'flex-end',
    gap: 4,
    padding: 8,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: OVERLAY_SURFACE,
    marginBottom: 4,
    minWidth: 168,
  },
  layerHeading: {
    color: colors.gris,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginLeft: 2,
    marginTop: 2,
    marginBottom: 2,
  },
  layerDivider: {
    height: 1,
    backgroundColor: colors.grisLigne,
    marginVertical: 4,
  },
  layerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  layerItemActive: { borderColor: gameColors.crew, backgroundColor: gameColors.carbon },
  layerLabel: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '600' },
  layerLabelActive: { color: gameColors.crew },

  // Le wrapper CLIPPE la sheet (elle glisse vers le bas en compact).
  sheetWrap: { position: 'absolute', left: 0, right: 0, top: 0, overflow: 'hidden' },

  // ── CARD STICKY (compact) : la mission + le CTA unique ──
  card: { paddingHorizontal: 16, paddingBottom: 12, gap: 2 },
  cardTitle: { color: colors.blanc, fontSize: 17, fontWeight: '800', letterSpacing: 0.2 },
  cardMeta: {
    color: colors.gris,
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  // Micro-ligne bonus (remplace le gros bandeau BONUS ACTIF).
  bonusMicro: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  bonusMicroText: {
    color: gameColors.crew,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  ctaWrap: { marginTop: 10 },
  // « Voir les options » — lien discret (ouvre le sheet, jamais un 2ᵉ CTA fort).
  optionsLink: {
    color: colors.gris,
    fontSize: 13,
    textDecorationLine: 'underline',
    textAlign: 'center',
    marginTop: 10,
  },

  // ── Sheet OUVERT : 4 blocs ──
  openBlock: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
    gap: 8,
  },
  sectionTitle: {
    color: colors.gris,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 6,
  },

  // BLOC RÉSUMÉ (ex-SituationCard).
  summary: {
    padding: 14,
    gap: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone,
  },
  summaryTitle: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '800', letterSpacing: 0.2 },
  summaryShares: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600', fontVariant: ['tabular-nums'] },
  summaryCrew: { color: gameColors.crew },
  summaryFoot: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  summaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: gameColors.carbon,
  },
  summaryChipText: { color: colors.blanc, fontSize: 11, fontWeight: '600' },

  // Lignes-cartes (parcours / équipe / détails).
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone,
  },
  rowCardSelected: { borderColor: colors.chartreuse40 },
  rowIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: gameColors.carbon,
  },
  rowBody: { flex: 1, gap: 1 },
  rowTitle: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '600' },
  rowMeta: { color: colors.gris, fontSize: 11, fontVariant: ['tabular-nums'] },
  onMapTag: { color: gameColors.crew, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  joinCta: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: gameColors.carbon,
  },
  joinCtaLabel: { color: gameColors.crew, fontSize: fontSizes.xs, fontWeight: '700' },
});
