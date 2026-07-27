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
  GPS_DECIMATE_EPSILON_M,
  HANDLE_ALLOWED_CHAR_REGEX,
  HANDLE_CHECK_DEBOUNCE_MS,
  HANDLE_MAX_LENGTH,
  HANDLE_MIN_LENGTH,
  HANDLE_REGEX,
  HANDLE_SUGGESTION_COUNT,
  LOOP_CLOSE_TOLERANCE_M,
  SHARE_SIMPLIFY_EPSILON_M,
  SHARE_TRIM_M,
  MAX_CLOSURE_DISTANCE_ACCURACY_FACTOR,
  MAX_CLOSURE_DISTANCE_FLOOR_M,
  MIN_POLYGON_AREA_M2,
  RUN_MIN_DISTANCE_M,
  RUN_MIN_DURATION_S,
  maxClosureDistanceM,
  // ── Vague E14/E19/E22/E25/E26/E27/E30/E33/E34/E37 (27/07/2026) ────────────
  EMERGENCY_NUMBER_EUROPE,
  GPS_ACCURACY_MAX_M,
  GPS_READY_ACCURACY_M,
  GPS_USABLE_ACCURACY_M,
  POINT_MAX_ACCURACY_M,
  activityProducesResult,
  gpsAccuracyGrade,
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

// ─── §E08 — le @handle : les pièces nommées DÉCRIVENT bien HANDLE_REGEX ─────
// `HANDLE_REGEX` reste le juge (miroir du `check` de 0011 et de la RPC 0047).
// `HANDLE_MIN_LENGTH` / `HANDLE_MAX_LENGTH` / `HANDLE_ALLOWED_CHAR_REGEX` en
// sont l'éclatement pour l'écran. Le commentaire de game-rules.ts déclare cet
// invariant ; un commentaire n'enforce rien — ces tests, si.

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

Deno.test('HANDLE_MIN_LENGTH est bien la longueur MINIMALE acceptée par HANDLE_REGEX', () => {
  const justEnough = 'a'.repeat(HANDLE_MIN_LENGTH);
  const oneShort = 'a'.repeat(HANDLE_MIN_LENGTH - 1);
  assert(HANDLE_REGEX.test(justEnough), `HANDLE_REGEX refuse ${HANDLE_MIN_LENGTH} caractères`);
  assert(
    !HANDLE_REGEX.test(oneShort),
    `HANDLE_REGEX accepte ${HANDLE_MIN_LENGTH - 1} caractères : E08 annoncerait une longueur que le serveur ne tient pas`,
  );
});

Deno.test('HANDLE_MAX_LENGTH est bien la longueur MAXIMALE acceptée par HANDLE_REGEX', () => {
  const atLimit = 'a'.repeat(HANDLE_MAX_LENGTH);
  const oneOver = 'a'.repeat(HANDLE_MAX_LENGTH + 1);
  assert(HANDLE_REGEX.test(atLimit), `HANDLE_REGEX refuse ${HANDLE_MAX_LENGTH} caractères`);
  assert(
    !HANDLE_REGEX.test(oneOver),
    `HANDLE_REGEX accepte ${HANDLE_MAX_LENGTH + 1} caractères : la borne affichée par E08 serait fausse`,
  );
});

Deno.test('HANDLE_ALLOWED_CHAR_REGEX filtre EXACTEMENT le jeu de caractères de HANDLE_REGEX', () => {
  // Le filtre de saisie ne doit ni laisser passer ce que le serveur refusera,
  // ni écarter ce qu'il accepterait (l'un donne un refus tardif, l'autre un
  // champ qui « mange » des touches sans raison visible).
  for (const ok of ['a', 'z', '0', '9', '_']) {
    assert(HANDLE_ALLOWED_CHAR_REGEX.test(ok), `« ${ok} » est refusé par le filtre de saisie`);
    assert(
      HANDLE_REGEX.test(ok.repeat(HANDLE_MIN_LENGTH)),
      `« ${ok} » est refusé par HANDLE_REGEX — les deux ne décrivent pas le même alphabet`,
    );
  }
  for (const ko of ['A', 'Z', 'é', '-', '.', ' ', '@', 'ç']) {
    assert(!HANDLE_ALLOWED_CHAR_REGEX.test(ko), `« ${ko} » passe le filtre de saisie`);
    assert(
      !HANDLE_REGEX.test(ko.repeat(HANDLE_MIN_LENGTH)),
      `« ${ko} » passe HANDLE_REGEX — les deux ne décrivent pas le même alphabet`,
    );
  }
});

