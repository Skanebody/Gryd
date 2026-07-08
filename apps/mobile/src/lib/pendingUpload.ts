/**
 * GRYD — envoi différé de fin de course (AMENDEMENT-15 §2, hors-ligne).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { IngestRunRequest, IngestRunResponse } from '@klaim/shared';
import { saveLastRunResult } from './lastRunResult';
import { notifyMapDataChanged } from './mapRefresh';
import { supabase } from './supabase';

const PENDING_UPLOAD_KEY = 'gryd.pendingUpload.v1';

export interface PendingUploadResult {
  ok: boolean;
  clientRunId?: string;
  zonesCaptured?: number;
}

export async function queuePendingUpload(payload: IngestRunRequest): Promise<boolean> {
  try {
    await AsyncStorage.setItem(PENDING_UPLOAD_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export async function retryPendingUpload(): Promise<PendingUploadResult> {
  if (supabase === null) return { ok: false };
  let payload: IngestRunRequest | null = null;
  try {
    const raw = await AsyncStorage.getItem(PENDING_UPLOAD_KEY);
    if (raw === null) return { ok: false };
    payload = JSON.parse(raw) as IngestRunRequest;
  } catch {
    return { ok: false };
  }
  if (typeof payload?.clientRunId !== 'string') {
    try {
      await AsyncStorage.removeItem(PENDING_UPLOAD_KEY);
    } catch {
      // no-op
    }
    return { ok: false };
  }
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session === null) return { ok: false };
    const { data, error } = await supabase.functions.invoke('ingest_run', { body: payload });
    if (error) return { ok: false };
    let zonesCaptured = 0;
    if (data !== null && data !== undefined) {
      const response = data as IngestRunResponse;
      zonesCaptured =
        response.hexes.claimed + response.hexes.stolen + response.hexes.defended;
      await saveLastRunResult(payload.clientRunId, response);
      notifyMapDataChanged();
    }
    await AsyncStorage.removeItem(PENDING_UPLOAD_KEY);
    return { ok: true, clientRunId: payload.clientRunId, zonesCaptured };
  } catch {
    return { ok: false };
  }
}
