/**
 * Tests sectorSnapshot.ts — PRÉ-CALCUL par SECTEUR (§C, AMENDEMENT-41 §2).
 * Roule les lignes `sector_control` (crew, %) en owner/rival/neutre, puis dérive
 * pression + statut via le moteur §C gelé. PURE. Import de la copie _shared/engine.
 */
import { assert, assertEquals, assertFalse } from 'jsr:@std/assert@^1';
import { SECTOR_CONTROL_THRESHOLDS } from '../_shared/game-rules.ts';
import {
  computeSectorSnapshot,
  rollupSectorControl,
} from '../_shared/engine/sectorSnapshot.ts';

/** Horloge fixe des tests de plancher/solo (déterminisme). */
const NOW_FLOOR = new Date('2026-07-22T12:00:00Z');

// ─── rollupSectorControl : owner = max, rival = 2e, neutre = 1 − Σ ──────────────

Deno.test('rollup : owner majoritaire, rival principal, neutre = reste', () => {
  const r = rollupSectorControl([
    { crewId: 'B', controlPercent: 0.35 },
    { crewId: 'A', controlPercent: 0.5 },
    { crewId: 'C', controlPercent: 0.05 },
  ]);
  assertEquals(r.ownerCrewId, 'A');
  assertEquals(r.ownerKind, 'crew');
  assertEquals(r.ownerPercent, 0.5);
  assertEquals(r.topRivalCrewId, 'B');
  assertEquals(r.topRivalPercent, 0.35);
  // C (5 %) est SOUS le plancher de domination (implantation = 10 %) : sa part
  // n'est pas « tenue » à l'échelle du secteur, elle rejoint le neutre.
  // neutre = 1 − (0.5 + 0.35) = 0.15 (à l'epsilon flottant près)
  assert(Math.abs(r.neutralPercent - 0.15) < 1e-9);
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

// ─── PLANCHER DE DOMINATION (SECTOR_CONTROL_THRESHOLDS.implantation) ───────────
// Un secteur res-7 ≈ 343 hexes res-10 : sans plancher, une seule capture
// suffirait à peindre « détenu par X ». C'est la domination fabriquée qu'on
// interdit ici — le seuil vient de game-rules, jamais d'un nombre local.

const FLOOR = SECTOR_CONTROL_THRESHOLDS.implantation;

Deno.test('plancher : 1 hex sur 343 → secteur NEUTRE (aucun propriétaire)', () => {
  const r = rollupSectorControl([{ crewId: 'A', controlPercent: 1 / 343 }]);
  assertEquals(r.ownerCrewId, null);
  assertEquals(r.ownerKind, null);
  assertEquals(r.ownerId, null);
  assertEquals(r.ownerPercent, 0);
  assertEquals(r.topRivalCrewId, null);
  assertEquals(r.neutralPercent, 1, 'la part sous plancher bascule en neutre');
});

Deno.test('plancher : part EXACTEMENT au seuil → propriétaire retenu', () => {
  const r = rollupSectorControl([{ crewId: 'A', controlPercent: FLOOR }]);
  assertEquals(r.ownerCrewId, 'A');
  assertEquals(r.ownerPercent, FLOOR);
  assert(Math.abs(r.neutralPercent - (1 - FLOOR)) < 1e-9);
});

Deno.test('plancher : juste EN DESSOUS du seuil → aucun propriétaire', () => {
  const r = rollupSectorControl([{ crewId: 'A', controlPercent: FLOOR - 0.001 }]);
  assertEquals(r.ownerCrewId, null);
  assertEquals(r.ownerPercent, 0);
  assertEquals(r.neutralPercent, 1);
});

Deno.test('plancher : rival sous le seuil → owner gardé, rival effacé (neutre)', () => {
  const r = rollupSectorControl([
    { crewId: 'A', controlPercent: 0.6 },
    { crewId: 'B', controlPercent: 0.02 },
  ]);
  assertEquals(r.ownerCrewId, 'A');
  assertEquals(r.topRivalCrewId, null);
  assertEquals(r.topRivalKind, null);
  assertEquals(r.topRivalPercent, 0);
  assert(Math.abs(r.neutralPercent - 0.4) < 1e-9);
});

Deno.test('plancher : snapshot d’un secteur à peine effleuré → neutre et stable', () => {
  const s = computeSectorSnapshot([{ crewId: 'A', controlPercent: 3 / 343 }], {}, NOW_FLOOR);
  assertEquals(s.ownerCrewId, null);
  assertEquals(s.ownerKind, null);
  assertEquals(s.neutralPercent, 1);
  assertEquals(s.pressureScore, 0);
  assertEquals(s.statusLevel, 0);
  assertFalse(s.contested);
});

// ─── DÉTENTEUR SOLO : un joueur sans crew EXISTE (il n'est pas du neutre) ──────

Deno.test('solo : joueur sans crew propriétaire → ownerKind user, jamais neutre', () => {
  const r = rollupSectorControl([{ userId: 'U1', controlPercent: 0.45 }]);
  assertEquals(r.ownerKind, 'user');
  assertEquals(r.ownerId, 'U1');
  assertEquals(r.ownerUserId, 'U1');
  assertEquals(r.ownerCrewId, null, 'un solo n’a pas de crew — et ce n’est pas « personne »');
  assertEquals(r.ownerPercent, 0.45);
  assert(Math.abs(r.neutralPercent - 0.55) < 1e-9);
});

Deno.test('solo : crew vs joueur solo → owner et rival de types différents', () => {
  const r = rollupSectorControl([
    { userId: 'U1', controlPercent: 0.5 },
    { crewId: 'A', controlPercent: 0.3 },
  ]);
  assertEquals(r.ownerKind, 'user');
  assertEquals(r.ownerUserId, 'U1');
  assertEquals(r.ownerCrewId, null);
  assertEquals(r.topRivalKind, 'crew');
  assertEquals(r.topRivalCrewId, 'A');
  assertEquals(r.topRivalUserId, null);
});

Deno.test('solo : deux joueurs sans crew coude-à-coude → contesté (moteur §C)', () => {
  const s = computeSectorSnapshot(
    [
      { userId: 'U1', controlPercent: 0.45 },
      { userId: 'U2', controlPercent: 0.4 },
    ],
    {},
    NOW_FLOOR,
  );
  assertEquals(s.ownerUserId, 'U1');
  assertEquals(s.topRivalUserId, 'U2');
  assert(s.contested, 'la tension owner↔rival ne dépend pas de l’existence d’un crew');
  assert(s.statusLevel >= 2);
});

Deno.test('solo : ligne sans identifiant → ignorée (jamais d’owner fantôme)', () => {
  const r = rollupSectorControl([
    { crewId: null, userId: null, controlPercent: 0.9 },
    { crewId: 'A', controlPercent: 0.2 },
  ]);
  assertEquals(r.ownerCrewId, 'A');
  assertEquals(r.ownerPercent, 0.2);
  assert(Math.abs(r.neutralPercent - 0.8) < 1e-9);
});

Deno.test('déterminisme : à part ÉGALE, l’owner ne change pas d’un run à l’autre', () => {
  const a = rollupSectorControl([
    { crewId: 'B', controlPercent: 0.4 },
    { crewId: 'A', controlPercent: 0.4 },
  ]);
  const b = rollupSectorControl([
    { crewId: 'A', controlPercent: 0.4 },
    { crewId: 'B', controlPercent: 0.4 },
  ]);
  assertEquals(a.ownerCrewId, b.ownerCrewId);
  assertEquals(a.topRivalCrewId, b.topRivalCrewId);
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
