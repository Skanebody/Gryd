/**
 * GRYD — BATTLE MAP, variante NATIVE. AMENDEMENT-13 §2/§4/§4bis/§4ter :
 * PARITÉ avec MapScreen.web — mêmes vraies tuiles sombres MONDE ENTIER
 * (RealMap natif = @maplibre/maplibre-react-native, même styleURL dark),
 * mêmes SOURCES de jeu (battleGameLayers — les TRACÉS DE COURSE
 * d'allTerritories, §4ter : la frontière EST le tracé, zéro hexagone visible ;
 * contesté DOUBLE trait décalé dont l'orange pulse, decay pointillé, protégé
 * halo, objectif zone chaude, avant-poste, zone bonus or, route ouverte,
 * parcours sélectionné en source ligne GeoJSON — TOUTES les possessions dont
 * Lille/Lyon, une seule source pour les deux cartes), mêmes marqueurs-points
 * villes au dézoom (territoryDotLayers — layers bornés par zoom, §4bis),
 * mêmes MARKERS (MarkerView via RealMap : shield/sablier/pin/défi/avant-poste
 * par SECTEUR, POI ≤ 4, mates opt-in, « moi » République — position FICTIVE,
 * jamais de vraie géoloc). Caméra égocentrée à l'échelle coureur (EGO_CAMERA,
 * zoom 14.6), navigation MONDE libre (aucun maxBounds, aucun minZoom). Les
 * labels secteurs custom ont disparu : les tuiles réelles portent les noms de
 * quartiers. Recentrer = flyTo ego. Offline : RealMap natif affiche « Carte
 * indisponible — tes zones restent à toi ». La cible visuelle prioritaire
 * reste la variante web ; vérification device au Milestone 2 (pulse natif =
 * transitions de style, §5).
 */
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, gameColors } from '@klaim/shared';
import { EVENTS, track } from '../../lib/analytics';
import { Icon } from '../../ui/Icon';
import {
  MateMarker,
  PoiMarker,
  RealMap,
  usePulse,
  type RealMapMarker,
  type RealMapPressEvent,
  type RealMapRef,
} from '../../ui/game';
import { RUN_BUTTON_BOTTOM } from '../nav/metrics';
import {
  TERRITORY_DOT_MAX_ZOOM,
  decaySablierAnchor,
  territoryDotLayers,
} from './allTerritories';
import { BattleMapOverlays } from './BattleMapOverlays';
import { MAP_CHALLENGE, MATES_OPT_IN, POIS_ON_MAP } from './demo';
import { battleMapData, battleMapSummary, type BattleMapPoints } from './fakeHexes';
import { useRealTerritories } from './hexClaims';
import { useRealCrew } from '../crew/real';
import { getLastRunResult } from '../run/runResult';
import { buildRealWidgetView, type TerritoryWidgetView } from '../widget/territoryWidget';
import { dataNote } from './territoryBuild';
import {
  basemapAttribution,
  basemapSpecRevision,
  battleGameLayers,
  prefetchLocalizedBasemaps,
  subscribeBasemapSpecs,
} from './mapStyle';
import { useBasemapStyle, useMap3d } from './mapPref';
import { EGO_CAMERA, type LatLngPoint } from './realAnchors';
import { DEFAULT_MAP_MODE, MODE_EMPHASIS, type MapMode, type ModeEmphasis } from './territory';
import { isShowcasePlatform } from '../../lib/flags';
import { getCurrentPositionOnce } from '../run/gps/provider';

// ─── Constantes de rendu (UI uniquement — mêmes valeurs que la variante web) ─
/** Pulse du halo « moi » (position live, respiration lente). */
const EGO_PULSE_MS = 2_000;
/** Point « moi » (dot chartreuse cerclé) + halo. */
const EGO_DOT_SIZE = 14;
const EGO_HALO_SIZE = 40;
/** Le shield du secteur maison s'écarte du point « moi » (pas de collision). */
const SHIELD_ABOVE_EGO_PX = 26;
/** Taille des markers d'état posés sur la carte. */
const MARKER_SIZE = 18;
/** L'attribution flotte au-dessus de la nav (le bas de carte est couvert). */
const ATTRIBUTION_ABOVE_RUN_BOTTOM = 6;
/** La note d'honnêteté (P0.2) se pose juste au-dessus de l'attribution. */
const DATA_NOTE_ABOVE_RUN_BOTTOM = 22;

