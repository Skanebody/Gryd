/**
 * GRYD : géométrie de LA barre basse, qui est UNE et la même partout.
 *
 * Avant le 10/09/2026 il y avait DEUX barres : celle de la Carte (60 pt de
 * haut, 16 pt de garde au bas, l'action Courir dedans) et celle des autres
 * onglets (54 pt, 22 pt, aucune action). Le fondateur les a vues côte à côte
 * sur son iPhone : « le menu en bas avec le bouton Courir doit être le même sur
 * toutes les pages ». Les deux jeux de constantes sont donc fusionnés en un
 * seul ; les anciens noms restent exportés parce que des surfaces héritées les
 * lisent encore (bandeau de sortie en cours, écrans carte legacy), et ils
 * pointent tous sur la même valeur : deux constantes qui divergent, ce sont
 * deux barres qui reviennent.
 *
 * Le dégagement de contenu (`TAB_CONTENT_BOTTOM_CLEARANCE`) vaut toujours 96 :
 * 54 + 22 hier, 60 + 16 aujourd'hui. Aucun écran ne bouge d'un pixel.
 */

/** Hauteur de la barre. Elle doit contenir la pastille d'action (48 pt). */
export const GRYD_NAV_BAR_HEIGHT = 60;
/** Air entre le bas de la barre et l'inset bas de l'appareil. */
export const GRYD_NAV_BOTTOM_GAP = 16;
/** Largeur maximale de la barre : elle ne s'étale pas sur une tablette. */
export const GRYD_NAV_MAX_WIDTH = 360;

/** Alias historiques : même barre, mêmes valeurs, aucune divergence possible. */
export const NAV_BAR_HEIGHT = GRYD_NAV_BAR_HEIGHT;
export const NAV_BOTTOM_GAP = GRYD_NAV_BOTTOM_GAP;
export const NAV_MAP_BAR_HEIGHT = GRYD_NAV_BAR_HEIGHT;
export const NAV_MAP_BOTTOM_GAP = GRYD_NAV_BOTTOM_GAP;
export const NAV_MAP_MAX_WIDTH = GRYD_NAV_MAX_WIDTH;

/** Transitional spacing retained for the recording banner, no longer a floating GO button. */
export const GO_BUTTON_GAP = 18;
/** Scroll content clears the whole floating dock, including its breathing room. */
export const TAB_CONTENT_BOTTOM_CLEARANCE =
  GRYD_NAV_BAR_HEIGHT + GRYD_NAV_BOTTOM_GAP + 20;
