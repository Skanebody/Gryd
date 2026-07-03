/**
 * GRYD — BadgeCard : le badge en GRAND format carte, désirable (AMENDEMENT-08
 * §1, doc §23). Réutilise la géométrie hex de features/badges/BadgeHex
 * (importée, jamais dupliquée) : famille = teinte du pictogramme, tier =
 * anneau/glow/halo. Ajoute nom, famille · tier, jauge de progression,
 * condition et récompense. Secret verrouillé = « ? » (géré par BadgeHex).
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  BADGE_TIER_LABEL,
  colors,
  fontSizes,
  gameColors,
  radii,
  spacing,
  type BadgeTier,
} from '@klaim/shared';
import { BadgeHex, type BadgeHexState } from '../../features/badges/BadgeHex';
import type { BadgeFamilyId } from '../../features/badges/catalog';
import { ProgressBar } from '../ProgressBar';

export interface BadgeCardProps {
  name: string;
  family: BadgeFamilyId;
  /** Libellé FR de la famille (« Territoire »). */
  familyLabel: string;
  /** Couleur DATA de la famille (catalogue — exception polychrome §1). */
  familyColor: string;
  tier: BadgeTier;
  state: BadgeHexState;
  /** Condition formulée joueur (« Atteins 1 000 hexes capturés. »). */
  requirement: string;
  /** Progression vers le seuil (jauge + « 720 / 1 000 »). */
  progress?: { value: number; threshold: number };
  /** Récompense au déblocage (« Titre “Hex Hunter” »). */
  reward?: string;
  /** Badge secret révélé (pictogramme losange). */
  secret?: boolean;
  onPress?: () => void;
}

export function BadgeCard({
  name,
  family,
  familyLabel,
  familyColor,
  tier,
  state,
  requirement,
  progress,
  reward,
  secret = false,
  onPress,
}: BadgeCardProps) {
  const unlocked = state === 'unlocked';
  const hidden = state === 'secretLocked';
  const ratio =
    progress && progress.threshold > 0
      ? Math.min(1, Math.max(0, progress.value / progress.threshold))
      : 0;

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.hexWrap}>
        <BadgeHex family={family} familyColor={familyColor} state={state} tier={tier} size="lg" secret={secret} />
      </View>

      <Text style={[styles.name, !unlocked && styles.nameLocked]} numberOfLines={1}>
        {hidden ? 'Badge secret' : name}
      </Text>
      <Text style={styles.meta} numberOfLines={1}>
        {familyLabel} · {BADGE_TIER_LABEL[tier]}
      </Text>

      {progress && !hidden ? (
        <View style={styles.progressBlock}>
          <ProgressBar
            value={ratio}
            height={6}
            fill={unlocked ? gameColors.crew : colors.blanc}
          />
          <Text style={styles.progressLabel}>
            {Math.min(progress.value, progress.threshold).toLocaleString('fr-FR')} /{' '}
            {progress.threshold.toLocaleString('fr-FR')}
          </Text>
        </View>
      ) : null}

      <Text style={styles.requirement} numberOfLines={2}>
        {hidden ? 'Découvre sa condition en jouant.' : requirement}
      </Text>

      {reward && !hidden ? (
        <Text style={styles.reward} numberOfLines={1}>
          Récompense : {reward}
        </Text>
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
    padding: spacing.cardPadding,
    alignItems: 'center',
    gap: 4,
  },
  pressed: { opacity: 0.85 },
  hexWrap: { marginBottom: 8 },
  name: { color: colors.blanc, fontSize: fontSizes.lg, fontWeight: '700', textAlign: 'center' },
  nameLocked: { color: colors.gris },
  meta: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  progressBlock: { alignSelf: 'stretch', gap: 4, marginTop: 8 },
  progressLabel: { color: colors.gris, fontSize: fontSizes.xs, textAlign: 'center' },
  requirement: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  reward: { color: gameColors.gold, fontSize: fontSizes.xs, fontWeight: '600', marginTop: 2 },
});
