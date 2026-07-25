/**
 * GRYD — tests de la durée estimée du planificateur.
 *
 * Ce que ces tests protègent : le droit de NE PAS afficher de minutes. Le bug
 * d'origine n'était pas un mauvais calcul, c'était un calcul TOUJOURS possible —
 * une constante de 5'50/km qui garantissait un chiffre à tout le monde. Le
 * premier test qui compte est donc celui qui vérifie qu'on renvoie `null`.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { estimatedMinutes, plannerMetricKeys } from './estimation.ts';

Deno.test("estimatedMinutes : sans allure apprise, AUCUNE minute n'est inventée", () => {
  assertEquals(estimatedMinutes(5, null), null);
  assertEquals(estimatedMinutes(0.5, null), null);
  assertEquals(estimatedMinutes(42, null), null);
});

Deno.test('estimatedMinutes : avec une allure apprise, la durée est celle DU joueur', () => {
  // 5 km à 6'00/km (360 s) = 30 min.
  assertEquals(estimatedMinutes(5, 360), 30);
  // Le même 5 km à 4'10/km (250 s) = ~21 min : deux joueurs, deux durées.
  assertEquals(estimatedMinutes(5, 250), 21);
});

Deno.test('estimatedMinutes : une allure abîmée ne produit pas un nombre', () => {
  assertEquals(estimatedMinutes(5, 0), null);
  assertEquals(estimatedMinutes(5, -300), null);
  assertEquals(estimatedMinutes(5, Number.NaN), null);
  assertEquals(estimatedMinutes(5, Number.POSITIVE_INFINITY), null);
});

Deno.test("estimatedMinutes : une distance qui n'en est pas ne produit pas un nombre", () => {
  assertEquals(estimatedMinutes(0, 360), null);
  assertEquals(estimatedMinutes(-3, 360), null);
  assertEquals(estimatedMinutes(Number.NaN, 360), null);
});

Deno.test('estimatedMinutes : une boucle très courte dit « 1 min », jamais « 0 min »', () => {
  // 0,05 km à 6'00/km = 18 s → « ~0 min » se lirait « instantané ».
  assertEquals(estimatedMinutes(0.05, 360), 1);
});

Deno.test('plannerMetricKeys : sans durée, le bloc ne montre QUE la distance', () => {
  assertEquals(plannerMetricKeys({ distanceKm: 5.2, minutes: null }), ['distance']);
});

Deno.test('plannerMetricKeys : les deux mesures sourcées donnent deux cellules', () => {
  assertEquals(plannerMetricKeys({ distanceKm: 5.2, minutes: 30 }), ['distance', 'duration']);
});

Deno.test('plannerMetricKeys : zéro source ⇒ zéro cellule (le bloc disparaît)', () => {
  assertEquals(plannerMetricKeys({ distanceKm: null, minutes: null }), []);
  assertEquals(plannerMetricKeys({ distanceKm: 0, minutes: 0 }), []);
  assertEquals(plannerMetricKeys({ distanceKm: Number.NaN, minutes: null }), []);
});

Deno.test('plannerMetricKeys : une durée sans distance reste affichable seule', () => {
  // Cas théorique (le tracé donne toujours les deux) : la fonction ne doit pas
  // pour autant supprimer une mesure VRAIE parce que l'autre manque.
  assertEquals(plannerMetricKeys({ distanceKm: null, minutes: 30 }), ['duration']);
});
