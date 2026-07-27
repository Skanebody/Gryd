/**
 * GRYD — E26 : tests de ce que la feuille de fin a le droit d'affirmer.
 *
 * Deux choses seulement, mais les deux comptent : l'OBJECTIF n'est jamais
 * inventé, et la confirmation ne se déclenche QUE sous le plancher §3.2 — le
 * même que le serveur, jamais un troisième seuil recopié ici.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { activityRules } from '@klaim/shared';
import { detectObjective, finishSheetModel } from './finishModel.ts';

Deno.test('la défense l’emporte sur le mode déclaré au départ', () => {
  assertEquals(detectObjective({ defenseActive: true, mode: 'conquete' }), 'defense');
  assertEquals(detectObjective({ defenseActive: true, mode: null }), 'defense');
});

Deno.test('sans défense, le mode décide — et un mode illisible ne se devine pas', () => {
  assertEquals(detectObjective({ defenseActive: false, mode: 'conquete' }), 'conquest');
  assertEquals(detectObjective({ defenseActive: false, mode: 'course_privee' }), 'free');
  assertEquals(detectObjective({ defenseActive: false, mode: null }), 'unknown');
});

Deno.test('la confirmation suit EXACTEMENT le plancher §3.2 de la discipline', () => {
  const run = activityRules('run');
  const juste = finishSheetModel({
    defenseActive: false,
    mode: 'conquete',
    activity: 'run',
    distanceM: run.minDistanceM,
    durationS: run.minDurationS,
  });
  assertEquals(juste.producesResult, true);
  assertEquals(juste.confirmBeforeFinish, false);

  const tropCourt = finishSheetModel({
    defenseActive: false,
    mode: 'conquete',
    activity: 'run',
    distanceM: run.minDistanceM - 1,
    durationS: run.minDurationS,
  });
  assertEquals(tropCourt.producesResult, false);
  assertEquals(tropCourt.confirmBeforeFinish, true);
});

Deno.test('le plancher VÉLO est celui du vélo, pas celui de la course', () => {
  const bike = activityRules('bike');
  assert(bike.minDistanceM > activityRules('run').minDistanceM);
  const sousLePlancherVelo = finishSheetModel({
    defenseActive: false,
    mode: 'conquete',
    activity: 'bike',
    distanceM: bike.minDistanceM - 1,
    durationS: bike.minDurationS,
  });
  assertEquals(sousLePlancherVelo.producesResult, false);
});

Deno.test('une mesure non finie ne promet rien', () => {
  const model = finishSheetModel({
    defenseActive: false,
    mode: 'conquete',
    activity: 'run',
    distanceM: Number.NaN,
    durationS: 10_000,
  });
  assertEquals(model.producesResult, false);
  assertEquals(model.confirmBeforeFinish, true);
});
