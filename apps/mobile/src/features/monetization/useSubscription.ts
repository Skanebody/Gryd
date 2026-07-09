/**
 * GRYD — statut abonnement (GRYD Club) depuis Supabase.
 */
import { useCallback, useEffect, useState } from 'react';
import { useSession } from '../../lib/session';
import { clearFeatureEntitlementCache } from '../../lib/features';
import { fetchClubStatus } from './subscriptionApi';

export interface SubscriptionState {
  loading: boolean;
  isClub: boolean;
  refresh: () => void;
}

export function useSubscription(): SubscriptionState {
  const { session, configured } = useSession();
  const [loading, setLoading] = useState(configured);
  const [isClub, setIsClub] = useState(false);

  const refresh = useCallback(() => {
    if (!configured || session === null) {
      setIsClub(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    void fetchClubStatus(session.user.id)
      .then((club) => {
        setIsClub(club);
        clearFeatureEntitlementCache();
      })
      .finally(() => setLoading(false));
  }, [configured, session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { loading, isClub, refresh };
}
