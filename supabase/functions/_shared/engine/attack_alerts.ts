// GÉNÉRÉ par scripts/sync-game-rules.mjs — ne pas éditer.
// Source : packages/engine/src/attack_alerts.ts

/**
 * GRYD — engine/attack_alerts.ts (option A monétisation).
 * Fonctions PURES : collecte des hits rivaux, validation d'activation,
 * construction des payloads de notification. Aucune I/O.
 */
import {
  ATTACK_ALERT_CLUB_INCLUDED_PER_WEEK,
  ATTACK_ALERT_CREW_WEEKLY_CAP,
  ATTACK_ALERT_DURATION_HOURS,
  ATTACK_ALERT_FRESH_CAPTURE_MAX_HOURS,
  ATTACK_ALERT_MAX_PER_WEEK,
} from '../game-rules.ts';
import type { HexOutcome } from '../types.ts';

const MS_PER_HOUR = 3_600_000;

/** Outcomes rivaux qui déclenchent une alerte d'attaque (sans bloquer la capture). */
export const RIVAL_ATTACK_OUTCOMES = new Set<HexOutcome>([
  'stolen',
  'blocked_lock',
  'blocked_shield',
  'blocked_fresh_protection',
  'blocked_new_player',
]);

export function h3ToDb(h3: string): string {
  return BigInt(`0x${h3}`).toString();
}

export interface AttackAlertHit {
  defenderId: string;
  h3Db: string;
  outcome: HexOutcome;
}

export interface HexStateForAlert {
  ownerUserId: string | null;
}

export interface ClaimResultForAlert {
  h3: string;
  outcome: HexOutcome;
}

/** Hexes rivaux ciblés par l'attaquant (outcomes qui déclenchent une alerte). */
export function collectAttackAlertHits(
  attackerId: string,
  results: readonly ClaimResultForAlert[],
  states: ReadonlyMap<string, HexStateForAlert>,
): AttackAlertHit[] {
  const hits: AttackAlertHit[] = [];
  for (const r of results) {
    if (!RIVAL_ATTACK_OUTCOMES.has(r.outcome)) continue;
    const owner = states.get(r.h3)?.ownerUserId ?? null;
    if (!owner || owner === attackerId) continue;
    hits.push({ defenderId: owner, h3Db: h3ToDb(r.h3), outcome: r.outcome });
  }
  return hits;
}

export interface ActiveAttackAlert {
  userId: string;
  h3Db: string;
}

export interface AttackAlertNotificationPayload {
  title: string;
  body: string;
  h3index: string;
  outcome: HexOutcome;
  cta: string;
  href: string;
}

export interface AttackAlertNotificationRow {
  user_id: string;
  type: 'steal';
  priority: number;
  payload: AttackAlertNotificationPayload;
}

/** Filtre les hits par alertes actives et construit les lignes notifications. */
export function buildAttackAlertNotifications(
  hits: readonly AttackAlertHit[],
  alerts: readonly ActiveAttackAlert[],
  stealAlertPriority: number,
): AttackAlertNotificationRow[] {
  if (hits.length === 0 || alerts.length === 0) return [];

  const alertSet = new Set(alerts.map((a) => `${a.userId}:${a.h3Db}`));
  return hits
    .filter((h) => alertSet.has(`${h.defenderId}:${h.h3Db}`))
    .map((h) => ({
      user_id: h.defenderId,
      type: 'steal' as const,
      priority: stealAlertPriority,
      payload: {
        title: 'Zone sous pression',
        body: h.outcome === 'stolen'
          ? "Une zone surveillée vient d'être reprise — défends si tu peux."
          : "Quelqu'un cible une zone que tu surveilles — cours pour défendre.",
        h3index: h.h3Db,
        outcome: h.outcome,
        cta: 'Défendre',
        href: '/',
      },
    }));
}

// ─── Activation attack_alert (miroir RPC activate_arsenal_item) ───────────────

export type ActivateAttackAlertError =
  | 'unauthorized'
  | 'item_not_supported'
  | 'invalid_hex'
  | 'item_not_owned'
  | 'hex_not_owned'
  | 'hex_not_fresh'
  | 'weekly_cap_user'
  | 'weekly_cap_crew'
  | 'already_active';

export interface ActivateAttackAlertInput {
  userId: string | null;
  itemKey: string;
  h3index: string;
  ownsItem: boolean;
  hexOwnerId: string | null;
  claimedAt: Date | null;
  userWeekCount: number;
  crewWeekCount: number | null;
  hasActiveAlertOnHex: boolean;
  isClub: boolean;
  now: Date;
}

export type ActivateAttackAlertResult =
  | { ok: true; source: 'club' | 'inventory'; expiresAt: Date }
  | { ok: false; reason: ActivateAttackAlertError };

/** Lundi 00:00 UTC de la semaine courante (aligné date_trunc('week', … UTC)). */
export function isoWeekStartUtc(now: Date): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function isHexFresh(claimedAt: Date | null, now: Date): boolean {
  if (claimedAt == null) return false;
  const maxAgeMs = ATTACK_ALERT_FRESH_CAPTURE_MAX_HOURS * MS_PER_HOUR;
  return now.getTime() - claimedAt.getTime() <= maxAgeMs;
}

/** Valide une activation Alerte d'attaque (règles §20 option A). */
export function validateActivateAttackAlert(input: ActivateAttackAlertInput): ActivateAttackAlertResult {
  if (input.userId == null) return { ok: false, reason: 'unauthorized' };
  if (input.itemKey !== 'attack_alert') return { ok: false, reason: 'item_not_supported' };
  if (input.h3index.length < 4) return { ok: false, reason: 'invalid_hex' };
  if (!input.ownsItem) return { ok: false, reason: 'item_not_owned' };
  if (input.hexOwnerId == null || input.hexOwnerId !== input.userId) {
    return { ok: false, reason: 'hex_not_owned' };
  }
  if (!isHexFresh(input.claimedAt, input.now)) return { ok: false, reason: 'hex_not_fresh' };
  if (input.userWeekCount >= ATTACK_ALERT_MAX_PER_WEEK) {
    return { ok: false, reason: 'weekly_cap_user' };
  }
  if (input.crewWeekCount != null && input.crewWeekCount >= ATTACK_ALERT_CREW_WEEKLY_CAP) {
    return { ok: false, reason: 'weekly_cap_crew' };
  }
  if (input.hasActiveAlertOnHex) return { ok: false, reason: 'already_active' };

  const source: 'club' | 'inventory' = input.isClub && input.userWeekCount < ATTACK_ALERT_CLUB_INCLUDED_PER_WEEK
    ? 'club'
    : 'inventory';
  const expiresAt = new Date(input.now.getTime() + ATTACK_ALERT_DURATION_HOURS * MS_PER_HOUR);
  return { ok: true, source, expiresAt };
}
