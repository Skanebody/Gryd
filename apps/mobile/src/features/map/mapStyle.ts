/**
 * GRYD — styles de tracé de la Battle Map (AMENDEMENT-08 §4, doc §7).
 * TOUTES les couleurs sont DÉRIVÉES des tokens @klaim/shared (charte : toute
 * couleur hors tokens = bug) : `withAlpha` ne fait que décliner un token hex
 * en rgba — aucune teinte nouvelle. La couleur lit l'ÉTAT DE JEU :
 * chartreuse = mon crew, rival = orange sombre, contesté = rare/événement,
 * danger = decay urgent, verify = protection/info.
 * Partagé entre MapScreen natif (MapLibre) et MapScreen.web (SVG).
 */
import {
  colors,
  gameColors,
  type IconName,
  mapTokens,
  roleColor,
  type SectorStatusKey,
  SECTOR_STATUS_LEVELS,
} from '@klaim/shared';
import type { RealMapGeoJSONLayer } from '../../ui/game';
import { SECTOR_BADGE_LABELS, territoryGeoByState } from './allTerritories';
import { MAP_BONUS_ZONE, PARCOURS_DEMO } from './demo';
import { battleMapData } from './fakeHexes';
import { REAL_M_PER_DEG_LAT, REAL_M_PER_DEG_LNG, type LatLngPoint } from './realAnchors';
import { PARIS_DEMO_SECTOR_VIEWS, type SectorView } from './sectorsDemo';
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
        // AMENDEMENT-28 §2 — LISIBILITÉ DE GUERRE : la photo aérienne est bruitée
        // et contrastée (toits clairs, verdure, béton) → les traits/points de jeu
        // s'y noyaient. On ASSOMBRIT et DÉSATURE le raster (façon Strava satellite)
        // pour que le chartreuse/orange/violet ressortent — le fond recule, le jeu
        // passe devant. Valeurs dans SATELLITE_DIM (ajustables sans toucher au rendu).
        paint: {
          'raster-brightness-max': SATELLITE_DIM.brightnessMax,
          'raster-saturation': SATELLITE_DIM.saturation,
          'raster-contrast': SATELLITE_DIM.contrast,
        },
      },
    ],
  };
}

/**
 * Assombrissement du fond satellite (AMENDEMENT-28 §2). La photo recule pour que
 * les traits et points de guerre (chartreuse/orange/violet) passent devant.
 * brightnessMax < 1 baisse le plafond de luminosité ; saturation < 0 mute les
 * couleurs concurrentes (verdure, toits) ; contrast < 0 aplatit le bruit de texture.
 */
export const SATELLITE_DIM = {
  brightnessMax: 0.5,
  saturation: -0.32,
  contrast: -0.06,
} as const;

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
  /** Liseré satellite : plus dense (la photo est plus contrastée que Voyager) —
   *  renforcé (0,72 → 0,82) pour que le trait tienne même sur les zones claires. */
  satelliteCasing: withAlpha(colors.noir, 0.82),
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// STYLE DES 5 NIVEAUX DE SECTEUR (RÈGLES NON NÉGOCIABLES §C)
// « Contesté = couleur + FORME + animation + icône » — JAMAIS la couleur seule
// (daltonisme). Ce bloc est la SPEC de style consommée par le rendu (RealMap) :
// il ne DESSINE rien, il décrit par niveau (issu d'engine/sectors.sectorStatus)
// la teinte (token via roleColor), la forme de bordure, l'icône (picto GRYD, pas
// emoji) et si le contour pulse. Le rendu applique + respecte reduce motion
// (RealMap.useReduceMotion coupe le pulse) et pose le liseré sombre sur fond clair.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * §C — CONTESTÉ : DOUBLE CONTOUR. Le contour EXTÉRIEUR orange (rival) est plus
 * large et pulse ; le contour INTÉRIEUR chartreuse (mon crew) est plus fin,
 * plein. Les deux teintes viennent des tokens (roleColor('rival') / ('mine')).
 * Décalage latéral ± pour que les deux traits se lisent séparément (jamais un
 * seul trait bicolore). Largeurs en px de trait MapLibre.
 */
