/**
 * Tests scoring.ts — SPEC §3.4 (streak, Foulées) + AMENDEMENT-02 §3 (performance)
 * + §6 (XP, D18). Purs.
 */
import { assert, assertEquals } from 'jsr:@std/assert@^1';
import {
  PERFORMANCE_BONUS_CAP,
  PERFORMANCE_BONUS_FLOOR,
  STREAK_MULTIPLIER_CAP,
} from '../_shared/game-rules.ts';
import {
  computeScore,
  distributePointsAdjustment,
  performanceModifier,
  streakMultiplier,
} from '../_shared/engine/scoring.ts';

// ─── Streak (§3.4) ───────────────────────────────────────────────────────────

Deno.test('streak : +10 %/semaine consécutive, cap ×1,5', () => {
  assertEquals(streakMultiplier(0), 1);
  assertEquals(streakMultiplier(1), 1.1);
  assertEquals(streakMultiplier(2), 1.2);
  assertEquals(streakMultiplier(5), STREAK_MULTIPLIER_CAP); // 1,5 atteint à 5 semaines
  assertEquals(streakMultiplier(12), STREAK_MULTIPLIER_CAP); // jamais au-delà
  assertEquals(STREAK_MULTIPLIER_CAP, 1.5);
  assertEquals(streakMultiplier(-3), 1); // entrée défensive
});

// ─── Performance (AMENDEMENT-02 §3) ──────────────────────────────────────────

Deno.test('performance : défaut neutre = ×1,0 exactement', () => {
  assertEquals(performanceModifier(), 1);
  assertEquals(performanceModifier({}), 1);
});

Deno.test('performance : toujours bornée à [0,90 ; 1,15]', () => {
  assertEquals(PERFORMANCE_BONUS_FLOOR, 0.9);
  assertEquals(PERFORMANCE_BONUS_CAP, 1.15);
  // Pire cas (données pourries) → plancher, jamais en dessous.
  assertEquals(performanceModifier({ dataReliability: 0 }), PERFORMANCE_BONUS_FLOOR);
  // Meilleur cas (régulier + données parfaites) → plafond, jamais au-dessus.
  assertEquals(
    performanceModifier({ dataReliability: 1, isRegular: true }),
    PERFORMANCE_BONUS_CAP,
  );
  // Entrées hors domaine : clampées, toujours dans les bornes.
  for (const reliability of [-5, 0, 0.25, 0.5, 0.75, 1, 42]) {
    for (const isRegular of [true, false]) {
      const m = performanceModifier({ dataReliability: reliability, isRegular });
      assert(m >= PERFORMANCE_BONUS_FLOOR && m <= PERFORMANCE_BONUS_CAP, `${m} hors bornes`);
    }
  }
});

// ─── computeScore : points, Foulées, XP, arrondis ────────────────────────────

Deno.test('points = floor(bruts × streak × perf)', () => {
  const s = computeScore({ basePoints: 100, streakWeeks: 2, isClub: false });
  assertEquals(s.streakMultiplier, 1.2);
  assertEquals(s.performanceModifier, 1);
  assertEquals(s.points, 120);
});

Deno.test('arrondi à l’entier inférieur (jamais au plus proche)', () => {
  // 33 × 1,1 = 36,3 → 36 ; Foulées : 3,6 → 3.
  const s = computeScore({ basePoints: 33, streakWeeks: 1, isClub: false });
  assertEquals(s.points, 36);
  assertEquals(s.foulees, 3);
});

Deno.test('Foulées : 10 % des points gagnés', () => {
  const s = computeScore({ basePoints: 100, streakWeeks: 2, isClub: false });
  assertEquals(s.foulees, 12); // floor(120 × 0,1)
});

Deno.test('Foulées Club : ×1,5', () => {
  const s = computeScore({ basePoints: 100, streakWeeks: 2, isClub: true });
  assertEquals(s.foulees, 18); // floor(120 × 0,1 × 1,5)
});

Deno.test('streak cap ×1,5 appliqué au score', () => {
  const s = computeScore({ basePoints: 120, streakWeeks: 9, isClub: false });
  assertEquals(s.points, 180); // 120 × 1,5
});

Deno.test('XP = points BRUTS (1:1, D18) — jamais multiplié par streak/perf', () => {
  const s = computeScore({
    basePoints: 120,
    streakWeeks: 9,
    isClub: true,
    performance: { dataReliability: 1, isRegular: true },
  });
  assertEquals(s.xp, 120); // bruts, pas 120 × 1,5 × 1,15
  assert(s.points > s.xp);
});

Deno.test('perf au plancher : le score peut descendre sous les bruts', () => {
  const s = computeScore({
    basePoints: 100,
    streakWeeks: 0,
    isClub: false,
    performance: { dataReliability: 0 },
  });
  assertEquals(s.points, 90); // 100 × 1,0 × 0,9
});

// ─── distributePointsAdjustment (pont scoring → RPC claim_hexes) ─────────────

Deno.test('répartition : bonus ajouté, somme exacte', () => {
  const out = distributePointsAdjustment([10, 15, 3], 34); // +6
  assertEquals(out.reduce((a, b) => a + b, 0), 34);
  assertEquals(out, [16, 15, 3]);
});

Deno.test('répartition : malus retiré sans passer un hex sous 0', () => {
  const out = distributePointsAdjustment([2, 0, 15], 10); // −7
  assertEquals(out.reduce((a, b) => a + b, 0), 10);
  assert(out.every((p) => p >= 0));
});

Deno.test('répartition : délta nul ou liste vide → identité', () => {
  assertEquals(distributePointsAdjustment([5, 5], 10), [5, 5]);
  assertEquals(distributePointsAdjustment([], 0), []);
});
