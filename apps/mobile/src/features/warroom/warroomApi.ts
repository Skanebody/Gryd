/**
 * GRYD — missions War Room live (offensives, défense, frontières partielles).
 */
import { supabase } from '../../lib/supabase';
import type {
  DefenseMissionDemo,
  OffensiveDemo,
  OpenBoundaryDemo,
} from './demo';

export interface WarRoomLiveData {
  defenseMission: DefenseMissionDemo | null;
  offensive: OffensiveDemo | null;
  openBoundaries: OpenBoundaryDemo[];
  crewRank: number | null;
}

async function fetchCrewRank(crewId: string, cityId: string): Promise<number | null> {
  if (supabase === null) return null;
  const { data } = await supabase
    .from('crew_leaderboard')
    .select('crew_id')
    .eq('city_id', cityId)
    .order('points_total', { ascending: false })
    .limit(100);
  if (!Array.isArray(data)) return null;
  const idx = data.findIndex((r) => (r as { crew_id: string }).crew_id === crewId);
  return idx >= 0 ? idx + 1 : null;
}

export async function fetchWarRoomLive(
  crewId: string,
  cityId: string,
  userId: string,
): Promise<WarRoomLiveData> {
  const empty: WarRoomLiveData = {
    defenseMission: null,
    offensive: null,
    openBoundaries: [],
    crewRank: null,
  };
  if (supabase === null) return empty;

  const now = new Date().toISOString();

  const [defenseRes, offensiveRes, boundariesRes, rank] = await Promise.all([
    supabase
      .from('defense_missions')
      .select('zone_label, expires_at, assigned_role')
      .eq('crew_id', crewId)
      .eq('done', false)
      .gt('expires_at', now)
      .order('expires_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('offensives')
      .select('id, zone_label, objectif_hexes, ends_at, status')
      .eq('crew_id', crewId)
      .eq('status', 'active')
      .gt('ends_at', now)
      .order('ends_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('partial_boundaries')
      .select('id, name, missing_m, expires_at, opener_user_id')
      .eq('crew_id', crewId)
      .eq('status', 'open')
      .gt('expires_at', now)
      .order('expires_at', { ascending: true })
      .limit(5),
    fetchCrewRank(crewId, cityId),
  ]);

  let defenseMission: DefenseMissionDemo | null = null;
  if (defenseRes.data) {
    const row = defenseRes.data as { zone_label: string; expires_at: string; assigned_role: string | null };
    const expiresMs = new Date(row.expires_at).getTime() - Date.now();
    defenseMission = {
      zone: row.zone_label,
      hexes: 0,
      expiresInH: Math.max(1, Math.ceil(expiresMs / 3_600_000)),
      assignedAvailability: 'defense',
    };
  }

  let offensive: OffensiveDemo | null = null;
  if (offensiveRes.data) {
    const row = offensiveRes.data as {
      id: string;
      zone_label: string;
      objectif_hexes: number;
      ends_at: string;
    };
    const { data: contribs } = await supabase
      .from('offensive_contributions')
      .select('user_id, hexes')
      .eq('offensive_id', row.id);
    let hexesTaken = 0;
    let myHexes = 0;
    let activeMembers = 0;
    if (Array.isArray(contribs)) {
      for (const c of contribs as { user_id: string; hexes: number }[]) {
        hexesTaken += c.hexes;
        if (c.hexes > 0) activeMembers += 1;
        if (c.user_id === userId) myHexes = c.hexes;
      }
    }
    const remainingS = Math.max(0, Math.floor((new Date(row.ends_at).getTime() - Date.now()) / 1000));
    offensive = {
      zone: row.zone_label,
      objectiveHexes: row.objectif_hexes,
      hexesTaken,
      remainingS,
      activeMembers,
      totalMembers: activeMembers,
      myHexes,
      reward: 'Coffre crew',
    };
  }

  const openBoundaries: OpenBoundaryDemo[] = [];
  if (Array.isArray(boundariesRes.data)) {
    for (const b of boundariesRes.data as {
      id: string;
      name: string;
      missing_m: number;
      expires_at: string;
    }[]) {
      const expiresInMin = Math.max(
        1,
        Math.ceil((new Date(b.expires_at).getTime() - Date.now()) / 60_000),
      );
      openBoundaries.push({
        key: b.id,
        boundaryId: b.id,
        zone: b.name,
        missingM: Math.round(Number(b.missing_m)),
        expiresInMin,
        opener: 'Un membre',
      });
    }
  }

  return { defenseMission, offensive, openBoundaries, crewRank: rank };
}
