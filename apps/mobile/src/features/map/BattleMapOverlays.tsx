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
import { useCallback, useEffect, useState } from 'react';
import { setZoneSheetOpen, setMapHudHidden, useMapHudHidden } from './mapUiStore';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, gameColors, iconSizes, radii, withAlpha } from '@klaim/shared';
import { C } from '../../i18n/catalog/map';
import { useLocale, useT } from '../../i18n/store';
import type { Entry, Locale } from '../../i18n/types';
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
import { BASEMAP_KEYS, type BasemapKey } from './mapStyle';
import type { TerritoryWidgetView } from '../widget/territoryWidget';
import { MAP_MODE_ICON, MAP_MODE_ORDER, type MapMode } from './territory';

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
 * Hauteur du peek d'une VRAIE zone (hex_claims) : en-tête + rôle + surface.
 * Courte, et c'est le point : on n'a ni « action recommandée » ni pression
 * réelles, et on n'en invente pas pour remplir la hauteur.
 */
const REAL_ZONE_SHEET_COMPACT_HEIGHT = 132;
/**
 * Hauteur de l'ÉTAT VIDE (titre + phrase, + lien d'action quand il y en a un).
 * Deux valeurs : sans CTA le peek se resserre au lieu de laisser un vide qui se
 * lirait comme un écran cassé.
 */
const EMPTY_PEEK_HEIGHT = 104;
const EMPTY_PEEK_WITH_CTA_HEIGHT = 140;

/**
 * ÉTAT VIDE de la carte (O1 — vitrine OFF par défaut). Trois cas qui n'ont PAS
 * la même copie ni la même action ; les confondre serait remplacer un mensonge
 * par un autre (cf. `dataNote`, même discipline).
 */
export type MapEmptyState = 'signed-out' | 'empty' | 'failed';

/**
 * Une VRAIE zone tapée, réduite à ce que `hex_claims` sait réellement dire :
 * un RÔLE (moi/mon crew vs rival — §C, jamais une couleur par crew), un nombre
 * de zones et une surface. Pas de nom de crew, pas de « contrôle % », pas de
 * pression : la table ne les porte pas et on ne les fabrique pas.
 */
