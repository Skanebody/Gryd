/**
 * GRYD — engine/gps.ts
 * Moteur GPS pur (AMENDEMENT-15 §1) : pipeline de nettoyage IDENTIQUE
 * client/serveur. Le client pré-filtre pour l'affichage (jauge, pause auto,
 * distance live) ; le serveur reste SEUL juge du claim — les règles §3.2 de
 * validation.ts (filterPoints/computeStats/validateRun) sont INCHANGÉES.
 *
 * Fonctions PURES : aucune I/O, aucune horloge, aucun accès capteur.
 * Toutes les constantes de jeu viennent de @klaim/shared/game-rules ; les
 * bornes de vitesse course RÉUTILISENT §3.2 (POINT_MAX_SPEED_KMH vitesse
 * implicite max, POINT_MAX_JUMP_M téléportation, POINT_MAX_ACCURACY_M seuil
 * « signal faible ») — aucun doublon.
 *
 * Pipeline nominal côté client :
 *   cleanTrace → smoothTrace → detectPauses → totalDistanceM (affichage live)
 *   → decimateForPayload → rawFixesToRunPoints → IngestRunRequest.points
 *   + gpsTrustScore (jauge en course, envoyé au serveur : IngestRunRequest.gpsTrust)
 *   + signalState (états honnêtes : ok / weak / lost).
 */
import {
  GPS_ACCURACY_GOOD_M,
  GPS_ACCURACY_MAX_M,
  GPS_DECIMATE_EPSILON_M,
  GPS_JITTER_RADIUS_M,
  GPS_MAX_PAYLOAD_POINTS,
  GPS_MEDIAN_WINDOW,
  GPS_PAUSE_AFTER_S,
  GPS_PAUSE_SPEED_MS,
  GPS_REANCHOR_AFTER_REJECTS,
  GPS_SIGNAL_LOST_AFTER_S,
  GPS_SIGNAL_WEAK_AFTER_S,
  GPS_TRUST_OUTLIER_BAD_RATIO,
  GPS_TRUST_WEIGHTS,
  POINT_MAX_ACCURACY_M,
  POINT_MAX_JUMP_M,
  POINT_MAX_SPEED_KMH,
} from '@klaim/shared/game-rules';
import type { RunPoint } from '@klaim/shared/types';
import { haversineM } from './validation.ts';

// Constantes physiques / d'unités — pas des règles de jeu.
const MS_PER_S = 1_000;
const KMH_PER_M_S = 3.6;
/** ~π/180 × rayon terrestre : mètres par degré de latitude (projection locale). */
const M_PER_DEG = 111_195;
/** Vitesse implicite maximale (m/s) — RÉUTILISE la borne course §3.2 (25 km/h). */
const RUN_MAX_SPEED_MS = POINT_MAX_SPEED_KMH / KMH_PER_M_S;

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));

// ─── Types ───────────────────────────────────────────────────────────────────

/** Fix GPS brut reçu du capteur (expo-location, montre, simulation). */
export interface RawFix {
  lat: number;
  lng: number;
  /** Timestamp epoch ms. */
  ts: number;
  /** Précision horizontale en mètres (obligatoire : la jauge et le trust en vivent). */
  accuracy: number;
  /** Vitesse capteur (m/s) si fournie — informative, JAMAIS source de vérité. */
  speed?: number;
}

/**
 * Fix conservé par cleanTrace. `gapBefore` marque une DISCONTINUITÉ avec le
 * point précédent (trou de signal > GPS_SIGNAL_LOST_AFTER_S, ou re-ancrage
 * après relock GPS) : la distance ne se cumule JAMAIS à travers (pas de faux
 * kilomètres en sortie de tunnel).
 */
export interface CleanFix extends RawFix {
  gapBefore?: true;
}

export type GpsRejectReason =
  | 'invalid' // champ non fini (NaN/Infinity) — échantillon malformé
  | 'accuracy' // accuracy > GPS_ACCURACY_MAX_M
  | 'timestamp' // dupliqué / désordonné (dt ≤ 0)
  | 'speed' // vitesse implicite > borne course §3.2 (POINT_MAX_SPEED_KMH)
  | 'teleport' // saut spatial > POINT_MAX_JUMP_M en un intervalle court
  | 'jitter'; // dérive en immobilité (intérieur d'un cluster stationnaire)

