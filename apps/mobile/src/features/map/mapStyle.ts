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
import {
  SECTOR_BADGE_LABELS,
  SECTOR_MIN_ZOOM,
  SECTOR_PCT_MAX_ZOOM,
  TERRITORY_TRACE_MIN_ZOOM,
  territoryGeoByState,
} from './allTerritories';
import type { RealTerritory } from './hexClaims';
import { sectorPaintRole, type RealSectorView } from './sectorView';
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
// ─── Labels en langue LOCALE (retour terrain 20/07 : « la map est en anglais »)
//
// Les styles CARTO GL (dark-matter / voyager) préfèrent `name_en` dans leurs
// text-fields → villes/pays anglicisés. On télécharge le style UNE fois, on
// remplace name_en par name (nom local : Paris reste Paris, München reste
// München) et on sert la spec JSON patchée. Un style ne se REMPLACE PAS à chaud
// (les couches de jeu seraient perdues — cf. key={basemap} de MapScreen) : les
// consommateurs écoutent la révision et REMONTENT la carte quand c'est prêt.
const localizedSpecs = new Map<BasemapKey, string>();
const inFlight = new Set<BasemapKey>();
const specListeners = new Set<() => void>();
let specRevision = 0;

function bumpSpecRevision(): void {
  specRevision += 1;
  for (const l of specListeners) l();
}

async function fetchAndLocalize(key: 'dark' | 'color'): Promise<void> {
  if (localizedSpecs.has(key) || inFlight.has(key)) return;
  inFlight.add(key);
  try {
    const res = await fetch(MAP_BASEMAP_STYLES[key]);
    const style = (await res.json()) as { layers?: { layout?: Record<string, unknown> }[] };
    for (const layer of style.layers ?? []) {
      const tf = layer.layout?.['text-field'];
      if (tf !== undefined && layer.layout) {
        layer.layout['text-field'] = JSON.parse(
          JSON.stringify(tf).split('name_en').join('name'),
        ) as unknown;
      }
    }
    localizedSpecs.set(key, JSON.stringify(style));
    bumpSpecRevision();
  } catch {
    // Hors-ligne / échec réseau : on garde l'URL brute (labels name_en assumés).
  } finally {
    inFlight.delete(key);
  }
}

/** Précharge les styles localisés (appelé au montage de la carte, jamais à l'import). */
export function prefetchLocalizedBasemaps(): void {
  void fetchAndLocalize('dark');
  void fetchAndLocalize('color');
}

/** Spec localisée si disponible, sinon undefined (l'appelant retombe sur l'URL). */
export function localizedBasemapSpec(key: BasemapKey): string | undefined {
  return key === 'dark' || key === 'color' ? localizedSpecs.get(key) : undefined;
}

/** Révision des specs localisées — s'abonner pour remonter la carte quand prêt. */
export function subscribeBasemapSpecs(listener: () => void): () => void {
  specListeners.add(listener);
  return () => {
    specListeners.delete(listener);
  };
}

export function basemapSpecRevision(): number {
  return specRevision;
}

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
  // Ton crew : aplat chartreuse LISIBLE (identité « qui possède quoi », retour
  // fondateur — renforcé maintenant que le fond est très sombre) + contour fort.
  // AMENDEMENT-16 §0 : ZÉRO halo/glow — un trait net + un remplissage franc.
  crewFill: withAlpha(colors.chartreuse, 0.3),
  crewStroke: withAlpha(colors.chartreuse, 0.8),

  // Rival : aplat orange MARQUÉ + frontière orange forte (l'ennemi se voit).
  rivalFill: withAlpha(gameColors.rival, 0.26),
  rivalStroke: withAlpha(gameColors.rival, 0.85),

  // Contesté : double contour chartreuse + orange décalé (AMENDEMENT-37 §5 : NE
  // PULSE PLUS — le double contour décalé suffit ; le pulse est réservé à l'urgence).
  contestedFill: withAlpha(gameColors.contested, 0.24),
  contestedInnerStroke: withAlpha(colors.chartreuse, 0.7),
  contestedOuterStroke: withAlpha(gameColors.rival, 0.8),

  // Protégé : trait bleu ÉLECTRIQUE NET le long du tracé (1 icône shield par
  // secteur — AMENDEMENT-16 §0 : plus de halo, la teinte dit l'état).
  // AMENDEMENT-37 §5 : bleu électrique (dissocié de verify) + contour RENFORCÉ
  // (0,4 → 0,8, fourchette contour §7.2) — le protégé se lit sans halo.
  protectedStroke: withAlpha(gameColors.electricBlue, 0.8),

  // Zone à défendre (decay) : frontière pointillée — muted red si urgent.
  decayStroke: withAlpha(colors.blanc, 0.45),
  decayUrgentStroke: withAlpha(gameColors.danger, 0.85),
  decayUrgentFill: withAlpha(gameColors.danger, 0.08),

  // Objectif : zone chaude DOUCE (aplat très léger). AMENDEMENT-21 (écran
  // mission) : encore atténué — la carte n'affiche FORT que ma position, la
  // zone ciblée, la route et le point d'arrivée ; le reste recède (moins de
  // superpositions vertes). AMENDEMENT-36 : plus d'aplat — la cible = un contour
  // pointillé (le tracé à FERMER), désigné aussi par son pin.
  objectiveFill: withAlpha(colors.chartreuse, 0.06),
  objectiveSoft: withAlpha(colors.chartreuse, 0.05),
  objectiveStroke: withAlpha(colors.chartreuse, 0.55),

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
 * large ; le contour INTÉRIEUR chartreuse (mon crew) est plus fin, plein. Les
 * deux teintes viennent des tokens (roleColor('rival') / ('mine')). Décalage
 * latéral ± pour que les deux traits se lisent séparément (jamais un seul trait
 * bicolore). Largeurs en px de trait MapLibre.
 * AMENDEMENT-37 §5 : le contesté NE PULSE PLUS (le double contour décalé le
 * distingue déjà) — le pulse permanent est réservé au secteur pic/urgent.
 */
export const CONTESTED_STYLE = {
  /** Contour extérieur (rival) — le plus visible. */
  outerColor: roleColor('rival'),
  outerWidthPx: 3,
  outerOffsetPx: 2.5,
  /** Contour intérieur (mon crew) — plus fin, plein. */
  innerColor: roleColor('mine'),
  innerWidthPx: 2,
  innerOffsetPx: -2.5,
  /** Remplissage violet TRÈS discret (la ville reste lisible). */
  fill: withAlpha(gameColors.contested, 0.12),
  /** AMENDEMENT-37 §5 : plus de pulse sur le contesté (réservé à l'urgence). */
  outerPulse: false,
} as const;

