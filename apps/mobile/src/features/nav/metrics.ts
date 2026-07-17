/**
 * GRYD — métriques de la navigation basse PERSISTANTE (GrydNavBar) + du départ de
 * course sur la Carte :
 *   - barre d'onglets pleine largeur, destinations RÉGULIÈREMENT espacées
 *     (Carte · Crew · Moi en MVP), ancrée au bord bas (au-dessus du safe-area) ;
 *   - le DÉPART de course (SlideToStart, override fondateur) n'est PLUS dans la nav :
 *     il vit UNIQUEMENT sur la Carte, en bas, au-dessus de la barre d'onglets.
 * Métriques de LAYOUT uniquement — aucune constante de jeu ici.
 */

/** Hauteur du rang d'onglets (trait actif 3 + icône 20 + label 12), hors safe-area. */
export const NAV_BAR_HEIGHT = 60;

/** Hauteur de la piste « glisser pour courir » (SlideToStart), sur la Carte. */
export const SLIDE_START_HEIGHT = 60;
/** Écart entre le haut de la barre d'onglets et le bas de la piste de départ. */
export const SLIDE_START_GAP = 12;

/**
 * Dégagement bas du contenu scrollable des onglets NON-carte (Crew, Moi, écrans
 * poussés) : seule la barre d'onglets est à dégager — le départ de course ne vit
 * plus ici. L'appelant ajoute `insets.bottom`.
 */
export const TAB_CONTENT_BOTTOM_CLEARANCE = NAV_BAR_HEIGHT + 8;

/**
 * Repère « au-dessus du départ de course » sur la CARTE (l'appelant ajoute
 * `insets.bottom`) : barre d'onglets + écart + piste SlideToStart + petite marge.
 * Toute sheet / FAB / mention de la carte s'ancre AU-DESSUS de cette valeur, donc
 * au-dessus de la piste de départ.
 */
export const RUN_BUTTON_BOTTOM = NAV_BAR_HEIGHT + SLIDE_START_GAP + SLIDE_START_HEIGHT + 8;
