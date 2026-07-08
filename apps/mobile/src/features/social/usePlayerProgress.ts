/**
 * GRYD — hook progression joueur : Supabase si connecté, démo sinon.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { BadgeMetric } from '@klaim/shared';
import { useSession } from '../../lib/session';
import { UNLOCKED_DEMO, UNLOCKED_IDS, demoStat } from '../badges/demo';
import { fetchPlayerProgress, type PlayerProgressData } from './userProgressApi';

export interface PlayerProgressState {
  loading: boolean;
  useDemo: boolean;
  progress: PlayerProgressData | null;
  stat: (metric: BadgeMetric) => number;
  isUnlocked: (badgeId: string) => boolean;
  unlockedDate: (badgeId: string) => string | undefined;
  unlockedIds: ReadonlySet<string>;
  refresh: () => void;
}

export function usePlayerProgress(): PlayerProgressState {
  const { session, configured } = useSession();
  const [progress, setProgress] = useState<PlayerProgressData | null>(null);
  const [loading, setLoading] = useState(configured);
  const useDemo = !configured || session === null;

  const refresh = useCallback(() => {
    if (useDemo || session === null) {
      setProgress(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    void fetchPlayerProgress(session.user.id)
      .then(setProgress)
      .finally(() => setLoading(false));
  }, [session, useDemo]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const stat = useCallback(
    (metric: BadgeMetric): number => {
      if (useDemo || progress === null) return demoStat(metric);
      return progress.stats[metric] ?? 0;
    },
    [progress, useDemo],
  );

  const unlockedIds = useMemo((): ReadonlySet<string> => {
    if (useDemo || progress === null) return UNLOCKED_IDS;
    return new Set(progress.unlockedBadgeIds);
  }, [progress, useDemo]);

  const isUnlocked = useCallback(
    (badgeId: string) => unlockedIds.has(badgeId),
    [unlockedIds],
  );

  const unlockedDate = useCallback(
    (badgeId: string): string | undefined => {
      if (useDemo || progress === null) return UNLOCKED_DEMO.get(badgeId);
      return progress.unlockedDates.get(badgeId);
    },
    [progress, useDemo],
  );

  return { loading, useDemo, progress, stat, isUnlocked, unlockedDate, unlockedIds, refresh };
}
