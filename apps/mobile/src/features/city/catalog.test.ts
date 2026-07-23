/**
 * GRYD — l'index de villes du client ne ment pas sur ce qui est OUVERT.
 *
 * Ce que ces tests protègent, dans l'ordre de gravité :
 *  1. une ville du référentiel ne doit JAMAIS ressortir avec le statut `open` —
 *     ce serait promettre un terrain de jeu qui n'existe pas ;
 *  2. Paris ne doit pas apparaître deux fois (une fois « ville ouverte », une
 *     fois « ville du référentiel ») : le joueur ne saurait pas laquelle taper ;
 *  3. la liste rendue est BORNÉE — 7 870 lignes ne sont pas un écran (§A) ;
 *  4. les homonymes restent distinguables (Brest FR / Brest BY).
 *
 * On teste sur le VRAI référentiel embarqué, pas sur trois villes inventées :
 * les deux défauts réels déjà trouvés sur ce chantier (Novossibirsk en
 * « Europe », coordonnées vides à 0,0) ne se voyaient que sur la vraie donnée.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { CITY_SEARCH_RESULT_LIMIT, parsePackedCitiesCached } from '@klaim/shared';
import { EU_CITIES_COUNT, EU_CITIES_PACKED } from '@klaim/shared/cities-eu';
import {
  buildCityIndex,
  CITY_EXONYMS,
  cityEntryLabel,
  cityQueryAliases,
  findCityEntry,
  nearestCityEntry,
  searchCityEntries,
  type OpenCityRow,
} from './catalog.ts';

const ALL = parsePackedCitiesCached(EU_CITIES_PACKED);

/** Ce que `city_zones` contient RÉELLEMENT aujourd'hui (seed 0004 + contours 0033). */
const OPEN_TODAY: readonly OpenCityRow[] = [
  { cityId: 'paris', name: 'Paris' },
  { cityId: 'lille', name: 'Lille (MEL)' },
];

Deno.test('le référentiel embarqué est bien celui qu on croit', () => {
  assertEquals(ALL.length, EU_CITIES_COUNT);
});

Deno.test('aucune ville du référentiel ne se présente comme ouverte', () => {
  const index = buildCityIndex(OPEN_TODAY, ALL);
  const results = searchCityEntries(index, '', 200);
  const openIds = new Set(OPEN_TODAY.map((r) => r.cityId));
  for (const entry of results) {
    if (entry.status === 'open') {
      assert(openIds.has(entry.cityId), `${entry.name} prétend être ouverte`);
    }
  }
});

Deno.test('serveur muet ⇒ AUCUNE ville ouverte (on ne complète pas avec les villes de démarrage)', () => {
  const index = buildCityIndex([], ALL);
  assertEquals(index.open.length, 0);
  const results = searchCityEntries(index, 'paris');
  assert(results.length > 0, 'la recherche doit continuer de fonctionner');
  assert(
    results.every((e) => e.status === 'referenced'),
    'sans lecture serveur, rien ne peut être déclaré ouvert',
  );
});

/**
 * LA VILLE OUVERTE ABSORBE SA JUMELLE, ET ARRIVE EN TÊTE.
 *
 * Le référentiel GeoNames `cities15000` contient les ARRONDISSEMENTS comme
 * localités à part entière — 24 lignes « Paris 15 Vaugirard », « Paris 13e
 * Arrondissement »… + 9 pour Lyon + 16 pour Marseille + 20 Kreise à Zürich + 22
 * kerület à Budapest. Ils sont désormais ÉCARTÉS quand leur ville est dans la
 * même réponse (voir le bloc de tests « arrondissements » plus bas) ; ici on
 * garantit l'autre moitié : la vraie Paris, ouverte, est UNIQUE et PREMIÈRE.
 */
Deno.test('la ville ouverte est unique et arrive en tête', () => {
  const index = buildCityIndex(OPEN_TODAY, ALL);
  const hits = searchCityEntries(index, 'paris', 50);
  assertEquals(hits[0]?.cityId, 'paris');
  assertEquals(hits[0]?.status, 'open');
  assertEquals(hits.filter((e) => e.cityId === 'paris').length, 1);
  // Aucune autre ligne ne s'appelle exactement « Paris » : la jumelle du
  // référentiel (geonameid 2988507) a bien été absorbée, pas listée en double.
  assertEquals(hits.filter((e) => e.name.toLowerCase() === 'paris').length, 1);
  // Le nom affiché est celui du SERVEUR, pas celui de GeoNames.
  const lille = searchCityEntries(index, 'lille', 50).find((e) => e.cityId === 'lille');
  assertEquals(lille?.name, 'Lille (MEL)');
  assertEquals(lille?.status, 'open');
  assertEquals(lille?.country, 'FR');
});

