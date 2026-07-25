/**
 * GRYD — ingest_run : le VERDICT §3.2 + GRYD Verify d'une trace, par discipline.
 *
 * POURQUOI CE FICHIER EXISTE. `validateOrStatus` est la fonction qui décide si
 * une sortie CAPTURE, si elle compte seulement en stats, ou si elle est refusée.
 * Elle est PURE (aucune I/O) mais elle vivait dans `index.ts`, c'est-à-dire
 * derrière un `Deno.serve` : impossible à importer dans un test sans démarrer un
 * serveur. Depuis E14 elle enchaîne QUATRE bornes qui dépendent toutes de la
 * discipline (allure moyenne, cohérence pas/distance, allure par tronçon, plus
 * le filtrage point à point fait en amont) — une composition qu'on ne peut pas
 * se permettre de laisser sans filet : c'est exactement là que « le cycliste
 * est traité en tricheur » se produit ou ne se produit pas.
 *
 * Extraction MÉCANIQUE : corps déplacé à l'identique depuis `index.ts`, aucun
 * changement de comportement. `index.ts` l'importe et l'appelle comme avant.
 */
import type { IngestRunRequest, IngestRunResponse, RunStatus } from '../_shared/types.ts';
import { type Activity, DEFAULT_ACTIVITY, VERIFY_PARTIAL_MIN } from '../_shared/game-rules.ts';
import {
  claimableSegments,
  computeStats,
  filterPoints,
  MOTION_TRUST_FLAGGED_BELOW,
  stepCoherence,
  validateRun,
} from '../_shared/engine/validation.ts';

export type ValidationOutcome =
  | {
    kind: 'rejected';
    reason: NonNullable<IngestRunResponse['rejectReason']>;
    gpsTrust: number;
    motionTrust: number;
    trustScore: number;
  }
  | { kind: 'flagged'; gpsTrust: number; motionTrust: number; trustScore: number }
  | {
    kind: 'claimable';
    status: Extract<RunStatus, 'valid' | 'partial'>;
    claimable: ReturnType<typeof claimableSegments>['claimable'];
    gpsTrust: number;
    motionTrust: number;
    trustScore: number;
  };

/** Enchaîne §3.2 + GRYD Verify : rejected > flagged > partial > valid. */
export function validateOrStatus(
  filtered: ReturnType<typeof filterPoints>,
  stats: ReturnType<typeof computeStats>,
  stepCount: number | undefined,
  clientGpsTrust: number | undefined,
  // Discipline (E14) : absente ⇒ 'run'. TOUTES les bornes ci-dessous en
  // dépendent — allure moyenne, cohérence pas/distance, allure par tronçon.
  activity: Activity = DEFAULT_ACTIVITY,
): ValidationOutcome {
  // Ratio de points §3.2 gardés sur le payload reçu — seul calcul possible ici :
  // la trace arrive DÉCIMÉE, les compteurs de rejets bruts n'existent que côté
  // client (moteur gps.ts).
  const serverGpsTrust = filtered.totalPoints > 0
    ? Math.floor((100 * filtered.keptPoints) / filtered.totalPoints)
    : 0;
  // AMENDEMENT-15 §1 : le client envoie son GPS Trust (accuracy moyenne, pertes
  // de signal, ratio d'outliers sur la trace brute). Signal INDICATIF borné par
  // min() — il ne peut qu'ABAISSER la confiance, jamais la gonfler ; la décision
  // de claim reste 100 % serveur (§3.2).
  const gpsTrust = clientGpsTrust === undefined
    ? serverGpsTrust
    : Math.min(serverGpsTrust, Math.max(0, Math.min(100, Math.round(clientGpsTrust))));
  // Cohérence pas/distance : la MÊME frontière pédestre, lue dans les DEUX
  // sens (engine/validation.ts). En course, zéro pas sur une vraie distance est
  // suspect ; à vélo c'est NORMAL (pédaler ne produit pas de pas) et c'est au
  // contraire une cadence de foulée qui démasque une course déguisée.
  const motionTrust = stepCoherence(stats.distanceM, stepCount, activity);
  // Trust MVP : le signal le plus faible domine (doc anti-triche §8, simplifié).
  const trustScore = Math.min(gpsTrust, motionTrust);

  const validation = validateRun(stats, activity);
  if (validation.status === 'rejected') {
    return { kind: 'rejected', reason: validation.reason, gpsTrust, motionTrust, trustScore };
  }
  // Cohérence pas/distance insuffisante → claims gelés, course conservée en stats.
  if (motionTrust < MOTION_TRUST_FLAGGED_BELOW) {
    return { kind: 'flagged', gpsTrust, motionTrust, trustScore };
  }
  // AMENDEMENT-23 §D / doc §23 : palier VERIFY « stats only » — trustScore
  // (min gpsTrust/motionTrust) < VERIFY_PARTIAL_MIN (60) → verify_factor = 0 :
  // la course compte SPORTIVEMENT (stats/streak) mais ne capture RIEN. On la
  // classe `flagged` (même traitement : claims gelés, aucune écriture hex) —
  // au-dessus de 60, la capture est partielle (×0,5) ou pleine (×1,0), gérée
  // par verifyFactor dans computeScore. Un seul point de décision « capture ? ».
  if (trustScore < VERIFY_PARTIAL_MIN) {
    return { kind: 'flagged', gpsTrust, motionTrust, trustScore };
  }
  const claimable = claimableSegments(filtered.segments, activity);
  return {
    kind: 'claimable',
    status: claimable.status,
    claimable: claimable.claimable,
    gpsTrust,
    motionTrust,
    trustScore,
  };
}

/**
 * Le pipeline COMPLET tel que le handler l'exécute, en une seule fonction pure :
 * filtrage point à point → statistiques → verdict. Les trois étapes reçoivent la
 * MÊME discipline — c'est cette cohérence-là qui est testable ici et qui, si
 * elle se rompait, rendrait un cycliste « tricheur » sans qu'aucun test unitaire
 * de borne ne s'en aperçoive (chacune prise isolément resterait juste).
 */
export function verdictForRequest(
  request: Pick<IngestRunRequest, 'points' | 'stepCount' | 'gpsTrust'>,
  activity: Activity = DEFAULT_ACTIVITY,
): ValidationOutcome {
  const filtered = filterPoints(request.points, activity);
  const stats = computeStats(filtered.segments);
  return validateOrStatus(filtered, stats, request.stepCount, request.gpsTrust, activity);
}
