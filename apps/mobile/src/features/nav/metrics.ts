/**
 * GRYD — métriques de la navigation flottante (addendum §F adapté aux 5 onglets
 * de l'AMENDEMENT-02 §5 ; valeurs de la maquette-ui-klaim.html, écran 01).
 * Partagées entre la barre, le bouton COURIR et les écrans (dégagement bas).
 * Métriques de LAYOUT uniquement — aucune constante de jeu ici.
 */

/** Barre pill carbone flottante : hauteur 64 (icône 22 + label 10 empilés), 18 px au-dessus du safe-area. */
export const NAV_BAR_HEIGHT = 64;
export const NAV_BAR_BOTTOM = 18;
export const NAV_BAR_SIDE = 16;

/**
 * AMENDEMENT-17 §1.1 : le disque GO ne flotte PLUS en overlay global. Ces
 * métriques ne servent qu'à la CARTE, qui positionne son CTA de lancement
 * (RunButton inline) et sa sheet AU-DESSUS de la barre. Conservées ici comme
 * repère de layout partagé — plus aucun overlay bas-centre permanent.
 */
export const RUN_BUTTON_SIZE = 72;
export const RUN_HALO_OVERFLOW = 9;
/** Repère « au-dessus de la barre » pour la sheet/CTA de la Carte (bottom 96). */
export const RUN_BUTTON_BOTTOM = NAV_BAR_BOTTOM + NAV_BAR_HEIGHT + 20;

/**
 * Dégagement bas du contenu scrollable des onglets : SANS le FAB (supprimé,
 * AMENDEMENT-17 §1.1). Il ne reste que la barre pill flottante + une marge de
 * confort — le padding bas gaspillé par le disque disparaît (moins de vide sous
 * le fold, plus de valeur visible sans scroll).
 */
export const TAB_CONTENT_BOTTOM_CLEARANCE = NAV_BAR_BOTTOM + NAV_BAR_HEIGHT + 24;