export const CONTESTED_STYLE = {
  /** Contour extérieur (rival) — le plus visible, pulsé. */
  outerColor: roleColor('rival'),
  outerWidthPx: 3,
  outerOffsetPx: 2.5,
  /** Contour intérieur (mon crew) — plus fin, plein. */
  innerColor: roleColor('mine'),
  innerWidthPx: 2,
  innerOffsetPx: -2.5,
  /** Remplissage violet TRÈS discret (la ville reste lisible). */
  fill: withAlpha(gameColors.contested, 0.12),
  /** Le contour extérieur pulse (respecté par reduce motion côté rendu). */
  outerPulse: true,
} as const;

/**
 * §C — HACHURES LÉGÈRES du contesté (2ᵉ canal de forme, en plus du double
 * contour) : motif diagonal discret pour distinguer le contesté SANS couleur
 * (daltonisme). Réutilise le vocabulaire de motifs des crews (design-tokens
 * foePatterns : 'hatch45'). Le rendu génère le pattern ; on n'en fixe que la spec.
 */
export const CONTESTED_HATCH = {
  pattern: 'hatch45' as const,
  color: withAlpha(gameColors.contested, 0.22),
  /** Espacement des hachures (px) — léger, ne remplit pas la zone. */
  spacingPx: 7,
  widthPx: 1,
} as const;

/**
 * Pulse LENT du contesté/attaque (doc §8) — mêmes valeurs que RealMap
 * (PULSE_PERIOD_MS / PULSE_MIN_OPACITY_RATIO), rappelées ici pour la spec. Le
 * rendu COUPE ce pulse si reduce motion est actif (contour alors plein, opacité
 * max) : l'état reste lisible par la FORME + l'icône, jamais par la seule anim.
 */
export const SECTOR_PULSE = {
  periodMs: 2_400,
  minOpacityRatio: 0.35,
} as const;

/** Forme de bordure d'un secteur (2ᵉ signal, indépendant de la couleur — §C). */
export type SectorBorderShape =
  /** Bordure pleine — mon crew (stable). */
  | 'solid'
  /** Cassée-cible — rival (pointillé + picto cible). */
  | 'brokenTarget'
  /** Double + hachures — contesté. */
  | 'doubleHatch'
  /** Bouclier — protégé. */
  | 'shield'
  /** Sablier-pointillé — decay. */
  | 'hourglassDashed';

/**
 * Spec de style d'UN niveau de secteur (§C). Le rendu lit ceci par
 * `status.key` et compose : teinte `strokeColor` (token), `fill`, `shape`
 * (forme non-colorée), `icon` (picto GRYD du badge — jamais emoji), `pulse`
 * (animé seulement hors reduce motion), `badgeLabel` (texte COURT, §A9 : jamais
 * tronqué), `doubleContour` (→ CONTESTED_STYLE). `alertPriority` reflète la
 * priorité d'affichage §C (plus haut = plus urgent = peint au-dessus).
 */
export interface SectorStatusStyleSpec {
  level: (typeof SECTOR_STATUS_LEVELS)[SectorStatusKey];
  strokeColor: string;
  fill: string;
  shape: SectorBorderShape;
  icon: IconName | null;
  pulse: boolean;
  doubleContour: boolean;
  /** Étiquette courte du badge (§C wording). Jamais coupée (§A9). */
  badgeLabel: string | null;
  /** Priorité de peinture / d'alerte (0 stable → 4 urgence). */
  alertPriority: number;
}

/**
 * §C — les 5 niveaux, chacun couleur + FORME + icône (+ animation pour 3/4).
 * Chartreuse = mon crew ; le rival colore l'orange ; le contesté ajoute le
 * violet + double contour ; l'urgence limite le rouge à un liseré + badge. Le
 * niveau 0 est MUET (aucune alerte, aucun badge — la zone se lit par sa teinte
 * de rôle seule, gérée par territoryStyle).
 */
