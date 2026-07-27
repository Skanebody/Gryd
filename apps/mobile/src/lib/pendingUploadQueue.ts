/**
 * GRYD — FILE D'ENVOI DIFFÉRÉ (FIFO) : la logique PURE.
 *
 * Module PUR au sens du dépôt : zéro import React / React Native /
 * AsyncStorage / Supabase, aucune horloge interne (le temps est INJECTÉ), aucun
 * I/O (l'envoi est INJECTÉ). Il est donc testable sous Deno
 * (`pendingUpload.test.ts`), là où AsyncStorage n'existe pas. Le stockage et
 * l'invoke vivent dans `pendingUpload.ts`, qui n'ajoute rien d'autre.
 *
 * ═══ POURQUOI CE FICHIER EXISTE : ON PERDAIT DES COURSES ════════════════════
 * Jusqu'ici l'envoi différé tenait dans UN slot (`gryd.pendingUpload.v1`) :
 * « MVP : UNE seule course en attente (une nouvelle fin hors-ligne REMPLACE la
 * précédente) ». Deux sorties hors ligne — un week-end en montagne, un vol, un
 * forfait épuisé — et la PREMIÈRE était écrasée sans un mot. Une perte de
 * donnée utilisateur silencieuse, exactement ce que la constitution interdit.
 * Ici : une VRAIE file, ordre préservé, plusieurs sorties en attente.
 *
 * ═══ LES DEUX INVARIANTS ════════════════════════════════════════════════════
 *  1. UNE ENTRÉE ACCEPTÉE N'EST RETIRÉE QUE PAR UN VERDICT DU SERVEUR — envoi
 *     réussi, ou rejet DÉFINITIF (4xx hors 429, déjà jugé : le renvoi rendrait
 *     le même verdict par idempotence `clientRunId`). Ni une panne réseau, ni
 *     une nouvelle course, ni le plafond ne peuvent l'effacer.
 *  2. LE PLAFOND NE JETTE RIEN. Une file infinie serait un autre bug (le
 *     payload porte la trace GPS complète : quelques centaines de Ko chacun, et
 *     AsyncStorage/Android plafonne la base autour de 6 Mo). Mais « borner »
 *     n'autorise pas « écraser » : à la limite, on REFUSE la nouvelle entrée au
 *     lieu d'en sacrifier une ancienne, et le refus est DIT à l'appelant
 *     (`accepted: false`). Côté hook de fin de course, ce refus emprunte le
 *     chemin 'lost' déjà en place : les clés de la course NE SONT PAS purgées,
 *     la sortie reste dans son propre buffer et sera re-proposée au prochain
 *     GO. Rien n'est détruit, donc rien n'est tu.
 */
import type { IngestRunRequest } from '@klaim/shared';

/** Clé de la FILE (v2). Le slot v1 est lu puis migré, jamais écrit à nouveau. */
export const PENDING_QUEUE_KEY = 'gryd.pendingUpload.queue.v2';

/**
 * Ancien slot UNIQUE (v1). Un téléphone déjà en service porte peut-être une
 * course ici : elle est versée EN TÊTE de la file (elle est forcément antérieure
 * à toute entrée v2) et n'est effacée qu'une fois la file écrite.
 */
export const LEGACY_PENDING_UPLOAD_KEY = 'gryd.pendingUpload.v1';

/**
 * Plafond en NOMBRE de sorties en attente. 12 : au-delà, ce n'est plus « le
 * réseau est mauvais », c'est un compte qui n'arrive jamais à envoyer — et 12
 * traces complètes pèsent déjà quelques Mo.
 */
export const PENDING_QUEUE_MAX_ENTRIES = 12;

/**
 * Plafond en OCTETS de la file sérialisée (≈2 Mo). Garde-fou réel du stockage :
 * le nombre d'entrées ne dit rien de leur poids (une sortie de 3 h décimée pèse
 * cent fois une boucle de 20 min). Une file VIDE accepte toujours sa première
 * entrée, quelle que soit sa taille — sinon une longue sortie serait
 * inenvoyable À VIE, ce qui serait pire que le plafond.
 */
export const PENDING_QUEUE_MAX_BYTES = 2_000_000;

/** Une sortie en attente : son payload complet + l'instant de mise en file. */
export interface PendingEntry {
  readonly payload: IngestRunRequest;
  readonly queuedAt: number;
}

