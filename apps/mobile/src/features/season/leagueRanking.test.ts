/**
 * GRYD — rangs 1224 côté client : l'écran ne départage plus deux ex æquo que le
 * moteur serveur (season_close) reconnaît comme égaux.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import type { LeagueRow } from '../social/league.ts';
import { leagueGap, rowAboveMe, withTiedRanks } from './leagueRanking.ts';

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

// ── leagueGap : l'écart « … pour passer #N » + la barre de progression (E11) ──
// POINTS_NEUTRAL_HEX vaut 100 en jeu ; on le passe explicitement (fonction PURE).
const PPH = 100;

Deno.test('leagueGap : en tête (personne au-dessus) → tout à zéro, isLeader vrai', () => {
  const [me] = withTiedRanks([row('Moi', 900, true), row('B', 500)]);
  const g = leagueGap(me, rowAboveMe(withTiedRanks([row('Moi', 900, true), row('B', 500)])), PPH);
  assertEquals(g, { gapPoints: 0, gapHexes: 0, gapRatio: 0, isLeader: true });
});

Deno.test('leagueGap : non classé (pas de ligne à moi) → zéro et PAS leader', () => {
  const g = leagueGap(undefined, undefined, PPH);
  assertEquals(g, { gapPoints: 0, gapHexes: 0, gapRatio: 0, isLeader: false });
});

Deno.test('leagueGap : écart en POINTS, conversion en zones plafonnée au ceil', () => {
  const ranked = withTiedRanks([row('A', 1000), row('Moi', 750, true), row('C', 100)]);
  const me = ranked.find((r) => r.me === true)!;
  const above = rowAboveMe(ranked)!;
  const g = leagueGap(me, above, PPH);
  assertEquals(g.gapPoints, 250); // 1000 − 750, en points (jamais des km²)
  assertEquals(g.gapHexes, 3); // ceil(250 / 100) — plancher d'affichage géré par l'écran
  assertEquals(g.gapRatio, 0.75); // 750 / 1000, borné [0,1]
  assertEquals(g.isLeader, false);
});

Deno.test('leagueGap : la place au-dessus est à 0 point → ratio 0 (jamais de division par zéro)', () => {
  const me = { rank: 1, name: 'Moi', value: 0, me: true, tied: true };
  const above = { rank: 1, name: 'A', value: 0, tied: true };
  const g = leagueGap(me, above, PPH);
  assertEquals(g.gapRatio, 0);
  assertEquals(g.gapPoints, 0);
});

Deno.test('leagueGap : pointsPerHex non positif → gapHexes 0 (aucun Infinity/NaN)', () => {
  const me = { rank: 2, name: 'Moi', value: 400, me: true, tied: false };
  const above = { rank: 1, name: 'A', value: 700, tied: false };
  const g = leagueGap(me, above, 0);
  assertEquals(g.gapHexes, 0);
  assertEquals(g.gapPoints, 300);
});
