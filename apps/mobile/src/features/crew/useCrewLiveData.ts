/**
 * GRYD — hook Crew HQ live (coffre, territoire, war log, boost).
 */
import { useCallback, useEffect, useState } from 'react';
import type { CrewBoostState } from '../arsenal';
import type { CrewMemberProfile } from './crewApi';
import {
  fetchActiveCrewBoost,
  fetchCrewChest,
  fetchCrewFeedEvents,
  fetchCrewLocalRank,
  fetchCrewTerritory,
  currentIsoWeekStart,
  type CrewChestLive,
  type CrewTerritoryLive,
} from './crewLiveApi';
import { fetchCrewChestContributions } from './crewSocialApi';
import type { WarLogEntryDemo } from './feed';

export interface CrewLiveDataState {
  loading: boolean;
  territory: CrewTerritoryLive | null;
  chest: CrewChestLive | null;
  chestContributions: ReadonlyMap<string, number>;
  localRank: number | null;
  boost: CrewBoostState | null;
  feedEvents: WarLogEntryDemo[];
  refresh: () => void;
}

export function useCrewLiveData(
  crewId: string | null,
  cityId: string | null,
  members: readonly CrewMemberProfile[],
): CrewLiveDataState {
  const [loading, setLoading] = useState(crewId !== null);
  const [territory, setTerritory] = useState<CrewTerritoryLive | null>(null);
  const [chest, setChest] = useState<CrewChestLive | null>(null);
  const [chestContributions, setChestContributions] = useState<ReadonlyMap<string, number>>(
    new Map(),
  );
  const [localRank, setLocalRank] = useState<number | null>(null);
  const [boost, setBoost] = useState<CrewBoostState | null>(null);
  const [feedEvents, setFeedEvents] = useState<WarLogEntryDemo[]>([]);

  const refresh = useCallback(() => {
    if (crewId === null || cityId === null) {
      setTerritory(null);
      setChest(null);
      setChestContributions(new Map());
      setLocalRank(null);
      setBoost(null);
      setFeedEvents([]);
      setLoading(false);
      return;
    }

    const actorNames = new Map(
      members.map((m) => [m.userId, m.displayName ?? m.handle] as const),
    );

    const weekStart = currentIsoWeekStart();
    setLoading(true);
    void Promise.all([
      fetchCrewTerritory(crewId, cityId),
      fetchCrewChest(crewId),
      fetchCrewChestContributions(crewId, weekStart),
      fetchCrewLocalRank(crewId, cityId),
      fetchActiveCrewBoost(crewId),
      fetchCrewFeedEvents(crewId, actorNames),
    ])
      .then(([t, c, contrib, rank, b, feed]) => {
        setTerritory(t);
        setChest(c);
        setChestContributions(contrib);
        setLocalRank(rank);
        setBoost(b);
        setFeedEvents(feed);
      })
      .finally(() => setLoading(false));
  }, [crewId, cityId, members]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { loading, territory, chest, chestContributions, localRank, boost, feedEvents, refresh };
}
