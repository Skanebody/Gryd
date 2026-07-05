/**
 * GRYD — styles de tracé de la Battle Map (AMENDEMENT-08 §4, doc §7).
 * TOUTES les couleurs sont DÉRIVÉES des tokens @klaim/shared (charte : toute
 * couleur hors tokens = bug) : `withAlpha` ne fait que décliner un token hex
 * en rgba — aucune teinte nouvelle. La couleur lit l'ÉTAT DE JEU :
 * chartreuse = mon crew, rival = orange sombre, contesté = rare/événement,
 * danger = decay urgent, verify = protection/info.
 * Partagé entre MapScreen natif (MapLibre) et MapScreen.web (SVG).
 */
import { colors, gameColors, mapTokens } from '@klaim/shared';
import type { RealMapGeoJSONLayer } from '../../ui/game';
import { territoryGeoByState } from './allTerritories';
import { MAP_BONUS_ZONE, PARCOURS_DEMO } from './demo';
import { battleMapData } from './fakeHexes';
import { REAL_M_PER_DEG_LAT, REAL_M_PER_DEG_LNG, type LatLngPoint } from './realAnchors';
import { type ModeEmphasis, type TerritoryState } from './territory';

/**
 * Fonds de carte VECTORIELS disponibles (demande fondateur : « la carte en
 * couleur comme sur Plan d'iPhone »). Deux styles vectoriels de dev SANS CLÉ,
 * servis par les DEUX forks RealMap selon la préférence utilisateur (mapPref) :
 *   dark  — CARTO dark-matter : l'esthétique GRYD dark-first par DÉFAUT (le
 *           même styleURL qu'historiquement, surchargé aux tokens au chargement).
 *   color — CARTO Voyager : rues/parcs/eau colorés type Apple Plan / Google Maps
 *           (fond clair/beige — sur ce fond les traits de jeu chartreuse
 *           reçoivent un liseré sombre porteur, cf. `colorCasing` plus bas).
 * La prod passera à Protomaps (O6) en ne changeant QUE ces deux URLs.
 *
 * Le fond `satellite` (AMENDEMENT-28) n'est PAS ici : ce n'est pas un style
 * vectoriel mais une source RASTER (photos aériennes Esri) — il est construit à
 * la volée par `satelliteStyleSpec()` plus bas (StyleSpecification MapLibre).
 */
export const MAP_BASEMAP_STYLES = {
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  color: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
} as const;

/**
 * Clé de fond de carte : 'dark' (défaut, dark-matter) | 'color' (Voyager) |
 * 'satellite' (photos aériennes réelles Esri, AMENDEMENT-28). `satellite`
 * s'ajoute aux deux clés vectorielles de MAP_BASEMAP_STYLES.
 */
export type BasemapKey = keyof typeof MAP_BASEMAP_STYLES | 'satellite';

/** Toutes les clés de fond, dans l'ordre de cycle (dark → color → satellite). */
export const BASEMAP_KEYS: readonly BasemapKey[] = ['dark', 'color', 'satellite'];

/**
 * AMENDEMENT-28 — VUE RÉALISTE : fond SATELLITE keyless (vraies photos
 * aériennes). Source raster PUBLIQUE Esri World Imagery — SANS CLÉ, attribution
 * requise (comme CARTO/Terrarium sont documentés en source dev ; prod = provider
 * dédié O6). Tuiles 256 px, ordre {z}/{y}/{x} (schéma ArcGIS). En 3D, ce raster
 * se DRAPE sur le terrain DEM Terrarium (MAP_3D) — vue Strava/hybride.
 */
export const SATELLITE_BASEMAP = {
  /** Id de la source raster dans le style construit. */
  sourceId: 'gryd-satellite',
  /** Id du layer raster (le fond photo, peint tout en bas). */
  layerId: 'gryd-satellite-layer',
  /**
   * Gabarit de tuiles Esri World Imagery (keyless — HTTP 200 vérifié). L'ordre
   * ArcGIS est {z}/{y}/{x} (y avant x — piège classique de cette source).
   */
  tiles: [
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  ] as const,
  tileSize: 256,
  /** Esri World Imagery monte jusqu'à ~z19 en couverture urbaine. */
  maxZoom: 19,
  /** Attribution LÉGALE obligatoire de la source imagerie. */
  attribution: 'Esri, Maxar, Earthstar Geographics',
} as const;

