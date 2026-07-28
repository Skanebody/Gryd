/**
 * GRYD — carte de la GRILLE 2 COLONNES de la boutique (planche E17).
 *
 * POURQUOI UNE CARTE LOCALE plutôt que `ui/game/ArsenalItemCard` : cette
 * dernière est une RANGÉE pleine largeur (icône + nom + usage + prix + bouton),
 * conçue pour une liste. La planche E17 demande une grille 2 colonnes dont
 * chaque case porte un APERÇU RÉEL dans le contexte GRYD. Plutôt que d'ajouter
 * une variante à un composant partagé qui appartient à un autre périmètre, la
 * carte de grille vit ici, avec la boutique qu'elle sert.
 *
 * §A ÉPURATION :
 *  · UNE surface par carte (elevation.raised), JAMAIS de card dans card —
 *    l'aperçu SVG est posé directement dessus. Ce niveau N2 n'est pas un choix
 *    esthétique : `preview/cosmetic.tsx` masque le décor hors-zone des skins de
 *    territoire avec `colors.carbone2` ; sur une surface N1 le masque se verrait
 *    comme un carré plus clair ;
 *  · ≤ 3 informations : aperçu + nom + (propriété · prix) ;
 *  · aucun texte d'action coupé par « … » — le nom passe sur 2 lignes ;
 *  · AUCUN BOUTON. Rien ne s'achète tant que le paiement n'est pas branché
 *    (O3) : la carte entière est un tap vers le détail, et c'est tout. Un
 *    « Obtenir » qui n'obtient rien serait le bouton mort que CLAUDE.md interdit.
 *
 * COULEURS PAR RÔLE : la chartreuse ne dit qu'une chose ici — « c'est à toi »
 * (possédé / équipé). Elle n'est jamais un ornement de prix.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  BADGE_TIER_LABEL,
  borderState,
  colors,
  elevation,
  fonts,
  fontSizes,
  gameColors,
  radii,
  spacing,
} from '@klaim/shared';
import { useT } from '../../i18n/store';
import { SHOP_C } from '../../i18n/catalog/arsenal';
import type { Entry } from '../../i18n/types';
import { ArsenalIcon } from '../../ui/game';
import type { ArsenalCatalogItem } from './catalog';
import { arsenalName } from './copy';
import { ArsenalPreview } from './preview';
import { ownershipKindOf, type ShopOwnership } from './shop';

/**
 * Sections dont l'aperçu se LIT en vignette : ce sont les cosmétiques visuels
 * (on reconnaît le skin, le cadre, la bannière d'un coup d'œil). Les schémas de
 * mécanique (Bouclier, Crew Boost…) portent des légendes honnêtes illisibles en
 * petit : en grille ils gardent l'icône filaire nette, l'illustration complète
 * vivant dans le détail.
 */
const THUMBNAIL_SECTIONS: ReadonlySet<string> = new Set([
  'skins_territory',
  'skins_trace',
  'frames',
  'emblems',
  'banners',
  'templates',
]);

/** Côté (px) de l'aperçu dans une case de grille. */
const PREVIEW_SIZE = 116;

const OWNERSHIP_ENTRY: Record<ShopOwnership, Entry> = {
  owned: SHOP_C.ownedLabel,
  neverForSale: SHOP_C.neverForSaleLabel,
  draft: SHOP_C.draftLabel,
  packOnly: SHOP_C.packOnlyLabel,
  season: SHOP_C.seasonLabel,
  consumable: SHOP_C.consumableLabel,
  permanent: SHOP_C.permanentLabel,
};

/**
 * ── `formatEur` A ÉTÉ SUPPRIMÉ LE 28/07/2026 (constitution §9) ──────────────
 * Il formatait `SKU_PRICES_EUR` — des montants ÉCRITS DANS LE CODE. La règle du
 * projet est sans exception : « LES PRIX VIENNENT DU STORE OU D'UNE REMOTE
 * CONFIG — jamais codés en dur dans l'app ». Le montant réellement débité dépend
 * de la boutique du joueur (devise, TVA, palier régional) : « 4,99 € » est faux
 * dès le premier joueur hors zone euro, et afficher un prix qu'on ne fera pas
 * payer est exactement le mensonge que CLAUDE.md interdit — Apple le refuse pour
 * la même raison.
 * Le prix d'argent réel arrive désormais d'`features/premium/useStorePrices`
 * (`product.priceString`, déjà localisé par le Store) via la prop `storePrice`,
 * et vaut `null` quand le store ne l'a pas donné : alors AUCUN montant.
 * Ne pas réintroduire de formateur de devise ici : le store formate déjà.
 */