export const SECTOR_STATUS_SPEC: Record<SectorStatusKey, SectorStatusStyleSpec> = {
  // 0 — Stable : aucune alerte, aucun badge. Teinte de rôle (mon crew) seule.
  stable: {
    level: SECTOR_STATUS_LEVELS.stable,
    strokeColor: roleColor('mine'),
    fill: mapTokens.mineFill,
    shape: 'solid',
    icon: null,
    pulse: false,
    doubleContour: false,
    badgeLabel: SECTOR_BADGE_LABELS.stable,
    alertPriority: SECTOR_STATUS_LEVELS.stable,
  },
  // 1 — Pression : halo orange LÉGER + « Canal actif ». Pas encore de double contour.
  pression: {
    level: SECTOR_STATUS_LEVELS.pression,
    strokeColor: withAlpha(gameColors.rival, 0.5),
    fill: withAlpha(gameColors.rival, 0.07),
    shape: 'solid',
    icon: 'radar',
    pulse: false,
    doubleContour: false,
    badgeLabel: SECTOR_BADGE_LABELS.pression,
    alertPriority: SECTOR_STATUS_LEVELS.pression,
  },
  // 2 — Contestée : double contour + violet + hachures + « Zone contestée » (pulse lent).
  contestee: {
    level: SECTOR_STATUS_LEVELS.contestee,
    strokeColor: roleColor('contested'),
    fill: CONTESTED_STYLE.fill,
    shape: 'doubleHatch',
    icon: 'cible',
    pulse: true,
    doubleContour: true,
    badgeLabel: SECTOR_BADGE_LABELS.contestee,
    alertPriority: SECTOR_STATUS_LEVELS.contestee,
  },
  // 3 — Attaque active : contour orange FORT + pulse + « Attaque en cours ».
  attaque: {
    level: SECTOR_STATUS_LEVELS.attaque,
    strokeColor: withAlpha(gameColors.rival, 0.9),
    fill: withAlpha(gameColors.rival, 0.1),
    shape: 'brokenTarget',
    icon: 'alerte',
    pulse: true,
    doubleContour: true,
    badgeLabel: SECTOR_BADGE_LABELS.attaque,
    alertPriority: SECTOR_STATUS_LEVELS.attaque,
  },
  // 4 — Urgence : rouge LIMITÉ (liseré + fill faible) + [DÉFENDRE] + « À sauver ».
  urgence: {
    level: SECTOR_STATUS_LEVELS.urgence,
    strokeColor: withAlpha(gameColors.danger, 0.85),
    fill: withAlpha(gameColors.danger, 0.08),
    shape: 'brokenTarget',
    icon: 'alerte',
    pulse: true,
    doubleContour: false,
    badgeLabel: SECTOR_BADGE_LABELS.urgence,
    alertPriority: SECTOR_STATUS_LEVELS.urgence,
  },
} as const;

/**
 * §C — icônes de FORME par RÔLE (accessibilité daltonisme : la forme + le picto
 * disent le rôle sans la couleur). Le rendu pose 1 icône PAR SECTEUR (ancre =
 * centre). `mine`/`ally` n'ont pas de badge d'alerte (pas de picto d'état) ; le
 * rival porte la cible, le protégé le bouclier, le decay le sablier, le bonus
 * les foulées (picto GRYD d'énergie — pas d'emoji éclair).
 */
export const ROLE_SHAPE_ICON: Record<
  'mine' | 'ally' | 'rival' | 'contested' | 'protected' | 'decay' | 'bonus',
  IconName | null
