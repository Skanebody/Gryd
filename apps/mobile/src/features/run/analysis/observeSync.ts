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
import {
  type PendingUploadStatus,
  pendingUploadStatus,
  retryPendingUpload,
} from '../../../lib/pendingUpload';
import { supabase } from '../../../lib/supabase';
import { getFinishedTrace } from '../finishedTrace';
import { getLastRunResult } from '../runResult';
import { QUEUE_DEPTH_UNKNOWN, type SyncFact } from './analysisMachine';
import { syncFactRunId } from './syncFactBus';
import {
  type RunQueueMembership,
  type SyncSnapshot,
  factsForRun,
  factsFromDrain,
  factsFromSnapshot,
} from './syncFacts';

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

/**
 * Lecture RÉELLE du monde. Ne décide rien : la décision est pure, au-dessus.
 *
 * ═══ 27/07/2026 — LA FILE EST INTERROGÉE SUR LA BONNE SORTIE ════════════════
 * Ce module n'appelait que `pendingUploadCount()` : un COMPTE, qui ne regarde
 * pas si l'une des entrées est la sortie regardée. `factsFromSnapshot` en
 * concluait pourtant « ta sortie est en file » — y compris dans le cas où la
 * file venait de la REFUSER parce qu'elle était pleine (et laissait donc
 * derrière elle une file forcément non vide). On demande maintenant à la file ce
 * qu'on veut vraiment savoir : `pendingUploadStatus(clientRunId)`.
 *
 * L'identité vient de `syncFactRunId()` — la sortie propriétaire du journal,
 * ouverte au DÉPART de la course (`beginSyncFactRun`). C'est la même identité
 * que celle qui filtre les faits du drain (`runRealRetry` plus bas) : une seule
 * notion de « ma sortie » dans tout l'écran.
 *
 * `null` (app relancée à froid, lien profond nu) N'EST PAS « aucune sortie en
 * file » : c'est « je ne sais pas de quelle sortie je parle », donc `unknown`.
 */
export async function readSyncSnapshot(hints: FinishHandoffHints): Promise<SyncSnapshot> {
  const runId = syncFactRunId();
  let status: PendingUploadStatus = { readable: false };
  try {
    status = await pendingUploadStatus(runId);
  } catch {
    // Ceinture : `pendingUploadStatus` n'a aucun chemin qui jette aujourd'hui
    // (la lecture disque est déjà ceinturée). Si elle en gagnait un, une lecture
    // ratée doit rester « illisible » — jamais « rien en attente », qui
    // affirmerait sans savoir.
  }
  return {
    backendConfigured: supabase !== null,
    tracePoints: getFinishedTrace().length,
    hasServerVerdict: getLastRunResult() !== null,
    queueDepth: status.readable ? status.depth : QUEUE_DEPTH_UNKNOWN,
    runInQueue: membershipOf(status, runId),
    fromFinish: hints.fromFinish,
    queuedHint: hints.queuedHint,
  };
}

/**
 * TROIS RÉPONSES POSSIBLES, ET AUCUN REPLI. Une lecture ratée et un écran sans
 * identité rendent tous deux `unknown` — pour des raisons différentes, mais avec
 * la même conséquence : cet écran ne peut RIEN dire de l'appartenance de sa
 * sortie à la file, et il ne le dira donc pas.
 */
function membershipOf(status: PendingUploadStatus, runId: string | null): RunQueueMembership {
  if (!status.readable) return 'unknown'; // la file n'a pas pu être relue
  if (runId === null) return 'unknown'; // aucune sortie n'est « la sienne »
  return status.hasRun ? 'queued' : 'absent';
}

/** Observation d'ouverture (et de reprise de lecture) : monde → faits. */
export async function observeSync(hints: FinishHandoffHints): Promise<readonly SyncFact[]> {
  return factsFromSnapshot(await readSyncSnapshot(hints));
}

/**
 * REPRISE RÉELLE : draine la file, puis rend les faits que le rapport PROUVE
 * POUR LA SORTIE REGARDÉE — jamais pour une autre.
 *
 * Un drain vide la file ENTIÈRE : il touche des sorties d'hier autant que celle
 * du joueur. Adopter son verdict agrégé revenait à afficher « analyse terminée »
 * parce qu'une AUTRE course était partie. On ne retient donc que les faits qui
 * citent la sortie propriétaire du journal (`syncFactRunId()`, posée au départ
 * de la course). Aucune sortie identifiée, ou aucun fait la concernant : on
 * relit le monde plutôt que d'inventer.
 */
export async function runRealRetry(hints: FinishHandoffHints): Promise<readonly SyncFact[]> {
  const facts = factsForRun(factsFromDrain(await retryPendingUpload()), syncFactRunId());
  return facts.length > 0 ? facts : await observeSync(hints);
}
