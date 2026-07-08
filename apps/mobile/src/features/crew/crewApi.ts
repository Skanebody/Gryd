/**
 * GRYD — API crew membership (Edge Function crew_membership).
 */
import { supabase } from '../../lib/supabase';

export interface CrewSummary {
  id: string;
  name: string;
  code: string;
  city_id: string;
  color: number;
  level: number;
  xp: number;
  activity_score: number;
  activity_status: string;
  tag: string | null;
  slug: string | null;
  league: string;
  recruitment_status: string;
  tags: string[];
}

export interface CrewMembershipResult {
  ok: boolean;
  action: 'create' | 'join_by_code' | 'leave' | 'apply';
  crew?: CrewSummary;
  role?: string;
  error?: string;
}

async function invoke(body: Record<string, unknown>): Promise<CrewMembershipResult> {
  if (supabase === null) return { ok: false, action: 'create', error: 'offline' };
  const { data, error } = await supabase.functions.invoke('crew_membership', { body });
  if (error) return { ok: false, action: body.action as CrewMembershipResult['action'], error: error.message };
  return data as CrewMembershipResult;
}

export async function createCrew(name: string, cityId = 'paris', color = 0): Promise<CrewMembershipResult> {
  return invoke({ action: 'create', name, cityId, color });
}

export async function joinCrewByCode(code: string): Promise<CrewMembershipResult> {
  return invoke({ action: 'join_by_code', code: code.trim().toUpperCase() });
}

export async function leaveCrew(): Promise<CrewMembershipResult> {
  return invoke({ action: 'leave' });
}

export async function applyToCrew(crewId: string, message?: string): Promise<CrewMembershipResult> {
  return invoke({ action: 'apply', crewId, message: message?.trim() ?? '' });
}

export interface ActiveCrewMembership {
  crewId: string;
  role: string;
  crew: CrewSummary;
}

/** Charge le crew actif du joueur connecté (null = sans crew ou mode démo). */
export async function fetchActiveCrew(userId: string): Promise<ActiveCrewMembership | null> {
  if (supabase === null) return null;
  const { data, error } = await supabase
    .from('crew_members')
    .select(
      'crew_id, role, crews(id, name, code, city_id, color, level, xp, activity_score, activity_status, tag, slug, league, recruitment_status, tags)',
    )
    .eq('user_id', userId)
    .is('left_at', null)
    .maybeSingle();
  if (error || data === null || data.crews === null) return null;
  const raw = data.crews as unknown as CrewSummary;
  const crew: CrewSummary = {
    ...raw,
    activity_score: raw.activity_score ?? 0,
    activity_status: raw.activity_status ?? 'dormant',
    tag: raw.tag ?? null,
    slug: raw.slug ?? null,
    league: raw.league ?? 'bronze',
    recruitment_status: raw.recruitment_status ?? 'on_request',
    tags: raw.tags ?? [],
  };
  return { crewId: data.crew_id, role: data.role, crew };
}

/** Nombre de membres actifs d'un crew. */
export async function fetchCrewMemberCount(crewId: string): Promise<number> {
  if (supabase === null) return 0;
  const { count, error } = await supabase
    .from('crew_members')
    .select('*', { count: 'exact', head: true })
    .eq('crew_id', crewId)
    .is('left_at', null);
  if (error || count === null) return 0;
  return count;
}

export interface CrewMemberProfile {
  userId: string;
  role: string;
  joinedAt: string;
  handle: string;
  displayName: string | null;
}

/** Membres actifs + profils visibles (crew). */
export async function fetchCrewMembers(crewId: string): Promise<CrewMemberProfile[]> {
  if (supabase === null) return [];
  const { data, error } = await supabase
    .from('crew_members')
    .select('user_id, role, joined_at, user_profiles(handle, display_name)')
    .eq('crew_id', crewId)
    .is('left_at', null)
    .order('joined_at', { ascending: true });
  if (error || !Array.isArray(data)) return [];

  return data.map((row) => {
    const rawProfile = row.user_profiles as
      | { handle: string; display_name: string | null }
      | { handle: string; display_name: string | null }[]
      | null;
    const profile = Array.isArray(rawProfile) ? rawProfile[0] : rawProfile;
    return {
      userId: row.user_id as string,
      role: row.role as string,
      joinedAt: row.joined_at as string,
      handle: profile?.handle ?? 'coureur',
      displayName: profile?.display_name ?? null,
    };
  });
}
