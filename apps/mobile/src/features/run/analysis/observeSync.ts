/**
 * GRYD — E27 : LA LECTURE RÉELLE DU MONDE (et rien d'autre).
 *
 * Ce module TOUCHE les sources : `supabase`, la trace mesurée, le verdict
 * serveur capturé, la file d'envoi différé. Il ne DÉCIDE rien — toute la table
 * de décision vit dans `syncFacts.ts`, pure et testée sous Deno. Le partage est
 * volontaire : ce fichier ne peut pas être exécuté sous Deno (AsyncStorage,
 * `react-native`), donc tout ce qui a le droit d'être faux doit être ailleurs.
 *
 * ─── LA REPRISE EST UN VRAI TRAVAIL, PAS UN RAFRAÎCHISSEMENT COSMÉTIQUE ─────
 * `retryPendingUpload()` draine réellement la file et rend depuis le 27/07 son
 * `DrainReport` (`sent` / `rejected` / `remaining` / `stoppedBy`). Les faits
 * produits en découlent LITTÉRALEMENT — aucun n'est inféré d'un compteur, et
 * aucun n'est produit si le rejeu n'a pas eu lieu.
 */
import { pendingUploadCount, retryPendingUpload } from '../../../lib/pendingUpload';
import { supabase } from '../../../lib/supabase';
import { getFinishedTrace } from '../finishedTrace';
import { getLastRunResult } from '../runResult';
import { QUEUE_DEPTH_UNKNOWN, type SyncFact } from './analysisMachine';
import { type SyncSnapshot, factsFromDrain, factsFromSnapshot } from './syncFacts';

/**
 * CE QUE E26 A PASSÉ EN RELAIS. `courseResultParams` (gps/resultHandoff.ts) le
 * sérialise, `RealCourseLive` le pose sur `/course/analyse`. On n'en lit que ce
 * qui porte un FAIT de synchronisation — la distance et la durée appartiennent
 * au Résultat, cet écran ne les affiche pas et n'a pas à les interpréter.
 */
export interface FinishHandoffHints {
  /** E26 a-t-elle passé le relais ? (au moins un paramètre de fin présent) */
  readonly fromFinish: boolean;
  /** `queued: '1'` — la sortie n'est PAS partie (file ou buffer). */
  readonly queuedHint: boolean;
}

/** Aucun relais : lien profond nu, ou écran rouvert sans contexte. */
export const NO_HANDOFF: FinishHandoffHints = { fromFinish: false, queuedHint: false };

/** Lecture RÉELLE du monde. Ne décide rien : la décision est pure, au-dessus. */
export async function readSyncSnapshot(hints: FinishHandoffHints): Promise<SyncSnapshot> {
  let queueDepth = QUEUE_DEPTH_UNKNOWN;
  try {
    queueDepth = await pendingUploadCount();
  } catch {
    // Stockage illisible : on garde QUEUE_DEPTH_UNKNOWN, jamais 0 — annoncer
    // « rien en attente » sur une lecture ratée serait affirmer sans savoir.
  }
  return {
    backendConfigured: supabase !== null,
    tracePoints: getFinishedTrace().length,
    hasServerVerdict: getLastRunResult() !== null,
    queueDepth,
    fromFinish: hints.fromFinish,
    queuedHint: hints.queuedHint,
  };
}

/** Observation d'ouverture (et de reprise de lecture) : monde → faits. */
export async function observeSync(hints: FinishHandoffHints): Promise<readonly SyncFact[]> {
  return factsFromSnapshot(await readSyncSnapshot(hints));
}

/**
 * REPRISE RÉELLE : draine la file, puis rend les faits que le rapport PROUVE.
 * Si le rejeu n'a pas eu lieu (`null`), on relit le monde plutôt que d'inventer.
 */
export async function runRealRetry(hints: FinishHandoffHints): Promise<readonly SyncFact[]> {
  const facts = factsFromDrain(await retryPendingUpload());
  return facts.length > 0 ? facts : await observeSync(hints);
}
