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
 *
 * ═══ 27/07/2026 — CE MODULE PUBLIE SES FAITS À E27 (syncFactBus) ════════════
 * C'est l'un des DEUX points d'envoi réels d'une course (l'autre est le chemin
 * direct, `useRealRunCore.uploadOrQueue`). Les faits que E27 attendait — et que
 * personne n'émettait — naissent donc ici, à l'endroit exact où ils ont lieu :
 *  · `retry_started` juste AVANT chaque invoke du drain (une entrée = une
 *    tentative réellement partie) ;
 *  · `local_save_failed` quand l'écriture de la file a RÉELLEMENT échoué ;
 *  · `not_stored` quand le plafond a REFUSÉ l'entrée (cause connue, pas devinée) ;
 *  · l'issue du drain, traduite par la table pure `factsFromDrain`.
 * La publication est synchrone, sans I/O et ne jette jamais (`syncFactBus.ts`) :
 * un observateur ne peut pas faire échouer un envoi. Aucun de ces faits n'est
 * persisté — un fait de synchro périmé relu au démarrage ferait mentir un écran
 * neuf.
 *
 * ⚠ CHAQUE FAIT PORTE LE `clientRunId` DE SA SORTIE (27/07/2026). Ce module
 * envoie des courses D'HIER, tout seul, à chaque retour au premier plan de
 * l'app : ses faits ne parlent JAMAIS de la sortie que l'écran regarde, sauf
 * quand c'est justement son entrée qui part. Sans cette identité, un drain
 * d'arrière-plan faisait afficher « analyse terminée » à E27 pour une course
 * qui dormait encore dans la file — la progression sans travail derrière que la
 * constitution interdit. Le bus écarte ce qui n'appartient pas à la sortie
 * regardée ; ici, on se contente de dire la vérité sur QUI part.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FunctionsHttpError } from '@supabase/supabase-js';
import type { IngestRunRequest, IngestRunResponse } from '@klaim/shared';
import { emitRunResultAnalytics } from './activation';
import { EVENTS, track } from './analytics';
import { factsFromDrain } from '../features/run/analysis/syncFacts';
import { publishRunSyncFacts, publishSyncFact } from '../features/run/analysis/syncFactBus';
import {
  LEGACY_PENDING_UPLOAD_KEY,
  PENDING_QUEUE_KEY,
  PENDING_QUEUE_MAX_ENTRIES,
  type DrainReport,
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
    // E27 : le REFUS est un fait, avec sa cause EXACTE — la seule fois du dépôt
    // où elle est connue. `factsFromSnapshot` doit sinon la deviner depuis une
    // file vide et retombe toujours sur 'storage' (syncFacts.ts:151).
    // Un payload `invalid` n'est ni un plafond ni une panne de stockage : rien
    // n'a été écrit, et `local_save_failed` dit exactement ça, sans cause inventée.
    publishSyncFact(
      res.outcome === 'invalid'
        ? { kind: 'local_save_failed' }
        : { kind: 'not_stored', reason: 'queue_full' },
      payload.clientRunId,
    );
    return false;
  }
  const written = await writeQueue(res.queue, hadLegacy);
  // ÉCHEC D'ÉCRITURE RÉEL (AsyncStorage a jeté), pas une supposition : la sortie
  // n'est nulle part de sûr. C'est le seul émetteur légitime de ce fait.
  // Le succès, lui, ne publie RIEN : la preuve de persistance que E27 accepte est
  // la RELECTURE de la file (`pendingUploadCount`), pas notre propre affirmation
  // d'avoir écrit — c'est le correctif du 27/07 sur `factsFromSnapshot`.
  if (!written) publishSyncFact({ kind: 'local_save_failed' }, payload.clientRunId);
  return written;
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
/**
 * ═══ 27/07/2026 — LE RENVOI REND SON RAPPORT (E27 « Analyse et synchro ») ═══
 * Il rendait `void`. Silencieux convient aux appelants d'arrière-plan (_layout,
 * fin de course) : ils déclenchent et n'affichent rien. Mais l'écran E27, lui,
 * DOIT dire ce qui vient de se passer — « partie », « refusée », « toujours en
 * attente » — et sans rapport il n'avait que la profondeur de file pour le
 * deviner. Or une entrée quitte la file sur DEUX verdicts opposés (envoyée, ou
 * refusée définitivement) : une file redevenue vide ne dit pas lequel. Deviner
 * ici aurait été annoncer une conquête sur un refus.
 *
 * `null` = aucun rejeu n'a eu lieu (pas de backend, ou un rejeu déjà en vol) —
 * ce n'est PAS un rapport vide, et l'appelant ne doit rien en conclure.
 * Les appelants d'arrière-plan restent inchangés (`void retryPendingUpload()`).
 */
