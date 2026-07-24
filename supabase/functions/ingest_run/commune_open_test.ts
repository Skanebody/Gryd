/**
 * GRYD — ouvrir une commune par la présence : ce que le pur et l'adaptateur
 * garantissent.
 *
 * Ce que ces tests protègent, dans l'ordre de gravité :
 *  1. un contour ILLISIBLE ou une panne réseau ne produit JAMAIS de zone —
 *     `reverseGeocodeCommune` rend `undefined`, l'appelant diffère (l'app ne ment
 *     jamais : contour réel ou rien, jamais un disque fabriqué) ;
 *  2. la simplification GARDE une géométrie valide (anneau fermé, ≥ 4 points) et
 *     ne dégénère jamais un contour en le « nettoyant » ;
 *  3. l'identifiant de commune est stable et sans collision (« insee-<code> »).
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  communeCityId,
  douglasPeucker,
  reverseGeocodeCommune,
  shouldAutoOpenCommune,
  simplifyGeometry,
  simplifyRing,
  type FetchLike,
} from './commune_open.ts';

const GOLDEN = {
  hasCityZone: false,
  validationKind: 'claimable',
  runMode: 'conquete',
  source: 'gps',
  pointCount: 12,
} as const;

Deno.test('shouldAutoOpenCommune : le chemin doré ouvre, chaque écart FERME', () => {
  assert(shouldAutoOpenCommune(GOLDEN), 'course claimable GPS conquête hors zone → ouvre');
  // Une seule condition qui tombe suffit à ne PAS ouvrir :
  assert(!shouldAutoOpenCommune({ ...GOLDEN, hasCityZone: true }), 'déjà dans une zone');
  assert(!shouldAutoOpenCommune({ ...GOLDEN, validationKind: 'rejected' }), 'course refusée');
  assert(!shouldAutoOpenCommune({ ...GOLDEN, validationKind: 'flagged' }), 'course suspecte');
  assert(!shouldAutoOpenCommune({ ...GOLDEN, runMode: 'course_privee' }), 'course privée');
  assert(!shouldAutoOpenCommune({ ...GOLDEN, runMode: 'social_run' }), 'social run');
  assert(!shouldAutoOpenCommune({ ...GOLDEN, source: 'gpx' }), 'import GPX (falsifiable)');
  assert(!shouldAutoOpenCommune({ ...GOLDEN, source: 'healthkit' }), 'import santé (falsifiable)');
  assert(!shouldAutoOpenCommune({ ...GOLDEN, pointCount: 0 }), 'aucun point de départ');
});

Deno.test('communeCityId : préfixe stable, code INSEE en texte', () => {
  assertEquals(communeCityId('01001'), 'insee-01001');
  assertEquals(communeCityId('2A004'), 'insee-2A004');
  // Aucune collision avec un geonameid EU ni un starter.
  assert(communeCityId('75056') !== 'paris');
  assert(!communeCityId('75056').match(/^\d+$/));
});

Deno.test('douglasPeucker : les sommets colinéaires superflus disparaissent', () => {
  // Ligne droite densément échantillonnée : seuls les extrémités restent.
  const line: [number, number][] = [
    [0, 0],
    [1, 0.0000001],
    [2, 0],
    [3, 0.0000001],
    [4, 0],
  ];
  const out = douglasPeucker(line, 0.0003);
  assertEquals(out, [
    [0, 0],
    [4, 0],
  ]);
});

Deno.test('douglasPeucker : un vrai coin est CONSERVÉ (on ne détruit pas la forme)', () => {
  const corner: [number, number][] = [
    [0, 0],
    [1, 1], // écart >> tolérance : ce sommet compte
    [2, 0],
  ];
  const out = douglasPeucker(corner, 0.0003);
  assertEquals(out.length, 3);
});

Deno.test('simplifyRing : reste FERMÉ et valide (≥ 4 points), jamais dégénéré', () => {
  // Carré avec des points intermédiaires colinéaires superflus.
  const ring: [number, number][] = [
    [0, 0],
    [0.5, 0.0000001],
    [1, 0],
    [1, 1],
    [0, 1],
    [0, 0],
  ];
  const out = simplifyRing(ring, 0.0003);
  assert(out.length >= 4, `anneau trop court : ${out.length}`);
  assertEquals(out[0], out[out.length - 1], 'anneau non refermé');
  assert(out.length < ring.length, 'aucune simplification');

  // Anneau déjà minimal (triangle fermé) : rendu tel quel, jamais cassé.
  const tri: [number, number][] = [
    [0, 0],
    [1, 0],
    [0, 1],
    [0, 0],
  ];
  const triOut = simplifyRing(tri, 0.0003);
  assertEquals(triOut[0], triOut[triOut.length - 1]);
  assert(triOut.length >= 4);
});

Deno.test('simplifyGeometry : Polygon et MultiPolygon acceptés, le reste rejeté', () => {
  const poly = {
    type: 'Polygon',
    coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
  };
  const s = simplifyGeometry(poly);
  assertEquals(s?.type, 'Polygon');

  const multi = {
    type: 'MultiPolygon',
    coordinates: [[[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]],
  };
  assertEquals(simplifyGeometry(multi)?.type, 'MultiPolygon');

  // Formes qu'on n'écrit PAS (on ne stocke que ce qu'on comprend).
  assertEquals(simplifyGeometry(null), undefined);
  assertEquals(simplifyGeometry({ type: 'Point', coordinates: [0, 0] }), undefined);
  assertEquals(simplifyGeometry({ type: 'Polygon', coordinates: [[[0, 0]]] }), undefined);
  assertEquals(simplifyGeometry('nope'), undefined);
});

// ─── Adaptateur réseau : best-effort strict ──────────────────────────────────
const okResponse = (payload: unknown): FetchLike => () =>
  Promise.resolve({ ok: true, json: () => Promise.resolve(payload) });

const VALID_BODY = [
  {
    code: '48137',
    nom: 'Saint-Bauzile',
    contour: {
      type: 'Polygon',
      coordinates: [[[3.5, 44.5], [3.6, 44.5], [3.6, 44.6], [3.5, 44.6], [3.5, 44.5]]],
    },
  },
];

Deno.test('reverseGeocodeCommune : un point rural résout une commune réelle', async () => {
  const r = await reverseGeocodeCommune(44.5, 3.5, okResponse(VALID_BODY));
  assertEquals(r?.insee, '48137');
  assertEquals(r?.nom, 'Saint-Bauzile');
  assertEquals(r?.geojson.type, 'Polygon');
});

Deno.test('reverseGeocodeCommune : panne réseau → undefined, JAMAIS un throw', async () => {
  const boom: FetchLike = () => Promise.reject(new Error('network down'));
  assertEquals(await reverseGeocodeCommune(44.5, 3.5, boom), undefined);
});

Deno.test('reverseGeocodeCommune : réponses inexploitables → undefined (on diffère)', async () => {
  const notOk: FetchLike = () => Promise.resolve({ ok: false, json: () => Promise.resolve([]) });
  assertEquals(await reverseGeocodeCommune(44.5, 3.5, notOk), undefined);

  assertEquals(await reverseGeocodeCommune(44.5, 3.5, okResponse([])), undefined);
  assertEquals(
    await reverseGeocodeCommune(44.5, 3.5, okResponse([{ code: '', nom: 'X', contour: {} }])),
    undefined,
  );
  assertEquals(
    await reverseGeocodeCommune(44.5, 3.5, okResponse([{ code: '48137', nom: 'X', contour: null }])),
    undefined,
  );
  // Coordonnées non finies : rejetées avant tout appel.
  assertEquals(await reverseGeocodeCommune(NaN, 3.5, okResponse(VALID_BODY)), undefined);
});
