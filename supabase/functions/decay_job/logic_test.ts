/**
 * Tests decay_job/logic.ts — SPEC §3.3 (decay 21 j, notif J-3),
 * GRYD_notifications_logic.md §6 (grouping par joueur).
 * Purs : lignes construites en mémoire, aucun réseau.
 */
import { assertEquals } from 'jsr:@std/assert@^1';
import { DECAY_WARNING_DAYS_BEFORE } from '../_shared/game-rules.ts';
import { type DecayHexRow, partitionDecay } from './logic.ts';

const NOW = new Date('2026-07-03T10:00:00Z');
const MS_D = 86_400_000;
const MS_MIN = 60_000;
const daysAhead = (d: number) => new Date(NOW.getTime() + d * MS_D);
const daysAgo = (d: number) => new Date(NOW.getTime() - d * MS_D);

const ALICE = 'user-alice';
const BOB = 'user-bob';

function hex(id: string, over: Partial<DecayHexRow> = {}): DecayHexRow {
  return {
    id,
    ownerUserId: ALICE,
    decayAt: daysAhead(10),
    decayWarnedAt: null,
    ...over,
  };
}

// ─── Neutralisation (decay_at < now, strict — SPEC §6.3) ─────────────────────

Deno.test('decay échu → toNeutralize, pas de warning', () => {
  const r = partitionDecay([hex('h1', { decayAt: daysAgo(1) })], NOW);
  assertEquals(r.toNeutralize.map((h) => h.id), ['h1']);
  assertEquals(r.toWarn, []);
  assertEquals(r.warnings, []);
});

Deno.test('decay_at exactement = now → PAS neutralisé (strict), mais averti', () => {
  const r = partitionDecay([hex('h1', { decayAt: NOW })], NOW);
  assertEquals(r.toNeutralize, []);
  assertEquals(r.toWarn.map((h) => h.id), ['h1']); // dans la fenêtre J-3, échéance imminente
});

Deno.test('decay_at null (protection nouveau joueur §3.3) → exempt de tout', () => {
  const r = partitionDecay([hex('h1', { decayAt: null })], NOW);
  assertEquals(r.toNeutralize, []);
  assertEquals(r.toWarn, []);
});

Deno.test('hex déjà neutre (owner null) échu → neutralisé sans warning', () => {
  const r = partitionDecay(
    [hex('h1', { ownerUserId: null, decayAt: daysAgo(2) })],
    NOW,
  );
  assertEquals(r.toNeutralize.map((h) => h.id), ['h1']);
  assertEquals(r.warnings, []);
});

// ─── Fenêtre d'avertissement J-3 (bornes) ────────────────────────────────────

Deno.test('decay exactement à J-3 → averti (borne inclusive : contrat « notif à J-3 »)', () => {
  const r = partitionDecay(
    [hex('h1', { decayAt: daysAhead(DECAY_WARNING_DAYS_BEFORE) })],
    NOW,
  );
  assertEquals(r.toWarn.map((h) => h.id), ['h1']);
  assertEquals(r.warnings.length, 1);
});

Deno.test('decay à J-3 + 1 min → trop tôt, pas de warning', () => {
  const decayAt = new Date(NOW.getTime() + DECAY_WARNING_DAYS_BEFORE * MS_D + MS_MIN);
  const r = partitionDecay([hex('h1', { decayAt })], NOW);
  assertEquals(r.toWarn, []);
  assertEquals(r.toNeutralize, []);
});

Deno.test('déjà averti pour ce cycle → pas de re-warning', () => {
  const r = partitionDecay(
    [hex('h1', { decayAt: daysAhead(2), decayWarnedAt: daysAgo(1) })],
    NOW,
  );
  assertEquals(r.toWarn, []);
});

Deno.test('warning caduc (défense a repoussé decay_at depuis) → re-averti au nouveau cycle', () => {
  // Averti il y a 20 j, puis hex défendu (decay_at repoussé) : le vieux warning
  // est antérieur au début de la fenêtre courante (J-3) → il ne compte plus.
  const r = partitionDecay(
    [hex('h1', { decayAt: daysAhead(1), decayWarnedAt: daysAgo(20) })],
    NOW,
  );
  assertEquals(r.toWarn.map((h) => h.id), ['h1']);
});

// ─── Grouping par joueur (1 notif « ton quartier s'efface » par user) ────────

Deno.test('3 hexes menacés d’un même joueur → 1 seul warning groupé', () => {
  const r = partitionDecay(
    [
      hex('h1', { decayAt: daysAhead(2) }),
      hex('h2', { decayAt: daysAhead(1) }),
      hex('h3', { decayAt: daysAhead(3) }),
    ],
    NOW,
  );
  assertEquals(r.warnings.length, 1);
  assertEquals(r.warnings[0].userId, ALICE);
  assertEquals(r.warnings[0].hexCount, 3);
  assertEquals(r.warnings[0].earliestDecayAt, daysAhead(1)); // échéance la plus proche
  assertEquals(r.warnings[0].hexIds.sort(), ['h1', 'h2', 'h3']);
});

Deno.test('2 joueurs menacés → 2 warnings, un par joueur', () => {
  const r = partitionDecay(
    [
      hex('h1', { decayAt: daysAhead(2) }),
      hex('h2', { ownerUserId: BOB, decayAt: daysAhead(2) }),
    ],
    NOW,
  );
  assertEquals(r.warnings.length, 2);
  assertEquals(new Set(r.warnings.map((w) => w.userId)), new Set([ALICE, BOB]));
});

Deno.test('mix échu + menacé + lointain → chaque hex dans la bonne partition', () => {
  const r = partitionDecay(
    [
      hex('expired', { decayAt: daysAgo(1) }),
      hex('soon', { decayAt: daysAhead(2) }),
      hex('far', { decayAt: daysAhead(15) }),
    ],
    NOW,
  );
  assertEquals(r.toNeutralize.map((h) => h.id), ['expired']);
  assertEquals(r.toWarn.map((h) => h.id), ['soon']);
});
