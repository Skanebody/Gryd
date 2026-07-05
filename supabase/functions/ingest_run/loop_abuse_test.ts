/**
 * Tests AMENDEMENT-16 §2 — durcissement boucle→zone (engine/hexing.ts).
 * Purs, aucune I/O :
 *  - AUTO-INTERSECTION (2ᵉ mode de fermeture MVP, doc §4.2) : trace en P
 *    (queue + boucle), 8 (= la plus grande boucle), faux-croisements
 *    (points adjacents, frôlement, aller-retour colinéaire) ;
 *  - anti-abus doc §6 : plafond d'aire par distance courue
 *    (LOOP_MAX_AREA_BY_DISTANCE_KM2, interpolation linéaire + extrapolation
 *    bornée, troncature par distance croissante au tracé → capReached) ;
 *  - forme trop fine : compacité 4πA/P² + largeur 2A/P → 'narrow'.
 */
import { assert, assertAlmostEquals, assertEquals } from 'jsr:@std/assert@^1';
import { cellToLatLng, getHexagonAreaAvg, getResolution, UNITS } from 'npm:h3-js@^4.1';
import {
  H3_RESOLUTION,
  LOOP_CLOSE_TOLERANCE_M,
  LOOP_MAX_AREA_BY_DISTANCE_KM2,
  LOOP_MAX_AREA_CAP_KM2,
  LOOP_MIN_COMPACTNESS,
  LOOP_MIN_WIDTH_M,
} from '../_shared/game-rules.ts';
import {
  detectClosedLoop,
  detectLoop,
  enclosedCells,
  hexesForSegments,
  loopInteriorCellCap,
  loopMaxAreaM2,
  loopShapeVerdict,
} from '../_shared/engine/hexing.ts';
import { haversineM } from '../_shared/engine/validation.ts';
import type { RunPoint } from '../_shared/types.ts';

const LAT0 = 48.8566;
const LNG0 = 2.3522;
const M_PER_DEG_LAT = 111_195;
const M_PER_DEG_LNG = M_PER_DEG_LAT * Math.cos((LAT0 * Math.PI) / 180);
const KM2 = 1_000_000; // m² par km²

/** Point à (xM est, yM nord) du coin d'origine, timestampé. */
function pt(xM: number, yM: number, i: number): RunPoint {
  return { lat: LAT0 + yM / M_PER_DEG_LAT, lng: LNG0 + xM / M_PER_DEG_LNG, t: i * 5_000 };
}

/**
 * Polyligne échantillonnée tous les ~stepM le long des coins (mètres est/nord).
 * stepM par défaut 27 : n'atterrit pas pile sur les points de croisement des
 * géométries de test (un croisement EXACT sur un sommet est un contact, pas un
 * croisement strict — le GPS réel ne produit jamais d'exactitude pareille).
 */
function polyline(corners: readonly (readonly [number, number])[], stepM = 27): RunPoint[] {
  const flat: [number, number][] = [];
  for (let c = 0; c + 1 < corners.length; c++) {
    const [x0, y0] = corners[c]!;
    const [x1, y1] = corners[c + 1]!;
    const steps = Math.max(1, Math.floor(Math.hypot(x1 - x0, y1 - y0) / stepM));
    for (let k = c === 0 ? 0 : 1; k <= steps; k++) {
      flat.push([x0 + ((x1 - x0) * k) / steps, y0 + ((y1 - y0) * k) / steps]);
    }
  }
  return flat.map(([x, y], i) => pt(x, y, i));
}

/** Distance minimale du centre d'une cellule aux points de la trace (miroir du tri). */
function cellToTraceM(cell: string, points: readonly RunPoint[]): number {
  const [lat, lng] = cellToLatLng(cell);
  let best = Infinity;
  for (const p of points) best = Math.min(best, haversineM({ lat, lng }, p));
  return best;
}

// ─── Auto-intersection : P, 8, faux-croisements ──────────────────────────────