Deno.test('HANDLE_CHECK_DEBOUNCE_MS et HANDLE_SUGGESTION_COUNT restent dans leur plage utile', () => {
  // Bornes de SANITÉ, pas de goût : sous ~200 ms le debounce ne débounce plus
  // rien (une frappe = une requête), au-delà d'une seconde le verdict paraît en
  // retard sur la frappe et l'écran semble cassé.
  assert(
    HANDLE_CHECK_DEBOUNCE_MS >= 200 && HANDLE_CHECK_DEBOUNCE_MS <= 1_000,
    `debounce hors plage utile : ${HANDLE_CHECK_DEBOUNCE_MS} ms`,
  );
  // §A : les suggestions sont un repêchage sur UNE ligne, jamais un menu. La
  // spec E36 pose « 3 à 6 choix maximum » comme plafond d'un éditeur ; sous un
  // champ, on reste au plancher.
  assert(
    HANDLE_SUGGESTION_COUNT >= 1 && HANDLE_SUGGESTION_COUNT <= 6,
    `nombre de suggestions hors §A : ${HANDLE_SUGGESTION_COUNT}`,
  );
});

// ─── §12.1 — Partage : les deux protections sont CUMULATIVES et distinctes ──

Deno.test('SHARE_SIMPLIFY_EPSILON_M dégrade la résolution SANS remplacer la coupe des extrémités', () => {
  // Deux règles différentes, deux nombres différents : la coupe (SHARE_TRIM_M)
  // supprime le départ/l'arrivée, la simplification floute tout le reste. Si un
  // jour l'un dépassait l'autre, c'est que quelqu'un aurait confondu les deux.
  assert(
    SHARE_SIMPLIFY_EPSILON_M < SHARE_TRIM_M,
    'la tolérance de simplification a dépassé la coupe des extrémités : les deux règles ont été confondues',
  );
  // Elle doit être franchement AU-DESSUS du bruit GPS, sinon elle ne protège
  // rien (elle ne ferait qu'alléger le tracé, ce que fait déjà la décimation).
  assert(
    SHARE_SIMPLIFY_EPSILON_M > GPS_DECIMATE_EPSILON_M,
    'la simplification de partage est sous la décimation de payload : elle ne protège plus rien',
  );
});

// ─── E19 §« Seuils » — l'anneau de précision (spec l.1100-1104) ─────────────

Deno.test('GPS_READY_ACCURACY_M / GPS_USABLE_ACCURACY_M sont les seuils LITTÉRAUX de la spec E19', () => {
  assertEquals(GPS_READY_ACCURACY_M, 15);
  assertEquals(GPS_USABLE_ACCURACY_M, 30);
});

Deno.test('gpsAccuracyGrade classe les trois bandes E19 exactement aux bornes', () => {
  // Vert : « précision ≤ 15 m » — la borne est INCLUSE.
  assertEquals(gpsAccuracyGrade(0), 'ready');
  assertEquals(gpsAccuracyGrade(15), 'ready');
  // Orange : « 16-30 m » — 15,4 m est encore vert, 30 m est encore orange.
  assertEquals(gpsAccuracyGrade(15.4), 'usable');
  assertEquals(gpsAccuracyGrade(16), 'usable');
  assertEquals(gpsAccuracyGrade(30), 'usable');
  // Rouge : « > 30 m ».
  assertEquals(gpsAccuracyGrade(30.1), 'poor');
  assertEquals(gpsAccuracyGrade(300), 'poor');
});

