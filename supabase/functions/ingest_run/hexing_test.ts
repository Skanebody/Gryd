/**
 * Tests hexing.ts — trace → cellules H3 res 10 (SPEC §3.1).
 * Purs : h3-js est déterministe, aucune I/O.
 */
import { assert, assertEquals } from 'jsr:@std/assert@^1';
import { cellToLatLng, getResolution, latLngToCell } from 'npm:h3-js@^4.1';
import { H3_RESOLUTION } from '../_shared/game-rules.ts';
import { hexesForSegments, pointInGeoJson } from './hexing.ts';
import { haversineM } from './validation.ts';
import type { RunPoint } from '../_shared/types.ts';

const LAT0 = 48.8566;
const LNG0 = 2.3522;
const M_PER_DEG_LAT = 111_195;

function line(distanceM: number, n: number): RunPoint[] {
  return Array.from({ length: n }, (_, i) => ({
    lat: LAT0 + (distanceM * (i / (n - 1))) / M_PER_DEG_LAT,
    lng: LNG0,
    t: i * 5000,
  }));
}

Deno.test('ligne de 600 m → chapelet continu de cellules res 10, dédupliqué', () => {
  const cells = hexesForSegments([line(600, 13)]); // 1 point tous les 50 m
  assert(cells.length >= 5, `600 m ≈ ≥ 5 hexes de ~115 m de large, obtenu ${cells.length}`);
  assertEquals(new Set(cells).size, cells.length, 'doublons détectés');
  for (const c of cells) assertEquals(getResolution(c), H3_RESOLUTION);
  // Les cellules des extrémités sont incluses.
  assert(cells.includes(latLngToCell(LAT0, LNG0, H3_RESOLUTION)));
  assert(cells.includes(latLngToCell(LAT0 + 600 / M_PER_DEG_LAT, LNG0, H3_RESOLUTION)));
});

Deno.test('points GPS espacés (trou d’échantillonnage) → gridPathCells comble la ligne', () => {
  // 2 points distants de 300 m : les hexes du milieu (> 60 m de chaque point,
  // donc hors buffer 15 m des extrémités) ne peuvent venir que de gridPathCells.
  const a = { lat: LAT0, lng: LNG0, t: 0 };
  const b = { lat: LAT0 + 300 / M_PER_DEG_LAT, lng: LNG0, t: 90_000 };
  const cells = hexesForSegments([[a, b]]);
  assert(cells.length >= 3, `300 m devraient traverser ≥ 3 hexes, obtenu ${cells.length}`);
  const middle = cells.filter((c) => {
    const [lat, lng] = cellToLatLng(c);
    return haversineM({ lat, lng }, a) > 60 && haversineM({ lat, lng }, b) > 60;
  });
  assert(middle.length >= 1, 'aucune cellule intermédiaire : la ligne H3 n’est pas comblée');
});

Deno.test('buffer 15 m : un point à ~5 m d’une frontière inclut l’hex voisin', () => {
  // On se place au centre d'un hex puis on approche une frontière : le buffer
  // doit ajouter au moins un hex voisin en plus de l'hex du point.
  const center = cellToLatLng(latLngToCell(LAT0, LNG0, H3_RESOLUTION));
  // ~60 m vers le nord depuis le centre → près/au-delà d'une frontière (arête ~66 m).
  const nearEdge = { lat: center[0] + 60 / M_PER_DEG_LAT, lng: center[1], t: 0 };
  const cells = hexesForSegments([[nearEdge, { ...nearEdge, t: 5000 }]]);
  assert(cells.length >= 2, `attendu l'hex du point + voisin(s) via buffer, obtenu ${cells.length}`);
});

Deno.test('segments multiples → union dédupliquée', () => {
  const seg = line(200, 5);
  const cells = hexesForSegments([seg, seg]);
  assertEquals(new Set(cells).size, cells.length);
});

Deno.test('pointInGeoJson : Polygon avec trou + MultiPolygon', () => {
  const donut = {
    type: 'Polygon' as const,
    coordinates: [
      [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]], // extérieur
      [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]], // trou
    ],
  };
  assert(pointInGeoJson(2, 2, donut)); // dans l'anneau plein
  assert(!pointInGeoJson(5, 5, donut)); // dans le trou
  assert(!pointInGeoJson(20, 20, donut)); // dehors
  const multi = {
    type: 'MultiPolygon' as const,
    coordinates: [
      [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]],
      [[[8, 8], [9, 8], [9, 9], [8, 9], [8, 8]]],
    ],
  };
  assert(pointInGeoJson(1, 1, multi));
  assert(pointInGeoJson(8.5, 8.5, multi));
  assert(!pointInGeoJson(5, 5, multi));
});
