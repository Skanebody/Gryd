/**
 * GRYD — données Crew HQ live : coffre, territoire, war log, boost.
 * Lecture Supabase uniquement (écriture = Edge Functions / jobs).
 */
import type { CrewBoostSku } from '@klaim/shared';
import { supabase } from '../../lib/supabase';
import type { CrewBoostState } from '../arsenal';
import type { WarLogEntryDemo, WarLogType } from './feed';

export interface CrewTerritoryLive {
  sector: string;
  controlPct: number;
  zonesHeld: number;
  contestedBorders: number;
  openRoutes: number;
}

export interface CrewChestLive {
  progress: number;
  tierReached: string | null;
  claimedAt: string | null;
  closedAt: string | null;
}

interface FeedEventRow {
  id: string;
  actor_id: string | null;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

const BOOST_TYPE_TO_SKU: Record<string, CrewBoostSku> = {
  boost_24h: 'crew_boost_24',
  boost_72h: 'crew_boost_72',
  boost_weekend: 'crew_boost_weekend',
  boost_season: 'crew_boost_season',
};

const FEED_EVENT_WAR_TYPE: Partial<Record<string, WarLogType>> = {
  capture: 'reprise',
  defense: 'defense',
  badge: 'badge',
  rank_up: 'rankup',
  chest: 'coffre',
  group_run: 'route',
  contested: 'defense',
  join: 'recrutement',
  offensive: 'offensive',
  boundary_completed: 'boundaryCompleted',
};

/** Lundi ISO (UTC) de la semaine courante — aligné sur crew_chests.week_start. */
export function currentIsoWeekStart(): string {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff),
  );
  return monday.toISOString().slice(0, 10);
}

function cityLabel(cityId: string): string {
  if (cityId === 'paris') return 'Paris';
  if (cityId === 'lille') return 'Lille';
  return cityId.charAt(0).toUpperCase() + cityId.slice(1);
}

export async function fetchCrewChest(crewId: string): Promise<CrewChestLive> {
  const empty: CrewChestLive = {
    progress: 0,
    tierReached: null,
    claimedAt: null,
    closedAt: null,
  };
  if (supabase === null) return empty;

  const weekStart = currentIsoWeekStart();
  const { data, error } = await supabase
    .from('crew_chests')
    .select('progress, tier_reached, claimed_at, closed_at')
    .eq('crew_id', crewId)
    .eq('week_start', weekStart)
    .maybeSingle();

  if (error || data === null) return empty;

  return {
    progress: Number(data.progress),
    tierReached: (data.tier_reached as string | null) ?? null,
    claimedAt: (data.claimed_at as string | null) ?? null,
    closedAt: (data.closed_at as string | null) ?? null,
  };
}

