/**
 * GRYD — hook liste crews découvrables (Supabase ou démo).
 */
import { useCallback, useEffect, useState } from 'react';
import { useSession } from '../../lib/session';
import { fetchDiscoverableCrews } from './crewDiscoveryApi';
import { PUBLIC_CREWS, type PublicCrewDemo } from './publicDemo';

export interface DiscoverableCrewsState {
  loading: boolean;
  useDemo: boolean;
  crews: readonly PublicCrewDemo[];
  refresh: () => void;
}

export function useDiscoverableCrews(cityId = 'paris'): DiscoverableCrewsState {
  const { session, configured } = useSession();
  const useDemo = !configured || session === null;
  const [loading, setLoading] = useState(configured);
  const [crews, setCrews] = useState<readonly PublicCrewDemo[]>(PUBLIC_CREWS);

  const refresh = useCallback(() => {
    if (useDemo) {
      setCrews(PUBLIC_CREWS);
      setLoading(false);
      return;
    }
    setLoading(true);
    void fetchDiscoverableCrews(cityId)
      .then((live) => setCrews(live.length > 0 ? live : PUBLIC_CREWS))
      .catch(() => setCrews(PUBLIC_CREWS))
      .finally(() => setLoading(false));
  }, [cityId, useDemo]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { loading, useDemo, crews, refresh };
}
