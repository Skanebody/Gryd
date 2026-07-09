/**
 * Tests Streak Gel (§20.2) — validation activation pure. AUCUN réseau.
 */
import { assertEquals } from 'jsr:@std/assert@^1';
import {
  STREAK_GEL_DURATION_DAYS,
  STREAK_GEL_MAX_PER_MONTH,
} from '../_shared/game-rules.ts';
import {
  monthStartUtc,
  validateActivateStreakGel,
} from '../_shared/engine/streak_gel.ts';

const MS_PER_DAY = 86_400_000;
const NOW = new Date('2026-07-08T12:00:00Z');

function baseActivate(overrides: Partial<Parameters<typeof validateActivateStreakGel>[0]> = {}) {
  return validateActivateStreakGel({
    userId: 'user-1',
    itemKey: 'streak_gel',
    ownsItem: true,
    monthCount: 0,
    hasActiveGel: false,
    isClub: false,
    now: NOW,
    ...overrides,
  });
}

Deno.test('validateActivateStreakGel : activation OK → 7 j, source inventory', () => {
  const r = baseActivate();
  assertEquals(r.ok, true);
  if (r.ok) {
    assertEquals(r.source, 'inventory');
    assertEquals(
      r.expiresAt.getTime() - NOW.getTime(),
      STREAK_GEL_DURATION_DAYS * MS_PER_DAY,
    );
  }
});

Deno.test('validateActivateStreakGel : Club 1ère du mois → source club', () => {
  const r = baseActivate({ isClub: true, monthCount: 0 });
  assertEquals(r.ok, true);
  if (r.ok) assertEquals(r.source, 'club');
});

Deno.test('validateActivateStreakGel : cap mensuel', () => {
  const r = baseActivate({ monthCount: STREAK_GEL_MAX_PER_MONTH });
  assertEquals(r, { ok: false, reason: 'monthly_cap' });
});

Deno.test('validateActivateStreakGel : gel déjà actif', () => {
  const r = baseActivate({ hasActiveGel: true });
  assertEquals(r, { ok: false, reason: 'already_active' });
});

Deno.test('validateActivateStreakGel : item non supporté', () => {
  const r = baseActivate({ itemKey: 'attack_alert' });
  assertEquals(r, { ok: false, reason: 'item_not_supported' });
});

Deno.test('monthStartUtc : 8 juillet 2026 → 1er juillet UTC', () => {
  assertEquals(monthStartUtc(new Date('2026-07-08T12:00:00Z')).toISOString(), '2026-07-01T00:00:00.000Z');
});