> = {
  mine: null,
  ally: null,
  rival: 'cible',
  contested: 'cible',
  protected: 'bouclier',
  decay: 'sablier',
  bonus: 'foulees',
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// RENDU DES SECTEURS AGRÉGÉS (§C) — « on ne colore pas 200 000 users »
// Ce builder est le PONT entre le socle (engine/sectors miroité dans
// sectorsDemo → PARIS_DEMO_SECTOR_VIEWS) et la carte : chaque secteur agrégé
// est peint par son STATUT (0-4), en COULEUR PAR RÔLE (roleColor) + FORME +
// pulse — jamais une couleur par crew, jamais un runner. Les seuils/niveaux
// viennent d'engine (aucun nombre magique de JEU ici) ; seules les dimensions
// de RENDU (rayons/segments en mètres/px) sont des constantes UI. Le rival
// n'apparaît qu'en ACTIVITÉ APPROXIMATIVE (disque/halo orange centré secteur,
// jamais un GPS ni un nom exact — §C). `sectorStatusLayersAll` est empilé par
// battleGameLayers (Battle Map) et par TerritoryFranceMap (« Mon territoire ») ;
// le badge TEXTE court des niveaux ≥ contesté vit dans
// allTerritories.sectorStatusBadgeLayer (calque symbol borné par minZoom).
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Rayon du disque d'un secteur agrégé (m) — échelle quartier, pas une règle.
 * Volontairement MODESTE : les secteurs démo du canal sont proches ; un rayon
 * trop grand les empile en anneaux concentriques illisibles (§A « compris en
 * 3 s »). Le badge texte porte le sens ; le disque n'est qu'un repère de zone.
 */
const SECTOR_DISC_RADIUS_M = 92;
/** Segments du cercle géodésique d'un secteur (assez lisse à ce rayon). */
const SECTOR_CIRCLE_STEPS = 40;
/** Largeur du contour d'un secteur agrégé (px écran). */
const SECTOR_STROKE_WIDTH = 2.4;
/** Double contour contesté : demi-écart des deux traits (px) — ext orange / int chartreuse. */
const SECTOR_CONTOUR_OFFSET_PX = 3;
// LOD des secteurs : SECTOR_MIN_ZOOM vit dans allTerritories (sibling de
// TERRITORY_DOT_MAX_ZOOM, la LOD des marqueurs-points) et est importé ici —
// sous ce zoom les disques sont sub-pixel et les points villes portent seuls la
// lecture ; au-dessus, secteurs + badges prennent le relais (§C LOD).

/** Rayon de référence pour convertir l'espacement px des hachures en mètres. */
const SECTOR_DISC_RADIUS_PX_REF = 90;

/** Disque géodésique (secteur agrégé) autour d'un centre — même maths que la zone bonus. */
function sectorDiscRing(center: LatLngPoint, radiusM: number): number[][] {
  const ring: number[][] = [];
  for (let i = 0; i <= SECTOR_CIRCLE_STEPS; i += 1) {
    const angle = (i / SECTOR_CIRCLE_STEPS) * Math.PI * 2;
    ring.push([
      center.lng + (Math.cos(angle) * radiusM) / REAL_M_PER_DEG_LNG,
      center.lat + (Math.sin(angle) * radiusM) / REAL_M_PER_DEG_LAT,
    ]);
  }
  return ring;
}

/**
 * HACHURES diagonales (2ᵉ canal de forme du contesté, §C — daltonisme) : de
 * vrais segments à 45° couvrant le disque, espacés de CONTESTED_HATCH.spacingPx
 * (converti en mètres via le rayon), en LineString. Pas de fill-pattern (non
 * disponible via RealMapGeoJSONLayer) — la géométrie EST la hachure.
 */
function sectorHatchLines(center: LatLngPoint, radiusM: number): GeoJSONLineFeature[] {
  const out: GeoJSONLineFeature[] = [];
  // Espacement des hachures en mètres : proportionnel au rayon (≈ radius / 4 →
  // ~8 diagonales sur le diamètre) pour une texture LÉGÈRE constante quel que
  // soit le zoom — le ratio CONTESTED_HATCH.spacingPx/RADIUS_PX_REF ne fait que
  // moduler finement cette densité (jamais un remplissage plein, §C daltonisme).
  const densityRatio = CONTESTED_HATCH.spacingPx / SECTOR_DISC_RADIUS_PX_REF;
  const step = Math.max(radiusM / 6, radiusM * densityRatio);
  const mPerDegLng = REAL_M_PER_DEG_LNG;
  const mPerDegLat = REAL_M_PER_DEG_LAT;
  // Diagonale u = (1,1)/√2 ; on balaie la perpendiculaire de -r√2 à +r√2.
  for (let d = -radiusM; d <= radiusM; d += step) {
    // Corde de la droite {centre + d·n + t·u} ∩ disque, n ⟂ u.
    const half = Math.sqrt(Math.max(0, radiusM * radiusM - d * d));
    if (half <= 0) continue;
    const nx = -Math.SQRT1_2;
    const ny = Math.SQRT1_2;
    const ux = Math.SQRT1_2;
    const uy = Math.SQRT1_2;
    const ax = d * nx - half * ux;
    const ay = d * ny - half * uy;
    const bx = d * nx + half * ux;
    const by = d * ny + half * uy;
    out.push({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: [
          [center.lng + ax / mPerDegLng, center.lat + ay / mPerDegLat],
          [center.lng + bx / mPerDegLng, center.lat + by / mPerDegLat],
        ],
      },
    });
  }
  return out;
}

type GeoJSONPolygonFeature = {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry: { type: 'Polygon'; coordinates: number[][][] };
};
type GeoJSONLineFeature = {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry: { type: 'LineString'; coordinates: number[][] };
};

