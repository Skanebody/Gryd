/**
 * GRYD — progression joueur depuis Supabase (users, user_stats, user_badges).
 */
import type { BadgeMetric } from '@klaim/shared';
import { supabase } from '../../lib/supabase';

export interface UserStatsRow {
  runs_valid: number;
  total_distance_m: number;
  best_run_distance_m: number;
  hexes_captured: number;
  steals: number;
  defends: number;
  pioneer_hexes: number;
  max_hexes_in_run: number;
  routes: number;
  outposts: number;
  crews_joined: number;
  crew_contributions: number;
  season_zero_hexes: number;
  season_zero_runs: number;
  loop_runs: number;
  exact_ten_runs: number;
  wolf_hour_runs: number;
  night_runs: number;
  dawn_runs: number;
  solo_runs: number;
  active_day_streak: number;
  best_active_day_streak: number;
  group_runs: number;
  easy_runs: number;
  recovery_runs: number;
  personal_bests: number;
  smart_runs: number;
}

export interface PlayerProgressData {
  xp: number;
  level: number;
  pseudo: string;
  stats: Partial<Record<BadgeMetric, number>>;
  unlockedBadgeIds: readonly string[];
  unlockedDates: ReadonlyMap<string, string>;
  seasonPoints: number;
  seasonRank: number | null;
  streakWeeks: number;
}

/** Mappe une ligne user_stats (snake_case) vers les métriques badge (camelCase). */
export function metricsFromUserStats(row: UserStatsRow): Partial<Record<BadgeMetric, number>> {
  return {
    runsValid: row.runs_valid,
    totalDistanceM: Number(row.total_distance_m),
    bestRunDistanceM: row.best_run_distance_m,
    hexesCaptured: row.hexes_captured,
    steals: row.steals,
    defends: row.defends,
    pioneerHexes: row.pioneer_hexes,
    maxHexesInRun: row.max_hexes_in_run,
    routes: row.routes,
    outposts: row.outposts,
    crewsJoined: row.crews_joined,
    crewContributions: row.crew_contributions,
    seasonZeroHexes: row.season_zero_hexes,
    loopRuns: row.loop_runs,
    exactTenRuns: row.exact_ten_runs,
    wolfHourRuns: row.wolf_hour_runs,
    soloRuns: row.solo_runs,
    groupRuns: row.group_runs,
    easyRuns: row.easy_runs,
    recoveryRuns: row.recovery_runs,
    personalBests: row.personal_bests,
    smartRuns: row.smart_runs,
    weeksActive: row.best_active_day_streak,
  };
}

function formatBadgeDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export async function fetchPlayerProgress(userId: string): Promise<PlayerProgressData | null> {
  if (supabase === null) return null;

  const [userRes, statsRes, badgesRes, seasonRes] = await Promise.all([
    supabase.from('users').select('xp, level, pseudo, streak_weeks').eq('id', userId).maybeSingle(),
    supabase.from('user_stats').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('user_badges').select('badge_key, earned_at').eq('user_id', userId),
    supabase
      .from('seasons')
      .select('id')
      .eq('city_id', 'paris')
      .eq('status', 'active')
      .maybeSingle(),
  ]);

  if (userRes.error || userRes.data === null) return null;

  let seasonPoints = 0;
  let seasonRank: number | null = null;
  if (seasonRes.data?.id) {
    const scoreRes = await supabase
      .from('season_scores')
      .select('points, rank_cache')
      .eq('season_id', seasonRes.data.id)
      .eq('user_id', userId)
      .maybeSingle();
    if (scoreRes.data) {
      seasonPoints = scoreRes.data.points;
      seasonRank = scoreRes.data.rank_cache;
    }
  }

  const stats = statsRes.data
    ? metricsFromUserStats(statsRes.data as UserStatsRow)
    : {};

  const unlockedDates = new Map<string, string>();
  const unlockedBadgeIds: string[] = [];
  if (Array.isArray(badgesRes.data)) {
    for (const b of badgesRes.data as { badge_key: string; earned_at: string }[]) {
      unlockedBadgeIds.push(b.badge_key);
      unlockedDates.set(b.badge_key, formatBadgeDate(b.earned_at));
    }
  }

  return {
    xp: Number(userRes.data.xp),
    level: userRes.data.level,
    pseudo: userRes.data.pseudo,
    stats,
    unlockedBadgeIds,
    unlockedDates,
    seasonPoints,
    seasonRank,
    streakWeeks: userRes.data.streak_weeks ?? 0,
  };
}
