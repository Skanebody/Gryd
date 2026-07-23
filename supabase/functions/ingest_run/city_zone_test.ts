/**
 * GRYD — RATTACHEMENT D'UNE COURSE À UNE VILLE, à l'échelle du référentiel.
 *
 * Ce que ces tests protègent, dans l'ordre des dégâts :
 *  1. le PLAFOND DUR levé — un `geonameid` doit passer la porte de forme que
 *     `cityId in CITIES` fermait (blocage n°2) ;
 *  2. le DÉPARTAGE — à 2 villes distantes de 205 km, « la première ligne
 *     renvoyée » suffisait. Avec des disques de 15 km sur un référentiel
 *     européen, les recouvrements sont la norme : sans ordre déterministe, deux
 *     courses identiques pourraient compter pour deux villes différentes ;
 *  3. le PRÉ-FILTRE qui ne doit pas AVALER une zone — une boîte englobante
 *     absente ne doit jamais valoir « couvre tout ».
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { cityDiscPolygon } from '../_shared/cities.ts';
import { bboxContains, type CityZoneRow, isCityIdShape, pickCityZone } from './city_zone.ts';

// ─── Fabrique de zones : la MÊME géométrie que la production ─────────────────
// `cityDiscPolygon` est le moteur réellement utilisé par `open_city` pour écrire
// `city_zones.geojson` ; la boîte englobante est calculée depuis ce polygone
// comme le fait le trigger SQL de la migration 0066. Aucune fixture inventée.
function discZone(
  cityId: string,
  name: string,
  center: { lat: number; lng: number },
  status = 'wild',
): CityZoneRow {
  const geojson = cityDiscPolygon(center);
  const ring = geojson.coordinates[0];
  const lats = ring.map((p) => p[1]);
  const lngs = ring.map((p) => p[0]);
  return {
    city_id: cityId,
    name,
    status,
    geojson,
    min_lat: Math.min(...lats),
    max_lat: Math.max(...lats),
    min_lng: Math.min(...lngs),
    max_lng: Math.max(...lngs),
  };
}

/** Rectangle explicite — sert à poser un contour « officiel » plus petit ou plus grand. */
function boxZone(
  cityId: string,
  name: string,
  box: { minLat: number; maxLat: number; minLng: number; maxLng: number },
): CityZoneRow {
  return {
    city_id: cityId,
    name,
    status: 'active',
    geojson: {
      type: 'Polygon',
      coordinates: [[
        [box.minLng, box.minLat],
        [box.maxLng, box.minLat],
        [box.maxLng, box.maxLat],
        [box.minLng, box.maxLat],
        [box.minLng, box.minLat],
      ]],
    },
    min_lat: box.minLat,
    max_lat: box.maxLat,
    min_lng: box.minLng,
    max_lng: box.maxLng,
  };
}

const PARIS = { lat: 48.8566, lng: 2.3522 };
const LILLE = { lat: 50.6292, lng: 3.0573 };
const ROUBAIX = { lat: 50.6942, lng: 3.1746 }; // ~12 km de Lille : disques qui se recouvrent

// ═══════════════════════════════════════════════════════════════════════════
// FORME D'UN city_id — le plafond dur n°2
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('forme : un geonameid passe la porte que `in CITIES` fermait', () => {
  // C'EST le blocage n°2. `b.cityId in CITIES` rendait 400 pour toute ville
  // hors liste de démarrage — donc pour toutes celles que l'ouverture ajoute.
  assert(isCityIdShape('2988507')); // Brest (FR)
  assert(isCityIdShape('2657896')); // Zürich (CH)
  assert(isCityIdShape('paris'));
  assert(isCityIdShape('lille'));
});

Deno.test('forme : ce qui n’a PAS la forme d’un identifiant est refusé', () => {
  assertEquals(isCityIdShape(''), false);
  assertEquals(isCityIdShape('   '), false);
  // Virgules et parenthèses ont une syntaxe dans les filtres PostgREST.
  assertEquals(isCityIdShape('paris,lille'), false);
  assertEquals(isCityIdShape('a.b'), false);
  assertEquals(isCityIdShape('Saint-Étienne'), false); // accent : ce n'est pas un id
  assertEquals(isCityIdShape('x'.repeat(65)), false);
  assertEquals(isCityIdShape(42), false);
  assertEquals(isCityIdShape(null), false);
  assertEquals(isCityIdShape(undefined), false);
});

Deno.test('forme : passer la forme ne dit RIEN de l’existence', () => {
  // Un id bien formé mais jamais provisionné doit rester introuvable : c'est la
  // base qui tranche, pas cette regex.
  assert(isCityIdShape('9999999'));
  assertEquals(pickCityZone(PARIS.lat, PARIS.lng, [discZone('9999999', 'Nulle part', LILLE)]), undefined);
});

// ═══════════════════════════════════════════════════════════════════════════
// PRÉ-FILTRE — une boîte absente ne couvre pas le monde
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('boîte : contient / ne contient pas, bornes incluses', () => {
  const z = boxZone('paris', 'Paris', { minLat: 48.6, maxLat: 49.0, minLng: 2.1, maxLng: 2.7 });
  assert(bboxContains(z, 48.8566, 2.3522));
  assert(bboxContains(z, 48.6, 2.1), 'borne basse incluse');
  assert(bboxContains(z, 49.0, 2.7), 'borne haute incluse');
  assertEquals(bboxContains(z, 45.76, 4.83), false); // Lyon
});

