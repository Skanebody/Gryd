import { assertEquals } from 'jsr:@std/assert@^1';
import { grydPlusAccessState2026, readServerGrydPlusAccess2026 } from './access2026.ts';
import { activitiesInPeriod2026, comparisonPeriods2026, summarizeComparison2026 } from './comparison2026.ts';
import { readSubscriptionOffers2026, yearlySavingsPercent } from './offerings.ts';
import { storeAvailability2026, storeCannotSellYet2026 } from './plan2026.ts';
Deno.test('GRYD+ 2026: no new lifetime offer; a real monthly price remains available', () => {
  const offers = readSubscriptionOffers2026({ availablePackages: ['LIFETIME', 'MONTHLY'].map(packageType => ({ packageType, identifier: packageType, product: { identifier: packageType, priceString: '6 €', price: 6, currencyCode: 'EUR' } })) });
  assertEquals(offers.map(offer => offer.period), ['monthly']);
});
Deno.test('GRYD+ 2026: unknown currency never asserts annual savings', () => {
  const offers = readSubscriptionOffers2026({ availablePackages: ['MONTHLY', 'ANNUAL'].map(packageType => ({ packageType, identifier: packageType, product: { identifier: packageType, priceString: '6', price: 6 } })) });
  assertEquals(yearlySavingsPercent(offers), null);
});
Deno.test('GRYD+ server access: malformed and expired receipts fail closed', () => {
  const receipt = { active: true, lifetime: false, expiresAt: '2026-09-09T12:00:00Z', productId: 'annual', verifiedAt: null };
  assertEquals(readServerGrydPlusAccess2026(receipt, Date.parse(receipt.expiresAt))?.active, false);
  assertEquals(readServerGrydPlusAccess2026({ ...receipt, expiresAt: 'bad' }, 0)?.active, false);
  assertEquals(readServerGrydPlusAccess2026({ active: true }, 0), null);
  assertEquals(readServerGrydPlusAccess2026({ ...receipt, expiresAt: null, lifetime: true }, Date.now())?.active, true);
});
Deno.test('private comparison: weighted pace and speed, no fabricated measurement', () => {
  const summary = summarizeComparison2026([{ id: 'a', startedAtMs: 1, km: 2, durationS: 600 }, { id: 'b', startedAtMs: 2, km: 8, durationS: 3000, pending: true }]);
  assertEquals(summary, { km: 10, durationS: 3600, count: 2, paceSPerKm: 360, speedKmh: 10, pending: true });
  assertEquals(summarizeComparison2026([]).paceSPerKm, null);
  assertEquals(summarizeComparison2026([{ id: 'bad', startedAtMs: 1, km: NaN, durationS: 5 }]).count, 0);
});
Deno.test('private comparison: periods do not overlap and boundary belongs to exactly one side', () => {
  const periods = comparisonPeriods2026(new Date('2026-09-09T12:00:00Z'), 7);
  assertEquals(periods.previous.end, periods.current.start);
  const runs = [{ id: 'boundary', startedAtMs: periods.current.start, km: 1, durationS: 300 }];
  assertEquals(activitiesInPeriod2026(runs, periods.current).length, 1);
  assertEquals(activitiesInPeriod2026(runs, periods.previous).length, 0);
});

Deno.test('G28 : « Abonnement actif » n’apparaît qu’après confirmation du serveur', () => {
  const receipt = { active: true, expiresAt: '2030-01-01T00:00:00Z', lifetime: false, productId: 'monthly', verifiedAt: null };
  const state = (over: Partial<Parameters<typeof grydPlusAccessState2026>[0]> = {}) =>
    grydPlusAccessState2026({ sessionLoading: false, ownerId: 'runner', loaded: true, server: null, storeActive: false, storeCannotSell: false, ...over });
  // Le défaut : le cache du SDK PRIMAIT sur le reçu serveur, donc un achat vu
  // par le Store affirmait un droit que le serveur n'avait jamais confirmé.
  assertEquals(state({ storeActive: true }), { status: 'unavailable', active: false, reason: null });
  assertEquals(state({ storeActive: true, server: { ...receipt, active: false } }), { status: 'pending', active: false, reason: null });
  assertEquals(state({ storeActive: true, server: receipt }), { status: 'active', active: true, reason: 'server_entitlement' });
  assertEquals(state({ storeActive: false, server: receipt }), { status: 'active', active: true, reason: 'server_entitlement' });
});
Deno.test('G28 : lecture en cours, absence de compte et échec de lecture restent trois faits', () => {
  const state = (over: Partial<Parameters<typeof grydPlusAccessState2026>[0]> = {}) =>
    grydPlusAccessState2026({ sessionLoading: false, ownerId: 'runner', loaded: true, server: null, storeActive: false, storeCannotSell: false, ...over });
  assertEquals(state({ sessionLoading: true }).status, 'loading');
  assertEquals(state({ ownerId: null }).status, 'signedOut');
  assertEquals(state({ loaded: false }).status, 'loading');
  assertEquals(state().status, 'unavailable');
  assertEquals(state({ server: { active: false, expiresAt: null, lifetime: false, productId: null, verifiedAt: null } }).status, 'inactive');
});

