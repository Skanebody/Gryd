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
import { franceClusters } from '../territory/franceTerritories';
import { MAP_BONUS_ZONE, PARCOURS_DEMO } from './demo';
import { battleMapData } from './fakeHexes';
import { REAL_M_PER_DEG_LAT, REAL_M_PER_DEG_LNG, type LatLngPoint } from './realAnchors';
import {
  battleTerritories,
  territoriesToGeoJSON,
  type ModeEmphasis,
  type Territory,
  type TerritoryState,
} from './territory';

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
  // Ton crew : aplat chartreuse discret + frontière fine semi-lumineuse + glow.
  crewFill: mapTokens.mineFill,
  crewStroke: withAlpha(colors.chartreuse, 0.55),
  crewGlow: withAlpha(colors.chartreuse, 0.14),

  // Rival : frontière orange MARQUÉE (l'état se lit à la frontière).
  rivalFill: withAlpha(gameColors.rival, 0.13),
  rivalStroke: withAlpha(gameColors.rival, 0.8),

  // Contesté : double contour chartreuse + orange (l'orange pulse lentement).
  contestedFill: withAlpha(gameColors.contested, 0.13),
  contestedInnerStroke: withAlpha(colors.chartreuse, 0.7),
  contestedOuterStroke: withAlpha(gameColors.rival, 0.8),

  // Protégé : halo verify autour du secteur (1 icône shield par secteur).
  protectedHalo: withAlpha(gameColors.verify, 0.4),

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
} as const;

