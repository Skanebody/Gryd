/**
 * GRYD — MOTEUR PUR DE LA BOUTIQUE (planche E17 « Boutique & Premium »).
 *
 * Tout ce que l'écran E17 DÉRIVE vit ici, sans React, sans i18n, sans réseau :
 *  · la PROPRIÉTÉ d'un item (la planche exige « Permanent / Saison / Possédé » —
 *    la réalité du catalogue en demande sept, cf. `ShopOwnership`) ;
 *  · les CATÉGORIES de la grille (chips) et leurs items ;
 *  · les PRIX Premium, dont l'équivalent mensuel de l'annuel, CALCULÉ.
 *
 * POURQUOI PUR : c'est la seule façon de tester ces règles (Deno, zéro mock) et
 * c'est le filet qui manquait — `features/arsenal/**` n'avait AUCUN test avant
 * ce chantier.
 *
 * ── LES PRIX EN ARGENT RÉEL NE VIVENT PLUS ICI (28/07/2026) ───────────────
 * Constitution §9 : ils viennent du STORE (`features/premium/storePrices.ts`,
 * `product.priceString`) ou d'une remote config, jamais du code. Ce fichier ne
 * connaît plus que les prix en ÉCLATS — une monnaie DE JEU, donc une règle, et
 * à ce titre une constante légitime de `game-rules.ts`.
 *
 * ANTI FAUX RABAIS (interdit absolu E17) : on n'expose ni prix barré, ni
 * pourcentage d'économie fabriqué.
 */
import { isFunctionalItemKey, SKUS } from '@klaim/shared';
import {
  ARSENAL_CATALOG,
  ARSENAL_SECTIONS,
  type ArsenalCatalogItem,
  type ArsenalSectionKey,
} from './catalog';

// ─── 1. Propriété : ce que le joueur obtient, et pour combien de temps ────────

/**
 * Nature de la possession affichée sur une carte de la grille.
 *
 * La planche demande trois états (Permanent / Saison / Possédé) ; le catalogue
 * GRYD en impose quatre de plus, et les CONFONDRE serait mentir :
 *  · `neverForSale` — objets FONCTIONNELS (Bouclier, Streak Gel, Scout Ping) :
 *    ils ne se vendent dans AUCUNE monnaie, jamais (AMENDEMENT-40 §2). Ce n'est
 *    pas « pas encore », c'est « jamais » ;
 *  · `packOnly`     — cosmétique exclusif d'un bundle, pas vendu à l'unité ;
 *  · `draft`        — catalogué mais PAS lancé (GRYD Pass) ;
 *  · `consumable`   — crédité une fois puis dépensé (Éclats, coffre cosmétique) :
 *    ce n'est ni permanent ni saisonnier.
 */
export type ShopOwnership =
  | 'owned'
  | 'neverForSale'
  | 'draft'
  | 'packOnly'
  | 'season'
  | 'consumable'
  | 'permanent';

/** Sections dont l'item s'ÉQUIPE et reste acquis (skins, cadres, blasons…). */
const PERMANENT_SECTIONS: ReadonlySet<ArsenalSectionKey> = new Set([
  'skins_territory',
  'skins_trace',
  'frames',
  'emblems',
  'banners',
  'templates',
]);

/**
 * Propriété d'un item pour un joueur donné. PURE — `owned` vient de l'inventaire
 * RÉEL (serveur) ; sans lecture serveur l'appelant passe `false` (on n'affirme
 * jamais une possession non lue).
 *
 * ORDRE DE PRÉCÉDENCE (le plus informatif d'abord) : posséder l'emporte sur tout
 * le reste ; « jamais vendu » l'emporte sur « pas lancé » (c'est une règle de
 * jeu, pas un calendrier) ; la durée l'emporte sur le mode de consommation.
 */
export function ownershipKindOf(item: ArsenalCatalogItem, owned: boolean): ShopOwnership {
  if (owned) return 'owned';
  if (isFunctionalItemKey(item.key)) return 'neverForSale';
  if (item.draft === true) return 'draft';
  if (item.packOnly === true) return 'packOnly';
  // Les Crew Boosts portent une DURÉE (24 h → fin de saison) : leur effet
  // s'éteint. Dire « Permanent » d'un boost serait vendre plus qu'il ne donne.
  if (item.key.startsWith('crew_boost')) return 'season';
  if (PERMANENT_SECTIONS.has(item.section)) return 'permanent';
  if (item.consumable === true) return 'consumable';
  return 'permanent';
}

