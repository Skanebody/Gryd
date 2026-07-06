/**
 * GRYD — PerkCard : carte reward de perk crew (AMENDEMENT-08 §1, doc §11).
 * Icône, rareté (tier), niveau requis, statut débloqué/verrouillé/en cours ;
 * le prochain perk affiche l'XP crew restante. Débloqué = reveal animé.
 */
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  BADGE_TIER_LABEL,
  BADGE_TIER_STYLE,
  colors,
  fontSizes,
  gameColors,
  radii,
  type BadgeTier,
  type IconName,
} from '@klaim/shared';
import { Icon } from '../Icon';
import { useReveal } from './anim';
import { StatePill } from './states';

export type PerkCardState = 'unlocked' | 'locked' | 'inprogress';

export interface PerkCardProps {
  /** Nom du perk (« Scout Ping »). */
  name: string;
  icon: IconName;
  /** Rareté visuelle (tier road → legend). */
  rarity: BadgeTier;
  /** Niveau crew requis. */
  levelRequired: number;
  state: PerkCardState;
  /** XP crew restants avant déblocage (état inprogress — « PROCHAIN PERK »). */
  xpRemaining?: number;
  /** Effet en une ligne (« Ping une zone à scouter pour le crew »). */
  description?: string;
  /** Anime le reveal (perk fraîchement débloqué, doc §24). */
  reveal?: boolean;
  /** Remplace le libellé de la pastille d'état (ex. « Niveau 8 » quand verrouillé). */
  stateLabel?: string;
  onPress?: () => void;
}

export function PerkCard({
  name,
  icon,
  rarity,
  levelRequired,
  state,
  xpRemaining,
  description,
  reveal = false,
  stateLabel,
  onPress,
}: PerkCardProps) {
  const { opacity, scale } = useReveal(reveal);
  const unlocked = state === 'unlocked';
  const ts = BADGE_TIER_STYLE[rarity];
  const iconTint = unlocked ? gameColors.crew : colors.gris;

  return (
    <Animated.View style={reveal ? { opacity, transform: [{ scale }] } : undefined}>
      <Pressable
        accessibilityRole={onPress ? 'button' : undefined}
        onPress={onPress}
        disabled={!onPress}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <View style={[styles.iconWrap, { borderColor: unlocked ? ts.ring : colors.grisLigne }]}>
          <Icon name={icon} size={22} color={iconTint} />
        </View>
        <View style={styles.body}>
          <Text style={[styles.name, !unlocked && styles.nameLocked]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {BADGE_TIER_LABEL[rarity]} · Niveau {levelRequired}
          </Text>
          {description ? (
            <Text style={styles.description} numberOfLines={2}>
              {description}
            </Text>
          ) : null}
          {state === 'inprogress' && xpRemaining !== undefined ? (
            <Text style={styles.xp} numberOfLines={1}>
              {xpRemaining.toLocaleString('fr-FR')} XP crew restants
            </Text>
          ) : null}
        </View>
        <StatePill state={state} label={stateLabel} />
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
  name: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '600' },
  nameLocked: { color: colors.gris },
  meta: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  description: { color: colors.gris, fontSize: fontSizes.xs, lineHeight: 16 },
  xp: { color: gameColors.crew, fontSize: fontSizes.xs, fontWeight: '600' },
});
