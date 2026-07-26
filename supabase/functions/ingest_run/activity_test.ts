/**
 * Tests DISCIPLINE (E14 — « une version bike et une version running »).
 * Purs : aucun réseau, aucune I/O.
 *
 * Ce que ce fichier VERROUILLE :
 *  1. l'INVARIANT `run` — les bornes de la course sont exactement celles d'avant
 *     l'arrivée du vélo, et la discipline ABSENTE se lit 'run' partout ;
 *  2. un cycliste RÉEL est accepté en `bike` et refusé en `run` ;
 *  3. un coureur réel reste accepté en `run` ;
 *  4. un véhicule LANCÉ est refusé dans les DEUX disciplines ;
 *  5. les bornes exactes, aux limites ;
 *  6. les LIMITES ASSUMÉES de l'anti-triche vélo — un test qui affirme
 *     explicitement ce que les bornes NE savent PAS faire, pour qu'on ne
 *     prétende jamais le contraire (« l'app ne ment jamais » vaut aussi pour
 *     les tests : un test qui feint une protection inexistante est un mensonge).
 */
import { assert, assertAlmostEquals, assertEquals } from 'jsr:@std/assert@^1';
import {
  ACTIVITIES,
  ACTIVITY_RULES,
  activityRules,
  BIKE_AVG_PACE_MIN_S_KM,
  BIKE_LOOP_MAX_AREA_CAP_KM2,
  BIKE_LOOP_MIN_PERIMETER_M,
  BIKE_MAX_DISTANCE_M,
  BIKE_MIN_DISTANCE_M,
  BIKE_MIN_DURATION_S,
  BIKE_POINT_MAX_JUMP_M,
  BIKE_POINT_MAX_SPEED_KMH,
  BIKE_SEGMENT_PACE_MIN_S_KM,
  DEFAULT_ACTIVITY,
  LOOP_MAX_AREA_CAP_KM2,
  POINT_MAX_ACCURACY_M,
  POINT_MAX_JUMP_M,
  POINT_MAX_SPEED_KMH,
  RUN_AVG_PACE_MAX_S_KM,
  RUN_AVG_PACE_MIN_S_KM,
  RUN_MAX_DISTANCE_M,
  RUN_MIN_DISTANCE_M,
  RUN_MIN_DURATION_S,
  SEGMENT_PACE_MAX_S_KM,
  SEGMENT_PACE_MIN_S_KM,
} from '../_shared/game-rules.ts';
import {
  claimableSegments,
  computeStats,
  filterPoints,
  stepCoherence,
  validateRun,
} from '../_shared/engine/validation.ts';
import { cleanTrace } from '../_shared/engine/gps.ts';
import { detectClosedLoop, loopMaxAreaM2 } from '../_shared/engine/hexing.ts';
import type { RunPoint } from '../_shared/types.ts';

const LAT0 = 48.8566;
const LNG0 = 2.3522;
const M_PER_DEG_LAT = 111_195;
const M_PER_DEG_LNG = M_PER_DEG_LAT * Math.cos((LAT0 * Math.PI) / 180);

/**
 * Ligne droite plein nord : `n` points RÉGULIERS couvrant `distanceM` en
 * `durationS` — donc à VITESSE CONSTANTE distanceM/durationS. C'est le
 * générateur de « pratiquant honnête » de tous les tests ci-dessous.
 */
function line(
  { distanceM, durationS, n, startT = 0, acc }: {
    distanceM: number;
    durationS: number;
    n: number;
    startT?: number;
    acc?: number;
  },
): RunPoint[] {
  const points: RunPoint[] = [];
  for (let i = 0; i < n; i++) {
    points.push({
      lat: LAT0 + (distanceM * (i / (n - 1))) / M_PER_DEG_LAT,
      lng: LNG0,
      t: startT + Math.round(durationS * 1000 * (i / (n - 1))),
      ...(acc !== undefined ? { acc } : {}),
    });
  }
  return points;
}

