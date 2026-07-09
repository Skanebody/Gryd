/**
 * GRYD — hook War Room live (états vides si pas de crew / pas de mission).
 */
import { useCallback, useEffect, useState } from 'react';
import { useSession } from '../../lib/session';
import { isBackendLive } from '../../lib/liveMode';
import { useMyCrew } from '../crew/useMyCrew';
import {
  type DefenseMissionDemo,
  type OffensiveDemo,
  type OpenBoundaryDemo,
} from './demo';
import { fetchWarRoomLive } from './warroomApi';
import { fetchCrewChest, type CrewChestLive } from '../crew/crewLiveApi';

export interface WarRoomLiveState {
  loading: boolean;
  defenseMission: DefenseMissionDemo | null;
  offensive: OffensiveDemo | null;
  openBoundaries: readonly OpenBoundaryDemo[];
  crewRank: number | null;
  chest: CrewChestLive | null;
  refresh: () => void;
}

export function useWarRoomLive(): WarRoomLiveState {
  const { session } = useSession();
  const { membership } = useMyCrew();
  const canLoad = isBackendLive(session) && membership !== null;
  const [loading, setLoading] = useState(canLoad);
  const [defenseMission, setDefenseMission] = useState<DefenseMissionDemo | null>(null);
  const [offensive, setOffensive] = useState<OffensiveDemo | null>(null);
  const [openBoundaries, setOpenBoundaries] = useState<readonly OpenBoundaryDemo[]>([]);
  const [crewRank, setCrewRank] = useState<number | null>(null);
  const [chest, setChest] = useState<CrewChestLive | null>(null);

  const refresh = useCallback(() => {
    if (!canLoad || session === null || membership === null) {
      setDefenseMission(null);
      setOffensive(null);
      setOpenBoundaries([]);
      setCrewRank(null);
      setChest(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    void Promise.all([
      fetchWarRoomLive(membership.crewId, membership.crew.city_id, session.user.id),
      fetchCrewChest(membership.crewId),
    ])
      .then(([live, chestLive]) => {
        setDefenseMission(live.defenseMission);
        setOffensive(live.offensive);
        setOpenBoundaries(live.openBoundaries);
        setCrewRank(live.crewRank);
        setChest(chestLive);
      })
      .finally(() => setLoading(false));
  }, [canLoad, membership, session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { loading, defenseMission, offensive, openBoundaries, crewRank, chest, refresh };
}