export async function fetchActiveCrewBoost(crewId: string): Promise<CrewBoostState | null> {
  if (supabase === null) return null;

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('crew_boosts')
    .select('boost_type, activated_by_user_id, starts_at, ends_at, multiplier')
    .eq('crew_id', crewId)
    .eq('status', 'active')
    .lte('starts_at', nowIso)
    .gte('ends_at', nowIso)
    .order('ends_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || data === null) return null;

  const sku = BOOST_TYPE_TO_SKU[data.boost_type as string] ?? 'crew_boost_24';
  const startsAt = new Date(data.starts_at as string).getTime();
  const endsAt = new Date(data.ends_at as string).getTime();

  return {
    sku,
    activatedAt: startsAt,
    endsAt,
    anonymous: data.activated_by_user_id === null,
    by: null,
  };
}

export async function fetchCrewLocalRank(crewId: string, cityId: string): Promise<number | null> {
  if (supabase === null) return null;

  const { data, error } = await supabase
    .from('crew_leaderboard')
    .select('crew_id')
    .eq('city_id', cityId)
    .order('points_total', { ascending: false })
    .limit(100);

  if (error || !Array.isArray(data)) return null;
  const idx = data.findIndex((row) => (row as { crew_id: string }).crew_id === crewId);
  return idx >= 0 ? idx + 1 : null;
}

export async function fetchCrewTerritory(
  crewId: string,
  cityId: string,
): Promise<CrewTerritoryLive> {
  const fallback: CrewTerritoryLive = {
    sector: cityLabel(cityId),
    controlPct: 0,
    zonesHeld: 0,
    contestedBorders: 0,
    openRoutes: 0,
  };
  if (supabase === null) return fallback;

  const [lbRes, sectorRes, bordersRes, routesRes] = await Promise.all([
    supabase
      .from('crew_leaderboard')
      .select('hexes_held')
      .eq('crew_id', crewId)
      .eq('city_id', cityId)
      .maybeSingle(),
    supabase
      .from('sector_control')
      .select('owned_hexes, control_percent, sectors(name)')
      .eq('crew_id', crewId)
      .order('control_percent', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('partial_boundaries')
      .select('id', { count: 'exact', head: true })
      .eq('crew_id', crewId)
      .eq('status', 'open'),
    supabase
      .from('routes')
      .select('id', { count: 'exact', head: true })
      .eq('crew_id', crewId),
  ]);

  const zonesHeld = lbRes.data ? Number((lbRes.data as { hexes_held: number }).hexes_held) : 0;
  const contestedBorders = bordersRes.count ?? 0;
  const openRoutes = routesRes.count ?? 0;

  if (sectorRes.data) {
    const row = sectorRes.data as {
      owned_hexes: number;
      control_percent: number;
      sectors: { name: string } | { name: string }[] | null;
    };
    const rawSector = row.sectors;
    const sectorName = Array.isArray(rawSector)
      ? rawSector[0]?.name
      : rawSector?.name;
    return {
      sector: sectorName ?? cityLabel(cityId),
      controlPct: Math.round(Number(row.control_percent) * 100),
      zonesHeld: zonesHeld > 0 ? zonesHeld : row.owned_hexes,
      contestedBorders,
      openRoutes,
    };
  }

  return { ...fallback, zonesHeld, contestedBorders, openRoutes };
}

function actorLabel(actorId: string | null, names: ReadonlyMap<string, string>): string {
  if (actorId === null) return 'Un membre';
  return names.get(actorId) ?? 'Un membre';
}

function feedMessage(
  row: FeedEventRow,
  actorName: string,
): string {
  const body = row.payload.body;
  if (typeof body === 'string' && body.trim().length > 0) return body;

  switch (row.event_type) {
    case 'boundary_completed': {
      const name = row.payload.name;
      return typeof name === 'string'
        ? `${actorName} a fermé la frontière ${name}`
        : `${actorName} a fermé une frontière crew`;
    }
    case 'contested':
      return 'Zone contestée lors d\'un run groupé';
    case 'capture':
      return `${actorName} a capturé des zones`;
    case 'defense':
      return `${actorName} a défendu le territoire`;
    case 'join':
      return `${actorName} a rejoint le crew`;
    case 'chest':
      return 'Progression du coffre crew';
    case 'offensive':
      return 'Offensive crew lancée';
    default:
      return 'Activité crew enregistrée';
  }
}

export function mapFeedEventToWarLog(
  row: FeedEventRow,
  actorNames: ReadonlyMap<string, string>,
  nowMs: number = Date.now(),
): WarLogEntryDemo {
  const type = FEED_EVENT_WAR_TYPE[row.event_type] ?? 'reprise';
  const createdMs = new Date(row.created_at).getTime();
  const minutesAgo = Math.max(0, Math.round((nowMs - createdMs) / 60_000));
  const actorName = actorLabel(row.actor_id, actorNames);
  const zone =
    typeof row.payload.name === 'string'
      ? row.payload.name
      : typeof row.payload.zone === 'string'
        ? row.payload.zone
        : undefined;

  return {
    kind: 'event',
    id: row.id,
    type,
    message: feedMessage(row, actorName),
    zone,
    minutesAgo,
    reactions: {},
  };
}

export async function fetchCrewFeedEvents(
  crewId: string,
  actorNames: ReadonlyMap<string, string>,
  limit = 30,
): Promise<WarLogEntryDemo[]> {
  if (supabase === null) return [];

  const { data, error } = await supabase
    .from('crew_feed_events')
    .select('id, actor_id, event_type, payload, created_at')
    .eq('crew_id', crewId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !Array.isArray(data) || data.length === 0) return [];

  const nowMs = Date.now();
  return (data as FeedEventRow[]).map((row) => mapFeedEventToWarLog(row, actorNames, nowMs));
}
