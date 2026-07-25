/**
 * GRYD — E07/E08 : tests de la machine de fermeture. Verrouille ce que le
 * client a le droit d'affirmer (les seuils SERVEUR, jamais des seuils inventés),
 * l'anti-rebond (une boucle ne se célèbre qu'une fois par sortie), et la
 * dérivation du pourcentage (jamais une constante posée à la main).
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  GPS_ACCURACY_MAX_M,
  LOOP_CLOSE_TOLERANCE_M,
  LOOP_MIN_PERIMETER_M,
} from '@klaim/shared';
import {
  INITIAL_LOOP_CLOSURE,
  LOOP_NEAR_BAND_M,
  loopClosurePhase,
  loopClosureProgress,
  loopMissingM,
  progressPercent,
  stepLoopClosure,
} from './loopClosure.ts';

const run = { conquest: true, distanceM: LOOP_MIN_PERIMETER_M };

Deno.test('phase : silencieuse hors conquête, sans trace, ou sous le périmètre minimal', () => {
  assertEquals(loopClosurePhase({ conquest: false, distanceM: 9_000, gapM: 5 }), 'idle');
  assertEquals(loopClosurePhase({ conquest: true, distanceM: 9_000, gapM: null }), 'idle');
  assertEquals(
    loopClosurePhase({ conquest: true, distanceM: LOOP_MIN_PERIMETER_M - 1, gapM: 5 }),
    'idle',
  );
});

Deno.test('phase : fermée EXACTEMENT sous la tolérance serveur, jamais au-delà', () => {
  assertEquals(loopClosurePhase({ ...run, gapM: LOOP_CLOSE_TOLERANCE_M }), 'closed');
  assertEquals(loopClosurePhase({ ...run, gapM: LOOP_CLOSE_TOLERANCE_M + 1 }), 'nearMiss');
});

Deno.test('phase : nearMiss = dans la bande de bruit GPS, open au-delà', () => {
  assertEquals(LOOP_NEAR_BAND_M, LOOP_CLOSE_TOLERANCE_M + GPS_ACCURACY_MAX_M);
  assertEquals(loopClosurePhase({ ...run, gapM: LOOP_NEAR_BAND_M }), 'nearMiss');
  assertEquals(loopClosurePhase({ ...run, gapM: LOOP_NEAR_BAND_M + 1 }), 'open');
});

Deno.test('loopMissingM : ce qu’il reste À FERMER, pas la distance au départ', () => {
  assertEquals(loopMissingM(LOOP_CLOSE_TOLERANCE_M + 84), 84);
  // Déjà sous la tolérance : plus rien à fermer (jamais un nombre négatif).
  assertEquals(loopMissingM(LOOP_CLOSE_TOLERANCE_M - 10), 0);
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
  assertEquals(loopClosureProgress({ distanceM: 2_000, gapM: null, farthestGapM: 900 }), null);
  assertEquals(loopClosureProgress({ distanceM: 2_000, gapM: 40, farthestGapM: null }), null);

  // Moitié du périmètre minimal, mais déjà revenu au départ → la distance borne.
  const half = loopClosureProgress({
    distanceM: LOOP_MIN_PERIMETER_M / 2,
    gapM: 0,
    farthestGapM: 900,
  });
  assertEquals(half, 0.5);

  // Périmètre atteint, mais encore au point le plus éloigné → retour = 0.
  assertEquals(
    loopClosureProgress({ distanceM: LOOP_MIN_PERIMETER_M * 3, gapM: 900, farthestGapM: 900 }),
    0,
  );

  // À mi-chemin du retour (tolérance comprise) : ~50 %.
  const back = loopClosureProgress({
    distanceM: LOOP_MIN_PERIMETER_M * 3,
    gapM: (900 + LOOP_CLOSE_TOLERANCE_M) / 2,
    farthestGapM: 900,
  });
  assert(back !== null && Math.abs(back - 0.5) < 0.001, `retour ${back} ≉ 0,5`);
});

Deno.test('progression : jamais sorti de la tolérance → aucun retour à faire', () => {
  const p = loopClosureProgress({
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
