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
 * ─── LES TROIS COUCHES, ET POURQUOI ELLES SONT DISTINCTES ───────────────────
 * 1. RIVAUX (orange, dessous) — la surface que d'autres tiennent. Aucun tracé :
 *    `public_territories` ne livre que la géométrie FLOUTÉE, et peindre un
 *    chemin à partir d'elle laisserait croire qu'on sait où ils sont passés.
 * 2. MA SURFACE (chartreuse) — dérivée des CELLULES que je tiens (ADR-010),
 *    lissée. Elle rétrécit quand un rival mord dedans.
 * 3. MON TRACÉ (chartreuse vif, dessus) — le chemin RÉEL, point par point.
 *
 * ⚠️ 2 et 3 ne sont PAS la même chose, et les confondre était tout le sujet
 * d'ADR-010. La surface dit ce que je POSSÈDE ; le tracé dit ce que j'ai COURU.
 * Le tracé suit les rues et ne change jamais après coup ; la surface, si.
 *
 * ⚠️ Le tracé est dessiné TEL QUEL, sommet par sommet — aucune simplification
 * ici. Relier deux points éloignés par une droite dessinerait un raccourci que
 * personne n'a couru : à travers un pâté de maisons, un fleuve, une voie ferrée.
 * Le seul lissage du produit est celui de la SURFACE (`smoothRing`), et il ne
 * touche jamais cette ligne.
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
import { colors, fonts, fontSizes, gameColors, spacing, withAlpha } from '@klaim/shared';
import { grydNightStyleJson } from './nightStyle';
import { BASEMAP_ATTRIBUTION, type TerritoryFeatureCollection } from './territoryGeo';

export interface MapCanvasProps {
  /** Où ouvrir. `null` = on ne sait pas où est le joueur : voir `HOME_FALLBACK`. */
  readonly center: { readonly lng: number; readonly lat: number } | null;
  readonly zoom: number;
  /** Ma surface possédée, ou `null` quand il n'y a RIEN à peindre (≠ « je n'ai rien »). */
  readonly territories: TerritoryFeatureCollection | null;
  /** Mon tracé réel, point par point. `null` = rien à dessiner. */
  readonly trace?: TerritoryFeatureCollection | null;
  /** Les surfaces tenues par d'autres. Jamais de tracé pour eux (voir l'en-tête). */
  readonly rivals?: TerritoryFeatureCollection | null;
  /** Peindre le point de position ? Faux tant que l'OS n'a rien accordé. */
  readonly showUser: boolean;
}

const SOURCE_ID = 'gryd-mvp-territoires';
const SOURCE_TRACE = 'gryd-mvp-trace';
const SOURCE_RIVAUX = 'gryd-mvp-rivaux';

/**
 * Largeurs du tracé héros, par zoom (reprises de `mapStyle.TRACE_WIDTH_STOPS`,
 * salvage). Le CASING sombre passe DESSOUS le cœur chartreuse : sans lui, la
 * ligne se perd sur une rue claire du fond de carte.
 */
const TRACE_CASING_W = 8;
const TRACE_CORE_W = 4;

/**
 * Cadrage d'ouverture quand la position est inconnue.
 *
 * ⚠️ Ce n'est PAS une position de joueur, et c'est pour ça qu'il n'y a pas de
 * point : on montre une ville, on ne prétend pas y être. Rouen parce que c'est
 * la Saison 0 — la seule ville dont le MVP parle.
 */
const HOME_FALLBACK = { lng: 1.0993, lat: 49.4431, zoom: 12.5 } as const;

export function MapCanvas({ center, zoom, territories, trace, rivals, showUser }: MapCanvasProps) {
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

  const rivalFill = useMemo<FillLayerStyle>(
    () => ({ fillColor: withAlpha(gameColors.rival, 0.26) }),
    [],
  );
  const rivalLine = useMemo<LineLayerStyle>(
    () => ({ lineColor: withAlpha(gameColors.rival, 0.85), lineWidth: 2, lineJoin: 'round' }),
    [],
  );
  // Le casing est un TRAIT, pas une ombre : il porte la ligne sur un fond clair
  // sans jamais la faire briller (AMENDEMENT-16 §0 — zéro halo).
  const traceCasing = useMemo<LineLayerStyle>(
    () => ({
      lineColor: colors.noir,
      lineWidth: TRACE_CASING_W,
      lineJoin: 'round',
      lineCap: 'round',
    }),
    [],
  );
  const traceCore = useMemo<LineLayerStyle>(
    () => ({
      lineColor: colors.chartreuse,
      lineWidth: TRACE_CORE_W,
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

        {/* 1. RIVAUX — dessous : ma zone et ma trace doivent rester lisibles
            par-dessus (§C, la couleur suit le RÔLE : orange = rival). */}
        {rivals ? (
          <ShapeSource id={SOURCE_RIVAUX} shape={rivals}>
            <FillLayer id={`${SOURCE_RIVAUX}-fill`} style={rivalFill} />
            <LineLayer id={`${SOURCE_RIVAUX}-line`} style={rivalLine} />
          </ShapeSource>
        ) : null}

        {territories ? (
          <ShapeSource id={SOURCE_ID} shape={territories}>
            <FillLayer id={`${SOURCE_ID}-fill`} style={fill} />
            <LineLayer id={`${SOURCE_ID}-line`} style={line} />
          </ShapeSource>
        ) : null}

        {/* 3. MON TRACÉ — au-dessus de tout : c'est l'objet que le coureur
            reconnaît comme SA sortie. Deux passes, casing puis cœur. */}
        {trace ? (
          <ShapeSource id={SOURCE_TRACE} shape={trace}>
            <LineLayer id={`${SOURCE_TRACE}-casing`} style={traceCasing} />
            <LineLayer id={`${SOURCE_TRACE}-core`} style={traceCore} />
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