/**
 * AMENDEMENT-28 — Style MapLibre COMPLET du fond satellite : une unique source
 * raster Esri + un layer raster plein écran. Le `glyphs` CARTO (keyless) est
 * fourni pour que d'éventuels labels/symboles GRYD (calques de points) trouvent
 * leurs polices — le raster n'a pas de labels vectoriels, la ville se lit dans
 * la photo (labels de rues DISCRETS = affaire de la photo, pas de couche à
 * éteindre). Retourné en objet (MapLibre accepte URL string OU StyleSpecification)
 * → aucun fichier de style à héberger, keyless de bout en bout.
 */
export function satelliteStyleSpec(): Record<string, unknown> {
  return {
    version: 8,
    // Polices keyless CARTO (mêmes stacks que dark-matter → labels de points OK).
    glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
    sources: {
      [SATELLITE_BASEMAP.sourceId]: {
        type: 'raster',
        tiles: [...SATELLITE_BASEMAP.tiles],
        tileSize: SATELLITE_BASEMAP.tileSize,
        maxzoom: SATELLITE_BASEMAP.maxZoom,
        attribution: SATELLITE_BASEMAP.attribution,
      },
    },
    layers: [
      // Fond noir sous le raster (bord du monde / tuiles manquantes → jamais blanc).
      {
        id: 'gryd-satellite-bg',
        type: 'background',
        paint: { 'background-color': colors.noir },
      },
      {
        id: SATELLITE_BASEMAP.layerId,
        type: 'raster',
        source: SATELLITE_BASEMAP.sourceId,
      },
    ],
  };
}

/**
 * AMENDEMENT-27 — VRAI 3D (relief + bâtiments), constantes de source/rendu.
 * UI pure — aucune règle de jeu ; keyless (dev, comme CARTO). En prod, un
 * provider de tuiles/DEM propre = point ouvert O6. N'est CONSOMMÉ qu'en mode 3D
 * par les DEUX forks RealMap ; la 2D ne touche jamais à ces valeurs.
 *
 * Inspection live (05/07/2026, preview mobile-web, Paris z16.5) : la source
 * vectorielle CARTO utilisée (id `carto`, `tiles.basemaps.cartocdn.com`,
 * schéma OpenMapTiles) EXPOSE une source-layer `building` avec `render_height`
 * (0–96 m à Paris), `render_min_height` et un flag `hide_3d` → extrusion RÉELLE
 * sans fallback ni source alternative. Le DEM (relief) vient d'AWS Terrarium.
 */
export const MAP_3D = {
  /** Id de la source vectorielle CARTO (identique dark-matter & Voyager). */
  vectorSourceId: 'carto',
  /** Source-layer OpenMapTiles des empreintes de bâtiments (avec hauteurs). */
  buildingSourceLayer: 'building',
  /**
   * TileJSON de la source vectorielle CARTO (keyless — HTTP 200 vérifié). Le
   * fork WEB réutilise la source `carto` DÉJÀ dans le style (setStyle la remonte)
   * ; le fork NATIF, lui, monte sa PROPRE `VectorSource` pointant cette URL (id
   * dédié `dem/buildings`) car il ne peut pas référencer la source interne du
   * style par nom. Même schéma OpenMapTiles → mêmes champs `render_height`.
   */
  vectorTileJsonUrl: 'https://tiles.basemaps.cartocdn.com/vector/carto.streets/v1/tiles.json',
  /** Id de la source vectorielle DÉDIÉE au fork natif (évite le clash avec `carto`). */
  nativeVectorSourceId: 'gryd-3d-vector',
  /**
   * Relief du terrain (DEM) — AWS Terrarium, PUBLIC & SANS CLÉ (tile z12
   * vérifiée : HTTP 200, ~100 Ko). Encodage terrarium, tuiles 256 px.
   */
  demSourceId: 'gryd-dem-terrarium',
  demTiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'] as const,
  demEncoding: 'terrarium' as const,
  demTileSize: 256,
  /** Résolution native max du DEM Terrarium (z15) — sur-zoomée au niveau rue. */
  demMaxZoom: 15,
  /** Exagération du relief : modérée (Paris ≈ plat, réel dès qu'il y a du dénivelé). */
  demExaggeration: 1.3,
} as const;

