import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';
import { parseChallengeArenas2026, parseCrewChallenges2026, type ChallengeArena2026, type CrewChallenge2026 } from './CrewChallengesModel2026';
export type CrewChallengeMutation2026 = 'create_crew_challenge_2026' | 'accept_crew_challenge_2026' | 'join_crew_challenge_2026' | 'lock_crew_challenge_2026' | 'cancel_crew_challenge_2026' | 'set_challenge_preference_2026' | 'withdraw_challenge_activity_2026';
export function useCrewChallenges2026(activity: 'run' | 'bike') {
  const { session, loading: sessionLoading } = useSession(); const ownerId = session?.user.id ?? null;
  const owner = useRef(ownerId); owner.current = ownerId;
  const [tick, setTick] = useState(0); const [busy, setBusy] = useState(false); const lock = useRef(false);
  const [read, setRead] = useState<{ ownerId: string; activity: string; status: 'loading' | 'failed' | 'ready'; matches: CrewChallenge2026[]; arenas: ChallengeArena2026[] } | null>(null);
  const reload = useCallback(() => {
    if (ownerId) setRead({ ownerId, activity, status: 'loading', matches: [], arenas: [] });
    setTick(value => value + 1);
  }, [ownerId, activity]);
  useFocusEffect(useCallback(() => {
    if (!ownerId || !supabase || sessionLoading) return;
    const client = supabase; let cancelled = false;
    const load = async () => {
      setRead({ ownerId, activity, status: 'loading', matches: [], arenas: [] });
      try {
        const current = await client.auth.getSession();
        if (current.error || current.data.session?.user.id !== ownerId) throw new Error('session_changed');
        const header = `Bearer ${current.data.session.access_token}`;
        const [matches, arenas] = await Promise.all([
          client.rpc('get_crew_challenges_2026', { p_activity: activity }).setHeader('Authorization', header),
          client.rpc('list_challenge_arenas_2026', { p_activity: activity }).setHeader('Authorization', header),
        ]);
        if (cancelled || owner.current !== ownerId) return;
        const matchData = matches.error ? null : parseCrewChallenges2026(matches.data); const arenaData = arenas.error ? null : parseChallengeArenas2026(arenas.data);
        if (!matchData || !arenaData) throw new Error('challenge_read_failed');
        setRead({ ownerId, activity, status: 'ready', matches: matchData, arenas: arenaData });
      } catch { if (!cancelled && owner.current === ownerId) setRead({ ownerId, activity, status: 'failed', matches: [], arenas: [] }); }
    };
    void load(); return () => { cancelled = true; };
  }, [ownerId, sessionLoading, activity, tick]));
  const mutate = useCallback(async (rpc: CrewChallengeMutation2026, args: Record<string, string | boolean>): Promise<{ ok: true; data: unknown } | { ok: false; reason: string }> => {
    if (lock.current || !ownerId || !supabase || owner.current !== ownerId) return { ok: false, reason: 'authentication_required' };
    lock.current = true; setBusy(true);
    try {
      const current = await supabase.auth.getSession();
      if (current.error || current.data.session?.user.id !== ownerId || owner.current !== ownerId) return { ok: false, reason: 'authentication_required' };
      const response = await supabase.rpc(rpc, args).setHeader('Authorization', `Bearer ${current.data.session.access_token}`);
      if (owner.current !== ownerId) return { ok: false, reason: 'authentication_required' };
      if (response.error) return { ok: false, reason: response.error.message };
      reload(); return { ok: true, data: response.data };
    } catch { return { ok: false, reason: 'network' }; }
    finally { lock.current = false; if (owner.current === ownerId) setBusy(false); }
  }, [ownerId, reload]);
  const own = read?.ownerId === ownerId && read?.activity === activity ? read : null;
  return { status: sessionLoading ? 'loading' : !ownerId ? 'signed-out' : !supabase ? 'unavailable' : own?.status ?? 'loading', matches: own?.matches ?? [], arenas: own?.arenas ?? [], busy, reload, mutate } as const;
}
