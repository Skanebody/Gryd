/**
 * GRYD — hook inbox notifications live + fallback vide honnête.
 */
import { useCallback, useEffect, useState } from 'react';
import { useSession } from '../../lib/session';
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  type InboxNotification,
} from './notificationsApi';

export function useInboxNotifications() {
  const { session, configured } = useSession();
  const useLive = configured && session !== null;
  const [items, setItems] = useState<InboxNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(useLive);

  const refresh = useCallback(() => {
    if (!useLive) {
      setItems([]);
      setUnread(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    void Promise.all([fetchNotifications(), fetchUnreadNotificationCount()])
      .then(([list, count]) => {
        setItems(list);
        setUnread(count);
      })
      .finally(() => setLoading(false));
  }, [useLive]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const markRead = useCallback(
    async (id: string) => {
      const ok = await markNotificationRead(id);
      if (ok) refresh();
      return ok;
    },
    [refresh],
  );

  const markAllRead = useCallback(async () => {
    const ok = await markAllNotificationsRead();
    if (ok) refresh();
    return ok;
  }, [refresh]);

  return { items, unread, loading, useLive, refresh, markRead, markAllRead };
}
