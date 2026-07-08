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
  if (cityId === 'france') {
    return fetchFrancePlayerLeaderboard(myUserId);
  }

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

/** Classement villes par zones capturées (hex_claims actifs). */
export async function fetchCityLeaderboard(myCityId: string | null): Promise<LeagueBoard | null> {
  if (supabase === null) return null;

  const { data: cities, error: citiesErr } = await supabase
    .from('city_zones')
    .select('city_id, name')
    .eq('status', 'active');

  if (citiesErr || !Array.isArray(cities) || cities.length === 0) return null;

  const counts = await Promise.all(
    cities.map(async (city) => {
      const row = city as { city_id: string; name: string };
      const { count } = await supabase!
        .from('hex_claims')
        .select('*', { count: 'exact', head: true })
        .eq('city_id', row.city_id)
        .or('decay_at.is.null,decay_at.gt.now()');
      return { cityId: row.city_id, name: row.name, zones: count ?? 0 };
    }),
  );

  const sorted = counts.filter((c) => c.zones > 0).sort((a, b) => b.zones - a.zones);
  if (sorted.length === 0) return null;

  const rows: LeagueRow[] = sorted.map((c, i) => ({
    rank: i + 1,
    name: c.name,
    sub: c.cityId,
    value: c.zones,
    me: myCityId !== null && c.cityId === myCityId,
  }));

  return {
    id: 'ville',
    label: 'Ville',
    kind: 'city',
    valueLabel: 'zones',
    rows,
  };
}

async function fetchFrancePlayerLeaderboard(myUserId: string): Promise<LeagueBoard | null> {
  if (supabase === null) return null;

  const { data: seasons } = await supabase
    .from('seasons')
    .select('id')
    .eq('status', 'active');
  if (!seasons || seasons.length === 0) return null;

  const seasonIds = seasons.map((s) => (s as { id: string }).id);
  const { data: scores, error } = await supabase
    .from('season_scores')
    .select('user_id, points, users(pseudo)')
    .in('season_id', seasonIds);

  if (error || !Array.isArray(scores) || scores.length === 0) return null;

  const totals = new Map<string, { pseudo: string; points: number }>();
  for (const row of scores as {
    user_id: string;
    points: number;
    users: { pseudo: string } | { pseudo: string }[] | null;
  }[]) {
    const rawUser = row.users;
    const user = Array.isArray(rawUser) ? rawUser[0] : rawUser;
    const prev = totals.get(row.user_id);
    const nextPts = (prev?.points ?? 0) + Number(row.points);
    totals.set(row.user_id, {
      pseudo: user?.pseudo ?? prev?.pseudo ?? 'Coureur',
      points: nextPts,
    });
  }

  const sorted = [...totals.entries()].sort((a, b) => b[1].points - a[1].points).slice(0, 50);
  if (sorted.length === 0) return null;

  const rows: LeagueRow[] = sorted.map(([userId, { pseudo, points }], i) => ({
    rank: i + 1,
    name: pseudo,
    value: points,
    me: userId === myUserId,
  }));

  return {
    id: 'france',
    label: 'Joueurs',
    kind: 'player',
    valueLabel: 'pts',
    rows,
  };
}
