/**
 * GRYD — PREMIUM : la CAPACITÉ D'ACHAT, décidée ici et nulle part ailleurs.
 *
 * Même doctrine que `lib/auth.ts` (« la capacité d'un fournisseur vit ici, pas
 * dans les écrans ») : l'écran E74 ne DÉDUIT jamais s'il peut vendre, il le LIT.
 * Sans ce module, chaque surface qui voudrait proposer Premium réinventerait sa
 * notion de « configuré » — c'est exactement la mécanique qui a produit le
 * bouton Google mort côté auth.
 *
 * TROIS FAITS, dans cet ordre, parce qu'un fait plus profond rend le suivant
 * sans objet :
 *   1. LA PLATEFORME. `Platform.OS === 'web'` ⇒ AUCUN achat in-app : ni
 *      StoreKit ni Google Play n'existent dans un navigateur. Aucune clé, aucun
 *      SDK, aucune configuration ne peut y changer quoi que ce soit — c'est
 *      donc le premier verdict, et il est définitif.
 *   2. LE MODULE NATIF. `react-native-purchases` est un module NATIF : il exige
 *      un dev build (jamais Expo Go), et il est absent du bundle web. S'il n'a
 *      pas pu être chargé, la clé n'a plus d'importance.
 *   3. LA CLÉ DE **CETTE** PLATEFORME. Une clé iOS ne rend pas Android capable
 *      (leçon Google OAuth du 21/07/2026, `lib/auth.ts`) : on lit celle de la
 *      plateforme courante, jamais celle d'une autre.
 *
 * ── UNE CLÉ `sk_` EST UN REFUS, PAS UNE CONFIGURATION ───────────────────────
 * RevenueCat distingue les clés PUBLIQUES du SDK (`appl_…` / `goog_…`, faites
 * pour être embarquées) des clés SECRÈTES d'API (`sk_…`, qui autorisent la
 * lecture ET l'écriture de tous les abonnés). Une `sk_` collée dans
 * `EXPO_PUBLIC_*` serait publiée à chaque build — Metro inline littéralement ces
 * variables dans le bundle JS, y compris celui du web. On ne s'en sert donc PAS,
 * même si c'est la seule valeur présente : la capacité devient fausse avec un
 * motif explicite, et l'écran le dit. Refuser une clé mal placée vaut mieux que
 * de la diffuser en silence.
 *
 * PUR : aucun import React Native, aucune lecture de `process.env` — tout entre
 * par paramètre. C'est ce qui rend ce fichier testable sous Deno alors que le
 * SDK, lui, ne l'est pas.
 */

/** Familles de plateformes du point de vue ACHAT (pas du rendu). */
export type PurchasePlatform = 'ios' | 'android' | 'web' | 'other';

/**
 * Pourquoi l'achat est impossible — un motif par CAUSE RÉELLE, jamais un
 * fourre-tout « erreur » : l'écran n'a pas le même texte à dire selon que le
 * navigateur ne peut pas acheter (fait permanent) ou que la clé manque (O3, une
 * configuration à faire).
 */
export type PurchaseBlockedReason =
  /** Web : pas d'achat in-app dans un navigateur. Rien à configurer. */
  | 'platform_without_iap'
  /** Module natif absent : Expo Go, bundle web, ou build sans la dépendance. */
  | 'sdk_missing'
  /** O3 : aucune clé publique pour CETTE plateforme. */
  | 'key_missing'
  /** Une clé SECRÈTE (`sk_…`) a été placée dans une variable client — refusée. */
  | 'key_is_secret';

export type PurchaseCapability =
  | { readonly available: true; readonly platform: 'ios' | 'android'; readonly apiKey: string }
  | { readonly available: false; readonly reason: PurchaseBlockedReason };

export interface PurchaseCapabilityInput {
  /** `Platform.OS` tel quel — normalisé ici, jamais interprété par l'appelant. */
  readonly os: string;
  /** Le module natif a-t-il pu être chargé (require réussi) ? */
  readonly sdkAvailable: boolean;
  readonly iosKey?: string | null | undefined;
  readonly androidKey?: string | null | undefined;
}

/** Préfixe des clés SECRÈTES RevenueCat — interdites côté client. */
const SECRET_KEY_PREFIX = 'sk_';

export function purchasePlatform(os: string): PurchasePlatform {
  if (os === 'ios') return 'ios';
  if (os === 'android') return 'android';
  if (os === 'web') return 'web';
  return 'other';
}

/** Nettoie une valeur d'environnement : `''` et `'   '` valent absence. */
function trimmed(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  return v.length > 0 ? v : null;
}

export function purchaseCapability(input: PurchaseCapabilityInput): PurchaseCapability {
  const platform = purchasePlatform(input.os);

  // 1. La plateforme d'abord : sur le web, rien d'autre ne peut rattraper l'absence de store.
  if (platform !== 'ios' && platform !== 'android') {
    return { available: false, reason: 'platform_without_iap' };
  }

  // 2. Le module natif ensuite : sans lui, discuter de la clé n'a aucun sens.
  if (!input.sdkAvailable) return { available: false, reason: 'sdk_missing' };

  // 3. La clé de CETTE plateforme, jamais celle d'une autre.
  const apiKey = trimmed(platform === 'ios' ? input.iosKey : input.androidKey);
  if (apiKey === null) return { available: false, reason: 'key_missing' };
  if (apiKey.startsWith(SECRET_KEY_PREFIX)) {
    return { available: false, reason: 'key_is_secret' };
  }

  return { available: true, platform, apiKey };
}
