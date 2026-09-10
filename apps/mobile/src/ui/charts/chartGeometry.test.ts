/**
 * GRYD — LA GÉOMÉTRIE DES GRAPHIQUES : les façons de mentir, fermées une par une.
 *
 * ─── ÉTAPE 0 — le défaut existait ───────────────────────────────────────────
 * Le seul graphique monté du produit (`ProfileStatsScreen`, barres de distance)
 * calculait sa hauteur en clair dans le JSX : `day.km / chartMax * 112`. Trois
 * conséquences que ces tests interdisent désormais :
 *   · `chartMax` valait `Math.max(...jours, 1)` — donc une journée à 0,3 km
 *     dessinait une barre de 34 pt, presque un tiers du graphique, parce que le
 *     plancher de 1 km s'appliquait au MAXIMUM et pas à l'échelle ;
 *   · un jour SANS sortie ne dessinait aucune barre : le jour disparaissait de
 *     l'axe au lieu de se lire « rien ce jour-là » ;
 *   · aucune série constante n'était testée : une échelle de hauteur nulle
 *     produit une division par zéro et n'importe quel dessin.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  MIN_BAR_HEIGHT,
  NO_PADDING,
  areaPath,
  barsLayout,
  domainOf,
  polylinePoints,
  projectChart,
  type ChartFrame,
} from './chartGeometry.ts';

const FRAME: ChartFrame = { width: 300, height: 100, padding: NO_PADDING };

Deno.test('domaine — une série vide ne se cadre pas (aucun graphique fantôme)', () => {
  assertEquals(domainOf([]), null);
  assertEquals(domainOf([{ x: NaN, y: NaN }]), null);
});

Deno.test('domaine — une série CONSTANTE ne devient pas des montagnes russes', () => {
  const domain = domainOf([{ x: 0, y: 360 }, { x: 1, y: 360 }, { x: 2, y: 360 }])!;
  assert(domain.maxY > domain.minY, 'étendue non dégénérée');
  const projected = projectChart(
    [{ x: 0, y: 360 }, { x: 1, y: 360 }, { x: 2, y: 360 }],
    domain,
    FRAME,
  );
  const ys = projected.map((p) => Math.round(p.y));
  assertEquals(new Set(ys).size, 1, 'la ligne reste plate');
  assertEquals(ys[0], 50, 'et centrée dans le cadre');
});

Deno.test('projection — tout point reste DANS le cadre, marges comprises', () => {
  const points = [{ x: 0, y: 300 }, { x: 500, y: 420 }, { x: 1_000, y: 360 }];
  const frame: ChartFrame = {
    width: 300,
    height: 120,
    padding: { top: 8, right: 4, bottom: 12, left: 20 },
  };
  const projected = projectChart(points, domainOf(points)!, frame);
  for (const point of projected) {
    assert(point.x >= frame.padding.left - 0.01 && point.x <= frame.width - frame.padding.right + 0.01, `x ${point.x}`);
    assert(point.y >= frame.padding.top - 0.01 && point.y <= frame.height - frame.padding.bottom + 0.01, `y ${point.y}`);
  }
});

Deno.test('projection — l’axe inversé met la valeur la PLUS PETITE en haut', () => {
  const points = [{ x: 0, y: 300 }, { x: 1, y: 420 }];
  const domain = domainOf(points, 0)!;
  const normal = projectChart(points, domain, FRAME, false);
  const inverse = projectChart(points, domain, FRAME, true);
  // Sans inversion : 300 est la valeur basse, donc dessinée en bas (y grand).
  assert(normal[0]!.y > normal[1]!.y);
  // Avec inversion (allure) : 300 s/km est l'allure RAPIDE, dessinée en haut.
  assert(inverse[0]!.y < inverse[1]!.y);
});

Deno.test('barres — l’échelle part de zéro, et un jour vide reste visible', () => {
  const bars = barsLayout([0, 5, 10], FRAME, 4);
  assertEquals(bars.length, 3);
  assertEquals(bars[0]!.height, MIN_BAR_HEIGHT, 'un jour sans sortie garde sa place');
  // Base zéro : 5 fait exactement la moitié de 10.
  assert(Math.abs(bars[1]!.height - bars[2]!.height / 2) < 0.01);
  // Les barres ne se chevauchent pas et tiennent dans la largeur.
  assert(bars[0]!.x + bars[0]!.width <= bars[1]!.x + 0.01);
  assert(bars[2]!.x + bars[2]!.width <= FRAME.width + 0.01);
  // Le pied de chaque barre est sur la ligne de base.
  for (const bar of bars) assert(Math.abs(bar.y + bar.height - FRAME.height) < 0.01);
});

Deno.test('barres — une valeur négative ou non finie ne descend pas sous l’axe', () => {
  const bars = barsLayout([-3, Number.NaN, 8], FRAME, 2);
  assertEquals(bars[0]!.value, 0);
  assertEquals(bars[1]!.value, 0);
  assertEquals(bars[0]!.height, MIN_BAR_HEIGHT);
  assert(bars[2]!.height > MIN_BAR_HEIGHT);
});

Deno.test('barres — un maximum imposé rend deux graphiques comparables', () => {
  const seule = barsLayout([5], FRAME, 0);
  const comparee = barsLayout([5], FRAME, 0, 10);
  assert(comparee[0]!.height < seule[0]!.height, 'la même valeur, à l’échelle du plus grand');
});

Deno.test('tracé — une série de moins de deux points ne produit pas d’aire', () => {
  assertEquals(areaPath([], FRAME), '');
  assertEquals(areaPath([{ x: 1, y: 1 }], FRAME), '');
  assertEquals(polylinePoints([]), '');
  const path = areaPath([{ x: 0, y: 10 }, { x: 10, y: 20 }], FRAME);
  assert(path.startsWith('M0.0 100.0') && path.endsWith('Z'), path);
});

declare const Deno: {
  test(nom: string, fn: () => void | Promise<void>): void;
};
