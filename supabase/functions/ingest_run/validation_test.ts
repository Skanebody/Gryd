/**
 * Tests validation.ts — SPEC §3.2 + GRYD Verify MVP (cohérence pas/distance).
 * Purs : aucun réseau, aucune I/O.
 */
import { assert, assertEquals } from 'jsr:@std/assert@^1';
import {
  MOTION_TRUST_FLAGGED_BELOW,
  MOTION_TRUST_NEUTRAL,
  claimableSegments,
  computeStats,
  filterPoints,
  haversineM,
  stepCoherence,
  validateRun,
} from './validation.ts';
import type { RunPoint } from '../_shared/types.ts';

// ~1 degré de latitude = ~111 195 m (repère des helpers ci-dessous).
const LAT0 = 48.8566;
const LNG0 = 2.3522;
const M_PER_DEG_LAT = 111_195;

/** Ligne droite plein nord : `n` points régulier·s couvrant distanceM en durationS. */
function line(
  { distanceM, durationS, n, startT = 0, startLat = LAT0, acc }: {
    distanceM: number;
    durationS: number;
    n: number;
    startT?: number;
    startLat?: number;
    acc?: number;
  },
): RunPoint[] {
  const points: RunPoint[] = [];
  for (let i = 0; i < n; i++) {
    points.push({
      lat: startLat + (distanceM * (i / (n - 1))) / M_PER_DEG_LAT,
      lng: LNG0,
      t: startT + Math.round(durationS * 1000 * (i / (n - 1))),
      ...(acc !== undefined ? { acc } : {}),
    });
  }
  return points;
}

Deno.test('haversineM : ~1 km pour 0,009° de latitude', () => {
  const d = haversineM({ lat: LAT0, lng: LNG0 }, { lat: LAT0 + 1000 / M_PER_DEG_LAT, lng: LNG0 });
  assert(Math.abs(d - 1000) < 2, `attendu ~1000 m, obtenu ${d}`);
});

// ─── validateRun (§3.2) ──────────────────────────────────────────────────────

Deno.test('course trop courte → rejected too_short', () => {
  // 500 m en 6 min : durée OK, distance < RUN_MIN_DISTANCE_M.
  const { segments } = filterPoints(line({ distanceM: 500, durationS: 360, n: 60 }));
  const v = validateRun(computeStats(segments));
  assertEquals(v, { status: 'rejected', reason: 'too_short' });
});

Deno.test('course trop brève → rejected too_brief', () => {
  // 1,2 km en 5 min : distance OK, durée < RUN_MIN_DURATION_S (allure 250 s/km OK).
  const { segments } = filterPoints(line({ distanceM: 1200, durationS: 300, n: 60 }));
  const v = validateRun(computeStats(segments));
  assertEquals(v, { status: 'rejected', reason: 'too_brief' });
});

Deno.test('allure vélo (moyenne < 2:50/km) → rejected pace_too_fast', () => {
  // 3 km en 400 s = 133 s/km — trop rapide pour de la course (mais < 25 km/h avec
  // 100 points espacés de ~30 m/4 s = 27 km/h > 25... on prend 4 km en 600 s = 150 s/km
  // = 24 km/h : sous le seuil de vitesse instantanée, au-dessus de l'anti-vélo).
  const { segments } = filterPoints(line({ distanceM: 4000, durationS: 600, n: 200 }));
  const v = validateRun(computeStats(segments));
  assertEquals(v, { status: 'rejected', reason: 'pace_too_fast' });
});

Deno.test('course trop lente (> 10:00/km) → rejected pace_too_slow', () => {
  // 1,5 km en 1 000 s = 666 s/km.
  const { segments } = filterPoints(line({ distanceM: 1500, durationS: 1000, n: 100 }));
  const v = validateRun(computeStats(segments));
  assertEquals(v, { status: 'rejected', reason: 'pace_too_slow' });
});

Deno.test('course valide 5 km/30 min → valid', () => {
  const { segments } = filterPoints(line({ distanceM: 5000, durationS: 1800, n: 300 }));
  assertEquals(validateRun(computeStats(segments)), { status: 'valid' });
});

Deno.test('tous les points filtrés → rejected no_valid_points', () => {
  const points = line({ distanceM: 2000, durationS: 800, n: 50, acc: 80 }); // acc > 25 m partout
  const filtered = filterPoints(points);
  assertEquals(filtered.segments.length, 0);
  assertEquals(filtered.keptPoints, 0);
  assertEquals(validateRun(computeStats(filtered.segments)), {
    status: 'rejected',
    reason: 'no_valid_points',
  });
});

// ─── filterPoints (§3.2) ─────────────────────────────────────────────────────

