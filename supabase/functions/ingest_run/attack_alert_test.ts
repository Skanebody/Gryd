/**
 * Tests Alerte d'attaque (option A) — moteur PUR + validation activation.
 * Couvre : collecte hits rivaux, filtrage alertes actives, payloads notif,
 * caps hebdo user/crew, zone fraîche, source Club. AUCUN réseau.
 */
import { assertEquals } from 'jsr:@std/assert@^1';
import {
  ATTACK_ALERT_CLUB_INCLUDED_PER_WEEK,
  ATTACK_ALERT_CREW_WEEKLY_CAP,
  ATTACK_ALERT_DURATION_HOURS,
  ATTACK_ALERT_FRESH_CAPTURE_MAX_HOURS,
  ATTACK_ALERT_MAX_PER_WEEK,
} from '../_shared/game-rules.ts';
import {
  buildAttackAlertNotifications,
  collectAttackAlertHits,
  isoWeekStartUtc,
  isHexFresh,
  RIVAL_ATTACK_OUTCOMES,
  validateActivateAttackAlert,
} from '../_shared/engine/attack_alerts.ts';

const MS_PER_HOUR = 3_600_000;
const STEAL_PRIORITY = 1;

// ─── RIVAL_ATTACK_OUTCOMES ───────────────────────────────────────────────────

Deno.test('RIVAL_ATTACK_OUTCOMES : stolen et blocked_* rivaux, pas claimed_neutral', () => {
  assertEquals(RIVAL_ATTACK_OUTCOMES.has('stolen'), true);
  assertEquals(RIVAL_ATTACK_OUTCOMES.has('blocked_lock'), true);
  assertEquals(RIVAL_ATTACK_OUTCOMES.has('blocked_shield'), true);
  assertEquals(RIVAL_ATTACK_OUTCOMES.has('claimed_neutral'), false);
  assertEquals(RIVAL_ATTACK_OUTCOMES.has('defended'), false);
});

// ─── collectAttackAlertHits ──────────────────────────────────────────────────

Deno.test('collectAttackAlertHits : hex volé à un rival → hit défenseur', () => {
  const states = new Map([
    ['8a1fb46622dff', { ownerUserId: 'defender-1' }],
  ]);
  const hits = collectAttackAlertHits(
    'attacker-1',
    [{ h3: '8a1fb46622dff', outcome: 'stolen' }],
    states,
  );
  assertEquals(hits.length, 1);
  assertEquals(hits[0].defenderId, 'defender-1');
  assertEquals(hits[0].outcome, 'stolen');
});

Deno.test('collectAttackAlertHits : ignore hex neutre et hex déjà à l\'attaquant', () => {
  const states = new Map([
    ['8a1fb46622dff', { ownerUserId: 'attacker-1' }],
    ['8a1fb46622d00', { ownerUserId: null }],
  ]);
  const hits = collectAttackAlertHits(
    'attacker-1',
    [
      { h3: '8a1fb46622dff', outcome: 'stolen' },
      { h3: '8a1fb46622d00', outcome: 'claimed_neutral' },
    ],
    states,
  );
  assertEquals(hits.length, 0);
});

Deno.test('collectAttackAlertHits : blocked_lock sur zone rivale → hit', () => {
  const states = new Map([['8a1fb46622dff', { ownerUserId: 'defender-2' }]]);
  const hits = collectAttackAlertHits(
    'attacker-1',
    [{ h3: '8a1fb46622dff', outcome: 'blocked_lock' }],
    states,
  );
  assertEquals(hits.length, 1);
  assertEquals(hits[0].outcome, 'blocked_lock');
});

// ─── buildAttackAlertNotifications ───────────────────────────────────────────

Deno.test('buildAttackAlertNotifications : notif uniquement si alerte active sur l\'hex', () => {
  const hits = [
    { defenderId: 'def-1', h3Db: '8928308280fffff', outcome: 'stolen' as const },
    { defenderId: 'def-2', h3Db: '8928308281fffff', outcome: 'blocked_lock' as const },
  ];
  const alerts = [{ userId: 'def-1', h3Db: '8928308280fffff' }];
  const rows = buildAttackAlertNotifications(hits, alerts, STEAL_PRIORITY);
  assertEquals(rows.length, 1);
  assertEquals(rows[0].user_id, 'def-1');
  assertEquals(rows[0].type, 'steal');
  assertEquals(rows[0].priority, STEAL_PRIORITY);
  assertEquals(rows[0].payload.title, 'Zone sous pression');
  assertEquals(rows[0].payload.body.includes('reprise'), true);
});

