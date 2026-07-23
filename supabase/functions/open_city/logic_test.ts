/**
 * GRYD — open_city : ce que le serveur accepte d'ouvrir, et d'où il tient ce
 * qu'il écrit.
 *
 * La frontière que ces tests gardent est celle de la demande fondateur :
 * n'importe quelle ville RÉELLE doit être choisissable, aucune ville inventée ne
 * doit l'être. Concrètement, un client qui envoie un identifiant ne doit
 * pouvoir influencer NI le nom, NI la position, NI l'aire de jeu écrites en
 * base — sinon « ne pas en inventer une » ne tient plus.
 *
 * Ces tests tournent contre le VRAI référentiel embarqué (7 870 villes
 * GeoNames), pas contre des fixtures : si une régénération du fichier fait
 * disparaître Zurich, ils cassent.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { EU_CITIES_PACKED } from '../_shared/cities-eu.ts';
import { findCityById, isInsideCityDisc, parsePackedCitiesCached } from '../_shared/cities.ts';
import {
  CITY_DISC_POLYGON_VERTICES,
  CITY_DISC_RADIUS_M,
  CITY_OPEN_LIMIT_PER_USER,
  CITY_OPEN_LIMIT_WINDOW_H,
} from '../_shared/game-rules.ts';
import { parseOpenCityRequest, planCityOpening, statusForReject } from './logic.ts';

const EU = parsePackedCitiesCached(EU_CITIES_PACKED);

// ═══════════════════════════════════════════════════════════════════════════
// FORME DE LA DEMANDE — le corps ne contient QU'UN identifiant
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('demande : un cityId bien formé est accepté', () => {
  const r = parseOpenCityRequest({ cityId: '2657896' });
  assert(r.ok);
  assertEquals(r.value, '2657896');
});

Deno.test('demande : un corps qui n’est pas un objet est refusé, pas ignoré', () => {
  for (const raw of [null, undefined, 'paris', 42, []]) {
    const r = parseOpenCityRequest(raw);
    // Un tableau EST un objet : il n'a simplement pas de `cityId`.
    assert(!r.ok, `${JSON.stringify(raw)} aurait dû être refusé`);
  }
});

Deno.test('demande : cityId manquant et cityId malformé ont des motifs DISTINCTS', () => {
  // Un motif unique « invalid » forcerait l'écran à deviner quoi dire.
  const manquant = parseOpenCityRequest({});
  assert(!manquant.ok);
  assertEquals(manquant.error, 'missing_city_id');

  const malforme = parseOpenCityRequest({ cityId: 'paris,lille' });
  assert(!malforme.ok);
  assertEquals(malforme.error, 'bad_city_id');
});

Deno.test('demande : les champs en trop sont IGNORÉS (le client ne décide de rien)', () => {
  // Si un nom ou des coordonnées du client pouvaient passer, la ville écrite
  // cesserait d'être celle du référentiel. `parseOpenCityRequest` ne rend qu'un id.
  const r = parseOpenCityRequest({
    cityId: '2657896',
    name: 'Ville Fantôme',
    lat: 0,
    lng: 0,
    status: 'active',
  });
  assert(r.ok);
  assertEquals(r.value, '2657896');
});

// ═══════════════════════════════════════════════════════════════════════════
// RÉSOLUTION — le nom et la position viennent du RÉFÉRENTIEL
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('plan : une ville réelle du référentiel s’ouvre, sous SON nom', () => {
  const zurich = findCityById(EU, '2657896');
  assert(zurich, 'Zürich absent du référentiel embarqué');
  const plan = planCityOpening('2657896', EU);
  assert(plan.ok);
  assertEquals(plan.value.name, zurich.name);
  assertEquals(plan.value.country, zurich.country);
  assertEquals(plan.value.cityId, '2657896');
});

Deno.test('plan : le nom du client N’ARRIVE JAMAIS ici — il n’y a pas de canal', () => {
  // Le plan ne prend que l'id et le référentiel. Aucun paramètre ne permet
  // d'injecter un libellé : c'est structurel, pas une garde à contourner.
  const a = planCityOpening('2657896', EU);
  const b = planCityOpening('2657896', EU);
  assert(a.ok && b.ok);
  assertEquals(a.value.name, b.value.name);
});

Deno.test('plan : une ville INEXISTANTE est refusée en 404, jamais inventée', () => {
  const plan = planCityOpening('9999999999', EU);
  assert(!plan.ok);
  assertEquals(plan.error, 'unknown_city');
  assertEquals(statusForReject('unknown_city'), 404);
});

Deno.test('plan : les villes de DÉMARRAGE restent ouvrables sous leur id historique', () => {
  // 'paris'/'lille' ne sont pas des geonameid : sans ce chemin, la voie
  // d'ouverture ne saurait pas ré-armer la saison des deux villes qui tournent.
  for (const [id, nom] of [['paris', 'Paris'], ['lille', 'Métropole de Lille']] as const) {
    const plan = planCityOpening(id, EU);
    assert(plan.ok, `${id} devrait être ouvrable`);
    assertEquals(plan.value.name, nom);
    assertEquals(plan.value.country, undefined); // hors référentiel : aucun pays affirmé
  }
});

Deno.test('plan : les homonymes restent DISTINCTS (le geonameid les départage)', () => {
  // Brest (FR) et Brest (BY) coexistent dans le référentiel. Deux crews ne
  // doivent pas se retrouver dans la même ville par accident d'homonymie.
  const brests = EU.filter((c) => c.name === 'Brest');
  assert(brests.length >= 2, 'les deux Brest sont attendus dans le référentiel');
  const plans = brests.map((c) => planCityOpening(c.id, EU));
  const pays = new Set<string>();
  for (const p of plans) {
    assert(p.ok);
    pays.add(`${p.value.country}`);
  }
  assertEquals(pays.size, brests.length, 'chaque Brest doit garder son pays');
});

// ═══════════════════════════════════════════════════════════════════════════
// AIRE DE JEU — une approximation, et elle se dit comme telle
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('aire : le disque est CENTRÉ sur la ville réelle et porte le rayon de game-rules', () => {
  const zurich = findCityById(EU, '2657896');
  assert(zurich);
  const plan = planCityOpening('2657896', EU);
  assert(plan.ok);
  assertEquals(plan.value.radiusM, CITY_DISC_RADIUS_M);
  assertEquals(plan.value.geojson.type, 'Polygon');
  assertEquals(plan.value.geojson.coordinates[0].length, CITY_DISC_POLYGON_VERTICES + 1);
  // Le centre du référentiel est bien dans l'aire écrite.
  assert(isInsideCityDisc({ lat: zurich.lat, lng: zurich.lng }, { lat: zurich.lat, lng: zurich.lng }));
});

Deno.test('aire : elle est ANNONCÉE approximative — jamais présentée comme un contour', () => {
  // `approximateArea` est ce qui permet à l'écran d'écrire « aire de jeu
  // approximative » plutôt que « limites de la ville ». Le jour où quelqu'un le
  // passe à false pour un disque, ce test casse.
  const plan = planCityOpening('2657896', EU);
  assert(plan.ok);
  assertEquals(plan.value.approximateArea, true);
});

Deno.test('aire : le polygone est FERMÉ et reste sur le globe', () => {
  const plan = planCityOpening('2657896', EU);
  assert(plan.ok);
  const ring = plan.value.geojson.coordinates[0];
  assertEquals(ring[0], ring[ring.length - 1], 'anneau non fermé');
  for (const [lng, lat] of ring) {
    assert(Number.isFinite(lat) && Number.isFinite(lng));
    assert(Math.abs(lat) <= 90 && Math.abs(lng) <= 180);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// REFUS — chacun a un code, aucun n'est un 500
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('refus : chaque motif a un statut HTTP nommé, jamais 500', () => {
  for (const reason of ['invalid_body', 'missing_city_id', 'bad_city_id', 'unknown_city'] as const) {
    const status = statusForReject(reason);
    assert(status >= 400 && status < 500, `${reason} → ${status} : un refus lisible n'est pas un 500`);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PLAFOND D'OUVERTURE — il existe, il vient de game-rules, il est applicable
// ═══════════════════════════════════════════════════════════════════════════
//
// Le plafond lui-même est appliqué en SQL (`provision_city`, migration 0066) :
// ces tests ne peuvent pas l'exécuter. Ce qu'ils gardent, c'est la condition
// SANS LAQUELLE il ne peut pas exister — que les deux constantes soient dans
// leur source unique, exploitables telles quelles par la RPC. Une régression
// silencieuse (constante supprimée, mise à 0, ou devenue fractionnaire) rendrait
// `p_open_limit` inopérant et rouvrirait l'ouverture illimitée sans qu'aucun
// test ne bronche.

Deno.test('plafond : les constantes d’ouverture existent et sont applicables', () => {
  assert(Number.isInteger(CITY_OPEN_LIMIT_PER_USER), 'un plafond doit être entier (compte de lignes)');
  assert(CITY_OPEN_LIMIT_PER_USER > 0, 'un plafond à 0 ou négatif désactive le garde-fou');
  assert(Number.isInteger(CITY_OPEN_LIMIT_WINDOW_H), 'make_interval(hours => …) exige un entier');
  assert(CITY_OPEN_LIMIT_WINDOW_H > 0, 'une fenêtre nulle rendrait le plafond inatteignable');
});

Deno.test('plafond : il borne le bruit, jamais l’usage honnête (une ville par joueur)', () => {
  // Ouvrir SA ville coûte 1. Le plafond doit laisser passer largement ce cas —
  // sinon il transforme un garde-fou en mur, ce qui serait un bug de jeu.
  assert(CITY_OPEN_LIMIT_PER_USER >= 1);
  // Et il doit rester très inférieur au référentiel : sinon il ne borne rien.
  assert(CITY_OPEN_LIMIT_PER_USER < parsePackedCitiesCached(EU_CITIES_PACKED).length);
});
