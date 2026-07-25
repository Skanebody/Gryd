/**
 * GRYD — tests de la PROPAGATION DE L'ALLURE jusqu'à l'écran.
 *
 * Le résolveur de distance était déjà écrit et documenté ; ce qui manquait était
 * le fil qui amène l'allure MESURÉE du joueur jusqu'au planificateur — faute de
 * quoi l'écran calculait ses durées sur une constante de 5'50/km identique pour
 * tout le monde. Ces tests verrouillent les deux moitiés de la règle : l'allure
 * remonte quand elle est vraie, et elle ne remonte PAS quand on n'a pas le droit
 * de l'avoir lue.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  resolveRouteSuggestion,
  type HabitProfile,
  type RouteDistancePrefs,
  type SuggestionBounds,
} from './suggestion.ts';

const BOUNDS: SuggestionBounds = { minKm: 1.5, maxKm: 50, stepKm: 0.5, fallbackKm: 3.4 };

const known = (paceSKm: number | null): HabitProfile => ({
  kind: 'known',
  typicalKm: 5.2,
  sampleRuns: 12,
  paceSKm,
});

const prefs = (over: Partial<RouteDistancePrefs> = {}): RouteDistancePrefs => ({
  manualKm: null,
  learning: 'on',
  ...over,
});

Deno.test("l'allure apprise remonte à l'écran quand elle est mesurée", () => {
  const s = resolveRouteSuggestion(known(312), prefs(), BOUNDS);
  assertEquals(s.source, 'learned');
  assertEquals(s.paceSKm, 312);
});

Deno.test("une distance réglée à la main n'efface pas l'allure apprise", () => {
  // Deux mesures distinctes : régler sa distance ne dit rien de son allure.
  const s = resolveRouteSuggestion(known(312), prefs({ manualKm: 8 }), BOUNDS);
  assertEquals(s.source, 'manual');
  assertEquals(s.paceSKm, 312);
});

Deno.test("apprentissage COUPÉ : aucune allure, donc aucune durée à l'écran", () => {
  const s = resolveRouteSuggestion(known(312), prefs({ learning: 'off' }), BOUNDS);
  assertEquals(s.cause, 'off');
  assertEquals(s.paceSKm, null);
});

Deno.test("réglages NON LUS : aucune allure — on n'apprend pas sans avoir vérifié le droit", () => {
  const s = resolveRouteSuggestion(known(312), prefs({ learning: 'unknown' }), BOUNDS);
  assertEquals(s.cause, 'unavailable');
  assertEquals(s.paceSKm, null);
});

Deno.test('profil sans allure exploitable : distance apprise, mais toujours zéro minute', () => {
  const s = resolveRouteSuggestion(known(null), prefs(), BOUNDS);
  assertEquals(s.source, 'learned');
  assertEquals(s.paceSKm, null);
});

Deno.test('une allure absurde est refusée plutôt que propagée', () => {
  assertEquals(resolveRouteSuggestion(known(0), prefs(), BOUNDS).paceSKm, null);
  assertEquals(resolveRouteSuggestion(known(-42), prefs(), BOUNDS).paceSKm, null);
  assertEquals(resolveRouteSuggestion(known(Number.NaN), prefs(), BOUNDS).paceSKm, null);
});

Deno.test("pas encore assez de courses : ni distance apprise, ni allure", () => {
  const learning: HabitProfile = { kind: 'learning', sampleRuns: 2, requiredRuns: 5 };
  const s = resolveRouteSuggestion(learning, prefs(), BOUNDS);
  assertEquals(s.cause, 'learning');
  assertEquals(s.paceSKm, null);
});

Deno.test('lecture indisponible : la distance par défaut ne s’accompagne d’aucune durée', () => {
  const s = resolveRouteSuggestion({ kind: 'unavailable' }, prefs(), BOUNDS);
  assertEquals(s.cause, 'unavailable');
  assertEquals(s.paceSKm, null);
});
