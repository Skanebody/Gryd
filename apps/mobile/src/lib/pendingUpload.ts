/**
 * GRYD — file d'envoi différé (Never lose a run).
 * Multi-run : plusieurs payloads en attente (FIFO), idempotents par clientRunId.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { IngestRunRequest } from '@klaim/shared';
import { invokeIngestRun } from './ingestRunClient';

const QUEUE_KEY = 'gryd.pendingUploadQueue.v1';
const LEGACY_KEY = 'gryd.pendingUpload.v1';

export interface PendingUploadResult {
  ok: boolean;
  clientRunId?: string;
  zonesCaptured?: number;
  drained?: number;
}

async function readQueue(): Promise<IngestRunRequest[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((p) => typeof (p as IngestRunRequest)?.clientRunId === 'string');
      }
    }
    const legacy = await AsyncStorage.getItem(LEGACY_KEY);
    if (legacy !== null) {
      const one = JSON.parse(legacy) as IngestRunRequest;
      if (typeof one?.clientRunId === 'string') {
        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([one]));
        await AsyncStorage.removeItem(LEGACY_KEY);
        return [one];
      }
    }
  } catch {
    // corruption → file vide
  }
  return [];
}

async function writeQueue(queue: IngestRunRequest[]): Promise<boolean> {
  try {
    if (queue.length === 0) {
      await AsyncStorage.removeItem(QUEUE_KEY);
      return true;
    }
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    return true;
  } catch {
    return false;
  }
}

export async function pendingUploadCount(): Promise<number> {
  const q = await readQueue();
  return q.length;
}

export async function hasPendingUpload(): Promise<boolean> {
  return (await pendingUploadCount()) > 0;
}

export async function queuePendingUpload(payload: IngestRunRequest): Promise<boolean> {
  const queue = await readQueue();
  const withoutDup = queue.filter((p) => p.clientRunId !== payload.clientRunId);
  return writeQueue([...withoutDup, payload]);
}

/** Envoie le plus ancien payload en attente. */
export async function retryPendingUpload(): Promise<PendingUploadResult> {
  const queue = await readQueue();
  if (queue.length === 0) return { ok: false };

  const [head, ...rest] = queue;
  if (head === undefined) return { ok: false };

  const result = await invokeIngestRun(head);
  if (!result.ok) return { ok: false };

  await writeQueue(rest);
  const zonesCaptured =
    result.response !== undefined
      ? result.response.hexes.claimed +
        result.response.hexes.stolen +
        result.response.hexes.defended
      : 0;
  return { ok: true, clientRunId: head.clientRunId, zonesCaptured, drained: 1 };
}

/** Vide toute la file (FIFO) — appelé au reconnect / lancement. */
export async function drainPendingUploadQueue(max = 20): Promise<PendingUploadResult> {
  let drained = 0;
  let last: PendingUploadResult = { ok: false };
  for (let i = 0; i < max; i++) {
    const r = await retryPendingUpload();
    if (!r.ok) break;
    last = r;
    drained += 1;
  }
  if (drained === 0) return { ok: false };
  return { ...last, drained };
}
