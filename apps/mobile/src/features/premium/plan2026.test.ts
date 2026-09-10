/**
 * GRYD — L'OFFRE ET LA BOUTIQUE : ce que ces tests empêchent de redevenir faux.
 *
 * ─── ÉTAPE 0 — LE DÉFAUT EXISTAIT ──────────────────────────────────────────
 * Chaque test cite le code RÉEL qu'il aurait fait rougir. Sans cette colonne,
 * rien ne distinguerait ce fichier d'un test qui passe parce qu'il ne demande
 * rien.
 *
 *  · `app/abonnement.tsx` du 09/09 ouvrait « Restaurer mes achats » sur
 *    `status === 'ready' || status === 'empty' || status === 'error'` : deux
 *    de ces trois états sont des états SANS produit vendable. Le bouton
 *    existait donc là où rien ne pouvait être restauré.
 *  · `ProfilePremiumScreen.tsx` du 09/09 rendait ses offres sur
 *    `status === 'ready'` SEUL, sans exiger un prix : `readOffers` accepte un
 *    package dont `priceString` est absent (`priceLabel: null`), et l'écran
 *    imprimait alors « Prix indisponible » à côté d'un bouton « S'abonner »
 *    actif — un achat proposé sans son prix.
 *  · Aucun écran ne pouvait afficher un montant quand la boutique était fermée
 *    (retour fondateur du 10/09 : « aucun prix »). Le tarif prévu du cahier
 *    §16.1 vivait uniquement dans `game-rules.ts`, sans lecteur.
 */
import { assert, assertEquals } from 'jsr:@std/assert@^1';
import { COMMERCIAL_PROPOSAL_2026, PROGRESSION_RULES_2026 } from '@klaim/shared';
import {
  GRYD_PLUS_BENEFITS_2026,
  GRYD_PLUS_PLANNED_PRICES_2026,
  PERMANENT_COLLECTION_PRICES_2026,
  formatEurCents2026,
  noPaidGameAdvantage2026,
  plannedYearlySavingsPercent2026,
  showsPlannedPrices2026,
  storeAvailability2026,
  storeSaysNotOnSale2026,
} from './plan2026.ts';
import type { PremiumOffer } from './offerings.ts';

/** Une offre de Store, réduite à ce dont la capacité a besoin. */
function offer(over: Partial<PremiumOffer> = {}): PremiumOffer {
  return {
    period: 'monthly', packageId: 'p', productId: 'sku',
    priceLabel: '5,99 €', priceAmount: 5.99, currencyCode: 'EUR', freeTrial: null,
    ...over,
  };
}

Deno.test('tarif prévu : les montants VIENNENT de game-rules, jamais d’une chaîne d’écran', () => {
  // Le défaut évité : « 5,99 € » écrit dans le JSX. Le jour où le fondateur
  // passe à 699, l'écran mentirait sans que rien ne rougisse.
  assertEquals(GRYD_PLUS_PLANNED_PRICES_2026.map(p => p.cents), [
    COMMERCIAL_PROPOSAL_2026.monthlyEurCents,
    COMMERCIAL_PROPOSAL_2026.annualEurCents,
  ]);
  assertEquals(GRYD_PLUS_PLANNED_PRICES_2026.map(p => p.period), ['monthly', 'yearly']);
});

Deno.test('format euro : français et anglais, et aucun arrondi de complaisance', () => {
  assertEquals(formatEurCents2026(COMMERCIAL_PROPOSAL_2026.monthlyEurCents, 'fr'), '5,99 €');
  assertEquals(formatEurCents2026(COMMERCIAL_PROPOSAL_2026.annualEurCents, 'fr'), '49,99 €');
  assertEquals(formatEurCents2026(COMMERCIAL_PROPOSAL_2026.monthlyEurCents, 'en'), '€5.99');
  // Les centimes ronds gardent leurs deux décimales : « 4, € » serait illisible.
  assertEquals(formatEurCents2026(400, 'fr'), '4,00 €');
  assertEquals(formatEurCents2026(5, 'fr'), '0,05 €');
  // Un montant douteux ne s'arrondit pas : il ne s'affiche pas.
  assertEquals(formatEurCents2026(-1, 'fr'), null);
  assertEquals(formatEurCents2026(5.5, 'fr'), null);
  assertEquals(formatEurCents2026(Number.NaN, 'fr'), null);
});

Deno.test('économie annuelle : CALCULÉE sur les deux constantes, jamais « environ 30 % »', () => {
  const percent = plannedYearlySavingsPercent2026();
  assert(percent !== null, 'l’annuel du cahier est moins cher que douze mensuels');
  const expected = Math.floor((1 - COMMERCIAL_PROPOSAL_2026.annualEurCents / (COMMERCIAL_PROPOSAL_2026.monthlyEurCents * 12)) * 100);
  assertEquals(percent, expected);
});

Deno.test('anti pay-to-win : la phrase n’est affichable que si les règles la tiennent', () => {
  // Le contrat §16.2 : capture, XP et défis STRICTEMENT identiques. Si un jour
  // un multiplicateur payant quitte 1, l'écran doit se taire, pas promettre.
  assertEquals(noPaidGameAdvantage2026(), true);
  assertEquals(COMMERCIAL_PROPOSAL_2026.paidCaptureMultiplier, 1);
  assertEquals(COMMERCIAL_PROPOSAL_2026.paidXpMultiplier, 1);
  assertEquals(COMMERCIAL_PROPOSAL_2026.paidChallengeMultiplier, 1);
  assertEquals(COMMERCIAL_PROPOSAL_2026.virtualCurrency, false);
});

