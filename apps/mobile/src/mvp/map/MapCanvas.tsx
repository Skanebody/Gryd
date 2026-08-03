/**
 * GRYD — LA CARTE, RÉDUITE À CE QUE LE MVP MONTRE (natif — lot M3).
 *
 * ─── POURQUOI PAS `ui/game/RealMap` ─────────────────────────────────────────
 * Parce que ce composant-là porte cinq onglets de besoins : secteurs, rivaux,
 * contesté pulsé, bâtiments 3D, fond satellite, marqueurs en portail, requête de
 * features au tap. ADR-001 le laisse en quarantaine, et à raison : le MVP n'a
 * qu'UNE chose à peindre — mon territoire — et hériter de l'autre reviendrait à
 * rouvrir chacune de ces surfaces le jour où l'une d'elles casse.
 *
 * Ce que ce fichier fait, en entier : un fond de nuit, ma position si je l'ai
 * autorisée, mes polygones si on a su les lire. Rien d'autre. Le fond, lui,
 * n'est PAS réécrit — `nightStyle.ts` est du salvage (25 couches dérivées du
 * schéma CARTO, verrouillées par leur test) : un nom de `source-layer` réinventé
 * de mémoire rend une carte NOIRE.
 *
 * ─── CE QU'IL NE DÉCIDE PAS ─────────────────────────────────────────────────
 * Il ne décide RIEN. Ni s'il y a un territoire (`homeState`), ni quoi dire quand
 * il n'y en a pas (l'écran). Il reçoit une géométrie ou `null`, et `null` ne
 * signifie jamais « vide » ici : il signifie « rien à peindre », ce qui est vrai
 * pendant un chargement comme après un échec. C'est l'écran, seul, qui parle.
 */
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Camera,
  FillLayer,
  LineLayer,
  MapView,
  ShapeSource,
  UserLocation,
  type FillLayerStyle,
  type LineLayerStyle,
} from '@maplibre/maplibre-react-native';
import { colors, fonts, fontSizes, spacing, withAlpha } from '@klaim/shared';
import { grydNightStyleJson } from './nightStyle';
import { BASEMAP_ATTRIBUTION, type TerritoryFeatureCollection } from './territoryGeo';

export interface MapCanvasProps {
  /** Où ouvrir. `null` = on ne sait pas où est le joueur : voir `HOME_FALLBACK`. */
  readonly center: { readonly lng: number; readonly lat: number } | null;
  readonly zoom: number;
  /** Mes polygones, ou `null` quand il n'y a RIEN à peindre (≠ « je n'ai rien »). */
  readonly territories: TerritoryFeatureCollection | null;
  /** Peindre le point de position ? Faux tant que l'OS n'a rien accordé. */
  readonly showUser: boolean;
}

const SOURCE_ID = 'gryd-mvp-territoires';

/**
 * Cadrage d'ouverture quand la position est inconnue.
 *
 * ⚠️ Ce n'est PAS une position de joueur, et c'est pour ça qu'il n'y a pas de
 * point : on montre une ville, on ne prétend pas y être. Rouen parce que c'est
 * la Saison 0 — la seule ville dont le MVP parle.
 */
const HOME_FALLBACK = { lng: 1.0993, lat: 49.4431, zoom: 12.5 } as const;

export function MapCanvas({ center, zoom, territories, showUser }: MapCanvasProps) {
  // Mémoïsés : un nouvel objet de style à chaque rendu force MapLibre à
  // recompiler ses couches, et la carte perd ses images (perf, L14).
  const fill = useMemo<FillLayerStyle>(
    () => ({ fillColor: withAlpha(colors.chartreuse, 0.3) }),
    [],
  );
  const line = useMemo<LineLayerStyle>(
    () => ({
      lineColor: withAlpha(colors.chartreuse, 0.8),
      lineWidth: 3,
      lineJoin: 'round',
      lineCap: 'round',
    }),
    [],
  );

  const ouverture = center ?? HOME_FALLBACK;

  return (
    <View style={styles.root}>
      <MapView
        style={StyleSheet.absoluteFill}
        mapStyle={grydNightStyleJson()}
        // Peints à la main plus bas : le logo du fournisseur n'a pas sa place
        // dans un jeu, l'attribution LÉGALE si.
        attributionEnabled={false}
        logoEnabled={false}
      >
        {/* `defaultSettings` = appliqué au MONTAGE seulement. Une caméra
            CONTRÔLÉE se battrait contre les doigts du joueur à chaque rendu. */}
        <Camera
          defaultSettings={{
            centerCoordinate: [ouverture.lng, ouverture.lat],
            zoomLevel: center ? zoom : HOME_FALLBACK.zoom,
          }}
        />
        {showUser ? <UserLocation /> : null}
        {territories ? (
          <ShapeSource id={SOURCE_ID} shape={territories}>
            <FillLayer id={`${SOURCE_ID}-fill`} style={fill} />
            <LineLayer id={`${SOURCE_ID}-line`} style={line} />
          </ShapeSource>
        ) : null}
      </MapView>

      {/* Obligation légale des sources de tuiles (ODbL / CARTO). Elle ne se
          cache pas derrière un tap : elle est lisible à l'écran. */}
      <Text style={styles.attribution} accessibilityRole="text">
        {BASEMAP_ATTRIBUTION}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  attribution: {
    position: 'absolute',
    left: spacing.sm,
    bottom: spacing.xs,
    color: colors.grisFaible,
    fontFamily: fonts.text,
    fontSize: fontSizes.xs,
  },
});