function sectorDiscFeature(center: LatLngPoint, radiusM: number): GeoJSONPolygonFeature {
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [sectorDiscRing(center, radiusM)] },
  };
}
function sectorRingFeature(center: LatLngPoint, radiusM: number): GeoJSONLineFeature {
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'LineString', coordinates: sectorDiscRing(center, radiusM) },
  };
}

type SectorViewWithPlace = SectorView & { name: string; center: LatLngPoint };

/**
 * §C — couches de RENDU d'UN secteur agrégé selon son statut (0-4). Ordre de
 * peinture interne : fill de statut → contour (double si contesté : ext orange
 * décalé + PULSE, int chartreuse) → hachures (contesté) → halo d'activité rival
 * approximatif (niveau ≥ pression). Rien au niveau 0 (stable) : la teinte de
 * rôle du territoire (territoryStyle) suffit, aucune alerte (§C). Toutes les
 * teintes viennent de SECTOR_STATUS_SPEC / CONTESTED_STYLE (tokens) — zéro
 * couleur par crew. `emphContested` module l'opacité (mode Raid/Territoire).
 */
function sectorStatusLayers(view: SectorViewWithPlace, emphContested: number): RealMapGeoJSONLayer[] {
  const { level, key } = view.status;
  if (level <= SECTOR_STATUS_LEVELS.stable) return [];
  const spec = SECTOR_STATUS_SPEC[key];
  const id = `sector-${view.id}`;
  const center = view.center;
  const layers: RealMapGeoJSONLayer[] = [];

  // 1. Aplat de statut (violet contesté / orange pression-attaque / rouge urgence)
  //    — très discret, la ville reste lisible dessous (§C).
  layers.push({
    id: `${id}-fill`,
    data: { type: 'FeatureCollection', features: [sectorDiscFeature(center, SECTOR_DISC_RADIUS_M)] },
    fillColor: spec.fill,
    fillOpacity: emphContested,
  });

  if (spec.doubleContour) {
    // 2a. DOUBLE CONTOUR (§C, niveau ≥ contesté) : contour INTÉRIEUR chartreuse
    //     (mon crew) décalé vers l'intérieur — trait plein, non pulsé.
    layers.push({
      id: `${id}-inner`,
      data: { type: 'FeatureCollection', features: [sectorRingFeature(center, SECTOR_DISC_RADIUS_M)] },
      lineColor: CONTESTED_STYLE.innerColor,
      lineWidth: CONTESTED_STYLE.innerWidthPx,
      lineOffset: -SECTOR_CONTOUR_OFFSET_PX,
    });
    // 2b. Contour EXTÉRIEUR orange (rival) décalé vers l'extérieur + PULSE lent
    //     (coupé par reduce motion côté RealMap → reste plein, jamais invisible).
    layers.push({
      id: `${id}-outer`,
      data: { type: 'FeatureCollection', features: [sectorRingFeature(center, SECTOR_DISC_RADIUS_M)] },
      lineColor: CONTESTED_STYLE.outerColor,
      lineWidth: CONTESTED_STYLE.outerWidthPx,
      lineOffset: SECTOR_CONTOUR_OFFSET_PX,
      pulse: spec.pulse,
    });
    // 2c. HACHURES légères (2ᵉ canal de forme — daltonisme, §C).
    layers.push({
      id: `${id}-hatch`,
      data: { type: 'FeatureCollection', features: sectorHatchLines(center, SECTOR_DISC_RADIUS_M) },
      lineColor: CONTESTED_HATCH.color,
      lineWidth: CONTESTED_HATCH.widthPx,
    });
  } else {
    // 2. Contour SIMPLE (niveau pression / urgence sans double contour) : la
    //    teinte de statut (orange léger ou rouge limité), pulsé si le spec le dit.
    layers.push({
      id: `${id}-ring`,
      data: { type: 'FeatureCollection', features: [sectorRingFeature(center, SECTOR_DISC_RADIUS_M)] },
      lineColor: spec.strokeColor,
      lineWidth: SECTOR_STROKE_WIDTH,
      pulse: spec.pulse,
    });
  }

  return layers;
}

/**
 * §C — TOUTES les couches de secteurs agrégés de la démo Paris (ego =
 * gryd-republique), dans l'ordre de peinture (statut croissant : le plus chaud
 * PAR-DESSUS — priorité d'affichage §C). C'est ce que la Battle Map empile
 * au-dessus des territoires. `emphContested` = emphase du mode actif.
 */
