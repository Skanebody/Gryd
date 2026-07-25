/**
 * GRYD — rangs 1224 côté client : l'écran ne départage plus deux ex æquo que le
 * moteur serveur (season_close) reconnaît comme égaux.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import type { LeagueRow } from '../social/league.ts';
import { rowAboveMe, withTiedRanks } from './leagueRanking.ts';

const row = (name: string, value: number, me = false): LeagueRow => ({
  rank: 0, // volontairement faux : c'est withTiedRanks qui fait autorité
  name,
  value,
  ...(me ? { me: true } : {}),
});

Deno.test('sans égalité : rangs 1,2,3 et aucune ligne marquée', () => {
  const out = withTiedRanks([row('A', 900), row('B', 500), row('C', 100)]);
  assertEquals(out.map((r) => r.rank), [1, 2, 3]);
  assertEquals(out.map((r) => r.tied), [false, false, false]);
});

Deno.test('égalité : rang PARTAGÉ puis saut (1,1,3) — jamais #3 et #4 au hasard', () => {
  const out = withTiedRanks([row('A', 900), row('B', 900), row('C', 100)]);
  assertEquals(out.map((r) => r.rank), [1, 1, 3]);
  assertEquals(out.map((r) => r.tied), [true, true, false]);
});

Deno.test('égalité plus bas dans le tableau', () => {
  const out = withTiedRanks([row('A', 900), row('B', 500), row('C', 500), row('D', 10)]);
  assertEquals(out.map((r) => r.rank), [1, 2, 2, 4]);
  assertEquals(out.map((r) => r.tied), [false, true, true, false]);
});

Deno.test('tout le monde à zéro : un seul rang partagé, personne n’est « dernier »', () => {
  const out = withTiedRanks([row('A', 0), row('B', 0), row('C', 0)]);
  assertEquals(out.map((r) => r.rank), [1, 1, 1]);
  assertEquals(out.every((r) => r.tied), true);
});

Deno.test('rowAboveMe : la première ligne au rang STRICTEMENT meilleur', () => {
  const out = withTiedRanks([row('A', 900), row('B', 500), row('C', 500, true), row('D', 10)]);
  assertEquals(rowAboveMe(out)?.name, 'A'); // B est ex æquo, pas « au-dessus »
});

Deno.test('rowAboveMe : rien quand je suis en tête, rien quand je ne suis pas classé', () => {
  const leader = withTiedRanks([row('A', 900, true), row('B', 500)]);
  assertEquals(rowAboveMe(leader), undefined);
  const absent = withTiedRanks([row('A', 900), row('B', 500)]);
  assertEquals(rowAboveMe(absent), undefined);
});

Deno.test('liste vide : aucun rang, aucune exception', () => {
  assertEquals(withTiedRanks([]), []);
});
