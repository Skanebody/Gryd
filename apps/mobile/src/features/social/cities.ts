/**
 * GRYD — LE CENTRE D'UNE VILLE, pour cadrer une carte. Rien d'autre.
 *
 * ─── CE QUI A DISPARU D'ICI (23/07/2026) ───────────────────────────────────
 * Ce module portait aussi `useCityChoices` et `FALLBACK_CITIES` : une DEUXIÈME
 * liste de villes, avec sa propre lecture de `city_zones` et son propre repli
 * sur `game-rules.CITIES`. Deux listes de villes, c'était deux réponses
 * possibles à « quelles villes existent ? », et surtout un repli qui AFFIRMAIT
 * « Paris est ouverte » sans jamais l'avoir lu. Le sélecteur partagé
 * (`features/city/`) est désormais la seule source : il lit `city_zones` pour
 * savoir ce qui est OUVERT, il propose les 7 870 villes réelles d'Europe pour
 * savoir ce qui EXISTE, et il ne confond jamais les deux.
 *
 * ─── CE QUI RESTE ──────────────────────────────────────────────────────────
 * `cityCenter(cityId)` : le point sur lequel CADRER la carte quand le joueur a
 * choisi une ville. Un cadrage — aucune zone, aucun propriétaire, aucun
 * classement, aucune capture n'en découle. Le seul test in/out qui fasse
 * autorité reste serveur, sur les contours de `city_zones.geojson`.
 */
import { findCityById, parsePackedCitiesCached, starterCityCenter } from '@klaim/shared';
// ⚠️ CHEMIN PROFOND VOLONTAIRE (`/src/`) — voir features/city/useCityCatalog.ts :
// Metro n'active pas les `exports` de package (unstable_enablePackageExports =
// false) et le TS mobile est en `moduleResolution: node`.
import { EU_CITIES_PACKED } from '@klaim/shared/src/cities-eu';

/**
 * Centre connu d'une ville, ou `undefined`.
 *
 * DEUX SOURCES, dans cet ordre :
 *  1. `game-rules.starterCityCenter` — les villes de DÉMARRAGE (`paris`,
 *     `lille`), dont l'identifiant est historique et le centre publié ;
 *  2. le RÉFÉRENTIEL des villes d'Europe, par `geonameid`.
 *
 * La source 2 est nouvelle et répare un vrai trou : avant, une ville choisie
 * hors des deux villes de Saison 0 n'avait AUCUN centre, donc la carte
 * d'arrivée ne se cadrait sur rien. Le joueur qui choisissait Berlin
 * atterrissait sur la vue par défaut, sans explication. Maintenant que le
 * sélecteur propose 7 870 villes, ce cas serait devenu le cas NORMAL.
 *
 * `undefined` reste possible (identifiant inconnu des deux) et se traite comme
 * tel partout : on ne devine pas un centre, et surtout on n'en fabrique pas un
 * à 0,0 — au large du golfe de Guinée.
 */
export function cityCenter(cityId: string | null): { lat: number; lng: number } | undefined {
  if (!cityId) return undefined;
  const starter = starterCityCenter(cityId);
  if (starter) return { lat: starter.lat, lng: starter.lng };
  const city = findCityById(parsePackedCitiesCached(EU_CITIES_PACKED), cityId);
  return city ? { lat: city.lat, lng: city.lng } : undefined;
}