Deno.test('boîte : une zone SANS boîte n’attrape rien (fail-closed)', () => {
  // La migration 0066 rend ces colonnes NOT NULL. Une ligne qui y échapperait
  // est une anomalie — la traiter comme « couvre tout » lui ferait capter TOUTES
  // les courses du monde, silencieusement.
  const orpheline: CityZoneRow = {
    ...boxZone('paris', 'Paris', { minLat: 48.6, maxLat: 49.0, minLng: 2.1, maxLng: 2.7 }),
    min_lat: null,
    max_lat: null,
    min_lng: null,
    max_lng: null,
  };
  assertEquals(bboxContains(orpheline, 48.8566, 2.3522), false);
  assertEquals(pickCityZone(PARIS.lat, PARIS.lng, [orpheline]), undefined);
});

// ═══════════════════════════════════════════════════════════════════════════
// RATTACHEMENT
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('rattachement : le centre de la ville tombe dans son disque', () => {
  const zones = [discZone('2988507', 'Brest', { lat: 48.39029, lng: -4.48628 })];
  assertEquals(pickCityZone(48.39029, -4.48628, zones)?.city_id, '2988507');
});

Deno.test('rattachement : hors zone → AUCUNE ville, et la course reste valide', () => {
  // AMENDEMENT-02 §2 : la capture n'est bornée par aucune ville. Hors zone, le
  // rattachement au classement est absent — ce n'est pas un refus de course.
  const zones = [discZone('lille', 'Lille', LILLE)];
  assertEquals(pickCityZone(45.764, 4.8357, zones), undefined); // Lyon
});

Deno.test('rattachement : un disque de 15 km ne déborde pas sur la ville voisine', () => {
  const zones = [discZone('paris', 'Paris', PARIS), discZone('lille', 'Lille', LILLE)];
  assertEquals(pickCityZone(PARIS.lat, PARIS.lng, zones)?.city_id, 'paris');
  assertEquals(pickCityZone(LILLE.lat, LILLE.lng, zones)?.city_id, 'lille');
});

// ═══════════════════════════════════════════════════════════════════════════
// DÉPARTAGE — la question qui n'existait pas à deux villes
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('départage : le contour RÉEL bat le disque approximatif', () => {
  // Lille porte le contour officiel (0033) ; une ville ouverte depuis le
  // référentiel porte un disque DÉCLARÉ approximatif. Quand les deux contiennent
  // le point, c'est le contour réel qui dit la vérité.
  const officiel = boxZone('lille', 'Métropole de Lille', {
    minLat: 50.52,
    maxLat: 50.78,
    minLng: 2.83,
    maxLng: 3.28,
  });
  const voisine = discZone('2977883', 'Roubaix', ROUBAIX);
  const point = { lat: 50.6942, lng: 3.1746 };
  assertEquals(pickCityZone(point.lat, point.lng, [voisine, officiel])?.city_id, 'lille');
  // L'ordre des lignes ne change RIEN — c'est tout l'objet du test.
  assertEquals(pickCityZone(point.lat, point.lng, [officiel, voisine])?.city_id, 'lille');
});

Deno.test('départage : à contours de même nature, la zone la plus SPÉCIFIQUE gagne', () => {
  const large = boxZone('1000', 'Région', { minLat: 50.0, maxLat: 51.5, minLng: 2.0, maxLng: 4.0 });
  const serree = boxZone('1001', 'Ville', { minLat: 50.6, maxLat: 50.7, minLng: 3.0, maxLng: 3.1 });
  assertEquals(pickCityZone(50.65, 3.05, [large, serree])?.city_id, '1001');
  assertEquals(pickCityZone(50.65, 3.05, [serree, large])?.city_id, '1001');
});

Deno.test('départage : à égalité PARFAITE, la réponse reste la même à chaque appel', () => {
  // Deux villes du référentiel au même endroit (homonymes, doublons de source) :
  // sans départage stable, deux courses identiques compteraient pour deux villes
  // — et le classement deviendrait un tirage au sort.
  const a = discZone('300100', 'Jumelle A', LILLE);
  const b = discZone('300099', 'Jumelle B', LILLE);
  const attendu = '300099'; // ordre lexicographique croissant
  assertEquals(pickCityZone(LILLE.lat, LILLE.lng, [a, b])?.city_id, attendu);
  assertEquals(pickCityZone(LILLE.lat, LILLE.lng, [b, a])?.city_id, attendu);
});

Deno.test('départage : `pickCityZone` ne réordonne PAS le tableau reçu', () => {
  // Le tableau vient d'une réponse PostgREST réutilisée ailleurs dans le
  // handler (la déclaration client y est re-filtrée) : le trier en place serait
  // un effet de bord silencieux.
  const zones = [discZone('300100', 'A', LILLE), discZone('300099', 'B', LILLE)];
  const avant = zones.map((z) => z.city_id);
  pickCityZone(LILLE.lat, LILLE.lng, zones);
  assertEquals(zones.map((z) => z.city_id), avant);
});

Deno.test('rattachement : une ville au statut `wild` est rattachée comme les autres', () => {
  // Bug latent que ce lot ferme : l'ancienne dérivation ne lisait que les zones
  // `status = 'active'`. Une ville fraîchement ouverte est 'wild' (la seule
  // mesure vraie quand personne n'y court) — la filtrer aurait laissé
  // `p_city_id` NULL, donc `season_scores` jamais incrémenté, donc le classement
  // de la ville ouverte vide À JAMAIS.
  const zones = [discZone('2657896', 'Zürich', { lat: 47.36667, lng: 8.55 }, 'wild')];
  assertEquals(pickCityZone(47.36667, 8.55, zones)?.city_id, '2657896');
});
