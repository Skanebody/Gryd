/**
 * GRYD — hook fiche crew publique (Supabase uniquement).
 */
import { useEffect, useState } from 'react';
import { useSession } from '../../lib/session';
import { isBackendLive } from '../../lib/liveMode';
import { fetchPublicCrewByTag } from './crewDiscoveryApi';
import { type PublicCrewDemo } from './publicDemo';

export function usePublicCrew(tagOrSlug?: string): { crew: PublicCrewDemo | null; loading: boolean } {
  const { session } = useSession();
  const canLoad = isBackendLive(session);
  const [crew, setCrew] = useState<PublicCrewDemo | null>(null);
  const [loading, setLoading] = useState(canLoad);

  useEffect(() => {
    if (!canLoad || !tagOrSlug) {
      setCrew(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    void fetchPublicCrewByTag(tagOrSlug)
      .then(setCrew)
      .catch(() => setCrew(null))
      .finally(() => setLoading(false));
  }, [canLoad, tagOrSlug]);

  return { crew, loading };
}
