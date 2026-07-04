/**
 * GRYD — BATTLE MAP, variante NATIVE (MapLibre) — AMENDEMENT-11 §2-3 : PLUS
 * AUCUN HEXAGONE VISIBLE. La cible visuelle prioritaire est MapScreen.web.tsx
 * (aperçu Expo Web) ; cette version reste compilable et porte les MÊMES
 * territoires organiques : une source GeoJSON UNIQUE de multi-polygones
 * fusionnés/lissés (territory.ts → territoriesToGeoJSON — h3-js
 * cellsToMultiPolygon + simplification + Chaikin), avec les traitements de
 * FRONTIÈRE par état (fill + line layers filtrés par `state`) :
 * crew (aplat + contour fin semi-lumineux + glow), rival (contour orange
 * marqué), contesté (double contour chartreuse+orange), protégé (halo),
 * decay (pointillé, muted red si urgent), objectif (zone chaude douce),
 * avant-poste (petit blob). Aucune couche neutre : le fond = la basemap.
 * 5 MODES de carte (AMENDEMENT-11 §3) : MODE_EMPHASIS module l'opacité des
 * familles de couches. HUD partagé (BattleMapOverlays — pill % de contrôle,
 * chips de modes, sheet). Les markers iconiques shield/sablier/pin/mates/POI
 * restent web-only pour l'instant — TODO Milestone 2 : images de symboles
 * MapLibre. Le CTA COURIR est rendu par le layout (tabs) — pas de doublon ici.
 */
import { useMemo, useRef, useState, type ComponentProps, type ElementRef } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Camera,
  FillLayer,
  LineLayer,
  MapView,
  ShapeSource,
  SymbolLayer,
} from '@maplibre/maplibre-react-native';

// v10.4 ne réexporte pas FilterExpression : on le dérive de la prop du composant.
type FilterExpression = NonNullable<ComponentProps<typeof FillLayer>['filter']>;
import { CITIES, colors } from '@klaim/shared';
import { EVENTS, track } from '../../lib/analytics';
import { deriveRunButtonMode } from '../nav/runContext';
import { SECTOR_LABELS } from './basemap';
import { BattleMapOverlays } from './BattleMapOverlays';
import { battleMapData, battleMapSummary } from './fakeHexes';
import { territoryStyle as terr } from './mapStyle';
import {
  DEFAULT_MAP_MODE,
  MODE_EMPHASIS,
  battleTerritories,
  territoriesToGeoJSON,
  type MapMode,
  type TerritoryState,
} from './territory';
import { PARCOURS_DEMO } from './demo';

/**
 * Style vectoriel sombre (D17). Valeur par défaut : OpenFreeMap « dark ».
 * TODO Protomaps self-hosted (Cloudflare R2, SPEC §6.1) + fallback style JSON
 * minimal hors ligne avant la bêta.
 */
const STYLE_URL = 'https://tiles.openfreemap.org/styles/dark';

/**
 * Échelle coureur (AMENDEMENT-08 §4) : ~130 m (zone) ≈ 30 px à l'écran.
 * À la latitude de Paris, zoom 14.6 ≈ 4,2 m/px — même perception que la
 * variante web (METERS_PER_PIXEL ≈ 4,3 m/px).
 */
const RUNNER_SCALE_ZOOM = 14.6;

/** Traitements de frontière (mêmes valeurs que la variante web). */
const BORDER_WIDTH = 1.8;
const RIVAL_BORDER_WIDTH = 2.6;
const CONTESTED_INNER_WIDTH = 1.8;
const CONTESTED_OUTER_WIDTH = 3;
const CREW_GLOW_WIDTH = 7;
const PROTECTED_HALO_WIDTH = 5;
const DECAY_WIDTH = 1.8;
const DECAY_DASH: [number, number] = [3, 2.5];
const OBJECTIVE_SOFT_WIDTH = 12;
const ROUTE_WIDTH = 4;

const eqState = (state: TerritoryState): FilterExpression =>
  ['==', ['get', 'state'], state] as FilterExpression;

const FILTER_CREW = eqState('crew');
const FILTER_RIVAL = eqState('rival');
const FILTER_CONTESTED = eqState('contested');
const FILTER_PROTECTED = eqState('protected');
const FILTER_DECAY = eqState('decay');
const FILTER_DECAY_URGENT = eqState('decayUrgent');
const FILTER_OBJECTIVE = eqState('objective');
const FILTER_OUTPOST = eqState('outpost');

/** GeoJSON minimal typé localement (pas de dépendance @types/geojson). */
interface LineFeature {
  type: 'Feature';
  geometry: { type: 'LineString'; coordinates: number[][] };
  properties: Record<string, never>;
}
interface PointFeatureCollection {
  type: 'FeatureCollection';
  features: {
    type: 'Feature';
    geometry: { type: 'Point'; coordinates: number[] };
    properties: { name: string };
  }[];
}

