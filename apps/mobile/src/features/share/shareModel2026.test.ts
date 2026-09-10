import { buildShareFacts2026, exportLayout2026, shareFamilyCapability2026 } from './shareModel2026.ts';

declare const Deno: { test(name: string, fn: () => void): void };
function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
}
const card = { activity: 'run' as const, distanceKm: '5,2', clockLabel: '30:00', paceLabel: '5:46' };

Deno.test('2026 share: net gain comes from the authoritative delta, never the loop area', () => {
  const result = buildShareFacts2026({ card, territory2026: { status: 'published', loopAreaM2: 240_000, newTerrainM2: 180_000 } }, 'fr');
  equal(result.gain, '0,18 km²');
  equal(result.caption.includes('0,24'), false);
});

Deno.test('2026 share: missing, private, pending and non-finite areas never become a gain', () => {
  equal(buildShareFacts2026({ card }, 'fr').gain, null);
  for (const status of ['private', 'pending', 'no_loop'] as const) {
    equal(buildShareFacts2026({ card, territory2026: { status, loopAreaM2: 240_000, newTerrainM2: 180_000 } }, 'fr').gain, null);
  }
  for (const newTerrainM2 of [null, 0, -1, Infinity, NaN]) {
    equal(buildShareFacts2026({ card, territory2026: { status: 'scheduled', loopAreaM2: 240_000, newTerrainM2 } }, 'fr').gain, null);
  }
});

Deno.test('2026 share: bike identity survives export, empty stats stay absent', () => {
  const bike = buildShareFacts2026({ card: { ...card, activity: 'bike' } }, 'en');
  equal(bike.sport, 'BIKE RIDE');
  equal(bike.caption.includes('RUN'), false);
  const empty = buildShareFacts2026({ card: { ...card, distanceKm: '', clockLabel: '' } }, 'fr');
  equal(empty.distance, null);
  equal(empty.duration, null);
  equal(empty.caption, 'COURSE À PIED · GRYD');
});

Deno.test('2026 share: a selected photo is required; an unavailable video never enables export', () => {
  equal(shareFamilyCapability2026('map', false), 'ready');
  equal(shareFamilyCapability2026('sticker', false), 'ready');
  equal(shareFamilyCapability2026('photo', false), 'choose_photo');
  equal(shareFamilyCapability2026('photo', true), 'ready');
  equal(shareFamilyCapability2026('film', true), 'film_not_available');
  equal(shareFamilyCapability2026('film', false, true), 'ready');
});

Deno.test('2026 share: cycling speed is calculated, never relabelled from running pace', () => {
  const bike = buildShareFacts2026({ card: { ...card, activity: 'bike', distanceKm: '20', clockLabel: '1:00:00', paceLabel: '3:00' } }, 'fr');
  equal(bike.rate, '20 km/h');
  equal(bike.rateLabel, 'VITESSE');
  equal(buildShareFacts2026({ card }, 'fr').rate, '5:46 /km');
  for (const clockLabel of ['', 'abc', '1:70', '-1:00']) equal(buildShareFacts2026({ card: { ...card, clockLabel } }, 'fr').rate, null);
  equal(buildShareFacts2026({ card: { ...card, distanceKm: '0' } }, 'fr').rate, null);
});

Deno.test('2026 share: every density renders real 1080px output without capture resampling', () => {
  for (const density of [1, 2, 3, 3.5]) for (const format of ['story', 'portrait', 'square'] as const) {
    const layout = exportLayout2026(format, density);
    equal(layout.widthPt * density, 1080);
    equal(Math.round(layout.heightPt * density), format === 'story' ? 1920 : format === 'portrait' ? 1350 : 1080);
  }
});

// ─── CONTEXTE DE L'AFFICHE (10/09/2026, lot « partager facilement ») ─────────

Deno.test('2026 share: la date de l’affiche ne porte QUE le jour, le mois et l’année', () => {
  // Publier une heure à côté d'un tracé publie une HABITUDE, et une habitude se
  // suit aussi bien qu'une adresse. Ce test ne relit pas la source (c'est le
  // travail de quickSharePrivacy2026) : il regarde la valeur produite.
  const facts = buildShareFacts2026({ card, startedAt: '2026-09-10T07:12:34.000Z' }, 'fr');
  equal(/\d/.test(facts.date ?? ''), true);
  equal(/\d{1,2}:\d{2}/.test(facts.date ?? ''), false);
  equal(facts.date?.includes('2026'), true);
});

Deno.test('2026 share: une date illisible ne devient pas une date inventée', () => {
  // `Date.parse('')` vaut NaN, et un `undefined` d'appelant distrait aussi.
  for (const startedAt of ['', 'hier', 'NaN', undefined, null]) {
    equal(buildShareFacts2026({ card, startedAt }, 'fr').date, null);
  }
  equal(buildShareFacts2026({ card }, 'fr').context, null);
});

Deno.test('2026 share: le dénivelé n’apparaît que s’il a été MESURÉ et non nul', () => {
  // ÉTAPE 0 : un `0` ferait passer une côte non mesurée pour une sortie plate.
  // Les sorties archivées avant `RunPoint.alt` (10/09/2026) n'ont pas
  // d'altitude : `elevationFrom` rend `available: false`, l'appelant passe
  // `null`, et l'affiche n'a pas de colonne « dénivelé ».
  for (const elevationGainM of [0, -12, Number.NaN, Number.POSITIVE_INFINITY, null, undefined]) {
    equal(buildShareFacts2026({ card, elevationGainM }, 'fr').elevation, null);
  }
  equal(buildShareFacts2026({ card, elevationGainM: 124.6 }, 'fr').elevation, '125 m');
  equal(buildShareFacts2026({ card, elevationGainM: 124.6 }, 'en').elevation, '125 m');
});

Deno.test('2026 share: la ligne de contexte se compose de ce qui est CONNU, sans séparateur orphelin', () => {
  // Une commune sans date (ou l'inverse) ne doit pas produire « Rouen · » ni
  // « · 10 sept. 2026 » : le point médian ne s'écrit qu'entre deux valeurs.
  const both = buildShareFacts2026({ card, place: 'Rouen', startedAt: '2026-09-10T09:00:00.000Z' }, 'fr');
  equal(both.context, `Rouen · ${both.date}`);
  equal(buildShareFacts2026({ card, place: 'Rouen' }, 'fr').context, 'Rouen');
  equal(buildShareFacts2026({ card, place: '   ', startedAt: '2026-09-10T09:00:00.000Z' }, 'fr').context,
    buildShareFacts2026({ card, startedAt: '2026-09-10T09:00:00.000Z' }, 'fr').date);
  equal(buildShareFacts2026({ card, place: '  ' }, 'fr').place, null);
});

Deno.test('2026 share: le contexte ne s’invite PAS dans la légende texte', () => {
  // La légende part en clair dans un message ; y ajouter la commune ferait
  // fuiter par le texte ce que l'image protège par le masquage.
  const facts = buildShareFacts2026({ card, place: 'Rouen', startedAt: '2026-09-10T09:00:00.000Z' }, 'fr');
  equal(facts.caption.includes('Rouen'), false);
  equal(facts.caption.includes('2026'), false);
});
