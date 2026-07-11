/**
 * GRYD — signaux de recommandation Arsenal.
 *
 * L'Arsenal doit réduire la friction : pousser l'item utile maintenant, expliquer
 * pourquoi, puis laisser l'utilisateur explorer. Ce hook compose les signaux
 * déjà connus par l'app (profil, préférences, crew, carte) et les enrichit en
 * lecture seule depuis Supabase quand une session existe. Le serveur reste seul
 * décideur des claims, bonus et inventaires réels.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  BONUS_RETURN_ABSENCE_MAX_DAYS,
  BONUS_RETURN_ABSENCE_MIN_DAYS,
  CREW_CHEST_WEEKLY_TARGET,
  SECTOR_PRESSURE_BANDS,
  SECTOR_PRESSURE_MAX,
  SECTOR_PRESSURE_WEIGHTS,
  type ActivitySharing,
  type MapSharing,
  type PlayStyle,
} from '@klaim/shared';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';
import { MY_CREW } from '../crew/demo';
import { battleMapData, battleMapSummary, type BattleMapSummary } from '../map/fakeHexes';
import { useMotivationPrefs, type MotivationPrefs } from '../motivation/store';
import { useMyProfile, type MergedProfile } from '../social/profileStore';
import { DEMO_ARSENAL_SIGNALS, type ArsenalPlayerSignals } from './recommendations';

export type ArsenalSignalsSource = 'local' | 'server';

export interface ArsenalSignalsState {
  signals: ArsenalPlayerSignals;
  source: ArsenalSignalsSource;
  loading: boolean;
}

interface RemoteProfileSignals {
  playStyle?: PlayStyle;
  activitySharing?: ActivitySharing;
  mapSharing?: MapSharing;
  discreetMode?: boolean;
}

interface RemoteArsenalSignals {
  profile?: RemoteProfileSignals;
  crewId?: string | null;
  crewChestProgress?: number;
  lastRunStartedAt?: string | null;
}

type RemoteProfileRow = {
  play_style?: unknown;
  activity_sharing?: unknown;
  map_sharing?: unknown;
  discreet_mode?: unknown;
};

type RemoteCrewMemberRow = {
  crew_id?: unknown;
};

type RemoteCrewChestRow = {
  progress?: unknown;
};

type RemoteRunRow = {
  started_at?: unknown;
};

const PERCENT_MAX = 100;
const MS_PER_DAY = 86_400_000;
const WEEKEND_DAY_INDEXES = new Set([0, 5, 6]);

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function asNumber(value: unknown): number | undefined {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function asPlayStyle(value: unknown): PlayStyle | undefined {
  return value === 'focus_solo' || value === 'mixte' || value === 'crew_war' ? value : undefined;
}

function asActivitySharing(value: unknown): ActivitySharing | undefined {
  return value === 'private' || value === 'friends' || value === 'crew' || value === 'stats_only'
    ? value
    : undefined;
}

function asMapSharing(value: unknown): MapSharing | undefined {
  return value === 'precise' || value === 'simplified' || value === 'territory_only' || value === 'none'
    ? value
    : undefined;
}

function crewChestRemainingPct(progress: number): number {
  const done = clamp(progress, 0, CREW_CHEST_WEEKLY_TARGET);
  const remaining = CREW_CHEST_WEEKLY_TARGET - done;
  return Math.round((remaining / CREW_CHEST_WEEKLY_TARGET) * PERCENT_MAX);
}

function pressureFromLocalMap(summary: BattleMapSummary): number {
  const totalReadableCells = Math.max(summary.held + summary.contested + summary.objectiveHexes, 1);
  const decayFraction = clamp((summary.decay + summary.decayUrgent) / totalReadableCells, 0, 1);
  const decayPressure = Math.round(decayFraction * SECTOR_PRESSURE_WEIGHTS.decay);
  const basePressure =
    summary.decayUrgent > 0
      ? SECTOR_PRESSURE_BANDS.urgence
      : summary.contested > 0
        ? SECTOR_PRESSURE_BANDS.contestee
        : summary.objectiveHexes > 0
          ? SECTOR_PRESSURE_BANDS.pression
          : SECTOR_PRESSURE_BANDS.stable;
  return clamp(basePressure + decayPressure, SECTOR_PRESSURE_BANDS.stable, SECTOR_PRESSURE_MAX);
}

function shareIntentFromPrefs(
  activitySharing: ActivitySharing,
  mapSharing: MapSharing,
  discreetMode: boolean,
): boolean {
  if (discreetMode) return false;
  return activitySharing === 'crew' || activitySharing === 'friends' || mapSharing === 'precise';
}

function wantsMapIdentityFromPrefs(
  playStyle: PlayStyle,
  mapSharing: MapSharing,
  profile: Pick<MergedProfile, 'featuredBadgeIds' | 'avatarInitials'>,
): boolean {
  if (profile.featuredBadgeIds.length > 0 || profile.avatarInitials.trim().length > 0) return true;
  return playStyle !== 'crew_war' && mapSharing !== 'none';
}

function nextCrewWindow(playStyle: PlayStyle, now = new Date()): ArsenalPlayerSignals['nextCrewWindow'] {
  if (playStyle === 'crew_war') return WEEKEND_DAY_INDEXES.has(now.getDay()) ? 'weekend' : 'season';
  return WEEKEND_DAY_INDEXES.has(now.getDay()) ? 'weekend' : 'today';
}

function isWeeklyStreakAtRisk(lastRunStartedAt: string | null | undefined, now = new Date()): boolean {
  if (!lastRunStartedAt) return DEMO_ARSENAL_SIGNALS.weeklyStreakAtRisk;
  const startedAt = new Date(lastRunStartedAt).getTime();
  if (!Number.isFinite(startedAt)) return DEMO_ARSENAL_SIGNALS.weeklyStreakAtRisk;
  const daysSinceRun = (now.getTime() - startedAt) / MS_PER_DAY;
  return daysSinceRun >= BONUS_RETURN_ABSENCE_MIN_DAYS && daysSinceRun <= BONUS_RETURN_ABSENCE_MAX_DAYS;
}

function buildLocalSignals(profile: MergedProfile, prefs: MotivationPrefs): ArsenalPlayerSignals {
  const mapSummary = battleMapSummary(battleMapData().collection);
  const hasCrew = profile.crewTag.trim().length > 0;
  return {
    pressureScore: pressureFromLocalMap(mapSummary),
    hasCrew,
    crewChestRemainingPct: hasCrew
      ? crewChestRemainingPct(MY_CREW.chestProgress)
      : DEMO_ARSENAL_SIGNALS.crewChestRemainingPct,
    weeklyStreakAtRisk: DEMO_ARSENAL_SIGNALS.weeklyStreakAtRisk,
    shareIntent: shareIntentFromPrefs(prefs.activitySharing, prefs.mapSharing, prefs.discreetMode),
    wantsMapIdentity: wantsMapIdentityFromPrefs(prefs.playStyle, prefs.mapSharing, profile),
    nextCrewWindow: nextCrewWindow(prefs.playStyle),
  };
}

function mergeRemoteSignals(
  local: ArsenalPlayerSignals,
  remote: RemoteArsenalSignals | null,
  profile: MergedProfile,
  prefs: MotivationPrefs,
): ArsenalPlayerSignals {
  if (!remote) return local;
  const playStyle = remote.profile?.playStyle ?? prefs.playStyle;
  const activitySharing = remote.profile?.activitySharing ?? prefs.activitySharing;
  const mapSharing = remote.profile?.mapSharing ?? prefs.mapSharing;
  const discreetMode = remote.profile?.discreetMode ?? prefs.discreetMode;
  return {
    ...local,
    hasCrew: Boolean(remote.crewId) || local.hasCrew,
    crewChestRemainingPct:
      remote.crewChestProgress !== undefined
        ? crewChestRemainingPct(remote.crewChestProgress)
        : local.crewChestRemainingPct,
    weeklyStreakAtRisk: isWeeklyStreakAtRisk(remote.lastRunStartedAt),
    shareIntent: shareIntentFromPrefs(activitySharing, mapSharing, discreetMode),
    wantsMapIdentity: wantsMapIdentityFromPrefs(playStyle, mapSharing, profile),
    nextCrewWindow: nextCrewWindow(playStyle),
  };
}

function profileSignalsFromRow(row: RemoteProfileRow | null): RemoteProfileSignals | undefined {
  if (!row) return undefined;
  return {
    playStyle: asPlayStyle(row.play_style),
    activitySharing: asActivitySharing(row.activity_sharing),
    mapSharing: asMapSharing(row.map_sharing),
    discreetMode: typeof row.discreet_mode === 'boolean' ? row.discreet_mode : undefined,
  };
}

async function fetchRemoteSignals(userId: string): Promise<RemoteArsenalSignals> {
  if (!supabase) return {};

  const [profileResult, crewResult, runResult] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('play_style, activity_sharing, map_sharing, discreet_mode')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('crew_members')
      .select('crew_id')
      .eq('user_id', userId)
      .is('left_at', null)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('runs')
      .select('started_at')
      .eq('user_id', userId)
      .in('status', ['valid', 'partial'])
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (profileResult.error) throw profileResult.error;
  if (crewResult.error) throw crewResult.error;
  if (runResult.error) throw runResult.error;

  const crewIdRaw = (crewResult.data as RemoteCrewMemberRow | null)?.crew_id;
  const crewId = typeof crewIdRaw === 'string' ? crewIdRaw : null;
  let crewChestProgress: number | undefined;

  if (crewId) {
    const chestResult = await supabase
      .from('crew_chests')
      .select('progress')
      .eq('crew_id', crewId)
      .order('week_start', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (chestResult.error) throw chestResult.error;
    crewChestProgress = asNumber((chestResult.data as RemoteCrewChestRow | null)?.progress);
  }

  const lastRunStartedAt = (runResult.data as RemoteRunRow | null)?.started_at;
  return {
    profile: profileSignalsFromRow(profileResult.data as RemoteProfileRow | null),
    crewId,
    crewChestProgress,
    lastRunStartedAt: typeof lastRunStartedAt === 'string' ? lastRunStartedAt : null,
  };
}

export function useArsenalSignals(): ArsenalSignalsState {
  const { profile, loading: profileLoading } = useMyProfile();
  const { prefs, loading: prefsLoading } = useMotivationPrefs();
  const { session, configured, loading: sessionLoading } = useSession();
  const [remote, setRemote] = useState<RemoteArsenalSignals | null>(null);
  const [remoteLoading, setRemoteLoading] = useState(false);

  useEffect(() => {
    const userId = session?.user.id;
    if (!configured || !userId || !supabase) {
      setRemote(null);
      setRemoteLoading(false);
      return;
    }

    let alive = true;
    setRemoteLoading(true);
    void fetchRemoteSignals(userId)
      .then((signals) => {
        if (alive) setRemote(signals);
      })
      .catch(() => {
        if (alive) setRemote(null);
      })
      .finally(() => {
        if (alive) setRemoteLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [configured, session?.user.id]);

  const localSignals = useMemo(() => buildLocalSignals(profile, prefs), [profile, prefs]);
  const signals = useMemo(
    () => mergeRemoteSignals(localSignals, remote, profile, prefs),
    [localSignals, remote, profile, prefs],
  );

  return {
    signals,
    source: remote ? 'server' : 'local',
    loading: profileLoading || prefsLoading || sessionLoading || remoteLoading,
  };
}
