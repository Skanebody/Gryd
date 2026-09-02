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
 * ─── LA CAMÉRA : UNE FOIS, PUIS PLUS JAMAIS ─────────────────────────────────
 * `defaultSettings` ne s'applique qu'au MONTAGE — et `center` n'arrive qu'après
 * (l'écran le lit dans un effet). La carte ouvrait donc TOUJOURS sur le repli de
 * ville, pour tout le monde : `ZOOM_EGO` n'était jamais appliqué et une boucle
 * de quelques centaines de m² tenait dans un pixel.
 *
 * La parade n'est PAS de rendre la caméra contrôlée. Une prop `centerCoordinate`
 * recréée à chaque rendu ré-applique un `easeTo` en plein pincement, et « le zoom
 * revient en arrière » — c'est le bug que `defaultSettings` évitait, et il ne
 * doit pas revenir. Donc : `defaultSettings` pour le montage, PLUS un appel
 * IMPÉRATIF déclenché UNE SEULE FOIS, à la première cible réelle. La garde est
 * un `useRef` booléen, et le déclencheur une CLÉ DE VALEUR (`framingKey`), jamais
 * l'identité de `territories` — qui, elle, change à chaque lecture.
 *
 * Après ce cadrage, la caméra appartient au joueur. Le seul code qui la touche
 * encore est `recadrer()`, et il ne part que d'un tap.
 *
 * ─── CE QU'IL NE DÉCIDE PAS ─────────────────────────────────────────────────
 * Il ne décide RIEN. Ni s'il y a un territoire (`homeState`), ni quoi dire quand
 * il n'y en a pas (l'écran), ni OÙ REGARDER (`openingFraming`, du même module
 * pur). Il reçoit une géométrie ou `null`, et `null` ne signifie jamais « vide »
 * ici : il signifie « rien à peindre », ce qui est vrai pendant un chargement
 * comme après un échec. C'est l'écran, seul, qui parle.
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Camera,
  FillLayer,
  LineLayer,
  MapView,
  ShapeSource,
  UserLocation,
  type CameraRef,
  type FillLayerStyle,
  type LineLayerStyle,
} from '@maplibre/maplibre-react-native';
import {
  colors,
  fonts,
  fontSizes,
  gameColors,
  motion,
  radii,
  sizes,
  spacing,
  withAlpha,
} from '@klaim/shared';
import { framingKey, openingFraming, type MapFraming } from './homeState';
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

/**
 * Ce que l'écran peut demander à la carte — rien de plus.
 *
 * Une SEULE méthode, et elle ne prend aucun paramètre : l'écran ne choisit pas
 * où la caméra va (ce serait rouvrir la porte à un pilotage continu), il demande
 * seulement à REJOUER le cadrage que `openingFraming` a déjà décidé.
 */
export interface MapCanvasHandle {
  readonly recadrer: () => void;
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

/**
 * Marge autour de l'emprise cadrée, en points — `[haut, droite, bas, gauche]`.
 *
 * Le bandeau du haut et le pied du bas sont posés SUR la carte : cadrer au ras
 * des bornes glisserait le tiers du territoire sous eux. `sizes.buttonLg` est la
 * hauteur d'un bloc de commande, donc l'ordre de grandeur de ce que chacun
 * couvre ; les côtés gardent la marge d'écran.
 */
const CADRAGE_MARGE_PT = [sizes.buttonLg, spacing.lg, sizes.buttonLg, spacing.lg];

export const MapCanvas = forwardRef<MapCanvasHandle, MapCanvasProps>(function MapCanvas(
  { center, zoom, territories, trace, rivals, showUser },
  ref,
) {
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

  // ── LA CAMÉRA, UNE SEULE FOIS ────────────────────────────────────────────
  const cameraRef = useRef<CameraRef | null>(null);
  /** A-t-on DÉJÀ cadré ? Une fois vrai, plus rien du code ne bouge la caméra. */
  const cadreFait = useRef(false);
  /** La cible la plus récente, pour le recentrage À LA DEMANDE (jamais auto). */
  const cibleRef = useRef<MapFraming | null>(null);

  const cible = openingFraming({ territories, center, zoom });
  // ⚠️ LA CLÉ, PAS L'OBJET. `territories` est recréé à chaque lecture ; un effet
  // qui dépendrait de son identité repartirait à chaque re-rendu du parent et
  // ré-appliquerait la caméra pendant que le joueur pince.
  const cleCible = framingKey(cible);

  const appliquer = useCallback((cadre: MapFraming | null): boolean => {
    const camera = cameraRef.current;
    if (camera === null || cadre === null) return false;
    if (cadre.kind === 'bounds') {
      camera.fitBounds(
        [cadre.ne.lng, cadre.ne.lat],
        [cadre.sw.lng, cadre.sw.lat],
        CADRAGE_MARGE_PT,
        motion.transitionMs,
      );
      return true;
    }
    camera.setCamera({
      centerCoordinate: [cadre.center.lng, cadre.center.lat],
      zoomLevel: cadre.zoom,
      animationMode: 'easeTo',
      animationDuration: motion.transitionMs,
    });
    return true;
  }, []);

  // Le miroir est déclaré AVANT l'effet de cadrage : les effets s'exécutent dans
  // l'ordre de déclaration, donc la cible lue plus bas est celle du rendu commis.
  useEffect(() => {
    cibleRef.current = cible;
  });

  useEffect(() => {
    if (cadreFait.current || cleCible === null) return;
    // ⚠️ LE DRAPEAU NE SE LÈVE QUE SI L'ORDRE EST PARTI. React attache les refs
    // pendant la phase de commit, donc AVANT cet effet : la caméra est là.
    // C'est une ceinture, pas un trou — mais marquer « cadré » sans avoir cadré
    // consommerait l'unique tour, et la carte resterait à jamais sur Rouen.
    if (appliquer(cibleRef.current)) cadreFait.current = true;
  }, [cleCible, appliquer]);

  useImperativeHandle(
    ref,
    () => ({
      recadrer: () => {
        appliquer(cibleRef.current);
      },
    }),
    [appliquer],
  );

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
        {/* `defaultSettings` = appliqué au MONTAGE seulement, et il le reste :
            une caméra CONTRÔLÉE se battrait contre les doigts du joueur à
            chaque rendu. Ce qui manquait n'était pas une prop, c'était l'ordre
            IMPÉRATIF donné une fois — voir l'effet de cadrage plus haut. */}
        <Camera
          ref={cameraRef}
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
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  // ⚠️ CE TEXTE N'A AUCUN FOND GARANTI SANS CE VOILE. `colors.grisFaible`
  // atteint 4,54:1 sur le NOIR PUR de l'app — mais l'attribution n'est pas
  // posée sur l'app : elle est posée sur des TUILES, dont la teinte dépend du
  // fond de carte, du zoom, et de ce qu'il y a sous le coin bas-gauche (un parc
  // clair, un plan d'eau, un bâtiment). Le contraste mesuré à plat ne dit donc
  // rien du contraste réel. Un voile local garantit le rapport quelle que soit
  // la tuile — et il ne coûte qu'un rectangle de 12 pt de haut, sur une mention
  // qu'on est LÉGALEMENT tenu de rendre lisible (ODbL / CARTO).
  attribution: {
    position: 'absolute',
    left: spacing.sm,
    bottom: spacing.xs,
    color: colors.grisFaible,
    fontFamily: fonts.text,
    fontSize: fontSizes.xs,
    backgroundColor: withAlpha(colors.noir, 0.55),
    paddingHorizontal: spacing.xxs,
    borderRadius: radii.sm,
  },
});
