// GÉNÉRÉ par scripts/sync-game-rules.mjs — ne pas éditer.
// Source : packages/engine/src/boundary.ts

/**
 * GRYD — engine/boundary.ts
 * AMENDEMENT-17 §CHANTIER 2 — Boucle crew collaborative (« Ouvre une frontière.
 * Ton crew peut la fermer. »).
 *
 * Fonctions PURES : aucune I/O, aucune horloge, aucun accès réseau/DB. L'appelant
 * (ingest_run, digest_job) lit l'état, appelle ces fonctions, persiste. Tous les
 * seuils viennent de @klaim/shared/game-rules — AUCUN nombre magique ici. La
 * géométrie boucle/surface d'AMENDEMENT-12/§16 est RÉUTILISÉE telle quelle
 * (detectLoop, loopShapeVerdict, haversineM) : une frontière partielle n'est
 * qu'une boucle à laquelle il manque un morceau.
 *
 * Trois primitives :
 *  1. detectOpenBoundary(trace) — un run VALIDE, long, NON bouclé mais FERMABLE
 *     (les deux extrémités pourraient se rejoindre par un segment court
 *     raisonnable) → { openEnds, tracedLengthM, missingM, missingSegment } ;
 *     sinon null (couloir/boucle : rien à ouvrir).
 *  2. canComplete(boundary, newTrace, sameCrew) — le newTrace referme-t-il la
 *     frontière : connexion ≤ PARTIAL_JOIN_TOLERANCE_M aux DEUX bouts ouverts,
 *     MÊME crew, et contribution du finisher ≥ FINISHER_MIN_SEGMENT_M OU part
 *     ≥ FINISHER_MIN_SHARE → { completes, reason?, finisherLengthM }.
 *  3. contributionSplit(segments[]) — parts au prorata de validated_length_m
 *     (somme = 1).
 *
 * Le SERVEUR reste seul juge : ces fonctions décrivent la géométrie, l'appelant
 * applique l'anti-abus complet (segments GRYD Verified, TTL, rival → contested).
 */
import {
  FINISHER_MIN_SEGMENT_M,
  FINISHER_MIN_SHARE,
  LOOP_CLOSE_TOLERANCE_M,
  LOOP_MIN_PERIMETER_M,
  PARTIAL_JOIN_TOLERANCE_M,
} from '../game-rules.ts';
import type { BoundaryEnd, BoundarySegment } from '../types.ts';
import { haversineM } from './validation.ts';
import { detectLoop, type LatLngPoint, loopShapeVerdict } from './hexing.ts';

// Conversions d'unités — pas des règles de jeu.
const M2_PER_KM2 = 1_000_000;

/** Longueur (m) d'une polyligne (somme des segments consécutifs). PURE. */
function polylineLengthM(points: readonly LatLngPoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += haversineM(points[i - 1]!, points[i]!);
  return total;
}

/** Aire (m²) d'un anneau fermé (shoelace équirectangulaire, même approx que hexing). */
function ringAreaM2(points: readonly LatLngPoint[]): number {
  const first = points[0];
  if (first === undefined || points.length < 3) return 0;
  const RAD_PER_DEG = Math.PI / 180;
  const EARTH_RADIUS_M = 6_371_000;
  let latSum = 0;
  for (const p of points) latSum += p.lat;
  const cosLat0 = Math.cos((latSum / points.length) * RAD_PER_DEG);
  const x = (p: LatLngPoint): number =>
    (p.lng - first.lng) * RAD_PER_DEG * cosLat0 * EARTH_RADIUS_M;
  const y = (p: LatLngPoint): number => (p.lat - first.lat) * RAD_PER_DEG * EARTH_RADIUS_M;
  let doubled = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    doubled += x(a) * y(b) - x(b) * y(a);
  }
  return Math.abs(doubled) / 2;
}

// ─── 1. Détection d'ouverture de frontière ───────────────────────────────────

/** Frontière partielle détectée sur une trace fermable (géométrie serveur only). */
export interface OpenBoundary {
  /** Les deux bouts ouverts [départ, arrivée] du segment manquant. */
  openEnds: [BoundaryEnd, BoundaryEnd];
  /** Longueur (m) réellement courue par l'ouvreur (= sa contribution validée). */
  tracedLengthM: number;
  /** Mètres restants pour fermer la boucle (longueur du segment manquant). */
  missingM: number;
  /** Segment manquant [départ, arrivée] — identique à openEnds, nommé pour la DB. */
  missingSegment: [BoundaryEnd, BoundaryEnd];
  /** Aire estimée (km²) de la zone si la boucle est fermée (indicatif). */
  zoneEstimateKm2: number;
}

