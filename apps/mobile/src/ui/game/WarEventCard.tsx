/**
 * GRYD — WarEventCard : événement du War Log crew (AMENDEMENT-08 §1, doc §13).
 * Icône teintée par l'état de jeu, phrase courte, zone · pts · il y a Xmin,
 * slot de réactions GRYD (icônes, pas d'emojis) et tag LIVE si récent.
 * Slide-in au montage (feed), haptic léger à la réaction.
 */
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { borderState, colors, elevation, fontSizes, gameColors, radii, type IconName } from '@klaim/shared';
import { haptics } from '../../lib/haptics';
import { Icon } from '../Icon';
import { useSlideIn } from './anim';
import { timeAgoLabel } from './states';

/** Un event est LIVE s'il date de moins de 10 min (tag animable). */
const LIVE_MAX_MINUTES = 10;

export interface WarEventReaction {
  /** Réaction GRYD custom (reactRespect, reactRaid, reactDefense…). */
  icon: IconName;
  count: number;
  /** true = j'ai déjà réagi (teinte crew). */
  mine?: boolean;
}

export interface WarEventCardProps {
  /** Icône de l'événement (raid, bouclier, badge, coffre, route…). */
  icon: IconName;
  /** Phrase courte (« MOLOKAÏ a repris 14 hexes »). */
  message: string;
  /** Zone concernée (« Buttes-Chaumont »). */
  zone?: string;
  /** Points gagnés (affiché « +176 pts »). */
  points?: number;
  minutesAgo: number;
  /** Teinte fonctionnelle de l'événement (gameColors.*, défaut crew). */
  tint?: string;
  /** Force le tag LIVE (défaut : minutesAgo < 10). */
  live?: boolean;
  reactions?: readonly WarEventReaction[];
  onReact?: (icon: IconName) => void;
  onPress?: () => void;
}

export function WarEventCard({
  icon,
  message,
  zone,
  points,
  minutesAgo,
  tint = gameColors.crew,
  live,
  reactions,
  onReact,
  onPress,
}: WarEventCardProps) {
  const { opacity, translateY } = useSlideIn();
  const isLive = live ?? minutesAgo < LIVE_MAX_MINUTES;
  const metaParts = [
    zone,
    points !== undefined ? `+${points.toLocaleString('fr-FR')} pts` : undefined,
    timeAgoLabel(minutesAgo),
  ].filter((p): p is string => p !== undefined);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <Pressable
        accessibilityRole={onPress ? 'button' : undefined}
        onPress={onPress}
        disabled={!onPress}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <View style={styles.row}>
          <View style={styles.iconWrap}>
            <Icon name={icon} size={20} color={tint} />
          </View>
          <View style={styles.body}>
            <Text style={styles.message} numberOfLines={2}>
              {message}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {metaParts.join(' · ')}
            </Text>
          </View>
          {isLive ? (
            <View style={styles.liveTag}>
              <View style={styles.liveDot} />
              <Text style={styles.liveLabel}>LIVE</Text>
            </View>
          ) : null}
        </View>

        {reactions && reactions.length > 0 ? (
          <View style={styles.reactions}>
            {reactions.map((r) => (
              <Pressable
                key={r.icon}
                accessibilityRole="button"
                disabled={!onReact}
                onPress={() => {
                  haptics.light();
                  onReact?.(r.icon);
                }}
                style={({ pressed }) => [
                  styles.reaction,
                  r.mine && styles.reactionMine,
                  pressed && styles.pressed,
                ]}
              >
                <Icon name={r.icon} size={14} color={r.mine ? gameColors.crew : colors.gris} />
                {r.count > 0 ? (
                  <Text style={[styles.reactionCount, r.mine && styles.reactionCountMine]}>
                    {r.count}
                  </Text>
                ) : null}
              </Pressable>
            ))}
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // N1 : une surface posée sur l'espace, SANS contour permanent (règle 80/20 —
  // un event n'est pas un état ; le seul contour rare = le tag LIVE actif).
  card: {
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    padding: 14,
    gap: 10,
  },
  pressed: { opacity: 0.85 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  // Pastille d'icône = N2 relevé, sans contour (le contour est réservé aux états).
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: elevation.raised,
  },
  body: { flex: 1, gap: 2 },
  message: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600', lineHeight: 18 },
  meta: { color: colors.gris, fontSize: fontSizes.xs },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: gameColors.crew,
  },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: gameColors.crew },
  liveLabel: { color: gameColors.crew, fontSize: 10, fontWeight: '700', letterSpacing: 0.6 },
  reactions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  // Pill de réaction = N2 relevé, SANS contour au repos ; le contour chartreuse
  // n'apparaît QUE sur l'état actif (« j'ai réagi » — règle 80/20).
  reaction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: elevation.raised,
  },
  reactionMine: { borderColor: borderState.active },
  reactionCount: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600' },
  reactionCountMine: { color: gameColors.crew },
});