/**
 * AMENDEMENT-27 — Rendu des bâtiments 3D (charte : SOMBRES/désaturés, ils
 * restent en FOND ; la chartreuse — trace + zones de jeu — reste dominante et
 * passe DEVANT). Couleur dérivée du token `gameColors.carbon` (gris carbone de
 * scène de jeu) — aucune teinte hors tokens. Hauteur = `render_height` (défaut
 * doux si absente/0), base = `render_min_height`, `hide_3d` exclu.
 */
export const buildings3dStyle = {
  /** Aplat des façades — carbone désaturé (fond), token only. */
  fillColor: gameColors.carbon,
  /** Translucide : les rues/labels restent devinables sous le volume. */
  fillOpacity: 0.85,
  /** Hauteur de repli quand la tuile n'a pas de hauteur exploitable (≈ 2 niveaux). */
  defaultHeightM: 6,
} as const;

/**
 * Attribution LÉGALE à afficher selon le fond actif (obligation des sources) :
 * données © OpenStreetMap © CARTO pour les fonds vectoriels dark/color, et
 * l'imagerie Esri (Maxar/Earthstar) pour le fond satellite (AMENDEMENT-28).
 * Utilisé par la mention compacte des forks RealMap.
 */
export function basemapAttribution(basemap: BasemapKey | undefined): string {
  return basemap === 'satellite'
    ? `© ${SATELLITE_BASEMAP.attribution}`
    : '© OpenStreetMap © CARTO';
}

