/**
 * GRYD — BATTLE MAP, variante NATIVE (MapLibre) — AMENDEMENT-08 §4, doc §7.
 * La cible visuelle prioritaire est MapScreen.web.tsx (aperçu Expo Web) ;
 * cette version reste compilable et porte les mêmes couches à partir du MÊME
 * jeu démo (battleMapData) : basemap vectorielle sombre (D17), hex grid,
 * états de jeu (crew/rival/contesté/protégé/decay/objectif/avant-poste),
 * route ouverte, labels de secteurs, et le HUD partagé (BattleMapOverlays).
 * Les markers iconiques (shield/sablier/pin) sont web-only pour l'instant —
 * TODO Milestone 2 : images de symboles MapLibre.
 * Le CTA COURIR est rendu par le layout (tabs) — pas de doublon ici.
 */
import { useMemo, useRef, useState, type ComponentProps } from 'react';
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
import {
  BattleMapOverlays,
  DEFAULT_MAP_LAYERS,
  type MapLayerKey,
} from './BattleMapOverlays';
import { battleMapData, battleMapSummary, type HexState } from './fakeHexes';
import { battleMapStyle as ms } from './mapStyle';

/**
 * Style vectoriel sombre (D17). Valeur par défaut : OpenFreeMap « dark ».
 * TODO Protomaps self-hosted (Cloudflare R2, SPEC §6.1) + fallback style JSON
 * minimal hors ligne avant la bêta.
 */
const STYLE_URL = 'https://tiles.openfreemap.org/styles/dark';

/**
 * Échelle coureur (AMENDEMENT-08 §4) : hex res 10 (~130 m) ≈ 30 px à l'écran.
 * À la latitude de Paris, zoom 14.6 ≈ 4,2 m/px — même perception que la
 * variante web (METERS_PER_PIXEL ≈ 4,3 m/px).
 */
const RUNNER_SCALE_ZOOM = 14.6;

const eqState = (state: HexState): FilterExpression =>
  ['==', ['get', 'state'], state] as FilterExpression;

const FILTER_NEUTRAL = eqState('neutral');
const FILTER_FOE = eqState('foe');
const FILTER_CONTESTED = eqState('contested');
const FILTER_PROTECTED = eqState('protected');
const FILTER_DECAY = eqState('decay');
const FILTER_OBJECTIVE = eqState('objective');
const FILTER_OUTPOST = eqState('outpost');
/** Hexes tenus par mon crew : mine + protected + decay. */
const FILTER_HELD = [
  'any',
  ['==', ['get', 'state'], 'mine'],
  ['==', ['get', 'state'], 'protected'],
  ['==', ['get', 'state'], 'decay'],
] as unknown as FilterExpression;
const FILTER_DECAY_URGENT = [
  'all',
  ['==', ['get', 'state'], 'decay'],
  ['==', ['get', 'urgent'], true],
] as unknown as FilterExpression;

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

