/**
 * GRYD — ce que la mémoire du territoire doit tenir, prouvé.
 *
 * Ce module porte la phrase du produit (« ce quartier était à toi de mars à
 * septembre »). Une phrase pareille ne peut PAS être approximative : elle nomme
 * une date, un lieu et une durée, et un joueur la vérifiera de mémoire.
 *
 * Ce que ces tests gardent, dans l'ordre de gravité :
 *   1. une ligne illisible est ÉCARTÉE, jamais réparée — une date devinée
 *      raconterait une histoire qui n'a pas eu lieu ;
 *   2. « perdu » et « libéré » ne se confondent jamais ;
 *   3. un règne EN COURS n'est pas un règne fini, et sa durée court ;
 *   4. la durée ne dépend d'aucune horloge implicite (`nowMs` est injecté).
 */
import {
  buildTerritoryHistory,
  longestFinishedReign,
  type RawReign,
} from './territoryHistory.ts';

declare const Deno: { test(nom: string, fn: () => void | Promise<void>): void };

function assert(condition: boolean, message = 'assertion échouée'): void {
  if (!condition) throw new Error(message);
}

function assertEquals(actual: unknown, expected: unknown, message = 'valeurs différentes'): void {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message}\n  attendu : ${String(expected)}\n  obtenu  : ${String(actual)}`);
  }
}

const JOUR = 24 * 60 * 60 * 1000;
const MARS = Date.parse('2026-03-04T08:00:00.000Z');
const SEPT = Date.parse('2026-09-04T08:00:00.000Z');
const MAINTENANT = Date.parse('2026-10-01T12:00:00.000Z');

function reign(patch: Partial<RawReign> = {}): RawReign {
  return {
    territoryId: 't1',
    activity: 'run',
    cityId: 'paris',
    areaM2: 12345,
    startedAt: new Date(MARS).toISOString(),
    endedAt: null,
    endedReason: null,
    ...patch,
  };
}

// ─── 1. La phrase du produit ────────────────────────────────────────────────

Deno.test('« de mars à septembre » : la durée est celle du règne, pas celle d’aujourd’hui', () => {
  const h = buildTerritoryHistory(
    [reign({ endedAt: new Date(SEPT).toISOString(), endedReason: 'lost' })],
    MAINTENANT,
  );
  assertEquals(h.reigns.length, 1);
  const r = h.reigns[0]!;
  assertEquals(r.ongoing, false, 'le règne est terminé');
  assertEquals(r.endedReason, 'lost');
  assertEquals(r.heldDays, Math.floor((SEPT - MARS) / JOUR), 'mars → septembre');
  // Et surtout : la durée NE COURT PAS jusqu'à maintenant.
  assert(r.heldDays < Math.floor((MAINTENANT - MARS) / JOUR), 'un règne clos ne grandit plus');
});

Deno.test('un règne EN COURS compte jusqu’à maintenant', () => {
  const h = buildTerritoryHistory([reign()], MAINTENANT);
  const r = h.reigns[0]!;
  assertEquals(r.ongoing, true);
  assertEquals(r.endedAtMs, null);
  assertEquals(r.endedReason, null, 'un règne en cours n’a AUCUNE raison de fin');
  assertEquals(r.heldDays, Math.floor((MAINTENANT - MARS) / JOUR));
});

Deno.test('aucune horloge implicite : la même entrée à deux instants donne deux durées', () => {
  const plusTard = MAINTENANT + 30 * JOUR;
  const a = buildTerritoryHistory([reign()], MAINTENANT).reigns[0]!;
  const b = buildTerritoryHistory([reign()], plusTard).reigns[0]!;
  assertEquals(b.heldDays - a.heldDays, 30, 'la durée suit `nowMs`, injecté');
});

// ─── 2. Perdu ≠ libéré ──────────────────────────────────────────────────────

Deno.test('« perdu » et « libéré » ne sont JAMAIS additionnés', () => {
  const h = buildTerritoryHistory(
    [
      reign({ territoryId: 'a', endedAt: new Date(SEPT).toISOString(), endedReason: 'lost' }),
      reign({ territoryId: 'b', endedAt: new Date(SEPT).toISOString(), endedReason: 'released' }),
      reign({ territoryId: 'c' }),
    ],
    MAINTENANT,
  );
  assertEquals(h.lostCount, 1, 'un seul perdu au profit de quelqu’un');
  assertEquals(h.releasedCount, 1, 'un seul libéré');
  assertEquals(h.holdingCount, 1, 'un seul en cours');
});

Deno.test('une raison de fin inconnue n’est comptée NULLE PART', () => {
  // Un motif futur qu'on ne sait pas interpréter ne doit pas gonfler « perdu ».
  const h = buildTerritoryHistory(
    [reign({ endedAt: new Date(SEPT).toISOString(), endedReason: 'expropriated' })],
    MAINTENANT,
  );
  assertEquals(h.reigns[0]!.endedReason, null, 'motif inconnu → null');
  assertEquals(h.lostCount, 0);
  assertEquals(h.releasedCount, 0);
});

// ─── 3. Une ligne illisible est écartée, jamais réparée ─────────────────────

Deno.test('une date de début absente ou illisible ÉCARTE la ligne', () => {
  for (const startedAt of ['', 'hier', 'null'] as const) {
    const h = buildTerritoryHistory([reign({ startedAt })], MAINTENANT);
    assertEquals(h.reigns.length, 0, `« ${startedAt} » ne doit produire aucun règne`);
  }
});

Deno.test('une fin ANTÉRIEURE au début écarte la ligne (état impossible)', () => {
  const h = buildTerritoryHistory(
    [reign({ startedAt: new Date(SEPT).toISOString(), endedAt: new Date(MARS).toISOString() })],
    MAINTENANT,
  );
  assertEquals(h.reigns.length, 0, 'on n’essaie pas de remettre les dates à l’endroit');
});

Deno.test('un territoire sans surface n’a jamais existé', () => {
  for (const areaM2 of [0, -1, Number.NaN]) {
    const h = buildTerritoryHistory([reign({ areaM2 })], MAINTENANT);
    assertEquals(h.reigns.length, 0, `aire ${areaM2}`);
  }
});

Deno.test('une horloge en retard ne produit jamais une durée négative', () => {
  const h = buildTerritoryHistory([reign()], MARS - 10 * JOUR);
  assertEquals(h.reigns[0]!.heldDays, 0, 'plancher à 0, jamais -10');
});

// ─── 4. L'histoire vide, et ce qu'on n'invente pas ──────────────────────────

Deno.test('aucun règne : tout est neutre, rien n’est inventé', () => {
  const h = buildTerritoryHistory([], MAINTENANT);
  assertEquals(h.reigns.length, 0);
  assertEquals(h.holdingCount, 0);
  assertEquals(h.lostCount, 0);
  assertEquals(h.longestDays, null, '`null`, jamais 0 — 0 affirmerait un règne d’un jour');
  assertEquals(h.firstKnownAtMs, null, 'on ne prétend pas savoir depuis quand il joue');
});

Deno.test('firstKnownAtMs est le plus ANCIEN début connu', () => {
  const vieux = MARS - 200 * JOUR;
  const h = buildTerritoryHistory(
    [reign({ territoryId: 'a' }), reign({ territoryId: 'b', startedAt: new Date(vieux).toISOString() })],
    MAINTENANT,
  );
  assertEquals(h.firstKnownAtMs, vieux);
});

Deno.test('les règnes sortent du plus RÉCENT au plus ancien', () => {
  const vieux = MARS - 100 * JOUR;
  const h = buildTerritoryHistory(
    [
      reign({ territoryId: 'vieux', startedAt: new Date(vieux).toISOString() }),
      reign({ territoryId: 'recent' }),
    ],
    MAINTENANT,
  );
  assertEquals(h.reigns[0]!.territoryId, 'recent', 'ordre de lecture d’une histoire');
});

// ─── 5. La phrase du produit ne se raconte pas avant sa fin ─────────────────

Deno.test('sans règne terminé, il n’y a AUCUNE histoire à raconter', () => {
  const h = buildTerritoryHistory([reign(), reign({ territoryId: 't2' })], MAINTENANT);
  assertEquals(longestFinishedReign(h), null, 'on ne raconte pas une fin qui n’a pas eu lieu');
});

Deno.test('le plus long règne TERMINÉ est celui qui porte la phrase', () => {
  const court = { endedAt: new Date(MARS + 5 * JOUR).toISOString(), endedReason: 'lost' as const };
  const long = { endedAt: new Date(SEPT).toISOString(), endedReason: 'lost' as const };
  const h = buildTerritoryHistory(
    [
      reign({ territoryId: 'court', ...court }),
      reign({ territoryId: 'long', ...long }),
      // Un règne EN COURS plus long ne doit pas voler la phrase : il n'a pas
      // de fin, donc « était à toi de … à … » ne s'écrit pas.
      reign({ territoryId: 'encore', startedAt: new Date(MARS - 300 * JOUR).toISOString() }),
    ],
    MAINTENANT,
  );
  assertEquals(longestFinishedReign(h)?.territoryId, 'long');
});
