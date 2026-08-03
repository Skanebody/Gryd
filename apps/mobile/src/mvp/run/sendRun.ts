/**
 * GRYD — ENVOYER LA COURSE. La seule I/O du lot M6.
 *
 * ─── MINCE PAR CONSTRUCTION ─────────────────────────────────────────────────
 * Tout ce qui décide vit ailleurs et sans réseau : `payload.ts` construit,
 * `outcome.ts` interprète. Il ne reste ici que le transport — et c'est voulu :
 * la partie qu'on ne peut pas rejouer en local doit contenir le moins de
 * jugement possible.
 *
 * ─── UNE COURSE N'EST JAMAIS PERDUE PAR UN ÉCHEC D'ENVOI ────────────────────
 * Réseau coupé, serveur en vrac, avion : la course part en FILE
 * (`lib/pendingUpload.ts`, FIFO persistée, rejouée au prochain lancement). Ce
 * n'est PAS un échec, et l'écran ne doit pas le présenter comme tel — d'où
 * l'issue `queued`, distincte de `lost`.
 *
 * `lost` n'arrive que si même la mise en file a échoué (stockage plein, file
 * illisible). C'est le seul vrai échec, et il se DIT : le buffer `runStore` de
 * l'appelant reste le dernier filet, et on ne le purge pas dans ce cas.
 *
 * ⚠️ UN REFUS DU SERVEUR N'EST PAS UN ÉCHEC D'ENVOI. Un 400 (« course trop
 * courte », « allure hors bornes ») est une RÉPONSE : la remettre en file la
 * ferait rejouer indéfiniment pour être refusée à chaque fois. `ingest_run`
 * l'a déjà tranché — `isPermanentRejection` porte cette distinction.
 */
import { supabase } from '../../lib/supabase';
import { isPermanentRejection, queuePendingUpload } from '../../lib/pendingUpload';
import type { RunPayload } from './payload';
import type { SendResult, ServerVerdict } from './outcome';

/** Met en file, et traduit le refus de la file en `lost`. */
async function differer(payload: RunPayload): Promise<SendResult> {
  const misEnFile = await queuePendingUpload(payload as never);
  return misEnFile ? { kind: 'queued' } : { kind: 'lost' };
}

/**
 * Envoie la course, ou la met en file. Ne jette JAMAIS.
 *
 * Une exception qui remonterait ici laisserait l'écran de résultat sans issue
 * à afficher — c'est-à-dire un joueur devant un écran vide après avoir couru.
 */
export async function sendRun(payload: RunPayload): Promise<SendResult> {
  if (supabase === null) {
    // Aucun serveur joignable par ce build : la course part en file plutôt que
    // de disparaître. Elle sera envoyée par une version correctement configurée.
    return differer(payload);
  }
  try {
    const { data, error } = await supabase.functions.invoke('ingest_run', { body: payload });
    if (error !== null && error !== undefined) {
      // Refus DÉFINITIF : c'est une réponse, pas une panne. La rejouer la ferait
      // refuser à l'identique, indéfiniment.
      if (isPermanentRejection(error)) {
        return { kind: 'answered', verdict: { status: 'rejected' } };
      }
      return differer(payload);
    }
    if (typeof data !== 'object' || data === null) {
      // Réponse illisible : on ne l'INTERPRÈTE pas au hasard. La course repart
      // en file, ce qui est neutre côté serveur (idempotence D14).
      return differer(payload);
    }
    return { kind: 'answered', verdict: data as ServerVerdict };
  } catch {
    return differer(payload);
  }
}
