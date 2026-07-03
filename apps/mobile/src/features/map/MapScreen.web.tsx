/**
 * GRYD — écran Carte, variante WEB (aperçu navigateur, Xcode indisponible).
 * Metro résout `.web.tsx` avant `.tsx` sur la cible web : MapLibre (natif-only)
 * n'est JAMAIS importé ici. Même UI que la version native (chips saison/rang,
 * fond noir, chip « hex tenus »), mais la carte est dessinée en react-native-svg
 * à partir du MÊME jeu factice (fakeHexesGeoJSON) — rendu égocentré 3 états :
 *   mine    = chartreuse 14 % + contour 40 %
 *   foe     = blanc 6 % + contour 22 %
 *   neutral = contour blanc 5 % seul
 * Le CTA COURIR reste rendu par le layout (tabs) — pas de doublon ici.
 * Track EVENTS.mapLoadMs comme l'original (au montage).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { CITIES, colors, fontSizes, mapTokens, radii } from '@klaim/shared';
import { EVENTS, track } from '../../lib/analytics';
import { NAV_BAR_BOTTOM, NAV_BAR_HEIGHT } from '../nav/metrics';
import { countMine, fakeHexesGeoJSON, type HexState } from './fakeHexes';

/** Chip « hex tenus » posée au-dessus de la nav flottante (maquette : bottom 118). */
const STAT_CHIP_ABOVE_NAV = 42;

/** Facteur d'échelle : approxime le zoom natif (HOME_ZOOM = 13) — marge autour du cluster. */
const FIT_PADDING = 0.08;

interface ProjectedHex {
  key: string;
  state: HexState;
  d: string;
}

/**
 * Projette les hexes (lng/lat) en un chemin SVG dans un repère width×height.
 * Projection équirectangulaire locale (corrigée en longitude par cos(lat)) —
 * suffisante à l'échelle d'un quartier pour un aperçu fidèle à l'écran 01.
 */
function projectHexes(width: number, height: number): { hexes: ProjectedHex[] } {
  const collection = fakeHexesGeoJSON();
  const lat0 = CITIES.paris.center.lat;
  const cosLat = Math.cos((lat0 * Math.PI) / 180);

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  // 1er passage : bornes en coordonnées planes (x = lng·cosLat, y = -lat).
  for (const f of collection.features) {
    const ring = f.geometry.coordinates[0] ?? [];
    for (const pt of ring) {
      const lng = pt[0] ?? 0;
      const lat = pt[1] ?? 0;
      const x = lng * cosLat;
      const y = -lat;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const pad = Math.max(spanX, spanY) * FIT_PADDING;
  const boxX = spanX + pad * 2;
  const boxY = spanY + pad * 2;
  // Échelle « cover » (comme une carte plein écran), centrée.
  const scale = Math.max(width / boxX, height / boxY);
  const offsetX = (width - spanX * scale) / 2;
  const offsetY = (height - spanY * scale) / 2;

  const toXY = (lng: number, lat: number): [number, number] => {
    const px = (lng * cosLat - minX) * scale + offsetX;
    const py = (-lat - minY) * scale + offsetY;
    return [px, py];
  };

  const hexes: ProjectedHex[] = collection.features.map((f) => {
    const ring = f.geometry.coordinates[0] ?? [];
    const d =
      ring
        .map((pt, i) => {
          const [px, py] = toXY(pt[0] ?? 0, pt[1] ?? 0);
          return `${i === 0 ? 'M' : 'L'}${px.toFixed(2)} ${py.toFixed(2)}`;
        })
        .join(' ') + ' Z';
    return { key: f.properties.h3, state: f.properties.state, d };
  });

  return { hexes };
}

/** Styles de tracé par état (mêmes tokens que les LineLayer/FillLayer natifs). */
const HEX_STYLE: Record<HexState, { fill: string; stroke: string; strokeWidth: number }> = {
  mine: { fill: mapTokens.mineFill, stroke: mapTokens.mineStroke, strokeWidth: 1.4 },
  foe: { fill: mapTokens.foeFill, stroke: mapTokens.foeStroke, strokeWidth: 1 },
  neutral: { fill: 'transparent', stroke: mapTokens.neutralStroke, strokeWidth: 1 },
};

export function MapScreen() {
  const insets = useSafeAreaInsets();
  const mineCount = useMemo(() => countMine(fakeHexesGeoJSON()), []);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  // map_load_ms (§8) — du montage au premier rendu de la carte (parité native).
  const mountedAtRef = useRef<number>(Date.now());
  const loadTrackedRef = useRef(false);
  useEffect(() => {
    if (loadTrackedRef.current) return;
    loadTrackedRef.current = true;
    track(EVENTS.mapLoadMs, { ms: Date.now() - mountedAtRef.current });
  }, []);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) =>
      prev && prev.w === width && prev.h === height ? prev : { w: width, h: height },
    );
  };

  const projected = useMemo(
    () => (size ? projectHexes(size.w, size.h) : null),
    [size],
  );

  return (
    <View style={styles.root}>
      <View style={styles.map} onLayout={onLayout}>
        {size && projected ? (
          <Svg width={size.w} height={size.h}>
            {/* neutral d'abord (contour discret), puis foe, puis mine au-dessus */}
            {projected.hexes
              .slice()
              .sort((a, b) => order(a.state) - order(b.state))
              .map((h) => {
                const s = HEX_STYLE[h.state];
                return (
                  <Path
                    key={h.key}
                    d={h.d}
                    fill={s.fill}
                    stroke={s.stroke}
                    strokeWidth={s.strokeWidth}
                  />
                );
              })}
          </Svg>
        ) : null}
      </View>

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

/** Ordre de peinture : neutral (0) < foe (1) < mine (2). */
function order(state: HexState): number {
  return state === 'neutral' ? 0 : state === 'foe' ? 1 : 2;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  map: { flex: 1, backgroundColor: colors.noir },
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
