/**
 * GRYD — ChestCard : coffre crew hebdo / coffre saison (AMENDEMENT-08 §1,
 * doc §11 & §24). Coffre + jauge %, palier suivant, état `claimable` animé
 * (pulse chartreuse + CTA Ouvrir). La jauge est la ProgressBar charte.
 */
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, gameColors, radii, spacing } from '@klaim/shared';
import { haptics } from '../../lib/haptics';
import { Icon } from '../Icon';
import { ProgressBar } from '../ProgressBar';
import { usePulse } from './anim';
import { StatePill } from './states';

export type ChestCardState = 'inprogress' | 'claimable' | 'locked' | 'expired';

export interface ChestCardProps {
  /** Nom du coffre (« Coffre crew », « Crew Chest Gold »). */
  label: string;
  /** Remplissage 0..1 (66 % → 0.66). */
  progress: number;
  /** Palier suivant (« Prochain palier : 75 % — +1 reward »). */
  nextMilestone?: string;
  state: ChestCardState;
  /** CTA « Ouvrir » (état claimable uniquement). */
  onOpen?: () => void;
}

export function ChestCard({ label, progress, nextMilestone, state, onOpen }: ChestCardProps) {
  const claimable = state === 'claimable';
  const scale = usePulse(claimable, 1.03);
  const pct = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  const dim = state === 'locked' || state === 'expired';
  const tint = claimable ? gameColors.crew : dim ? colors.gris : gameColors.gold;

  return (
    <Animated.View style={[styles.card, claimable && styles.cardClaimable, { transform: [{ scale }] }]}>
      <View style={styles.row}>
        <View style={[styles.iconWrap, { borderColor: tint }]}>
          <Icon name="coffre" size={26} color={tint} />
        </View>
        <View style={styles.body}>
          <Text style={[styles.label, dim && styles.labelDim]} numberOfLines={1}>
            {label}
          </Text>
          <Text style={[styles.pct, { color: tint }]}>{pct} %</Text>
        </View>
        <StatePill state={state} label={claimable ? 'À ouvrir' : undefined} />
      </View>

      <ProgressBar value={progress} height={8} fill={claimable ? gameColors.crew : gameColors.gold} />

      {nextMilestone && !claimable ? (
        <Text style={styles.milestone} numberOfLines={1}>
          {nextMilestone}
        </Text>
      ) : null}

      {claimable && onOpen ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            haptics.medium();
            onOpen();
          }}
          style={({ pressed }) => [styles.openButton, pressed && styles.pressed]}
        >
          <Text style={styles.openLabel}>Ouvrir le coffre</Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
    gap: 12,
  },
  cardClaimable: { borderColor: gameColors.crew },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: gameColors.carbon,
  },
  body: { flex: 1, gap: 2 },
  label: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '600' },
  labelDim: { color: colors.gris },
  pct: { fontSize: fontSizes.lg, fontWeight: '700' },
  milestone: { color: colors.gris, fontSize: fontSizes.xs },
  openButton: {
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: gameColors.crew,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  // Libellé noir sur chartreuse (contraste charte).
  openLabel: { color: colors.noir, fontSize: fontSizes.sm, fontWeight: '700' },
});
