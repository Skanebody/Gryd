/**
 * GRYD — la Carte comme ÉCRAN MISSION, révisée par AMENDEMENT-37 §3/§8 (étude
 * marché 2026). Règle absolue : 1 écran = 1 carte, 1 décision, 1 CTA à la fois.
 *
 * AMENDEMENT-37 §8 (révise -25/-29) — **2 FABs MAX** (Couches + Recentrer, plus
 * de 3ᵉ FAB « Info ») et une **bottom sheet peek PERSISTANTE de la mission**
 * (§6.3 : « République sous pression · 3 zones · 4,4 km ») qui surface aussi le
 * rival SANS tap (§26.2). Le peek se déplie sur les options (parcours / équipe /
 * détails). Le gros CTA de mission vit sur le bouton d'action FLOTTANT
 * (AMENDEMENT-29) — le peek n'en duplique pas (anti double-CTA §A.4).
 *
 * AMENDEMENT-37 §3/§10 — **TAP → ZONE** : taper une zone (RealMap onPress →
 * `selectedZoneId`, contrat C2/C3) REMPLACE temporairement le peek mission par
 * la **sheet de LA zone** : propriétaire (VRAI crew, pastille de RÔLE), contrôle
 * %, tenue, surface, défendue il y a X, PRESSION (top rival % + neutre %),
 * ACTIVITÉ 24 H (agrégée, jamais localisée), ACTION RECOMMANDÉE + 1 CTA, « Plus »
 * (détail hors 1er niveau → historique). Fermer → carte nue + retour au peek
 * mission. Les données viennent d'un modèle démo (ZONE_DETAILS, demo.ts) —
 * étiquettes Paris/Lille/Lyon, ZÉRO ranking européen fabriqué ; le CLAIM reste
 * tranché SERVEUR (on n'AFFICHE que des étiquettes).
 *
 * Vocabulaire TERRITOIRES ORGANIQUES (zones/frontières/rues — jamais hexagone).
 * Anti pay-to-win : le serveur tranche territoire et récompenses ; km/pts/% sont
 * des labels de scénario (demo.ts). Reduce motion respecté (snap direct de la
 * sheet). Haptics à chaque intention. Partagé MapScreen natif ↔ .web (parité).
 * Events : screen('map_sheet_open') (options mission) / screen('map_zone_open')
 * (sheet de zone) / screen('map_zone_details') (« Plus ») / screen('map_zone_act').
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { setZoneSheetOpen, setMapHudHidden, useMapHudHidden } from './mapUiStore';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, gameColors, iconSizes, radii, withAlpha } from '@klaim/shared';
import { C } from '../../i18n/catalog/map';
import { useLocale, useT } from '../../i18n/store';
import type { Entry, Locale } from '../../i18n/types';
import { flags } from '../../lib/flags';
import { EVENTS, screen, track } from '../../lib/analytics';
import { haptics } from '../../lib/haptics';
import { Icon } from '../../ui/Icon';
import {
  FloatingMapButton,
  Map3DToggle,
  MapBottomSheet,
  type MapSheetState,
} from '../../ui/game';
import { RUN_BUTTON_BOTTOM } from '../nav/metrics';
import { MISSIONS } from '../warroom/demo';
import {
  MAP_MISSION,
  MAP_MISSION_SUMMARY,
  MAP_RIVAL_PILL,
  MATES_OPT_IN,
  PARCOURS_DEMO,
  ZONE_DETAILS,
  parcoursMeta,
  type ZoneDetail,
  type ZoneOwnerRole,
} from './demo';
import type { BattleMapSummary } from './fakeHexes';
import { BASEMAP_KEYS, type BasemapKey } from './mapStyle';
import type { TerritoryWidgetView } from '../widget/territoryWidget';
import { MAP_MODE_ICON, MAP_MODE_ORDER, type MapMode } from './territory';
import { mapOpportunities } from './opportunities';

/** Signature du hook useT — pour typer les helpers purs qui reçoivent t. */
type Translate = (entry: Entry, vars?: Record<string, string | number>) => string;

/**
 * Libellés AFFICHÉS des calques : « Raid » devient « Rival » à l'écran
 * (AMENDEMENT-12 §A — la clé interne `raid` de territory.ts ne change pas).
 * Entries de catalogue résolues à l'affichage (t) — les libellés fr de
 * MAP_MODE_LABELS restent la clé interne, plus jamais un texte d'écran.
 */
const MODE_CHIP_ENTRIES: Record<MapMode, Entry> = {
  territoire: C.modeTerritoire,
  route: C.modeRoute,
  defense: C.modeDefense,
  raid: C.modeRival,
  exploration: C.modeExploration,
  crew: C.modeCrew,
};

/**
 * Couleur d'icône par mode/rôle : chaque calque devient identifiable À LA
 * COULEUR (façon Waze) : territoire/route = chartreuse (moi), défense = bleu
 * bouclier, rival = orange, exploration = or. Tokens de jeu uniquement.
 */
const MODE_COLOR: Record<MapMode, string> = {
  territoire: gameColors.crew,
  route: gameColors.crew,
  defense: gameColors.verify,
  raid: gameColors.rival,
  exploration: gameColors.gold,
  // Lentille Crew : ton du crew/allié = la chartreuse (moi/crew), rôle « on joue ensemble ».
  crew: gameColors.crew,
};

/**
 * FOND de carte (AMENDEMENT-28) — 3 options du menu Calques, libellés COURTS non
 * tronqués (« Satellite » dit ce que c'est — vraies photos aériennes).
 * Entries de catalogue — résolues à l'affichage (t).
 */
