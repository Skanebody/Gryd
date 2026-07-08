import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  type RunCandidate,
  type RunRecommendationContext,
  finalRecommendationScore,
  personalFitScore,
  recommendRun,
  rankRunCandidates,
} from '../_shared/engine/recommendation.ts';

const ctx: RunRecommendationContext = {
  habitualDistanceKm: 5,
  preferredDurationMin: 30,
  prefersLoop: true,
  fatigueScore: 0.1,
  defendUrgency: 0.8,
  crewObjectiveTitle: 'Défendre République',
};

const defense: RunCandidate = {
  id: 'defense-rep',
  type: 'defense',
  title: 'Défendre République',
  distanceKm: 3.4,
  estimatedDurationMin: 20,
  zonesEstimate: 52,
  pointsEstimate: 520,
  crewPointsEstimate: 258,
  personalFit: 0.86,
  crewImpact: 0.91,
  territoryValue: 0.78,
  friction: 0.18,
  reward: 0.82,
  novelty: 0.4,
};

const longExplore: RunCandidate = {
  id: 'explore-long',
  type: 'exploration',
  title: 'Explorer Canal',
  distanceKm: 12,
  estimatedDurationMin: 70,
  zonesEstimate: 40,
  pointsEstimate: 400,
  personalFit: 0.3,
  crewImpact: 0.2,
  territoryValue: 0.5,
  friction: 0.75,
  reward: 0.55,
  novelty: 0.9,
};

Deno.test('finalRecommendationScore — defense beats high-friction explore', () => {
  assertEquals(finalRecommendationScore(defense) > finalRecommendationScore(longExplore), true);
});

Deno.test('rankRunCandidates — sorted descending', () => {
  const ranked = rankRunCandidates([longExplore, defense]);
  assertEquals(ranked[0]!.id, 'defense-rep');
});

Deno.test('recommendRun — returns whyThis and alternatives cap', () => {
  const quick: RunCandidate = {
    ...defense,
    id: 'quick',
    title: 'Conquérir Bastille',
    type: 'conquest',
    crewImpact: 0.5,
    friction: 0.25,
  };
  const result = recommendRun([longExplore, quick, defense], ctx);
  assertEquals(result !== null, true);
  assertEquals(result!.recommended.id, 'defense-rep');
  assertEquals(result!.alternatives.length <= 2, true);
  assertEquals(result!.whyThis.length >= 1, true);
});

Deno.test('personalFitScore — closer distance scores higher', () => {
  const close = personalFitScore(5, 30, ctx, true);
  const far = personalFitScore(15, 90, ctx, true);
  assertEquals(close > far, true);
});
