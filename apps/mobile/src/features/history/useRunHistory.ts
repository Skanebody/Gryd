/**
 * GRYD — hook historique : runs serveur si connecté, démo sinon.
 */
import { useCallback, useEffect, useState } from 'react';
import { useSession } from '../../lib/session';
import {
  countByFilter,
  runsByFilter,
  type HistoryFilter,
  type RunHistoryEntry,
} from './demo';
import { fetchMyRuns, filterRunEntries } from './runsApi';

export interface RunHistoryState {
  loading: boolean;
  /** true = pas de backend/session → données démo. */
  useDemo: boolean;
  entries: readonly RunHistoryEntry[];
  runsByFilter: (filter: HistoryFilter) => readonly RunHistoryEntry[];
  countByFilter: (filter: HistoryFilter) => number;
  refresh: () => void;
}

export function useRunHistory(): RunHistoryState {
  const { session, configured } = useSession();
  const [entries, setEntries] = useState<RunHistoryEntry[]>([]);
  const [loading, setLoading] = useState(configured);
  const useDemo = !configured || session === null;

  const refresh = useCallback(() => {
    if (useDemo || session === null) {
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    void fetchMyRuns(session.user.id)
      .then(setEntries)
      .finally(() => setLoading(false));
  }, [session, useDemo]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const listFor = useCallback(
    (filter: HistoryFilter) => {
      if (useDemo) return runsByFilter(filter);
      return filterRunEntries(entries, filter);
    },
    [entries, useDemo],
  );

  const countFor = useCallback(
    (filter: HistoryFilter) => {
      if (useDemo) return countByFilter(filter);
      return filterRunEntries(entries, filter).length;
    },
    [entries, useDemo],
  );

  return {
    loading,
    useDemo,
    entries: useDemo ? runsByFilter('all') : entries,
    runsByFilter: listFor,
    countByFilter: countFor,
    refresh,
  };
}