Deno.test('points imprécis (acc > 25 m) filtrés, le reste conservé', () => {
  const good = line({ distanceM: 2000, durationS: 800, n: 40 });
  // 3 points très imprécis intercalés (mêmes positions, acc énorme).
  const bad: RunPoint[] = [
    { ...good[10], t: good[10].t + 1, acc: 60 },
    { ...good[20], t: good[20].t + 1, acc: 26 },
    { ...good[30], t: good[30].t + 1, acc: 999 },
  ];
  const filtered = filterPoints([...good, ...bad]);
  assertEquals(filtered.totalPoints, 43);
  assertEquals(filtered.keptPoints, 40);
  assertEquals(filtered.segments.length, 1);
});

Deno.test('saut > 100 m entre points consécutifs → segment coupé en deux', () => {
  const a = line({ distanceM: 1000, durationS: 400, n: 20 });
  // Reprise 500 m plus au nord, 10 min plus tard (trou GPS type tunnel).
  const b = line({
    distanceM: 1000,
    durationS: 400,
    n: 20,
    startT: 1_000_000,
    startLat: LAT0 + 1500 / M_PER_DEG_LAT,
  });
  const filtered = filterPoints([...a, ...b]);
  assertEquals(filtered.segments.length, 2);
  assertEquals(filtered.keptPoints, 40);
  // La durée ne compte pas le trou : 2 × 400 s, pas 1 400 s.
  const stats = computeStats(filtered.segments);
  assert(Math.abs(stats.durationS - 800) < 1, `durée ${stats.durationS}`);
  assert(Math.abs(stats.distanceM - 2000) < 5, `distance ${stats.distanceM}`);
});

Deno.test('vitesse instantanée > 25 km/h → point rejeté, segment continu', () => {
  const pts = line({ distanceM: 1000, durationS: 400, n: 21 }); // 50 m / 20 s entre points
  // Spike : point téléporté 90 m au nord du précédent, 2 s après (162 km/h,
  // sous le seuil de saut de 100 m → rejet vitesse, pas de coupe).
  const spike: RunPoint = {
    lat: pts[10].lat + 90 / M_PER_DEG_LAT,
    lng: LNG0,
    t: pts[10].t + 2000,
  };
  const filtered = filterPoints([...pts.slice(0, 11), spike, ...pts.slice(11)]);
  assertEquals(filtered.segments.length, 1);
  assertEquals(filtered.keptPoints, 21); // le spike est le seul rejeté
});

// ─── claimableSegments (AMENDEMENT-02 §4) ────────────────────────────────────

Deno.test('segment à allure hors bornes exclu → statut partial', () => {
  // Segment 1 : couru (5 min/km). Segment 2 (après saut) : rampé (900 s/km > 12:00).
  const run = line({ distanceM: 2000, durationS: 600, n: 40 });
  const crawl = line({
    distanceM: 500,
    durationS: 450,
    n: 10,
    startT: 2_000_000,
    startLat: LAT0 + 3000 / M_PER_DEG_LAT,
  });
  const { segments } = filterPoints([...run, ...crawl]);
  assertEquals(segments.length, 2);
  const result = claimableSegments(segments);
  assertEquals(result.status, 'partial');
  assertEquals(result.claimable.length, 1);
  assertEquals(result.excluded.length, 1);
  assertEquals(result.claimable[0], segments[0]);
});

Deno.test('aucune exclusion → statut valid', () => {
  const { segments } = filterPoints(line({ distanceM: 5000, durationS: 1800, n: 300 }));
  const result = claimableSegments(segments);
  assertEquals(result.status, 'valid');
  assertEquals(result.excluded.length, 0);
  assertEquals(result.claimable.length, segments.length);
});

// ─── stepCoherence (GRYD Verify MVP §11 règle 3) ─────────────────────────────

Deno.test('voiture simulée : distance significative + pas quasi nuls → flagged', () => {
  const trust = stepCoherence(5000, 30); // 5 km, 30 pas
  assert(trust < MOTION_TRUST_FLAGGED_BELOW, `motionTrust ${trust} devrait être bas`);
});

Deno.test('vraie course : cadence plausible → trust plein', () => {
  assertEquals(stepCoherence(5000, 6500), 100); // ~1,3 pas/m
});

Deno.test('sans stepCount → signal neutre (jamais pénalisant)', () => {
  assertEquals(stepCoherence(5000, undefined), MOTION_TRUST_NEUTRAL);
  assert(MOTION_TRUST_NEUTRAL >= MOTION_TRUST_FLAGGED_BELOW);
});

Deno.test('distance non significative → neutre même sans pas', () => {
  assertEquals(stepCoherence(500, 0), MOTION_TRUST_NEUTRAL);
});
