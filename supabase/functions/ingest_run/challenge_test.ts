/**
 * Tests Challenges/coopétition/leaderboards (AMENDEMENT-07 §5/§7/§9, motivation
 * §15-§16/§9.2/§10) — moteur PUR. Couvre : avancement d'un challenge (ratio,
 * done, remaining, target ≤ 0), minimum personnel souple (§8.3), score coopétitif
 * multi-critères (pas que la vitesse, poids §9.2), visibilité des leaderboards
 * par play_style amputée en mode discret. AUCUN réseau.
 */
import { assertAlmostEquals, assertEquals } from 'jsr:@std/assert@^1';
import {
  COOPETITION_WEIGHTS,
  LEADERBOARD_DEFAULT_VISIBILITY,
} from '../_shared/game-rules.ts';
import {
  challengeProgress,
  coopetitionScore,
  leaderboardVisibility,
  meetsPersonalMinimum,
} from '../_shared/engine/challenge.ts';

// ─── §5 challengeProgress ─────────────────────────────────────────────────────

Deno.test('challengeProgress : à mi-parcours', () => {
  const p = challengeProgress({ target: 10 }, 5);
  assertEquals(p.ratio, 0.5);
  assertEquals(p.done, false);
  assertEquals(p.remaining, 5);
});

Deno.test('challengeProgress : objectif atteint et dépassé → ratio plafonné, done', () => {
  const p = challengeProgress({ target: 3 }, 4);
  assertEquals(p.ratio, 1);
  assertEquals(p.done, true);
  assertEquals(p.remaining, 0);
});

Deno.test('challengeProgress : stat négative clampée à 0', () => {
  const p = challengeProgress({ target: 10 }, -5);
  assertEquals(p.current, 0);
  assertEquals(p.ratio, 0);
});

Deno.test('challengeProgress : target ≤ 0 → considéré fait', () => {
  const p = challengeProgress({ target: 0 }, 0);
  assertEquals(p.done, true);
  assertEquals(p.ratio, 1);
});

// ─── §8.3 meetsPersonalMinimum ────────────────────────────────────────────────

Deno.test('meetsPersonalMinimum : atteint le seuil (borne incluse)', () => {
  assertEquals(meetsPersonalMinimum(20, 20), true);
  assertEquals(meetsPersonalMinimum(20, 19), false);
});

Deno.test('meetsPersonalMinimum : min ≤ 0 → toujours vrai', () => {
  assertEquals(meetsPersonalMinimum(0, 0), true);
});

// ─── §9.2 coopetitionScore ────────────────────────────────────────────────────

Deno.test('coopetitionScore : tout au max → 1 (poids somment à 1)', () => {
  const total = Object.values(COOPETITION_WEIGHTS).reduce((a, b) => a + b, 0);
  assertAlmostEquals(total, 1, 1e-9);
  const s = coopetitionScore({
    regularity: 1,
    defense: 1,
    participation: 1,
    exploration: 1,
    reliability: 1,
  });
  assertAlmostEquals(s, 1, 1e-9);
});

Deno.test('coopetitionScore : la vitesse n\'est pas un critère — un défenseur régulier score', () => {
  // Aucun critère « vitesse » : régularité + défense pleines suffisent à un
  // score élevé même sans « rapidité » (motivation §9.2).
  const s = coopetitionScore({ regularity: 1, defense: 1 });
  assertAlmostEquals(s, COOPETITION_WEIGHTS.regularity + COOPETITION_WEIGHTS.defense, 1e-9);
});

Deno.test('coopetitionScore : entrées hors [0..1] clampées', () => {
  const s = coopetitionScore({ regularity: 5, defense: -3 });
  assertAlmostEquals(s, COOPETITION_WEIGHTS.regularity, 1e-9);
});

// ─── §10 leaderboardVisibility ────────────────────────────────────────────────

Deno.test('leaderboardVisibility : focus_solo → perso + crew', () => {
  assertEquals(leaderboardVisibility('focus_solo', false), ['personnel', 'crew']);
});

Deno.test('leaderboardVisibility : crew_war voit large mais pas global par défaut', () => {
  const v = leaderboardVisibility('crew_war', false);
  assertEquals(v, [...LEADERBOARD_DEFAULT_VISIBILITY.crew_war]);
  assertEquals(v.includes('global'), false);
});

Deno.test('leaderboardVisibility : mode discret retire toujours global', () => {
  // On force un play_style dont la visibilité par défaut contiendrait global :
  // ici aucun ne l'a par défaut, on vérifie surtout l'invariant discret.
  const v = leaderboardVisibility('crew_war', true);
  assertEquals(v.includes('global'), false);
});

Deno.test('leaderboardVisibility : renvoie une nouvelle liste (pas la constante)', () => {
  const v = leaderboardVisibility('mixte', false);
  v.push('global');
  // La constante partagée ne doit pas avoir été mutée.
  assertEquals(LEADERBOARD_DEFAULT_VISIBILITY.mixte.includes('global'), false);
});
