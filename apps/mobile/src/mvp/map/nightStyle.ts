/**
 * GRYD — FOND DE CARTE DE NUIT, EMBARQUÉ (plus téléchargé, plus patché).
 *
 * ── POURQUOI CE FICHIER EXISTE ────────────────────────────────────────────────
 * Avant : le premier écran de l'app téléchargeait `dark-matter-gl-style/style.json`
 * (~70 Ko) ET `voyager-gl-style/style.json` (~107 Ko) à CHAQUE démarrage à froid,
 * remplaçait `name_en` par `name` dans chaque `text-field` (sinon la carte est en
 * anglais), puis les écrans REMONTAIENT la carte quand la spec patchée arrivait.
 * Un aller-retour réseau + un remount sur le chemin critique du tout premier
 * écran — mesuré en preview le 26/07/2026 : 3 requêtes `style.json` pour un seul
 * fond affiché. Ici, le style est ÉCRIT : zéro fetch de style, zéro patch, zéro
 * remount, et les noms sont locaux (`{name}`) une bonne fois — Paris reste Paris,
 * München reste München.
 *
 * ── CE QUE CE STYLE EST (ET N'EST PAS) ────────────────────────────────────────
 * Ce n'est PAS dark-matter re-teinté : dark-matter est un fond TOUT-USAGE de
 * 93 couches. Ce qui fait l'efficacité d'un fond Strava/Uber, ce n'est pas le
 * fournisseur de tuiles (on garde CARTO, décision fondateur) ni le moteur
 * (MapLibre GL EST le fork ouvert de Mapbox GL) : c'est un style construit pour
 * UN SEUL métier. Ici : la voirie porte la lecture, le bâti et les POI s'effacent,
 * les labels sont rares — parce que le fond est un CANEVAS pour la couche de jeu.
 * Chez GRYD c'est plus vrai qu'ailleurs : la chartreuse (moi), l'orange (rival) et
 * le violet (contesté) DOIVENT dominer (RÈGLES §C). 25 couches au lieu de 93.
 *
 * ── DÉRIVÉ, JAMAIS INVENTÉ ────────────────────────────────────────────────────
 * Chaque `source-layer`, chaque champ et chaque filtre ci-dessous a été relu dans
 * le style CARTO servi le 26/07/2026 et dans le TileJSON du schéma
 * `carto.streets/v1` (14 vector_layers, `maxzoom` 14). Un nom de couche source
 * écrit de mémoire rend une carte NOIRE : les noms sont exacts au caractère près.
 * `glyphs` et `sprite` : le `glyphs` CARTO est CONSERVÉ (sans lui, aucun label —
 * et c'est aussi lui qui sert les piles de polices des libellés de JEU) ; le
 * `sprite` est OMIS volontairement — le sprite dark-matter ne contient qu'une
 * icône (`circle-11`) qu'aucune couche d'ici n'utilise, donc deux requêtes de
 * moins et aucun risque (le fond satellite tourne déjà sans sprite).
 *
 * ── COULEURS ──────────────────────────────────────────────────────────────────
 * TOUTES viennent des tokens `@klaim/shared` (`colors` / `mapTokens` / `withAlpha`).
 * La charte ne s'arrête pas au bord de la carte : une teinte écrite en dur dans un
 * fond est un bug au même titre qu'ailleurs. Verrouillé par `nightStyle.test.ts`.
 *
 * UI PURE — aucune règle de jeu, aucun nombre de `game-rules` (ces largeurs de
 * trait ne décident d'aucun claim).
 */
import { colors, mapTokens, withAlpha } from '@klaim/shared';

/**
 * Id de la source vectorielle. DOIT rester `carto` : le 3D (AMENDEMENT-27) monte
 * l'extrusion des bâtiments sur `MAP_3D.vectorSourceId`, qui vaut `carto` et qui
 * cherche cette source DANS le style servi (fork web). La renommer éteindrait les
 * bâtiments 3D en silence.
 */
