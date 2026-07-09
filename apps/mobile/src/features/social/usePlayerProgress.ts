/**
 * GRYD — hook progression joueur : Supabase uniquement (zéros / vide sinon).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { BadgeMetric } from '@klaim/shared';
import { useSession } from '../../lib/session';
import { isBackendLive } from '../../lib/liveMode';
import { fetchPlayerProgress, type PlayerProgressData } from './userProgressApi';

export interface PlayerProgressState {
  loading: boolean;
  progress: PlayerProgressData | null;
  stat: (metric: BadgeMetric) => number;
  isUnlocked: (badgeId: string) => boolean;
  unlockedDate: (badgeId: string) => string | undefined;
  unlockedIds: ReadonlySet<string>;
  refresh: () => void;
}

export function usePlayerProgress(): PlayerProgressState {
  const { session } = useSession();
  const canLoad = isBackendLive(session);
  const [progress, setProgress] = useState<PlayerProgressData | null>(null);
  const [loading, setLoading] = useState(canLoad);

  const refresh = useCallback(() => {
    if (!canLoad || session === null) {
      setProgress(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    void fetchPlayerProgress(session.user.id)
      .then(setProgress)
      .finally(() => setLoading(false));
  }, [canLoad, session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const stat = useCallback(
    (metric: BadgeMetric): number => progress?.stats[metric] ?? 0,
    [progress],
  );

  const unlockedIds = useMemo((): ReadonlySet<string> => {
    if (progress === null) return new Set();
    return new Set(progress.unlockedBadgeIds);
  }, [progress]);

  const isUnlocked = useCallback(
    (badgeId: string) => unlockedIds.has(badgeId),
    [unlockedIds],
  );

  const unlockedDate = useCallback(
    (badgeId: string): string | undefined => progress?.unlockedDates.get(badgeId),
    [progress],
  );

  return { loading, progress, stat, isUnlocked, unlockedDate, unlockedIds, refresh };
}
