/**
 * GRYD — tests de la partition des classements (settings-motivation).
 *
 * Ce qu'ils verrouillent, c'est exactement ce que l'écran affichait de faux :
 *   1. qu'AUCUN niveau ne disparaisse (open + hidden = tous les niveaux, dans
 *      l'ordre) — une omission dans un écran de réglages est un demi-mensonge ;
 *   2. que « masqué » soit une LISTE explicite, jamais un effet de style ;
 *   3. que le mode discret ferme bien le niveau global, quel que soit le style.
 *
 * Deno, aucun mock : on importe le module de prod et les constantes réelles.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { LEADERBOARD_LEVELS, type PlayStyle } from '@klaim/shared';
import { splitLeaderboardLevels } from './leaderboardView.ts';

const STYLES: PlayStyle[] = ['focus_solo', 'mixte', 'crew_war'];

Deno.test('splitLeaderboardLevels : aucun niveau ne se perd, l’ordre canonique est tenu', () => {
  for (const style of STYLES) {
    for (const discreet of [false, true]) {
      const { open, hidden } = splitLeaderboardLevels(style, discreet);
      const merged = LEADERBOARD_LEVELS.filter(
        (l) => open.includes(l) || hidden.includes(l),
      );
      assertEquals(merged.length, LEADERBOARD_LEVELS.length);
      assertEquals(open.length + hidden.length, LEADERBOARD_LEVELS.length);
      // Ordre canonique : chaque moitié suit LEADERBOARD_LEVELS.
      assertEquals(open, LEADERBOARD_LEVELS.filter((l) => open.includes(l)));
      assertEquals(hidden, LEADERBOARD_LEVELS.filter((l) => hidden.includes(l)));
    }
  }
});

Deno.test('splitLeaderboardLevels : un style fermé a une liste MASQUÉE non vide', () => {
  // Focus Solo n'ouvre que personnel + crew : le reste doit être NOMMÉ masqué,
  // pas simplement atténué à l'écran.
  const { open, hidden } = splitLeaderboardLevels('focus_solo', false);
  assertEquals(open, ['personnel', 'crew']);
  assertEquals(hidden.length > 0, true);
  assertEquals(hidden.includes('global'), true);
});

Deno.test('splitLeaderboardLevels : le mode discret ferme le global pour tous les styles', () => {
  for (const style of STYLES) {
    const { open, hidden } = splitLeaderboardLevels(style, true);
    assertEquals(open.includes('global'), false);
    assertEquals(hidden.includes('global'), true);
  }
});
