/**
 * GRYD — Streak Gel actif (countdown UI).
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';
import { formatArsenalRemaining } from './useAttackAlerts';

export { formatArsenalRemaining };

export interface ActiveStreakGel {
  id: string;
  expiresAt: string;
  source: string;
}

export function useActiveStreakGel(): {
  gel: ActiveStreakGel | null;
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const { session, configured } = useSession();
  const [gel, setGel] = useState<ActiveStreakGel | null>(null);
  const [loading, setLoading] = useState(true);
  const [, tick] = useState(0);

  const refresh = useCallback(async () => {
    if (!configured || !session || !supabase) {
      setGel(null);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('streak_gels')
      .select('id, expires_at, source')
      .eq('user_id', session.user.id)
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) {
      setGel(null);
    } else {
      setGel({
        id: data.id as string,
        expiresAt: data.expires_at as string,
        source: data.source as string,
      });
    }
    setLoading(false);
  }, [configured, session]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!gel) return;
    const id = setInterval(() => {
      tick((t) => t + 1);
      if (new Date(gel.expiresAt).getTime() <= Date.now()) setGel(null);
    }, 1000);
    return () => clearInterval(id);
  }, [gel]);

  return { gel, loading, refresh };
}
