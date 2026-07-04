/**
 * Tests AMENDEMENT-12 §B — « La boucle fait la zone » (engine/hexing.ts).
 * Purs : detectClosedLoop + enclosedCells, h3-js déterministe, aucune I/O.
 * « Trace un trait, tu prends la rue. Ferme la boucle, tu prends la zone. »
 */
import { assert, assertEquals } from 'jsr:@std/assert@^1';
import { cellToLatLng, getResolution } from 'npm:h3-js@^4.1';
import {
  H3_RESOLUTION,
  LOOP_CLOSE_TOLERANCE_M,
  LOOP_MIN_PERIMETER_M,
} from '../_shared/game-rules.ts';
import {
  detectClosedLoop,
  enclosedCells,
  hexesForSegments,
  loopTracePoints,
} from '../_shared/engine/hexing.ts';
import { haversineM } from '../_shared/engine/validation.ts';
import type { RunPoint } from '../_shared/types.ts';

const LAT0 = 48.8566;
const LNG0 = 2.3522;
const M_PER_DEG_LAT = 111_195;
const M_PER_DEG_LNG = M_PER_DEG_LAT * Math.cos((LAT0 * Math.PI) / 180);

/** Point à (xM est, yM nord) du coin d'origine, timestampé. */
function pt(xM: number, yM: number, i: number): RunPoint {
  return { lat: LAT0 + yM / M_PER_DEG_LAT, lng: LNG0 + xM / M_PER_DEG_LNG, t: i * 5_000 };
}

/**
 * Boucle carrée de côté `sideM`, un point tous les ~`stepM` le long du
 * périmètre, en s'arrêtant à `gapM` (à vol d'oiseau le long du 4ᵉ côté) avant
 * le point de départ. gapM = 0 → boucle exactement refermée.
 */
function squareLoop(sideM: number, stepM: number, gapM = 0): RunPoint[] {
  const walked = 4 * sideM - gapM;
  const onPerimeter = (d: number): [number, number] => {
    if (d <= sideM) return [d, 0];
    if (d <= 2 * sideM) return [sideM, d - sideM];
    if (d <= 3 * sideM) return [sideM - (d - 2 * sideM), sideM];
    return [0, sideM - (d - 3 * sideM)];
  };
  const points: RunPoint[] = [];
  for (let d = 0, i = 0; d < walked; d += stepM, i++) points.push(pt(...onPerimeter(d), i));
  points.push(pt(...onPerimeter(walked), points.length)); // dernier point exact
  return points;
}

/** Aller-retour rectiligne plein nord : `halfM` à l'aller, retour par les mêmes points. */
function outAndBack(halfM: number, stepM: number): RunPoint[] {
  const out: RunPoint[] = [];
  for (let y = 0; y <= halfM; y += stepM) out.push(pt(0, y, out.length));
  const back = [...out].slice(0, -1).reverse()
    .map((p, i) => ({ ...p, t: (out.length + i) * 5_000 }));
  return [...out, ...back];
}

/** Distance minimale du centre d'une cellule aux points de la trace (miroir du tri). */
function cellToTraceM(cell: string, points: readonly RunPoint[]): number {
  const [lat, lng] = cellToLatLng(cell);
  let best = Infinity;
  for (const p of points) best = Math.min(best, haversineM({ lat, lng }, p));
  return best;
}

Deno.test('boucle carrée 1,2 km → fermée, intérieur non vide en res 10', () => {
  const loop = squareLoop(300, 20); // périmètre 1 200 m ≥ LOOP_MIN_PERIMETER_M
  assert(detectClosedLoop(loop), 'boucle 1,2 km refermée : attendue fermée');

  const corridor = hexesForSegments([loop]);
  const interior = enclosedCells(loop, corridor);
  assert(interior.length >= 1, `intérieur attendu non vide, obtenu ${interior.length}`);
  for (const cell of interior) assertEquals(getResolution(cell), H3_RESOLUTION);
});

Deno.test('aller-retour → pas de boucle (polygone dégénéré, couloir seul)', () => {
  const trace = outAndBack(800, 40); // 1 600 m ≥ périmètre min, départ = arrivée
  assertEquals(haversineM(trace[0]!, trace[trace.length - 1]!) <= LOOP_CLOSE_TOLERANCE_M, true);
  assertEquals(detectClosedLoop(trace), false, 'un aller-retour n’est pas une boucle');
});

Deno.test('boucle trop courte → pas de boucle (LOOP_MIN_PERIMETER_M)', () => {
  // 300 m (côté 75) : sous le périmètre minimal → couloir seulement.
  assertEquals(detectClosedLoop(squareLoop(75, 10)), false);
  // 520 m (côté 130) : aire > 1 zone res 10 mais périmètre < minimal → c'est
  // bien le garde-fou périmètre qui refuse, pas la dégénérescence.
  assert(4 * 130 < LOOP_MIN_PERIMETER_M);
  assertEquals(detectClosedLoop(squareLoop(130, 10)), false);
});

Deno.test('départ/arrivée à ~90 m → boucle fermée ; à ~150 m → ouverte', () => {
  const closed = squareLoop(300, 20, 90);
  const gapM = haversineM(closed[0]!, closed[closed.length - 1]!);
  assert(gapM > 80 && gapM <= LOOP_CLOSE_TOLERANCE_M, `écart attendu ~90 m, obtenu ${gapM}`);
  assert(detectClosedLoop(closed), 'fermeture par tolérance : ≤ 100 m doit fermer');

  const open = squareLoop(300, 20, 150); // 150 m > tolérance → boucle ouverte
  assertEquals(detectClosedLoop(open), false);
});

