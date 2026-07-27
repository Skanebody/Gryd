/**
 * GRYD — LES PLANCHES E01b NE PEUVENT PAS DÉRIVER EN SILENCE.
 *
 * Ce que ces tests protègent n'est pas du pixel : c'est l'ORDRE des temps (une
 * surface ne se remplit jamais avant que la boucle soit fermée), la fidélité de
 * la géométrie RÉCUPÉRÉE (le tracé de la planche 02 vient de `E01Route.tsx`,
 * repris depuis git — il ne doit pas être « amélioré » au prochain passage), et
 * les invariants de composition que l'œil ne rattraperait pas (les pastilles sur
 * le contour, la coupe au milieu de la zone, la frontière PARTAGÉE des deux
 * territoires).
 *
 * Ils remplacent `demoPhases.test.ts`, supprimé avec son module : la timeline
 * bouclée de 3 s des anciennes cartes pédagogiques ne décrit plus aucun écran.
 */
import { assert, assertAlmostEquals, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  BOARD_H,
  BOARD_W,
  CREW_BORDER,
  CREW_BORDER_X,
  CREW_MINE,
  CREW_OTHER,
  GRID_COLS,
  GRID_ROWS,
  LOOP_BEATS,
  LOOP_DRAW_MS,
  LOOP_FILL_MS,
  LOOP_FINAL,
  LOOP_FINISH,
  LOOP_FIT,
  LOOP_PATH_D,
  LOOP_PATH_LEN,
  LOOP_PLAY_MS,
  LOOP_POINTS,
  LOOP_START,
  PRIVACY_DOT_R,
  PRIVACY_RING_R,
  RIVALRY_LABEL_ANCHOR,
  RIVALRY_OVERFLOW,
  RIVALRY_SPLIT_X,
  RIVALRY_ZONE,
  TAKEOVER_FINAL,
  TAKEOVER_MS,
  bboxOf,
  closedPathD,
  closedPathLength,
  easeInOut,
  fitToBoard,
  gridLines,
  loopPhases,
  rampAt,
  takeoverPhases,
} from './plancheMotion.ts';

// ═══════════════════════════════════════════════════════════════════════════
// TEMPS
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('les durées sont CELLES DES PLANCHES, pas des estimations', () => {
  // Planche 02 : « la boucle se dessine en 900 ms […] PUIS la surface se remplit ».
  assertEquals(LOOP_DRAW_MS, 900);
  assertEquals(LOOP_FILL_MS, 600);
  assertEquals(LOOP_PLAY_MS, 1500);
  // Planche 03 : « la moitié bascule en orange en 600 ms ».
  assertEquals(TAKEOVER_MS, 600);
  // Le remplissage COMMENCE là où le dessin FINIT — aucun trou, aucun recouvrement.
  assertEquals(LOOP_BEATS.fill.from, LOOP_BEATS.draw.to);
});

Deno.test('LA SURFACE NE SE REMPLIT JAMAIS AVANT QUE LA BOUCLE SOIT FERMÉE', () => {
  // C'est LA règle que la planche 02 enseigne (« QUAND ton tracé se referme… »).
  // Une surface qui se remplirait pendant le dessin apprendrait l'inverse — et
  // ce serait invisible sur une capture d'écran (rAF à 0 fps en headless).
  for (let ms = -500; ms <= LOOP_PLAY_MS + 500; ms += 25) {
    const p = loopPhases(ms);
    if (p.fill > 0) {
      assertEquals(p.draw, 1, `à ${ms} ms la zone se remplit alors que draw = ${p.draw}`);
    }
    assert(p.draw >= 0 && p.draw <= 1, `draw hors bornes à ${ms} ms`);
    assert(p.fill >= 0 && p.fill <= 1, `fill hors bornes à ${ms} ms`);
  }
});

Deno.test('l’état FINAL (mouvement réduit) est lisible : fermée ET remplie', () => {
  // A11y : « Reduce Motion → déjà fermée et remplie ». Une animation dégradée ou
  // un plateau vide seraient tous deux des écrans qui n'enseignent rien.
  assertEquals(LOOP_FINAL.draw, 1);
  assertEquals(LOOP_FINAL.fill, 1);
  assertEquals(TAKEOVER_FINAL.taken, 1);
});

Deno.test('rampAt et easeInOut restent bornés, même sur une valeur folle', () => {
  const beat = { from: 0, to: 100 };
  assertEquals(rampAt(Number.NaN, beat), 0);
  assertEquals(rampAt(-1, beat), 0);
  assertEquals(rampAt(1000, beat), 1);
  assertEquals(rampAt(50, beat), 0.5);
  // Beat dégénéré (from === to) : jamais une division par zéro, jamais NaN.
  assertEquals(rampAt(5, { from: 3, to: 3 }), 1);
  assertEquals(easeInOut(-2), 0);
  assertEquals(easeInOut(2), 1);
  assertAlmostEquals(easeInOut(0.5), 0.5, 1e-9);
});