// ─── 2. Catégories de la grille (chips de la planche) ────────────────────────

/**
 * Chips de catégories. La planche liste « Trails · Cadres · Emblèmes · Avatars ·
 * Templates » : des catégories d'OBJET, pas des « besoins ». On ne les invente
 * pas — on prend les SECTIONS réelles du catalogue (`ARSENAL_SECTIONS`, déjà
 * traduites), dans leur ordre.
 *
 * Deux sections sortent de la grille :
 *  · `featured` — une curation, pas une catégorie (et elle dupliquerait des items) ;
 *  · `subscriptions` — GRYD Club vit dans le BLOC PREMIUM en bas d'écran ;
 *    l'afficher aussi en carte le dirait deux fois (§A : jamais deux fois la
 *    même décision sur un écran).
 */
export type ShopCategoryKey = 'all' | Exclude<ArsenalSectionKey, 'featured' | 'subscriptions'>;

const EXCLUDED_FROM_GRID: ReadonlySet<ArsenalSectionKey> = new Set(['featured', 'subscriptions']);

/** Sections de la grille, dans l'ordre du catalogue, VIDES exclues. */
export function shopSectionKeys(): ArsenalSectionKey[] {
  return ARSENAL_SECTIONS.map((s) => s.key).filter(
    (key) => !EXCLUDED_FROM_GRID.has(key) && ARSENAL_CATALOG.some((i) => i.section === key),
  );
}

/** Chips affichées : « Tout » puis chaque section non vide. */
export function shopCategoryKeys(): ShopCategoryKey[] {
  return ['all', ...(shopSectionKeys() as Exclude<ShopCategoryKey, 'all'>[])];
}

/**
 * Items d'une catégorie. Les `draft` (GRYD Pass) sont exclus de la GRILLE : un
 * objet non lancé n'a rien à faire dans un rayon — il vivait en teaser dans
 * « Club & Pass », section qui ne s'affiche plus ici.
 */
export function shopItems(category: ShopCategoryKey): ArsenalCatalogItem[] {
  return ARSENAL_CATALOG.filter(
    (item) =>
      !EXCLUDED_FROM_GRID.has(item.section) &&
      item.draft !== true &&
      (category === 'all' || item.section === category),
  );
}

// ─── 3. Premium ─────────────────────────────────────────────────────────────

/**
 * ── `premiumPrices()` ET `monthlyEquivalentEur()` ONT ÉTÉ SUPPRIMÉS ────────
 * (28/07/2026, constitution §9 : « LES PRIX VIENNENT DU STORE OU D'UNE REMOTE
 * CONFIG — jamais codés en dur dans l'app ».)
 *
 * Ces deux fonctions lisaient `SKU_PRICES_EUR` (4,99 € / 34,99 €) et le bloc
 * Premium de `app/arsenal.tsx` les PEIGNAIT. C'étaient des montants du CODE :
 * une référence de catalogue utile au seed serveur et au site web, mais pas le
 * prix que le Store facturera (devise, TVA, palier régional, promotion). Les
 * afficher sur un écran de vente, c'était afficher un montant qu'on ne ferait
 * pas payer.
 *
 * L'écran E74 `/premium` lit désormais les VRAIS prix (`offerings.ts`,
 * `product.priceString`) et le bloc d'`arsenal.tsx` y renvoie au lieu de
 * recopier deux nombres. Le calcul d'équivalent mensuel n'a pas disparu : il
 * vit dans `yearlySavingsPercent` (offerings.ts), qui ne compare QUE des
 * montants réellement lus au store, et se tait si l'un manque.
 *
 * Ne pas les réintroduire ici : ce fichier n'a plus aucune raison de connaître
 * un montant en argent réel.
 */

/** L'item catalogue qui porte la copie et les 3 bénéfices du Club (traduits). */
export function premiumItem(): ArsenalCatalogItem | undefined {
  return ARSENAL_CATALOG.find((i) => i.key === SKUS.clubMonthly);
}

/**
 * Bénéfices affichés dans le paywall : TROIS AU MAXIMUM (planche E17). La borne
 * est appliquée ici, pas au rendu — si un jour le catalogue en listait quatre,
 * l'écran n'en montrerait toujours que trois au lieu de dériver en argumentaire.
 */
export const PREMIUM_MAX_BENEFITS = 3;
