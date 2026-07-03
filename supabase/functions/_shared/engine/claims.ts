// GÉNÉRÉ par scripts/sync-game-rules.mjs — ne pas éditer.
// Source : packages/engine/src/claims.ts

/**
 * GRYD — engine/claims.ts
 * Décision des claims par hex (SPEC §3.3/§3.4 + AMENDEMENT-02 §2/§3 + §6.4).
 *
 * Fonction PURE : l'état existant et le contexte sont fournis par l'appelant,
 * la sortie est appliquée atomiquement par la RPC claim_hexes. Tout claim est
 * décidé ICI, côté serveur — jamais par le client, jamais par la RPC.
 *
 * Ordre de décision par hex (gelé, testé) :
 *   1. zone non capturable        → blocked_no_capture_zone
 *   2. zone privée                → blocked_privacy
 *   3. plafond MAX_CLAIMS_PER_DAY → blocked_daily_cap
 *   4. déjà à moi                 → defended (+3 si dernière défense > 24 h)
 *                                   | already_owned_cooldown (0 pt)
 *                                   — decay repoussé dans les deux cas
 *   5. neutre                     → claimed_neutral (+10, + bonus pionnier par
 *                                   densité si jamais possédé)
 *   6. adverse : lock actif       → blocked_lock
 *                bouclier actif   → blocked_shield
 *                propriétaire<14j → blocked_new_player
 *                sinon            → stolen (+15)
 */
import {
  DECAY_DAYS,
  DEFEND_COOLDOWN_HOURS,
  HEX_LOCK_HOURS,
  MAX_CLAIMS_PER_DAY,
  NEW_PLAYER_PROTECTION_DAYS,
  POINTS_DEFENDED_HEX,
  POINTS_NEUTRAL_HEX,
  POINTS_PIONEER_BONUS_BY_DENSITY,
  POINTS_STOLEN_HEX,
  type ZoneDensity,
} from '../game-rules.ts';
import type { HexClaimResult } from '../types.ts';

// Conversions d'unités — pas des règles de jeu.
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

/** État DB existant d'un hex. Absent de la map = hex jamais possédé. */
export interface HexState {
  /** null = hex neutre (decayé) mais déjà possédé dans l'histoire de la carte. */
  ownerUserId: string | null;
  lockedUntil: Date | null;
  shieldedUntil: Date | null;
  decayAt: Date | null;
  /** Dernière défense (approximé par decay_at - DECAY_DAYS côté I/O). */
  lastDefendedAt: Date | null;
  /** true si l'hex a déjà eu un propriétaire (bonus pionnier = jamais possédé). */
  everOwned: boolean;
}

export interface DecideClaimsContext {
  userId: string;
  /** Création du compte du COUREUR (exemption de decay < 14 j, §3.3). */
  userCreatedAt: Date;
  now: Date;
  /** Date de création de compte par ownerUserId (protection nouveau joueur). */
  ownersCreatedAt: ReadonlyMap<string, Date>;
  /** Hexes res 10 dans une zone privée du coureur (§7). */
  privacyHexes: ReadonlySet<string>;
  /** Hexes res 10 non capturables (autoroutes, zones militaires… AMENDEMENT-02 §2). */
  noCaptureHexes: ReadonlySet<string>;
  /** Densité par hex, ou densité globale de la course. Hex inconnu → 'wild'. */
  zoneDensity: ZoneDensity | ReadonlyMap<string, ZoneDensity>;
  /** Hexes déjà claimés/défendus aujourd'hui AVANT cette course (§6.4). */
  claimsToday: number;
}

export interface DecideClaimsInput {
  /** Cellules H3 res 10 (strings) traversées par la trace claimable. */
  hexes: readonly string[];
  states: ReadonlyMap<string, HexState>;
  context: DecideClaimsContext;
}

export interface DecideClaimsTotals {
  claimed: number;
  stolen: number;
  /** Inclut les défenses en cooldown (0 pt) : l'hex est bien re-parcouru. */
  defended: number;
  pioneer: number;
  blocked: number;
  /** Points BRUTS (barème §3.4), avant multiplicateurs streak/performance. */
  points: number;
}

export interface DecideClaimsResult {
  results: HexClaimResult[];
  totals: DecideClaimsTotals;
  /** locked_until à poser sur les hexes pris : now + HEX_LOCK_HOURS. */
  lockedUntil: Date;
  /** decay_at à poser : now + DECAY_DAYS. */
  decayAt: Date;
  /**
   * true si le coureur a < NEW_PLAYER_PROTECTION_DAYS : son territoire est
   * exempt de decay (§3.3) → l'appelant pose decay_at = null en DB.
   */
  decayExempt: boolean;
}

