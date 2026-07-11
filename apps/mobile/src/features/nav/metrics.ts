/**
 * GRYD — métriques de la navigation basse PERSISTANTE (GrydNavBar) :
 *   - barre d'onglets pleine largeur, 4 destinations (Carte · Crew · Saison ·
 *     Moi), ancrée au bord bas (au-dessus du safe-area) ;
 *   - capsule d'action contextuelle SOULEVÉE au centre, présente sur TOUS les
 *     onglets (RUN / DÉFENDRE / CONQUÉRIR / …) ;
 *   - lien texte « Course libre » au-dessus de la capsule quand le verbe dérivé
 *     n'est pas RUN.
 * Partagées entre la barre et les écrans (dégagement bas du contenu).
 * Métriques de LAYOUT uniquement — aucune constante de jeu ici.
 */

/** Hauteur du rang d'onglets (trait actif 3 + icône 20 + label 12), hors safe-area. */
export const NAV_BAR_HEIGHT = 60;

/** Hauteur de la capsule d'action contextuelle centrale (icône + verbe). */
export const ACTION_BUTTON_HEIGHT = 56;
/** Partie de la capsule ENCASTRÉE dans la barre — le reste dépasse au-dessus. */
export const ACTION_BUTTON_EMBED = 26;
/** Dépassement de la capsule au-dessus du bord haut de la barre. */
export const ACTION_BUTTON_OVERHANG = ACTION_BUTTON_HEIGHT - ACTION_BUTTON_EMBED;

/** Largeur réservée à la capsule au centre du rang d'onglets (2 onglets de chaque côté). */
export const ACTION_SLOT_WIDTH = 104;

/** Dégagement du lien « Course libre » (texte 12 + padding + marge) au-dessus de la capsule. */
export const FREE_RUN_LINK_CLEARANCE = 34;

/**
 * Repère « au-dessus de la nav » pour la sheet/CTA de la Carte (l'appelant
 * ajoute `insets.bottom`) : barre + dépassement de la capsule + lien Course libre.
 */
export const RUN_BUTTON_BOTTOM = NAV_BAR_HEIGHT + ACTION_BUTTON_OVERHANG + FREE_RUN_LINK_CLEARANCE;

/**
 * Dégagement bas du contenu scrollable des onglets : la barre, la capsule
 * centrale (présente sur TOUS les onglets) et le lien « Course libre » ne
 * recouvrent JAMAIS le contenu.
 */
export const TAB_CONTENT_BOTTOM_CLEARANCE = RUN_BUTTON_BOTTOM + 8;
