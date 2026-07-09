/**
 * GRYD — hook historique : runs serveur uniquement (état vide sinon).
 */
import { useCallback, useEffect, useState } from 'react';
import { useSession } from '../../lib/session';
import { isBackendLive } from '../../lib/liveMode';
import { type HistoryFilter, type RunHistoryEntry } from './demo';
import { fetchMyRuns, filterRunEntries } from './runsApi';

export interface RunHistoryState {
  loading: boolean;
  entries: readonly RunHistoryEntry[];
  runsByFilter: (filter: HistoryFilter) => readonly RunHistoryEntry[];
  countByFilter: (filter: HistoryFilter) => number;
  refresh: () => void;
}

export function useRunHistory(): RunHistoryState {
  const { session } = useSession();
  const canLoad = isBackendLive(session);
  const [entries, setEntries] = useState<RunHistoryEntry[]>([]);
  const [loading, setLoading] = useState(canLoad);

  const refresh = useCallback(() => {
    if (!canLoad || session === null) {
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    void fetchMyRuns(session.user.id)
      .then(setEntries)
      .finally(() => setLoading(false));
  }, [canLoad, session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const listFor = useCallback(
    (filter: HistoryFilter) => filterRunEntries(entries, filter),
    [entries],
  );

  const countFor = useCallback(
    (filter: HistoryFilter) => filterRunEntries(entries, filter).length,
    [entries],
  );

  return {
    loading,
    entries,
    runsByFilter: listFor,
    countByFilter: countFor,
    refresh,
  };
}
