/**
 * GRYD — GÉNÉRATEUR de boucles (route planner « façon Waze »). Produit à la
 * VOLÉE une boucle fermée d'une distance CIBLE autour du joueur, orientée par
 * l'INTENTION (Conquérir / Attaquer / Défendre), avec des variantes distinctes.
 * 100 % déterministe et CLIENT (aucun réseau) : c'est un PLACEHOLDER visuel qui
 * donne l'interaction live (tape une distance → boucle recalculée, choisis parmi
 * plusieurs). Le vrai calcul d'itinéraire RUE PAR RUE sur le graphe (snap réseau,
 * évitement d'axes) = V1 backend (service de routing piéton, décision infra) ;
 * le garde-fou walkability (features/route/walkability.ts) validera ses tracés.
 *
 * Géométrie : rosace fermée (N sommets, rayon jittéré déterministe) centrée à R
 * mètres de l'ego dans la direction de l'intention → l'ego est SUR la boucle
 * (départ = retour). Le rayon est calé en 2 passes sur la distance cible.
 */
import { POINTS_DEFENDED_HEX, POINTS_NEUTRAL_HEX } from '@klaim/shared';
import { EGO_REPUBLIQUE, REAL_M_PER_DEG_LAT, type LatLngPoint } from '../map/realAnchors';
import type { PlannedRouteDemo, RouteTypeKey } from './types';

export type PlannerIntention = 'conquerir' | 'attaquer' | 'defendre';

export const PLANNER_INTENTION_ORDER: readonly PlannerIntention[] = [
  'conquerir',
  'attaquer',
  'defendre',
];

/** Libellés par intention (kicker header + CTA + verbe). */
export const PLANNER_INTENTION_LABELS: Record<PlannerIntention, string> = {
  conquerir: 'Conquérir',
  attaquer: 'Attaquer',
  defendre: 'Défendre',
};

/** Statut affiché en tête d'écran selon l'intention. */
export const PLANNER_INTENTION_STATUS: Record<PlannerIntention, string> = {
  conquerir: 'Conquête recommandée',
  attaquer: 'Raid sur la frontière rivale',
  defendre: 'Ton crew a besoin de toi',
};

/** Bornes de distance générables (km) — au-delà, la géométrie risque l'eau/rail. */
export const GEN_MIN_KM = 1;
export const GEN_MAX_KM = 12;
/** Pas du stepper de distance (km). */
export const GEN_STEP_KM = 0.5;
/** Distance par défaut (= la boucle recommandée). */
export const GEN_DEFAULT_KM = 3.4;

// Zones/points estimés — cohérent avec les routes démo (3,4 km → 52 zones).
const ZONES_PER_KM = 15.3;
const LOOP_ZONE_RATIO = 0.6;

const M_PER_DEG_LNG = REAL_M_PER_DEG_LAT * Math.cos((EGO_REPUBLIQUE.lat * Math.PI) / 180);

/** Cap de base (deg, 0 = est, sens trigo) par intention → direction du secteur. */
const INTENTION_BEARING: Record<PlannerIntention, number> = {
  conquerir: 25, // le long du canal / vers l'est
  attaquer: 70, // vers Belleville (nord-est, frontière rivale)
  defendre: -120, // secteur maison (sud-ouest, Bastille/République)
};
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

/** LCG déterministe (mêmes entrées → même boucle : zéro Math.random). */
function rng(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 48271) % 2147483647) / 2147483647;
}

function deg2rad(d: number): number {
  return (d * Math.PI) / 180;
}

function polylineLenM(pts: readonly LatLngPoint[]): number {
  let total = 0;
  for (let i = 1; i < pts.length; i += 1) {
    const dE = (pts[i]!.lng - pts[i - 1]!.lng) * M_PER_DEG_LNG;
    const dN = (pts[i]!.lat - pts[i - 1]!.lat) * REAL_M_PER_DEG_LAT;
    total += Math.hypot(dE, dN);
  }
  return total;
}

