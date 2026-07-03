/**
 * Tests rc_webhook/logic.ts — SPEC §5.1 (SKUs RevenueCat).
 * Purs : events construits en mémoire, aucun réseau.
 */
import { assertEquals } from 'jsr:@std/assert@^1';
import { ECLATS_PACKS, SKUS, STARTER_PACK_ECLATS } from '../_shared/game-rules.ts';
import { mapRevenueCatEvent, type RevenueCatEvent } from './logic.ts';

const USER = 'a3d5e7f9-0000-0000-0000-000000000001';

function event(over: Partial<RevenueCatEvent> = {}): RevenueCatEvent {
  return {
    id: 'evt-001',
    type: 'INITIAL_PURCHASE',
    app_user_id: USER,
    product_id: SKUS.clubMonthly,
    price: 4.99,
    ...over,
  };
}

// ─── Club : on/off ───────────────────────────────────────────────────────────

Deno.test('INITIAL_PURCHASE club_monthly → club_on', () => {
  const d = mapRevenueCatEvent(event());
  assertEquals(d, {
    kind: 'club_on',
    rcEventId: 'evt-001',
    userId: USER,
    sku: SKUS.clubMonthly,
    price: 4.99,
  });
});

Deno.test('RENEWAL club_annual → club_on (ré-affirme l’entitlement, rien d’autre)', () => {
  const d = mapRevenueCatEvent(event({ type: 'RENEWAL', product_id: SKUS.clubAnnual }));
  assertEquals(d.kind, 'club_on');
});

Deno.test('CANCELLATION club → ignore (l’accès court jusqu’à EXPIRATION)', () => {
  const d = mapRevenueCatEvent(event({ type: 'CANCELLATION' }));
  assertEquals(d.kind, 'ignore');
});

Deno.test('EXPIRATION club → club_off', () => {
  const d = mapRevenueCatEvent(event({ type: 'EXPIRATION', price: undefined }));
  assertEquals(d, {
    kind: 'club_off',
    rcEventId: 'evt-001',
    userId: USER,
    sku: SKUS.clubMonthly,
    price: null,
  });
});

Deno.test('UNCANCELLATION club → club_on', () => {
  const d = mapRevenueCatEvent(event({ type: 'UNCANCELLATION' }));
  assertEquals(d.kind, 'club_on');
});

// ─── Éclats (consommables §5.1) ──────────────────────────────────────────────

Deno.test('NON_RENEWING_PURCHASE eclats_s/m/l → credit_eclats aux montants du pack', () => {
  for (const sku of Object.keys(ECLATS_PACKS) as Array<keyof typeof ECLATS_PACKS>) {
    const d = mapRevenueCatEvent(
      event({ type: 'NON_RENEWING_PURCHASE', product_id: sku }),
    );
    assertEquals(d.kind, 'credit_eclats');
    if (d.kind === 'credit_eclats') assertEquals(d.eclats, ECLATS_PACKS[sku]);
  }
  // Garde-fou : les montants gelés du §5.1.
  assertEquals(ECLATS_PACKS, { eclats_s: 100, eclats_m: 320, eclats_l: 720 });
});

Deno.test('RENEWAL sur un SKU eclats → ignore (jamais de double crédit)', () => {
  const d = mapRevenueCatEvent(event({ type: 'RENEWAL', product_id: SKUS.eclatsM }));
  assertEquals(d.kind, 'ignore');
});

// ─── Starter pack ────────────────────────────────────────────────────────────

Deno.test('NON_RENEWING_PURCHASE starter_pack → starter_pack + STARTER_PACK_ECLATS', () => {
  const d = mapRevenueCatEvent(
    event({ type: 'NON_RENEWING_PURCHASE', product_id: SKUS.starterPack, price: 2.99 }),
  );
  assertEquals(d, {
    kind: 'starter_pack',
    rcEventId: 'evt-001',
    userId: USER,
    sku: SKUS.starterPack,
    eclats: STARTER_PACK_ECLATS,
    price: 2.99,
  });
});

Deno.test('EXPIRATION sur starter_pack (anomalie) → ignore', () => {
  const d = mapRevenueCatEvent(
    event({ type: 'EXPIRATION', product_id: SKUS.starterPack }),
  );
  assertEquals(d.kind, 'ignore');
});

// ─── Ignorés ─────────────────────────────────────────────────────────────────

Deno.test('event type inconnu (TEST, TRANSFER…) sans SKU connu → ignore', () => {
  for (const type of ['TEST', 'TRANSFER', 'SUBSCRIBER_ALIAS']) {
    const d = mapRevenueCatEvent(event({ type, product_id: undefined }));
    assertEquals(d.kind, 'ignore');
  }
});

Deno.test('SKU inconnu → ignore (acquitté sans effet)', () => {
  const d = mapRevenueCatEvent(event({ product_id: 'skin_gold_x' }));
  assertEquals(d.kind, 'ignore');
});

Deno.test('payload incomplet (pas d’id / pas d’app_user_id) → ignore', () => {
  assertEquals(mapRevenueCatEvent(event({ id: undefined })).kind, 'ignore');
  assertEquals(mapRevenueCatEvent(event({ app_user_id: undefined })).kind, 'ignore');
});
