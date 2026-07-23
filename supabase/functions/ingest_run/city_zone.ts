/**
 * GRYD — rattachement d'une course à une VILLE (logique PURE, testable).
 *
 * ═══ POURQUOI CE MODULE ═════════════════════════════════════════════════════
 * `cityId` n'est plus un membre d'enum. Tant que `CITIES` était fermé, deux
 * questions se confondaient : « cette ville existe-t-elle ? » et « ce texte
 * a-t-il la forme d'un identifiant ? ». Elles se séparent maintenant :
 *   · la FORME se juge ici, sans I/O (ce fichier) ;
 *   · l'EXISTENCE se juge contre `city_zones`, en base, à l'exécution — jamais
 *     à la compilation, jamais contre la liste de DÉMARRAGE.
 *
 * Et une troisième question apparaît, qui n'existait pas à deux villes : quand
 * PLUSIEURS zones contiennent le point de départ, laquelle gagne ? À deux
 * villes distantes de 205 km la question ne se posait pas. Avec des aires de
 * jeu circulaires de 15 km posées sur un référentiel européen, les
 * recouvrements sont la norme (Lille et Roubaix sont à 12 km). Un « la première
 * que la base renvoie » ferait dépendre le classement d'un ordre de lignes non
 * spécifié : deux courses identiques pourraient compter pour deux villes.
 * `pickCityZone` tranche DÉTERMINISTEMENT, et le test le prouve.
 */
import { type GeoJsonPolygonal, pointInGeoJson } from '../_shared/engine/hexing.ts';
import { isStarterCityId } from '../_shared/game-rules.ts';

/**
 * Ligne de `city_zones` telle que lue par `ingest_run`. Les bornes de la boîte
 * englobante sont NOT NULL en base depuis la migration 0066 — elles sont typées
 * `number` ici, et une ligne qui n'en porterait pas est traitée comme non
 * mesurable plutôt que comme couvrant tout (voir `bboxContains`).
 */
export interface CityZoneRow {
  readonly city_id: string;
  readonly name: string;
  readonly status: string;
  readonly geojson: unknown;
  readonly min_lat: number | null;
  readonly max_lat: number | null;
  readonly min_lng: number | null;
  readonly max_lng: number | null;
}

/**
 * FORME d'un `city_id` acceptable. Volontairement étroite, pour deux raisons
 * qui ne sont pas cosmétiques :
 *  · `city_id` est la clé de hachage du tirage de la Zone du Jour (migration
 *    0052) — un id fantaisiste y entrerait tel quel ;
 *  · il voyage dans des filtres PostgREST (`.eq('city_id', …)`) où les
 *    virgules, points et parenthèses ont une syntaxe.
 * Les deux espaces d'identifiants légitimes y entrent : les villes de démarrage
 * (`paris`, `lille`) et les `geonameid` GeoNames (`2988507`).
 *
 * ⚠️ Passer ce test ne veut PAS dire que la ville existe. Rien ici ne remplace
 * la vérification contre `city_zones`.
 */
export const CITY_ID_SHAPE = /^[A-Za-z0-9_-]{1,64}$/;

/** Vrai si `v` a la FORME d'un `city_id` (son existence reste à vérifier en base). */
export function isCityIdShape(v: unknown): v is string {
  return typeof v === 'string' && CITY_ID_SHAPE.test(v);
}

/**
 * Aire de la boîte englobante en degrés². Sert d'ordre de SPÉCIFICITÉ entre
 * zones qui se recouvrent : la plus petite est la plus précise. Ce n'est pas
 * une surface géodésique et ça n'a pas à l'être — on compare des zones voisines,
 * à la même latitude, pas des continents.
 */
function bboxArea(z: CityZoneRow): number {
  if (z.min_lat === null || z.max_lat === null || z.min_lng === null || z.max_lng === null) {
    return Number.POSITIVE_INFINITY; // non mesurable ⇒ jamais préférée
  }
  return (z.max_lat - z.min_lat) * (z.max_lng - z.min_lng);
}

/**
 * Pré-filtre grossier. Une zone sans boîte englobante n'est PAS considérée
 * comme couvrant tout : la migration 0066 rend ces colonnes NOT NULL, et une
 * ligne qui y échapperait est une anomalie — l'ignorer est plus sûr que de la
 * laisser capturer toutes les courses.
 */
export function bboxContains(z: CityZoneRow, lat: number, lng: number): boolean {
  if (z.min_lat === null || z.max_lat === null || z.min_lng === null || z.max_lng === null) {
    return false;
  }
  return lat >= z.min_lat && lat <= z.max_lat && lng >= z.min_lng && lng <= z.max_lng;
}

/**
 * Zone à laquelle rattacher un point, ou `undefined` s'il n'est dans aucune.
 *
 * ORDRE DE PRÉFÉRENCE, dans cet ordre exact :
 *  1. **contour réel avant approximation** — une ville de DÉMARRAGE porte le
 *     contour officiel importé de geo.api.gouv.fr (migration 0033) ; les autres
 *     portent un disque déclaré comme approximatif (`CITY_DISC_RADIUS_M`). Quand
 *     les deux contiennent le point, le contour réel dit la vérité, le disque
 *     l'approche ;
 *  2. **la plus spécifique** — plus petite boîte englobante ;
 *  3. **`city_id` croissant** — départage stable, pour qu'une égalité parfaite
 *     ne rende jamais deux réponses différentes à deux courses identiques.
 *
 * Aucun rattachement n'est une réponse VALIDE : la capture n'est bornée par
 * aucune ville (AMENDEMENT-02 §2, Europe entière). Hors zone, la course reste
 * pleinement valide — seul le rattachement au classement est absent.
 */
export function pickCityZone(
  lat: number,
  lng: number,
  zones: readonly CityZoneRow[],
): CityZoneRow | undefined {
  const inside = zones.filter(
    (z) =>
      isCityIdShape(z.city_id) &&
      bboxContains(z, lat, lng) &&
      pointInGeoJson(lat, lng, z.geojson as GeoJsonPolygonal),
  );
  if (inside.length === 0) return undefined;
  if (inside.length === 1) return inside[0];

  return inside.slice().sort((a, b) => {
    const aReal = isStarterCityId(a.city_id) ? 0 : 1;
    const bReal = isStarterCityId(b.city_id) ? 0 : 1;
    if (aReal !== bReal) return aReal - bReal;
    const area = bboxArea(a) - bboxArea(b);
    if (area !== 0) return area;
    return a.city_id < b.city_id ? -1 : a.city_id > b.city_id ? 1 : 0;
  })[0];
}
