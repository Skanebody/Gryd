/**
 * GRYD — la Carte comme ÉCRAN MISSION (AMENDEMENT-21) qui RESPIRE AU MAXIMUM
 * (AMENDEMENT-25 §1). Règle absolue : 1 écran = 1 carte. La card de mission ne
 * vit PLUS en permanence en bas — elle passe SOUS le bouton « Info ». L'écran
 * par défaut n'est QUE : header 1 ligne + pill rival + carte + bottom nav +
 * FABs. Plus RIEN en bas par défaut. L'action reste à 1 tap (Info → Défendre).
 * Vocabulaire TERRITOIRES ORGANIQUES (zones/frontières/rues — JAMAIS hexagone).
 * Partagé entre MapScreen natif et .web :
 *
 *   ÉCRAN PAR DÉFAUT (rien d'autre) :
 *   1. HEADER COMPACT — UNE ligne : « République attaquée » + sous-ligne
 *      « 3 zones à sauver ». Un seul message : va défendre République.
 *   2. PILL RIVAL : compacte, INFORMATIVE, SANS CTA (« Canal Crew reprend du
 *      terrain · 14 zones perdues »). L'alerte informe, l'Info convertit.
 *   3. CARTE : plein écran (silencieuse — pilotée par MapScreen/mapStyle).
 *   4. BOTTOM NAV : inchangée (layout).
 *   Aucune card sticky : la carte occupe tout le bas.
 *
 *   BOUTONS FLOTTANTS DROITE : 3 MAX — « Recentrer/ma position » · « Calques »
 *   (fond dark/couleur + calques de lecture, fermé par défaut) · « INFO »
 *   (AMENDEMENT-25 §1). Le FAB Info est l'ACCÈS PRINCIPAL à l'action : il
 *   remplace la card sticky, il ne s'ajoute pas à un cockpit.
 *
 *   PANNEAU INFO (MapBottomSheet, révélé au tap sur le FAB Info) :
 *   - PEEK (compact) : la SITUATION EN HAUT (zone · état · Ton crew % vs rival %
 *     · directive bonus/temps) PUIS la MISSION (« Défendre République » +
 *     micro-bonus « bonus actif · +120 pts » + gros [Défendre] (RunButton) +
 *     lien discret « Voir les options »). Le SEUL gros CTA de l'écran vit ICI.
 *   - OUVERT (tap « Voir les options ») : les options — PARCOURS (2-3) · ÉQUIPE
 *     (2 alliés opt-in + « Courir ensemble ») · DÉTAILS (missions + historique).
 *
 * Reset au focus : chaque entrée sur la Carte referme le panneau Info (carte
 * nue) — règle 1 carte garantie au retour. Anti-shame : objectifs crew, jamais
 * de retard individuel. Anti pay-to-win : le serveur tranche territoire et
 * récompenses ; les km/pts sont des labels de scénario (demo.ts). Reduce motion
 * respecté (useSlideIn/useReduceMotion, snap direct de la sheet). Haptics à
 * chaque intention.
 * Events : screen('map_info_open') (révèle le panneau) / screen('map_sheet_open')
 * (déplie les options) / screen('map_parcours_select') / screen('map_mode_select')
 * ; EVENTS.runStart au départ réel (porté par RunButton).
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
  MapBottomSheet,
  useSlideIn,
  type MapSheetState,
} from '../../ui/game';
// Peek dédié du panneau Info (situation + mission empilées) — importé direct :
// le barrel n'expose pas cette constante et n'est pas dans le périmètre.
import { MAP_SHEET_INFO_COMPACT_HEIGHT } from '../../ui/game/MapBottomSheet';
import { RunButton } from '../nav/RunButton';
import { RUN_BUTTON_BOTTOM } from '../nav/metrics';
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

/** Dégagement du panneau Info au-dessus de la barre de nav. */
const SHEET_ABOVE_RUN_BUTTON = 12;
/** Pile de FABs : dégagement au-dessus de la barre de nav (carte nue). */
const FAB_ABOVE_NAV = 12;
/** Pile de FABs : dégagement au-dessus du panneau Info quand il est ouvert. */
const FAB_ABOVE_INFO = 12;

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
  // Panneau INFO (AMENDEMENT-25 §1) : la card de mission ne vit plus en bas par
  // défaut — le FAB Info la RÉVÈLE. `infoOpen` = false → carte nue ; true → le
  // panneau (situation + mission) est monté. `sheetInitial` distingue le PEEK
  // (situation + mission, à l'ouverture) de l'état OUVERT (les options), remonté
  // par « Voir les options » (remount key + initialState — snap, façon reduce
  // motion).
  const [infoOpen, setInfoOpen] = useState(false);
  const [sheet, setSheet] = useState<{ key: number; initial: MapSheetState }>({
    key: 0,
    initial: 'compact',
  });
  /** Menu « Calques » (fond + calques de lecture) — fermé par défaut. */
  const [layersOpen, setLayersOpen] = useState(false);

  // Chaque entrée sur la Carte repart de la CARTE NUE : les onglets restent
  // montés (expo-router), donc on referme le panneau Info ET le menu Calques au
  // focus — règle « 1 écran = 1 carte » garantie au retour.
  useFocusEffect(
    useCallback(() => {
      setInfoOpen(false);
      setLayersOpen(false);
      setSheet((s) => ({ key: s.key + 1, initial: 'compact' }));
    }, []),
  );

  /** Bas de l'écran réservé à la barre de nav (le FAB central est supprimé). */
  const sheetBottom = insets.bottom + RUN_BUTTON_BOTTOM + SHEET_ABOVE_RUN_BUTTON;
  /**
   * Bas de la pile de FABs : au-dessus de la barre de nav quand la carte est
   * nue ; au-dessus du panneau Info (peek) quand il est ouvert.
   */
  const fabBottom = infoOpen
    ? sheetBottom + MAP_SHEET_INFO_COMPACT_HEIGHT + FAB_ABOVE_INFO
    : insets.bottom + RUN_BUTTON_BOTTOM + FAB_ABOVE_NAV;

  /** Toggle du panneau Info (le FAB Info révèle / referme la mission). */
  const toggleInfo = () => {
    haptics.light();
    setLayersOpen(false);
    setInfoOpen((open) => {
      const next = !open;
      if (next) {
        // Révélé = PEEK (situation + mission) ; on repart en compact.
        setSheet((s) => ({ key: s.key + 1, initial: 'compact' }));
        screen('map_info_open');
      }
      return next;
    });
  };

  /** « Voir les options » : déplie le panneau Info sur les options (open). */
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

      {/* ── Droite : 3 FABs MAX (Calques + Recentrer + INFO) ──
          Info est l'accès PRINCIPAL à l'action (remplace la card sticky). */}
      <View
        style={[styles.fabColumn, { bottom: fabBottom }]}
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
        <FloatingMapButton
          icon="info"
          accessibilityLabel={
            infoOpen
              ? 'Fermer la mission — revenir à la carte'
              : 'Info — voir la situation et la mission'
          }
          active={infoOpen}
          onPress={toggleInfo}
        />
      </View>

      {/* ── Panneau INFO (révélé par le FAB Info) : PEEK = situation + mission +
          [Défendre] ; OUVERT = les options. Carte nue tant qu'il est fermé. ── */}
      {infoOpen ? (
        <View style={[styles.sheetWrap, { bottom: sheetBottom }]} pointerEvents="box-none">
          <MapBottomSheet
            key={sheet.key}
            initialState={sheet.initial}
            compactHeight={MAP_SHEET_INFO_COMPACT_HEIGHT}
            onStateChange={(state) => {
              if (state !== 'compact') screen('map_sheet_open', { state });
            }}
            compactSlot={<InfoPanel onOptions={openOptions} />}
            openSlot={
              <View style={styles.openBlock}>
                {/* Les OPTIONS (la situation + la mission vivent déjà dans le
                    peek au-dessus — pas de doublon). */}
                {/* BLOC — PARCOURS (2-3 max : km + gain). */}
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

                {/* BLOC — ÉQUIPE (2 alliés opt-in proches + « Courir ensemble »).
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

                {/* BLOC — DÉTAILS (missions liées + historique local). */}
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
      ) : null}
    </View>
  );
}