Deno.test('contenu de l’offre : trois bénéfices P1, et le seul compte affiché est vérifiable', () => {
  assertEquals(GRYD_PLUS_BENEFITS_2026.map(b => b.id), ['comparisons', 'studio', 'seasonVariants']);
  // §16.1 : « Le survol 3D n'est pas vendu comme disponible avant P2. »
  assert(!GRYD_PLUS_BENEFITS_2026.some(b => (b.id as string) === 'flyover'), 'aucun bénéfice P2 vendu en P1');
  const variants = GRYD_PLUS_BENEFITS_2026.find(b => b.id === 'seasonVariants');
  assertEquals(variants?.count, PROGRESSION_RULES_2026.premiumVariantTiers.length);
  // Les deux autres n'ont AUCUNE constante qui les compte : ils n'affichent
  // donc aucun nombre, plutôt qu'un nombre inventé.
  assertEquals(GRYD_PLUS_BENEFITS_2026.filter(b => b.count !== null).length, 1);
});

Deno.test('collections permanentes : les trois prix du cahier, du moins cher au plus cher', () => {
  assertEquals(PERMANENT_COLLECTION_PRICES_2026.map(collection => collection.id), ['contour', 'relief', 'clubhouse']);
  assertEquals(
    PERMANENT_COLLECTION_PRICES_2026.map(collection => collection.cents),
    ['contour', 'relief', 'clubhouse'].map(id => COMMERCIAL_PROPOSAL_2026.permanentCollectionEurCents[id as 'contour']),
  );
});

Deno.test('boutique OUVERTE : lue, ET au moins un prix confirmé', () => {
  const open = storeAvailability2026({ status: 'ready', offers: [offer()], blockedReason: null });
  assertEquals(open, { open: true });
  // Le défaut réel : `status === 'ready'` seul. `readOffers` rend `priceLabel:
  // null` quand le store n'a pas donné de prix ; l'écran vendait quand même.
  assertEquals(
    storeAvailability2026({ status: 'ready', offers: [offer({ priceLabel: null })], blockedReason: null }),
    { open: false, reason: 'noConfirmedPrice' },
  );
  assertEquals(
    storeAvailability2026({ status: 'ready', offers: [], blockedReason: null }),
    { open: false, reason: 'nothingOnSale' },
  );
});

Deno.test('boutique FERMÉE : chaque refus garde son nom, et aucun n’est un « peut-être »', () => {
  const closed = (over: Parameters<typeof storeAvailability2026>[0]) => storeAvailability2026(over);
  assertEquals(closed({ status: 'loading', offers: [], blockedReason: null }).open, false);
  assertEquals(closed({ status: 'loading', offers: [], blockedReason: null }), { open: false, reason: 'checking' });
  assertEquals(closed({ status: 'signedOut', offers: [], blockedReason: null }), { open: false, reason: 'signedOut' });
  assertEquals(closed({ status: 'empty', offers: [], blockedReason: null }), { open: false, reason: 'nothingOnSale' });
  assertEquals(closed({ status: 'error', offers: [], blockedReason: null }), { open: false, reason: 'readFailed' });
  // Web et module natif absent : des faits de PLATEFORME, rien à configurer.
  assertEquals(closed({ status: 'unavailable', offers: [], blockedReason: 'platform_without_iap' }), { open: false, reason: 'platform' });
  assertEquals(closed({ status: 'unavailable', offers: [], blockedReason: 'sdk_missing' }), { open: false, reason: 'platform' });
  // Les TROIS motifs de clé disent la même chose au joueur : pas raccordée.
  // C'est exactement l'état de l'iPhone du fondateur au 10/09/2026.
  for (const reason of ['key_missing', 'key_is_secret', 'key_not_production'] as const) {
    assertEquals(closed({ status: 'unavailable', offers: [], blockedReason: reason }), { open: false, reason: 'notConfigured' });
  }
});

Deno.test('« pas encore en vente » n’est dit que quand c’est VRAI', () => {
  // Le défaut vu à l'écran le 10/09 : un joueur déconnecté lisait « Pas encore
  // en vente ». On ne sait rien de la vente tant qu'on n'a pas lu son compte.
  assertEquals(storeSaysNotOnSale2026({ open: false, reason: 'notConfigured' }), true);
  assertEquals(storeSaysNotOnSale2026({ open: false, reason: 'nothingOnSale' }), true);
  for (const reason of ['checking', 'signedOut', 'platform', 'noConfirmedPrice', 'readFailed'] as const) {
    assertEquals(storeSaysNotOnSale2026({ open: false, reason }), false, `« pas en vente » affirmé sur ${reason}`);
  }
  assertEquals(storeSaysNotOnSale2026({ open: true }), false);
});

Deno.test('le tarif prévu s’efface dès que le Store parle', () => {
  // La règle qui réconcilie « les prix viennent du Store » et « il faut de
  // l'information » : le tarif prévu n'existe QUE boutique fermée.
  assertEquals(showsPlannedPrices2026({ open: true }), false);
  assertEquals(showsPlannedPrices2026({ open: false, reason: 'notConfigured' }), true);
  assertEquals(showsPlannedPrices2026(storeAvailability2026({ status: 'ready', offers: [offer()], blockedReason: null })), false);
});
