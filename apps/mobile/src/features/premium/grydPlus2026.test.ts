import { assertEquals } from 'jsr:@std/assert@^1';
import { readServerGrydPlusAccess2026 } from './access2026.ts';
import { activitiesInPeriod2026, comparisonPeriods2026, summarizeComparison2026 } from './comparison2026.ts';
import { readSubscriptionOffers2026, yearlySavingsPercent } from './offerings.ts';
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
