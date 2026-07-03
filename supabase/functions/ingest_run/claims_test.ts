/**
 * Tests claims.ts — SPEC §3.3/§3.4, AMENDEMENT-02 §2/§3, §6.4.
 * Purs : états et contexte construits en mémoire, aucun réseau.
 */
import { assert, assertEquals } from 'jsr:@std/assert@^1';
import {
  DECAY_DAYS,
  HEX_LOCK_HOURS,
  MAX_CLAIMS_PER_DAY,
  POINTS_DEFENDED_HEX,
  POINTS_NEUTRAL_HEX,
  POINTS_PIONEER_BONUS_BY_DENSITY,
  POINTS_STOLEN_HEX,
  type ZoneDensity,
} from '../_shared/game-rules.ts';
import { decideClaims, type DecideClaimsContext, type HexState } from '../_shared/engine/claims.ts';

const NOW = new Date('2026-07-03T10:00:00Z');
const ME = 'user-me';
const FOE = 'user-foe';
const HEX = '8a1fb46622dffff';
const HEX2 = '8a1fb46622e7fff';

const MS_H = 3_600_000;
const MS_D = 86_400_000;
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * MS_H);
const hoursAhead = (h: number) => new Date(NOW.getTime() + h * MS_H);
const daysAgo = (d: number) => new Date(NOW.getTime() - d * MS_D);

function ctx(over: Partial<DecideClaimsContext> = {}): DecideClaimsContext {
  return {
    userId: ME,
    userCreatedAt: daysAgo(60),
    now: NOW,
    ownersCreatedAt: new Map([[FOE, daysAgo(90)]]),
    privacyHexes: new Set(),
    noCaptureHexes: new Set(),
    zoneDensity: 'active',
    claimsToday: 0,
    ...over,
  };
}

function foeHex(over: Partial<HexState> = {}): HexState {
  return {
    ownerUserId: FOE,
    lockedUntil: null,
    shieldedUntil: null,
    decayAt: hoursAhead(24 * 10), // decay loin dans le futur
    lastDefendedAt: hoursAgo(48),
    everOwned: true,
    ...over,
  };
}

function one(hexes: string[], states: Map<string, HexState>, context: DecideClaimsContext) {
  return decideClaims({ hexes, states, context });
}

// ─── Neutre + pionnier par densité (AMENDEMENT-02 §3) ────────────────────────

Deno.test('hex jamais possédé → claimed_neutral + bonus pionnier par densité', () => {
  const cases: Array<[ZoneDensity, number]> = [
    ['active', POINTS_NEUTRAL_HEX + POINTS_PIONEER_BONUS_BY_DENSITY.active], // 10 + 5
    ['emerging', POINTS_NEUTRAL_HEX + POINTS_PIONEER_BONUS_BY_DENSITY.emerging], // 10 + 8
    ['pioneer', POINTS_NEUTRAL_HEX + POINTS_PIONEER_BONUS_BY_DENSITY.pioneer], // 10 + 10
  ];
  assertEquals(POINTS_PIONEER_BONUS_BY_DENSITY.active, 5);
  assertEquals(POINTS_PIONEER_BONUS_BY_DENSITY.emerging, 8);
  assertEquals(POINTS_PIONEER_BONUS_BY_DENSITY.pioneer, 10);
  for (const [density, expected] of cases) {
    const r = one([HEX], new Map(), ctx({ zoneDensity: density }));
    assertEquals(r.results, [
      { h3: HEX, outcome: 'claimed_neutral', points: expected, pioneer: true },
    ]);
    assertEquals(r.totals.claimed, 1);
    assertEquals(r.totals.pioneer, 1);
    assertEquals(r.totals.points, expected);
  }
});

Deno.test('densité par hex (Map) + hex inconnu → défaut wild', () => {
  const r = one(
    [HEX, HEX2],
    new Map(),
    ctx({ zoneDensity: new Map([[HEX, 'active' as ZoneDensity]]) }),
  );
  assertEquals(r.results[0].points, POINTS_NEUTRAL_HEX + POINTS_PIONEER_BONUS_BY_DENSITY.active);
  assertEquals(r.results[1].points, POINTS_NEUTRAL_HEX + POINTS_PIONEER_BONUS_BY_DENSITY.wild);
});

