/**
 * Tests Scout Ping (§20.3) — moteur PUR. AUCUN réseau.
 */
import { assertEquals } from 'jsr:@std/assert@^1';
import {
  SCOUT_PING_DURATION_HOURS,
  SCOUT_PING_MAX_PER_WEEK,
} from '../_shared/game-rules.ts';
import {
  finalizeActivateScoutPing,
  pickScoutFinding,
  scoutPingExpiresAt,
  validateActivateScoutPing,
} from '../_shared/engine/scout_ping.ts';

const MS_PER_HOUR = 3_600_000;
const NOW = new Date('2026-07-08T12:00:00Z');

Deno.test('pickScoutFinding : rival en decay urgent prioritaire', () => {
  const finding = pickScoutFinding(
    [
      {
        h3index: '100',
        ownerUserId: 'rival-1',
        decayAt: new Date(NOW.getTime() + 12 * MS_PER_HOUR),
        lastDefendedAt: null,
      },
      {
        h3index: '200',
        ownerUserId: 'me',
        decayAt: null,
        lastDefendedAt: new Date(NOW.getTime() - MS_PER_HOUR),
      },
    ],
    'me',
    NOW,
  );
  assertEquals(finding?.kind, 'rival_weak');
  assertEquals(finding?.h3index, '100');
});

Deno.test('pickScoutFinding : front rival dense si ≥ 5 hex rivaux', () => {
  const rivals = Array.from({ length: 5 }, (_, i) => ({
    h3index: String(i),
    ownerUserId: 'rival',
    decayAt: null,
    lastDefendedAt: null,
  }));
  const finding = pickScoutFinding(rivals, 'me', NOW);
  assertEquals(finding?.kind, 'rival_dense');
});

Deno.test('pickScoutFinding : pression zone à moi en fallback', () => {
  const finding = pickScoutFinding(
    [
      {
        h3index: '300',
        ownerUserId: 'me',
        decayAt: null,
        lastDefendedAt: new Date(NOW.getTime() - 48 * MS_PER_HOUR),
      },
    ],
    'me',
    NOW,
  );
  assertEquals(finding?.kind, 'own_pressure');
});

Deno.test('validateActivateScoutPing : cap hebdo', () => {
  const r = validateActivateScoutPing({
    userId: 'u1',
    itemKey: 'scout_ping',
    cityId: 'paris',
    ownsItem: true,
    weekCount: SCOUT_PING_MAX_PER_WEEK,
    now: NOW,
  });
  assertEquals(r, { ok: false, reason: 'weekly_cap' });
});

Deno.test('finalizeActivateScoutPing : 24 h + source club', () => {
  const finding = {
    kind: 'rival_weak' as const,
    h3index: '42',
    message: 'test',
  };
  const r = finalizeActivateScoutPing({
    userId: 'u1',
    itemKey: 'scout_ping',
    cityId: 'paris',
    ownsItem: true,
    weekCount: 0,
    now: NOW,
    isClub: true,
    finding,
  });
  assertEquals(r.ok, true);
  if (r.ok) {
    assertEquals(r.source, 'club');
    assertEquals(
      r.expiresAt.getTime() - NOW.getTime(),
      SCOUT_PING_DURATION_HOURS * MS_PER_HOUR,
    );
    assertEquals(scoutPingExpiresAt(NOW).getTime(), r.expiresAt.getTime());
  }
});