/** Décline un token `#RRGGBB` en rgba — n'accepte QUE des tokens hex 6 digits. */
export function withAlpha(tokenHex: string, alpha: number): string {
  const r = parseInt(tokenHex.slice(1, 3), 16);
  const g = parseInt(tokenHex.slice(3, 5), 16);
  const b = parseInt(tokenHex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Atténue une couleur DÉJÀ dérivée d'un token (`withAlpha` / rgba des tokens)
 * par un facteur 0-1 : c'est l'emphase des MODES de carte (AMENDEMENT-11 §3)
 * appliquée aux frontières MapLibre (RealMap n'expose pas de lineOpacity — on
 * multiplie l'alpha de la teinte, aucune teinte nouvelle n'est créée).
 */
export function scaleAlpha(color: string, factor: number): string {
  if (factor >= 1) return color;
  if (color.startsWith('#')) return withAlpha(color, factor);
  const m = color.match(/^rgba\((\d+),(\d+),(\d+),([0-9.]+)\)$/);
  if (!m) return color;
  const alpha = Math.min(1, Number(m[4]) * factor);
  return `rgba(${m[1]},${m[2]},${m[3]},${alpha})`;
}

/**
 * TERRITOIRES ORGANIQUES (AMENDEMENT-11 §2, doc §7-§8) : aplats sombres teintés
 * par état (opacité faible — la ville reste lisible dessous) + traitements de
 * FRONTIÈRE par état. Consommé par MapScreen.web (SVG) et MapScreen (MapLibre).
 */
export const territoryStyle = {
  // Ton crew : aplat chartreuse discret + frontière fine semi-lumineuse.
  // AMENDEMENT-16 §0 : ZÉRO halo/glow — un trait net + un remplissage faible.
  crewFill: mapTokens.mineFill,
  crewStroke: withAlpha(colors.chartreuse, 0.55),

  // Rival : frontière orange MARQUÉE (l'état se lit à la frontière).
  rivalFill: withAlpha(gameColors.rival, 0.13),
  rivalStroke: withAlpha(gameColors.rival, 0.8),

  // Contesté : double contour chartreuse + orange (l'orange pulse lentement).
  contestedFill: withAlpha(gameColors.contested, 0.13),
  contestedInnerStroke: withAlpha(colors.chartreuse, 0.7),
  contestedOuterStroke: withAlpha(gameColors.rival, 0.8),

  // Protégé : trait verify NET le long du tracé (1 icône shield par secteur —
  // AMENDEMENT-16 §0 : plus de halo, la teinte verify du trait dit l'état).
  protectedStroke: withAlpha(gameColors.verify, 0.4),

  // Zone à défendre (decay) : frontière pointillée — muted red si urgent.
  decayStroke: withAlpha(colors.blanc, 0.45),
  decayUrgentStroke: withAlpha(gameColors.danger, 0.85),
  decayUrgentFill: withAlpha(gameColors.danger, 0.08),

  // Objectif : zone chaude DOUCE (aplat très léger). AMENDEMENT-21 (écran
  // mission) : encore atténué — la carte n'affiche FORT que ma position, la
  // zone ciblée, la route et le point d'arrivée ; le reste recède (moins de
  // superpositions vertes).
  objectiveFill: withAlpha(colors.chartreuse, 0.06),
  objectiveSoft: withAlpha(colors.chartreuse, 0.05),

  // Avant-poste : petit blob organique tenu par mon crew (secondaire → discret).
  outpostFill: withAlpha(colors.chartreuse, 0.07),
  outpostStroke: withAlpha(colors.chartreuse, 0.32),

  // Route ouverte : ligne ÉPAISSE (route-first, lisible au soleil) — c'est le
  // trait FORT de l'écran mission (le chemin à courir maintenant).
  routeStroke: withAlpha(colors.chartreuse, 0.9),
  routeDot: colors.chartreuse,

  // Zone bonus (1 MAX — anti-bruit) : anneau or pointillé pulsé, atténué en
  // écran mission (le bonus vit surtout en micro-ligne dans la card).
  bonusFill: withAlpha(gameColors.gold, 0.08),
  bonusStroke: withAlpha(gameColors.gold, 0.55),

  // Aperçu du parcours sélectionné (sheet) : gris clair sur liseré sombre.
  parcoursCasing: withAlpha(colors.noir, 0.5),
  parcoursPreview: colors.gris,

  /**
   * Liseré SOMBRE porteur des traits de jeu sur les fonds CLAIRS/colorés —
   * charte : jamais de chartreuse sur fond clair (contraste 1,2:1). Une line
   * noire semi-opaque ~1 px plus large, peinte SOUS le trait (comme le casing de
   * route) garantit la lisibilité ; le trait reste le token de l'état
   * (chartreuse/orange/verify…). Inutile sur le fond sombre (le noir ambiant
   * fait déjà casing) — ces couches ne sont ajoutées que sur `color` OU
   * `satellite` (AMENDEMENT-28 : le satellite est clair/coloré → même besoin).
   * Sur satellite (photo bruitée, contrastée), le liseré est un cran PLUS opaque
   * pour tenir face aux zones claires (toits, sable, béton).
   */
  colorCasing: withAlpha(colors.noir, 0.55),
  /** Liseré satellite : plus dense (la photo est plus contrastée que Voyager). */
  satelliteCasing: withAlpha(colors.noir, 0.72),
} as const;

/** Sur-largeur du liseré sombre (px de part et d'autre du trait) — fin. */
const COLOR_CASING_EXTRA_PX = 2;
/** Sur-largeur du liseré sur SATELLITE (AMENDEMENT-28) : un cran plus large (photo contrastée). */
const SATELLITE_CASING_EXTRA_PX = 3;

export const battleMapStyle = {
  // Mon crew (chartreuse — trait net, AMENDEMENT-16 §0 : zéro glow)
  heldFill: mapTokens.mineFill,
  heldStroke: mapTokens.mineStroke,

  // Rival (orange sombre — état de jeu, pas décor)
  rivalFill: withAlpha(gameColors.rival, 0.1),
  rivalStroke: withAlpha(gameColors.rival, 0.42),

  // Contesté (teinte rare + double contour crew/rival, contour rival pulsé)
  contestedFill: withAlpha(gameColors.contested, 0.1),
  contestedInnerStroke: mapTokens.mineStroke,
  contestedOuterStroke: withAlpha(gameColors.rival, 0.7),

  // Decay (pointillé ; muted red si urgent)
  decayStroke: withAlpha(colors.blanc, 0.35),
  decayUrgentStroke: withAlpha(gameColors.danger, 0.8),
  decayUrgentFill: withAlpha(gameColors.danger, 0.07),

  // Objectif crew (trait chartreuse sur zone neutre)
  objectiveStroke: mapTokens.mineStroke,

  // Avant-poste (marker hexagonal discret)
  outpostFill: mapTokens.foeFill,
  outpostStroke: withAlpha(colors.blanc, 0.5),

  // Route ouverte (ligne GPS chartreuse + points de liaison)
  routeStroke: withAlpha(colors.chartreuse, 0.85),
  routeDot: colors.chartreuse,

  // Grille neutre — à l'échelle coureur (hex ≈ 30 px) le trait token 5 %
  // disparaît : légère remontée, même dérivation withAlpha que le reste.
  neutralStroke: withAlpha(colors.blanc, 0.09),

  // ── Basemap Uber-night (AMENDEMENT-09 §0) — plan de quartier sombre ──
  /** Fond de carte : la rue est le vide entre les îlots. */
  ground: colors.noir,
  /** Aplat des îlots urbains (surface carbon de scène de jeu — token). */
  block: gameColors.carbon,
  /** Liseré subtil des îlots (définit visuellement le bord des rues). */
  blockEdge: withAlpha(colors.blanc, 0.03),
  /** Creusage des axes/rues hors trame à travers les îlots (couleur fond). */
  streetCasing: colors.noir,
  /** Surface des axes larges : légèrement plus claire que les rues (hiérarchie). */
  streetMajor: withAlpha(colors.blanc, 0.07),
  /**
   * Parcs : aplat « vert très sombre » (arbitrage AMENDEMENT-09 §0). Seul vert
   * de la palette = chartreuse, déclinée à 6 % sur fond noir — décor carto,
   * illisible comme état de jeu (aucune confusion crew possible).
   */
  parkFill: withAlpha(colors.chartreuse, 0.06),
  parkEdge: withAlpha(colors.chartreuse, 0.1),
  /** Base opaque sous le parc (efface les îlots par recouvrement). */
  parkBase: colors.noir,
  water: colors.eau,
  waterRim: withAlpha(colors.blanc, 0.08),

  // LEGACY AMENDEMENT-08 (réseau de lignes) — compat API, plus utilisé en web.
  parks: mapTokens.parks,
  parksEdge: withAlpha(colors.blanc, 0.05),
  /** Trame dense des rues secondaires (traits très fins). */
  roads: mapTokens.roads,
  /** 2-3 axes principaux, à peine plus présents que la trame. */
  roadsMajor: withAlpha(colors.blanc, 0.13),
  sectorLabel: colors.gris,
  /** Barre d'échelle graphique (500 m) — gris discret. */
  scaleBar: colors.gris,
} as const;

// ─── Couches RealMap des cartes (AMENDEMENT-13 §2/§4bis/§4ter) ──────────────
// Builder PARTAGÉ MapScreen.web (maplibre-gl) / MapScreen natif / « Mon
// territoire » : les vraies tuiles portent le décor, ce module ne produit QUE
// les couches de JEU — les TRACÉS de course d'allTerritories (§4ter : la
// frontière EST le tracé, plus de formes lissées) avec leurs traitements,
// la route ouverte, la zone bonus et l'aperçu du parcours sélectionné.
// UI pure — aucune règle de jeu.

/** Traitements de frontière (§4ter : trait continu 2-2,5 px — px écran).
    AMENDEMENT-16 §0 : une frontière = CE trait + un remplissage faible,
    RIEN d'autre — plus aucune couche de lueur/glow sous les traits. */
const BORDER_WIDTH = 2.2;
const RIVAL_BORDER_WIDTH = 2.6;
const CONTESTED_TRAIT_WIDTH = 2.2;
/** Écart latéral du DOUBLE trait contesté (line-offset ± — §4ter). */
const CONTESTED_TRAIT_OFFSET_PX = 2.5;
const DECAY_WIDTH = 2.2;
/** Pointillés MapLibre : multiples de la largeur du trait (≈ « 6 5 » px SVG). */
const DECAY_DASH: readonly number[] = [3, 2.5];
const ROUTE_WIDTH = 4;
const BONUS_RING_WIDTH = 2;
const BONUS_DASH: readonly number[] = [3, 2];
const PARCOURS_CASING_WIDTH = 7;
const PARCOURS_WIDTH = 4;
/** Segments de l'anneau de la zone bonus (cercle géodésique approché). */
const BONUS_CIRCLE_STEPS = 48;

/** Emphase pleine (« Mon territoire » — pas de modes de calques là-bas). */
export const FULL_EMPHASIS: ModeEmphasis = {
  crew: 1,
  rival: 1,
  contested: 1,
  defense: 1,
  objective: 1,
  route: 1,
};

type RealMapData = RealMapGeoJSONLayer['data'];

/**
 * Collection vide : chaque couche existe TOUJOURS (ordre de peinture stable,
 * RealMap ne retire jamais un layer) — masquer = données vides (parcours
 * désélectionné, état absent de la démo).
 */
const EMPTY_COLLECTION: RealMapData = { type: 'FeatureCollection', features: [] };

/** Une polyline lat/lng → FeatureCollection LineString (source de ligne réelle). */
function lineCollection(points: readonly LatLngPoint[]): RealMapData {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: points.map((p) => [p.lng, p.lat]),
        },
        properties: {},
      },
    ],
  };
}

