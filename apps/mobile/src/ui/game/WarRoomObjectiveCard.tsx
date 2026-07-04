/**
 * GRYD — WarRoomObjectiveCard : carte d'offensive / objectif crew
 * (AMENDEMENT-08 §1 & §10, doc §15). Objectif, zone, progression, temps
 * restant (mono), participants, récompense, CTA Rejoindre / Voir carte.
 * `decay` = défense urgente (hexes qui expirent, teinte danger).
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, gameColors, radii, spacing, type IconName } from '@klaim/shared';
import { Icon } from '../Icon';
import { ProgressBar } from '../ProgressBar';
import { GAME_STATE_STYLE, StatePill, type GameVisualState } from './states';

export interface WarRoomObjectiveCardProps {
  /** Type affiché (« OFFENSIVE CREW », « DÉFENSE URGENTE »). */
  kicker: string;
  /** Zone visée (« République »). */
  zone: string;
  /** Objectif en une ligne (« +800 hexes », « 34 hexes expirent dans 48 h »). */
  objective: string;
  /** Progression 0..1 (masquée si absente — ex. défense pure). */
  progress?: number;
  /** Temps restant préformaté (« 04:21:08 » — rendu mono). */
  timeLeft?: string;
  participants?: { current: number; max: number };
  /** Récompense (« Crew Chest Gold »). */
  reward?: string;
  /** États pertinents : active · inprogress · claimable · expired · decay. */
  state?: GameVisualState;
  /** Icône du type (raid, bouclier, sablier, route… défaut cible). */
  icon?: IconName;
  /** CTA principal (« Rejoindre » / « Défendre »). */
  joinLabel?: string;
  onJoin?: () => void;
  onOpenMap?: () => void;
}

export function WarRoomObjectiveCard({
  kicker,
  zone,
  objective,
  progress,
  timeLeft,
  participants,
  reward,
  state = 'active',
  icon = 'cible',
  joinLabel = 'Rejoindre',
  onJoin,
  onOpenMap,
}: WarRoomObjectiveCardProps) {
  const tint = GAME_STATE_STYLE[state].tint;
  const expired = state === 'expired';

  return (
    <View style={[styles.card, state === 'decay' && styles.cardDecay]}>
      <View style={styles.head}>
        <View style={[styles.iconWrap, { borderColor: tint }]}>
          <Icon name={icon} size={20} color={tint} />
        </View>
        <View style={styles.headBody}>
          <Text style={[styles.kicker, { color: tint }]} numberOfLines={1}>
            {kicker.toUpperCase()}
          </Text>
          <Text style={styles.zone} numberOfLines={1}>
            {zone}
          </Text>
        </View>
        <StatePill state={state} />
      </View>

      <Text style={styles.objective} numberOfLines={2}>
        {objective}
      </Text>

      {progress !== undefined ? (
        <View style={styles.progressBlock}>
          <ProgressBar value={progress} height={7} fill={expired ? colors.gris : gameColors.crew} />
          <Text style={styles.progressLabel} numberOfLines={1}>
            {Math.round(Math.min(1, Math.max(0, progress)) * 100)} %
          </Text>
        </View>
      ) : null}

      <View style={styles.metaRow}>
        {timeLeft ? (
          <View style={styles.metaItem}>
            <Icon name="sablier" size={13} color={colors.gris} />
            <Text style={styles.metaMono}>{timeLeft}</Text>
          </View>
        ) : null}
        {participants ? (
          <View style={styles.metaItem}>
            <Icon name="crew" size={13} color={colors.gris} />
            <Text style={styles.meta}>
              {participants.current} / {participants.max}
            </Text>
          </View>
        ) : null}
        {reward ? (
          <View style={styles.metaItem}>
            <Icon name="coffre" size={13} color={gameColors.gold} />
            <Text style={[styles.meta, { color: gameColors.gold }]} numberOfLines={1}>
              {reward}
            </Text>
          </View>
        ) : null}
      </View>

      {(onJoin || onOpenMap) && !expired ? (
        <View style={styles.ctas}>
          {onJoin ? (
            <Pressable
              accessibilityRole="button"
              onPress={onJoin}
              style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
            >
              <Text style={styles.primaryLabel}>{joinLabel}</Text>
            </Pressable>
          ) : null}
          {onOpenMap ? (
            <Pressable
              accessibilityRole="button"
              onPress={onOpenMap}
              style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}
            >
              <Icon name="carte" size={14} color={colors.blanc} />
              <Text style={styles.ghostLabel}>Voir carte</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
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
  cardDecay: { borderColor: gameColors.danger },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: gameColors.carbon,
  },
  headBody: { flex: 1, gap: 2 },
  kicker: { fontSize: fontSizes.xs, fontWeight: '700', letterSpacing: 0.8 },
  zone: { color: colors.blanc, fontSize: fontSizes.lg, fontWeight: '700' },
  objective: { color: colors.blanc, fontSize: fontSizes.sm, lineHeight: 19 },
  progressBlock: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressLabel: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600', width: 44, flexShrink: 0, textAlign: 'right' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 14, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  meta: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600' },
  // Chiffres tabulaires (pas de fontFamily custom : aucune fonte chargée à ce jour).
  metaMono: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '600', fontVariant: ['tabular-nums'] },
  ctas: { flexDirection: 'row', gap: 8 },
  primary: {
    flex: 1,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: gameColors.crew,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: { color: colors.noir, fontSize: fontSizes.sm, fontWeight: '700' },
  ghost: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
  },
  ghostLabel: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '600' },
  pressed: { opacity: 0.85 },
});
