// GÉNÉRÉ par scripts/sync-game-rules.mjs — ne pas éditer.
// Source : packages/engine/src/capture2026.ts

/**
 * GRYD — moteur de capture, refonte septembre 2026 (cahier §5.4/§5.5).
 * Faces PHYSIQUES d'une trace. Ni H3, ni tampon, ni enveloppe convexe.
 *
 * ─── INVARIANTS (chacun a son test dans capture2026.test.ts) ───────────────
 *  I1. Aucun segment imaginé ne sert de frontière (§5.5 règle 1). Une frontière
 *      est coupée par une pause explicite du recorder, une horloge qui recule,
 *      un silence > `pointMaxGapS` ou un déplacement plus rapide que la
 *      discipline — jamais par un simple point imprécis.
 *  I2. Un point trop incertain (`acc` absente, négative ou > GPS_ACCURACY_MAX_M)
 *      n'est pas un SOMMET de frontière : il est ÉCARTÉ, il ne coupe pas. Le
 *      client garde ces points à l'écran (continuité visuelle) ; le serveur
 *      refuse seulement de dessiner un polygone avec.
 *  I3. La précision `endpointMaxAccuracyM` n'est exigée qu'AUX EXTRÉMITÉS d'une
 *      fermeture DÉCLARÉE par proximité — §5.5 : « Ne pas déclarer une
 *      fermeture sur des points très incertains ». Une auto-intersection
 *      réellement observée ne déclare rien : les deux segments se croisent.
 *  I4. Le sport survit toujours à la géométrie (§5.5 règle 8) : distance, durée
 *      et intervalles de mouvement se calculent sur TOUS les points reçus, y
 *      compris ceux qui n'ont pas le droit de porter une frontière.
 *  I5. Une seule notion de trou dans tout le dépôt : `pointMaxGapS`
 *      (= POINT_MAX_GAP_S), la même que `validation.ts`. Un tunnel ou une veille
 *      iOS de 90 s ne détruit pas une boucle.
 *  I6. Tout refus porte un identifiant STABLE et les données qui l'expliquent au
 *      joueur (mètres manquants, précision observée, écart au départ).
 *      Les formulations sont celles du cahier §5.5, au mot près.
 *  I7. Aucune constante de jeu ici : tout vient de @klaim/shared/game-rules
 *      (ADR-003). Seules les tolérances numériques pures restent locales.
 */
import {
  activityRules, GPS_ACCURACY_MAX_M, TERRITORY_RULES_2026, type Activity,
} from '../game-rules.ts';
import type { RunPoint } from '../types.ts';
import { polygonAreaM2, normalizeRing, toGeoJsonPolygon, type GeoJsonPolygon } from './polygon.ts';
import { haversineM } from './validation.ts';

export interface PhysicalFace2026 {
  key: string;
  geometry: GeoJsonPolygon;
  closedAt: string;
  lengthM: number;
  areaM2: number;
  closureConnector?: { type: 'LineString'; coordinates: number[][] };
}
export interface TraceAnalysis2026 {
  segments: RunPoint[][];
  faces: PhysicalFace2026[];
  distanceM: number;
  movingIntervals: { start: string; end: string }[];
  durationS: number;
  /** Coupures RÉELLES de frontière (I1) : pause, horloge, silence, téléportation. */
  qualityBreaks: number;
  /** Points écartés comme sommets (I2). Ne coupent rien ; comptés, jamais cachés. */
  droppedImprecisePoints: number;
  /** Fermetures de proximité refusées faute de précision aux extrémités (I3). */
  unconfirmedClosures: number;
  /** Meilleure précision observée aux extrémités d'une fermeture refusée (m). */
  observedEndpointAccuracyM: number | null;
  rejectedSmallLoops: number;
  /** La plus grande boucle fermée mais refusée sur les seuils (pour l'expliquer). */
  bestRejectedLoop: { lengthM: number; areaM2: number } | null;
  /**
   * Écart entre le premier et le dernier point LOCALISABLE (m) : « es-tu revenu
   * à ton point de départ ? ». Mesuré sur la trace SPORTIVE (I4), pas sur les
   * seuls sommets de frontière — sinon une trace sans précision connue
   * répondrait « tu n'as pas bouclé » alors qu'elle a bouclé sans le prouver.
   */
  closureGapM: number | null;
}

/**
 * Motifs de refus de capture — §5.5, formulations EXACTES du cahier.
 * Les identifiants sont le contrat stable (base, Edge, client) ; le texte est la
 * référence à laquelle toute traduction doit rester fidèle.
 */
