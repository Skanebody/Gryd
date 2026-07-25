/**
 * GRYD — l'antenne de signal ne ment jamais : le niveau (0-4) vient du GPS Trust
 * / état RÉELS, pas d'une valeur inventée. Verrouille : pas de fix / signal perdu
 * = 0 (ambre) ; un fix exploitable donne toujours ≥ 1 barre ; « weak » reste ambre.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { signalLevel } from './signalLevel.ts';

Deno.test('pas encore de fix → 0 barre, ambre (acquisition, jamais un faux plein)', () => {
  assertEquals(signalLevel(0, 'ok', true), { level: 0, tone: 'weak' });
});

Deno.test('signal perdu → 0 barre, ambre (jamais rouge)', () => {
  assertEquals(signalLevel(80, 'lost', false), { level: 0, tone: 'weak' });
});

Deno.test('bon signal fort → 4 barres neutres', () => {
  assertEquals(signalLevel(100, 'ok', false), { level: 4, tone: 'ok' });
  assertEquals(signalLevel(80, 'ok', false), { level: 4, tone: 'ok' });
});

Deno.test('signal moyen → barres intermédiaires', () => {
  assertEquals(signalLevel(50, 'ok', false), { level: 2, tone: 'ok' });
  assertEquals(signalLevel(30, 'ok', false), { level: 2, tone: 'ok' });
  assertEquals(signalLevel(25, 'ok', false), { level: 1, tone: 'ok' });
});

Deno.test('un fix qui compte donne TOUJOURS au moins 1 barre (jamais 0 trompeur)', () => {
  assertEquals(signalLevel(1, 'ok', false), { level: 1, tone: 'ok' });
});

Deno.test('état « weak » → ambre, même avec du trust', () => {
  assertEquals(signalLevel(60, 'weak', false), { level: 3, tone: 'weak' });
});

Deno.test('trust hors bornes borné (défensif)', () => {
  assertEquals(signalLevel(200, 'ok', false), { level: 4, tone: 'ok' });
  assertEquals(signalLevel(Number.NaN, 'ok', false), { level: 1, tone: 'ok' });
});
