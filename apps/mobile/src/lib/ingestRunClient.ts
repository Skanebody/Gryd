/**
 * GRYD — client ingest_run partagé (Never lose a run : un seul point d'appel).
 */
import type { IngestRunRequest, IngestRunResponse } from '@klaim/shared';
import { saveLastRunResult } from './lastRunResult';
import { notifyMapDataChanged } from './mapRefresh';
import { supabase } from './supabase';

export interface IngestRunResult {
  ok: boolean;
  response?: IngestRunResponse;
  errorMessage?: string;
}

export async function invokeIngestRun(payload: IngestRunRequest): Promise<IngestRunResult> {
  if (supabase === null) return { ok: false, errorMessage: 'no_supabase' };
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session === null) return { ok: false, errorMessage: 'no_session' };

    const { data, error } = await supabase.functions.invoke('ingest_run', { body: payload });
    if (error || data === null || data === undefined) {
      return { ok: false, errorMessage: error?.message ?? 'ingest_error' };
    }
    const response = data as IngestRunResponse;
    await saveLastRunResult(payload.clientRunId, response);
    notifyMapDataChanged();
    return { ok: true, response };
  } catch (err) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'network_error' };
  }
}