/** Carré fermé de côté `sideM` (dernier point = premier) — une vraie boucle. */
function square(sideM: number, perEdge = 12): { lat: number; lng: number }[] {
  const dLat = sideM / M_PER_DEG_LAT;
  const dLng = sideM / M_PER_DEG_LNG;
  const corners = [
    { lat: LAT0, lng: LNG0 },
    { lat: LAT0 + dLat, lng: LNG0 },
    { lat: LAT0 + dLat, lng: LNG0 + dLng },
    { lat: LAT0, lng: LNG0 + dLng },
  ];
  const ring: { lat: number; lng: number }[] = [];
  for (let c = 0; c < 4; c++) {
    const a = corners[c]!;
    const b = corners[(c + 1) % 4]!;
    for (let i = 0; i < perEdge; i++) {
      const f = i / perEdge;
      ring.push({ lat: a.lat + (b.lat - a.lat) * f, lng: a.lng + (b.lng - a.lng) * f });
    }
  }
  ring.push({ ...corners[0]! }); // fermeture exacte
  return ring;
}

/** Trace complète : filtrage + stats + verdict, dans une discipline donnée. */
function verdict(points: RunPoint[], activity?: 'run' | 'bike') {
  const filtered = activity === undefined ? filterPoints(points) : filterPoints(points, activity);
  const stats = computeStats(filtered.segments);
  const run = activity === undefined ? validateRun(stats) : validateRun(stats, activity);
  return { filtered, stats, run };
}

// ─── 1. INVARIANT : la course n'a pas bougé d'un iota ────────────────────────

Deno.test('discipline : ACTIVITIES = run + bike, défaut = run', () => {
  assertEquals([...ACTIVITIES], ['run', 'bike']);
  assertEquals(DEFAULT_ACTIVITY, 'run');
});

Deno.test('invariant : les bornes `run` SONT les constantes §3.2 historiques', () => {
  const r = activityRules('run');
  assertEquals(r.minDistanceM, RUN_MIN_DISTANCE_M);
  assertEquals(r.minDurationS, RUN_MIN_DURATION_S);
  assertEquals(r.avgPaceMinSKm, RUN_AVG_PACE_MIN_S_KM);
  assertEquals(r.avgPaceMaxSKm, RUN_AVG_PACE_MAX_S_KM);
  assertEquals(r.maxDistanceM, RUN_MAX_DISTANCE_M);
  assertEquals(r.pointMaxSpeedKmh, POINT_MAX_SPEED_KMH);
  assertEquals(r.pointMaxJumpM, POINT_MAX_JUMP_M);
  assertEquals(r.pointMaxAccuracyM, POINT_MAX_ACCURACY_M);
  assertEquals(r.segmentPaceMinSKm, SEGMENT_PACE_MIN_S_KM);
  assertEquals(r.segmentPaceMaxSKm, SEGMENT_PACE_MAX_S_KM);
  // Valeurs LITTÉRALES : si l'une bouge, c'est une DÉCISION DE JEU, pas un effet
  // de bord. Ce verrou a joué le 27/07/2026 : la spec produit §8.2 (source de
  // vérité, décision D-19) fixe le plancher run à 800 m — le dépôt était plus
  // strict à 1 000 m. Le chiffre est donc recalé DÉLIBÉRÉMENT, et le verrou
  // reprend son rôle sur la nouvelle valeur.
  assertEquals(r.minDistanceM, 800);
  assertEquals(r.avgPaceMinSKm, 170);
  assertEquals(r.pointMaxSpeedKmh, 25);
});

Deno.test('invariant : les bornes `bike` sont celles publiées (verrou de valeurs)', () => {
  const b = activityRules('bike');
  assertEquals(b.minDistanceM, BIKE_MIN_DISTANCE_M);
  assertEquals(b.minDurationS, BIKE_MIN_DURATION_S);
  assertEquals(b.avgPaceMinSKm, BIKE_AVG_PACE_MIN_S_KM);
  assertEquals(b.maxDistanceM, BIKE_MAX_DISTANCE_M);
  assertEquals(b.pointMaxSpeedKmh, BIKE_POINT_MAX_SPEED_KMH);
  assertEquals(b.pointMaxJumpM, BIKE_POINT_MAX_JUMP_M);
  assertEquals(b.segmentPaceMinSKm, BIKE_SEGMENT_PACE_MIN_S_KM);
  assertEquals(b.loopMinPerimeterM, BIKE_LOOP_MIN_PERIMETER_M);
  // 60 s/km = 60 km/h de moyenne : au-dessus du record de l'heure UCI (56,8).
  assertEquals(b.avgPaceMinSKm, 60);
  assertEquals(b.pointMaxSpeedKmh, 80);
  // Ce qui NE dépend PAS de la discipline doit rester IDENTIQUE (sinon c'est
  // un nombre inventé) : précision GPS, forme de boucle, tolérance, trust.
  assertEquals(b.pointMaxAccuracyM, activityRules('run').pointMaxAccuracyM);
  assertEquals(b.loopMinCompactness, activityRules('run').loopMinCompactness);
  assertEquals(b.loopMinWidthM, activityRules('run').loopMinWidthM);
  assertEquals(b.loopCloseToleranceM, activityRules('run').loopCloseToleranceM);
  assertEquals(b.loopMinGpsTrust, activityRules('run').loopMinGpsTrust);
  assertEquals(b.avgPaceMaxSKm, activityRules('run').avgPaceMaxSKm);
  assertEquals(b.segmentPaceMaxSKm, activityRules('run').segmentPaceMaxSKm);
});

