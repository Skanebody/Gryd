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
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, gameColors, iconSizes, radii, withAlpha } from '@klaim/shared';
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
import {
  MAP_MODE_ICON,
  MAP_MODE_LABELS,
  MAP_MODE_ORDER,
  type MapMode,
} from './territory';
import { mapOpportunities } from './opportunities';

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
 */
const BASEMAP_LABELS: Record<BasemapKey, string> = {
  dark: 'Sombre',
  color: 'Clair',
  satellite: 'Satellite',
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
 * Hauteur du PEEK MISSION persistant (§8) : titre + méta + rival + lien options,
 * assez de peek pour tout montrer SANS troncature (§A9). La carte reste le cœur.
 */
const MISSION_PEEK_COMPACT_HEIGHT = 168;
/**
 * Hauteur du PEEK ZONE (§3/§10) : en-tête + propriétaire + contrôle + action
 * recommandée + 1 CTA + « Plus » — sans troncature. Le détail (surface, tenue,
 * pression, activité 24 H) vit dans l'état OUVERT (« Plus »), hors 1er niveau.
 */
const ZONE_SHEET_COMPACT_HEIGHT = 224;

/** « 4,4 km » — décimale française, pas d'Intl (parité Hermes). */
function formatKm(km: number): string {
  return `${km.toFixed(1).replace('.', ',')} km`;
}

/** « 3 zones » / « 1 zone » — accord singulier/pluriel (jamais tronqué). */
function zonesLabel(n: number): string {
  const v = Math.max(1, n);
  return `${v} zone${v > 1 ? 's' : ''}`;
}

/** « 0,8 km² » — décimale française, zéros de fin retirés (jamais tronqué). */
function formatArea(km2: number): string {
  const s = km2.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  return `${s.replace('.', ',')} km²`;
}

/** Ligne d'ACTION RECOMMANDÉE §10 : « {type} · {km} · {min} min · +{n} zones ». */
function actionLine(detail: ZoneDetail): string {
  const a = detail.action;
  return `${a.type} · ${formatKm(a.km)} · ${a.minutes} min · +${zonesLabel(a.zones)}`;
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
  /** « Carte nue » : l'utilisateur a masqué tout le HUD (FAB « info » ci-dessous). */
  const hudHidden = useMapHudHidden();
  // Peek MISSION persistant (§8) : `sheet.initial` distingue le PEEK (compact)
  // de l'état OUVERT (les options), remonté par « Voir les options » (remount
  // key + initialState — snap, façon reduce motion).
  const [sheet, setSheet] = useState<{ key: number; initial: MapSheetState }>({
    key: 0,
    initial: 'compact',
  });
  /** Menu « Calques » (fond + calques de lecture) — fermé par défaut. */
  const [layersOpen, setLayersOpen] = useState(false);
  /**
   * Menu « Outils » de la carte (demande fondateur) : les 3 contrôles (Calques,
   * Recentrer, Carte nue) sont REGROUPÉS derrière UN seul bouton déclencheur ;
   * fermé par défaut → la carte ne montre qu'une icône. Ils restent INDÉPENDANTS
   * (chacun sa propre action) une fois le menu ouvert.
   */
  const [toolsOpen, setToolsOpen] = useState(false);
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
      setToolsOpen(false);
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
  // « Carte nue » masque le HUD : ligne mission (haut, dans index.tsx), sheet du bas
  // et FABs de contrôle (Calques + Recentrer). Un tap sur une ZONE reste explicite →
  // sa sheet s'affiche même en carte nue (la carte ne devient pas inerte). Seul le FAB
  // « info » (bascule) subsiste toujours pour tout ramener.
  const sheetVisible = zoneOpen || !hudHidden;
  /** Bas de la pile de FABs : au-dessus de la sheet visible (zone OU mission), sinon nav. */
  const activeCompactHeight = zoneOpen ? ZONE_SHEET_COMPACT_HEIGHT : MISSION_PEEK_COMPACT_HEIGHT;
  const fabBottom = sheetVisible ? sheetBottom + activeCompactHeight + FAB_ABOVE_SHEET : sheetBottom;

  /** « Voir les options » : déplie le peek mission sur les options (open). */
  const openOptions = () => {
    haptics.light();
    setSheet((s) => ({ key: s.key + 1, initial: 'open' }));
  };

  /**
   * Ouvre/ferme le menu « Outils » (les 3 contrôles). En le fermant, on referme
   * aussi le sous-menu Calques (rien d'ouvert derrière le bouton replié).
   */
  const toggleTools = () => {
    haptics.light();
    const next = !toolsOpen;
    setToolsOpen(next);
    if (!next) setLayersOpen(false);
  };

  /** Recentrer = action one-shot → on referme le menu Outils (« ferme en l'utilisant »). */
  const recenterAndClose = () => {
    onRecenter?.();
    setToolsOpen(false);
    setLayersOpen(false);
  };

  /**
   * Bascule « carte nue » (demande fondateur) : masque/affiche TOUT le HUD (ligne
   * mission du haut + sheet du bas) → carte plein écran. One-shot → referme aussi le
   * menu Outils et le sous-menu Calques pour laisser une carte réellement nue.
   */
  const toggleHud = () => {
    haptics.light();
    setLayersOpen(false);
    setToolsOpen(false);
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
      {/* ── Droite : UN menu « Outils » (demande fondateur). Par défaut la carte ne
          montre qu'UN bouton déclencheur ; au tap il révèle les 3 contrôles
          INDÉPENDANTS (Calques, Recentrer, Carte nue), et se referme au re-tap ou
          après usage d'un one-shot. Le déclencheur reste TOUJOURS visible (dernier
          de la pile = en bas, sous le pouce) — même en carte nue, pour tout ramener. ── */}
      <View
        style={[styles.fabColumn, { bottom: fabBottom }]}
        pointerEvents="box-none"
      >
        {toolsOpen && layersOpen ? (
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
        {toolsOpen ? (
          <>
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
              onPress={recenterAndClose}
            />
            {/* Bascule CARTE NUE — `active` = HUD affiché ; tap = masquer/afficher le HUD. */}
            <FloatingMapButton
              icon="info"
              accessibilityLabel={
                hudHidden
                  ? 'Afficher les infos de la carte'
                  : 'Masquer les infos — carte plein écran'
              }
              active={!hudHidden}
              onPress={toggleHud}
            />
          </>
        ) : null}
        {/* Déclencheur du menu Outils — toujours visible. Ouvert = ✕ (referme),
            fermé = ⚙ (ouvre). Un seul bouton sur la carte au repos. */}
        <FloatingMapButton
          icon={toolsOpen ? 'fermer' : 'reglages'}
          accessibilityLabel={toolsOpen ? 'Fermer les outils de la carte' : 'Outils de la carte'}
          active={toolsOpen}
          onPress={toggleTools}
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
                        <Text style={styles.rowTitle} numberOfLines={1} adjustsFontSizeToFit>
                          {p.name}
                        </Text>
                        <Text style={styles.rowMeta} numberOfLines={1} adjustsFontSizeToFit>
                          {formatKm(meta.distanceKm)} · {zonesLabel(meta.hexes)} · +{meta.points} pts
                        </Text>
                      </View>
                      {selected ? (
                        <Text style={styles.onMapTag}>SUR LA CARTE</Text>
                      ) : (
                        <Icon name="chevron" size={iconSizes.sm} color={colors.gris} />
                      )}
                    </Pressable>
                  );
                })}

                {/* BLOC — ÉQUIPE (nombre d'alliés + le plus proche, non tronqué). */}
                <Text style={styles.sectionTitle}>ÉQUIPE</Text>
                <View style={styles.rowCard}>
                  <View style={styles.rowIcon}>
                    <Icon name="ami" size={iconSizes.sm} color={gameColors.crew} />
                  </View>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle} numberOfLines={1} ellipsizeMode="clip">
                      {MATES_OPT_IN.length} alliés proches
                    </Text>
                    <Text style={styles.rowMeta} numberOfLines={1} adjustsFontSizeToFit>
                      {nearestMateName} · {formatKm(nearestMateKm)}
                    </Text>
                  </View>
                  {/* L'app NE MENT JAMAIS : le run groupé réel n'existe pas
                      encore — badge « Bientôt » non actionnable, texte gris. */}
                  <View
                    accessibilityRole="text"
                    accessibilityLabel="Courir ensemble avec les alliés proches : bientôt disponible"
                    style={styles.joinSoon}
                  >
                    <Text style={styles.joinSoonLabel} numberOfLines={1} ellipsizeMode="clip">
                      Bientôt
                    </Text>
                  </View>
                </View>

                {/* BLOC — DÉTAILS (missions liées + historique local). */}
                <Text style={styles.sectionTitle}>DÉTAILS</Text>
                {mission && flags.warRoom ? (
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
                      <Icon name="cible" size={iconSizes.sm} color={colors.blanc} />
                    </View>
                    <View style={styles.rowBody}>
                      <Text style={styles.rowTitle} numberOfLines={1} adjustsFontSizeToFit>
                        {mission.label}
                      </Text>
                      <Text style={styles.rowMeta} numberOfLines={1} adjustsFontSizeToFit>
                        {mission.progress}/{mission.target} · mission du jour
                      </Text>
                    </View>
                    <Icon name="chevron" size={iconSizes.sm} color={colors.gris} />
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
                    <Icon name="historique" size={iconSizes.sm} color={colors.blanc} />
                  </View>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle} numberOfLines={1} ellipsizeMode="clip">
                      Mon historique
                    </Text>
                    <Text style={styles.rowMeta} numberOfLines={1} ellipsizeMode="clip">
                      Tes courses passées
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
            {s.zone} sous pression
          </Text>
          <Text style={styles.peekMeta} numberOfLines={1} adjustsFontSizeToFit>
            {zonesLabel(MAP_MISSION.zones)} · {formatKm(MAP_MISSION.distanceKm)}
          </Text>
        </View>
      </View>
      {/* Rival nommé (§26.2) — teinte rival (orange), informatif, sans CTA. */}
      <Text style={styles.peekRival} numberOfLines={1} adjustsFontSizeToFit>
        {MAP_RIVAL_PILL.message}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Voir les options — parcours, équipe et détails"
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
  const s = MAP_MISSION_SUMMARY;
  return (
    <View style={styles.situation}>
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
  const ownerLine =
    detail.ownerRole === 'other' ? detail.ownerName : `Détenu par ${detail.ownerName}`;
  return (
    <View style={styles.info}>
      <View style={styles.zoneHead}>
        <View style={[styles.zonePastille, { backgroundColor: ZONE_ROLE_TINT[detail.ownerRole] }]} />
        <Text style={styles.zoneName} numberOfLines={1} adjustsFontSizeToFit>
          {detail.name}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fermer la zone — revenir à la carte"
          hitSlop={8}
          onPress={onClose}
          style={({ pressed }) => [styles.zoneCloseHit, pressed && styles.pressed]}
        >
          <Text style={styles.zoneCloseText}>Fermer</Text>
        </Pressable>
      </View>

      <Text style={styles.zoneOwner} numberOfLines={1} adjustsFontSizeToFit>
        {ownerLine}
      </Text>
      <Text style={styles.zoneControl} numberOfLines={1}>
        Contrôle {detail.controlPct} %
      </Text>

      {/* ACTION RECOMMANDÉE §10 : ligne informative + 1 CTA chartreuse. */}
      <Text style={styles.zoneActionLine} numberOfLines={1} adjustsFontSizeToFit>
        {actionLine(detail)}
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
        accessibilityLabel="Plus — détail de la zone : surface, tenue, pression et activité"
        hitSlop={8}
        onPress={onMore}
        style={({ pressed }) => [styles.optionsHit, pressed && styles.pressed]}
      >
        <Text style={styles.optionsLink} numberOfLines={1}>
          Plus
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
  const p = detail.pressure;
  const a = detail.activity24h;
  return (
    <View style={styles.openBlock}>
      <Text style={styles.zoneDetailLine} numberOfLines={1}>
        Tenue {detail.heldSinceLabel} · {formatArea(detail.areaKm2)}
      </Text>
      <Text style={styles.zoneDetailLine} numberOfLines={1}>
        Défendue {detail.defendedAgoLabel}
      </Text>

      <Text style={styles.sectionTitle}>PRESSION</Text>
      <Text style={styles.zoneDetailLine} numberOfLines={1} adjustsFontSizeToFit>
        {p.topRivalName} {p.topRivalPct} % · Neutre {p.neutralPct} %
      </Text>

      <Text style={styles.sectionTitle}>ACTIVITÉ 24 H</Text>
      <Text style={styles.zoneDetailLine} numberOfLines={1}>
        {a.runs} runs · {a.allies} alliés · {a.rivals} rivaux
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Voir l'historique"
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
            Historique de la zone
          </Text>
          <Text style={styles.rowMeta} numberOfLines={1} ellipsizeMode="clip">
            Conquêtes et défenses passées
          </Text>
        </View>
        <Icon name="chevron" size={iconSizes.sm} color={colors.gris} />
      </Pressable>
    </View>
  );
}

/**
 * Menu « Calques » (AMENDEMENT-21) : ouvert par le FAB Calques — le FOND (Sombre
 * / Clair / Satellite) en haut, la VUE 2D/3D, puis les calques de lecture. Fermé
 * par défaut. L'actif se lit en chartreuse sur la surface SOMBRE du menu.
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
            <Icon name={MAP_MODE_ICON[key]} size={15} color={MODE_COLOR[key]} active={on} />
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
const OVERLAY_SURFACE = withAlpha(gameColors.carbon, 0.92);

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },

  // ── FAB column : 2 MAX (Calques + Recentrer) ──
  fabColumn: { position: 'absolute', right: 14, gap: 10, alignItems: 'flex-end' },

  // ── Menu Calques (fond + vue + calques de lecture) ──
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
