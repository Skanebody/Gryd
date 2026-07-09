/**
 * GRYD — abonnement Supabase Realtime (postgres_changes) pour rafraîchir les hooks live.
 */
import { useEffect, useRef } from 'react';
import { supabase } from './supabase';

export interface RealtimeTableSpec {
  table: string;
  filter?: string;
}

/** S'abonne à une ou plusieurs tables ; `onRefresh` est appelé à chaque changement. */
export function useRealtimeRefresh(
  enabled: boolean,
  channelKey: string,
  specs: readonly RealtimeTableSpec[],
  onRefresh: () => void,
): void {
  const refreshRef = useRef(onRefresh);
  refreshRef.current = onRefresh;
  const specsKey = specs.map((s) => `${s.table}:${s.filter ?? ''}`).join('|');

  useEffect(() => {
    if (!enabled || supabase === null || specs.length === 0) return;

    const channel = supabase.channel(channelKey);
    for (const { table, filter } of specs) {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          ...(filter !== undefined ? { filter } : {}),
        },
        () => refreshRef.current(),
      );
    }
    channel.subscribe();

    return () => {
      const client = supabase;
      if (client !== null) void client.removeChannel(channel);
    };
  }, [channelKey, enabled, specsKey]);
}

/** Tables crew filtrées par `crew_id` + RSVPs/claims sans filtre (refresh léger). */
export function useCrewSocialRealtime(
  crewId: string | null,
  enabled: boolean,
  onRefresh: () => void,
): void {
  const specs: RealtimeTableSpec[] =
    crewId === null
      ? []
      : [
          { table: 'crew_messages', filter: `crew_id=eq.${crewId}` },
          { table: 'crew_events', filter: `crew_id=eq.${crewId}` },
          { table: 'crew_requests', filter: `crew_id=eq.${crewId}` },
          { table: 'crew_gifts', filter: `crew_id=eq.${crewId}` },
          { table: 'crew_chest_contributions', filter: `crew_id=eq.${crewId}` },
          { table: 'crew_feed_events', filter: `crew_id=eq.${crewId}` },
          { table: 'crew_event_rsvps' },
          { table: 'crew_gift_claims' },
        ];

  useRealtimeRefresh(enabled && crewId !== null, `crew-social:${crewId ?? 'none'}`, specs, onRefresh);
}

/** Inbox : notifications de l'utilisateur connecté. */
export function useNotificationsRealtime(
  userId: string | null,
  enabled: boolean,
  onRefresh: () => void,
): void {
  const specs: RealtimeTableSpec[] =
    userId === null ? [] : [{ table: 'notifications', filter: `user_id=eq.${userId}` }];

  useRealtimeRefresh(
    enabled && userId !== null,
    `inbox:${userId ?? 'none'}`,
    specs,
    onRefresh,
  );
}
