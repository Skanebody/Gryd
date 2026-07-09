/**
 * GRYD — candidatures crew (lecture RLS + decide via crew_membership).
 */
import { supabase } from '../../lib/supabase';
import type { CrewMembershipResult } from './crewApi';

export interface CrewApplicationRow {
  id: string;
  userId: string;
  message: string | null;
  createdAt: string;
  handle: string;
  displayName: string | null;
}

export async function fetchPendingApplications(crewId: string): Promise<CrewApplicationRow[]> {
  if (supabase === null) return [];
  const { data, error } = await supabase
    .from('crew_applications')
    .select('id, user_id, message, created_at, user_profiles(handle, display_name)')
    .eq('crew_id', crewId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (error || !Array.isArray(data)) return [];

  return data.map((row) => {
    const rawProfile = row.user_profiles as
      | { handle: string; display_name: string | null }
      | { handle: string; display_name: string | null }[]
      | null;
    const profile = Array.isArray(rawProfile) ? rawProfile[0] : rawProfile;
    return {
      id: row.id as string,
      userId: row.user_id as string,
      message: (row.message as string | null) ?? null,
      createdAt: row.created_at as string,
      handle: profile?.handle ?? 'coureur',
      displayName: profile?.display_name ?? null,
    };
  });
}

async function invoke(body: Record<string, unknown>): Promise<CrewMembershipResult> {
  if (supabase === null) return { ok: false, action: 'decide_application', error: 'offline' };
  const { data, error } = await supabase.functions.invoke('crew_membership', { body });
  if (error) return { ok: false, action: 'decide_application', error: error.message };
  return data as CrewMembershipResult;
}

export async function decideApplication(
  applicationId: string,
  decision: 'accepted' | 'rejected',
): Promise<CrewMembershipResult> {
  return invoke({ action: 'decide_application', applicationId, decision });
}
