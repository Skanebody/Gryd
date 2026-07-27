/**
 * GRYD — envoi différé de fin de course (AMENDEMENT-15 §2, hors-ligne).
 * Une fin de course dont l'invoke `ingest_run` échoue n'est JAMAIS perdue :
 * son payload complet (idempotent par clientRunId — D14, un double envoi est
 * neutre côté serveur) est persisté, puis renvoyé SILENCIEUSEMENT au prochain
 * lancement de l'app (_layout), au retour au premier plan (_layout) et à la
 * prochaine fin de course (useRealRun). Anti-shame : message discret « Course
 * enregistrée — envoi dès que possible », jamais bloquant, jamais d'alerte.
 *
 * ═══ 27/07/2026 — LE SLOT UNIQUE EST DEVENU UNE VRAIE FILE (AUDIT R4) ═══════
 * Avant : « MVP : UNE seule course en attente (une nouvelle fin hors-ligne
 * REMPLACE la précédente dans le slot) ». Deux sorties hors ligne — un week-end
 * sans réseau, un vol, un forfait épuisé — et la PREMIÈRE disparaissait sans un
 * mot. Perte de donnée utilisateur silencieuse. Désormais : file FIFO persistée
 * (`gryd.pendingUpload.queue.v2`), ordre préservé, plafond qui REFUSE au lieu
 * d'écraser, et migration de l'ancien slot v1 (une app déjà installée ne perd
 * pas la course qu'elle y gardait).
 *
 * Ce fichier ne contient QUE le stockage et l'invoke. Toute la logique de file
 * (ordre, plafond, migration, rejeu, verdicts) vit dans `pendingUploadQueue.ts`
 * — module PUR, testé sous Deno (`pendingUpload.test.ts`), là où AsyncStorage
 * n'existe pas.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FunctionsHttpError } from '@supabase/supabase-js';
import type { IngestRunRequest, IngestRunResponse } from '@klaim/shared';
import { emitRunResultAnalytics } from './activation';
import { EVENTS, track } from './analytics';
import {
  LEGACY_PENDING_UPLOAD_KEY,
  PENDING_QUEUE_KEY,
  PENDING_QUEUE_MAX_ENTRIES,
  type PendingEntry,
  type SendVerdict,
  drainPendingQueue,
  enqueuePending,
  isPermanentHttpStatus,
  parsePendingQueue,
  removePending,
  serializePendingQueue,
} from './pendingUploadQueue';
import { supabase } from './supabase';

/**
 * P0 C2 (MVP_CHANGESET) — un REJET DÉFINITIF du serveur n'est pas une panne réseau.
 * Avant : `if (error) return` avalait un 403 unknown_user ou un 400 invalid_payload
 * exactement comme un hors-ligne → la course « partait » en boucle à vie sans jamais
 * arriver, indistinguable d'une file saine. Ici : 4xx (hors 429, rate limit → on
 * retentera passé la fenêtre) = le serveur A JUGÉ ; l'idempotence (clientRunId)
 * garantit qu'un renvoi rendrait le MÊME verdict — retenter est inutile.
 */
export function isPermanentRejection(error: unknown): boolean {
  if (!(error instanceof FunctionsHttpError)) return false; // réseau/relay → réessayable
  return isPermanentHttpStatus(httpStatusOf(error));
}

function httpStatusOf(error: unknown): number | undefined {
  if (!(error instanceof FunctionsHttpError)) return undefined;
  const status = (error.context as { status?: number } | undefined)?.status;
  return typeof status === 'number' ? status : undefined;
}

// ── STOCKAGE ────────────────────────────────────────────────────────────────
// Lire ne détruit jamais ; écrire ne perd jamais l'ancien slot avant d'avoir
// réussi. Toute panne de stockage est silencieuse côté UI (jamais un crash),
// mais JAMAIS silencieuse côté appelant : `queuePendingUpload` rend false, et
// l'appelant garde alors la course dans son propre buffer.

async function readQueue(): Promise<{ queue: PendingEntry[]; hadLegacy: boolean }> {
  try {
    const [raw, rawLegacy] = await Promise.all([
      AsyncStorage.getItem(PENDING_QUEUE_KEY),
      AsyncStorage.getItem(LEGACY_PENDING_UPLOAD_KEY),
    ]);
    return { queue: parsePendingQueue(raw, rawLegacy), hadLegacy: rawLegacy !== null };
  } catch {
    return { queue: [], hadLegacy: false }; // stockage illisible : on n'insiste pas
  }
}

/**
 * Écrit la file. L'ancien slot v1 n'est effacé qu'APRÈS l'écriture réussie de
 * la file : un kill entre les deux relit simplement le v1 au prochain tour
 * (la déduplication par clientRunId rend la migration rejouable).
 */
async function writeQueue(queue: readonly PendingEntry[], clearLegacy: boolean): Promise<boolean> {
  try {
    await AsyncStorage.setItem(PENDING_QUEUE_KEY, serializePendingQueue(queue));
    if (clearLegacy) await AsyncStorage.removeItem(LEGACY_PENDING_UPLOAD_KEY);
    return true;
  } catch {
    return false;
  }
}

/**
 * Marque une course « à renvoyer ». Retourne false si la course N'EST PAS en
 * file — stockage indisponible, ou file au plafond. Dans les deux cas
 * l'appelant garde son buffer runStore (dernier filet) : c'est précisément
 * pourquoi le plafond a le droit de refuser sans rien détruire.
 */
