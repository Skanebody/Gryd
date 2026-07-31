/**
 * GRYD — tests du bouton unique du planificateur.
 *
 * L'invariant central tient en une phrase : le bouton porte TOUJOURS un geste
 * que le joueur peut faire, et il ne lance la course QUE si la position est
 * confirmée ET qu'un vrai tracé existe. Un seul de ces deux tests suffit à
 * rattraper la régression qui remettrait un CTA chartreuse mort en bas d'écran.
 *
 * Depuis le 28/07/2026, « geste que le joueur peut faire » est vérifié PLUS
 * FINEMENT : un geste qui ne peut pas aboutir (relancer à l'identique une
 * requête dont le routeur a déjà donné le verdict) compte comme un bouton mort.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { ctaStartsRun, plannerCta, type PlannerCtaKind } from './plannerCta.ts';
import type { RoutingFailure } from './routingOutcome.ts';

Deno.test('sans rien avoir demandé au capteur, le geste est « Ma position »', () => {
  assertEquals(
    plannerCta({ gps: 'unasked', hasRoute: false, routing: false, failure: null }),
    'locate',
  );
  // Même avec un tracé qui traîne d'une origine précédente : sans position
  // confirmée, partir n'a pas de sens.
  assertEquals(
    plannerCta({ gps: 'unasked', hasRoute: true, routing: false, failure: null }),
    'locate',
  );
});

Deno.test('pendant la recherche, le bouton reste « Ma position » (pas un troisième libellé)', () => {
  assertEquals(
    plannerCta({ gps: 'locating', hasRoute: false, routing: false, failure: null }),
    'locate',
  );
});

Deno.test('après un échec, le verbe change : on ne « réessaie » que ce qui a été tenté', () => {
  assertEquals(
    plannerCta({ gps: 'error', hasRoute: false, routing: false, failure: null }),
    'retryLocation',
  );
  assertEquals(
    plannerCta({ gps: 'error', hasRoute: true, routing: true, failure: 'noRoute' }),
    'retryLocation',
  );
});

Deno.test('position acquise, calcul en vol : le bouton attend, il ne part pas', () => {
  assertEquals(plannerCta({ gps: 'ok', hasRoute: false, routing: true, failure: null }), 'routing');
  assertEquals(plannerCta({ gps: 'ok', hasRoute: true, routing: true, failure: null }), 'routing');
});

Deno.test('routeur MUET : le geste utile est de relancer le même tracé', () => {
  assertEquals(
    plannerCta({ gps: 'ok', hasRoute: false, routing: false, failure: 'unreachable' }),
    'retryRoute',
  );
  // Cause inconnue (rien n'a encore été classé) : on garde le réessai, c'est le
  // comportement historique et il peut aboutir.
  assertEquals(
    plannerCta({ gps: 'ok', hasRoute: false, routing: false, failure: null }),
    'retryRoute',
  );
});

Deno.test('routeur qui A RÉPONDU « pas de boucle ici » : jamais un réessai voué à l’échec', () => {
  assertEquals(
    plannerCta({ gps: 'ok', hasRoute: false, routing: false, failure: 'noRoute' }),
    'newLoop',
  );
});

Deno.test('position confirmée + tracé réel : et seulement là, on part', () => {
  assertEquals(plannerCta({ gps: 'ok', hasRoute: true, routing: false, failure: null }), 'start');
});

Deno.test('« start » est le SEUL état qui engage le joueur', () => {
  const kinds: readonly PlannerCtaKind[] = [
    'locate',
    'retryLocation',
    'routing',
    'retryRoute',
    'newLoop',
    'start',
  ];
  assertEquals(kinds.filter(ctaStartsRun), ['start']);
});

Deno.test('aucune combinaison ne laisse le bouton sans geste', () => {
  const gpsStates = ['unasked', 'locating', 'ok', 'error'] as const;
  const failures: readonly (RoutingFailure | null)[] = [null, 'unreachable', 'noRoute'];
  for (const gps of gpsStates) {
    for (const hasRoute of [true, false]) {
      for (const routing of [true, false]) {
        for (const failure of failures) {
          const kind = plannerCta({ gps, hasRoute, routing, failure });
          // Un `kind` défini = un libellé et une action à rendre. La seule façon
          // d'obtenir un bouton mort serait un cas non couvert.
          assertEquals(typeof kind, 'string');
          // …et un cas couvert par un geste IMPOSSIBLE en serait un autre :
          // proposer de refaire une requête dont le verdict est déjà connu.
          if (failure === 'noRoute' && gps === 'ok' && !routing && !hasRoute) {
            assertEquals(kind, 'newLoop');
          }
        }
      }
    }
  }
});