/** Rosace fermée : sommet 0 = ego (jitter nul), retour au départ en fin. */
function buildLoop(bearingDeg: number, radiusM: number, jitter: readonly number[], n: number): LatLngPoint[] {
  const b = deg2rad(bearingDeg);
  const cx = radiusM * Math.cos(b);
  const cy = radiusM * Math.sin(b);
  const startAngle = bearingDeg + 180; // l'ego est à l'opposé du centre
  const pts: LatLngPoint[] = [];
  for (let k = 0; k <= n; k += 1) {
    const a = deg2rad(startAngle + (360 * k) / n);
    const r = radiusM * (1 + (jitter[k % n] ?? 0));
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    pts.push({
      lat: EGO_REPUBLIQUE.lat + y / REAL_M_PER_DEG_LAT,
      lng: EGO_REPUBLIQUE.lng + x / M_PER_DEG_LNG,
    });
  }
  return pts;
}

function clampKm(km: number): number {
  if (Number.isNaN(km)) return GEN_DEFAULT_KM;
  return Math.min(GEN_MAX_KM, Math.max(GEN_MIN_KM, km));
}

/**
 * Génère UNE boucle (distance cible km, intention, seed pour la variété). Le
 * résultat est un PlannedRouteDemo : carte, KPI, CTA et garde-fou walkability le
 * consomment sans changement de contrat.
 */
export function generateLoop(
  targetKm: number,
  intention: PlannerIntention,
  seed: number,
): PlannedRouteDemo {
  const km = clampKm(targetKm);
  const bearing = INTENTION_BEARING[intention] + (seed % 8) * 18; // variété par seed
  const n = Math.max(12, Math.round(km * 7));
  const rand = rng(seed * 131 + Math.round(km * 10));
  const jitter: number[] = [];
  for (let k = 0; k < n; k += 1) jitter.push((rand() - 0.5) * 0.42); // ±0,21
  jitter[0] = 0; // ancre le départ ~sur l'ego

  let radius = (km * 1000) / (2 * Math.PI); // approx cercle
  for (let pass = 0; pass < 2; pass += 1) {
    const probe = buildLoop(bearing, radius, jitter, n);
    const len = polylineLenM(probe);
    if (len > 0) radius *= (km * 1000) / len; // calage sur la cible
  }
  const line = buildLoop(bearing, radius, jitter, n);
  const distanceKm = Math.round((polylineLenM(line) / 1000) * 10) / 10;
  const zones = Math.round(distanceKm * ZONES_PER_KM);
  const loopZones = Math.round(zones * LOOP_ZONE_RATIO);
  const defend = intention === 'defendre';

  return {
    id: `gen_${intention}_${Math.round(km * 10)}_${seed}`,
    letter: 'A',
    name: 'Générée',
    typeKey: INTENTION_TYPE[intention],
    zone: INTENTION_ZONE[intention],
    distanceKm,
    zones,
    loopZones,
    points: zones * (defend ? POINTS_DEFENDED_HEX : POINTS_NEUTRAL_HEX),
    shape: 'boucle',
    difficulty: distanceKm <= 3 ? 'Facile' : distanceKm <= 6 ? 'Modéré' : 'Exigeant',
    ...(defend
      ? { streetsToSave: Math.max(6, Math.round(distanceKm * 3)), expiresInH: 48 }
      : {}),
    line,
  };
}

/**
 * Plusieurs boucles proches DISTINCTES (autres options « à côté ») autour de la
 * distance cible : seeds + distances légèrement variés → tracés différents des
 * plans. `count` boucles, déterministes.
 */
export function generateNearbyLoops(
  targetKm: number,
  intention: PlannerIntention,
  count: number,
  baseSeed: number,
): PlannedRouteDemo[] {
  const spreads = [0.82, 1.0, 1.22, 0.65, 1.45];
  return Array.from({ length: count }, (_, i) =>
    generateLoop(targetKm * (spreads[i] ?? 1), intention, baseSeed + i * 7 + 3),
  );
}

/** Raisons « Pourquoi cette course » d'une boucle générée (intention + distance). */
export function generatedReasons(route: PlannedRouteDemo, intention: PlannerIntention): string[] {
  const tags: string[] = [];
  if (intention === 'attaquer') tags.push('Frontière rivale');
  else if (intention === 'defendre') tags.push('Secteur à tenir');
  else tags.push('À ta porte');
  tags.push(route.distanceKm <= 3 ? 'Format court' : route.distanceKm <= 6 ? 'Format moyen' : 'Grande boucle');
  tags.push('Boucle fermée');
  return tags;
}
