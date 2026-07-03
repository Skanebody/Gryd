/**
 * GRYD — écran Carte (home, SPEC §4.2.1) — rendu égocentré AMENDEMENT-01.
 * MapLibre + couche GeoJSON d'hexes H3 res 10 factices (D16/D17).
 * Chartreuse réservé à ses 4 emplois (§C.3) : mon territoire, les gains,
 * l'état live. Le CTA COURIR est rendu par le layout (tabs) — permanent
 * au-dessus de la nav 5 onglets (AMENDEMENT-02 §5), pas de doublon ici.
 */
import { useMemo, useRef, type ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Camera,
  FillLayer,
  LineLayer,
  MapView,
  ShapeSource,
} from '@maplibre/maplibre-react-native';

// v10.4 ne réexporte pas FilterExpression : on le dérive de la prop du composant.
type FilterExpression = NonNullable<ComponentProps<typeof FillLayer>['filter']>;
import { CITIES, colors, fontSizes, mapTokens, radii } from '@klaim/shared';
import { EVENTS, track } from '../../lib/analytics';
import { NAV_BAR_BOTTOM, NAV_BAR_HEIGHT } from '../nav/metrics';
import { countMine, fakeHexesGeoJSON } from './fakeHexes';

/**
 * Style vectoriel sombre (D17). Valeur par défaut : OpenFreeMap « dark ».
 * TODO Protomaps self-hosted (Cloudflare R2, SPEC §6.1) + fallback style JSON
 * minimal hors ligne avant la bêta.
 */
const STYLE_URL = 'https://tiles.openfreemap.org/styles/dark';

const HOME_ZOOM = 13;

/** Chip « hex tenus » posée au-dessus de la nav flottante (maquette : bottom 118). */
const STAT_CHIP_ABOVE_NAV = 42;

const FILTER_MINE: FilterExpression = ['==', ['get', 'state'], 'mine'];
const FILTER_FOE: FilterExpression = ['==', ['get', 'state'], 'foe'];
const FILTER_NEUTRAL: FilterExpression = ['==', ['get', 'state'], 'neutral'];

export function MapScreen() {
  const insets = useSafeAreaInsets();
  const hexes = useMemo(() => fakeHexesGeoJSON(), []);
  const mineCount = useMemo(() => countMine(hexes), [hexes]);

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
          defaultSettings={{
            centerCoordinate: [CITIES.paris.center.lng, CITIES.paris.center.lat],
            zoomLevel: HOME_ZOOM,
          }}
        />
        <ShapeSource id="hexes" shape={hexes}>
          {/* Neutre : contour blanc 5 % seul (§D) */}
          <LineLayer
            id="hex-neutral-stroke"
            filter={FILTER_NEUTRAL}
            style={{ lineColor: mapTokens.neutralStroke, lineWidth: 1 }}
          />
          {/* Adverses : blanc 6 % + contour 22 % — TODO motifs par crew
              (fillPattern nécessite des images enregistrées ; prop `pattern`
              déjà portée par le GeoJSON) */}
          <FillLayer
            id="hex-foe-fill"
            filter={FILTER_FOE}
            style={{ fillColor: mapTokens.foeFill }}
          />
          <LineLayer
            id="hex-foe-stroke"
            filter={FILTER_FOE}
            style={{ lineColor: mapTokens.foeStroke, lineWidth: 1 }}
          />
          {/* Moi / mon crew : chartreuse 14 % + contour 40 % (§D) */}
          <FillLayer
            id="hex-mine-fill"
            filter={FILTER_MINE}
            style={{ fillColor: mapTokens.mineFill }}
          />
          <LineLayer
            id="hex-mine-stroke"
            filter={FILTER_MINE}
            style={{ lineColor: mapTokens.mineStroke, lineWidth: 1.4 }}
          />
        </ShapeSource>
      </MapView>

      {/* Chips overlay (saison, rang) — données factices Milestone 1 */}
      <View style={[styles.topRow, { top: insets.top + 12 }]} pointerEvents="none">
        <View style={styles.chip}>
          <View style={styles.chipDot} />
          <Text style={styles.chipText}>SAISON 0 · J12</Text>
        </View>
        <View style={styles.chip}>
          <Text style={styles.chipText}>8ᵉ · {CITIES.paris.name.toUpperCase()}</Text>
        </View>
      </View>
      <View
        style={[
          styles.statChipWrap,
          { bottom: insets.bottom + NAV_BAR_BOTTOM + NAV_BAR_HEIGHT + STAT_CHIP_ABOVE_NAV },
        ]}
        pointerEvents="none"
      >
        <View style={styles.chip}>
          <Text style={styles.chipText}>{mineCount} hex tenus</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  map: { flex: 1 },
  topRow: {
    position: 'absolute',
    left: 14,
    right: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statChipWrap: { position: 'absolute', left: 14 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.carbone,
    borderColor: colors.grisLigne,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingVertical: 7,
    paddingHorizontal: 13,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse, // emploi §C.3 (4) : état « en direct »
  },
  chipText: {
    color: colors.blanc,
    fontSize: fontSizes.xs,
    letterSpacing: 0.7,
    fontVariant: ['tabular-nums'],
  },
});

export default MapScreen;
