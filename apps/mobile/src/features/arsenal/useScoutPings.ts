/**
 * GRYD — Scout Pings actifs (rapport temporaire, countdown UI).
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';
import { formatArsenalRemaining } from './useAttackAlerts';

export { formatArsenalRemaining };

export interface ActiveScoutPing {
  id: string;
  cityId: string;
  h3index: string;
  kind: string;
  message: string;
  expiresAt: string;
  source: string;
}

export function useActiveScoutPings(): {
  pings: ActiveScoutPing[];
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const { session, configured } = useSession();
  const [pings, setPings] = useState<ActiveScoutPing[]>([]);
  const [loading, setLoading] = useState(true);
  const [, tick] = useState(0);

  const refresh = useCallback(async () => {
    if (!configured || !session || !supabase) {
      setPings([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('scout_pings')
      .select('id, city_id, h3index, kind, message, expires_at, source')
      .eq('user_id', session.user.id)
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false });
    if (error || !data) {
      setPings([]);
    } else {
      setPings(
        data.map((row) => ({
          id: row.id as string,
          cityId: row.city_id as string,
          h3index: String(row.h3index),
          kind: row.kind as string,
          message: row.message as string,
          expiresAt: row.expires_at as string,
          source: row.source as string,
        })),
      );
    }
    setLoading(false);
  }, [configured, session]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (pings.length === 0) return;
    const id = setInterval(() => {
      tick((t) => t + 1);
      setPings((prev) => prev.filter((p) => new Date(p.expiresAt).getTime() > Date.now()));
    }, 1000);
    return () => clearInterval(id);
  }, [pings.length]);

  return { pings, loading, refresh };
}
