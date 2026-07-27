/**
 * GRYD — E59 « prochain jalon » : l'échelle GRIP est bien celle de game-rules,
 * le sommet n'a pas de suivant, et la progression d'XP ne fabrique jamais de
 * plafond.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { GRIP_RANK_LEVELS } from '@klaim/shared';
import { RANK_LADDER, levelProgress, rankMilestoneFor } from './rankMilestone.ts';

Deno.test('l’échelle est celle de GRIP_RANK_LEVELS, triée par niveau croissant', () => {
  assertEquals(
    RANK_LADDER.map((r) => r.rank),
    ['rookie', 'runner', 'scout', 'defender', 'conqueror', 'veteran', 'legend'],
  );
  // Aucun barreau réécrit : chaque niveau vient de la constante partagée.
  for (const rung of RANK_LADDER) {
    assertEquals(rung.level, GRIP_RANK_LEVELS[rung.rank]);
  }
});

Deno.test('rang courant = borne basse atteinte, jalon = le barreau suivant', () => {
  assertEquals(rankMilestoneFor(1).current.rank, 'rookie');
  assertEquals(rankMilestoneFor(1).next?.rank, 'runner');
  assertEquals(rankMilestoneFor(1).levelsToNext, 4); // 5 - 1

  assertEquals(rankMilestoneFor(4).current.rank, 'rookie'); // juste sous la borne
  assertEquals(rankMilestoneFor(5).current.rank, 'runner'); // borne INCLUSE
  assertEquals(rankMilestoneFor(19).next?.rank, 'defender');
  assertEquals(rankMilestoneFor(19).levelsToNext, 1);
});

Deno.test('au sommet, AUCUN jalon n’est fabriqué', () => {
  const top = rankMilestoneFor(50);
  assertEquals(top.current.rank, 'legend');
  assertEquals(top.next, null);
  assertEquals(top.levelsToNext, null);
});

Deno.test('niveau absurde → premier barreau, jamais un rang indéfini', () => {
  assertEquals(rankMilestoneFor(0).current.rank, 'rookie');
  assertEquals(rankMilestoneFor(-3).current.rank, 'rookie');
  assertEquals(rankMilestoneFor(Number.NaN).current.rank, 'rookie');
});

// ─── levelProgress ───────────────────────────────────────────────────────────

const TABLE = [0, 100, 300, 700]; // 4 niveaux, XP cumulée

Deno.test('progression dans le niveau : bornes RÉELLES, ratio dans [0,1]', () => {
  assertEquals(levelProgress(0, TABLE, 1), {
    level: 1,
    floorXp: 0,
    ceilXp: 100,
    ratio: 0,
    xpToNext: 100,
  });
  assertEquals(levelProgress(200, TABLE, 2), {
    level: 2,
    floorXp: 100,
    ceilXp: 300,
    ratio: 0.5,
    xpToNext: 100,
  });
});

Deno.test('dernier niveau : plafond null, ratio plein, aucun « reste » inventé', () => {
  const top = levelProgress(900, TABLE, 4);
  assertEquals(top.ceilXp, null);
  assertEquals(top.ratio, 1);
  assertEquals(top.xpToNext, null);
});

Deno.test('entrées illisibles : jamais de NaN ni de division par zéro', () => {
  assertEquals(levelProgress(Number.NaN, TABLE, 2).ratio, 0);
  assertEquals(levelProgress(50, [], 1).ceilXp, null);
  // Table plate (plafond = plancher) : traitée comme un sommet, pas comme 0/0.
  assertEquals(levelProgress(10, [10, 10], 1).ratio, 1);
});
