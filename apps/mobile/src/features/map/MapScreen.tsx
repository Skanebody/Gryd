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
  FLOATING_MAP_BUTTON_SIZE,
  FloatingMapButton,
  MAP_SHEET_COMPACT_HEIGHT,
  MateMarker,
  PoiMarker,
  RealMap,
  usePulse,
  type RealMapMarker,
  type RealMapRef,
} from '../../ui/game';
import { deriveAutoPlan } from '../nav/runContext';
import { RUN_BUTTON_BOTTOM } from '../nav/metrics';
import {
  TERRITORY_DOT_MAX_ZOOM,
  decaySablierAnchor,
  territoryDotLayers,
} from './allTerritories';
import { BattleMapOverlays } from './BattleMapOverlays';
import { MAP_CHALLENGE, MATES_OPT_IN, POIS_ON_MAP } from './demo';
import { battleMapData, battleMapSummary, type BattleMapPoints } from './fakeHexes';
import { battleGameLayers } from './mapStyle';
import { useBasemapStyle } from './mapPref';
import { EGO_CAMERA, type LatLngPoint } from './realAnchors';
import { MODE_EMPHASIS, autoMapMode, type MapMode, type ModeEmphasis } from './territory';

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
/** Attribution compacte obligatoire (données © OpenStreetMap, tuiles CARTO). */
const ATTRIBUTION_LABEL = '© OpenStreetMap © CARTO';

// ── Bascule du fond de carte (dark ↔ color) — bouton flottant AU-DESSUS de la
// pile Recentrer/Stats de BattleMapOverlays (mêmes métriques pour ne pas la
// recouvrir). Le gap entre flottants est de 10 px (pile verticale à droite).
const FAB_GAP = 10;
const HUD_FAB_ABOVE_SHEET = 12;
const SHEET_ABOVE_RUN_BUTTON = 12;
/** Bas de la pile de flottants du HUD (identique au calcul de BattleMapOverlays).
 *  AMENDEMENT-17 §1.2 : plus de rangée de chips de mode (MODE_CHIPS_HEIGHT retiré). */
const HUD_FAB_COLUMN_BOTTOM =
  RUN_BUTTON_BOTTOM +
  SHEET_ABOVE_RUN_BUTTON +
  MAP_SHEET_COMPACT_HEIGHT +
  HUD_FAB_ABOVE_SHEET;
/** La bascule s'empile au-dessus des TROIS flottants du HUD (Couches + Recentrer + Stats). */
const BASEMAP_FAB_ABOVE_HUD_FABS = 3 * (FLOATING_MAP_BUTTON_SIZE + FAB_GAP);

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
  // AMENDEMENT-17 §1.2 : calque AUTO au montage selon le plan (défense →
  // calque défense ; sinon route-first). Plus de rangée de filtres à choisir.
  const [mode, setMode] = useState<MapMode>(() => autoMapMode(deriveAutoPlan().lecture));
  const [selectedParcours, setSelectedParcours] = useState<string | null>(null);
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
   * Couches GeoJSON de jeu (ordre = ordre de peinture) — builder partagé. Sur
   * le fond COULEUR, battleGameLayers ajoute le liseré sombre porteur sous les
   * traits chartreuse (lisibilité — charte).
   */
  const layers = useMemo(
    () => battleGameLayers(emph, selectedParcours, basemap),
    [emph, selectedParcours, basemap],
  );

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
        attributionCompact={false}
        basemap={basemap}
        style={StyleSheet.absoluteFill}
        testID="battle-map-reelle"
      />

      {/* ── Attribution relogée au-dessus de la nav (obligation légale) ── */}
      <Text
        style={[
          styles.attribution,
          { bottom: insets.bottom + RUN_BUTTON_BOTTOM + ATTRIBUTION_ABOVE_RUN_BOTTOM },
        ]}
        accessibilityRole="text"
      >
        {ATTRIBUTION_LABEL}
      </Text>

      {/* ── HUD (pill % contrôle, feed, menu Info : Couches + Fond + Recentrer) ── */}
      <BattleMapOverlays
        mode={mode}
        onSelectMode={setMode}
        summary={summary}
        onRecenter={recenter}
        selectedParcoursId={selectedParcours}
        onSelectParcours={setSelectedParcours}
        basemap={basemap}
        onToggleBasemap={toggle}
      />
    </View>
  );
}

/** Point « moi » : dot chartreuse cerclé blanc + halo pulsé (reduce motion → fixe). */
function EgoMarker() {
  const halo = usePulse(true, 1.3, EGO_PULSE_MS);
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
  basemapFab: { position: 'absolute', right: 14, alignItems: 'center' },
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