Deno.test('hex neutre déjà possédé (decayé) → +10 sans bonus pionnier', () => {
  const states = new Map([[HEX, foeHex({ ownerUserId: null })]]);
  const r = one([HEX], states, ctx());
  assertEquals(r.results, [
    { h3: HEX, outcome: 'claimed_neutral', points: POINTS_NEUTRAL_HEX, pioneer: false },
  ]);
});

Deno.test('hex adverse au decay échu → neutre (pas un vol)', () => {
  const states = new Map([[HEX, foeHex({ decayAt: hoursAgo(1) })]]);
  const r = one([HEX], states, ctx());
  assertEquals(r.results[0].outcome, 'claimed_neutral');
  assertEquals(r.results[0].points, POINTS_NEUTRAL_HEX);
  assertEquals(r.results[0].pioneer, false);
});

// ─── Vol et protections (§3.3) ───────────────────────────────────────────────

Deno.test('hex adverse sans protection → stolen +15', () => {
  const r = one([HEX], new Map([[HEX, foeHex()]]), ctx());
  assertEquals(r.results, [{ h3: HEX, outcome: 'stolen', points: POINTS_STOLEN_HEX, pioneer: false }]);
  assertEquals(POINTS_STOLEN_HEX, 15);
  assertEquals(r.totals.stolen, 1);
});

Deno.test('lock 24 h actif → blocked_lock, 0 pt', () => {
  const r = one([HEX], new Map([[HEX, foeHex({ lockedUntil: hoursAhead(2) })]]), ctx());
  assertEquals(r.results, [{ h3: HEX, outcome: 'blocked_lock', points: 0, pioneer: false }]);
  assertEquals(r.totals.blocked, 1);
  assertEquals(r.totals.points, 0);
});

Deno.test('lock expiré → vol possible', () => {
  const r = one([HEX], new Map([[HEX, foeHex({ lockedUntil: hoursAgo(1) })]]), ctx());
  assertEquals(r.results[0].outcome, 'stolen');
});

Deno.test('bouclier actif → blocked_shield', () => {
  const r = one([HEX], new Map([[HEX, foeHex({ shieldedUntil: hoursAhead(40) })]]), ctx());
  assertEquals(r.results, [{ h3: HEX, outcome: 'blocked_shield', points: 0, pioneer: false }]);
});

Deno.test('propriétaire < 14 j → blocked_new_player', () => {
  const r = one(
    [HEX],
    new Map([[HEX, foeHex()]]),
    ctx({ ownersCreatedAt: new Map([[FOE, daysAgo(5)]]) }),
  );
  assertEquals(r.results, [{ h3: HEX, outcome: 'blocked_new_player', points: 0, pioneer: false }]);
});

Deno.test('propriétaire à exactement 14 j → volable', () => {
  const r = one(
    [HEX],
    new Map([[HEX, foeHex()]]),
    ctx({ ownersCreatedAt: new Map([[FOE, daysAgo(14)]]) }),
  );
  assertEquals(r.results[0].outcome, 'stolen');
});

// ─── Défense (§3.4) ──────────────────────────────────────────────────────────

Deno.test('mon hex, dernière défense > 24 h → defended +3', () => {
  const states = new Map([[HEX, foeHex({ ownerUserId: ME, lastDefendedAt: hoursAgo(30) })]]);
  const r = one([HEX], states, ctx());
  assertEquals(r.results, [
    { h3: HEX, outcome: 'defended', points: POINTS_DEFENDED_HEX, pioneer: false },
  ]);
  assertEquals(POINTS_DEFENDED_HEX, 3);
  assertEquals(r.totals.defended, 1);
});