export const CAPTURE_REASON_TEXT_2026 = {
  no_admissible_loop: 'La trace ne forme pas de boucle complète',
  loop_too_small: 'Cette boucle est trop petite pour le terrain partagé',
  gps_quality_unconfirmed: 'La précision GPS ne permet pas de confirmer cette zone',
} as const satisfies Record<string, string>;
/** §5.5 : « Ajouter : "Ta sortie est enregistrée." » — jamais un échec sportif. */
export const CAPTURE_REASON_SUFFIX_2026 = 'Ta sortie est enregistrée.';

export type CaptureRejectCode2026 = keyof typeof CAPTURE_REASON_TEXT_2026;

/**
 * Motifs décidés côté BASE (0118/0122 et suivantes), listés ici pour que le
 * contrat de raison ait UN seul registre. Le moteur ne les produit pas : il
 * garantit qu'aucun autre identifiant ne circule.
 */
export const CAPTURE_SERVER_REASONS_2026 = [
  'shared_map_not_authorized', 'protected_place', 'consent_withdrawn', 'source_deleted',
  'verification_required', 'source_or_clock_unconfirmed', 'clock_drift_too_large',
  'closure_crosses_known_barrier', 'no_recording_session', 'receipt_window_expired',
] as const;
export type CaptureServerReason2026 = typeof CAPTURE_SERVER_REASONS_2026[number];
export type CaptureReason2026 = CaptureRejectCode2026 | CaptureServerReason2026;

export interface CaptureRejection2026 {
  code: CaptureRejectCode2026;
  /** Les nombres qui expliquent le refus au joueur (I6). Jamais un motif nu. */
  detail: Record<string, number>;
}

const EPSILON = 1e-10; // Tolérance numérique de coordonnées, pas un paramètre de jeu.
const MS_PER_S = 1_000;
const KMH_PER_M_S = 3.6;

function cross(ax: number, ay: number, bx: number, by: number): number {
  return ax * by - ay * bx;
}

/** Intersection propre de deux segments, y compris un retour sur un sommet ancien. */
function crossing(a: RunPoint, b: RunPoint, c: RunPoint, d: RunPoint): RunPoint | null {
  const ux = b.lng - a.lng, uy = b.lat - a.lat;
  const vx = d.lng - c.lng, vy = d.lat - c.lat;
  const den = cross(ux, uy, vx, vy);
  if (Math.abs(den) < EPSILON * EPSILON) return null;
  const wx = c.lng - a.lng, wy = c.lat - a.lat;
  const t = cross(wx, wy, vx, vy) / den;
  const s = cross(wx, wy, ux, uy) / den;
  if (t < -EPSILON || t > 1 + EPSILON || s <= EPSILON || s > 1 + EPSILON) return null;
  return { lat: c.lat + s * vy, lng: c.lng + s * vx, t: c.t + s * (d.t - c.t), acc: Math.max(a.acc!, b.acc!, c.acc!, d.acc!) };
}

/** Un point exploitable tout court : sans lui on ne sait rien, pas même le sport. */
function locatable(p: RunPoint): boolean {
  return Number.isFinite(p.lat) && Math.abs(p.lat) <= 90 &&
    Number.isFinite(p.lng) && Math.abs(p.lng) <= 180 && Number.isFinite(p.t);
}
/**
 * I2 — un point n'a le droit de porter une frontière que si sa précision est
 * CONNUE et sous le plafond que le client lui-même applique (GPS_ACCURACY_MAX_M).
 * Une précision absente n'est pas une bonne précision : on échoue fermé.
 */
function boundaryVertex(p: RunPoint): boolean {
  return Number.isFinite(p.acc) && p.acc! >= 0 && p.acc! <= GPS_ACCURACY_MAX_M;
}

/**
 * Découpe la trace en segments continus (§5.5 règle 1) puis extrait les faces
 * physiques par effacement de boucle. Aucun raccord n'est inventé entre deux
 * segments : une frontière coupée reste coupée.
 */
