/**
 * GRYD — engine/scout_ping.ts (§20.3 Scout Ping).
 * Fonctions PURES : validation d'activation, sélection du finding. Aucune I/O.
 */
import {
  SCOUT_PING_DURATION_HOURS,
  SCOUT_PING_MAX_PER_WEEK,
} from '@klaim/shared/game-rules';

const MS_PER_HOUR = 3_600_000;

export type ScoutPingKind = 'rival_weak' | 'rival_dense' | 'own_pressure';

export interface ScoutHexCandidate {
  h3index: string;
  ownerUserId: string;
  decayAt: Date | null;
  lastDefendedAt: Date | null;
}

export interface ScoutFinding {
  kind: ScoutPingKind;
  h3index: string;
  message: string;
}

export type ActivateScoutPingError =
  | 'unauthorized'
  | 'item_not_supported'
  | 'invalid_city'
  | 'item_not_owned'
  | 'weekly_cap'
  | 'no_finding';

export interface ActivateScoutPingInput {
  userId: string | null;
  itemKey: string;
  cityId: string | null;
  ownsItem: boolean;
  weekCount: number;
  now: Date;
}

export type ActivateScoutPingResult =
  | { ok: true; finding: ScoutFinding; expiresAt: Date; source: 'club' | 'inventory' }
  | { ok: false; reason: ActivateScoutPingError };

/** Valide les prérequis d'activation (caps, inventaire). */
export function validateActivateScoutPing(
  input: ActivateScoutPingInput,
): ActivateScoutPingResult | { ok: true; pending: true } {
  if (input.userId == null) return { ok: false, reason: 'unauthorized' };
  if (input.itemKey !== 'scout_ping') return { ok: false, reason: 'item_not_supported' };
  if (input.cityId == null || input.cityId.length < 2) {
    return { ok: false, reason: 'invalid_city' };
  }
  if (!input.ownsItem) return { ok: false, reason: 'item_not_owned' };
  if (input.weekCount >= SCOUT_PING_MAX_PER_WEEK) {
    return { ok: false, reason: 'weekly_cap' };
  }
  return { ok: true, pending: true };
}

/**
 * Choisit le meilleur finding parmi les hex de la ville (MVP).
 * Priorité : rival en decay urgent → secteur rival dense → pression sur zone à moi.
 */
export function pickScoutFinding(
  candidates: readonly ScoutHexCandidate[],
  myUserId: string,
  now: Date,
): ScoutFinding | null {
  if (candidates.length === 0) return null;

  const rivals = candidates.filter((c) => c.ownerUserId !== myUserId);
  const mine = candidates.filter((c) => c.ownerUserId === myUserId);

  const decayWindowMs = 72 * MS_PER_HOUR;
  const weakRival = rivals
    .filter((c) => c.decayAt != null && c.decayAt.getTime() - now.getTime() <= decayWindowMs)
    .sort((a, b) => (a.decayAt!.getTime() - b.decayAt!.getTime()))[0];
  if (weakRival) {
    return {
      kind: 'rival_weak',
      h3index: weakRival.h3index,
      message: 'Zone rivale affaiblie — fenêtre de reprise avant le decay.',
    };
  }

  if (rivals.length >= 5) {
    return {
      kind: 'rival_dense',
      h3index: rivals[0]!.h3index,
      message: `Front rival dense — ${rivals.length} zones adverses repérées dans la ville.`,
    };
  }

  const pressured = mine
    .filter((c) => c.lastDefendedAt != null)
    .sort((a, b) => a.lastDefendedAt!.getTime() - b.lastDefendedAt!.getTime())[0];
  if (pressured) {
    return {
      kind: 'own_pressure',
      h3index: pressured.h3index,
      message: 'Ta zone la moins défendue récemment — cours pour consolider.',
    };
  }

  if (rivals[0]) {
    return {
      kind: 'rival_dense',
      h3index: rivals[0].h3index,
      message: 'Cible rivale repérée — aucune capture automatique, info seulement.',
    };
  }

  return null;
}

export function scoutPingExpiresAt(now: Date): Date {
  return new Date(now.getTime() + SCOUT_PING_DURATION_HOURS * MS_PER_HOUR);
}

export function finalizeActivateScoutPing(
  input: ActivateScoutPingInput & { isClub: boolean; finding: ScoutFinding },
): ActivateScoutPingResult {
  const gate = validateActivateScoutPing(input);
  if (!('pending' in gate) || !gate.ok) return gate as ActivateScoutPingResult;
  const source: 'club' | 'inventory' = input.isClub && input.weekCount < 1 ? 'club' : 'inventory';
  return {
    ok: true,
    finding: input.finding,
    expiresAt: scoutPingExpiresAt(input.now),
    source,
  };
}
