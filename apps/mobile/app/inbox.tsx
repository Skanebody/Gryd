/**
 * GRYD — INBOX notifications (lecture `notifications`, marquer lu).
 */
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, gameColors, radii } from '@klaim/shared';
import { EVENTS, screen, track } from '../src/lib/analytics';
import { haptics } from '../src/lib/haptics';
import { useSession } from '../src/lib/session';
import { Icon } from '../src/ui/Icon';
import { StackScreen } from '../src/ui/StackScreen';
import { useInboxNotifications } from '../src/features/inbox/useInboxNotifications';

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diffMin = Math.round((now - d.getTime()) / 60_000);
  if (diffMin < 1) return 'À l\'instant';
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `Il y a ${diffH} h`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function InboxScreen() {
  const { configured, session } = useSession();
  const { items, unread, loading, useLive, markRead, markAllRead } = useInboxNotifications();

  useEffect(() => {
    screen('inbox');
  }, []);

  return (
    <StackScreen title="Inbox" icon="cloche">
      <View style={styles.head}>
        <Text style={styles.sub}>
          {useLive
            ? unread > 0
              ? `${unread} non lue${unread > 1 ? 's' : ''}`
              : 'Tout est lu'
            : 'Connecte-toi pour voir tes notifications'}
        </Text>
        {useLive && unread > 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              haptics.light();
              void markAllRead();
            }}
            style={({ pressed }) => [styles.markAll, pressed && styles.dim]}
          >
            <Text style={styles.markAllLabel}>Tout marquer lu</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.list}>
        {!configured || session === null ? (
          <Text style={styles.empty}>
            Mode démo — les alertes territoire, badges et digests apparaîtront ici une fois connecté.
          </Text>
        ) : loading ? (
          <Text style={styles.empty}>Chargement…</Text>
        ) : items.length === 0 ? (
          <Text style={styles.empty}>Aucune notification pour l'instant.</Text>
        ) : (
          items.map((n) => (
            <Pressable
              key={n.id}
              accessibilityRole="button"
              onPress={() => {
                haptics.light();
                track(EVENTS.notificationOpened, { type: n.type });
                void markRead(n.id);
              }}
              style={({ pressed }) => [
                styles.row,
                n.readAt === null && styles.rowUnread,
                pressed && styles.dim,
              ]}
            >
              <Icon name="cloche" size={16} color={n.readAt === null ? gameColors.crew : colors.gris} />
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle} numberOfLines={2}>
                  {n.title}
                </Text>
                {n.body ? (
                  <Text style={styles.rowBodyText} numberOfLines={3}>
                    {n.body}
                  </Text>
                ) : null}
                <Text style={styles.rowWhen}>{formatWhen(n.createdAt)}</Text>
              </View>
            </Pressable>
          ))
        )}
      </View>
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  sub: { color: colors.gris, fontSize: fontSizes.sm, flex: 1 },
  markAll: { paddingVertical: 6, paddingHorizontal: 10 },
  markAllLabel: { color: gameColors.crew, fontSize: fontSizes.xs, fontWeight: '700' },
  list: { paddingBottom: 32, gap: 8 },
  empty: { color: colors.gris, fontSize: fontSizes.sm, lineHeight: 20, marginTop: 8 },
  row: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: radii.card,
    backgroundColor: colors.carbone,
  },
  rowUnread: { borderWidth: 1, borderColor: gameColors.crew },
  rowBody: { flex: 1, gap: 4 },
  rowTitle: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '700' },
  rowBodyText: { color: colors.gris, fontSize: fontSizes.xs, lineHeight: 18 },
  rowWhen: { color: colors.gris, fontSize: fontSizes.xs, marginTop: 2 },
  dim: { opacity: 0.85 },
});