/** Durée du recentrage caméra (UI — retour ego fluide type Uber). */
const RECENTER_MS = 600;

export function MapScreen() {
  const [mode, setMode] = useState<MapMode>(DEFAULT_MAP_MODE);
  const { collection, points } = useMemo(() => battleMapData(), []);
  const summary = useMemo(() => battleMapSummary(collection), [collection]);
  const runMode = useMemo(() => deriveRunButtonMode(), []);
  const [selectedParcours, setSelectedParcours] = useState<string | null>(null);

  /** Territoires organiques fusionnés (AUCUN hexagone) — source unique. */
  const territoryShape = useMemo(() => territoriesToGeoJSON(battleTerritories()), []);
  /** Emphase des familles de couches selon le mode (AMENDEMENT-11 §3). */
  const emph = MODE_EMPHASIS[mode];

  // Recentrer (AMENDEMENT-09 §2) : retour caméra fluide sur le « moi » égocentré.
  const cameraRef = useRef<ElementRef<typeof Camera>>(null);
  const recenter = () => {
    cameraRef.current?.setCamera({
      centerCoordinate: [CITIES.paris.center.lng, CITIES.paris.center.lat],
      zoomLevel: RUNNER_SCALE_ZOOM,
      animationDuration: RECENTER_MS,
    });
  };

  // Parcours sélectionné dans la sheet : tracé gris (aperçu avant la course).
  const parcoursShape = useMemo<LineFeature | null>(() => {
    const parcours = PARCOURS_DEMO.find((p) => p.id === selectedParcours);
    if (!parcours) return null;
    return {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: parcours.line.map((p) => [p.lng, p.lat]),
      },
      properties: {},
    };
  }, [selectedParcours]);

  // Route ouverte : polyline chartreuse épaisse entre deux secteurs tenus.
  const routeShape = useMemo<LineFeature>(
    () => ({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: points.route.map((p) => [p.lng, p.lat]),
      },
      properties: {},
    }),
    [points],
  );

  // Noms de secteurs discrets (labels de quartiers — couche 7 du doc §5).
  const sectorShape = useMemo<PointFeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: SECTOR_LABELS.map((s) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
        properties: { name: s.name },
      })),
    }),
    [],
  );

  // map_load_ms (§8 santé produit) — du montage au onDidFinishLoadingMap.
  const mountedAtRef = useRef<number>(Date.now());
  const loadTrackedRef = useRef(false);
  const handleMapLoaded = () => {
    if (loadTrackedRef.current) return;
    loadTrackedRef.current = true;
    track(EVENTS.mapLoadMs, { ms: Date.now() - mountedAtRef.current });
  };

  return (
    <View style={styles.root}>
      <MapView
        style={styles.map}
        mapStyle={STYLE_URL}
        onDidFinishLoadingMap={handleMapLoaded}
        attributionEnabled={false}
        compassEnabled={false}
      >
        <Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: [CITIES.paris.center.lng, CITIES.paris.center.lat],
            zoomLevel: RUNNER_SCALE_ZOOM,
          }}
        />
        {/* TERRITOIRES ORGANIQUES : multi-polygones fusionnés/lissés, un
            traitement de FRONTIÈRE par état — aucune couche neutre. */}
        <ShapeSource id="territories" shape={territoryShape}>
          {/* Rival : aplat teinté + frontière orange marquée */}
          <FillLayer
            id="terr-rival-fill"
            filter={FILTER_RIVAL}
            style={{ fillColor: terr.rivalFill, fillOpacity: emph.rival }}
          />
          <LineLayer
            id="terr-rival-border"
            filter={FILTER_RIVAL}
            style={{
              lineColor: terr.rivalStroke,
              lineWidth: RIVAL_BORDER_WIDTH,
              lineOpacity: emph.rival,
            }}
          />

          {/* Objectif : zone chaude douce (lueur large sans bord dur) */}
          <LineLayer
            id="terr-objective-soft"
            filter={FILTER_OBJECTIVE}
            style={{
              lineColor: terr.objectiveSoft,
              lineWidth: OBJECTIVE_SOFT_WIDTH,
              lineOpacity: emph.objective,
            }}
          />
          <FillLayer
            id="terr-objective-fill"
            filter={FILTER_OBJECTIVE}
            style={{ fillColor: terr.objectiveFill, fillOpacity: emph.objective }}
          />

          {/* Mon crew : glow + aplat + frontière fine semi-lumineuse */}
          <LineLayer
            id="terr-crew-glow"
            filter={FILTER_CREW}
            style={{
              lineColor: terr.crewGlow,
              lineWidth: CREW_GLOW_WIDTH,
              lineOpacity: emph.crew,
            }}
          />
          <FillLayer
            id="terr-crew-fill"
            filter={FILTER_CREW}
            style={{ fillColor: terr.crewFill, fillOpacity: emph.crew }}
          />
          <LineLayer
            id="terr-crew-border"
            filter={FILTER_CREW}
            style={{
              lineColor: terr.crewStroke,
              lineWidth: BORDER_WIDTH,
              lineOpacity: emph.crew,
            }}
          />

          {/* Avant-poste : petit blob organique tenu */}
          <FillLayer
            id="terr-outpost-fill"
            filter={FILTER_OUTPOST}
            style={{ fillColor: terr.outpostFill, fillOpacity: emph.crew }}
          />
          <LineLayer
            id="terr-outpost-border"
            filter={FILTER_OUTPOST}
            style={{
              lineColor: terr.outpostStroke,
              lineWidth: BORDER_WIDTH,
              lineOpacity: emph.crew,
            }}
          />

          {/* Zone à défendre : frontière pointillée (muted red si urgent) */}
          <FillLayer
            id="terr-decay-urgent-fill"
            filter={FILTER_DECAY_URGENT}
            style={{ fillColor: terr.decayUrgentFill, fillOpacity: emph.defense }}
          />
          <LineLayer
            id="terr-decay-border"
            filter={FILTER_DECAY}
            style={{
              lineColor: terr.decayStroke,
              lineWidth: DECAY_WIDTH,
              lineDasharray: DECAY_DASH,
              lineOpacity: emph.defense,
            }}
          />
          <LineLayer
            id="terr-decay-urgent-border"
            filter={FILTER_DECAY_URGENT}
            style={{
              lineColor: terr.decayUrgentStroke,
              lineWidth: DECAY_WIDTH,
              lineDasharray: DECAY_DASH,
              lineOpacity: emph.defense,
            }}
          />

          {/* Secteur protégé : halo verify */}
          <LineLayer
            id="terr-protected-halo"
            filter={FILTER_PROTECTED}
            style={{
              lineColor: terr.protectedHalo,
              lineWidth: PROTECTED_HALO_WIDTH,
              lineOpacity: emph.defense,
            }}
          />

          {/* Contesté : DOUBLE contour chartreuse + orange */}
          <FillLayer
            id="terr-contested-fill"
            filter={FILTER_CONTESTED}
            style={{ fillColor: terr.contestedFill, fillOpacity: emph.contested }}
          />
          <LineLayer
            id="terr-contested-inner"
            filter={FILTER_CONTESTED}
            style={{
              lineColor: terr.contestedInnerStroke,
              lineWidth: CONTESTED_INNER_WIDTH,
              lineOpacity: emph.contested,
            }}
          />
          <LineLayer
            id="terr-contested-outer"
            filter={FILTER_CONTESTED}
            style={{
              lineColor: terr.contestedOuterStroke,
              lineWidth: CONTESTED_OUTER_WIDTH,
              lineOffset: -2,
              lineOpacity: emph.contested,
            }}
          />
        </ShapeSource>

        {/* Route ouverte : ligne chartreuse ÉPAISSE (route-first) */}
        <ShapeSource id="route" shape={routeShape}>
          <LineLayer
            id="route-line"
            style={{
              lineColor: terr.routeStroke,
              lineWidth: ROUTE_WIDTH,
              lineCap: 'round',
              lineOpacity: emph.route,
            }}
          />
        </ShapeSource>

        {/* Parcours sélectionné (sheet ouverte) : aperçu gris + liseré sombre */}
        {parcoursShape ? (
          <ShapeSource id="parcours" shape={parcoursShape}>
            <LineLayer
              id="parcours-casing"
              style={{ lineColor: colors.noir, lineWidth: 7, lineOpacity: 0.5, lineCap: 'round' }}
            />
            <LineLayer
              id="parcours-line"
              style={{ lineColor: colors.gris, lineWidth: 4, lineCap: 'round' }}
            />
          </ShapeSource>
        ) : null}

        {/* Noms de secteurs discrets */}
        <ShapeSource id="sectors" shape={sectorShape}>
          <SymbolLayer
            id="sector-labels"
            style={{
              textField: ['get', 'name'],
              textSize: 11,
              textColor: colors.gris,
              textOpacity: 0.6,
              textLetterSpacing: 0.2,
            }}
          />
        </ShapeSource>
      </MapView>

      {/* HUD partagé : pill % de contrôle, feed, chips de modes, sheet */}
      <BattleMapOverlays
        mode={mode}
        onSelectMode={setMode}
        summary={summary}
        runMode={runMode}
        onRecenter={recenter}
        selectedParcoursId={selectedParcours}
        onSelectParcours={setSelectedParcours}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  map: { flex: 1 },
});

export default MapScreen;
