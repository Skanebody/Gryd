/**
 * Tests du moteur PUR `seasonProgress` (progression de saison).
 * Couvre : pct écoulé borné [0,1], phase dérivée du temps (upcoming/active/ended),
 * jours restants arrondis au supérieur et jamais négatifs, bornes exactes
 * (début, fin), fenêtre incohérente (endsAt ≤ startsAt), entrées illisibles.
 * AUCUN réseau, aucune date « maintenant » implicite (now toujours fourni pour un
 * résultat déterministe). Importe la copie _shared (re-sync par le vérificateur).
 */
import { assertEquals } from 'jsr:@std/assert@^1';
import { seasonProgress } from '../_shared/season.ts';

const MS_PER_DAY = 86_400_000;
/** Saison 0 « Fondateurs » : 8 semaines (SEASON_DURATION_WEEKS), bornes réelles. */
const START = '2026-07-20T00:00:00.000Z';
const END = '2026-09-14T00:00:00.000Z'; // START + 56 jours (8 semaines)

// ─── Phase dérivée du temps seul ─────────────────────────────────────────────

Deno.test('avant le début : phase upcoming, pct 0', () => {
  const p = seasonProgress(START, END, '2026-07-10T00:00:00.000Z');
  assertEquals(p.phase, 'upcoming');
  assertEquals(p.pct, 0);
});

Deno.test('pendant : phase active, pct dans ]0,1[', () => {
  // Milieu exact : 28 jours après le début sur une fenêtre de 56 jours → 0.5.
  const mid = new Date(Date.parse(START) + 28 * MS_PER_DAY).toISOString();
  const p = seasonProgress(START, END, mid);
  assertEquals(p.phase, 'active');
  assertEquals(p.pct, 0.5);
});

Deno.test('après la fin : phase ended, pct 1, 0 jour restant', () => {
  const p = seasonProgress(START, END, '2026-10-01T00:00:00.000Z');
  assertEquals(p.phase, 'ended');
  assertEquals(p.pct, 1);
  assertEquals(p.joursRestants, 0);
});

// ─── Bornes exactes ──────────────────────────────────────────────────────────

Deno.test('à l’instant du début : active (borne incluse), pct 0', () => {
  const p = seasonProgress(START, END, START);
  assertEquals(p.phase, 'active');
  assertEquals(p.pct, 0);
});

Deno.test('à l’instant de la fin : ended (borne exclue), pct 1', () => {
  const p = seasonProgress(START, END, END);
  assertEquals(p.phase, 'ended');
  assertEquals(p.pct, 1);
  assertEquals(p.joursRestants, 0);
});

// ─── Jours restants : arrondi au supérieur, jamais négatifs ───────────────────

Deno.test('jours restants = plafond des jours jusqu’à la fin', () => {
  // 3 jours pile avant la fin → 3.
  const threeDaysLeft = new Date(Date.parse(END) - 3 * MS_PER_DAY).toISOString();
  assertEquals(seasonProgress(START, END, threeDaysLeft).joursRestants, 3);
  // 2 jours + 1 heure avant la fin → on annonce encore 3 (plafond).
  const justOverTwo = new Date(Date.parse(END) - (2 * MS_PER_DAY + 3_600_000)).toISOString();
  assertEquals(seasonProgress(START, END, justOverTwo).joursRestants, 3);
  // Dernière heure → il reste 1 jour tant que l’échéance n’est pas atteinte.
  const lastHour = new Date(Date.parse(END) - 3_600_000).toISOString();
  assertEquals(seasonProgress(START, END, lastHour).joursRestants, 1);
});

Deno.test('avant le début, le décompte vise toujours la fin (jamais négatif)', () => {
  const p = seasonProgress(START, END, '2026-07-10T00:00:00.000Z');
  // 10/07 → 14/09 : 66 jours pleins.
  assertEquals(p.joursRestants, 66);
});

// ─── Entrées dégénérées : neutre, jamais un NaN ni une date inventée ─────────

Deno.test('fenêtre incohérente (endsAt ≤ startsAt) → état neutre', () => {
  const p = seasonProgress(END, START, '2026-08-01T00:00:00.000Z');
  assertEquals(p, { pct: 0, joursRestants: 0, phase: 'upcoming' });
});

Deno.test('borne illisible → état neutre, aucun NaN', () => {
  const p = seasonProgress('pas-une-date', END, START);
  assertEquals(p, { pct: 0, joursRestants: 0, phase: 'upcoming' });
  assertEquals(Number.isNaN(p.pct), false);
});

// ─── Types d’instant acceptés (ISO string, ms epoch, Date) ───────────────────

Deno.test('accepte ms epoch et Date, résultat identique à l’ISO', () => {
  const mid = Date.parse(START) + 28 * MS_PER_DAY;
  const iso = seasonProgress(START, END, new Date(mid).toISOString());
  const epoch = seasonProgress(Date.parse(START), Date.parse(END), mid);
  const dates = seasonProgress(new Date(START), new Date(END), new Date(mid));
  assertEquals(epoch, iso);
  assertEquals(dates, iso);
});
