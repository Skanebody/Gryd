/**
 * GRYD — E72/E73 : ce que la lecture des prix store doit tenir SEULE.
 *
 *  1. aucun prix n'est FABRIQUÉ — pas de `priceString`, pas de ligne ;
 *  2. un identifiant préfixé du bundle désigne bien la clé de catalogue ;
 *  3. une AMBIGUÏTÉ (deux produits pour une clé) supprime le prix au lieu de
 *     l'attribuer au hasard — un prix mis sur le mauvais objet est un mensonge ;
 *  4. `storePriceOf` rend `null`, jamais un montant de repli.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { catalogKeyOfProductId, readStorePrices, storePriceOf } from './storePrices.ts';
import type { StoreProductLike } from './offerings.ts';

function product(identifier: string, priceString?: string | null): StoreProductLike {
  return { identifier, priceString: priceString ?? null };
}

Deno.test('storePrices : un identifiant préfixé désigne la clé de catalogue', () => {
  assertEquals(catalogKeyOfProductId('fr.nexus1993.gryd.eclats_l'), 'eclats_l');
  assertEquals(catalogKeyOfProductId('eclats_l'), 'eclats_l');
  assertEquals(catalogKeyOfProductId('  club_monthly  '), 'club_monthly');
});

Deno.test('storePrices : un identifiant vide ou terminé par un point ne désigne rien', () => {
  assertEquals(catalogKeyOfProductId(''), null);
  assertEquals(catalogKeyOfProductId('   '), null);
  assertEquals(catalogKeyOfProductId(null), null);
  assertEquals(catalogKeyOfProductId(undefined), null);
  assertEquals(catalogKeyOfProductId('fr.nexus1993.gryd.'), null);
});

Deno.test('storePrices : le libellé est recopié TEL QUEL, jamais reformaté', () => {
  const prices = readStorePrices([
    product('fr.nexus1993.gryd.eclats_m', 'R$ 14,90'),
    product('starter_pack', '$2.99'),
  ]);
  assertEquals(storePriceOf(prices, 'eclats_m'), 'R$ 14,90');
  assertEquals(storePriceOf(prices, 'starter_pack'), '$2.99');
});

Deno.test('storePrices : sans priceString, AUCUN prix (pas de repli catalogue)', () => {
  const prices = readStorePrices([
    product('eclats_s', null),
    product('eclats_l', '   '),
  ]);
  assertEquals(storePriceOf(prices, 'eclats_s'), null);
  assertEquals(storePriceOf(prices, 'eclats_l'), null);
  assertEquals(prices.size, 0);
});

Deno.test('storePrices : deux produits pour une clé ⇒ aucun prix pour cette clé', () => {
  const prices = readStorePrices([
    product('fr.nexus1993.gryd.founder_pack', '9,99 €'),
    product('com.autre.bundle.founder_pack', '19,99 €'),
    product('eclats_s', '0,99 €'),
  ]);
  assertEquals(storePriceOf(prices, 'founder_pack'), null);
  // La collision n'empoisonne pas les autres clés.
  assertEquals(storePriceOf(prices, 'eclats_s'), '0,99 €');
});

Deno.test('storePrices : une liste absente ou vide ne rend aucun prix', () => {
  assertEquals(readStorePrices(null).size, 0);
  assertEquals(readStorePrices(undefined).size, 0);
  assertEquals(readStorePrices([]).size, 0);
  assertEquals(storePriceOf(readStorePrices([]), 'club_monthly'), null);
});
