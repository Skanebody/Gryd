/**
 * GRYD — LOT 1, étape 4 : tests de `territoriesSource.ts`, le module qui fait
 * lire à la carte le POLYGONE de la trace au lieu d'un contour d'hexagones.
 *
 * Deno, aucun réseau, aucun mock : on importe DIRECTEMENT le module de prod
 * (comme territoryBuild.test.ts) → zéro drift.
 *
 * Ce que ces tests VERROUILLENT, parce que ce sont exactement les régressions
 * qui feraient MENTIR la carte :
 *   • l'aire affichée vient de la TABLE, jamais d'un recalcul client ;
 *   • la géométrie EXACTE d'autrui ne sort jamais (§12.3) ;
 *   • une capture sans polygone n'est JAMAIS effacée (transition sans perte) ;
 *   • une capture recouverte par son polygone n'est JAMAIS repeinte en hexagones ;
 *   • « lecture en cours » n'est jamais confondu avec « vide » ni avec « échec ».
 */
import { assert, assertEquals, assertNotEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { cellToLatLng, latLngToCell } from 'h3-js';
import {
  buildPolygonTerritories,
  complementClaims,
  mergeTerritorySources,
  parsePolygonRings,
  pickRenderGeometry,
  rowToTerritory,
  splitTerritoryRowsByActivity,
  territoryReadPhase,
  territoryRole,
  TERRITORY_SELECT_COLUMNS,
  type TerritoryDbState,
  type TerritoryRow,
} from './territoriesSource.ts';
import type { HexClaimRow } from './territoryBuild.ts';

const ME = 'me-uuid';
const RIVAL = 'rival-uuid';
const CREW = 'crew-uuid';
const NOW = '2026-07-27T10:00:00.000Z';
const H3_RES = 10;

/** Encodage EXACT d'ingest_run : la cellule H3 est stockée en BIGINT. */
const h3ToDb = (h: string): string => BigInt('0x' + h).toString();

/** Un carré fermé (norme GeoJSON) autour d'un point, en degrés. */
function squareGeoJson(lat: number, lng: number, d: number): unknown {
  return {
    type: 'Polygon',
    coordinates: [
      [
        [lng - d, lat - d],
        [lng + d, lat - d],
        [lng + d, lat + d],
        [lng - d, lat + d],
        [lng - d, lat - d],
      ],
    ],
  };
}

/** République — le repère des tests de territoire du dépôt. */
const REP_LAT = 48.8674;
const REP_LNG = 2.3636;

function row(over: Partial<TerritoryRow> = {}): TerritoryRow {
  return {
    id: 'terr-1',
    activity: 'run',
    owner_type: 'user',
    owner_id: ME,
    geometry: squareGeoJson(REP_LAT, REP_LNG, 0.004),
    geometry_generalized: squareGeoJson(REP_LAT, REP_LNG, 0.005),
    area_m2: 123_456,
    state: 'owned_personal',
    defense_level: 0,
    controlled_since: '2026-07-26T08:00:00.000Z',
    publish_after: '2026-07-26T09:00:00.000Z',
    source_run_id: 'run-1',
    ...over,
  };
}

function claim(cell: string, owner: string | null, decayAt: string | null = null): HexClaimRow {
  return {
    h3index: h3ToDb(cell),
    owner_user_id: owner,
    claim_type: 'claim',
    decay_at: decayAt,
    claimed_at: '2026-07-26T08:00:00.000Z',
  };
}

// ─── 1. LECTURE DE LA GÉOMÉTRIE ─────────────────────────────────────────────

Deno.test('parsePolygonRings : le GeoJSON fermé de la base ressort OUVERT', () => {
  const rings = parsePolygonRings(squareGeoJson(REP_LAT, REP_LNG, 0.001));
  assert(rings !== null);
  assertEquals(rings.length, 1);
  // 5 positions en base (anneau fermé) → 4 sommets distincts en sortie.
  assertEquals(rings[0]?.length, 4);
  const first = rings[0]?.[0];
  const last = rings[0]?.[3];
  assert(first && last);
  assertNotEquals(`${first[0]},${first[1]}`, `${last[0]},${last[1]}`);
});

Deno.test('parsePolygonRings : ordre GeoJSON [lng, lat] préservé, pas inversé', () => {
  const rings = parsePolygonRings(squareGeoJson(REP_LAT, REP_LNG, 0.001));
  const pt = rings?.[0]?.[0];
  assert(pt);
  // lng ≈ 2,36 et lat ≈ 48,87 : une inversion sauterait aux yeux ici.
  assert(Math.abs(pt[0] - (REP_LNG - 0.001)) < 1e-9, 'position[0] doit être la longitude');
  assert(Math.abs(pt[1] - (REP_LAT - 0.001)) < 1e-9, 'position[1] doit être la latitude');
});

Deno.test('parsePolygonRings : les TROUS sont conservés (un trou perdu ferait mentir la carte)', () => {
  const withHole = {
    type: 'Polygon',
    coordinates: [
      [[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]],
      [[0.4, 0.4], [0.4, 0.6], [0.6, 0.6], [0.6, 0.4], [0.4, 0.4]],
    ],
  };
  const rings = parsePolygonRings(withHole);
  assertEquals(rings?.length, 2);
});

Deno.test('parsePolygonRings : ce qui n’est pas un Polygon lisible ne donne AUCUNE forme', () => {
  for (const bad of [
    null,
    undefined,
    42,
    'Polygon',
    {},
    { type: 'Polygon' },
    { type: 'MultiPolygon', coordinates: [] },
    { type: 'Polygon', coordinates: 'nope' },
    { type: 'Polygon', coordinates: [[['a', 'b']]] },
    { type: 'Polygon', coordinates: [[[0, 0], [1, 1]]] }, // 2 sommets : pas une surface
    { type: 'Polygon', coordinates: [[[0, Number.NaN], [1, 1], [2, 2]]] },
  ]) {
    assertEquals(parsePolygonRings(bad), null, `devrait être refusé : ${JSON.stringify(bad)}`);
  }
});

// ─── 2. §12.3 — LA GÉOMÉTRIE EXACTE D'AUTRUI NE SORT JAMAIS ─────────────────

Deno.test('pickRenderGeometry : MON territoire est rendu avec la géométrie EXACTE', () => {
  const picked = pickRenderGeometry(row(), ME);
  assertEquals(picked?.precision, 'exact');
});

Deno.test('pickRenderGeometry : le territoire d’un RIVAL est rendu GÉNÉRALISÉ (§12.3)', () => {
  const picked = pickRenderGeometry(row({ owner_id: RIVAL }), ME);
  assertEquals(picked?.precision, 'generalized');
});

Deno.test('pickRenderGeometry : sans version publique, le rival n’est PAS rendu — jamais sa trace exacte', () => {
  const picked = pickRenderGeometry(row({ owner_id: RIVAL, geometry_generalized: null }), ME);
  assertEquals(picked, null);
});

Deno.test('pickRenderGeometry : un crew propriétaire est traité comme le public', () => {
  const picked = pickRenderGeometry(
    row({ owner_type: 'crew', owner_id: CREW, state: 'owned_crew' }),
    ME,
  );
  assertEquals(picked?.precision, 'generalized');
});

Deno.test('pickRenderGeometry : déconnecté (meId null), rien n’est « à moi » — pas d’exact', () => {
  assertEquals(pickRenderGeometry(row(), null)?.precision, 'generalized');
});

// ─── 3. RÔLES (§C : couleur par RÔLE, jamais par identité) ──────────────────

Deno.test('territoryRole : moi = crew, autre = rival, contesté prime sur la propriété', () => {
  assertEquals(territoryRole(row(), ME), 'crew');
  assertEquals(territoryRole(row({ owner_id: RIVAL }), ME), 'rival');
  assertEquals(territoryRole(row({ owner_id: RIVAL, state: 'contested' }), ME), 'contested');
  assertEquals(territoryRole(row({ state: 'contested' }), ME), 'contested');
});

Deno.test('territoryRole : un territoire de MON CREW porte le rôle chartreuse', () => {
  const r = row({ owner_type: 'crew', owner_id: CREW, state: 'owned_crew' });
  assertEquals(territoryRole(r, ME), 'rival', 'sans roster : rôle rival, pas une couleur inventée');
  assertEquals(territoryRole(r, ME, new Set([CREW])), 'crew');
});

Deno.test('territoryRole : unowned / expired / invalidated ne sont PAS peints', () => {
  for (const state of ['unowned', 'expired', 'invalidated'] as TerritoryDbState[]) {
    const owner = state === 'unowned' ? null : ME;
    const ownerType = state === 'unowned' ? null : ('user' as const);
    assertEquals(territoryRole(row({ state, owner_id: owner, owner_type: ownerType }), ME), null);
  }
});

// ─── 4. L'AIRE VIENT DE LA TABLE ────────────────────────────────────────────

Deno.test('rowToTerritory : areaM2 est REPRIS de la table, jamais recalculé', () => {
  const res = rowToTerritory(row({ area_m2: 987_654.25 }), ME, NOW);
  assert(res.ok);
  assertEquals(res.territory.props.areaM2, 987_654.25);
});

Deno.test('rowToTerritory : deux polygones identiques d’aires déclarées différentes gardent CHACUN la sienne', () => {
  // Verrou anti-« recalcul silencieux » : si l'aire était dérivée de la
  // géométrie, ces deux lignes rendraient le MÊME nombre.
  const a = rowToTerritory(row({ id: 'a', area_m2: 1000 }), ME, NOW);
  const b = rowToTerritory(row({ id: 'b', area_m2: 2000 }), ME, NOW);
  assert(a.ok && b.ok);
  assertEquals(a.territory.props.areaM2, 1000);
  assertEquals(b.territory.props.areaM2, 2000);
});

Deno.test('rowToTerritory : la forme rendue est le POLYGONE de la table, pas un contour d’hexagones', () => {
  const res = rowToTerritory(row(), ME, NOW);
  assert(res.ok);
  assertEquals(res.territory.geometrySource, 'polygon');
  // 4 sommets exactement : un contour H3 lissé au Chaikin en aurait des dizaines.
  assertEquals(res.territory.polygons[0]?.[0]?.length, 4);
  assertEquals(res.territory.zoneCount, 1);
});

Deno.test('rowToTerritory : rien n’est inventé (nom, decay), tout ce qui est su est repris', () => {
  const res = rowToTerritory(row({ defense_level: 2 }), ME, NOW);
  assert(res.ok);
  const t = res.territory;
  assertEquals(t.props.displayName, null);
  assertEquals(t.props.earliestDecayAt, null, 'la table n’a pas de decay : jamais une date déduite');
  assertEquals(t.props.capturedAt, '2026-07-26T08:00:00.000Z');
  assertEquals(t.props.updatedAt, NOW);
  assertEquals(t.props.ownerType, 'user');
  assertEquals(t.defenseLevel, 2);
  assertEquals(t.sourceRunId, 'run-1');
  // Centroïde du carré = son centre, à l'epsilon près.
  assert(Math.abs((t.props.center?.lat ?? 0) - REP_LAT) < 1e-9);
  assert(Math.abs((t.props.center?.lng ?? 0) - REP_LNG) < 1e-9);
  assert(t.sectorIds.length > 0, 'les secteurs réellement touchés sont déduits des sommets');
});

Deno.test('rowToTerritory : l’identifiant est celui de la LIGNE — stable et deep-linkable', () => {
  const res = rowToTerritory(row({ id: 'abc-123' }), ME, NOW);
  assert(res.ok);
  assertEquals(res.territory.props.territoryId as string, 'abc-123');
});

Deno.test('rowToTerritory : les deux refus sont NOMMÉS (état / géométrie), jamais silencieux', () => {
  const byState = rowToTerritory(
    row({ state: 'expired' }),
    ME,
    NOW,
  );
  assert(!byState.ok);
  assertEquals(byState.reason, 'state');
  const byGeo = rowToTerritory(
    row({ owner_id: RIVAL, geometry_generalized: null }),
    ME,
    NOW,
  );
  assert(!byGeo.ok);
  assertEquals(byGeo.reason, 'geometry');
});

Deno.test('buildPolygonTerritories : liste VIDE → aucun territoire, aucun refus (pas une panne)', () => {
  const built = buildPolygonTerritories([], ME, NOW);
  assertEquals(built.territories.length, 0);
  assertEquals(built.skipped, { state: 0, geometry: 0 });
});

Deno.test('buildPolygonTerritories : ce qui n’est pas peint est COMPTÉ', () => {
  const built = buildPolygonTerritories(
    [
      row({ id: '1' }),
      row({ id: '2', state: 'invalidated' }),
      row({ id: '3', owner_id: RIVAL, geometry_generalized: null }),
    ],
    ME,
    NOW,
  );
  assertEquals(built.territories.length, 1);
  assertEquals(built.skipped.state, 1);
  assertEquals(built.skipped.geometry, 1);
});

// ─── 5. DISCIPLINE ──────────────────────────────────────────────────────────

Deno.test('splitTerritoryRowsByActivity : les deux mondes existent toujours, jamais fondus', () => {
  const split = splitTerritoryRowsByActivity([
    row({ id: 'r', activity: 'run' }),
    row({ id: 'b', activity: 'bike' }),
    row({ id: 'x', activity: 'swim' }),
  ]);
  assertEquals(split.rows.run.length, 1);
  assertEquals(split.rows.bike.length, 1);
  assertEquals(split.unknownCount, 1, 'une discipline inconnue n’est versée dans AUCUN monde');
});

// ─── 6. LA TRANSITION : RIEN DE CACHÉ, RIEN DE DOUBLÉ ───────────────────────

/** Une cellule dont le centre est DANS le carré du territoire de test. */
const insideCell = latLngToCell(REP_LAT, REP_LNG, H3_RES);
/** Une cellule NETTEMENT hors du carré (≈ 2 km au nord-est). */
const outsideCell = latLngToCell(REP_LAT + 0.02, REP_LNG + 0.02, H3_RES);

Deno.test('les cellules de test sont bien l’une dedans, l’autre dehors (garde-fou du test)', () => {
  const [inLat, inLng] = cellToLatLng(insideCell);
  const [outLat, outLng] = cellToLatLng(outsideCell);
  assert(Math.abs(inLat - REP_LAT) < 0.004 && Math.abs(inLng - REP_LNG) < 0.004);
  assert(Math.abs(outLat - REP_LAT) > 0.004 || Math.abs(outLng - REP_LNG) > 0.004);
});

Deno.test('complementClaims : une cellule COUVERTE par mon polygone n’est pas repeinte', () => {
  const built = buildPolygonTerritories([row()], ME, NOW);
  const comp = complementClaims([claim(insideCell, ME)], built.territories);
  assertEquals(comp.remaining.length, 0);
  assertEquals(comp.coveredCellsByTerritory.get('terr-1')?.length, 1);
});

Deno.test('complementClaims : une cellule HORS polygone reste peinte — rien n’est caché', () => {
  const built = buildPolygonTerritories([row()], ME, NOW);
  const comp = complementClaims([claim(outsideCell, ME)], built.territories);
  assertEquals(comp.remaining.length, 1);
});

Deno.test('complementClaims : le polygone d’un RIVAL n’efface JAMAIS ma cellule', () => {
  // Le rival tient un polygone qui recouvre géométriquement ma cellule.
  const built = buildPolygonTerritories([row({ owner_id: RIVAL })], ME, NOW);
  assertEquals(built.territories.length, 1);
  const comp = complementClaims([claim(insideCell, ME)], built.territories);
  assertEquals(comp.remaining.length, 1, 'ma possession ne disparaît pas sous la sienne');
});

Deno.test('complementClaims : sans aucun polygone, TOUTES les captures restent (repli intégral)', () => {
  const comp = complementClaims([claim(insideCell, ME), claim(outsideCell, ME)], []);
  assertEquals(comp.remaining.length, 2);
});

Deno.test('complementClaims : le decay des cellules couvertes est REPRIS (le compte à rebours survit)', () => {
  const built = buildPolygonTerritories([row()], ME, NOW);
  const other = latLngToCell(REP_LAT + 0.0005, REP_LNG + 0.0005, H3_RES);
  const comp = complementClaims(
    [
      claim(insideCell, ME, '2026-08-10T00:00:00.000Z'),
      claim(other, ME, '2026-08-01T00:00:00.000Z'),
    ],
    built.territories,
  );
  // Le MINIMUM : la première fissure de la zone, jamais la moyenne.
  assertEquals(comp.earliestDecayByTerritory.get('terr-1'), '2026-08-01T00:00:00.000Z');
});

Deno.test('complementClaims : un trou du polygone ne couvre RIEN (la cellule y reste peinte)', () => {
  // Carré extérieur large, trou centré sur République : la cellule du centre
  // n'est PAS décrite par le polygone — elle doit rester en hexagone.
  const donut = {
    type: 'Polygon',
    coordinates: [
      [
        [REP_LNG - 0.01, REP_LAT - 0.01],
        [REP_LNG + 0.01, REP_LAT - 0.01],
        [REP_LNG + 0.01, REP_LAT + 0.01],
        [REP_LNG - 0.01, REP_LAT + 0.01],
        [REP_LNG - 0.01, REP_LAT - 0.01],
      ],
      [
        [REP_LNG - 0.002, REP_LAT - 0.002],
        [REP_LNG + 0.002, REP_LAT - 0.002],
        [REP_LNG + 0.002, REP_LAT + 0.002],
        [REP_LNG - 0.002, REP_LAT + 0.002],
        [REP_LNG - 0.002, REP_LAT - 0.002],
      ],
    ],
  };
  const built = buildPolygonTerritories([row({ geometry: donut })], ME, NOW);
  const comp = complementClaims([claim(insideCell, ME)], built.territories);
  assertEquals(comp.remaining.length, 1);
});

// ─── 7. LE MERGE, TEL QUE LA CARTE LE CONSOMME ──────────────────────────────

Deno.test('mergeTerritorySources : polygone + capture non couverte = 2 territoires, 2 origines', () => {
  const merged = mergeTerritorySources({
    territoryRows: [row()],
    claimRows: [claim(insideCell, ME), claim(outsideCell, ME)],
    meId: ME,
    now: NOW,
  });
  assertEquals(merged.polygonCount, 1);
  assertEquals(merged.hexFallbackCount, 1, 'la capture sans polygone reste visible, en hexagones');
  assertEquals(merged.hiddenWithoutGeometryCount, 0);
  assertEquals(merged.territories.length, 2);
  assertEquals(merged.territories[0]?.geometrySource, 'polygon');
  assertEquals(merged.territories[1]?.geometrySource, 'h3cells');
});

Deno.test('mergeTerritorySources : table VIDE ⇒ tout reste hexagonal, RIEN n’est perdu', () => {
  const merged = mergeTerritorySources({
    territoryRows: [],
    claimRows: [claim(insideCell, ME), claim(outsideCell, ME)],
    meId: ME,
    now: NOW,
  });
  assertEquals(merged.polygonCount, 0);
  assertEquals(merged.hexFallbackCount, 1, 'les 2 cellules du même propriétaire font 1 territoire');
  assertEquals(merged.hiddenWithoutGeometryCount, 0);
  assertEquals(merged.territories[0]?.zoneCount, 2);
});

Deno.test('mergeTerritorySources : deux lectures vides ⇒ liste vide (état honnête, pas une panne)', () => {
  const merged = mergeTerritorySources({ territoryRows: [], claimRows: [], meId: ME, now: NOW });
  assertEquals(merged.territories.length, 0);
  assertEquals(merged.polygonCount, 0);
  assertEquals(merged.hexFallbackCount, 0);
  assertEquals(merged.hiddenWithoutGeometryCount, 0);
});

Deno.test('mergeTerritorySources : mode strict (sans fallback) masque les cellules sans polygone et les COMPTE', () => {
  const merged = mergeTerritorySources({
    territoryRows: [row()],
    claimRows: [claim(insideCell, ME), claim(outsideCell, ME)],
    meId: ME,
    now: NOW,
    allowHexFallback: false,
  });
  assertEquals(merged.polygonCount, 1);
  assertEquals(merged.hexFallbackCount, 0);
  assertEquals(merged.hiddenWithoutGeometryCount, 1);
  assertEquals(merged.territories.length, 1);
  assertEquals(merged.territories[0]?.geometrySource, 'polygon');
});

Deno.test('mergeTerritorySources : le decay repris alimente bien le territoire polygonal', () => {
  const merged = mergeTerritorySources({
    territoryRows: [row()],
    claimRows: [claim(insideCell, ME, '2026-08-01T00:00:00.000Z')],
    meId: ME,
    now: NOW,
  });
  assertEquals(merged.territories[0]?.props.earliestDecayAt, '2026-08-01T00:00:00.000Z');
});

Deno.test('mergeTerritorySources : l’aire du polygone ne se mélange pas à celle des cellules', () => {
  const merged = mergeTerritorySources({
    territoryRows: [row({ area_m2: 500_000 })],
    claimRows: [claim(outsideCell, ME)],
    meId: ME,
    now: NOW,
  });
  const poly = merged.territories.find((t) => t.geometrySource === 'polygon');
  const hex = merged.territories.find((t) => t.geometrySource === 'h3cells');
  assertEquals(poly?.props.areaM2, 500_000);
  assert((hex?.props.areaM2 ?? 0) > 0);
  assertNotEquals(hex?.props.areaM2, 500_000);
});

Deno.test('mergeTerritorySources : déterministe — mêmes entrées, même sortie', () => {
  const input = {
    territoryRows: [row({ id: 'a' }), row({ id: 'b', owner_id: RIVAL })],
    claimRows: [claim(outsideCell, ME), claim(insideCell, RIVAL)],
    meId: ME,
    now: NOW,
  } as const;
  assertEquals(
    JSON.stringify(mergeTerritorySources(input)),
    JSON.stringify(mergeTerritorySources(input)),
  );
});

// ─── 8. LES QUATRE ÉTATS HONNÊTES ───────────────────────────────────────────

Deno.test('territoryReadPhase : la restauration de session est un CHARGEMENT, jamais un « pas connecté »', () => {
  assertEquals(
    territoryReadPhase({ sessionLoading: true, signedOut: true, failed: false, rows: null }),
    'loading',
  );
});

Deno.test('territoryReadPhase : pas de session ⇒ signedOut (et non « aucune zone »)', () => {
  assertEquals(
    territoryReadPhase({ sessionLoading: false, signedOut: true, failed: false, rows: null }),
    'signedOut',
  );
});

Deno.test('territoryReadPhase : un ÉCHEC n’est jamais un VIDE', () => {
  assertEquals(
    territoryReadPhase({ sessionLoading: false, signedOut: false, failed: true, rows: [] }),
    'failed',
  );
});

Deno.test('territoryReadPhase : rien de lu encore ⇒ loading (on n’affirme rien sur le joueur)', () => {
  assertEquals(
    territoryReadPhase({ sessionLoading: false, signedOut: false, failed: false, rows: null }),
    'loading',
  );
});

Deno.test('territoryReadPhase : lu et vide ⇒ empty ; lu et non vide ⇒ ready', () => {
  assertEquals(
    territoryReadPhase({ sessionLoading: false, signedOut: false, failed: false, rows: [] }),
    'empty',
  );
  assertEquals(
    territoryReadPhase({ sessionLoading: false, signedOut: false, failed: false, rows: [1] }),
    'ready',
  );
});

Deno.test('territoryReadPhase : les 5 phases sont atteignables et distinctes', () => {
  const seen = new Set([
    territoryReadPhase({ sessionLoading: true, signedOut: false, failed: false, rows: null }),
    territoryReadPhase({ sessionLoading: false, signedOut: true, failed: false, rows: null }),
    territoryReadPhase({ sessionLoading: false, signedOut: false, failed: true, rows: null }),
    territoryReadPhase({ sessionLoading: false, signedOut: false, failed: false, rows: [] }),
    territoryReadPhase({ sessionLoading: false, signedOut: false, failed: false, rows: [1] }),
  ]);
  assertEquals(seen.size, 5);
});

// ─── 9. LE CONTRAT DE LECTURE ───────────────────────────────────────────────

Deno.test('TERRITORY_SELECT_COLUMNS demande TOUT ce que le rendu consomme', () => {
  for (const col of [
    'id',
    'activity',
    'owner_type',
    'owner_id',
    'geometry',
    'geometry_generalized',
    'area_m2',
    'state',
    'defense_level',
    'controlled_since',
    'source_run_id',
  ]) {
    assert(
      TERRITORY_SELECT_COLUMNS.split(',').some((c) => c.trim() === col),
      `colonne manquante dans le select : ${col}`,
    );
  }
});
