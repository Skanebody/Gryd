/**
 * GRYD — sélection de boucles pour le route planner « façon Waze ». Les tracés
 * proposés sont de VRAIES boucles piétonnes pré-routées OSRM foot (loops.generated
 * .ts, figées au build) : elles SUIVENT LES RUES (aucun bâtiment traversé) et sont
 * servies HORS LIGNE. On pioche par INTENTION (Conquérir / Attaquer / Défendre) +
 * distance cible ; « autres boucles » = les autres tracés réels de l'objectif.
 * Le calcul d'itinéraire EN CONTINU (n'importe quelle distance au mètre, façon
 * Waze live) = V1 backend (routing piéton serveur) ; ici l'ensemble est discret
 * mais 100 % réel. API conservée (generateLoop/generateNearbyLoops).
 */
import { POINTS_DEFENDED_HEX, POINTS_NEUTRAL_HEX } from '@klaim/shared';
import { REAL_LOOPS, type RealLoop } from './loops.generated';
import type { PlannedRouteDemo, RouteTypeKey } from './types';

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
  defendre: 'Ton crew a besoin de toi',
};

// Bornes de distance = amplitude réelle des boucles pré-routées.
const REAL_DISTANCES = REAL_LOOPS.map((l) => l.distanceKm);
export const GEN_MIN_KM = REAL_DISTANCES.length ? Math.min(...REAL_DISTANCES) : 1.5;
export const GEN_MAX_KM = REAL_DISTANCES.length ? Math.max(...REAL_DISTANCES) : 8;
export const GEN_STEP_KM = 0.5;
export const GEN_DEFAULT_KM = 3.4;

const ZONES_PER_KM = 15.3;
const LOOP_ZONE_RATIO = 0.6;

const INTENTION_TYPE: Record<PlannerIntention, RouteTypeKey> = {
  conquerir: 'capture_rapide',
  attaquer: 'raid',
  defendre: 'defense',
};
const INTENTION_ZONE: Record<PlannerIntention, string> = {
  conquerir: 'République',
  attaquer: 'Belleville',
  defendre: 'République',
};

/** Boucles réelles par objectif, triées par distance croissante. */
const LOOPS_BY_INTENTION: Record<PlannerIntention, RealLoop[]> = {
  conquerir: [],
  attaquer: [],
  defendre: [],
};
for (const loop of REAL_LOOPS) {
  LOOPS_BY_INTENTION[loop.objective].push(loop);
}
for (const key of PLANNER_INTENTION_ORDER) {
  LOOPS_BY_INTENTION[key].sort((a, b) => a.distanceKm - b.distanceKm);
}

/** Une boucle réelle → PlannedRouteDemo (carte/KPI/CTA/walkability inchangés). */
function loopToRoute(loop: RealLoop): PlannedRouteDemo {
  const km = loop.distanceKm;
  const zones = Math.round(km * ZONES_PER_KM);
  const loopZones = Math.round(zones * LOOP_ZONE_RATIO);
  const defend = loop.objective === 'defendre';
  return {
    id: loop.id,
    letter: 'A',
    name: 'Réelle',
    typeKey: INTENTION_TYPE[loop.objective],
    zone: INTENTION_ZONE[loop.objective],
    distanceKm: km,
    zones,
    loopZones,
    points: zones * (defend ? POINTS_DEFENDED_HEX : POINTS_NEUTRAL_HEX),
    shape: 'boucle',
    difficulty: km <= 3 ? 'Facile' : km <= 6 ? 'Modéré' : 'Exigeant',
    ...(defend ? { streetsToSave: Math.max(6, Math.round(km * 3)), expiresInH: 48 } : {}),
    line: loop.line,
  };
}

function pool(intention: PlannerIntention): RealLoop[] {
  const p = LOOPS_BY_INTENTION[intention];
  return p.length ? p : REAL_LOOPS.slice();
}

/**
 * Boucle RÉELLE la plus proche de la distance cible pour l'intention donnée.
 * `seed` inutilisé (ensemble fini) — signature conservée pour l'appelant.
 */
export function generateLoop(
  targetKm: number,
  intention: PlannerIntention,
  _seed: number,
): PlannedRouteDemo {
  const p = pool(intention);
  let best = p[0]!;
  let bestDelta = Infinity;
  for (const loop of p) {
    const d = Math.abs(loop.distanceKm - targetKm);
    if (d < bestDelta) {
      bestDelta = d;
      best = loop;
    }
  }
  return loopToRoute(best);
}

/**
 * Autres boucles RÉELLES de l'objectif, proches de la cible mais DISTINCTES de la
 * plus proche. `baseSeed` fait défiler la fenêtre (bouton « Autres »).
 */
export function generateNearbyLoops(
  targetKm: number,
  intention: PlannerIntention,
  count: number,
  baseSeed: number,
): PlannedRouteDemo[] {
  const p = pool(intention);
  const nearestId = generateLoop(targetKm, intention, baseSeed).id;
  const others = p
    .filter((l) => l.id !== nearestId)
    .sort((a, b) => Math.abs(a.distanceKm - targetKm) - Math.abs(b.distanceKm - targetKm));
  if (others.length === 0) return [];
  const start = ((baseSeed % others.length) + others.length) % others.length;
  const rotated = [...others.slice(start), ...others.slice(0, start)];
  return rotated.slice(0, Math.min(count, others.length)).map(loopToRoute);
}

/** Raisons « Pourquoi cette course » d'une boucle réelle (intention + distance). */
export function generatedReasons(route: PlannedRouteDemo, intention: PlannerIntention): string[] {
  const tags: string[] = [];
  if (intention === 'attaquer') tags.push('Frontière rivale');
  else if (intention === 'defendre') tags.push('Secteur à tenir');
  else tags.push('À ta porte');
  tags.push(route.distanceKm <= 3 ? 'Format court' : route.distanceKm <= 6 ? 'Format moyen' : 'Grande boucle');
  tags.push('Suit les rues');
  return tags;
}