export const battleMapStyle = {
  // Mon crew (chartreuse + glow léger)
  heldFill: mapTokens.mineFill,
  heldStroke: mapTokens.mineStroke,
  heldGlow: withAlpha(colors.chartreuse, 0.14),

  // Rival (orange sombre — état de jeu, pas décor)
  rivalFill: withAlpha(gameColors.rival, 0.1),
  rivalStroke: withAlpha(gameColors.rival, 0.42),

  // Contesté (teinte rare + double contour crew/rival, contour rival pulsé)
  contestedFill: withAlpha(gameColors.contested, 0.1),
  contestedInnerStroke: mapTokens.mineStroke,
  contestedOuterStroke: withAlpha(gameColors.rival, 0.7),

  // Protégé (halo verify translucide autour du cœur)
  protectedHalo: withAlpha(gameColors.verify, 0.35),

  // Decay (pointillé ; muted red si urgent)
  decayStroke: withAlpha(colors.blanc, 0.35),
  decayUrgentStroke: withAlpha(gameColors.danger, 0.8),
  decayUrgentFill: withAlpha(gameColors.danger, 0.07),

  // Objectif crew (halo chartreuse sur zone neutre)
  objectiveHalo: withAlpha(colors.chartreuse, 0.12),
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

// ─── Couches RealMap de la Battle Map (AMENDEMENT-13 §2) ────────────────────
// Builder PARTAGÉ MapScreen.web (maplibre-gl) / MapScreen natif : les vraies
// tuiles portent le décor, ce module ne produit QUE les couches de JEU — les
// polygones ORGANIQUES de territory.ts (AMENDEMENT-11 : zéro hexagone visible)
// avec leurs traitements de frontière, la route ouverte, la zone bonus et
// l'aperçu du parcours sélectionné. UI pure — aucune règle de jeu.

/** Traitements de frontière (mêmes valeurs que l'ex-rendu SVG — px écran). */
const BORDER_WIDTH = 1.8;
const RIVAL_BORDER_WIDTH = 2.6;
const CONTESTED_INNER_WIDTH = 1.8;
const CONTESTED_OUTER_WIDTH = 3;
const CREW_GLOW_WIDTH = 7;
const PROTECTED_HALO_WIDTH = 5;
const DECAY_WIDTH = 1.8;
/** Pointillés MapLibre : multiples de la largeur du trait (≈ « 6 5 » px SVG). */
const DECAY_DASH: readonly number[] = [3, 2.5];
const OBJECTIVE_SOFT_WIDTH = 12;
const ROUTE_WIDTH = 4;
const BONUS_RING_WIDTH = 2;
const BONUS_DASH: readonly number[] = [3, 2];
const PARCOURS_CASING_WIDTH = 7;
const PARCOURS_WIDTH = 4;
/** Segments de l'anneau de la zone bonus (cercle géodésique approché). */
const BONUS_CIRCLE_STEPS = 48;

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

/**
 * Sous ce zoom, les blobs organiques deviennent illisibles/sub-pixel : chaque
 * territoire pris est représenté par un MARQUEUR-POINT coloré + label ville
 * (AMENDEMENT-13 §4bis — chartreuse possession / orange rival), comme sur
 * « Mon territoire ». Les aplats organiques reprennent au zoom ville.
 */
export const CITY_MARKERS_MAX_ZOOM = 10;

/**
 * GeoJSON par état de territoire — calculé une fois (démo déterministe).
 * §4bis : UNE SEULE source pour les DEUX cartes — la Battle Map rend AUSSI
 * les possessions hors Paris (cluster Lille crew + rival Lyon, mêmes
 * traitements), aucun filtrage par viewport (volumes MVP négligeables).
 */
let territoryGeoCache: ReadonlyMap<TerritoryState, RealMapData> | null = null;
function territoryGeoByState(): ReadonlyMap<TerritoryState, RealMapData> {
  if (territoryGeoCache) return territoryGeoCache;
  const clusters = franceClusters();
  const all: readonly Territory[] = [
    ...battleTerritories(),
    clusters.lille,
    clusters.lyonRival,
  ];
  const grouped = new Map<TerritoryState, Territory[]>();
  for (const territory of all) {
    const bucket = grouped.get(territory.state);
    if (bucket) bucket.push(territory);
    else grouped.set(territory.state, [territory]);
  }
  const byState = new Map<TerritoryState, RealMapData>();
  for (const [state, territories] of grouped) {
    byState.set(state, territoriesToGeoJSON(territories) as RealMapData);
  }
  territoryGeoCache = byState;
  return byState;
}

let routeCollectionCache: RealMapData | null = null;
let bonusCollectionCache: RealMapData | null = null;
const parcoursCollectionCache = new Map<string, RealMapData>();

/**
 * Les couches de jeu de la Battle Map RÉELLE, dans l'ORDRE DE PEINTURE
 * (AMENDEMENT-11 §2, identique à l'ex-rendu SVG) : rival → objectif (lueur
 * douce + aplat) → crew (glow + aplat + frontière) → avant-poste → decay
 * (pointillé, muted red si urgent) → protégé (halo) → contesté (double
 * contour, l'orange EXTÉRIEUR pulse) → zone bonus (anneau or pulsé) → route
 * ouverte → aperçu du parcours sélectionné (source ligne GeoJSON réelle).
 * L'emphase du MODE actif module fills (fillOpacity) et frontières
 * (scaleAlpha) ; MapLibre fond les transitions de peinture (bascule douce).
 */
export function battleGameLayers(
  emph: ModeEmphasis,
  selectedParcoursId: string | null,
): RealMapGeoJSONLayer[] {
  const geo = territoryGeoByState();
  const stateData = (state: TerritoryState): RealMapData =>
    geo.get(state) ?? EMPTY_COLLECTION;

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
    // Rival : aplat sombre teinté + frontière orange MARQUÉE.
    {
      id: 'terr-rival',
      data: stateData('rival'),
      fillColor: terr.rivalFill,
      fillOpacity: emph.rival,
      lineColor: scaleAlpha(terr.rivalStroke, emph.rival),
      lineWidth: RIVAL_BORDER_WIDTH,
    },
    // Objectif : zone chaude DOUCE (lueur large sans bord dur) + aplat léger.
    {
      id: 'terr-objective-soft',
      data: stateData('objective'),
      lineColor: scaleAlpha(terr.objectiveSoft, emph.objective),
      lineWidth: OBJECTIVE_SOFT_WIDTH,
    },
    {
      id: 'terr-objective',
      data: stateData('objective'),
      fillColor: terr.objectiveFill,
      fillOpacity: emph.objective,
    },
    // Mon crew : glow + aplat + frontière fine semi-lumineuse.
    {
      id: 'terr-crew-glow',
      data: stateData('crew'),
      lineColor: scaleAlpha(terr.crewGlow, emph.crew),
      lineWidth: CREW_GLOW_WIDTH,
    },
    {
      id: 'terr-crew',
      data: stateData('crew'),
      fillColor: terr.crewFill,
      fillOpacity: emph.crew,
      lineColor: scaleAlpha(terr.crewStroke, emph.crew),
      lineWidth: BORDER_WIDTH,
    },
    // Avant-poste : petit blob organique tenu.
    {
      id: 'terr-outpost',
      data: stateData('outpost'),
      fillColor: terr.outpostFill,
      fillOpacity: emph.crew,
      lineColor: scaleAlpha(terr.outpostStroke, emph.crew),
      lineWidth: BORDER_WIDTH,
    },
    // Zone à défendre (decay) : frontière pointillée — muted red si urgent.
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
    // Secteur protégé : halo verify (l'icône shield est un marker, UNE par secteur).
    {
      id: 'terr-protected',
      data: stateData('protected'),
      lineColor: scaleAlpha(terr.protectedHalo, emph.defense),
      lineWidth: PROTECTED_HALO_WIDTH,
    },
    // Contesté : aplat + contour intérieur chartreuse, contour EXTÉRIEUR orange pulsé.
    {
      id: 'terr-contested',
      data: stateData('contested'),
      fillColor: terr.contestedFill,
      fillOpacity: emph.contested,
      lineColor: scaleAlpha(terr.contestedInnerStroke, emph.contested),
      lineWidth: CONTESTED_INNER_WIDTH,
    },
    {
      id: 'terr-contested-outer',
      data: stateData('contested'),
      lineColor: scaleAlpha(terr.contestedOuterStroke, emph.contested),
      lineWidth: CONTESTED_OUTER_WIDTH,
      pulse: true,
    },
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
    // Parcours sélectionné (sheet) : aperçu gris sur liseré sombre — la
    // désélection vide la source (les couches restent, l'ordre est stable).
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
