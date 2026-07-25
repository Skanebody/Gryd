/**
 * GRYD — moteur PUR des paliers de saison (E12) : l'échelle est bien celle du
 * serveur (season_close), le statut « obtenu » n'est jamais deviné, et un rang
 * ex æquo ne décroche pas le titre de vainqueur unique.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  SEASON_REWARD_TIERS,
  seasonStanding,
  tierReachedBy,
} from './seasonRewards.ts';

Deno.test('échelle = les 6 médailles RÉELLES de season_close, de la plus accessible à la plus rare', () => {
  assertEquals(
    SEASON_REWARD_TIERS.map((t) => t.badgeKey),
    [
      'season_rank_1',
      'season_rank_2',
      'season_rank_3',
      'season_rank_4',
      'season_rank_5',
      'season_rank_legend',
    ],
  );
  assertEquals(SEASON_REWARD_TIERS.map((t) => t.maxRank), [100, 50, 10, 3, 1, 1]);
  // Le MATÉRIAU vient du catalogue shared : acier sombre → … → or limité.
  assertEquals(SEASON_REWARD_TIERS.map((t) => t.tier), [
    'road',
    'tempo',
    'race',
    'carbon',
    'elite',
    'legend',
  ]);
});

Deno.test('rang 40 : tient le top 50, vise le top 10, 30 places à remonter', () => {
  const s = seasonStanding(40, false);
  assertEquals(s.current?.badgeKey, 'season_rank_2');
  assertEquals(s.next?.badgeKey, 'season_rank_3');
  assertEquals(s.placesToNext, 30);
});

Deno.test('rang 240 : aucun palier tenu (jamais de « Bronze I » par défaut), vise le top 100', () => {
  const s = seasonStanding(240, false);
  assertEquals(s.current, null);
  assertEquals(s.next?.badgeKey, 'season_rank_1');
  assertEquals(s.placesToNext, 140);
});

Deno.test('#1 SEUL : tout est tenu, y compris le legend', () => {
  const s = seasonStanding(1, false);
  assertEquals(s.current?.badgeKey, 'season_rank_legend');
  assertEquals(s.next, null);
  assertEquals(s.placesToNext, null);
});

Deno.test('#1 EX ÆQUO : titre #1 tenu, legend hors de portée — et ça ne se compte pas en places', () => {
  const s = seasonStanding(1, true);
  assertEquals(s.current?.badgeKey, 'season_rank_5');
  assertEquals(s.next?.badgeKey, 'season_rank_legend');
  assertEquals(s.placesToNext, null);
});

Deno.test('non classé : aucune promesse, aucun palier inventé', () => {
  assertEquals(seasonStanding(null, false), { current: null, next: null, placesToNext: null });
  assertEquals(seasonStanding(0, false).current, null);
});

Deno.test('tierReachedBy : bornes exactes (≤ maxRank), legend réservé au vainqueur unique', () => {
  const top10 = SEASON_REWARD_TIERS.find((t) => t.badgeKey === 'season_rank_3')!;
  const legend = SEASON_REWARD_TIERS.find((t) => t.badgeKey === 'season_rank_legend')!;
  assertEquals(tierReachedBy(top10, 10, false), true);
  assertEquals(tierReachedBy(top10, 11, false), false);
  assertEquals(tierReachedBy(legend, 1, false), true);
  assertEquals(tierReachedBy(legend, 1, true), false);
});
