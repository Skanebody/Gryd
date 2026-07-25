/**
 * GRYD — verrou de la numérotation des scènes de la visite guidée.
 *
 * POURQUOI CE TEST EXISTE. La visite est déjà passée de 6 à 8 scènes en cours de
 * route. Le jour où elle en aura dix, le formatage à la main aurait affiché
 * « 010 » — une régression silencieuse, invisible tant qu'on ne dépasse pas neuf.
 * Le test fixe le comportement AU-DELÀ de la taille actuelle de la liste.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { sceneStepLabel } from './sceneStep.ts';

Deno.test('index 0-based → rang affiché sur deux chiffres', () => {
  assertEquals(sceneStepLabel(0), '01');
  assertEquals(sceneStepLabel(7), '08'); // la 8ᵉ scène d'aujourd'hui
  assertEquals(sceneStepLabel(8), '09');
});

Deno.test('au-delà de neuf scènes : plus de zéro parasite', () => {
  assertEquals(sceneStepLabel(9), '10');
  assertEquals(sceneStepLabel(11), '12');
  assertEquals(sceneStepLabel(99), '100');
});

Deno.test('un index qui n’est pas un rang n’imprime RIEN (jamais « 0NaN »)', () => {
  assertEquals(sceneStepLabel(-1), null);
  assertEquals(sceneStepLabel(Number.NaN), null);
  assertEquals(sceneStepLabel(Number.POSITIVE_INFINITY), null);
});
