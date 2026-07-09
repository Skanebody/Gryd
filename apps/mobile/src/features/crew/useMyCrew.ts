/**
 * GRYD — hook crew actif (live uniquement).
 */
import { useCallback, useEffect, useState } from 'react';
import { useSession } from '../../lib/session';
import { isBackendLive } from '../../lib/liveMode';
import { fetchActiveCrew, type ActiveCrewMembership } from './crewApi';

export interface MyCrewState {
  loading: boolean;
  hasCrew: boolean;
  membership: ActiveCrewMembership | null;
  crewName: string;
  refresh: () => void;
}

export function useMyCrew(): MyCrewState {
  const { session } = useSession();
  const canLoad = isBackendLive(session);
  const [membership, setMembership] = useState<ActiveCrewMembership | null>(null);
  const [loading, setLoading] = useState(canLoad);

  const refresh = useCallback(() => {
    if (!canLoad || session === null) {
      setMembership(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    void fetchActiveCrew(session.user.id)
      .then(setMembership)
      .finally(() => setLoading(false));
  }, [canLoad, session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    loading,
    hasCrew: membership !== null,
    membership,
    crewName: membership?.crew.name ?? '',
    refresh,
  };
}