/**
 * §C — HACHURES LÉGÈRES du contesté (2ᵉ canal de forme, en plus du double
 * contour) : motif diagonal discret pour distinguer le contesté SANS couleur
 * (daltonisme). Réutilise le vocabulaire de motifs des crews (design-tokens
 * foePatterns : 'hatch45'). Le rendu génère le pattern ; on n'en fixe que la spec.
 * AMENDEMENT-37 (backlog §C) : SPEC RÉSERVÉE — la refonte carte 2026 a retiré le
 * rendu des hachures de secteur (le double contour décalé porte déjà le
 * contesté) ; ce token conserve la spécification pour la décision « réactiver
 * les hachures contesté/exclue vs les abandonner » listée au backlog. Non câblé
 * volontairement (donnée de style, pas du code mort exécutable).
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
  // 2 — Contestée : double contour + violet + hachures + « Zone contestée ».
  // AMENDEMENT-37 §5 : ne pulse PLUS (le double contour décalé suffit ; le pulse
  // permanent est réservé au secteur pic/urgent).
  contestee: {
    level: SECTOR_STATUS_LEVELS.contestee,
    strokeColor: roleColor('contested'),
    fill: CONTESTED_STYLE.fill,
    shape: 'doubleHatch',
    icon: 'cible',
    pulse: false,
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
// SECTEURS AGRÉGÉS (§C) — RENDU REBRANCHÉ SUR LA SOURCE RÉELLE (22/07/2026)
//
// Historique, à garder en tête : le rendu avait été RETIRÉ le 21/07/2026 (fin du
// mode vitrine) parce qu'il ne lisait pas un socle réel mais
// `PARIS_DEMO_SECTOR_VIEWS` — des secteurs fabriqués du canal Saint-Martin,
// peints sur la carte de n'importe quel joueur où qu'il soit, sous un garde
// `real === null` qui signifiait « aucune vraie donnée ⇒ invente ».
//
// Il revient ici sous la condition qui avait été posée mot pour mot : une SOURCE
// RÉELLE. C'est `sector_snapshot` (0037 + 0061), calculé serveur par le job
// `recompute_sectors`, lu par `useSectorSnapshots` et résolu en rôles par
// `sectorView.sectorViewsFor`. La géométrie ne vient PAS de `sectors.geojson`
// (NULL en base) mais du contour EXACT de la cellule H3 res 7 du secteur —
// dérivé client, donc rien à demander au serveur et rien à inventer.
//
// Ce qui n'a pas bougé : SECTOR_STATUS_SPEC (couleur par RÔLE + forme + badge
// par niveau 0-4), gardé intact pour ce retour. Aucun secteur n'est peint sans
// détenteur RÉEL ou pression RÉELLE (`sectorViewsFor` les écarte) : à 0 capture,
// la carte reste nue — l'état vide est la bonne réponse, pas une panne.
// ═══════════════════════════════════════════════════════════════════════════

/** Rayon de l'anneau de PULSE (secteur le plus urgent) — tight, discret. */
const SECTOR_PULSE_RADIUS_M = 45;
/** Largeur de l'anneau de pulse (px) — fin (un signal, pas un contour épais). */
const SECTOR_PULSE_WIDTH = 1.5;
/** Segments du cercle géodésique de l'anneau de pulse (assez lisse à ce rayon). */
const SECTOR_CIRCLE_STEPS = 40;
/**
 * Opacité de crête de l'APLAT de secteur. VOLONTAIREMENT très basse : le secteur
 * est un CONTEXTE (« qui tient ce bout de ville »), jamais le sujet — la trace
 * héros et les territoires restent dominants (§B/-36). Constante de RENDU.
 */
const SECTOR_FILL_PEAK = 0.1;
/** Largeur du contour de secteur (px) — fin : une délimitation, pas une frontière. */
const SECTOR_BORDER_WIDTH = 1.2;

