/**
 * GRYD — la décision de retour à la carte ne dépend QUE de la pile réelle.
 *
 * Se tromper de branche est INVISIBLE à l'œil : la carte du dessus a l'air
 * parfaitement normale, empilée ou non. Le défaut ne se voit qu'au geste
 * retour, sur une ancienne instance à l'état périmé — exactement pourquoi la
 * décision est isolée ici, pure, plutôt que laissée à cinq copies du même `if`.
 *
 * ⚠️ Ce test importe `./navDecision`, PAS `./nav` : `nav.ts` importe
 * `expo-router` pour agir, et charger ce paquet sous Deno fait échouer le
 * chargement du module sur du JSX non transpilé plus bas dans son arbre de
 * dépendances (voir l'en-tête de `navDecision.ts`).
 */
import { decisionRetourCarte } from './navDecision';

declare const Deno: { test(nom: string, fn: () => void | Promise<void>): void };

function assertEquals(actual: unknown, expected: unknown, message = 'valeurs différentes'): void {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message}\n  attendu : ${JSON.stringify(expected)}\n  obtenu  : ${JSON.stringify(actual)}`);
  }
}

Deno.test('une pile EN DESSOUS remonte à la carte existante (dismissTo)', () => {
  assertEquals(decisionRetourCarte(true), 'dismissTo');
});

Deno.test('AUCUNE pile en dessous (lien profond, arrivée par un replace) remplace', () => {
  assertEquals(decisionRetourCarte(false), 'replace');
});
