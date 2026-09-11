// GÉNÉRÉ par scripts/sync-game-rules.mjs — ne pas éditer.
// Source : packages/engine/src/disciplineCheck2026.test.ts

/**
 * GRYD — LE CONTRÔLE DE DISCIPLINE, PROUVÉ SUR DES TRACES SYNTHÉTIQUES.
 *
 * ═══ ÉTAPE 0 — CE QUI N'EXISTAIT PAS AVANT LE 12/09/2026 ════════════════════
 * `scoreRun` savait déjà dire « course déclarée + vitesse de vélo + zéro pas »
 * et en faire un SOUPÇON qui gèle la capture et demande une revue humaine
 * (0187). Trois choses lui manquaient, et ce fichier les fixe :
 *  1. l'autre SENS — « vélo déclaré + cadence de foulée + vitesse de coureur »
 *     n'était calculé nulle part, donc jamais proposé à qui s'était trompé ;
 *  2. la CADENCE — le moteur ne lisait qu'un ratio pas/mètre sur TOUTE la
 *     sortie, jamais des pas/minute sur la fenêtre effectivement mesurée ;
 *  3. les BORNES de la fenêtre — `sustainedWindowKmh` ne rendait qu'un nombre,
 *     donc rien ne permettait d'opposer une cadence à la portion rapide.
 * Les trois premiers tests de ce fichier échouent sur le dépôt d'avant le lot :
 * la fonction n'existait pas.
 *
 * ─── CE QUE LES TRACES SYNTHÉTIQUES SONT, ET NE SONT PAS ────────────────────
 * Des points fabriqués à vitesse imposée, en ligne droite plein est. Ils
 * PROUVENT la règle (les seuils, les deux sens, les silences) ; ils ne prouvent
 * rien du terrain — aucune sortie réelle n'a été rejouée ici, et le rapport du
 * lot le dit.
 */
import {
  ACTIVITIES,
  type Activity,
  DISCIPLINE_CHECK_2026,
  DISCIPLINE_STEP_BUCKET_S,
  RUN_AVG_PACE_MIN_S_KM,
  ANTICHEAT_SUSTAINED_WINDOW_S,
} from '../game-rules.ts';
import type { RunPoint } from '../types.ts';
import {
  checkDeclaredDiscipline2026,
  fastestSustainedWindow2026,
  type StepWindow2026,
  sustainedWindows2026,
  wholeRunStepWindow2026,
} from './disciplineCheck2026.ts';

// MÊMES CONTRAINTES D'OUTILLAGE que le reste de `packages/engine` : aucun
// import externe (les tests tournent hors ligne), global `Deno` déclaré
// localement, aucune horloge lue.
declare const Deno: { test(nom: string, fn: () => void | Promise<void>): void };