Deno.test('défaut : discipline absente ⇒ comportement `run` à l’identique', () => {
  const pts = line({ distanceM: 5_000, durationS: 1_636, n: 201 });
  assertEquals(verdict(pts).run, verdict(pts, 'run').run);
  assertEquals(verdict(pts).filtered.keptPoints, verdict(pts, 'run').filtered.keptPoints);

  const stats = { distanceM: 5_000, durationS: 1_636, avgPaceSKm: 327.2 };
  assertEquals(validateRun(stats), validateRun(stats, 'run'));

  const segs = filterPoints(pts).segments;
  assertEquals(claimableSegments(segs).status, claimableSegments(segs, 'run').status);
  assertEquals(stepCoherence(5_000, 6_000), stepCoherence(5_000, 6_000, 'run'));
  assertEquals(activityRules(), activityRules('run'));
  assertEquals(loopMaxAreaM2(5_000), loopMaxAreaM2(5_000, 'run'));
  assertEquals(detectClosedLoop(square(300)), detectClosedLoop(square(300), 'run'));
});

// ─── 2. LE CYCLISTE RÉEL ─────────────────────────────────────────────────────

Deno.test('cycliste 28 km/h : ACCEPTÉ en bike, ANÉANTI en run (points tous filtrés)', () => {
  // 12 km en 25 min 43 s = 28 km/h — une sortie de route ordinaire.
  const ride = line({ distanceM: 12_000, durationS: 1_542.86, n: 201 });

  const bike = verdict(ride, 'bike');
  assertEquals(bike.filtered.keptPoints, 201, 'aucun point vélo ne doit être jeté');
  assertEquals(bike.run.status, 'valid');
  assertEquals(claimableSegments(bike.filtered.segments, 'bike').status, 'valid');

  // En course, chaque point dépasse POINT_MAX_SPEED_KMH → il ne reste rien.
  const asRun = verdict(ride, 'run');
  // `keptPoints` compte les points RETENUS DANS DES SEGMENTS : le point d'ancrage
  // isolé ne forme aucun segment (< 2 points), il ne compte donc pas.
  assertEquals(asRun.filtered.keptPoints, 0, 'aucun segment ne survit');
  assertEquals(asRun.filtered.segments.length, 0);
  assertEquals(asRun.run.status, 'rejected');
  assert(asRun.run.status === 'rejected' && asRun.run.reason === 'no_valid_points');
});

Deno.test('cycliste 24 km/h (sous la borne point course) : bike valide, run `pace_too_fast`', () => {
  // 10 km en 25 min = 24 km/h : les points PASSENT le filtre course (< 25 km/h),
  // c'est donc l'allure MOYENNE qui tranche — le rejet historiquement commenté
  // « anti-vélo ». Il reste JUSTE quand la discipline n'est pas déclarée.
  const ride = line({ distanceM: 10_000, durationS: 1_500, n: 201 });

  const asRun = verdict(ride, 'run');
  assertEquals(asRun.filtered.keptPoints, 201);
  assert(asRun.run.status === 'rejected' && asRun.run.reason === 'pace_too_fast');

  const asBike = verdict(ride, 'bike');
  assertEquals(asBike.run.status, 'valid');
  assertAlmostEquals(asBike.stats.avgPaceSKm, 150, 1);
});

