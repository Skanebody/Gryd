/**
 * Tests du moteur PUR du référentiel de villes (_shared/cities.ts) et du
 * référentiel lui-même (_shared/cities-eu.ts).
 *
 * Ce que ces tests protègent, dans l'ordre d'importance :
 *  1. qu'aucune ville n'est INVENTÉE : tout ce qui sort du parseur vient de la
 *     donnée GeoNames, et une ligne douteuse est jetée plutôt que rafistolée ;
 *  2. que l'IDENTIFIANT est stable (geonameid) — c'est la clé de hachage du
 *     tirage de la Zone du Jour (migration 0052) ;
 *  3. qu'un coureur TROUVE sa ville même sans accent, sans casse, sans tiret —
 *     sinon il conclut qu'elle n'existe pas et l'app lui a menti par omission ;
 *  4. que le disque d'aire de jeu est une approximation CORRECTE et fermée.
 */
import { assert, assertAlmostEquals, assertEquals, assertThrows } from 'jsr:@std/assert@^1';
import {
  CITY_FIELD_SEPARATOR,
  CITY_RECORD_SEPARATOR,
  cityDiscPolygon,
  cityDiscRing,
  cityLabel,
  findCityById,
  isInsideCityDisc,
  normalizeCityQuery,
  parsePackedCities,
  parsePackedCitiesCached,
  searchCities,
} from '../_shared/cities.ts';
import {
  EU_CITIES_COUNT,
  EU_CITIES_COUNTRY_CODES,
  EU_CITIES_PACKED,
  EU_CITIES_SOURCE,
} from '../_shared/cities-eu.ts';
import {
  CITIES,
  CITY_DISC_POLYGON_VERTICES,
  CITY_DISC_RADIUS_M,
  CITY_SEARCH_RESULT_LIMIT,
  isStarterCityId,
  starterCityCenter,
  starterCityName,
} from '../_shared/game-rules.ts';

const EARTH_RADIUS_M = 6_371_000;
const RAD = Math.PI / 180;

