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
 * Fonds de carte disponibles (demande fondateur : « la carte en couleur comme
 * sur Plan d'iPhone »). Deux styles vectoriels de dev SANS CLÉ, servis par les
 * DEUX forks RealMap selon la préférence utilisateur (mapPref) :
 *   dark  — CARTO dark-matter : l'esthétique GRYD dark-first par DÉFAUT (le
 *           même styleURL qu'historiquement, surchargé aux tokens au chargement).
 *   color — CARTO Voyager : rues/parcs/eau colorés type Apple Plan / Google Maps
 *           (fond clair/beige — sur ce fond les traits de jeu chartreuse
 *           reçoivent un liseré sombre porteur, cf. `colorCasing` plus bas).
 * La prod passera à Protomaps (O6) en ne changeant QUE ces deux URLs.
 */
export const MAP_BASEMAP_STYLES = {
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  color: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
} as const;

/** Clé de fond de carte : 'dark' (défaut) | 'color'. */
export type BasemapKey = keyof typeof MAP_BASEMAP_STYLES;

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

  // Objectif : zone chaude DOUCE (aplat très léger + lueur large, pas de bord dur).
  objectiveFill: withAlpha(colors.chartreuse, 0.09),
  objectiveSoft: withAlpha(colors.chartreuse, 0.07),

  // Avant-poste : petit blob organique tenu par mon crew.
  outpostFill: withAlpha(colors.chartreuse, 0.1),
  outpostStroke: withAlpha(colors.chartreuse, 0.45),

  // Route ouverte : ligne ÉPAISSE (route-first, lisible au soleil).
  routeStroke: withAlpha(colors.chartreuse, 0.9),
  routeDot: colors.chartreuse,

  // Zone bonus (1 MAX — anti-bruit) : anneau or pointillé pulsé + voile doux.
  bonusFill: withAlpha(gameColors.gold, 0.12),
  bonusStroke: withAlpha(gameColors.gold, 0.75),

  // Aperçu du parcours sélectionné (sheet) : gris clair sur liseré sombre.
  parcoursCasing: withAlpha(colors.noir, 0.5),
  parcoursPreview: colors.gris,

  /**
   * Liseré SOMBRE porteur des traits de jeu sur le fond COULEUR (Voyager,
   * clair/beige) — charte : jamais de chartreuse sur fond clair (contraste
   * 1,2:1). Une line noire semi-opaque ~1 px plus large, peinte SOUS le trait
   * (comme le casing de route) garantit la lisibilité ; le trait reste le token
   * de l'état (chartreuse/orange/verify…). Inutile sur le fond sombre (le noir
   * ambiant fait déjà casing) — ces couches ne sont ajoutées que si color.
   */
  colorCasing: withAlpha(colors.noir, 0.55),
} as const;

/** Sur-largeur du liseré sombre (px de part et d'autre du trait) — fin. */
const COLOR_CASING_EXTRA_PX = 2;

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
 * Insère, sur le fond COULEUR uniquement, un LISERÉ SOMBRE sous chaque couche
 * porteuse d'un trait (line*) : une copie noire semi-opaque ~1 px plus large,
 * placée JUSTE AVANT la couche d'origine (l'ordre du tableau = ordre de
 * peinture, le premier au-dessous). Le trait garde son token d'état ; le
 * casing ne fait que le détacher du beige de Voyager (charte : jamais de
 * chartreuse sur fond clair). Sur le fond sombre, retour à l'identique (le noir
 * ambiant fait déjà casing — aucune couche ajoutée). Le pointillé/offset est
 * repris pour épouser le trait ; jamais de pulse sur le casing.
 */
function withColorCasing(
  basemap: BasemapKey,
  layers: RealMapGeoJSONLayer[],
): RealMapGeoJSONLayer[] {
  if (basemap !== 'color') return layers;
  const out: RealMapGeoJSONLayer[] = [];
  for (const spec of layers) {
    if (spec.lineColor !== undefined) {
      out.push({
        id: `${spec.id}-casing`,
        data: spec.data,
        lineColor: territoryStyle.colorCasing,
        lineWidth: (spec.lineWidth ?? 1) + COLOR_CASING_EXTRA_PX,
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
