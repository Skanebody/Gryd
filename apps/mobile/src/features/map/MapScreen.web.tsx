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
import { dataNote } from './territoryBuild';
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
/** La note d'honnêteté (P0.2) se pose juste au-dessus de l'échelle/attribution. */
const DATA_NOTE_ABOVE_RUN_BOTTOM = 34;
/** Largeur max de la barre d'échelle + segment de mesure (comme ScaleControl). */
const SCALE_MAX_PX = 130;
const SCALE_PROBE_PX = 100;
/** Paliers « ronds » de l'échelle (m) — la carte est librement zoomable monde. */
const SCALE_STEPS_M: readonly number[] = [
  50, 100, 200, 300, 500, 1_000, 2_000, 5_000, 10_000, 20_000, 50_000, 100_000, 200_000,
  500_000, 1_000_000, 2_000_000,
];

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
// au HUD, qui porte le menu.

/** Teintes des markers — tokens uniquement (états de jeu). */
const markerColors = {
  crew: colors.chartreuse,
  danger: gameColors.danger,
  neutral: colors.blanc,
} as const;

/**
 * Markers RealMap de la scène (UNE icône par SECTEUR — jamais par cellule),
 * ÉTAGÉS par bande de zoom (AMENDEMENT-37 §6/§11) — identiques à la variante
 * native. `showMissions` (quartier z13+) allume missions/objectifs (avant-poste,
 * shield, sablier, pin, défi) + POI ; `showAllies` (rue z16+) allume les mates
 * OPT-IN. EGO est TOUJOURS peint au-dessus. L'emphase du mode module l'opacité de
 * chaque famille (AMENDEMENT-11 §3).
 */
function buildMarkers(
  points: BattleMapPoints,
  decayAnchor: LatLngPoint | null,
  emph: ModeEmphasis,
  showMissions: boolean,
  showAllies: boolean,
): RealMapMarker[] {
  const markers: RealMapMarker[] = [];

  // ── Missions / objectifs + POI / défi — QUARTIER (z13-15) ──────────────────
  if (showMissions) {
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
  if (showAllies) {
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
    lng: EGO_CAMERA.lng,
    lat: EGO_CAMERA.lat,
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
  /**
   * P0.2 (AMENDEMENT-39) — LES VRAIES CAPTURES, à parité stricte avec la variante
   * native : `territories` non-null ⇒ on peint `hex_claims` (même vide : la carte
   * dit le vide au lieu d'inventer un Paris conquis) ; null ⇒ démo ÉTIQUETÉE.
   */
  const { territories, isReal, failed } = useRealTerritories();
  const layers = useMemo(
    () => battleGameLayers(emph, selectedParcours, basemap, selectedZoneId, territories),
    [emph, selectedParcours, basemap, selectedZoneId, territories],
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
    return buildMarkers(points, decayAnchor, emph, showMissions, showAllies);
  }, [points, decayAnchor, emph, band]);

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
        onPress={onMapPress}
        onMapReady={setGlMap}
        attributionCompact={false}
        basemap={basemap}
        mode3d={map3d}
        style={StyleSheet.absoluteFill}
        testID="battle-map-reelle"
      />

      {/* ── NOTE D'HONNÊTETÉ (P0.2/P0.3, parité stricte avec la variante native) — même règle que performance.tsx et
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
          {dataNote(isReal, failed, territories?.length ?? 0)}
        </Text>
      )}

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
  // Jamais chartreuse : réservée à l'action, et illisible sur fond clair (charte).
  dataNote: { position: 'absolute', left: 14, right: 14, color: colors.gris, fontSize: 11 },
});

export default MapScreen;
