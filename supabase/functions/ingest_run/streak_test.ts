/**
 * Tests LOT 1 « LA SÉRIE VISIBLE » — moteur PUR de la série hebdomadaire.
 * Couvre : semaine ISO UTC, historique vide → 'none' (jamais « 0 »), validation
 * à STREAK_MIN_RUNS_PER_WEEK, chaîne consécutive, semaine ouverte non pénalisée
 * ('atRisk'), rupture ('broken' + best conservé), gel qui traverse sans créditer,
 * cap du multiplicateur, entrées dégénérées (dates invalides, futur).
 * AUCUN réseau. Importe les copies _shared (re-sync par le vérificateur).
 */
import { assertEquals } from 'jsr:@std/assert@^1';
import {
  STREAK_MIN_RUNS_PER_WEEK,
  STREAK_MULTIPLIER_CAP,
  STREAK_MULTIPLIER_STEP,
} from '../_shared/game-rules.ts';
import { computeStreak, weekKey, weekStartUtc } from '../_shared/streak.ts';

const MS_PER_DAY = 86_400_000;
/** Mercredi 22/07/2026 10:00 UTC — semaine ISO du lundi 20/07/2026. */
const NOW = new Date('2026-07-22T10:00:00.000Z');

/** Date située `weeksAgo` semaines avant NOW, décalée de `dayOffset` jours. */
const at = (weeksAgo: number, dayOffset = 0) =>
  new Date(NOW.getTime() - weeksAgo * 7 * MS_PER_DAY + dayOffset * MS_PER_DAY);

/** `n` courses dans la semaine `weeksAgo` (jours distincts, jamais dans le futur). */
const runs = (weeksAgo: number, n: number) =>
  Array.from({ length: n }, (_, i) => at(weeksAgo, -i));

// ─── Semaine ISO ─────────────────────────────────────────────────────────────

Deno.test('weekStartUtc : lundi 00:00 UTC de la semaine contenant la date', () => {
  assertEquals(weekKey(new Date('2026-07-22T10:00:00.000Z')), '2026-07-20');
  // Lundi lui-même → sa propre borne.
  assertEquals(weekKey(new Date('2026-07-20T00:00:00.000Z')), '2026-07-20');
  // Dimanche = DERNIER jour de la semaine ISO, pas le premier.
  assertEquals(weekKey(new Date('2026-07-26T23:59:59.000Z')), '2026-07-20');
  // Lundi suivant → semaine suivante.
  assertEquals(weekKey(new Date('2026-07-27T00:00:00.000Z')), '2026-07-27');
});

Deno.test('weekStartUtc : date invalide → NaN (jamais une semaine inventée)', () => {
  assertEquals(Number.isNaN(weekStartUtc(new Date('nope'))), true);
});

// ─── Honnêteté : le vide n'est pas un zéro ───────────────────────────────────

Deno.test("historique vide → 'none' : rien à afficher, surtout pas « 0 »", () => {
  const s = computeStreak({ runStartedAt: [], now: NOW });
  assertEquals(s.status, 'none');
  assertEquals(s.weeks, 0);
  assertEquals(s.best, 0);
  assertEquals(s.multiplier, 1);
});

Deno.test('now invalide → état vide (aucun calcul hasardeux)', () => {
  const s = computeStreak({ runStartedAt: runs(0, 3), now: new Date('nope') });
  assertEquals(s.status, 'none');
});

Deno.test("une seule course cette semaine → 'building', pas encore de série", () => {
  const s = computeStreak({ runStartedAt: [at(0)], now: NOW });
  assertEquals(s.status, 'building');
  assertEquals(s.weeks, 0);
  assertEquals(s.runsThisWeek, 1);
  assertEquals(s.runsToValidate, STREAK_MIN_RUNS_PER_WEEK - 1);
});

// ─── Validation + chaîne ─────────────────────────────────────────────────────

Deno.test('semaine courante validée → série 1, active', () => {
  const s = computeStreak({ runStartedAt: runs(0, STREAK_MIN_RUNS_PER_WEEK), now: NOW });
  assertEquals(s.status, 'active');
  assertEquals(s.weeks, 1);
  assertEquals(s.runsToValidate, 0);
  assertEquals(s.multiplier, 1 + STREAK_MULTIPLIER_STEP);
});

