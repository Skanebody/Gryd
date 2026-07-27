/**
 * GRYD — PREMIUM : LES OFFRES, telles que le STORE les donne. Jamais un prix
 * écrit à la main.
 *
 * ── LA RÈGLE, ET POURQUOI ELLE N'EST PAS NÉGOCIABLE ────────────────────────
 * La spec E74 est catégorique : « les valeurs 39,99 €/an et 4,99 €/mois sont des
 * valeurs de CONFIGURATION, jamais codées en dur ». Ce n'est pas une préférence
 * d'implémentation, c'est une condition de VÉRITÉ : le prix réellement débité
 * dépend de la boutique du joueur (devise, TVA, palier régional App Store,
 * promotion en cours). Un « 4,99 € » en dur devient faux dès le premier
 * utilisateur brésilien — et une app qui affiche un prix qu'elle ne fera pas
 * payer ment, au sens exact de CLAUDE.md.
 * `product.priceString` vient du store, DÉJÀ localisé et formaté. On ne le
 * reformate pas, on ne le recalcule pas, on ne le remplace pas.
 *
 * ── UN PRIX MANQUANT NE S'INVENTE PAS ──────────────────────────────────────
 * Si `priceString` est absent, `priceLabel` vaut `null` et l'offre devient NON
 * ACHETABLE (`isPurchasable`) : l'écran dit qu'il ne peut pas afficher le prix
 * et n'arme AUCUN bouton d'achat dessus. Vendre sans montrer le montant serait
 * le pire des boutons morts — celui qui débite.
 *
 * ── L'ANNUEL N'EST PRÉ-SÉLECTIONNÉ QUE S'IL EST VRAIMENT MOINS CHER ────────
 * « annuel pré-sélectionné si économiquement pertinent » (E74) : la pertinence
 * se DÉMONTRE (annuel ÷ 12 < mensuel, avec deux montants numériques connus),
 * elle ne se présume pas. Devises différentes, prix manquant, annuel plus cher :
 * on retombe sur le mensuel. Et l'économie affichée est CALCULÉE, jamais un
 * « -30 % » décoratif.
 *
 * PUR : ni SDK, ni React Native, ni horloge. Testable sous Deno.
 */

/** Les trois seules périodes que l'écran E74 sait présenter. */
export type OfferPeriod = 'lifetime' | 'yearly' | 'monthly';

/** Unité d'une période d'essai, telle que le SDK la rend. */
export type TrialUnit = 'day' | 'week' | 'month' | 'year';

/** Sous-ensemble structurel de `PurchasesIntroPrice`. */
export interface IntroPriceLike {
  /** 0 = essai GRATUIT. Un intro payant n'est pas un essai. */
  readonly price?: number;
  readonly priceString?: string;
  readonly periodUnit?: string;
  readonly periodNumberOfUnits?: number;
}

/** Sous-ensemble structurel de `PurchasesStoreProduct`. */
export interface StoreProductLike {
  readonly identifier?: string;
  /** Prix formaté PAR LE STORE, déjà localisé (« 4,99 € », « $4.99 »). */
  readonly priceString?: string | null;
  /** Montant numérique — sert aux COMPARAISONS, jamais à l'affichage. */
  readonly price?: number | null;
  readonly currencyCode?: string | null;
  readonly introPrice?: IntroPriceLike | null;
}

/** Sous-ensemble structurel de `PurchasesPackage`. */
export interface PackageLike {
  readonly identifier?: string;
  /** 'LIFETIME' | 'ANNUAL' | 'MONTHLY' | 'SIX_MONTH' | 'CUSTOM' … */
  readonly packageType?: string;
  readonly product?: StoreProductLike;
}

/** Sous-ensemble structurel de `PurchasesOffering`. */
export interface OfferingLike {
  readonly identifier?: string;
  readonly availablePackages?: readonly PackageLike[];
}

export interface FreeTrial {
  readonly units: number;
  readonly unit: TrialUnit;
}

export interface PremiumOffer {
  readonly period: OfferPeriod;
  /** Identifiant du package RevenueCat — ce qu'on repasse à `purchasePackage`. */
  readonly packageId: string;
  /** SKU store (analytics `purchase_initiated { sku }`, §8). */
  readonly productId: string;
  /** Prix formaté par le store, ou `null` si le store ne l'a pas donné. */
  readonly priceLabel: string | null;
  /** Montant numérique (comparaisons internes uniquement), ou `null`. */
  readonly priceAmount: number | null;
  readonly currencyCode: string | null;
  /** Essai GRATUIT réellement configuré sur ce produit, ou `null`. */
  readonly freeTrial: FreeTrial | null;
}

/** Ordre d'affichage imposé : l'engagement le plus long en premier. */
const PERIOD_ORDER: readonly OfferPeriod[] = ['lifetime', 'yearly', 'monthly'];

/** Types de package RevenueCat → périodes E74. Le reste est IGNORÉ (3 max). */
const PERIOD_BY_PACKAGE_TYPE: Readonly<Record<string, OfferPeriod>> = {
  LIFETIME: 'lifetime',
  ANNUAL: 'yearly',
  MONTHLY: 'monthly',
};

