/**
 * GRYD — hook classement : live Supabase uniquement (tableaux vides sinon).
 */
import { useCallback, useEffect, useState } from 'react';
import { fetchActiveCrew } from '../crew/crewApi';
import { useSession } from '../../lib/session';
import { isBackendLive } from '../../lib/liveMode';
import { emptyLeagueBoard, type LeagueBoard } from './league';
import { fetchCrewLeaderboard, fetchCityLeaderboard, fetchPlayerLeaderboard } from './leaderboardApi';

export type LeaderboardTab = 'joueurs' | 'crews' | 'ville';

export interface LeaderboardState {
  loading: boolean;
  boardFor: (tab: LeaderboardTab, scope: 'paris' | 'france') => LeagueBoard;
  refresh: () => void;
}

export function useLeaderboard(): LeaderboardState {
  const { session } = useSession();
  const canLoad = isBackendLive(session);
  const [loading, setLoading] = useState(canLoad);
  const [playerParis, setPlayerParis] = useState<LeagueBoard | null>(null);
  const [playerFrance, setPlayerFrance] = useState<LeagueBoard | null>(null);
  const [crewsParis, setCrewsParis] = useState<LeagueBoard | null>(null);
  const [cityBoard, setCityBoard] = useState<LeagueBoard | null>(null);

  const refresh = useCallback(() => {
    if (!canLoad || session === null) {
      setPlayerParis(null);
      setPlayerFrance(null);
      setCrewsParis(null);
      setCityBoard(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const userId = session.user.id;
    void (async () => {
      const crew = await fetchActiveCrew(userId);
      const myCityId = crew?.crew.city_id ?? 'paris';
      const [pp, pf, cp, city] = await Promise.all([
        fetchPlayerLeaderboard(userId, 'paris'),
        fetchPlayerLeaderboard(userId, 'france'),
        fetchCrewLeaderboard(crew?.crewId ?? null, 'paris'),
        fetchCityLeaderboard(myCityId),
      ]);
      setPlayerParis(pp);
      setPlayerFrance(pf);
      setCrewsParis(cp);
      setCityBoard(city);
    })().finally(() => setLoading(false));
  }, [canLoad, session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const boardFor = useCallback(
    (tab: LeaderboardTab, scope: 'paris' | 'france'): LeagueBoard => {
      if (tab === 'joueurs') {
        const live = scope === 'france' ? playerFrance : playerParis;
        return live ?? emptyLeagueBoard(scope === 'france' ? 'france' : 'joueurs');
      }
      if (tab === 'crews') {
        return crewsParis ?? emptyLeagueBoard('crews');
      }
      return cityBoard ?? emptyLeagueBoard('ville');
    },
    [cityBoard, crewsParis, playerFrance, playerParis],
  );

  return { loading, boardFor, refresh };
}
