/**
 * GRYD — BATTLE MAP, variante WEB (aperçu navigateur — cible visuelle
 * prioritaire). AMENDEMENT-13 §2/§4bis/§4ter : l'onglet Carte est posé sur de
 * VRAIES tuiles vectorielles MONDE ENTIER (RealMap — maplibre-gl, style
 * sombre type Uber-night surchargé aux tokens), librement navigable du niveau
 * rue au niveau planète : les rues RÉELLES (canal Saint-Martin, bd Voltaire,
 * Faubourg-du-Temple…) sont reconnaissables SOUS les couches de jeu. ZÉRO
 * hexagone visible — les couches sont les TRACÉS DE COURSE d'allTerritories
 * (§4ter : la frontière EST le tracé — boucles nettes + rubans le long des
 * vraies rues, TOUTES les possessions y compris Lille/Lyon — une seule
 * source pour les deux cartes) servis par battleGameLayers (mapStyle) :
 * remplissages faibles + traits NETS par état (AMENDEMENT-16 §0 : zéro
 * halo/glow — contesté DOUBLE trait décalé dont l'orange PULSE, decay
 * pointillé + sablier/secteur, protégé trait verify + UN shield/secteur,
 * objectif aplat + pin, avant-poste, or de la zone
 * bonus), route ouverte, aperçu du parcours sélectionné en source ligne
 * GeoJSON réelle. Au DÉZOOM (§4bis), sous TERRITORY_DOT_MAX_ZOOM, chaque
 * possession devient un marqueur-point + label ville (layers MapLibre bornés
 * par zoom — territoryDotLayers) et les icônes de secteur s'effacent. La
 * situation live (AMENDEMENT-09 §2) passe en MARKERS RealMap (natifs
 * maplibre-gl côté web — §5 perf) : moi (point chartreuse + halo respirant,
 * position FICTIVE République — jamais de vraie géoloc), 2 MateMarker
 * opt-in, ≤ 4 POI, 1 défi. Les labels secteurs custom ont disparu : les
 * tuiles réelles portent les noms de quartiers (République, Belleville…).
 * 5 CALQUES de lecture (AMENDEMENT-11 §3) : MODE_EMPHASIS module l'opacité
 * des couches GeoJSON (fills + alpha des frontières) — MapLibre fond les
 * transitions de peinture, bascule douce sans code d'animation dédié.
 * Échelle : barre PILOTÉE PAR LA CARTE (remplace la barre 500 m fixe) — elle
 * suit le zoom réel MapLibre, stylée tokens, attribution © OpenStreetMap
 * © CARTO accolée (relogée au-dessus de la nav : le bas de la carte est
 * couvert par la sheet). Offline : RealMap affiche fond noir + « Carte
 * indisponible — tes zones restent à toi », jamais d'écran blanc.
 * HUD (BattleMapOverlays), recentrer = flyTo ego, CTA COURIR au layout :
 * INCHANGÉS. Track EVENTS.mapLoadMs au montage (parité native).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { colors, gameColors } from '@klaim/shared';
import { EVENTS, track } from '../../lib/analytics';
import { Icon } from '../../ui/Icon';
import {
  MateMarker,
  PoiMarker,
  RealMap,
  usePulse,
  type RealMapMarker,
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
import {
  basemapAttribution,
  battleGameLayers,
  battleMapStyle as ms,
  type BasemapKey,
} from './mapStyle';
import { useBasemapStyle, useMap3d } from './mapPref';
import { EGO_CAMERA, REAL_M_PER_DEG_LAT, type LatLngPoint } from './realAnchors';
import { DEFAULT_MAP_MODE, MODE_EMPHASIS, type MapMode, type ModeEmphasis } from './territory';

// ─── Constantes de rendu (UI uniquement — pas des règles de jeu) ────────────
/** Pulse du halo « moi » (position live, respiration lente). */
const EGO_PULSE_MS = 2_000;
/** Point « moi » (dot chartreuse cerclé) + halo. */
const EGO_DOT_SIZE = 14;
const EGO_HALO_SIZE = 40;
/** Le shield du secteur maison s'écarte du point « moi » (pas de collision). */
const SHIELD_ABOVE_EGO_PX = 26;
/** Taille des markers d'état posés sur la carte. */
const MARKER_SIZE = 18;
/** La barre d'échelle flotte à gauche du bouton COURIR, au-dessus de la nav. */
const SCALE_ABOVE_RUN_BOTTOM = 6;
/** Largeur max de la barre d'échelle + segment de mesure (comme ScaleControl). */
const SCALE_MAX_PX = 130;
const SCALE_PROBE_PX = 100;
/** Paliers « ronds » de l'échelle (m) — la carte est librement zoomable monde. */
const SCALE_STEPS_M: readonly number[] = [
  50, 100, 200, 300, 500, 1_000, 2_000, 5_000, 10_000, 20_000, 50_000, 100_000, 200_000,
  500_000, 1_000_000, 2_000_000,
];

// AMENDEMENT-21 : la Carte est un ÉCRAN MISSION. Les contrôles flottants (fond
// dark/couleur + calques de lecture) vivent DANS le menu « Calques » du HUD
// (BattleMapOverlays) — plus aucun FAB de bascule de fond ici (2 FABs max :
// Recentrer + Calques). Le fond persisté (useBasemapStyle) est simplement passé
// au HUD, qui porte le menu.

/** Teintes des markers — tokens uniquement (états de jeu). */
const markerColors = {
  crew: colors.chartreuse,
  danger: gameColors.danger,
  neutral: colors.blanc,
} as const;

