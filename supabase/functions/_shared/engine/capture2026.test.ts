// GÉNÉRÉ par scripts/sync-game-rules.mjs — ne pas éditer.
// Source : packages/engine/src/capture2026.test.ts

/**
 * GRYD — tests du moteur de capture 2026 (cahier §5.4/§5.5).
 *
 * Chaque test nomme l'INVARIANT qu'il défend (I1…I7, en tête de capture2026.ts).
 * Aucun nombre de jeu n'est écrit ici : tout vient de @klaim/shared/game-rules,
 * sinon un test vert prouverait seulement qu'il se ressemble à lui-même.
 */
import {
  activityRules, GPS_ACCURACY_MAX_M, POINT_MAX_GAP_S, TERRITORY_RULES_2026, type Activity,
} from '../game-rules.ts';
import type { RunPoint } from '../types.ts';
import {
  analyzeTrace2026, captureRejection2026, CAPTURE_REASON_SUFFIX_2026, CAPTURE_REASON_TEXT_2026,
} from './capture2026.ts';

declare const Deno: {
  test(name: string, fn: () => void | Promise<void>): void;
  readTextFile(path: string): Promise<string>;
};
/** Le moteur vit à deux endroits (source + copie générée) : on remonte jusqu'au dépôt. */
const HERE = (import.meta as unknown as { readonly dirname: string }).dirname;