export interface CleanTraceResult {
  /** Points conservés, triés par ts, discontinuités marquées via gapBefore. */
  points: CleanFix[];
  /** Nombre de fixes reçus (avant nettoyage). */
  totalFixes: number;
  /** Compteurs de rejet par raison (alimente gpsTrustScore). */
  rejected: Record<GpsRejectReason, number>;
}

/** Segment de pause auto (vitesse < GPS_PAUSE_SPEED_MS pendant ≥ GPS_PAUSE_AFTER_S). */
export interface PauseInterval {
  /** epoch ms. */
  startTs: number;
  /** epoch ms. */
  endTs: number;
  durationS: number;
}

export type GpsSignalState = 'ok' | 'weak' | 'lost';

// ─── cleanTrace : rejet d'outliers ──────────────────────────────────────────

/**
 * Nettoie une trace brute (ordre d'application) :
 *  1. champs non finis → 'invalid' ; accuracy > GPS_ACCURACY_MAX_M → 'accuracy' ;
 *  2. dt ≤ 0 (dupliqué/désordonné après tri) → 'timestamp' ;
 *  3. saut > POINT_MAX_JUMP_M en < GPS_SIGNAL_LOST_AFTER_S → 'teleport' ;
 *     vitesse implicite > POINT_MAX_SPEED_KMH (§3.2) → 'speed'.
 *     Après GPS_REANCHOR_AFTER_REJECTS rejets consécutifs contre la même
 *     ancre (relock GPS permanent, démarrage à froid), le point suivant est
 *     accepté comme NOUVELLE ancre avec gapBefore (distance non comptée) ;
 *  4. trou temporel > GPS_SIGNAL_LOST_AFTER_S à vitesse plausible → point
 *     gardé avec gapBefore (tunnel : reprise sans faux kilomètres) ;
 *  5. jitter immobile : fixes restant dans GPS_JITTER_RADIUS_M de l'ancre
 *     pendant ≥ GPS_PAUSE_AFTER_S → seuls l'entrée et la sortie du cluster
 *     sont gardées ('jitter' pour les intérieurs — aucun faux mètre au feu
 *     rouge, detectPauses retrouve la pause sur la paire entrée→sortie).
 */
export function cleanTrace(fixes: readonly RawFix[]): CleanTraceResult {
  const rejected: Record<GpsRejectReason, number> = {
    invalid: 0,
    accuracy: 0,
    timestamp: 0,
    speed: 0,
    teleport: 0,
    jitter: 0,
  };
  const sorted = [...fixes].sort((a, b) => a.ts - b.ts);
  const kept: CleanFix[] = [];
  let consecutiveRejects = 0;

  for (const f of sorted) {
    if (
      !Number.isFinite(f.lat) || !Number.isFinite(f.lng) ||
      !Number.isFinite(f.ts) || !Number.isFinite(f.accuracy)
    ) {
      rejected.invalid++;
      continue;
    }
    if (f.accuracy > GPS_ACCURACY_MAX_M) {
      rejected.accuracy++;
      continue;
    }
    const last = kept[kept.length - 1];
    if (last === undefined) {
      kept.push({ ...f });
      continue;
    }
    const dtS = (f.ts - last.ts) / MS_PER_S;
    if (dtS <= 0) {
      rejected.timestamp++;
      continue;
    }
    const dM = haversineM(last, f);
    const vMs = dM / dtS;
    const gap = dtS > GPS_SIGNAL_LOST_AFTER_S;
    // Téléportation / vitesse implausible (bornes §3.2). À travers un trou de
    // signal, seul le critère vitesse joue (une vraie traversée de tunnel
    // avance de plusieurs centaines de mètres à vitesse de course plausible).
    const impossible = gap ? vMs > RUN_MAX_SPEED_MS : dM > POINT_MAX_JUMP_M || vMs > RUN_MAX_SPEED_MS;
    if (impossible) {
      if (consecutiveRejects >= GPS_REANCHOR_AFTER_REJECTS) {
        // Relock permanent : ré-ancrage ici, discontinuité marquée.
        kept.push({ ...f, gapBefore: true });
        consecutiveRejects = 0;
      } else {
        consecutiveRejects++;
        if (dM > POINT_MAX_JUMP_M) rejected.teleport++;
        else rejected.speed++;
      }
      continue;
    }
    consecutiveRejects = 0;
    kept.push(gap ? { ...f, gapBefore: true } : { ...f });
  }

  return { points: dropStationaryJitter(kept, rejected), totalFixes: fixes.length, rejected };
}

