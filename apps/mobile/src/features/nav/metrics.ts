/**
 * GRYD — métriques de la navigation basse PERSISTANTE (GrydNavBar) + du bouton
 * GO de la Carte :
 *   - barre d'onglets pleine largeur, destinations RÉGULIÈREMENT espacées
 *     (Carte · Crew · Profil en MVP), ancrée au bord bas (au-dessus du safe-area) ;
 *   - le DÉPART de course n'est PAS dans la nav : c'est le bouton GO, rendu
 *     UNIQUEMENT sur la Carte, juste au-dessus de la barre d'onglets.
 * Métriques de LAYOUT uniquement — aucune constante de jeu ici.
 *
 * ─── NETTOYAGE DU 25/07/2026 (planche E02) ──────────────────────────────────
 * Ont disparu d'ici, et volontairement listés pour que personne ne les
 * « restaure » en croyant réparer un trou :
 *   • `SLIDE_START_HEIGHT` (60) — la hauteur de la piste « glisser pour courir »
 *     (SlideToStart). Ce composant n'était plus importé nulle part depuis que le
 *     départ est un simple TAP ; le fichier a été supprimé avec cette constante.
 *   • `RUN_BUTTON_BOTTOM` (= nav + gap + piste + 8 = 140) — l'ancre « au-dessus
 *     du départ de course », partagée par la sheet, les FABs, l'attribution, la
 *     note d'état et l'échelle. Elle décrivait une piste qui n'existait plus, et
 *     elle laissait 152 px de vide entre la sheet et la barre d'onglets (le
 *     « flottement » remonté par le fondateur). Depuis la planche E02, la sheet
 *     est COLLÉE à `insets.bottom + NAV_BAR_HEIGHT` et les mentions flottantes
 *     s'ancrent au HAUT DE SON PEEK (map/mapUiStore → `useMapSheetLayout`).
 */

/** Hauteur du rang d'onglets (trait actif 3 + icône 20 + label 12), hors safe-area. */
export const NAV_BAR_HEIGHT = 60;

/** Écart entre le haut de la barre d'onglets et le bas du bouton GO (Carte). */
export const GO_BUTTON_GAP = 12;

/**
 * Dégagement bas du contenu scrollable des onglets NON-carte (Crew, Moi, écrans
 * poussés) : seule la barre d'onglets est à dégager — le départ de course ne vit
 * pas ici. L'appelant ajoute `insets.bottom`.
 */
export const TAB_CONTENT_BOTTOM_CLEARANCE = NAV_BAR_HEIGHT + 8;