/** Disque géodésique autour d'un centre — même maths que l'ex-anneau de secteur. */
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
 * §C LOD — paliers d'opacité d'un aplat de SECTEUR : rien sous la bande
 * MÉTROPOLE, plein sur [SECTOR_MIN_ZOOM ; SECTOR_PCT_MAX_ZOOM[, éteint au
 * QUARTIER où les TRACÉS de territoire prennent le relais. Réactive les deux
 * constantes de zoom laissées mortes par la fin du mode vitrine — la LOD est une
 * réponse à un VOLUME (200k joueurs, §C), pas une décoration.
 */
function sectorLodStops(peak: number): ReadonlyArray<readonly [number, number]> {
  return [
    [SECTOR_MIN_ZOOM - 1, 0],
    [SECTOR_MIN_ZOOM, peak],
    [SECTOR_PCT_MAX_ZOOM - 1, peak],
    [SECTOR_PCT_MAX_ZOOM, 0],
  ];
}

/** Idem pour une LARGEUR de trait (même bande de zoom, même handoff). */
function sectorLodWidth(width: number): WidthStops {
  return [
    [SECTOR_MIN_ZOOM - 1, 0],
    [SECTOR_MIN_ZOOM, width],
    [SECTOR_PCT_MAX_ZOOM - 1, width],
    [SECTOR_PCT_MAX_ZOOM, 0],
  ];
}

/**
 * §C — teinte d'un secteur PAR RÔLE, jamais par identité de crew. Un secteur
 * tenu par un joueur SANS CREW ne crée AUCUNE couleur nouvelle : il est « mine »
 * s'il s'agit de moi, « rival » sinon — exactement comme un crew (0061 ajoute une
 * identité, pas une palette).
 *
 * ⚠ NEUTRE N'EST PAS RIVAL. Cette fonction retombait sur `rival` par défaut, donc
 * un secteur SANS PROPRIÉTAIRE — précisément ce que produit le plancher de
 * domination (0061) — se peignait en orange rival. Le plancher était respecté
 * dans la donnée et TRAHI dans le pixel : l'écran affirmait un occupant là où le
 * moteur venait de dire qu'il n'y en a pas. C'est la domination fabriquée qu'on
 * retire. `neutral` a son propre token (gris), `ally` aussi (chartreuse
 * atténuée, pour que MON territoire reste le plus lisible, §C).
 *
 * Exhaustif par `switch` : un rôle ajouté plus tard ne pourra plus tomber dans un
 * `return` par défaut qui lui donnerait la couleur de quelqu'un d'autre.
 */
function sectorRoleToken(role: ReturnType<typeof sectorPaintRole>): string {
  switch (role) {
    case 'contested':
      return roleColor('contested');
    case 'mine':
      return roleColor('mine');
    case 'ally':
      return roleColor('ally');
    case 'rival':
      return roleColor('rival');
    default:
      return roleColor('neutral');
  }
}

/** Une vue de secteur → sa feature Polygon (contour H3 res 7 exact). */
function sectorPolygonFeature(view: RealSectorView): RealMapData['features'][number] {
  return {
    type: 'Feature',
    properties: { sectorId: view.id },
    geometry: {
      type: 'Polygon',
      coordinates: [view.ring.map(([lng, lat]) => [lng, lat])],
    },
  };
}

/**
 * §C — COUCHES DE SECTEURS, alimentées par les vues RÉELLES.
 *
 * Trois choses, et pas une de plus (§A : compris en < 3 s) :
 *   1. un APLAT très léger par RÔLE, groupé — un seul calque par rôle, pas un
 *      calque par secteur : le nombre de couches ne grandit pas avec le nombre
 *      de secteurs (scalabilité §C) ;
 *   2. un CONTOUR fin de la même teinte ;
 *   3. sur le SEUL secteur le plus chaud (niveau ≥ attaque), un anneau fin PULSÉ
 *      — un seul mouvement à l'écran, sinon la carte clignote de partout.
 * Tout est borné à la bande MÉTROPOLE par la LOD : au quartier, les tracés de
 * territoire reprennent la main et le secteur s'efface (aucun doublon d'info).
 *
 * `views` vide (aucun secteur réel, ou lecture non aboutie) ⇒ AUCUNE couche.
 */
export function sectorStatusLayersAll(
  views: readonly RealSectorView[],
  emphContested = 1,
): RealMapGeoJSONLayer[] {
  if (views.length === 0) return [];

  // Groupement par teinte de RÔLE : 3 calques maximum, quel que soit le volume.
  const byRole = new Map<string, RealSectorView[]>();
  for (const view of views) {
    const key = sectorPaintRole(view);
    const bucket = byRole.get(key);
    if (bucket) bucket.push(view);
    else byRole.set(key, [view]);
  }

  const layers: RealMapGeoJSONLayer[] = [];
  // Ordre de peinture STABLE et lisible : mon territoire d'abord, le contesté en
  // dernier (priorité d'alerte §C — le plus actionnable au-dessus).
  for (const role of ['mine', 'ally', 'rival', 'neutral', 'contested'] as const) {
    const bucket = byRole.get(role);
    if (!bucket || bucket.length === 0) continue;
    const token = sectorRoleToken(role);
    const data: RealMapData = {
      type: 'FeatureCollection',
      features: bucket.map(sectorPolygonFeature),
    };
    layers.push({
      id: `sector-${role}-fill`,
      data,
      fillColor: token,
      fillOpacity: SECTOR_FILL_PEAK * emphContested,
      fillOpacityStops: sectorLodStops(SECTOR_FILL_PEAK * emphContested),
    });
    layers.push({
      id: `sector-${role}-line`,
      data,
      lineColor: scaleAlpha(withAlpha(token, 0.55), emphContested),
      lineWidth: SECTOR_BORDER_WIDTH,
      lineWidthStops: sectorLodWidth(SECTOR_BORDER_WIDTH),
    });
  }

  // Le SEUL secteur le plus chaud reçoit l'anneau pulsé (les vues sont triées
  // par niveau croissant : le dernier est le pic). Rien en dessous de « attaque » :
  // une carte qui pulse pour une simple pression crie au loup.
  const peak = views[views.length - 1];
  if (peak && peak.status.level >= SECTOR_STATUS_LEVELS.attaque) {
    layers.push({
      id: 'sector-peak-pulse',
      data: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: sectorDiscRing(peak.center, SECTOR_PULSE_RADIUS_M),
            },
          },
        ],
      },
      lineColor: SECTOR_STATUS_SPEC[peak.status.key].strokeColor,
      lineWidth: SECTOR_PULSE_WIDTH,
      lineOpacity: emphContested,
      pulse: true,
    });
  }
  return layers;
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

// Fond `color` (Voyager, plan clair type iPhone) : plus calme que le satellite,
// mais toujours clair → la couche de guerre a besoin d'un coup de pouce MODÉRÉ
// (moins que satellite) pour ressortir. Entre « liseré seul » (1) et satellite.
const COLOR_CORE_WIDTH_MULT = 1.35;
const COLOR_LINE_ALPHA_BOOST = 1.3;
const COLOR_FILL_BOOST = 1.4;

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
 * `line-width`). LARGEUR DOUBLÉE (décision fondateur : le trait du parcours doit
 * être bien plus large) : le CORE va de ~12 px au niveau ville (z12) à ~28 px au
 * niveau rue (z18) ; le CASING est le core + un liseré porteur ; le GLOW déborde à
 * peine le casing. Le RIVAL reste PLUS FIN que ma trace (§B anti-confusion — non
 * doublé). La Course Live vit à l'échelle rue (RUNNER_SCALE_ZOOM ≈ z16-17) → la
 * trace y est massive. Consommés via `RealMapGeoJSONLayer.lineWidthStops`.
 */
