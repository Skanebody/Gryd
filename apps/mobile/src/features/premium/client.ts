/**
 * GRYD — PREMIUM : la SEULE frontière avec le SDK RevenueCat.
 *
 * Tout ce qui touche `react-native-purchases` vit ici ; `capability.ts`,
 * `entitlement.ts` et `offerings.ts` restent purs et testés sous Deno. La règle
 * du dépôt (moteur PUR, I/O au bord) s'applique telle quelle à un SDK tiers.
 *
 * ── POURQUOI UN `require` PARESSEUX ET NON UN `import` ─────────────────────
 * `react-native-purchases` est un module NATIF. Trois environnements le rendent
 * absent, et aucun n'est une panne :
 *   · Expo Web (`npx expo start --web`, l'instrument de preview du fondateur) ;
 *   · Expo Go, qui n'embarque aucun module natif tiers — d'où le DEV BUILD ;
 *   · un arbre où `npm install` n'a pas encore tourné après l'ajout de la dép.
 * Un `import` statique ferait ÉCHOUER LE CHARGEMENT DU BUNDLE dans ces trois
 * cas — c'est-à-dire un écran blanc, ce que CLAUDE.md interdit. Le require sous
 * try/catch transforme l'absence en CAPACITÉ FAUSSE, que l'écran sait dire.
 * Même patron défensif que `i18n/store.ts` avec `expo-localization`.
 *
 * ── LA CLÉ N'EST JAMAIS EN DUR ─────────────────────────────────────────────
 * Elle vient de `EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `…_ANDROID_KEY` (documentées
 * dans `.env.example` avec des valeurs factices). Les deux accès sont écrits en
 * TOUTES LETTRES : Metro/Expo remplace littéralement `process.env.EXPO_PUBLIC_*`
 * au build ; un accès dynamique ne serait pas inliné et vaudrait `undefined` en
 * production (même piège que `googleClientId()` dans `lib/auth.ts`).
 * Une clé SECRÈTE `sk_…` posée là est REFUSÉE par `purchaseCapability` — jamais
 * utilisée faute de mieux.
 *
 * ── L'IDENTITÉ EST CELLE DU COMPTE, PAS UN ANONYME ─────────────────────────
 * `supabase/functions/rc_webhook` applique l'achat en écrivant `users` sur
 * `event.app_user_id`. Si le SDK est configuré en anonyme, ce champ ne
 * correspond à AUCUNE ligne : l'achat serait encaissé sans jamais être appliqué
 * côté serveur. On ne configure donc RevenueCat qu'avec l'identifiant Supabase
 * du joueur — et sans session, l'écran ne vend rien (il demande de se connecter).
 */
import { Platform } from 'react-native';
import {
  purchaseCapability,
  type PurchaseCapability,
} from './capability';
import { DEFAULT_PRO_ENTITLEMENT_ID, type CustomerInfoLike } from './entitlement';
import type { OfferingLike, PackageLike, StoreProductLike } from './offerings';

/** Sous-ensemble STRUCTUREL du SDK réellement appelé (aucun type importé de lui). */
interface PurchasesModuleLike {
  configure(options: { apiKey: string; appUserId?: string | null }): void;
  logIn(appUserId: string): Promise<{ customerInfo: CustomerInfoLike }>;
  getCustomerInfo(): Promise<CustomerInfoLike>;
  getOfferings(): Promise<{ current?: OfferingLike | null }>;
  /**
   * Produits store lus PAR IDENTIFIANT — ce qui donne un prix aux objets de la
   * boutique (E72/E73) qui ne sont pas des packages d'abonnement. Absent des
   * SDK très anciens : l'appelant vérifie que c'est bien une fonction.
   */
  getProducts?(productIds: readonly string[]): Promise<readonly StoreProductLike[]>;
  purchasePackage(pkg: PackageLike): Promise<{ customerInfo: CustomerInfoLike }>;
  restorePurchases(): Promise<CustomerInfoLike>;
}

/** Erreur telle que la lève le SDK (le champ qui distingue une ANNULATION). */
interface PurchasesErrorLike {
  readonly userCancelled?: boolean;
  readonly message?: string;
}

let moduleCache: PurchasesModuleLike | null | undefined;

/**
 * Charge le SDK une seule fois. `null` = indisponible ici (web, Expo Go, dép
 * non installée) — un fait, jamais une exception qui remonterait dans un rendu.
 */
function purchasesModule(): PurchasesModuleLike | null {
  if (moduleCache !== undefined) return moduleCache;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-purchases') as
      | { default?: PurchasesModuleLike }
      | PurchasesModuleLike;
    const sdk = ('default' in mod && mod.default ? mod.default : mod) as PurchasesModuleLike;
    moduleCache = typeof sdk?.configure === 'function' ? sdk : null;
  } catch {
    moduleCache = null;
  }
  return moduleCache;
}

/** L'entitlement à lire — surchargeable sans rebuild (cf. entitlement.ts). */
export const PRO_ENTITLEMENT_ID: string =
  process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID?.trim() || DEFAULT_PRO_ENTITLEMENT_ID;

/**
 * La capacité d'achat de CETTE plateforme, à CET instant. Les écrans la LISENT ;
 * ils ne la déduisent jamais de `Platform.OS`.
 */
