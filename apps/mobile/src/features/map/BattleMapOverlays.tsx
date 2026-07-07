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
 *     micro-bonus « bonus actif · +120 pts » + lien discret « Voir les
 *     options »). AMENDEMENT-29 : le gros CTA de mission a MIGRÉ vers le BOUTON
 *     D'ACTION FLOTTANT (au-dessus de la nav, gaté par route) — l'Info ne
 *     duplique PLUS un 2ᵉ [Défendre] (anti double-CTA §A.4). Le SEUL gros CTA
 *     chartreuse de l'écran est le bouton flottant.
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
 * ; EVENTS.runStart au départ réel (porté par le bouton d'action FLOTTANT,
 * AMENDEMENT-29 — plus par un CTA dans l'Info).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, gameColors, radii } from '@klaim/shared';
import { EVENTS, screen, track } from '../../lib/analytics';
import { haptics } from '../../lib/haptics';
import { Icon } from '../../ui/Icon';
import {
  FloatingMapButton,
  Map3DToggle,
  MapBottomSheet,
  useSlideIn,
  type MapSheetState,
} from '../../ui/game';
// Peek dédié du panneau Info (situation + mission empilées) — importé direct :
// le barrel n'expose pas cette constante et n'est pas dans le périmètre.
import { MAP_SHEET_INFO_COMPACT_HEIGHT } from '../../ui/game/MapBottomSheet';
import { RUN_BUTTON_BOTTOM } from '../nav/metrics';
import { MISSIONS } from '../warroom/demo';
import {
  DEFENSE_SECTOR,
  FRIEND_RUN_DEMO,
  MAP_ALERT,
  MAP_DEFEND_CARD,
  MAP_MISSION,
  MAP_MISSION_SUMMARY,
  MATES_OPT_IN,
  PARCOURS_DEMO,
  parcoursMeta,
} from './demo';
import type { BattleMapSummary } from './fakeHexes';
import { BASEMAP_KEYS, type BasemapKey } from './mapStyle';
import {
  MAP_MODE_ICON,
  MAP_MODE_LABELS,
  MAP_MODE_ORDER,
  type MapMode,
} from './territory';
import { formatOppDistance, mapOpportunities } from './opportunities';

/**
 * Libellés AFFICHÉS des calques : « Raid » devient « Rival » à l'écran
 * (AMENDEMENT-12 §A — calque de lecture du territoire rival ; la clé interne
 * `raid` de territory.ts ne change pas).
 */
const MODE_CHIP_LABELS: Record<MapMode, string> = {
  ...MAP_MODE_LABELS,
  raid: 'Rival',
};

/**
 * FOND de carte (AMENDEMENT-28) — 3 options du menu Calques, libellés COURTS non
 * tronqués (charte : jamais de chartreuse sur clair ; l'actif se marque en carbon
 * + crew comme les calques). « Réaliste » = satellite (vraies photos aériennes).
 */
const BASEMAP_LABELS: Record<BasemapKey, string> = {
  dark: 'Sombre',
  color: 'Couleur',
  satellite: 'Réaliste',
};
/**
 * Icône par fond : on réutilise le jeu d'icônes EXISTANT (`@klaim/shared` n'a
 * pas d'icône « satellite » — hors périmètre). `carte` (losange type plan) pour
 * les fonds plan ; `calques` (pile de losanges) pour le réaliste satellite, qui
 * se distingue ainsi visuellement sans nouvelle icône. Le libellé fait foi.
 */
const BASEMAP_ICON: Record<BasemapKey, 'carte' | 'calques'> = {
  dark: 'carte',
  color: 'carte',
  satellite: 'calques',
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
  /**
   * Fond de carte courant + sélection dans le menu Calques (AMENDEMENT-28 : 3
   * fonds — Sombre / Couleur / Réaliste satellite). `onToggleBasemap(key)` fixe
   * une valeur précise ; sans argument il cycle (compat. `toggle` de mapPref).
   */
  basemap?: BasemapKey;
  onToggleBasemap?: (next?: BasemapKey) => void;
  /**
   * Vue 2D/3D courante (AMENDEMENT-26) + setter — pilotés par la pref
   * `gryd.map3d` (useMap3d, détenue par MapScreen). Le toggle 2D/3D vit DANS le
   * menu Calques (à côté du fond), PAS un 4ᵉ FAB. Omis : pas de toggle 3D.
   */
  map3d?: boolean;
  onSetMap3d?: (value: boolean) => void;
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
  map3d,
  onSetMap3d,
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
      {/* HAUT : plus RIEN sur la carte. Le menu = hamburger (nav, haut gauche) ;
          l'alerte + la défense vivent DANS le bouton Info (décision fondateur :
          épuration maximale — on ne voit que la carte + Info + RUN). */}

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
            onSelectBasemap={
              onToggleBasemap
                ? (key) => {
                    if (key === basemap) return;
                    haptics.light();
                    onToggleBasemap(key);
                  }
                : undefined
            }
            map3d={map3d}
            onSetMap3d={onSetMap3d}
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

      {/* ── Panneau INFO (révélé par le FAB Info) : TOUT est ici — l'alerte
          (attaque + rival + temps), la zone à défendre (distance + contrôle +
          récompense), la situation et les options. Rien de tout ça n'apparaît
          sur la carte tant qu'on n'ouvre pas Info. ── */}
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
 * bonus · lien discret [Voir les options] → les options). AMENDEMENT-29 : le
 * gros CTA de mission n'est PLUS ici — il a migré vers le bouton d'action
 * FLOTTANT (au-dessus de la nav), SEUL gros CTA chartreuse de l'écran (anti
 * double-CTA §A.4). RIEN de tronqué.
 */
