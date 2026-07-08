/**
 * GRYD — recommandation de course côté client (démo).
 * Logique alignée sur packages/engine/recommendation.ts ; le moteur canon
 * reste testé côté Deno. V1 serveur = Edge Function recommend_run.
 */
import {
  RECO_MAX_ALTERNATIVES,
  RECO_W_CREW,
  RECO_W_FRICTION,
  RECO_W_NOVELTY,
  RECO_W_PERSONAL,
  RECO_W_REWARD,
  RECO_W_TERRITORY,
} from '@klaim/shared';
import {
  ROUTES_DEMO,
  routeDurationMin,
} from './demo';
import {
  OBJECTIVE_BY_ROUTE_TYPE,
  type PlannedRouteDemo,
  type RouteObjective,
} from './types';

export type RunRecommendationType = 'conquest' | 'defense' | 'exploration' | 'crew_support';

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

export interface RunRecommendationContext {
  habitualDistanceKm: number;
  preferredDurationMin: number;
  prefersLoop: boolean;
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

const DEFAULT_CTX: RunRecommendationContext = {
  habitualDistanceKm: 5,
  preferredDurationMin: 30,
  prefersLoop: true,
  fatigueScore: 0.15,
  defendUrgency: 0.6,
  crewObjectiveTitle: 'Défendre République',
  capturableNearby: 12,
  rivalPressure: 0.45,
};

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function finalScore(c: RunCandidate): number {
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

function buildWhyThis(candidate: RunCandidate, ctx: RunRecommendationContext): string[] {
  const reasons: string[] = [];
  if (candidate.personalFit >= 0.75) reasons.push('adaptée à ta distance habituelle');
  if (candidate.crewImpact >= 0.7 && (ctx.defendUrgency ?? 0) > 0.5) {
    reasons.push('zone crew attaquée');
  } else if (candidate.crewImpact >= 0.7) {
    reasons.push('fort impact crew');
  }
  if (candidate.territoryValue >= 0.75) reasons.push('impact élevé sur le classement');
  if (candidate.type === 'conquest' && candidate.friction <= 0.35) {
    reasons.push('boucle réalisable rapidement');
  }
  return reasons.slice(0, 4);
}

function objectiveToType(objective: RouteObjective): RunRecommendationType {
  return objective === 'defendre' ? 'defense' : 'conquest';
}

function routeToCandidate(route: PlannedRouteDemo): RunCandidate {
  const km = route.distanceKm;
  const dur = routeDurationMin(route);
  const isLoop = route.shape === 'boucle';
  return {
    id: route.id,
    type: objectiveToType(OBJECTIVE_BY_ROUTE_TYPE[route.typeKey]),
    title: route.name,
    distanceKm: km,
    estimatedDurationMin: dur,
    zonesEstimate: route.zones,
    pointsEstimate: route.zones * 10,
    crewPointsEstimate: route.typeKey === 'defense' ? Math.round(route.zones * 5) : undefined,
    personalFit: isLoop ? 0.82 : 0.65,
    crewImpact: route.typeKey === 'defense' ? 0.88 : 0.45,
    territoryValue: Math.min(1, route.zones / 100),
    friction: km > 8 ? 0.55 : km > 5 ? 0.35 : 0.2,
    reward: Math.min(1, route.zones / 80),
    novelty: route.typeKey === 'exploration' ? 0.85 : 0.4,
    safety: 0.9,
  };
}

export function recommendRoutes(
  objective: RouteObjective,
  ctx: Partial<RunRecommendationContext> = {},
): RunRecommendation | null {
  const merged = { ...DEFAULT_CTX, ...ctx };
  const candidates = ROUTES_DEMO.filter(
    (r) => OBJECTIVE_BY_ROUTE_TYPE[r.typeKey] === objective,
  ).map(routeToCandidate);
  if (candidates.length === 0) return null;
  const ranked = candidates
    .map((c) => ({ ...c, finalScore: finalScore(c) }))
    .sort((a, b) => b.finalScore - a.finalScore);
  const recommended = ranked[0]!;
  return {
    recommended,
    alternatives: ranked.slice(1, 1 + RECO_MAX_ALTERNATIVES),
    whyThis: buildWhyThis(recommended, merged),
  };
}

export function recommendedRouteId(objective: RouteObjective): string | null {
  return recommendRoutes(objective)?.recommended.id ?? null;
}
