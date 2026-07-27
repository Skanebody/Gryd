/**
 * GRYD — PREMIUM : ce que la capacité d'achat doit tenir SEULE.
 *
 * Ce que ces tests verrouillent, par ordre de gravité :
 *  1. le web ne peut JAMAIS acheter — aucune clé ne rachète l'absence de store ;
 *  2. une clé SECRÈTE (`sk_…`) est REFUSÉE, jamais utilisée « faute de mieux » ;
 *  3. la clé d'une plateforme n'autorise pas l'autre (défaut Google OAuth 2026) ;
 *  4. sans module natif (Expo Go), la capacité est fausse et ne plante pas ;
 *  5. une valeur vide ou blanche vaut ABSENCE, pas configuration.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { purchaseCapability, purchasePlatform } from './capability.ts';

const IOS = 'appl_abcdef';
const ANDROID = 'goog_abcdef';

Deno.test('web : aucun achat in-app, même avec les deux clés renseignées', () => {
  const cap = purchaseCapability({
    os: 'web',
    sdkAvailable: true,
    iosKey: IOS,
    androidKey: ANDROID,
  });
  assertEquals(cap.available, false);
  if (!cap.available) assertEquals(cap.reason, 'platform_without_iap');
});

Deno.test('plateforme inconnue (macos, windows) : traitée comme sans achat', () => {
  for (const os of ['macos', 'windows', '']) {
    const cap = purchaseCapability({ os, sdkAvailable: true, iosKey: IOS, androidKey: ANDROID });
    assertEquals(cap.available, false, os);
    if (!cap.available) assertEquals(cap.reason, 'platform_without_iap', os);
  }
  assertEquals(purchasePlatform('macos'), 'other');
});

Deno.test('clé SECRÈTE sk_ : refusée, jamais configurée dans le client', () => {
  const cap = purchaseCapability({ os: 'ios', sdkAvailable: true, iosKey: 'sk_live_dangereuse' });
  assertEquals(cap.available, false);
  if (!cap.available) assertEquals(cap.reason, 'key_is_secret');
});

Deno.test('une clé iOS ne rend pas Android capable (et réciproquement)', () => {
  const android = purchaseCapability({ os: 'android', sdkAvailable: true, iosKey: IOS });
  assertEquals(android.available, false);
  if (!android.available) assertEquals(android.reason, 'key_missing');

  const ios = purchaseCapability({ os: 'ios', sdkAvailable: true, androidKey: ANDROID });
  assertEquals(ios.available, false);
  if (!ios.available) assertEquals(ios.reason, 'key_missing');
});

Deno.test('module natif absent (Expo Go) : capacité fausse, motif explicite', () => {
  const cap = purchaseCapability({ os: 'ios', sdkAvailable: false, iosKey: IOS });
  assertEquals(cap.available, false);
  if (!cap.available) assertEquals(cap.reason, 'sdk_missing');
});

Deno.test('clé vide ou blanche = absence de clé, pas une configuration', () => {
  for (const key of ['', '   ', undefined, null]) {
    const cap = purchaseCapability({ os: 'ios', sdkAvailable: true, iosKey: key });
    assertEquals(cap.available, false, String(key));
    if (!cap.available) assertEquals(cap.reason, 'key_missing', String(key));
  }
});

Deno.test('iOS et Android configurés : capacité vraie, clé de LA plateforme', () => {
  const ios = purchaseCapability({ os: 'ios', sdkAvailable: true, iosKey: IOS, androidKey: ANDROID });
  assertEquals(ios.available, true);
  if (ios.available) {
    assertEquals(ios.platform, 'ios');
    assertEquals(ios.apiKey, IOS);
  }
  const android = purchaseCapability({
    os: 'android',
    sdkAvailable: true,
    iosKey: IOS,
    androidKey: ` ${ANDROID} `,
  });
  assertEquals(android.available, true);
  if (android.available) {
    assertEquals(android.platform, 'android');
    assertEquals(android.apiKey, ANDROID); // trimmé
  }
});