export async function queuePendingUpload(payload: IngestRunRequest): Promise<boolean> {
  const { queue, hadLegacy } = await readQueue();
  const res = enqueuePending(queue, payload, Date.now());
  if (!res.accepted) {
    // On le DIT plutôt que de jeter : aucune entrée n'a été évincée, et la
    // course reste dans le buffer de l'appelant (chemin 'lost' de useRealRun,
    // qui ne purge PAS les clés de la course).
    console.warn(
      `[pendingUpload] course NON mise en file (${res.outcome}) — ${queue.length}/${PENDING_QUEUE_MAX_ENTRIES} en attente ; elle reste dans le buffer de course.`,
    );
    return false;
  }
  return await writeQueue(res.queue, hadLegacy);
}

/**
 * Y a-t-il au moins une course en attente d'envoi ? Lecture UI (« où est mon
 * run » — fiabilité 21/07) : le slot était invisible, un coureur crashé/hors-
 * ligne ne savait pas si sa course existait encore. Corrompu/illisible → false
 * (on n'affiche jamais une promesse inenvoyable).
 */
export async function hasPendingUpload(): Promise<boolean> {
  return (await pendingUploadCount()) > 0;
}

/**
 * COMBIEN de sorties attendent. La file pouvant en porter plusieurs, le compte
 * exact est exposé pour que l'UI puisse un jour cesser de dire « 1 sortie »
 * quand il y en a trois (copie i18n à recaler — hors périmètre de ce chantier).
 */
export async function pendingUploadCount(): Promise<number> {
  const { queue } = await readQueue();
  return queue.length;
}

/**
 * Retente les envois en attente. Silencieux et jamais bloquant : no-op sans
 * backend (O1), sans session ou avec une file vide ; toujours hors-ligne → les
 * payloads RESTENT en place (idempotents, on retentera). Une entrée n'est
 * retirée QUE sur verdict du serveur (réponse sans erreur, ou rejet définitif).
 */
let retryInFlight = false;

/**
 * Sérialise les renvois. Sans ce verrou, un double-tap sur la note « course en
 * attente » (tappable) sur réseau lent lance DEUX rejeux qui renvoient le MÊME
 * verdict → claim_result / city_opened émis DEUX fois (le serveur, idempotent,
 * n'est pas doublement crédité — mais le funnel, si). Bonus : coupe les invokes
 * réseau redondants, et empêche deux drains concurrents de se marcher dessus
 * sur la file persistée. Tous les sites d'appel partagent ce runtime JS. On NE
 * filtre PAS sur result.replayed : le scénario « crédité mais réponse perdue »
 * ne verra jamais que replayed:true — le sauter reperdrait le funnel que ce fix
 * restaure.
 */
export async function retryPendingUpload(): Promise<void> {
  if (supabase === null || retryInFlight) return;
  retryInFlight = true;
  try {
    await retryPendingUploadOnce();
  } finally {
    retryInFlight = false;
  }
}

async function retryPendingUploadOnce(): Promise<void> {
  if (supabase === null) return; // garanti par l'appelant ; requis pour le narrowing TS
  const { queue, hadLegacy } = await readQueue();
  if (queue.length === 0) {
    // Rien à envoyer : on en profite pour retirer un slot v1 vide/corrompu.
    if (hadLegacy) await writeQueue([], true);
    return;
  }
  // La migration est actée dès maintenant : la file v2 contient déjà l'entrée
  // v1, l'écrire avant le premier envoi évite de la reperdre sur un kill.
  if (hadLegacy) await writeQueue(queue, true);

  const session = await currentSession();
  if (session === null) return; // pas de session : on retentera connecté

  const send = async (payload: IngestRunRequest): Promise<SendVerdict> => {
    if (supabase === null) return 'retry_later';
    try {
      const { data, error } = await supabase.functions.invoke('ingest_run', { body: payload });
      if (error) {
        if (!isPermanentRejection(error)) return 'retry_later'; // hors-ligne/5xx/429
        // Jugé et refusé : sortir de la file (sinon retry infini silencieux) et
        // le DIRE — au moins à la mesure (claim_result est l'event d'issue de
        // capture) et au log. Le payload reste idempotent : rien n'est perdu
        // côté serveur, il a déjà statué.
        const status = httpStatusOf(error);
        console.warn('[pendingUpload] course rejetée définitivement par le serveur :', status);
        track(EVENTS.claimResult, {
          outcome: 'rejected_permanent',
          http: status ?? 0,
          source: 'pending_retry',
        });
        return 'rejected_permanent';
      }
      // Renvoi RÉUSSI : le serveur a jugé. On NE rejoue PAS la célébration (le
      // moment est passé, pas d'écran de résultat ici), mais on ne PERD pas le
      // FAIT — le funnel doit voir cette capture / cette ouverture de commune
      // faite hors-ligne (là où les communes sont vierges), sinon les vraies
      // conquêtes rurales restent invisibles. Même source-unique que le chemin
      // live.
      const result = (data ?? null) as IngestRunResponse | null;
      if (result) emitRunResultAnalytics(result, 'pending_retry');
      return 'sent';
    } catch {
      return 'retry_later'; // réseau coupé net : silencieux, l'entrée reste
    }
  };

  // Persistance APRÈS CHAQUE verdict définitif : un kill au milieu du rejeu ne
  // réenvoie pas ce qui est déjà parti. On relit la file avant d'écrire pour ne
  // pas écraser une course terminée pendant le drain.
  const onSettled = async (entry: PendingEntry): Promise<void> => {
    const { queue: current } = await readQueue();
    await writeQueue(removePending(current, entry.payload.clientRunId), false);
  };

  await drainPendingQueue(queue, send, onSettled);
}

/** Session courante, ou null (une auth injoignable n'est pas une raison de crasher). */
async function currentSession(): Promise<unknown | null> {
  if (supabase === null) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session;
  } catch {
    return null;
  }
}