Deno.test('trace en P (queue + boucle) → auto-intersection ferme la partie bouclée', () => {
  // Queue de 400 m plein nord, puis boucle carrée ~300 m de côté dont le
  // dernier tronçon RECROISE la queue en (0,0) et continue 60 m plus loin.
  const trace = polyline([[0, -400], [0, 300], [300, 300], [300, 0], [-60, 0]]);
  // L'arrivée est loin du départ : la tolérance (80 m) ne peut PAS fermer.
  assert(haversineM(trace[0]!, trace[trace.length - 1]!) > LOOP_CLOSE_TOLERANCE_M);
  assertEquals(detectClosedLoop(trace), false, 'pas de fermeture par tolérance');

  const loop = detectLoop(trace);
  assert(loop !== null, 'le recroisement doit fermer la boucle');
  assertEquals(loop.closure, 'self_intersection');
  // La boucle = la partie fermée (~300×300 m), PAS la queue.
  assertAlmostEquals(loop.areaM2, 90_000, 90_000 * 0.15);
  assertAlmostEquals(loop.perimeterM, 1_200, 1_200 * 0.1);
  assertEquals(loopShapeVerdict(loop).ok, true);

  // L'intérieur de la partie fermée est capturable, sans doublon couloir.
  const corridor = hexesForSegments([trace]);
  const interior = enclosedCells(loop.polygon, corridor);
  assert(interior.length >= 1, `intérieur attendu non vide, obtenu ${interior.length}`);
  const corridorSet = new Set(corridor);
  for (const cell of interior) {
    assertEquals(getResolution(cell), H3_RESOLUTION);
    assert(!corridorSet.has(cell), `cellule couloir dupliquée : ${cell}`);
  }
});

Deno.test('8 (deux boucles par auto-intersection) → LA PLUS GRANDE boucle gagne (MVP)', () => {
  // Lobe A ~400×250 m (100 000 m²) et lobe B ~250×300 m (75 000 m²), reliés
  // par un long trait horizontal recroisé deux fois. Arrivée loin du départ.
  const trace = polyline([
    [0, -300], [0, 300], [400, 300], [400, 50], // lobe A (fermé au croisement (0,50))
    [-300, 50], [-300, -250], [-50, -250], [-50, 100], // lobe B (fermé au croisement (-50,50))
  ]);
  assert(haversineM(trace[0]!, trace[trace.length - 1]!) > LOOP_CLOSE_TOLERANCE_M);

  const loop = detectLoop(trace);
  assert(loop !== null, 'un 8 doit fermer une boucle par auto-intersection');
  assertEquals(loop.closure, 'self_intersection');
  // La plus grande boucle (lobe A ~100 000 m²) — le lobe B (~75 000 m²) perd.
  assertAlmostEquals(loop.areaM2, 100_000, 12_000);
  assert(loop.areaM2 > 85_000, `le grand lobe doit gagner, aire obtenue ${loop.areaM2}`);
});

Deno.test('faux-croisements : adjacents, frôlement, aller-retour → jamais de boucle', () => {
  // 1. Épingle à cheveux : deux longues rues à 3 m, segments ADJACENTS au
  //    demi-tour (contact au sommet partagé ≠ croisement) ; l'arrivée revient
  //    à 3 m du départ mais l'aire (~1 800 m²) est dégénérée (< 1 zone).
  const hairpin = polyline([[0, 0], [0, 1_200], [3, 0]]);
  assertEquals(detectLoop(hairpin), null, 'épingle 3 m : couloir seul');

  // 2. Frôlement : le tracé passe à 3 m d'un segment précédent SANS le croiser.
  const nearMiss = polyline([[0, 0], [0, 600], [200, 600], [200, 3], [600, 3]]);
  assertEquals(detectLoop(nearMiss), null, 'frôlement sans croisement : pas de boucle');

  // 3. Aller-retour strictement colinéaire (points superposés) : les segments
  //    sont parallèles (denom = 0), jamais un croisement strict.
  const out: RunPoint[] = [];
  for (let y = 0; y <= 800; y += 40) out.push(pt(0, y, out.length));
  const back = [...out].slice(0, -1).reverse()
    .map((p, i) => ({ ...p, t: (out.length + i) * 5_000 }));
  assertEquals(detectLoop([...out, ...back]), null, 'aller-retour : couloir seul');
});

// ─── Anti-abus : plafond d'aire par distance courue (boucle trop grande) ────