Deno.test('les deux animations sont MONOTONES (rien ne recule à l’écran)', () => {
  let prevDraw = -1;
  let prevFill = -1;
  let prevTaken = -1;
  for (let ms = 0; ms <= LOOP_PLAY_MS; ms += 10) {
    const p = loopPhases(ms);
    assert(p.draw >= prevDraw, `draw recule à ${ms} ms`);
    assert(p.fill >= prevFill, `fill recule à ${ms} ms`);
    prevDraw = p.draw;
    prevFill = p.fill;
  }
  for (let ms = 0; ms <= TAKEOVER_MS; ms += 10) {
    const t = takeoverPhases(ms).taken;
    assert(t >= prevTaken, `taken recule à ${ms} ms`);
    prevTaken = t;
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PLANCHE 02 — LA BOUCLE RÉCUPÉRÉE
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('LE TRACÉ EST CELUI DE E01Route.tsx, CARACTÈRE POUR CARACTÈRE', () => {
  // Le fondateur a re-fourni les planches E01b ; le tracé de la planche 02 avait
  // déjà été dessiné dans `E01Route.tsx`, supprimé comme code mort au commit
  // b5b3e64. Il est RÉCUPÉRÉ (git show b5b3e64^), pas redessiné : ce test gèle
  // la chaîne exacte, pour qu'une « amélioration » de la courbe se voie.
  assertEquals(
    LOOP_PATH_D,
    'M95 495 L95 370 L155 370 L155 285 L250 285 L250 350 L300 350 L300 455 L205 455 L205 495 Z',
  );
});

Deno.test('la boucle est FERMÉE et suit les rues (aucun segment oblique)', () => {
  // « Segments droits, angles — pas des courbes lisses » : chaque segment est
  // horizontal OU vertical. Un segment oblique serait un raccourci à travers un
  // pâté de maisons, donc un parcours qu'on ne peut pas courir.
  assert(LOOP_PATH_D.endsWith(' Z'), 'la boucle ne se referme pas');
  for (let i = 0; i < LOOP_POINTS.length; i++) {
    const a = LOOP_POINTS[i]!;
    const b = LOOP_POINTS[(i + 1) % LOOP_POINTS.length]!;
    assert(
      a[0] === b[0] || a[1] === b[1],
      `segment oblique entre (${a[0]},${a[1]}) et (${b[0]},${b[1]})`,
    );
    assert(!(a[0] === b[0] && a[1] === b[1]), 'deux sommets confondus');
  }
});

Deno.test('le périmètre du dasharray est EXACT (l’ancien 840 était approximatif)', () => {
  // `E01Route.tsx` annotait « Périmètre approximatif (pour le “draw”) : 840 ».
  // Un dasharray trop court laisse un bout de tracé peint dès la 1re image ; trop
  // long, le tracé démarre en retard. Il se CALCULE.
  assertEquals(LOOP_PATH_LEN, closedPathLength(LOOP_POINTS));
  assertEquals(LOOP_PATH_LEN, 830);
});

Deno.test('LES DEUX PASTILLES SONT SUR LE CONTOUR, en bas, côte à côte', () => {
  // Planche : « DEUX pastilles sur le contour, en bas : un cercle CREUX (le
  // départ) et un cercle PLEIN (l'arrivée), côte à côte. » Une pastille posée à
  // côté du tracé dirait « le départ n'est pas sur le parcours ».
  const bottomY = Math.max(...LOOP_POINTS.map((p) => p[1]));
  for (const [name, dot] of [['départ', LOOP_START], ['arrivée', LOOP_FINISH]] as const) {
    assertEquals(dot[1], bottomY, `la pastille « ${name} » n’est pas sur le segment du bas`);
    // …et bien SUR le segment (95 → 205), pas au-delà de ses extrémités.
    assert(dot[0] >= 95 && dot[0] <= 205, `la pastille « ${name} » sort du segment`);
  }
  assert(LOOP_START[0] < LOOP_FINISH[0], 'départ et arrivée sont inversés');
  const gap = LOOP_FINISH[0] - LOOP_START[0];
  assert(gap >= 40, `les deux pastilles se chevauchent (écart ${gap})`);
});

Deno.test('le tracé RENTRE dans le plateau, sans être déformé', () => {
  // Une seule échelle pour x et y : un parcours étiré n'est plus un parcours.
  const box = bboxOf(LOOP_POINTS);
  const project = (p: readonly [number, number]) =>
    [p[0] * LOOP_FIT.scale + LOOP_FIT.tx, p[1] * LOOP_FIT.scale + LOOP_FIT.ty] as const;
  for (const p of [...LOOP_POINTS, LOOP_START, LOOP_FINISH]) {
    const [x, y] = project(p);
    assert(x >= 0 && x <= BOARD_W, `x = ${x} sort du plateau`);
    assert(y >= 0 && y <= BOARD_H, `y = ${y} sort du plateau`);
  }
  // …et il OCCUPE le plateau (une boucle timbre-poste n'enseignerait rien).
  assert(box.w * LOOP_FIT.scale >= BOARD_W * 0.6, 'le tracé est trop petit dans le plateau');
  assert(box.h * LOOP_FIT.scale >= BOARD_H * 0.6, 'le tracé est trop petit dans le plateau');
});

Deno.test('fitToBoard centre et ne renvoie jamais une échelle folle', () => {
  const carre: readonly (readonly [number, number])[] = [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
  ];
  const fit = fitToBoard(carre, 100, 100, 10);
  assertEquals(fit.scale, 8);
  assertEquals(fit.tx, 10);
  assertEquals(fit.ty, 10);
});

// ═══════════════════════════════════════════════════════════════════════════
// PLANCHES 03 / 04 / 05
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('la zone de la rivalité est coupée AU MILIEU, et le rival déborde à droite', () => {
  const box = bboxOf(RIVALRY_ZONE);
  assertEquals(RIVALRY_SPLIT_X, box.x + box.w / 2, 'la coupe n’est pas au milieu de la zone');
  // « le contour orange déborde légèrement à droite » : légèrement, donc non nul
  // et petit devant la zone — un gros décalage lirait « deux zones », pas « une
  // zone reprise à moitié ».
  assert(RIVALRY_OVERFLOW > 0, 'le contour rival ne déborde pas');
  assert(RIVALRY_OVERFLOW <= box.w * 0.05, 'le débord rival est trop gros');
  // Le mot « REPRIS » se pose DANS la moitié droite (planche), jamais à cheval.
  assert(
    RIVALRY_LABEL_ANCHOR[0] > RIVALRY_SPLIT_X,
    'le label « REPRIS » n’est pas dans la partie reprise',
  );
  assert(RIVALRY_LABEL_ANCHOR[0] < box.x + box.w, 'le label « REPRIS » sort de la zone');
});

Deno.test('les deux territoires du crew PARTAGENT leur frontière (ils se touchent)', () => {
  // Planche 04 : « DEUX territoires ADJACENTS qui se touchent […] leur frontière
  // commune est partagée ». Deux blocs séparés par un interstice diraient
  // « deux crews voisins », pas « le quartier se prend à plusieurs ».
  const mineRight = Math.max(...CREW_MINE.map((p) => p[0]));
  const otherLeft = Math.min(...CREW_OTHER.map((p) => p[0]));
  assertEquals(mineRight, CREW_BORDER_X);
  assertEquals(otherLeft, CREW_BORDER_X);
  assertEquals(CREW_BORDER[0][0], CREW_BORDER_X);
  assertEquals(CREW_BORDER[1][0], CREW_BORDER_X);
  // La frontière couvre TOUTE la hauteur commune aux deux zones.
  const mineTop = Math.min(...CREW_MINE.map((p) => p[1]));
  const mineBottom = Math.max(...CREW_MINE.map((p) => p[1]));
  assertEquals(CREW_BORDER[0][1], mineTop);
  assertEquals(CREW_BORDER[1][1], mineBottom);
});

Deno.test('le halo de confidentialité entoure VRAIMENT le point (E05)', () => {
  // « un cercle EN POINTILLÉ chartreuse (la zone floutée) avec un POINT PLEIN au
  // centre » : si le point débordait du halo, le dessin dirait l'inverse de la
  // garantie qu'il illustre (« zones floutées autour des lieux sensibles »).
  assert(PRIVACY_DOT_R < PRIVACY_RING_R, 'le point déborde de la zone floutée');
  assert(PRIVACY_DOT_R * 4 < PRIVACY_RING_R, 'le halo est trop serré pour se lire comme un flou');
});

Deno.test('la grille fait 4 colonnes × 5 lignes et ne touche jamais les bords', () => {
  const lines = gridLines();
  assertEquals(GRID_COLS, 4);
  assertEquals(GRID_ROWS, 5);
  assertEquals(lines.length, GRID_COLS + GRID_ROWS);
  const verticals = lines.filter((l) => l.x1 === l.x2);
  const horizontals = lines.filter((l) => l.y1 === l.y2);
  assertEquals(verticals.length, GRID_COLS);
  assertEquals(horizontals.length, GRID_ROWS);
  for (const v of verticals) assert(v.x1 > 0 && v.x1 < BOARD_W, 'filet vertical collé au bord');
  for (const h of horizontals) assert(h.y1 > 0 && h.y1 < BOARD_H, 'filet horizontal collé au bord');
});

Deno.test('closedPathD produit un polygone fermé, et rien sur une liste vide', () => {
  assertEquals(closedPathD([]), '');
  assertEquals(closedPathD([[0, 0], [1, 0], [1, 1]]), 'M0 0 L1 0 L1 1 Z');
  assertEquals(closedPathLength([[0, 0], [3, 0], [3, 4]]), 12);
});
