/**
 * GRYD — tests du bouton unique du planificateur.
 *
 * L'invariant central tient en une phrase : le bouton porte TOUJOURS un geste
 * que le joueur peut faire, et il ne lance la course QUE si la position est
 * confirmée ET qu'un vrai tracé existe. Un seul de ces deux tests suffit à
 * rattraper la régression qui remettrait un CTA chartreuse mort en bas d'écran.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { ctaStartsRun, plannerCta, type PlannerCtaKind } from './plannerCta.ts';

Deno.test("sans rien avoir demandé au capteur, le geste est « Ma position »", () => {
  assertEquals(plannerCta({ gps: 'unasked', hasRoute: false, routing: false }), 'locate');
  // Même avec un tracé qui traîne d'une origine précédente : sans position
  // confirmée, partir n'a pas de sens.
  assertEquals(plannerCta({ gps: 'unasked', hasRoute: true, routing: false }), 'locate');
});

Deno.test('pendant la recherche, le bouton reste « Ma position » (pas un troisième libellé)', () => {
  assertEquals(plannerCta({ gps: 'locating', hasRoute: false, routing: false }), 'locate');
});

Deno.test("après un échec, le verbe change : on ne « réessaie » que ce qui a été tenté", () => {
  assertEquals(plannerCta({ gps: 'error', hasRoute: false, routing: false }), 'retryLocation');
  assertEquals(plannerCta({ gps: 'error', hasRoute: true, routing: true }), 'retryLocation');
});

Deno.test('position acquise, calcul en vol : le bouton attend, il ne part pas', () => {
  assertEquals(plannerCta({ gps: 'ok', hasRoute: false, routing: true }), 'routing');
  assertEquals(plannerCta({ gps: 'ok', hasRoute: true, routing: true }), 'routing');
});

Deno.test('position acquise, routeur muet : le geste utile est de relancer le tracé', () => {
  assertEquals(plannerCta({ gps: 'ok', hasRoute: false, routing: false }), 'retryRoute');
});

Deno.test('position confirmée + tracé réel : et seulement là, on part', () => {
  assertEquals(plannerCta({ gps: 'ok', hasRoute: true, routing: false }), 'start');
});

Deno.test("« start » est le SEUL état qui engage le joueur", () => {
  const kinds: readonly PlannerCtaKind[] = [
    'locate',
    'retryLocation',
    'routing',
    'retryRoute',
    'start',
  ];
  assertEquals(kinds.filter(ctaStartsRun), ['start']);
});

Deno.test("aucune combinaison ne laisse le bouton sans geste", () => {
  const gpsStates = ['unasked', 'locating', 'ok', 'error'] as const;
  for (const gps of gpsStates) {
    for (const hasRoute of [true, false]) {
      for (const routing of [true, false]) {
        const kind = plannerCta({ gps, hasRoute, routing });
        // Un `kind` défini = un libellé et une action à rendre. La seule façon
        // d'obtenir un bouton mort serait un cas non couvert.
        assertEquals(typeof kind, 'string');
      }
    }
  }
});
