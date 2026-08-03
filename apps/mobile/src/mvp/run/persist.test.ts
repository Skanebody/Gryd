/**
 * GRYD — une course tuée ne disparaît pas, et on le SAIT (lot M5b).
 *
 * Ces tests portent sur un événement qu'on ne provoque pas à la main : tuer
 * l'app pendant une sortie. Les deux fautes visées sont invisibles autrement —
 * n'avoir rien écrit au moment du crash, et avoir écrit sans jamais le dire au
 * joueur (une trace qui survit sans que personne ne le sache est perdue quand
 * même).
 */
import {
  FLUSH_INTERVAL_MS,
  recoveryOffer,
  shouldFlush,
  toSnapshot,
  type StoredRunShape,
} from './persist';
import { CRASH_RECOVERY_MAX_AGE_MS } from './crashRecovery';

declare const Deno: { test(nom: string, fn: () => void | Promise<void>): void };

function assert(condition: boolean, message = 'assertion échouée'): void {
  if (!condition) throw new Error(message);
}
function assertEquals(actual: unknown, expected: unknown, message = 'valeurs différentes'): void {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message}\n  attendu : ${String(expected)}\n  obtenu  : ${String(actual)}`);
  }
}

const T0 = 1_770_000_000_000;

/** Une course de `n` points, dernier point à `finAt`. */
function course(n: number, finAt = T0): StoredRunShape {
  const fixes = [];
  for (let i = 0; i < n; i += 1) fixes.push({ ts: finAt - (n - 1 - i) * 1000 });
  return { startedAt: finAt - n * 1000, fixes };
}

// ─── Quand écrire ───────────────────────────────────────────────────────────

Deno.test('la PREMIÈRE écriture part tout de suite, sans attendre l’intervalle', () => {
  // Le cas qui compte le plus : une course tuée dans ses dix premières
  // secondes ne doit pas disparaître parce qu'on attendait le premier tour.
  assert(shouldFlush(null, T0, 1), 'rien écrit et rien de programmé');
});

Deno.test('ensuite, au plus une écriture par intervalle', () => {
  assert(!shouldFlush(T0, T0 + 1_000, 5), 'écriture 1 s après la précédente');
  assert(!shouldFlush(T0, T0 + FLUSH_INTERVAL_MS - 1, 5), 'écriture juste avant l’échéance');
  assert(shouldFlush(T0, T0 + FLUSH_INTERVAL_MS, 5), 'échéance atteinte sans écriture');
});

Deno.test('rien de neuf → rien à écrire', () => {
  // Réécrire une trace identique coûte une I/O sur le thread qui dessine, et
  // n'apporte rien.
  assert(!shouldFlush(null, T0, 0), 'écriture sans point en attente');
  assert(!shouldFlush(T0, T0 + 60_000, 0), 'écriture sans point en attente');
});

Deno.test('une horloge qui RECULE fait écrire, elle ne fait pas attendre', () => {
  // Changement d'heure, resynchro NTP : « c'était il y a −3 s » ne doit pas
  // repousser l'écriture. Se tromper vers l'écriture coûte une I/O ; l'inverse
  // coûte la course.
  assert(shouldFlush(T0, T0 - 3_000, 4), 'horloge en arrière : écriture repoussée');
  assert(shouldFlush(Number.NaN, T0, 4), 'horodatage aberrant : écriture repoussée');
});

// ─── Ce qu'on retrouve, et ce qu'on en dit ──────────────────────────────────

Deno.test('rien sur le disque → rien à proposer', () => {
  assertEquals(toSnapshot('r1', null), null);
  assertEquals(recoveryOffer([null, null], T0), 'none');
});

Deno.test('une vraie course interrompue est PROPOSÉE', () => {
  const s = toSnapshot('r1', course(40, T0 - 60_000));
  assertEquals(recoveryOffer([s], T0), 'resume');
});

Deno.test('un GO annulé avant le premier pas n’est PAS une course perdue', () => {
  // Un seul point (le départ) sans mouvement : proposer « reprendre » ici
  // ferait passer une hésitation pour un incident.
  assertEquals(recoveryOffer([toSnapshot('r1', course(1))], T0), 'none');
  assertEquals(recoveryOffer([toSnapshot('r1', course(0))], T0), 'none');
});

Deno.test('trop vieille pour interrompre le lancement → on ne propose plus', () => {
  const vieille = toSnapshot('r1', course(40, T0 - CRASH_RECOVERY_MAX_AGE_MS - 1));
  assertEquals(recoveryOffer([vieille], T0), 'none');
});

Deno.test('LES DEUX buffers comptent — le 2ᵉ kill ne perd pas la 2ᵉ course', () => {
  // `runStore` garde deux clés : une reprise en attente n'empêche pas une
  // nouvelle sortie d'être persistée. Il suffit qu'UNE des deux mérite d'être
  // proposée. Ne regarder que la première effacerait l'autre en silence.
  const rien = toSnapshot('r1', course(1));
  const vraie = toSnapshot('r2', course(40, T0 - 30_000));
  assertEquals(recoveryOffer([rien, vraie], T0), 'resume');
  assertEquals(recoveryOffer([vraie, rien], T0), 'resume');
});

Deno.test('la réduction ne garde AUCUNE position — seulement des horodatages', () => {
  // « Faut-il proposer ? » ne dépend jamais d'où le joueur a couru.
  const s = toSnapshot('r1', course(3, T0));
  assert(s !== null);
  assertEquals(s?.fixTimestamps.length, 3);
  assertEquals(Object.keys(s ?? {}).sort().join(','), 'fixTimestamps,runId,startedAt');
});