export const BASEMAP_SOURCE_ID = 'carto';

/**
 * TileJSON du schéma CARTO `carto.streets/v1` (keyless, HTTP 200 revérifié le
 * 26/07/2026 — `maxzoom` 14, 14 vector_layers). On garde la référence par `url`
 * plutôt que d'inliner les gabarits `tiles-a…d` : CARTO peut faire tourner ses
 * hôtes, et c'est ce document qui porte l'attribution légale. Une requête, mise
 * en cache — ce n'est PAS le style, c'est l'index des tuiles.
 */
export const BASEMAP_TILEJSON_URL =
  'https://tiles.basemaps.cartocdn.com/vector/carto.streets/v1/tiles.json';

/**
 * Glyphes CARTO (keyless). INDISPENSABLE : sans `glyphs`, aucun label ne s'affiche
 * — ni ceux du fond, ni ceux des couches de JEU (les libellés de points GRYD
 * demandent la pile `Montserrat Medium, Open Sans Bold, Noto Sans Regular`,
 * servie 200 par cet endpoint).
 */
export const BASEMAP_GLYPHS_URL = 'https://tiles.basemaps.cartocdn.com/fonts/{fontstack}/{range}.pbf';

/**
 * Préfixe de TOUS les identifiants de couche de ce fond. Il garantit l'absence de
 * collision avec les couches de JEU (`terr-*`, `sector-*` et leurs dérivés
 * `-fill`/`-line`/`-extrude`), avec l'extrusion 3D (`gryd-3d-buildings`) et avec
 * le fond satellite (`gryd-satellite*`). Vérifié par test.
 */
export const BASEMAP_LAYER_PREFIX = 'gryd-base-';

/**
 * Piles de polices — celles du style CARTO source, dans le même ordre (une pile
 * inconnue de l'endpoint = labels muets). Vérifiées 200 sur le `glyphs` ci-dessus.
 */
const FONT_MEDIUM = ['Montserrat Medium', 'Open Sans Bold', 'Noto Sans Regular'];
const FONT_REGULAR = ['Montserrat Regular', 'Open Sans Regular', 'Noto Sans Regular'];

/**
 * Palette du fond, EXCLUSIVEMENT en tokens. Le nommage dit le RÔLE cartographique,
 * jamais la teinte : c'est ce qui permettra un jour une seconde palette sans
 * toucher à une seule géométrie.
 */
export interface BasemapPalette {
  /** Terre — le vide sur lequel tout se lit. */
  land: string;
  /** Végétation (bois, herbe, parcs) — NEUTRE : surtout pas de vert chartreuse,
   *  qui est la couleur de MON territoire (§C — la couleur dit le rôle de jeu). */
  green: string;
  water: string;
  /** Rive : c'est elle qui rend la Seine lisible quand l'eau est presque noire. */
  waterEdge: string;
  waterway: string;
  building: string;
  rail: string;
  /** Liseré sombre SOUS chaque rue : sépare les voies parallèles et les croisements. */
  roadCasing: string;
  roadPath: string;
  roadMinor: string;
  roadSecondary: string;
  roadPrimary: string;
  roadMajor: string;
  boundary: string;
  /** Libellé porteur (villes). */
  labelStrong: string;
  /** Libellé secondaire (quartiers, rues, eau) — recule derrière le jeu. */
  labelSoft: string;
  labelHalo: string;
}

/**
 * NUIT — le fond par DÉFAUT de GRYD. Terre quasi noire, voirie en gris NEUTRE
 * hiérarchisée (autoroute > primaire > secondaire > rue), bâti presque effacé,
 * labels rares. Aucune teinte du fond n'emprunte au vocabulaire de jeu
 * (chartreuse/orange/violet) : le fond ne dit jamais « à qui appartient quoi ».
 */