// ─── Bandes de zoom sémantiques (AMENDEMENT-37 §6/§11, étude §11/§15) ────────
// Les marqueurs s'ÉTAGENT par bande au lieu de s'allumer d'un bloc au seul seuil
// worldView. Seuils de RENDU nommés (jamais de littéral baladé), dérivés du VRAI
// zoom caméra (onZoomChange) — worldView (dots villes) reste géré côté MapLibre.
/** Missions/objectifs (bouclier, sablier, pin) + POI/défi : QUARTIER (z13-15). */
const MISSION_MARKER_MIN_ZOOM = 13;
/** Alliés opt-in (mates) : RUE (z16-18) seulement — jamais au quartier. */
const ALLY_MARKER_MIN_ZOOM = 16;
/** §15 : au plus 3 LABELS visibles au zoom QUARTIER (avant la bande RUE). */
const QUARTIER_MAX_LABELS = 3;

/**
 * Bande sémantique dérivée du zoom réel (couture LOD, §11) :
 *   `world`    z<10  — dots villes (MapLibre), ego seul en marker
 *   `metro`    10-12 — secteurs + contrôle % (couches), ego seul
 *   `district` 13-15 — territoires + missions/objectifs + POI/défi
 *   `street`   z16+  — + alliés opt-in
 * On ne stocke PAS le zoom brut (re-render par frame) : l'état ne change qu'au
 * franchissement d'un seuil de bande.
 */
type ZoomBand = 'world' | 'metro' | 'district' | 'street';
function zoomBand(zoom: number): ZoomBand {
  if (zoom < TERRITORY_DOT_MAX_ZOOM) return 'world';
  if (zoom < MISSION_MARKER_MIN_ZOOM) return 'metro';
  if (zoom < ALLY_MARKER_MIN_ZOOM) return 'district';
  return 'street';
}

// AMENDEMENT-21 : la Carte est un ÉCRAN MISSION. Les contrôles flottants (fond
// dark/couleur + calques de lecture) vivent DANS le menu « Calques » du HUD
// (BattleMapOverlays) — plus aucun FAB de bascule de fond ici (2 FABs max :
// Recentrer + Calques). Le fond persisté (useBasemapStyle) est simplement passé
// au HUD, qui porte le menu (parité stricte avec MapScreen.web).

/** Teintes des markers — tokens uniquement (états de jeu). */
const markerColors = {
  crew: colors.chartreuse,
  danger: gameColors.danger,
  neutral: colors.blanc,
} as const;

/**
 * Markers RealMap de la scène (UNE icône par SECTEUR — jamais par cellule),
 * ÉTAGÉS par bande de zoom (AMENDEMENT-37 §6/§11) — identiques à la variante web.
 * `showMissions` (quartier z13+) allume missions/objectifs + POI/défi ;
 * `showAllies` (rue z16+) allume les alliés opt-in. EGO est TOUJOURS peint.
 * L'emphase du mode module l'opacité de chaque famille (AMENDEMENT-11 §3).
 */
