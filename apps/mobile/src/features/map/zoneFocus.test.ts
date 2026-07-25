/**
 * GRYD — tests du CADRAGE de la zone tapée (planche E04). Ce qu'ils verrouillent
 * n'est pas « la caméra bouge » mais « elle bouge de la BONNE quantité » : le
 * seul moyen de le prouver est de reprojeter le résultat en pixels et de
 * vérifier qu'on retombe exactement sur la moitié de la hauteur de sheet.
 */
import { assert, assertAlmostEquals, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  MERCATOR_MAX_LAT,
  latFromMercatorY,
  mercatorY,
  pixelOffsetBetweenLats,
  worldSizePx,
  zoneFocusLat,
} from './zoneFocus.ts';

Deno.test('mercatorY : nord = 0, équateur = 0,5, sud = 1 (et croît vers le sud)', () => {
  assertAlmostEquals(mercatorY(0), 0.5, 1e-12);
  assert(mercatorY(48.87) < 0.5, 'Paris est au nord de l’équateur');
  assert(mercatorY(-33.87) > 0.5, 'Sydney est au sud');
  assertAlmostEquals(mercatorY(MERCATOR_MAX_LAT), 0, 1e-6);
  assertAlmostEquals(mercatorY(-MERCATOR_MAX_LAT), 1, 1e-6);
});

Deno.test('latFromMercatorY : inverse exacte de mercatorY', () => {
  for (const lat of [-84, -45, -0.001, 0, 12.34, 48.8674, 60, 84]) {
    assertAlmostEquals(latFromMercatorY(mercatorY(lat)), lat, 1e-9);
  }
});

Deno.test('mercatorY : latitude hors bornes bornée, jamais NaN (pôle = infini)', () => {
  assert(Number.isFinite(mercatorY(90)));
  assert(Number.isFinite(mercatorY(-90)));
  assert(Number.isFinite(mercatorY(1e6)));
  assert(Number.isFinite(latFromMercatorY(-3)));
  assert(Number.isFinite(latFromMercatorY(4)));
});

Deno.test('zoneFocusLat : sans sheet, la latitude est rendue telle quelle', () => {
  const lat = 48.8674;
  assertEquals(zoneFocusLat({ lat, zoom: 14, sheetHeightPx: 0 }), lat);
  // Une hauteur négative (bug d'appelant) ne doit pas décadrer vers le nord.
  assertEquals(zoneFocusLat({ lat, zoom: 14, sheetHeightPx: -120 }), lat);
});

Deno.test('zoneFocusLat : la zone tombe EXACTEMENT au milieu de la bande libre', () => {
  // C'est LE test du module : le centre descend vers le sud de sheet/2 pixels,
  // donc la zone remonte de sheet/2 — soit le milieu de l'espace au-dessus.
  for (const zoom of [11, 13, 15, 17]) {
    for (const sheet of [132, 306, 470]) {
      for (const lat of [48.8674, 0.0001, -33.8688, 59.91]) {
        const center = zoneFocusLat({ lat, zoom, sheetHeightPx: sheet });
        assertAlmostEquals(pixelOffsetBetweenLats(lat, center, zoom), sheet / 2, 1e-6);
      }
    }
  }
});

Deno.test('zoneFocusLat : le centre part vers le SUD (hémisphère nord : latitude plus basse)', () => {
  const lat = 48.8674;
  const center = zoneFocusLat({ lat, zoom: 15, sheetHeightPx: 300 });
  assert(center < lat, 'l’écran descend, donc la zone remonte');
  // Sud aussi : « vers le sud » est absolu, pas relatif à l'hémisphère.
  const south = zoneFocusLat({ lat: -33.8688, zoom: 15, sheetHeightPx: 300 });
  assert(south < -33.8688);
});

Deno.test('zoneFocusLat : plus on zoome, plus le décalage en DEGRÉS est petit', () => {
  const lat = 48.8674;
  const sheet = 300;
  const d13 = lat - zoneFocusLat({ lat, zoom: 13, sheetHeightPx: sheet });
  const d16 = lat - zoneFocusLat({ lat, zoom: 16, sheetHeightPx: sheet });
  assert(d13 > d16, 'un pixel vaut moins de degrés quand on zoome');
  // Facteur 2 par niveau de zoom (Mercator) — à la déformation de latitude près.
  assert(d13 / d16 > 6 && d13 / d16 < 9, `rapport inattendu : ${d13 / d16}`);
});

Deno.test('zoneFocusLat : même hauteur de sheet, le décalage en degrés DÉPEND de la latitude', () => {
  // C'est précisément ce qu'une conversion « px → degrés » naïve rate : à 60° de
  // latitude, un pixel couvre deux fois moins de degrés qu'à l'équateur.
  const sheet = 300;
  const zoom = 14;
  const eq = 0.0001 - zoneFocusLat({ lat: 0.0001, zoom, sheetHeightPx: sheet });
  const north = 60 - zoneFocusLat({ lat: 60, zoom, sheetHeightPx: sheet });
  assert(north < eq, 'à 60°, le même déplacement écran vaut moins de degrés');
});

Deno.test('worldSizePx : 512 px au zoom 0, doublement par niveau, jamais négatif', () => {
  assertEquals(worldSizePx(0), 512);
  assertEquals(worldSizePx(1), 1024);
  assertEquals(worldSizePx(10), 512 * 1024);
  assertEquals(worldSizePx(-3), 512, 'un zoom négatif est borné à 0');
});
