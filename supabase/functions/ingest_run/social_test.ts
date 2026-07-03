/**
 * Tests Social/anti-farm (AMENDEMENT-07 §3, social Partie A) — moteur PUR.
 * Couvre : détection de Group Run (départ, part d'hexes communs), résolution
 * d'hex contesté entre crews (pondération runners × trust, égalité neutre jamais
 * volée, propriétaire jamais volé en égalité, défense), barème de contribution
 * même crew (§6), pénalité anti-collusion (compteur d'alternances §11). AUCUN réseau.
 */
import { assertEquals } from 'jsr:@std/assert@^1';
import {
  COLLUSION_MAX_ALTERNATIONS,
  GROUP_RUN_START_TOLERANCE_MIN,
  SAME_CREW_CONTRIB_STEPS,
} from '../_shared/game-rules.ts';
import {
  collusionPenalty,
  detectGroupRun,
  resolveContestedHex,
  sameCrewContribStep,
} from '../_shared/engine/social.ts';

const MIN = 60_000;

// ─── §3 detectGroupRun ───────────────────────────────────────────────────────

Deno.test('detectGroupRun : départ proche + fort chevauchement → true', () => {
  const a = { startedAtMs: 0, hexes: ['h1', 'h2', 'h3', 'h4'] };
  const b = { startedAtMs: 2 * MIN, hexes: ['h1', 'h2', 'h3', 'hx'] };
  // |A∩B| = 3, min(4,4) = 4 → 0.75 ≥ 0.7 ; écart 2 min ≤ 3.
  assertEquals(detectGroupRun(a, b), true);
});

Deno.test('detectGroupRun : départ trop espacé → false même si traces identiques', () => {
  const a = { startedAtMs: 0, hexes: ['h1', 'h2', 'h3'] };
  const b = { startedAtMs: (GROUP_RUN_START_TOLERANCE_MIN + 1) * MIN, hexes: ['h1', 'h2', 'h3'] };
  assertEquals(detectGroupRun(a, b), false);
});

Deno.test('detectGroupRun : chevauchement insuffisant → false', () => {
  const a = { startedAtMs: 0, hexes: ['h1', 'h2', 'h3', 'h4'] };
  const b = { startedAtMs: MIN, hexes: ['h1', 'hx', 'hy', 'hz'] };
  // |A∩B| = 1 / min(4,4) = 0.25 < 0.7.
  assertEquals(detectGroupRun(a, b), false);
});

Deno.test('detectGroupRun : course sans hex → false', () => {
  assertEquals(detectGroupRun({ startedAtMs: 0, hexes: [] }, { startedAtMs: 0, hexes: ['h1'] }), false);
});

Deno.test('detectGroupRun : accepte Set et Array indifféremment', () => {
  const a = { startedAtMs: 0, hexes: new Set(['h1', 'h2']) };
  const b = { startedAtMs: MIN, hexes: ['h1', 'h2'] };
  assertEquals(detectGroupRun(a, b), true);
});

// ─── §6 sameCrewContribStep ──────────────────────────────────────────────────

Deno.test('sameCrewContribStep : table §6 puis plafond au dernier pas', () => {
  assertEquals(sameCrewContribStep(0), SAME_CREW_CONTRIB_STEPS[0]);
  assertEquals(sameCrewContribStep(1), SAME_CREW_CONTRIB_STEPS[1]);
  assertEquals(sameCrewContribStep(3), SAME_CREW_CONTRIB_STEPS[3]);
  // Au-delà de la table → dernier pas (plafonné).
  assertEquals(sameCrewContribStep(9), SAME_CREW_CONTRIB_STEPS[SAME_CREW_CONTRIB_STEPS.length - 1]);
  assertEquals(sameCrewContribStep(-1), 0);
});

// ─── §3 resolveContestedHex ──────────────────────────────────────────────────

Deno.test('resolveContestedHex : un crew sur hex neutre → il capture, contested', () => {
  const r = resolveContestedHex({
    currentOwnerCrewId: null,
    presences: [{ crewId: 'A', runners: 2, trust: 1 }],
  });
  assertEquals(r, { ownerCrewId: 'A', status: 'contested' });
});