function densityFor(
  zoneDensity: ZoneDensity | ReadonlyMap<string, ZoneDensity>,
  hex: string,
): ZoneDensity {
  if (typeof zoneDensity === 'string') return zoneDensity;
  return zoneDensity.get(hex) ?? 'wild'; // défaut hors zone connue : sauvage
}

export function decideClaims(input: DecideClaimsInput): DecideClaimsResult {
  const { states, context } = input;
  const { userId, now } = context;
  const nowMs = now.getTime();

  const isActive = (until: Date | null): boolean => until !== null && until.getTime() > nowMs;

  const results: HexClaimResult[] = [];
  const totals: DecideClaimsTotals = {
    claimed: 0,
    stolen: 0,
    defended: 0,
    pioneer: 0,
    blocked: 0,
    points: 0,
  };
  // Compteur pour le plafond §6.4 : claims/défenses du jour + ceux de cette course.
  let countedToday = context.claimsToday;
  const seen = new Set<string>();

  for (const hex of input.hexes) {
    if (seen.has(hex)) continue;
    seen.add(hex);

    const push = (r: HexClaimResult) => {
      results.push(r);
      totals.points += r.points;
      if (r.pioneer) totals.pioneer++;
      switch (r.outcome) {
        case 'claimed_neutral':
          totals.claimed++;
          countedToday++;
          break;
        case 'stolen':
          totals.stolen++;
          countedToday++;
          break;
        case 'defended':
        case 'already_owned_cooldown':
          totals.defended++;
          countedToday++;
          break;
        default:
          totals.blocked++;
      }
    };

    // 1-2. Zones interdites au claim.
    if (context.noCaptureHexes.has(hex)) {
      push({ h3: hex, outcome: 'blocked_no_capture_zone', points: 0, pioneer: false });
      continue;
    }
    if (context.privacyHexes.has(hex)) {
      push({ h3: hex, outcome: 'blocked_privacy', points: 0, pioneer: false });
      continue;
    }
    // 3. Plafond quotidien (§6.4).
    if (countedToday >= MAX_CLAIMS_PER_DAY) {
      push({ h3: hex, outcome: 'blocked_daily_cap', points: 0, pioneer: false });
      continue;
    }

    const state = states.get(hex);
    // Un hex dont le decay est échu est neutre même si la ligne DB existe encore
    // (le cron decay_job peut ne pas être passé).
    const decayed = state !== undefined && state.decayAt !== null &&
      state.decayAt.getTime() <= nowMs;
    const owner = state !== undefined && !decayed ? state.ownerUserId : null;

    // 4. Déjà à moi → défense (decay repoussé dans les deux cas, §3.3/§3.4).
    if (owner === userId) {
      const lastDefended = state?.lastDefendedAt ?? null;
      const cooldownActive = lastDefended !== null &&
        nowMs - lastDefended.getTime() < DEFEND_COOLDOWN_HOURS * MS_PER_HOUR;
      push(
        cooldownActive
          ? { h3: hex, outcome: 'already_owned_cooldown', points: 0, pioneer: false }
          : { h3: hex, outcome: 'defended', points: POINTS_DEFENDED_HEX, pioneer: false },
      );
      continue;
    }

    // 5. Neutre → capture (+ bonus pionnier par densité si jamais possédé).
    if (owner === null) {
      const pioneer = state === undefined || !state.everOwned;
      const points = POINTS_NEUTRAL_HEX +
        (pioneer ? POINTS_PIONEER_BONUS_BY_DENSITY[densityFor(context.zoneDensity, hex)] : 0);
      push({ h3: hex, outcome: 'claimed_neutral', points, pioneer });
      continue;
    }

    // 6. Adverse : protections puis vol.
    if (isActive(state?.lockedUntil ?? null)) {
      push({ h3: hex, outcome: 'blocked_lock', points: 0, pioneer: false });
      continue;
    }
    if (isActive(state?.shieldedUntil ?? null)) {
      push({ h3: hex, outcome: 'blocked_shield', points: 0, pioneer: false });
      continue;
    }
    const ownerCreatedAt = context.ownersCreatedAt.get(owner);
    const ownerProtected = ownerCreatedAt !== undefined &&
      nowMs - ownerCreatedAt.getTime() < NEW_PLAYER_PROTECTION_DAYS * MS_PER_DAY;
    if (ownerProtected) {
      push({ h3: hex, outcome: 'blocked_new_player', points: 0, pioneer: false });
      continue;
    }
    push({ h3: hex, outcome: 'stolen', points: POINTS_STOLEN_HEX, pioneer: false });
  }

  return {
    results,
    totals,
    lockedUntil: new Date(nowMs + HEX_LOCK_HOURS * MS_PER_HOUR),
    decayAt: new Date(nowMs + DECAY_DAYS * MS_PER_DAY),
    decayExempt: nowMs - context.userCreatedAt.getTime() <
      NEW_PLAYER_PROTECTION_DAYS * MS_PER_DAY,
  };
}
