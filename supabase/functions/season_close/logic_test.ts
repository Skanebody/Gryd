/**
 * Tests season_close/logic.ts — SPEC §3.6, règlement §1 (phases), §13
 * (égalités en cascade), §15 (badges). Purs, aucun réseau.
 */
import { assertEquals } from 'jsr:@std/assert@^1';
import { INTERSEASON_DAYS } from '../_shared/game-rules.ts';
import {
  computeFinalRanks,
  FOUNDER_BADGE_KEY,
  founderBadges,
  LOCAL_TOP1_BADGE_KEY,
  resetPlan,
  type SeasonScoreInput,
} from './logic.ts';

const MS_H = 3_600_000;
const MS_D = 86_400_000;

function score(userId: string, over: Partial<SeasonScoreInput> = {}): SeasonScoreInput {
  return {
    userId,
    points: 100,
    validRuns: 10,
    activeDays: 8,
    defendedHexes: 5,
    firstCaptureAt: new Date('2026-05-01T10:00:00Z'),
    ...over,
  };
}

// ─── computeFinalRanks : cascade d'égalités §13 ──────────────────────────────

Deno.test('classement par points décroissants, rangs 1..n', () => {
  const r = computeFinalRanks([
    score('c', { points: 50 }),
    score('a', { points: 300 }),
    score('b', { points: 100 }),
  ]);
  assertEquals(r.map((x) => [x.userId, x.rank]), [['a', 1], ['b', 2], ['c', 3]]);
  assertEquals(r.every((x) => !x.tied), true);
});

Deno.test('égalité de points → départage §13.1 : courses valides', () => {
  const r = computeFinalRanks([
    score('a', { validRuns: 12 }),
    score('b', { validRuns: 20 }),
  ]);
  assertEquals(r.map((x) => x.userId), ['b', 'a']);
  assertEquals(r.map((x) => x.rank), [1, 2]);
});

Deno.test('égalité points + courses → §13.2 : jours actifs', () => {
  const r = computeFinalRanks([
    score('a', { activeDays: 9 }),
    score('b', { activeDays: 14 }),
  ]);
  assertEquals(r.map((x) => x.userId), ['b', 'a']);
});

Deno.test('égalité jusqu’aux jours actifs → §13.3 : hexes défendus', () => {
  const r = computeFinalRanks([
    score('a', { defendedHexes: 3 }),
    score('b', { defendedHexes: 40 }),
  ]);
  assertEquals(r.map((x) => x.userId), ['b', 'a']);
});

Deno.test('égalité jusqu’aux défenses → §13.5 : 1re capture la plus ancienne devant', () => {
  const r = computeFinalRanks([
    score('late', { firstCaptureAt: new Date('2026-06-01T00:00:00Z') }),
    score('early', { firstCaptureAt: new Date('2026-05-01T00:00:00Z') }),
  ]);
  assertEquals(r.map((x) => x.userId), ['early', 'late']);
});

Deno.test('jamais capturé (firstCaptureAt null) → derrière toute capture', () => {
  const r = computeFinalRanks([
    score('never', { firstCaptureAt: null }),
    score('once', { firstCaptureAt: new Date('2026-06-20T00:00:00Z') }),
  ]);
  assertEquals(r.map((x) => x.userId), ['once', 'never']);
});

Deno.test('égalité parfaite → §13.6 égalité assumée : rang partagé, suivant saute (1,1,3)', () => {
  const r = computeFinalRanks([
    score('a'),
    score('b'),
    score('c', { points: 10 }),
  ]);
  const byUser = Object.fromEntries(r.map((x) => [x.userId, x]));
  assertEquals(byUser.a.rank, 1);
  assertEquals(byUser.b.rank, 1);
  assertEquals(byUser.a.tied, true);
  assertEquals(byUser.b.tied, true);
  assertEquals(byUser.c.rank, 3); // rang compétition : le 2 est sauté
  assertEquals(byUser.c.tied, false);
});

Deno.test('cascade complète : chaque critère ne joue que si les précédents sont égaux', () => {
  // b a moins de courses mais plus de jours actifs : les courses priment.
  const r = computeFinalRanks([
    score('a', { validRuns: 10, activeDays: 20 }),
    score('b', { validRuns: 11, activeDays: 5 }),
  ]);
  assertEquals(r.map((x) => x.userId), ['b', 'a']);
});

// ─── founderBadges (§15, catalogue V2 : famille Season Rank) ─────────────────

Deno.test('Fondateur + médailles Season Rank cumulatives ; legend au vainqueur unique', () => {
  const ranked = computeFinalRanks([
    score('a', { points: 300 }),
    score('b', { points: 100 }),
  ]);
  const awards = founderBadges(ranked);
  // a = n°1 non ex æquo (top100/50/10/3/#1 + legend) + fondateur.
  assertEquals(awards.filter((x) => x.userId === 'a').map((x) => x.badgeKey), [
    FOUNDER_BADGE_KEY,
    'season_rank_1',
    'season_rank_2',
    'season_rank_3',
    'season_rank_4',
    'season_rank_5',
    'season_rank_legend',
  ]);
  // b = rang 2 (top100/50/10/3, PAS #1) + fondateur, pas de legend.
  assertEquals(awards.filter((x) => x.userId === 'b').map((x) => x.badgeKey), [
    FOUNDER_BADGE_KEY,
    'season_rank_1',
    'season_rank_2',
    'season_rank_3',
    'season_rank_4',
  ]);
  assertEquals(LOCAL_TOP1_BADGE_KEY, 'season_rank_5'); // compat clé V2
});

Deno.test('0 point = pas de badge ; n°1 ex æquo = titre #1 partagé SANS legend', () => {
  const ranked = computeFinalRanks([
    score('a'),
    score('b'),
    score('ghost', { points: 0 }),
  ]);
  const awards = founderBadges(ranked);
  assertEquals(awards.filter((x) => x.userId === 'ghost'), []);
  // a et b sont #1 ex æquo → tous deux season_rank_5, aucun legend.
  assertEquals(
    awards.filter((x) => x.badgeKey === 'season_rank_5').map((x) => x.userId).sort(),
    ['a', 'b'],
  );
  assertEquals(awards.filter((x) => x.badgeKey === 'season_rank_legend'), []);
});

Deno.test('rang > 100 : Fondateur seul, aucune médaille Season Rank', () => {
  // 101 joueurs à points strictement décroissants → le dernier est rang 101.
  const scores = Array.from({ length: 101 }, (_, i) => score(`u${i}`, { points: 1000 - i }));
  const awards = founderBadges(computeFinalRanks(scores));
  const last = awards.filter((x) => x.userId === 'u100');
  assertEquals(last.map((x) => x.badgeKey), [FOUNDER_BADGE_KEY]);
});

// ─── resetPlan (règlement §1) ────────────────────────────────────────────────

Deno.test('resetPlan : gel 24 h → résultats J+1 → reset après INTERSEASON_DAYS', () => {
  const closesAt = new Date('2026-08-30T22:00:00Z');
  const plan = resetPlan(closesAt);
  assertEquals(plan.freezeEndsAt, new Date(closesAt.getTime() + 24 * MS_H));
  assertEquals(plan.resultsAt, new Date(closesAt.getTime() + MS_D));
  assertEquals(
    plan.resetAt,
    new Date(closesAt.getTime() + MS_D + INTERSEASON_DAYS * MS_D),
  );
  assertEquals(INTERSEASON_DAYS, 7); // garde-fou : J+8 au total
});
