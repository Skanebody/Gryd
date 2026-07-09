/**
 * GRYD — hook liste crews découvrables (Supabase uniquement).
 */
import { useCallback, useEffect, useState } from 'react';
import { useSession } from '../../lib/session';
import { isBackendLive } from '../../lib/liveMode';
import { fetchDiscoverableCrews } from './crewDiscoveryApi';
import { type PublicCrewDemo } from './publicDemo';

export interface DiscoverableCrewsState {
  loading: boolean;
  crews: readonly PublicCrewDemo[];
  refresh: () => void;
}

export function useDiscoverableCrews(cityId = 'paris'): DiscoverableCrewsState {
  const { session } = useSession();
  const canLoad = isBackendLive(session);
  const [loading, setLoading] = useState(canLoad);
  const [crews, setCrews] = useState<readonly PublicCrewDemo[]>([]);

  const refresh = useCallback(() => {
    if (!canLoad) {
      setCrews([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    void fetchDiscoverableCrews(cityId)
      .then(setCrews)
      .catch(() => setCrews([]))
      .finally(() => setLoading(false));
  }, [canLoad, cityId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { loading, crews, refresh };
}