export async function retryPendingUpload(): Promise<DrainReport | null> {
  if (supabase === null || retryInFlight) return null;
  retryInFlight = true;
  try {
    const report = await retryPendingUploadOnce();
    // ── CE QUE LE RENVOI A APPRIS, PUBLIÉ POUR E27, SORTIE PAR SORTIE ─────────
    // Même table de traduction que l'écran (`factsFromDrain`, pure et testée) :
    // un seul énoncé de la règle, pas deux. C'est ce qui CLÔT la boucle des
    // `retry_started` publiés entrée par entrée ci-dessous — sans ça, un drain
    // d'ARRIÈRE-PLAN (retour au premier plan, fin de course) laisserait un E27
    // ouvert bloqué sur « envoi en cours » alors que plus rien n'est en vol.
    // Un rapport sans issue ne publie AUCUN fait (l'écran ne conclut rien).
    //
    // ⚠ CHAQUE VERDICT EST NOMMÉ (27/07/2026). Ce drain vide des sorties D'HIER,
    // et il part TOUT SEUL à chaque retour au premier plan (app/_layout.tsx) —
    // donc en pleine course, au moindre déverrouillage d'écran. Publier un
    // succès AGRÉGÉ (« au moins une est partie ») faisait peindre « analyse
    // terminée » à un E27 ouvert sur une course encore en file. Chaque fait part
    // désormais avec le `clientRunId` de SA sortie, et le bus n'en retient que
    // ceux de la sortie regardée.
    publishRunSyncFacts(factsFromDrain(report));
    return report;
  } finally {
    retryInFlight = false;
  }
}

const EMPTY_REPORT: DrainReport = { remaining: [], sent: [], rejected: [], stoppedBy: 'empty' };

async function retryPendingUploadOnce(): Promise<DrainReport> {
  if (supabase === null) return EMPTY_REPORT; // garanti par l'appelant ; requis pour le narrowing TS
  const { queue, hadLegacy } = await readQueue();
  if (queue.length === 0) {
    // Rien à envoyer : on en profite pour retirer un slot v1 vide/corrompu.
    if (hadLegacy) await writeQueue([], true);
    return EMPTY_REPORT;
  }
  // La migration est actée dès maintenant : la file v2 contient déjà l'entrée
  // v1, l'écrire avant le premier envoi évite de la reperdre sur un kill.
  if (hadLegacy) await writeQueue(queue, true);

  const session = await currentSession();
  // Pas de session : on retentera connecté. Rien n'est perdu — la file entière
  // RESTE, et le rapport le dit explicitement plutôt que de passer pour un
  // rejeu qui n'aurait rien trouvé à envoyer.
  if (session === null) {
    return { remaining: queue, sent: [], rejected: [], stoppedBy: 'no_session' };
  }

  const send = async (payload: IngestRunRequest): Promise<SendVerdict> => {
    if (supabase === null) return 'retry_later';
    try {
      // ── UNE REPRISE RÉELLEMENT PARTIE, ENTRÉE PAR ENTRÉE ──────────────────
      // Publié juste AVANT l'appel réseau, jamais avant de savoir qu'on appelle :
      // sans backend, sans session (garde plus haut) ou file vide, `send` n'est
      // même pas atteint et rien n'est annoncé. `attempts` compte donc des
      // tentatives qui ont VRAIMENT quitté l'appareil, une par entrée drainée.
      // Et une par SORTIE NOMMÉE : sans le `clientRunId`, un E27 ouvert sur une
      // course en file passait son étape 2 en « en cours » parce que le drain
      // traitait l'entrée de QUELQU'UN D'AUTRE — un travail affiché qui n'avait
      // pas lieu pour cette sortie-là.
      publishSyncFact({ kind: 'retry_started' }, payload.clientRunId);
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

  return await drainPendingQueue(queue, send, onSettled);
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
