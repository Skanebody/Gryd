/**
 * GRYD — E61 : le bilan ne s'affiche QUE sur un fait serveur complet, les
 * récompenses énoncées sont exactement celles que season_close décerne, et le
 * bilan sportif ne mélange jamais deux disciplines.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  parseSeasonRecap,
  recapRewards,
  seasonRecapSummary,
} from './seasonRecap.ts';

const payload = (over: Record<string, unknown> = {}) => ({
  title: 'Saison terminée',
  body: 'Classement final : n°3.',
  seasonId: 'sea-1',
  activity: 'run',
  rank: 3,
  tied: false,
  points: 1_240,
  resetAt: '2026-08-15T00:00:00.000Z',
  ...over,
});

Deno.test('payload complet → résultat typé ; title/body du serveur sont IGNORÉS', () => {
  const recap = parseSeasonRecap(payload());
  assertEquals(recap, {
    seasonId: 'sea-1',
    activity: 'run',
    rank: 3,
    tied: false,
    points: 1_240,
    resetAt: '2026-08-15T00:00:00.000Z',
  });
});

Deno.test('un payload amputé ne rend RIEN — jamais un rang deviné', () => {
  assertEquals(parseSeasonRecap(null), null);
  assertEquals(parseSeasonRecap(payload({ rank: undefined })), null);
  assertEquals(parseSeasonRecap(payload({ rank: 0 })), null); // un rang commence à 1
  assertEquals(parseSeasonRecap(payload({ activity: 'swim' })), null); // discipline inconnue
  assertEquals(parseSeasonRecap(payload({ seasonId: 42 })), null);
  assertEquals(parseSeasonRecap(payload({ points: undefined })), null);
});

Deno.test('resetAt facultatif : absent ou illisible ⇒ null, le rang reste valide', () => {
  assertEquals(parseSeasonRecap(payload({ resetAt: undefined }))?.resetAt, null);
  assertEquals(parseSeasonRecap(payload({ resetAt: 'bientôt' }))?.resetAt, null);
  assertEquals(parseSeasonRecap(payload({ resetAt: 'bientôt' }))?.rank, 3);
});

Deno.test('récompenses énoncées = règle de founderBadges, legend réservé au n°1 SEUL', () => {
  const top3 = recapRewards(parseSeasonRecap(payload({ rank: 3 }))!);
  assertEquals(top3.map((t) => t.badgeKey), ['season_rank_1', 'season_rank_2', 'season_rank_3', 'season_rank_4']);

  const winner = recapRewards(parseSeasonRecap(payload({ rank: 1 }))!);
  assertEquals(winner[winner.length - 1]?.badgeKey, 'season_rank_legend');

  // n°1 EX ÆQUO : garde le titre #1, pas le legend (exactement season_close).
  const tiedWinner = recapRewards(parseSeasonRecap(payload({ rank: 1, tied: true }))!);
  assertEquals(tiedWinner.map((t) => t.badgeKey).includes('season_rank_legend'), false);
  assertEquals(tiedWinner.map((t) => t.badgeKey).includes('season_rank_5'), true);

  // Hors barème : aucun palier inventé pour consoler.
  assertEquals(recapRewards(parseSeasonRecap(payload({ rank: 5_000 }))!), []);
});

// ─── Bilan sportif ───────────────────────────────────────────────────────────

const run = (startedAt: string, distanceM: number, status = 'valid', activity = 'run') => ({
  startedAt,
  distanceM,
  status,
  activity,
});

Deno.test('bilan : sorties validées, jours UTC distincts, distance cumulée', () => {
  const summary = seasonRecapSummary(
    [
      run('2026-06-01T06:00:00Z', 5_000),
      run('2026-06-01T19:00:00Z', 4_000), // même JOUR
      run('2026-06-03T07:00:00Z', 6_000, 'partial'), // partial COMPTE (comme au serveur)
      run('2026-06-04T07:00:00Z', 9_000, 'rejected'), // rejetée : ignorée
    ],
    'run',
  );
  assertEquals(summary, { runs: 3, activeDays: 2, distanceM: 15_000 });
});

Deno.test('jamais de somme entre disciplines (E14)', () => {
  const rows = [run('2026-06-01T06:00:00Z', 5_000), run('2026-06-02T06:00:00Z', 20_000, 'valid', 'bike')];
  assertEquals(seasonRecapSummary(rows, 'run'), { runs: 1, activeDays: 1, distanceM: 5_000 });
  assertEquals(seasonRecapSummary(rows, 'bike'), { runs: 1, activeDays: 1, distanceM: 20_000 });
});

Deno.test('aucune course : un bilan à zéro est un FAIT, pas un repli', () => {
  assertEquals(seasonRecapSummary([], 'run'), { runs: 0, activeDays: 0, distanceM: 0 });
});
