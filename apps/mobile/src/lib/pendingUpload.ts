/**
 * GRYD — envoi différé de fin de course (AMENDEMENT-15 §2, hors-ligne).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { IngestRunRequest, IngestRunResponse } from '@klaim/shared';
import { saveLastRunResult } from './lastRunResult';
import { notifyMapDataChanged } from './mapRefresh';
import { supabase } from './supabase';

const PENDING_UPLOAD_KEY = 'gryd.pendingUpload.v1';

export async function queuePendingUpload(payload: IngestRunRequest): Promise<boolean> {
  try {
    await AsyncStorage.setItem(PENDING_UPLOAD_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export async function retryPendingUpload(): Promise<boolean> {
  if (supabase === null) return false;
  let payload: IngestRunRequest | null = null;
  try {
    const raw = await AsyncStorage.getItem(PENDING_UPLOAD_KEY);
    if (raw === null) return false;
    payload = JSON.parse(raw) as IngestRunRequest;
  } catch {
    return false;
  }
  if (typeof payload?.clientRunId !== 'string') {
    try {
      await AsyncStorage.removeItem(PENDING_UPLOAD_KEY);
    } catch {
      // no-op
    }
    return false;
  }
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session === null) return false;
    const { data, error } = await supabase.functions.invoke('ingest_run', { body: payload });
    if (error) return false;
    if (data !== null && data !== undefined) {
      await saveLastRunResult(payload.clientRunId, data as IngestRunResponse);
      notifyMapDataChanged();
    }
    await AsyncStorage.removeItem(PENDING_UPLOAD_KEY);
    return true;
  } catch {
    return false;
  }
}