/** Issue d'une mise en file. `accepted:false` ⇒ RIEN n'a changé dans la file. */
export type EnqueueOutcome = 'queued' | 'replaced' | 'invalid' | 'full_entries' | 'full_bytes';

export interface EnqueueResult {
  readonly accepted: boolean;
  readonly outcome: EnqueueOutcome;
  readonly queue: readonly PendingEntry[];
}

/** Verdict d'un envoi, du point de vue de la file (l'appelant fait l'I/O). */
export type SendVerdict =
  | 'sent' // le serveur a répondu sans erreur
  | 'rejected_permanent' // 4xx hors 429 : jugé et refusé, retenter est inutile
  | 'retry_later' // hors-ligne / 5xx / 429 : l'entrée RESTE
  | 'no_session'; // pas de session : on n'essaie même pas la suite

export interface DrainReport {
  /** Ce qui reste à envoyer, dans l'ordre. */
  readonly remaining: readonly PendingEntry[];
  /** clientRunId envoyés avec succès, dans l'ordre. */
  readonly sent: readonly string[];
  /** clientRunId retirés sur rejet définitif du serveur. */
  readonly rejected: readonly string[];
  /** Pourquoi le rejeu s'est arrêté. */
  readonly stoppedBy: 'empty' | 'retry_later' | 'no_session';
}

/** Un payload est envoyable s'il porte une clé d'idempotence exploitable. */
function isSendablePayload(value: unknown): value is IngestRunRequest {
  if (typeof value !== 'object' || value === null) return false;
  const id = (value as { clientRunId?: unknown }).clientRunId;
  return typeof id === 'string' && id.length > 0;
}

function readQueuedAt(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
}

/**
 * Lit UNE entrée stockée. Tolère les deux formes : l'enveloppe v2
 * `{ payload, queuedAt }` ET un payload NU (ce que le slot v1 contenait, et ce
 * qu'un build antérieur pourrait avoir écrit). Tolérer coûte trois lignes ;
 * ne pas tolérer coûterait une course.
 */
function readEntry(value: unknown): PendingEntry | null {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as { payload?: unknown; queuedAt?: unknown };
  if (isSendablePayload(record.payload)) {
    return { payload: record.payload, queuedAt: readQueuedAt(record.queuedAt) };
  }
  if (isSendablePayload(value)) return { payload: value, queuedAt: 0 };
  return null;
}

function parseJson(raw: string | null): unknown {
  if (raw === null || raw === '') return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null; // stockage illisible : file vide, jamais d'exception vers l'app
  }
}

/**
 * Reconstruit la file depuis le stockage BRUT — file v2 + ancien slot v1.
 *
 * Règles : l'ordre d'écriture est l'ordre d'envoi (FIFO) ; l'entrée v1 passe
 * DEVANT (elle précède forcément la file) ; un `clientRunId` en double ne
 * compte qu'UNE fois (la plus ancienne occurrence gagne — l'idempotence rend
 * les deux équivalentes côté serveur) ; tout ce qui n'est pas envoyable est
 * écarté. Aucune troncature à la lecture : LIRE NE DÉTRUIT JAMAIS.
 */
export function parsePendingQueue(rawQueue: string | null, rawLegacy: string | null): PendingEntry[] {
  const out: PendingEntry[] = [];
  const seen = new Set<string>();
  const push = (entry: PendingEntry | null): void => {
    if (entry === null || seen.has(entry.payload.clientRunId)) return;
    seen.add(entry.payload.clientRunId);
    out.push(entry);
  };
  push(readEntry(parseJson(rawLegacy)));
  const parsed = parseJson(rawQueue);
  if (Array.isArray(parsed)) for (const item of parsed) push(readEntry(item));
  return out;
}

/** Écrit la file au format v2 (enveloppe explicite, pas de payload nu). */
export function serializePendingQueue(queue: readonly PendingEntry[]): string {
  return JSON.stringify(queue.map((e) => ({ payload: e.payload, queuedAt: e.queuedAt })));
}

/**
 * Met une sortie en file. `now` est INJECTÉ (module pur, aucune horloge).
 *
 * Un `clientRunId` déjà présent REMPLACE le payload SUR PLACE : même position,
 * même `queuedAt`. C'est le cas d'une même course re-soumise (reprise après
 * kill) — la dupliquer décalerait l'ordre d'envoi pour rien.
 */
