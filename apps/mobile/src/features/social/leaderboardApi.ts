/**
 * GRYD — classements saison depuis les vues Supabase.
 */
import { supabase } from '../../lib/supabase';
import type { LeagueBoard, LeagueRow } from './league';

const DEFAULT_CITY = 'paris';

interface PlayerLbRow {
  user_id: string;
  pseudo: string;
  points: number;
  rank_cache: number | null;
}

interface CrewLbRow {
  crew_id: string;
  name: string;
  points_total: number;
  hexes_held: number;
  color: number;
}

async function activeSeasonId(cityId: string): Promise<string | null> {
  if (supabase === null) return null;
  const { data } = await supabase
    .from('seasons')
    .select('id')
    .eq('city_id', cityId)
    .eq('status', 'active')
    .maybeSingle();
  return data?.id ?? null;
}

export async function fetchPlayerLeaderboard(
  myUserId: string,
  cityId = DEFAULT_CITY,
): Promise<LeagueBoard | null> {
  if (supabase === null) return null;
  const seasonId = await activeSeasonId(cityId);
  if (!seasonId) return null;

  const { data, error } = await supabase
    .from('player_leaderboard')
    .select('user_id, pseudo, points, rank_cache')
    .eq('season_id', seasonId)
    .eq('city_id', cityId)
    .order('points', { ascending: false })
    .limit(50);

  if (error || !Array.isArray(data) || data.length === 0) return null;

  const rows: LeagueRow[] = (data as PlayerLbRow[]).map((r, i) => ({
    rank: r.rank_cache ?? i + 1,
    name: r.pseudo,
    value: r.points,
    me: r.user_id === myUserId,
  }));

  return {
    id: cityId === 'france' ? 'france' : 'joueurs',
    label: 'Joueurs',
    kind: 'player',
    valueLabel: 'pts',
    rows,
  };
}

export async function fetchCrewLeaderboard(
  myCrewId: string | null,
  cityId = DEFAULT_CITY,
): Promise<LeagueBoard | null> {
  if (supabase === null) return null;

  const { data, error } = await supabase
    .from('crew_leaderboard')
    .select('crew_id, name, points_total, hexes_held, color')
    .eq('city_id', cityId)
    .order('points_total', { ascending: false })
    .limit(50);

  if (error || !Array.isArray(data) || data.length === 0) return null;

  const rows: LeagueRow[] = (data as CrewLbRow[]).map((r, i) => ({
    rank: i + 1,
    name: r.name,
    sub: cityId,
    value: r.points_total,
    crewSeed: r.crew_id,
    me: myCrewId !== null && r.crew_id === myCrewId,
  }));

  return {
    id: 'crews',
    label: 'Crews',
    kind: 'crew',
    valueLabel: 'pts',
    rows,
  };
}