Deno.test('resolveContestedHex : le propriétaire domine → defended, conserve', () => {
  const r = resolveContestedHex({
    currentOwnerCrewId: 'A',
    presences: [
      { crewId: 'A', runners: 3, trust: 1 },
      { crewId: 'B', runners: 1, trust: 1 },
    ],
  });
  assertEquals(r, { ownerCrewId: 'A', status: 'defended' });
});

Deno.test('resolveContestedHex : challenger l’emporte (pondération) → bascule contested', () => {
  const r = resolveContestedHex({
    currentOwnerCrewId: 'A',
    presences: [
      { crewId: 'A', runners: 1, trust: 1 }, // poids 1
      { crewId: 'B', runners: 2, trust: 1 }, // poids 2
    ],
  });
  assertEquals(r, { ownerCrewId: 'B', status: 'contested' });
});

Deno.test('resolveContestedHex : trust départage à nb coureurs égal', () => {
  const r = resolveContestedHex({
    currentOwnerCrewId: null,
    presences: [
      { crewId: 'A', runners: 2, trust: 0.4 }, // 0.8
      { crewId: 'B', runners: 2, trust: 0.9 }, // 1.8
    ],
  });
  assertEquals(r, { ownerCrewId: 'B', status: 'contested' });
});

Deno.test('resolveContestedHex : ÉGALITÉ → reste neutre, jamais volé (neutralized)', () => {
  const r = resolveContestedHex({
    currentOwnerCrewId: null,
    presences: [
      { crewId: 'A', runners: 2, trust: 1 },
      { crewId: 'B', runners: 2, trust: 1 },
    ],
  });
  assertEquals(r, { ownerCrewId: null, status: 'neutralized' });
});

Deno.test('resolveContestedHex : possédé JAMAIS volé en égalité de présence', () => {
  const r = resolveContestedHex({
    currentOwnerCrewId: 'A',
    presences: [
      { crewId: 'B', runners: 2, trust: 1 },
      { crewId: 'C', runners: 2, trust: 1 },
    ],
  });
  // B et C ex æquo, aucun ne dépasse → A conserve, neutralisé.
  assertEquals(r, { ownerCrewId: 'A', status: 'neutralized' });
});

Deno.test('resolveContestedHex : trust nul → aucune contribution, neutralized', () => {
  const r = resolveContestedHex({
    currentOwnerCrewId: 'A',
    presences: [{ crewId: 'B', runners: 5, trust: 0 }],
  });
  assertEquals(r, { ownerCrewId: 'A', status: 'neutralized' });
});

// ─── §11 collusionPenalty ────────────────────────────────────────────────────

Deno.test('collusionPenalty : historique court → none', () => {
  assertEquals(collusionPenalty(['A']), 'none');
  assertEquals(collusionPenalty([]), 'none');
});

Deno.test('collusionPenalty : reprises modérées entre 2 crews → none', () => {
  // COLLUSION_MAX_ALTERNATIONS alternances exactement (borne haute non dépassée).
  const hist: string[] = ['A'];
  for (let i = 0; i < COLLUSION_MAX_ALTERNATIONS; i++) hist.push(i % 2 === 0 ? 'B' : 'A');
  assertEquals(collusionPenalty(hist), 'none');
});

Deno.test('collusionPenalty : trop d’alternances entre 2 mêmes crews → stats_only', () => {
  const hist: string[] = ['A'];
  for (let i = 0; i < COLLUSION_MAX_ALTERNATIONS + 1; i++) hist.push(i % 2 === 0 ? 'B' : 'A');
  assertEquals(collusionPenalty(hist), 'stats_only');
});

Deno.test('collusionPenalty : ≥ 3 crews distincts → pas de collusion bilatérale (none)', () => {
  assertEquals(collusionPenalty(['A', 'B', 'C', 'A', 'B', 'C', 'A', 'B']), 'none');
});