export const NIGHT_PALETTE: BasemapPalette = {
  land: colors.noir,
  green: mapTokens.parks,
  water: colors.eau,
  waterEdge: withAlpha(colors.blanc, 0.08),
  waterway: withAlpha(colors.blanc, 0.07),
  building: withAlpha(colors.blanc, 0.045),
  rail: withAlpha(colors.blanc, 0.06),
  roadCasing: colors.noir,
  roadPath: withAlpha(colors.blanc, 0.07),
  roadMinor: withAlpha(colors.blanc, 0.1),
  roadSecondary: withAlpha(colors.blanc, 0.15),
  roadPrimary: withAlpha(colors.blanc, 0.22),
  roadMajor: withAlpha(colors.blanc, 0.3),
  boundary: withAlpha(colors.blanc, 0.1),
  labelStrong: colors.gris,
  labelSoft: colors.grisFaible,
  labelHalo: colors.noir,
};

/** Palier `[zoom, valeur]` d'une rampe MapLibre. */
type Stops = readonly (readonly [number, number])[];

/** Rampe `interpolate` linéaire bornée hors plage (la forme MapLibre moderne). */
function ramp(stops: Stops): unknown[] {
  return ['interpolate', ['linear'], ['zoom'], ...stops.flatMap(([z, v]) => [z, v])];
}

/** Même rampe, élargie de `extra` px : le liseré sombre sous une rue. */
function casingRamp(stops: Stops, extra: number): unknown[] {
  return ramp(stops.map(([z, v]) => [z, v + extra] as const));
}

// ─── Largeurs de voirie (px écran) ──────────────────────────────────────────
// Dérivées des rampes dark-matter, mais RESSERRÉES : quatre familles au lieu de
// huit, et un écart NET entre elles — c'est l'écart qui fait la hiérarchie, pas
// l'épaisseur absolue. À z16 (échelle du coureur) : rue 2,8 px · secondaire 4 px
// · primaire 5,5 px · autoroute 7 px, sous un tracé de jeu de 22 px (§B).
const W_MAJOR: Stops = [
  [6, 0.6],
  [10, 1.4],
  [12, 2.4],
  [14, 4],
  [16, 7],
  [18, 13],
  [20, 22],
];
const W_PRIMARY: Stops = [
  [9, 0.5],
  [12, 1.6],
  [14, 3],
  [16, 5.5],
  [18, 10],
  [20, 17],
];
const W_SECONDARY: Stops = [
  [12, 0.8],
  [14, 2],
  [16, 4],
  [18, 7.5],
  [20, 13],
];
const W_MINOR: Stops = [
  [13, 0.5],
  [15, 1.6],
  [16, 2.8],
  [18, 6],
  [20, 11],
];
const W_PATH: Stops = [
  [15, 0.6],
  [17, 1.2],
  [20, 2.4],
];
/** Sur-largeur du liseré sombre sous une rue (px, de part et d'autre). */
const CASING_EXTRA_PX = 1.6;

/**
 * Une couche du fond. Type LOCAL et minimal : on ne dépend d'aucun typage
 * MapLibre (ce module doit rester testable en Deno, sans `maplibre-gl`).
 */
interface BasemapLayer {
  id: string;
  type: 'background' | 'fill' | 'line' | 'symbol';
  source?: string;
  'source-layer'?: string;
  minzoom?: number;
  maxzoom?: number;
  filter?: unknown[];
  layout?: Record<string, unknown>;
  paint?: Record<string, unknown>;
}

/** Style MapLibre complet (forme minimale — sérialisé tel quel). */
export interface BasemapStyleSpec {
  version: 8;
  name: string;
  glyphs: string;
  sources: Record<string, { type: 'vector'; url: string }>;
  layers: BasemapLayer[];
}

