/**
 * GRYD — moteur de recommandation de course (MVP).
 * Classe des candidats (routes/missions) selon fit joueur, impact crew,
 * valeur territoriale, friction et récompense. Constantes : game-rules.ts.
 */
import {
  RECO_MAX_ALTERNATIVES,
  RECO_W_CREW,
  RECO_W_FRICTION,
  RECO_W_NOVELTY,
  RECO_W_PERSONAL,
  RECO_W_REWARD,
  RECO_W_TERRITORY,
} from '@klaim/shared/game-rules';

export type RunRecommendationType = 'conquest' | 'defense' | 'exploration' | 'crew_support';

/** Candidat route/mission à classer — scores composants normalisés 0–1. */
export interface RunCandidate {
  id: string;
  type: RunRecommendationType;
  title: string;
  distanceKm: number;
  estimatedDurationMin: number;
  zonesEstimate: number;
  pointsEstimate: number;
  crewPointsEstimate?: number;
  personalFit: number;
  crewImpact: number;
  territoryValue: number;
  friction: number;
  reward: number;
  novelty: number;
  safety?: number;
}

/** Contexte joueur/crew/carte pour ajuster les scores et générer le « pourquoi ». */
export interface RunRecommendationContext {
  habitualDistanceKm: number;
  preferredDurationMin: number;
  prefersLoop: boolean;
  /** 0 = frais, 1 = fatigué — favorise routes courtes si élevé. */
  fatigueScore: number;
  attackedZoneNames?: string[];
  defendUrgency?: number;
  crewObjectiveTitle?: string;
  capturableNearby?: number;
  rivalPressure?: number;
}

export interface RankedRunCandidate extends RunCandidate {
  finalScore: number;
}

export interface RunRecommendation {
  recommended: RankedRunCandidate;
  alternatives: RankedRunCandidate[];
  whyThis: string[];
}

/** Score final pondéré (game-rules RECO_W_*). */
export function finalRecommendationScore(c: RunCandidate): number {
  const safety = c.safety ?? 1;
  return (
    RECO_W_PERSONAL * clamp01(c.personalFit) +
    RECO_W_CREW * clamp01(c.crewImpact) +
    RECO_W_TERRITORY * clamp01(c.territoryValue) +
    RECO_W_REWARD * clamp01(c.reward) +
    RECO_W_NOVELTY * clamp01(c.novelty) +
    0.05 * clamp01(safety) -
    RECO_W_FRICTION * clamp01(c.friction)
  );
}

/** Classe les candidats par score décroissant. */
export function rankRunCandidates(candidates: RunCandidate[]): RankedRunCandidate[] {
  return candidates
    .map((c) => ({ ...c, finalScore: finalRecommendationScore(c) }))
    .sort((a, b) => b.finalScore - a.finalScore);
}

/** Heuristique Personal Fit depuis distance/durée vs habitudes. */
export function personalFitScore(
  distanceKm: number,
  durationMin: number,
  ctx: RunRecommendationContext,
  prefersLoop: boolean,
): number {
  const distDelta = Math.abs(distanceKm - ctx.habitualDistanceKm);
  const durDelta = Math.abs(durationMin - ctx.preferredDurationMin);
  const distScore = 1 - Math.min(1, distDelta / Math.max(0.5, ctx.habitualDistanceKm));
  const durScore = 1 - Math.min(1, durDelta / Math.max(10, ctx.preferredDurationMin));
  const fatiguePenalty = ctx.fatigueScore * Math.min(1, distanceKm / 8);
  const loopBonus = prefersLoop === ctx.prefersLoop ? 0.08 : 0;
  return clamp01(0.55 * distScore + 0.35 * durScore + loopBonus - fatiguePenalty);
}

/** Génère les puces « pourquoi cette course » (max 4, courtes). */
export function buildWhyThis(
  candidate: RunCandidate,
  ctx: RunRecommendationContext,
): string[] {
  const reasons: string[] = [];
  if (candidate.personalFit >= 0.75) {
    reasons.push('adaptée à ta distance habituelle');
  }
  if (candidate.crewImpact >= 0.7 && ctx.defendUrgency !== undefined && ctx.defendUrgency > 0.5) {
    reasons.push('zone crew attaquée');
  } else if (candidate.crewImpact >= 0.7) {
    reasons.push('fort impact crew');
  }
  if (candidate.territoryValue >= 0.75) {
    reasons.push('impact élevé sur le classement');
  }
  if (candidate.type === 'conquest' && candidate.friction <= 0.35) {
    reasons.push('boucle réalisable rapidement');
  }
  if (candidate.novelty >= 0.65) {
    reasons.push('explore de nouvelles rues');
  }
  if (ctx.crewObjectiveTitle && candidate.title.includes(ctx.crewObjectiveTitle.split(' ')[0] ?? '')) {
    reasons.push('alignée sur l\'objectif crew');
  }
  return reasons.slice(0, 4);
}

/** Recommandation principale + alternatives (max RECO_MAX_ALTERNATIVES). */
export function recommendRun(
  candidates: RunCandidate[],
  ctx: RunRecommendationContext,
): RunRecommendation | null {
  if (candidates.length === 0) return null;
  const enriched = candidates.map((c) => ({
    ...c,
    personalFit:
      c.personalFit > 0
        ? c.personalFit
        : personalFitScore(c.distanceKm, c.estimatedDurationMin, ctx, c.type !== 'exploration'),
  }));
  const ranked = rankRunCandidates(enriched);
  const recommended = ranked[0]!;
  const alternatives = ranked.slice(1, 1 + RECO_MAX_ALTERNATIVES);
  return {
    recommended,
    alternatives,
    whyThis: buildWhyThis(recommended, ctx),
  };
}

function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}
