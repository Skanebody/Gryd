/**
 * GRYD — E13 « Recherche de lieu » : ce que le moteur n'a pas le droit de faire.
 *
 * Par ordre de gravité, et chacun correspond à une faute déjà commise ailleurs
 * dans ce dépôt (ou évitée de justesse) :
 *  1. un ÉCHEC de recherche ne doit JAMAIS se peindre en « aucun résultat » —
 *     c'est la nuance qui fonde l'écran (spec E13 + constitution 1) ;
 *  2. une lecture EN COURS n'affirme rien : ni « rien trouvé », ni « échec » ;
 *  3. un lieu de l'historique tombant dans une zone floutée n'y entre pas, et
 *     tant qu'on ne SAIT PAS ce que sont les zones, on n'écrit rien (spec E13,
 *     §12) ;
 *  4. aucune ligne sans coordonnées : le seul geste de l'écran est « déplacer la
 *     carte ici », une ligne qui ne le peut pas serait un bouton mort ;
 *  5. aucune affirmation « pas encore un terrain de jeu » sans avoir LU le
 *     serveur (le troisième cran `unknown`) ;
 *  6. zéro donnée EU factice : chercher « Berlin » rend un LIEU et rien d'autre.
 *
 * On teste sur le VRAI référentiel embarqué là où c'est possible : les défauts
 * de ce genre de module (arrondissements, coordonnées vides) ne se voient pas
 * sur trois villes inventées.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { PLACE_SEARCH_NEARBY_LIMIT, PLACE_SEARCH_RECENT_MAX, parsePackedCitiesCached } from '@klaim/shared';
import { EU_CITIES_PACKED } from '@klaim/shared/cities-eu';
import { buildCityIndex, type CityEntry } from '../city/catalog.ts';
import {
  PLACE_SEARCH_MIN_QUERY_LENGTH,
  admitToRecents,
  formatPlaceDistanceKm,
  nearbyPlaceEntries,
  parseRecentPlaces,
  placeOpenness,
  placeSearchPhase,
  pushRecentPlace,
  searchPlaces,
  serializeRecentPlaces,
  toPlaceResults,
  type PlaceResult,
  type RecentPlace,
} from './placeSearch.ts';

const REFERENTIAL = parsePackedCitiesCached(EU_CITIES_PACKED);
/** Index SANS lecture serveur : c'est l'état réel aujourd'hui (base vide). */
const INDEX_UNREAD = buildCityIndex([], REFERENTIAL);
/** Index avec Paris déclarée ouverte par le serveur. */
const INDEX_PARIS_OPEN = buildCityIndex([{ cityId: 'paris', name: 'Paris' }], REFERENTIAL);

const PARIS = { lat: 48.8566, lng: 2.3522 };
const LILLE = { lat: 50.6292, lng: 3.0573 };

// ═══ 1 · LES CINQ ÉTATS, JAMAIS CONFONDUS ══════════════════════════════════

Deno.test('phase : un ÉCHEC de recherche ne se peint jamais en « aucun résultat »', () => {
  const failed = placeSearchPhase({ query: 'berlin', engine: 'unavailable', results: [] });
  assertEquals(failed.kind, 'failed');
  const empty = placeSearchPhase({ query: 'zzzzzz', engine: 'ready', results: [] });
  assertEquals(empty.kind, 'empty');
  // Le contraire aurait été le défaut : deux situations, deux phrases.
  assert(failed.kind !== empty.kind);
});

Deno.test('phase : une lecture EN COURS n’affirme ni vide ni échec', () => {
  const loading = placeSearchPhase({ query: 'berlin', engine: 'loading', results: [] });
  assertEquals(loading.kind, 'searching');
  // Même avec zéro résultat sous la main : on n'a pas encore cherché.
  assert(loading.kind !== 'empty');
  assert(loading.kind !== 'failed');
});

Deno.test('phase : pas de saisie ⇒ idle, quel que soit l’état du moteur', () => {
  for (const engine of ['loading', 'ready', 'unavailable'] as const) {
    assertEquals(placeSearchPhase({ query: '   ', engine, results: [] }).kind, 'idle');
  }
});

Deno.test('phase : saisie trop courte ⇒ on DIT le seuil, avant d’interroger quoi que ce soit', () => {
  const phase = placeSearchPhase({ query: 'p', engine: 'unavailable', results: [] });
  assertEquals(phase.kind, 'too-short');
  assertEquals(phase.kind === 'too-short' ? phase.min : -1, PLACE_SEARCH_MIN_QUERY_LENGTH);
});