Deno.test('une ville de démarrage hérite du pays et du centre de sa jumelle', () => {
  const index = buildCityIndex(OPEN_TODAY, ALL);
  const paris = findCityEntry(index, 'paris');
  assertEquals(paris?.country, 'FR');
  assert(paris?.center, 'le centre doit être connu');
  assert(Math.abs((paris?.center?.lat ?? 0) - 48.85) < 0.3);
});

Deno.test('les villes ouvertes passent devant les villes du référentiel', () => {
  const index = buildCityIndex(OPEN_TODAY, ALL);
  const hits = searchCityEntries(index, 'li', 25);
  const firstReferenced = hits.findIndex((e) => e.status === 'referenced');
  const lastOpen = hits.map((e) => e.status).lastIndexOf('open');
  if (firstReferenced >= 0 && lastOpen >= 0) {
    assert(lastOpen < firstReferenced, 'une ville ouverte ne doit jamais suivre une non-ouverte');
  }
});

Deno.test('la liste rendue est bornée — jamais 7 870 lignes', () => {
  const index = buildCityIndex(OPEN_TODAY, ALL);
  assertEquals(searchCityEntries(index, '').length, CITY_SEARCH_RESULT_LIMIT);
  assertEquals(searchCityEntries(index, 'a').length, CITY_SEARCH_RESULT_LIMIT);
  assertEquals(searchCityEntries(index, 'saint', 5).length, 5);
  assertEquals(searchCityEntries(index, 'paris', 0).length, 0);
});

Deno.test('les homonymes restent choisissables ET distinguables', () => {
  const index = buildCityIndex(OPEN_TODAY, ALL);
  const brests = searchCityEntries(index, 'brest', 25).filter(
    (e) => e.name.toLowerCase() === 'brest',
  );
  assert(brests.length >= 2, `attendu ≥2 Brest, reçu ${brests.length}`);
  const labels = brests.map(cityEntryLabel);
  assertEquals(new Set(labels).size, labels.length, `libellés ambigus : ${labels.join(', ')}`);
  assert(labels.includes('Brest · FR'), labels.join(', '));
  assert(labels.includes('Brest · BY'), labels.join(', '));
});

Deno.test('accents et casse ne cachent pas une ville (Zürich, Málaga, Saint-Étienne)', () => {
  const index = buildCityIndex(OPEN_TODAY, ALL);
  const found = (q: string) => searchCityEntries(index, q, 10).map((e) => e.name);
  assert(found('zurich').includes('Zürich'), found('zurich').join(', '));
  assert(found('MALAGA').includes('Málaga'), found('MALAGA').join(', '));
  assert(found('saint etienne').includes('Saint-Étienne'), found('saint etienne').join(', '));
});

Deno.test('une ville ouverte inconnue du référentiel reste choisissable, sans pays inventé', () => {
  const index = buildCityIndex([{ cityId: '999999999', name: 'Ville Test' }], ALL);
  const entry = findCityEntry(index, '999999999');
  assertEquals(entry?.status, 'open');
  assertEquals(entry?.country, null);
  assertEquals(entry?.center, undefined, 'aucune coordonnée devinée');
  assertEquals(cityEntryLabel(entry!), 'Ville Test');
});

Deno.test('un identifiant inconnu rend null — jamais un repli silencieux', () => {
  const index = buildCityIndex(OPEN_TODAY, ALL);
  assertEquals(findCityEntry(index, 'atlantide'), null);
  assertEquals(findCityEntry(index, null), null);
  assertEquals(findCityEntry(index, ''), null);
});

Deno.test('les lignes serveur vides sont ignorées, pas affichées', () => {
  const index = buildCityIndex(
    [
      { cityId: '', name: 'Sans id' },
      { cityId: 'vide', name: '   ' },
      ...OPEN_TODAY,
    ],
    ALL,
  );
  assertEquals(index.open.length, 2);
});