Deno.test('loopMaxAreaM2 : paliers exacts, interpolation linéaire, extrapolation bornée', () => {
  const [[d0, a0], [d1, a1], [d2, a2]] = LOOP_MAX_AREA_BY_DISTANCE_KM2;
  // Paliers exacts : 3 → 0,25 km² ; 5 → 0,8 ; 10 → 1,8.
  assertAlmostEquals(loopMaxAreaM2(d0 * 1_000), a0 * KM2, 1e-6);
  assertAlmostEquals(loopMaxAreaM2(d1 * 1_000), a1 * KM2, 1e-6);
  assertAlmostEquals(loopMaxAreaM2(d2 * 1_000), a2 * KM2, 1e-6);
  // Interpolation linéaire : 4 km → 0,525 km² ; 7,5 km → 1,3 km².
  assertAlmostEquals(loopMaxAreaM2(4_000), ((a0 + a1) / 2) * KM2, 1e-6);
  assertAlmostEquals(loopMaxAreaM2(7_500), ((a1 + a2) / 2) * KM2, 1e-6);
  // Extrapolation BORNÉE au ratio du palier le plus proche, PUIS capée dur à
  // LOOP_MAX_AREA_CAP_KM2 (3 km², AMENDEMENT-23 §D / doc §9) :
  // 2 km → 2 × (0,25/3) ; 12 km → 12 × 0,18 = 2,16 km² (< cap) ;
  // 20 km → 20 × 0,18 = 3,6 km² MAIS capé à 3,0 km².
  assertAlmostEquals(loopMaxAreaM2(2_000), 2 * (a0 / d0) * KM2, 1e-6);
  assertAlmostEquals(loopMaxAreaM2(12_000), 12 * (a2 / d2) * KM2, 1e-6);
  assertAlmostEquals(loopMaxAreaM2(20_000), LOOP_MAX_AREA_CAP_KM2 * KM2, 1e-6); // capé
  // Cap dur : au-delà de ~16,7 km, l'aire max reste 3 km² (jamais plus).
  assertEquals(loopMaxAreaM2(25_000), LOOP_MAX_AREA_CAP_KM2 * KM2);
  assertEquals(loopMaxAreaM2(100_000), LOOP_MAX_AREA_CAP_KM2 * KM2);
  assertEquals(LOOP_MAX_AREA_CAP_KM2, 3);
  assertEquals(loopMaxAreaM2(0), 0);
  // Monotone croissante (jamais plus généreux en courant moins).
  let prev = 0;
  for (const dM of [1_000, 2_000, 3_000, 4_000, 5_000, 7_500, 10_000, 15_000]) {
    const v = loopMaxAreaM2(dM);
    assert(v >= prev, `loopMaxAreaM2 doit être monotone (${dM} m)`);
    prev = v;
  }
});

Deno.test('boucle trop grande : intérieur tronqué au plafond, les plus proches du tracé gagnent', () => {
  // Carré de 750 m de côté = périmètre couru 3 000 m → plafond 0,25 km².
  const trace = polyline([[0, 0], [0, 750], [750, 750], [750, 0], [0, 0]]);
  const distanceM = 3_000;
  const loop = detectLoop(trace);
  assert(loop !== null && loopShapeVerdict(loop).ok, 'boucle honnête fermée');

  const cellCap = loopInteriorCellCap(distanceM);
  assertEquals(
    cellCap,
    Math.floor(loopMaxAreaM2(distanceM) / getHexagonAreaAvg(H3_RESOLUTION, UNITS.m2)),
  );

  const interior = enclosedCells(loop.polygon, hexesForSegments([trace]));
  assert(
    interior.length > cellCap,
    `l'intérieur (${interior.length}) doit dépasser le plafond (${cellCap}) pour tester la troncature`,
  );
  // Miroir du wiring ingest_run : slice(0, cap) = capReached.
  const kept = interior.slice(0, cellCap);
  assertEquals(kept.length, cellCap);
  // Troncature par distance CROISSANTE au tracé : toute cellule gardée est
  // au plus aussi loin que toute cellule coupée.
  const maxKept = Math.max(...kept.map((c) => cellToTraceM(c, trace)));
  const minDropped = Math.min(...interior.slice(cellCap).map((c) => cellToTraceM(c, trace)));
  assert(
    maxKept <= minDropped + 1e-9,
    `les cellules gardées (≤ ${maxKept} m) doivent être plus proches que les coupées (≥ ${minDropped} m)`,
  );
});

Deno.test('boucle honnête sous le plafond : aucune troncature (pas de capReached)', () => {
  // Carré 300 m = 1 200 m courus → plafond 0,1 km² (extrapolation basse) ≈ 6
  // cellules res 10 ; l'intérieur réel (~2-4 cellules) tient dessous.
  const trace = polyline([[0, 0], [0, 300], [300, 300], [300, 0], [0, 0]]);
  const loop = detectLoop(trace);
  assert(loop !== null);
  assertEquals(loop.closure, 'tolerance');
  assertEquals(loopShapeVerdict(loop).ok, true);
  const interior = enclosedCells(loop.polygon, hexesForSegments([trace]));
  assert(interior.length >= 1);
  assert(
    interior.length <= loopInteriorCellCap(1_200),
    'un tour de pâté de maisons ne doit jamais être plafonné',
  );
});

// ─── Anti-abus : forme trop fine (compacité + largeur 2A/P → narrow) ─────────

