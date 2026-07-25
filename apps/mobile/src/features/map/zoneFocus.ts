/**
 * GRYD — CADRAGE de la zone tapée AU-DESSUS de la sheet (planche E04 : « la
 * caméra la cadre au-dessus du sheet »). Géométrie PURE, zéro import React /
 * MapLibre : testable en Deno.
 *
 * POURQUOI CE MODULE EXISTE. `RealMapHandle.flyTo` n'accepte ni padding ni
 * offset (ui/game/RealMap*.tsx, hors périmètre carte) : centrer la caméra sur le
 * centroïde de la zone la poserait au MILIEU de l'écran, donc à moitié cachée
 * par une sheet qui occupe le bas. La correction ne peut donc pas être un
 * réglage de caméra — c'est un calcul : de combien faut-il déplacer le CENTRE
 * pour que la zone tombe au milieu de la bande RESTÉE VISIBLE ?
 *
 * On raisonne en Web Mercator, la projection du fond (tuiles 512 px) : un
 * déplacement de N pixels à l'écran est une CONSTANTE en y mercator
 * (`N / worldSize`), alors qu'il vaut un nombre de degrés qui dépend de la
 * latitude ET du zoom. Convertir « px → degrés » à la louche décadrerait la
 * zone d'autant plus qu'on est loin de l'équateur.
 *
 * Aucune constante de JEU ici — uniquement de la projection cartographique.
 */

/** Taille de tuile de la projection (MapLibre : 512 px). */
export const TILE_SIZE_PX = 512;

/**
 * Latitude maximale représentable en Web Mercator (le pôle y part à l'infini).
 * Au-delà, on borne : mieux vaut un cadrage légèrement décalé qu'un NaN qui
 * enverrait la caméra nulle part.
 */
export const MERCATOR_MAX_LAT = 85.05112878;

/** Borne `v` dans [min, max]. */
function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

/** Latitude → y mercator NORMALISÉ : 0 au nord, 1 au sud. PURE. */
export function mercatorY(lat: number): number {
  const bounded = clamp(lat, -MERCATOR_MAX_LAT, MERCATOR_MAX_LAT);
  const rad = (bounded * Math.PI) / 180;
  return clamp((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2, 0, 1);
}

/** y mercator normalisé → latitude. Inverse exacte de `mercatorY`. PURE. */
export function latFromMercatorY(y: number): number {
  const bounded = clamp(y, 0, 1);
  const rad = 2 * Math.atan(Math.exp((1 - 2 * bounded) * Math.PI)) - Math.PI / 2;
  return (rad * 180) / Math.PI;
}

/** Largeur du monde en pixels au zoom donné (projection Web Mercator). */
export function worldSizePx(zoom: number): number {
  return TILE_SIZE_PX * Math.pow(2, Math.max(0, zoom));
}

export interface ZoneFocusInput {
  /** Latitude du centroïde de la zone à cadrer. */
  lat: number;
  /** Zoom auquel la caméra va se poser. */
  zoom: number;
  /**
   * Hauteur VISIBLE de la sheet (px), bord bas de l'écran compris. La bande
   * libre va donc de 0 à `viewportH - sheetHeightPx` : son milieu est
   * `sheetHeightPx / 2` pixels PLUS HAUT que le centre de l'écran.
   */
  sheetHeightPx: number;
}

/**
 * Latitude à donner au CENTRE de la caméra pour que `lat` apparaisse au milieu
 * de la bande laissée libre par la sheet.
 *
 * Le centre part donc vers le SUD (l'écran descend d'autant), de la moitié de la
 * hauteur de sheet. Sheet absente (0 px) ⇒ la latitude est rendue telle quelle :
 * aucun décalage gratuit.
 */
export function zoneFocusLat(input: ZoneFocusInput): number {
  const sheet = Math.max(0, input.sheetHeightPx);
  if (sheet === 0) return input.lat;
  const world = worldSizePx(input.zoom);
  if (!(world > 0)) return input.lat;
  return latFromMercatorY(mercatorY(input.lat) + sheet / 2 / world);
}

/**
 * Décalage VERTICAL (px, positif = vers le BAS de l'écran) entre deux latitudes
 * à un zoom donné. Exporté pour les tests : c'est la seule façon de vérifier que
 * `zoneFocusLat` place vraiment la zone à `sheetHeightPx / 2` au-dessus du
 * centre, plutôt que « quelque part plus haut ».
 */
export function pixelOffsetBetweenLats(from: number, to: number, zoom: number): number {
  return (mercatorY(to) - mercatorY(from)) * worldSizePx(zoom);
}