/**
 * Passe jitter (étape 5 de cleanTrace) : collapse les clusters stationnaires.
 * Un cluster = suite de fixes restant dans GPS_JITTER_RADIUS_M de son premier
 * point (l'ancre), sans discontinuité. S'il dure ≥ GPS_PAUSE_AFTER_S, ses
 * points INTÉRIEURS sont rejetés ('jitter') — l'entrée et la sortie restent,
 * la chronologie est préservée pour detectPauses. Un cluster court (< N s)
 * est du vrai déplacement lent : tout est gardé (aucun virage coupé).
 */
function dropStationaryJitter(
  kept: readonly CleanFix[],
  rejected: Record<GpsRejectReason, number>,
): CleanFix[] {
  if (kept.length < 3) return [...kept];
  const out: CleanFix[] = [];
  let a = 0;
  while (a < kept.length) {
    const anchor = kept[a]!;
    let end = a;
    for (let i = a + 1; i < kept.length; i++) {
      const p = kept[i]!;
      if (p.gapBefore) break;
      if (haversineM(anchor, p) > GPS_JITTER_RADIUS_M) break;
      end = i;
    }
    out.push(anchor);
    if (end > a) {
      const durS = (kept[end]!.ts - anchor.ts) / MS_PER_S;
      if (durS >= GPS_PAUSE_AFTER_S && end - a >= 2) {
        rejected.jitter += end - a - 1;
        out.push(kept[end]!);
      } else {
        for (let k = a + 1; k <= end; k++) out.push(kept[k]!);
      }
    }
    a = end + 1;
  }
  return out;
}

// ─── smoothTrace : médiane glissante + pondération accuracy ─────────────────

const median = (values: number[]): number => {
  const s = [...values].sort((x, y) => x - y);
  const mid = s.length >> 1;
  return s.length % 2 === 1 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
};

/**
 * Lissage doux : médiane glissante (fenêtre GPS_MEDIAN_WINDOW, composante par
 * composante) MÉLANGÉE au point brut selon son accuracy — un fix précis reste
 * quasi intact (les virages à 90° sont préservés), un fix douteux est tiré
 * vers la médiane locale. Jamais de lissage à travers une discontinuité
 * (gapBefore) : chaque tronçon est lissé séparément. ts/accuracy inchangés.
 */
export function smoothTrace(points: readonly CleanFix[]): CleanFix[] {
  const half = (GPS_MEDIAN_WINDOW - 1) >> 1;
  const out: CleanFix[] = [];
  for (const seg of splitAtGaps(points)) {
    for (let i = 0; i < seg.length; i++) {
      const p = seg[i]!;
      const from = Math.max(0, i - half);
      const to = Math.min(seg.length - 1, i + half);
      const lats: number[] = [];
      const lngs: number[] = [];
      for (let k = from; k <= to; k++) {
        lats.push(seg[k]!.lat);
        lngs.push(seg[k]!.lng);
      }
      // Poids du rappel vers la médiane : 0 (fix parfait) → 1 (accuracy au max).
      const w = clamp01(p.accuracy / GPS_ACCURACY_MAX_M);
      out.push({
        ...p,
        lat: p.lat + (median(lats) - p.lat) * w,
        lng: p.lng + (median(lngs) - p.lng) * w,
      });
    }
  }
  return out;
}

// ─── detectPauses : pause auto (feu rouge, lacet, photo) ────────────────────

/**
 * Détecte les segments de pause : vitesse NETTE (déplacement fenêtré sur au
 * moins GPS_PAUSE_AFTER_S — le bruit GPS en marche aléatoire s'annule) sous
 * GPS_PAUSE_SPEED_MS. Fonctionne aussi sur une trace dont cleanTrace a
 * collapsé les clusters stationnaires (la paire entrée→sortie suffit).
 * Les intervalles qui se chevauchent sont fusionnés ; jamais de fenêtre à
 * travers une discontinuité (gapBefore). Durées ≥ GPS_PAUSE_AFTER_S garanties.
 */
