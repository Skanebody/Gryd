/**
 * GRYD — engine/coverage.ts
 * AMENDEMENT-23 §D + doc §16/§17 — DÉFENSE GRADUÉE : « frontière couverte % » +
 * les 3 niveaux traverser / longer / couvrir → heures de stabilité gagnées.
 *
 * Fonctions PURES : aucune I/O, aucune horloge. L'appelant (ingest_run) fournit
 * le tracé du coureur et la LIGNE de frontière ciblée (l'anneau du polygone de
 * la zone défendue), reçoit la couverture 0-1 et le niveau de défense. Tous les
 * seuils viennent de @klaim/shared/game-rules — AUCUN nombre magique ici.
 *
 * « Frontière couverte » (doc §17) :
 *   frontière ciblée = ligne polygonale (segments du contour de la zone)
 *   tracé runner     = ligne GPS
 *   buffer tracé     = FRONTIER_COVERAGE_BUFFER_M (30 m)
 *   couverture = longueur de frontière dont un point tombe à ≤ buffer du tracé
 *                ÷ longueur totale de la frontière.
 *
 * On échantillonne chaque segment de frontière en sous-points espacés d'au plus
 * ~½ buffer (pas de « trou » entre deux tests) et on compte la fraction de
 * sous-segments dont le MILIEU est à ≤ buffer d'un point du tracé. Approximation
 * MVP suffisante (doc §17 : pas de calcul exotique), monotone et bornée [0 ; 1].
 */
import {
  DEFENSE_COVER_FULL_MIN,
  DEFENSE_COVER_LONGE_MIN,
  DEFENSE_HOURS_COVER,
  DEFENSE_HOURS_LONGE,
  DEFENSE_HOURS_TRAVERSE,
  FRONTIER_COVERAGE_BUFFER_M,
} from '@klaim/shared/game-rules';
import { haversineM } from './validation.ts';
import type { LatLngPoint } from './hexing.ts';

/** Niveau de défense gradué (doc §16). */
export type DefenseLevel = 'traverse' | 'longe' | 'cover';

// Projection équirectangulaire locale (mètres) centrée sur un point de
// référence — assez précise à l'échelle d'un contour de zone (comme le reste du
// moteur). RAD/EARTH : constantes physiques, pas des règles de jeu.
const RAD_PER_DEG = Math.PI / 180;
const EARTH_RADIUS_M = 6_371_000;

/** Distance (m) d'un point à un SEGMENT [a,b] (projection locale sur ref). PURE. */
function pointToSegmentM(
  p: LatLngPoint,
  a: LatLngPoint,
  b: LatLngPoint,
  cosLat0: number,
  ref: LatLngPoint,
): number {
  const x = (q: LatLngPoint): number => (q.lng - ref.lng) * RAD_PER_DEG * cosLat0 * EARTH_RADIUS_M;
  const y = (q: LatLngPoint): number => (q.lat - ref.lat) * RAD_PER_DEG * EARTH_RADIUS_M;
  const px = x(p), py = y(p);
  const ax = x(a), ay = y(a);
  const bx = x(b), by = y(b);
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  // Segment dégénéré (a == b) → distance au point.
  let t = len2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t)); // borne sur le segment (pas la droite infinie)
  const cx = ax + t * dx, cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

/**
 * Distance (m) du point `p` à la LIGNE du tracé (le plus proche de tous ses
 * SEGMENTS, pas seulement de ses sommets — sinon un tracé peu échantillonné
 * sous-estimerait la couverture). PURE. `cosLat0`/`ref` : cache de projection.
 */
function minDistanceToTrace(
  p: LatLngPoint,
  trace: readonly LatLngPoint[],
  cosLat0: number,
  ref: LatLngPoint,
): number {
  if (trace.length === 1) return haversineM(p, trace[0]!);
  let best = Infinity;
  for (let i = 1; i < trace.length; i++) {
    const d = pointToSegmentM(p, trace[i - 1]!, trace[i]!, cosLat0, ref);
    if (d < best) best = d;
  }
  return best;
}