Deno.test('cycliste en descente : cleanTrace ne le « téléporte » plus en bike', () => {
  // 50 km/h, échantillon toutes les 2 s → 27,8 m entre fixes.
  const fixes = Array.from({ length: 60 }, (_, i) => ({
    lat: LAT0 + (i * 27.8) / M_PER_DEG_LAT,
    lng: LNG0,
    ts: i * 2_000,
    accuracy: 6,
  }));

  const asBike = cleanTrace(fixes, 'bike');
  assertEquals(asBike.rejected.speed, 0);
  assertEquals(asBike.points.length, 60);

  const asRun = cleanTrace(fixes, 'run');
  assert(asRun.rejected.speed > 0, 'en course, 50 km/h reste une vitesse impossible');
  assertEquals(cleanTrace(fixes).points.length, asRun.points.length, 'défaut = run');
});

// ─── 3. LE COUREUR RÉEL N'A RIEN PERDU ───────────────────────────────────────

Deno.test('coureur 11 km/h : toujours valide en run, segments claimables', () => {
  const run = line({ distanceM: 5_000, durationS: 1_636, n: 201 });
  const v = verdict(run, 'run');
  assertEquals(v.filtered.keptPoints, 201);
  assertEquals(v.run.status, 'valid');
  const claim = claimableSegments(v.filtered.segments, 'run');
  assertEquals(claim.status, 'valid');
  assertEquals(claim.excluded.length, 0);
});

// ─── 4. LE VÉHICULE MOTORISÉ EST REFUSÉ DES DEUX CÔTÉS ───────────────────────

Deno.test('voiture lancée 90 km/h : REJETÉE en run ET en bike', () => {
  // 20 km en 13 min 20 s = 90 km/h, un fix toutes les 2 s (50 m) : sous les deux
  // plafonds de saut, c'est donc bien la VITESSE qui tranche, pas la géométrie.
  const car = line({ distanceM: 20_000, durationS: 800, n: 401 });

  for (const activity of ['run', 'bike'] as const) {
    const v = verdict(car, activity);
    assertEquals(v.filtered.keptPoints, 0, `${activity} : aucun point ne doit survivre`);
    assertEquals(v.filtered.segments.length, 0, activity);
    assert(
      v.run.status === 'rejected' && v.run.reason === 'no_valid_points',
      `${activity} : la voiture doit être rejetée`,
    );
  }
});

Deno.test('voiture 90 km/h : rejetée AUSSI par l’allure moyenne si les points survivaient', () => {
  // Preuve indépendante du filtre point par point : même en admettant la trace,
  // 40 s/km (90 km/h) tombe sous la borne basse des DEUX disciplines.
  const stats = { distanceM: 20_000, durationS: 800, avgPaceSKm: 40 };
  for (const activity of ['run', 'bike'] as const) {
    const v = validateRun(stats, activity);
    assert(v.status === 'rejected' && v.reason === 'pace_too_fast', activity);
  }
});

// ─── 5. LES BORNES EXACTES ───────────────────────────────────────────────────

Deno.test('bornes exactes : validateRun aux limites de chaque discipline', () => {
  for (const activity of ['run', 'bike'] as const) {
    const r = activityRules(activity);
    const at = (over: Partial<{ distanceM: number; durationS: number; avgPaceSKm: number }>) =>
      validateRun({
        distanceM: r.minDistanceM,
        durationS: r.minDurationS,
        avgPaceSKm: (r.avgPaceMinSKm + r.avgPaceMaxSKm) / 2,
        ...over,
      }, activity);

    // Distance : le minimum EXACT passe, un mètre de moins ne passe pas.
    assertEquals(at({}).status, 'valid', activity);
    assert(at({ distanceM: r.minDistanceM - 1 }).status === 'rejected');
    assertEquals(
      at({ distanceM: r.minDistanceM - 1 }),
      { status: 'rejected', reason: 'too_short' },
    );
    // Durée : le minimum EXACT passe.
    assertEquals(
      at({ durationS: r.minDurationS - 1 }),
      { status: 'rejected', reason: 'too_brief' },
    );
    // Allure : la borne basse EXACTE passe, en dessous c'est un moteur.
    assertEquals(at({ avgPaceSKm: r.avgPaceMinSKm }).status, 'valid', activity);
    assertEquals(
      at({ avgPaceSKm: r.avgPaceMinSKm - 0.001 }),
      { status: 'rejected', reason: 'pace_too_fast' },
    );
    // Allure : la borne haute EXACTE passe.
    assertEquals(at({ avgPaceSKm: r.avgPaceMaxSKm }).status, 'valid', activity);
    assertEquals(
      at({ avgPaceSKm: r.avgPaceMaxSKm + 0.001 }),
      { status: 'rejected', reason: 'pace_too_slow' },
    );
    // Plafond anti-abus : la valeur EXACTE passe, au-delà non.
    assertEquals(at({ distanceM: r.maxDistanceM }).status, 'valid', activity);
    assertEquals(
      at({ distanceM: r.maxDistanceM + 1 }),
      { status: 'rejected', reason: 'too_far' },
    );
  }
});

