/**
 * GRYD — hook sorties crew live + fallback démo.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from '../../lib/session';
import { useMyCrew } from './useMyCrew';
import {
  type CrewOutingsStore,
  type OutingRsvp,
  type OutingView,
  useCrewOutings,
  createOuting as createOutingLocal,
  setOutingRsvp as setOutingRsvpLocal,
} from './events';
import {
  createCrewEvent,
  fetchCrewEvents,
  rsvpCrewEvent,
} from './crewSocialApi';
import { useCrewSocialRealtime } from '../../lib/realtimeRefresh';
import type { CrewMemberProfile } from './crewApi';

function memberNameMap(members: readonly CrewMemberProfile[]): Map<string, string> {
  return new Map(members.map((m) => [m.userId, m.displayName ?? m.handle] as const));
}

export function useCrewOutingsLive(members: readonly CrewMemberProfile[]): CrewOutingsStore & {
  refresh: () => void;
  useLive: boolean;
} {
  const demo = useCrewOutings();
  const { session, configured } = useSession();
  const { membership } = useMyCrew();
  const useLive = configured && session !== null && membership !== null;
  const [liveOutings, setLiveOutings] = useState<readonly OutingView[]>([]);
  const [liveLoaded, setLiveLoaded] = useState(!useLive);
  const names = useMemo(() => memberNameMap(members), [members]);

  const refresh = useCallback(() => {
    if (!useLive || membership === null || session === null) {
      setLiveOutings([]);
      setLiveLoaded(true);
      return;
    }
    setLiveLoaded(false);
    void fetchCrewEvents(membership.crewId, session.user.id, names)
      .then((events) => {
        setLiveOutings(
          events.map((e) => ({
            id: e.id,
            title: e.title,
            when: e.whenLabel,
            place: e.placeLabel,
            zone: e.zoneLabel,
            objective: e.objective,
            host: e.hostName ?? e.hostHandle,
            mine: false,
            myRsvp: e.myRsvp,
            going: e.goingCount,
          })),
        );
      })
      .finally(() => setLiveLoaded(true));
  }, [membership, names, session, useLive]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useCrewSocialRealtime(membership?.crewId ?? null, useLive, refresh);

  if (!useLive) {
    return { outings: demo.outings, loaded: demo.loaded, refresh, useLive };
  }

  return {
    outings: liveOutings,
    loaded: liveLoaded,
    refresh,
    useLive,
  };
}

export async function createOutingMerged(
  useLive: boolean,
  input: Parameters<typeof createOutingLocal>[0],
  refresh?: () => void,
) {
  if (useLive) {
    const res = await createCrewEvent(input);
    if (res.ok) refresh?.();
    return res.ok;
  }
  createOutingLocal(input);
  return true;
}

export async function setOutingRsvpMerged(
  useLive: boolean,
  outingId: string,
  choice: OutingRsvp,
  refresh?: () => void,
) {
  if (useLive && !outingId.startsWith('outing_')) {
    const res = await rsvpCrewEvent(outingId, choice);
    if (res.ok) refresh?.();
    return res.ok ? choice : null;
  }
  return setOutingRsvpLocal(outingId, choice);
}
