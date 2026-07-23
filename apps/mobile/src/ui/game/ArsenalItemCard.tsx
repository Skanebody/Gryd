/**
 * GRYD — ArsenalItemCard : objet d'Arsenal (AMENDEMENT-08 §1 & §9, doc §20).
 * L'icône personnalisée de l'objet (AMENDEMENT-14 §5, registre arsenal-icons)
 * EST le visuel : dessin distinctif par objet, teinté par la rareté (tier —
 * BADGE_TIER_STYLE, tiers hauts colorés carbon/elite/legend), nom, usage en
 * une ligne, explication compacte (≤ 2 lignes labellisées), prix (Éclats / €),
 * statut. UN SEUL bouton d'action par carte (cible ≥ 44 px) ; le corps ouvre
 * le détail au tap. ZÉRO pay-to-win : cette carte n'affiche que style/confort/
 * objets capés — l'invariant est porté par les écrans (bannière doc §20).
 * `statsonly` = préview sans achat ; `owned` = déjà dans l'arsenal.
 * Compat : `icon` (IconName filaire) reste accepté en secours quand aucun
 * `slug` n'est fourni — les usages existants ne cassent pas.
 */
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import {
  ARSENAL_ICON_VIEWBOX,
  BADGE_TIER_LABEL,
  BADGE_TIER_RANK,
  BADGE_TIER_STYLE,
  arsenalIconFor,
  borderState,
  colors,
  elevation,
  fontSizes,
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
/** Devise d'un prix affiché : monnaies de jeu OU euros (packs/abonnements §19). */
export type ArsenalPriceCurrency = ArsenalCurrency | 'eur';

/**
 * Monnaie → libellé. L'icône vient du registre arsenal-icons (gemme facettée /
 * double empreinte — AMENDEMENT-14 §5), le slug = la clé de monnaie. L'euro n'a
 * pas d'icône de jeu : rendu « 9,99 € » directement (pack payant réel).
 */
const CURRENCY_LABEL: Record<ArsenalCurrency, string> = {
  eclats: 'Éclats',
  foulees: 'Foulées',
};

/** Rendu du prix (« 400 Éclats », « 9,99 € »). L'euro utilise le format FR. */
function priceText(price: { amount: number; currency: ArsenalPriceCurrency }): string {
  if (price.currency === 'eur') {
    return `${price.amount.toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} €`;
  }
  return `${price.amount.toLocaleString('fr-FR')} ${CURRENCY_LABEL[price.currency]}`;
}

export interface ArsenalItemCardProps {
  name: string;
  /**
   * Slug d'icône personnalisée (registre arsenal-icons — AMENDEMENT-14 §5).
   * Prioritaire sur `icon` ; absent, on résout quand même par le nom.
   */
  slug?: string;
  /**
   * APERÇU ILLUSTRÉ optionnel (rendu à la place de l'icône, même emplacement N2) :
   * l'appelant y pose un mini-aperçu SVG pour les cosmétiques (on voit le skin/
   * frame d'un coup d'œil). Absent → l'icône filaire du registre est rendue.
   */
  preview?: ReactNode;
  /** Icône filaire de secours (compat usages existants sans slug). */
  icon?: IconName;
  /** Rareté visuelle (tier road → legend, cadre + teinte de l'icône). */
  rarity: BadgeTier;
  /** Usage en une ligne (« Protège un cluster 48 h »). */
  usage: string;
  /** Explication compacte visible sans ouvrir le détail. */
  explanation?: readonly { label: string; text: string }[];
  /** Limite anti-abus (« 1 / semaine ») — objets capés doc §20. */
  limit?: string;
  /** Prix (absent = gratuit/débloqué par le jeu). Devise EUR = pack payant réel. */
  price?: { amount: number; currency: ArsenalPriceCurrency };
  /**
   * Note posée À LA PLACE du prix quand l'objet n'en a AUCUN et n'est pas
   * possédé (objets fonctionnels : « Ne s'achète pas », anti pay-to-win). Sans
   * elle, le pied de carte restait un vide muet. Ce n'est jamais un bouton.
   */
  footnote?: string;
  /** États pertinents : active · locked · expired · statsonly · unlocked. */
  state?: GameVisualState;
  /** Déjà possédé (« Dans ton arsenal », CTA masqué). */
  owned?: boolean;
  /** Équipé (skin/frame/bannière actif) — pastille « Équipé », CTA masqué. */
  equipped?: boolean;
  /** Équipable depuis l'inventaire : affiche « Équiper » (§16, rendu carte V1). */
  onEquip?: () => void;
  /** CTA principal du footer (haptic medium). Le libellé DOIT dire ce qui se
   *  passe vraiment : « Obtenir » seulement si le tap achète, « Voir détails »
   *  si le tap ouvre la sheet de décision. */
  onObtain?: () => void;
  /** Libellé du CTA principal (défaut « Obtenir » — verbe précis obligatoire). */
  obtainLabel?: string;
  /** CTA secondaire « Voir » (préview / détail). */
  onView?: () => void;
  /**
   * Poids visuel du CTA (§A r.4/14 : UN SEUL gros bouton chartreuse par écran).
   * `primary` = chartreuse plein (réservé à l'item mis en avant / featured).
   * `secondary` = surface relevée + label blanc + filet (tous les autres items
   *  d'une liste). Défaut `secondary` : une grille d'items ne fait jamais un mur
   *  de chartreuse ; l'appelant élève explicitement l'item vedette en `primary`.
   */
  emphasis?: 'primary' | 'secondary';
}

export function ArsenalItemCard({
  name,
  slug,
  preview,
  icon,
  rarity,
  usage,
  explanation,
  limit,
  price,
  footnote,
  state = 'unlocked',
  owned = false,
  equipped = false,
  onEquip,
  onObtain,
  obtainLabel = 'Obtenir',
  onView,
  emphasis = 'secondary',
}: ArsenalItemCardProps) {
  const ts = BADGE_TIER_STYLE[rarity];
  const locked = state === 'locked' || state === 'expired';
  const canObtain = !owned && !locked && onObtain !== undefined;
  // Équipable = possédé, équipable (onEquip fourni) et pas déjà équipé.
  const canEquip = owned && !equipped && onEquip !== undefined;
  const iconColor = locked ? colors.gris : tierTint(rarity);
  const pillState: GameVisualState = owned ? 'active' : state;
  const pillLabel = equipped ? 'Équipé' : owned ? 'Possédé' : undefined;
  // Pastille seulement quand elle porte une info : possédé/équipé ou verrouillé/
  // expiré. Un item simplement achetable n'affiche PAS « Débloqué » (le prix +
  // le CTA « Obtenir » suffisent — évite le faux positif de possession).
  const showPill = owned || locked;
  // Règle de profondeur (AMENDEMENT-22) : la carte produit est UNE surface N1
  // qui flotte sur l'espace — SANS contour permanent. Un contour n'apparaît que
  // comme ÉTAT (N3) : équipé (sélection chartreuse douce) ou rareté haute (la
  // teinte de tier EST l'information). Les tiers bas restent borderless.
  const rareRing = BADGE_TIER_RANK[rarity] >= BADGE_TIER_RANK.carbon && !locked;
  const stateBorder = equipped
    ? { borderWidth: 1, borderColor: borderState.activeSoft }
    : rareRing
      ? { borderWidth: 1, borderColor: ts.ring }
      : null;

  return (
    // La carte est un simple conteneur N1 (pas un bouton) : seule la zone d'info
    // ouvre le détail, le CTA reste un bouton frère — jamais de bouton dans un
    // bouton (tap non ambigu + DOM valide sur web).
    <View style={[styles.card, stateBorder]}>
      <Pressable
        accessibilityRole="button"
        onPress={onView}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        {/* Disque d'icône = surface N2 relevée, SANS cadre (pas de card-dans-
            card). La rareté haute teinte l'icône ; les tiers bas la posent en
            blanc — le cercle porte le visuel, pas une boîte encadrée. */}
        <View style={styles.iconWrap}>
          {preview ?? (
            slug !== undefined || icon === undefined ? (
              <ArsenalIcon slug={slug ?? name} size={36} color={iconColor} />
            ) : (
              <Icon name={icon} size={36} color={iconColor} />
            )
          )}
        </View>
        <View style={styles.body}>
          <Text style={[styles.name, locked && styles.nameDim]}>
            {name}
          </Text>
          <Text style={styles.rarity}>
            {BADGE_TIER_LABEL[rarity]}
            {limit ? ` · Limite : ${limit}` : ''}
          </Text>
          <Text style={styles.usage}>
            {usage}
          </Text>
          {explanation && explanation.length > 0 ? (
            <View style={styles.explanation}>
              {explanation.map((line) => (
                <View key={`${line.label}-${line.text}`} style={styles.explanationLine}>
                  <Text style={styles.explanationLabel} numberOfLines={1} ellipsizeMode="clip">
                    {line.label}
                  </Text>
                  <Text style={styles.explanationText}>{line.text}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
        {showPill ? <StatePill state={pillState} label={pillLabel} /> : null}
      </Pressable>

      <View style={styles.footer}>
        {price && !owned ? (
          <View style={styles.price}>
            {price.currency !== 'eur' ? (
              <ArsenalIcon slug={price.currency} size={15} color={colors.blanc} />
            ) : null}
            <Text style={styles.priceValue}>{priceText(price)}</Text>
          </View>
        ) : (
          <View style={styles.price}>
            <Text style={styles.ownedLabel}>
              {equipped ? 'Équipé' : owned ? 'Dans ton arsenal' : (footnote ?? '')}
            </Text>
          </View>
        )}
        {/* UN SEUL bouton par carte (le corps ouvre déjà le détail au tap).
            Équiper l'emporte sur Obtenir ; sinon rien — le tap suffit. */}
        {canEquip ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              haptics.light();
              onEquip?.();
            }}
            style={({ pressed }) => [
              styles.primary,
              emphasis === 'secondary' && styles.ctaSecondary,
              pressed && styles.pressed,
            ]}
          >
            <Text style={emphasis === 'secondary' ? styles.ctaSecondaryLabel : styles.primaryLabel}>
              Équiper
            </Text>
          </Pressable>
        ) : canObtain ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              haptics.medium();
              onObtain?.();
            }}
            style={({ pressed }) => [
              styles.primary,
              emphasis === 'secondary' && styles.ctaSecondary,
              pressed && styles.pressed,
            ]}
          >
            <Text style={emphasis === 'secondary' ? styles.ctaSecondaryLabel : styles.primaryLabel}>
              {obtainLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // N1 : la carte produit FLOTTE sur l'espace, sans contour (80/20). Le contour
  // n'est ajouté qu'en état (équipé / rareté haute) via `stateBorder`.
  card: {
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    padding: 14,
    gap: 12,
  },
  pressed: { opacity: 0.85 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  // N2 : disque relevé qui porte l'icône (pas de boîte encadrée = pas de card-
  // dans-card). Aucun contour permanent.
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: elevation.raised,
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
  explanation: { gap: 5, marginTop: 7 },
  explanationLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  explanationLabel: {
    // 66 px : « POURQUOI » (le plus long des libellés) tient sur UNE ligne — à
    // 48 px il se coupait en « POURQUO / I » (§A textes jamais coupés).
    width: 66,
    color: colors.blanc,
    fontSize: fontSizes.xs,
    fontWeight: '800',
  },
  explanationText: { flex: 1, color: colors.gris, fontSize: fontSizes.xs, lineHeight: 16 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  price: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  priceValue: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '700' },
  ownedLabel: { color: colors.gris, fontSize: fontSizes.xs },
  // Cible tactile ≥ 44 px (HIG) : achat/équipement à une main, en mouvement.
  primary: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: { color: colors.noir, fontSize: fontSizes.xs, fontWeight: '700' },
  // CTA secondaire (§A r.4/14) : dans une LISTE d'items, un seul est chartreuse
  // plein (l'item vedette) ; les autres passent en surface N2 relevée + filet +
  // label blanc, pour qu'un unique gros bouton chartreuse domine la scène.
  ctaSecondary: {
    backgroundColor: elevation.raised,
    borderWidth: 1,
    borderColor: borderState.hairline,
  },
  ctaSecondaryLabel: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '700' },
});