/**
 * ─── LOT G : LES OUTILS GRYD+ SONT OUVERTS TANT QUE PERSONNE NE PEUT PAYER ──
 *
 * Décision fondateur du 11/09/2026, mot pour mot, à la question « ouvrir ou non
 * les outils GRYD+ (comparaisons privées, Studio) tant que rien n'est en
 * vente ? » : « ouvre, faut les mettre en place si quelqu'un paie ».
 *
 * ÉTAPE 0 — LE DÉFAUT EXISTAIT, ET IL ÉTAIT ÉCRIT DANS ADR-014 (écart n° 3) :
 * « Les outils GRYD+ restent murés derrière un droit que personne ne peut
 * obtenir. » Avant ce lot, `grydPlusAccessState2026` rendait `inactive` pour un
 * joueur connecté d'une boutique fermée — donc `/premium-analytics` et le Studio
 * affichaient leur mur à 100 % des comptes, définitivement. Les deux premiers
 * cas ci-dessous rejouent exactement cette situation.
 */
const RECU_INACTIF = { active: false, expiresAt: null, lifetime: false, productId: null, verifiedAt: null };
const preSale = (over: Partial<Parameters<typeof grydPlusAccessState2026>[0]> = {}) =>
  grydPlusAccessState2026({ sessionLoading: false, ownerId: 'runner', loaded: true, server: RECU_INACTIF, storeActive: false, storeCannotSell: true, ...over });

Deno.test('pré-vente : boutique fermée + compte connecté ⇒ les outils sont OUVERTS', () => {
  assertEquals(preSale(), { status: 'preSaleOpen', active: true, reason: 'pre_sale_open' });
});

Deno.test('pré-vente : boutique OUVERTE et aucun droit ⇒ les outils se referment', () => {
  // La règle de bascule, prise à l'endroit exact où elle se joue : le jour où
  // une offre est lue avec son prix, `storeCannotSell` retombe à faux et le
  // droit serveur redevient seul juge. Sans ce test, l'ouverture de la boutique
  // pourrait laisser les outils gratuits sans que personne ne s'en aperçoive.
  assertEquals(preSale({ storeCannotSell: false }), { status: 'inactive', active: false, reason: null });
  assertEquals(preSale({ storeCannotSell: false, storeActive: true }), { status: 'pending', active: false, reason: null });
});

Deno.test('pré-vente : une non-réponse n’ouvre rien (chargement, reçu illisible, sans compte)', () => {
  // « Les états loading / unavailable restent honnêtes » : ouvrir sur une
  // lecture en cours serait le même mensonge que fermer sur une lecture en
  // cours. Et sans compte, il n'y a aucune donnée personnelle à comparer.
  assertEquals(preSale({ sessionLoading: true }), { status: 'loading', active: false, reason: null });
  assertEquals(preSale({ loaded: false }), { status: 'loading', active: false, reason: null });
  assertEquals(preSale({ server: null }), { status: 'unavailable', active: false, reason: null });
  assertEquals(preSale({ ownerId: null }), { status: 'signedOut', active: false, reason: null });
});

Deno.test('pré-vente : un abonnement RÉEL garde son nom, il ne devient pas « inclus »', () => {
  // Un reçu serveur actif prime sur le régime de pré-vente : l'écran doit
  // pouvoir dire « Abonnement actif » plutôt que « Inclus gratuitement », sinon
  // il efface un paiement qui a bien eu lieu.
  const receipt = { active: true, expiresAt: '2030-01-01T00:00:00Z', lifetime: false, productId: 'monthly', verifiedAt: null };
  assertEquals(preSale({ server: receipt }), { status: 'active', active: true, reason: 'server_entitlement' });
});

Deno.test('pré-vente : le fait « personne ne peut payer » DESCEND de la boutique réelle', () => {
  // `storeCannotSell` n'est jamais un `true` en dur : il est dérivé de
  // `storeAvailability2026`. Les quatre motifs qui ouvrent sont des faits
  // établis ; les trois qui n'ouvrent pas n'affirment rien.
  const offre = { packageType: 'MONTHLY', identifier: 'MONTHLY', product: { identifier: 'MONTHLY', priceString: '6,99 €', price: 6.99, currencyCode: 'EUR' } };
  const sansPrix = { packageType: 'MONTHLY', identifier: 'MONTHLY', product: { identifier: 'MONTHLY', price: 6.99, currencyCode: 'EUR' } };
  const lire = (input: Parameters<typeof storeAvailability2026>[0]) => storeCannotSellYet2026(storeAvailability2026(input));
  // OUVRENT : pas de clé, plateforme sans achat, rien de publié, pas de prix.
  assertEquals(lire({ status: 'unavailable', offers: [], blockedReason: 'key_missing' }), true);
  assertEquals(lire({ status: 'unavailable', offers: [], blockedReason: 'platform_without_iap' }), true);
  assertEquals(lire({ status: 'empty', offers: [], blockedReason: null }), true);
  assertEquals(lire({ status: 'ready', offers: readSubscriptionOffers2026({ availablePackages: [sansPrix] }), blockedReason: null }), true);
  // N'OUVRENT PAS : on ne sait pas encore, ou on n'a pas su lire.
  assertEquals(lire({ status: 'loading', offers: [], blockedReason: null }), false);
  assertEquals(lire({ status: 'signedOut', offers: [], blockedReason: null }), false);
  assertEquals(lire({ status: 'error', offers: [], blockedReason: null }), false);
  // ET LA BASCULE : une offre lue AVEC son prix ferme la pré-vente.
  assertEquals(lire({ status: 'ready', offers: readSubscriptionOffers2026({ availablePackages: [offre] }), blockedReason: null }), false);
});
