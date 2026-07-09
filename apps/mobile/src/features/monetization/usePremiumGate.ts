/**
 * GRYD — hook premium gate (RPC is_feature_entitled + cache).
 */
import { useCallback, useEffect, useState } from 'react';
import { isFreeFeature, type FeatureKey } from '@klaim/shared';
import { clearFeatureEntitlementCache, isFeatureAvailable } from '../../lib/features';
import { useSubscription } from './useSubscription';

export interface PremiumGateState {
  loading: boolean;
  available: boolean;
  refresh: () => void;
}

export function usePremiumGate(featureKey: FeatureKey): PremiumGateState {
  const { isClub, loading: subLoading } = useSubscription();
  const [available, setAvailable] = useState(isFreeFeature(featureKey));
  const [loading, setLoading] = useState(!isFreeFeature(featureKey));

  const refresh = useCallback(() => {
    if (isFreeFeature(featureKey)) {
      setAvailable(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    void isFeatureAvailable(featureKey)
      .then(setAvailable)
      .finally(() => setLoading(false));
  }, [featureKey]);

  useEffect(() => {
    refresh();
  }, [refresh, isClub]);

  useEffect(() => {
    if (!subLoading && isClub) clearFeatureEntitlementCache();
  }, [isClub, subLoading]);

  return { loading: loading || subLoading, available, refresh };
}