function equal(actual: unknown, expected: unknown, message = ''): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message} — attendu ${JSON.stringify(expected)}, reçu ${JSON.stringify(actual)}`);
  }
}
function ok(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const ORIGIN = Date.parse('2026-09-09T08:00:00Z');
const STEP_MS = 10_000; // Cadence du gabarit de test, pas une règle de jeu.

/** Trace synthétique : sommets en mètres autour de Rouen, échantillonnés régulièrement. */
function trace(
  vertices: readonly (readonly [number, number])[],
  options: { stepM?: number; acc?: number } = {},
): RunPoint[] {
  const result: RunPoint[] = [];
  for (let i = 1; i < vertices.length; i++) {
    const a = vertices[i - 1]!, b = vertices[i]!;
    const count = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (options.stepM ?? 20)));
    for (let j = i === 1 ? 0 : 1; j <= count; j++) {
      result.push({
        lat: 49.4431 + (a[1] + (b[1] - a[1]) * j / count) / 111_195,
        lng: 1.0993 + (a[0] + (b[0] - a[0]) * j / count) / (111_195 * Math.cos(49.4431 * Math.PI / 180)),
        t: ORIGIN + result.length * STEP_MS,
        acc: options.acc ?? 5,
      });
    }
  }
  return result;
}
const SQUARE = [[0, 0], [300, 0], [300, 300], [0, 300], [0, 0]] as const;
/** Boucle ouverte : revient PRÈS du départ sans se recouper (fermeture déclarée). */
const HORSESHOE = [[0, 0], [300, 0], [300, 300], [0, 300], [0, 20]] as const;

// ─── I2/I3 : la précision urbaine ne détruit plus une boucle réelle ─────────
Deno.test('2026: une boucle urbaine à 15-35 m de précision capture (I2)', () => {
  const urban = TERRITORY_RULES_2026.endpointMaxAccuracyM + 10;
  ok(urban > TERRITORY_RULES_2026.endpointMaxAccuracyM && urban <= GPS_ACCURACY_MAX_M,
    'la fixture doit se situer entre le seuil d’extrémité et le plafond client');
  const result = analyzeTrace2026(trace(SQUARE, { acc: urban }), 'run');
  equal(result.faces.length, 1, 'une auto-intersection observée ne déclare aucune fermeture');
  equal(result.qualityBreaks, 0, 'un point imprécis ne coupe pas la frontière');
  equal(captureRejection2026(result, 'run'), null, 'aucun refus à expliquer');
});

Deno.test('2026: un point au-delà du plafond client est écarté sans couper (I1/I2)', () => {
  const points = trace(SQUARE);
  const noisy = points.map((p, i) => i % 7 === 3 ? { ...p, acc: GPS_ACCURACY_MAX_M + 1 } : p);
  const result = analyzeTrace2026(noisy, 'run');
  equal(result.faces.length, 1, 'la boucle survit à des points isolés trop incertains');
  equal(result.qualityBreaks, 0, 'aucune coupure de frontière');
  ok(result.droppedImprecisePoints > 0, 'les points écartés sont comptés, pas cachés');
});

Deno.test('2026: une fermeture DÉCLARÉE exige des extrémités précises (I3)', () => {
  const precise = analyzeTrace2026(trace(HORSESHOE), 'run');
  equal(precise.faces.length, 1, 'un retour à moins de closureMaxGapM ferme la boucle');
  const uncertain = TERRITORY_RULES_2026.endpointMaxAccuracyM + 1;
  const refused = analyzeTrace2026(trace(HORSESHOE, { acc: uncertain }), 'run');
  equal(refused.faces.length, 0, 'on ne déclare pas une fermeture sur des points très incertains');
  equal(refused.unconfirmedClosures, 1, 'le refus est compté');
  equal(captureRejection2026(refused, 'run')?.code, 'gps_quality_unconfirmed', '');
  equal(captureRejection2026(refused, 'run')?.detail.observedAccuracyM, uncertain, '');
  equal(captureRejection2026(refused, 'run')?.detail.endpointMaxAccuracyM,
    TERRITORY_RULES_2026.endpointMaxAccuracyM, '');
});

// ─── I5 : une seule notion de trou, POINT_MAX_GAP_S ────────────────────────
Deno.test('2026: une veille iOS ou un tunnel de 90 s ne détruit pas la boucle (I5)', () => {
  const points = trace(SQUARE);
  const middle = Math.floor(points.length / 2);
  const napMs = 90_000;
  ok(napMs > 30_000 && napMs < POINT_MAX_GAP_S * 1000, 'la fixture vise le trou de veille réel');
  const napped = points.map((p, i) => i >= middle ? { ...p, t: p.t + napMs } : p);
  equal(analyzeTrace2026(napped, 'run').faces.length, 1, 'le trou de veille ne coupe pas la frontière');
  equal(analyzeTrace2026(napped, 'run').qualityBreaks, 0, '');
});

Deno.test('2026: le seuil de coupure est celui de validation.ts, borne stricte (I5)', () => {
  for (const activity of ['run', 'bike'] as Activity[]) {
    equal(activityRules(activity).pointMaxGapS, POINT_MAX_GAP_S, `${activity}: une seule constante de trou`);
  }
  const points = trace(SQUARE);
  const middle = Math.floor(points.length / 2);
  const shift = (ms: number) => points.map((p, i) => i >= middle ? { ...p, t: p.t + ms } : p);
  equal(analyzeTrace2026(shift(POINT_MAX_GAP_S * 1000 - STEP_MS), 'run').faces.length, 1,
    'un trou de EXACTEMENT POINT_MAX_GAP_S ne coupe pas');
  equal(analyzeTrace2026(shift(POINT_MAX_GAP_S * 1000 - STEP_MS + 1), 'run').faces.length, 0,
    'un trou d’une milliseconde de plus coupe');
});

Deno.test('2026: une pause explicite et un retour d’horloge coupent toujours (I1)', () => {
  const points = trace(SQUARE);
  const middle = Math.floor(points.length / 2);
  const paused = points.map((p, i) => i === middle ? { ...p, breakBefore: true as const } : p);
  equal(analyzeTrace2026(paused, 'run').faces.length, 0, 'une pause du recorder coupe la frontière');
  equal(analyzeTrace2026(paused, 'run').qualityBreaks, 1, '');
  const rewound = points.map((p, i) => ({ ...p, t: ORIGIN - i * STEP_MS }));
  equal(analyzeTrace2026(rewound, 'run').faces.length, 0, 'une horloge qui recule ne dessine rien');
});

Deno.test('2026: une téléportation impossible coupe la frontière (I1)', () => {
  const points = trace(SQUARE);
  const middle = Math.floor(points.length / 2);
  const speedM = activityRules('run').pointMaxSpeedKmh / 3.6 * (STEP_MS / 1000);
  const jumped = points.map((p, i) => i >= middle ? { ...p, lng: p.lng + (speedM * 4) / (111_195 * Math.cos(49.4431 * Math.PI / 180)) } : p);
  equal(analyzeTrace2026(jumped, 'run').faces.length, 0, 'un saut plus rapide que la discipline coupe');
  ok(analyzeTrace2026(jumped, 'run').qualityBreaks > 0, '');
});

// ─── I4 : le sport survit toujours à la géométrie ──────────────────────────
Deno.test('2026: distance et durée survivent à une frontière refusée (I4)', () => {
  const clean = analyzeTrace2026(trace(SQUARE), 'run');
  const noisy = analyzeTrace2026(trace(SQUARE, { acc: GPS_ACCURACY_MAX_M + 20 }), 'run');
  equal(noisy.faces.length, 0, 'aucune capture sur une trace hors plafond');
  ok(Math.abs(noisy.distanceM - clean.distanceM) < 1, 'la distance sportive est intacte');
  ok(Math.abs(noisy.durationS - clean.durationS) < 1, 'la durée sportive est intacte');
});

// ─── I6 : tout refus porte un identifiant stable ET ses données ────────────
Deno.test('2026: une boucle trop petite dit combien de mètres manquent (I6)', () => {
  const rules = TERRITORY_RULES_2026.run;
  const small = analyzeTrace2026(trace([[0, 0], [100, 0], [100, 100], [0, 100], [0, 0]], { stepM: 10 }), 'run');
  const rejection = captureRejection2026(small, 'run');
  equal(rejection?.code, 'loop_too_small', '');
  equal(rejection?.detail.minLoopDistanceM, rules.minLoopDistanceM, '');
  ok((rejection?.detail.missingLengthM ?? 0) > 0, 'le joueur reçoit les mètres qui manquent');
  ok(Math.abs(((rejection?.detail.loopLengthM ?? 0) + (rejection?.detail.missingLengthM ?? 0)) - rules.minLoopDistanceM) < 1,
    'mètres manquants = seuil − longueur mesurée');
});

Deno.test('2026: une sortie ouverte n’est jamais présentée comme un problème de GPS (I6)', () => {
  const open = analyzeTrace2026(trace([[0, 0], [5000, 0]]), 'run');
  const rejection = captureRejection2026(open, 'run');
  equal(rejection?.code, 'no_admissible_loop', '');
  equal(open.rejectedSmallLoops, 0, '');
  ok((rejection?.detail.closureGapM ?? 0) > TERRITORY_RULES_2026.run.closureMaxGapM,
    'la donnée dit à quelle distance du départ la sortie s’est terminée');
});

Deno.test('2026: les motifs reprennent les formulations exactes du cahier §5.5 (I6)', async () => {
  let cahier: string | null = null;
  for (let depth = 1; depth <= 8 && cahier === null; depth++) {
    const candidate = `${HERE}/${'../'.repeat(depth)}docs/product/GRYD_REFONTE_INTEGRALE_2026_09.md`;
    try { cahier = await Deno.readTextFile(candidate); } catch { /* on remonte d'un cran */ }
  }
  ok(cahier !== null, 'le cahier de septembre doit être lisible depuis le moteur');
  for (const sentence of Object.values(CAPTURE_REASON_TEXT_2026)) {
    ok(cahier!.includes(sentence), `formulation absente du cahier : « ${sentence} »`);
  }
  ok(cahier!.includes(CAPTURE_REASON_SUFFIX_2026), 'le suffixe « Ta sortie est enregistrée. » vient du cahier');
  equal(Object.keys(CAPTURE_REASON_TEXT_2026).sort(),
    ['gps_quality_unconfirmed', 'loop_too_small', 'no_admissible_loop'], 'les trois motifs de §5.5');
});

// ─── Géométrie : ce que la refonte garantissait déjà, non régressé ─────────
Deno.test('2026: huit, faces séparées et instants de fermeture distincts', () => {
  const points = trace([[0, 0], [300, 0], [300, 300], [0, 300], [0, 0], [-300, 0], [-300, -300], [0, -300], [0, 0]]);
  const result = analyzeTrace2026(points, 'run');
  equal(result.faces.length, 2, 'une trace en huit donne deux boucles, jamais une enveloppe');
  ok(Date.parse(result.faces[0]!.closedAt) < Date.parse(result.faces[1]!.closedAt), '');
  for (const face of result.faces) ok(face.areaM2 < 91_000, 'aucune face n’englobe l’extérieur');
});

Deno.test('2026: Course et Vélo gardent des seuils indépendants', () => {
  equal(analyzeTrace2026(trace(SQUARE), 'run').faces.length, 1, '');
  equal(analyzeTrace2026(trace(SQUARE), 'bike').faces.length, 0, '');
  equal(analyzeTrace2026(trace([[0, 0], [700, 0], [700, 700], [0, 700], [0, 0]]), 'bike').faces.length, 1, '');
});