Deno.test('gpsAccuracyGrade ne confond JAMAIS « pas de mesure » avec « mauvaise mesure »', () => {
  // La charte : quatre états distincts, et une lecture en cours n'affirme rien.
  assertEquals(gpsAccuracyGrade(null), 'unknown');
  assertEquals(gpsAccuracyGrade(undefined), 'unknown');
  assertEquals(gpsAccuracyGrade(Number.NaN), 'unknown');
  assertEquals(gpsAccuracyGrade(Number.POSITIVE_INFINITY), 'unknown');
  // Précision négative = fix invalide sur certaines plateformes. La traiter
  // comme « ≤ 15 m » aurait affiché « Prêt » sur une position inexistante.
  assertEquals(gpsAccuracyGrade(-1), 'unknown');
});

Deno.test('les seuils E19 ne DOUBLENT aucun seuil existant (ils ordonnent, ils ne recopient pas)', () => {
  assert(
    GPS_READY_ACCURACY_M < GPS_USABLE_ACCURACY_M,
    'la bande verte a dépassé la bande orange',
  );
  // POINT_MAX_ACCURACY_M (claim §3.2) et GPS_ACCURACY_MAX_M (filtre d'affichage)
  // répondent à d'autres questions. On vérifie l'ORDRE qui les rend cohérents :
  // un point à 30 m (bande orange, départ « quand même » autorisé) doit encore
  // entrer dans la trace affichée, sinon l'écran proposerait un départ dont
  // aucun point ne survivrait à `cleanTrace`. Les quatre valeurs sont des
  // littéraux : `tsc` refuse `!==` entre elles (TS2367), et c'est tant mieux —
  // l'égalité accidentelle serait une erreur de compilation, pas de test.
  const claimFilter: number = POINT_MAX_ACCURACY_M;
  const traceFilter: number = GPS_ACCURACY_MAX_M;
  assert(
    GPS_USABLE_ACCURACY_M <= traceFilter,
    'la bande orange laisse démarrer sur des points que cleanTrace jetterait tous',
  );
  assert(
    GPS_READY_ACCURACY_M < claimFilter,
    'la bande verte promet « Prêt » au-delà du seuil de claim §3.2',
  );
});

// ─── E26 — « trop court pour produire un résultat » (spec l.1194) ───────────

Deno.test('activityProducesResult applique EXACTEMENT les minima §3.2 de la discipline', () => {
  // Course : sous l'un des deux minima ⇒ pas de résultat.
  assertEquals(activityProducesResult(RUN_MIN_DISTANCE_M, RUN_MIN_DURATION_S, 'run'), true);
  assertEquals(activityProducesResult(RUN_MIN_DISTANCE_M - 1, RUN_MIN_DURATION_S, 'run'), false);
  assertEquals(activityProducesResult(RUN_MIN_DISTANCE_M, RUN_MIN_DURATION_S - 1, 'run'), false);
  // Vélo : ses PROPRES bornes, jamais celles de la course.
  assertEquals(activityProducesResult(BIKE_MIN_DISTANCE_M, BIKE_MIN_DURATION_S, 'bike'), true);
  assertEquals(activityProducesResult(RUN_MIN_DISTANCE_M, RUN_MIN_DURATION_S, 'bike'), false);
});

Deno.test('activityProducesResult ne promet rien sans mesure lisible', () => {
  assertEquals(activityProducesResult(Number.NaN, RUN_MIN_DURATION_S, 'run'), false);
  assertEquals(activityProducesResult(RUN_MIN_DISTANCE_M, Number.NaN, 'run'), false);
  // Argument absent ⇒ DEFAULT_ACTIVITY ('run'), comme activityRules().
  assertEquals(activityProducesResult(RUN_MIN_DISTANCE_M, RUN_MIN_DURATION_S), true);
});

// ─── E25 — le numéro de secours n'est pas un choix produit ──────────────────

Deno.test('EMERGENCY_NUMBER_EUROPE est le 112 et rien d’autre', () => {
  // Un numéro de secours faux coûte plus cher que n'importe quel bug de jeu :
  // ce test est là pour qu'aucune « localisation » ne le remplace en douce.
  assertEquals(EMERGENCY_NUMBER_EUROPE, '112');
});
