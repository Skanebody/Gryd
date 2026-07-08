/**
 * GRYD — hook crew actif (remplace HAS_CREW hardcodé en prod).
 */
import { useCallback, useEffect, useState } from 'react';
import { useSession } from '../../lib/session';
import { fetchActiveCrew, type ActiveCrewMembership } from './crewApi';
import { MY_CREW } from './demo';

export interface MyCrewState {
  loading: boolean;
  /** true = membre d'un crew (réel ou démo). */
  hasCrew: boolean;
  membership: ActiveCrewMembership | null;
  /** Nom affiché (réel ou démo). */
  crewName: string;
  refresh: () => void;
}

export function useMyCrew(): MyCrewState {
  const { session, configured } = useSession();
  const [membership, setMembership] = useState<ActiveCrewMembership | null>(null);
  const [loading, setLoading] = useState(configured);

  const refresh = useCallback(() => {
    if (!configured || session === null) {
      setMembership(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    void fetchActiveCrew(session.user.id)
      .then(setMembership)
      .finally(() => setLoading(false));
  }, [configured, session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const demoMode = !configured || session === null;
  const hasCrew = demoMode ? true : membership !== null;
  const crewName = membership?.crew.name ?? MY_CREW.name;

  return { loading, hasCrew, membership, crewName, refresh };
}