export function sectorStatusLayersAll(emphContested = 1): RealMapGeoJSONLayer[] {
  return [...PARIS_DEMO_SECTOR_VIEWS]
    .sort((a, b) => a.status.level - b.status.level)
    .flatMap((view) => sectorStatusLayers(view, emphContested));
}

/** Sur-largeur du liseré sombre (px de part et d'autre du trait) — fin. */
const COLOR_CASING_EXTRA_PX = 2;
/** Sur-largeur du liseré sur SATELLITE (AMENDEMENT-28) : un cran plus large (photo contrastée). */
const SATELLITE_CASING_EXTRA_PX = 3;

// AMENDEMENT-28 §2 — sur satellite (photo bruitée, déjà assombrie par SATELLITE_DIM),
// la couche de GUERRE passe devant : cœur des traits ÉLARGI, alpha du trait RELEVÉ,
// aplats DENSIFIÉS. Réglables ici. (Le fond `color` Voyager, plus calme, garde le
// liseré seul.)
const SAT_CORE_WIDTH_MULT = 1.75;
const SAT_LINE_ALPHA_BOOST = 1.6;
const SAT_FILL_BOOST = 1.9;

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

// ─── TRACE HÉROS (GRYD_REGLES §B — rendu façon Strava) ──────────────────────
// « Pendant le run, la trace DOMINE ; la carte est le décor ; les zones sont
// secondaires. » La trace est rendue EN COUCHES EMPILÉES (casing sombre sous +
// core chartreuse + glow fin optionnel), largeur DYNAMIQUE par zoom, jointures
// et extrémités ARRONDIES. TOUT est constante de STYLE (px de rendu, alphas de
// tokens) — JAMAIS une règle de jeu (game-rules) : ces épaisseurs ne décident
// d'aucun claim, elles rendent le tracé lisible et massif.
//
// AMENDEMENT-16 §0 (zéro halo) : le `glow` de la trace est un liseré FIN et
// maîtrisé le long du tracé (chartreuse très diluée, ~+2 px), PAS le halo de
// jeu banni (blob/blur large sous les frontières de territoire). C'est le même
// principe qu'un casing, décliné en clair au lieu de sombre — il rend la trace
// vivante sans redevenir une lueur de zone.

/**
 * Paliers de largeur `[zoom, px]` de la TRACE (§B — interpolation MapLibre
 * `line-width`). Le CORE va de ~5 px au niveau ville (z12) à ~14 px au niveau
 * rue (z18) ; le CASING est le core + un liseré porteur ; le GLOW déborde à
 * peine le casing. La Course Live vit à l'échelle rue (RUNNER_SCALE_ZOOM ≈ z16-17)
 * → la trace y est massive. Consommés via `RealMapGeoJSONLayer.lineWidthStops`.
 */
export const TRACE_WIDTH_STOPS = {
  /** Trace COURUE — le héros : chartreuse pleine ÉPAISSE (§B core 9-12). */
  runCore: [
    [12, 6],
    [14, 8],
    [16, 11],
    [18, 14],
  ],
  /** Casing sombre de la trace courue (core + liseré porteur — §B 14-16). */
  runCasing: [
    [12, 10],
    [14, 12.5],
    [16, 16],
    [18, 19],
  ],
  /** Glow FIN de la trace courue (déborde à peine le casing — zéro halo A-16 §0). */
  runGlow: [
    [12, 13],
    [14, 16],
    [16, 20],
    [18, 24],
  ],
  /** Route RESTANTE / recommandée : chartreuse plus FINE (§B core 6-8, 60 %). */
  routeRemainingCore: [
    [12, 4],
    [14, 6],
    [16, 8],
    [18, 10],
  ],
  routeRemainingCasing: [
    [12, 7],
    [14, 9.5],
    [16, 12],
    [18, 14.5],
  ],
  /** Segment MANQUANT (fermeture) : chartreuse pointillé (même gabarit que restante). */
  missingCore: [
    [12, 4],
    [14, 6],
    [16, 8],
    [18, 10],
  ],
  /** Segment EXCLU (GPS écarté) : gris pointillé FAIBLE — le plus fin. */
  excludedCore: [
    [12, 3],
    [14, 4],
    [16, 5.5],
    [18, 7],
  ],
  /** RIVAL : orange PLUS FIN que ma trace (jamais aussi visible — §B, anti-confusion). */
  rivalCore: [
    [12, 3],
    [14, 4.5],
    [16, 6],
    [18, 7.5],
  ],
  rivalCasing: [
    [12, 5.5],
    [14, 7],
    [16, 9],
    [18, 11],
  ],
} as const satisfies Record<string, readonly (readonly [number, number])[]>;

