/**
 * GRYD — hook chat crew live + fallback démo.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from '../../lib/session';
import { useMyCrew } from './useMyCrew';
import {
  DEMO_CHAT_MESSAGES,
  sendChatMessage,
  type ChatThreadMessage,
  type CrewChat,
} from './chatStore';
import { fetchCrewMessages, liveMessageToThread, sendCrewMessage } from './crewSocialApi';
import { useCrewSocialRealtime } from '../../lib/realtimeRefresh';

export type { ChatThreadMessage } from './chatStore';

function memberNameMap(
  members: readonly { userId: string; handle: string; displayName: string | null }[],
): Map<string, string> {
  return new Map(members.map((m) => [m.userId, m.displayName ?? m.handle] as const));
}

export function useCrewChatLive(
  nowBase: number,
  members: readonly { userId: string; handle: string; displayName: string | null }[],
): CrewChat & { refresh: () => void } {
  const { session, configured } = useSession();
  const { membership } = useMyCrew();
  const useLive = configured && session !== null && membership !== null;
  const [liveMessages, setLiveMessages] = useState<ChatThreadMessage[]>([]);
  const [loaded, setLoaded] = useState(!useLive);
  const names = useMemo(() => memberNameMap(members), [members]);

  const refresh = useCallback(() => {
    if (!useLive || membership === null || session === null) {
      setLiveMessages([]);
      setLoaded(true);
      return;
    }
    setLoaded(false);
    void fetchCrewMessages(membership.crewId, names)
      .then((rows) => {
        setLiveMessages(rows.map((m) => liveMessageToThread(m, session.user.id)));
      })
      .finally(() => setLoaded(true));
  }, [membership, names, session, useLive]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useCrewSocialRealtime(membership?.crewId ?? null, useLive, refresh);

  const messages = useMemo(() => {
    if (!useLive) {
      const demo: ChatThreadMessage[] = DEMO_CHAT_MESSAGES.map((m) => ({
        id: m.id,
        author: m.author,
        text: m.text,
        me: m.me === true,
        at: nowBase - m.minutesAgo * 60_000,
        action: m.action,
        reactions: m.reactions,
      }));
      return demo;
    }
    return liveMessages;
  }, [liveMessages, nowBase, useLive]);

  const send = useCallback(
    (text: string) => {
      if (!useLive) return sendChatMessage(text);
      const trimmed = text.trim();
      if (trimmed.length === 0) return null;
      void sendCrewMessage(trimmed).then((res) => {
        if (res.ok) refresh();
      });
      return { id: `pending_${Date.now()}`, text: trimmed, sentAt: Date.now() };
    },
    [refresh, useLive],
  );

  return { messages, loaded, send, refresh };
}