function buildMarkers(
  points: BattleMapPoints,
  decayAnchor: LatLngPoint | null,
  emph: ModeEmphasis,
  showMissions: boolean,
  showAllies: boolean,
  ego: LatLngPoint,
  demoOverlays: boolean,
): RealMapMarker[] {
  const markers: RealMapMarker[] = [];

  // ── Missions / objectifs + POI / défi — QUARTIER (z13-15) ──────────────────
  // `demoOverlays` (vitrine web uniquement) : POI, défi, avant-poste, bouclier,
  // sablier, objectif et alliés sont de la DÉMO (fakeHexes/demo.ts). Sur l'app
  // NATIVE ils n'existent pas tant qu'aucune source réelle ne les nourrit —
  // retour terrain fondateur : « des zones déjà prises alors que je n'ai rien
  // fait ». Seul EGO est toujours peint.
  if (demoOverlays && showMissions) {
    // POI running : §15 borne les LABELS à QUARTIER_MAX_LABELS au quartier (les
    // POI sont la famille la moins prioritaire à porter du texte, §14) ; à la
    // rue (showAllies) la contrainte quartier ne s'applique plus.
    let labelBudget = showAllies ? Number.POSITIVE_INFINITY : QUARTIER_MAX_LABELS;
    for (const p of POIS_ON_MAP) {
      const keepLabel = p.label !== undefined && labelBudget > 0;
      if (keepLabel) labelBudget -= 1;
      markers.push({
        id: `poi-${p.kind}`,
        lng: p.position.lng,
        lat: p.position.lat,
        children: <PoiMarker kind={p.kind} label={keepLabel ? p.label : undefined} />,
      });
    }
    markers.push({
      id: 'outpost',
      lng: points.outpost.lng,
      lat: points.outpost.lat,
      children: <StateIcon icon="avantposte" tint={markerColors.neutral} opacity={emph.crew} />,
    });
    markers.push({
      id: 'shield',
      lng: points.protectedCenter.lng,
      lat: points.protectedCenter.lat,
      children: (
        <StateIcon
          icon="bouclier"
          tint={markerColors.neutral}
          opacity={emph.defense}
          liftPx={SHIELD_ABOVE_EGO_PX}
        />
      ),
    });
    if (decayAnchor) {
      markers.push({
        id: 'sablier',
        lng: decayAnchor.lng,
        lat: decayAnchor.lat,
        children: <StateIcon icon="sablier" tint={markerColors.danger} opacity={emph.defense} />,
      });
    }
    markers.push({
      id: 'objective-pin',
      lng: points.objectiveCenter.lng,
      lat: points.objectiveCenter.lat,
      children: <StateIcon icon="pin" tint={markerColors.crew} opacity={emph.objective} />,
    });
    markers.push({
      id: 'challenge',
      lng: MAP_CHALLENGE.position.lng,
      lat: MAP_CHALLENGE.position.lat,
      children: <StateIcon icon="cible" tint={markerColors.neutral} opacity={emph.objective} />,
    });
  }

  // ── Alliés opt-in — RUE (z16-18) seulement ─────────────────────────────────
  if (demoOverlays && showAllies) {
    for (const m of MATES_OPT_IN) {
      markers.push({
        id: `mate-${m.name}`,
        lng: m.position.lng,
        lat: m.position.lat,
        children: <MateMarker name={m.name} distanceKm={m.distanceKm} isLeader={m.isLeader} />,
      });
    }
  }

  // ── Moi — TOUJOURS présent, peint en dernier (au-dessus de tout) ───────────
  markers.push({
    id: 'ego',
    lng: ego.lng,
    lat: ego.lat,
    children: <EgoMarker />,
  });
  return markers;
}

