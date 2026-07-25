/**
 * GRYD — l'échéance d'une frontière ouverte ne promet jamais plus que le
 * serveur : arrondi vers le BAS, silence quand elle est passée, illisible ou
 * aberrante. Aucun « NaN h », aucun « encore 0 h ».
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { boundaryClock } from './openBoundaryClock.ts';

const NOW = Date.parse('2026-07-25T12:00:00.000Z');

Deno.test('échéance absente ou illisible → rien (jamais un NaN à l’écran)', () => {
  assertEquals(boundaryClock(undefined, NOW), null);
  assertEquals(boundaryClock('', NOW), null);
  assertEquals(boundaryClock('bientôt', NOW), null);
  assertEquals(boundaryClock('2026-07-25T12:00:00.000Z', Number.NaN), null);
});

Deno.test('échéance PASSÉE → rien (on ne propose pas de refermer une frontière morte)', () => {
  assertEquals(boundaryClock('2026-07-25T11:59:59.000Z', NOW), null);
  assertEquals(boundaryClock('2026-07-24T12:00:00.000Z', NOW), null);
  // Pile à l'instant : c'est fini, pas « encore 0 h ».
  assertEquals(boundaryClock('2026-07-25T12:00:00.000Z', NOW), null);
});

Deno.test('moins d’une heure → « bientôt », jamais « encore 0 h »', () => {
  assertEquals(boundaryClock('2026-07-25T12:00:01.000Z', NOW), { kind: 'soon' });
  assertEquals(boundaryClock('2026-07-25T12:59:59.000Z', NOW), { kind: 'soon' });
});

Deno.test('arrondi vers le BAS : on ne promet pas une heure qu’on n’a pas', () => {
  // 1 h 10 → « encore 1 h » (jamais 2).
  assertEquals(boundaryClock('2026-07-25T13:10:00.000Z', NOW), { kind: 'hours', hours: 1 });
  // 22 h 59 → 22 h.
  assertEquals(boundaryClock('2026-07-26T10:59:00.000Z', NOW), { kind: 'hours', hours: 22 });
  // Exactement 3 h → 3 h.
  assertEquals(boundaryClock('2026-07-25T15:00:00.000Z', NOW), { kind: 'hours', hours: 3 });
});

Deno.test('TTL aberrant (skew d’horloge) → rien plutôt qu’une promesse absurde', () => {
  assertEquals(boundaryClock('2027-07-25T12:00:00.000Z', NOW), null);
});
