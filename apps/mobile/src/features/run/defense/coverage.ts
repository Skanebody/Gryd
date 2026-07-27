/**
 * GRYD — COUVERTURE DE FRONTIÈRE, CÔTÉ CLIENT (E22 « Défense active »).
 *
 * ═══ POURQUOI CE FICHIER EXISTE ALORS QUE `packages/engine/src/coverage.ts`
 *     FAIT DÉJÀ EXACTEMENT ÇA ════════════════════════════════════════════════
 * Metro ne résout PAS les imports Deno `.ts` de `@klaim/engine` — constat déjà
 * inscrit dans `features/map/territoriesSource.ts:25`, `features/crew/real.ts:18`
 * et `features/crew/revanche.ts:16`, qui ont tous dû reporter la même logique.
 * Le choix n'est donc pas « une copie ou l'import » : c'est « une copie ou pas
 * de jauge ». Ce fichier est un PORT FIDÈLE, ligne pour ligne, de
 * `packages/engine/src/coverage.ts` (`frontierCoverage`, `defenseLevel`), avec
 * DEUX garanties qui rendent la divergence détectable :
 *   · les SEUILS ne sont pas recopiés — ils sont importés de `@klaim/shared`
 *     (`FRONTIER_COVERAGE_BUFFER_M`, `DEFENSE_COVER_LONGE_MIN`,
 *     `DEFENSE_COVER_FULL_MIN`). Un changement de règle bouge les deux côtés
 *     du même geste, sans qu'aucun humain n'ait à s'en souvenir ;
 *   · `coverage.test.ts` rejoue les cas frontières de `defenseLevel` CONTRE ces
 *     constantes, jamais contre des nombres écrits à la main.
 *
 * ═══ CE QUE CETTE MESURE N'EST PAS ═══════════════════════════════════════════
 * Ce n'est PAS un verdict. Le serveur recalcule la couverture sur la trace
 * complète à l'ingestion et reste seul à décider si la défense est valide
 * (constitution : « tout claim est décidé serveur »). L'écran affiche une
 * MESURE en cours, faite sur la trace RÉELLE déjà enregistrée — donc jamais un
 * chiffre fabriqué, mais jamais non plus une promesse.
 *
 * PURE : aucune I/O, aucune horloge, aucun import React.
 */
import {
  DEFENSE_COVER_FULL_MIN,
  DEFENSE_COVER_LONGE_MIN,
  FRONTIER_COVERAGE_BUFFER_M,
} from '@klaim/shared';

/** Point géographique minimal — structurellement compatible avec `TrackerSnapshot.tracePoints`. */
export interface CoveragePoint {
  readonly lat: number;
  readonly lng: number;
}

/** Niveau de défense gradué — miroir EXACT de `DefenseLevel` (engine/coverage.ts:35). */
export type DefenseLevel = 'traverse' | 'longe' | 'cover';

// Projection équirectangulaire locale (mètres). RAD/EARTH : constantes
// physiques, pas des règles de jeu (même statut que dans le moteur).
const RAD_PER_DEG = Math.PI / 180;
const EARTH_RADIUS_M = 6_371_000;

/** Distance (m) entre deux points — haversine, identique à `engine/validation.ts`. */
export function haversineM(a: CoveragePoint, b: CoveragePoint): number {
  const dLat = (b.lat - a.lat) * RAD_PER_DEG;
  const dLng = (b.lng - a.lng) * RAD_PER_DEG;
  const lat1 = a.lat * RAD_PER_DEG;
  const lat2 = b.lat * RAD_PER_DEG;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Distance (m) d'un point à un SEGMENT [a,b] (projection locale sur `ref`). PURE. */
function pointToSegmentM(
  p: CoveragePoint,
  a: CoveragePoint,
  b: CoveragePoint,
  cosLat0: number,
  ref: CoveragePoint,
): number {
  const x = (q: CoveragePoint): number =>
    (q.lng - ref.lng) * RAD_PER_DEG * cosLat0 * EARTH_RADIUS_M;
  const y = (q: CoveragePoint): number => (q.lat - ref.lat) * RAD_PER_DEG * EARTH_RADIUS_M;
  const px = x(p);
  const py = y(p);
  const ax = x(a);
  const ay = y(a);
  const bx = x(b);
  const by = y(b);
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

/**
 * Distance (m) du point `p` à la POLYLIGNE `line` — au plus proche de tous ses
 * SEGMENTS, pas seulement de ses sommets. PURE. `Infinity` si `line` est vide.
 */
export function distanceToPolylineM(p: CoveragePoint, line: readonly CoveragePoint[]): number {
  if (line.length === 0) return Infinity;
  if (line.length === 1) return haversineM(p, line[0]!);
  const ref = line[0]!;
  const cosLat0 = Math.cos(ref.lat * RAD_PER_DEG);
  let best = Infinity;
  for (let i = 1; i < line.length; i++) {
    const d = pointToSegmentM(p, line[i - 1]!, line[i]!, cosLat0, ref);
    if (d < best) best = d;
  }
  return best;
}

/**
 * Fraction 0-1 de la `frontier` (anneau de la zone défendue) couverte par le
 * `trace` du coureur, au sens du buffer `FRONTIER_COVERAGE_BUFFER_M`.
 * Port fidèle de `engine/coverage.ts:97`.
 */
export function frontierCoverage(
  frontier: readonly CoveragePoint[],
  trace: readonly CoveragePoint[],
): number {
  if (frontier.length < 2 || trace.length < 1) return 0;
  const buffer = FRONTIER_COVERAGE_BUFFER_M;
  const step = Math.max(1, buffer / 2);
  const ref = frontier[0]!;
  let latSum = 0;
  let latCount = 0;
  for (const q of frontier) {
    latSum += q.lat;
    latCount++;
  }
  for (const q of trace) {
    latSum += q.lat;
    latCount++;
  }
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
      const t = (k + 0.5) / n;
      const mid: CoveragePoint = {
        lat: a.lat + (b.lat - a.lat) * t,
        lng: a.lng + (b.lng - a.lng) * t,
      };
      if (minDistanceToTrace(mid, trace, cosLat0, ref) <= buffer) coveredM += subLen;
    }
  }
  if (totalM <= 0) return 0;
  return Math.min(1, coveredM / totalM);
}

