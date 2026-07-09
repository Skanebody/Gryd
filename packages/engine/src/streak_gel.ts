/**
 * GRYD — engine/streak_gel.ts (§20.2 Streak Gel).
 * Fonctions PURES : validation d'activation, fenêtre mensuelle. Aucune I/O.
 */
import {
  STREAK_GEL_DURATION_DAYS,
  STREAK_GEL_MAX_PER_MONTH,
} from '@klaim/shared/game-rules';

const MS_PER_DAY = 86_400_000;

export type ActivateStreakGelError =
  | 'unauthorized'
  | 'item_not_supported'
  | 'item_not_owned'
  | 'monthly_cap'
  | 'already_active';

export interface ActivateStreakGelInput {
  userId: string | null;
  itemKey: string;
  ownsItem: boolean;
  monthCount: number;
  hasActiveGel: boolean;
  isClub: boolean;
  now: Date;
}

export type ActivateStreakGelResult =
  | { ok: true; source: 'club' | 'inventory'; expiresAt: Date }
  | { ok: false; reason: ActivateStreakGelError };

/** Premier jour du mois calendaire UTC (aligné date_trunc('month', … UTC)). */
export function monthStartUtc(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** Valide une activation Streak Gel (règles §20.2). */
export function validateActivateStreakGel(input: ActivateStreakGelInput): ActivateStreakGelResult {
  if (input.userId == null) return { ok: false, reason: 'unauthorized' };
  if (input.itemKey !== 'streak_gel') return { ok: false, reason: 'item_not_supported' };
  if (!input.ownsItem) return { ok: false, reason: 'item_not_owned' };
  if (input.hasActiveGel) return { ok: false, reason: 'already_active' };
  if (input.monthCount >= STREAK_GEL_MAX_PER_MONTH) {
    return { ok: false, reason: 'monthly_cap' };
  }

  const source: 'club' | 'inventory' = input.isClub && input.monthCount < 1
    ? 'club'
    : 'inventory';
  const expiresAt = new Date(input.now.getTime() + STREAK_GEL_DURATION_DAYS * MS_PER_DAY);
  return { ok: true, source, expiresAt };
}