export function detectPauses(points: readonly CleanFix[]): PauseInterval[] {
  const pauseMs = GPS_PAUSE_AFTER_S * MS_PER_S;
  const merged: { startTs: number; endTs: number }[] = [];
  let segStart = 0;
  let k = 0;
  for (let i = 1; i < points.length; i++) {
    const p = points[i]!;
    if (p.gapBefore) {
      segStart = i;
      k = i;
      continue;
    }
    if (k < segStart) k = segStart;
    // k = dernier indice (≥ début de tronçon) avec ts ≤ ts_i − GPS_PAUSE_AFTER_S.
    while (k + 1 <= i - 1 && points[k + 1]!.ts <= p.ts - pauseMs) k++;
    const w = points[k]!;
    if (w.ts > p.ts - pauseMs) continue; // fenêtre encore trop courte
    const spanS = (p.ts - w.ts) / MS_PER_S;
    const dM = haversineM(w, p);
    // 2 × GPS_JITTER_RADIUS_M = diamètre max d'un cluster stationnaire — évite
    // d'étirer la fin de pause dans la reprise de course.
    if (dM / spanS < GPS_PAUSE_SPEED_MS && dM <= 2 * GPS_JITTER_RADIUS_M) {
      const last = merged[merged.length - 1];
      if (last !== undefined && w.ts <= last.endTs) last.endTs = Math.max(last.endTs, p.ts);
      else merged.push({ startTs: w.ts, endTs: p.ts });
    }
  }
  return merged.map((m) => ({ ...m, durationS: (m.endTs - m.startTs) / MS_PER_S }));
}

// ─── totalDistanceM : haversine hors pauses et hors trous ───────────────────

/**
 * Distance cumulée (m) sur points VALIDES uniquement (sortie de cleanTrace,
 * lissée ou décimée) : haversine par paire consécutive, en sautant les
 * discontinuités (gapBefore — jamais de faux kilomètres de tunnel/relock) et
 * les paires entièrement contenues dans un segment de pause (la dérive à
 * l'arrêt ne compte pas). Les flags font foi : pas de garde sur dt, une trace
 * décimée espace légitimement ses points de plusieurs dizaines de secondes.
 */
export function totalDistanceM(
  points: readonly CleanFix[],
  pauses: readonly PauseInterval[] = [],
): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    if (b.gapBefore) continue;
    if (pauses.some((p) => a.ts >= p.startTs && b.ts <= p.endTs)) continue;
    total += haversineM(a, b);
  }
  return total;
}

// ─── decimateForPayload : Douglas-Peucker léger + plafond ───────────────────

/** Tronçons continus (coupés aux discontinuités gapBefore, flag conservé en tête). */
function splitAtGaps(points: readonly CleanFix[]): CleanFix[][] {
  const segs: CleanFix[][] = [];
  let cur: CleanFix[] = [];
  for (const p of points) {
    if (p.gapBefore === true && cur.length > 0) {
      segs.push(cur);
      cur = [];
    }
    cur.push(p);
  }
  if (cur.length > 0) segs.push(cur);
  return segs;
}

/** Douglas-Peucker itératif (indices gardés) — distance au SEGMENT en mètres,
 * projection équirectangulaire locale (exacte à l'échelle d'une course). */
function douglasPeucker(seg: readonly CleanFix[], epsilonM: number): number[] {
  const n = seg.length;
  if (n <= 2) return seg.map((_, i) => i);
  const ref = seg[0]!;
  const cosLat = Math.cos((ref.lat * Math.PI) / 180);
  const xy = seg.map((p) => ({
    x: (p.lng - ref.lng) * M_PER_DEG * cosLat,
    y: (p.lat - ref.lat) * M_PER_DEG,
  }));
  const keep = new Array<boolean>(n).fill(false);
  keep[0] = true;
  keep[n - 1] = true;
  const stack: [number, number][] = [[0, n - 1]];
  while (stack.length > 0) {
    const [a, b] = stack.pop()!;
    if (b - a < 2) continue;
    const pa = xy[a]!;
    const pb = xy[b]!;
    const dx = pb.x - pa.x;
    const dy = pb.y - pa.y;
    const len2 = dx * dx + dy * dy;
    let iMax = -1;
    let dMax = epsilonM;
    for (let i = a + 1; i < b; i++) {
      const p = xy[i]!;
      const t = len2 > 0 ? clamp01(((p.x - pa.x) * dx + (p.y - pa.y) * dy) / len2) : 0;
      const d = Math.hypot(p.x - (pa.x + t * dx), p.y - (pa.y + t * dy));
      if (d > dMax) {
        dMax = d;
        iMax = i;
      }
    }
    if (iMax >= 0) {
      keep[iMax] = true;
      stack.push([a, iMax], [iMax, b]);
    }
  }
  const out: number[] = [];
  for (let i = 0; i < n; i++) if (keep[i]) out.push(i);
  return out;
}

