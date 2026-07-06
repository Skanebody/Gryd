/**
 * Tests REVANCHE (AMENDEMENT-34 §DELTA-CLASH) — moteur PUR.
 * Couvre : revancheExpiry (déclenchement + fenêtre), revancheActive (dans la
 * fenêtre / expirée / avant déclenchement / bornes exactes), revancheHoursLeft
 * (heures restantes, planché à 0), fenêtre custom vs défaut REVANCHE_WINDOW_HOURS.
 * AUCUN réseau, horloge fournie par le test (PURE).
 */
import { assert, assertEquals } from 'jsr:@std/assert@^1';
import {
  revancheActive,
  revancheExpiry,
  revancheHoursLeft,
} from '../_shared/engine/revanche.ts';
import { REVANCHE_WINDOW_HOURS } from '../_shared/game-rules.ts';

const MS_PER_HOUR = 3_600_000;
const trigger = new Date(Date.UTC(2026, 6, 6, 12)); // déclenchement du vol/attaque
const plus = (h: number): Date => new Date(trigger.getTime() + h * MS_PER_HOUR);

// ─── revancheExpiry ───────────────────────────────────────────────────────────

Deno.test('revancheExpiry : déclenchement + REVANCHE_WINDOW_HOURS (défaut)', () => {
  const exp = revancheExpiry(trigger);
  assertEquals(exp.getTime() - trigger.getTime(), REVANCHE_WINDOW_HOURS * MS_PER_HOUR);
});

Deno.test('revancheExpiry : fenêtre custom respectée', () => {
  const exp = revancheExpiry(trigger, 6);
  assertEquals(exp.getTime() - trigger.getTime(), 6 * MS_PER_HOUR);
});

// ─── revancheActive ──────────────────────────────────────────────────────────

Deno.test('revancheActive : ouverte dans la fenêtre (défaut 24 h)', () => {
  assert(revancheActive(trigger, plus(1)));
  assert(revancheActive(trigger, plus(REVANCHE_WINDOW_HOURS - 1)));
});

Deno.test('revancheActive : bornes exactes — ouverte au déclenchement, fermée pile à l\'échéance', () => {
  assert(revancheActive(trigger, trigger)); // borne basse incluse
  assert(!revancheActive(trigger, plus(REVANCHE_WINDOW_HOURS))); // borne haute exclue
});

Deno.test('revancheActive : expirée au-delà de la fenêtre', () => {
  assert(!revancheActive(trigger, plus(REVANCHE_WINDOW_HOURS + 1)));
  assert(!revancheActive(trigger, plus(100)));
});

Deno.test('revancheActive : un now antérieur au déclenchement → false (horloge incohérente)', () => {
  assert(!revancheActive(trigger, plus(-1)));
});

Deno.test('revancheActive : fenêtre custom', () => {
  assert(revancheActive(trigger, plus(5), 6));
  assert(!revancheActive(trigger, plus(6), 6)); // pile à l'échéance custom → fermée
});

// ─── revancheHoursLeft ───────────────────────────────────────────────────────

Deno.test('revancheHoursLeft : heures restantes dans la fenêtre', () => {
  assertEquals(revancheHoursLeft(trigger, plus(4)), REVANCHE_WINDOW_HOURS - 4);
  assertEquals(revancheHoursLeft(trigger, trigger), REVANCHE_WINDOW_HOURS);
});

Deno.test('revancheHoursLeft : planché à 0 une fois expirée', () => {
  assertEquals(revancheHoursLeft(trigger, plus(REVANCHE_WINDOW_HOURS)), 0);
  assertEquals(revancheHoursLeft(trigger, plus(REVANCHE_WINDOW_HOURS + 10)), 0);
});