Deno.test('bornes exactes : filterPoints coupe à la vitesse point de la discipline', () => {
  // Deux points à 2 s d'intervalle : on choisit la distance pour encadrer la
  // borne par ± ~1 %, sans jouer sur l'égalité flottante exacte.
  const pair = (metres: number): RunPoint[] => [
    { lat: LAT0, lng: LNG0, t: 0 },
    { lat: LAT0 + metres / M_PER_DEG_LAT, lng: LNG0, t: 2_000 },
  ];
  // Paire acceptée → 1 segment de 2 points ; paire refusée → aucun segment (0).
  const kept = (metres: number, activity: 'run' | 'bike') =>
    filterPoints(pair(metres), activity).keptPoints;

  // run : 25 km/h = 13,89 m en 2 s.
  assertEquals(kept(13.7, 'run'), 2);
  assertEquals(kept(14.1, 'run'), 0);
  // bike : 80 km/h = 44,44 m en 2 s. Le même 14,1 m y est trivialement accepté.
  assertEquals(kept(14.1, 'bike'), 2);
  assertEquals(kept(44.0, 'bike'), 2);
  assertEquals(kept(45.0, 'bike'), 0);
});

Deno.test('bornes exactes : claimableSegments suit l’allure segment de la discipline', () => {
  // Tronçon à 65 km/h (55,4 s/km) : descente plausible à vélo (borne 50 s/km),
  // impossible à pied — la course le REFUSE au claim sans invalider la sortie.
  const fast = filterPoints(line({ distanceM: 3_000, durationS: 166, n: 61 }), 'bike').segments;
  assertEquals(claimableSegments(fast, 'bike').status, 'valid');
  assertEquals(claimableSegments(fast, 'bike').excluded.length, 0);

  // Tronçon à 75 km/h (48 s/km) : les POINTS passent (< 80 km/h) mais le
  // TRONÇON ENTIER roule sous la borne segment vélo (50 s/km) → sortie VALIDE,
  // ce tronçon ne capture rien. C'est le filet qui manquait entre « pointe de
  // descente tolérée » et « segment entier à vitesse de moteur ».
  const motor = filterPoints(line({ distanceM: 3_000, durationS: 144, n: 61 }), 'bike').segments;
  assertEquals(motor.length, 1, 'les points doivent survivre au filtre point par point');
  assertEquals(claimableSegments(motor, 'bike').status, 'partial');
  assertEquals(claimableSegments(motor, 'bike').claimable.length, 0);
});

// ─── 6. COHÉRENCE PAS/DISTANCE : LE MÊME SEUIL, LU DANS LES DEUX SENS ────────

Deno.test('stepCoherence : pédaler ne produit pas de pas — un cycliste n’est jamais flaggé', () => {
  // 10 km sans un seul pas : suspect à pied (véhicule), NORMAL à vélo.
  assertEquals(stepCoherence(10_000, 0, 'run'), 0);
  assertEquals(stepCoherence(10_000, 0, 'bike'), 100);
  // Signal absent → neutre des deux côtés (on ne pénalise jamais un client muet).
  assertEquals(stepCoherence(10_000, undefined, 'bike'), 100);
  assertEquals(stepCoherence(10_000, undefined, 'run'), 100);
  // Distance non significative pour la discipline → neutre.
  assertEquals(stepCoherence(BIKE_MIN_DISTANCE_M - 1, 0, 'bike'), 100);
});

