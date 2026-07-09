/**
 * GRYD — alertes d'attaque actives (countdown UI).
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';

export interface ActiveAttackAlert {
  id: string;
  h3index: string;
  cityId: string | null;
  expiresAt: string;
  source: string;
}

export function formatArsenalRemaining(expiresAt: string, now = Date.now()): string {
  const ms = new Date(expiresAt).getTime() - now;
  if (ms <= 0) return 'Terminé';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function useActiveAttackAlerts(): {
  alerts: ActiveAttackAlert[];
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const { session, configured } = useSession();
  const [alerts, setAlerts] = useState<ActiveAttackAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [, tick] = useState(0);

  const refresh = useCallback(async () => {
    if (!configured || !session || !supabase) {
      setAlerts([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('attack_alerts')
      .select('id, h3index, city_id, expires_at, source')
      .eq('user_id', session.user.id)
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: true });
    if (error || !data) {
      setAlerts([]);
    } else {
      setAlerts(
        data.map((row) => ({
          id: row.id as string,
          h3index: String(row.h3index),
          cityId: (row.city_id as string | null) ?? null,
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
    if (alerts.length === 0) return;
    const id = setInterval(() => {
      tick((t) => t + 1);
      setAlerts((prev) => prev.filter((a) => new Date(a.expiresAt).getTime() > Date.now()));
    }, 1000);
    return () => clearInterval(id);
  }, [alerts.length]);

  return { alerts, loading, refresh };
}