/**
 * Détecte une FRONTIÈRE OUVERTE sur une trace claimable (chantier 2). PURE.
 * La trace doit être :
 *  1. NON bouclée — detectLoop(trace) === null (une boucle fermée fait déjà la
 *     zone, il n'y a rien à « ouvrir ») ;
 *  2. FERMABLE — le POLYGONE complété par le segment de fermeture
 *     [dernier → premier point] passe les règles boucle réutilisées : périmètre
 *     complété ≥ LOOP_MIN_PERIMETER_M, aire ≥ ~1 zone (non dégénéré), et forme
 *     non étroite (loopShapeVerdict.ok — une frontière « couloir » plié en deux
 *     ne devient pas une zone) ;
 *  3. le trou est un VRAI manque : missingM > LOOP_CLOSE_TOLERANCE_M (sinon la
 *     trace serait déjà fermée par tolérance).
 * L'ouvreur a TOUJOURS couru la majorité du périmètre par construction : le
 * segment manquant est la CORDE départ→arrivée, or une corde est ≤ la longueur
 * de la polyligne qui joint ses extrémités (inégalité triangulaire) — donc
 * missingM ≤ tracedLengthM sans garde-fou explicite. Les formes dégénérées
 * (arc quasi rectiligne dont la corde referme un sliver) sont écartées par le
 * périmètre minimal + l'aire + loopShapeVerdict, comme pour une boucle.
 * Retourne la frontière, ou null (couloir/boucle : rien à ouvrir).
 *
 * NB géométrie : l'appelant ne fournit QUE des traces claimables CONTIGUËS
 * (loopTracePoints, comme pour la boucle) — un run `partial` aux segments exclus
 * (voiture, allure hors bornes) ne peut pas ouvrir de frontière, exactement
 * comme il ne peut pas fermer de boucle (l'aire d'un tronçon non couru serait
 * enfermée). Le seuil GRYD Verified est appliqué par l'appelant (anti-abus).
 */
export function detectOpenBoundary(trace: readonly LatLngPoint[]): OpenBoundary | null {
  if (trace.length < 3) return null; // pas de polygone possible
  // 1. Déjà une boucle fermée → rien à ouvrir (c'est une zone, pas une frontière).
  if (detectLoop(trace) !== null) return null;

  const start = trace[0]!;
  const end = trace[trace.length - 1]!;
  const missingM = haversineM(start, end);

  // 3a. Trou trop petit : la trace se refermerait par tolérance (mais detectLoop
  // a dit non → aire dégénérée/périmètre court) — dans tous les cas, pas une
  // frontière ouverte exploitable.
  if (missingM <= LOOP_CLOSE_TOLERANCE_M) return null;

  const tracedLengthM = polylineLengthM(trace);

  // 2. Le polygone COMPLÉTÉ (trace + fermeture implicite dernier→premier) doit
  //    passer les règles boucle réutilisées. L'anneau = les points de la trace
  //    (la fermeture est implicite dans ringArea/loopShapeVerdict).
  const completedPerimeterM = tracedLengthM + missingM;
  if (completedPerimeterM < LOOP_MIN_PERIMETER_M) return null;
  const areaM2 = ringAreaM2(trace);
  const shape = loopShapeVerdict({ areaM2, perimeterM: completedPerimeterM });
  if (!shape.ok) return null; // forme trop étroite → pas une vraie zone à fermer

  const openEnds: [BoundaryEnd, BoundaryEnd] = [
    { lat: start.lat, lng: start.lng },
    { lat: end.lat, lng: end.lng },
  ];
  return {
    openEnds,
    tracedLengthM,
    missingM,
    missingSegment: openEnds,
    zoneEstimateKm2: areaM2 / M2_PER_KM2,
  };
}

// ─── 2. Complétion par un membre du crew ─────────────────────────────────────

/** Raison d'un refus de complétion (chantier 2, message doux côté appelant). */
export type BoundaryCompleteReason =
  | 'rival' // pas le même crew : un rival ne complète jamais au MVP (→ contested)
  | 'not_connected' // le run ne rejoint pas les deux bouts ouverts (≤ tolérance)
  | 'finisher_too_short'; // contribution du finisher sous le minimum (segment ET part)

/** Verdict de complétion d'une frontière par un run de finisher. */
export interface BoundaryCompleteVerdict {
  completes: boolean;
  reason?: BoundaryCompleteReason;
  /** Longueur (m) réellement courue par le finisher sur le segment manquant. */
  finisherLengthM: number;
}

/** Distance minimale (m) d'un bout ouvert à la trace du finisher. PURE. */
function minDistanceToTrace(end: BoundaryEnd, trace: readonly LatLngPoint[]): number {
  let best = Infinity;
  for (const p of trace) {
    const d = haversineM(end, p);
    if (d < best) best = d;
  }
  return best;
}

