/**
 * GRYD — L'OFFRE GRYD+ TELLE QU'ELLE EST DÉCIDÉE, ET LA BOUTIQUE TELLE QU'ELLE EST.
 *
 * ─── LE DÉFAUT QUE CE MODULE RÉPARE (retour fondateur, 10/09/2026) ──────────
 * « La page Abonnements et achats ne montre aucun abonnement, aucun prix, aucun
 * achat, aucun statut. Il faut de l'information. »
 *
 * Le diagnostic tenait en une ligne de `capability.ts` : sans clé RevenueCat de
 * production, `purchasesCapability()` rend `available: false`, `usePremium`
 * tombe en `unavailable`, et TOUT l'écran était construit sur les offres du
 * Store. Pas de Store, pas d'offres ; pas d'offres, pas d'écran. L'app disait
 * la vérité (elle n'inventait pas de prix) mais elle ne disait RIEN — et une
 * page muette n'est pas plus honnête qu'une page menteuse, elle est juste
 * inutilisable.
 *
 * ─── LES DEUX PRIX, ET POURQUOI IL EN FAUT DEUX ────────────────────────────
 * Deux règles constitutionnelles se croisent ici, et une seule lecture les
 * satisfait toutes les deux :
 *
 *  · « LES PRIX VIENNENT DU STORE — jamais codés en dur » (`storePrices.ts`,
 *    cahier §16.1 : « Les prix définitifs viennent du Store et de sa
 *    localisation, pas d'une chaîne codée en dur »). Cette règle protège d'un
 *    mensonge PRÉCIS : afficher un montant qu'on ne fera pas payer.
 *  · « Il faut de l'information » : un tarif prévu, annoncé comme tel, n'est
 *    pas un prix de vente — c'est une intention publiée.
 *
 * La règle appliquée est donc : **dès qu'un prix du Store existe, il gagne, et
 * le tarif prévu disparaît**. Le tarif prévu (`COMMERCIAL_PROPOSAL_2026`) ne se
 * montre QUE lorsqu'aucune vente n'est possible — précisément le cas où il ne
 * peut être démenti par une facture, puisqu'il n'y aura pas de facture. Les CGV
 * disent déjà exactement cela (« les tarifs annoncés sont indicatifs tant
 * qu'aucune vente n'est ouverte : ils ne constituent ni une offre ferme, ni un
 * engagement de mise en vente à une date donnée »).
 *
 * ─── AUCUN NOMBRE N'EST ÉCRIT ICI ──────────────────────────────────────────
 * Ni 5,99, ni 49,99, ni 30 %, ni « six variantes ». Tout descend de
 * `COMMERCIAL_PROPOSAL_2026` et de `PROGRESSION_RULES_2026` (`game-rules.ts`,
 * source unique — ADR-003). Le jour où le fondateur change 599 en 699, cet
 * écran change avec lui, et aucun autre fichier n'a besoin d'être relu.
 *
 * PUR : aucun import React Native, aucun SDK, aucun `Intl` (l'ICU d'un appareil
 * n'est pas celle d'un runtime de test). Testable sous Deno.
 */
import { COMMERCIAL_PROPOSAL_2026, PROGRESSION_RULES_2026 } from '@klaim/shared';
import { isPurchasable, type PremiumOffer } from './offerings';
import type { PurchaseBlockedReason } from './capability';

/**
 * LES SIX ÉTATS DE LECTURE DE LA BOUTIQUE — la machine qui les produit est
 * `usePremium`, qui réexporte ce type et le documente état par état.
 *
 * Il est DÉCLARÉ ICI, et pas là-bas, pour une raison mécanique : `usePremium`
 * importe React Native, la session et Supabase. Un module pur qui aurait besoin
 * de ce type traînerait tout ce graphe derrière lui et cesserait d'être
 * testable sous Deno — c'est exactement ce qui s'est produit à la première
 * écriture de ce fichier.
 */
export type PremiumStatus = 'loading' | 'signedOut' | 'unavailable' | 'error' | 'empty' | 'ready';

