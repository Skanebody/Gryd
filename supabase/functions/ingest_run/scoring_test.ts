/**
 * Tests scoring.ts — formule §23 MULTIPLICATIVE (AMENDEMENT-23 §D) + streak +
 * performance + Foulées + XP + verify. Purs.
 *   points = zones × coeff_action × coeff_contexte × verify × streak × perf.
 */
import { assert, assertAlmostEquals, assertEquals } from 'jsr:@std/assert@^1';
import {
  ACTION_COEFF,
  CONTEXT_COEFF,
  PERFORMANCE_BONUS_CAP,
  PERFORMANCE_BONUS_FLOOR,
  POINTS_BASE_PER_ZONE,
  STREAK_MULTIPLIER_CAP,
  VERIFY_FACTOR_FULL,
  VERIFY_FACTOR_NONE,
  VERIFY_FACTOR_PARTIAL,
  VERIFY_FULL_MIN,
  VERIFY_PARTIAL_MIN,
} from '../_shared/game-rules.ts';
import {
  actionCoeff,
  computeScore,
  contextCoeff,
  distributePointsAdjustment,
  performanceModifier,
  streakMultiplier,
  verifyFactor,
  verifyTier,
  zoneBasePoints,
} from '../_shared/engine/scoring.ts';

// ─── Formule §23 : coefficients d'action ─────────────────────────────────────

Deno.test('coeff action (doc §23) — conquête 1 / reprise 1,3 / défense 1,2 / boucle propre 1,1 / route 0,5', () => {
  assertEquals(actionCoeff('conquest'), 1.0);
  assertEquals(actionCoeff('steal'), 1.3);
  assertEquals(actionCoeff('defense'), 1.2);
  assertEquals(actionCoeff('clean_loop'), 1.1);
  assertEquals(actionCoeff('route'), 0.5);
  // Miroir des constantes gelées.
  assertEquals(ACTION_COEFF.steal, 1.3);
  assertEquals(ACTION_COEFF.route, 0.5);
});

Deno.test('coeff contexte (doc §23) — le PLUS FORT contexte s’applique (jamais de cumul)', () => {
  assertEquals(contextCoeff(), 1); // aucun contexte → neutre
  assertEquals(contextCoeff([]), 1);
  assertEquals(contextCoeff(['crew_mission']), CONTEXT_COEFF.crew_mission); // 1,1
  assertEquals(contextCoeff(['zone_bonus']), CONTEXT_COEFF.zone_bonus); // 1,15
  assertEquals(contextCoeff(['contested']), CONTEXT_COEFF.contested); // 1,2
  // Cumul interdit : on prend le max, pas le produit.
  assertEquals(contextCoeff(['crew_mission', 'contested', 'zone_bonus']), CONTEXT_COEFF.contested);
});

// ─── Formule §23 : points de base par zone ───────────────────────────────────

Deno.test('zoneBasePoints = floor(base × action × contexte) + pionnier', () => {
  assertEquals(POINTS_BASE_PER_ZONE, 10);
  assertEquals(zoneBasePoints('conquest'), 10); // 10 × 1 × 1
  assertEquals(zoneBasePoints('steal'), 13); // 10 × 1,3 × 1
  assertEquals(zoneBasePoints('defense'), 12); // 10 × 1,2 × 1
  assertEquals(zoneBasePoints('clean_loop'), 11); // 10 × 1,1 × 1
  assertEquals(zoneBasePoints('route'), 5); // 10 × 0,5 × 1
  // Contexte contestée : conquête ×1,2 = 12.
  assertEquals(zoneBasePoints('conquest', ['contested']), 12);
  // Reprise contestée : 10 × 1,3 × 1,2 = 15,6 → floor 15.
  assertEquals(zoneBasePoints('steal', ['contested']), 15);
  // Pionnier ADDITIF (première capture) sur la conquête neutre : 10 + 8.
  assertEquals(zoneBasePoints('conquest', [], 8), 18);
  // Pionnier + contexte : floor(10 × 1 × 1,15) + 10 = 11 + 10 = 21.
  assertEquals(zoneBasePoints('conquest', ['zone_bonus'], 10), 21);
});

// ─── Formule §23 : facteur VERIFY (paliers 80/60) ────────────────────────────

Deno.test('verifyFactor — ≥80 plein (1,0), ≥60 partiel (0,5), <60 stats only (0)', () => {
  assertEquals(VERIFY_FULL_MIN, 80);
  assertEquals(VERIFY_PARTIAL_MIN, 60);
  assertEquals(verifyFactor(100), VERIFY_FACTOR_FULL);
  assertEquals(verifyFactor(80), VERIFY_FACTOR_FULL); // borne incluse
  assertEquals(verifyFactor(79), VERIFY_FACTOR_PARTIAL);
  assertEquals(verifyFactor(60), VERIFY_FACTOR_PARTIAL); // borne incluse
  assertEquals(verifyFactor(59), VERIFY_FACTOR_NONE);
  assertEquals(verifyFactor(0), VERIFY_FACTOR_NONE);
  assertEquals(VERIFY_FACTOR_FULL, 1);
  assertEquals(VERIFY_FACTOR_PARTIAL, 0.5);
  assertEquals(VERIFY_FACTOR_NONE, 0);
});