/**
 * PANNEAU INFO — peek (compact) : révélé par le FAB Info (AMENDEMENT-25 §1). Il
 * empile la SITUATION EN HAUT (zone · état · Ton crew % vs rival % · directive
 * bonus/temps) PUIS la MISSION (titre « Défendre République » · micro-ligne
 * bonus · gros [Défendre] (RunButton, le SEUL CTA de l'écran) · lien discret
 * [Voir les options] → les options). RIEN de tronqué.
 */
function InfoPanel({ onOptions }: { onOptions: () => void }) {
  const s = MAP_MISSION_SUMMARY;
  return (
    <View style={styles.info}>
      {/* SITUATION (ex-3ᵉ FAB Info AMENDEMENT-17, revenu ici) — zone · état ·
          parts de contrôle · directive (bonus + temps restant). */}
      <Text style={styles.situationTitle} numberOfLines={1}>
        {s.zone} · {s.stateLabel}
      </Text>
      <Text style={styles.situationShares} numberOfLines={1}>
        <Text style={styles.situationCrew}>Ton crew {s.crewPct} %</Text>
        {`  ·  ${s.rivalName} ${s.rivalPct} %`}
      </Text>
      <View style={styles.situationFoot}>
        <View style={styles.situationChip}>
          <Icon name="eclats" size={12} color={gameColors.crew} />
          <Text style={styles.situationChipText} numberOfLines={1}>
            {MAP_MISSION.bonusMicroLabel} · +{MAP_MISSION.bonusPoints} pts
          </Text>
        </View>
        <View style={styles.situationChip}>
          <Icon name="sablier" size={12} color={gameColors.danger} />
          <Text style={styles.situationChipText} numberOfLines={1}>
            {s.timeLeftLabel}
          </Text>
        </View>
      </View>

      {/* Séparation par L'ESPACE (AMENDEMENT-22 : pas de card-dans-card). */}
      <View style={styles.infoDivider} />

      {/* MISSION — le verbe + la zone, puis le SEUL gros CTA. */}
      <Text style={styles.missionTitle} numberOfLines={1}>
        {MAP_MISSION.cardTitle}
      </Text>
      <Text style={styles.missionMeta} numberOfLines={1}>
        {`${formatKm(MAP_MISSION.distanceKm)} · ${zonesLabel(MAP_MISSION.zones)}`}
      </Text>
      {/* UN SEUL CTA de départ (RunButton = flux unique phase 1). */}
      <View style={styles.ctaWrap}>
        <RunButton label={MAP_MISSION.ctaLabel} />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Voir les options — parcours, équipe et détails"
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
 * reste [Défendre] dans le panneau Info.
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
 * Menu « Calques » (AMENDEMENT-21) : ouvert par le FAB Calques — remplace la
 * rangée de 5 filtres permanente ET absorbe la bascule de fond (plus de FAB
 * Fond dédié). En haut, le fond de carte (Sombre/Couleur) ; en dessous, les
 * calques de lecture (un actif à la fois ; le défaut est AUTO selon le
 * contexte). Fermé par défaut — il ne s'ouvre jamais tout seul.
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

  // ── FAB column : 3 MAX (Calques + Recentrer + Info) ──
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

  // Le wrapper CLIPPE le panneau Info (il glisse vers le bas à la fermeture).
  sheetWrap: { position: 'absolute', left: 0, right: 0, top: 0, overflow: 'hidden' },

  // ── PANNEAU INFO — peek : situation EN HAUT + mission + CTA unique ──
  info: { paddingHorizontal: 16, paddingBottom: 12, gap: 2 },
  // SITUATION (ex-SituationCard AMENDEMENT-17) — posée sur le fond du panneau,
  // pas de sous-card (AMENDEMENT-22 : séparation par l'espace + un divider).
  situationTitle: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '800', letterSpacing: 0.2 },
  situationShares: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  situationCrew: { color: gameColors.crew },
  situationFoot: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  situationChip: {
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
  situationChipText: { color: colors.blanc, fontSize: 11, fontWeight: '600' },
  // Divider : sépare situation et mission par l'espace (pas de 2 boîtes).
  infoDivider: { height: 1, backgroundColor: colors.grisLigne, marginVertical: 12 },

  // MISSION (dans le peek Info) : le verbe + la zone + le gros CTA.
  missionTitle: { color: colors.blanc, fontSize: 17, fontWeight: '800', letterSpacing: 0.2 },
  missionMeta: {
    color: colors.gris,
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  ctaWrap: { marginTop: 10 },
  // « Voir les options » — lien discret (déplie le panneau, jamais un 2ᵉ CTA).
  optionsLink: {
    color: colors.gris,
    fontSize: 13,
    textDecorationLine: 'underline',
    textAlign: 'center',
    marginTop: 10,
  },

  // ── Panneau Info OUVERT : les options (Parcours / Équipe / Détails) ──
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