export interface MapZoneView {
  role: 'mine' | 'rival';
  zones: number;
  areaKm2: number;
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

/*
 * SUPPRIMÉS LE 21/07/2026 AVEC LE MODE VITRINE — et volontairement listés ici,
 * pour que personne ne les « restaure » en croyant réparer un trou :
 *   • MissionPeek      — « République sous pression · Canal Crew reprend du
 *                         terrain » : une mission ET un rival fabriqués.
 *   • SituationBlock   — parts de contrôle, directive bonus, horloge : aucune
 *                         donnée serveur ne les porte.
 *   • ZonePeek / ZoneDetailBlock / actionLine / ZONE_ROLE_TINT — la sheet de
 *                         zone alimentée par ZONE_DETAILS (propriétaire, %
 *                         rival, « 24 runs en 24 h »). La VRAIE sheet de zone
 *                         (RealZonePeek, dérivée de hex_claims) la remplace.
 * Leur retour passera par une source RÉELLE, pas par un fichier `*Demo`.
 */
export interface BattleMapOverlaysProps {
  /** Calque de carte actif (un seul à la fois) — AUTO par défaut (MapScreen). */
  mode: MapMode;
  onSelectMode: (mode: MapMode) => void;
  /** Retour ego fluide (anim caméra/scène côté écran) — bouton Recentrer. */
  onRecenter?: () => void;
  /** Parcours affiché en aperçu sur la carte (RouteProgress, progress 0). */
  /**
   * Aperçu de PARCOURS sur la carte. Plus aucune surface ne le SÉLECTIONNE
   * depuis la suppression de PARCOURS_DEMO (le seul sélecteur était une liste de
   * parcours fabriqués) ; la prop reste le point d'entrée du Route Planner, qui
   * porte de vrais itinéraires. Non alimentée aujourd'hui : c'est dit, pas caché.
   */
  selectedParcoursId?: string | null;
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
   * DONNÉES RÉELLES existent (session + hex_claims lus). Absent/null ⇒ c'est
   * `emptyState` qui parle (le peek mission de démo n'existe plus). L'action du
   * widget est un LIEN (anti double-CTA §A.4 / AMENDEMENT-29 : le gros CTA reste
   * le bouton flottant).
   */
  widget?: TerritoryWidgetView | null;
  /** Tap sur l'action du widget (routage côté écran : partage, options…). */
  onWidgetAction?: (view: TerritoryWidgetView) => void;
  /**
   * ÉTAT VIDE HONNÊTE. Il n'existe AUCUNE mission, aucun rival, aucun parcours
   * réel : le peek de démo (« République sous pression · Canal Crew reprend du
   * terrain ») a été supprimé avec le mode vitrine. Quand `widget` est absent,
   * c'est cet état qui parle — jamais un trou, jamais la démo.
   * `null` = on ne sait pas ENCORE (lecture en cours) : la sheet se tait, elle
   * n'affirme pas « pas connecté » avant d'avoir la réponse.
   */
  emptyState?: MapEmptyState | null;
  /** Action de l'état vide : se connecter ('signed-out') / réessayer ('failed'). */
  onEmptyAction?: () => void;
  /**
   * VRAIE zone tapée (dérivée de `hex_claims` côté écran) : la SEULE source de
   * la sheet de zone depuis la suppression de `ZONE_DETAILS` (République, Quai
   * de Valmy, Lille Centre… — des étiquettes de scénario).
   */
  zone?: MapZoneView | null;
}

export function BattleMapOverlays({
  mode,
  onSelectMode,
  onRecenter,
  selectedParcoursId: _selectedParcoursId = null,
  selectedZoneId = null,
  onCloseZone,
  basemap = 'dark',
  onToggleBasemap,
  widget = null,
  onWidgetAction,
  emptyState = null,
  onEmptyAction,
  zone = null,
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
  /**
   * Sheet de zone : ouverte dès qu'on connaît la VRAIE zone tapée. `ZONE_DETAILS`
   * (République tenue par MY_CREW, « Canal Crew à 31 % », « 24 runs en 24 h ») a
   * disparu avec le mode vitrine — une collision d'identifiant suffisait sinon à
   * peindre un propriétaire inventé sur une zone réellement possédée.
   * Une zone tapée sans donnée (`zone` null) n'ouvre RIEN : on ne remplit pas le
   * vide avec un scénario.
   */
  const zoneOpen = selectedZoneId != null && zone != null;

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
  /**
   * QUE MONTRE LE PEEK quand aucune donnée réelle n'existe ? L'ÉTAT VIDE — et
   * RIEN DU TOUT tant qu'on ne sait pas encore (`emptyState` null = lecture en
   * cours) : une phrase démentie une seconde plus tard reste une phrase fausse.
   * La sheet elle-même se retire alors, plutôt que de laisser un cadre vide.
   */
  const showEmptyPeek = widget === null && emptyState !== null;
  const missionSheetVisible = widget !== null || showEmptyPeek;
  const sheetVisible = zoneOpen || (!hudHidden && missionSheetVisible);
  /** Bas de la pile de FABs : au-dessus de la sheet visible (zone OU mission), sinon nav.
   *  Chaque état a SA hauteur : le peek épouse son contenu au lieu de laisser un
   *  vide sous le texte (un blanc se lit comme un écran cassé — §A). */
  const activeCompactHeight = zoneOpen
    ? REAL_ZONE_SHEET_COMPACT_HEIGHT
    : showEmptyPeek
      ? emptyState === 'empty'
        ? EMPTY_PEEK_HEIGHT
        : EMPTY_PEEK_WITH_CTA_HEIGHT
      : MISSION_PEEK_COMPACT_HEIGHT;
  const fabBottom = sheetVisible ? sheetBottom + activeCompactHeight + FAB_ABOVE_SHEET : sheetBottom;

  // Le menu Calques s'ouvre AU-DESSUS de la pile de FABs. On PLAFONNE sa hauteur à
  // l'espace libre entre le HUD du haut (secteur + ligne mission) et le sommet des
  // FABs → il défile au lieu de recouvrir « République attaquée » (retour fondateur).
  const { height: winH } = useWindowDimensions();
  const layerMenuMaxHeight = Math.max(
    120,
    winH - insets.top - TOP_HUD_CLEARANCE - fabBottom - FAB_STACK_HEIGHT,
  );

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

  /** Fermer la sheet de zone → carte nue + retour au peek mission. */
  const closeZone = () => {
    haptics.light();
    onCloseZone?.();
  };

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
        {zoneOpen && zone ? (
          /* VRAIE zone tapée : ce que hex_claims sait dire, rien de plus. Aucun
             CTA ici — le bouton GO flottant reste l'unique CTA chartreuse (§A.4),
             et « défendre » sans mission réelle serait un verbe creux. */
          <MapBottomSheet
            key={`realzone-${selectedZoneId}`}
            initialState="compact"
            compactHeight={REAL_ZONE_SHEET_COMPACT_HEIGHT}
            compactSlot={<RealZonePeek zone={zone} onClose={closeZone} />}
          />
        ) : hudHidden || !missionSheetVisible ? null : (
          <MapBottomSheet
            key={`mission-${sheet.key}`}
            initialState={sheet.initial}
            compactHeight={activeCompactHeight}
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
                /* `missionSheetVisible` garantit qu'on n'arrive ici qu'avec un
                   emptyState non-null : plus aucun repli sur le peek de démo. */
                <EmptyPeek state={emptyState ?? 'signed-out'} onAction={onEmptyAction} />
              )
            }
            openSlot={
              <View style={styles.openBlock}>
                {/* SITUATION / PARCOURS / ÉQUIPE ont été RETIRÉS (21/07/2026) :
                    tous trois sortaient de `demo.ts` (MAP_MISSION_SUMMARY,
                    PARCOURS_DEMO, MATES_OPT_IN). Il n'existe ni parcours proposé,
                    ni allié partageant sa position, ni part de contrôle réelle —
                    les afficher, c'était fabriquer une situation de jeu. Ne
                    restent que des entrées VRAIES : l'historique local, et la War
                    Room quand son flag est levé. */}
                {/* BLOC — DÉTAILS. La rangée « mission du jour » (MISSIONS[0],
                    warroom/demo.ts) est partie avec le reste de la démo : elle
                    n'était masquée que par le flag warRoom, donc un `FULL_SURFACE=1`
                    suffisait à afficher une mission fabriquée. Ne reste que ce qui
                    est vrai — l'historique local du joueur. */}
                <Text style={styles.sectionTitle}>{t(C.sectionDetails)}</Text>
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
 * ÉTAT VIDE du peek (O1) — ce que voit un téléphone neuf, sans compte, quand
 * plus aucune démo ne remplit l'écran. Il DIT ce qu'il n'y a pas encore, sans
 * culpabiliser, et propose au plus UNE action :
 *   • 'signed-out' → « Se connecter » (lien : le CTA chartreuse reste GO) ;
 *   • 'empty'      → aucune action ici — courir EST l'action, et le bouton GO
 *                    flottant la porte déjà (§A.4 : un seul CTA à l'écran) ;
 *   • 'failed'     → « Réessayer » : un échec réseau se dit et se rejoue, il ne
 *                    se déguise jamais en « tu n'as rien capturé ».
 */
function EmptyPeek({
  state,
  onAction,
}: {
  state: MapEmptyState;
  onAction?: () => void;
}) {
  const t = useT();
  const copy =
    state === 'signed-out'
      ? { title: C.emptySignedOutTitle, line: C.emptySignedOutLine, cta: C.emptySignedOutCta }
      : state === 'failed'
        ? { title: C.emptyFailedTitle, line: C.emptyFailedLine, cta: C.emptyFailedCta }
        : { title: C.emptyNoneTitle, line: C.emptyNoneLine, cta: null };
  return (
    <View style={styles.info}>
      <View style={styles.peekHead}>
        {/* Barre GRISE (pas chartreuse) : rien n'est à moi ici, la couleur suit
            le RÔLE et il n'y a pas encore de territoire à revendiquer. */}
        <View style={styles.emptyBar} />
        <View style={styles.rowBody}>
          <Text style={styles.peekTitle} numberOfLines={1} adjustsFontSizeToFit>
            {t(copy.title)}
          </Text>
        </View>
      </View>
      {/* 2 lignes autorisées : la phrase explique, elle n'est jamais coupée (§A9). */}
      <Text style={styles.peekMeta} numberOfLines={2}>
        {t(copy.line)}
      </Text>
      {copy.cta && onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(copy.cta)}
          hitSlop={8}
          onPress={() => {
            haptics.light();
            onAction();
          }}
          style={({ pressed }) => [styles.optionsHit, pressed && styles.pressed]}
        >
          <Text style={styles.optionsLink} numberOfLines={1}>
            {t(copy.cta)}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * PEEK d'une VRAIE zone tapée (hex_claims). Volontairement pauvre : la table ne
 * porte ni nom de quartier, ni crew, ni part de contrôle, ni pression rivale —
 * on affiche donc UNIQUEMENT ce qu'on sait (rôle, nombre de zones, surface) et
 * on se tait sur le reste. Pastille de RÔLE (chartreuse = moi/mon crew, orange =
 * rival), jamais une couleur par crew (§C). Aucun CTA : le bouton GO flottant
 * reste l'unique CTA chartreuse de l'écran (§A.4).
 */
function RealZonePeek({ zone, onClose }: { zone: MapZoneView; onClose: () => void }) {
  const t = useT();
  const locale = useLocale();
  const tint = zone.role === 'mine' ? gameColors.crew : gameColors.rival;
  return (
    <View style={styles.info}>
      <View style={styles.zoneHead}>
        <View style={[styles.zonePastille, { backgroundColor: tint }]} />
        <Text style={styles.zoneName} numberOfLines={1} adjustsFontSizeToFit>
          {t(C.zoneFallback)}
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
        {t(zone.role === 'mine' ? C.zoneOwnerMine : C.zoneOwnerRival)}
      </Text>
      <Text style={styles.zoneControl} numberOfLines={1}>
        {zonesLabel(t, zone.zones)} · {formatArea(zone.areaKm2, locale)}
      </Text>
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
  // État vide : barre GRISE — la chartreuse dit « à moi », et rien ne l'est encore.
  emptyBar: { width: 4, height: 34, borderRadius: 2, backgroundColor: colors.grisLigne },
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