export function analyzeTrace2026(points: readonly RunPoint[], activity: Activity): TraceAnalysis2026 {
  const rules = TERRITORY_RULES_2026[activity];
  const limits = activityRules(activity);
  const maxGapMs = limits.pointMaxGapS * MS_PER_S;
  const maxSpeedMs = limits.pointMaxSpeedKmh / KMH_PER_M_S;

  const segments: RunPoint[][] = [];
  let segment: RunPoint[] = [];
  let qualityBreaks = 0;
  let droppedImprecisePoints = 0;
  for (const point of points) {
    if (!locatable(point)) { droppedImprecisePoints++; continue; }
    if (!boundaryVertex(point)) { droppedImprecisePoints++; continue; }
    const last = segment.at(-1);
    if (last) {
      const gapMs = point.t - last.t;
      // I1 : seule une rupture ATTESTÉE coupe. Un déplacement plus rapide que la
      // discipline n'est pas un raccourci du coureur, c'est un saut du capteur.
      const teleported = gapMs > 0 && haversineM(last, point) / (gapMs / MS_PER_S) > maxSpeedMs;
      if (point.breakBefore === true || gapMs <= 0 || gapMs > maxGapMs || teleported) {
        segments.push(segment);
        segment = [];
        qualityBreaks++;
      }
    }
    segment.push(point);
  }
  if (segment.length) segments.push(segment);
  const located = points.filter(locatable);
  const closureGapM = located.length > 1 ? haversineM(located[0]!, located.at(-1)!) : null;

  const faces: PhysicalFace2026[] = [];
  const movingIntervals: { start: string; end: string }[] = [];
  let rejectedSmallLoops = 0;
  let bestRejectedLoop: { lengthM: number; areaM2: number } | null = null;
  let unconfirmedClosures = 0;
  let observedEndpointAccuracyM: number | null = null;
  let distanceM = 0;
  let durationS = 0;
  // I4 — le mouvement sportif accepte l'incertitude au-dessus du seuil de
  // capture. Une frontière faible ne doit ni retirer une journée sportive
  // valable ni effacer ses statistiques.
  let movementAnchor = points[0];
  for (let i = 1; i < points.length; i++) {
      const before = points[i - 1]!;
      const current = points[i]!;
      const gap = current.t - before.t;
      if (current.breakBefore === true || gap <= 0 || gap > maxGapMs) { movementAnchor = current; continue; }
      distanceM += haversineM(before, current);
      durationS += (current.t - before.t) / MS_PER_S;
      if (movementAnchor && Number.isFinite(movementAnchor.acc) && Number.isFinite(current.acc) &&
          haversineM(movementAnchor, current) > Math.max(movementAnchor.acc!, current.acc!)) {
        if (current.t - movementAnchor.t <= maxGapMs) {
          movingIntervals.push({ start: new Date(movementAnchor.t).toISOString(), end: new Date(current.t).toISOString() });
        }
        movementAnchor = current;
      } else if (movementAnchor && current.t - movementAnchor.t > maxGapMs) movementAnchor = current;
  }
  for (const [segmentIndex, continuous] of segments.entries()) {
    // L'effacement de boucle décompose la marche à mesure que chaque face se ferme.
    let path: RunPoint[] = [];
    for (const p of continuous) {
      const last = path.at(-1);
      let closure: { index: number; point: RunPoint; exact: boolean } | null = null;
      if (last && path.length >= 3) {
        const crossings: { index: number; point: RunPoint; exact: boolean }[] = [];
        for (let i = 0; i < path.length - 2; i++) {
          const hit = crossing(path[i]!, path[i + 1]!, last, p);
          if (hit) crossings.push({ index: i, point: hit, exact: true });
        }
        closure = crossings.sort((a, b) => a.point.t - b.point.t || b.index - a.index)[0] ?? null;
        if (!closure) {
          for (let i = path.length - 3; i >= 0; i--) {
            const anchor = path[i]!;
            if (haversineM(anchor, p) <= rules.closureMaxGapM) {
              const candidate = path.slice(i);
              const length = candidate.slice(1).reduce((n, q, j) => n + haversineM(candidate[j]!, q), 0) + haversineM(last, p);
              if (length < rules.minLoopDistanceM) continue;
              // I3 — c'est ICI, et nulle part ailleurs, qu'une fermeture est
              // DÉCLARÉE : elle exige deux extrémités précises.
              const worst = Math.max(anchor.acc!, p.acc!);
              if (worst > TERRITORY_RULES_2026.endpointMaxAccuracyM) {
                unconfirmedClosures++;
                observedEndpointAccuracyM = observedEndpointAccuracyM === null
                  ? worst : Math.min(observedEndpointAccuracyM, worst);
                continue;
              }
              closure = { index: i, point: p, exact: false };
              break;
            }
          }
        }
      }
      if (closure) {
        const ring = closure.exact
          ? [closure.point, ...path.slice(closure.index + 1)]
          : [...path.slice(closure.index), p];
        const lengthM = ring.slice(1).reduce((n, q, j) => n + haversineM(ring[j]!, q), 0) + haversineM(ring.at(-1)!, ring[0]!);
        const geometryRing = normalizeRing(ring);
        const areaM2 = polygonAreaM2(geometryRing);
        if (lengthM >= rules.minLoopDistanceM && areaM2 >= rules.minAreaM2) {
          faces.push({ key: `${segmentIndex}:${faces.length}`, geometry: toGeoJsonPolygon(geometryRing), closedAt: new Date(closure.point.t).toISOString(), lengthM, areaM2,
            ...(!closure.exact ? { closureConnector: { type: 'LineString' as const, coordinates: [[p.lng,p.lat],[path[closure.index]!.lng,path[closure.index]!.lat]] } } : {}),
          });
        } else if (areaM2 > 0) {
          rejectedSmallLoops++;
          if (!bestRejectedLoop || areaM2 > bestRejectedLoop.areaM2) bestRejectedLoop = { lengthM, areaM2 };
        }
        path = [...path.slice(0, closure.index + 1), closure.point];
        if (closure.exact && haversineM(closure.point, p) > 0) path.push(p);
      } else path.push(p);
    }
  }
  return {
    segments, faces, distanceM, durationS, movingIntervals, qualityBreaks,
    droppedImprecisePoints, unconfirmedClosures, observedEndpointAccuracyM,
    rejectedSmallLoops, bestRejectedLoop, closureGapM,
  };
}

