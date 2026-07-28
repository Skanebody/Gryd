/**
 * GRYD — E75 : ce que l'historique minimal doit tenir SEUL.
 *
 *  1. une date illisible ou absente ne fait PAS de ligne (jamais un achat daté
 *     d'aujourd'hui faute de mieux) ;
 *  2. l'ordre est déterministe — deux lectures du même CustomerInfo rendent la
 *     même liste, y compris à dates égales ;
 *  3. un CustomerInfo sans le champ rend une liste VIDE, jamais une erreur ;
 *  4. `recentPurchases` borne sans rien inventer, et se refuse aux bornes absurdes.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  PURCHASE_HISTORY_MAX_ROWS,
  readPurchaseHistory,
  recentPurchases,
} from './purchaseHistory.ts';
import type { CustomerInfoLike } from './entitlement.ts';

function info(dates: Record<string, string | null> | null | undefined): CustomerInfoLike {
  return { allPurchaseDatesByProduct: dates };
}

Deno.test('E75 historique : les dates illisibles ou nulles ne font pas de ligne', () => {
  const out = readPurchaseHistory(
    info({
      club_monthly: '2026-07-01T10:00:00Z',
      eclats_s: null,
      founder_pack: 'pas-une-date',
      starter_pack: '   ',
    }),
  );
  assertEquals(out.map((r) => r.productId), ['club_monthly']);
});

Deno.test('E75 historique : du plus récent au plus ancien, déterministe à date égale', () => {
  const out = readPurchaseHistory(
    info({
      b_produit: '2026-01-01T00:00:00Z',
      a_produit: '2026-01-01T00:00:00Z',
      recent: '2026-06-01T00:00:00Z',
    }),
  );
  assertEquals(out.map((r) => r.productId), ['recent', 'a_produit', 'b_produit']);
});

Deno.test('E75 historique : sans le champ, liste VIDE (pas une erreur)', () => {
  assertEquals(readPurchaseHistory(info(null)), []);
  assertEquals(readPurchaseHistory(info(undefined)), []);
  assertEquals(readPurchaseHistory({}), []);
  assertEquals(readPurchaseHistory(info({})), []);
});

Deno.test('E75 historique : une clé de produit vide est ignorée', () => {
  assertEquals(readPurchaseHistory(info({ '   ': '2026-07-01T10:00:00Z' })), []);
});

Deno.test('E75 historique : recentPurchases borne sans rien fabriquer', () => {
  const records = readPurchaseHistory(
    info({
      p1: '2026-07-06T00:00:00Z',
      p2: '2026-07-05T00:00:00Z',
      p3: '2026-07-04T00:00:00Z',
      p4: '2026-07-03T00:00:00Z',
      p5: '2026-07-02T00:00:00Z',
      p6: '2026-07-01T00:00:00Z',
    }),
  );
  assertEquals(records.length, 6);
  assertEquals(recentPurchases(records).length, PURCHASE_HISTORY_MAX_ROWS);
  assertEquals(recentPurchases(records, 2).map((r) => r.productId), ['p1', 'p2']);
  assertEquals(recentPurchases(records, 0), []);
  assertEquals(recentPurchases(records, -3), []);
  assertEquals(recentPurchases(records, Number.NaN), []);
  // Une borne plus grande que la liste ne la rallonge pas.
  assertEquals(recentPurchases(records, 99).length, 6);
});
