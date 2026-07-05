/**
 * Tests AMENDEMENT-17 §CHANTIER 2 — Boucle crew collaborative (engine/boundary.ts).
 * Purs : detectOpenBoundary + canComplete + contributionSplit, aucune I/O.
 * « Ouvre une frontière. Ton crew peut la fermer. »
 *
 * Géométrie : repère local plan centré Paris (mêmes conversions que loop_test.ts),
 * frontières carrées dont il manque tout ou partie du 4ᵉ côté. Réutilise les
 * règles boucle (LOOP_MIN_PERIMETER_M, loopShapeVerdict) via detectOpenBoundary.
 */
import { assert, assertEquals } from 'jsr:@std/assert@^1';
import {
  FINISHER_MIN_SEGMENT_M,
  LOOP_CLOSE_TOLERANCE_M,
  PARTIAL_JOIN_TOLERANCE_M,
} from '../_shared/game-rules.ts';
import {
  canComplete,
  contributionSplit,
  detectOpenBoundary,
} from '../_shared/engine/boundary.ts';
import { detectLoop, type LatLngPoint } from '../_shared/engine/hexing.ts';

const LAT0 = 48.8566;
const LNG0 = 2.3522;
const M_PER_DEG_LAT = 111_195;
const M_PER_DEG_LNG = M_PER_DEG_LAT * Math.cos((LAT0 * Math.PI) / 180);

/** Point à (xM est, yM nord) du coin d'origine. */
function pt(xM: number, yM: number): LatLngPoint {
  return { lat: LAT0 + yM / M_PER_DEG_LAT, lng: LNG0 + xM / M_PER_DEG_LNG };
}

/**
 * Frontière carrée « en U » : `sides` côtés complets d'un carré de côté `sideM`,
 * un point tous les `stepM`. 3 côtés (E, N, O) → il manque le 4ᵉ (vertical) ;
 * start = (0,0), end = (0,sideM), donc missingM ≈ sideM.
 */
function uBoundary(sideM: number, stepM: number): LatLngPoint[] {
  const trace: LatLngPoint[] = [];
  for (let d = 0; d <= sideM; d += stepM) trace.push(pt(d, 0)); // E : (0,0)→(side,0)
  for (let d = stepM; d <= sideM; d += stepM) trace.push(pt(sideM, d)); // N : →(side,side)
  for (let d = stepM; d <= sideM; d += stepM) trace.push(pt(sideM - d, sideM)); // O : →(0,side)
  return trace;
}

/** Carré tracé à 3,5 côtés : 3 côtés + moitié du 4ᵉ → petit trou (missingM ≈ sideM − partialM). */
function almostClosed(sideM: number, stepM: number, partialM: number): LatLngPoint[] {
  const trace = uBoundary(sideM, stepM); // finit à (0, side)
  for (let d = stepM; d <= partialM; d += stepM) trace.push(pt(0, sideM - d)); // descend le 4ᵉ côté
  return trace;
}

/** Segment vertical droit de (0, fromY) à (0, toY), un point tous les `stepM`. */
function verticalRun(fromY: number, toY: number, stepM: number): LatLngPoint[] {
  const run: LatLngPoint[] = [];
  const dir = fromY > toY ? -stepM : stepM;
  for (let y = fromY; dir < 0 ? y >= toY : y <= toY; y += dir) run.push(pt(0, y));
  return run;
}

// ─── 1. Détection d'ouverture ────────────────────────────────────────────────

Deno.test('frontière fermable (U 500 m) → ouverte, missingM ≈ côté manquant', () => {
  const trace = uBoundary(500, 25); // 3 côtés : traced 1500 m, missing 500 m
  assertEquals(detectLoop(trace), null, 'un U n’est pas une boucle fermée');
  const b = detectOpenBoundary(trace);
  assert(b !== null, 'frontière fermable attendue');
  assert(Math.abs(b!.missingM - 500) < 5, `missingM ≈ 500, obtenu ${b!.missingM}`);
  assert(Math.abs(b!.tracedLengthM - 1500) < 10, `traced ≈ 1500, obtenu ${b!.tracedLengthM}`);
  // Les deux bouts ouverts = départ (0,0) et arrivée (0,500).
  assertEquals(b!.openEnds.length, 2);
  assertEquals(b!.missingSegment, b!.openEnds);
  assert(b!.zoneEstimateKm2 > 0, 'aire estimée > 0');
});

