/**
 * GRYD — LECTURE DE POSITION POUR L'ÉCRAN VILLE (variante WEB).
 *
 * Même surface que `locate.ts`, mêmes garanties, autre capteur : sur web c'est
 * l'API du navigateur (via `map/webGeolocation`, déjà écrite et déjà honnête sur
 * les états illisibles de Safari), jamais expo-location — qui n'existe pas là.
 *
 * `LOCATION_CAPABLE` est la différence utile : un navigateur sans
 * `navigator.geolocation` (ou un rendu serveur) ne peut RIEN produire. Le bouton
 * n'y est alors pas peint du tout — l'absence d'un bouton n'est pas un mensonge,
 * un bouton qui échoue à coup sûr en est un (§A4).
 */
import {
  checkForegroundPermission,
  getCurrentPositionOnce,
  requestForegroundPermission,
} from '../map/webGeolocation';
import type { MapLocationProvider } from '../map/locationState';

export const LOCATION_CAPABLE =
  typeof navigator !== 'undefined' && typeof navigator.geolocation !== 'undefined';

export const LOCATION_PROVIDER: MapLocationProvider = {
  checkForegroundPermission,
  requestForegroundPermission,
  getCurrentPositionOnce,
};
