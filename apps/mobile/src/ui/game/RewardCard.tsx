/**
 * GRYD — RewardCard : carte de récompense générique (AMENDEMENT-08 §1) —
 * contenu de coffre, reward top 10, perk révélé, gain de fin de course.
 * Icône filaire dans un écrin hexagonal, libellé, sous-libellé, état.
 * `claimable` = reveal animé (useReveal) + teinte crew.
 */
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, gameColors, radii, type IconName } from '@klaim/shared';
import { Icon } from '../Icon';
import { useReveal } from './anim';
import { GAME_STATE_STYLE, StatePill, type GameVisualState } from './states';

export interface RewardCardProps {
  /** Icône filaire du gain (cadeau, skin, eclats, medaille…). */
  icon: IconName;
  label: string;
  /** Détail court (« Frame Tempo », « +120 XP crew »). */
  sublabel?: string;
  /** États pertinents : unlocked · locked · claimable · inprogress. */
  state?: GameVisualState;
  /** Teinte du gain (défaut : teinte de l'état). Toujours un token. */
  tint?: string;
  /** Anime le reveal à l'apparition (ouverture de coffre, doc §24). */
  reveal?: boolean;
  onPress?: () => void;
}

export function RewardCard({
  icon,
  label,
  sublabel,
  state = 'unlocked',
  tint,
  reveal = false,
  onPress,
}: RewardCardProps) {
  const { opacity, scale } = useReveal(reveal);
  const stateStyle = GAME_STATE_STYLE[state];
  const accent = tint ?? (state === 'locked' || state === 'expired' ? colors.gris : stateStyle.tint);
  const locked = state === 'locked' || state === 'expired';

  return (
    <Animated.View style={reveal ? { opacity, transform: [{ scale }] } : undefined}>
      <Pressable
        accessibilityRole={onPress ? 'button' : undefined}
        onPress={onPress}
        disabled={!onPress}
        style={({ pressed }) => [
          styles.card,
          state === 'claimable' && styles.claimable,
          pressed && styles.pressed,
        ]}
      >
        <View style={[styles.iconWrap, { borderColor: locked ? colors.grisLigne : accent }]}>
          <Icon name={icon} size={22} color={locked ? colors.gris : accent} />
        </View>
        <View style={styles.body}>
          <Text style={[styles.label, locked && styles.labelLocked]} numberOfLines={1}>
            {label}
          </Text>
          {sublabel ? (
            <Text style={styles.sublabel} numberOfLines={1}>
              {sublabel}
            </Text>
          ) : null}
        </View>
        <StatePill state={state} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: 14,
  },
  claimable: { borderColor: gameColors.crew },
  pressed: { opacity: 0.85 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: gameColors.carbon,
  },
  body: { flex: 1, gap: 2 },
  label: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '600' },
  labelLocked: { color: colors.gris },
  sublabel: { color: colors.gris, fontSize: fontSizes.xs },
});
