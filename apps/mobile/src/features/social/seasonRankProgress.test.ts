/**
 * GRYD — la progression locale (§12.2/§19.2) ne se lit QUE sur des lignes réelles,
 * et jamais un rang/écart inventé quand ma ligne n'a pas été lue.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { seasonRankProgress } from './league.ts';

const row = (rank: number, value: number, me = false) => ({ rank, name: `J${rank}`, value, me });

Deno.test('non classé / hors des lignes lues → null (aucun rang inventé)', () => {
  assertEquals(seasonRankProgress([]), null);
  assertEquals(seasonRankProgress([row(1, 100), row(2, 90)]), null); // aucune ligne `me`
});

Deno.test('1er → rang 1, pas d’écart (rien devant)', () => {
  assertEquals(seasonRankProgress([row(1, 100, true), row(2, 90)]), { rank: 1, deltaToNext: null });
});

Deno.test('écart réel vers la place au-dessus', () => {
  const rows = [row(1, 100), row(2, 90), row(3, 70, true)];
  assertEquals(seasonRankProgress(rows), { rank: 3, deltaToNext: 20 }); // 90 - 70
});

Deno.test('ligne #N-1 absente des lignes lues → delta null (pas d’invention)', () => {
  // je suis #40 mais seules les lignes autour de moi manquent celle du dessus
  const rows = [row(1, 100), row(40, 10, true)];
  assertEquals(seasonRankProgress(rows), { rank: 40, deltaToNext: null });
});
