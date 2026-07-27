/**
 * GRYD — LA FRISE DES PALIERS DE FIN DE SAISON, partagée.
 *
 * ─── POURQUOI ELLE SORT DE `classement.tsx` (27/07/2026) ─────────────────────
 * Elle y vivait en composant local (`SeasonTierRow`), avec `tierLabel` et
 * `tierCondition`. La spéc E59 donne à la Saison son écran propre (`/season`,
 * « récompenses de saison »), pendant qu'E53 garde le classement : sans
 * extraction, la même frise aurait été RECOPIÉE — deux rendus du même barème,
 * donc deux endroits où il peut se mettre à mentir. Un seul composant, un seul
 * barème (`SEASON_REWARD_TIERS`, lui-même dérivé de `SEASON_RANK_TIERS` de
 * game-rules, que `season_close` applique côté serveur).
 *
 * ─── CE QU'ELLE PROMET, ET CE QU'ELLE REFUSE ─────────────────────────────────
 *  · le NOM est le nom propre du catalogue @klaim/shared (invariant, jamais
 *    traduit) ; la CONDITION est retraduite en 5 langues ;
 *  · la rareté passe par le MATÉRIAU (acier sombre → chrome → titane → élite →
 *    or limité), lu dans `BADGE_TIER_STYLE` — aucune couleur en dur, aucun
 *    clinquant, jamais une couleur qui porterait seule l'information ;
 *  · le statut « Obtenu » est LU dans `user_badges` (décerné serveur). Tant que
 *    cette lecture n'a rien établi, `status` vaut `null` et AUCUN statut n'est
 *    affiché — ni « obtenu », ni « verrouillé » : on ne devine pas un badge ;
 *  · aucun palier « premium » n'existe et aucun ne peut exister ici : la seule
 *    entrée est le RANG, et le rang se court (anti-pay-to-win, constitution §3).
 *
 * Posée sur l'ESPACE (rail + texte), jamais une card dans une card (§A).
 */
import { StyleSheet, Text, View } from 'react-native';
import {
  BADGE_TIER_STYLE,
  colors,
  elevation,
  fonts,
  fontSizes,
  iconSizes,
  radii,
  spacing,
} from '@klaim/shared';
import { Icon } from '../../ui/Icon';
import { C as S } from '../../i18n/catalog/saison';
import { useT } from '../../i18n/store';
import { SEASON_REWARD_TIERS, type SeasonRewardTier } from './seasonRewards';

/** `null` = la lecture des badges n'autorise AUCUNE affirmation. */
export type TierStatus = 'earned' | 'locked' | null;

/** Libellé d'un palier de fin de saison (« Top 10 local », « #1 local »…). */
export function tierLabel(tier: SeasonRewardTier, t: ReturnType<typeof useT>): string {
  if (tier.soleWinnerOnly) return t(S.palierVainqueur);
  if (tier.maxRank <= 1) return t(S.palierPremier);
  return t(S.palierTopN, { n: tier.maxRank });
}

/** Condition EN CLAIR d'un palier (retraduite — shared la rédige en français). */
export function tierCondition(tier: SeasonRewardTier, t: ReturnType<typeof useT>): string {
  if (tier.soleWinnerOnly) return t(S.conditionVainqueur);
  if (tier.maxRank <= 1) return t(S.conditionPremier);
  return t(S.conditionTopN, { n: tier.maxRank });
}

function SeasonTierRow({
  tier,
  last,
  status,
}: {
  tier: SeasonRewardTier;
  last: boolean;
  status: TierStatus;
}) {
  const t = useT();
  const material = BADGE_TIER_STYLE[tier.tier];
  const earned = status === 'earned';
  return (
    <View style={styles.tierRow}>
      <View style={styles.tierRail}>
        <View
          style={[styles.tierDot, { borderColor: material.ring, borderWidth: material.strokeWidth }]}
        >
          <Icon name="bouclier" size={iconSizes.sm} color={earned ? material.ring : colors.gris} />
        </View>
        {last ? null : <View style={styles.tierLine} />}
      </View>
      <View style={styles.tierBody}>
        {/* Nom propre du catalogue @klaim/shared — invariant, jamais traduit. */}
        <Text style={styles.tierName} numberOfLines={1} ellipsizeMode="clip">
          {tier.name}
        </Text>
        <Text style={styles.tierCondition}>{tierCondition(tier, t)}</Text>
      </View>
      {/* Le statut n'est affiché QUE si `user_badges` a été lu pour CE compte —
          icône + texte (jamais la couleur seule). Sans lecture, aucune promesse. */}
      {status === null ? null : (
        <View style={styles.tierStatus}>
          <Icon
            name={earned ? 'badge' : 'verrou'}
            size={iconSizes.xs}
            color={earned ? colors.blanc : colors.grisFaible}
          />
          <Text style={[styles.tierStatusLabel, earned && styles.tierStatusEarned]}>
            {t(earned ? S.statutObtenu : S.statutVerrouille)}
          </Text>
        </View>
      )}
    </View>
  );
}

export interface SeasonTierListProps {
  /**
   * Clés de badge RÉELLEMENT débloquées (`user_badges`), ou `null` quand la
   * lecture n'a rien établi — auquel cas AUCUN statut n'est peint.
   */
  unlocked: ReadonlySet<string> | null;
  /** Sous-ensemble à rendre (E61 n'énonce que les paliers décrochés). */
  tiers?: readonly SeasonRewardTier[];
}

export function SeasonTierList({ unlocked, tiers = SEASON_REWARD_TIERS }: SeasonTierListProps) {
  return (
    <View style={styles.frieze}>
      {tiers.map((tier, i) => (
        <SeasonTierRow
          key={tier.badgeKey}
          tier={tier}
          last={i === tiers.length - 1}
          status={unlocked === null ? null : unlocked.has(tier.badgeKey) ? 'earned' : 'locked'}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Frise VERTICALE des paliers : rail + lignes posées sur l'espace ──
  frieze: { marginTop: 2 },
  tierRow: { flexDirection: 'row', gap: spacing.sm },
  tierRail: { alignItems: 'center', width: 32 },
  tierDot: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: elevation.surface,
  },
  // Le fil qui relie les paliers : filet discret, jamais un cadre.
  tierLine: { flex: 1, width: 1, backgroundColor: colors.grisLigne, marginVertical: 4 },
  tierBody: { flex: 1, paddingBottom: spacing.md, gap: 2 },
  tierName: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontFamily: fonts.textSemi,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  tierCondition: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.5,
  },
  tierStatus: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, paddingTop: 2 },
  tierStatusLabel: { color: colors.grisFaible, fontSize: fontSizes.xs, letterSpacing: 0.3 },
  tierStatusEarned: { color: colors.blanc },
});