/** Disque géodésique approché (zone bonus — rayon en mètres autour du centre). */
function circleCollection(center: LatLngPoint, radiusM: number): RealMapData {
  const ring: number[][] = [];
  for (let i = 0; i <= BONUS_CIRCLE_STEPS; i += 1) {
    const angle = (i / BONUS_CIRCLE_STEPS) * Math.PI * 2;
    ring.push([
      center.lng + (Math.cos(angle) * radiusM) / REAL_M_PER_DEG_LNG,
      center.lat + (Math.sin(angle) * radiusM) / REAL_M_PER_DEG_LAT,
    ]);
  }
  return {
    type: 'FeatureCollection',
    features: [
      { type: 'Feature', geometry: { type: 'Polygon', coordinates: [ring] }, properties: {} },
    ],
  };
}

let routeCollectionCache: RealMapData | null = null;
let bonusCollectionCache: RealMapData | null = null;
const parcoursCollectionCache = new Map<string, RealMapData>();

/**
 * Couches des TERRITOIRES par état, dans l'ORDRE DE PEINTURE — builder PARTAGÉ
 * des deux cartes (§4bis : une seule source, allTerritories ; « Mon
 * territoire » l'appelle avec FULL_EMPHASIS) : rival → objectif (aplat léger)
 * → crew (aplat + trait net 2,2 px — AMENDEMENT-16 §0 : zéro glow) →
 * avant-poste → decay (ruban pointillé, muted red si urgent) → protégé (trait
 * verify net) →
 * contesté (§4ter : DOUBLE trait chartreuse/orange décalé sur la portion de
 * tracé partagée — l'orange pulse, plus aucun blob). L'emphase du MODE actif
 * module fills (fillOpacity) et frontières (scaleAlpha) ; MapLibre fond les
 * transitions de peinture (bascule douce).
 */