Deno.test('mon hex, défendu il y a < 24 h → already_owned_cooldown, 0 pt', () => {
  const states = new Map([[HEX, foeHex({ ownerUserId: ME, lastDefendedAt: hoursAgo(2) })]]);
  const r = one([HEX], states, ctx());
  assertEquals(r.results, [
    { h3: HEX, outcome: 'already_owned_cooldown', points: 0, pioneer: false },
  ]);
  // L'hex est quand même re-parcouru : compté en défense, decay repoussé côté RPC.
  assertEquals(r.totals.defended, 1);
  assertEquals(r.totals.points, 0);
});

// ─── Zones interdites et plafond (§6.4, §7, AMENDEMENT-02 §2) ────────────────

Deno.test('zone privée → blocked_privacy, prioritaire sur le vol', () => {
  const r = one([HEX], new Map([[HEX, foeHex()]]), ctx({ privacyHexes: new Set([HEX]) }));
  assertEquals(r.results, [{ h3: HEX, outcome: 'blocked_privacy', points: 0, pioneer: false }]);
});

Deno.test('zone non capturable → blocked_no_capture_zone, prioritaire sur tout', () => {
  const r = one(
    [HEX],
    new Map(),
    ctx({ noCaptureHexes: new Set([HEX]), privacyHexes: new Set([HEX]) }),
  );
  assertEquals(r.results, [
    { h3: HEX, outcome: 'blocked_no_capture_zone', points: 0, pioneer: false },
  ]);
});

Deno.test('plafond quotidien : le 1 200e hex passe, le suivant est bloqué', () => {
  const r = one([HEX, HEX2], new Map(), ctx({ claimsToday: MAX_CLAIMS_PER_DAY - 1 }));
  assertEquals(r.results[0].outcome, 'claimed_neutral');
  assertEquals(r.results[1].outcome, 'blocked_daily_cap');
  assertEquals(r.results[1].points, 0);
  assertEquals(r.totals.blocked, 1);
});

Deno.test('plafond déjà atteint → tout est bloqué', () => {
  const r = one([HEX, HEX2], new Map(), ctx({ claimsToday: MAX_CLAIMS_PER_DAY }));
  assertEquals(r.results.map((x) => x.outcome), ['blocked_daily_cap', 'blocked_daily_cap']);
});

// ─── Sorties globales ────────────────────────────────────────────────────────

Deno.test('lockedUntil = now + HEX_LOCK_HOURS, decayAt = now + DECAY_DAYS', () => {
  const r = one([HEX], new Map(), ctx());
  assertEquals(r.lockedUntil.getTime(), NOW.getTime() + HEX_LOCK_HOURS * MS_H);
  assertEquals(r.decayAt.getTime(), NOW.getTime() + DECAY_DAYS * MS_D);
  assertEquals(r.decayExempt, false);
});

Deno.test('coureur < 14 j → decayExempt (territoire sans decay, §3.3)', () => {
  const r = one([HEX], new Map(), ctx({ userCreatedAt: daysAgo(3) }));
  assertEquals(r.decayExempt, true);
});

Deno.test('hexes dupliqués en entrée → décidés une seule fois', () => {
  const r = one([HEX, HEX, HEX], new Map(), ctx());
  assertEquals(r.results.length, 1);
});

Deno.test('totaux cohérents sur une course mixte', () => {
  const states = new Map<string, HexState>([
    ['a', foeHex()], // stolen
    ['b', foeHex({ ownerUserId: ME, lastDefendedAt: hoursAgo(48) })], // defended
    ['c', foeHex({ lockedUntil: hoursAhead(3) })], // blocked_lock
  ]);
  const r = one(['a', 'b', 'c', 'd'], states, ctx()); // d = pionnier neutre
  assertEquals(r.totals.stolen, 1);
  assertEquals(r.totals.defended, 1);
  assertEquals(r.totals.blocked, 1);
  assertEquals(r.totals.claimed, 1);
  assertEquals(r.totals.pioneer, 1);
  assertEquals(
    r.totals.points,
    POINTS_STOLEN_HEX + POINTS_DEFENDED_HEX + POINTS_NEUTRAL_HEX +
      POINTS_PIONEER_BONUS_BY_DENSITY.active,
  );
  assert(r.results.every((x) => x.points >= 0));
});