Deno.test('phase : des lignes ⇒ results, et elles voyagent telles quelles', () => {
  const results = searchPlaces(INDEX_UNREAD, 'lille', { serverRead: false });
  const phase = placeSearchPhase({ query: 'lille', engine: 'ready', results });
  assertEquals(phase.kind, 'results');
  assertEquals(phase.kind === 'results' ? phase.results.length : 0, results.length);
});

// ═══ 2 · AUCUNE LIGNE MORTE, AUCUNE AFFIRMATION NON LUE ════════════════════

Deno.test('résultats : une entrée SANS coordonnées est écartée (elle ne peut pas déplacer la carte)', () => {
  const entries: CityEntry[] = [
    { cityId: 'x', name: 'Ville sans centre', country: null, status: 'open' },
    { cityId: 'y', name: 'NaN-ville', country: null, status: 'open', center: { lat: NaN, lng: 2 } },
    { cityId: 'z', name: 'Vraie', country: 'FR', status: 'open', center: PARIS },
  ];
  const out = toPlaceResults(entries, { serverRead: true });
  assertEquals(out.map((r) => r.cityId), ['z']);
});

Deno.test('openness : sans lecture serveur, AUCUNE affirmation — le troisième cran existe', () => {
  const entry: CityEntry = { cityId: 'paris', name: 'Paris', country: 'FR', status: 'referenced', center: PARIS };
  assertEquals(placeOpenness(entry, false), 'unknown');
  assertEquals(placeOpenness(entry, true), 'not-open');
  assertEquals(placeOpenness({ ...entry, status: 'open' }, true), 'open');
});

Deno.test('openness : « pas encore un terrain de jeu » n’est jamais peint sur Paris quand Paris EST ouverte', () => {
  const results = searchPlaces(INDEX_PARIS_OPEN, 'paris', { serverRead: true });
  const paris = results.find((r) => r.cityId === 'paris');
  assert(paris, 'Paris doit ressortir de la recherche');
  assertEquals(paris.openness, 'open');
});

Deno.test('zéro donnée EU factice : chercher « Berlin » rend un LIEU, et rien d’autre', () => {
  const results = searchPlaces(INDEX_UNREAD, 'berlin', { serverRead: true });
  assert(results.length > 0, 'Berlin existe dans le référentiel');
  const berlin = results[0] as PlaceResult;
  // Les seules clés qu'une ligne porte : aucune place pour un crew, un rang,
  // un territoire ou une population.
  assertEquals(
    Object.keys(berlin).sort(),
    ['center', 'cityId', 'distanceKm', 'label', 'openness'],
  );
  // Et aucune aire de jeu n'est promise là-bas.
  assertEquals(berlin.openness, 'not-open');
});

Deno.test('recherche : le seuil de frappe est respecté (pas de liste sur une lettre)', () => {
  assertEquals(searchPlaces(INDEX_UNREAD, 'p', { serverRead: true }).length, 0);
  assert(searchPlaces(INDEX_UNREAD, 'pa', { serverRead: true }).length > 0);
});

Deno.test('distance : calculée seulement si la position est connue, jamais devinée', () => {
  const withPos = searchPlaces(INDEX_UNREAD, 'lille', { serverRead: true, from: PARIS });
  assert(withPos.every((r) => typeof r.distanceKm === 'number'));
  const lille = withPos.find((r) => r.label.startsWith('Lille'));
  assert(lille && lille.distanceKm !== null);
  // Paris → Lille ≈ 204 km à vol d'oiseau.
  assert(Math.abs(lille.distanceKm - 204) < 12, `attendu ≈204 km, obtenu ${lille.distanceKm}`);

  const without = searchPlaces(INDEX_UNREAD, 'lille', { serverRead: true });
  assert(without.every((r) => r.distanceKm === null));
});

// ═══ 3 · RÉSULTATS PROCHES ═════════════════════════════════════════════════

Deno.test('proches : sans position, liste VIDE — jamais un repli « grandes villes » présenté comme voisin', () => {
  assertEquals(nearbyPlaceEntries(INDEX_UNREAD, null).length, 0);
});

Deno.test('proches : bornés au plafond de game-rules, et le plus proche d’abord', () => {
  const near = nearbyPlaceEntries(INDEX_UNREAD, LILLE);
  assert(near.length > 0);
  assert(near.length <= PLACE_SEARCH_NEARBY_LIMIT);
  assertEquals(near[0]?.name, 'Lille');
});

Deno.test('proches : au cœur de Paris, on propose PARIS — pas « Paris 15 Vaugirard »', () => {
  const near = nearbyPlaceEntries(INDEX_UNREAD, { lat: 48.842, lng: 2.298 }); // 15ᵉ
  const names = near.map((c) => c.name);
  assertEquals(names[0], 'Paris');
  assert(
    !names.some((n) => /^Paris \d/.test(n)),
    `un arrondissement s’est glissé dans la liste : ${names.join(', ')}`,
  );
});

