/**
 * GRYD — E07/E08 : tests de la géométrie de la vue live. Ce qui doit tenir :
 * l'ancrage à 62 % pose VRAIMENT le coureur à 62 % (sinon « l'espace devant »
 * de la planche est un mensonge visuel), la projection de surimpression est
 * exactement celle de la carte (aller-retour), et la vitesse « élevée » vient
 * d'une MESURE et d'une constante de jeu, jamais d'un seuil posé à la main.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { ACTIVITY_REFERENCE_SPEED_KMH } from '@klaim/shared';
import {
  HIGH_SPEED_MPS,
  isHighSpeed,
  liveCameraCenter,
  metersPerPixel,
  projectOnScreen,
  recentSpeedMps,
  uncertainLinks,
  type LatLng,
} from './liveView.ts';

const PARIS = { lat: 48.8674, lng: 2.3636 };
const BOX = { width: 390, height: 844 }; // gabarit iPhone en points
const ZOOM = 16;

Deno.test('metersPerPixel : convention MapLibre (tuiles 512), décroît avec le zoom', () => {
  // À l'équateur z0 : 40 075 016,686 / 512 ≈ 78 271 m/px.
  const eq = metersPerPixel(0, 0);
  assert(Math.abs(eq - 78_271.5) < 1, `${eq} ≉ 78 271,5`);
  // Un zoom de plus = deux fois plus fin.
  assert(Math.abs(metersPerPixel(0, 1) * 2 - eq) < 0.001);
  // La latitude resserre l'échelle (cos φ).
  assert(metersPerPixel(60, 12) < metersPerPixel(0, 12));
});

Deno.test('ancrage 62 % : le coureur tombe VRAIMENT à 62 % de la hauteur', () => {
  const anchor = 0.62;
  const center = liveCameraCenter(PARIS, ZOOM, BOX, anchor);
  const screen = projectOnScreen(PARIS, { ...center, zoom: ZOOM }, BOX);
  assert(
    Math.abs(screen.y - anchor * BOX.height) < 0.5,
    `y=${screen.y} ≠ ${anchor * BOX.height}`,
  );
  // Décalage strictement vertical : la longitude ne bouge pas.
  assertEquals(center.lng, PARIS.lng);
  assert(Math.abs(screen.x - BOX.width / 2) < 0.001);
  // « Espace devant » : le centre de caméra est au NORD du coureur.
  assert(center.lat > PARIS.lat);
});

Deno.test('ancrage 0,5 = caméra centrée (non-régression du cas neutre)', () => {
  const center = liveCameraCenter(PARIS, ZOOM, BOX, 0.5);
  assert(Math.abs(center.lat - PARIS.lat) < 1e-9);
  const screen = projectOnScreen(PARIS, { ...center, zoom: ZOOM }, BOX);
  assert(Math.abs(screen.y - BOX.height / 2) < 0.001);
});

Deno.test('projection : un point au nord-est monte et va à droite, à l’échelle', () => {
  const camera = { ...PARIS, zoom: ZOOM };
  const north = projectOnScreen({ lat: PARIS.lat + 0.001, lng: PARIS.lng }, camera, BOX);
  const east = projectOnScreen({ lat: PARIS.lat, lng: PARIS.lng + 0.001 }, camera, BOX);
  assert(north.y < BOX.height / 2, 'le nord doit monter');
  assert(east.x > BOX.width / 2, 'l’est doit aller à droite');
  // ~111 m de latitude convertis en pixels via la résolution locale.
  const expectedPx = 111_320 * 0.001 / metersPerPixel(PARIS.lat, ZOOM);
  assert(Math.abs(BOX.height / 2 - north.y - expectedPx) < 1.5);
});

Deno.test('recentSpeedMps : mesurée sur la fenêtre, null si rien d’exploitable', () => {
  const t0 = 1_700_000_000_000;
  // ~10 m entre chaque point, 2 s d'intervalle → ~5 m/s.
  const pts = [0, 1, 2, 3, 4].map((i) => ({
    lat: PARIS.lat + i * 0.00009,
    lng: PARIS.lng,
    ts: t0 + i * 2_000,
  }));
  const now = t0 + 8_000;
  const v = recentSpeedMps(pts, now, 10_000);
  assert(v !== null && Math.abs(v - 5) < 0.6, `v=${v} ≉ 5 m/s`);
  assertEquals(recentSpeedMps([], now, 10_000), null);
  assertEquals(recentSpeedMps([pts[0]!], now, 10_000), null);
  // Plus AUCUN fix récent (le GPS s'est tu) : on ne prolonge pas la dernière
  // vitesse connue — on ne sait plus, et on le dit.
  assertEquals(recentSpeedMps(pts, t0 + 600_000, 10_000), null);
  // Fenêtre plus courte qu'un intervalle : la mesure porte sur la dernière
  // portion RÉELLE (bornes incluses), jamais sur une extrapolation.
  const last = recentSpeedMps(pts, now, 500);
  assert(last !== null && Math.abs(last - 5) < 0.6, `dernière portion ${last} ≉ 5 m/s`);
});

Deno.test('recentSpeedMps : un TROU de signal ne devient jamais de la vitesse', () => {
  const t0 = 1_700_000_000_000;
  const pts = [
    { lat: PARIS.lat, lng: PARIS.lng, ts: t0 },
    // 1 km plus loin après un trou : segment marqué, donc ignoré.
    { lat: PARIS.lat + 0.009, lng: PARIS.lng, ts: t0 + 2_000, gapBefore: true as const },
    { lat: PARIS.lat + 0.00909, lng: PARIS.lng, ts: t0 + 4_000 },
  ];
  const v = recentSpeedMps(pts, t0 + 4_000, 10_000);
  assert(v !== null && v < 10, `le trou a fabriqué ${v} m/s`);
});

Deno.test('liens incertains : UN par trou de signal (max(0, n−1)), rien d’inventé', () => {
  const p = (n: number): LatLng[] => [
    { lat: PARIS.lat + n * 0.001, lng: PARIS.lng },
    { lat: PARIS.lat + n * 0.001, lng: PARIS.lng + 0.0005 },
  ];
  // Trois tronçons mesurés → deux trous → deux liens.
  const three = uncertainLinks([p(0), p(1), p(2)]);
  assertEquals(three.length, 2);
  // Chaque lien relie la FIN du tronçon précédent au DÉBUT du suivant : il
  // matérialise le trou, il n'invente aucun point.
  assertEquals(three[0], [p(0)[1], p(1)[0]]);
  assertEquals(three[1], [p(1)[1], p(2)[0]]);
  // Un seul tronçon (ou aucun) : rien à relier — jamais un connecteur fantôme.
  assertEquals(uncertainLinks([p(0)]).length, 0);
  assertEquals(uncertainLinks([]).length, 0);
});

Deno.test('liens incertains : un tronçon VIDE n’ouvre pas de lien fantôme', () => {
  const seg: LatLng[] = [
    { lat: PARIS.lat, lng: PARIS.lng },
    { lat: PARIS.lat, lng: PARIS.lng + 0.0005 },
  ];
  // Le tronçon du milieu est vide (aucun point d'accroche) : aucun des deux
  // trous adjacents ne peut être relié honnêtement → zéro lien.
  assertEquals(uncertainLinks([seg, [], seg]).length, 0);
  // Un tronçon vide en tête : le premier lien exploitable disparaît aussi.
  assertEquals(uncertainLinks([[], seg]).length, 0);
});

Deno.test('vitesse élevée : seuil = allure de référence VÉLO (constante de jeu)', () => {
  assertEquals(HIGH_SPEED_MPS, (ACTIVITY_REFERENCE_SPEED_KMH.bike * 1000) / 3600);
  assertEquals(isHighSpeed(HIGH_SPEED_MPS), false);
  assertEquals(isHighSpeed(HIGH_SPEED_MPS + 0.1), true);
  // Vitesse inconnue : on ne réduit JAMAIS sur une supposition.
  assertEquals(isHighSpeed(null), false);
});
