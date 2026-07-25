/**
 * GRYD — « la carte est recalculée par ratio, le territoire n'est JAMAIS coupé »
 * (planche E10). C'était vrai par ACCIDENT (preserveAspectRatio par défaut) et
 * jamais vérifié ; ici c'est un invariant testé, pour les quatre formats.
 *
 * Le deuxième test central est le CENTRAGE : le cadrage précédent ancrait le
 * dessin à la marge sur les deux axes, donc un tracé large-et-plat collait en
 * haut du cadre avec tout le vide en bas.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  FRAME_PAD,
  frameFor,
  normalizeAspect,
  viewBoxFor,
  type FrameRing,
} from './mapFrame.ts';

// Mètres par degré autour de Paris (features/map/realAnchors.ts). Passés en
// paramètres — le module pur ne duplique pas la source.
const M_LAT = 111_320;
const M_LNG = M_LAT * Math.cos((48.8674 * Math.PI) / 180);

/**
 * Les quatre formats de la planche E10 (9:16 · 4:5 · 1:1 · « carte seule » 3:4),
 * en largeur/hauteur. Fixture de test : ce sont les aspects de card, l'aspect du
 * SLOT est mesuré au rendu.
 */
const RATIOS: readonly { name: string; aspect: number }[] = [
  { name: '9:16 (story)', aspect: 9 / 16 },
  { name: '4:5 (portrait)', aspect: 4 / 5 },
  { name: '1:1 (carré)', aspect: 1 },
  { name: '3:4 (carte seule)', aspect: 3 / 4 },
];

/** Boucle réaliste : ~600 m de large, ~300 m de haut (large-et-plate). */
const WIDE_LOOP: FrameRing = [
  [2.36, 48.8674],
  [2.368, 48.8674],
  [2.368, 48.8701],
  [2.36, 48.8701],
  [2.36, 48.8674],
];

/** Boucle étroite-et-haute (le cas symétrique). */
const TALL_LOOP: FrameRing = [
  [2.36, 48.86],
  [2.3615, 48.86],
  [2.3615, 48.872],
  [2.36, 48.872],
  [2.36, 48.86],
];

function projectAll(ring: FrameRing, aspect: number) {
  const frame = frameFor([ring], aspect, M_LNG, M_LAT);
  return { frame, pts: ring.map(([lng, lat]) => frame.project(lng, lat)) };
}

Deno.test('le territoire tient ENTIÈREMENT dans le cadre, pour les 4 ratios', () => {
  for (const ring of [WIDE_LOOP, TALL_LOOP]) {
    for (const r of RATIOS) {
      const { frame, pts } = projectAll(ring, r.aspect);
      for (const p of pts) {
        assert(
          p.x >= FRAME_PAD - 1e-6 && p.x <= frame.vbW - FRAME_PAD + 1e-6,
          `${r.name} : x=${p.x} sort du cadre (0..${frame.vbW})`,
        );
        assert(
          p.y >= FRAME_PAD - 1e-6 && p.y <= frame.vbH - FRAME_PAD + 1e-6,
          `${r.name} : y=${p.y} sort du cadre (0..${frame.vbH})`,
        );
      }
    }
  }
});

Deno.test('la viewBox SUIT le ratio (le cadrage était figé en carré)', () => {
  const seen = new Set<string>();
  for (const r of RATIOS) {
    const { vbW, vbH } = viewBoxFor(r.aspect);
    // À 1e-3 près, largeur/hauteur reproduit l'aspect demandé.
    assert(Math.abs(vbW / vbH - r.aspect) < 1e-3, `${r.name} : viewBox ${vbW}×${vbH}`);
    seen.add(`${vbW.toFixed(2)}x${vbH.toFixed(2)}`);
  }
  // Quatre ratios → quatre cadres distincts. Un seul cadre = la régression.
  assertEquals(seen.size, 4);
});

Deno.test('un tracé large-et-plat est CENTRÉ, pas collé en haut', () => {
  const { frame, pts } = projectAll(WIDE_LOOP, 1);
  const ys = pts.map((p) => p.y);
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);
  // Le vide au-dessus et le vide en dessous sont égaux (c'était 12 vs ~50).
  assert(
    Math.abs(top - (frame.vbH - bottom)) < 1e-6,
    `haut=${top} bas=${frame.vbH - bottom}`,
  );
});

Deno.test('un tracé étroit-et-haut est CENTRÉ horizontalement', () => {
  const { frame, pts } = projectAll(TALL_LOOP, 1);
  const xs = pts.map((p) => p.x);
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  assert(Math.abs(left - (frame.vbW - right)) < 1e-6, `gauche=${left} droite=${frame.vbW - right}`);
});

Deno.test('le dessin est MAXIMAL dans son cadre (aucun letterboxing inutile)', () => {
  // C'est l'autre moitié de « recalculée par ratio » : ne pas couper NE SUFFIT
  // PAS, encore faut-il occuper le cadre. Avec une viewBox carrée figée dans un
  // slot 9:16, la preuve visuelle était rapetissée pour rien.
  for (const ring of [WIDE_LOOP, TALL_LOOP]) {
    for (const r of RATIOS) {
      const { frame, pts } = projectAll(ring, r.aspect);
      const availW = frame.vbW - FRAME_PAD * 2;
      const availH = frame.vbH - FRAME_PAD * 2;
      const w = Math.max(...pts.map((p) => p.x)) - Math.min(...pts.map((p) => p.x));
      const h = Math.max(...pts.map((p) => p.y)) - Math.min(...pts.map((p) => p.y));
      assert(w <= availW + 1e-6 && h <= availH + 1e-6, `${r.name} : déborde`);
      assert(
        Math.abs(w - availW) < 1e-6 || Math.abs(h - availH) < 1e-6,
        `${r.name} : ${w}×${h} n'atteint ni ${availW} ni ${availH}`,
      );
    }
  }
});

Deno.test('cas dégénérés : aucun point, un seul point, aspect aberrant', () => {
  const empty = frameFor([], 1, M_LNG, M_LAT);
  const c = empty.project(2.36, 48.86);
  assertEquals(c.x, empty.vbW / 2);
  assertEquals(c.y, empty.vbH / 2);

  // Un point unique : centré, jamais NaN (l'étendue nulle donnait 0 × Infinity).
  const one = frameFor([[[2.36, 48.86]]], 1, M_LNG, M_LAT);
  const p = one.project(2.36, 48.86);
  assert(Number.isFinite(p.x) && Number.isFinite(p.y), `NaN : ${p.x},${p.y}`);
  assert(p.x > FRAME_PAD && p.x < one.vbW - FRAME_PAD);

  // Mesure de premier rendu (hauteur nulle) ou aspect absurde → carré.
  assertEquals(normalizeAspect(0), 1);
  assertEquals(normalizeAspect(Number.NaN), 1);
  assertEquals(normalizeAspect(-3), 1);
  // Borné : un slot 10:1 ne produit pas une viewBox de 1000 de large.
  assertEquals(normalizeAspect(10), 3);
  assertEquals(normalizeAspect(0.02), 1 / 3);
});

Deno.test('aucune coupe même sur un cadre extrême (borne d’aspect)', () => {
  const { frame, pts } = projectAll(WIDE_LOOP, 12);
  for (const p of pts) {
    assert(p.x >= FRAME_PAD - 1e-6 && p.x <= frame.vbW - FRAME_PAD + 1e-6);
    assert(p.y >= FRAME_PAD - 1e-6 && p.y <= frame.vbH - FRAME_PAD + 1e-6);
  }
});
