/**
 * GRYD — logique pure réclamation coffre crew hebdo (§39.2-§39.4).
 */
import {
  CREW_CHEST_UNLOCK_LEVEL,
  type CrewChestTier,
} from '../_shared/game-rules.ts';
import { chestTierFor } from '../_shared/engine/crew.ts';

/** Lundi ISO ('YYYY-MM-DD') de la semaine d'une date (UTC). */
export function isoWeekStart(now: Date): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

export type ClaimRejectReason =
  | 'not_in_crew'
  | 'crew_level_too_low'
  | 'no_chest_row'
  | 'not_claimable'
  | 'already_claimed';

export interface ClaimValidationInput {
  crewLevel: number;
  progress: number;
  tierReached: string | null;
  claimedAt: string | null;
}

export function resolveChestTier(
  progress: number,
  tierReached: string | null,
): CrewChestTier | null {
  if (tierReached !== null && tierReached.length > 0) {
    return tierReached as CrewChestTier;
  }
  return chestTierFor(progress);
}

export function validateChestClaim(
  input: ClaimValidationInput,
): { ok: true; tier: CrewChestTier } | { ok: false; reason: ClaimRejectReason } {
  if (input.crewLevel < CREW_CHEST_UNLOCK_LEVEL) {
    return { ok: false, reason: 'crew_level_too_low' };
  }
  if (input.claimedAt !== null) {
    return { ok: false, reason: 'already_claimed' };
  }
  const tier = resolveChestTier(input.progress, input.tierReached);
  if (tier === null) {
    return { ok: false, reason: 'not_claimable' };
  }
  return { ok: true, tier };
}