/**
 * Le `newTrace` d'un membre referme-t-il la frontière `boundary` (chantier 2) ?
 * PURE. Trois conditions, dans l'ordre :
 *  1. `sameCrew` — seul le MÊME crew complète au MVP (un rival qui chevauche →
 *     contested, décidé par l'appelant) → reason='rival' sinon ;
 *  2. CONNEXION : le newTrace passe à ≤ PARTIAL_JOIN_TOLERANCE_M de CHACUN des
 *     deux bouts ouverts (il couvre bien le trou, pas un seul côté) →
 *     reason='not_connected' sinon ;
 *  3. CONTRIBUTION du finisher : la longueur courue sur le segment manquant
 *     (approx MVP = min(longueur du newTrace, missingM restant) — le finisher
 *     ne peut pas contribuer plus que le trou) est ≥ FINISHER_MIN_SEGMENT_M, OU
 *     sa PART ≥ FINISHER_MIN_SHARE de la frontière totale
 *     (finisher / (total frontière + finisher)) → reason='finisher_too_short'
 *     sinon. Anti-abus « je ferme la zone d'un autre en courant 20 m ».
 * Le seuil GRYD Verified du newTrace et le TTL sont vérifiés par l'appelant.
 */
export function canComplete(
  boundary: Pick<OpenBoundary, 'openEnds' | 'missingM'> & { totalLengthM: number },
  newTrace: readonly LatLngPoint[],
  sameCrew: boolean,
): BoundaryCompleteVerdict {
  if (!sameCrew) return { completes: false, reason: 'rival', finisherLengthM: 0 };
  if (newTrace.length < 2) {
    return { completes: false, reason: 'not_connected', finisherLengthM: 0 };
  }

  const [endA, endB] = boundary.openEnds;
  const nearA = minDistanceToTrace(endA, newTrace) <= PARTIAL_JOIN_TOLERANCE_M;
  const nearB = minDistanceToTrace(endB, newTrace) <= PARTIAL_JOIN_TOLERANCE_M;
  if (!nearA || !nearB) {
    return { completes: false, reason: 'not_connected', finisherLengthM: 0 };
  }

  // Contribution du finisher : bornée par le trou (il ne peut pas apporter plus
  // que le segment manquant — le reste de son run est du couloir hors frontière).
  const finisherLengthM = Math.min(polylineLengthM(newTrace), boundary.missingM);
  const total = boundary.totalLengthM + finisherLengthM;
  const share = total > 0 ? finisherLengthM / total : 0;
  const enough = finisherLengthM >= FINISHER_MIN_SEGMENT_M || share >= FINISHER_MIN_SHARE;
  if (!enough) {
    return { completes: false, reason: 'finisher_too_short', finisherLengthM };
  }
  return { completes: true, finisherLengthM };
}

// ─── 3. Répartition des contributions ────────────────────────────────────────

/** Part d'un membre dans une frontière fermée (répartition au prorata). */
export interface ContributionShare {
  userId: string;
  /** Part 0-1 au prorata de validated_length_m (somme = 1 sur la frontière). */
  share: number;
}

/**
 * Répartit les parts d'une frontière fermée au PRORATA de la longueur validée
 * de chaque contribution (chantier 2). PURE. La somme des parts vaut EXACTEMENT
 * 1 (le résidu d'arrondi va au plus gros contributeur — jamais de perte, jamais
 * de somme ≠ 1). Longueur totale nulle (cas dégénéré) → parts égales. Plusieurs
 * segments d'un même membre sont agrégés (un membre = une part).
 *
 * NB : on ne renvoie PAS de pourcentage arrondi — l'appelant formate « 79 % /
 * 21 % » à l'affichage ; ici la part est exacte pour créditer points/zone.
 */
export function contributionSplit(
  segments: readonly BoundarySegment[],
): ContributionShare[] {
  if (segments.length === 0) return [];

  // Agrégation par membre (un membre = une part, même s'il a plusieurs segments).
  const byUser = new Map<string, number>();
  for (const seg of segments) {
    const len = Math.max(0, seg.validatedLengthM);
    byUser.set(seg.userId, (byUser.get(seg.userId) ?? 0) + len);
  }
  const entries = [...byUser.entries()];
  const total = entries.reduce((s, [, len]) => s + len, 0);

  // Cas dégénéré (toutes longueurs nulles) : parts égales.
  if (total <= 0) {
    const equal = 1 / entries.length;
    return entries.map(([userId]) => ({ userId, share: equal }));
  }

  const shares = entries.map(([userId, len]) => ({ userId, share: len / total }));
  // Résidu d'arrondi : la somme flottante peut valoir 0.9999… — on force la
  // somme à 1 en versant l'écart au plus gros contributeur (part la plus grande).
  const sum = shares.reduce((s, c) => s + c.share, 0);
  const residual = 1 - sum;
  if (residual !== 0) {
    let maxIdx = 0;
    for (let i = 1; i < shares.length; i++) if (shares[i]!.share > shares[maxIdx]!.share) maxIdx = i;
    shares[maxIdx]!.share += residual;
  }
  return shares;
}