/** Ré-insère des points d'origine pour qu'aucune corde décimée ne dépasse
 * POINT_MAX_JUMP_M — sinon filterPoints (§3.2, serveur) couperait le segment
 * et perdrait la distance. Toujours possible : la trace nettoyée n'a que des
 * pas ≤ POINT_MAX_JUMP_M hors discontinuités. */
function subdivideChord(seg: readonly CleanFix[], a: number, b: number, out: number[]): void {
  if (b - a <= 1 || haversineM(seg[a]!, seg[b]!) <= POINT_MAX_JUMP_M) return;
  const mid = (a + b) >> 1;
  subdivideChord(seg, a, mid, out);
  out.push(mid);
  subdivideChord(seg, mid, b, out);
}

/** Échantillonnage régulier d'un tronçon en gardant premier et dernier points. */
function thinSegment(seg: readonly CleanFix[], budget: number): CleanFix[] {
  if (seg.length <= budget) return [...seg];
  if (seg.length === 1) return [...seg];
  if (budget <= 2) return [seg[0]!, seg[seg.length - 1]!];
  const out: CleanFix[] = [];
  const step = (seg.length - 1) / (budget - 1);
  let prev = -1;
  for (let i = 0; i < budget; i++) {
    const idx = Math.round(i * step);
    if (idx !== prev) out.push(seg[idx]!);
    prev = idx;
  }
  return out;
}

/**
 * Décimation avant envoi à ingest_run : Douglas-Peucker léger
 * (GPS_DECIMATE_EPSILON_M, sous le bruit GPS — la forme ne bouge pas), corde
 * maximale re-bornée à POINT_MAX_JUMP_M (§3.2), puis plafond dur
 * GPS_MAX_PAYLOAD_POINTS par échantillonnage régulier proportionnel par
 * tronçon (extrémités et discontinuités toujours conservées).
 */
export function decimateForPayload(
  points: readonly CleanFix[],
  maxPoints: number = GPS_MAX_PAYLOAD_POINTS,
): CleanFix[] {
  if (points.length === 0) return [];
  const segs = splitAtGaps(points).map((seg) => {
    if (seg.length <= 2) return [...seg];
    const keptIdx = douglasPeucker(seg, GPS_DECIMATE_EPSILON_M);
    const bounded: number[] = [];
    for (let k = 0; k < keptIdx.length - 1; k++) {
      bounded.push(keptIdx[k]!);
      subdivideChord(seg, keptIdx[k]!, keptIdx[k + 1]!, bounded);
    }
    bounded.push(keptIdx[keptIdx.length - 1]!);
    return bounded.map((i) => seg[i]!);
  });

  const total = segs.reduce((n, s) => n + s.length, 0);
  if (total <= maxPoints) return segs.flat();

  // Plafond : budget proportionnel par tronçon (minimum 2), rogné au plafond.
  const budgets = segs.map((s) => Math.max(2, Math.min(s.length, Math.floor((s.length / total) * maxPoints))));
  let sum = budgets.reduce((x, y) => x + y, 0);
  while (sum > maxPoints) {
    let iMax = 0;
    for (let i = 1; i < budgets.length; i++) if (budgets[i]! > budgets[iMax]!) iMax = i;
    if (budgets[iMax]! <= 2) break; // plancher partout (trace pathologique à > max/2 discontinuités)
    budgets[iMax] = budgets[iMax]! - 1;
    sum--;
  }
  let out = segs.flatMap((s, i) => thinSegment(s, budgets[i]!));
  // Garantie dure résiduelle (pathologique uniquement).
  if (out.length > maxPoints) out = thinSegment(out, maxPoints);
  return out;
}

// ─── gpsTrustScore : jauge 0-100 (jamais un jugement, un état honnête) ───────

