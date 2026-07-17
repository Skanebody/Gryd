/**
 * Tests sectorSnapshot.ts — PRÉ-CALCUL par SECTEUR (§C, AMENDEMENT-41 §2).
 * Roule les lignes `sector_control` (crew, %) en owner/rival/neutre, puis dérive
 * pression + statut via le moteur §C gelé. PURE. Import de la copie _shared/engine.
 */
import { assert, assertEquals, assertFalse } from 'jsr:@std/assert@^1';
import {
  computeSectorSnapshot,
  rollupSectorControl,
} from '../_shared/engine/sectorSnapshot.ts';

// ─── rollupSectorControl : owner = max, rival = 2e, neutre = 1 − Σ ──────────────

Deno.test('rollup : owner majoritaire, rival principal, neutre = reste', () => {
  const r = rollupSectorControl([
    { crewId: 'B', controlPercent: 0.35 },
    { crewId: 'A', controlPercent: 0.5 },
    { crewId: 'C', controlPercent: 0.05 },
  ]);
  assertEquals(r.ownerCrewId, 'A');
  assertEquals(r.ownerPercent, 0.5);
  assertEquals(r.topRivalCrewId, 'B');
  assertEquals(r.topRivalPercent, 0.35);
  // neutre = 1 − (0.5 + 0.35 + 0.05) = 0.10 (à l'epsilon flottant près)
  assert(Math.abs(r.neutralPercent - 0.1) < 1e-9);
});

Deno.test('rollup : un seul crew → pas de rival, neutre = 1 − owner', () => {
  const r = rollupSectorControl([{ crewId: 'A', controlPercent: 0.4 }]);
  assertEquals(r.ownerCrewId, 'A');
  assertEquals(r.topRivalCrewId, null);
  assertEquals(r.topRivalPercent, 0);
  assert(Math.abs(r.neutralPercent - 0.6) < 1e-9);
});

Deno.test('rollup : secteur vide → tout neutre', () => {
  const r = rollupSectorControl([]);
  assertEquals(r.ownerCrewId, null);
  assertEquals(r.ownerPercent, 0);
  assertEquals(r.neutralPercent, 1);
});

Deno.test('rollup : parts nulles ignorées, sur-somme bornée (neutre ≥ 0)', () => {
  const r = rollupSectorControl([
    { crewId: 'A', controlPercent: 0.7 },
    { crewId: 'B', controlPercent: 0.6 }, // total > 1 (arrondis) → neutre borné à 0
    { crewId: 'Z', controlPercent: 0 },
  ]);
  assertEquals(r.ownerCrewId, 'A');
  assertEquals(r.topRivalCrewId, 'B');
  assertEquals(r.neutralPercent, 0);
});

// ─── computeSectorSnapshot : pression + statut viewer-indépendants ──────────────

const NOW = new Date('2026-07-17T12:00:00Z');

Deno.test('snapshot : secteur coude-à-coude → contesté, statut ≥ contestée (2)', () => {
  const s = computeSectorSnapshot(
    [
      { crewId: 'A', controlPercent: 0.45 },
      { crewId: 'B', controlPercent: 0.4 },
    ],
    {},
    NOW,
  );
  assertEquals(s.ownerCrewId, 'A');
  assertEquals(s.topRivalCrewId, 'B');
  assert(s.contested, 'écart < 15 pts avec rival présent → contesté');
  assert(s.statusLevel >= 2, `statut attendu ≥ 2, reçu ${s.statusLevel}`);
});

Deno.test('snapshot : secteur dominé → non contesté, statut stable (0)', () => {
  const s = computeSectorSnapshot(
    [
      { crewId: 'A', controlPercent: 0.92 },
      { crewId: 'B', controlPercent: 0.03 },
    ],
    {},
    NOW,
  );
  assertFalse(s.contested);
  assertEquals(s.statusLevel, 0);
  assertEquals(s.pressureScore, 0);
});

Deno.test('snapshot : secteur vide → owner null, pression 0, stable', () => {
  const s = computeSectorSnapshot([], {}, NOW);
  assertEquals(s.ownerCrewId, null);
  assertEquals(s.pressureScore, 0);
  assertEquals(s.statusLevel, 0);
});

Deno.test('snapshot : attaque rival RÉCENTE sur secteur tendu → statut escalade (≥ 3)', () => {
  const s = computeSectorSnapshot(
    [
      { crewId: 'A', controlPercent: 0.45 },
      { crewId: 'B', controlPercent: 0.4 },
    ],
    { lastAttackAt: new Date(NOW.getTime() - 60 * 60 * 1000), rivalActivityRecent: 8, zonesLostRecent: 5 },
    NOW,
  );
  assert(s.statusLevel >= 3, `attaque active sur secteur tendu → statut ≥ 3, reçu ${s.statusLevel}`);
  assert(s.pressureScore > 0);
});