Deno.test('3 semaines consécutives validées → série 3', () => {
  const s = computeStreak({
    runStartedAt: [...runs(0, 2), ...runs(1, 2), ...runs(2, 3)],
    now: NOW,
  });
  assertEquals(s.weeks, 3);
  assertEquals(s.status, 'active');
});

Deno.test('un trou casse la chaîne : seules les semaines contiguës comptent', () => {
  const s = computeStreak({
    runStartedAt: [...runs(0, 2), ...runs(1, 2), ...runs(3, 2), ...runs(4, 2)],
    now: NOW,
  });
  assertEquals(s.weeks, 2);
  // La meilleure série de l'historique reste connue (2 ici aussi).
  assertEquals(s.best, 2);
});

Deno.test('multiplicateur plafonné à STREAK_MULTIPLIER_CAP', () => {
  const long = Array.from({ length: 12 }, (_, w) => runs(w, 2)).flat();
  const s = computeStreak({ runStartedAt: long, now: NOW });
  assertEquals(s.weeks, 12);
  assertEquals(s.multiplier, STREAK_MULTIPLIER_CAP);
});

// ─── Anti-shame : la semaine en cours ne pénalise jamais ─────────────────────

Deno.test("semaine courante encore ouverte → 'atRisk', la série acquise TIENT", () => {
  const s = computeStreak({ runStartedAt: [...runs(1, 2), ...runs(2, 2)], now: NOW });
  assertEquals(s.status, 'atRisk');
  assertEquals(s.weeks, 2); // la série n'est PAS remise à zéro
  assertEquals(s.runsThisWeek, 0);
  assertEquals(s.runsToValidate, STREAK_MIN_RUNS_PER_WEEK);
});

Deno.test("série rompue → 'broken' avec weeks 0 mais best conservé", () => {
  // Deux semaines validées il y a longtemps, puis plus rien (sauf 1 course).
  const s = computeStreak({ runStartedAt: [...runs(4, 2), ...runs(5, 2), at(0)], now: NOW });
  assertEquals(s.status, 'broken');
  assertEquals(s.weeks, 0);
  assertEquals(s.best, 2);
  assertEquals(s.multiplier, 1);
});

// ─── Gel de série ────────────────────────────────────────────────────────────

Deno.test('gel : la semaine gelée est traversée sans casser la chaîne', () => {
  const frozen = [weekKey(at(1))];
  const s = computeStreak({
    runStartedAt: [...runs(0, 2), ...runs(2, 2), ...runs(3, 2)],
    now: NOW,
    frozenWeekKeys: frozen,
  });
  // 0 validée, 1 gelée (traversée), 2 et 3 validées → 3 semaines créditées.
  assertEquals(s.weeks, 3);
});

Deno.test('gel : une semaine gelée ne CRÉDITE pas de série (protège seulement)', () => {
  const s = computeStreak({
    runStartedAt: runs(1, 2),
    now: NOW,
    frozenWeekKeys: [weekKey(NOW)],
  });
  assertEquals(s.frozen, true);
  assertEquals(s.status, 'frozen');
  assertEquals(s.weeks, 1); // la semaine gelée n'ajoute rien
});

Deno.test('gels non câblés → aucune semaine protégée (on ne fait pas semblant)', () => {
  const s = computeStreak({ runStartedAt: [...runs(0, 2), ...runs(2, 2)], now: NOW });
  assertEquals(s.weeks, 1);
});

// ─── Entrées dégénérées ──────────────────────────────────────────────────────

Deno.test('dates invalides et courses futures sont ignorées', () => {
  const future = new Date(NOW.getTime() + 3 * MS_PER_DAY);
  const s = computeStreak({
    runStartedAt: [new Date('nope'), future, ...runs(0, 2)],
    now: NOW,
  });
  assertEquals(s.runsThisWeek, 2);
  assertEquals(s.weeks, 1);
});
