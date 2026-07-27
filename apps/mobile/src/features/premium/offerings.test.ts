/**
 * GRYD — PREMIUM : ce que la lecture des offres doit tenir SEULE.
 *
 *  1. AUCUN prix n'est fabriqué : un `priceString` absent rend l'offre non
 *     achetable et se lit `null` (l'écran dira « indisponible ») ;
 *  2. l'annuel n'est pré-sélectionné que s'il est DÉMONTRABLEMENT moins cher ;
 *  3. jamais de fausse remise (devises mixtes, annuel plus cher → aucun %) ;
 *  4. un « essai » n'existe que si l'intro price vaut RÉELLEMENT 0 ;
 *  5. l'ordre d'affichage et le plafond de 3 lignes sont tenus par le code.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  defaultOfferPeriod,
  freeTrialOf,
  isPurchasable,
  readOffers,
  yearlyIsCheaper,
  yearlySavingsPercent,
  type OfferingLike,
  type PackageLike,
} from './offerings.ts';

function pkg(
  type: string,
  productId: string,
  price: number | null,
  priceString: string | null,
  currency = 'EUR',
  introPrice?: { price: number; periodUnit: string; periodNumberOfUnits: number },
): PackageLike {
  return {
    identifier: `$rc_${type.toLowerCase()}`,
    packageType: type,
    product: {
      identifier: productId,
      price,
      priceString,
      currencyCode: currency,
      introPrice: introPrice ?? null,
    },
  };
}

const OFFERING: OfferingLike = {
  identifier: 'default',
  availablePackages: [
    pkg('MONTHLY', 'club_monthly', 4.99, '4,99 €'),
    pkg('ANNUAL', 'club_annual', 34.99, '34,99 €'),
  ],
};

Deno.test('offres lues : ordre imposé annuel → mensuel, prix DU STORE', () => {
  const offers = readOffers(OFFERING);
  assertEquals(offers.map((o) => o.period), ['yearly', 'monthly']);
  assertEquals(offers[0]?.priceLabel, '34,99 €'); // exactement la chaîne du store
  assertEquals(offers[0]?.productId, 'club_annual');
  assertEquals(offers[1]?.priceLabel, '4,99 €');
});

Deno.test('lifetime toujours en tête quand il existe', () => {
  const offers = readOffers({
    availablePackages: [
      pkg('MONTHLY', 'club_monthly', 4.99, '4,99 €'),
      pkg('LIFETIME', 'gryd_pro_lifetime', 89.99, '89,99 €'),
      pkg('ANNUAL', 'club_annual', 34.99, '34,99 €'),
    ],
  });
  assertEquals(offers.map((o) => o.period), ['lifetime', 'yearly', 'monthly']);
});

Deno.test('types de package non présentés (SIX_MONTH, CUSTOM) : ignorés', () => {
  const offers = readOffers({
    availablePackages: [
      pkg('SIX_MONTH', 'club_semestre', 19.99, '19,99 €'),
      pkg('CUSTOM', 'bizarre', 1, '1 €'),
      pkg('MONTHLY', 'club_monthly', 4.99, '4,99 €'),
    ],
  });
  assertEquals(offers.length, 1);
  assertEquals(offers[0]?.period, 'monthly');
});

Deno.test('PRIX ABSENT : offre lue mais NON achetable, libellé null (jamais inventé)', () => {
  const offers = readOffers({ availablePackages: [pkg('MONTHLY', 'club_monthly', 4.99, null)] });
  assertEquals(offers.length, 1);
  assertEquals(offers[0]?.priceLabel, null);
  assertEquals(isPurchasable(offers[0]!), false);
});

Deno.test('prix vide ou blanc : traité comme absent', () => {
  const offers = readOffers({ availablePackages: [pkg('MONTHLY', 'club_monthly', 4.99, '  ')] });
  assertEquals(offers[0]?.priceLabel, null);
});

Deno.test('package sans produit ou sans identifiant : écarté', () => {
  const offers = readOffers({
    availablePackages: [
      { identifier: '$rc_monthly', packageType: 'MONTHLY' },
      { packageType: 'ANNUAL', product: { identifier: 'club_annual', priceString: '34,99 €' } },
    ],
  });
  assertEquals(offers.length, 0);
});

Deno.test('offering vide / absent : aucune offre, aucune sélection', () => {
  assertEquals(readOffers(null), []);
  assertEquals(readOffers(undefined), []);
  assertEquals(readOffers({ availablePackages: [] }), []);
  assertEquals(defaultOfferPeriod([]), null);
});

Deno.test('annuel pré-sélectionné SEULEMENT s’il est moins cher au mois', () => {
  const offers = readOffers(OFFERING);
  assertEquals(yearlyIsCheaper(offers), true); // 34,99/12 = 2,92 < 4,99
  assertEquals(defaultOfferPeriod(offers), 'yearly');
});

Deno.test('annuel PLUS CHER : le mensuel reste sélectionné, aucune remise annoncée', () => {
  const offers = readOffers({
    availablePackages: [
      pkg('MONTHLY', 'club_monthly', 4.99, '4,99 €'),
      pkg('ANNUAL', 'club_annual', 79.99, '79,99 €'),
    ],
  });
  assertEquals(yearlyIsCheaper(offers), false);
  assertEquals(defaultOfferPeriod(offers), 'monthly');
  assertEquals(yearlySavingsPercent(offers), null);
});

Deno.test('devises différentes : comparaison IMPOSSIBLE → mensuel, aucune remise', () => {
  const offers = readOffers({
    availablePackages: [
      pkg('MONTHLY', 'club_monthly', 4.99, '4,99 €', 'EUR'),
      pkg('ANNUAL', 'club_annual', 34.99, '$34.99', 'USD'),
    ],
  });
  assertEquals(yearlyIsCheaper(offers), false);
  assertEquals(defaultOfferPeriod(offers), 'monthly');
  assertEquals(yearlySavingsPercent(offers), null);
});

Deno.test('montant numérique manquant : pas de comparaison, donc pas de remise', () => {
  const offers = readOffers({
    availablePackages: [
      pkg('MONTHLY', 'club_monthly', null, '4,99 €'),
      pkg('ANNUAL', 'club_annual', 34.99, '34,99 €'),
    ],
  });
  assertEquals(yearlyIsCheaper(offers), false);
  assertEquals(yearlySavingsPercent(offers), null);
});

Deno.test('remise annuelle : CALCULÉE et arrondie vers le bas (jamais sur-annoncée)', () => {
  const offers = readOffers(OFFERING);
  // 1 - 34,99 / (4,99 × 12) = 41,58 % → 41
  assertEquals(yearlySavingsPercent(offers), 41);
});

Deno.test('sans mensuel : l’offre restante est sélectionnée (jamais null s’il y a une offre)', () => {
  const yearlyOnly = readOffers({ availablePackages: [pkg('ANNUAL', 'club_annual', 34.99, '34,99 €')] });
  assertEquals(defaultOfferPeriod(yearlyOnly), 'yearly');
  const lifetimeOnly = readOffers({ availablePackages: [pkg('LIFETIME', 'life', 89.99, '89,99 €')] });
  assertEquals(defaultOfferPeriod(lifetimeOnly), 'lifetime');
});

Deno.test('essai gratuit : seulement si l’intro price vaut RÉELLEMENT 0', () => {
  assertEquals(freeTrialOf({ introPrice: { price: 0, periodUnit: 'DAY', periodNumberOfUnits: 7 } }), {
    units: 7,
    unit: 'day',
  });
  // Intro PAYANT = offre de lancement, pas un essai.
  assertEquals(freeTrialOf({ introPrice: { price: 1.99, periodUnit: 'MONTH', periodNumberOfUnits: 1 } }), null);
  assertEquals(freeTrialOf({ introPrice: null }), null);
  assertEquals(freeTrialOf(undefined), null);
  // Période incomplète ou unité inconnue : on ne devine pas une durée.
  assertEquals(freeTrialOf({ introPrice: { price: 0, periodUnit: 'DAY', periodNumberOfUnits: 0 } }), null);
  assertEquals(freeTrialOf({ introPrice: { price: 0, periodUnit: 'FORTNIGHT', periodNumberOfUnits: 2 } }), null);
});

Deno.test('l’essai remonte sur l’offre correspondante, pas sur les autres', () => {
  const offers = readOffers({
    availablePackages: [
      pkg('MONTHLY', 'club_monthly', 4.99, '4,99 €', 'EUR', {
        price: 0,
        periodUnit: 'WEEK',
        periodNumberOfUnits: 1,
      }),
      pkg('ANNUAL', 'club_annual', 34.99, '34,99 €'),
    ],
  });
  assertEquals(offers.find((o) => o.period === 'monthly')?.freeTrial, { units: 1, unit: 'week' });
  assertEquals(offers.find((o) => o.period === 'yearly')?.freeTrial, null);
});
