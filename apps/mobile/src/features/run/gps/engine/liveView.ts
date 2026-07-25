/**
 * GRYD — E07 : la GÉOMÉTRIE de la vue live (module PUR, testé Deno).
 *
 * Trois besoins, une seule mathématique — la projection Web Mercator que
 * MapLibre applique déjà à la carte :
 *
 *  1. ANCRAGE À 62 % (planche E07 « position à 62 %, espace devant ») : une
 *     caméra MapLibre centre TOUJOURS son point sur le milieu du viewport. Pour
 *     poser le coureur plus bas que le milieu, on décale le CENTRE vers le nord
 *     d'exactement (62 % − 50 %) de la hauteur d'écran, convertie en degrés par
 *     la même projection. Aucun nombre magique : le décalage se DÉDUIT du zoom,
 *     de la latitude et de la hauteur réelle du viewport.
 *
 *  2. SURIMPRESSION FIDÈLE (E08) : la séquence de fermeture dessine la boucle
 *     PAR-DESSUS la carte réelle. Elle ne peut le faire honnêtement que si elle
 *     projette avec la MÊME formule que la carte — sinon l'encre serait à côté
 *     du tracé. `projectOnScreen` est cette formule.
 *
 *  3. RÉDUCTION DE SÉCURITÉ (E08) : « si vitesse élevée, la séquence se réduit
 *     à une pill ». La vitesse doit être MESURÉE, pas supposée : `recentSpeedMps`
 *     la dérive des derniers fixes réellement gardés (l'allure moyenne du
 *     snapshot ne dit rien de l'instant présent). Le seuil est une constante de
 *     jeu existante (ACTIVITY_REFERENCE_SPEED_KMH.bike) — au-delà de l'allure
 *     de référence d'un VÉLO, plus personne ne regarde une animation en sécurité.
 *
 * Zéro import React/natif : testable en Deno comme le reste du moteur.
 */
import { ACTIVITY_REFERENCE_SPEED_KMH } from '@klaim/shared';
import { haversineM } from './validation';

/**
 * Taille de tuile de MapLibre GL (px). Le zoom MapLibre est DÉFINI dessus :
 * à z, le monde fait `TILE_SIZE_PX × 2^z` pixels. Ce n'est pas un réglage GRYD
 * mais la convention de la librairie — la reproduire est la seule façon de
 * projeter comme elle.
 */
const TILE_SIZE_PX = 512;
/** Circonférence équatoriale WGS84 (m) — constante géodésique, pas une règle. */
const EARTH_CIRCUMFERENCE_M = 40_075_016.686;
/** Latitude limite de Mercator (au-delà, la projection diverge). */
const MERCATOR_MAX_LAT = 85.051_129;

const DEG = Math.PI / 180;

export interface LatLng {
  readonly lat: number;
  readonly lng: number;
}

export interface ScreenBox {
  readonly width: number;
  readonly height: number;
}

export interface LiveCamera extends LatLng {
  readonly zoom: number;
}

/** Largeur du monde (px) au zoom donné, convention MapLibre (tuiles 512). */
function worldPx(zoom: number): number {
  return TILE_SIZE_PX * Math.pow(2, zoom);
}

function lngToWorldX(lng: number, world: number): number {
  return ((lng + 180) / 360) * world;
}

function latToWorldY(lat: number, world: number): number {
  const clamped = Math.max(-MERCATOR_MAX_LAT, Math.min(MERCATOR_MAX_LAT, lat));
  const s = Math.sin(clamped * DEG);
  return world * (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI));
}

function worldYToLat(y: number, world: number): number {
  const n = Math.PI * (1 - (2 * y) / world);
  return Math.atan(Math.sinh(n)) / DEG;
}

/** Résolution (m/px) à cette latitude et ce zoom — utile aux garde-fous d'échelle. */
export function metersPerPixel(lat: number, zoom: number): number {
  const clamped = Math.max(-MERCATOR_MAX_LAT, Math.min(MERCATOR_MAX_LAT, lat));
  return (EARTH_CIRCUMFERENCE_M * Math.cos(clamped * DEG)) / worldPx(zoom);
}

/**
 * Centre de caméra qui pose `pos` à `anchorRatio` de la hauteur du viewport
 * (0 = tout en haut, 0,5 = centré, 0,62 = planche E07). Le décalage est
 * strictement vertical : la longitude ne bouge pas.
 */
export function liveCameraCenter(
  pos: LatLng,
  zoom: number,
  box: ScreenBox,
  anchorRatio: number,
): LatLng {
  const world = worldPx(zoom);
  const y = latToWorldY(pos.lat, world);
  // Le coureur doit apparaître `(anchorRatio − 0,5) × hauteur` px SOUS le centre
  // → le centre monte d'autant (l'axe y croît vers le sud).
  const centerY = y - (anchorRatio - 0.5) * box.height;
  return { lat: worldYToLat(centerY, world), lng: pos.lng };
}

/** Projette un point géo en pixels ÉCRAN pour cette caméra (origine haut-gauche). */
export function projectOnScreen(
  point: LatLng,
  camera: LiveCamera,
  box: ScreenBox,
): { x: number; y: number } {
  const world = worldPx(camera.zoom);
  return {
    x: lngToWorldX(point.lng, world) - lngToWorldX(camera.lng, world) + box.width / 2,
    y: latToWorldY(point.lat, world) - latToWorldY(camera.lat, world) + box.height / 2,
  };
}

/**
 * Vitesse MESURÉE sur la fenêtre récente (m/s), ou `null` si la fenêtre ne
 * contient pas deux fixes exploitables. Volontairement calculée sur la trace
 * NETTOYÉE (les points déjà gardés par le moteur) : jamais sur des fixes bruts
 * rejetés, jamais sur une extrapolation. Les discontinuités (`gapBefore`) ne
 * sont pas franchies — un trou de signal ne devient pas de la vitesse.
 */
export function recentSpeedMps(
  points: readonly { lat: number; lng: number; ts: number; gapBefore?: true }[],
  nowTs: number,
  windowMs: number,
): number | null {
  const from = nowTs - windowMs;
  let distanceM = 0;
  let firstTs: number | null = null;
  let lastTs: number | null = null;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    if (a === undefined || b === undefined) continue;
    if (b.ts < from) continue;
    if (b.gapBefore === true) continue;
    distanceM += haversineM(a, b);
    firstTs ??= a.ts;
    lastTs = b.ts;
  }
  if (firstTs === null || lastTs === null) return null;
  const elapsedS = (lastTs - firstTs) / 1000;
  if (elapsedS <= 0) return null;
  return distanceM / elapsedS;
}

/**
 * Seuil de RÉDUCTION de la séquence E08 (m/s) : l'allure de référence d'un
 * cycliste (constante de jeu, jamais un nombre posé ici). Au-delà, la fermeture
 * ne s'affiche qu'en pill — aucune surface animée sur la carte.
 */
export const HIGH_SPEED_MPS = (ACTIVITY_REFERENCE_SPEED_KMH.bike * 1000) / 3600;

/** Vitesse inconnue ⇒ JAMAIS « élevée » (on ne réduit pas sur une supposition). */
export function isHighSpeed(speedMps: number | null): boolean {
  return speedMps !== null && speedMps > HIGH_SPEED_MPS;
}