/** Nombre de centimes dans une unité monétaire. Ce n'est pas une règle de jeu. */
const CENTS_PER_UNIT = 100;
/** Un pourcentage se lit sur cent. Idem : une unité, pas une constante de jeu. */
const PERCENT_SCALE = 100;
/** Douze mois dans une année. Idem. */
const MONTHS_PER_YEAR = 12;
/** Espace INSÉCABLE avant l'euro (typographie française). */
const NBSP = ' ';

/**
 * « 5,99 € » en français, « €5.99 » en anglais — à partir de CENTIMES ENTIERS.
 *
 * Pas d'`Intl` : deux runtimes ne rendent pas la même espace avant l'euro
 * (U+202F ou U+00A0 selon la version d'ICU), et un test qui compare une chaîne
 * doit pouvoir compter sur elle. L'espace insécable est donc choisie ici, une
 * fois, et c'est celle qui s'affiche.
 *
 * Une valeur qui n'est pas un entier de centimes positif rend `null` : un prix
 * douteux ne s'arrondit pas, il ne s'affiche pas.
 */
export function formatEurCents2026(cents: number, locale: string): string | null {
  if (!Number.isSafeInteger(cents) || cents < 0) return null;
  const units = Math.floor(cents / CENTS_PER_UNIT);
  const rest = String(cents % CENTS_PER_UNIT).padStart(2, '0');
  return locale === 'en' ? `€${units}.${rest}` : `${units},${rest}${NBSP}€`;
}

export type GrydPlusPeriod2026 = 'monthly' | 'yearly';

export interface GrydPlusPlannedPrice2026 {
  readonly period: GrydPlusPeriod2026;
  readonly cents: number;
}

/**
 * Les DEUX périodes prévues, dans l'ordre d'affichage du cahier §16.1 (le
 * mensuel d'abord : c'est le repère que tout le monde lit, et l'annuel doit
 * être « affiché au moins aussi clairement », pas plus).
 */
export const GRYD_PLUS_PLANNED_PRICES_2026: readonly GrydPlusPlannedPrice2026[] = [
  { period: 'monthly', cents: COMMERCIAL_PROPOSAL_2026.monthlyEurCents },
  { period: 'yearly', cents: COMMERCIAL_PROPOSAL_2026.annualEurCents },
];

/**
 * L'économie de l'annuel, CALCULÉE — jamais « environ 30 % » recopié du cahier.
 * Même arithmétique que `yearlySavingsPercent` pour les prix RÉELS du Store :
 * si un jour les deux constantes se croisent, la remise disparaît d'elle-même
 * au lieu d'être un slogan faux.
 */
export function plannedYearlySavingsPercent2026(): number | null {
  const monthly = COMMERCIAL_PROPOSAL_2026.monthlyEurCents;
  const yearly = COMMERCIAL_PROPOSAL_2026.annualEurCents;
  if (monthly <= 0 || yearly <= 0) return null;
  const twelve = monthly * MONTHS_PER_YEAR;
  if (yearly >= twelve) return null;
  const percent = Math.floor((1 - yearly / twelve) * PERCENT_SCALE);
  return percent > 0 ? percent : null;
}

/**
 * Ce que GRYD+ contient — les TROIS bénéfices P1 du cahier §16.1, et rien de
 * plus. Le survol 3D et le montage avancé sont P2 : « Le survol 3D n'est pas
 * vendu comme disponible avant P2 », donc il n'apparaît pas dans cette liste.
 *
 * `seasonVariants` porte son compte parce que le compte EXISTE dans les règles
 * (`premiumVariantTiers`) ; les deux autres n'en portent pas, parce qu'aucune
 * constante ne les compte et qu'un nombre écrit à la main serait exactement le
 * genre de promesse qu'on ne peut pas tenir.
 */
export type GrydPlusBenefitId2026 = 'comparisons' | 'studio' | 'seasonVariants';
export interface GrydPlusBenefit2026 {
  readonly id: GrydPlusBenefitId2026;
  /** Compte VÉRIFIABLE dans `game-rules.ts`, ou `null` quand il n'existe pas. */
  readonly count: number | null;
}
export const GRYD_PLUS_BENEFITS_2026: readonly GrydPlusBenefit2026[] = [
  { id: 'comparisons', count: null },
  { id: 'studio', count: null },
  { id: 'seasonVariants', count: PROGRESSION_RULES_2026.premiumVariantTiers.length },
];

