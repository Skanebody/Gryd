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

/**
 * ÉTAPE 0 — le défaut existait, et il était DANS L'ENVIRONNEMENT DE BUILD.
 *
 * La garde ne refusait que `sk_`. La valeur réellement posée était `test_C…` :
 * elle passait, donc `available: true`, donc les écrans d'achat vivants — alors
 * qu'aucun produit n'existe côté App Store. Un écran d'abonnement sans produit
 * est un bouton mort en revue (2.1) ; s'il affiche un prix, c'est 3.1.1.
 *
 * On exige désormais le préfixe de PRODUCTION plutôt que d'énumérer les
 * mauvaises valeurs : une liste noire se fait toujours contourner par celle
 * qu'on n'avait pas prévue — c'est exactement ce qui est arrivé.
 */
Deno.test('une clé de TEST (`test_…`) ne rend pas l’achat disponible', () => {
  const ios = purchaseCapability({ os: 'ios', sdkAvailable: true, iosKey: 'test_CxYzAbCd' });
  assertEquals(ios.available, false);
  if (!ios.available) assertEquals(ios.reason, 'key_not_production');

  const android = purchaseCapability({
    os: 'android',
    sdkAvailable: true,
    androidKey: 'test_CxYzAbCd',
  });
  assertEquals(android.available, false);
  if (!android.available) assertEquals(android.reason, 'key_not_production');
});

Deno.test('la clé doit porter le préfixe de SA plateforme, pas celui de l’autre', () => {
  // `goog_` sur iOS : plausible par copier-coller, et refusé.
  const ios = purchaseCapability({ os: 'ios', sdkAvailable: true, iosKey: 'goog_publique' });
  assertEquals(ios.available, false);
  if (!ios.available) assertEquals(ios.reason, 'key_not_production');
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
