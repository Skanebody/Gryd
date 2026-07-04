/**
 * GRYD — ArsenalItemCard : objet d'Arsenal (AMENDEMENT-08 §1 & §9, doc §20).
 * L'icône personnalisée de l'objet (AMENDEMENT-14 §5, registre arsenal-icons)
 * EST le visuel : dessin distinctif par objet, encadré ET teinté par la rareté
 * (tier — BADGE_TIER_STYLE, tiers hauts colorés carbon/elite/legend), nom,
 * usage, limite, prix (Éclats / Foulées), statut. ZÉRO pay-to-win : cette
 * carte n'affiche que style/confort/objets capés — l'invariant est porté par
 * les écrans (bannière doc §20).
 * `statsonly` = préview sans achat ; `owned` = déjà dans l'arsenal.
 * Compat : `icon` (IconName filaire) reste accepté en secours quand aucun
 * `slug` n'est fourni — les usages existants ne cassent pas.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import {
  ARSENAL_ICON_VIEWBOX,
  BADGE_TIER_LABEL,
  BADGE_TIER_RANK,
  BADGE_TIER_STYLE,
  arsenalIconFor,
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

// ─── Icône d'objet d'Arsenal (registre arsenal-icons, AMENDEMENT-14 §5) ─────

export interface ArsenalIconProps {
  /** Slug du registre (ou alias/SKU — résolution arsenalIconFor). */
  slug: string;
  /** Côté en px (défaut 24 = boîte native des tracés). */
  size?: number;
  /** Couleur du trait — token ou teinte de tier (jamais en dur). */
  color: string;
}

/** Icône filaire d'un objet d'Arsenal — même recette de trait qu'Icon (§F). */
export function ArsenalIcon({ slug, size = 24, color }: ArsenalIconProps) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${ARSENAL_ICON_VIEWBOX} ${ARSENAL_ICON_VIEWBOX}`}>
      {arsenalIconFor(slug).map((d) => (
        <Path
          key={d}
          d={d}
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ))}
    </Svg>
  );
}

/**
 * Teinte de l'icône par rareté : tiers bas = blanc (le tier se lit au cadre),
 * tiers hauts = teinte du tier (titane carbon / glace elite / or legend) —
 * couleurs DATA de BADGE_TIER_STYLE, jamais en dur.
 */
function tierTint(rarity: BadgeTier): string {
  return BADGE_TIER_RANK[rarity] >= BADGE_TIER_RANK.carbon
    ? BADGE_TIER_STYLE[rarity].ring
    : colors.blanc;
}

export type ArsenalCurrency = 'eclats' | 'foulees';

/**
 * Monnaie → libellé. L'icône vient du registre arsenal-icons (gemme facettée /
 * double empreinte — AMENDEMENT-14 §5), le slug = la clé de monnaie.
 */
const CURRENCY_LABEL: Record<ArsenalCurrency, string> = {
  eclats: 'Éclats',
  foulees: 'Foulées',
};

export interface ArsenalItemCardProps {
  name: string;
  /**
   * Slug d'icône personnalisée (registre arsenal-icons — AMENDEMENT-14 §5).
   * Prioritaire sur `icon` ; absent, on résout quand même par le nom.
   */
  slug?: string;
  /** Icône filaire de secours (compat usages existants sans slug). */
  icon?: IconName;
  /** Rareté visuelle (tier road → legend, cadre + teinte de l'icône). */
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
  slug,
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
  const iconColor = locked ? colors.gris : tierTint(rarity);

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.iconWrap, { borderColor: locked ? colors.grisLigne : ts.ring }]}>
          {slug !== undefined || icon === undefined ? (
            <ArsenalIcon slug={slug ?? name} size={36} color={iconColor} />
          ) : (
            <Icon name={icon} size={36} color={iconColor} />
          )}
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
        {price && !owned ? (
          <View style={styles.price}>
            <ArsenalIcon slug={price.currency} size={15} color={colors.blanc} />
            <Text style={styles.priceValue}>
              {price.amount.toLocaleString('fr-FR')} {CURRENCY_LABEL[price.currency]}
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
    width: 60,
    height: 60,
    borderRadius: 16,
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
