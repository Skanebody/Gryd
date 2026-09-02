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
  activeElapsedMs,
  FLUSH_INTERVAL_MS,
  recoveryOffer,
  resumedDeadMs,
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

// ─── Le chrono ne compte JAMAIS le temps où l'app ne tournait pas ───────────

const MIN = 60_000;
const HEURE = 60 * MIN;

Deno.test('ÉTAPE 0 — 20 min courues, rouvertes 3 h plus tard : le mur disait 3 h 20', () => {
  // Le défaut, mot pour mot (`course.tsx` : `debutRef.current = stored.startedAt`
  // puis `Date.now() - debutRef.current`). Une course tuée à 20 min et reprise
  // 3 h plus tard affichait 3 h 20 — et la même durée servait de stat locale.
  const depart = T0;
  const dernierReleve = depart + 20 * MIN; // l'app est tuée ici
  const reprise = dernierReleve + 3 * HEURE; // le coureur rouvre 3 h plus tard

  // La formule d'AVANT, recalculée telle quelle : voilà le mensonge.
  assertEquals(reprise - depart, 3 * HEURE + 20 * MIN, 'le chrono du mur ne dit pas 3 h 20');

  // Ce que le module rend maintenant : le temps MORT est mesuré et retranché.
  const stocke: StoredRunShape = {
    startedAt: depart,
    fixes: [{ ts: depart }, { ts: dernierReleve }],
  };
  const mort = resumedDeadMs(stocke, reprise);
  assertEquals(mort, 3 * HEURE, 'le temps mort mesuré n’est pas l’écart réel');
  assertEquals(activeElapsedMs(depart, mort, reprise), 20 * MIN, 'le chrono ment encore');
});

Deno.test('le temps mort S’ACCUMULE — un 2ᵉ kill ne rend pas le 1ᵉʳ au chrono', () => {
  // C'est toute la raison de le PERSISTER. Sans cumul, la deuxième reprise
  // repartirait du mur et rendrait au chrono les heures de la première.
  //
  // Le scénario, dans l'ordre : 5 min courues → kill → 3 h → reprise (temps
  // mort écrit sur le disque) → 5 min de plus → 2ᵉ kill → 2 h → 2ᵉ reprise.
  // Au total 10 min courues pour 5 h 10 au mur.
  const depart = T0;
  const dernierReleve = depart + 3 * HEURE + 10 * MIN;
  const reprise = dernierReleve + 2 * HEURE;
  const stocke: StoredRunShape = {
    startedAt: depart,
    fixes: [{ ts: dernierReleve }],
    deadMs: 3 * HEURE, // temps mort de la première interruption, déjà écrit
  };
  assertEquals(reprise - depart, 5 * HEURE + 10 * MIN, 'le mur ne dit pas 5 h 10');
  assertEquals(resumedDeadMs(stocke, reprise), 5 * HEURE);
  assertEquals(activeElapsedMs(depart, 5 * HEURE, reprise), 10 * MIN);
});

Deno.test('aucune interruption → aucun temps mort inventé', () => {
  // Le cas normal : l'app tourne, le dernier relevé date de l'instant même.
  // Retrancher quoi que ce soit ici ferait mentir le chrono dans l'autre sens.
  const depart = T0;
  const maintenant = depart + 12 * MIN;
  const stocke: StoredRunShape = { startedAt: depart, fixes: [{ ts: maintenant }] };
  assertEquals(resumedDeadMs(stocke, maintenant), 0);
  assertEquals(activeElapsedMs(depart, 0, maintenant), 12 * MIN);
});

Deno.test('un temps mort ILLISIBLE sur le disque n’est pas cru', () => {
  // Valeur négative, aberrante ou absente (course écrite par une version
  // antérieure) : on ne retranche que ce qu'on sait mesurer — l'écart de CETTE
  // reprise. Croire un `deadMs` négatif ALLONGERAIT le chrono.
  const depart = T0;
  const dernierReleve = depart + 5 * MIN;
  const reprise = dernierReleve + HEURE;
  const base = { startedAt: depart, fixes: [{ ts: dernierReleve }] };
  assertEquals(resumedDeadMs({ ...base, deadMs: -9 * HEURE }, reprise), HEURE);
  assertEquals(resumedDeadMs({ ...base, deadMs: Number.NaN }, reprise), HEURE);
  assertEquals(resumedDeadMs(base, reprise), HEURE);
});

Deno.test('une horloge qui RECULE ne fabrique pas de temps mort négatif', () => {
  // Changement d'heure, resynchro NTP : un écart négatif signifierait « le
  // dernier relevé est dans le futur ». On ne retranche rien plutôt que
  // d'ajouter du temps à une course.
  const depart = T0;
  const stocke: StoredRunShape = { startedAt: depart, fixes: [{ ts: depart + HEURE }] };
  assertEquals(resumedDeadMs(stocke, depart + 10 * MIN), 0);
  assertEquals(resumedDeadMs(stocke, Number.NaN), 0);
});

Deno.test('sans AUCUN relevé, rien ne prouve qu’une seconde ait été courue', () => {
  // Le dernier instant CONNU est alors le départ lui-même : tout ce qui a suivi
  // est du temps qu'aucun point ne vient attester. Se tromper dans ce sens fait
  // afficher moins ; l'inverse ferait afficher une course qui n'a pas eu lieu.
  const stocke: StoredRunShape = { startedAt: T0, fixes: [] };
  assertEquals(resumedDeadMs(stocke, T0 + 3 * HEURE), 3 * HEURE);
  assertEquals(activeElapsedMs(T0, 3 * HEURE, T0 + 3 * HEURE), 0);
});

Deno.test('le chrono ACTIF ne descend jamais sous zéro', () => {
  // Un temps mort plus grand que le mur (horodatages incohérents) rendrait une
  // durée négative — « −00:12 » à l'écran, et une allure absurde dans les stats.
  assertEquals(activeElapsedMs(T0, 4 * HEURE, T0 + HEURE), 0);
  assertEquals(activeElapsedMs(T0, 0, Number.NaN), 0);
  assertEquals(activeElapsedMs(Number.NaN, 0, T0), 0);
});

Deno.test('la réduction ne garde AUCUNE position — seulement des horodatages', () => {
  // « Faut-il proposer ? » ne dépend jamais d'où le joueur a couru.
  const s = toSnapshot('r1', course(3, T0));
  assert(s !== null);
  assertEquals(s?.fixTimestamps.length, 3);
  assertEquals(Object.keys(s ?? {}).sort().join(','), 'fixTimestamps,runId,startedAt');
});
