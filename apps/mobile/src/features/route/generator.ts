/**
 * GRYD — constantes du route planner (INTENTIONS + bornes de distance). Les
 * tracés eux-mêmes ne sont plus des données démo : ils sont ROUTÉS EN DIRECT
 * autour d'une origine quelconque (features/route/liveRouting.ts). Ce module ne
 * porte plus que les libellés d'objectif et les bornes de distance.
 */
import type { PlannedRouteDemo } from './types';

export type PlannerIntention = 'conquerir' | 'attaquer' | 'defendre';

export const PLANNER_INTENTION_ORDER: readonly PlannerIntention[] = [
  'conquerir',
  'attaquer',
  'defendre',
];

export const PLANNER_INTENTION_LABELS: Record<PlannerIntention, string> = {
  conquerir: 'Conquérir',
  attaquer: 'Attaquer',
  defendre: 'Défendre',
};

export const PLANNER_INTENTION_STATUS: Record<PlannerIntention, string> = {
  conquerir: 'Conquête recommandée',
  attaquer: 'Raid sur la frontière rivale',
  defendre: 'Défends ton secteur',
};

// Bornes de distance : du footing au TRAIL (des coureurs font 50 km).
export const GEN_MIN_KM = 1.5;
export const GEN_MAX_KM = 50;
export const GEN_STEP_KM = 0.5;
export const GEN_DEFAULT_KM = 3.4;

/** Raisons « Pourquoi cette course » d'une boucle (intention + distance). */
export function generatedReasons(route: PlannedRouteDemo, intention: PlannerIntention): string[] {
  const tags: string[] = [];
  if (intention === 'attaquer') tags.push('Frontière rivale');
  else if (intention === 'defendre') tags.push('Secteur à tenir');
  else tags.push('À ta porte');
  tags.push(route.distanceKm <= 3 ? 'Format court' : route.distanceKm <= 6 ? 'Format moyen' : 'Grande boucle');
  tags.push('Suit les rues');
  return tags;
}
