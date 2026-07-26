/**
 * GRYD — tests de la projection de la CARTE SIGNATURE (planche E15, bloc 4).
 *
 * Cette vignette est la PREUVE territoriale du Profil : le contour réel de ce que
 * le joueur tient. Le test décisif est l'ANTI-FLATTERIE (« une petite possession
 * reste petite ») — sans le plancher MIN_SPAN_DEG, un joueur qui ne tient qu'un
 * hexagone verrait sa zone dilatée à toute la card, et la vignette lui dirait
 * « j'occupe tout », ce qui est faux. Les autres invariants (échelle uniforme,
 * nord en haut, contour qui ne touche jamais le bord) garantissent qu'aucune ville
 * n'est déformée ni retournée.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import type { RealTerritory } from '../map/territoryBuild.ts';
import { FIT_PADDING_PX, MIN_SPAN_DEG, signaturePaths } from './signaturePaths.ts';

const W = 300;
const H = 164;

/**
 * Fabrique un territoire à partir de ses seuls anneaux : `signaturePaths` ne lit
 * QUE `polygons`, le reste du contrat est hors sujet pour une projection.
 */
function terr(...rings: [number, number][][]): RealTerritory {
  return { polygons: [rings] } as unknown as RealTerritory;
}

/** Extrait tous les points (x, y) d'un chemin SVG « M.. L.. .. Z ». */
function coords(d: string): { x: number; y: number }[] {
  const nums = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) pts.push({ x: nums[i], y: nums[i + 1] });
  return pts;
}

/** Boîte englobante de tous les points de tous les chemins. */
function bbox(paths: string[]) {
  const pts = paths.flatMap(coords);
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
    pts,
  };
}

/** Carré ~métrique centré sur (0,0) : à la latitude 0, cos φ = 1 → span deg = span m. */
const squareAtEquator = (halfDeg: number): [number, number][] => [
  [-halfDeg, -halfDeg],
  [halfDeg, -halfDeg],
  [halfDeg, halfDeg],
  [-halfDeg, halfDeg],
];

// ─── Rien à dessiner : un trou n'est pas une signature ──────────────────────

Deno.test('aucun territoire → aucun chemin (l’écran ne montre alors PAS de silhouette)', () => {
  assertEquals(signaturePaths([], W, H), []);
});

Deno.test('un anneau de moins de 3 points est ignoré (dégénérescence, pas un contour)', () => {
  const t = terr([
    [0, 0],
    [0.01, 0.01],
  ]);
  assertEquals(signaturePaths([t], W, H), []);
});

// ─── L'INVARIANT D'HONNÊTETÉ : le plancher anti-flatterie ───────────────────

Deno.test('anti-flatterie : une possession minuscule NE remplit PAS la card', () => {
  // Zone ~110 m de côté (0.001°), très en deçà du plancher ~900 m (MIN_SPAN_DEG).
  const tiny = signaturePaths([terr(squareAtEquator(0.0005))], W, H);
  const big = signaturePaths([terr(squareAtEquator(0.02))], W, H);

  const innerH = H - FIT_PADDING_PX * 2;
  const tinyH = bbox(tiny).maxY - bbox(tiny).minY;
  const bigH = bbox(big).maxY - bbox(big).minY;

  // La grande zone remplit sa boîte utile ; la minuscule reste petite. Le
  // rapport doit suivre celui des étendues RÉELLES (0.001 / plancher), pas 1.
  assert(bigH > innerH * 0.9, `grande zone attendue proche du plein cadre, vue ${bigH}`);
  assert(tinyH < innerH * 0.25, `zone minuscule attendue petite, vue ${tinyH} sur ${innerH}`);
  assert(tinyH < bigH / 4, 'la minuscule doit rester bien plus petite que la grande');
});

// ─── Échelle UNIFORME : aucune ville n'est étirée ───────────────────────────

Deno.test('échelle uniforme : un carré métrique reste un carré (jamais étiré)', () => {
  // À l'équateur, cos φ = 1 : un carré en degrés est un carré en mètres.
  const b = bbox(signaturePaths([terr(squareAtEquator(0.02))], W, H));
  const drawnW = b.maxX - b.minX;
  const drawnH = b.maxY - b.minY;
  assert(Math.abs(drawnW - drawnH) < 0.5, `carré attendu, vu ${drawnW}×${drawnH}`);
});

// ─── Nord en haut : la latitude ne se retourne pas ──────────────────────────

Deno.test('nord en haut : une latitude plus élevée se projette PLUS HAUT (y plus petit)', () => {
  // Triangle dont le sommet est nettement au nord (lat max) — assez large pour
  // dépasser le plancher, sinon le recentrage masquerait l'inversion.
  const t = terr([
    [-0.02, 0], // ouest, lat médiane
    [0.02, 0], // est, lat médiane
    [0, 0.02], // NORD (lat max)
  ]);
  const pts = coords(signaturePaths([t], W, H)[0]);
  const northMost = pts.reduce((a, p) => (p.y < a.y ? p : a), pts[0]);
  // Le sommet nord (3ᵉ point) doit être celui du plus petit y (le plus haut).
  const apex = pts[2];
  assertEquals(northMost.y, apex.y, 'le point le plus au nord doit être le plus haut à l’écran');
});

// ─── Le contour ne touche jamais le bord (padding respecté) ─────────────────

Deno.test('le contour tient dans la boîte utile — jamais collé au bord', () => {
  // Coordonnées réalistes (Dieppe ~49,92 N / 1,08 E) : la projection cadre.
  const t = terr([
    [1.075, 49.918],
    [1.085, 49.918],
    [1.085, 49.925],
    [1.075, 49.925],
  ]);
  const b = bbox(signaturePaths([t], W, H));
  assert(b.minX >= FIT_PADDING_PX - 0.05, `minX ${b.minX} < padding`);
  assert(b.maxX <= W - FIT_PADDING_PX + 0.05, `maxX ${b.maxX} > W - padding`);
  assert(b.minY >= FIT_PADDING_PX - 0.05, `minY ${b.minY} < padding`);
  assert(b.maxY <= H - FIT_PADDING_PX + 0.05, `maxY ${b.maxY} > H - padding`);
});

// ─── Plusieurs polygones : chaque anneau fermé rend un chemin ───────────────

Deno.test('deux territoires disjoints → deux chemins fermés', () => {
  const a = terr(squareAtEquator(0.01));
  const b = terr([
    [0.05, 0.05],
    [0.06, 0.05],
    [0.06, 0.06],
  ]);
  const paths = signaturePaths([a, b], W, H);
  assertEquals(paths.length, 2);
  for (const d of paths) {
    assert(d.startsWith('M'), 'un chemin commence par un moveto');
    assert(d.trim().endsWith('Z'), 'un chemin de contour est fermé (Z)');
  }
});
