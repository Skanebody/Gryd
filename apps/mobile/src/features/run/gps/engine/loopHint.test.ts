/**
 * GRYD — tests du guidage live de boucle (D4). Verrouille : l'honnêteté des
 * seuils (rien avant LOOP_MIN_PERIMETER_M, « prête » sous la tolérance SERVEUR
 * — jamais des seuils client inventés), le silence hors conquête, et l'écart
 * vol d'oiseau mesuré sur la vraie géodésie (pas un delta de degrés).
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { LOOP_CLOSE_TOLERANCE_M, LOOP_MIN_PERIMETER_M } from '@klaim/shared';
import { farthestGapM, loopGapM, loopHint, roundLoopM } from './loopHint.ts';

// République (départ) et un point ~500 m à l'est le long du même parallèle.
const START = { lat: 48.8674, lng: 2.3636 };
const AWAY_500M = { lat: 48.8674, lng: 2.3704 };

Deno.test('loopGapM : géodésie réelle (≈500 m à Paris), null si trace vide/1 point', () => {
  const gap = loopGapM([START, AWAY_500M]);
  assert(gap !== null && Math.abs(gap - 500) < 15, `gap ${gap} ≉ 500 m`);
  assertEquals(loopGapM([]), null);
  assertEquals(loopGapM([START]), null);
});

Deno.test('loopHint : silencieux hors conquête et avant le périmètre minimal', () => {
  assertEquals(loopHint({ conquest: false, distanceM: 5_000, gapM: 40 }), null);
  assertEquals(loopHint({ conquest: true, distanceM: 5_000, gapM: null }), null);
  // À 1 m sous le périmètre minimal : encore rien (pas de bruit au départ).
  assertEquals(
    loopHint({ conquest: true, distanceM: LOOP_MIN_PERIMETER_M - 1, gapM: 40 }),
    null,
  );
});

Deno.test('loopHint : « prête » EXACTEMENT sous la tolérance serveur, « retour » au-delà', () => {
  const base = { conquest: true, distanceM: LOOP_MIN_PERIMETER_M };
  assertEquals(loopHint({ ...base, gapM: LOOP_CLOSE_TOLERANCE_M }), { kind: 'ready' });
  assertEquals(loopHint({ ...base, gapM: LOOP_CLOSE_TOLERANCE_M + 1 }), {
    kind: 'closing',
    gapM: LOOP_CLOSE_TOLERANCE_M + 1,
  });
});

Deno.test('farthestGapM : le point le PLUS ÉLOIGNÉ atteint, pas le dernier', () => {
  // Aller à 500 m puis retour au départ : l'éloignement maximal reste 500 m.
  const trace = [START, AWAY_500M, START];
  const far = farthestGapM(trace);
  assert(far !== null && Math.abs(far - 500) < 15, `far ${far} ≉ 500 m`);
  // Alors que l'écart COURANT, lui, est retombé à 0.
  assertEquals(loopGapM(trace), 0);
  assertEquals(farthestGapM([]), null);
  assertEquals(farthestGapM([START]), null);
});

Deno.test('roundLoopM : arrondi lisible 10 m, plancher 10 (jamais « retour 0 m »)', () => {
  assertEquals(roundLoopM(324), 320);
  assertEquals(roundLoopM(325), 330);
  assertEquals(roundLoopM(3), 10);
});
