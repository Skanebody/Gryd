// GÉNÉRÉ par scripts/sync-game-rules.mjs — ne pas éditer.
// Source : packages/engine/src/validation.test.ts

/**
 * GRYD — tests de engine/validation.ts, volet DÉCOUPAGE DE LA TRACE
 * (`filterPoints`) : le saut SPATIAL et, depuis ce lot, le trou TEMPOREL.
 *
 * ═══ LE DÉFAUT QUE CES TESTS VERROUILLENT ═══════════════════════════════════
 * `filterPoints` ne coupait la trace que sur un saut > `pointMaxJumpM`. Une
 * course tuée par l'OS à 20 min et reprise 3 h plus tard AU MÊME ENDROIT ne
 * sautait donc de nulle part (0 m) : la trace restait UN segment de 3 h 20,
 * `computeStats` en tirait une allure de 2 460 s/km, et `validateRun` refusait
 * `pace_too_slow` un effort parfaitement réel. Reprise 150 m plus loin, le saut
 * spatial coupait et le temps mort disparaissait par accident — le verdict
 * dépendait de l'ENDROIT où l'app était morte. C'est ce hasard que
 * `POINT_MAX_GAP_S` supprime.
 *
 * ═══ ET CE QU'ILS VERROUILLENT AUTANT : L'ABSENCE DE COUPURE ════════════════
 * Couper trop est l'autre façon de mentir. Un arrêt sur place n'émet AUCUN
 * relevé côté client (`distanceInterval: 5`) : un feu rouge de 60 s est un trou
 * de trace alors que l'app tournait. Le couper amputerait le chrono d'un temps
 * réellement vécu ET casserait la boucle en deux segments — donc la zone, qui
 * exige un segment claimable CONTIGU. Les tests bornent donc les DEUX côtés du
 * seuil, et prouvent qu'une coupure sur place ne coûte pas un mètre.
 *
 * MÊMES CONTRAINTES D'OUTILLAGE que anticheat.test.ts / polygon.test.ts : aucun
 * import externe (le tsconfig du paquet typecheckerait un spécificateur `jsr:`),
 * et le global `Deno` déclaré localement.
 */
import { computeStats, filterPoints, validateRun } from './validation.ts';
import {
  POINT_MAX_GAP_S,
  POINT_MAX_JUMP_M,
  RUN_AVG_PACE_MAX_S_KM,
} from '../game-rules.ts';
import type { RunPoint } from '../types.ts';

// Voir le docblock : le runner Deno, typé localement.
declare const Deno: { test(nom: string, fn: () => void | Promise<void>): void };

