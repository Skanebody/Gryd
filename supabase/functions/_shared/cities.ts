/**
 * GRYD — MOTEUR PUR du référentiel de villes.
 *
 * Fonctions SANS effet de bord et sans I/O : parsing du référentiel packé,
 * normalisation et recherche, génération du polygone d'aire de jeu. La DONNÉE
 * vit à côté, dans `cities-eu.ts` (généré) ; ce module ne l'importe PAS — il la
 * reçoit en paramètre. C'est ce qui permet à un appelant qui n'a besoin que du
 * disque (le serveur qui ouvre une ville) de ne pas tirer les ~346 ko de référentiel
 * dans son bundle, et aux tests de rester instantanés.
 *
 * Hébergé dans `shared` et non dans `engine` (comme streak.ts / habits.ts /
 * season.ts) pour que le mobile l'importe sans tirer h3-js dans le bundle Metro :
 * il n'importe que des constantes.
 *
 * ⚠️ RIEN ICI NE FABRIQUE DE LA DONNÉE DE JEU. Ces fonctions manipulent une
 * géographie réelle. Aucune ne rend un classement, un territoire, un rival ni
 * une densité — une ville sans joueurs ressort d'une recherche exactement comme
 * les autres, et c'est à l'écran de dire qu'elle est vide.
 */
import {
  CITY_DISC_POLYGON_VERTICES,
  CITY_DISC_RADIUS_M,
  CITY_SEARCH_MIN_QUERY_LENGTH,
  CITY_SEARCH_RESULT_LIMIT,
} from './game-rules.ts';
import type { EuCity } from './types.ts';

/** Rayon terrestre moyen (m) — même valeur que les moteurs engine/*.ts. */
const EARTH_RADIUS_M = 6_371_000;
const RAD_PER_DEG = Math.PI / 180;
const DEG_PER_RAD = 180 / Math.PI;

/** Séparateur de champs du format packé — MIROIR de scripts/generate-eu-cities.mjs. */
export const CITY_FIELD_SEPARATOR = '|';
/** Séparateur d'enregistrements du format packé — MIROIR du script de génération. */
export const CITY_RECORD_SEPARATOR = '\n';

// ═══════════════════════════════════════════════════════════════════════════
// PARSING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parse le référentiel packé (`geonameid|nom|codePays|lat|lng|population` par
 * ligne) en villes. Les lignes vides sont ignorées ; une ligne MALFORMÉE est
 * ignorée elle aussi plutôt que d'être « réparée » avec des zéros — une ville
 * dont on ne sait pas où elle est ne doit pas être proposée au choix.
 *
 * L'ordre de la source est CONSERVÉ (population décroissante), la recherche s'en
 * sert comme classement naturel.
 */
export function parsePackedCities(packed: string): readonly EuCity[] {
  const out: EuCity[] = [];
  for (const line of packed.split(CITY_RECORD_SEPARATOR)) {
    if (line.length === 0) continue;
    const f = line.split(CITY_FIELD_SEPARATOR);
    // Au MOINS 6 champs, et non EXACTEMENT 6 : un champ supplémentaire en fin de
    // ligne (les exonymes « Bruxelles / Londres / Cracovie », cf. le suspens
    // documenté dans generate-eu-cities.mjs) doit pouvoir être ajouté au
    // référentiel sans casser les consommateurs déjà déployés. Une ligne
    // INCOMPLÈTE reste rejetée : c'est la donnée manquante qui est dangereuse,
    // pas la donnée en trop.
    if (f.length < 6) continue;
    const [id, name, country, latRaw, lngRaw, popRaw] = f;
    if (!id || !name || !country) continue;
    // ⚠️ `Number('')` vaut 0, et 0 est fini : une coordonnée VIDE passerait la
    // garde `Number.isFinite` et poserait la ville au large du golfe de Guinée.
    // On exige donc un champ non vide AVANT de convertir — « réparer » une
    // position inconnue en 0,0 serait exactement fabriquer de la donnée.
    if (!latRaw || !lngRaw || latRaw.trim() === '' || lngRaw.trim() === '') continue;
    const lat = Number(latRaw);
    const lng = Number(lngRaw);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue;
    const population = Number(popRaw);
    out.push({
      id,
      name,
      country,
      lat,
      lng,
      population: Number.isFinite(population) ? population : 0,
    });
  }
  return out;
}

/**
 * Cache de parsing, clé = la chaîne packée elle-même. Le référentiel est un
 * littéral de module : la même référence revient à chaque appel, on ne le parse
 * donc qu'une fois par exécution même si dix écrans le demandent.
 */
const parseCache = new Map<string, readonly EuCity[]>();

