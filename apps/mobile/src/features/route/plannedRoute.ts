/**
 * GRYD — PARCOURS PLANIFIÉ actif : passe la boucle choisie dans le Route Planner
 * (routée en direct, n'importe où en France) à la Course Live et au Résultat, SANS
 * la sérialiser dans l'URL (une polyligne de ~150 points n'y tient pas proprement).
 * Singleton module (une seule course active à la fois) : le planner l'ARME au
 * « Démarrer », course-live / course-result le LISENT. Persiste jusqu'à la
 * prochaine planification (pas consommé — le résultat le relit après la course).
 */
import type { PlannedRouteDemo } from './types';

let active: PlannedRouteDemo | null = null;

/** Arme le parcours planifié (appelé au « Démarrer » du planner). */
export function setPlannedRoute(route: PlannedRouteDemo | null): void {
  active = route;
}

/** Parcours planifié courant (null si course libre / lancée hors planner). */
export function getPlannedRoute(): PlannedRouteDemo | null {
  return active;
}