function InfoPanel({ onOptions }: { onOptions: () => void }) {
  const s = MAP_MISSION_SUMMARY;
  return (
    <View style={styles.info}>
      {/* TOUT est ici (décision fondateur : rien sur la carte) — l'ALERTE
          tactique (attaque + rival + temps) et la ZONE À DÉFENDRE (distance +
          contrôle + récompense) EN PREMIER, puis la situation + les options. */}
      <AlertBanner />
      <DefendCard onPress={onOptions} />
      <View style={styles.infoDivider} />

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

      {/* MISSION — le verbe + la zone (SITUATION, pas un CTA). AMENDEMENT-29 :
          le gros CTA de mission a MIGRÉ vers le bouton d'action FLOTTANT
          (au-dessus de la nav) — l'Info ne duplique PLUS un 2ᵉ [Défendre]
          (anti double-CTA §A.4). Il ne reste ici que la situation + le lien
          discret « Voir les options ». */}
      <Text style={styles.missionTitle} numberOfLines={1}>
        {MAP_MISSION.cardTitle}
      </Text>
      <Text style={styles.missionMeta} numberOfLines={1}>
        {`${formatKm(MAP_MISSION.distanceKm)} · ${zonesLabel(MAP_MISSION.zones)}`}
      </Text>
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
 * ALERTE TACTIQUE (haut de carte) : UNE seule alerte forte — menace (titre) +
 * enjeu chiffré + temps restant + rival — au lieu de plusieurs pills flottantes
 * qui font du bruit. Accent rival (barre orange à gauche) = urgence ; hiérarchie
 * titre > enjeu/temps > rival. Ce n'est PAS un CTA (le seul gros CTA reste le
 * bouton d'action). Slide-in doux (reduce motion → fondu).
 */
function AlertBanner() {
  const { opacity, translateY } = useSlideIn(6);
  return (
    <Animated.View style={[styles.alert, { opacity, transform: [{ translateY }] }]}>
      <View style={styles.alertBar} />
      <View style={styles.alertBody}>
        <Text style={styles.alertTitle} numberOfLines={1}>
          {MAP_ALERT.title}
        </Text>
        <Text style={styles.alertMeta} numberOfLines={1}>
          {MAP_ALERT.zonesLabel} · {MAP_ALERT.timeLeftLabel}
        </Text>
        <Text style={styles.alertRival} numberOfLines={1}>
          {MAP_ALERT.rivalLine}
        </Text>
      </View>
    </Animated.View>
  );
}

/**
 * Carte « DÉFENDRE » PERSISTANTE (bas de carte, au-dessus du bouton d'action) : la
 * zone PRIORITAIRE (nom + distance dérivés du coach mapOpportunities) + contrôle
 * restant + récompense + depuis quand l'attaque dure. Rend le bouton [DÉFENDRE]
 * logique (on sait QUOI défendre et POURQUOI). INFORMATIVE + tap → déplie les
 * options (MÊME sheet Info, pas un doublon). Émet opportunity_shown. Barre
 * chartreuse = ma zone. Slide-in doux.
 */
function DefendCard({ onPress }: { onPress: () => void }) {
  const { opacity, translateY } = useSlideIn(8);
  const top = useMemo(() => mapOpportunities()[0], []);
  useEffect(() => {
    if (top) track(EVENTS.opportunityShown, { kind: top.kind, distance_m: top.distanceM });
  }, [top]);
  const zoneName = top?.name ?? DEFENSE_SECTOR;
  const distance = top ? formatOppDistance(top.distanceM) : `${MAP_MISSION.distanceKm} km`;
  return (
    <Animated.View style={[styles.defendWrap, { opacity, transform: [{ translateY }] }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${zoneName} à défendre — voir les options`}
        onPress={onPress}
        style={({ pressed }) => [styles.defendCard, pressed && styles.pressed]}
      >
        <View style={styles.defendBar} />
        <View style={styles.defendBody}>
          <Text style={styles.defendTitle} numberOfLines={1}>
            {zoneName} à défendre
          </Text>
          <Text style={styles.defendMeta} numberOfLines={1}>
            {distance} · contrôle {MAP_DEFEND_CARD.controlPct} % · {MAP_DEFEND_CARD.rewardLabel}
          </Text>
          <Text style={styles.defendSince} numberOfLines={1}>
            {MAP_DEFEND_CARD.attackSinceLabel}
          </Text>
        </View>
        <Icon name="chevron" size={16} color={colors.gris} />
      </Pressable>
    </Animated.View>
  );
}

/**
 * Menu « Calques » (AMENDEMENT-21) : ouvert par le FAB Calques — remplace la
 * rangée de 5 filtres permanente ET absorbe le choix de fond (plus de FAB Fond
 * dédié). En haut, le FOND de carte — 3 options explicites Sombre / Couleur /
 * Réaliste (satellite, AMENDEMENT-28), un actif à la fois marqué en crew comme
 * les calques ; en dessous, les calques de lecture. Fermé par défaut — il ne
 * s'ouvre jamais tout seul. Charte : l'actif se lit en chartreuse sur la surface
 * SOMBRE du menu (jamais de chartreuse sur clair).
 */
function LayerMenu({
  active,
  onSelect,
  basemap,
  onSelectBasemap,
  map3d,
  onSetMap3d,
}: {
  active: MapMode;
  onSelect: (mode: MapMode) => void;
  basemap: BasemapKey;
  onSelectBasemap?: (key: BasemapKey) => void;
  map3d?: boolean;
  onSetMap3d?: (value: boolean) => void;
}) {
  return (
    <View style={styles.layerMenu}>
      {onSelectBasemap ? (
        <>
          <Text style={styles.layerHeading}>FOND</Text>
          {BASEMAP_KEYS.map((key) => {
            const on = basemap === key;
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`Fond de carte ${BASEMAP_LABELS[key]}`}
                onPress={() => onSelectBasemap(key)}
                style={({ pressed }) => [
                  styles.layerItem,
                  on && styles.layerItemActive,
                  pressed && styles.pressed,
                ]}
              >
                <Icon
                  name={BASEMAP_ICON[key]}
                  size={15}
                  color={on ? gameColors.crew : colors.blanc}
                />
                <Text
                  style={[styles.layerLabel, on && styles.layerLabelActive]}
                  numberOfLines={1}
                >
                  {BASEMAP_LABELS[key]}
                </Text>
              </Pressable>
            );
          })}
          <View style={styles.layerDivider} />
        </>
      ) : null}
      {/* VUE 2D/3D (AMENDEMENT-26) : le toggle vit AVEC les contrôles d'apparence
          de carte (à côté du fond), PAS un 4ᵉ FAB. Contrôlé par la pref
          gryd.map3d (map3d/onSetMap3d de MapScreen). Défaut 2D. */}
      {onSetMap3d ? (
        <>
          <Text style={styles.layerHeading}>VUE</Text>
          <Map3DToggle
            value={map3d}
            onChange={onSetMap3d}
            style={styles.layerToggle}
            testID="battle-map-3d-toggle"
          />
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

  // ── ALERTE TACTIQUE (haut) : une alerte forte, accent rival = urgence ──
  alert: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: OVERLAY_SURFACE,
    overflow: 'hidden',
  },
  alertBar: { width: 4, backgroundColor: gameColors.rival },
  alertBody: { flex: 1, paddingHorizontal: 14, paddingVertical: 9 },
  alertTitle: {
    color: colors.blanc,
    fontSize: fontSizes.lg, // 20 px
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  alertMeta: { color: colors.blanc, fontSize: 12.5, fontWeight: '700', marginTop: 2 },
  alertRival: { color: gameColors.rival, fontSize: 12, fontWeight: '600', marginTop: 2 },

  // ── Carte DÉFENDRE persistante (bas, au-dessus du bouton d'action) ──
  // Ancre BAS dédiée (sheetWrap est ancré `top:0` pour le sheet qui grandit) :
  // ici bottom = sheetBottom → la card flotte juste au-dessus de la nav.
  defendAnchor: { position: 'absolute', left: 14, right: 14 },
  defendWrap: { alignSelf: 'stretch' },
  defendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.chartreuse40,
    backgroundColor: OVERLAY_SURFACE,
    overflow: 'hidden',
    paddingRight: 12,
  },
  defendBar: { width: 4, alignSelf: 'stretch', backgroundColor: gameColors.crew },
  defendBody: { flex: 1, paddingLeft: 14, paddingVertical: 10 },
  defendTitle: {
    color: colors.blanc,
    fontSize: fontSizes.md, // 16 px
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  defendMeta: { color: colors.blanc, fontSize: 12.5, fontWeight: '600', marginTop: 2 },
  defendSince: { color: colors.gris, fontSize: 11.5, marginTop: 2 },

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
  // Toggle 2D/3D dans le menu Calques : pleine largeur du menu (aligné aux items).
  layerToggle: { alignSelf: 'stretch', marginHorizontal: 2 },
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