/**
 * Motifs de pointillé de la trace (§B) — multiples de la largeur du core (le
 * dash MapLibre est en unités de largeur de trait). Segment manquant = tirets
 * francs (chartreuse, appelle à fermer) ; exclu = tirets courts espacés (gris,
 * discret).
 */
export const TRACE_DASH = {
  missing: [1.6, 1.4] as readonly number[],
  excluded: [1.2, 1.8] as readonly number[],
} as const;

/**
 * Décalage latéral du liseré orange CONTESTÉ sur la trace COURUE (§C). La trace
 * héros est ÉPAISSE (core ~11 px au niveau rue) : un offset généreux pousse
 * l'orange sur le FLANC du core (contour extérieur orange / intérieur chartreuse),
 * là où il se lit — pas noyé au centre. Distinct du décalage fin des frontières
 * de territoire (CONTESTED_TRAIT_OFFSET_PX = 2,5 px pour un trait de 2,2 px).
 */
const TRACE_CONTESTED_OFFSET_PX = 7;

/**
 * Couleurs de la TRACE HÉROS — TOUTES dérivées des tokens (charte stricte).
 * `casing` = noir porteur (jamais de chartreuse sur clair → contour sombre
 * dessous) ; `core` = chartreuse pleine (moi) ; `glow` = chartreuse très diluée
 * (liseré vivant fin, PAS le halo banni). Rival = orange, TOUJOURS moins présent.
 */
export const traceStyle = {
  /** Contour sombre porteur, sous le core (le casing façon Strava). */
  casing: withAlpha(colors.noir, 0.85),
  /** Cœur de MA trace : chartreuse pleine (le héros). */
  core: colors.chartreuse,
  /** Glow FIN au-dessus du casing, sous le core : chartreuse très diluée. */
  glow: withAlpha(colors.chartreuse, 0.22),
  /** Route restante / recommandée : chartreuse (opacité posée à part, 60 %). */
  routeRemaining: colors.chartreuse,
  /** Opacité de la route restante (§B ~60 %). */
  routeRemainingOpacity: 0.6,
  /** Segment manquant (fermeture) : chartreuse pointillé (appelle à fermer). */
  missing: colors.chartreuse,
  /** Segment exclu : gris, discret (§B ~35 %). */
  excluded: colors.gris,
  excludedOpacity: 0.35,
  /** Rival : orange (core), TOUJOURS plus fin que ma trace. */
  rivalCore: gameColors.rival,
  rivalCasing: withAlpha(colors.noir, 0.8),
} as const;

type TraceLayerList = RealMapGeoJSONLayer[];

/**
 * §B — Construit la pile de couches d'UNE trace COURUE (le héros) pour une
 * source de ligne : `casing` (sombre, dessous) → `glow` (chartreuse diluée fine)
 * → `core` (chartreuse pleine, dessus). Round cap/join via RealMap. La largeur
 * suit le zoom (TRACE_WIDTH_STOPS). `idBase` préfixe les ids (ordre de peinture
 * stable). Passer `glow=false` pour une trace sobre (2 couches).
 *
 * `contested` remplace le core plein par un core chartreuse + un DOUBLE trait
 * orange décalé PULSÉ (langage contesté §C) — la trace reste dominante (le core
 * chartreuse est plein, l'orange n'est qu'un liseré latéral).
 */
