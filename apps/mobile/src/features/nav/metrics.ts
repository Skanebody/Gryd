/**
 * GRYD — métriques de la navigation basse PERSISTANTE (GrydNavBar) + du CTA RUN
 * sur la Carte (Vague 1 · E02) :
 *   - barre d'onglets pleine largeur (Carte · Crew · Profil), ancrée au bas ;
 *   - CTA RUN = sneaker 60 pt (rond à droite de la sheet déployée ; pill +
 *     « RUN » au-dessus de la nav quand la sheet est fermée). Plus de piste
 *     SlideToStart pleine largeur (E02).
 * Métriques de LAYOUT uniquement — aucune constante de jeu ici.
 */

/** Hauteur du rang d'onglets (trait actif 3 + icône 20 + label 12), hors safe-area. */
export const NAV_BAR_HEIGHT = 60;

/** Diamètre du CTA RUN (planche E02 — 60 pt). */
export const RUN_CTA_SIZE = 60;
/** Écart entre le haut de la barre d'onglets et le bas du CTA RUN (forme pill). */
export const RUN_CTA_GAP = 12;

/** @deprecated Alias E02 — hauteur CTA (ex-piste SlideToStart). */
export const SLIDE_START_HEIGHT = RUN_CTA_SIZE;
/** @deprecated Alias E02. */
export const SLIDE_START_GAP = RUN_CTA_GAP;

/**
 * Dégagement bas du contenu scrollable des onglets NON-carte (Crew, Profil,
 * écrans poussés) : seule la barre d'onglets est à dégager. L'appelant ajoute
 * `insets.bottom`.
 */
export const TAB_CONTENT_BOTTOM_CLEARANCE = NAV_BAR_HEIGHT + 8;

/**
 * Repère « au-dessus de la nav » sur la CARTE (l'appelant ajoute `insets.bottom`) :
 * barre d'onglets + petite marge. La sheet s'ancre ici ; le CTA RUN rond flotte
 * à droite du bloc mission (il ne réserve plus une piste pleine largeur).
 */
export const RUN_BUTTON_BOTTOM = NAV_BAR_HEIGHT + 8;
