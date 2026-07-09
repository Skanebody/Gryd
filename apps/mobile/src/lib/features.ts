/**
 * GRYD — vérification entitlement côté mobile (RPC Supabase).
 */
import { FEATURE_KEYS, isFreeFeature, type FeatureKey } from '@klaim/shared';
import { supabase } from './supabase';

const cache = new Map<string, { at: number; value: boolean }>();
const CACHE_MS = 60_000;

export async function isFeatureAvailable(featureKey: FeatureKey): Promise<boolean> {
  if (isFreeFeature(featureKey)) return true;
  if (supabase === null) return false;

  const cached = cache.get(featureKey);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;

  const { data, error } = await supabase.rpc('is_feature_entitled', {
    p_feature_key: featureKey,
  });
  const ok = !error && data === true;
  cache.set(featureKey, { at: Date.now(), value: ok });
  return ok;
}

/** Invalide le cache après achat / refresh pass. */
export function clearFeatureEntitlementCache(): void {
  cache.clear();
}

export { FEATURE_KEYS, type FeatureKey };
