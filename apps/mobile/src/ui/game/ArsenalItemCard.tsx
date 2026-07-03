/**
 * GRYD — ArsenalItemCard : objet d'Arsenal (AMENDEMENT-08 §1 & §9, doc §20).
 * Icône encadrée par la rareté (tier), nom, usage, limite, prix (Éclats /
 * Foulées), statut. ZÉRO pay-to-win : cette carte n'affiche que style/confort/
 * objets capés — l'invariant est porté par les écrans (bannière doc §20).
 * `statsonly` = préview sans achat ; `owned` = déjà dans l'arsenal.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
import { haptics } from '../../lib/haptics';
import { Icon } from '../Icon';
import { StatePill, type GameVisualState } from './states';

export type ArsenalCurrency = 'eclats' | 'foulees';

/** Monnaie → icône filaire + libellé. */
const CURRENCY_META: Record<ArsenalCurrency, { icon: IconName; label: string }> = {
  eclats: { icon: 'eclats', label: 'Éclats' },
  foulees: { icon: 'foulees', label: 'Foulées' },
};

export interface ArsenalItemCardProps {
  name: string;
  icon: IconName;
  /** Rareté visuelle (tier road → legend, cadre de l'icône). */
  rarity: BadgeTier;
  /** Usage en une ligne (« Protège un cluster 48 h »). */
  usage: string;
  /** Limite anti-abus (« 1 / semaine ») — objets capés doc §20. */
  limit?: string;
  /** Prix (absent = gratuit/débloqué par le jeu). */
  price?: { amount: number; currency: ArsenalCurrency };
  /** États pertinents : active · locked · expired · statsonly · unlocked. */
  state?: GameVisualState;
  /** Déjà possédé (« Dans ton arsenal », CTA masqué). */
  owned?: boolean;
  /** CTA principal « Obtenir » (haptic medium — achat, doc §25). */
  onObtain?: () => void;
  /** CTA secondaire « Voir » (préview). */
  onView?: () => void;
}

export function ArsenalItemCard({
  name,
  icon,
  rarity,
  usage,
  limit,
  price,
  state = 'unlocked',
  owned = false,
  onObtain,
  onView,
}: ArsenalItemCardProps) {
  const ts = BADGE_TIER_STYLE[rarity];
  const locked = state === 'locked' || state === 'expired';
  const canObtain = !owned && !locked && onObtain !== undefined;
  const currency = price ? CURRENCY_META[price.currency] : null;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.iconWrap, { borderColor: locked ? colors.grisLigne : ts.ring }]}>
          <Icon name={icon} size={24} color={locked ? colors.gris : colors.blanc} />
        </View>
        <View style={styles.body}>
          <Text style={[styles.name, locked && styles.nameDim]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.rarity} numberOfLines={1}>
            {BADGE_TIER_LABEL[rarity]}
            {limit ? ` · Limite : ${limit}` : ''}
          </Text>
          <Text style={styles.usage} numberOfLines={2}>
            {usage}
          </Text>
        </View>
        <StatePill state={owned ? 'active' : state} label={owned ? 'Possédé' : undefined} />
      </View>

      <View style={styles.footer}>
        {price && currency && !owned ? (
          <View style={styles.price}>
            <Icon name={currency.icon} size={15} color={colors.blanc} />
            <Text style={styles.priceValue}>
              {price.amount.toLocaleString('fr-FR')} {currency.label}
            </Text>
          </View>
        ) : (
          <View style={styles.price}>
            <Text style={styles.ownedLabel}>{owned ? 'Dans ton arsenal' : ''}</Text>
          </View>
        )}
        <View style={styles.ctas}>
          {onView ? (
            <Pressable
              accessibilityRole="button"
              onPress={onView}
              style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}
            >
              <Text style={styles.ghostLabel}>Voir</Text>
            </Pressable>
          ) : null}
          {canObtain ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                haptics.medium();
                onObtain?.();
              }}
              style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
            >
              <Text style={styles.primaryLabel}>Obtenir</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
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
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
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
  name: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '700' },
  nameDim: { color: colors.gris },
  rarity: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  usage: { color: colors.gris, fontSize: fontSizes.xs, lineHeight: 16 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  price: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  priceValue: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '700' },
  ownedLabel: { color: colors.gris, fontSize: fontSizes.xs },
  ctas: { flexDirection: 'row', gap: 8 },
  ghost: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostLabel: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '600' },
  primary: {
    height: 38,
    paddingHorizontal: 18,
    borderRadius: radii.pill,
    backgroundColor: gameColors.crew,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: { color: colors.noir, fontSize: fontSizes.xs, fontWeight: '700' },
});
