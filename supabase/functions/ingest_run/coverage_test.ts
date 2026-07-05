/**
 * Tests coverage.ts — DÉFENSE GRADUÉE (AMENDEMENT-23 §D, doc §16/§17).
 * Frontier coverage % + niveau de défense + heures de stabilité. Purs.
 */
import { assert, assertEquals } from 'jsr:@std/assert@^1';
import {
  DEFENSE_COVER_FULL_MIN,
  DEFENSE_COVER_LONGE_MIN,
  DEFENSE_HOURS_COVER,
  DEFENSE_HOURS_LONGE,
  DEFENSE_HOURS_TRAVERSE,
  FRONTIER_COVERAGE_BUFFER_M,
} from '../_shared/game-rules.ts';
import {
  defenseHoursForCoverage,
  defenseLevel,
  defenseStabilityHours,
  frontierCoverage,
} from '../_shared/engine/coverage.ts';
import type { LatLngPoint } from '../_shared/engine/hexing.ts';

// Repère Paris. À cette latitude, 1° lng ≈ 73 300 m, 1° lat ≈ 111 320 m.
const BASE_LAT = 48.8566;
const BASE_LNG = 2.3522;
const M_PER_DEG_LAT = 111_320;
const M_PER_DEG_LNG = 73_300; // ≈ cos(48,8566°) × 111 320

/** Point à `east`/`north` mètres de la base. */
function pt(east: number, north: number): LatLngPoint {
  return { lat: BASE_LAT + north / M_PER_DEG_LAT, lng: BASE_LNG + east / M_PER_DEG_LNG };
}

// ─── frontierCoverage ────────────────────────────────────────────────────────

Deno.test('frontière entièrement couverte : tracé confondu avec la frontière → 1', () => {
  const frontier = [pt(0, 0), pt(200, 0), pt(400, 0)];
  const trace = [pt(0, 0), pt(200, 0), pt(400, 0)]; // même ligne
  const cov = frontierCoverage(frontier, trace);
  assertEquals(Math.round(cov * 100) / 100, 1);
});

Deno.test('frontière NON couverte : tracé à 500 m (≫ buffer 30 m) → 0', () => {
  const frontier = [pt(0, 0), pt(400, 0)];
  const trace = [pt(0, 500), pt(400, 500)]; // 500 m au nord
  assertEquals(frontierCoverage(frontier, trace), 0);
  assertEquals(FRONTIER_COVERAGE_BUFFER_M, 30);
});

Deno.test('frontière à MOITIÉ couverte : tracé sur la 1re moitié seulement → ~0,5', () => {
  // Frontière 400 m est-ouest ; tracé couvre les 200 premiers mètres.
  const frontier = [pt(0, 0), pt(200, 0), pt(400, 0)];
  const trace = [pt(0, 0), pt(100, 0), pt(200, 0)];
  const cov = frontierCoverage(frontier, trace);
  // La portion [0,200] est couverte ; [200,400] non. ≈ 0,5 (± échantillonnage).
  assert(cov > 0.4 && cov < 0.6, `couverture ${cov} attendue ~0,5`);
});

Deno.test('buffer 30 m : un tracé parallèle à 20 m couvre ; à 50 m ne couvre pas', () => {
  const frontier = [pt(0, 0), pt(400, 0)];
  const near = [pt(0, 20), pt(400, 20)]; // 20 m ≤ 30 → couvert
  const far = [pt(0, 50), pt(400, 50)]; // 50 m > 30 → non couvert
  assert(frontierCoverage(frontier, near) > 0.9, 'parallèle à 20 m doit couvrir');
  assertEquals(frontierCoverage(frontier, far), 0);
});

Deno.test('frontière/tracé dégénérés → 0 (jamais de NaN)', () => {
  assertEquals(frontierCoverage([], [pt(0, 0)]), 0);
  assertEquals(frontierCoverage([pt(0, 0)], [pt(0, 0)]), 0); // < 2 points de frontière
  assertEquals(frontierCoverage([pt(0, 0), pt(100, 0)], []), 0);
});

// ─── defenseLevel + heures ───────────────────────────────────────────────────

Deno.test('niveaux de défense par couverture (doc §16) — seuils 0,40 / 0,80', () => {
  assertEquals(DEFENSE_COVER_LONGE_MIN, 0.4);
  assertEquals(DEFENSE_COVER_FULL_MIN, 0.8);
  assertEquals(defenseLevel(0), 'traverse');
  assertEquals(defenseLevel(0.39), 'traverse');
  assertEquals(defenseLevel(0.4), 'longe'); // borne incluse
  assertEquals(defenseLevel(0.79), 'longe');
  assertEquals(defenseLevel(0.8), 'cover'); // borne incluse
  assertEquals(defenseLevel(1), 'cover');
});

Deno.test('boucle fermée sur la zone → défense maximale (cover) quelle que soit la couverture', () => {
  assertEquals(defenseLevel(0, true), 'cover'); // doc §16 niveau 3 « refaire la boucle »
  assertEquals(defenseLevel(0.1, true), 'cover');
});

Deno.test('heures de stabilité par niveau (doc §25) — 24 / 48 / 72', () => {
  assertEquals(defenseStabilityHours('traverse'), DEFENSE_HOURS_TRAVERSE);
  assertEquals(defenseStabilityHours('longe'), DEFENSE_HOURS_LONGE);
  assertEquals(defenseStabilityHours('cover'), DEFENSE_HOURS_COVER);
  assertEquals(DEFENSE_HOURS_TRAVERSE, 24);
  assertEquals(DEFENSE_HOURS_LONGE, 48);
  assertEquals(DEFENSE_HOURS_COVER, 72);
});

Deno.test('defenseHoursForCoverage combine niveau + heures (raccourci)', () => {
  assertEquals(defenseHoursForCoverage(0.2), 24); // traverse
  assertEquals(defenseHoursForCoverage(0.5), 48); // longe
  assertEquals(defenseHoursForCoverage(0.9), 72); // cover
  assertEquals(defenseHoursForCoverage(0.1, true), 72); // boucle fermée → cover
});
