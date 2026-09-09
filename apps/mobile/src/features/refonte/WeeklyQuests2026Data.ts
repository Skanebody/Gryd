/**
 * GRYD — défis de la semaine : la lecture serveur et la seule action possible.
 *
 * Même patron que `useCrewChallenges2026` : une lecture par focus d'écran, un
 * jeton vérifié à chaque appel, et un verrou qui empêche deux mutations
 * concurrentes. L'attribution des défis se fait SERVEUR, au premier `read` —
 * le client n'a aucune RPC pour s'en donner un, en clore un, ou s'octroyer un
 * objet. La seule mutation ouverte est « équiper », qui ne change aucun calcul.
 */
import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';
import { parseWeeklyQuests2026, type WeeklyQuests2026 } from './WeeklyQuests2026Model';

export type WeeklyQuestsStatus2026 = 'loading' | 'signed-out' | 'unavailable' | 'failed' | 'ready';

export function useWeeklyQuests2026() {
  const { session, loading: sessionLoading } = useSession();
  const ownerId = session?.user.id ?? null;
  const owner = useRef(ownerId);
  owner.current = ownerId;
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [read, setRead] = useState<{ ownerId: string; status: 'loading' | 'failed' | 'ready'; data: WeeklyQuests2026 | null } | null>(null);

  const reload = useCallback(() => {
    if (ownerId) setRead({ ownerId, status: 'loading', data: null });
    setTick(value => value + 1);
  }, [ownerId]);

  useFocusEffect(useCallback(() => {
    if (!ownerId || !supabase || sessionLoading) return;
    const client = supabase;
    let cancelled = false;
    const load = async () => {
      setRead({ ownerId, status: 'loading', data: null });
      try {
        const current = await client.auth.getSession();
        if (current.error || current.data.session?.user.id !== ownerId) throw new Error('session_changed');
        const response = await client.rpc('read_weekly_quests_2026')
          .setHeader('Authorization', `Bearer ${current.data.session.access_token}`);
        if (cancelled || owner.current !== ownerId) return;
        const data = response.error ? null : parseWeeklyQuests2026(response.data);
        if (!data) throw new Error('weekly_quests_read_failed');
        setRead({ ownerId, status: 'ready', data });
      } catch {
        if (!cancelled && owner.current === ownerId) setRead({ ownerId, status: 'failed', data: null });
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [ownerId, sessionLoading, tick]));

  const equip = useCallback(async (rewardId: string, wanted: boolean): Promise<{ ok: true } | { ok: false; reason: string }> => {
    if (lock.current || !ownerId || !supabase || owner.current !== ownerId) return { ok: false, reason: 'authentication_required' };
    lock.current = true;
    setBusy(true);
    try {
      const current = await supabase.auth.getSession();
      if (current.error || current.data.session?.user.id !== ownerId || owner.current !== ownerId) {
        return { ok: false, reason: 'authentication_required' };
      }
      const response = await supabase.rpc('equip_weekly_quest_reward_2026', { p_reward_id: rewardId, p_equip: wanted })
        .setHeader('Authorization', `Bearer ${current.data.session.access_token}`);
      if (owner.current !== ownerId) return { ok: false, reason: 'authentication_required' };
      if (response.error) return { ok: false, reason: response.error.message };
      reload();
      return { ok: true };
    } catch {
      return { ok: false, reason: 'network' };
    } finally {
      lock.current = false;
      if (owner.current === ownerId) setBusy(false);
    }
  }, [ownerId, reload]);

  const own = read?.ownerId === ownerId ? read : null;
  const status: WeeklyQuestsStatus2026 = sessionLoading ? 'loading'
    : !ownerId ? 'signed-out'
      : !supabase ? 'unavailable'
        : own?.status ?? 'loading';
  return { status, data: own?.data ?? null, busy, reload, equip } as const;
}