Deno.test('enclosedCells : aucune cellule du couloir dupliquée', () => {
  const loop = squareLoop(400, 20);
  const corridor = hexesForSegments([loop]);
  const interior = enclosedCells(loop, corridor);
  assert(interior.length >= 1);

  const corridorSet = new Set(corridor);
  for (const cell of interior) {
    assert(!corridorSet.has(cell), `cellule couloir dupliquée dans l’intérieur : ${cell}`);
  }
  assertEquals(
    new Set([...corridor, ...interior]).size,
    corridor.length + interior.length,
    'l’union couloir + intérieur doit être sans doublon',
  );
});

Deno.test('enclosedCells : intérieur trié par distance croissante au tracé', () => {
  const loop = squareLoop(500, 25);
  const interior = enclosedCells(loop, hexesForSegments([loop]));
  assert(interior.length >= 2, `attendu plusieurs cellules intérieures, obtenu ${interior.length}`);
  const distances = interior.map((cell) => cellToTraceM(cell, loop));
  for (let i = 1; i < distances.length; i++) {
    assert(
      distances[i]! >= distances[i - 1]!,
      `tri par distance croissante violé à l’index ${i} : ${distances[i - 1]} puis ${distances[i]}`,
    );
  }
});

Deno.test('polygone dégénéré → fallback couloir seul, jamais de throw', () => {
  // < 3 points → pas de polygone.
  assertEquals(enclosedCells([], []), []);
  assertEquals(enclosedCells([pt(0, 0, 0), pt(100, 0, 1)], []), []);
  // Points tous identiques (aire nulle) → aucun intérieur, aucun crash.
  const still = [pt(0, 0, 0), pt(0, 0, 1), pt(0, 0, 2), pt(0, 0, 3)];
  assertEquals(enclosedCells(still, []), []);
  // Aller-retour colinéaire (polygone plat) → rien au-delà du couloir.
  const flat = outAndBack(600, 30);
  assertEquals(enclosedCells(flat, hexesForSegments([flat])), []);
  // Coordonnées invalides (NaN/Infinity) : h3 peut jeter → fallback [] sans crash.
  const broken = [
    { lat: Number.NaN, lng: LNG0, t: 0 },
    { lat: LAT0, lng: Number.POSITIVE_INFINITY, t: 5_000 },
    { lat: LAT0, lng: LNG0, t: 10_000 },
  ];
  assert(Array.isArray(enclosedCells(broken, [])), 'jamais de throw sur trace invalide');
});

Deno.test('run mixte course/voiture (partial) : segments exclus → pas de boucle', () => {
  // Boucle carrée de 1,6 km dont le 3ᵉ quart est parcouru en VOITURE : ce
  // tronçon est exclu du claim (§3.2) → la trace claimable = 2 segments
  // (avant/après le tronçon véhicule). Aplatie, elle refermerait le polygone
  // en ligne droite par-dessus l'aire parcourue en voiture — l'intérieur
  // serait capturé sans avoir couru le périmètre. loopTracePoints refuse.
  const loop = squareLoop(400, 20); // périmètre 1 600 m ≥ LOOP_MIN_PERIMETER_M
  const third = Math.floor(loop.length / 2);
  const cut = Math.floor((3 * loop.length) / 4);
  const ranBefore = loop.slice(0, third); // couru
  const ranAfter = loop.slice(cut); // couru (revient au départ)
  const claimable = [ranBefore, ranAfter];

  // La faille qu'on ferme : la trace APLATIE, elle, fermerait bien une boucle.
  assert(
    detectClosedLoop(claimable.flat()),
    'précondition : la trace aplatie fermerait une boucle (la faille visée)',
  );

  // Le garde-fou : trace non contiguë (2 segments claimables) → null → couloir
  // seul, aucune cellule intérieure. Une boucle 100 % voiture reste rejetée en
  // amont (§3.2) ; ici c'est le run MIXTE accepté `partial` qui est borné.
  assertEquals(loopTracePoints(claimable), null);
  const trace = loopTracePoints(claimable);
  const loopClosed = trace !== null && detectClosedLoop(trace); // miroir ingest_run
  assertEquals(loopClosed, false, 'run partial non contigu : jamais d’intérieur');
});

Deno.test('loopTracePoints : un seul segment claimable → trace contiguë acceptée', () => {
  const loop = squareLoop(300, 20);
  const trace = loopTracePoints([loop]);
  assert(trace !== null, 'segment unique : la trace est contiguë');
  assertEquals(trace, loop);
  assert(detectClosedLoop(trace), 'la boucle contiguë reste détectée (zéro régression)');
  // Aucun segment (run vide) → pas de polygone non plus.
  assertEquals(loopTracePoints([]), null);
});

Deno.test('detectClosedLoop : garde-fous (< 3 points, trace ouverte)', () => {
  assertEquals(detectClosedLoop([]), false);
  assertEquals(detectClosedLoop([pt(0, 0, 0)]), false);
  assertEquals(detectClosedLoop([pt(0, 0, 0), pt(0, 1_500, 1)]), false); // 2 points
  // Ligne droite de 2 km : arrivée à 2 km du départ → ouverte.
  const line: RunPoint[] = [];
  for (let y = 0; y <= 2_000; y += 100) line.push(pt(0, y, line.length));
  assertEquals(detectClosedLoop(line), false);
});
