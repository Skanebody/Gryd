/**
 * GRYD — « DANS QUELLE VILLE OUVERTE SUIS-JE ? », côté client, en fonction PURE.
 *
 * ─── À QUOI ÇA SERT, ET SURTOUT À QUOI ÇA NE SERT PAS ───────────────────────
 * L'écran VILLE de l'onboarding propose un RACCOURCI facultatif (« Utiliser ma
 * position ») : il lit la position UNE fois et PRÉSÉLECTIONNE une ville que le
 * joueur confirme ensuite avec le CTA, qui la NOMME. Rien n'est décidé à sa
 * place, rien n'est écrit sans son tap.
 *
 * ⚠️ CE N'EST PAS LE TEST IN/OUT DU JEU. Le seul test qui fait autorité est
 * SERVEUR : les contours réels de `city_zones.geojson` (migration 0033, 123
 * communes pour Paris, la MEL pour Lille). Ici on n'a ni session ni contour —
 * l'écran ville vit AVANT le compte. On travaille donc sur ce que `game-rules`
 * publie de chaque ville : son centre. D'où :
 *
 *   · un rayon de reconnaissance, assumé APPROCHÉ (ci-dessous) ;
 *   · une ville sans centre connu n'est JAMAIS proposée par le raccourci (on ne
 *     devine pas un centre : une ville non reconnue se choisit à la main) ;
 *   · hors rayon ⇒ `null`, et l'écran DIT « tu n'es dans aucune ville ouverte ».
 *     Jamais de repli sur la ville la plus proche, ni sur Paris : le repli qui
 *     invente est le mensonge le plus grave démonté par AMENDEMENT-47.
 *
 * ─── POURQUOI CE MODULE EST PUR ─────────────────────────────────────────────
 * Zéro import React / react-native / expo : ramassé par `npm run test:map`
 * (Deno). Une capture d'écran ne prouve pas qu'un rayon est bien appliqué ; un
 * test le prouve.
 */
import type { LatLngPoint } from '../map/realAnchors';

/** Une ville proposable au raccourci. `center` absent = non reconnaissable. */
export interface LocatableCity {
  readonly cityId: string;
  readonly name: string;
  readonly center?: LatLngPoint;
}

/**
 * Tolérance du RACCOURCI, en kilomètres depuis le centre publié de la ville.
 *
 * Ce n'est PAS une règle de jeu (aucune valeur de score, aucun rejeu serveur) :
 * c'est la tolérance d'un bouton de confort, et c'est pour ça qu'elle vit ici et
 * non dans `game-rules.ts`. Elle est calée sur la taille réelle des deux villes
 * de Saison 0 — Paris et ses 123 communes tiennent dans ~15 km autour du centre,
 * la Métropole de Lille dans ~20 km — avec une marge pour la banlieue proche.
 *
 * Conséquence assumée, et sans danger : quelqu'un aux marges (Versailles,
 * Melun…) peut se voir PROPOSER la ville la plus proche. Il la voit nommée dans
 * le CTA et peut en choisir une autre — la proposition n'affirme rien, elle
 * remplit un champ. Le test qui compte (est-ce que MA course capture ici ?)
 * reste celui du serveur, sur les vrais contours.
 */
export const CITY_MATCH_RADIUS_KM = 25;

/** Rayon terrestre moyen (km) — constante géodésique, pas une règle de jeu. */
const EARTH_RADIUS_KM = 6371;

const toRad = (deg: number): number => (deg * Math.PI) / 180;

/**
 * Distance orthodromique en kilomètres (haversine). PURE.
 *
 * Ré-implémentée ici plutôt qu'importée de `@klaim/engine` : le bundler mobile
 * ne résout pas les imports Deno `.ts` du moteur, et l'importer tirerait h3-js
 * dans le bundle — c'est le motif déjà retenu par `crew/rules.ts` et
 * `route/walkability.ts`.
 */
export function distanceKm(a: LatLngPoint, b: LatLngPoint): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * La ville OUVERTE dans laquelle ce point tombe, ou `null`.
 *
 * INVARIANTS (testés) :
 *  · une ville sans `center` n'est jamais renvoyée ;
 *  · au-delà de `CITY_MATCH_RADIUS_KM`, on renvoie `null` — jamais « la plus
 *    proche quand même » ;
 *  · à égalité, c'est la PREMIÈRE de la liste (ordre serveur, alphabétique) :
 *    le résultat ne dépend pas de l'ordre d'itération d'un Map.
 *
 * GÉNÉRIQUE (23/07/2026) : la fonction rend le TYPE qu'on lui a passé, pas un
 * `LocatableCity` appauvri. C'est ce qui permet à `features/city/catalog.ts` de
 * lui donner des `CityEntry` et de récupérer des `CityEntry` — donc de savoir si
 * la ville reconnue est OUVERTE. Sans ça il aurait fallu une deuxième
 * implémentation du plus-proche-dans-un-rayon, et deux rayons qui divergent.
 */
export function cityAt<T extends LocatableCity>(
  point: LatLngPoint,
  cities: readonly T[],
  radiusKm: number = CITY_MATCH_RADIUS_KM,
): T | null {
  let best: T | null = null;
  let bestKm = Number.POSITIVE_INFINITY;
  for (const city of cities) {
    if (!city.center) continue;
    const km = distanceKm(point, city.center);
    if (km > radiusKm) continue;
    if (km < bestKm) {
      bestKm = km;
      best = city;
    }
  }
  return best;
}

/**
 * Filtre de recherche manuelle : insensible à la casse ET aux accents (« pariss »
 * ne doit pas être la seule façon de trouver Paris, et « metropole » doit
 * trouver « Métropole de Lille »). Requête vide ⇒ la liste entière, jamais un
 * écran de résultats vide au premier affichage.
 */
export function filterCities<T extends { readonly name: string }>(
  cities: readonly T[],
  query: string,
): readonly T[] {
  const q = normalize(query);
  if (q.length === 0) return cities;
  return cities.filter((c) => normalize(c.name).includes(q));
}

/** Minuscules sans diacritiques — comparaison de saisie humaine. PURE. */
export function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
