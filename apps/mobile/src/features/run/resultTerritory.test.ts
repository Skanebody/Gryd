/**
 * GRYD — LA SURFACE AFFICHÉE EST CELLE DE CETTE SORTIE, ET DE PERSONNE D'AUTRE.
 *
 * Deux risques réels, deux familles de tests :
 *  1. LA MAUVAISE LIGNE. `territories` contient toutes mes zones ; en afficher
 *     une autre sous ce résultat donnerait au joueur un chiffre faux qu'il
 *     croirait — le pire genre de mensonge, parce qu'il est plausible.
 *  2. LA VICTOIRE DE L'ADVERSAIRE. La RLS de 0078 rend une contestation visible
 *     des DEUX parties. Sans filtre de propriété, l'ATTAQUANT dont la cible s'est
 *     défendue lirait « échéance évitée » sur sa propre course.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  pickDefendedContest,
  pickRunTerritory,
  type ResultContestRow,
  type ResultTerritoryRow,
} from './resultTerritory.ts';

const RUN = 'run-42';
const ME = 'user-me';
const MY_CREW = 'crew-mine';

function territory(over: Partial<ResultTerritoryRow> = {}): ResultTerritoryRow {
  return { id: 't1', area_m2: 12_345, defense_level: 1, source_run_id: RUN, ...over };
}

// ── 1. LE TERRITOIRE DE CETTE SORTIE ───────────────────────────────────────

Deno.test('territoire : la ligne de CETTE course donne sa surface réelle', () => {
  assertEquals(pickRunTerritory([territory()], RUN), { areaM2: 12_345, protectionLevel: 1 });
});

Deno.test('territoire : une ligne d’une AUTRE course n’est jamais servie ici', () => {
  assertEquals(pickRunTerritory([territory({ source_run_id: 'run-7' })], RUN), null);
});

Deno.test('territoire : sans runId, sans lignes, ou liste vide ⇒ rien', () => {
  assertEquals(pickRunTerritory([territory()], null), null);
  assertEquals(pickRunTerritory(null, RUN), null);
  assertEquals(pickRunTerritory([], RUN), null);
});

Deno.test('territoire : doublon improbable (0075) ⇒ la plus grande, pas la première', () => {
  const rows = [territory({ id: 'a', area_m2: 100 }), territory({ id: 'b', area_m2: 900 })];
  assertEquals(pickRunTerritory(rows, RUN)?.areaM2, 900);
});

Deno.test('territoire : une aire absente reste absente (le module ne la comble pas)', () => {
  assertEquals(pickRunTerritory([territory({ area_m2: null })], RUN), {
    areaM2: null,
    protectionLevel: 1,
  });
});

// ── 2. LA CONTESTATION REFERMÉE PAR MA DÉFENSE ─────────────────────────────

const NOW = Date.parse('2026-07-27T12:00:00.000Z');
const WINDOW_START = NOW - 6 * 60 * 60 * 1000;

function contest(over: Partial<ResultContestRow> = {}): ResultContestRow {
  return {
    status: 'defended',
    resolved_at: '2026-07-27T11:30:00.000Z',
    expires_at: '2026-07-28T09:00:00.000Z',
    territories: { owner_type: 'user', owner_id: ME, area_m2: 55_000, defense_level: 2 },
    ...over,
  };
}

const CTX = { meId: ME, myCrewId: MY_CREW, windowStartMs: WINDOW_START, nowMs: NOW };

Deno.test('défense : ma zone défendue rend l’échéance évitée et la protection', () => {
  assertEquals(pickDefendedContest([contest()], CTX), {
    deadlineAvoidedAt: '2026-07-28T09:00:00.000Z',
    defendedAt: '2026-07-27T11:30:00.000Z',
    areaM2: 55_000,
    protectionLevel: 2,
  });
});

Deno.test('défense : une zone défendue par un AUTRE ne s’affiche pas sur ma course', () => {
  const other = contest({
    territories: { owner_type: 'user', owner_id: 'user-rival', area_m2: 9, defense_level: 5 },
  });
  assertEquals(pickDefendedContest([other], CTX), null);
});

Deno.test('défense : une zone de MON crew compte comme mienne', () => {
  const crewZone = contest({
    territories: { owner_type: 'crew', owner_id: MY_CREW, area_m2: 77_000, defense_level: 3 },
  });
  assertEquals(pickDefendedContest([crewZone], CTX)?.areaM2, 77_000);
  // …mais pas celle d'un autre crew, même si la RLS m'a laissé voir la ligne.
  const otherCrew = contest({
    territories: { owner_type: 'crew', owner_id: 'crew-rival', area_m2: 1, defense_level: 9 },
  });
  assertEquals(pickDefendedContest([otherCrew], CTX), null);
});

Deno.test('défense : sans crew chargé, une zone de crew ne s’attribue à personne', () => {
  const crewZone = contest({
    territories: { owner_type: 'crew', owner_id: MY_CREW, area_m2: 77_000, defense_level: 3 },
  });
  assertEquals(pickDefendedContest([crewZone], { ...CTX, myCrewId: null }), null);
});

Deno.test('défense : une contestation encore ACTIVE n’a évité aucune échéance', () => {
  assertEquals(pickDefendedContest([contest({ status: 'active' })], CTX), null);
  assertEquals(pickDefendedContest([contest({ status: 'transferred' })], CTX), null);
});

Deno.test('défense : hors de la fenêtre de cette sortie ⇒ ce n’est pas son œuvre', () => {
  // Refermée il y a deux jours.
  assertEquals(
    pickDefendedContest([contest({ resolved_at: '2026-07-25T11:30:00.000Z' })], CTX),
    null,
  );
  // Refermée « dans le futur » : skew d'horloge, pas un fait.
  assertEquals(
    pickDefendedContest([contest({ resolved_at: '2026-07-27T13:00:00.000Z' })], CTX),
    null,
  );
});

Deno.test('défense : la plus RÉCENTE gagne quand plusieurs ont été refermées', () => {
  const rows = [
    contest({ resolved_at: '2026-07-27T08:00:00.000Z', expires_at: '2026-07-27T20:00:00.000Z' }),
    contest({ resolved_at: '2026-07-27T11:45:00.000Z', expires_at: '2026-07-29T20:00:00.000Z' }),
  ];
  assertEquals(pickDefendedContest(rows, CTX)?.defendedAt, '2026-07-27T11:45:00.000Z');
});

Deno.test('défense : embed PostgREST en TABLEAU accepté, forme inconnue ⇒ rien', () => {
  const asArray = contest({
    territories: [{ owner_type: 'user', owner_id: ME, area_m2: 3_000, defense_level: 1 }],
  });
  assertEquals(pickDefendedContest([asArray], CTX)?.areaM2, 3_000);
  assertEquals(pickDefendedContest([contest({ territories: null })], CTX), null);
  assertEquals(pickDefendedContest([contest({ territories: [] })], CTX), null);
});

Deno.test('défense : une ligne incomplète (dates manquantes) ne devine rien', () => {
  assertEquals(pickDefendedContest([contest({ resolved_at: null })], CTX), null);
  assertEquals(pickDefendedContest([contest({ expires_at: null })], CTX), null);
  assertEquals(pickDefendedContest([contest({ resolved_at: 'pas une date' })], CTX), null);
});

Deno.test('défense : hors session (aucun identifiant) ⇒ aucune attribution', () => {
  assertEquals(pickDefendedContest([contest()], { ...CTX, meId: null }), null);
  assertEquals(pickDefendedContest(null, CTX), null);
});