/**
 * ANTI PAY-TO-WIN — la phrase « aucun avantage de jeu, jamais » n'est PAS une
 * décoration : elle n'est affichable que si les multiplicateurs payants valent
 * tous 1 et qu'aucune monnaie virtuelle n'existe. Le jour où l'un d'eux change,
 * cette fonction rend `false` et l'écran se tait — il ne peut pas promettre une
 * équité que les règles ne tiennent plus.
 */
export function noPaidGameAdvantage2026(): boolean {
  return COMMERCIAL_PROPOSAL_2026.paidCaptureMultiplier === 1
    && COMMERCIAL_PROPOSAL_2026.paidXpMultiplier === 1
    && COMMERCIAL_PROPOSAL_2026.paidChallengeMultiplier === 1
    && COMMERCIAL_PROPOSAL_2026.virtualCurrency === false;
}

/** Collections permanentes : achat unique, JAMAIS incluses dans l'abonnement. */
export type PermanentCollectionId2026 = keyof typeof COMMERCIAL_PROPOSAL_2026.permanentCollectionEurCents;
export interface PermanentCollectionPrice2026 {
  readonly id: PermanentCollectionId2026;
  readonly cents: number;
}
export const PERMANENT_COLLECTION_PRICES_2026: readonly PermanentCollectionPrice2026[] =
  (Object.keys(COMMERCIAL_PROPOSAL_2026.permanentCollectionEurCents) as PermanentCollectionId2026[])
    .map(id => ({ id, cents: COMMERCIAL_PROPOSAL_2026.permanentCollectionEurCents[id] }))
    .sort((a, b) => a.cents - b.cents);

/**
 * ─── LA CAPACITÉ « LA BOUTIQUE EST-ELLE OUVERTE ? » ────────────────────────
 *
 * Un écran ne DÉDUIT jamais qu'il peut vendre : il le LIT ici (même doctrine
 * que `capability.ts`). Et « ouverte » est plus exigeant que « configurée » :
 * une clé de production valide ne suffit pas si le tableau de bord ne publie
 * aucun produit, ou si les produits publiés arrivent SANS prix — dans les deux
 * cas, « S'abonner » ouvrirait une feuille qui ne peut pas aboutir.
 *
 *   ouverte ⟺ le Store a été lu (`ready`) ET au moins une offre porte un prix.
 *
 * Chaque refus garde son NOM, parce que l'écran n'a pas la même phrase à dire
 * selon qu'on ne sait pas encore, qu'il n'y a pas de compte, que la plateforme
 * ne vend pas, ou que rien n'est mis en vente.
 */
export type StoreClosedReason2026 =
  /** On ne sait pas encore : lecture en cours. Un chargement n'affirme rien. */
  | 'checking'
  /** Un achat s'attache à un compte : sans compte, il n'y a rien à ouvrir. */
  | 'signedOut'
  /** Ni StoreKit ni Google Play ici (web, module natif absent). Définitif. */
  | 'platform'
  /** Aucune clé de production : la boutique n'est pas RACCORDÉE. */
  | 'notConfigured'
  /** Raccordée, mais AUCUN produit publié : rien n'est mis en vente. */
  | 'nothingOnSale'
  /** Des produits, mais aucun prix confirmé : on ne vend pas à l'aveugle. */
  | 'noConfirmedPrice'
  /** La lecture du Store a échoué : on ne sait pas, et on propose de réessayer. */
  | 'readFailed';

export type StoreAvailability2026 =
  | { readonly open: true }
  | { readonly open: false; readonly reason: StoreClosedReason2026 };

export function storeAvailability2026(input: {
  readonly status: PremiumStatus;
  readonly offers: readonly PremiumOffer[];
  readonly blockedReason: PurchaseBlockedReason | null;
}): StoreAvailability2026 {
  if (input.status === 'loading') return { open: false, reason: 'checking' };
  if (input.status === 'signedOut') return { open: false, reason: 'signedOut' };
  if (input.status === 'unavailable') {
    // `platform_without_iap` et `sdk_missing` sont des faits de PLATEFORME :
    // aucune configuration ne les répare. Les trois motifs de clé, eux, disent
    // la même chose au joueur — la boutique n'est pas raccordée — et il n'a pas
    // à savoir laquelle des trois erreurs de clé a été commise.
    const platform = input.blockedReason === 'platform_without_iap' || input.blockedReason === 'sdk_missing';
    return { open: false, reason: platform ? 'platform' : 'notConfigured' };
  }
  if (input.status === 'error') return { open: false, reason: 'readFailed' };
  if (input.status === 'empty' || input.offers.length === 0) return { open: false, reason: 'nothingOnSale' };
  if (!input.offers.some(isPurchasable)) return { open: false, reason: 'noConfirmedPrice' };
  return { open: true };
}

