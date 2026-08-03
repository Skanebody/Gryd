/**
 * GRYD — le téléphone ne vibre ni trop, ni pour annoncer une mauvaise nouvelle.
 *
 * L6 ne se voit sur AUCUNE capture d'écran : un `ux-gate` visuel la laisse
 * passer intégralement, et le produit se retrouve muet dans la main de
 * quelqu'un qui court en regardant la route. Ces tests sont donc la seule
 * vérification possible de cette loi.
 */
import { gaugeHaptic, resultHaptic, signalHaptic, type GaugePhase } from './feedback';

declare const Deno: { test(nom: string, fn: () => void | Promise<void>): void };

function assert(condition: boolean, message = 'assertion échouée'): void {
  if (!condition) throw new Error(message);
}
function assertEquals(actual: unknown, expected: unknown, message = 'valeurs différentes'): void {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message}\n  attendu : ${String(expected)}\n  obtenu  : ${String(actual)}`);
  }
}

const PHASES: GaugePhase[] = ['silent', 'closed', 'almost', 'missing'];

// ─── LE test : ne pas vibrer en continu ─────────────────────────────────────

Deno.test('un état INCHANGÉ ne vibre jamais', () => {
  // La jauge est recalculée à chaque point GPS, soit ~1 fois par seconde.
  // Brancher l'haptique sur l'ÉTAT ferait vibrer sans discontinuer pendant tout
  // le retour vers le départ — et l'information disparaîtrait dans le bruit
  // exactement au moment où elle compte.
  for (const p of PHASES) assertEquals(gaugeHaptic(p, p), null, `${p} → ${p}`);
});

// ─── Ce qui parle, et ce qui se tait ────────────────────────────────────────

Deno.test('la FERMETURE vibre — c’est le moment que le joueur attend', () => {
  assertEquals(gaugeHaptic('missing', 'closed'), 'medium');
  assertEquals(gaugeHaptic('almost', 'closed'), 'medium');
  assertEquals(gaugeHaptic('silent', 'closed'), 'medium');
});

Deno.test('la QUASI-fermeture vibre plus discrètement', () => {
  assertEquals(gaugeHaptic('missing', 'almost'), 'light');
});

Deno.test('S’ÉLOIGNER ne vibre PAS : ce n’est pas un événement', () => {
  // Une alerte à chaque mètre perdu transformerait la jauge en réprimande —
  // exactement ce que L19 interdit.
  assertEquals(gaugeHaptic('closed', 'missing'), null);
  assertEquals(gaugeHaptic('almost', 'missing'), null);
  assertEquals(gaugeHaptic('closed', 'silent'), null);
});

Deno.test('INVARIANT : aucune transition vers `missing` ou `silent` ne vibre', () => {
  for (const avant of PHASES) {
    assertEquals(gaugeHaptic(avant, 'missing'), null, `${avant} → missing`);
    assertEquals(gaugeHaptic(avant, 'silent'), null, `${avant} → silent`);
  }
});

// ─── Le signal ──────────────────────────────────────────────────────────────

Deno.test('la PERTE d’un signal qu’on avait alerte — et rien d’autre', () => {
  assertEquals(signalHaptic('good', 'weak'), 'error');
  assertEquals(signalHaptic('good', 'searching'), 'error');
});

Deno.test('la recherche initiale ne crie PAS à la panne', () => {
  // Vibrer au démarrage, quand le signal n'est pas encore arrivé, alerterait
  // pendant les trois secondes normales de recherche.
  assertEquals(signalHaptic('searching', 'weak'), null);
  assertEquals(signalHaptic('searching', 'searching'), null);
  assertEquals(signalHaptic('weak', 'searching'), null);
  // Retrouver le signal est une bonne nouvelle : elle se voit, elle ne s'impose pas.
  assertEquals(signalHaptic('weak', 'good'), null);
});

// ─── Le résultat ────────────────────────────────────────────────────────────

Deno.test('la CAPTURE est le seul `success` du MVP (L7, peak-end)', () => {
  assertEquals(resultHaptic('captured'), 'success');
  assertEquals(resultHaptic('takenNoArea'), 'light');
});

Deno.test('un REFUS ne vibre pas — l’app n’accuse jamais, même physiquement', () => {
  for (const k of ['missing', 'noLoop', 'refused', 'pending', 'lost']) {
    assertEquals(resultHaptic(k), null, `issue « ${k} »`);
  }
});