export function MapScreen() {
  // AMENDEMENT-37 §7 : la carte OUVRE en mode CONTRÔLE (territoire = tous les
  // territoires pleins) — « état du monde d'abord » (étude §12, ordre
  // comprendre→décider→courir). autoMapMode reste disponible pour une bascule
  // ULTÉRIEURE (menace réellement live), mais n'est plus l'état INITIAL.
  const [mode, setMode] = useState<MapMode>(DEFAULT_MAP_MODE);
  const [selectedParcours, setSelectedParcours] = useState<string | null>(null);
  // AMENDEMENT-37 §3 : zone tapée (null = carte nue). Un tap carte la pose
  // (tap sur le vide → null = désélection) ; elle pilote la sheet de zone (HUD)
  // ET l'accent « l'actif domine » via le 4ᵉ arg de battleGameLayers (contrat C3).
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const mapRef = useRef<RealMapRef>(null);

  /**
   * POSITION RÉELLE (retour terrain fondateur : « je suis à Ouville-la-Rivière,
   * la carte me met à République »). Sur natif : une lecture ponctuelle au
   * montage (Balanced — pas de watch BestForNavigation sur un onglet passif),
   * la caméra VOLE vers le vrai point au premier fix, et EGO est peint là.
   * Permission manquante ou échec → fallback EGO_CAMERA (République), comme la
   * vitrine. Web : jamais de géoloc (vitrine assumée).
   */
  const [egoPos, setEgoPos] = useState<LatLngPoint>({ lat: EGO_CAMERA.lat, lng: EGO_CAMERA.lng });
  /** True dès qu'un VRAI fix a remplacé le fallback République. */
  const [hasRealFix, setHasRealFix] = useState(false);
  /** True quand le style natif est chargé — un flyTo AVANT est perdu (terrain 20/07 : caméra restée à Paris). */
  const [mapReady, setMapReady] = useState(isShowcasePlatform);
  const centeredOnRealRef = useRef(false);
  useEffect(() => {
    if (isShowcasePlatform) return;
    let cancelled = false;
    void getCurrentPositionOnce().then((fix) => {
      if (cancelled || !fix) return;
      setEgoPos({ lat: fix.lat, lng: fix.lng });
      setHasRealFix(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  // Recentrage initial : SEULEMENT quand la carte est prête ET la position
  // connue — peu importe l'ordre d'arrivée des deux.
  useEffect(() => {
    if (!mapReady || !hasRealFix || centeredOnRealRef.current) return;
    centeredOnRealRef.current = true;
    mapRef.current?.flyTo({ ...EGO_CAMERA, lat: egoPos.lat, lng: egoPos.lng });
  }, [mapReady, hasRealFix, egoPos]);

  const { points, summary } = useMemo(() => {
    const data = battleMapData();
    return { points: data.points, summary: battleMapSummary(data.collection) };
  }, []);
  /** Emphase des familles de couches selon le mode actif (AMENDEMENT-11 §3). */
  const emph = MODE_EMPHASIS[mode];

  /** Fond de carte persisté (défaut sombre) — dark-first, bascule opt-in. */
  const { basemap, toggle } = useBasemapStyle();

  /**
   * Labels en langue LOCALE (retour terrain : « la map est en anglais ») : on
   * précharge les styles CARTO patchés (name_en→name) et on REMONTE la carte
   * (via sa key) quand la spec localisée est prête — un swap à chaud perdrait
   * les couches de jeu. En pratique : un seul remontage, dans les toutes
   * premières secondes de la session.
   */
  const specRev = useSyncExternalStore(subscribeBasemapSpecs, basemapSpecRevision, basemapSpecRevision);
  useEffect(() => {
    prefetchLocalizedBasemaps();
  }, []);

  /**
   * Vue 2D/3D persistée (AMENDEMENT-26, défaut false = 2D) — partagée par toutes
   * les surfaces via gryd.map3d. Passée en `mode3d` à RealMap (pitch/extrusion de
   * convenance) et au HUD, qui porte le toggle dans le menu Calques (pas un FAB).
   * Pur confort visuel — zéro impact gameplay (le serveur décide du claim).
   */
  const { map3d, setMap3d } = useMap3d();

  /**
   * Couches GeoJSON de jeu (ordre = ordre de peinture) — builder partagé. Sur
   * le fond COULEUR, battleGameLayers ajoute le liseré sombre porteur sous les
   * traits chartreuse (lisibilité — charte).
   */
  /**
   * P0.2 (AMENDEMENT-39) — LES VRAIES CAPTURES. `territories` non-null ⇒ la carte
   * peint `hex_claims`, la démo n'est plus consultée. Y compris quand c'est VIDE :
   * un joueur qui n'a rien capturé voit une carte vide, pas un faux Paris conquis.
   */
  // Crew réel 2/3 : le roster actif teinte les zones des membres en chartreuse
  // (§C « moi/mon crew » — l'union visuelle du territoire crew). Set mémoïsé sur
  // le CONTENU (join trié) : useRealCrew retourne un nouveau tableau par fetch,
  // un Set par référence relancerait la lecture hex_claims à chaque focus.
  const { members: crewMembers } = useRealCrew();
  const crewIdsKey = crewMembers
    .map((m) => m.userId)
    .sort()
    .join(',');
  const crewIds = useMemo(
    () => (crewIdsKey.length === 0 ? null : new Set(crewIdsKey.split(','))),
    [crewIdsKey],
  );
  const { territories, isReal, failed, reload } = useRealTerritories(crewIds);
  // P0 C5 (MVP_CHANGESET) — reload() n'était consommé par PERSONNE : après une
  // course qui capture, la carte ne montrait la zone qu'au redémarrage (le
  // refetch ne tenait qu'au remontage accidentel de la navigation). Ici : refetch
  // à CHAQUE retour sur l'onglet Carte — donc au retour de course-result — en
  // sautant le premier focus (le hook fetch déjà au montage, pas de doublon).
  const firstFocusRef = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocusRef.current) {
        firstFocusRef.current = false;
        return;
      }
      reload();
    }, [reload]),
  );
  /**
   * WIDGET « Mon territoire » (spec 17/07) — construit UNIQUEMENT depuis des
   * données RÉELLES : territoires lus de hex_claims + dernier verdict serveur
   * (openBoundary → boucle presque fermée ; capture → moment de partage).
   * Les signaux sans source réelle (attaque, zone perdue, crew, rang) restent
   * ÉTEINTS — on ne fabrique pas une urgence. Démo (pas de session) ⇒ null ⇒
   * le peek mission démo actuel, étiqueté par la note de source.
   */
  const widget = useMemo(() => {
    if (!isReal || territories === null) return null;
    const lastResult = getLastRunResult();
    const ob = lastResult?.openBoundary;
    return buildRealWidgetView({
      mineAreasM2: territories
        .filter((t) => t.props.status === 'crew')
        .map((t) => t.props.areaM2),
      openBoundary: ob ? { name: ob.name, missingM: ob.missingM } : null,
      capturedInLastRun: lastResult
        ? lastResult.hexes.claimed + lastResult.hexes.stolen + lastResult.hexes.pioneer > 0
        : false,
    });
  }, [isReal, territories]);

  /** Routage de l'action du widget : partage → /partage ; le reste → la carte. */
  const onWidgetAction = useCallback((view: TerritoryWidgetView) => {
    if (view.action === 'share') {
      router.push('/partage');
      return;
    }
    // go / view_map / complete… : la carte EST l'écran d'action (GO flottant).
    mapRef.current?.flyTo({ ...EGO_CAMERA, lat: egoPos.lat, lng: egoPos.lng });
  }, [egoPos]);

  /**
   * NATIF = jamais de territoires démo : sans session, `territories` est null et
   * battleGameLayers peindrait le faux Paris conquis. Sur l'app installée on
   * passe [] → carte réelle VIDE (P0.2 : « un joueur qui n'a rien capturé voit
   * une carte vide »). La vitrine web garde la démo étiquetée.
   */
  const paintedTerritories = isShowcasePlatform ? territories : (territories ?? []);
  const layers = useMemo(
    () => battleGameLayers(emph, selectedParcours, basemap, selectedZoneId, paintedTerritories),
    [emph, selectedParcours, basemap, selectedZoneId, paintedTerritories],
  );

  /** Tap carte → zone tapée (null sur le vide = désélection). */
  const onMapPress = useCallback((e: RealMapPressEvent) => {
    setSelectedZoneId(e.zoneId ?? null);
  }, []);
  /** Fermer la sheet de zone → carte nue (retour au peek mission). */
  const closeZone = useCallback(() => setSelectedZoneId(null), []);

  /** UN sablier PAR SECTEUR en decay (milieu du tracé urgent — §4ter). */
  const decayAnchor = useMemo(() => decaySablierAnchor(), []);

  /**
   * Dots villes (France/Europe) = données DÉMO (FRANCE_CITIES_DEMO + secteurs
   * Paris) : vitrine web uniquement. Sur natif → aucune fausse ville conquise
   * (CLAUDE.md : zéro donnée factice) tant qu'aucune agrégation réelle n'existe.
   */
  const cityDotLayers = useMemo(() => (isShowcasePlatform ? territoryDotLayers() : []), []);

  /**
   * Bande de zoom sémantique (§6/§11) dérivée du VRAI zoom caméra. Elle étage les
   * marqueurs (missions au quartier, alliés à la rue, ego toujours) au lieu de
   * les allumer d'un bloc ; la vue monde/pays (dots villes, §4bis) est la bande
   * `world`, gérée côté MapLibre par le maxzoom de territoryDotLayers. L'état ne
   * change qu'au franchissement d'un seuil (pas de re-render par frame).
   */
  const [band, setBand] = useState<ZoomBand>(() => zoomBand(EGO_CAMERA.zoom));
  const onZoomChange = useCallback((zoom: number) => {
    setBand(zoomBand(zoom));
  }, []);

  const markers = useMemo(() => {
    const showMissions = band === 'district' || band === 'street';
    const showAllies = band === 'street';
    return buildMarkers(points, decayAnchor, emph, showMissions, showAllies, egoPos, isShowcasePlatform);
  }, [points, decayAnchor, emph, band, egoPos]);

  // map_load_ms (§8 santé produit) — du montage au premier rendu (parité web).
  const mountedAtRef = useRef<number>(Date.now());
  const loadTrackedRef = useRef(false);
  useEffect(() => {
    if (loadTrackedRef.current) return;
    loadTrackedRef.current = true;
    track(EVENTS.mapLoadMs, { ms: Date.now() - mountedAtRef.current });
  }, []);

  // Recentrer : retour ego fluide (flyTo — saut direct si reduce motion). Sur
  // natif on RAFRAÎCHIT d'abord la position (l'utilisateur a pu se déplacer).
  const recenter = () => {
    if (isShowcasePlatform) {
      mapRef.current?.flyTo(EGO_CAMERA);
      return;
    }
    mapRef.current?.flyTo({ ...EGO_CAMERA, lat: egoPos.lat, lng: egoPos.lng });
    void getCurrentPositionOnce().then((fix) => {
      if (!fix) return;
      setEgoPos({ lat: fix.lat, lng: fix.lng });
      mapRef.current?.flyTo({ ...EGO_CAMERA, lat: fix.lat, lng: fix.lng });
    });
  };

  return (
    <View style={styles.root}>
      {/* ── Vraies tuiles MONDE + couches de jeu + markers (RealMap) ──
          `key={basemap}` : parité web — on remonte la carte à chaque bascule
          (un simple changement de mapStyle ne réajouterait pas les couches). */}
      <RealMap
        key={`${basemap}-${specRev}`}
        ref={mapRef}
        camera={EGO_CAMERA}
        geojsonLayers={layers}
        pointLayers={cityDotLayers}
        markers={markers}
        onZoomChange={onZoomChange}
        onStyleLoaded={() => setMapReady(true)}
        onPress={onMapPress}
        attributionCompact={false}
        basemap={basemap}
        mode3d={map3d}
        style={StyleSheet.absoluteFill}
        testID="battle-map-reelle"
      />

      {/* ── NOTE D'HONNÊTETÉ (P0.2/P0.3) — même règle que performance.tsx et
          classement.tsx : si ce n'est pas ta donnée, on le DIT. TROIS cas distincts,
          jamais confondus :
          • échec de chargement → on ne prétend PAS que tu n'as rien capturé ;
          • démo (pas de session/backend) → étiquetée, jamais de faux réel ;
          • réel et vide → on nomme le vide au lieu de le laisser passer pour un bug.
          Aucun CTA (§A — 1 écran = 1 décision, le bouton GO est déjà l'action). ── */}
      {(failed || !isReal || territories?.length === 0) && (
        <Text
          style={[
            styles.dataNote,
            { bottom: insets.bottom + RUN_BUTTON_BOTTOM + DATA_NOTE_ABOVE_RUN_BOTTOM },
          ]}
          accessibilityRole="text"
        >
          {/* Natif sans session : on ne peint AUCUNE démo (paintedTerritories=[]),
              donc la note « démonstration » serait fausse — le vrai état est
              « pas de compte connecté ». Les autres cas gardent dataNote. */}
          {!isShowcasePlatform && !isReal && !failed
            ? 'Connecte-toi pour voir et capturer tes zones.'
            : dataNote(isReal, failed, territories?.length ?? 0)}
        </Text>
      )}

      {/* ── Attribution relogée au-dessus de la nav (obligation légale) —
          dérivée du fond actif : © OpenStreetMap © CARTO sur dark/color, ©
          Esri, Maxar, Earthstar Geographics sur satellite (AMENDEMENT-28). ── */}
      <Text
        style={[
          styles.attribution,
          { bottom: insets.bottom + RUN_BUTTON_BOTTOM + ATTRIBUTION_ABOVE_RUN_BOTTOM },
        ]}
        accessibilityRole="text"
      >
        {basemapAttribution(basemap)}
      </Text>

      {/* ── HUD ÉCRAN MISSION (header 1 ligne, pill rival, card sticky + [Défendre],
          sheet 4 blocs, 2 FABs : Recentrer + Calques) — AMENDEMENT-21 ── */}
      <BattleMapOverlays
        widget={widget}
        onWidgetAction={onWidgetAction}
        mode={mode}
        onSelectMode={setMode}
        summary={summary}
        onRecenter={recenter}
        selectedParcoursId={selectedParcours}
        onSelectParcours={setSelectedParcours}
        selectedZoneId={selectedZoneId}
        onCloseZone={closeZone}
        basemap={basemap}
        onToggleBasemap={toggle}
        map3d={map3d}
        onSetMap3d={setMap3d}
      />
    </View>
  );
}

/** Point « moi » : dot chartreuse cerclé blanc + halo STATIQUE (AMENDEMENT-37 §5
 * « une seule animation permanente » : le halo ego ne pulse plus — l'unique
 * pulse permanent est réservé au secteur le plus urgent, géré ailleurs). */
function EgoMarker() {
  const halo = usePulse(false, 1.3, EGO_PULSE_MS);
  const haloOpacity = halo.interpolate({ inputRange: [1, 1.3], outputRange: [0.4, 0.05] });
  return (
    <View pointerEvents="none" style={styles.ego}>
      <Animated.View
        style={[styles.egoHalo, { opacity: haloOpacity, transform: [{ scale: halo }] }]}
      />
      <View style={styles.egoDot} />
    </View>
  );
}

/** Icône d'état posée sur la carte (shield/sablier/pin/avant-poste/cible). */
function StateIcon({
  icon,
  tint,
  opacity,
  liftPx = 0,
}: {
  icon: 'bouclier' | 'sablier' | 'pin' | 'avantposte' | 'cible';
  tint: string;
  opacity: number;
  /** Écart vertical (px) au-dessus du point d'ancrage (shield vs « moi »). */
  liftPx?: number;
}) {
  return (
    <View
      pointerEvents="none"
      style={[{ opacity }, liftPx ? { transform: [{ translateY: -liftPx }] } : null]}
    >
      <Icon name={icon} size={MARKER_SIZE} color={tint} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  ego: {
    width: EGO_HALO_SIZE,
    height: EGO_HALO_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  egoHalo: {
    position: 'absolute',
    width: EGO_HALO_SIZE,
    height: EGO_HALO_SIZE,
    borderRadius: EGO_HALO_SIZE / 2,
    backgroundColor: colors.chartreuse14,
    borderWidth: 1.5,
    borderColor: colors.chartreuse40,
  },
  egoDot: {
    width: EGO_DOT_SIZE,
    height: EGO_DOT_SIZE,
    borderRadius: EGO_DOT_SIZE / 2,
    backgroundColor: colors.chartreuse,
    borderWidth: 2,
    borderColor: colors.blanc,
  },
  attribution: {
    position: 'absolute',
    left: 14,
    color: colors.gris,
    opacity: 0.7,
    fontSize: 9,
  },
  // Note d'honnêteté : lisible sans voler la vedette à la carte. Gris sur fond
  // sombre (jamais chartreuse : réservée à l'action, et illisible sur clair).
  dataNote: {
    position: 'absolute',
    left: 14,
    right: 14,
    color: colors.gris,
    fontSize: fontSizes.xs,
  },
});

export default MapScreen;
