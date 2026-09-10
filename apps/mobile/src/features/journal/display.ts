/**
 * GRYD — LES BORNES D'AFFICHAGE DU JOURNAL.
 *
 * Ce ne sont PAS des règles de jeu (aucune capture, aucun point, aucun XP n'en
 * dépend) : ce sont des budgets de rendu, nommés ici plutôt qu'écrits en dur au
 * milieu d'un composant, pour qu'ils se changent à un seul endroit.
 */

/**
 * Points maximum dessinés pour UNE trace. Une sortie de deux heures à 1 Hz en
 * porte 7 200 ; au-delà de quelques centaines, le trait ne change plus à l'œil
 * mais le `Path` SVG grossit sans fin. La décimation
 * (`traceRead.decimateForDisplay`) garde les extrémités et les ruptures : elle
 * allège le DESSIN, elle ne déplace jamais le parcours.
 */
export const TRACE_DISPLAY_MAX_POINTS = 400;

/** Points maximum d'une vignette de journal (64 pt de côté). */
export const THUMB_DISPLAY_MAX_POINTS = 120;

/**
 * Hauteur de la carte du détail de sortie, en points. Assez grande pour que la
 * forme du parcours se lise, assez basse pour que les mesures restent visibles
 * sans défilement sur un écran de 375 × 667.
 */
export const DETAIL_MAP_HEIGHT = 196;

/**
 * Nombre de semaines de l'histogramme de distance (écran Statistiques). Huit
 * semaines : deux mois, soit la fenêtre où une régularité se voit sans que les
 * barres deviennent illisibles. La saison, elle, dure six semaines (cahier
 * §6.6) — ce graphique n'en est pas une mesure et ne s'y aligne pas.
 */
export const STATS_WEEKS = 8;

/**
 * Nombre de sorties portées par la courbe « par sortie ». Au-delà, chaque point
 * fait moins d'un pixel de large sur un téléphone.
 */
export const STATS_SESSIONS = 20;
