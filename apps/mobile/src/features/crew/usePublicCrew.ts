/**
 * GRYD — hook fiche crew publique par tag/slug.
 */
import { useEffect, useState } from 'react';
import { useSession } from '../../lib/session';
import { fetchPublicCrewByTag } from './crewDiscoveryApi';
import { publicCrewForTag, type PublicCrewDemo } from './publicDemo';

export function usePublicCrew(tagOrSlug?: string): { crew: PublicCrewDemo; useDemo: boolean } {
  const { session, configured } = useSession();
  const useDemo = !configured || session === null;
  const [crew, setCrew] = useState<PublicCrewDemo>(() => publicCrewForTag(tagOrSlug));

  useEffect(() => {
    if (useDemo) {
      setCrew(publicCrewForTag(tagOrSlug));
      return;
    }
    void fetchPublicCrewByTag(tagOrSlug).then((live) => {
      setCrew(live ?? publicCrewForTag(tagOrSlug));
    });
  }, [tagOrSlug, useDemo]);

  return { crew, useDemo };
}