/** Fabrique une paire liseré + surface pour une famille de voirie. */
function roadPair(
  key: string,
  filter: unknown[],
  minzoom: number,
  widths: Stops,
  color: string,
  palette: BasemapPalette,
): BasemapLayer[] {
  const common = {
    source: BASEMAP_SOURCE_ID,
    'source-layer': 'transportation',
    minzoom,
    filter,
    // Jointures ET extrémités arrondies : un réseau qui « coule », jamais anguleux.
    layout: { 'line-cap': 'round', 'line-join': 'round' },
  } as const;
  return [
    {
      id: `${BASEMAP_LAYER_PREFIX}road-${key}-casing`,
      type: 'line',
      ...common,
      paint: { 'line-color': palette.roadCasing, 'line-width': casingRamp(widths, CASING_EXTRA_PX) },
    },
    {
      id: `${BASEMAP_LAYER_PREFIX}road-${key}`,
      type: 'line',
      ...common,
      paint: { 'line-color': color, 'line-width': ramp(widths) },
    },
  ];
}

/** Fabrique une couche de libellé (les 7 seules de ce style). */
function label(
  key: string,
  sourceLayer: string,
  filter: unknown[],
  sizes: Stops,
  color: string,
  palette: BasemapPalette,
  opts: {
    minzoom?: number;
    maxzoom?: number;
    font?: string[];
    uppercase?: boolean;
    letterSpacing?: number;
    alongLine?: boolean;
  } = {},
): BasemapLayer {
  return {
    id: `${BASEMAP_LAYER_PREFIX}label-${key}`,
    type: 'symbol',
    source: BASEMAP_SOURCE_ID,
    'source-layer': sourceLayer,
    ...(opts.minzoom !== undefined ? { minzoom: opts.minzoom } : {}),
    ...(opts.maxzoom !== undefined ? { maxzoom: opts.maxzoom } : {}),
    filter,
    layout: {
      // NOM LOCAL, écrit dans le style — c'est ce qui remplace définitivement le
      // patch `name_en` → `name` fait à chaud à chaque démarrage.
      'text-field': '{name}',
      'text-font': opts.font ?? FONT_REGULAR,
      'text-size': ramp(sizes),
      'text-max-width': 8,
      ...(opts.uppercase ? { 'text-transform': 'uppercase' } : {}),
      ...(opts.letterSpacing !== undefined ? { 'text-letter-spacing': opts.letterSpacing } : {}),
      ...(opts.alongLine
        ? { 'symbol-placement': 'line', 'symbol-spacing': 260, 'text-keep-upright': true }
        : {}),
    },
    paint: {
      'text-color': color,
      'text-halo-color': palette.labelHalo,
      'text-halo-width': 1.2,
    },
  };
}

/**
 * Construit le style COMPLET du fond GRYD pour une palette.
 *
 * ORDRE DE PEINTURE (le premier dessous) : terre → végétation → eau → rive →
 * bâti → rail → chemins → rues → secondaires → primaires → axes → frontières →
 * labels. Les couches de JEU sont ajoutées PAR-DESSUS par les écrans (les forks
 * RealMap les `addLayer` sans `beforeId` → elles arrivent en dernier) : ce style
 * ne referme jamais rien au-dessus d'elles.
 */