Deno.test('stepCoherence : une COURSE déclarée en vélo est démasquée par les pas', () => {
  // 1,2 pas/m = une foulée. En `bike`, le même seuil lu à l'envers → trust 0
  // (sortie 'flagged' : stats gardées, capture gelée).
  assertEquals(stepCoherence(5_000, 6_000, 'bike'), 0);
  // À pied, exactement la même trace est parfaitement crédible.
  assertEquals(stepCoherence(5_000, 6_000, 'run'), 100);
});

// ─── 7. LA BOUCLE À L'ÉCHELLE DE LA DISCIPLINE ───────────────────────────────

Deno.test('boucle : 1,2 km ferme une zone à pied, PAS à vélo (E14 « échelle ville »)', () => {
  const petite = square(300); // périmètre ≈ 1 200 m
  assertEquals(detectClosedLoop(petite, 'run'), true);
  assertEquals(detectClosedLoop(petite, 'bike'), false);
});

Deno.test('boucle : 6 km ferme une zone dans les deux disciplines', () => {
  const grande = square(1_500); // périmètre ≈ 6 000 m
  assertEquals(detectClosedLoop(grande, 'run'), true);
  assertEquals(detectClosedLoop(grande, 'bike'), true);
});

Deno.test('boucle : la table d’aire vélo est l’HOMOTHÉTIE exacte de la table course', () => {
  // Distances ×5, aires ×25 : le rapport aire/distance² est IDENTIQUE, donc la
  // règle est la même à une autre échelle — ni avantage, ni punition.
  for (const [runKm, bikeKm] of [[3, 15], [5, 25], [10, 50]] as const) {
    const ratio = loopMaxAreaM2(bikeKm * 1_000, 'bike') / loopMaxAreaM2(runKm * 1_000, 'run');
    assertAlmostEquals(ratio, 25, 1e-6, `${runKm} km ↔ ${bikeKm} km`);
  }
  // Caps durs : 3 km² à pied, 75 km² à vélo (même facteur 25).
  assertEquals(loopMaxAreaM2(1_000_000, 'run'), LOOP_MAX_AREA_CAP_KM2 * 1e6);
  assertEquals(loopMaxAreaM2(1_000_000, 'bike'), BIKE_LOOP_MAX_AREA_CAP_KM2 * 1e6);
  assertEquals(BIKE_LOOP_MAX_AREA_CAP_KM2 / LOOP_MAX_AREA_CAP_KM2, 25);
});

// ─── 8. CE QUE LES BORNES NE SAVENT PAS FAIRE (limites ASSUMÉES) ─────────────

Deno.test('LIMITE ASSUMÉE : une voiture URBAINE (45 km/h) passe les bornes vélo', () => {
  // Aucune borne de VITESSE ne sépare une voiture en ville d'un cycliste rapide.
  // Les signaux qui le pourraient (accélérations, arrêts, altitude, cohérence
  // routière — Spéc Unifiée §8) n'existent nulle part dans le code. Ce test
  // AFFIRME le trou plutôt que de le masquer : le jour où ces signaux arrivent,
  // il DOIT être requalifié, jamais supprimé en silence.
  const urbanCar = line({ distanceM: 12_000, durationS: 960, n: 401 }); // 45 km/h
  assertEquals(verdict(urbanCar, 'bike').run.status, 'valid');
  // La course, elle, reste protégée : 45 km/h y est impossible.
  const asRun = verdict(urbanCar, 'run');
  assert(asRun.run.status === 'rejected' && asRun.run.reason === 'no_valid_points');
});

Deno.test('LIMITE ASSUMÉE : une COURSE déclarée en vélo passe si aucun pas n’est envoyé', () => {
  // Sans podomètre, rien ne distingue une sortie à 11 km/h à pied d'une sortie
  // lente à vélo : les deux sont physiquement plausibles. `stepCount` est le
  // SEUL garde-fou, et il est optionnel. À documenter côté produit, pas à
  // maquiller ici.
  const runner = line({ distanceM: 5_000, durationS: 1_636, n: 201 });
  assertEquals(verdict(runner, 'bike').run.status, 'valid');
  // Avec le podomètre, le masque tombe (cf. test stepCoherence ci-dessus).
  assertEquals(stepCoherence(5_000, 6_000, 'bike'), 0);
});