/**
 * Markers RealMap de la scène (UNE icône par SECTEUR — jamais par cellule) :
 * POI ≤ 4, avant-poste, shield du secteur maison, sablier du secteur en decay,
 * pin objectif, défi (1 MAX), mates OPT-IN, et « moi » au-dessus de tout.
 * L'emphase du mode actif module l'opacité de chaque famille (AMENDEMENT-11 §3).
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

  /** Instance maplibre-gl de CETTE carte (échelle scopée — §6). */
  const [glMap, setGlMap] = useState<MapLibreMap | null>(null);

  // map_load_ms (§8) — du montage au premier rendu de la carte (parité native).
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
          `key={basemap}` : setStyle() MapLibre EFFACE les sources/couches
          custom ; on remonte donc la carte à chaque bascule → l'effet `load`
          réajoute les couches de jeu sur le nouveau style (robuste). */}
      <RealMap
        key={basemap}
        ref={mapRef}
        camera={EGO_CAMERA}
        geojsonLayers={layers}
        pointLayers={territoryDotLayers()}
        markers={markers}
        onZoomChange={onZoomChange}
        onMapReady={setGlMap}
        attributionCompact={false}
        basemap={basemap}
        mode3d={map3d}
        style={StyleSheet.absoluteFill}
        testID="battle-map-reelle"
      />

      {/* ── Échelle MapLibre stylée tokens + attribution (au-dessus de la nav) ── */}
      <ScaleAttribution
        map={glMap}
        basemap={basemap}
        bottom={insets.bottom + RUN_BUTTON_BOTTOM + SCALE_ABOVE_RUN_BOTTOM}
      />

      {/* ── HUD ÉCRAN MISSION (header 1 ligne, pill rival, card sticky + [Défendre],
          sheet 4 blocs, 2 FABs : Recentrer + Calques) — AMENDEMENT-21 ── */}
      <BattleMapOverlays
        mode={mode}
        onSelectMode={setMode}
        summary={summary}
        onRecenter={recenter}
        selectedParcoursId={selectedParcours}
        onSelectParcours={setSelectedParcours}
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

/**
 * Échelle graphique PILOTÉE PAR MAPLIBRE (remplace la barre 500 m fixe) :
 * même principe que le ScaleControl (distance réelle d'un segment écran au
 * centre de la vue, palier « rond » ≤ SCALE_MAX_PX), rendue en tokens GRYD.
 * L'instance carte arrive par la prop `map` (onMapReady de RealMap.web) —
 * l'échelle est SCOPÉE à SA carte, jamais de sélecteur DOM global (§6 :
 * plusieurs cartes peuvent être montées en même temps, aperçu Profil +
 * onglet Carte). Attribution DÉRIVÉE du fond actif (basemapAttribution) accolée
 * — © OpenStreetMap © CARTO sur dark/color, © Esri, Maxar, Earthstar
 * Geographics sur satellite (AMENDEMENT-28). Le bas de la carte est couvert par
 * la sheet/nav, la mention doit rester VISIBLE (obligation légale).
 */
function ScaleAttribution({
  map,
  basemap,
  bottom,
}: {
  map: MapLibreMap | null;
  basemap: BasemapKey;
  bottom: number;
}) {
  const [scale, setScale] = useState<{ width: number; label: string } | null>(null);

  useEffect(() => {
    if (!map) return undefined;
    const onMove = () => {
      const midY = map.getContainer().clientHeight / 2;
      const a = map.unproject([0, midY]);
      const b = map.unproject([SCALE_PROBE_PX, midY]);
      const latRad = (((a.lat + b.lat) / 2) * Math.PI) / 180;
      const meters = Math.hypot(
        (b.lng - a.lng) * REAL_M_PER_DEG_LAT * Math.cos(latRad),
        (b.lat - a.lat) * REAL_M_PER_DEG_LAT,
      );
      if (!(meters > 0)) return;
      const mPerPx = meters / SCALE_PROBE_PX;
      let step: number = SCALE_STEPS_M[0] ?? 100;
      for (const candidate of SCALE_STEPS_M) {
        if (candidate / mPerPx <= SCALE_MAX_PX) step = candidate;
      }
      const width = step / mPerPx;
      const label = step >= 1_000 ? `${step / 1_000} km` : `${step} m`;
      setScale((prev) =>
        prev && prev.label === label && Math.abs(prev.width - width) < 1 ? prev : { width, label },
      );
    };
    map.on('move', onMove);
    onMove();
    return () => {
      map.off('move', onMove);
    };
  }, [map]);

  return (
    <View pointerEvents="none" style={[styles.scaleWrap, { bottom }]}>
      {scale ? (
        <>
          <View style={[styles.scaleLine, { width: scale.width }]} />
          <Text style={styles.scaleLabel}>{scale.label}</Text>
        </>
      ) : null}
      <Text style={styles.attribution} accessibilityRole="text">
        {basemapAttribution(basemap)}
      </Text>
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
  scaleWrap: { position: 'absolute', left: 14 },
  scaleLine: {
    height: 4,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: ms.scaleBar,
    opacity: 0.7,
  },
  scaleLabel: {
    color: ms.scaleBar,
    fontSize: 9,
    marginTop: 3,
    fontVariant: ['tabular-nums'],
  },
  attribution: { color: colors.gris, opacity: 0.7, fontSize: 9, marginTop: 2 },
});

export default MapScreen;