/**
 * Fraction 0-1 de la `frontier` (ligne polygonale, sommets ordonnés — l'anneau
 * de la zone ; NON refermé automatiquement, l'appelant passe le contour tel
 * qu'il veut le mesurer) couverte par le `trace` du coureur, au sens du buffer
 * FRONTIER_COVERAGE_BUFFER_M (doc §17). PURE.
 *
 * Chaque segment [A,B] de la frontière est découpé en N sous-segments (N tel
 * que chaque sous-segment ≤ ½ buffer, min 1) ; un sous-segment compte comme
 * COUVERT si son milieu est à ≤ buffer d'un point du tracé. La couverture est
 * la somme des longueurs des sous-segments couverts ÷ longueur totale de la
 * frontière. Frontière/tracé dégénérés (< 2 points, longueur nulle) → 0.
 */
export function frontierCoverage(
  frontier: readonly LatLngPoint[],
  trace: readonly LatLngPoint[],
): number {
  if (frontier.length < 2 || trace.length < 1) return 0;
  const buffer = FRONTIER_COVERAGE_BUFFER_M;
  const step = Math.max(1, buffer / 2); // pas d'échantillonnage ≤ ½ buffer
  // Référence de projection : premier sommet de la frontière ; cosLat0 sur la
  // latitude moyenne frontière + tracé (stabilité numérique).
  const ref = frontier[0]!;
  let latSum = 0, latCount = 0;
  for (const q of frontier) { latSum += q.lat; latCount++; }
  for (const q of trace) { latSum += q.lat; latCount++; }
  const cosLat0 = Math.cos((latSum / latCount) * RAD_PER_DEG);
  let totalM = 0;
  let coveredM = 0;
  for (let i = 1; i < frontier.length; i++) {
    const a = frontier[i - 1]!;
    const b = frontier[i]!;
    const segLen = haversineM(a, b);
    if (segLen <= 0) continue;
    totalM += segLen;
    const n = Math.max(1, Math.ceil(segLen / step));
    const subLen = segLen / n;
    for (let k = 0; k < n; k++) {
      // Milieu du k-ième sous-segment, interpolation linéaire lat/lng (approx
      // suffisante à l'échelle d'un contour de zone).
      const t = (k + 0.5) / n;
      const mid: LatLngPoint = {
        lat: a.lat + (b.lat - a.lat) * t,
        lng: a.lng + (b.lng - a.lng) * t,
      };
      if (minDistanceToTrace(mid, trace, cosLat0, ref) <= buffer) coveredM += subLen;
    }
  }
  if (totalM <= 0) return 0;
  return Math.min(1, coveredM / totalM);
}

/**
 * Niveau de défense (doc §16) à partir de la couverture 0-1 et d'un drapeau
 * `closedLoop` (le tracé a REFERMÉ une boucle sur la zone = défense maximale,
 * doc §16 niveau 3 « refaire la boucle »). PURE.
 *  - closedLoop OU coverage ≥ DEFENSE_COVER_FULL_MIN (0,80) → 'cover' ;
 *  - coverage ≥ DEFENSE_COVER_LONGE_MIN (0,40)             → 'longe' ;
 *  - sinon                                                  → 'traverse'.
 */
export function defenseLevel(coverage: number, closedLoop = false): DefenseLevel {
  if (closedLoop || coverage >= DEFENSE_COVER_FULL_MIN) return 'cover';
  if (coverage >= DEFENSE_COVER_LONGE_MIN) return 'longe';
  return 'traverse';
}

/**
 * Heures de stabilité gagnées par un niveau de défense (doc §16/§25) :
 * traverser 24 h, longer 48 h, couvrir 72 h (bornes hautes des plages, gelées
 * en game-rules). PURE. L'appelant REPOUSSE l'échéance de decay de ce nombre
 * d'heures (la stabilité s'étend, elle ne se reset pas).
 */
export function defenseStabilityHours(level: DefenseLevel): number {
  switch (level) {
    case 'cover':
      return DEFENSE_HOURS_COVER;
    case 'longe':
      return DEFENSE_HOURS_LONGE;
    case 'traverse':
      return DEFENSE_HOURS_TRAVERSE;
  }
}

/**
 * Raccourci : couverture (+ boucle fermée éventuelle) → heures de stabilité.
 * PURE. Combine defenseLevel + defenseStabilityHours pour l'appelant.
 */
export function defenseHoursForCoverage(coverage: number, closedLoop = false): number {
  return defenseStabilityHours(defenseLevel(coverage, closedLoop));
}