export function runTraceLayers(
  idBase: string,
  data: RealMapData,
  opts: { glow?: boolean; contested?: boolean } = {},
): TraceLayerList {
  const glow = opts.glow ?? true;
  const out: TraceLayerList = [
    // 1. Casing sombre porteur — détache la trace du fond ET du satellite/clair.
    {
      id: `${idBase}-casing`,
      data,
      lineColor: traceStyle.casing,
      lineWidthStops: TRACE_WIDTH_STOPS.runCasing,
      lineWidth: 15,
    },
  ];
  // 2. Glow FIN (zéro halo A-16 §0 : liseré chartreuse dilué, +qq px, PAS un blob).
  if (glow) {
    out.push({
      id: `${idBase}-glow`,
      data,
      lineColor: traceStyle.glow,
      lineWidthStops: TRACE_WIDTH_STOPS.runGlow,
      lineWidth: 20,
    });
  }
  // 3. Core chartreuse plein — LE héros, la ligne la plus visible de l'écran.
  out.push({
    id: `${idBase}-core`,
    data,
    lineColor: traceStyle.core,
    lineWidthStops: TRACE_WIDTH_STOPS.runCore,
    lineWidth: 11,
  });
  // Contesté (§C) : liseré orange PULSÉ sur le FLANC extérieur du core (contour
  // extérieur orange / intérieur chartreuse). Le core chartreuse reste plein et
  // DOMINANT — l'orange n'est qu'un liseré latéral, jamais aussi présent que ma
  // trace. Offset généreux (le core est épais) pour que l'orange se lise.
  if (opts.contested) {
    out.push({
      id: `${idBase}-contested`,
      data,
      lineColor: withAlpha(gameColors.rival, 0.9),
      lineWidthStops: TRACE_WIDTH_STOPS.rivalCore,
      lineWidth: 4,
      lineOffset: TRACE_CONTESTED_OFFSET_PX,
      pulse: true,
    });
  }
  return out;
}

/**
 * §B — Couches d'un segment RIVAL : orange, TOUJOURS plus fin/discret que ma
 * trace (casing sombre léger + core orange). Jamais aussi visible que la
 * mienne (anti-confusion §C : moi = chartreuse dominante, rival = orange en
 * retrait).
 */
export function rivalTraceLayers(idBase: string, data: RealMapData): TraceLayerList {
  return [
    {
      id: `${idBase}-casing`,
      data,
      lineColor: traceStyle.rivalCasing,
      lineWidthStops: TRACE_WIDTH_STOPS.rivalCasing,
      lineWidth: 9,
    },
    {
      id: `${idBase}-core`,
      data,
      lineColor: traceStyle.rivalCore,
      lineWidthStops: TRACE_WIDTH_STOPS.rivalCore,
      lineWidth: 6,
    },
  ];
}

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
  // Sur satellite, la couche de guerre est renforcée (le fond est déjà assombri) :
  // cœur plus large, alpha du trait relevé, aplats densifiés. Sur `color`, neutre.
  const widthMult = satellite ? SAT_CORE_WIDTH_MULT : 1;
  const lineBoost = satellite ? SAT_LINE_ALPHA_BOOST : 1;
  const fillBoost = satellite ? SAT_FILL_BOOST : 1;
  const boostFill = (s: RealMapGeoJSONLayer): RealMapGeoJSONLayer =>
    s.fillOpacity !== undefined ? { ...s, fillOpacity: Math.min(1, s.fillOpacity * fillBoost) } : s;
  const out: RealMapGeoJSONLayer[] = [];
  for (const spec of layers) {
    if (spec.lineColor !== undefined) {
      const coreWidth = (spec.lineWidth ?? 1) * widthMult;
      out.push({
        id: `${spec.id}-casing`,
        data: spec.data,
        lineColor: casingColor,
        lineWidth: coreWidth + extraPx,
        ...(spec.lineDash ? { lineDash: spec.lineDash } : {}),
        ...(spec.lineOffset !== undefined ? { lineOffset: spec.lineOffset } : {}),
      });
      // Cœur : élargi + alpha relevé sur satellite (scaleAlpha borne à 1 les rgba).
      out.push(
        boostFill({
          ...spec,
          lineWidth: coreWidth,
          lineColor: scaleAlpha(spec.lineColor, lineBoost),
        }),
      );
    } else {
      out.push(boostFill(spec));
    }
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
    // §C — SECTEURS AGRÉGÉS par STATUT (0-4) au-DESSUS des territoires : c'est la
    // lecture « où est-ce chaud ? » (contesté violet + double contour pulsé,
    // attaque orange, urgence rouge, activité rival approximative). Peints sous
    // la route/bonus (le trait route-first reste au premier plan) — le badge
    // texte court est porté à part par sectorStatusPointLayers (calque symbol
    // borné par zoom). L'emphase `contested` du mode actif module leur opacité.
    ...sectorStatusLayersAll(emph.contested),
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