/** Prix Éclats formaté (séparateur de milliers). */
export function formatEclats(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} Éclats`;
}

export interface ShopGridCardProps {
  item: ArsenalCatalogItem;
  /** Possession RÉELLE (serveur). `false` tant que rien n'a été lu. */
  owned: boolean;
  /** Équipé pour sa portée (un skin actif, un cadre porté…). */
  equipped: boolean;
  /**
   * Prix d'argent réel TEL QUE LE STORE l'a formaté, ou `null` quand il n'a pas
   * été lu. `null` ⇒ aucun montant n'est peint : jamais de repli catalogue.
   */
  storePrice: string | null;
  onPress: () => void;
}

export function ShopGridCard({ item, owned, equipped, storePrice, onPress }: ShopGridCardProps) {
  const t = useT();
  const kind = ownershipKindOf(item, owned);
  const name = arsenalName(item, t);
  // « Équipé » est plus informatif que « Possédé » et le remplace (jamais les
  // deux : un item équipé est possédé par construction).
  const ownershipLabel = t(equipped ? SHOP_C.equippedLabel : OWNERSHIP_ENTRY[kind]);
  const mine = kind === 'owned';

  // Le prix ne s'affiche que s'il en existe un ET qu'il veut dire quelque chose :
  // sur un objet possédé, jamais vendu, exclusif de pack ou non lancé, un montant
  // laisserait croire à une transaction possible.
  const showPrice = kind === 'season' || kind === 'consumable' || kind === 'permanent';
  // Les Éclats sont une monnaie DE JEU (une règle, `game-rules.ts`) : leur
  // montant est une constante légitime. L'ARGENT RÉEL, lui, n'existe ici que
  // s'il vient du Store — sinon la carte n'en dit rien.
  const eclats = item.priceShards;
  const money = showPrice ? storePrice : null;
  const priceText = !showPrice
    ? null
    : eclats !== undefined && money !== null
      ? t(SHOP_C.priceDual, { eclats: formatEclats(eclats), eur: money })
      : eclats !== undefined
        ? formatEclats(eclats)
        : money;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name} · ${ownershipLabel}${priceText ? ` · ${priceText}` : ''}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, mine && styles.cardMine, pressed && styles.pressed]}
    >
      <View style={styles.previewBox}>
        {THUMBNAIL_SECTIONS.has(item.section) ? (
          <ArsenalPreview item={item} size={PREVIEW_SIZE} />
        ) : (
          <ArsenalIcon slug={item.slug} size={48} color={colors.blanc} />
        )}
      </View>

      {/* §A.9 — un nom long passe à la ligne, il ne se fait jamais couper. */}
      <Text style={styles.name} numberOfLines={2}>
        {name}
      </Text>
      <Text style={styles.rarity}>{BADGE_TIER_LABEL[item.rarity]}</Text>

      <View style={styles.footer}>
        <Text style={mine ? styles.ownershipMine : styles.ownership} numberOfLines={2}>
          {ownershipLabel}
        </Text>
        {priceText ? (
          <Text style={styles.price} numberOfLines={2}>
            {priceText}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Surface N2 (raised) : c'est un ITEM interactif, et c'est le fond que les
  // aperçus de skin territoire attendent pour masquer leur décor hors-zone.
  card: {
    flexGrow: 1,
    flexBasis: '46%',
    backgroundColor: elevation.raised,
    borderRadius: radii.card,
    padding: spacing.sm,
    gap: 2,
  },
  // « C'est à moi » : liseré chartreuse doux — le SEUL emploi de l'accent ici.
  cardMine: { borderWidth: 1, borderColor: borderState.activeSoft },
  pressed: { opacity: 0.85 },
  previewBox: {
    alignItems: 'center',
    justifyContent: 'center',
    height: PREVIEW_SIZE,
    marginBottom: spacing.xs,
  },
  name: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontFamily: fonts.textSemi,
    fontWeight: '700',
    lineHeight: 18,
  },
  rarity: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  footer: { marginTop: spacing.xxs, gap: 2 },
  ownership: { color: colors.gris, fontSize: fontSizes.xs, lineHeight: 16 },
  ownershipMine: {
    color: gameColors.crew,
    fontSize: fontSizes.xs,
    fontFamily: fonts.textSemi,
    fontWeight: '700',
    lineHeight: 16,
  },
  price: {
    color: colors.blanc,
    fontSize: fontSizes.xs,
    fontVariant: ['tabular-nums'],
    lineHeight: 16,
  },
});
