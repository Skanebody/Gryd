/**
 * GRYD — RevenueCat wrapper (O3). No-op si SDK / clés absents au build.
 *
 * Quand react-native-purchases sera ajouté :
 * - configurePurchases() au boot (SessionProvider)
 * - purchaseSku(SKUS.clubMonthly) depuis Arsenal
 * - le webhook rc_webhook crédite is_club + feature_entitlements
 */
import Constants from 'expo-constants';
import { SKUS } from '@klaim/shared';

type PurchasesExtra = {
  revenueCatApiKeyIos?: string;
  revenueCatApiKeyAndroid?: string;
};

function extra(): PurchasesExtra {
  return (Constants.expoConfig?.extra ?? {}) as PurchasesExtra;
}

export function isPurchasesConfigured(): boolean {
  const e = extra();
  return Boolean(e.revenueCatApiKeyIos || e.revenueCatApiKeyAndroid);
}

export async function configurePurchases(_userId: string): Promise<void> {
  if (!isPurchasesConfigured()) return;
  // O3 : Purchases.configure({ apiKey, appUserID: userId })
}

export type PurchaseResult =
  | { ok: true }
  | { ok: false; reason: 'not_configured' | 'cancelled' | 'error'; message?: string };

export async function purchaseClubMonthly(): Promise<PurchaseResult> {
  if (!isPurchasesConfigured()) {
    return { ok: false, reason: 'not_configured' };
  }
  // O3 : return Purchases.purchaseProduct(SKUS.clubMonthly)
  return { ok: false, reason: 'not_configured', message: SKUS.clubMonthly };
}

export async function restorePurchases(): Promise<PurchaseResult> {
  if (!isPurchasesConfigured()) return { ok: false, reason: 'not_configured' };
  return { ok: false, reason: 'not_configured' };
}