export function enqueuePending(
  queue: readonly PendingEntry[],
  payload: IngestRunRequest,
  now: number,
): EnqueueResult {
  if (!isSendablePayload(payload)) return { accepted: false, outcome: 'invalid', queue };

  const existing = queue.findIndex((e) => e.payload.clientRunId === payload.clientRunId);
  const previous = existing >= 0 ? queue[existing] : undefined;
  if (previous !== undefined) {
    const next = queue.slice();
    next[existing] = { payload, queuedAt: previous.queuedAt };
    return { accepted: true, outcome: 'replaced', queue: next };
  }

  if (queue.length >= PENDING_QUEUE_MAX_ENTRIES) {
    return { accepted: false, outcome: 'full_entries', queue };
  }

  const next = [...queue, { payload, queuedAt: readQueuedAt(now) }];
  // La file VIDE accepte toujours : le plafond d'octets ne doit jamais rendre
  // une sortie inenvoyable à vie (le stockage lui-même reste le dernier juge).
  if (queue.length > 0 && serializePendingQueue(next).length > PENDING_QUEUE_MAX_BYTES) {
    return { accepted: false, outcome: 'full_bytes', queue };
  }
  return { accepted: true, outcome: 'queued', queue: next };
}

/** Retire une entrée par `clientRunId` (verdict serveur). Ordre préservé. */
export function removePending(
  queue: readonly PendingEntry[],
  clientRunId: string,
): PendingEntry[] {
  return queue.filter((e) => e.payload.clientRunId !== clientRunId);
}

/**
 * Un REJET DÉFINITIF du serveur n'est pas une panne réseau (P0 C2) : 4xx hors
 * 429 = le serveur A JUGÉ ; l'idempotence garantit qu'un renvoi rendrait le
 * MÊME verdict, retenter est inutile. 429 = fenêtre de rate limit, réessayable.
 */
export function isPermanentHttpStatus(status: number | undefined): boolean {
  return typeof status === 'number' && status >= 400 && status < 500 && status !== 429;
}

/**
 * REJEU DANS L'ORDRE. L'envoi est INJECTÉ (`send`), donc ce cœur est testable
 * sans réseau ni AsyncStorage.
 *
 * La règle qui compte : on s'ARRÊTE à la première panne réseau, sans toucher ni
 * la tête ni la suite. Continuer sur les suivantes serait doublement faux —
 * elles échoueraient de même (le réseau est tombé), et la file cesserait d'être
 * FIFO. Un rejet DÉFINITIF, lui, retire l'entrée et NE BLOQUE PAS la file :
 * une course refusée ne doit pas retenir en otage celles qui la suivent.
 *
 * `onSettled` (optionnel) est appelé après CHAQUE verdict définitif, avant de
 * passer à la suivante : c'est là que l'appelant persiste la file amputée, pour
 * qu'un kill au milieu du rejeu ne réenvoie pas ce qui est déjà parti.
 */
export async function drainPendingQueue(
  queue: readonly PendingEntry[],
  send: (payload: IngestRunRequest) => Promise<SendVerdict>,
  onSettled?: (entry: PendingEntry, verdict: 'sent' | 'rejected_permanent') => Promise<void> | void,
): Promise<DrainReport> {
  let remaining: PendingEntry[] = queue.slice();
  const sent: string[] = [];
  const rejected: string[] = [];
  // Borne dure : autant d'itérations que d'entrées au départ. Aucune boucle
  // infinie possible même si `send` se comportait mal.
  for (let i = 0; i < queue.length && remaining.length > 0; i += 1) {
    const head = remaining[0];
    if (head === undefined) break; // inatteignable (remaining.length > 0) — exigé par le typage
    const verdict = await send(head.payload);
    if (verdict === 'retry_later' || verdict === 'no_session') {
      return { remaining, sent, rejected, stoppedBy: verdict };
    }
    remaining = remaining.slice(1);
    if (verdict === 'sent') sent.push(head.payload.clientRunId);
    else rejected.push(head.payload.clientRunId);
    if (onSettled) await onSettled(head, verdict);
  }
  return { remaining, sent, rejected, stoppedBy: 'empty' };
}