/**
 * I6 — le motif EXACT (§5.5) d'une sortie sans capture, avec les nombres qui
 * l'expliquent. `null` quand au moins une face est admissible : dans ce cas il
 * n'y a rien à expliquer, seule la base décide ensuite de la publication.
 *
 * Ordre de priorité : ce que le joueur a réellement fait passe avant ce que le
 * capteur a raté. Une sortie ouverte n'est JAMAIS présentée comme un défaut GPS.
 */
export function captureRejection2026(
  analysis: TraceAnalysis2026, activity: Activity,
): CaptureRejection2026 | null {
  if (analysis.faces.length > 0) return null;
  const rules = TERRITORY_RULES_2026[activity];
  if (analysis.unconfirmedClosures > 0) {
    return { code: 'gps_quality_unconfirmed', detail: {
      unconfirmedClosures: analysis.unconfirmedClosures,
      observedAccuracyM: analysis.observedEndpointAccuracyM ?? 0,
      endpointMaxAccuracyM: TERRITORY_RULES_2026.endpointMaxAccuracyM,
    } };
  }
  if (analysis.bestRejectedLoop) {
    const { lengthM, areaM2 } = analysis.bestRejectedLoop;
    return { code: 'loop_too_small', detail: {
      loopLengthM: Math.round(lengthM), minLoopDistanceM: rules.minLoopDistanceM,
      missingLengthM: Math.max(0, Math.round(rules.minLoopDistanceM - lengthM)),
      loopAreaM2: Math.round(areaM2), minAreaM2: rules.minAreaM2,
      missingAreaM2: Math.max(0, Math.round(rules.minAreaM2 - areaM2)),
    } };
  }
  // Le joueur est revenu à son point de départ et rien n'a pu être confirmé :
  // c'est bien la mesure qui a manqué, pas la boucle.
  const returned = analysis.closureGapM !== null && analysis.closureGapM <= rules.closureMaxGapM &&
    analysis.distanceM >= rules.minLoopDistanceM;
  if (returned && (analysis.qualityBreaks > 0 || analysis.droppedImprecisePoints > 0)) {
    return { code: 'gps_quality_unconfirmed', detail: {
      qualityBreaks: analysis.qualityBreaks,
      droppedImprecisePoints: analysis.droppedImprecisePoints,
      captureMaxAccuracyM: GPS_ACCURACY_MAX_M,
    } };
  }
  return { code: 'no_admissible_loop', detail: {
    distanceM: Math.round(analysis.distanceM),
    closureGapM: Math.round(analysis.closureGapM ?? 0),
    closureMaxGapM: rules.closureMaxGapM,
    minLoopDistanceM: rules.minLoopDistanceM,
    missingLengthM: Math.max(0, Math.round(rules.minLoopDistanceM - analysis.distanceM)),
  } };
}