Deno.test('petit trou (3,5 côtés) → frontière ouverte, missingM ≈ 120 m', () => {
  const trace = almostClosed(300, 20, 180); // traced 1080, missing 120
  const b = detectOpenBoundary(trace);
  assert(b !== null, 'frontière fermable attendue');
  assert(Math.abs(b!.missingM - 120) < 5, `missingM ≈ 120, obtenu ${b!.missingM}`);
});

Deno.test('run court non fermable → null', () => {
  // Ligne droite 600 m : missingM (600) > tracedLengthM (600 ? non, = 600) et
  // surtout aire nulle + périmètre complété insuffisant → pas de frontière.
  const line: LatLngPoint[] = [];
  for (let y = 0; y <= 600; y += 20) line.push(pt(0, y));
  assertEquals(detectOpenBoundary(line), null, 'une ligne droite n’ouvre pas de frontière');
});

Deno.test('boucle DÉJÀ fermée → null (c’est une zone, pas une frontière)', () => {
  // Carré quasi complet (gap 10 m < tolérance) → detectLoop la ferme → rien à ouvrir.
  const trace = almostClosed(300, 20, 290); // manque ~10 m, sous LOOP_CLOSE_TOLERANCE_M
  const start = trace[0]!;
  const end = trace[trace.length - 1]!;
  // sanity : le trou résiduel est bien sous la tolérance de fermeture.
  const missing = Math.hypot(
    (end.lat - start.lat) * M_PER_DEG_LAT,
    (end.lng - start.lng) * M_PER_DEG_LNG,
  );
  assert(missing <= LOOP_CLOSE_TOLERANCE_M, `trou ${missing.toFixed(0)} m sous tolérance`);
  assertEquals(detectOpenBoundary(trace), null, 'une boucle déjà fermée n’est pas une frontière');
});

Deno.test('boucle trop petite (périmètre complété < min) → null', () => {
  // U de côté 150 : traced 450 m, missing 150 m → périmètre complété 600 m <
  // LOOP_MIN_PERIMETER_M (1000). La règle boucle réutilisée refuse — pas une
  // frontière (anti micro-frontière farmée sur place).
  const trace = uBoundary(150, 15);
  assertEquals(detectOpenBoundary(trace), null, 'périmètre complété trop court → pas d’ouverture');
});

Deno.test('forme étroite (couloir plié) → null (loopShapeVerdict réutilisé)', () => {
  // Aller-retour sur deux « rues » parallèles très proches (10 m), longues (700 m
  // chaque sens) : périmètre suffisant mais largeur 2A/P ≪ LOOP_MIN_WIDTH_M →
  // une frontière-couloir ne devient jamais une zone.
  const trace: LatLngPoint[] = [];
  for (let y = 0; y <= 700; y += 20) trace.push(pt(0, y)); // montée rue ouest
  for (let y = 700; y >= 0; y -= 20) trace.push(pt(10, y)); // descente rue est (10 m à côté)
  assertEquals(detectOpenBoundary(trace), null, 'forme trop étroite → pas d’ouverture');
});

// ─── 2. Complétion par un membre du crew ─────────────────────────────────────

/** Frontière U 500 réifiée pour canComplete (openEnds + missingM + totalLengthM). */
function u500Boundary() {
  const b = detectOpenBoundary(uBoundary(500, 25))!;
  return { openEnds: b.openEnds, missingM: b.missingM, totalLengthM: b.tracedLengthM };
}

