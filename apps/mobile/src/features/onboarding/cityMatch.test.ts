/**
 * GRYD — le raccourci « Utiliser ma position » ne ment pas.
 *
 * Ces tests portent la seule chose que ce module pourrait casser en silence :
 * proposer une ville à quelqu'un qui n'y est pas. Le repli inventé (« on te met
 * Paris ») est le bug le plus grave trouvé par AMENDEMENT-47 — il se teste, il
 * ne se relit pas.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { CITIES } from '@klaim/shared';
import {
  CITY_MATCH_RADIUS_KM,
  cityAt,
  distanceKm,
  filterCities,
  normalize,
  type LocatableCity,
} from './cityMatch.ts';

/** Les DEUX villes réelles de Saison 0, telles que l'écran les recevra. */
const OPEN_CITIES: readonly LocatableCity[] = Object.values(CITIES).map((c) => ({
  cityId: c.id,
  name: c.name,
  center: { lat: c.center.lat, lng: c.center.lng },
}));

Deno.test('la distance haversine est symétrique et nulle sur place', () => {
  const paris = CITIES.paris.center;
  const lille = CITIES.lille.center;
  assertEquals(distanceKm(paris, paris), 0);
  const ab = distanceKm(paris, lille);
  const ba = distanceKm(lille, paris);
  assert(Math.abs(ab - ba) < 1e-9, 'distance non symétrique');
  // Paris ↔ Lille : ~204 km à vol d'oiseau. On borne large : le test vérifie
  // l'ordre de grandeur (une erreur de radian/degré donnerait 3,5 km ou 11 700).
  assert(ab > 190 && ab < 220, `Paris-Lille mesuré à ${ab} km`);
});

Deno.test('au centre d’une ville ouverte, c’est CETTE ville qui est proposée', () => {
  for (const city of OPEN_CITIES) {
    const match = cityAt(city.center!, OPEN_CITIES);
    assertEquals(match?.cityId, city.cityId);
  }
});

Deno.test('hors de toute ville ouverte, on ne propose RIEN', () => {
  // Berlin, Lisbonne, Madrid : aucune n'est ouverte, aucune n'est proposée — et
  // surtout on ne retombe pas sur « la plus proche ». C'est la règle « zéro
  // ville européenne fabriquée » appliquée au raccourci de position.
  const outside = [
    { lat: 52.52, lng: 13.405 }, // Berlin
    { lat: 38.7223, lng: -9.1393 }, // Lisbonne
    { lat: 40.4168, lng: -3.7038 }, // Madrid
    { lat: 45.764, lng: 4.8357 }, // Lyon — française, mais pas ouverte
    { lat: 49.4432, lng: 1.0993 }, // Rouen — à 110 km de Paris
  ];
  for (const point of outside) {
    assertEquals(cityAt(point, OPEN_CITIES), null, `${JSON.stringify(point)} a matché`);
  }
});

Deno.test('le rayon borne vraiment : juste dedans oui, juste dehors non', () => {
  const c = CITIES.paris.center;
  // 1 degré de latitude ≈ 111,32 km : on place deux points au nord du centre,
  // l'un à 80 % du rayon, l'autre à 120 %.
  const degPerKm = 1 / 111.32;
  const inside = { lat: c.lat + CITY_MATCH_RADIUS_KM * 0.8 * degPerKm, lng: c.lng };
  const outside = { lat: c.lat + CITY_MATCH_RADIUS_KM * 1.2 * degPerKm, lng: c.lng };
  assertEquals(cityAt(inside, OPEN_CITIES)?.cityId, 'paris');
  assertEquals(cityAt(outside, OPEN_CITIES), null);
});

Deno.test('une ville SANS centre connu n’est jamais proposée', () => {
  // Le jour où `city_zones` sert une ville que game-rules ne connaît pas encore,
  // elle arrive sans centre. Le raccourci doit l'ignorer (elle reste choisissable
  // À LA MAIN) plutôt que de deviner une position pour elle.
  const cities: readonly LocatableCity[] = [{ cityId: 'inconnue', name: 'Ville Inconnue' }];
  assertEquals(cityAt(CITIES.paris.center, cities), null);
  assertEquals(cityAt({ lat: 0, lng: 0 }, cities), null);
});

Deno.test('entre deux villes candidates, la PLUS PROCHE gagne (résultat déterministe)', () => {
  const near: LocatableCity = { cityId: 'near', name: 'Near', center: { lat: 48.86, lng: 2.35 } };
  const far: LocatableCity = { cityId: 'far', name: 'Far', center: { lat: 48.9, lng: 2.4 } };
  const point = CITIES.paris.center;
  assertEquals(cityAt(point, [far, near])?.cityId, cityAt(point, [near, far])?.cityId);
});

Deno.test('la recherche ignore casse et accents, et une requête vide ne vide rien', () => {
  assertEquals(filterCities(OPEN_CITIES, '').length, OPEN_CITIES.length);
  assertEquals(filterCities(OPEN_CITIES, '   ').length, OPEN_CITIES.length);
  assertEquals(filterCities(OPEN_CITIES, 'PAR')[0]?.cityId, 'paris');
  // « Métropole de Lille » se trouve sans accent et par un mot du milieu.
  assertEquals(filterCities(OPEN_CITIES, 'metropole')[0]?.cityId, 'lille');
  assertEquals(filterCities(OPEN_CITIES, 'lille')[0]?.cityId, 'lille');
});

Deno.test('une recherche sans résultat renvoie une liste VIDE (l’écran le dira)', () => {
  // Zéro résultat n'est pas un bug : c'est ce que l'écran traduit par « aucune
  // ville ouverte ne correspond ». Ce qui serait un bug, c'est un ersatz.
  assertEquals(filterCities(OPEN_CITIES, 'Lyon').length, 0);
  assertEquals(normalize('Métropole'), 'metropole');
});
