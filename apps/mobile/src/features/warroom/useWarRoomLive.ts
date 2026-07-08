/**
 * GRYD — hook War Room live avec fallback démo.
 */
import { useCallback, useEffect, useState } from 'react';
import { useSession } from '../../lib/session';
import { useMyCrew } from '../crew/useMyCrew';
import {
  DEFENSE_MISSION,
  OFFENSIVE,
  OPEN_BOUNDARIES,
  WAR_STATUS,
  type DefenseMissionDemo,
  type OffensiveDemo,
  type OpenBoundaryDemo,
} from './demo';
import { fetchWarRoomLive } from './warroomApi';

export interface WarRoomLiveState {
  loading: boolean;
  useDemo: boolean;
  defenseMission: DefenseMissionDemo;
  offensive: OffensiveDemo;
  openBoundaries: readonly OpenBoundaryDemo[];
  crewRank: number;
  refresh: () => void;
}

export function useWarRoomLive(): WarRoomLiveState {
  const { session, configured } = useSession();
  const { membership } = useMyCrew();
  const useDemo = !configured || session === null || membership === null;
  const [loading, setLoading] = useState(!useDemo);
  const [defenseMission, setDefenseMission] = useState(DEFENSE_MISSION);
  const [offensive, setOffensive] = useState(OFFENSIVE);
  const [openBoundaries, setOpenBoundaries] = useState<readonly OpenBoundaryDemo[]>(OPEN_BOUNDARIES);
  const [crewRank, setCrewRank] = useState(WAR_STATUS.crewRank);

  const refresh = useCallback(() => {
    if (useDemo || session === null || membership === null) {
      setDefenseMission(DEFENSE_MISSION);
      setOffensive(OFFENSIVE);
      setOpenBoundaries(OPEN_BOUNDARIES);
      setCrewRank(WAR_STATUS.crewRank);
      setLoading(false);
      return;
    }
    setLoading(true);
    void fetchWarRoomLive(membership.crewId, membership.crew.city_id, session.user.id)
      .then((live) => {
        setDefenseMission(live.defenseMission ?? DEFENSE_MISSION);
        setOffensive(live.offensive ?? OFFENSIVE);
        setOpenBoundaries(live.openBoundaries.length > 0 ? live.openBoundaries : OPEN_BOUNDARIES);
        setCrewRank(live.crewRank ?? WAR_STATUS.crewRank);
      })
      .finally(() => setLoading(false));
  }, [membership, session, useDemo]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { loading, useDemo, defenseMission, offensive, openBoundaries, crewRank, refresh };
}