const TRIAL_UNIT_BY_SDK: Readonly<Record<string, TrialUnit>> = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
  YEAR: 'year',
};

function nonEmpty(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  return v.length > 0 ? v : null;
}

function positiveNumber(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Essai gratuit d'un produit — `null` dès qu'un seul élément manque.
 * Un `introPrice` à prix NON NUL est une offre de lancement, pas un essai : le
 * confondre ferait promettre « gratuit » sur quelque chose de payant.
 */
export function freeTrialOf(product: StoreProductLike | undefined): FreeTrial | null {
  const intro = product?.introPrice;
  if (!intro) return null;
  if (intro.price !== 0) return null;
  const units = intro.periodNumberOfUnits;
  if (typeof units !== 'number' || !Number.isFinite(units) || units <= 0) return null;
  const unit = typeof intro.periodUnit === 'string' ? TRIAL_UNIT_BY_SDK[intro.periodUnit] : undefined;
  if (!unit) return null;
  return { units: Math.round(units), unit };
}

/**
 * Offering RevenueCat → offres affichables, ORDONNÉES et DÉDUPLIQUÉES.
 * Un package sans identifiant, sans produit ou d'un type non présenté est
 * écarté : mieux vaut une offre de moins qu'une ligne qu'on ne saurait acheter.
 */
export function readOffers(offering: OfferingLike | null | undefined): PremiumOffer[] {
  const packages = offering?.availablePackages ?? [];
  const byPeriod = new Map<OfferPeriod, PremiumOffer>();

  for (const pkg of packages) {
    const type = typeof pkg?.packageType === 'string' ? pkg.packageType : '';
    const period = PERIOD_BY_PACKAGE_TYPE[type];
    if (!period) continue; // SIX_MONTH, CUSTOM… : hors des 3 lignes de E74.
    const packageId = nonEmpty(pkg.identifier);
    const productId = nonEmpty(pkg.product?.identifier);
    if (packageId === null || productId === null) continue;
    // Premier arrivé, premier servi : deux packages du même type dans un même
    // offering est une anomalie de configuration, pas un choix à trancher ici.
    if (byPeriod.has(period)) continue;
    byPeriod.set(period, {
      period,
      packageId,
      productId,
      priceLabel: nonEmpty(pkg.product?.priceString),
      priceAmount: positiveNumber(pkg.product?.price),
      currencyCode: nonEmpty(pkg.product?.currencyCode),
      freeTrial: freeTrialOf(pkg.product),
    });
  }

  const out: PremiumOffer[] = [];
  for (const period of PERIOD_ORDER) {
    const offer = byPeriod.get(period);
    if (offer) out.push(offer);
  }
  return out;
}

/** Une offre n'est achetable que si son PRIX est connu (voir l'entête). */
export function isPurchasable(offer: PremiumOffer): boolean {
  return offer.priceLabel !== null;
}

function find(offers: readonly PremiumOffer[], period: OfferPeriod): PremiumOffer | undefined {
  return offers.find((o) => o.period === period);
}

/**
 * L'annuel est-il DÉMONTRABLEMENT plus avantageux que le mensuel ?
 * Exige : les deux offres, les deux montants numériques, la même devise, et
 * annuel ÷ 12 STRICTEMENT inférieur au mensuel. Toute incertitude ⇒ `false`.
 */
export function yearlyIsCheaper(offers: readonly PremiumOffer[]): boolean {
  const yearly = find(offers, 'yearly');
  const monthly = find(offers, 'monthly');
  if (!yearly || !monthly) return false;
  if (yearly.priceAmount === null || monthly.priceAmount === null) return false;
  // Devises différentes = comparaison impossible (aucun taux de change ici).
  if (yearly.currencyCode !== monthly.currencyCode) return false;
  return yearly.priceAmount / 12 < monthly.priceAmount;
}

/**
 * Offre pré-sélectionnée à l'ouverture. `null` s'il n'y a aucune offre — l'écran
 * n'a alors rien à sélectionner ET rien à vendre.
 */
export function defaultOfferPeriod(offers: readonly PremiumOffer[]): OfferPeriod | null {
  if (offers.length === 0) return null;
  if (yearlyIsCheaper(offers)) return 'yearly';
  const monthly = find(offers, 'monthly');
  if (monthly) return 'monthly';
  return offers[0]?.period ?? null;
}

/**
 * Économie de l'annuel vs 12 mensuels, en pourcentage ENTIER (arrondi vers le
 * BAS : on ne sur-annonce jamais une remise). `null` dès que le calcul n'est pas
 * démontrable, ou si l'annuel n'est pas moins cher — pas de fausse promo.
 */
export function yearlySavingsPercent(offers: readonly PremiumOffer[]): number | null {
  if (!yearlyIsCheaper(offers)) return null;
  const yearly = find(offers, 'yearly');
  const monthly = find(offers, 'monthly');
  if (!yearly?.priceAmount || !monthly?.priceAmount) return null;
  const pct = Math.floor((1 - yearly.priceAmount / (monthly.priceAmount * 12)) * 100);
  return pct > 0 ? pct : null;
}
