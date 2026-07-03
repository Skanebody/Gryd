/**
 * GRYD — métriques de la navigation flottante (addendum §F adapté aux 5 onglets
 * de l'AMENDEMENT-02 §5 ; valeurs de la maquette-ui-klaim.html, écran 01).
 * Partagées entre la barre, le bouton COURIR et les écrans (dégagement bas).
 * Métriques de LAYOUT uniquement — aucune constante de jeu ici.
 */

/** Barre pill carbone flottante : hauteur 58, posée 18 px au-dessus du safe-area. */
export const NAV_BAR_HEIGHT = 58;
export const NAV_BAR_BOTTOM = 18;
export const NAV_BAR_SIDE = 16;

/** Bouton COURIR : disque 72 px chartreuse flottant bas-centre (addendum §F). */
export const RUN_BUTTON_SIZE = 72;
export const RUN_HALO_OVERFLOW = 9;
/** Le disque flotte 20 px au-dessus de la barre (maquette : bottom 96). */
export const RUN_BUTTON_BOTTOM = NAV_BAR_BOTTOM + NAV_BAR_HEIGHT + 20;

/** Dégagement bas du contenu scrollable des onglets (barre + disque + marge). */
export const TAB_CONTENT_BOTTOM_CLEARANCE = RUN_BUTTON_BOTTOM + RUN_BUTTON_SIZE + 16;