Deno.test('complétion propre : finisher couvre le côté manquant, même crew → completes', () => {
  const boundary = u500Boundary();
  const finisher = verticalRun(500, 0, 25); // (0,500)→(0,0) : 500 m, rejoint les 2 bouts
  const v = canComplete(boundary, finisher, true);
  assert(v.completes, `complétion attendue, reason=${v.reason}`);
  assert(v.finisherLengthM >= FINISHER_MIN_SEGMENT_M, 'finisher ≥ segment min');
});

Deno.test('rival (crew différent) → pas de complétion (reason rival)', () => {
  const boundary = u500Boundary();
  const finisher = verticalRun(500, 0, 25);
  const v = canComplete(boundary, finisher, false);
  assertEquals(v.completes, false);
  assertEquals(v.reason, 'rival');
});

Deno.test('finisher trop court → rejeté (reason finisher_too_short)', () => {
  // Frontière à petit trou : missing 120 m. Le finisher couvre 120 m → < 400 m
  // ET part 120/(1080+120)=0,10 < 0,15 → refus.
  const b = detectOpenBoundary(almostClosed(300, 20, 180))!;
  const boundary = { openEnds: b.openEnds, missingM: b.missingM, totalLengthM: b.tracedLengthM };
  const finisher = verticalRun(120, 0, 15); // couvre les 120 m manquants
  const v = canComplete(boundary, finisher, true);
  assertEquals(v.completes, false);
  assertEquals(v.reason, 'finisher_too_short');
  assert(v.finisherLengthM > 0 && v.finisherLengthM <= b.missingM);
});

Deno.test('connexion hors tolérance (un seul bout rejoint) → rejeté (not_connected)', () => {
  const boundary = u500Boundary();
  // Finisher ne descend que de (0,500) à (0,300) : rejoint endB (0,500) mais
  // endA (0,0) reste à 300 m > PARTIAL_JOIN_TOLERANCE_M.
  const finisher = verticalRun(500, 300, 25);
  const v = canComplete(boundary, finisher, true);
  assertEquals(v.completes, false);
  assertEquals(v.reason, 'not_connected');
  // sanity : le bout non rejoint est bien hors tolérance.
  assert(300 > PARTIAL_JOIN_TOLERANCE_M);
});

// ─── 3. Répartition des contributions ────────────────────────────────────────

Deno.test('split au prorata : 79/21 exact, somme = 1', () => {
  const shares = contributionSplit([
    { userId: 'benjamin', validatedLengthM: 1580 },
    { userId: 'lena', validatedLengthM: 420 },
  ]);
  const byUser = new Map(shares.map((s) => [s.userId, s.share]));
  assertEquals(Math.round(byUser.get('benjamin')! * 100), 79);
  assertEquals(Math.round(byUser.get('lena')! * 100), 21);
  const sum = shares.reduce((s, c) => s + c.share, 0);
  assert(Math.abs(sum - 1) < 1e-12, `somme des parts = 1, obtenu ${sum}`);
});

Deno.test('split : segments multiples d’un même membre agrégés (une part/membre)', () => {
  const shares = contributionSplit([
    { userId: 'a', validatedLengthM: 300 },
    { userId: 'b', validatedLengthM: 400 },
    { userId: 'a', validatedLengthM: 300 }, // a total 600
  ]);
  assertEquals(shares.length, 2, 'un membre = une part');
  const a = shares.find((s) => s.userId === 'a')!;
  assertEquals(Math.round(a.share * 100), 60); // 600 / 1000
  assert(Math.abs(shares.reduce((s, c) => s + c.share, 0) - 1) < 1e-12);
});

Deno.test('split : longueurs nulles (dégénéré) → parts égales, somme = 1', () => {
  const shares = contributionSplit([
    { userId: 'a', validatedLengthM: 0 },
    { userId: 'b', validatedLengthM: 0 },
  ]);
  assertEquals(shares.map((s) => s.share), [0.5, 0.5]);
});

Deno.test('split : liste vide → []', () => {
  assertEquals(contributionSplit([]), []);
});
