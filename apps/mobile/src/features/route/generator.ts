/**
 * GRYD — constantes du route planner (INTENTIONS + bornes de distance). Les
 * tracés eux-mêmes ne sont plus des données démo : ils sont ROUTÉS EN DIRECT
 * autour d'une origine quelconque (features/route/liveRouting.ts). Ce module ne
 * porte plus que les libellés d'objectif et les bornes de distance.
 *
 * i18n : les libellés sont des `Entry` (5 langues, parité forcée par le type) —
 * les composants résolvent à l'affichage via `t()` (i18n/store).
 */
import { C } from '../../i18n/catalog/route';
import type { Entry } from '../../i18n/types';
import type { PlannedRouteDemo } from './types';

export type PlannerIntention = 'conquerir' | 'attaquer' | 'defendre';

export const PLANNER_INTENTION_ORDER: readonly PlannerIntention[] = [
  'conquerir',
  'attaquer',
  'defendre',
];

export const PLANNER_INTENTION_LABELS: Record<PlannerIntention, Entry> = {
  conquerir: C.intentConquer,
  attaquer: C.intentAttack,
  defendre: C.intentDefend,
};

export const PLANNER_INTENTION_STATUS: Record<PlannerIntention, Entry> = {
  conquerir: C.intentStatusConquer,
  attaquer: C.intentStatusAttack,
  defendre: C.intentStatusDefend,
};

// Bornes de distance : du footing au TRAIL (des coureurs font 50 km).
export const GEN_MIN_KM = 1.5;
export const GEN_MAX_KM = 50;
export const GEN_STEP_KM = 0.5;
export const GEN_DEFAULT_KM = 3.4;

/** Raisons « Pourquoi cette course » d'une boucle (intention + distance) — Entries à résoudre via t(). */
export function generatedReasons(route: PlannedRouteDemo, intention: PlannerIntention): Entry[] {
  const tags: Entry[] = [];
  if (intention === 'attaquer') tags.push(C.reasonRivalBorder);
  else if (intention === 'defendre') tags.push(C.reasonHoldSector);
  else tags.push(C.reasonAtYourDoor);
  tags.push(
    route.distanceKm <= 3 ? C.reasonShortFormat : route.distanceKm <= 6 ? C.reasonMediumFormat : C.reasonLongLoop,
  );
  tags.push(C.reasonFollowsStreets);
  return tags;
}
