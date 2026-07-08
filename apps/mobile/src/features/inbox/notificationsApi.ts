/**
 * GRYD — inbox notifications (`notifications` table, lecture owner-only).
 */
import { supabase } from '../../lib/supabase';

export interface InboxNotification {
  id: string;
  type: string;
  priority: number;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
}

function parsePayload(payload: unknown): { title: string; body: string } {
  if (typeof payload !== 'object' || payload === null) {
    return { title: 'Notification', body: '' };
  }
  const p = payload as Record<string, unknown>;
  const title = typeof p.title === 'string' ? p.title : 'Notification';
  const body = typeof p.body === 'string' ? p.body : '';
  return { title, body };
}

export async function fetchNotifications(limit = 40): Promise<InboxNotification[]> {
  if (supabase === null) return [];
  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, priority, payload, created_at, read_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error || !Array.isArray(data)) return [];

  return data.map((row) => {
    const { title, body } = parsePayload(row.payload);
    return {
      id: row.id as string,
      type: row.type as string,
      priority: Number(row.priority),
      title,
      body,
      createdAt: row.created_at as string,
      readAt: (row.read_at as string | null) ?? null,
    };
  });
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  if (supabase === null) return 0;
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .is('read_at', null);
  if (error || count === null) return 0;
  return count;
}

export async function markNotificationRead(id: string): Promise<boolean> {
  if (supabase === null) return false;
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .is('read_at', null);
  return !error;
}

export async function markAllNotificationsRead(): Promise<boolean> {
  if (supabase === null) return false;
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null);
  return !error;
}
