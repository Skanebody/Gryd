/**
 * GRYD — hook classement : live Supabase si dispo, démo sinon.
 */
import { useCallback, useEffect, useState } from 'react';
import { fetchActiveCrew } from '../crew/crewApi';
import { useSession } from '../../lib/session';
import { LEAGUE_BOARDS, type LeagueBoard } from './league';
import { fetchCrewLeaderboard, fetchCityLeaderboard, fetchPlayerLeaderboard } from './leaderboardApi';

export type LeaderboardTab = 'joueurs' | 'crews' | 'ville';

function demoBoard(id: string): LeagueBoard {
  return LEAGUE_BOARDS.find((b) => b.id === id) ?? LEAGUE_BOARDS[0]!;
}

export interface LeaderboardState {
  loading: boolean;
  useDemo: boolean;
  boardFor: (tab: LeaderboardTab, scope: 'paris' | 'france') => LeagueBoard;
  refresh: () => void;
}

export function useLeaderboard(): LeaderboardState {
  const { session, configured } = useSession();
  const useDemo = !configured || session === null;
  const [loading, setLoading] = useState(configured);
  const [playerParis, setPlayerParis] = useState<LeagueBoard | null>(null);
  const [playerFrance, setPlayerFrance] = useState<LeagueBoard | null>(null);
  const [crewsParis, setCrewsParis] = useState<LeagueBoard | null>(null);
  const [cityBoard, setCityBoard] = useState<LeagueBoard | null>(null);

  const refresh = useCallback(() => {
    if (useDemo || session === null) {
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
  }, [session, useDemo]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const boardFor = useCallback(
    (tab: LeaderboardTab, scope: 'paris' | 'france'): LeagueBoard => {
      if (tab === 'joueurs') {
        const live = scope === 'france' ? playerFrance : playerParis;
        return live ?? demoBoard(scope === 'france' ? 'france' : 'joueurs');
      }
      if (tab === 'crews') {
        return crewsParis ?? demoBoard('crews');
      }
      return cityBoard ?? demoBoard('ville');
    },
    [cityBoard, crewsParis, playerFrance, playerParis],
  );

  return { loading, useDemo, boardFor, refresh };
}
