/**
 * GRYD — LA LECTURE SERVEUR DU CENTRE DE NOTIFICATIONS.
 *
 * Même patron que `useMyReferral2026` : une lecture par focus d'écran, un jeton
 * vérifié à chaque appel, une garde de propriétaire qui empêche la boîte d'un
 * compte d'apparaître dans celle d'un autre.
 *
 * ─── TROIS RPC, ET AUCUNE ÉCRITURE DIRECTE ─────────────────────────────────
 * `my_notifications_2026` lit, `mark_notifications_read_2026` marque,
 * `unread_notifications_count_2026` compte. Le client n'écrit JAMAIS
 * `public.notifications` — pas même `read_at`, que la RLS lui accorderait :
 * passer par la RPC garde une seule règle (« lisible », jamais réécrire une
 * date de lecture déjà posée) au lieu de deux.
 *
 * ─── LE RETOUR AU PREMIER PLAN RELIT, LE RESTE DU TEMPS RIEN NE SONDE ──────
 * `AppState` à `'active'` déclenche une relecture, bornée par
 * `shouldRefresh2026` (`NOTIFICATION_INBOX_2026.refreshMinimumIntervalMs`).
 * Aucun `setInterval` : un centre d'activité qui interroge le serveur en boucle
 * vide la batterie pour une nouvelle qui n'arrive pas.
 *
 * ─── « VOIR PLUS ANCIEN » N'EST PAS UNE RELECTURE ──────────────────────────
 * La page suivante s'AJOUTE, curseur `created_at` en main. Une ligne écrite
 * entre deux pages ne fait donc sauter aucune ligne : c'est ce que le décalage
 * numérique aurait fait.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { NOTIFICATION_INBOX_2026 } from '@klaim/shared';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';
import {
  parseNotificationPage2026,
  shouldRefresh2026,
  type NotificationCenterStatus2026,
  type NotificationItem2026,
} from './notificationInbox2026';

interface Read {
  ownerId: string;
  status: 'loading' | 'failed' | 'ready';
  items: readonly NotificationItem2026[];
  unread: number;
  hasMore: boolean;
}

export function useNotificationCenter2026() {
  const { session, loading: sessionLoading } = useSession();
  const ownerId = session?.user.id ?? null;
  const owner = useRef(ownerId);
  owner.current = ownerId;
  const [tick, setTick] = useState(0);
  const [read, setRead] = useState<Read | null>(null);
  const [busy, setBusy] = useState(false);
  const [markFailed, setMarkFailed] = useState(false);
  const lock = useRef(false);
  const lastReadMs = useRef<number | null>(null);

  const reload = useCallback(() => {
    lastReadMs.current = null;
    setTick((value) => value + 1);
  }, []);

  /** Une page, avec le jeton du moment. Rend `null` si rien n'est lisible. */
  const fetchPage = useCallback(async (before: string | null) => {
    const client = supabase;
    if (client === null || ownerId === null) return null;
    const current = await client.auth.getSession();
    if (current.error || current.data.session?.user.id !== ownerId) return null;
    const response = await client
      .rpc('my_notifications_2026', {
        p_limit: NOTIFICATION_INBOX_2026.pageSize,
        p_before: before,
      })
      .setHeader('Authorization', `Bearer ${current.data.session.access_token}`);
    if (response.error) return null;
    return parseNotificationPage2026(response.data);
  }, [ownerId]);

  useFocusEffect(useCallback(() => {
    if (ownerId === null || supabase === null || sessionLoading) return;
    let cancelled = false;
    const load = async () => {
      setRead((prev) => (prev?.ownerId === ownerId
        ? { ...prev, status: 'loading' }
        : { ownerId, status: 'loading', items: [], unread: 0, hasMore: false }));
      const page = await fetchPage(null).catch(() => null);
      if (cancelled || owner.current !== ownerId) return;
      if (page === null) {
        setRead({ ownerId, status: 'failed', items: [], unread: 0, hasMore: false });
        return;
      }
      lastReadMs.current = Date.now();
      setRead({
        ownerId, status: 'ready', items: page.items,
        unread: page.unread, hasMore: page.hasMore,
      });
    };
    void load();
    return () => { cancelled = true; };
  }, [ownerId, sessionLoading, tick, fetchPage]));

  // Retour au premier plan : on relit, mais pas plus d'une fois par minute.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && shouldRefresh2026(lastReadMs.current, Date.now())) reload();
    });
    return () => subscription.remove();
  }, [reload]);

  const loadMore = useCallback(async () => {
    const current = read;
    if (lock.current || current === null || current.status !== 'ready' || !current.hasMore) return;
    const last = current.items[current.items.length - 1];
    if (last === undefined) return;
    lock.current = true;
    setBusy(true);
    try {
      const page = await fetchPage(new Date(last.createdAtMs).toISOString()).catch(() => null);
      if (page === null || owner.current !== current.ownerId) return;
      const connus = new Set(current.items.map((i) => i.id));
      setRead((prev) => (prev === null || prev.ownerId !== current.ownerId ? prev : {
        ...prev,
        items: [...prev.items, ...page.items.filter((i) => !connus.has(i.id))],
        unread: page.unread,
        hasMore: page.hasMore,
      }));
    } finally {
      lock.current = false;
      if (owner.current === current.ownerId) setBusy(false);
    }
  }, [read, fetchPage]);

  /** `ids = null` : tout. L'écran optimiste, le serveur tranche, l'échec se dit. */
  const markRead = useCallback(async (ids: readonly string[] | null) => {
    const current = read;
    if (lock.current || current === null || current.status !== 'ready') return;
    const client = supabase;
    if (client === null || ownerId === null) return;
    const cibles = ids === null
      ? current.items.filter((i) => i.readAtMs === null).map((i) => i.id)
      : ids.filter((id) => current.items.some((i) => i.id === id && i.readAtMs === null));
    if (cibles.length === 0) return;

    lock.current = true;
    setMarkFailed(false);
    const avant = current;
    const maintenant = Date.now();
    setRead({
      ...current,
      items: current.items.map((i) =>
        (cibles.includes(i.id) ? { ...i, readAtMs: i.readAtMs ?? maintenant } : i)),
      unread: Math.max(0, current.unread - cibles.length),
    });
    try {
      const session = await client.auth.getSession();
      if (session.error || session.data.session?.user.id !== ownerId) throw new Error('session');
      const response = await client
        .rpc('mark_notifications_read_2026', { p_ids: ids === null ? null : cibles })
        .setHeader('Authorization', `Bearer ${session.data.session.access_token}`);
      if (response.error) throw new Error('rpc');
    } catch {
      // La ligne n'est PAS lue : on remet l'état d'avant et on le dit. Laisser
      // l'optimisme tenir ferait disparaître un message toujours non lu.
      if (owner.current === ownerId) { setRead(avant); setMarkFailed(true); }
    } finally {
      lock.current = false;
    }
  }, [read, ownerId]);

  const own = read?.ownerId === ownerId ? read : null;
  const status: NotificationCenterStatus2026 = sessionLoading ? 'loading'
    : ownerId === null ? 'signed-out'
      : supabase === null ? 'unavailable'
        : own?.status ?? 'loading';

  return {
    status,
    items: own?.items ?? [],
    unread: own?.unread ?? 0,
    hasMore: own?.hasMore ?? false,
    busy,
    markFailed,
    reload,
    loadMore,
    markRead,
  } as const;
}
