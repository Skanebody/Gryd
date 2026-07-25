/**
 * GRYD — la séquence narrative du Résultat (E09) tient le budget de la planche
 * (< 1,8 s), garde l'ordre imposé, et le SKIP mène EXACTEMENT au même état final
 * que reduce motion (aucune information portée par la seule animation).
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  REVEAL_BUDGET_MS,
  REVEAL_LAST_STEP,
  REVEAL_STEPS,
  revealDelaysMs,
  revealReached,
  revealStepAt,
  revealTotalMs,
} from './revealSequence.ts';

Deno.test('ordre de la planche : hero → zone → chiffre → progression → partage', () => {
  assertEquals([...REVEAL_STEPS], ['hero', 'zone', 'chiffre', 'progression', 'partage']);
});

Deno.test('budget < 1,8 s tenu pour la base réelle du projet (motion.transitionMs = 225)', () => {
  assert(revealTotalMs(225) < REVEAL_BUDGET_MS, `${revealTotalMs(225)} ms`);
});

Deno.test('budget tenu même pour une base absurde (la borne protège la planche)', () => {
  for (const base of [1, 60, 225, 400, 5_000, 100_000]) {
    assert(
      revealTotalMs(base) < REVEAL_BUDGET_MS,
      `base ${base} → ${revealTotalMs(base)} ms dépasse le budget`,
    );
  }
});

Deno.test('entrées aberrantes (0, négatif, NaN) → séquence valide, jamais un NaN à l’écran', () => {
  for (const base of [0, -10, Number.NaN]) {
    const d = revealDelaysMs(base);
    assertEquals(d.length, REVEAL_STEPS.length);
    for (const v of d) assert(Number.isFinite(v) && v >= 0);
  }
});

Deno.test('délais strictement croissants : aucun temps ne double un autre', () => {
  const d = revealDelaysMs(225);
  assertEquals(d[0], 0, 'le hero est immédiat (aucun écran vide au montage)');
  for (let i = 1; i < d.length; i += 1) {
    assert((d[i] ?? 0) > (d[i - 1] ?? 0), `délai ${i} non croissant`);
  }
});

Deno.test('le temps atteint suit l’horloge, et sature au dernier', () => {
  const base = 225;
  assertEquals(revealStepAt(0, base), 0);
  assertEquals(revealStepAt(224, base), 0);
  assertEquals(revealStepAt(225, base), 1);
  assertEquals(revealStepAt(700, base), 3);
  assertEquals(revealStepAt(1_000, base), REVEAL_LAST_STEP);
  assertEquals(revealStepAt(50_000, base), REVEAL_LAST_STEP);
});

Deno.test('SKIP = état final : tout est atteint, exactement comme reduce motion', () => {
  for (const s of REVEAL_STEPS) {
    assertEquals(revealReached(REVEAL_LAST_STEP, s), true, s);
  }
  // Et au premier temps, seul le hero est là (le reste n'est pas encore monté).
  assertEquals(revealReached(0, 'hero'), true);
  assertEquals(revealReached(0, 'partage'), false);
});

Deno.test('le CTA PARTAGER est le DERNIER temps (planche : « PARTAGER actif » en fin)', () => {
  assertEquals(REVEAL_STEPS[REVEAL_LAST_STEP], 'partage');
});
