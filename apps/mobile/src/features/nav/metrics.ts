/**
 * GRYD — métriques de la navigation basse PERSISTANTE (GrydNavBar) :
 *   - barre d'onglets pleine largeur, destinations RÉGULIÈREMENT espacées
 *     (Carte · Crew · Moi en MVP), ancrée au bord bas (au-dessus du safe-area) ;
 *   - capsule d'action « GO » (AMENDEMENT-38) qui FLOTTE ENTIÈREMENT au-dessus de
 *     la barre, centrée (AMENDEMENT-39 : plus d'encastrement — l'ancien slot
 *     réservé supposait 4 onglets ; en MVP 3 onglets, l'encastrement décentrait
 *     GO et le mettait à cheval sur les onglets → « mal placé »).
 * Partagées entre la barre et les écrans (dégagement bas du contenu).
 * Métriques de LAYOUT uniquement — aucune constante de jeu ici.
 */

/** Hauteur du rang d'onglets (trait actif 3 + icône 20 + label 12), hors safe-area. */
export const NAV_BAR_HEIGHT = 60;

/** Hauteur de la capsule d'action « GO » (icône + libellé). */
export const ACTION_BUTTON_HEIGHT = 56;

/**
 * Espace de SÉPARATION entre le bord haut de la barre et le bas de la capsule GO.
 * GO flotte au-dessus de la barre (ne l'encastre plus, ne chevauche plus les
 * onglets) — cet écart garantit la respiration visuelle façon Strava/Nike.
 */
export const ACTION_BUTTON_GAP = 12;

/**
 * Repère « au-dessus de la nav » pour la sheet/CTA de la Carte (l'appelant ajoute
 * `insets.bottom`) : barre + écart + capsule GO flottante en entier + petite marge.
 * Tout contenu ou sheet ancré ici passe donc AU-DESSUS du GO flottant.
 */
export const RUN_BUTTON_BOTTOM = NAV_BAR_HEIGHT + ACTION_BUTTON_GAP + ACTION_BUTTON_HEIGHT + 8;

/**
 * Dégagement bas du contenu scrollable des onglets : la barre et la capsule GO
 * flottante ne recouvrent JAMAIS le contenu.
 */
export const TAB_CONTENT_BOTTOM_CLEARANCE = RUN_BUTTON_BOTTOM + 8;