export function territoryStateLayers(
  emph: ModeEmphasis,
  basemap: BasemapKey = 'dark',
): RealMapGeoJSONLayer[] {
  const geo = territoryGeoByState();
  const stateData = (state: TerritoryState): RealMapData =>
    geo.get(state) ?? EMPTY_COLLECTION;
  const terr = territoryStyle;
  return withColorCasing(basemap, [
    // Rival : ruban sombre teinté + frontière orange MARQUÉE.
    {
      id: 'terr-rival',
      data: stateData('rival'),
      fillColor: terr.rivalFill,
      fillOpacity: emph.rival,
      lineColor: scaleAlpha(terr.rivalStroke, emph.rival),
      lineWidth: RIVAL_BORDER_WIDTH,
    },
    // Objectif : aplat léger SEUL (AMENDEMENT-16 §0 — plus de lueur large,
    // le pin marker suffit à désigner la zone).
    {
      id: 'terr-objective',
      data: stateData('objective'),
      fillColor: terr.objectiveFill,
      fillOpacity: emph.objective,
    },
    // Mon crew : remplissage faible + trait continu NET (le tracé du run) —
    // AMENDEMENT-16 §0 : la couche de glow sous le trait a disparu.
    {
      id: 'terr-crew',
      data: stateData('crew'),
      fillColor: terr.crewFill,
      fillOpacity: emph.crew,
      lineColor: scaleAlpha(terr.crewStroke, emph.crew),
      lineWidth: BORDER_WIDTH,
    },
    // Avant-poste : petite boucle nette tenue (place de la Bastille).
    {
      id: 'terr-outpost',
      data: stateData('outpost'),
      fillColor: terr.outpostFill,
      fillOpacity: emph.crew,
      lineColor: scaleAlpha(terr.outpostStroke, emph.crew),
      lineWidth: BORDER_WIDTH,
    },
    // Zone à défendre (decay) : ruban à frontière pointillée — muted red si urgent.
    {
      id: 'terr-decay-urgent-fill',
      data: stateData('decayUrgent'),
      fillColor: terr.decayUrgentFill,
      fillOpacity: emph.defense,
    },
    {
      id: 'terr-decay',
      data: stateData('decay'),
      lineColor: scaleAlpha(terr.decayStroke, emph.defense),
      lineWidth: DECAY_WIDTH,
      lineDash: DECAY_DASH,
    },
    {
      id: 'terr-decay-urgent',
      data: stateData('decayUrgent'),
      lineColor: scaleAlpha(terr.decayUrgentStroke, emph.defense),
      lineWidth: DECAY_WIDTH,
      lineDash: DECAY_DASH,
    },
    // Secteur protégé : trait verify NET le long du tracé (le shield est un
    // marker, UNE icône par secteur — AMENDEMENT-16 §0 : plus de halo).
    {
      id: 'terr-protected',
      data: stateData('protected'),
      lineColor: scaleAlpha(terr.protectedStroke, emph.defense),
      lineWidth: BORDER_WIDTH,
    },
    // Contesté (§4ter) : la PORTION de tracé partagée en DOUBLE trait décalé —
    // chartreuse d'un côté, orange PULSÉ de l'autre. Plus aucun blob.
    {
      id: 'terr-contested',
      data: stateData('contested'),
      lineColor: scaleAlpha(terr.contestedInnerStroke, emph.contested),
      lineWidth: CONTESTED_TRAIT_WIDTH,
      lineOffset: -CONTESTED_TRAIT_OFFSET_PX,
    },
    {
      id: 'terr-contested-outer',
      data: stateData('contested'),
      lineColor: scaleAlpha(terr.contestedOuterStroke, emph.contested),
      lineWidth: CONTESTED_TRAIT_WIDTH,
      lineOffset: CONTESTED_TRAIT_OFFSET_PX,
      pulse: true,
    },
  ]);
}