/**
 * Score de confiance GPS 0-100, pondéré par GPS_TRUST_WEIGHTS :
 *  - accuracy : précision moyenne des points GARDÉS — 1 à GPS_ACCURACY_GOOD_M,
 *    0 à GPS_ACCURACY_MAX_M (linéaire) ;
 *  - signal   : 1 − part du temps passé en VRAI trou de signal (paires
 *    gapBefore posées par cleanTrace) sur la durée totale — une pause au feu
 *    rouge collapsée par le filtre jitter n'est PAS une perte de signal
 *    (s'arrêter n'est jamais suspect, anti-shame) ;
 *  - outliers : 1 − ratio de points rejetés (invalid/accuracy/timestamp/
 *    speed/teleport — le jitter d'ARRÊT est exclu : s'arrêter au feu n'est
 *    pas suspect) rapporté à GPS_TRUST_OUTLIER_BAD_RATIO.
 * Trace vide ou mono-point → 0 (aucune confiance mesurable).
 */
export function gpsTrustScore(clean: CleanTraceResult): number {
  const pts = clean.points;
  if (pts.length < 2 || clean.totalFixes === 0) return 0;

  const meanAcc = pts.reduce((s, p) => s + p.accuracy, 0) / pts.length;
  const accuracyScore = clamp01(
    (GPS_ACCURACY_MAX_M - meanAcc) / (GPS_ACCURACY_MAX_M - GPS_ACCURACY_GOOD_M),
  );

  const elapsedMs = Math.max(1, pts[pts.length - 1]!.ts - pts[0]!.ts);
  let lostMs = 0;
  for (let i = 1; i < pts.length; i++) {
    if (pts[i]!.gapBefore === true) lostMs += pts[i]!.ts - pts[i - 1]!.ts;
  }
  const signalScore = 1 - clamp01(lostMs / elapsedMs);

  const r = clean.rejected;
  const outliers = r.invalid + r.accuracy + r.timestamp + r.speed + r.teleport;
  const outlierScore = 1 - clamp01(outliers / clean.totalFixes / GPS_TRUST_OUTLIER_BAD_RATIO);

  const score = GPS_TRUST_WEIGHTS.accuracy * accuracyScore +
    GPS_TRUST_WEIGHTS.signal * signalScore +
    GPS_TRUST_WEIGHTS.outliers * outlierScore;
  return Math.round(100 * clamp01(score));
}

// ─── signalState : ok | weak | lost (états réels en course) ─────────────────

/**
 * État du signal pour la jauge en course (états honnêtes, GO-first : informer,
 * jamais bloquer) :
 *  - lost : aucun fix, fix plus vieux que GPS_SIGNAL_LOST_AFTER_S, ou fix
 *    inutilisable (accuracy > GPS_ACCURACY_MAX_M — rejeté par cleanTrace) ;
 *  - weak : fix plus vieux que GPS_SIGNAL_WEAK_AFTER_S, ou accuracy au-dessus
 *    du filtre de claim §3.2 (POINT_MAX_ACCURACY_M) ;
 *  - ok   : fix frais et précis.
 */
export function signalState(
  nowTs: number,
  lastFix?: Pick<RawFix, 'ts' | 'accuracy'> | null,
): GpsSignalState {
  if (lastFix === undefined || lastFix === null) return 'lost';
  const ageMs = nowTs - lastFix.ts;
  if (ageMs > GPS_SIGNAL_LOST_AFTER_S * MS_PER_S) return 'lost';
  if (lastFix.accuracy > GPS_ACCURACY_MAX_M) return 'lost';
  if (ageMs > GPS_SIGNAL_WEAK_AFTER_S * MS_PER_S) return 'weak';
  if (lastFix.accuracy > POINT_MAX_ACCURACY_M) return 'weak';
  return 'ok';
}

// ─── Pont vers le contrat ingest_run ─────────────────────────────────────────

/** RawFix/CleanFix → RunPoint (types.ts) : { lat, lng, ts→t, accuracy→acc }.
 * À appeler sur la trace nettoyée + décimée — le serveur reste seul juge. */
export function rawFixesToRunPoints(fixes: readonly RawFix[]): RunPoint[] {
  return fixes.map((f) => ({ lat: f.lat, lng: f.lng, t: f.ts, acc: f.accuracy }));
}
