/**
 * GRYD — la date de crédits ne peut ni mentir ni se replier.
 *
 * Ce qui est verrouillé : le format unique `JJ/MM/AAAA` (celui des quatre
 * documents légaux), et le refus de tout ce qui n'est pas un jour réel — c'est
 * ce refus qui garantit qu'aucune page de crédits n'affichera jamais une date
 * inventée ou un « NaN ».
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { formatLegalDay } from './dates.ts';

Deno.test('formatLegalDay : un jour ISO devient la date des documents légaux', () => {
  assertEquals(formatLegalDay('2026-07-23'), '23/07/2026');
  assertEquals(formatLegalDay('2026-01-01'), '01/01/2026');
  assertEquals(formatLegalDay('2024-02-29'), '29/02/2024'); // année bissextile
});

Deno.test('formatLegalDay : les zéros de tête sont CONSERVÉS (jamais « 1/1/2026 »)', () => {
  assertEquals(formatLegalDay('2026-03-05'), '05/03/2026');
});

Deno.test('formatLegalDay : ce qui n’est pas un jour ISO rend null, jamais une date de repli', () => {
  assertEquals(formatLegalDay(''), null);
  assertEquals(formatLegalDay('2026-7-3'), null);
  assertEquals(formatLegalDay('23/07/2026'), null);
  assertEquals(formatLegalDay('2026-07-23T10:00:00Z'), null);
  assertEquals(formatLegalDay('pas une date'), null);
});

Deno.test('formatLegalDay : un jour qui n’existe pas au calendrier rend null', () => {
  assertEquals(formatLegalDay('2026-02-31'), null);
  assertEquals(formatLegalDay('2026-13-01'), null);
  assertEquals(formatLegalDay('2026-00-10'), null);
  assertEquals(formatLegalDay('2025-02-29'), null); // 2025 n'est pas bissextile
});
