/**
 * GRYD — métriques de la navigation flottante (addendum §F adapté aux 5 onglets
 * de l'AMENDEMENT-02 §5 ; valeurs de la maquette-ui-klaim.html, écran 01).
 * Partagées entre la barre, le bouton d'action flottant et les écrans (dégagement bas).
 * Métriques de LAYOUT uniquement — aucune constante de jeu ici.
 */

/** Barre pill carbone flottante : hauteur 64 (icône 22 + label 10 empilés), 18 px au-dessus du safe-area. */
export const NAV_BAR_HEIGHT = 64;
export const NAV_BAR_BOTTOM = 18;
export const NAV_BAR_SIDE = 16;

/**
 * AMENDEMENT-29 : le BOUTON D'ACTION FLOTTANT CONTEXTUEL revient (supersède le
 * retrait AMENDEMENT-17). Il flotte AU-DESSUS de la barre de nav, centré, et
 * n'est rendu que sur les écrans gatés (Carte / Missions / War Room / détail
 * zone-route / boucle) par (tabs)/_layout. Ces métriques positionnent la
 * capsule et alignent la sheet/CTA de la Carte au-dessus d'elle.
 */
export const RUN_BUTTON_SIZE = 72;
export const RUN_HALO_OVERFLOW = 9;
/** Repère « au-dessus de la barre » pour la sheet/CTA de la Carte (bottom 96). */
export const RUN_BUTTON_BOTTOM = NAV_BAR_BOTTOM + NAV_BAR_HEIGHT + 20;

/** Hauteur de la capsule d'action flottante (AMENDEMENT-29) — cf. ContextualRunButton.fab. */
export const FAB_HEIGHT = 56;
/** Dégagement de la capsule flottante au-dessus de la barre de nav. */
export const FAB_ABOVE_NAV = 14;
/**
 * Bas de la capsule flottante = au-dessus de la barre pill (l'appelant ajoute
 * `insets.bottom`). La capsule occupe donc [FAB_BOTTOM, FAB_BOTTOM + FAB_HEIGHT].
 */
export const FAB_BOTTOM = NAV_BAR_BOTTOM + NAV_BAR_HEIGHT + FAB_ABOVE_NAV;

/**
 * Dégagement bas du contenu scrollable des onglets. Sur les écrans SANS bouton
 * flottant (Profil / Saison / Crew…), il ne réserve que la barre pill + une
 * marge de confort. Les écrans QUI portent le flottant (Missions) ajoutent
 * eux-mêmes la hauteur de la capsule à leur padding bas si besoin.
 */
export const TAB_CONTENT_BOTTOM_CLEARANCE = NAV_BAR_BOTTOM + NAV_BAR_HEIGHT + 24;
