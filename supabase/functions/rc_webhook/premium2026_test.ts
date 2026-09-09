import { assertEquals } from 'jsr:@std/assert@^1';
import { parsePremiumSnapshot2026, premiumSnapshotMayReplace2026, premiumWebhookOwners2026 } from '../_shared/premium2026.ts';
const NOW = Date.parse('2026-09-09T12:00:00Z');
const payload = (entry: unknown = { product_identifier: 'annual', expires_date: '2027-09-09T12:00:00Z' }, subscription = {}) => ({ request_date_ms: NOW, subscriber: { entitlements: entry ? { gryd_pro: entry } : {}, subscriptions: { annual: { is_sandbox: false, ...subscription } } } });
Deno.test('premium snapshot: only matching server entitlement grants access', () => {
  assertEquals(parsePremiumSnapshot2026(payload(), 'gryd_pro', false)?.active, true);
  assertEquals(parsePremiumSnapshot2026(payload(), 'unrelated', false)?.active, false);
});
Deno.test('premium snapshot: expiry boundary closes tools', () => {
  assertEquals(parsePremiumSnapshot2026(payload({ product_identifier: 'annual', expires_date: new Date(NOW).toISOString() }), 'gryd_pro', false)?.active, false);
});
Deno.test('premium snapshot: missing or invalid expiry never grants lifetime', () => {
  for (const expires_date of [undefined, '', 'broken']) assertEquals(parsePremiumSnapshot2026(payload({ product_identifier: 'annual', expires_date }), 'gryd_pro', false), null);
});
Deno.test('premium snapshot: real legacy lifetime retained, malformed response rejected', () => {
  assertEquals(parsePremiumSnapshot2026(payload({ product_identifier: 'annual', expires_date: null }), 'gryd_pro', false)?.lifetime, true);
  for (const input of [null, {}, { subscriber: { entitlements: {} } }, { ...payload(), request_date_ms: -1 }]) assertEquals(parsePremiumSnapshot2026(input, 'gryd_pro', false), null);
});
Deno.test('premium snapshot: grace extends access, refund revokes immediately', () => {
  const entry = { product_identifier: 'annual', expires_date: '2026-09-08T12:00:00Z' };
  assertEquals(parsePremiumSnapshot2026(payload(entry, { grace_period_expires_date: '2026-09-12T12:00:00Z' }), 'gryd_pro', false)?.active, true);
  assertEquals(parsePremiumSnapshot2026(payload(undefined, { refunded_at: '2026-09-09T11:00:00Z' }), 'gryd_pro', false)?.active, false);
});
Deno.test('premium snapshot: sandbox requires explicit server opt-in', () => {
  assertEquals(parsePremiumSnapshot2026(payload(undefined, { is_sandbox: true }), 'gryd_pro', false)?.active, false);
  assertEquals(parsePremiumSnapshot2026(payload(undefined, { is_sandbox: true }), 'gryd_pro', true)?.active, true);
});
Deno.test('premium transfer: refresh both sides once, never grant an anonymous id', () => {
  const a = '00000000-0000-4000-8000-000000000001', b = '00000000-0000-4000-8000-000000000002';
  assertEquals(premiumWebhookOwners2026({ type: 'TRANSFER', transferred_from: [a, '$RCAnonymousID:x'], transferred_to: [a, b] }), [a, b]);
  assertEquals(premiumWebhookOwners2026({ type: 'RENEWAL', app_user_id: a }), [a]);
});
Deno.test('premium ordering: stale snapshots cannot reopen refunded access', () => {
  assertEquals(premiumSnapshotMayReplace2026({ event: 2, observed: 10 }, { event: 1, observed: 9, active: true }), false);
  assertEquals(premiumSnapshotMayReplace2026({ event: 2, observed: 10 }, { event: 9, observed: 10, active: true }), false);
  assertEquals(premiumSnapshotMayReplace2026({ event: 2, observed: 10 }, { event: 1, observed: 10, active: false }), true);
  // An old webhook is allowed to trigger a genuinely newer authoritative API read.
  assertEquals(premiumSnapshotMayReplace2026({ event: 2, observed: 10 }, { event: 1, observed: 11, active: false }), true);
});

Deno.test('premium snapshot: lifetime sandbox is checked in non-subscription receipts', () => {
  const body = { request_date_ms: NOW, subscriber: { entitlements: { gryd_pro: { product_identifier: 'lifetime', expires_date: null } }, non_subscriptions: { lifetime: [{ purchase_date: '2020-01-01', is_sandbox: true }] } } };
  assertEquals(parsePremiumSnapshot2026(body, 'gryd_pro', false)?.active, false);
  assertEquals(parsePremiumSnapshot2026(body, 'gryd_pro', true)?.active, true);
  assertEquals(parsePremiumSnapshot2026({ ...body, subscriber: { ...body.subscriber, non_subscriptions: {} } }, 'gryd_pro', false), null);
});
