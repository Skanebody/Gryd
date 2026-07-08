/**
 * GRYD — activation d'objets Arsenal consommables (serveur décide).
 */
import { supabase } from '../../lib/supabase';
import { EVENTS, track } from '../../lib/analytics';

export interface ActivateArsenalResult {
  alertId: string;
  h3index: string;
  expiresAt: string;
  source: string;
}

export type ActivateArsenalError =
  | 'backend_not_configured'
  | 'item_not_owned'
  | 'hex_not_owned'
  | 'hex_not_fresh'
  | 'weekly_cap_user'
  | 'weekly_cap_crew'
  | 'already_active'
  | 'activate_failed';

export async function activateAttackAlert(
  h3index: string,
  cityId = 'paris',
): Promise<ActivateArsenalResult | { error: ActivateArsenalError }> {
  if (!supabase) return { error: 'backend_not_configured' };
  const { data, error } = await supabase.rpc('activate_arsenal_item', {
    p_item_key: 'attack_alert',
    p_h3index: h3index,
    p_city_id: cityId,
  });
  if (error) {
    const msg = error.message ?? '';
    if (msg.includes('item_not_owned')) return { error: 'item_not_owned' };
    if (msg.includes('hex_not_owned')) return { error: 'hex_not_owned' };
    if (msg.includes('hex_not_fresh')) return { error: 'hex_not_fresh' };
    if (msg.includes('weekly_cap_user')) return { error: 'weekly_cap_user' };
    if (msg.includes('weekly_cap_crew')) return { error: 'weekly_cap_crew' };
    if (msg.includes('already_active')) return { error: 'already_active' };
    return { error: 'activate_failed' };
  }
  const res = data as {
    alertId: string;
    h3index: string;
    expiresAt: string;
    source: string;
  };
  track(EVENTS.attackAlertActivated, { h3: h3index, source: res.source });
  track(EVENTS.inventoryItemUsed, { item_key: 'attack_alert' });
  return res;
}

/** Dernière zone possédée fraîche (< 24 h) pour activation depuis l'Arsenal. */
export async function fetchFreshOwnedHex(
  userId: string,
  cityId = 'paris',
): Promise<string | null> {
  if (!supabase) return null;
  const since = new Date(Date.now() - 24 * 3_600_000).toISOString();
  const { data, error } = await supabase
    .from('hex_claims')
    .select('h3index, claimed_at')
    .eq('owner_user_id', userId)
    .eq('city_id', cityId)
    .gte('claimed_at', since)
    .order('claimed_at', { ascending: false })
    .limit(1);
  if (error || !data?.length) return null;
  const h3 = data[0]?.h3index;
  return h3 != null ? String(h3) : null;
}