Deno.test('boucle trop fine (deux rues parallèles à 40 m) → narrow, course conservée', () => {
  // Rectangle 1 200 × 40 m fermé par tolérance : largeur 2A/P ≈ 39 m < 60 ET
  // compacité ≈ 0,098 < 0,12 → intérieur refusé (la boucle reste FERMÉE :
  // loopClosed=true côté ingest, seul l'intérieur est refusé).
  const trace = polyline([[0, 0], [0, 1_200], [40, 1_200], [40, 0], [0, 0]]);
  const loop = detectLoop(trace);
  assert(loop !== null, 'la boucle étroite est bien fermée (course valide)');
  const verdict = loopShapeVerdict(loop);
  assertEquals(verdict.ok, false);
  assertEquals(verdict.reason, 'narrow');
  assert(verdict.widthM < LOOP_MIN_WIDTH_M);
  assert(verdict.compactness < LOOP_MIN_COMPACTNESS);
});

Deno.test('narrow par LARGEUR seule : rectangle 600×50 (compacité correcte)', () => {
  const trace = polyline([[0, 0], [0, 600], [50, 600], [50, 0], [0, 0]]);
  const loop = detectLoop(trace);
  assert(loop !== null);
  const verdict = loopShapeVerdict(loop);
  assertEquals(verdict.ok, false);
  assertEquals(verdict.reason, 'narrow');
  assert(verdict.widthM < LOOP_MIN_WIDTH_M, `largeur ${verdict.widthM} attendue < ${LOOP_MIN_WIDTH_M}`);
  assert(
    verdict.compactness >= LOOP_MIN_COMPACTNESS,
    `compacité ${verdict.compactness} attendue ≥ ${LOOP_MIN_COMPACTNESS} (c'est la largeur qui refuse)`,
  );
});

Deno.test('narrow par COMPACITÉ seule : serpent 2 500×90 (largeur correcte)', () => {
  // Largeur durcie 60 → 80 m (AMENDEMENT-23 §D) : on garde une largeur ≥ 80
  // (rectangle 2 500 × 90 → 2A/P ≈ 87 m) MAIS très allongé → compacité
  // 4πA/P² ≈ 0,105 < 0,12 : c'est bien la COMPACITÉ qui refuse, pas la largeur.
  const trace = polyline([[0, 0], [0, 2_500], [90, 2_500], [90, 0], [0, 0]]);
  const loop = detectLoop(trace);
  assert(loop !== null);
  const verdict = loopShapeVerdict(loop);
  assertEquals(verdict.ok, false);
  assertEquals(verdict.reason, 'narrow');
  assert(
    verdict.widthM >= LOOP_MIN_WIDTH_M,
    `largeur ${verdict.widthM} attendue ≥ ${LOOP_MIN_WIDTH_M} (c'est la compacité qui refuse)`,
  );
  assert(verdict.compactness < LOOP_MIN_COMPACTNESS);
});

Deno.test('multi-tours du même pâté : jamais de faux « narrow » (rescue auto-intersection)', () => {
  // 8 tours d'un pâté de 400 m de côté, un tour sur deux décalé de 5 m (le
  // GPS réel ne repasse jamais exactement au même endroit) → les tours se
  // CROISENT. Le polygone « trace entière » (fermé par tolérance) enroule
  // 8 fois : shoelace ≈ 8×aire, périmètre ≈ 8×tour → compacité ÷8 ≈ 0,098,
  // artificiellement « étroite ». detectLoop doit préférer une boucle d'UN
  // tour (auto-intersection) qui PASSE le verdict — un coureur honnête qui
  // enchaîne les tours ne voit JAMAIS « forme trop étroite ».
  const corners: [number, number][] = [];
  for (let lap = 0; lap < 8; lap++) {
    const o = (lap % 2) * 5;
    corners.push([o, o], [o, 400 + o], [400 + o, 400 + o], [400 + o, o]);
  }
  corners.push([0, 0]); // retour au départ exact → tolérance fermée aussi
  const trace = polyline(corners);
  assert(detectClosedLoop(trace), 'précondition : la trace entière ferme par tolérance');

  const loop = detectLoop(trace);
  assert(loop !== null, 'les tours enchaînés ferment une boucle');
  const verdict = loopShapeVerdict(loop);
  assertEquals(verdict.ok, true, 'jamais de narrow pour des tours honnêtes enchaînés');
  // Et l'intérieur reste calculable sans crash (fallback [] toléré par h3).
  assert(Array.isArray(enclosedCells(loop.polygon, hexesForSegments([trace]))));
});

Deno.test('formes honnêtes : carré et boucle en P passent le verdict de forme', () => {
  const square = detectLoop(polyline([[0, 0], [0, 400], [400, 400], [400, 0], [0, 0]]));
  assert(square !== null);
  const squareVerdict = loopShapeVerdict(square);
  assertEquals(squareVerdict.ok, true);
  // Un carré vaut π/4 en compacité — très au-dessus du seuil.
  assert(squareVerdict.compactness > 0.7);
  assert(squareVerdict.widthM > LOOP_MIN_WIDTH_M);
});