// ─── Assertions minimales ────────────────────────────────────────────────────

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function assertEgal(actual: unknown, expected: unknown, message: string): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${message}\n  attendu : ${e}\n  obtenu  : ${a}`);
}

// ─── Fabrique de traces ──────────────────────────────────────────────────────
//
// Toutes les traces avancent PLEIN EST à latitude constante (Rouen) : la
// conversion mètres → degrés est exacte au premier ordre, donc une distance
// demandée est la distance que mesure la haversine du moteur. Rien n'est tiré
// au hasard : chaque point est posé par une formule.

const EARTH_RADIUS_M = 6_371_000;
const RAD_PER_DEG = Math.PI / 180;
const ORIGINE = { lat: 49.4431, lng: 1.0993 };
const COS_LAT0 = Math.cos(ORIGINE.lat * RAD_PER_DEG);
const MS_PER_S = 1_000;
/** 2 septembre 2026, 07:00 UTC — une date fixe, jamais `Date.now()`. */
const T0 = Date.UTC(2026, 8, 2, 7, 0, 0);

function pointEst(xM: number, tS: number): RunPoint {
  return {
    lat: ORIGINE.lat,
    lng: ORIGINE.lng + xM / (RAD_PER_DEG * EARTH_RADIUS_M * COS_LAT0),
    t: T0 + Math.round(tS * MS_PER_S),
  };
}

interface TronconOptions {
  /** Position (m depuis l'origine) et instant (s depuis T0) du premier relevé. */
  readonly x0: number;
  readonly t0: number;
  readonly durationS: number;
  /** Allure en s/km (300 = 5:00/km). */
  readonly paceSKm: number;
  /** Cadence d'échantillonnage (s). */
  readonly stepS: number;
}

/** Tronçon régulier plein est : `durationS / stepS + 1` relevés. */
function troncon(o: TronconOptions): RunPoint[] {
  const v = 1000 / o.paceSKm; // m/s
  const points: RunPoint[] = [];
  for (let s = 0; s <= o.durationS; s += o.stepS) {
    points.push(pointEst(o.x0 + v * s, o.t0 + s));
  }
  return points;
}

/** Dernier x (m) et dernier t (s) d'un tronçon, pour enchaîner le suivant. */
function finTroncon(o: TronconOptions): { x: number; t: number } {
  return { x: o.x0 + (1000 / o.paceSKm) * o.durationS, t: o.t0 + o.durationS };
}

// ─── §1 · LE CAS DU TICKET : kill de l'OS, reprise SUR PLACE ────────────────

/**
 * 20 min de course, l'app meurt, le coureur la rouvre 3 h plus tard AU MÊME
 * ENDROIT (chez lui, ou l'app a simplement été suspendue), 5 min de course.
 * Aucun saut spatial ne sépare les deux moitiés : seul le temps le fait.
 */
function courseTueePuisReprise(gapS: number): {
  points: RunPoint[];
  distanceAttendueM: number;
} {
  const avant: TronconOptions = { x0: 0, t0: 0, durationS: 20 * 60, paceSKm: 300, stepS: 5 };
  const fin = finTroncon(avant);
  const apres: TronconOptions = {
    x0: fin.x, // reprise EXACTEMENT là où l'app est morte : 0 m de saut
    t0: fin.t + gapS,
    durationS: 5 * 60,
    paceSKm: 300,
    stepS: 5,
  };
  return {
    points: [...troncon(avant), ...troncon(apres)],
    distanceAttendueM: 4_000 + 1_000,
  };
}

Deno.test('course tuée puis reprise SUR PLACE 3 h plus tard : deux segments, allure honnête', () => {
  const { points, distanceAttendueM } = courseTueePuisReprise(3 * 60 * 60);
  const { segments, totalPoints, keptPoints } = filterPoints(points);
  const stats = computeStats(segments);
  const verdict = validateRun(stats);

  // ÉTAPE 0 — avant le correctif, ce message affiche l'exact défaut :
  // « 1 segment, durée 12 300 s, allure 2 460 s/km, rejected pace_too_slow ».
  assertEgal(
    segments.length,
    2,
    'le trou de 3 h doit COUPER la trace' +
      ` — durée ${Math.round(stats.durationS)} s, allure ${Math.round(stats.avgPaceSKm)} s/km` +
      ` (plafond ${RUN_AVG_PACE_MAX_S_KM} s/km), verdict ${JSON.stringify(verdict)}`,
  );
  // Le temps mort sort du chrono : 20 min + 5 min courues, et rien d'autre.
  assertEgal(Math.round(stats.durationS), 25 * 60, 'la durée compte encore le temps mort');
  assert(
    Math.abs(stats.avgPaceSKm - 300) < 1,
    `allure attendue ~300 s/km, obtenue ${stats.avgPaceSKm.toFixed(1)} s/km`,
  );
  assertEgal(verdict, { status: 'valid' }, 'une course honnête reste refusée');
  // Une COUPURE n'est pas un REJET : aucun relevé ne disparaît au passage.
  assertEgal(
    { totalPoints, keptPoints },
    { totalPoints: points.length, keptPoints: points.length },
    'la coupure temporelle a jeté des points au lieu de couper',
  );
  assert(
    Math.abs(stats.distanceM - distanceAttendueM) < 1,
    `distance attendue ~${distanceAttendueM} m, obtenue ${stats.distanceM.toFixed(1)} m`,
  );
});

Deno.test('la coupure temporelle SUR PLACE ne coûte pas un mètre', () => {
  // Même trace, deux histoires : avec le trou de 3 h, et sans (course continue).
  // Les COORDONNÉES sont identiques — seuls les horodatages changent. Le trou
  // étant sur place, aucune distance ne le traverse : la somme doit être la même
  // au flottant près. (Sans quoi « ne pas compter le temps mort » deviendrait
  // « ne pas compter des mètres réellement courus ».)
  const avecTrou = computeStats(filterPoints(courseTueePuisReprise(3 * 60 * 60).points).segments);
  const sansTrou = computeStats(filterPoints(courseTueePuisReprise(5).points).segments);
  assert(
    Math.abs(avecTrou.distanceM - sansTrou.distanceM) < 1e-6,
    `la coupure a changé la distance : ${avecTrou.distanceM} m vs ${sansTrou.distanceM} m`,
  );
  // Contrôle du contrôle : la trace « sans trou » est bien restée d'un seul
  // tenant, sinon les deux distances seraient égales pour une mauvaise raison.
  assertEgal(
    filterPoints(courseTueePuisReprise(5).points).segments.length,
    1,
    'la trace de référence est déjà coupée : le test ne prouve rien',
  );
});

// ─── §2 · L'AUTRE CÔTÉ DU SEUIL : un arrêt n'est pas une absence ────────────

/** Course, arrêt SUR PLACE de `arretS` (aucun relevé : `distanceInterval: 5`), course. */
function arretSurPlace(arretS: number): RunPoint[] {
  const avant: TronconOptions = { x0: 0, t0: 0, durationS: 10 * 60, paceSKm: 300, stepS: 5 };
  const fin = finTroncon(avant);
  const apres: TronconOptions = {
    x0: fin.x,
    t0: fin.t + arretS,
    durationS: 10 * 60,
    paceSKm: 300,
    stepS: 5,
  };
  return [...troncon(avant), ...troncon(apres)];
}

Deno.test('feu rouge de 60 s : la trace reste d’un seul tenant', () => {
  const { segments } = filterPoints(arretSurPlace(60));
  assertEgal(
    segments.length,
    1,
    'un feu rouge coupe la trace : la boucle perdrait sa zone (segment claimable non contigu)',
  );
  // Et le temps d'arrêt reste dans le chrono : le coureur l'a vécu sur place.
  assertEgal(
    Math.round(computeStats(segments).durationS),
    20 * 60 + 60,
    'le temps d’arrêt a disparu du chrono',
  );
});

Deno.test('le seuil est STRICT : au seuil on ne coupe pas, juste au-dessus on coupe', () => {
  assertEgal(
    filterPoints(arretSurPlace(POINT_MAX_GAP_S)).segments.length,
    1,
    `un trou de EXACTEMENT ${POINT_MAX_GAP_S} s ne doit pas couper (borne stricte, comme le saut)`,
  );
  assertEgal(
    filterPoints(arretSurPlace(POINT_MAX_GAP_S + 1)).segments.length,
    2,
    `un trou de ${POINT_MAX_GAP_S + 1} s doit couper`,
  );
});

// ─── §3 · Ordre des vérifications ───────────────────────────────────────────

Deno.test('un horodatage DUPLIQUÉ reste rejeté, il n’ouvre pas un segment', () => {
  // dt = 0 se lit AVANT le trou temporel : sinon un relevé désordonné (dt ≤ 0)
  // tomberait dans la branche « nouveau segment » et fabriquerait une coupure là
  // où il n'y a qu'un doublon d'horloge.
  const base = troncon({ x0: 0, t0: 0, durationS: 10 * 60, paceSKm: 300, stepS: 5 });
  const doublon = { ...base[10]!, lng: base[10]!.lng + 0.000_02 };
  const { segments, totalPoints, keptPoints } = filterPoints([...base, doublon]);
  assertEgal(segments.length, 1, 'un doublon d’horodatage a coupé la trace');
  assertEgal(
    { totalPoints, keptPoints },
    { totalPoints: base.length + 1, keptPoints: base.length },
    'le doublon d’horodatage n’a pas été rejeté',
  );
});

Deno.test('le saut SPATIAL coupe toujours, même sans trou temporel', () => {
  // Garde-fou de non-régression : le trou temporel s'AJOUTE au saut, il ne le
  // remplace pas. Téléportation de 500 m en 5 s, aucun temps mort.
  const avant: TronconOptions = { x0: 0, t0: 0, durationS: 10 * 60, paceSKm: 300, stepS: 5 };
  const fin = finTroncon(avant);
  const apres: TronconOptions = {
    x0: fin.x + 5 * POINT_MAX_JUMP_M,
    t0: fin.t + 5,
    durationS: 10 * 60,
    paceSKm: 300,
    stepS: 5,
  };
  assertEgal(
    filterPoints([...troncon(avant), ...troncon(apres)]).segments.length,
    2,
    'le saut spatial ne coupe plus',
  );
});

// ─── §4 · La discipline ne change pas ce qu'est une app suspendue ───────────

Deno.test('à vélo, le même trou coupe : une app tuée l’est pareil à 25 ou 80 km/h', () => {
  const avant: TronconOptions = { x0: 0, t0: 0, durationS: 20 * 60, paceSKm: 180, stepS: 5 };
  const fin = finTroncon(avant);
  const apres: TronconOptions = {
    x0: fin.x,
    t0: fin.t + 3 * 60 * 60,
    durationS: 10 * 60,
    paceSKm: 180,
    stepS: 5,
  };
  const points = [...troncon(avant), ...troncon(apres)];
  assertEgal(filterPoints(points, 'bike').segments.length, 2, 'le trou de 3 h ne coupe pas à vélo');
  assertEgal(
    Math.round(computeStats(filterPoints(points, 'bike').segments).durationS),
    30 * 60,
    'la durée vélo compte encore le temps mort',
  );
});