export function buildBasemapStyle(palette: BasemapPalette, name: string): BasemapStyleSpec {
  const src = { source: BASEMAP_SOURCE_ID } as const;
  const layers: BasemapLayer[] = [
    {
      id: `${BASEMAP_LAYER_PREFIX}background`,
      type: 'background',
      paint: { 'background-color': palette.land },
    },
    // Végétation : bois / herbe / terrains de sport, une seule couche (dark-matter
    // en avait quatre). Filtre repris à l'identique du style source.
    {
      id: `${BASEMAP_LAYER_PREFIX}landcover`,
      type: 'fill',
      ...src,
      'source-layer': 'landcover',
      filter: [
        'any',
        ['==', 'class', 'wood'],
        ['==', 'class', 'grass'],
        ['==', 'subclass', 'recreation_ground'],
      ],
      paint: { 'fill-color': palette.green },
    },
    {
      id: `${BASEMAP_LAYER_PREFIX}park`,
      type: 'fill',
      ...src,
      'source-layer': 'park',
      minzoom: 8,
      filter: ['in', 'class', 'national_park', 'nature_reserve'],
      paint: { 'fill-color': palette.green },
    },
    {
      id: `${BASEMAP_LAYER_PREFIX}water`,
      type: 'fill',
      ...src,
      'source-layer': 'water',
      filter: ['==', '$type', 'Polygon'],
      paint: { 'fill-color': palette.water },
    },
    // Rive : l'eau de nuit est presque noire — sans ce trait, la Seine disparaît.
    {
      id: `${BASEMAP_LAYER_PREFIX}water-edge`,
      type: 'line',
      ...src,
      'source-layer': 'water',
      minzoom: 9,
      filter: ['==', '$type', 'Polygon'],
      paint: {
        'line-color': palette.waterEdge,
        'line-width': ramp([
          [9, 0.4],
          [14, 0.8],
          [18, 1.4],
        ]),
      },
    },
    {
      id: `${BASEMAP_LAYER_PREFIX}waterway`,
      type: 'line',
      ...src,
      'source-layer': 'waterway',
      minzoom: 9,
      paint: {
        'line-color': palette.waterway,
        'line-width': ramp([
          [9, 0.5],
          [14, 1.2],
          [18, 2.6],
        ]),
      },
    },
    // Bâti : une TEXTURE, pas une information. Naît à z15, jamais dominant — et en
    // 3D c'est l'extrusion (AMENDEMENT-27) qui prend le relais par-dessus.
    {
      id: `${BASEMAP_LAYER_PREFIX}building`,
      type: 'fill',
      ...src,
      'source-layer': 'building',
      minzoom: 15,
      paint: {
        'fill-color': palette.building,
        'fill-opacity': ramp([
          [15, 0],
          [17, 1],
        ]),
      },
    },
    {
      id: `${BASEMAP_LAYER_PREFIX}rail`,
      type: 'line',
      ...src,
      'source-layer': 'transportation',
      minzoom: 13,
      filter: ['all', ['==', 'class', 'rail'], ['!=', 'brunnel', 'tunnel']],
      paint: {
        'line-color': palette.rail,
        'line-width': ramp([
          [13, 0.5],
          [16, 1.2],
          [20, 3],
        ]),
      },
    },
    // Chemins / sentiers : pointillé discret — utile au coureur, jamais une rue.
    {
      id: `${BASEMAP_LAYER_PREFIX}road-path`,
      type: 'line',
      ...src,
      'source-layer': 'transportation',
      minzoom: 15,
      filter: ['in', 'class', 'path', 'track'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': palette.roadPath,
        'line-width': ramp(W_PATH),
        'line-dasharray': [2, 2],
      },
    },
    // Voirie, du plus fin au plus large : l'ordre EST la hiérarchie (un axe passe
    // au-dessus d'une rue à chaque croisement).
    ...roadPair(
      'minor',
      ['in', 'class', 'minor', 'service'],
      13,
      W_MINOR,
      palette.roadMinor,
      palette,
    ),
    ...roadPair(
      'secondary',
      ['in', 'class', 'secondary', 'tertiary'],
      12,
      W_SECONDARY,
      palette.roadSecondary,
      palette,
    ),
    ...roadPair('primary', ['==', 'class', 'primary'], 9, W_PRIMARY, palette.roadPrimary, palette),
    ...roadPair(
      'major',
      ['in', 'class', 'motorway', 'trunk'],
      6,
      W_MAJOR,
      palette.roadMajor,
      palette,
    ),
    {
      id: `${BASEMAP_LAYER_PREFIX}boundary-country`,
      type: 'line',
      ...src,
      'source-layer': 'boundary',
      minzoom: 2,
      filter: ['all', ['==', 'admin_level', 2], ['==', 'maritime', 0]],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': palette.boundary,
        'line-width': ramp([
          [2, 0.5],
          [6, 1],
          [10, 1.6],
        ]),
      },
    },
    // ── LABELS : sept, et pas un de plus. Pays et villes pour s'orienter au
    //    dézoom ; quartiers et noms de rues au niveau où l'on court ; l'eau
    //    nommée parce qu'un canal est un repère. Tout le reste (POI, numéros de
    //    rue, États, continents, pastilles de ville) est ABSENT : sur un canevas
    //    de jeu, ce sont des concurrents, pas des repères.
    label(
      'country',
      'place',
      ['==', 'class', 'country'],
      [
        [2, 11],
        [5, 14],
      ],
      palette.labelSoft,
      palette,
      { minzoom: 2, maxzoom: 5, font: FONT_MEDIUM, uppercase: true, letterSpacing: 0.16 },
    ),
    label(
      'city',
      'place',
      ['==', 'class', 'city'],
      [
        [5, 11],
        [8, 14],
        [12, 18],
        [15, 22],
      ],
      palette.labelStrong,
      palette,
      { minzoom: 5, maxzoom: 15, font: FONT_MEDIUM, uppercase: true, letterSpacing: 0.08 },
    ),
    label(
      'town',
      'place',
      ['in', 'class', 'town', 'village'],
      [
        [10, 10],
        [13, 13],
        [15, 15],
      ],
      palette.labelSoft,
      palette,
      { minzoom: 10, maxzoom: 15, font: FONT_MEDIUM },
    ),
    label(
      'neighbourhood',
      'place',
      ['in', 'class', 'suburb', 'neighbourhood', 'quarter'],
      [
        [13, 10],
        [16, 13],
      ],
      palette.labelSoft,
      palette,
      { minzoom: 13, maxzoom: 17, uppercase: true, letterSpacing: 0.1 },
    ),
    label(
      'water',
      'water_name',
      ['all', ['has', 'name'], ['==', '$type', 'Point']],
      [
        [10, 10],
        [14, 12],
        [17, 14],
      ],
      palette.labelSoft,
      palette,
      { minzoom: 10 },
    ),
    label(
      'road-major',
      'transportation_name',
      ['in', 'class', 'motorway', 'trunk', 'primary'],
      [
        [13, 9],
        [16, 11],
        [18, 13],
      ],
      palette.labelSoft,
      palette,
      { minzoom: 13, alongLine: true },
    ),
    label(
      'road-minor',
      'transportation_name',
      ['in', 'class', 'secondary', 'tertiary', 'minor'],
      [
        [16, 9],
        [18, 11],
      ],
      palette.labelSoft,
      palette,
      { minzoom: 16, alongLine: true },
    ),
  ];

  return {
    version: 8,
    name,
    glyphs: BASEMAP_GLYPHS_URL,
    sources: { [BASEMAP_SOURCE_ID]: { type: 'vector', url: BASEMAP_TILEJSON_URL } },
    layers,
  };
}

/**
 * Le style de NUIT, construit UNE fois par process (objet gelé côté consommateur :
 * MapLibre reçoit toujours la chaîne JSON, jamais cet objet, donc personne ne peut
 * le muter par accident).
 */
let nightSpec: BasemapStyleSpec | null = null;
export function grydNightStyle(): BasemapStyleSpec {
  if (nightSpec === null) nightSpec = buildBasemapStyle(NIGHT_PALETTE, 'GRYD Night');
  return nightSpec;
}

/** Le même, sérialisé (les deux forks RealMap consomment une chaîne de style). */
let nightJson: string | null = null;
export function grydNightStyleJson(): string {
  if (nightJson === null) nightJson = JSON.stringify(grydNightStyle());
  return nightJson;
}