// `asserts condition` : le compilateur AFFINE le type après l'appel, ce qui
// évite un `!` par ligne dans les tests qui vérifient d'abord « non nul ».
function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals<T>(actual: T, expected: T, message = ''): void {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${message} — attendu ${e}, obtenu ${a}`);
}

const T0 = Date.parse('2026-09-12T08:00:00.000Z');
const MS_PER_S = 1_000;
const M_PER_DEG_LNG = 111_320 * Math.cos((49.44 * Math.PI) / 180); // Rouen

interface Leg {
  readonly kmh: number;
  readonly durationS: number;
}

/** Trace en ligne droite plein est, un relevé par seconde, à vitesse imposée. */
function traceDe(legs: readonly Leg[]): RunPoint[] {
  const points: RunPoint[] = [];
  let metres = 0;
  let t = T0;
  for (const leg of legs) {
    const mPerS = leg.kmh / 3.6;
    for (let s = 0; s < leg.durationS; s++) {
      points.push({ lat: 49.44, lng: 1.1 + metres / M_PER_DEG_LNG, t, acc: 6 });
      metres += mPerS;
      t += MS_PER_S;
    }
  }
  return points;
}

/**
 * Tranches de podomètre d'une MINUTE couvrant toute la trace, à cadence
 * imposée. C'est exactement la forme que le mobile construit (`stepBuckets`).
 */
function cadenceDe(points: readonly RunPoint[], spm: number): StepWindow2026[] {
  const bucketMs = DISCIPLINE_STEP_BUCKET_S * MS_PER_S;
  const from = points[0]!.t;
  const to = points[points.length - 1]!.t;
  const out: StepWindow2026[] = [];
  for (let start = from; start < to; start += bucketMs) {
    const end = Math.min(start + bucketMs, to);
    out.push({ fromT: start, toT: end, steps: (spm * (end - start)) / (60 * MS_PER_S) });
  }
  return out;
}

// ════════════════════════════════════════════════════════════════════════════
// 0. LA FENÊTRE, ET SES BORNES
// ════════════════════════════════════════════════════════════════════════════

Deno.test('ÉTAPE 0 — la fenêtre soutenue rend enfin ses BORNES, pas seulement sa vitesse', () => {
  const points = traceDe([{ kmh: 24, durationS: 900 }]);
  const best = fastestSustainedWindow2026(points, 'run');
  assert(best !== null, 'quinze minutes contiennent bien une fenêtre de cinq');
  assert(Math.abs(best.kmh - 24) < 0.5, `vitesse mesurée ${best.kmh}`);
  const spanS = (best.toT - best.fromT) / MS_PER_S;
  assert(
    spanS >= ANTICHEAT_SUSTAINED_WINDOW_S && spanS < ANTICHEAT_SUSTAINED_WINDOW_S + 2,
    `la fenêtre retenue est la plus COURTE qui atteigne la durée (${spanS} s)`,
  );
  assert(best.fromT >= points[0]!.t && best.toT <= points[points.length - 1]!.t,
    'les bornes tombent dans la trace');
});

Deno.test('une trace plus COURTE que la fenêtre n’en produit aucune', () => {
  const points = traceDe([{ kmh: 24, durationS: ANTICHEAT_SUSTAINED_WINDOW_S - 60 }]);
  assertEquals(sustainedWindows2026(points, 'run').length, 0);
  assertEquals(fastestSustainedWindow2026(points, 'run'), null);
});

Deno.test('une RUPTURE déclarée casse la fenêtre : on ne mesure pas par-dessus un trou', () => {
  const a = traceDe([{ kmh: 24, durationS: 200 }]);
  const b = traceDe([{ kmh: 24, durationS: 200 }]).map((p, i) => ({
    ...p,
    t: p.t + 400 * MS_PER_S,
    ...(i === 0 ? { breakBefore: true as const } : {}),
  }));
  assertEquals(
    sustainedWindows2026([...a, ...b], 'run').length,
    0,
    'deux portions de 200 s séparées ne font pas une fenêtre de 300 s',
  );
});

// ════════════════════════════════════════════════════════════════════════════
// 1. COURSE DÉCLARÉE
// ════════════════════════════════════════════════════════════════════════════

Deno.test('une course HONNÊTE ne soupçonne rien', () => {
  // 12 km/h pendant 30 min, cadence 170 spm : la sortie de tout le monde.
  const points = traceDe([{ kmh: 12, durationS: 1800 }]);
  const verdict = checkDeclaredDiscipline2026(points, cadenceDe(points, 170), 'run');
  assertEquals(verdict.suspected, null);
  assertEquals(verdict.declared, 'run');
  assertEquals(verdict.evidence.reason, undefined, 'le contrôle a bien eu lieu');
  assert(verdict.evidence.stepsPerMin !== null && verdict.evidence.stepsPerMin > 100,
    'la cadence mesurée est rendue, pas devinée');
});

Deno.test('ÉTAPE 0 — une course qui est EN FAIT du vélo est reconnue, et chiffrée', () => {
  // 24 km/h pendant 10 min (le téléphone est sur le guidon : aucun pas), puis
  // 20 min de trot à 11 km/h avec des pas. La MOYENNE d'ensemble est
  // parfaitement plausible : c'est exactement le trou que la fenêtre ferme.
  const vite = traceDe([{ kmh: 24, durationS: 600 }]);
  const lent = traceDe([{ kmh: 11, durationS: 1200 }]).map((p) => ({
    ...p,
    t: p.t + 600 * MS_PER_S,
  }));
  const points = [...vite, ...lent];
  const steps = [...cadenceDe(vite, 0), ...cadenceDe(lent, 165)];
  const verdict = checkDeclaredDiscipline2026(points, steps, 'run');
  assertEquals(verdict.suspected, 'bike');
  assert(
    verdict.evidence.sustainedKmh !== null &&
      verdict.evidence.sustainedKmh > DISCIPLINE_CHECK_2026.runLooksLikeBikeKmh,
    `la vitesse retenue doit être celle de la portion accusée (${verdict.evidence.sustainedKmh})`,
  );
  assert(
    verdict.evidence.stepsPerMin !== null &&
      verdict.evidence.stepsPerMin <= DISCIPLINE_CHECK_2026.noStrideMaxSpm,
    `et la cadence celle de la MÊME fenêtre (${verdict.evidence.stepsPerMin})`,
  );
  assertEquals(verdict.evidence.windowS, ANTICHEAT_SUSTAINED_WINDOW_S);
  assertEquals(verdict.evidence.reason, undefined);
});

Deno.test('un coureur RAPIDE qui pose des pieds n’est jamais accusé', () => {
  // 22 km/h sur 20 min : au-dessus de la borne anti-vélo, donc la moitié
  // « vitesse » du motif est remplie. La foulée interdit la conclusion.
  const points = traceDe([{ kmh: 22, durationS: 1200 }]);
  const verdict = checkDeclaredDiscipline2026(points, cadenceDe(points, 185), 'run');
  assertEquals(verdict.suspected, null, 'une moitié de motif ne conclut rien');
});

Deno.test('un téléphone MUET (zéro pas) mais à allure de coureur n’est pas accusé non plus', () => {
  // L'autre moitié seule : aucun pas, mais 11 km/h. `step_coherence` en dit ce
  // qu'il a à en dire ; la DISCIPLINE, elle, ne conclut pas.
  const points = traceDe([{ kmh: 11, durationS: 1800 }]);
  const verdict = checkDeclaredDiscipline2026(points, cadenceDe(points, 0), 'run');
  assertEquals(verdict.suspected, null);
});

Deno.test('la borne « ça ressemble à du vélo » est bien RUN_AVG_PACE_MIN_S_KM, pas un nombre neuf', () => {
  assertEquals(DISCIPLINE_CHECK_2026.runLooksLikeBikeKmh, 3600 / RUN_AVG_PACE_MIN_S_KM);
  const sous = traceDe([{ kmh: DISCIPLINE_CHECK_2026.runLooksLikeBikeKmh - 1.5, durationS: 900 }]);
  assertEquals(
    checkDeclaredDiscipline2026(sous, cadenceDe(sous, 0), 'run').suspected,
    null,
    'sous la borne, aucun soupçon même sans un seul pas',
  );
  const dessus = traceDe([{ kmh: DISCIPLINE_CHECK_2026.runLooksLikeBikeKmh + 1.5, durationS: 900 }]);
  assertEquals(
    checkDeclaredDiscipline2026(dessus, cadenceDe(dessus, 0), 'run').suspected,
    'bike',
    'au-dessus, et sans foulée, la lecture tient',
  );
});

// ════════════════════════════════════════════════════════════════════════════
// 2. VÉLO DÉCLARÉ — LE SENS QUI N'EXISTAIT PAS
// ════════════════════════════════════════════════════════════════════════════

Deno.test('un vélo HONNÊTE ne soupçonne rien', () => {
  const points = traceDe([{ kmh: 26, durationS: 1800 }]);
  const verdict = checkDeclaredDiscipline2026(points, cadenceDe(points, 0), 'bike');
  assertEquals(verdict.suspected, null);
  assertEquals(verdict.declared, 'bike');
});

Deno.test('ÉTAPE 0 — un vélo qui est EN FAIT de la course est reconnu', () => {
  // 11 km/h avec 165 pas/min pendant 30 min : quelqu'un court, et a choisi
  // « vélo » au départ. Ce sens n'était calculé NULLE PART avant ce lot.
  const points = traceDe([{ kmh: 11, durationS: 1800 }]);
  const verdict = checkDeclaredDiscipline2026(points, cadenceDe(points, 165), 'bike');
  assertEquals(verdict.suspected, 'run');
  assert(
    verdict.evidence.stepsPerMin !== null &&
      verdict.evidence.stepsPerMin >= DISCIPLINE_CHECK_2026.runCadenceMinSpm,
    `cadence de foulée mesurée (${verdict.evidence.stepsPerMin})`,
  );
  assert(
    verdict.evidence.sustainedKmh !== null &&
      verdict.evidence.sustainedKmh < DISCIPLINE_CHECK_2026.bikeLooksLikeRunKmh,
    `à une vitesse de coureur (${verdict.evidence.sustainedKmh})`,
  );
});

Deno.test('un cycliste SECOUÉ (faux pas comptés) à 30 km/h n’est pas invité à « basculer en course »', () => {
  // Sans la moitié « vitesse », la cadence seule proposerait une absurdité.
  const points = traceDe([{ kmh: 30, durationS: 1800 }]);
  const verdict = checkDeclaredDiscipline2026(points, cadenceDe(points, 160), 'bike');
  assertEquals(verdict.suspected, null);
});

Deno.test('un vélo LENT avec quelques pas (téléphone en poche) n’est pas accusé', () => {
  const points = traceDe([{ kmh: 13, durationS: 1800 }]);
  const verdict = checkDeclaredDiscipline2026(points, cadenceDe(points, 40), 'bike');
  assertEquals(verdict.suspected, null, '40 spm n’est pas une foulée');
});

// ════════════════════════════════════════════════════════════════════════════
// 3. CE QUI N'EST PAS MESURÉ N'EST PAS JUGÉ
// ════════════════════════════════════════════════════════════════════════════

Deno.test('SANS PODOMÈTRE, aucune discipline n’est soupçonnée — et le motif le DIT', () => {
  const points = traceDe([{ kmh: 24, durationS: 1800 }]);
  for (const declared of ACTIVITIES) {
    const verdict = checkDeclaredDiscipline2026(points, [], declared as Activity);
    assertEquals(verdict.suspected, null, `déclaré ${declared}`);
    assertEquals(verdict.evidence.reason, 'no_steps');
    assertEquals(verdict.evidence.stepsPerMin, null, 'on ne fabrique pas une cadence');
    assert(
      verdict.evidence.sustainedKmh !== null,
      'la vitesse, elle, A été mesurée : la taire serait aussi faux que l’inventer',
    );
  }
});

Deno.test('une trace trop COURTE ne produit ni soupçon ni chiffre', () => {
  const points = traceDe([{ kmh: 24, durationS: 120 }]);
  const verdict = checkDeclaredDiscipline2026(points, cadenceDe(points, 0), 'run');
  assertEquals(verdict.suspected, null);
  assertEquals(verdict.evidence.reason, 'no_window');
  assertEquals(verdict.evidence.sustainedKmh, null);
});

Deno.test('un podomètre qui DÉMARRE EN RETARD n’accuse pas la portion qu’il n’a pas écoutée', () => {
  // Trente minutes à 24 km/h ; le podomètre ne commence qu'à la 25e minute.
  // Sans le garde-fou de couverture, les vingt-quatre premières minutes se
  // liraient « zéro pas » — c'est-à-dire que l'accusation serait FABRIQUÉE.
  const points = traceDe([{ kmh: 24, durationS: 1800 }]);
  const tard = points[points.length - 1]!.t - 300 * MS_PER_S;
  const steps: StepWindow2026[] = [{ fromT: tard, toT: points[points.length - 1]!.t, steps: 0 }];
  const verdict = checkDeclaredDiscipline2026(points, steps, 'run');
  assert(
    verdict.suspected === null || verdict.evidence.stepsPerMin !== null,
    'un soupçon ne peut naître que d’une fenêtre réellement couverte',
  );
  // La seule fenêtre couverte est la dernière : si elle conclut, elle le fait
  // sur des pas OBSERVÉS, jamais sur le silence des vingt-quatre premières.
  if (verdict.suspected === 'bike') {
    assert(verdict.evidence.stepsPerMin === 0, 'et alors les pas observés valent bien zéro');
  }
});

Deno.test('un podomètre qui ne couvre RIEN du tout laisse le contrôle sans voix', () => {
  const points = traceDe([{ kmh: 24, durationS: 900 }]);
  const ailleurs: StepWindow2026[] = [
    { fromT: points[0]!.t - 3_600_000, toT: points[0]!.t - 3_000_000, steps: 500 },
  ];
  const verdict = checkDeclaredDiscipline2026(points, ailleurs, 'run');
  assertEquals(verdict.suspected, null);
  assertEquals(verdict.evidence.reason, 'steps_not_covering');
});

// ════════════════════════════════════════════════════════════════════════════
// 4. LA DÉGRADATION SERVEUR — UN CUMUL, UNE TRANCHE
// ════════════════════════════════════════════════════════════════════════════

Deno.test('un CUMUL de pas devient une tranche unique couvrant la trace', () => {
  const points = traceDe([{ kmh: 12, durationS: 600 }]);
  const windows = wholeRunStepWindow2026(points, 1700);
  assertEquals(windows.length, 1);
  assertEquals(windows[0]!.fromT, points[0]!.t);
  assertEquals(windows[0]!.toT, points[points.length - 1]!.t);
  assertEquals(windows[0]!.steps, 1700);
});

Deno.test('un cumul ABSENT ne devient jamais « zéro pas »', () => {
  const points = traceDe([{ kmh: 12, durationS: 600 }]);
  assertEquals(wholeRunStepWindow2026(points, undefined).length, 0);
  assertEquals(
    checkDeclaredDiscipline2026(points, wholeRunStepWindow2026(points, undefined), 'run')
      .evidence.reason,
    'no_steps',
  );
});

Deno.test('sur un cumul, le serveur voit le vélo NET et rate le vélo MÉLANGÉ (dette écrite)', () => {
  const netPoints = traceDe([{ kmh: 24, durationS: 1800 }]);
  assertEquals(
    checkDeclaredDiscipline2026(netPoints, wholeRunStepWindow2026(netPoints, 0), 'run').suspected,
    'bike',
    'zéro pas sur douze kilomètres : le cas le plus net reste attrapé',
  );
  // Deux kilomètres courus puis vingt pédalés : la cadence MOYENNE remonte
  // au-dessus du plancher et le serveur ne conclut plus. L'écran de fin, lui,
  // dispose des tranches et voit la fenêtre. C'est la dette, et elle est voulue.
  const couru = traceDe([{ kmh: 11, durationS: 600 }]);
  const pedale = traceDe([{ kmh: 24, durationS: 1800 }]).map((p) => ({
    ...p,
    t: p.t + 600 * MS_PER_S,
  }));
  const melange = [...couru, ...pedale];
  assertEquals(
    checkDeclaredDiscipline2026(melange, wholeRunStepWindow2026(melange, 1700), 'run').suspected,
    null,
    'le cumul dilue : le serveur ne conclut pas',
  );
  assertEquals(
    checkDeclaredDiscipline2026(
      melange,
      [...cadenceDe(couru, 170), ...cadenceDe(pedale, 0)],
      'run',
    ).suspected,
    'bike',
    'les tranches, elles, montrent la fenêtre — et c’est l’écran de fin qui les a',
  );
});

// ════════════════════════════════════════════════════════════════════════════
// 5. PURETÉ
// ════════════════════════════════════════════════════════════════════════════

Deno.test('la fonction ne MUTE pas ce qu’on lui donne', () => {
  const points = traceDe([{ kmh: 24, durationS: 900 }]);
  const avant = JSON.stringify(points);
  const steps = cadenceDe(points, 0);
  const stepsAvant = JSON.stringify(steps);
  checkDeclaredDiscipline2026(points, steps, 'run');
  assertEquals(JSON.stringify(points), avant);
  assertEquals(JSON.stringify(steps), stepsAvant);
});

Deno.test('des points DÉSORDONNÉS donnent le même verdict que des points triés', () => {
  const points = traceDe([{ kmh: 24, durationS: 900 }]);
  const melange = [...points].reverse();
  const steps = cadenceDe(points, 0);
  assertEquals(
    checkDeclaredDiscipline2026(melange, steps, 'run').suspected,
    checkDeclaredDiscipline2026(points, steps, 'run').suspected,
  );
});