const BASEMAP_ENTRIES: Record<BasemapKey, Entry> = {
  dark: C.basemapDark,
  color: C.basemapLight,
  satellite: C.basemapSatellite,
};
/** Icône par fond : réutilise le jeu d'icônes EXISTANT (le libellé fait foi). */
const BASEMAP_ICON: Record<BasemapKey, 'carte' | 'calques'> = {
  dark: 'carte',
  color: 'carte',
  satellite: 'calques',
};

/**
 * AMENDEMENT-37 §10 — pastille de RÔLE du propriétaire d'une zone (jamais par
 * crew) : chartreuse = moi, orange = rival, gris = autre/contesté. Tokens only.
 */
const ZONE_ROLE_TINT: Record<ZoneOwnerRole, string> = {
  mine: gameColors.crew,
  rival: gameColors.rival,
  other: colors.gris,
};

/** Dégagement du peek au-dessus de la barre de nav. */
const SHEET_ABOVE_RUN_BUTTON = 12;
/** Pile de FABs : dégagement au-dessus de la sheet visible. */
const FAB_ABOVE_SHEET = 12;
/**
 * Hauteur du PEEK MISSION persistant (§8) : titre + méta + rival + lien options.
 * Calée AU PLUS JUSTE sur le contenu réel (poignée 18 + bloc info ~118) pour ne
 * PAS laisser de vide sous « Voir les options » — le peek épouse son contenu, la
 * carte reste le cœur. (Était 168 → ~30 px de vide sous le lien.)
 */
const MISSION_PEEK_COMPACT_HEIGHT = 138;
/** Espace du HUD haut à préserver (secteur + ligne mission) — le menu Calques ne
 *  descend jamais son bord haut au-dessus de cette limite (anti-chevauchement). */
const TOP_HUD_CLEARANCE = 112;
/** Hauteur de la pile de FABs PERMANENTS (2 FABs de 44 + 1 gap de 10 + marge)
 *  — réserve l'espace sous le menu Calques pour qu'il ne recouvre pas la pile. */
const FAB_STACK_HEIGHT = 2 * 44 + 10 + 6;
/**
 * Hauteur du PEEK ZONE (§3/§10) : en-tête + propriétaire + contrôle + action
 * recommandée + 1 CTA + « Plus » — sans troncature. Le détail (surface, tenue,
 * pression, activité 24 H) vit dans l'état OUVERT (« Plus »), hors 1er niveau.
 */
const ZONE_SHEET_COMPACT_HEIGHT = 224;

/** « 4,4 km » — virgule décimale sauf en anglais (point), pas d'Intl (parité Hermes). */
function formatKm(km: number, locale: Locale): string {
  const fixed = km.toFixed(1);
  return `${locale === 'en' ? fixed : fixed.replace('.', ',')} km`;
}

/** « 3 zones » / « 1 zone » — accord singulier/pluriel via catalogue (jamais tronqué). */
function zonesLabel(t: Translate, n: number): string {
  const v = Math.max(1, n);
  return t(v > 1 ? C.zonesMany : C.zonesOne, { n: v });
}

/** « 0,8 km² » — même règle décimale, zéros de fin retirés (jamais tronqué). */
function formatArea(km2: number, locale: Locale): string {
  const s = km2.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  return `${locale === 'en' ? s : s.replace('.', ',')} km²`;
}

/** Ligne d'ACTION RECOMMANDÉE §10 : « {type} · {km} · {min} min · +{n} zones ». */
function actionLine(detail: ZoneDetail, t: Translate, locale: Locale): string {
  const a = detail.action;
  return `${a.type} · ${formatKm(a.km, locale)} · ${a.minutes} min · +${zonesLabel(t, a.zones)}`;
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
   * AMENDEMENT-37 §3 (contrat C2/C3) — zone tapée (RealMap onPress). `null` =
   * carte nue → le peek mission persistant est affiché ; non-null → la sheet de
   * CETTE zone remplace le peek. `onCloseZone` referme la sheet (retour au peek).
   */
  selectedZoneId?: string | null;
  onCloseZone?: () => void;
  /**
   * Fond de carte courant + sélection dans le menu Calques (3 fonds — Sombre /
   * Clair / Satellite). `onToggleBasemap(key)` fixe une valeur ; sans argument
   * il cycle (compat. `toggle` de mapPref).
   */
  basemap?: BasemapKey;
  onToggleBasemap?: (next?: BasemapKey) => void;
  /**
   * Vue 2D/3D courante (AMENDEMENT-26) + setter — pilotés par la pref
   * `gryd.map3d`. Le toggle vit DANS le menu Calques, PAS un FAB. Omis : pas de
   * toggle 3D.
   */
  map3d?: boolean;
  onSetMap3d?: (value: boolean) => void;
  /**
   * WIDGET « Mon territoire » (spec 17/07) — fourni par MapScreen quand les
   * DONNÉES RÉELLES existent (session + hex_claims lus). Il REMPLACE alors le
   * peek mission démo. Absent/null ⇒ MissionPeek démo inchangé (étiqueté par la
   * note de source de la carte). L'action du widget est un LIEN (anti
   * double-CTA §A.4 / AMENDEMENT-29 : le gros CTA reste le bouton flottant).
   */
  widget?: TerritoryWidgetView | null;
  /** Tap sur l'action du widget (routage côté écran : partage, options…). */
  onWidgetAction?: (view: TerritoryWidgetView) => void;
}

