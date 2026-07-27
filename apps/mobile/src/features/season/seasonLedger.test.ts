/**
 * GRYD — registre des saisons : le numéro est DÉRIVÉ comme en SQL (0060), les
 * lignes bancales sont écartées (jamais réparées), et rien n'est inventé quand
 * la base est vide — ce qui est l'état d'aujourd'hui.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  assertSingleCity,
  lastClosedSeason,
  nextSeasonAfter,
  parseSeasonRow,
  seasonLedger,
} from './seasonLedger.ts';

const row = (
  id: string,
  starts: string,
  ends: string,
  status: string,
  cityId = 'paris',
) => ({ id, city_id: cityId, starts_at: starts, ends_at: ends, status });

Deno.test('une ligne incomplète ou incohérente n’est pas affichable', () => {
  assertEquals(parseSeasonRow(null), null);
  assertEquals(parseSeasonRow({ id: 's1' }), null);
  // statut inconnu
  assertEquals(parseSeasonRow(row('s1', '2026-01-01', '2026-03-01', 'paused')), null);
  // fenêtre inversée : on n'ordonne pas les bornes à sa place
  assertEquals(parseSeasonRow(row('s1', '2026-03-01', '2026-01-01', 'closed')), null);
  // bornes illisibles
  assertEquals(parseSeasonRow(row('s1', 'hier', 'demain', 'closed')), null);
});

Deno.test('numéro = rang 0-indexé par ancienneté, comme la RPC season_current', () => {
  const ledger = seasonLedger([
    row('s2', '2026-03-01', '2026-05-01', 'closed'),
    row('s0', '2025-09-01', '2025-11-01', 'reset'),
    row('s1', '2026-01-01', '2026-03-01', 'closed'),
  ]);
  assertEquals(ledger.map((s) => s.seasonId), ['s0', 's1', 's2']);
  assertEquals(ledger.map((s) => s.number), [0, 1, 2]); // la PREMIÈRE est « Saison 0 »
});

Deno.test('numéro PARTAGÉ à égalité de starts_at (aucun numéro fabriqué)', () => {
  const ledger = seasonLedger([
    row('a', '2026-01-01', '2026-03-01', 'closed'),
    row('b', '2026-01-01', '2026-03-01', 'closed'),
  ]);
  assertEquals(ledger.map((s) => s.number), [0, 0]);
});

Deno.test('base vide : aucune saison précédente, aucune suivante', () => {
  const ledger = seasonLedger([]);
  assertEquals(ledger, []);
  assertEquals(lastClosedSeason(ledger), null);
});

Deno.test('la saison précédente = la dernière TERMINÉE, jamais l’active', () => {
  const ledger = seasonLedger([
    row('s0', '2025-09-01', '2025-11-01', 'reset'),
    row('s1', '2026-01-01', '2026-03-01', 'closed'),
    row('s2', '2026-04-01', '2026-06-01', 'active'),
  ]);
  assertEquals(lastClosedSeason(ledger)?.seasonId, 's1');
  // 'reset' compte comme terminée (la carte est wipée, le rang reste gelé).
  assertEquals(lastClosedSeason(seasonLedger([row('s0', '2025-09-01', '2025-11-01', 'reset')]))?.seasonId, 's0');
});

Deno.test('prochaine saison : lue en base, jamais extrapolée', () => {
  const ledger = seasonLedger([
    row('s1', '2026-01-01', '2026-03-01', 'closed'),
    row('s2', '2026-04-01', '2026-06-01', 'upcoming'),
  ]);
  const closed = lastClosedSeason(ledger);
  assertEquals(closed?.seasonId, 's1');
  assertEquals(nextSeasonAfter(ledger, closed!)?.seasonId, 's2');

  // Aucune ligne postérieure ⇒ null (l'écran dira « date non fixée »).
  const alone = seasonLedger([row('s1', '2026-01-01', '2026-03-01', 'closed')]);
  assertEquals(nextSeasonAfter(alone, alone[0]!), null);
});

Deno.test('un registre à deux villes est DÉTECTÉ, pas absorbé', () => {
  assertEquals(assertSingleCity(seasonLedger([])), true);
  assertEquals(
    assertSingleCity(
      seasonLedger([
        row('s1', '2026-01-01', '2026-03-01', 'closed', 'paris'),
        row('s2', '2026-01-01', '2026-03-01', 'closed', 'lille'),
      ]),
    ),
    false,
  );
});
