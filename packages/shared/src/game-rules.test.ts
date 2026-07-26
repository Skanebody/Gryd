/**
 * Tests game-rules.ts — alignement spec §8.2/§9.1/§9.2 (27/07/2026,
 * GRYD_SPEC_PRODUIT_UI_UX_COMPLET.md, décision D-19). Purs : aucun réseau,
 * aucune I/O, aucune horloge — comme le fichier testé.
 *
 * ⚠ POURQUOI `Deno` EST DÉCLARÉ LOCALEMENT, et pas via `/// <reference
 * lib="deno.ns" />`. Ce fichier est lu par DEUX outils aux attentes opposées :
 * Deno l'exécute, et `tsc --noEmit` le typecheck (il est sous `include: ["src"]`
 * de `packages/shared/tsconfig.json`). La directive `deno.ns` satisfait le
 * premier mais PAS le second : `tsc` ne connaît pas cette lib, ne la charge
 * donc pas, et échoue sur « Cannot find name 'Deno' » — le gate est tombé
 * dessus le 27/07. Une déclaration de portée module satisfait les deux, et
 * c'est déjà le patron retenu par `packages/engine/src/polygon.test.ts`.
 */
import {
  BASE_DEFENSE_WINDOW_HOURS,
  BIKE_MIN_DISTANCE_M,
  BIKE_MIN_DURATION_S,
  CONTEST_INTERSECTION_THRESHOLD,
  FORTIFICATION_WINDOW_HOURS_BY_LEVEL,
  LOOP_CLOSE_TOLERANCE_M,
  MAX_CLOSURE_DISTANCE_ACCURACY_FACTOR,
  MAX_CLOSURE_DISTANCE_FLOOR_M,
  MIN_POLYGON_AREA_M2,
  RUN_MIN_DISTANCE_M,
  RUN_MIN_DURATION_S,
  maxClosureDistanceM,
} from './game-rules';

// Voir le docblock : le runner Deno, typé localement (tsc ET Deno satisfaits).
declare const Deno: { test(nom: string, fn: () => void | Promise<void>): void };

// Assertion locale plutôt qu'un import `jsr:` — `tsc` ne sait pas résoudre ce
// spécificateur, et ce fichier est typecheck par les DEUX outils (cf. docblock).
//
// ⚠ ÉGALITÉ STRUCTURELLE, pas `Object.is`. Plusieurs constantes de ce fichier
// sont des TABLEAUX (les paliers de fortification §9.2) : une comparaison par
// référence les déclare toujours différents et fait échouer un test pourtant
// juste — « attendu 18,24,30,36, obtenu 18,24,30,36 ». C'est ce qu'a produit la
// première version de ce helper.
function assertEquals(actual: unknown, expected: unknown, message?: string): void {
  const equal = (a: unknown, b: unknown): boolean => {
    if (Object.is(a, b)) return true;
    if (Array.isArray(a) && Array.isArray(b)) {
      return a.length === b.length && a.every((v, i) => equal(v, b[i]));
    }
    return false;
  };
  if (!equal(actual, expected)) {
    throw new Error(message ?? `attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)}`);
  }
}

// ─── §8.2 — Fermeture : distances/durées minimales alignées spec ────────────

Deno.test('RUN_MIN_DISTANCE_M est aligné §8.2 (MIN_ACTIVITY_DISTANCE_RUN = 800 m)', () => {
  assertEquals(RUN_MIN_DISTANCE_M, 800);
});

Deno.test('RUN_MIN_DURATION_S est aligné §8.2 (MIN_ACTIVE_DURATION_RUN = 5 min)', () => {
  assertEquals(RUN_MIN_DURATION_S, 5 * 60);
});

Deno.test('BIKE_MIN_DISTANCE_M est aligné §8.2 (MIN_ACTIVITY_DISTANCE_BIKE = 2 000 m)', () => {
  assertEquals(BIKE_MIN_DISTANCE_M, 2_000);
});

