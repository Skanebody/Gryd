/**
 * GRYD — synchronise carte + War Room vers battleContextStore (tabs layout).
 */
import { useEffect } from 'react';
import { useSession } from '../../lib/session';
import { isBackendLive } from '../../lib/liveMode';
import { useLiveMapData } from '../map/useLiveMapData';
import { useMyCrew } from '../crew/useMyCrew';
import { useWarRoomLive } from '../warroom/useWarRoomLive';
import {
  resetLiveBattleContext,
  setLiveMapSummary,
  setLiveWarRoomContext,
} from './battleContextStore';

export function BattleLiveSync() {
  const { session } = useSession();
  const live = isBackendLive(session);
  const liveMap = useLiveMapData('paris');
  const { membership } = useMyCrew();
  const war = useWarRoomLive();

  useEffect(() => {
    if (!live) {
      resetLiveBattleContext();
      return;
    }
    if (liveMap?.kind === 'live' || liveMap?.kind === 'empty') {
      setLiveMapSummary(liveMap.summary);
    } else {
      setLiveMapSummary(null);
    }
  }, [live, liveMap]);

  useEffect(() => {
    if (!live || membership === null) {
      setLiveWarRoomContext({ defenseMission: null, openBoundaries: [] });
      return;
    }
    setLiveWarRoomContext({
      defenseMission: war.defenseMission,
      openBoundaries: war.openBoundaries,
    });
  }, [live, membership, war.defenseMission, war.openBoundaries]);

  return null;
}
