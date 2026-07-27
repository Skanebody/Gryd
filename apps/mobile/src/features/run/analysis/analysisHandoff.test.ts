/**
 * GRYD — LE RELAIS NE DOIT RIEN PERDRE EN TRAVERSANT E27.
 *
 * Le test central est le premier : la liste blanche de E27 doit couvrir
 * EXACTEMENT les clés que `courseResultParams` produit. Il est écrit contre la
 * VRAIE fonction de fin de course (pas contre une copie de ses clés) : le jour
 * où quelqu'un ajoutera un paramètre à la fin de course sans l'ajouter ici, ce
 * fichier rougira — au lieu qu'un cycliste relise « COURSE TERMINÉE ».
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { courseResultParams } from '../gps/resultHandoff.ts';
import {
  FINISH_PARAM_KEYS,
  cameFromFinish,
  forwardableParams,
  queuedHintOf,
} from './analysisHandoff.ts';

/** Le relais tel que `RealCourseLive` le pose sur /course/analyse. */
const BIKE_QUEUED = courseResultParams({
  mode: 'conquete',
  activity: 'bike',
  distanceM: 12_345.6,
  durationS: 2_400.4,
  uploadQueued: true,
});

const RUN_SENT = courseResultParams({
  mode: 'conquete',
  activity: 'run',
  distanceM: 5_000,
  durationS: 1_500,
  uploadQueued: false,
});

Deno.test('la liste blanche couvre EXACTEMENT les clés de la fin de course', () => {
  // Toutes les clés produites par E26 doivent être transmissibles…
  for (const key of Object.keys(BIKE_QUEUED)) {
    assert(
      (FINISH_PARAM_KEYS as readonly string[]).includes(key),
      `« ${key} » est produit par courseResultParams mais E27 ne le transmet pas`,
    );
  }
  // …et aucune clé inventée ne doit traîner dans la liste blanche.
  const produced = new Set([...Object.keys(BIKE_QUEUED), ...Object.keys(RUN_SENT)]);
  for (const key of FINISH_PARAM_KEYS) {
    assert(produced.has(key), `« ${key} » est transmis par E27 mais E26 ne le produit jamais`);
  }
});

Deno.test('LA DISCIPLINE SURVIT à la traversée (le défaut historique)', () => {
  assertEquals(forwardableParams(BIKE_QUEUED).activity, 'bike');
  assertEquals(forwardableParams(RUN_SENT).activity, 'run');
});

Deno.test('le relais ressort à l’identique — aucune clé perdue, aucune ajoutée', () => {
  assertEquals(forwardableParams(BIKE_QUEUED), BIKE_QUEUED);
  assertEquals(forwardableParams(RUN_SENT), RUN_SENT);
});

Deno.test('« queued » reste ABSENT quand la sortie est partie (jamais « 0 »)', () => {
  assertEquals('queued' in RUN_SENT, false);
  assertEquals('queued' in forwardableParams(RUN_SENT), false);
  assertEquals(queuedHintOf(RUN_SENT), false);
  assertEquals(queuedHintOf(BIKE_QUEUED), true);
});

Deno.test('un lien profond nu ne prétend pas venir d’une fin de course', () => {
  assertEquals(cameFromFinish({}), false);
  assertEquals(forwardableParams({}), {});
  assertEquals(cameFromFinish(BIKE_QUEUED), true);
});

Deno.test('rien d’étranger ne traverse : E27 n’est pas un relais ouvert', () => {
  const hostile = {
    ...RUN_SENT,
    // Ce qu'un lien profond fabriqué de l'extérieur pourrait tenter de pousser
    // vers l'écran de Résultat, qui lit ses paramètres.
    redirect: 'https://exemple.invalide',
    userId: 'quelqu-un-d-autre',
  };
  assertEquals(forwardableParams(hostile), RUN_SENT);
});

Deno.test('un paramètre répété (?a=1&a=2) prend sa PREMIÈRE valeur', () => {
  assertEquals(forwardableParams({ activity: ['bike', 'run'] }).activity, 'bike');
});

Deno.test('une valeur vide ou absente n’est PAS transmise', () => {
  assertEquals(forwardableParams({ activity: '', mode: undefined, dist: [] }), {});
  assertEquals(cameFromFinish({ activity: '' }), false);
});

Deno.test('« queued » à autre chose que « 1 » n’est pas un oui', () => {
  assertEquals(queuedHintOf({ queued: 'true' }), false);
  assertEquals(queuedHintOf({ queued: '0' }), false);
  assertEquals(queuedHintOf({ queued: '1' }), true);
});
