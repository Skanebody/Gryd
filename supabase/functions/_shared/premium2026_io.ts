import type { SupabaseClient } from 'npm:@supabase/supabase-js@^2';
import { parsePremiumSnapshot2026 } from './premium2026.ts';
import { parseCommercialSnapshot2026, type CommercialConfig2026 } from './commercial2026.ts';

/** Server key stays here, never in Expo EXPO_PUBLIC_* variables. */
export async function syncPremiumOwner2026(db: SupabaseClient, userId: string, eventId: string, eventTimestampMs?: number) {
  const apiKey = Deno.env.get('RC_SECRET_API_KEY');
  if (!apiKey) throw new Error('revenuecat_server_not_configured');
  const entitlementId = Deno.env.get('RC_PRO_ENTITLEMENT_ID')?.trim() || 'gryd_pro';
  const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' }, signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`revenuecat_read_failed:${response.status}`);
  const payload = await response.json();
  const snapshot = parsePremiumSnapshot2026(payload, entitlementId, Deno.env.get('RC_ALLOW_SANDBOX') === 'true');
  if (!snapshot) throw new Error('revenuecat_invalid_snapshot');
  const { data: configs, error: configError } = await db.from('commercial_collections_2026').select('id,entitlement_id,product_ids');
  if (configError) throw new Error('commercial_catalog_unavailable');
  const commercial = parseCommercialSnapshot2026(payload, configs as CommercialConfig2026[], Deno.env.get('RC_ALLOW_SANDBOX') === 'true');
  if (!commercial) throw new Error('commercial_invalid_snapshot');
  const { error: commercialError } = await db.rpc('apply_commercial_snapshot_2026', { p_user_id: userId, p_event_id: eventId, p_observed_at_ms: commercial.observedAtMs, p_items: commercial.items });
  if (commercialError) throw new Error('commercial_snapshot_write');
  const { data, error } = await db.rpc('apply_gryd_plus_snapshot_2026', {
    p_user_id: userId, p_entitlement_id: entitlementId, p_product_id: snapshot.productId, p_active: snapshot.active,
    p_expires_at: snapshot.expiresAt, p_lifetime: snapshot.lifetime, p_event_id: eventId,
    p_event_timestamp_ms: eventTimestampMs ?? snapshot.observedAtMs, p_observed_at_ms: snapshot.observedAtMs,
  });
  if (error) throw new Error(`premium_snapshot_write:${error.code}`);
  if (data?.ignored) return data;
  // Also run after a replay: a transient collection failure must remain retryable.
  const { error: grantError } = await db.rpc('grant_earned_season_variants2026', { p_user_id: userId });
  if (grantError) throw new Error(`premium_season_grant:${grantError.code}`);
  return data;
}
