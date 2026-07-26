/**
 * GRYD — E07/E08 : tests de la machine de fermeture. Verrouille ce que le
 * client a le droit d'affirmer (les seuils SERVEUR, jamais des seuils inventés),
 * l'anti-rebond (une boucle ne se célèbre qu'une fois par sortie), et la
 * dérivation du pourcentage (jamais une constante posée à la main).
 *
 * 26/07/2026 — LES SEUILS SONT CEUX DE LA DISCIPLINE. Les cas `run` sont
 * inchangés et comparés aux constantes HISTORIQUES (LOOP_*), ce qui prouve que
 * l'ouverture au vélo n'a rien déplacé pour la course. Les cas `bike` sont
 * comparés à `activityRules('bike')`, jamais à un nombre recopié : un test qui
 * réécrirait 5 000 à la main ne casserait pas le jour où la règle change.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  activityRules,
  GPS_ACCURACY_MAX_M,
  LOOP_CLOSE_TOLERANCE_M,
  LOOP_MIN_PERIMETER_M,
} from '@klaim/shared';
import {
  INITIAL_LOOP_CLOSURE,
  loopClosurePhase,
  loopClosureProgress,
  loopMissingM,
  loopNearBandM,
  progressPercent,
  stepLoopClosure,
} from './loopClosure.ts';

const run = { conquest: true, activity: 'run' as const, distanceM: LOOP_MIN_PERIMETER_M };
const BIKE = activityRules('bike');
const bike = { conquest: true, activity: 'bike' as const, distanceM: BIKE.loopMinPerimeterM };

Deno.test('phase : silencieuse hors conquête, sans trace, ou sous le périmètre minimal', () => {
  assertEquals(loopClosurePhase({ ...run, conquest: false, distanceM: 9_000, gapM: 5 }), 'idle');
  assertEquals(loopClosurePhase({ ...run, distanceM: 9_000, gapM: null }), 'idle');
  assertEquals(
    loopClosurePhase({ ...run, distanceM: LOOP_MIN_PERIMETER_M - 1, gapM: 5 }),
    'idle',
  );
});

Deno.test('phase : fermée EXACTEMENT sous la tolérance serveur, jamais au-delà', () => {
  assertEquals(loopClosurePhase({ ...run, gapM: LOOP_CLOSE_TOLERANCE_M }), 'closed');
  assertEquals(loopClosurePhase({ ...run, gapM: LOOP_CLOSE_TOLERANCE_M + 1 }), 'nearMiss');
});

Deno.test('phase : nearMiss = dans la bande de bruit GPS, open au-delà', () => {
  assertEquals(loopNearBandM('run'), LOOP_CLOSE_TOLERANCE_M + GPS_ACCURACY_MAX_M);
  assertEquals(loopClosurePhase({ ...run, gapM: loopNearBandM('run') }), 'nearMiss');
  assertEquals(loopClosurePhase({ ...run, gapM: loopNearBandM('run') + 1 }), 'open');
});

// ─── VÉLO : la même machine, à l'échelle de la ville ────────────────────────

Deno.test('vélo : à 1 km de boucle, le client n’annonce RIEN — le serveur exige 5 km', () => {
  // C'ÉTAIT LE BUG. Avec les seuils de la course en dur, un cycliste revenu à
  // son point de départ après 1 km voyait « BOUCLE FERMÉE » puis la séquence
  // E08 de capture — pour une boucle que `ingest_run` allait refuser
  // (BIKE_LOOP_MIN_PERIMETER_M = 5 000 m). Une célébration démentie par le
  // serveur est le pire des mensonges d'écran : elle est joyeuse.
  assertEquals(
    loopClosurePhase({ ...bike, distanceM: LOOP_MIN_PERIMETER_M, gapM: 5 }),
    'idle',
  );
  assertEquals(loopClosurePhase({ ...bike, gapM: 5 }), 'closed');
});

Deno.test('vélo : la tolérance de fermeture reste une tolérance GPS, identique', () => {
  // Elle ne dépend pas de la vitesse : « suis-je revenu à mon point de départ ? »
  // est la même question à pied et à vélo. Le test l'AFFIRME plutôt que de la
  // laisser se dériver par accident.
  assertEquals(BIKE.loopCloseToleranceM, LOOP_CLOSE_TOLERANCE_M);
  assertEquals(loopNearBandM('bike'), loopNearBandM('run'));
  assertEquals(loopClosurePhase({ ...bike, gapM: BIKE.loopCloseToleranceM }), 'closed');
  assertEquals(loopClosurePhase({ ...bike, gapM: BIKE.loopCloseToleranceM + 1 }), 'nearMiss');
});

Deno.test('loopMissingM : ce qu’il reste À FERMER, pas la distance au départ', () => {
  assertEquals(loopMissingM(LOOP_CLOSE_TOLERANCE_M + 84, 'run'), 84);
  // Déjà sous la tolérance : plus rien à fermer (jamais un nombre négatif).
  assertEquals(loopMissingM(LOOP_CLOSE_TOLERANCE_M - 10, 'run'), 0);
  assertEquals(loopMissingM(BIKE.loopCloseToleranceM + 84, 'bike'), 84);
});

Deno.test('anti-rebond : une seule célébration tant qu’on n’est pas reparti', () => {
  let mem = INITIAL_LOOP_CLOSURE;
  const first = stepLoopClosure(mem, 'closed');
  assertEquals(first.celebrate, true);
  assertEquals(first.memory.closures, 1);
  mem = first.memory;
  // 10 ticks encore fermés (le coureur reste au départ) : plus aucune célébration.
  for (let i = 0; i < 10; i += 1) {
    const step = stepLoopClosure(mem, 'closed');
    assertEquals(step.celebrate, false);
    mem = step.memory;
  }
  assertEquals(mem.closures, 1);
});

Deno.test('anti-rebond : nearMiss ne ré-arme PAS (hystérésis), « open » ré-arme', () => {
  let mem = stepLoopClosure(INITIAL_LOOP_CLOSURE, 'closed').memory;
  // Aller-retour dans la bande de bruit : aucune re-célébration.
  mem = stepLoopClosure(mem, 'nearMiss').memory;
  assertEquals(stepLoopClosure(mem, 'closed').celebrate, false);
  // Vraiment reparti (au-delà de la bande) → la boucle suivante compte.
  mem = stepLoopClosure(mem, 'open').memory;
  assert(mem.armed);
  const second = stepLoopClosure(mem, 'closed');
  assertEquals(second.celebrate, true);
  assertEquals(second.memory.closures, 2);
});

Deno.test('progression : null sans mesure, bornée 0-1, la condition la plus exigeante gagne', () => {
  const base = { activity: 'run' as const };
  assertEquals(
    loopClosureProgress({ ...base, distanceM: 2_000, gapM: null, farthestGapM: 900 }),
    null,
  );
  assertEquals(
    loopClosureProgress({ ...base, distanceM: 2_000, gapM: 40, farthestGapM: null }),
    null,
  );

  // Moitié du périmètre minimal, mais déjà revenu au départ → la distance borne.
  const half = loopClosureProgress({
    ...base,
    distanceM: LOOP_MIN_PERIMETER_M / 2,
    gapM: 0,
    farthestGapM: 900,
  });
  assertEquals(half, 0.5);

  // Périmètre atteint, mais encore au point le plus éloigné → retour = 0.
  assertEquals(
    loopClosureProgress({
      ...base,
      distanceM: LOOP_MIN_PERIMETER_M * 3,
      gapM: 900,
      farthestGapM: 900,
    }),
    0,
  );

  // À mi-chemin du retour (tolérance comprise) : ~50 %.
  const back = loopClosureProgress({
    ...base,
    distanceM: LOOP_MIN_PERIMETER_M * 3,
    gapM: (900 + LOOP_CLOSE_TOLERANCE_M) / 2,
    farthestGapM: 900,
  });
  assert(back !== null && Math.abs(back - 0.5) < 0.001, `retour ${back} ≉ 0,5`);
});

Deno.test('progression : le même parcours ne vaut PAS le même pourcentage à vélo', () => {
  // Un kilomètre parcouru, c'est 100 % de l'axe distance à pied et un cinquième
  // à vélo. Le pourcentage d'E07 est une PROMESSE de proximité : la même barre
  // pour les deux disciplines mentirait à l'une des deux.
  const commun = { distanceM: LOOP_MIN_PERIMETER_M, gapM: 0, farthestGapM: 900 };
  assertEquals(loopClosureProgress({ ...commun, activity: 'run' }), 1);
  assertEquals(
    loopClosureProgress({ ...commun, activity: 'bike' }),
    LOOP_MIN_PERIMETER_M / BIKE.loopMinPerimeterM,
  );
});

Deno.test('progression : jamais sorti de la tolérance → aucun retour à faire', () => {
  const p = loopClosureProgress({
    activity: 'run',
    distanceM: LOOP_MIN_PERIMETER_M,
    gapM: 10,
    farthestGapM: LOOP_CLOSE_TOLERANCE_M - 5,
  });
  assertEquals(p, 1);
});

Deno.test('progressPercent : entier borné (jamais 101 %, jamais -0 %)', () => {
  assertEquals(progressPercent(0.724), 72);
  assertEquals(progressPercent(1.4), 100);
  assertEquals(progressPercent(-3), 0);
});