/** `parsePackedCities` mémoïsé — à préférer partout côté application. */
export function parsePackedCitiesCached(packed: string): readonly EuCity[] {
  const hit = parseCache.get(packed);
  if (hit) return hit;
  const parsed = parsePackedCities(packed);
  parseCache.set(packed, parsed);
  return parsed;
}

// ═══════════════════════════════════════════════════════════════════════════
// NORMALISATION + RECHERCHE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Normalise une saisie pour la comparaison : minuscules, diacritiques retirés,
 * séparateurs (tirets, apostrophes, points) ramenés à l'espace, espaces
 * compactés. « Saint-Étienne » → « saint etienne », « ZÜRICH » → « zurich »,
 * « L'Haÿ-les-Roses » → « l hay les roses ».
 *
 * Sans cela, un coureur français tapant « Zurich » ou « Malaga » sans accent ne
 * trouverait jamais Zürich ni Málaga — et conclurait que sa ville n'existe pas.
 * NFD sépare la lettre de son signe diacritique ; `U+0300–U+036F` (bloc
 * « Combining Diacritical Marks ») retire les signes ainsi isolés.
 */
export function normalizeCityQuery(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’\-_.,()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Rang de correspondance : plus petit = meilleur. `null` = pas de correspondance. */
function matchRank(normalizedName: string, query: string): number | null {
  if (normalizedName === query) return 0; // égalité exacte
  if (normalizedName.startsWith(query)) return 1; // début du nom
  // Début d'un MOT du nom : « york » doit remonter « New York ».
  if (normalizedName.includes(' ' + query)) return 2;
  if (normalizedName.includes(query)) return 3; // n'importe où
  return null;
}

/** Options de `searchCities`. */
export interface CitySearchOptions {
  /** Nombre maximal de résultats (défaut : `CITY_SEARCH_RESULT_LIMIT`). */
  limit?: number;
  /** Longueur minimale de requête (défaut : `CITY_SEARCH_MIN_QUERY_LENGTH`). */
  minQueryLength?: number;
}

/**
 * Cherche des villes par nom. Rendu classé : égalité exacte, puis début de nom,
 * puis début de mot, puis correspondance quelconque ; à rang égal, la plus
 * peuplée d'abord — et à population égale, l'identifiant croissant, pour que le
 * résultat soit DÉTERMINISTE (deux appels identiques rendent le même ordre).
 *
 * Requête trop courte (ou vide) : rend le HAUT du référentiel plutôt qu'une
 * liste vide. Le référentiel étant trié par population, l'écran d'un utilisateur
 * qui n'a encore rien tapé montre des villes réelles et connues, jamais un vide
 * inexplicable.
 *
 * Les homonymes ne sont pas déduplinqués : Brest (FR) et Brest (BY) sont deux
 * villes différentes et doivent toutes deux être choisissables — c'est le code
 * pays affiché qui les départage, et le `geonameid` qui les distingue en base.
 */
export function searchCities(
  cities: readonly EuCity[],
  query: string,
  options: CitySearchOptions = {},
): readonly EuCity[] {
  const limit = options.limit ?? CITY_SEARCH_RESULT_LIMIT;
  const minLength = options.minQueryLength ?? CITY_SEARCH_MIN_QUERY_LENGTH;
  const q = normalizeCityQuery(query);

  if (q.length < minLength) return cities.slice(0, Math.max(0, limit));

  const scored: { city: EuCity; rank: number }[] = [];
  for (const city of cities) {
    const rank = matchRank(normalizeCityQuery(city.name), q);
    if (rank !== null) scored.push({ city, rank });
  }
  scored.sort(
    (a, b) =>
      a.rank - b.rank ||
      b.city.population - a.city.population ||
      (a.city.id < b.city.id ? -1 : a.city.id > b.city.id ? 1 : 0),
  );
  return scored.slice(0, Math.max(0, limit)).map((s) => s.city);
}

/** Retrouve une ville par son identifiant (`geonameid`), ou `undefined`. */
export function findCityById(
  cities: readonly EuCity[],
  id: string,
): EuCity | undefined {
  return cities.find((c) => c.id === id);
}

/**
 * Libellé d'affichage : « Nom · PAYS ». Le code pays est TOUJOURS présent, pas
 * seulement en cas d'homonymie : un libellé dont la forme change selon le reste
 * de la liste est illisible, et des noms européens sont ambigus (Brest BY/FR,
 * Bergen…).
 *
 * ⚠️ Le séparateur n'est PAS une parenthèse, et c'est délibéré : 30 noms du
 * référentiel en portent déjà une (« Halle (Saale) », « Frankfurt (Oder) »,
 * « Zürich (Kreis 11) »). Suffixer « (DE) » derrière donnait
 * « Halle (Saale) (DE) » — deux parenthèses imbriquées que l'œil doit démêler,
 * dans une liste qu'on doit comprendre en moins de 3 s (§A).
 */
export function cityLabel(city: EuCity): string {
  return `${city.name} · ${city.country}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// AIRE DE JEU — disque autour du point du référentiel
// ═══════════════════════════════════════════════════════════════════════════

/** Un anneau GeoJSON : suite de `[lng, lat]`, premier point répété en dernier. */
export type GeoRing = readonly (readonly [number, number])[];

/** Polygone GeoJSON minimal — la forme attendue par `city_zones.geojson`. */
export interface GeoPolygon {
  type: 'Polygon';
  coordinates: readonly GeoRing[];
}

/**
 * Anneau approximant le cercle de rayon `radiusM` autour de `center`.
 *
 * ⚠️ APPROXIMATION DÉCLARÉE de l'aire de jeu — pas un contour administratif
 * (voir `CITY_DISC_RADIUS_M`). Sens ANTI-HORAIRE (right-hand rule RFC 7946 pour
 * un anneau extérieur), premier sommet répété en dernier pour fermer l'anneau.
 *
 * Projection locale : un degré de latitude vaut partout ~111 km, un degré de
 * longitude est rétréci par `cos(latitude)`. À 15 km de rayon l'erreur de cette
 * approximation est très inférieure au mètre — sans commune mesure avec
 * l'approximation assumée du disque lui-même.
 */
export function cityDiscRing(
  center: { lat: number; lng: number },
  radiusM: number = CITY_DISC_RADIUS_M,
  vertices: number = CITY_DISC_POLYGON_VERTICES,
): GeoRing {
  if (!Number.isFinite(center.lat) || !Number.isFinite(center.lng)) {
    throw new Error('cityDiscRing: centre non fini');
  }
  if (!(radiusM > 0)) throw new Error('cityDiscRing: rayon doit être > 0');
  if (!Number.isInteger(vertices) || vertices < 3) {
    throw new Error('cityDiscRing: il faut au moins 3 sommets');
  }

  const dLat = (radiusM / EARTH_RADIUS_M) * DEG_PER_RAD;
  // Aux pôles cos(lat) → 0 : on borne pour ne pas produire une longitude infinie.
  const cosLat = Math.max(Math.cos(center.lat * RAD_PER_DEG), 1e-6);
  const dLng = dLat / cosLat;

  // Le premier sommet est calculé à part : il sert aussi de point de fermeture,
  // et le typer explicitement évite un accès indexé non vérifié pour le refermer.
  const first: readonly [number, number] = [center.lng + dLng, center.lat];
  const ring: (readonly [number, number])[] = [first];
  for (let i = 1; i < vertices; i++) {
    const theta = (2 * Math.PI * i) / vertices;
    ring.push([center.lng + dLng * Math.cos(theta), center.lat + dLat * Math.sin(theta)]);
  }
  ring.push(first); // anneau fermé (RFC 7946)
  return ring;
}

/**
 * Polygone GeoJSON de l'aire de jeu d'une ville ouverte depuis le référentiel —
 * ce qu'on écrit dans `city_zones.geojson` (colonne NOT NULL) quand aucun
 * contour officiel n'existe. Les villes de démarrage (paris, lille) gardent le
 * leur, importé par la migration 0033 : ne jamais les écraser avec ce disque.
 */
export function cityDiscPolygon(
  center: { lat: number; lng: number },
  radiusM: number = CITY_DISC_RADIUS_M,
  vertices: number = CITY_DISC_POLYGON_VERTICES,
): GeoPolygon {
  return { type: 'Polygon', coordinates: [cityDiscRing(center, radiusM, vertices)] };
}

/**
 * Test in/out sur un disque d'aire de jeu — la question que pose le gameplay
 * (« ce point est-il rattaché à cette ville ? »). On la tranche sur le CERCLE
 * exact (distance haversine ≤ rayon) et non sur le polygone à 64 côtés : c'est
 * plus juste, moins cher, et cela ne dépend pas du nombre de sommets choisi.
 */
export function isInsideCityDisc(
  center: { lat: number; lng: number },
  point: { lat: number; lng: number },
  radiusM: number = CITY_DISC_RADIUS_M,
): boolean {
  const dLat = (point.lat - center.lat) * RAD_PER_DEG;
  const dLng = (point.lng - center.lng) * RAD_PER_DEG;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(center.lat * RAD_PER_DEG) *
      Math.cos(point.lat * RAD_PER_DEG) *
      Math.sin(dLng / 2) ** 2;
  const distM = 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
  return distM <= radiusM;
}