/** Identique à `distanceToPolylineM` mais avec le cache de projection de l'appelant. */
function minDistanceToTrace(
  p: CoveragePoint,
  trace: readonly CoveragePoint[],
  cosLat0: number,
  ref: CoveragePoint,
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
 * Couverture 0-1 (+ boucle refermée éventuelle) → niveau. Port fidèle de
 * `engine/coverage.ts:144`. AUCUN seuil en dur : ils viennent de `@klaim/shared`.
 */
export function defenseLevel(coverage: number, closedLoop = false): DefenseLevel {
  if (closedLoop || coverage >= DEFENSE_COVER_FULL_MIN) return 'cover';
  if (coverage >= DEFENSE_COVER_LONGE_MIN) return 'longe';
  return 'traverse';
}

/**
 * « LA COUVERTURE EST-ELLE DEVENUE SUFFISANTE ? » (spec l.1178-1181 : haptique
 * succès + label « Défense possible — terminez la boucle »).
 *
 * `'traverse'` est le PLANCHER, pas un palier : `defenseLevel(0)` le rend déjà,
 * donc l'utiliser comme déclencheur ferait apparaître « Défense possible » avant
 * que le coureur ait longé quoi que ce soit — un félicitation pour rien, donc un
 * mensonge doux. Le premier palier RÉELLEMENT franchi est
 * `DEFENSE_COVER_LONGE_MIN`. C'est celui-là qui dit « possible ».
 */
export function defenseIsPossible(level: DefenseLevel): boolean {
  return level === 'longe' || level === 'cover';
}

// ═══════════════════════════════════════════════════════════════════════════
// LE FRANCHISSEMENT DE PALIER — UNE TRANSITION, JAMAIS UN ÉTAT
// ═══════════════════════════════════════════════════════════════════════════

/** Rangs des trois niveaux : `traverse` < `longe` < `cover`. */
const LEVEL_RANK: Record<DefenseLevel, number> = { traverse: 0, longe: 1, cover: 2 };

/**
 * Ce que l'écran retient d'un tick au suivant. `null` = aucun niveau encore
 * observé (la sortie vient de basculer en défense), ce qui n'est PAS la même
 * chose que `'traverse'` : sans cette distinction, le premier tick d'une sortie
 * se lirait comme un franchissement et déclencherait l'haptique pour rien.
 */
export interface DefenseCoverageMemory {
  readonly best: DefenseLevel | null;
}

export const INITIAL_DEFENSE_COVERAGE: DefenseCoverageMemory = { best: null };

export interface DefenseCoverageStep {
  readonly memory: DefenseCoverageMemory;
  /**
   * Un palier VIENT d'être franchi vers le haut — c'est l'instant de
   * `defense_coverage_reached`. Un niveau qui redescend (le moteur remesure sur
   * une trace qui s'allonge) ne produit RIEN : on ne reprend pas une nouvelle
   * qu'on a annoncée.
   */
  readonly reached: DefenseLevel | null;
  /**
   * L'instant EXACT de la spec (l.1178-1181) : haptique succès + label
   * « Défense possible — termine la boucle ». Ne se produit qu'UNE fois par
   * sortie, au premier franchissement de `DEFENSE_COVER_LONGE_MIN`.
   */
  readonly celebrate: boolean;
}

/** PURE. Compare le niveau courant au meilleur déjà vu et dit ce qui est nouveau. */
export function stepDefenseCoverage(
  memory: DefenseCoverageMemory,
  level: DefenseLevel,
): DefenseCoverageStep {
  const previous = memory.best;
  if (previous !== null && LEVEL_RANK[level] <= LEVEL_RANK[previous]) {
    return { memory, reached: null, celebrate: false };
  }
  const celebrate =
    defenseIsPossible(level) && (previous === null || !defenseIsPossible(previous));
  return { memory: { best: level }, reached: level, celebrate };
}