/**
 * « PAS ENCORE EN VENTE » est une AFFIRMATION, et elle n'est vraie que dans deux
 * cas : la boutique n'est pas raccordée, ou elle ne publie aucun produit.
 *
 * ── LE DÉFAUT QUE CETTE FONCTION SUPPRIME (constaté à l'écran le 10/09) ────
 * Le titre s'affichait pour TOUTE boutique fermée. Un joueur déconnecté lisait
 * donc « Pas encore en vente » alors que la vraie phrase est « connecte-toi » :
 * on ne sait rien de la vente tant qu'on n'a pas lu son compte. Idem pour une
 * lecture en cours, un échec de lecture, ou le web. Dans ces quatre cas on dit
 * la RAISON, sans conclure sur la vente.
 */
export function storeSaysNotOnSale2026(availability: StoreAvailability2026): boolean {
  return !availability.open && (availability.reason === 'notConfigured' || availability.reason === 'nothingOnSale');
}

/**
 * Le tarif prévu doit-il s'afficher ? OUI seulement si la boutique est fermée.
 * Une fois le Store ouvert, c'est LUI qui dit le prix, dans la devise du joueur
 * — et le tarif prévu français n'a plus rien à faire à l'écran.
 */
export function showsPlannedPrices2026(availability: StoreAvailability2026): boolean {
  return !availability.open;
}

/**
 * ─── LA PRÉ-VENTE : « PERSONNE NE PEUT PAYER » EST UN FAIT VÉRIFIABLE ──────
 *
 * Décision du fondateur du 11/09/2026, mot pour mot, à la question « ouvrir ou
 * non les outils GRYD+ tant que rien n'est en vente ? » : « ouvre, faut les
 * mettre en place si quelqu'un paie ». Elle tranche l'écart n° 3 laissé ouvert
 * par ADR-014 (« les outils GRYD+ restent murés derrière un droit que personne
 * ne peut obtenir ») et elle est consignée dans
 * `docs/product/ADR-016-BROUILLON-GRYDPLUS-OUVERT.md`.
 *
 * Cette fonction dit UNE chose et une seule : la boutique est-elle fermée POUR
 * DE BON, ou seulement PAS ENCORE LUE ? Les quatre motifs ci-dessous sont des
 * faits établis — il n'y a pas de clé, pas de produit, pas de prix confirmé, ou
 * la plateforme n'a pas d'achat in-app. Dans ces quatre cas, aucun joueur au
 * monde ne peut payer, donc réserver un outil aux abonnés reviendrait à le
 * réserver à personne : un mur sans porte.
 *
 * Les TROIS motifs exclus le sont pour la même raison qu'ailleurs dans ce
 * fichier : ils n'affirment rien.
 *   · `checking`  — la lecture est en cours. Un chargement ne conclut pas.
 *   · `signedOut` — sans compte, on ne sait rien, et un outil personnel n'a de
 *                   toute façon aucune donnée à montrer.
 *   · `readFailed`— la lecture a échoué. « On ne sait pas » n'est pas « fermé ».
 *
 * Et la réciproque est la RÈGLE DE BASCULE : le jour où la boutique s'ouvre
 * (une offre lue avec son prix confirmé), cette fonction rend `false` d'elle-
 * même, et le droit serveur redevient seul juge. Aucun drapeau à basculer à la
 * main, aucune date écrite nulle part.
 */
export function storeCannotSellYet2026(availability: StoreAvailability2026): boolean {
  if (availability.open) return false;
  return availability.reason === 'notConfigured'
    || availability.reason === 'nothingOnSale'
    || availability.reason === 'noConfirmedPrice'
    || availability.reason === 'platform';
}
