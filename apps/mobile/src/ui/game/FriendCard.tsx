/**
 * GRYD — FriendCard : ami mis en scène (AMENDEMENT-08 §1 & §8, doc §19).
 * Avatar, @handle, ville · crew, dispo + runs semaine ; actions positives en
 * avant (Inviter sortie / Inviter crew), le reste (dont Bloquer) relégué au
 * menu « … » (anti-shame : jamais de mise en avant négative).
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, gameColors, radii, sizes, spacing, type BadgeTier } from '@klaim/shared';
import { Icon } from '../Icon';
import { PlayerAvatarFrame } from './PlayerAvatarFrame';

export interface FriendCardProps {
  /** Handle affiché (« @lena_run »). */
  handle: string;
  city?: string;
  crewName?: string;
  /** Dispo courte (« Dispo défense ») — jamais de formulation négative. */
  availability?: string;
  /** Runs cette semaine (affiché seulement si fourni — privacy/mode discret). */
  runsThisWeek?: number;
  tier?: BadgeTier;
  imageUri?: string;
  onInviteRun?: () => void;
  onInviteCrew?: () => void;
  /** Menu « … » (contient Bloquer & co — relégué, doc §19). */
  onMore?: () => void;
  onPress?: () => void;
}

export function FriendCard({
  handle,
  city,
  crewName,
  availability,
  runsThisWeek,
  tier,
  imageUri,
  onInviteRun,
  onInviteCrew,
  onMore,
  onPress,
}: FriendCardProps) {
  const whereParts = [city, crewName].filter((p): p is string => p !== undefined);
  const statusParts = [
    availability,
    runsThisWeek !== undefined ? `${runsThisWeek} runs cette semaine` : undefined,
  ].filter((p): p is string => p !== undefined);

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.row}>
        <PlayerAvatarFrame name={handle.replace(/^@/, '')} tier={tier} size="m" imageUri={imageUri} />
        <View style={styles.body}>
          <Text style={styles.handle} numberOfLines={1}>
            {handle}
          </Text>
          {whereParts.length > 0 ? (
            <Text style={styles.where} numberOfLines={1}>
              {whereParts.join(' · ')}
            </Text>
          ) : null}
          {statusParts.length > 0 ? (
            <Text style={styles.status} numberOfLines={1}>
              {statusParts.join(' · ')}
            </Text>
          ) : null}
        </View>
        {onMore ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Plus d'options"
            onPress={onMore}
            style={({ pressed }) => [styles.more, pressed && styles.pressed]}
          >
            <Text style={styles.moreLabel}>…</Text>
          </Pressable>
        ) : null}
      </View>

      {(onInviteRun || onInviteCrew) ? (
        <View style={styles.actions}>
          {onInviteRun ? (
            <Pressable
              accessibilityRole="button"
              onPress={onInviteRun}
              style={({ pressed }) => [styles.action, pressed && styles.pressed]}
            >
              <Icon name="foulees" size={13} color={colors.blanc} />
              <Text style={styles.actionLabel}>Inviter sortie</Text>
            </Pressable>
          ) : null}
          {onInviteCrew ? (
            <Pressable
              accessibilityRole="button"
              onPress={onInviteCrew}
              style={({ pressed }) => [styles.action, pressed && styles.pressed]}
            >
              <Icon name="crest" size={13} color={colors.blanc} />
              <Text style={styles.actionLabel}>Inviter crew</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: 14,
    gap: 12,
  },
  pressed: { opacity: 0.85 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  body: { flex: 1, gap: 2 },
  handle: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '700' },
  where: { color: colors.gris, fontSize: fontSizes.xs },
  status: { color: gameColors.crew, fontSize: fontSizes.xs, fontWeight: '600' },
  // Kebab « … » : cible tactile portée à 44 (P1 : était 34×34).
  more: {
    width: sizes.touchTarget,
    height: sizes.touchTarget,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreLabel: { color: colors.gris, fontSize: fontSizes.lg, fontWeight: '700', lineHeight: 20 },
  actions: { flexDirection: 'row', gap: spacing.xs },
  // Pills d'invitation : plancher tactile 44 (P1 : hauteur ~33 px).
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    minHeight: sizes.touchTarget,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
  },
  actionLabel: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '600' },
});
