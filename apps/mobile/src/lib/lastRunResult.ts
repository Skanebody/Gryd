/**
 * GRYD — persistance du dernier IngestRunResponse (AMENDEMENT-15 / O1).
 * Clé AsyncStorage par clientRunId : la célébration course-result lit la
 * réponse serveur après un GPS réel, sans repasser les stats par l'URL.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { IngestRunResponse } from '@klaim/shared';

const KEY_PREFIX = 'gryd.lastRunResult.v1.';

export interface StoredRunResult {
  clientRunId: string;
  response: IngestRunResponse;
  savedAt: number;
}

export async function saveLastRunResult(
  clientRunId: string,
  response: IngestRunResponse,
): Promise<void> {
  try {
    const payload: StoredRunResult = {
      clientRunId,
      response,
      savedAt: Date.now(),
    };
    await AsyncStorage.setItem(KEY_PREFIX + clientRunId, JSON.stringify(payload));
  } catch {
    // Stockage plein : la course reste valide côté serveur ; UI retombe en démo.
  }
}

export async function loadLastRunResult(
  clientRunId: string,
): Promise<IngestRunResponse | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY_PREFIX + clientRunId);
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as StoredRunResult;
    if (parsed.clientRunId !== clientRunId || parsed.response?.runId === undefined) {
      return null;
    }
    return parsed.response;
  } catch {
    return null;
  }
}

export async function clearLastRunResult(clientRunId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY_PREFIX + clientRunId);
  } catch {
    // no-op
  }
}