/**
 * Insère, sur les fonds CLAIRS (`color` Voyager ET `satellite` Esri —
 * AMENDEMENT-28), un LISERÉ SOMBRE sous chaque couche porteuse d'un trait
 * (line*) : une copie noire semi-opaque ~1 px plus large, placée JUSTE AVANT la
 * couche d'origine (l'ordre du tableau = ordre de peinture, le premier
 * au-dessous). Le trait garde son token d'état ; le casing ne fait que le
 * détacher du beige de Voyager / de la photo satellite (charte : jamais de
 * chartreuse illisible sur fond clair). Sur le fond sombre, retour à l'identique
 * (le noir ambiant fait déjà casing — aucune couche ajoutée). Le satellite étant
 * plus contrasté que Voyager, son casing est un cran plus dense et plus large.
 * Le pointillé/offset est repris pour épouser le trait ; jamais de pulse sur le
 * casing.
 */
function withColorCasing(
  basemap: BasemapKey,
  layers: RealMapGeoJSONLayer[],
): RealMapGeoJSONLayer[] {
  if (basemap !== 'color' && basemap !== 'satellite') return layers;
  const satellite = basemap === 'satellite';
  const casingColor = satellite ? territoryStyle.satelliteCasing : territoryStyle.colorCasing;
  const extraPx = satellite ? SATELLITE_CASING_EXTRA_PX : COLOR_CASING_EXTRA_PX;
  const out: RealMapGeoJSONLayer[] = [];
  for (const spec of layers) {
    if (spec.lineColor !== undefined) {
      out.push({
        id: `${spec.id}-casing`,
        data: spec.data,
        lineColor: casingColor,
        lineWidth: (spec.lineWidth ?? 1) + extraPx,
        ...(spec.lineDash ? { lineDash: spec.lineDash } : {}),
        ...(spec.lineOffset !== undefined ? { lineOffset: spec.lineOffset } : {}),
      });
    }
    out.push(spec);
  }
  return out;
}