export const TRACE_WIDTH_STOPS = {
  /** Trace COURUE — le héros : chartreuse pleine ÉPAISSE (largeur DOUBLÉE). */
  runCore: [
    [12, 12],
    [14, 16],
    [16, 22],
    [18, 28],
  ],
  /** Casing sombre de la trace courue (core + liseré porteur — DOUBLÉ). */
  runCasing: [
    [12, 20],
    [14, 25],
    [16, 32],
    [18, 38],
  ],
  /** Glow FIN de la trace courue (déborde à peine le casing — ratio conservé). */
  runGlow: [
    [12, 26],
    [14, 32],
    [16, 40],
    [18, 48],
  ],
  /** Route RESTANTE / recommandée : chartreuse plus FINE que la courue (DOUBLÉE). */
  routeRemainingCore: [
    [12, 8],
    [14, 12],
    [16, 16],
    [18, 20],
  ],
  routeRemainingCasing: [
    [12, 14],
    [14, 19],
    [16, 24],
    [18, 29],
  ],
  /** Segment MANQUANT (fermeture) : chartreuse pointillé (même gabarit que restante). */
  missingCore: [
    [12, 8],
    [14, 12],
    [16, 16],
    [18, 20],
  ],
  /** Segment EXCLU (GPS écarté) : gris pointillé FAIBLE — le plus fin (doublé). */
  excludedCore: [
    [12, 6],
    [14, 8],
    [16, 11],
    [18, 14],
  ],
  /** RIVAL : orange PLUS FIN que ma trace (jamais aussi visible — §B, anti-confusion). */
  rivalCore: [
    [12, 2.5],
    [14, 3.2],
    [16, 4],
    [18, 5],
  ],
  rivalCasing: [
    [12, 4],
    [14, 4.8],
    [16, 6],
    [18, 7.5],
  ],
  /**
   * TERRITOIRE (statique, Battle Map) — trace FINE ET ÉLÉGANTE, distincte du
   * tracé de COURSE LIVE (volontairement massif). Premium 2026 : un trait qui
   * respire (~3,5 px ville → 6 px rue), casing sombre discret (+1,5 px), zéro
   * glow. Fini le « gros ver ». Consommé par territoryTraceLayers.
   */
  territoryCore: [
    [12, 3],
    [13, 3.5],
    [14, 4],
    [16, 5],
    [18, 6],
  ],
  territoryCasing: [
    [12, 4.5],
    [13, 5],
    [14, 5.5],
    [16, 7],
    [18, 8.5],
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

type WidthStops = readonly (readonly [number, number])[];

/**
 * AMENDEMENT-37 §5 — LOD des TRACÉS DE TERRITOIRE sans champ `minzoom` natif sur
 * les couches ligne : on ÉTEINT la largeur du trait (0 px = invisible, round cap
 * compris) sous `TERRITORY_TRACE_MIN_ZOOM`, et on la rétablit au quartier. Comme
 * `line-width` supporte déjà l'interpolation par zoom (lineWidthStops, §B), c'est
 * une simple palette de largeur — aucune dépendance de rendu nouvelle.
 * `TRACE_GATE_EPS` : le palier juste sous le seuil (bascule nette 0 → pleine).
 */
const TRACE_GATE_EPS = 0.01;

/** Largeur interpolée (linéaire, bornée hors plage) d'une palette à un zoom donné. */
function widthAtZoom(stops: WidthStops, zoom: number): number {
  const first = stops[0];
  if (!first) return 0;
  if (zoom <= first[0]) return first[1];
  for (let i = 1; i < stops.length; i += 1) {
    const a = stops[i - 1];
    const b = stops[i];
    if (!a || !b) continue;
    if (zoom <= b[0]) {
      const span = b[0] - a[0] || 1;
      return a[1] + ((b[1] - a[1]) * (zoom - a[0])) / span;
    }
  }
  return stops[stops.length - 1]?.[1] ?? 0;
}

/**
 * Éteint une palette de largeur sous `minZoom` (largeur 0), la révèle à `minZoom`
 * (largeur interpolée du palier d'origine), puis garde la courbe d'origine
 * au-dessus — la LOD « tracés de territoire dès le quartier » (§5).
 */
function gateWidthStops(stops: WidthStops, minZoom: number): WidthStops {
  const gated: [number, number][] = [
    [minZoom - TRACE_GATE_EPS, 0],
    [minZoom, widthAtZoom(stops, minZoom)],
  ];
  for (const [z, w] of stops) {
    if (z > minZoom) gated.push([z, w]);
  }
  return gated;
}

/** Palette de largeur CONSTANTE (frontière fine), éteinte sous `minZoom` (§5). */
function gatedConstantWidth(width: number, minZoom: number): WidthStops {
  const gated: [number, number][] = [
    [minZoom - TRACE_GATE_EPS, 0],
    [minZoom, width],
    [22, width],
  ];
  return gated;
}

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
 *
 * `alpha` (0-1, défaut 1) module l'INTENSITÉ de TOUTE la pile (casing/glow/core
 * + liseré contesté) par `scaleAlpha` — c'est l'emphase des MODES de carte
 * (AMENDEMENT-11 §3) appliquée à la trace héros : à 0,9 (défense) ma trace est un
 * hero net ; à 0,35 (route/exploration) elle RECULE comme une simple frontière,
 * sans jamais changer de teinte (aucune couleur hors tokens). À 1 : rendu inchangé.
 */
export function runTraceLayers(
  idBase: string,
  data: RealMapData,
  opts: { glow?: boolean; contested?: boolean; alpha?: number } = {},
): TraceLayerList {
  const glow = opts.glow ?? true;
  const a = opts.alpha ?? 1;
  const out: TraceLayerList = [
    // 1. Casing sombre porteur — détache la trace du fond ET du satellite/clair.
    {
      id: `${idBase}-casing`,
      data,
      lineColor: scaleAlpha(traceStyle.casing, a),
      lineWidthStops: TRACE_WIDTH_STOPS.runCasing,
      lineWidth: 15,
    },
  ];
  // 2. Glow FIN (zéro halo A-16 §0 : liseré chartreuse dilué, +qq px, PAS un blob).
  if (glow) {
    out.push({
      id: `${idBase}-glow`,
      data,
      lineColor: scaleAlpha(traceStyle.glow, a),
      lineWidthStops: TRACE_WIDTH_STOPS.runGlow,
      lineWidth: 20,
    });
  }
  // 3. Core chartreuse plein — LE héros, la ligne la plus visible de l'écran.
  out.push({
    id: `${idBase}-core`,
    data,
    lineColor: scaleAlpha(traceStyle.core, a),
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
      lineColor: scaleAlpha(withAlpha(gameColors.rival, 0.9), a),
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
 * retrait). `alpha` (0-1, défaut 1) module l'intensité par le mode de carte
 * (emph.rival), comme runTraceLayers — la teinte reste le token orange.
 */
export function rivalTraceLayers(
  idBase: string,
  data: RealMapData,
  opts: { alpha?: number; minZoom?: number } = {},
): TraceLayerList {
  const a = opts.alpha ?? 1;
  // AMENDEMENT-37 §5 : LOD — le tracé rival de TERRITOIRE n'apparaît qu'au quartier.
  const gate = (stops: WidthStops): WidthStops =>
    opts.minZoom === undefined ? stops : gateWidthStops(stops, opts.minZoom);
  return [
    {
      id: `${idBase}-casing`,
      data,
      lineColor: scaleAlpha(traceStyle.rivalCasing, a),
      lineWidthStops: gate(TRACE_WIDTH_STOPS.rivalCasing),
      lineWidth: 6,
    },
    {
      id: `${idBase}-core`,
      data,
      lineColor: scaleAlpha(traceStyle.rivalCore, a),
      lineWidthStops: gate(TRACE_WIDTH_STOPS.rivalCore),
      lineWidth: 4,
    },
  ];
}

/**
 * TERRITOIRE (Battle Map / Mon territoire) — trace FINE et ÉLÉGANTE (premium
 * 2026), distincte du tracé de COURSE LIVE (volontairement massif via
 * runTraceLayers). Deux couches SEULEMENT : casing sombre discret (détache la
 * trace du fond, ~+1,5 px) + core plein (la teinte de rôle). ZÉRO glow (aucun
 * halo/lueur — un trait net qui respire). `alpha` module par le mode (emph).
 * `color` = teinte de rôle du core (chartreuse pour le crew).
 */
export function territoryTraceLayers(
  idBase: string,
  data: RealMapData,
  color: string,
  opts: { alpha?: number; minZoom?: number } = {},
): TraceLayerList {
  const a = opts.alpha ?? 1;
  // AMENDEMENT-37 §5 : LOD — la trace de territoire n'apparaît qu'au quartier.
  const gate = (stops: WidthStops): WidthStops =>
    opts.minZoom === undefined ? stops : gateWidthStops(stops, opts.minZoom);
  return [
    {
      id: `${idBase}-casing`,
      data,
      lineColor: scaleAlpha(traceStyle.casing, a),
      lineWidthStops: gate(TRACE_WIDTH_STOPS.territoryCasing),
      lineWidth: 5.5,
    },
    {
      id: `${idBase}-core`,
      data,
      lineColor: scaleAlpha(color, a),
      lineWidthStops: gate(TRACE_WIDTH_STOPS.territoryCore),
      lineWidth: 4,
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
// Refonte premium 2026 : une SEULE « épaisseur de trait de carte » pour toutes
// les frontières secondaires (objectif/avant-poste/decay/protégé/contesté) → 1,8 px
// (au lieu de 2,2). Cohérence système/élégante, sous ma trace crew (core ~4 px).
const BORDER_WIDTH = 1.8;
// (RIVAL_BORDER_WIDTH retiré : le rival n'est plus une ligne fine mais une VRAIE
//  trace façon Strava via rivalTraceLayers — largeur par zoom, cf. TRACE_WIDTH_STOPS.)
const CONTESTED_TRAIT_WIDTH = 1.8;
/** Écart latéral du DOUBLE trait contesté (line-offset ± — §4ter), resserré. */
const CONTESTED_TRAIT_OFFSET_PX = 2;
const DECAY_WIDTH = 1.8;
/** Pointillés MapLibre : multiples de la largeur du trait (≈ « 6 5 » px SVG). */
const DECAY_DASH: readonly number[] = [3, 2.5];
// Lignes de PARCOURS/route DOUBLÉES (décision fondateur : trait plus large).
const ROUTE_WIDTH = 8;
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

/**
 * AMENDEMENT-37 §1 — FILLS DE POSSESSION SUBTILS (révise AMENDEMENT-36 « zéro
 * aplat »). Un aplat de rôle LÉGER revient SOUS la trace pour lire « qui possède
 * quoi » à la surface — PLANCHER d'opacité, jamais un plafond : la trace / le
 * contour reste DOMINANT (§B). Source UNIQUE du fill crew = `mapTokens.mineFill`
 * (chartreuse ~16 %) ; rival / contesté = teinte de rôle à ~16 / ~18 % (jamais
 * > 18 %, sinon on retombe dans les 26-30 % lourds bannis par -36). Posés EN
 * PREMIER (sous les traces, §19) et modulés par l'emphase du MODE (fill-opacity :
 * ils reculent en route/exploration).
 * ⚠ Distincts de `territoryStyle.crewFill/rivalFill/contestedFill` (0,30/0,26/0,24)
 * qui restent l'aplat PLEIN des écrans héros Partage/Historique/Onboarding —
 * consommateurs VIVANTS (RunLoopMap/ShareMap/LiveNavMap/onboarding), PAS des
 * constantes mortes : on ne les touche donc pas.
 */
const LOD_FILL_CREW = mapTokens.mineFill;
const LOD_FILL_RIVAL = withAlpha(gameColors.rival, 0.16);
const LOD_FILL_CONTESTED = withAlpha(gameColors.contested, 0.18);

// AMENDEMENT-37 §1 — LOD du FILL de possession : l'aplat NAÎT au dézoom
// métropole (z10), tient plein jusqu'au quartier (z15), puis s'EFFACE au niveau
// rue (z16+) où la trace-héros domine seule (esprit -36 préservé). Sous z10
// (pays) : 0 — les territoires y sont sub-pixel, le fill n'y serait que du bruit.
const FILL_LOD_IN = 10; // métropole : l'aplat apparaît
const FILL_LOD_HOLD = 15; // quartier : encore plein
const FILL_LOD_OUT = 16; // rue : effacé, la trace domine

/**
 * Paliers `[zoom, opacité]` du fill de possession pour une opacité de crête
 * `peak` (l'emphase du mode) : 0 sous z10, montée jusqu'à `peak` à z10, plein
 * jusqu'à z15, retombée à 0 à z16. Borné hors plage par MapLibre (clamp).
 */
function fillLodStops(peak: number): ReadonlyArray<readonly [number, number]> {
  return [
    [FILL_LOD_IN - 1, 0],
    [FILL_LOD_IN, peak],
    [FILL_LOD_HOLD, peak],
    [FILL_LOD_OUT, 0],
  ];
}

/**
 * Ne garde que les features à AIRE FERMÉE (Polygon/MultiPolygon) d'une
 * collection — un fill de possession ne vaut que pour une BOUCLE (§4ter :
 * « seules les boucles fermées gardent un aplat » ; un couloir LineString n'a
 * pas d'aire). Évite aussi tout aplat parasite sur les tracés-lignes dans le
 * fallback SVG (Expo Go, qui referme les paths ouverts).
 */
function areaFeaturesOnly(data: RealMapData): RealMapData {
  return {
    type: 'FeatureCollection',
    features: data.features.filter(
      (f) => f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon',
    ),
  };
}

/**
 * AMENDEMENT-37 §2 — DIMMING À LA SÉLECTION (étude §4.2 « l'actif domine ») :
 * quand une zone est tapée (`selectedZoneId`), elle reste à 100 % et TOUT le
 * reste du territoire retombe à ce facteur (~20 %, fourchette étude 15-25 %).
 * Constante de RENDU nommée — jamais une règle de jeu. `selectedZoneId=null` ⇒
 * facteur non appliqué (non-régression Batch 1).
 */
export const DIM_FACTOR = 0.2;

/**
 * Partitionne une collection par la zone tapée : `keepSelected` garde les
 * features dont `properties.zoneId` == selectedZoneId (la zone ACTIVE, 100 %),
 * sinon les AUTRES (le contexte à atténuer). Le nom de propriété `zoneId` est le
 * contrat partagé C1/C4 (même nom que le tap, agent A). Une feature sans zoneId
 * n'est jamais « la sélection » → elle retombe dans le contexte atténué.
 */
function featuresByZone(
  data: RealMapData,
  keepSelected: boolean,
  selectedZoneId: string,
): RealMapData {
  return {
    type: 'FeatureCollection',
    features: data.features.filter((f) => {
      const isSelected = f.properties?.zoneId === selectedZoneId;
      return keepSelected ? isSelected : !isSelected;
    }),
  };
}

/**
 * Jumelle ATTÉNUÉE (~DIM_FACTOR) d'une couche de territoire, pour le CONTEXTE non
 * sélectionné (étude §4.2). Id `${id}-dim` STABLE : le renderer ne retire jamais
 * une couche, la jumelle existe donc TOUJOURS (vidée quand aucune zone n'est
 * active). COMPOSE la sélection AVEC le LOD zoom du fill (§1) en multipliant
 * chaque palier `fillOpacityStops` par DIM_FACTOR ; pour les traits, atténue la
 * teinte via `scaleAlpha` (tokens only, aucune teinte nouvelle). Jamais de pulse
 * sur le contexte atténué.
 */
function dimmedLayer(spec: RealMapGeoJSONLayer, data: RealMapData): RealMapGeoJSONLayer {
  const dim: RealMapGeoJSONLayer = { ...spec, id: `${spec.id}-dim`, data, pulse: false };
  if (spec.fillColor !== undefined) {
    dim.fillOpacity = (spec.fillOpacity ?? 1) * DIM_FACTOR;
    if (spec.fillOpacityStops) {
      dim.fillOpacityStops = spec.fillOpacityStops.map(
        ([zoom, op]) => [zoom, op * DIM_FACTOR] as const,
      );
    }
  }
  if (spec.lineColor !== undefined) {
    dim.lineColor = scaleAlpha(spec.lineColor, DIM_FACTOR);
    if (spec.lineOpacity !== undefined) dim.lineOpacity = spec.lineOpacity * DIM_FACTOR;
  }
  return dim;
}

/**
 * AMENDEMENT-37 §2 — applique le DIMMING À LA SÉLECTION à la pile de couches de
 * territoire. Chaque couche est dédoublée en (base + jumelle `-dim`), à ids
 * STABLES (le renderer ne retire jamais une couche : les deux existent toujours) :
 *   - `selectedZoneId=null` : base = couche d'origine INCHANGÉE, jumelle VIDE →
 *     rendu identique au Batch 1 (la jumelle ne peint rien) ;
 *   - zone active : la base ne porte QUE la zone tapée (100 %), la jumelle porte
 *     TOUT le reste, atténué à ~DIM_FACTOR (« l'actif domine », étude §4.2).
 * La jumelle est peinte SOUS la base (contexte dessous, zone active dessus). La
 * route active reste, elle, AU-DESSUS des territoires (§19 — empilée après cette
 * pile). Ne partitionne QUE par `zoneId` (contrat C1/C4).
 */
function applySelectionDim(
  layers: RealMapGeoJSONLayer[],
  selectedZoneId: string | null,
): RealMapGeoJSONLayer[] {
  const out: RealMapGeoJSONLayer[] = [];
  for (const spec of layers) {
    if (selectedZoneId === null) {
      out.push(dimmedLayer(spec, EMPTY_COLLECTION));
      out.push(spec);
    } else {
      out.push(dimmedLayer(spec, featuresByZone(spec.data, false, selectedZoneId)));
      out.push({ ...spec, data: featuresByZone(spec.data, true, selectedZoneId) });
    }
  }
  return out;
}

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
/**
 * Largeur (px) de la LIGNE DE CAPTURE invisible du tap (§3, P2) : assez large
 * pour attraper un tap approximatif sur une zone-COULOIR (LineString fine ~4 px),
 * comme la hit-area élargie d'une polyline Strava/Google Maps.
 */
const HIT_LINE_WIDTH = 16;

/**
 * `real` est REQUIS et NON-NULLABLE (fin du mode vitrine, 21/07/2026). Il n'y a
 * plus de branche « pas de données ⇒ démo » : un appelant qui n'a rien lu passe
 * `[]` et obtient une carte VIDE, ce qui est la vérité. Le typage est le verrou :
 * omettre l'argument ne compile plus, donc aucun futur appelant ne peut
 * ressusciter le faux Paris conquis par simple oubli.
 */
export function territoryStateLayers(
  emph: ModeEmphasis,
  basemap: BasemapKey = 'dark',
  selectedZoneId: string | null = null,
  real: readonly RealTerritory[],
): RealMapGeoJSONLayer[] {
  const geo = territoryGeoByState(real);
  const stateData = (state: TerritoryState): RealMapData =>
    geo.get(state) ?? EMPTY_COLLECTION;
  const terr = territoryStyle;
  // AMENDEMENT-37 §3 (P2) — toutes les features de territoire fusionnées, pour la
  // ligne de capture invisible : rend les zones-couloirs fines faciles à taper.
  const allTerritoryFeatures: RealMapData = {
    type: 'FeatureCollection',
    features: [...geo.values()].flatMap((c) => c.features),
  };
  // AMENDEMENT-37 §1 (révise -36 « zéro aplat ») : un FILL de possession SUBTIL
  // revient SOUS la trace (plancher 16-18 %, la trace reste dominante §B), modulé
  // par l'emphase du MODE. §5 : les tracés de territoire sont GELÉS (largeur 0)
  // sous TERRITORY_TRACE_MIN_ZOOM — au dézoom, villes puis secteurs portent la
  // lecture, jamais des tracés sub-pixel. §5 aussi : le contesté ne PULSE plus.
  const gz = TERRITORY_TRACE_MIN_ZOOM;
  const layers: RealMapGeoJSONLayer[] = [
    // ── LIGNE DE CAPTURE (§3, P2) : peinte EN PREMIER (tout au fond), INVISIBLE
    //    (lineOpacity 0), LARGE (HIT_LINE_WIDTH) — élargit la zone tactile des
    //    zones-couloirs fines pour que le tap lise leur `zoneId`. Gelée sous z13
    //    comme les traces (on ne tape un couloir que là où il est visible).
    //    withColorCasing la saute (opacity 0 → pas de liseré sur fond clair) ;
    //    applySelectionDim la dédouble en `-dim` (la requête native inclut les
    //    jumelles). Zéro impact visuel. ──
    {
      id: 'terr-hit',
      data: allTerritoryFeatures,
      lineColor: colors.noir, // jamais peint (lineOpacity 0)
      lineOpacity: 0,
      lineWidth: HIT_LINE_WIDTH,
      lineWidthStops: gatedConstantWidth(HIT_LINE_WIDTH, gz),
    },
    // ── FILLS DE POSSESSION (peints SOUS les traces, §19) : aplat de rôle léger
    //    (crew ~16 % / rival ~16 % / contesté ~18 %), fill-opacity = emphase du
    //    mode (recule en route/exploration). Ne rend QUE là où l'état a une aire
    //    fermée (les couloirs LineString n'ont pas d'aplat). ──
    {
      id: 'terr-crew-fill',
      data: areaFeaturesOnly(stateData('crew')),
      fillColor: LOD_FILL_CREW,
      fillOpacity: emph.crew, // repli scalaire (rendu SVG statique)
      fillOpacityStops: fillLodStops(emph.crew), // §1 : plein z10-15, effacé z16+
    },
    {
      id: 'terr-rival-fill',
      data: areaFeaturesOnly(stateData('rival')),
      fillColor: LOD_FILL_RIVAL,
      fillOpacity: emph.rival,
      fillOpacityStops: fillLodStops(emph.rival),
    },
    {
      id: 'terr-contested-fill',
      data: areaFeaturesOnly(stateData('contested')),
      fillColor: LOD_FILL_CONTESTED,
      fillOpacity: emph.contested,
      fillOpacityStops: fillLodStops(emph.contested),
    },
    // Rival : VRAIE trace façon Strava (orange, casing+core, largeur par zoom),
    // mais TOUJOURS plus fine/discrète que la mienne (rivalTraceLayers §B/§C) et
    // modulée par emph.rival (recule fort hors des modes rival). Gelée sous z13.
    ...rivalTraceLayers('terr-rival', stateData('rival'), { alpha: emph.rival, minZoom: gz }),
    // Objectif : contour chartreuse POINTILLÉ (le tracé à fermer) — plus d'aplat ;
    // le pin marker désigne aussi la zone (AMENDEMENT-16 §0 / -36).
    {
      id: 'terr-objective',
      data: stateData('objective'),
      lineColor: scaleAlpha(terr.objectiveStroke, emph.objective),
      lineWidth: BORDER_WIDTH,
      lineWidthStops: gatedConstantWidth(BORDER_WIDTH, gz),
      lineDash: DECAY_DASH,
    },
    // Mon crew : MA trace = le point focal, mais FINE et ÉLÉGANTE (premium 2026,
    // territoryTraceLayers) — PAS la trace massive de la Course Live (qui, elle,
    // reste épaisse). Casing sombre discret + core chartreuse plein, largeur par
    // zoom (~4 px ville → 6 px rue), zéro glow. Intensité par le MODE (emph.crew) :
    // hero net en défense, recule en route/exploration. Gelée sous z13.
    ...territoryTraceLayers('terr-crew', stateData('crew'), traceStyle.core, {
      alpha: emph.crew,
      minZoom: gz,
    }),
    // Avant-poste : petite boucle nette tenue (place de la Bastille), sans aplat.
    {
      id: 'terr-outpost',
      data: stateData('outpost'),
      lineColor: scaleAlpha(terr.outpostStroke, emph.crew),
      lineWidth: BORDER_WIDTH,
      lineWidthStops: gatedConstantWidth(BORDER_WIDTH, gz),
    },
    // Zone à défendre (decay) : frontière pointillée — muted red si urgent (le
    // trait terr-decay-urgent ci-dessous porte l'état ; plus d'aplat rouge).
    {
      id: 'terr-decay',
      data: stateData('decay'),
      lineColor: scaleAlpha(terr.decayStroke, emph.defense),
      lineWidth: DECAY_WIDTH,
      lineWidthStops: gatedConstantWidth(DECAY_WIDTH, gz),
      lineDash: DECAY_DASH,
    },
    {
      id: 'terr-decay-urgent',
      data: stateData('decayUrgent'),
      lineColor: scaleAlpha(terr.decayUrgentStroke, emph.defense),
      lineWidth: DECAY_WIDTH,
      lineWidthStops: gatedConstantWidth(DECAY_WIDTH, gz),
      lineDash: DECAY_DASH,
    },
    // Secteur protégé : trait bleu ÉLECTRIQUE NET le long du tracé (le shield est
    // un marker, UNE icône par secteur — AMENDEMENT-16 §0 : plus de halo).
    {
      id: 'terr-protected',
      data: stateData('protected'),
      lineColor: scaleAlpha(terr.protectedStroke, emph.defense),
      lineWidth: BORDER_WIDTH,
      lineWidthStops: gatedConstantWidth(BORDER_WIDTH, gz),
    },
    // Contesté (§4ter) : la PORTION de tracé partagée en DOUBLE trait décalé —
    // chartreuse d'un côté, orange de l'autre. AMENDEMENT-37 §5 : NE PULSE PLUS
    // (le double contour décalé distingue déjà le contesté).
    {
      id: 'terr-contested',
      data: stateData('contested'),
      lineColor: scaleAlpha(terr.contestedInnerStroke, emph.contested),
      lineWidth: CONTESTED_TRAIT_WIDTH,
      lineWidthStops: gatedConstantWidth(CONTESTED_TRAIT_WIDTH, gz),
      lineOffset: -CONTESTED_TRAIT_OFFSET_PX,
    },
    {
      id: 'terr-contested-outer',
      data: stateData('contested'),
      lineColor: scaleAlpha(terr.contestedOuterStroke, emph.contested),
      lineWidth: CONTESTED_TRAIT_WIDTH,
      lineWidthStops: gatedConstantWidth(CONTESTED_TRAIT_WIDTH, gz),
      lineOffset: CONTESTED_TRAIT_OFFSET_PX,
    },
    // AMENDEMENT-37 §5 (étude §8) — FRONTIÈRE OUVERTE : trait chartreuse POINTILLÉ
    // (le tracé « à fermer », dash `missing` réutilisé). Le marker « point de
    // fermeture » est posé par MapScreen (agent A). Gelée sous le seuil quartier.
    {
      id: 'terr-open-boundary',
      data: stateData('openBoundary'),
      lineColor: scaleAlpha(traceStyle.missing, emph.crew),
      lineWidth: BORDER_WIDTH,
      lineWidthStops: gateWidthStops(TRACE_WIDTH_STOPS.missingCore, gz),
      lineDash: TRACE_DASH.missing,
    },
    // AMENDEMENT-37 §5 (étude §8) — BOUCLE À TERMINER : l'anneau OUVERT rendu en
    // trace chartreuse nette (territoryTraceLayers, casing+core) — une boucle
    // presque bouclée. Le segment manquant surligné + le label de distance
    // restante sont des markers MapScreen (agent A). Gelée sous le seuil quartier.
    ...territoryTraceLayers('terr-loop-incomplete', stateData('loopIncomplete'), traceStyle.missing, {
      alpha: emph.objective,
      minZoom: gz,
    }),
    // AMENDEMENT-37 §5 (étude §8) — ZONE EXCLUE : trait GRIS pointillé discret
    // (dash `excluded`, la teinte grise dit « hors-jeu ») — AUCUN CTA de conquête
    // (la raison s'affiche au tap, côté sheet MapScreen). Gelée sous le seuil quartier.
    {
      id: 'terr-excluded',
      data: stateData('excluded'),
      lineColor: scaleAlpha(traceStyle.excluded, traceStyle.excludedOpacity * emph.defense),
      lineWidth: BORDER_WIDTH,
      lineWidthStops: gateWidthStops(TRACE_WIDTH_STOPS.excludedCore, gz),
      lineDash: TRACE_DASH.excluded,
    },
  ];
  // §2 : DIMMING À LA SÉLECTION (l'actif domine) — dédouble chaque couche en base
  // (zone active, 100 %) + jumelle `-dim` (contexte atténué). Appliqué AVANT le
  // liseré clair, pour que withColorCasing dote base ET jumelle de leur casing sur
  // fond color/satellite. selectedZoneId=null ⇒ base inchangée + jumelle vide.
  return withColorCasing(basemap, applySelectionDim(layers, selectedZoneId));
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
  const widthMult = satellite ? SAT_CORE_WIDTH_MULT : COLOR_CORE_WIDTH_MULT;
  const lineBoost = satellite ? SAT_LINE_ALPHA_BOOST : COLOR_LINE_ALPHA_BOOST;
  const fillBoost = satellite ? SAT_FILL_BOOST : COLOR_FILL_BOOST;
  const boostFill = (s: RealMapGeoJSONLayer): RealMapGeoJSONLayer =>
    s.fillOpacity !== undefined ? { ...s, fillOpacity: Math.min(1, s.fillOpacity * fillBoost) } : s;
  const out: RealMapGeoJSONLayer[] = [];
  for (const spec of layers) {
    // Une ligne INVISIBLE (lineOpacity 0 — ex. la ligne de capture du tap, §3)
    // ne reçoit JAMAIS de casing : sinon un liseré sombre large apparaîtrait sur
    // les fonds clairs alors que la ligne elle-même ne se voit pas.
    if (spec.lineColor !== undefined && spec.lineOpacity !== 0) {
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
/**
 * Couches de jeu de la BATTLE MAP : les territoires RÉELS + les secteurs RÉELS.
 *
 * FIN DU MODE VITRINE (21/07/2026). Cette fonction portait des couches nées de
 * la démo — zone bonus (anneau or), route « recommandée », aperçu de parcours,
 * secteurs agrégés de Paris — toutes gardées par `real === null`. Ce gate
 * signifiait « pas de vraies données ⇒ peins la démo » : il confondait l'état de
 * CHARGEMENT avec un feu vert pour inventer. Les couches ont été SUPPRIMÉES (pas
 * re-gardées) et `real` est devenu requis : tant qu'aucune de ces couches n'a de
 * source réelle, elles n'existent pas. Deux d'entre elles attendent toujours la
 * leur (bonus ciblés, itinéraires) ; les SECTEURS ont trouvé la leur — voir le
 * paragraphe suivant. `selectedParcoursId` est conservé dans la signature — les appelants
 * portent encore l'état de sélection — mais ne peint plus rien.
 *
 * 22/07/2026 — les SECTEURS repassent au vert : `sectors` porte des vues issues
 * de `sector_snapshot` (serveur), résolues en RÔLES pour le joueur courant. Même
 * contrat que `real` : un tableau, jamais un `null` qui autoriserait un repli
 * inventé. Vide ⇒ aucune couche de secteur (l'état vide, pas une démo).
 *
 * ORDRE DE PEINTURE : les secteurs SOUS les territoires. Un secteur est le
 * CONTEXTE (« qui tient ce bout de ville »), la trace du joueur reste le sujet
 * (§B) — et leurs bandes de zoom ne se recouvrent quasiment pas (secteurs
 * z10-13, tracés z13+), donc les deux ne se disputent jamais l'écran.
 */
export function battleGameLayers(
  emph: ModeEmphasis,
  _selectedParcoursId: string | null,
  basemap: BasemapKey = 'dark',
  selectedZoneId: string | null = null,
  real: readonly RealTerritory[],
  sectors: readonly RealSectorView[] = [],
): RealMapGeoJSONLayer[] {
  return [
    // Secteurs agrégés (§C) — au fond, bornés à la bande métropole par la LOD.
    // `withColorCasing` leur donne le même liseré sombre porteur qu'aux tracés
    // sur les fonds CLAIRS (color/satellite) : jamais de chartreuse nue sur
    // fond clair (charte).
    ...withColorCasing(basemap, sectorStatusLayersAll(sectors, emph.contested)),
    // §2 : la sélection dédouble/atténue les territoires (l'actif domine).
    //  Les couches bonus / route recommandée / aperçu de parcours étaient toutes
    //  alimentées par la démo et ont disparu avec le mode vitrine.
    ...territoryStateLayers(emph, basemap, selectedZoneId, real),
  ];
}