Deno.test('proches : toutes les lignes portent un centre exploitable', () => {
  const near = nearbyPlaceEntries(INDEX_UNREAD, PARIS);
  const results = toPlaceResults(near, { serverRead: false, from: PARIS });
  assertEquals(results.length, near.length);
});

// ═══ 4 · VIE PRIVÉE : CE QUI N'ENTRE PAS DANS L'HISTORIQUE ═════════════════

Deno.test('historique : un lieu DANS une zone floutée n’est jamais retenu', () => {
  const verdict = admitToRecents(PARIS, {
    known: true,
    zones: [{ center: { lat: 48.857, lng: 2.353 }, radiusM: 300 }],
  });
  assertEquals(verdict, 'skip-private');
});

Deno.test('historique : TANT QU’ON NE SAIT PAS, on n’écrit pas (lecture en cours ou échouée)', () => {
  assertEquals(admitToRecents(PARIS, { known: false }), 'skip-unknown');
});

Deno.test('historique : zones lues et vides ⇒ on retient (« vide » est une réponse)', () => {
  assertEquals(admitToRecents(PARIS, { known: true, zones: [] }), 'record');
});

Deno.test('historique : une zone de rayon absurde ne masque rien par accident', () => {
  const verdict = admitToRecents(PARIS, {
    known: true,
    zones: [{ center: PARIS, radiusM: 0 }, { center: PARIS, radiusM: Number.NaN }],
  });
  assertEquals(verdict, 'record');
});

Deno.test('historique : hors zone ⇒ retenu', () => {
  assertEquals(
    admitToRecents(LILLE, { known: true, zones: [{ center: PARIS, radiusM: 500 }] }),
    'record',
  );
});

// ═══ 5 · L'HISTORIQUE LUI-MÊME ═════════════════════════════════════════════

const rec = (id: string): RecentPlace => ({ cityId: id, label: id, lat: 48, lng: 2 });

Deno.test('récentes : plafonnées par game-rules, plus récent en tête', () => {
  let list: readonly RecentPlace[] = [];
  for (let i = 0; i < PLACE_SEARCH_RECENT_MAX + 3; i++) {
    list = pushRecentPlace(list, rec(`v${i}`), PLACE_SEARCH_RECENT_MAX);
  }
  assertEquals(list.length, PLACE_SEARCH_RECENT_MAX);
  assertEquals(list[0]?.cityId, `v${PLACE_SEARCH_RECENT_MAX + 2}`);
});

Deno.test('récentes : rejouer une entrée la REMONTE, elle ne se duplique pas', () => {
  const list = pushRecentPlace(
    pushRecentPlace(pushRecentPlace([], rec('a'), 5), rec('b'), 5),
    rec('a'),
    5,
  );
  assertEquals(list.map((r) => r.cityId), ['a', 'b']);
});

Deno.test('récentes : une entrée persistée illisible est ÉCARTÉE, jamais « réparée » à 0,0', () => {
  const raw = JSON.stringify([
    { cityId: 'ok', label: 'Paris (FR)', lat: 48.8, lng: 2.3 },
    { cityId: 'nolatlng', label: 'Sans coord' },
    { cityId: '', label: 'Sans id', lat: 1, lng: 1 },
    { cityId: 'nan', label: 'NaN', lat: 'x', lng: 2 },
    { cityId: 'ok', label: 'Doublon', lat: 1, lng: 1 },
  ]);
  const parsed = parseRecentPlaces(raw, 10);
  assertEquals(parsed.length, 1);
  assertEquals(parsed[0]?.cityId, 'ok');
});

Deno.test('récentes : stockage vide ou corrompu ⇒ liste vide, jamais une exception', () => {
  assertEquals(parseRecentPlaces(null, 5).length, 0);
  assertEquals(parseRecentPlaces('{{{', 5).length, 0);
  assertEquals(parseRecentPlaces('"une chaîne"', 5).length, 0);
});

Deno.test('récentes : aller-retour de sérialisation stable', () => {
  const list = [rec('a'), rec('b')];
  assertEquals(parseRecentPlaces(serializeRecentPlaces(list), 5), list);
});

// ═══ 6 · AFFICHAGE DE LA DISTANCE ══════════════════════════════════════════

Deno.test('distance affichée : jamais « 0 km » nu, décimale sous 10 km, entier au-delà', () => {
  assertEquals(formatPlaceDistanceKm(0, 'fr'), '0,1');
  assertEquals(formatPlaceDistanceKm(2.44, 'fr'), '2,4');
  assertEquals(formatPlaceDistanceKm(203.6, 'fr'), '204');
  assertEquals(formatPlaceDistanceKm(2.44, 'en'), '2.4');
});