Deno.test('aucune entrée ne transporte de population, de rang ni de densité', () => {
  const index = buildCityIndex(OPEN_TODAY, ALL);
  const entry = searchCityEntries(index, 'berlin', 1)[0];
  assert(entry, 'Berlin doit être trouvable');
  // Le contrat de CityEntry est fermé : si un champ « population » revenait, un
  // écran finirait par l'afficher comme une activité de jeu (AMENDEMENT-47).
  assertEquals(
    Object.keys(entry).sort().join(','),
    ['center', 'cityId', 'country', 'name', 'status'].join(','),
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// ARRONDISSEMENTS — 90 % de bruit sur le cas le plus fréquent
//
// Mesuré AVANT correctif, sur la vraie donnée : « paris » rendait Paris (FR),
// puis Paris 15 Vaugirard, Paris 20 Ménilmontant, Paris 18 Buttes-Montmartre,
// Paris 13 Gobelins… Un écran §A se comprend en moins de 3 s ; celui-là
// demandait de lire 12 lignes pour comprendre qu'il n'y avait qu'une ville.
// ═══════════════════════════════════════════════════════════════════════════

const INDEX = buildCityIndex(OPEN_TODAY, ALL);
const names = (q: string, limit = 25) => searchCityEntries(INDEX, q, limit).map((e) => e.name);

Deno.test('« paris » ne rend plus les arrondissements', () => {
  const hits = names('paris');
  assertEquals(hits[0], 'Paris');
  const districts = hits.filter((n) => /^Paris \d/.test(n));
  assertEquals(districts.length, 0, `arrondissements restants : ${districts.join(', ')}`);
});

Deno.test('« lyon » et « marseille » non plus — mais les communes voisines restent', () => {
  const lyon = names('lyon');
  assertEquals(lyon[0], 'Lyon');
  assertEquals(lyon.filter((n) => /^Lyon \d/.test(n)).length, 0, lyon.join(', '));
  // Sainte-Foy-lès-Lyon est une COMMUNE : elle ne commence pas par « Lyon », et
  // rien ne doit la faire disparaître.
  assert(lyon.includes('Sainte-Foy-lès-Lyon'), lyon.join(', '));

  const marseille = names('marseille');
  assertEquals(marseille[0], 'Marseille');
  assertEquals(marseille.filter((n) => /^Marseille \d/.test(n)).length, 0, marseille.join(', '));
});

Deno.test('« zurich » rend Zürich, pas ses 20 Kreise', () => {
  const hits = names('zurich');
  assertEquals(hits[0], 'Zürich');
  const kreise = hits.filter((n) => n.includes('Kreis'));
  assertEquals(kreise.length, 0, `Kreise restants : ${kreise.join(', ')}`);
});

Deno.test('« budapest » rend Budapest, pas ses 22 kerület', () => {
  const hits = names('budapest');
  assertEquals(hits[0], 'Budapest');
  assertEquals(hits.filter((n) => n.includes('kerület')).length, 0, hits.join(', '));
});

Deno.test('« malaga » : Málaga d abord, et Vélez-Málaga n est PAS une subdivision', () => {
  const hits = names('malaga');
  assertEquals(hits[0], 'Málaga');
  assert(hits.includes('Vélez-Málaga'), hits.join(', '));
});

/**
 * LE RISQUE INVERSE, et il est plus grave : faire disparaître la ville de
 * quelqu'un. Ces quatre communes portent le nom d'une ville plus grosse et
 * proche — une heuristique « préfixe = arrondissement » les aurait avalées.
 */
Deno.test('aucune vraie commune n est avalée par le filtre d arrondissements', () => {
  for (const [query, expected] of [
    ['clichy', 'Clichy-sous-Bois'],
    ['saint ouen', "Saint-Ouen-l'Aumône"],
    ['annecy', 'Annecy-le-Vieux'],
    ['sant andreu', 'Sant Andreu de la Barca'],
  ] as const) {
    const hits = names(query, 40);
    assert(hits.includes(expected), `${expected} absent de « ${query} » : ${hits.join(', ')}`);
  }
});

Deno.test('les deux Brest restent choisissables et départagées par le pays', () => {
  const hits = searchCityEntries(INDEX, 'brest', 25).filter((e) => e.name === 'Brest');
  assertEquals(hits.length, 2);
  assertEquals(
    hits.map((e) => cityEntryLabel(e)).sort().join(' / '),
    'Brest · BY / Brest · FR',
  );
});

Deno.test('écarter les arrondissements ne vide pas la liste (la fenêtre de lecture est élargie)', () => {
  // Requête à très nombreuses correspondances : la liste reste PLEINE malgré le
  // filtrage — sinon demander 25 villes en aurait rendu 3.
  assertEquals(searchCityEntries(INDEX, 'san', 25).length, 25);
  assertEquals(searchCityEntries(INDEX, 'ville', 25).length, 25);
});

// ═══════════════════════════════════════════════════════════════════════════
// EXONYMES — « londres » ne rendait RIEN
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('chaque exonyme mène à une ville RÉELLE du référentiel', () => {
  // La table est saisie à la main : ce test est ce qui l'empêche de mentir. Il a
  // déjà attrapé une flèche à l'envers (« koln » → « cologne », alors que le
  // référentiel dit « Köln »). Il ne suffit pas que la cible rende QUELQUE
  // CHOSE : la première ville doit VRAIMENT porter ce nom.
  for (const [exonym, target] of Object.entries(CITY_EXONYMS)) {
    const first = searchCityEntries(INDEX, target, 5)[0];
    assert(first, `« ${exonym} » → « ${target} » ne mène à aucune ville`);
    const found = first.name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase();
    assert(
      found.startsWith(target),
      `« ${exonym} » → « ${target} » tombe sur « ${first.name} »`,
    );
  }
});

Deno.test('les quatre exonymes du rapport terrain rendent la bonne ville', () => {
  for (const [query, expected] of [
    ['londres', 'London'],
    ['bruxelles', 'Brussels'],
    ['cracovie', 'Kraków'],
    ['lisbonne', 'Lisbon'],
  ] as const) {
    assertEquals(names(query, 5)[0], expected, `« ${query} » : ${names(query, 5).join(', ')}`);
  }
});

Deno.test('un nom local rend sa ville en tête (München, Praha, Wien, Napoli)', () => {
  assertEquals(names('munchen', 5)[0], 'Munich');
  assertEquals(names('praha', 5)[0], 'Prague');
  assertEquals(names('napoli', 5)[0], 'Naples');
  assertEquals(names('wien', 5)[0], 'Vienna');
});

/**
 * L'EXONYME N'ÉCRASE JAMAIS LE NOM RÉEL. « Vienne » est une vraie commune de
 * l'Isère ET le nom français de Vienna : les deux doivent sortir, la vraie
 * Vienne d'abord — c'est ce que l'utilisateur a littéralement tapé.
 */
Deno.test('le nom réel passe devant l exonyme', () => {
  const hits = names('vienne', 10);
  assertEquals(hits[0], 'Vienne');
  assert(hits.includes('Vienna'), hits.join(', '));
});

Deno.test('les alias sont déterministes, bornés, et muets sur une requête trop courte', () => {
  assertEquals(cityQueryAliases('londres'), ['london']);
  assertEquals(cityQueryAliases('LONDRES'), ['london']);
  assertEquals(cityQueryAliases('lond'), ['london']);
  assertEquals(cityQueryAliases('l'), []);
  assertEquals(cityQueryAliases(''), []);
  // Deux ou trois lettres ne déclenchent PAS de reconnaissance par préfixe :
  // « co » remontait Köln (via « cologne ») avant Coventry, « la » remontait
  // La Haye avant Latina. Un exonyme à moitié tapé ne dit rien.
  assertEquals(cityQueryAliases('co'), []);
  assertEquals(cityQueryAliases('la'), []);
  assert(cityQueryAliases('gene').length <= 3, cityQueryAliases('gene').join(', '));
  assertEquals(cityQueryAliases('vars'), cityQueryAliases('vars'));
});

/**
 * PAS DE SORTIE ANTICIPÉE : l'exonyme doit avoir sa chance même quand la passe
 * littérale remplit déjà la liste. « co » ne déclenche plus d'alias, mais
 * « copen » si — et « Copenhagen » doit sortir, quel que soit le nombre de
 * villes contenant « copen ».
 */
Deno.test('un exonyme sort même quand la requête littérale a déjà des résultats', () => {
  assertEquals(names('copen', 25)[0], 'Copenhagen');
  assertEquals(names('roma', 25)[0], 'Rome');
  assertEquals(names('geneve', 25)[0], 'Geneva');
});

// ═══════════════════════════════════════════════════════════════════════════
// RACCOURCI « UTILISER MA POSITION »
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('dans Paris, le raccourci propose Paris — pas un arrondissement', () => {
  const index = buildCityIndex(OPEN_TODAY, ALL);
  // Place de la Bastille (4ᵉ/11ᵉ/12ᵉ) : entourée d'arrondissements du référentiel.
  const hit = nearestCityEntry(index, { lat: 48.8532, lng: 2.3692 });
  assertEquals(hit?.cityId, 'paris');
  assertEquals(hit?.status, 'open');
});

Deno.test('hors ville ouverte non plus : dans Lyon 6ᵉ, le raccourci propose Lyon', () => {
  // Point à 200 m du centre de « Lyon 06 » (45.7679, 4.8506) et à 2 km de celui
  // de Lyon : le plus PROCHE est l'arrondissement, la bonne réponse est la ville.
  const hit = nearestCityEntry(INDEX, { lat: 45.768, lng: 4.851 });
  assertEquals(hit?.name, 'Lyon');
});

Deno.test('hors ville ouverte, le raccourci propose la vraie ville la plus proche', () => {
  const index = buildCityIndex(OPEN_TODAY, ALL);
  // Centre de Rennes — aucune ville ouverte à moins de 25 km.
  const hit = nearestCityEntry(index, { lat: 48.1113, lng: -1.6800 });
  assertEquals(hit?.name, 'Rennes');
  assertEquals(hit?.status, 'referenced');
});

Deno.test('loin de toute ville, le raccourci rend null — jamais un repli sur Paris', () => {
  const index = buildCityIndex(OPEN_TODAY, ALL);
  // Milieu de l'Atlantique nord.
  assertEquals(nearestCityEntry(index, { lat: 45.0, lng: -30.0 }), null);
});
