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
}

export interface CrewMembershipResult {
  ok: boolean;
  action: 'create' | 'join_by_code' | 'leave';
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
    .select('crew_id, role, crews(id, name, code, city_id, color, level)')
    .eq('user_id', userId)
    .is('left_at', null)
    .maybeSingle();
  if (error || data === null || data.crews === null) return null;
  const crew = data.crews as unknown as CrewSummary;
  return { crewId: data.crew_id, role: data.role, crew };
}
