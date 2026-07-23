/**
 * GRYD — LECTURE DE POSITION POUR L'ÉCRAN VILLE (variante NATIVE).
 *
 * L'onboarding est un écran unique (`app/onboarding/index.tsx`) alors que la
 * carte a deux fichiers (`MapScreen.tsx` / `MapScreen.web.tsx`) : c'est ici que
 * le fork de plateforme est isolé, pour que l'écran, lui, ne connaisse ni
 * expo-location ni `navigator.geolocation`. Metro résout `locate.web.ts` sur web.
 *
 * ⚠️ CE MODULE NE DEMANDE RIEN TOUT SEUL. Il expose de quoi le faire ; l'appel
 * part d'un GESTE explicite du joueur (le bouton facultatif « Utiliser ma
 * position »), précédé de sa phrase d'explication à l'écran — jamais au montage,
 * jamais avant les cartes pédagogiques. La séquence elle-même reste celle,
 * testée, de `map/locationState.ts` : une seule logique de décision pour toute
 * l'app.
 */
import {
  checkForegroundPermission,
  getCurrentPositionOnce,
  requestForegroundPermission,
} from '../run/gps/provider';
import type { MapLocationProvider } from '../map/locationState';

/**
 * Y a-t-il un capteur derrière le bouton ? Sur natif, expo-location est toujours
 * lié au build : le bouton peut être peint (« aucun bouton mort » § A4 ne parle
 * pas d'un refus possible, mais d'une action qui ÉCHOUE À COUP SÛR).
 */
export const LOCATION_CAPABLE = true;

export const LOCATION_PROVIDER: MapLocationProvider = {
  checkForegroundPermission,
  requestForegroundPermission,
  getCurrentPositionOnce,
};