/**
 * Les couches de jeu de la BATTLE MAP, dans l'ordre de peinture : les
 * territoires partagés (territoryStateLayers) puis la zone bonus (anneau or
 * pulsé), la route ouverte et l'aperçu du parcours sélectionné (source ligne
 * GeoJSON réelle).
 */
export function battleGameLayers(
  emph: ModeEmphasis,
  selectedParcoursId: string | null,
  basemap: BasemapKey = 'dark',
): RealMapGeoJSONLayer[] {
  if (!routeCollectionCache) {
    routeCollectionCache = lineCollection(battleMapData().points.route);
  }
  if (!bonusCollectionCache) {
    bonusCollectionCache = circleCollection(MAP_BONUS_ZONE.center, MAP_BONUS_ZONE.radiusM);
  }
  let parcoursData = EMPTY_COLLECTION;
  if (selectedParcoursId) {
    const cached = parcoursCollectionCache.get(selectedParcoursId);
    if (cached) {
      parcoursData = cached;
    } else {
      const parcours = PARCOURS_DEMO.find((p) => p.id === selectedParcoursId);
      if (parcours) {
        parcoursData = lineCollection(parcours.line);
        parcoursCollectionCache.set(selectedParcoursId, parcoursData);
      }
    }
  }

  const terr = territoryStyle;
  return [
    ...territoryStateLayers(emph, basemap),
    // Zone bonus (1 MAX) + route ouverte : traits or/chartreuse — sur le fond
    // COULEUR ils reçoivent le liseré sombre porteur (withColorCasing), pas le
    // fill de la zone bonus (un aplat lit très bien sur Voyager).
    ...withColorCasing(basemap, [
      // Zone bonus (1 MAX) : anneau or pointillé, respiration lente.
      {
        id: 'bonus-zone',
        data: bonusCollectionCache,
        fillColor: terr.bonusFill,
        fillOpacity: 1,
        lineColor: terr.bonusStroke,
        lineWidth: BONUS_RING_WIDTH,
        lineDash: BONUS_DASH,
        pulse: true,
      },
      // Route ouverte : ligne ÉPAISSE le long du bd Richard-Lenoir (route-first).
      {
        id: 'route-ouverte',
        data: routeCollectionCache,
        lineColor: scaleAlpha(terr.routeStroke, emph.route),
        lineWidth: ROUTE_WIDTH,
      },
    ]),
    // Parcours sélectionné (sheet) : aperçu gris sur liseré sombre — la
    // désélection vide la source (les couches restent, l'ordre est stable).
    // Il porte DÉJÀ son propre casing sombre (parcoursCasing) : pas de double.
    {
      id: 'parcours-casing',
      data: parcoursData,
      lineColor: terr.parcoursCasing,
      lineWidth: PARCOURS_CASING_WIDTH,
    },
    {
      id: 'parcours-apercu',
      data: parcoursData,
      lineColor: terr.parcoursPreview,
      lineWidth: PARCOURS_WIDTH,
    },
  ];
}