Deno.test('BIKE_MIN_DURATION_S est aligné §8.2 (MIN_ACTIVE_DURATION_BIKE = 6 min) — DÉCOUPLÉ de RUN_MIN_DURATION_S', () => {
  assertEquals(BIKE_MIN_DURATION_S, 6 * 60);
  // Le point qui justifie le découplage : les deux disciplines divergent
  // désormais (5 min course, 6 min vélo) — un alias les aurait recollées.
  assertEquals(BIKE_MIN_DURATION_S === RUN_MIN_DURATION_S, false);
});

Deno.test('MIN_POLYGON_AREA_M2 est créé et vaut 5 000 m² (§8.2)', () => {
  assertEquals(MIN_POLYGON_AREA_M2, 5_000);
});

// ─── §8.2 — maxClosureDistanceM : tolérance adaptative bornée ───────────────

Deno.test('maxClosureDistanceM — borne BASSE : GPS excellent retombe au plancher 35 m', () => {
  // accuracyMedianM = 0 → adaptatif = 0, mais le plancher protège la fermeture.
  assertEquals(maxClosureDistanceM(0), MAX_CLOSURE_DISTANCE_FLOOR_M);
  assertEquals(maxClosureDistanceM(1), MAX_CLOSURE_DISTANCE_FLOOR_M);
  // Juste sous le point de croisement (35 / 2.5 = 14 m) : encore au plancher.
  assertEquals(maxClosureDistanceM(10), MAX_CLOSURE_DISTANCE_FLOOR_M);
});

Deno.test('maxClosureDistanceM — borne HAUTE : GPS dégradé plafonne à LOOP_CLOSE_TOLERANCE_M (80 m), jamais plus', () => {
  // accuracyMedianM = 32 → adaptatif = 80 (point de croisement exact).
  assertEquals(maxClosureDistanceM(32), LOOP_CLOSE_TOLERANCE_M);
  // Très au-delà : le plafond anti-abus d'AMENDEMENT-16 §2 tient bon, un GPS
  // arbitrairement mauvais (ou une précision falsifiée) ne rouvre PAS le
  // vecteur d'abus fermé par le durcissement 100 → 80 m.
  assertEquals(maxClosureDistanceM(100), LOOP_CLOSE_TOLERANCE_M);
  assertEquals(maxClosureDistanceM(1_000_000), LOOP_CLOSE_TOLERANCE_M);
});

Deno.test('maxClosureDistanceM — cas nominal : suit fidèlement 2,5 × précision GPS médiane entre les deux bornes', () => {
  // accuracyMedianM = 20 → 2.5 × 20 = 50, dans [35, 80] : l'adaptatif s'applique tel quel.
  assertEquals(maxClosureDistanceM(20), 50);
  assertEquals(maxClosureDistanceM(20), MAX_CLOSURE_DISTANCE_ACCURACY_FACTOR * 20);
  // accuracyMedianM = 25 (POINT_MAX_ACCURACY_M) → 62,5 m, toujours dans la plage adaptative.
  assertEquals(maxClosureDistanceM(25), 62.5);
});

Deno.test('maxClosureDistanceM — fonction PURE : même entrée, même sortie, aucun effet de bord', () => {
  const a = maxClosureDistanceM(18);
  const b = maxClosureDistanceM(18);
  assertEquals(a, b);
});

// ─── §9.1/§9.2 — Contestation & fortification (nouveau mécanisme) ───────────

Deno.test('CONTEST_INTERSECTION_THRESHOLD est créé et vaut 60 % (§9.1)', () => {
  assertEquals(CONTEST_INTERSECTION_THRESHOLD, 0.6);
});

Deno.test('BASE_DEFENSE_WINDOW_HOURS est créé et vaut 18 h (§9.1)', () => {
  assertEquals(BASE_DEFENSE_WINDOW_HOURS, 18);
});

Deno.test('FORTIFICATION_WINDOW_HOURS_BY_LEVEL suit les paliers 18/24/30/36 h (§9.2), niveau 0 dérivé de BASE_DEFENSE_WINDOW_HOURS', () => {
  assertEquals(FORTIFICATION_WINDOW_HOURS_BY_LEVEL.length, 4);
  assertEquals(FORTIFICATION_WINDOW_HOURS_BY_LEVEL[0], BASE_DEFENSE_WINDOW_HOURS);
  assertEquals([...FORTIFICATION_WINDOW_HOURS_BY_LEVEL], [18, 24, 30, 36]);
});