Deno.test('buildAttackAlertNotifications : tentative bloquée → corps défense', () => {
  const hits = [{ defenderId: 'def-1', h3Db: '123', outcome: 'blocked_fresh_protection' as const }];
  const alerts = [{ userId: 'def-1', h3Db: '123' }];
  const rows = buildAttackAlertNotifications(hits, alerts, STEAL_PRIORITY);
  assertEquals(rows[0].payload.body.includes('cible'), true);
});

Deno.test('buildAttackAlertNotifications : aucune alerte active → []', () => {
  const hits = [{ defenderId: 'def-1', h3Db: '123', outcome: 'stolen' as const }];
  assertEquals(buildAttackAlertNotifications(hits, [], STEAL_PRIORITY).length, 0);
});

// ─── validateActivateAttackAlert ─────────────────────────────────────────────

const NOW = new Date('2026-07-08T12:00:00Z');
const FRESH_CLAIM = new Date(NOW.getTime() - 2 * MS_PER_HOUR);
const STALE_CLAIM = new Date(NOW.getTime() - (ATTACK_ALERT_FRESH_CAPTURE_MAX_HOURS + 1) * MS_PER_HOUR);

function baseActivate(overrides: Partial<Parameters<typeof validateActivateAttackAlert>[0]> = {}) {
  return validateActivateAttackAlert({
    userId: 'user-1',
    itemKey: 'attack_alert',
    h3index: '8928308280fffff',
    ownsItem: true,
    hexOwnerId: 'user-1',
    claimedAt: FRESH_CLAIM,
    userWeekCount: 0,
    crewWeekCount: null,
    hasActiveAlertOnHex: false,
    isClub: false,
    now: NOW,
    ...overrides,
  });
}

Deno.test('validateActivateAttackAlert : activation OK → 3 h, source inventory', () => {
  const r = baseActivate();
  assertEquals(r.ok, true);
  if (r.ok) {
    assertEquals(r.source, 'inventory');
    assertEquals(
      r.expiresAt.getTime() - NOW.getTime(),
      ATTACK_ALERT_DURATION_HOURS * MS_PER_HOUR,
    );
  }
});

Deno.test('validateActivateAttackAlert : Club 1ère alerte de la semaine → source club', () => {
  const r = baseActivate({ isClub: true, userWeekCount: 0 });
  assertEquals(r.ok, true);
  if (r.ok) assertEquals(r.source, 'club');
});

Deno.test('validateActivateAttackAlert : Club 2e alerte → source inventory', () => {
  const r = baseActivate({
    isClub: true,
    userWeekCount: ATTACK_ALERT_CLUB_INCLUDED_PER_WEEK,
  });
  assertEquals(r.ok, true);
  if (r.ok) assertEquals(r.source, 'inventory');
});

Deno.test('validateActivateAttackAlert : cap user 2/semaine', () => {
  const r = baseActivate({ userWeekCount: ATTACK_ALERT_MAX_PER_WEEK });
  assertEquals(r, { ok: false, reason: 'weekly_cap_user' });
});

Deno.test('validateActivateAttackAlert : cap crew 12/semaine', () => {
  const r = baseActivate({ crewWeekCount: ATTACK_ALERT_CREW_WEEKLY_CAP });
  assertEquals(r, { ok: false, reason: 'weekly_cap_crew' });
});

Deno.test('validateActivateAttackAlert : hex pas frais (> 24 h)', () => {
  const r = baseActivate({ claimedAt: STALE_CLAIM });
  assertEquals(r, { ok: false, reason: 'hex_not_fresh' });
});

Deno.test('validateActivateAttackAlert : hex pas à moi', () => {
  const r = baseActivate({ hexOwnerId: 'other-user' });
  assertEquals(r, { ok: false, reason: 'hex_not_owned' });
});

Deno.test('validateActivateAttackAlert : alerte déjà active sur hex', () => {
  const r = baseActivate({ hasActiveAlertOnHex: true });
  assertEquals(r, { ok: false, reason: 'already_active' });
});

Deno.test('validateActivateAttackAlert : item non supporté', () => {
  const r = baseActivate({ itemKey: 'streak_gel' });
  assertEquals(r, { ok: false, reason: 'item_not_supported' });
});

Deno.test('isHexFresh : ≤ 24 h OK, au-delà non', () => {
  assertEquals(isHexFresh(FRESH_CLAIM, NOW), true);
  assertEquals(isHexFresh(STALE_CLAIM, NOW), false);
  assertEquals(isHexFresh(null, NOW), false);
});

Deno.test('isoWeekStartUtc : mercredi 8 juillet 2026 → lundi 6 juillet UTC', () => {
  assertEquals(isoWeekStartUtc(new Date('2026-07-08T12:00:00Z')).toISOString(), '2026-07-06T00:00:00.000Z');
});
