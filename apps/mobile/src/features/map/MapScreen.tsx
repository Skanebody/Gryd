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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, gameColors } from '@klaim/shared';
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
import { basemapAttribution, battleGameLayers } from './mapStyle';
import { useBasemapStyle, useMap3d } from './mapPref';
import { EGO_CAMERA, type LatLngPoint } from './realAnchors';
import { DEFAULT_MAP_MODE, MODE_EMPHASIS, type MapMode, type ModeEmphasis } from './territory';

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
 * identiques à la variante web — l'emphase du mode module chaque famille.
 */
function buildMarkers(
  points: BattleMapPoints,
  decayAnchor: LatLngPoint | null,
  emph: ModeEmphasis,
): RealMapMarker[] {
  return [
    ...POIS_ON_MAP.map((p) => ({
      id: `poi-${p.kind}`,
      lng: p.position.lng,
      lat: p.position.lat,
      children: <PoiMarker kind={p.kind} label={p.label} />,
    })),
    {
      id: 'outpost',
      lng: points.outpost.lng,
      lat: points.outpost.lat,
      children: <StateIcon icon="avantposte" tint={markerColors.neutral} opacity={emph.crew} />,
    },
    {
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
    },
    ...(decayAnchor
      ? [
          {
            id: 'sablier',
            lng: decayAnchor.lng,
            lat: decayAnchor.lat,
            children: (
              <StateIcon icon="sablier" tint={markerColors.danger} opacity={emph.defense} />
            ),
          },
        ]
      : []),
    {
      id: 'objective-pin',
      lng: points.objectiveCenter.lng,
      lat: points.objectiveCenter.lat,
      children: <StateIcon icon="pin" tint={markerColors.crew} opacity={emph.objective} />,
    },
    {
      id: 'challenge',
      lng: MAP_CHALLENGE.position.lng,
      lat: MAP_CHALLENGE.position.lat,
      children: <StateIcon icon="cible" tint={markerColors.neutral} opacity={emph.objective} />,
    },
    ...MATES_OPT_IN.map((m) => ({
      id: `mate-${m.name}`,
      lng: m.position.lng,
      lat: m.position.lat,
      children: <MateMarker name={m.name} distanceKm={m.distanceKm} isLeader={m.isLeader} />,
    })),
    // Moi — TOUJOURS au-dessus (dernier = peint en dernier).
    {
      id: 'ego',
      lng: EGO_CAMERA.lng,
      lat: EGO_CAMERA.lat,
      children: <EgoMarker />,
    },
  ];
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

  const { points, summary } = useMemo(() => {
    const data = battleMapData();
    return { points: data.points, summary: battleMapSummary(data.collection) };
  }, []);
  /** Emphase des familles de couches selon le mode actif (AMENDEMENT-11 §3). */
  const emph = MODE_EMPHASIS[mode];

  /** Fond de carte persisté (défaut sombre) — dark-first, bascule opt-in. */
  const { basemap, toggle } = useBasemapStyle();

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
  const layers = useMemo(
    () => battleGameLayers(emph, selectedParcours, basemap, selectedZoneId),
    [emph, selectedParcours, basemap, selectedZoneId],
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
   * Vue monde/pays (§4bis) : sous le zoom seuil (le VRAI zoom caméra), les
   * icônes de secteur (échelle coureur) seraient un amas illisible → on les
   * retire ; les possessions restent lisibles via les marqueurs-points villes,
   * rendus en LAYERS MapLibre bornés par zoom (territoryDotLayers).
   */
  const [worldView, setWorldView] = useState(false);
  const onZoomChange = useCallback((zoom: number) => {
    setWorldView(zoom < TERRITORY_DOT_MAX_ZOOM);
  }, []);

  const markers = useMemo(
    () => (worldView ? [] : buildMarkers(points, decayAnchor, emph)),
    [points, decayAnchor, emph, worldView],
  );

  // map_load_ms (§8 santé produit) — du montage au premier rendu (parité web).
  const mountedAtRef = useRef<number>(Date.now());
  const loadTrackedRef = useRef(false);
  useEffect(() => {
    if (loadTrackedRef.current) return;
    loadTrackedRef.current = true;
    track(EVENTS.mapLoadMs, { ms: Date.now() - mountedAtRef.current });
  }, []);

  // Recentrer : retour ego fluide (flyTo — saut direct si reduce motion).
  const recenter = () => mapRef.current?.flyTo(EGO_CAMERA);

  return (
    <View style={styles.root}>
      {/* ── Vraies tuiles MONDE + couches de jeu + markers (RealMap) ──
          `key={basemap}` : parité web — on remonte la carte à chaque bascule
          (un simple changement de mapStyle ne réajouterait pas les couches). */}
      <RealMap
        key={basemap}
        ref={mapRef}
        camera={EGO_CAMERA}
        geojsonLayers={layers}
        pointLayers={territoryDotLayers()}
        markers={markers}
        onZoomChange={onZoomChange}
        onPress={onMapPress}
        attributionCompact={false}
        basemap={basemap}
        mode3d={map3d}
        style={StyleSheet.absoluteFill}
        testID="battle-map-reelle"
      />

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
});

export default MapScreen;