export function MapScreen() {
  const [layers, setLayers] = useState(DEFAULT_MAP_LAYERS);
  const { collection, points } = useMemo(() => battleMapData(), []);
  const summary = useMemo(() => battleMapSummary(collection), [collection]);
  const runMode = useMemo(() => deriveRunButtonMode(), []);

  // Route ouverte : polyline chartreuse cluster → objectif (doc §7).
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

  // Noms de secteurs discrets (doc §7 « basemap urbaine subtile »).
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

  const toggleLayer = (key: MapLayerKey) =>
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));

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
          defaultSettings={{
            centerCoordinate: [CITIES.paris.center.lng, CITIES.paris.center.lat],
            zoomLevel: RUNNER_SCALE_ZOOM,
          }}
        />
        <ShapeSource id="hexes" shape={collection}>
          {/* Grille neutre : contour discret seul (§D) */}
          <LineLayer
            id="hex-neutral-stroke"
            filter={FILTER_NEUTRAL}
            style={{ lineColor: ms.neutralStroke, lineWidth: 1 }}
          />

          {/* Rival : orange sombre — TODO motifs par crew (fillPattern nécessite
              des images enregistrées ; prop `pattern` déjà portée par le GeoJSON) */}
          {layers.rivals ? (
            <>
              <FillLayer
                id="hex-foe-fill"
                filter={FILTER_FOE}
                style={{ fillColor: ms.rivalFill }}
              />
              <LineLayer
                id="hex-foe-stroke"
                filter={FILTER_FOE}
                style={{ lineColor: ms.rivalStroke, lineWidth: 1 }}
              />
              {/* Contesté : double contour crew/rival */}
              <FillLayer
                id="hex-contested-fill"
                filter={FILTER_CONTESTED}
                style={{ fillColor: ms.contestedFill }}
              />
              <LineLayer
                id="hex-contested-inner"
                filter={FILTER_CONTESTED}
                style={{ lineColor: ms.contestedInnerStroke, lineWidth: 1.4 }}
              />
              <LineLayer
                id="hex-contested-outer"
                filter={FILTER_CONTESTED}
                style={{ lineColor: ms.contestedOuterStroke, lineWidth: 2.5, lineOffset: -2 }}
              />
            </>
          ) : null}

          {/* Mon crew : chartreuse + glow léger */}
          {layers.crew ? (
            <>
              <LineLayer
                id="hex-held-glow"
                filter={FILTER_HELD}
                style={{ lineColor: ms.heldGlow, lineWidth: 5 }}
              />
              <FillLayer
                id="hex-held-fill"
                filter={FILTER_HELD}
                style={{ fillColor: ms.heldFill }}
              />
              <LineLayer
                id="hex-held-stroke"
                filter={FILTER_HELD}
                style={{ lineColor: ms.heldStroke, lineWidth: 1.4 }}
              />
              {/* Protégé : halo verify autour du cœur */}
              <LineLayer
                id="hex-protected-halo"
                filter={FILTER_PROTECTED}
                style={{ lineColor: ms.protectedHalo, lineWidth: 2.5 }}
              />
            </>
          ) : null}

          {/* Decay : contour pointillé, muted red si urgent */}
          {layers.crew && layers.decay ? (
            <>
              <LineLayer
                id="hex-decay-stroke"
                filter={FILTER_DECAY}
                style={{ lineColor: ms.decayStroke, lineWidth: 1.6, lineDasharray: [2, 2] }}
              />
              <LineLayer
                id="hex-decay-urgent"
                filter={FILTER_DECAY_URGENT}
                style={{
                  lineColor: ms.decayUrgentStroke,
                  lineWidth: 1.6,
                  lineDasharray: [2, 2],
                }}
              />
            </>
          ) : null}

          {/* Objectif crew (halo chartreuse) + avant-poste */}
          {layers.missions ? (
            <>
              <FillLayer
                id="hex-objective-fill"
                filter={FILTER_OBJECTIVE}
                style={{ fillColor: ms.objectiveHalo }}
              />
              <LineLayer
                id="hex-objective-stroke"
                filter={FILTER_OBJECTIVE}
                style={{ lineColor: ms.objectiveStroke, lineWidth: 1.2 }}
              />
              <FillLayer
                id="hex-outpost-fill"
                filter={FILTER_OUTPOST}
                style={{ fillColor: ms.outpostFill }}
              />
              <LineLayer
                id="hex-outpost-stroke"
                filter={FILTER_OUTPOST}
                style={{ lineColor: ms.outpostStroke, lineWidth: 1.4 }}
              />
            </>
          ) : null}
        </ShapeSource>

        {/* Route ouverte : ligne GPS chartreuse (doc §7) */}
        {layers.routes ? (
          <ShapeSource id="route" shape={routeShape}>
            <LineLayer
              id="route-line"
              style={{ lineColor: ms.routeStroke, lineWidth: 2, lineCap: 'round' }}
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

      {/* Couche 4 : HUD gameplay partagé (saison/zone/rang, chips, feed, objectif) */}
      <BattleMapOverlays
        layers={layers}
        onToggleLayer={toggleLayer}
        summary={summary}
        runMode={runMode}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  map: { flex: 1 },
});

export default MapScreen;
