/**
 * GRYD — LES SÉRIES DE L'ÉCRAN STATISTIQUES, prouvées.
 *
 * ─── ÉTAPE 0 — le défaut existait ───────────────────────────────────────────
 *  · l'écran ne montrait QUE des jours (7 ou 28). Aucune vue par semaine, donc
 *    aucune façon de voir une régularité — le cahier G25 demande pourtant
 *    « sous ce résumé, évolution lisible » ;
 *  · une semaine sans sortie, si elle était simplement absente de la série,
 *    ferait de deux barres voisines deux semaines NON voisines : le graphique
 *    mentirait sur le temps ;
 *  · une sortie sans allure interpolée entre ses voisines dessinerait une
 *    séance qui n'a pas eu lieu.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { bestWeekIndex, daysWithRun, sessionPaces, weeklyDistance } from './statsSeries.ts';

/** Jeudi 10 septembre 2026, 10 h locales. */
const NOW = new Date(2026, 8, 10, 10, 0, 0).getTime();
const JOUR = 24 * 60 * 60 * 1000;

Deno.test('semaines — huit barres, la plus ancienne d’abord, aucune semaine sautée', () => {
  const weeks = weeklyDistance([], NOW, 8);
  assertEquals(weeks.length, 8);
  for (let i = 1; i < weeks.length; i++) {
    const delta = weeks[i]!.weekStartMs - weeks[i - 1]!.weekStartMs;
    // Sept jours, à l'heure d'été près : le pas se recalcule par `startOfWeekMs`
    // et ne dérive pas au changement d'heure.
    assert(Math.abs(delta - 7 * JOUR) <= 60 * 60 * 1000, `pas de semaine : ${delta}`);
  }
  // Une semaine sans sortie vaut 0 km — un FAIT, pas un trou.
  assertEquals(weeks.every((week) => week.km === 0 && week.runs === 0), true);
  assertEquals(bestWeekIndex(weeks), null);
});

Deno.test('semaines — chaque sortie tombe dans SA semaine', () => {
  const weeks = weeklyDistance(
    [
      { startedAtMs: NOW, km: 5.2, durationS: 1_800 },
      { startedAtMs: NOW - JOUR, km: 4.8, durationS: 1_700 },
      { startedAtMs: NOW - 8 * JOUR, km: 10, durationS: 3_600 },
      // Hors fenêtre : ignorée, jamais repliée sur la première barre.
      { startedAtMs: NOW - 200 * JOUR, km: 42, durationS: 12_000 },
    ],
    NOW,
    8,
  );
  const derniere = weeks[7]!;
  assert(Math.abs(derniere.km - 10) < 0.001, `semaine en cours : ${derniere.km}`);
  assertEquals(derniere.runs, 2);
  const totale = weeks.reduce((sum, week) => sum + week.km, 0);
  assert(Math.abs(totale - 20) < 0.001, `total dans la fenêtre : ${totale}`);
  assertEquals(bestWeekIndex(weeks), 7);
});

Deno.test('allures — une sortie sans allure est ABSENTE, jamais interpolée', () => {
  const series = sessionPaces(
    [
      { startedAtMs: NOW - 3 * JOUR, km: 5, durationS: 1_800, paceSPerKm: 360 },
      { startedAtMs: NOW - 2 * JOUR, km: 5, durationS: 1_800, paceSPerKm: null },
      { startedAtMs: NOW - JOUR, km: 5, durationS: 1_700, paceSPerKm: 340 },
      { startedAtMs: NOW, km: 5, durationS: 1_700, paceSPerKm: 0 },
    ],
    20,
  );
  assertEquals(series.length, 2);
  // Ordre chronologique : une évolution se lit de gauche à droite.
  assert(series[0]!.startedAtMs < series[1]!.startedAtMs);
  assertEquals(series[0]!.paceSPerKm, 360);
});

Deno.test('allures — la fenêtre garde les PLUS RÉCENTES', () => {
  const runs = Array.from({ length: 30 }, (_, i) => ({
    startedAtMs: NOW - (29 - i) * JOUR,
    km: 5,
    durationS: 1_800,
    paceSPerKm: 300 + i,
  }));
  const series = sessionPaces(runs, 20);
  assertEquals(series.length, 20);
  assertEquals(series[19]!.paceSPerKm, 329);
  assertEquals(series[0]!.paceSPerKm, 310);
});

Deno.test('jours avec sortie — deux sorties le même jour comptent pour un', () => {
  const runs = [
    { startedAtMs: NOW, km: 5, durationS: 1_800 },
    { startedAtMs: NOW - 60 * 60 * 1000, km: 3, durationS: 1_000 },
    { startedAtMs: NOW - 2 * JOUR, km: 8, durationS: 2_600 },
  ];
  assertEquals(daysWithRun(runs, NOW - 7 * JOUR, NOW + JOUR), 2);
  // Fenêtre stricte : rien avant, rien après.
  assertEquals(daysWithRun(runs, NOW + JOUR, NOW + 2 * JOUR), 0);
});

declare const Deno: {
  test(nom: string, fn: () => void | Promise<void>): void;
};
