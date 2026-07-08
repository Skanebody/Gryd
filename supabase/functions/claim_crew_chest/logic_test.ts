/**
 * Tests claim_crew_chest/logic.ts — paliers §39.2, validation réclamation.
 */
import { assertEquals } from 'jsr:@std/assert@^1';
import {
  CREW_CHEST_TIER_FOULEES,
  CREW_CHEST_UNLOCK_LEVEL,
  CREW_CHEST_WEEKLY_TARGET,
} from '../_shared/game-rules.ts';
import { isoWeekStart, resolveChestTier, validateChestClaim } from './logic.ts';

Deno.test('isoWeekStart : mercredi 8 juillet 2026 → lundi 6 juillet', () => {
  assertEquals(isoWeekStart(new Date('2026-07-08T12:00:00Z')), '2026-07-06');
});

Deno.test('resolveChestTier : progress bronze sans tier_reached figé', () => {
  const progress = Math.floor(CREW_CHEST_WEEKLY_TARGET * 0.3);
  assertEquals(resolveChestTier(progress, null), 'bronze');
});

Deno.test('resolveChestTier : tier_reached figé prime sur progress courant', () => {
  assertEquals(resolveChestTier(0, 'gold'), 'gold');
});

Deno.test('validateChestClaim : niveau crew insuffisant', () => {
  assertEquals(
    validateChestClaim({
      crewLevel: CREW_CHEST_UNLOCK_LEVEL - 1,
      progress: CREW_CHEST_WEEKLY_TARGET,
      tierReached: null,
      claimedAt: null,
    }),
    { ok: false, reason: 'crew_level_too_low' },
  );
});

Deno.test('validateChestClaim : déjà réclamé', () => {
  assertEquals(
    validateChestClaim({
      crewLevel: CREW_CHEST_UNLOCK_LEVEL,
      progress: CREW_CHEST_WEEKLY_TARGET,
      tierReached: 'gold',
      claimedAt: '2026-07-01T00:00:00Z',
    }),
    { ok: false, reason: 'already_claimed' },
  );
});

Deno.test('validateChestClaim : palier atteint → ok', () => {
  const result = validateChestClaim({
    crewLevel: CREW_CHEST_UNLOCK_LEVEL,
    progress: Math.floor(CREW_CHEST_WEEKLY_TARGET * 0.5),
    tierReached: null,
    claimedAt: null,
  });
  assertEquals(result.ok, true);
  if (result.ok) assertEquals(result.tier, 'silver');
});

Deno.test('CREW_CHEST_TIER_FOULEES : croissant par palier', () => {
  assertEquals(CREW_CHEST_TIER_FOULEES.bronze < CREW_CHEST_TIER_FOULEES.elite, true);
});
