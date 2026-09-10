/**
 * GRYD — LA MISE EN FORME DU JOURNAL : ce qu'un chiffre n'a pas le droit de dire.
 *
 * ─── ÉTAPE 0 — le défaut existait ───────────────────────────────────────────
 *  · `fmtDuration` (features/history/format) rend « 95:12 » pour une sortie de
 *    95 minutes : juste, et illisible comme durée de sortie. Le détail affichait
 *    ça sous le libellé « Durée » ;
 *  · une allure de 359,7 s/km s'arrondit en « 5’60 » avec un `padStart` naïf —
 *    une valeur qui n'existe pas ;
 *  · `effortRate` a été écrit parce que le Résultat servait « 2’44/km » à un
 *    cycliste. Le journal doit passer par lui, pas refaire la conversion.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { formatClock, formatKm2, formatMeters, formatPaceShort, formatRate } from './format.ts';

Deno.test('chronomètre — les heures apparaissent, et une non-durée disparaît', () => {
  assertEquals(formatClock(1_902), '31:42');
  assertEquals(formatClock(3_751), '1:02:31');
  assertEquals(formatClock(0), '0:00');
  assertEquals(formatClock(-1), null);
  assertEquals(formatClock(Number.NaN), null);
});

Deno.test('allure — 5’60 n’existe pas', () => {
  assertEquals(formatPaceShort(359.7), '6’00');
  assertEquals(formatPaceShort(328), '5’28');
  assertEquals(formatPaceShort(0), null);
  assertEquals(formatPaceShort(Number.POSITIVE_INFINITY), null);
});

Deno.test('grandeur — le cycliste lit une vitesse, le coureur une allure', () => {
  assertEquals(formatRate('run', 328, ','), { value: '5’28', unit: 'min/km' });
  // 147,7 s/km ⇒ 24,4 km/h, conversion EXACTE de la même mesure.
  assertEquals(formatRate('bike', 147.7, ','), { value: '24,4', unit: 'km/h' });
  assertEquals(formatRate('bike', 147.7, '.'), { value: '24.4', unit: 'km/h' });
  // Allure absente ou nulle : aucune case, jamais un « 0,0 km/h ».
  assertEquals(formatRate('run', null, ','), null);
  assertEquals(formatRate('bike', 0, ','), null);
});

Deno.test('distances — deux décimales, et rien pour une non-mesure', () => {
  assertEquals(formatKm2(8.421, ','), '8,42');
  assertEquals(formatKm2(8.421, '.'), '8.42');
  assertEquals(formatKm2(-2, ','), null);
  assertEquals(formatMeters(639.6), '640');
  assertEquals(formatMeters(Number.NaN), null);
});

declare const Deno: {
  test(nom: string, fn: () => void | Promise<void>): void;
};
