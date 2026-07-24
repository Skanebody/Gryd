/**
 * GRYD — le nom d'écran analytique ne doit JAMAIS porter un id/code dynamique.
 * Verrou : chaque route dynamique se rédige en son patron ; les statiques passent.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { normalizeScreenPath } from './screenName.ts';

Deno.test('routes dynamiques rédigées — aucun id/code ne fuit', () => {
  assertEquals(normalizeScreenPath('/c/AB12CD'), '/c/[code]'); // code d'invitation JAMAIS exposé
  assertEquals(normalizeScreenPath('/course/9f3a-uuid'), '/course/[id]');
  assertEquals(normalizeScreenPath('/challenges/consistency_ii'), '/challenges/[id]');
  assertEquals(normalizeScreenPath('/parametres/apropos'), '/parametres/[section]');
});

Deno.test('routes statiques inchangées (y compris les bases des familles dynamiques)', () => {
  assertEquals(normalizeScreenPath('/'), '/');
  assertEquals(normalizeScreenPath('/arsenal'), '/arsenal');
  assertEquals(normalizeScreenPath('/(tabs)'), '/(tabs)');
  assertEquals(normalizeScreenPath('/challenges'), '/challenges'); // l'index n'est pas un [id]
  assertEquals(normalizeScreenPath('/parametres'), '/parametres'); // la liste n'est pas une [section]
});

Deno.test('défensif — vide/query/fragment', () => {
  assertEquals(normalizeScreenPath(null), '/');
  assertEquals(normalizeScreenPath(undefined), '/');
  assertEquals(normalizeScreenPath(''), '/');
  assertEquals(normalizeScreenPath('/c/XYZ?ref=story'), '/c/[code]'); // query jamais lu
  assertEquals(normalizeScreenPath('/arsenal#top'), '/arsenal');
});