export function BattleMapOverlays({
  mode,
  onSelectMode,
  summary,
  onRecenter,
  selectedParcoursId = null,
  onSelectParcours,
  selectedZoneId = null,
  onCloseZone,
  basemap = 'dark',
  onToggleBasemap,
  widget = null,
  onWidgetAction,
  map3d,
  onSetMap3d,
}: BattleMapOverlaysProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
  const locale = useLocale();
  /** « Carte nue » : l'utilisateur a masqué tout le HUD (rangée du menu Calques). */
  const hudHidden = useMapHudHidden();
  // Peek MISSION persistant (§8) : `sheet.initial` distingue le PEEK (compact)
  // de l'état OUVERT (les options), remonté par « Voir les options » (remount
  // key + initialState — snap, façon reduce motion).
  const [sheet, setSheet] = useState<{ key: number; initial: MapSheetState }>({
    key: 0,
    initial: 'compact',
  });
  /**
   * Menu « Calques » (fond + vue + carte nue + calques de lecture) — fermé par
   * défaut, ouvert EN 1 TAP par le FAB Calques permanent (retour terrain 20/07 :
   * l'ancien détour « Outils → Calques » imposait 3 taps à travers 2 menus
   * imbriqués ; on aplatit à 1). Re-tap du FAB ou tap ailleurs (backdrop) =
   * referme. Plus de menu « Outils » intermédiaire ni d'engrenage : le
   * déclencheur EST Calques.
   */
  const [layersOpen, setLayersOpen] = useState(false);
  /** Sheet de zone dépliée sur son détail (§10 « Plus ») — reset à chaque zone. */
  const [zoneExpanded, setZoneExpanded] = useState(false);

  // Détail de la zone tapée (repli sûr : une zone sans entrée n'ouvre rien →
  // on retombe sur le peek mission). Index par `string` toléré (le zoneId vient
  // du tap) → ZoneDetail | undefined.
  const zoneDetail: ZoneDetail | undefined =
    selectedZoneId != null
      ? (ZONE_DETAILS as Record<string, ZoneDetail | undefined>)[selectedZoneId]
      : undefined;
  const zoneOpen = selectedZoneId != null && zoneDetail !== undefined;

  // Chaque entrée sur la Carte repart de la CARTE + peek mission : on referme le
  // menu Calques, ramène le peek en compact ET désélectionne la zone (retour au
  // peek mission) — règle « 1 écran = 1 carte » garantie au retour.
  useFocusEffect(
    useCallback(() => {
      setLayersOpen(false);
      setSheet((s) => ({ key: s.key + 1, initial: 'compact' }));
      onCloseZone?.();
      // « Repart de la carte » inclut le HUD : chaque entrée sur l'onglet réaffiche
      // les infos (pas de carte nue « collante » qui semblerait un écran cassé).
      setMapHudHidden(false);
    }, [onCloseZone]),
  );

  // Nouvelle zone tapée → sa sheet repart en compact (le détail « Plus » se
  // rouvre à la demande, jamais imposé — §A détail au tap).
  useEffect(() => {
    setZoneExpanded(false);
  }, [selectedZoneId]);

  // AMENDEMENT-37 §8 (§A.4) : signale à la nav qu'une sheet de zone est ouverte
  // → son bouton d'action central passe en CONTOUR (un seul CTA chartreuse PLEIN
  // à l'écran : celui de la zone). Remis à false au démontage (bascule d'onglet).
  useEffect(() => {
    setZoneSheetOpen(zoneOpen);
    return () => setZoneSheetOpen(false);
  }, [zoneOpen]);

  // §3 : $screen à chaque ouverture / changement de zone (contrat d'events du module).
  useEffect(() => {
    if (zoneOpen && selectedZoneId) screen('map_zone_open', { zone: selectedZoneId });
  }, [zoneOpen, selectedZoneId]);

  /** Bas de l'écran réservé à la barre de nav (le FAB central est supprimé). */
  const sheetBottom = insets.bottom + RUN_BUTTON_BOTTOM + SHEET_ABOVE_RUN_BUTTON;
  // « Carte nue » masque le HUD : ligne mission (haut, index.tsx) + sheet du bas.
  // Les 2 FABs permanents (Recentrer + Calques) RESTENT visibles même en carte nue :
  // le FAB Calques rouvre le menu, dont la rangée « Carte nue » (active) ramène tout.
  // Un tap sur une ZONE reste explicite → sa sheet s'affiche même en carte nue.
  const sheetVisible = zoneOpen || !hudHidden;
  /** Bas de la pile de FABs : au-dessus de la sheet visible (zone OU mission), sinon nav. */
  const activeCompactHeight = zoneOpen ? ZONE_SHEET_COMPACT_HEIGHT : MISSION_PEEK_COMPACT_HEIGHT;
  const fabBottom = sheetVisible ? sheetBottom + activeCompactHeight + FAB_ABOVE_SHEET : sheetBottom;

  // Le menu Calques s'ouvre AU-DESSUS de la pile de FABs. On PLAFONNE sa hauteur à
  // l'espace libre entre le HUD du haut (secteur + ligne mission) et le sommet des
  // FABs → il défile au lieu de recouvrir « République attaquée » (retour fondateur).
  const { height: winH } = useWindowDimensions();
  const layerMenuMaxHeight = Math.max(
    120,
    winH - insets.top - TOP_HUD_CLEARANCE - fabBottom - FAB_STACK_HEIGHT,
  );

  /** « Voir les options » : déplie le peek mission sur les options (open). */
  const openOptions = () => {
    haptics.light();
    setSheet((s) => ({ key: s.key + 1, initial: 'open' }));
  };

  /** FAB Calques : ouvre/ferme le menu Calques EN 1 TAP (haptic géré par le FAB). */
  const toggleLayers = () => {
    setLayersOpen((v) => !v);
  };

  /** Ferme le menu Calques (re-tap FAB ou tap « ailleurs » sur le backdrop). */
  const closeLayers = () => {
    setLayersOpen(false);
  };

  /** Recentrer = action one-shot → referme le menu Calques (« ferme en l'utilisant »). */
  const recenterAndClose = () => {
    onRecenter?.();
    setLayersOpen(false);
  };

  /**
   * Bascule « carte nue » (rangée du menu Calques) : masque/affiche TOUT le HUD
   * (ligne mission du haut + sheet du bas) → carte plein écran. Referme le menu
   * pour qu'on VOIE réellement la carte nue ; le FAB Calques reste visible pour
   * rouvrir le menu et tout ramener.
   */
  const toggleHud = () => {
    haptics.light();
    setLayersOpen(false);
    setMapHudHidden(!hudHidden);
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

  /** Fermer la sheet de zone → carte nue + retour au peek mission. */
  const closeZone = () => {
    haptics.light();
    onCloseZone?.();
  };

  /** « Plus » : déplie la sheet de zone sur son détail (§10, hors 1er niveau). */
  const openZoneDetail = () => {
    if (!selectedZoneId) return;
    haptics.light();
    setZoneExpanded(true);
    screen('map_zone_details', { zone: selectedZoneId });
  };

  /** CTA d'action recommandée sur la zone (le CLAIM reste tranché serveur).
   *  D8 : hors MVP la War Room est masquée — l'action honnête est la COURSE
   *  (défendre/conquérir = courir), pas un écran de missions. */
  const actOnZone = () => {
    if (!selectedZoneId) return;
    haptics.light();
    screen('map_zone_act', { zone: selectedZoneId });
    router.push(flags.warRoom ? '/warroom' : '/course-live?mode=conquete');
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
      {/* Backdrop invisible : un tap « ailleurs » referme le menu Calques (contrat
          §1). Rendu SOUS la pile de FABs et la sheet (enfants suivants = au-dessus)
          → seuls les taps hors de ces zones l'atteignent. Absent quand le menu est
          fermé : la carte reçoit alors ses gestes normalement (pan/zoom). Hors a11y
          (les lecteurs d'écran referment via le FAB Calques, dont l'état
          « sélectionné » est lisible). */}
      {layersOpen ? (
        <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={closeLayers} />
      ) : null}

      {/* ── Droite : 2 FABs PERMANENTS (AMENDEMENT-37 §8) — Recentrer + Calques.
          Le FAB Calques ouvre le menu EN 1 TAP (retour terrain 20/07 : l'ancien
          détour « Outils → Calques » imposait 3 taps à travers 2 menus imbriqués).
          Le menu Calques absorbe désormais « Carte nue » (rangée d'affichage) :
          plus de menu Outils ni d'engrenage. Le déclencheur Calques est le dernier
          de la pile (en bas, sous le pouce), visible même en carte nue pour tout
          ramener. ── */}
      <View
        style={[styles.fabColumn, { bottom: fabBottom }]}
        pointerEvents="box-none"
      >
        {layersOpen ? (
          <LayerMenu
            maxHeight={layerMenuMaxHeight}
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
            hudHidden={hudHidden}
            onToggleHud={toggleHud}
          />
        ) : null}
        {/* RECENTRER — permanent : « où suis-je ? » se répond en 1 tap, à une main,
            en courant. Referme le menu Calques s'il est ouvert. */}
        <FloatingMapButton
          icon="gps"
          accessibilityLabel={t(C.recenterA11y)}
          onPress={recenterAndClose}
        />
        {/* CALQUES — permanent, déclencheur DIRECT du menu Calques (1 tap ouvre,
            re-tap referme). Actif = menu ouvert. Reste visible en carte nue. */}
        <FloatingMapButton
          icon="calques"
          accessibilityLabel={t(C.layersFabA11y)}
          active={layersOpen}
          onPress={toggleLayers}
        />
      </View>

      {/* ── Sheet du bas : la sheet de ZONE tapée REMPLACE le peek mission
          (§3) ; sinon le peek MISSION persistant (§8). Une seule sheet à la
          fois = 1 seul gros CTA à la fois (anti double-CTA §A.4). ── */}
      <View style={[styles.sheetWrap, { bottom: sheetBottom }]} pointerEvents="box-none">
        {zoneOpen && zoneDetail ? (
          <MapBottomSheet
            key={`zone-${selectedZoneId}-${zoneExpanded ? 'open' : 'compact'}`}
            initialState={zoneExpanded ? 'open' : 'compact'}
            compactHeight={ZONE_SHEET_COMPACT_HEIGHT}
            onStateChange={(state) => {
              if (state !== 'compact') screen('map_zone_details', { zone: selectedZoneId });
            }}
            compactSlot={
              <ZonePeek detail={zoneDetail} onClose={closeZone} onAct={actOnZone} onMore={openZoneDetail} />
            }
            openSlot={<ZoneDetailBlock detail={zoneDetail} onHistory={() => router.push('/historique')} />}
          />
        ) : hudHidden ? null : (
          <MapBottomSheet
            key={`mission-${sheet.key}`}
            initialState={sheet.initial}
            compactHeight={MISSION_PEEK_COMPACT_HEIGHT}
            onStateChange={(state) => {
              if (state !== 'compact') screen('map_sheet_open', { state });
            }}
            compactSlot={
              widget ? (
                <TerritoryWidgetPeek
                  view={widget}
                  onAction={() => onWidgetAction?.(widget)}
                />
              ) : (
                <MissionPeek onOptions={openOptions} />
              )
            }
            openSlot={
              <View style={styles.openBlock}>
                {/* SITUATION (état · parts de contrôle · directive bonus + temps
                    restant = l'HORLOGE UNIQUE) — au-dessus des options. */}
                <SituationBlock />

                {/* BLOC — PARCOURS (2-3 max : km + gain). */}
                <Text style={styles.sectionTitle}>{t(C.sectionRoutes)}</Text>
                {PARCOURS_DEMO.map((p) => {
                  const meta = parcoursMeta(p);
                  const selected = selectedParcoursId === p.id;
                  return (
                    <Pressable
                      key={p.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={t(C.routeA11y, {
                        name: p.name,
                        km: formatKm(meta.distanceKm, locale),
                      })}
                      onPress={() => selectParcours(p.id)}
                      style={({ pressed }) => [
                        styles.rowCard,
                        selected && styles.rowCardSelected,
                        pressed && styles.pressed,
                      ]}
                    >
                      <View style={styles.rowBody}>
                        <Text style={styles.rowTitle} numberOfLines={1} adjustsFontSizeToFit>
                          {p.name}
                        </Text>
                        <Text style={styles.rowMeta} numberOfLines={1} adjustsFontSizeToFit>
                          {formatKm(meta.distanceKm, locale)} · {zonesLabel(t, meta.hexes)} ·{' '}
                          {t(C.plusPts, { n: meta.points })}
                        </Text>
                      </View>
                      {selected ? (
                        <Text style={styles.onMapTag}>{t(C.onMapTag)}</Text>
                      ) : (
                        <Icon name="chevron" size={iconSizes.sm} color={colors.gris} />
                      )}
                    </Pressable>
                  );
                })}

                {/* BLOC — ÉQUIPE (nombre d'alliés + le plus proche, non tronqué). */}
                <Text style={styles.sectionTitle}>{t(C.sectionTeam)}</Text>
                <View style={styles.rowCard}>
                  <View style={styles.rowIcon}>
                    <Icon name="ami" size={iconSizes.sm} color={gameColors.crew} />
                  </View>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle} numberOfLines={1} ellipsizeMode="clip">
                      {t(C.alliesNearby, { n: MATES_OPT_IN.length })}
                    </Text>
                    <Text style={styles.rowMeta} numberOfLines={1} adjustsFontSizeToFit>
                      {nearestMateName} · {formatKm(nearestMateKm, locale)}
                    </Text>
                  </View>
                  {/* L'app NE MENT JAMAIS : le run groupé réel n'existe pas
                      encore — badge « Bientôt » non actionnable, texte gris. */}
                  <View
                    accessibilityRole="text"
                    accessibilityLabel={t(C.soonA11y)}
                    style={styles.joinSoon}
                  >
                    <Text style={styles.joinSoonLabel} numberOfLines={1} ellipsizeMode="clip">
                      {t(C.soonBadge)}
                    </Text>
                  </View>
                </View>

                {/* BLOC — DÉTAILS (missions liées + historique local). */}
                <Text style={styles.sectionTitle}>{t(C.sectionDetails)}</Text>
                {mission && flags.warRoom ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t(C.missionA11y, { label: mission.label })}
                    onPress={() => {
                      haptics.light();
                      router.push('/warroom');
                    }}
                    style={({ pressed }) => [styles.rowCard, pressed && styles.pressed]}
                  >
                    <View style={styles.rowIcon}>
                      <Icon name="cible" size={iconSizes.sm} color={colors.blanc} />
                    </View>
                    <View style={styles.rowBody}>
                      <Text style={styles.rowTitle} numberOfLines={1} adjustsFontSizeToFit>
                        {mission.label}
                      </Text>
                      <Text style={styles.rowMeta} numberOfLines={1} adjustsFontSizeToFit>
                        {t(C.missionOfDay, {
                          progress: mission.progress,
                          target: mission.target,
                        })}
                      </Text>
                    </View>
                    <Icon name="chevron" size={iconSizes.sm} color={colors.gris} />
                  </Pressable>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t(C.historyA11y)}
                  onPress={() => {
                    haptics.light();
                    router.push('/historique');
                  }}
                  style={({ pressed }) => [styles.rowCard, pressed && styles.pressed]}
                >
                  <View style={styles.rowIcon}>
                    <Icon name="historique" size={iconSizes.sm} color={colors.blanc} />
                  </View>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle} numberOfLines={1} ellipsizeMode="clip">
                      {t(C.myHistory)}
                    </Text>
                    <Text style={styles.rowMeta} numberOfLines={1} ellipsizeMode="clip">
                      {t(C.pastRuns)}
                    </Text>
                  </View>
                  <Icon name="chevron" size={iconSizes.sm} color={colors.gris} />
                </Pressable>
              </View>
            }
          />
        )}
      </View>
    </View>
  );
}