Deno.test('verifyTier — full / partial / stats_only alignés sur verifyFactor', () => {
  assertEquals(verifyTier(90), 'full');
  assertEquals(verifyTier(80), 'full');
  assertEquals(verifyTier(70), 'partial');
  assertEquals(verifyTier(60), 'partial');
  assertEquals(verifyTier(59), 'stats_only');
});

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
  assertEquals(performanceModifier({ dataReliability: 0 }), PERFORMANCE_BONUS_FLOOR);
  assertEquals(
    performanceModifier({ dataReliability: 1, isRegular: true }),
    PERFORMANCE_BONUS_CAP,
  );
  for (const reliability of [-5, 0, 0.25, 0.5, 0.75, 1, 42]) {
    for (const isRegular of [true, false]) {
      const m = performanceModifier({ dataReliability: reliability, isRegular });
      assert(m >= PERFORMANCE_BONUS_FLOOR && m <= PERFORMANCE_BONUS_CAP, `${m} hors bornes`);
    }
  }
});

// ─── computeScore : base × verify × streak × perf, arrondis, Foulées, XP ──────

Deno.test('points = floor(base × verify × streak × perf) — verify défaut 1,0', () => {
  const s = computeScore({ basePoints: 100, streakWeeks: 2, isClub: false });
  assertEquals(s.streakMultiplier, 1.2);
  assertEquals(s.performanceModifier, 1);
  assertEquals(s.verifyFactor, 1); // défaut
  assertEquals(s.points, 120); // 100 × 1 × 1,2 × 1
});

Deno.test('verify partiel (0,5) divise le score par deux AVANT streak/perf', () => {
  const s = computeScore({ basePoints: 100, streakWeeks: 2, isClub: false, verifyFactor: 0.5 });
  assertEquals(s.verifyFactor, 0.5);
  assertEquals(s.points, 60); // 100 × 0,5 × 1,2 × 1
});

Deno.test('verify stats only (0) → 0 point, 0 XP (aucune capture créditée)', () => {
  const s = computeScore({ basePoints: 100, streakWeeks: 9, isClub: true, verifyFactor: 0 });
  assertEquals(s.points, 0);
  assertEquals(s.xp, 0);
  assertEquals(s.foulees, 0);
});

Deno.test('arrondi à l’entier inférieur (jamais au plus proche)', () => {
  // 33 × 1 × 1,1 = 36,3 → 36 ; Foulées : 3,6 → 3.
  const s = computeScore({ basePoints: 33, streakWeeks: 1, isClub: false });
  assertEquals(s.points, 36);
  assertEquals(s.foulees, 3);
});

Deno.test('Foulées : 10 % des points gagnés (×1,5 si Club)', () => {
  const std = computeScore({ basePoints: 100, streakWeeks: 2, isClub: false });
  assertEquals(std.foulees, 12); // floor(120 × 0,1)
  const club = computeScore({ basePoints: 100, streakWeeks: 2, isClub: true });
  assertEquals(club.foulees, 18); // floor(120 × 0,1 × 1,5)
});

Deno.test('streak cap ×1,5 appliqué au score', () => {
  const s = computeScore({ basePoints: 120, streakWeeks: 9, isClub: false });
  assertEquals(s.points, 180); // 120 × 1 × 1,5
});

Deno.test('XP = base × verify (D18) — jamais multiplié par streak/perf', () => {
  const full = computeScore({
    basePoints: 120,
    streakWeeks: 9,
    isClub: true,
    performance: { dataReliability: 1, isRegular: true },
  });
  assertEquals(full.xp, 120); // base × 1, pas 120 × 1,5 × 1,15
  assert(full.points > full.xp);
  // Capture partielle : l'XP suit le verify (une demi-capture vaut demi-XP).
  const partial = computeScore({ basePoints: 120, streakWeeks: 0, isClub: false, verifyFactor: 0.5 });
  assertEquals(partial.xp, 60); // floor(120 × 0,5)
});

Deno.test('perf au plancher : le score peut descendre sous la base', () => {
  const s = computeScore({
    basePoints: 100,
    streakWeeks: 0,
    isClub: false,
    performance: { dataReliability: 0 },
  });
  assertEquals(s.points, 90); // 100 × 1 × 1,0 × 0,9
});

Deno.test('ordre documenté : base × verify × streak × perf (exemple combiné)', () => {
  // base 200, verify 0,5, streak ×1,2 (2 sem), perf plafond 1,15.
  const s = computeScore({
    basePoints: 200,
    streakWeeks: 2,
    isClub: false,
    verifyFactor: 0.5,
    performance: { dataReliability: 1, isRegular: true },
  });
  assertEquals(s.performanceModifier, PERFORMANCE_BONUS_CAP);
  // 200 × 0,5 = 100 ; × 1,2 = 120 ; × 1,15 = 138 → floor 138.
  assertEquals(s.points, 138);
  assertEquals(s.xp, 100); // floor(200 × 0,5)
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

// Sanity : verifyFactor est bien un multiplicateur réel dans [0 ; 1].
Deno.test('verifyFactor borné [0 ; 1]', () => {
  for (const t of [-10, 0, 59, 60, 79, 80, 100, 200]) {
    const f = verifyFactor(t);
    assert(f >= 0 && f <= 1, `${f} hors [0;1]`);
  }
  assertAlmostEquals(verifyFactor(75), 0.5);
});