/** Haversine — recalculée ici pour ne pas tester le moteur avec lui-même. */
function haversineM(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = (b.lat - a.lat) * RAD;
  const dLng = (b.lng - a.lng) * RAD;
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

const pack = (rows: readonly (readonly string[])[]): string =>
  rows.map((r) => r.join(CITY_FIELD_SEPARATOR)).join(CITY_RECORD_SEPARATOR);

// ═══════════════════════════════════════════════════════════════════════════
// PARSING — rien n'est inventé, rien n'est rafistolé
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('parse : une ligne bien formée devient une ville exacte', () => {
  const cities = parsePackedCities(pack([['2988507', 'Paris', 'FR', '48.8534', '2.3488', '2138551']]));
  assertEquals(cities.length, 1);
  assertEquals(cities[0], {
    id: '2988507',
    name: 'Paris',
    country: 'FR',
    lat: 48.8534,
    lng: 2.3488,
    population: 2138551,
  });
});

Deno.test('parse : les lignes vides sont ignorées sans casser le reste', () => {
  const packed = ['', '2988507|Paris|FR|48.8534|2.3488|2138551', '', ''].join('\n');
  assertEquals(parsePackedCities(packed).length, 1);
});

Deno.test('parse : une ligne MALFORMÉE est jetée, jamais complétée par des zéros', () => {
  // Une ville dont on ignore la position ne doit pas être proposée au choix :
  // la « réparer » en lat/lng 0,0 la placerait dans le golfe de Guinée.
  const cases = [
    ['1', 'SansCoord', 'FR'], // champs manquants
    ['2', 'LatVide', 'FR', '', '2.0', '10'],
    ['3', 'LatTexte', 'FR', 'abc', '2.0', '10'],
    ['4', 'HorsPlage', 'FR', '99.0', '2.0', '10'],
    ['5', 'LngHorsPlage', 'FR', '48.0', '200.0', '10'],
    ['', 'SansId', 'FR', '48.0', '2.0', '10'],
    ['7', '', 'FR', '48.0', '2.0', '10'],
    ['8', 'SansPays', '', '48.0', '2.0', '10'],
  ];
  for (const row of cases) {
    assertEquals(
      parsePackedCities(pack([row])).length,
      0,
      `ligne « ${row.join('|')} » aurait dû être rejetée`,
    );
  }
});

Deno.test('parse : un champ SUPPLÉMENTAIRE ne casse pas les consommateurs', () => {
  // Le référentiel devra un jour porter les exonymes (« Bruxelles » pour
  // Brussels) : un 7e champ doit pouvoir arriver sans invalider les lignes pour
  // les clients déjà déployés.
  const [city] = parsePackedCities(
    pack([['2988507', 'Brussels', 'BE', '50.8504', '4.3488', '1019022', 'Bruxelles,Brussel']]),
  );
  assertEquals(city.name, 'Brussels');
  assertEquals(city.id, '2988507');
});

Deno.test('parse : une ligne INCOMPLÈTE reste rejetée', () => {
  assertEquals(parsePackedCities(pack([['1', 'Ville', 'FR', '48.0', '2.0']])).length, 0);
});

Deno.test('parse : une population illisible tombe à 0 sans perdre la ville', () => {
  // La position est la donnée qui compte ; la population n'ordonne que la
  // recherche. On garde donc la ville, on ne lui invente pas d'habitants.
  const [city] = parsePackedCities(pack([['9', 'Bourg', 'FR', '48.0', '2.0', 'n/a']]));
  assertEquals(city.population, 0);
  assertEquals(city.name, 'Bourg');
});

Deno.test('parse : l ordre de la source est CONSERVÉ (population décroissante)', () => {
  const cities = parsePackedCities(pack([
    ['1', 'Grande', 'FR', '48.0', '2.0', '900'],
    ['2', 'Petite', 'FR', '49.0', '3.0', '20'],
  ]));
  assertEquals(cities.map((c) => c.name), ['Grande', 'Petite']);
});

Deno.test('parse : mémoïsation — même contenu, même tableau', () => {
  const packed = pack([['1', 'Ville', 'FR', '48.0', '2.0', '100']]);
  assert(parsePackedCitiesCached(packed) === parsePackedCitiesCached(packed));
});

// ═══════════════════════════════════════════════════════════════════════════
// NORMALISATION — accents, casse, séparateurs
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('normalisation : accents, casse et séparateurs sont neutralisés', () => {
  assertEquals(normalizeCityQuery('Zürich'), 'zurich');
  assertEquals(normalizeCityQuery('MÁLAGA'), 'malaga');
  assertEquals(normalizeCityQuery('Saint-Étienne'), 'saint etienne');
  assertEquals(normalizeCityQuery("L'Haÿ-les-Roses"), 'l hay les roses');
  assertEquals(normalizeCityQuery('  Aix   en   Provence  '), 'aix en provence');
  assertEquals(normalizeCityQuery('Kraków'), 'krakow');
  assertEquals(normalizeCityQuery('Timişoara'), 'timisoara');
});

Deno.test('normalisation : idempotente', () => {
  const once = normalizeCityQuery('Saint-Étienne-du-Rouvray');
  assertEquals(normalizeCityQuery(once), once);
});

Deno.test('normalisation : une saisie vide ne casse pas', () => {
  assertEquals(normalizeCityQuery(''), '');
  assertEquals(normalizeCityQuery('   '), '');
});

// ═══════════════════════════════════════════════════════════════════════════
// RECHERCHE
// ═══════════════════════════════════════════════════════════════════════════

const SAMPLE = parsePackedCities(pack([
  ['1', 'Paris', 'FR', '48.8534', '2.3488', '2138551'],
  ['2', 'Zürich', 'CH', '47.3667', '8.5500', '341730'],
  ['3', 'Brest', 'FR', '48.3900', '-4.4861', '139456'],
  ['4', 'Brest', 'BY', '52.0976', '23.7341', '312800'],
  ['5', 'Saint-Étienne', 'FR', '45.4339', '4.3900', '171260'],
  ['6', 'Nanterre', 'FR', '48.8924', '2.2069', '94268'],
]));

Deno.test('recherche : sans accent on trouve quand même (Zurich → Zürich)', () => {
  assertEquals(searchCities(SAMPLE, 'zurich').map((c) => c.id), ['2']);
});

Deno.test('recherche : insensible à la casse et aux tirets', () => {
  assertEquals(searchCities(SAMPLE, 'SAINT ETIENNE').map((c) => c.id), ['5']);
  assertEquals(searchCities(SAMPLE, 'saint-etienne').map((c) => c.id), ['5']);
});

Deno.test('recherche : les HOMONYMES sortent tous les deux, la plus peuplée d abord', () => {
  // Brest (BY) 312 800 hab. avant Brest (FR) 139 456 hab. Aucune n'est masquée :
  // les deux existent et doivent rester choisissables.
  const ids = searchCities(SAMPLE, 'brest').map((c) => c.id);
  assertEquals(ids, ['4', '3']);
});

Deno.test('recherche : le code pays départage les homonymes à l écran', () => {
  const [first, second] = searchCities(SAMPLE, 'brest');
  assertEquals(cityLabel(first), 'Brest · BY');
  assertEquals(cityLabel(second), 'Brest · FR');
  assert(cityLabel(first) !== cityLabel(second), 'deux homonymes ne peuvent pas partager un libellé');
});

Deno.test('recherche : égalité exacte avant simple préfixe', () => {
  const cities = parsePackedCities(pack([
    ['10', 'Nanterre', 'FR', '48.89', '2.20', '94268'],
    ['11', 'Nant', 'FR', '44.02', '3.30', '900000'], // bien plus peuplée
  ]));
  // « nant » est un nom EXACT ici : il passe devant, malgré le tri population
  // qui ne joue qu'à rang de correspondance égal.
  assertEquals(searchCities(cities, 'nant').map((c) => c.id), ['11', '10']);
});

Deno.test('recherche : un mot INTERNE remonte (york → New York)', () => {
  const cities = parsePackedCities(pack([['12', 'New York Mills', 'FR', '48.0', '2.0', '5']]));
  assertEquals(searchCities(cities, 'york').length, 1);
});

Deno.test('recherche : requête trop courte → haut du référentiel, jamais du vide', () => {
  // §A : un écran ne montre jamais un vide inexplicable. Sous le seuil, on rend
  // les villes les plus peuplées — qui sont RÉELLES, pas fabriquées.
  const res = searchCities(SAMPLE, 'z');
  assertEquals(res.length, SAMPLE.length);
  assertEquals(res[0].id, '1');
  assertEquals(searchCities(SAMPLE, '').length, SAMPLE.length);
});

Deno.test('recherche : aucune correspondance → tableau VIDE, jamais un repli inventé', () => {
  assertEquals(searchCities(SAMPLE, 'xyzzynopeville').length, 0);
});

Deno.test('recherche : le plafond de résultats est respecté', () => {
  const many = parsePackedCities(pack(
    Array.from({ length: 200 }, (_, i) => [`${i + 100}`, `Ville${i}`, 'FR', '48.0', '2.0', `${200 - i}`]),
  ));
  assertEquals(searchCities(many, 'ville').length, CITY_SEARCH_RESULT_LIMIT);
  assertEquals(searchCities(many, 'ville', { limit: 3 }).length, 3);
});

Deno.test('recherche : DÉTERMINISTE à population et rang égaux (tri par id)', () => {
  const cities = parsePackedCities(pack([
    ['300', 'Ville', 'FR', '48.0', '2.0', '1000'],
    ['200', 'Ville', 'DE', '50.0', '8.0', '1000'],
    ['100', 'Ville', 'ES', '40.0', '-3.0', '1000'],
  ]));
  const once = searchCities(cities, 'ville').map((c) => c.id);
  assertEquals(once, ['100', '200', '300']);
  assertEquals(searchCities(cities, 'ville').map((c) => c.id), once);
});

Deno.test('findCityById : retrouve par geonameid, rend undefined sinon', () => {
  assertEquals(findCityById(SAMPLE, '4')?.country, 'BY');
  assertEquals(findCityById(SAMPLE, 'inconnu'), undefined);
});

// ═══════════════════════════════════════════════════════════════════════════
// DISQUE D'AIRE DE JEU — approximation DÉCLARÉE, mais correcte
// ═══════════════════════════════════════════════════════════════════════════

const PARIS = { lat: 48.8534, lng: 2.3488 };

Deno.test('disque : anneau fermé, un sommet de plus que demandé', () => {
  const ring = cityDiscRing(PARIS);
  assertEquals(ring.length, CITY_DISC_POLYGON_VERTICES + 1);
  assertEquals(ring[0], ring[ring.length - 1]);
});

Deno.test('disque : tous les sommets sont à la bonne distance du centre', () => {
  const ring = cityDiscRing(PARIS);
  for (const [lng, lat] of ring) {
    // Tolérance 1 % : la projection locale est plus fine que ça, mais on teste
    // une approximation assumée, pas une géodésie.
    assertAlmostEquals(haversineM(PARIS, { lat, lng }), CITY_DISC_RADIUS_M, CITY_DISC_RADIUS_M * 0.01);
  }
});

Deno.test('disque : ordre ANTI-HORAIRE (aire signée > 0, RFC 7946)', () => {
  const ring = cityDiscRing(PARIS);
  let area2 = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    area2 += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  assert(area2 > 0, `anneau extérieur horaire (aire signée ${area2})`);
});

Deno.test('disque : le rayon et le nombre de sommets sont paramétrables', () => {
  const ring = cityDiscRing(PARIS, 5_000, 8);
  assertEquals(ring.length, 9);
  assertAlmostEquals(haversineM(PARIS, { lat: ring[0][1], lng: ring[0][0] }), 5_000, 50);
});

Deno.test('disque : entrées invalides → erreur, jamais un polygone silencieusement faux', () => {
  assertThrows(() => cityDiscRing({ lat: NaN, lng: 2 }));
  assertThrows(() => cityDiscRing(PARIS, 0));
  assertThrows(() => cityDiscRing(PARIS, -1));
  assertThrows(() => cityDiscRing(PARIS, CITY_DISC_RADIUS_M, 2));
  assertThrows(() => cityDiscRing(PARIS, CITY_DISC_RADIUS_M, 6.5));
});

Deno.test('disque : ne dégénère pas près des pôles (Longyearbyen, 78°N)', () => {
  const svalbard = { lat: 78.2232, lng: 15.6469 };
  for (const [lng, lat] of cityDiscRing(svalbard)) {
    assert(Number.isFinite(lat) && Number.isFinite(lng), 'sommet non fini');
    assert(Math.abs(lat) <= 90, `latitude hors plage : ${lat}`);
  }
});

Deno.test('disque : polygone GeoJSON de la forme attendue par city_zones.geojson', () => {
  const poly = cityDiscPolygon(PARIS);
  assertEquals(poly.type, 'Polygon');
  assertEquals(poly.coordinates.length, 1);
  assertEquals(poly.coordinates[0].length, CITY_DISC_POLYGON_VERTICES + 1);
});

Deno.test('in/out : le test se tranche sur le CERCLE, pas sur le polygone', () => {
  assert(isInsideCityDisc(PARIS, PARIS));
  // ~10 km au nord : dedans (rayon 15 km).
  assert(isInsideCityDisc(PARIS, { lat: PARIS.lat + 0.09, lng: PARIS.lng }));
  // ~22 km au nord : dehors.
  assert(!isInsideCityDisc(PARIS, { lat: PARIS.lat + 0.2, lng: PARIS.lng }));
  // Lille est à ~205 km de Paris : jamais rattachée au disque parisien.
  assert(!isInsideCityDisc(PARIS, { lat: 50.6292, lng: 3.0573 }));
});

// ═══════════════════════════════════════════════════════════════════════════
// VILLES DE DÉMARRAGE — l'accès non gardé qui rendait 500 sur la course
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('démarrage : CITIES reste une LISTE DE DÉMARRAGE, pas la liste du monde', () => {
  // Si cette assertion casse parce que quelqu'un a rajouté des villes ici pour
  // « en ouvrir plus », c'est le mauvais levier : le référentiel est cities-eu.
  assert(Object.keys(CITIES).length < 10, 'CITIES n a pas vocation à grossir');
  assert(isStarterCityId('paris'));
  assert(isStarterCityId('lille'));
});

Deno.test('démarrage : accès GARDÉ — un id inconnu rend undefined, ne lève pas', () => {
  // C'est exactement le blocage n°1 : `CITIES[cityId].name` sur un cityId venu
  // de la BASE levait un TypeError avalé par le catch global → 500 sur une
  // course pourtant écrite. Un geonameid n'est pas une ville de démarrage.
  assertEquals(starterCityCenter('2988507'), undefined);
  assertEquals(starterCityName('2988507'), undefined);
  assertEquals(starterCityCenter(''), undefined);
  assertEquals(starterCityName('toString'), undefined); // pas de fuite du prototype
  assertEquals(isStarterCityId('constructor'), false);
});

Deno.test('démarrage : les centres connus restent lisibles', () => {
  assertEquals(starterCityName('paris'), 'Paris');
  assertEquals(starterCityCenter('lille')?.lat, CITIES.lille.center.lat);
});

// ═══════════════════════════════════════════════════════════════════════════
// LE RÉFÉRENTIEL EMBARQUÉ — la donnée réelle, telle que générée
// ═══════════════════════════════════════════════════════════════════════════

const EU = parsePackedCitiesCached(EU_CITIES_PACKED);

Deno.test('référentiel : toutes les lignes se parsent (aucune perte silencieuse)', () => {
  assertEquals(EU.length, EU_CITIES_COUNT);
  assertEquals(EU.length, EU_CITIES_SOURCE.cityCount);
  // Plancher de sécurité, pas un compte exact (celui-ci est vérifié juste
  // au-dessus) : il attrape une génération partielle ou un filtre qui se
  // referme par erreur. Périmètre courant : 7 870 villes.
  assert(EU.length > 7_000, `référentiel étrangement petit : ${EU.length}`);
});

Deno.test('référentiel : les geonameid sont UNIQUES (clé de hachage Zone du Jour)', () => {
  // Un doublon d'identifiant ferait diverger le tirage de la Zone du Jour (0052)
  // entre deux villes homonymes.
  assertEquals(new Set(EU.map((c) => c.id)).size, EU.length);
});

Deno.test('référentiel : chaque identifiant est un geonameid numérique', () => {
  for (const c of EU) {
    assert(/^\d+$/.test(c.id), `identifiant non numérique : « ${c.id} » (${c.name})`);
  }
});

Deno.test('référentiel : coordonnées plausibles pour l Europe', () => {
  for (const c of EU) {
    assert(c.lat >= 27 && c.lat <= 82, `latitude hors Europe : ${c.name} ${c.lat}`);
    assert(c.lng >= -32 && c.lng <= 70, `longitude hors Europe : ${c.name} ${c.lng}`);
  }
});

Deno.test('référentiel : codes pays sur 2 lettres, cohérents avec la liste exportée', () => {
  const declared = new Set(EU_CITIES_COUNTRY_CODES);
  for (const c of EU) {
    assert(/^[A-Z]{2}$/.test(c.country), `code pays invalide : « ${c.country} »`);
    assert(declared.has(c.country), `pays ${c.country} absent de EU_CITIES_COUNTRY_CODES`);
  }
  assertEquals(declared.size, EU_CITIES_SOURCE.countryCount);
});

Deno.test('référentiel : trié par population décroissante', () => {
  for (let i = 1; i < EU.length; i++) {
    assert(
      EU[i - 1].population >= EU[i].population,
      `tri rompu en ${i} : ${EU[i - 1].name} < ${EU[i].name}`,
    );
  }
});

Deno.test('référentiel : aucun nom ne porte les séparateurs du format packé', () => {
  for (const c of EU) {
    assert(!c.name.includes(CITY_FIELD_SEPARATOR), `nom porteur de « | » : ${c.name}`);
    assert(c.name.trim().length > 0, `nom vide pour ${c.id}`);
  }
});

Deno.test('référentiel : ATTRIBUTION CC BY présente et exploitable', () => {
  // Obligation de LICENCE, pas un détail : sans attribution affichable, on n'a
  // pas le droit d'embarquer cette donnée.
  assertEquals(EU_CITIES_SOURCE.license, 'CC BY 4.0');
  assert(EU_CITIES_SOURCE.attribution.includes('GeoNames'));
  assert(EU_CITIES_SOURCE.licenseUrl.startsWith('https://creativecommons.org/licenses/by/4.0'));
  assert(/creative commons/i.test(EU_CITIES_SOURCE.licenseNotice));
});

Deno.test('référentiel : le référentiel NE PORTE AUCUNE donnée de jeu', () => {
  // Le contrat central : une ville dit où elle est, jamais qui la tient.
  // Si un champ « rank », « crew », « owner »… apparaît un jour, ce test tombe.
  const allowed = ['id', 'name', 'country', 'lat', 'lng', 'population'].sort();
  for (const c of EU.slice(0, 50)) {
    assertEquals(Object.keys(c).sort(), allowed);
  }
});

Deno.test('référentiel : on retrouve des villes réelles, connues, non inventées', () => {
  // Paris et Lille sont les deux villes de démarrage : elles DOIVENT exister
  // aussi dans le référentiel, sinon la passerelle entre les deux espaces
  // d'identifiants n'a aucun sens.
  for (const [needle, country] of [['Paris', 'FR'], ['Lille', 'FR'], ['Berlin', 'DE'], ['Kraków', 'PL']]) {
    const hit = searchCities(EU, needle, { limit: 50 }).find((c) => c.country === country);
    assert(hit, `${needle} (${country}) introuvable dans le référentiel`);
  }
});

Deno.test('référentiel : une ville MOYENNE reste choisissable (pas que les capitales)', () => {
  // L'arbitrage de taille est justifié par ceci : si on avait tronqué au top
  // 2 000, le plancher de population serait passé de 15 000 à ~45 000 et ces
  // villes-là — celles où vivent les vrais crews — auraient disparu.
  const small = EU.filter((c) => c.population < 30_000);
  assert(small.length > 1_000, `seulement ${small.length} villes sous 30 000 habitants`);
});

Deno.test('référentiel : la recherche reste bornée même sur des milliers de villes (§A)', () => {
  // Une pill par ville tenait à 2 villes ; à 7 870 l'écran est illisible.
  assert(searchCities(EU, 'san').length <= CITY_SEARCH_RESULT_LIMIT);
  assert(searchCities(EU, '').length <= CITY_SEARCH_RESULT_LIMIT);
});

Deno.test('référentiel : un disque d aire de jeu se pose sur n importe quelle ville', () => {
  for (const c of [EU[0], EU[Math.floor(EU.length / 2)], EU[EU.length - 1]]) {
    const poly = cityDiscPolygon({ lat: c.lat, lng: c.lng });
    assertEquals(poly.coordinates[0].length, CITY_DISC_POLYGON_VERTICES + 1);
    assert(isInsideCityDisc({ lat: c.lat, lng: c.lng }, { lat: c.lat, lng: c.lng }));
  }
});