export function purchasesCapability(): PurchaseCapability {
  // Sur une plateforme SANS achat in-app, on ne CHARGE MÊME PAS le module natif :
  // le verdict est déjà connu (`platform_without_iap`), et faire tourner du code
  // natif dans le bundle web pour aboutir au même refus n'apporterait qu'un
  // risque. `purchaseCapability` reste seul juge de l'ordre des faits.
  const nativePlatform = Platform.OS === 'ios' || Platform.OS === 'android';
  return purchaseCapability({
    os: Platform.OS,
    sdkAvailable: nativePlatform && purchasesModule() !== null,
    iosKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
    androidKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
  });
}

let configuredForUser: string | null = null;

/**
 * Configure le SDK pour CE joueur (idempotent : reconfigure seulement si
 * l'identité change). Rend `false` sans rien casser quand la capacité est
 * fausse — l'appelant n'a pas à sonder la plateforme lui-même.
 */
export async function configurePurchases(userId: string): Promise<boolean> {
  const cap = purchasesCapability();
  if (!cap.available) return false;
  const sdk = purchasesModule();
  if (!sdk) return false;
  if (configuredForUser === userId) return true;
  try {
    if (configuredForUser === null) {
      sdk.configure({ apiKey: cap.apiKey, appUserId: userId });
    } else {
      // Changement de compte dans la même session : l'identité RevenueCat doit
      // suivre, sinon les achats du nouvel utilisateur partiraient sur l'ancien id.
      await sdk.logIn(userId);
    }
    configuredForUser = userId;
    return true;
  } catch {
    return false;
  }
}

/** L'offering courant, ou `null` si le SDK n'a rien pu lire (jamais un repli inventé). */
export async function fetchCurrentOffering(): Promise<OfferingLike | null> {
  const sdk = purchasesModule();
  if (!sdk) return null;
  const offerings = await sdk.getOfferings();
  return offerings?.current ?? null;
}

/**
 * Produits store correspondant à des SKUs de catalogue (E72/E73), ou `null` si
 * rien n'a pu être lu. `null` veut dire « ON NE SAIT PAS », jamais « pas de
 * prix » : c'est l'appelant qui distingue l'échec de lecture (état 'error') du
 * store qui répond une liste VIDE parce qu'aucun produit n'est publié
 * (état 'empty'). Confondre les deux ferait dire « la boutique n'a pas de
 * prix » là où la vraie phrase est « on n'a pas réussi à les lire ».
 *
 * Un SDK sans `getProducts` rend `null` de la même façon — une capacité absente
 * n'est pas une réponse.
 */
export async function fetchStoreProducts(
  productIds: readonly string[],
): Promise<readonly StoreProductLike[] | null> {
  const sdk = purchasesModule();
  if (!sdk || typeof sdk.getProducts !== 'function') return null;
  if (productIds.length === 0) return [];
  return await sdk.getProducts(productIds);
}

export async function fetchCustomerInfo(): Promise<CustomerInfoLike | null> {
  const sdk = purchasesModule();
  if (!sdk) return null;
  return await sdk.getCustomerInfo();
}

export type PurchaseOutcome =
  | { readonly kind: 'purchased'; readonly customerInfo: CustomerInfoLike }
  /** L'utilisateur a fermé la feuille du Store : ce n'est PAS une erreur. */
  | { readonly kind: 'cancelled' }
  | { readonly kind: 'failed'; readonly message?: string };

/**
 * Achat d'un package. UNE ANNULATION N'EST PAS UN ÉCHEC (même doctrine que
 * `isSilentFailure` dans `lib/auth.ts`) : fermer la feuille du Store est un
 * geste banal, l'écran ne doit imputer aucune panne au joueur.
 */
export async function purchasePremiumPackage(pkg: PackageLike): Promise<PurchaseOutcome> {
  const sdk = purchasesModule();
  if (!sdk) return { kind: 'failed' };
  try {
    const { customerInfo } = await sdk.purchasePackage(pkg);
    return { kind: 'purchased', customerInfo };
  } catch (error) {
    const e = error as PurchasesErrorLike;
    if (e?.userCancelled === true) return { kind: 'cancelled' };
    return { kind: 'failed', message: typeof e?.message === 'string' ? e.message : undefined };
  }
}

export type RestoreOutcome =
  | { readonly kind: 'restored'; readonly customerInfo: CustomerInfoLike }
  | { readonly kind: 'failed'; readonly message?: string };

/**
 * Restauration. « Rien à restaurer » n'est PAS un échec : la fonction rend le
 * CustomerInfo obtenu, et c'est `readProStatus` qui dira s'il porte un droit —
 * l'écran distingue alors « restauré » de « aucun achat trouvé ».
 */
export async function restorePremiumPurchases(): Promise<RestoreOutcome> {
  const sdk = purchasesModule();
  if (!sdk) return { kind: 'failed' };
  try {
    return { kind: 'restored', customerInfo: await sdk.restorePurchases() };
  } catch (error) {
    const e = error as PurchasesErrorLike;
    return { kind: 'failed', message: typeof e?.message === 'string' ? e.message : undefined };
  }
}

/** Réservé aux tests d'intégration manuels : oublie l'identité configurée. */
export function resetPurchasesConfigurationForTests(): void {
  configuredForUser = null;
}
