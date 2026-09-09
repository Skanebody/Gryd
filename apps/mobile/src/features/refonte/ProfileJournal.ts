import { useMemo } from 'react';
import type { Activity } from '@klaim/shared';
import { useMyRunHistory } from '../history/real';
import { useLocalActivities2026 } from './localActivities';

export interface JournalEntry2026 {
  id: string;
  startedAtMs: number;
  km: number;
  durationS: number;
  localId?: string;
  pending?: boolean;
}
/** One read model for the journal and sports stats; online receipts de-duplicate the local copy. */
export function useProfileJournal(activity: Activity) {
  const history = useMyRunHistory(activity);
  const local = useLocalActivities2026();
  const runs = useMemo<JournalEntry2026[]>(() => {
    const remoteIds = new Set(history.runs.map(run => run.id));
    const localByRemoteId = new Map<string, string>();
    const activities = local.activities.filter(run => run.activity === activity);
    for (const run of activities) {
      localByRemoteId.set(run.clientRunId, run.clientRunId);
      if (run.result?.runId) localByRemoteId.set(run.result.runId, run.clientRunId);
    }
    // Keep the persisted trace detail after a server refresh replaces a queued entry.
    const remoteEntries = history.runs.map(run => ({ ...run, localId: localByRemoteId.get(run.id), pending: false }));
    const localEntries = activities
      .filter(run => !remoteIds.has(run.result?.runId ?? '') && !remoteIds.has(run.clientRunId))
      .map(run => ({ id: run.clientRunId, startedAtMs: Date.parse(run.startedAt), km: run.distanceM / 1000, durationS: run.durationS, localId: run.clientRunId, pending: run.pending }));
    return [...remoteEntries, ...localEntries].sort((a, b) => b.startedAtMs - a.startedAtMs);
  }, [history.runs, local.activities, activity]);
  const status = runs.length > 0 ? 'ready' : local.loading ? 'loading' : local.failed && history.status !== 'ready' ? 'failed' : history.status;
  return { runs, status, historyStatus: history.status, localFailed: local.failed, reload: history.reload };
}
