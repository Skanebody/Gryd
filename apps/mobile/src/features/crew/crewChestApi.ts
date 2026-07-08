/**
 * GRYD — réclamation coffre crew hebdo (Edge Function claim_crew_chest).
 */
import { supabase } from '../../lib/supabase';
import type { CrewChestTier } from '@klaim/shared';

export interface ClaimCrewChestResult {
  ok: boolean;
  tier?: CrewChestTier;
  fouleesEach?: number;
  membersRewarded?: number;
  error?: string;
}

export async function claimCrewChest(): Promise<ClaimCrewChestResult> {
  if (supabase === null) return { ok: false, error: 'offline' };
  const { data, error } = await supabase.functions.invoke('claim_crew_chest', { body: {} });
  if (error) return { ok: false, error: error.message };
  const payload = data as ClaimCrewChestResult & { error?: string };
  if (payload.error) return { ok: false, error: payload.error };
  return payload;
}
