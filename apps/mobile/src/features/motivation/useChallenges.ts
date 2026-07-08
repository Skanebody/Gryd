/**
 * GRYD — hook challenges actifs (Supabase ou démo).
 */
import { useCallback, useEffect, useState } from 'react';
import { useSession } from '../../lib/session';
import { fetchActiveChallenges, findChallengeInList } from './challengesApi';
import { CHALLENGES, type ChallengeCard } from './demo';

export interface ChallengesState {
  loading: boolean;
  useDemo: boolean;
  challenges: readonly ChallengeCard[];
  findChallenge: (id: string) => ChallengeCard | undefined;
  refresh: () => void;
}

export function useChallenges(): ChallengesState {
  const { session, configured } = useSession();
  const useDemo = !configured || session === null;
  const [loading, setLoading] = useState(configured);
  const [challenges, setChallenges] = useState<readonly ChallengeCard[]>(CHALLENGES);

  const refresh = useCallback(() => {
    if (useDemo || session === null) {
      setChallenges(CHALLENGES);
      setLoading(false);
      return;
    }
    setLoading(true);
    void fetchActiveChallenges(session.user.id)
      .then((live) => setChallenges(live.length > 0 ? live : CHALLENGES))
      .catch(() => setChallenges(CHALLENGES))
      .finally(() => setLoading(false));
  }, [session, useDemo]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const findChallenge = useCallback(
    (id: string) => findChallengeInList(challenges, id) ?? findChallengeInList(CHALLENGES, id),
    [challenges],
  );

  return { loading, useDemo, challenges, findChallenge, refresh };
}
