/**
 * GRYD — E18 : les deux causes d'absence de boucle ne se confondent jamais.
 *
 * Ces tests gardent la seule chose que l'écran ne peut pas re-deviner tout seul :
 * un routeur qui A RÉPONDU n'a pas eu de panne réseau, et un routeur MUET n'a
 * pas dit qu'il n'y avait pas de boucle. Le jour où quelqu'un « simplifie » en
 * rendant `null` partout, ces deux assertions tombent.
 *
 * PUR : aucun import React Native, aucun fetch.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  classifyRoutingFailure,
  sameRequestCanSucceed,
  type RoutingFailure,
} from './routingOutcome.ts';

Deno.test('le routeur a répondu ⇒ c’est une absence de boucle, pas une panne', () => {
  assertEquals(classifyRoutingFailure({ routerAnswered: true }), 'noRoute');
});

Deno.test('le routeur n’a pas répondu ⇒ on n’accuse PAS le terrain', () => {
  // La faute est du côté du transport : dire « aucune boucle ici » serait une
  // affirmation sur le monde que la tentative n'a jamais permis d'observer.
  assertEquals(classifyRoutingFailure({ routerAnswered: false }), 'unreachable');
});

Deno.test('seul un routeur muet justifie de refaire la MÊME demande', () => {
  assert(sameRequestCanSucceed('unreachable'));
  // Rosace semée = requête déterministe : même demande ⇒ même absence. Un
  // « Réessayer » ici serait le bouton mort que la constitution interdit.
  assert(!sameRequestCanSucceed('noRoute'));
});

Deno.test('les deux causes sont couvertes — aucune ne tombe dans un trou', () => {
  const all: readonly RoutingFailure[] = ['unreachable', 'noRoute'];
  for (const f of all) assertEquals(typeof sameRequestCanSucceed(f), 'boolean');
  // Et la classification ne peut produire QUE des membres de ce type.
  for (const routerAnswered of [true, false]) {
    assert(all.includes(classifyRoutingFailure({ routerAnswered })));
  }
});