/**
 * WIDGET « Mon territoire » (spec 17/07) rendu dans le peek de la carte :
 * titre de situation + ≤ 2 lignes + UNE action en LIEN (le gros CTA chartreuse
 * reste le bouton flottant — anti double-CTA §A.4). Vue utilisateur trackée
 * UNE fois par état (jamais le refresh auto), tap tracké avec l'action.
 */
function TerritoryWidgetPeek({
  view,
  onAction,
}: {
  view: TerritoryWidgetView;
  onAction: () => void;
}) {
  useEffect(() => {
    track(EVENTS.territoryWidgetViewed, { widget_state: view.state });
  }, [view.state]);
  return (
    <View style={styles.info}>
      <View style={styles.peekHead}>
        <View style={styles.missionBar} />
        <View style={styles.rowBody}>
          <Text style={styles.peekTitle} numberOfLines={1} adjustsFontSizeToFit>
            {view.title}
          </Text>
          {view.lines[0] ? (
            <Text style={styles.peekMeta} numberOfLines={1} adjustsFontSizeToFit>
              {view.lines[0]}
            </Text>
          ) : null}
        </View>
      </View>
      {view.lines[1] ? (
        <Text style={styles.peekMeta} numberOfLines={1} adjustsFontSizeToFit>
          {view.lines[1]}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={view.ctaLabel}
        hitSlop={8}
        onPress={() => {
          track(EVENTS.territoryWidgetActionTapped, {
            widget_state: view.state,
            primary_action: view.action,
          });
          onAction();
        }}
        style={({ pressed }) => [styles.optionsHit, pressed && styles.pressed]}
      >
        <Text style={styles.optionsLink} numberOfLines={1}>
          {view.ctaLabel}
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * PEEK MISSION persistant (§8/§6.3) : la mission formulée UNE fois — « {zone}
 * sous pression », méta « 3 zones · 4,4 km », rival nommé (surface le rival sans
 * tap, §26.2) + lien discret « Voir les options ». Le gros CTA vit sur le bouton
 * d'action FLOTTANT (AMENDEMENT-29, anti double-CTA §A.4) — pas ici. Émet
 * opportunity_shown. Barre chartreuse = ma mission.
 */
function MissionPeek({ onOptions }: { onOptions: () => void }) {
  const t = useT();
  const locale = useLocale();
  const top = useMemo(() => mapOpportunities()[0], []);
  useEffect(() => {
    if (top) track(EVENTS.opportunityShown, { kind: top.kind, distance_m: top.distanceM });
  }, [top]);
  const s = MAP_MISSION_SUMMARY;
  return (
    <View style={styles.info}>
      <View style={styles.peekHead}>
        <View style={styles.missionBar} />
        <View style={styles.rowBody}>
          <Text style={styles.peekTitle} numberOfLines={1} adjustsFontSizeToFit>
            {t(C.underPressure, { zone: s.zone })}
          </Text>
          <Text style={styles.peekMeta} numberOfLines={1} adjustsFontSizeToFit>
            {zonesLabel(t, MAP_MISSION.zones)} · {formatKm(MAP_MISSION.distanceKm, locale)}
          </Text>
        </View>
      </View>
      {/* Rival nommé (§26.2) — teinte rival (orange), informatif, sans CTA. */}
      <Text style={styles.peekRival} numberOfLines={1} adjustsFontSizeToFit>
        {MAP_RIVAL_PILL.message}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(C.optionsA11y)}
        hitSlop={8}
        onPress={onOptions}
        style={({ pressed }) => [styles.optionsHit, pressed && styles.pressed]}
      >
        <Text style={styles.optionsLink} numberOfLines={1}>
          {MAP_MISSION.optionsLabel}
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * SITUATION (état · parts de contrôle · directive bonus + temps restant =
 * l'HORLOGE UNIQUE) — posée sur le fond du panneau, pas de sous-card
 * (séparation par l'espace). Vit dans l'état OUVERT du peek mission.
 */
function SituationBlock() {
  const t = useT();
  const s = MAP_MISSION_SUMMARY;
  return (
    <View style={styles.situation}>
      <Text style={styles.situationTitle} numberOfLines={1}>
        {s.zone} · {s.stateLabel}
      </Text>
      <Text style={styles.situationShares} numberOfLines={1}>
        <Text style={styles.situationCrew}>{t(C.yourCrewPct, { pct: s.crewPct })}</Text>
        {`  ·  ${s.rivalName} ${s.rivalPct} %`}
      </Text>
      <View style={styles.situationFoot}>
        <View style={styles.situationChip}>
          <Icon name="eclats" size={12} color={gameColors.crew} />
          <Text style={styles.situationChipText} numberOfLines={1}>
            {MAP_MISSION.bonusMicroLabel} · {t(C.plusPts, { n: MAP_MISSION.bonusPoints })}
          </Text>
        </View>
        <View style={styles.situationChip}>
          <Icon name="sablier" size={12} color={gameColors.danger} />
          <Text style={styles.situationChipText} numberOfLines={1}>
            {s.timeLeftLabel}
          </Text>
        </View>
      </View>
    </View>
  );
}

/**
 * PEEK ZONE (§3/§10) : la zone TAPÉE au 1er niveau — en-tête (pastille de RÔLE +
 * nom + Fermer), propriétaire (VRAI crew, peut être rival) + contrôle %, ACTION
 * RECOMMANDÉE + 1 CTA (chartreuse), et « Plus » pour le détail (hors 1er niveau).
 * Compris en < 3 s (§A). Le CLAIM reste tranché serveur : ici, que des étiquettes.
 */
function ZonePeek({
  detail,
  onClose,
  onAct,
  onMore,
}: {
  detail: ZoneDetail;
  onClose: () => void;
  onAct: () => void;
  onMore: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const ownerLine =
    detail.ownerRole === 'other' ? detail.ownerName : t(C.heldBy, { name: detail.ownerName });
  return (
    <View style={styles.info}>
      <View style={styles.zoneHead}>
        <View style={[styles.zonePastille, { backgroundColor: ZONE_ROLE_TINT[detail.ownerRole] }]} />
        <Text style={styles.zoneName} numberOfLines={1} adjustsFontSizeToFit>
          {detail.name}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(C.closeZoneA11y)}
          hitSlop={8}
          onPress={onClose}
          style={({ pressed }) => [styles.zoneCloseHit, pressed && styles.pressed]}
        >
          <Text style={styles.zoneCloseText}>{t(C.closeLabel)}</Text>
        </Pressable>
      </View>

      <Text style={styles.zoneOwner} numberOfLines={1} adjustsFontSizeToFit>
        {ownerLine}
      </Text>
      <Text style={styles.zoneControl} numberOfLines={1}>
        {t(C.controlPct, { pct: detail.controlPct })}
      </Text>

      {/* ACTION RECOMMANDÉE §10 : ligne informative + 1 CTA chartreuse. */}
      <Text style={styles.zoneActionLine} numberOfLines={1} adjustsFontSizeToFit>
        {actionLine(detail, t, locale)}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={detail.action.ctaLabel}
        onPress={onAct}
        style={({ pressed }) => [styles.zoneCta, pressed && styles.pressed]}
      >
        <Text style={styles.zoneCtaText} numberOfLines={1}>
          {detail.action.ctaLabel}
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(C.moreA11y)}
        hitSlop={8}
        onPress={onMore}
        style={({ pressed }) => [styles.optionsHit, pressed && styles.pressed]}
      >
        <Text style={styles.optionsLink} numberOfLines={1}>
          {t(C.moreLabel)}
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * DÉTAIL ZONE (§10, état OUVERT / « Plus ») — hors 1er niveau (§4.3/§15) : tenue
 * depuis · surface, défendue il y a X, PRESSION (top rival % + neutre %),
 * ACTIVITÉ 24 H AGRÉGÉE (« 12 runs · 7 alliés · 5 rivaux » — jamais localisée),
 * puis lien vers l'historique. Textes sur le fond du panneau (pas de card-in-card).
 */
function ZoneDetailBlock({
  detail,
  onHistory,
}: {
  detail: ZoneDetail;
  onHistory: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const p = detail.pressure;
  const a = detail.activity24h;
  return (
    <View style={styles.openBlock}>
      <Text style={styles.zoneDetailLine} numberOfLines={1}>
        {t(C.heldSinceArea, {
          held: detail.heldSinceLabel,
          area: formatArea(detail.areaKm2, locale),
        })}
      </Text>
      <Text style={styles.zoneDetailLine} numberOfLines={1}>
        {t(C.defendedAgo, { ago: detail.defendedAgoLabel })}
      </Text>

      <Text style={styles.sectionTitle}>{t(C.sectionPressure)}</Text>
      <Text style={styles.zoneDetailLine} numberOfLines={1} adjustsFontSizeToFit>
        {t(C.pressureLine, {
          rival: p.topRivalName,
          rivalPct: p.topRivalPct,
          neutralPct: p.neutralPct,
        })}
      </Text>

      <Text style={styles.sectionTitle}>{t(C.sectionActivity)}</Text>
      <Text style={styles.zoneDetailLine} numberOfLines={1}>
        {t(C.activityLine, { runs: a.runs, allies: a.allies, rivals: a.rivals })}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(C.historyLinkA11y)}
        onPress={() => {
          haptics.light();
          onHistory();
        }}
        style={({ pressed }) => [styles.rowCard, pressed && styles.pressed]}
      >
        <View style={styles.rowIcon}>
          <Icon name="historique" size={iconSizes.sm} color={colors.blanc} />
        </View>
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle} numberOfLines={1} ellipsizeMode="clip">
            {t(C.zoneHistoryTitle)}
          </Text>
          <Text style={styles.rowMeta} numberOfLines={1} ellipsizeMode="clip">
            {t(C.zoneHistoryMeta)}
          </Text>
        </View>
        <Icon name="chevron" size={iconSizes.sm} color={colors.gris} />
      </Pressable>
    </View>
  );
}

/**
 * Menu « Calques » (AMENDEMENT-21) : ouvert EN 1 TAP par le FAB Calques — le FOND
 * (Sombre / Clair / Satellite) en haut, la VUE (2D/3D + « Carte nue »), puis les
 * calques de lecture. Fermé par défaut. L'actif se lit en chartreuse sur la
 * surface SOMBRE du menu. La rangée « Carte nue » (retour terrain 20/07) remplace
 * l'ancien FAB : masquer tout le HUD est une option d'AFFICHAGE, sa vraie famille.
 */
function LayerMenu({
  maxHeight,
  active,
  onSelect,
  basemap,
  onSelectBasemap,
  map3d,
  onSetMap3d,
  hudHidden,
  onToggleHud,
}: {
  /** Plafond de hauteur : au-delà, le menu défile (ne recouvre pas le HUD haut). */
  maxHeight?: number;
  active: MapMode;
  onSelect: (mode: MapMode) => void;
  basemap: BasemapKey;
  onSelectBasemap?: (key: BasemapKey) => void;
  map3d?: boolean;
  onSetMap3d?: (value: boolean) => void;
  /** « Carte nue » actif = tout le HUD est masqué (la rangée est en surbrillance). */
  hudHidden: boolean;
  /** Bascule « Carte nue » (masque/affiche le HUD) — referme le menu pour la voir. */
  onToggleHud: () => void;
}) {
  const t = useT();
  return (
    <ScrollView
      style={[styles.layerMenu, maxHeight != null ? { maxHeight } : null]}
      contentContainerStyle={styles.layerMenuContent}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      {onSelectBasemap ? (
        <>
          <Text style={styles.layerHeading}>{t(C.headingBasemap)}</Text>
          {BASEMAP_KEYS.map((key) => {
            const on = basemap === key;
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={t(C.basemapA11y, { label: t(BASEMAP_ENTRIES[key]) })}
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
                  {t(BASEMAP_ENTRIES[key])}
                </Text>
              </Pressable>
            );
          })}
          <View style={styles.layerDivider} />
        </>
      ) : null}
      {/* VUE — options d'AFFICHAGE de la carte. Toujours présent car « Carte nue »
          (masquer tout le HUD) y vit désormais : elle reste accessible même sans
          toggle 3D. Le 2D/3D n'apparaît que si le parent le pilote (onSetMap3d). */}
      <Text style={styles.layerHeading}>{t(C.headingView)}</Text>
      {onSetMap3d ? (
        <Map3DToggle
          value={map3d}
          onChange={onSetMap3d}
          style={styles.layerToggle}
          testID="battle-map-3d-toggle"
        />
      ) : null}
      {/* « Carte nue » — bascule d'affichage (masque/affiche tout le HUD). Icône
          « discret » (masquer). Actif = HUD masqué ; l'a11y décrit l'action du tap. */}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: hudHidden }}
        accessibilityLabel={hudHidden ? t(C.hudShowA11y) : t(C.hudHideA11y)}
        onPress={onToggleHud}
        style={({ pressed }) => [
          styles.layerItem,
          hudHidden && styles.layerItemActive,
          pressed && styles.pressed,
        ]}
      >
        <Icon name="discret" size={15} color={hudHidden ? gameColors.crew : colors.blanc} />
        <Text style={[styles.layerLabel, hudHidden && styles.layerLabelActive]} numberOfLines={1}>
          {t(C.hudRowLabel)}
        </Text>
      </Pressable>
      <View style={styles.layerDivider} />
      <Text style={styles.layerHeading}>{t(C.headingLayers)}</Text>
      {MAP_MODE_ORDER.map((key) => {
        const on = active === key;
        return (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={t(C.layerA11y, { label: t(MODE_CHIP_ENTRIES[key]) })}
            onPress={() => onSelect(key)}
            style={({ pressed }) => [
              styles.layerItem,
              on && styles.layerItemActive,
              pressed && styles.pressed,
            ]}
          >
            <Icon name={MAP_MODE_ICON[key]} size={15} color={MODE_COLOR[key]} active={on} />
            <Text style={[styles.layerLabel, on && styles.layerLabelActive]} numberOfLines={1}>
              {t(MODE_CHIP_ENTRIES[key])}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Surface profonde translucide commune aux flottants (HUD sur carte). */
const OVERLAY_SURFACE = withAlpha(gameColors.carbon, 0.92);

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },

  // ── FAB column : 2 MAX (Calques + Recentrer) ──
  fabColumn: { position: 'absolute', right: 14, gap: 10, alignItems: 'flex-end' },

  // ── Menu Calques (fond + vue + calques de lecture) — ScrollView plafonné ──
  layerMenu: {
    alignSelf: 'flex-end',
    flexGrow: 0, // épouse son contenu tant qu'on est sous `maxHeight`
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: OVERLAY_SURFACE,
    marginBottom: 4,
    minWidth: 168,
  },
  layerMenuContent: { gap: 4, padding: 8 },
  layerHeading: {
    color: colors.gris,
    fontSize: fontSizes.xs, // >= 12 px (a11y)
    fontWeight: '700',
    letterSpacing: 1,
    marginLeft: 2,
    marginTop: 2,
    marginBottom: 2,
  },
  layerDivider: { height: 1, backgroundColor: colors.grisLigne, marginVertical: 4 },
  layerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44, // cible tactile >= 44 px (a11y)
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  layerItemActive: { borderColor: gameColors.crew, backgroundColor: gameColors.carbon },
  layerToggle: { alignSelf: 'stretch', marginHorizontal: 2 },
  layerLabel: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '600' },
  layerLabelActive: { color: gameColors.crew },

  // Le wrapper CLIPPE la sheet (elle glisse vers le bas à la fermeture).
  sheetWrap: { position: 'absolute', left: 0, right: 0, top: 0, overflow: 'hidden' },

  // ── Contenu du peek (mission / zone) : posé directement, pas de sous-card ──
  info: { paddingHorizontal: 16, paddingBottom: 12, gap: 6 },

  // ── PEEK MISSION ──
  peekHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  missionBar: { width: 4, height: 34, borderRadius: 2, backgroundColor: gameColors.crew },
  peekTitle: {
    color: colors.blanc,
    fontSize: fontSizes.md, // 16 px
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  peekMeta: { color: colors.gris, fontSize: 12.5, fontWeight: '600', marginTop: 2 },
  // Rival nommé — teinte rival (>= 12 px : aucun texte porteur sous 12).
  peekRival: { color: gameColors.rival, fontSize: 12.5, fontWeight: '600' },

  // ── SITUATION (état OUVERT du peek mission) ──
  situation: { gap: 2, marginBottom: 6 },
  situationTitle: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
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
  situationChipText: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '600' },

  // ── PEEK ZONE (§3/§10) ──
  zoneHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  zonePastille: { width: 10, height: 10, borderRadius: 5 },
  zoneName: {
    flex: 1,
    color: colors.blanc,
    fontSize: fontSizes.md, // 16 px
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  zoneCloseHit: { minHeight: 32, paddingHorizontal: 6, justifyContent: 'center' },
  zoneCloseText: { color: colors.gris, fontSize: 13, fontWeight: '600' },
  zoneOwner: { color: colors.blanc, fontSize: 13, fontWeight: '600' },
  zoneControl: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  zoneActionLine: {
    color: colors.blanc,
    fontSize: 12.5,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  // 1 CTA chartreuse (texte noir sur chartreuse — jamais chartreuse sur clair).
  zoneCta: {
    minHeight: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginTop: 2,
  },
  zoneCtaText: { color: colors.noir, fontSize: fontSizes.sm, fontWeight: '800', letterSpacing: 0.2 },

  // ── DÉTAIL ZONE (état OUVERT « Plus ») ──
  zoneDetailLine: {
    color: colors.blanc,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },

  // « Voir les options » / « Plus » — lien discret (jamais un 2ᵉ CTA).
  optionsHit: { minHeight: 44, justifyContent: 'center', marginTop: 2 },
  optionsLink: {
    color: colors.gris,
    fontSize: 13,
    textDecorationLine: 'underline',
    textAlign: 'center',
  },

  // ── État OUVERT : les options (Situation / Parcours / Équipe / Détails) ──
  openBlock: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8, gap: 8 },
  sectionTitle: {
    color: colors.gris,
    fontSize: fontSizes.xs, // >= 12 px (a11y)
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
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone,
  },
  rowCardSelected: { borderColor: colors.chartreuse40 },
  rowIcon: {
    width: 26,
    height: 26,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: gameColors.carbon,
  },
  rowBody: { flex: 1, gap: 1 },
  rowTitle: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '600' },
  rowMeta: { color: colors.gris, fontSize: fontSizes.xs, fontVariant: ['tabular-nums'] },
  onMapTag: { color: gameColors.crew, fontSize: fontSizes.xs, fontWeight: '700', letterSpacing: 0.5 },
  joinSoon: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: gameColors.carbon,
  },
  joinSoonLabel: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '700' },
});
