import { assertEquals } from 'jsr:@std/assert@^1';
import { readPurchaseFailure2026 } from './purchaseFailure2026.ts';
Deno.test('G28 : « refusé » et « déjà détenu » ne sont plus le même échec anonyme', () => {
  // Le défaut : tout ce qui n'était pas une annulation devenait `failed`, donc
  // « L'action n'a pas abouti » — y compris un achat que le Store a REFUSÉ et
  // un produit que le compte possède DÉJÀ.
  assertEquals(readPurchaseFailure2026({ code: '6' }), 'already_owned');
  assertEquals(readPurchaseFailure2026({ readableErrorCode: 'PRODUCT_ALREADY_PURCHASED_ERROR' }), 'already_owned');
  assertEquals(readPurchaseFailure2026({ code: 3 }), 'declined');
  assertEquals(readPurchaseFailure2026({ readableErrorCode: 'PURCHASE_INVALID_ERROR' }), 'declined');
});
Deno.test('G28 : attente, annulation, panne de Store et réseau restent distincts', () => {
  assertEquals(readPurchaseFailure2026({ code: '23' }), 'pending');
  assertEquals(readPurchaseFailure2026({ readableErrorCode: 'PAYMENT_PENDING_ERROR' }), 'pending');
  assertEquals(readPurchaseFailure2026({ userCancelled: true }), 'cancelled');
  assertEquals(readPurchaseFailure2026({ code: '1' }), 'cancelled');
  assertEquals(readPurchaseFailure2026({ code: '2' }), 'store_problem');
  assertEquals(readPurchaseFailure2026({ code: '10' }), 'network');
});
Deno.test('G28 : une erreur inconnue reste inconnue, jamais requalifiée', () => {
  for (const value of [null, undefined, {}, 'boom', { code: '999' }, { readableErrorCode: 'NEW_SDK_CODE' }]) {
    assertEquals(readPurchaseFailure2026(value), 'unknown');
  }
  // Une annulation prime sur le code : c'est le seul champ que tous les SDK posent.
  assertEquals(readPurchaseFailure2026({ userCancelled: true, code: '2' }), 'cancelled');
});
