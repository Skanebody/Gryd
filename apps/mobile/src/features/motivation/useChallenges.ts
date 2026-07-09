/**
 * GRYD — hook challenges actifs (Supabase uniquement).
 */
import { useCallback, useEffect, useState } from 'react';
import { useSession } from '../../lib/session';
import { isBackendLive } from '../../lib/liveMode';
import { fetchActiveChallenges, findChallengeInList } from './challengesApi';
import { type ChallengeCard } from './demo';

export interface ChallengesState {
  loading: boolean;
  challenges: readonly ChallengeCard[];
  findChallenge: (id: string) => ChallengeCard | undefined;
  refresh: () => void;
}

export function useChallenges(): ChallengesState {
  const { session } = useSession();
  const canLoad = isBackendLive(session);
  const [loading, setLoading] = useState(canLoad);
  const [challenges, setChallenges] = useState<readonly ChallengeCard[]>([]);

  const refresh = useCallback(() => {
    if (!canLoad || session === null) {
      setChallenges([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    void fetchActiveChallenges(session.user.id)
      .then(setChallenges)
      .catch(() => setChallenges([]))
      .finally(() => setLoading(false));
  }, [canLoad, session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const findChallenge = useCallback(
    (id: string) => findChallengeInList(challenges, id),
    [challenges],
  );

  return { loading, challenges, findChallenge, refresh };
}
