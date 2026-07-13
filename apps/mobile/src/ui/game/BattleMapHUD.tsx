/**
 * GRYD — BattleMapHUD : bandeau HUD haut de la Battle Map (AMENDEMENT-08 §1 &
 * §4, doc §7). `SAISON 0 · J-12 / Paris Est · Zone contestée / Crew rank #8`.
 * Pensé pour être posé en overlay sur la carte (fond carbone translucide).
 * L'état de zone est rendu par la pastille d'état commune (couleur = état).
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, gameColors, radii, withAlpha } from '@klaim/shared';
import { Icon } from '../Icon';
import { StatePill, type GameVisualState } from './states';

export interface BattleMapHUDProps {
  /** Libellé de saison (« SAISON 0 »). */
  seasonLabel: string;
  /** Jours restants (affiché « J-12 »). */
  daysLeft: number;
  /** Zone courante (« Paris Est »). */
  zoneName: string;
  /** État de jeu de la zone (contested/protected/decay/active…). */
  zoneState?: GameVisualState;
  /** Rang crew local (affiché « Crew #8 »). */
  crewRank?: number;
  /** Ouvre le sélecteur de layers (Decay/Routes/Crew/Rivals/Missions). */
  onLayersPress?: () => void;
}

export function BattleMapHUD({
  seasonLabel,
  daysLeft,
  zoneName,
  zoneState,
  crewRank,
  onLayersPress,
}: BattleMapHUDProps) {
  return (
    <View style={styles.bar}>
      <View style={styles.left}>
        <Text style={styles.season} numberOfLines={1}>
          {seasonLabel.toUpperCase()} · J-{Math.max(0, daysLeft)}
        </Text>
        <View style={styles.zoneRow}>
          <Text style={styles.zone} numberOfLines={1}>
            {zoneName}
          </Text>
          {zoneState ? <StatePill state={zoneState} /> : null}
        </View>
      </View>

      <View style={styles.right}>
        {crewRank !== undefined ? (
          <View style={styles.rank}>
            <Icon name="crest" size={14} color={gameColors.crew} />
            <Text style={styles.rankLabel}>#{crewRank}</Text>
          </View>
        ) : null}
        {onLayersPress ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Layers de carte"
            onPress={onLayersPress}
            style={({ pressed }) => [styles.layers, pressed && styles.pressed]}
          >
            <Icon name="radar" size={18} color={colors.blanc} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    // Surface profonde translucide : le HUD flotte sur la carte sans la masquer.
    backgroundColor: withAlpha(gameColors.carbon, 0.88),
  },
  left: { flex: 1, gap: 4 },
  season: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  zoneRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  zone: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '700', flexShrink: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rank: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
  },
  rankLabel: { color: gameColors.crew, fontSize: fontSizes.xs, fontWeight: '700' },
  layers: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
});
