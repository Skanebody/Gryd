/**
 * Tests RAID crew (AMENDEMENT-34 §DELTA-CLASH) — moteur PUR.
 * Couvre : raidStatus (active avant échéance, complete si progress ≥ target,
 * expired après endsAt, complete PRIME sur expired, garde-fou cible ≤ 0) ;
 * raidProgressPct (fraction bornée 0..1, cible ≤ 0). AUCUN réseau, horloge
 * fournie par le test (PURE).
 */
import { assertEquals } from 'jsr:@std/assert@^1';
import { raidProgressPct, raidStatus } from '../_shared/engine/raid.ts';
import { RAID_DEMO_TARGET_ZONES } from '../_shared/game-rules.ts';

const at = (h: number): Date => new Date(Date.UTC(2026, 6, 6, h)); // horloge de test

// ─── raidStatus ───────────────────────────────────────────────────────────────

Deno.test('raidStatus : active avant l\'échéance, cible non atteinte', () => {
  const status = raidStatus({ now: at(10), endsAt: at(48), progress: 400, target: RAID_DEMO_TARGET_ZONES });
  assertEquals(status, 'active');
});

Deno.test('raidStatus : complete dès que progress ≥ target', () => {
  assertEquals(
    raidStatus({ now: at(10), endsAt: at(48), progress: RAID_DEMO_TARGET_ZONES, target: RAID_DEMO_TARGET_ZONES }),
    'complete',
  );
  // Dépasser la cible reste complete.
  assertEquals(
    raidStatus({ now: at(10), endsAt: at(48), progress: RAID_DEMO_TARGET_ZONES + 50, target: RAID_DEMO_TARGET_ZONES }),
    'complete',
  );
});

Deno.test('raidStatus : expired après endsAt sans cible atteinte', () => {
  // Pile à l'échéance → expired (borne haute exclue de la fenêtre active).
  assertEquals(raidStatus({ now: at(48), endsAt: at(48), progress: 400, target: 1_000 }), 'expired');
  assertEquals(raidStatus({ now: at(60), endsAt: at(48), progress: 999, target: 1_000 }), 'expired');
});

Deno.test('raidStatus : complete PRIME sur l\'échéance (cible atteinte même après endsAt)', () => {
  assertEquals(raidStatus({ now: at(60), endsAt: at(48), progress: 1_000, target: 1_000 }), 'complete');
});

Deno.test('raidStatus : cible ≤ 0 n\'est jamais complete (retombe sur active/expired)', () => {
  assertEquals(raidStatus({ now: at(10), endsAt: at(48), progress: 5, target: 0 }), 'active');
  assertEquals(raidStatus({ now: at(60), endsAt: at(48), progress: 5, target: 0 }), 'expired');
});

// ─── raidProgressPct ─────────────────────────────────────────────────────────

Deno.test('raidProgressPct : fraction simple', () => {
  assertEquals(raidProgressPct(250, 1_000), 0.25);
  assertEquals(raidProgressPct(0, 1_000), 0);
});

Deno.test('raidProgressPct : bornée à [0, 1]', () => {
  assertEquals(raidProgressPct(2_000, 1_000), 1); // sature à 1
  assertEquals(raidProgressPct(-50, 1_000), 0); // jamais négatif
});

Deno.test('raidProgressPct : cible ≤ 0 → 0 (pas de division)', () => {
  assertEquals(raidProgressPct(500, 0), 0);
  assertEquals(raidProgressPct(500, -10), 0);
});
