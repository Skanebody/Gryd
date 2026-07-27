/**
 * GRYD — tests de la SÉLECTION de zone (E04). Ce module est le point de parité
 * natif ⇄ web : s'il ment, les deux cartes mentent de la même façon, et s'il est
 * juste, elles ne peuvent plus diverger. Ce qu'on verrouille ici : le rôle, les
 * chiffres RÉELS remontés, et le rattachement CONTESTÉ (le piège du territoire à
 * cheval sur deux secteurs).
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { cellToParent, gridDisk, latLngToCell } from 'h3-js';
import { SECTOR_H3_RESOLUTION } from '@klaim/shared';
import { buildTerritories, type HexClaimRow } from './territoryBuild.ts';
import { selectZoneView } from './zoneSelection.ts';

const ME = 'me-uuid';
const RIVAL = 'rival-uuid';
const H3_RES = 10;

const h3ToDb = (h: string): string => BigInt('0x' + h).toString();
function row(cell: string, owner: string | null, claimedAt: string | null = null): HexClaimRow {
  return {
    h3index: h3ToDb(cell),
    owner_user_id: owner,
    claim_type: 'claim',
    decay_at: null,
    claimed_at: claimedAt,
  };
}

const paris = gridDisk(latLngToCell(48.8674, 2.3636, H3_RES), 2);
const lille = gridDisk(latLngToCell(50.6292, 3.0573, H3_RES), 1);

Deno.test('selectZoneView : rien de sélectionné, rien de chargé ⇒ null (jamais un repli)', () => {
  const built = buildTerritories(paris.map((c) => row(c, RIVAL)), ME);
  assertEquals(selectZoneView(built, [], null), null);
  assertEquals(selectZoneView(null, [], 'peu-importe'), null);
  // Un id inconnu (couche périmée, course entre deux lectures) n'ouvre RIEN.
  assertEquals(selectZoneView(built, [], 'territoire-fantome'), null);
});

Deno.test('selectZoneView : rôle + chiffres RÉELS, aucun champ fabriqué', () => {
  const built = buildTerritories(
    paris.map((c) => row(c, RIVAL, '2026-07-19T08:00:00Z')),
    ME,
  );
  const view = selectZoneView(built, [], built[0].props.territoryId);
  assert(view !== null);
  assertEquals(view.role, 'rival');
  assertEquals(view.zones, built[0].zoneCount);
  assertEquals(view.capturedAt, '2026-07-19T08:00:00Z');
  // Surface = l'aire H3 sommée convertie en km², jamais une moyenne.
  assertEquals(view.areaKm2, built[0].props.areaM2 / 1_000_000);
  assert(view.areaKm2 > 0);
  assert(view.center !== null);
  assertEquals(view.sectorId, built[0].sectorIds[0]);
});

Deno.test('selectZoneView : MA zone prend le rôle « mine » (couleur par RÔLE §C)', () => {
  const built = buildTerritories(paris.map((c) => row(c, ME)), ME);
  const view = selectZoneView(built, [], built[0].props.territoryId);
  assertEquals(view?.role, 'mine');
});

Deno.test('selectZoneView : sans claimed_at, capturedAt reste null (la ligne disparaîtra)', () => {
  const built = buildTerritories(paris.map((c) => row(c, RIVAL)), ME);
  const view = selectZoneView(built, [], built[0].props.territoryId);
  assertEquals(view?.capturedAt, null);
});

Deno.test('contesté : aucun snapshot ⇒ false — l’état réel, jamais une supposition', () => {
  const built = buildTerritories(paris.map((c) => row(c, RIVAL)), ME);
  assertEquals(selectZoneView(built, [], built[0].props.territoryId)?.contested, false);
});

Deno.test('contesté : vrai dès qu’UN secteur couvert l’est, même à cheval sur deux', () => {
  // Le piège : un territoire Paris+Lille dont SEUL le secteur lillois est
  // contesté. Se fier au secteur du centroïde (quelque part en Picardie) le
  // dirait calme — donc afficherait l'état d'un endroit où il n'est pas.
  const built = buildTerritories([...paris, ...lille].map((c) => row(c, RIVAL)), ME);
  const lilleSector = cellToParent(lille[0], SECTOR_H3_RESOLUTION);
  const view = selectZoneView(
    built,
    [{ id: lilleSector, contested: true }],
    built[0].props.territoryId,
  );
  assertEquals(view?.contested, true);

  // Le même secteur NON contesté ne rend pas la zone contestée.
  const calm = selectZoneView(
    built,
    [{ id: lilleSector, contested: false }],
    built[0].props.territoryId,
  );
  assertEquals(calm?.contested, false);
});

Deno.test('contesté : un secteur contesté AILLEURS ne contamine pas la zone', () => {
  const built = buildTerritories(paris.map((c) => row(c, RIVAL)), ME);
  const elsewhere = cellToParent(lille[0], SECTOR_H3_RESOLUTION);
  const view = selectZoneView(
    built,
    [{ id: elsewhere, contested: true }],
    built[0].props.territoryId,
  );
  assertEquals(view?.contested, false);
});

// ─── E22 : échéance de decay RÉELLE remontée (jamais dérivée de capturedAt) ──

function rowWithDecay(cell: string, owner: string | null, decayAt: string | null): HexClaimRow {
  return { h3index: h3ToDb(cell), owner_user_id: owner, claim_type: 'claim', decay_at: decayAt, claimed_at: null };
}

Deno.test('E22 : decayAt = l’échéance la PLUS PROCHE des hex (min), jamais le max', () => {
  // Deux hex de MA zone : l'un tombe le 27, l'autre le 30. La défense doit viser
  // la première fissure (le 27) — le max (le 30) sous-estimerait le danger.
  const cells = paris.slice(0, 2);
  const built = buildTerritories(
    [rowWithDecay(cells[0], ME, '2026-07-30T00:00:00Z'), rowWithDecay(cells[1], ME, '2026-07-27T00:00:00Z')],
    ME,
  );
  const view = selectZoneView(built, [], built[0].props.territoryId);
  assertEquals(view?.decayAt, '2026-07-27T00:00:00Z');
});

Deno.test('E22 : aucun hex daté ⇒ decayAt null (pas d’échéance inventée)', () => {
  const built = buildTerritories(paris.map((c) => row(c, ME)), ME);
  const view = selectZoneView(built, [], built[0].props.territoryId);
  assertEquals(view?.decayAt, null);
});

Deno.test('E22 : rivalPercent = la part rivale MAX des secteurs contestés couverts', () => {
  // Zone à cheval Paris (rival 0,6) + Lille (rival 0,3), les deux contestés :
  // on montre la couverture la plus large (0,6). Le secteur du centroïde n'entre
  // pas en jeu — seuls les secteurs RÉELLEMENT couverts comptent.
  const built = buildTerritories([...paris, ...lille].map((c) => row(c, ME)), ME);
  const parisSector = cellToParent(paris[0], SECTOR_H3_RESOLUTION);
  const lilleSector = cellToParent(lille[0], SECTOR_H3_RESOLUTION);
  const view = selectZoneView(
    built,
    [
      { id: parisSector, contested: true, rivalPercent: 0.6 },
      { id: lilleSector, contested: true, rivalPercent: 0.3 },
    ],
    built[0].props.territoryId,
  );
  assertEquals(view?.rivalPercent, 0.6);
});

Deno.test('E22 : part rivale absente (source pauvre {id,contested}) ⇒ rivalPercent null', () => {
  const built = buildTerritories(paris.map((c) => row(c, ME)), ME);
  const parisSector = cellToParent(paris[0], SECTOR_H3_RESOLUTION);
  const view = selectZoneView(built, [{ id: parisSector, contested: true }], built[0].props.territoryId);
  assertEquals(view?.contested, true);
  assertEquals(view?.rivalPercent, null);
});

// ═══════════════════════════════════════════════════════════════════════════
// E14 — DÉTAIL D'UN TERRITOIRE : ce que la sélection remonte du POLYGONE.
//
// Ces tests partent de `rowToTerritory` (la vraie ligne `territories`) et non de
// `buildTerritories` : c'est le chemin AUTORITAIRE depuis le LOT 1, et c'est
// exactement là que les champs manquants vivaient sans jamais atteindre l'écran.
// ═══════════════════════════════════════════════════════════════════════════

import { rowToTerritory, type TerritoryRow } from './territoriesSource.ts';
import type { RealTerritory } from './territoryBuild.ts';

const CREW_ID = 'crew-uuid';
const NOW = '2026-07-27T10:00:00.000Z';
/** Un carré autour du centre de Paris — anneau FERMÉ, comme le stocke la base. */
const SQUARE = {
  type: 'Polygon',
  coordinates: [
    [
      [2.3600, 48.8650],
      [2.3700, 48.8650],
      [2.3700, 48.8700],
      [2.3600, 48.8700],
      [2.3600, 48.8650],
    ],
  ],
};

function territoryRow(o: Partial<TerritoryRow> = {}): TerritoryRow {
  return {
    id: 'territory-1',
    activity: 'run',
    owner_type: 'user',
    owner_id: ME,
    geometry: SQUARE,
    geometry_generalized: SQUARE,
    area_m2: 420_000,
    state: 'owned_personal',
    defense_level: 0,
    controlled_since: '2026-07-21T10:00:00.000Z',
    publish_after: NOW,
    source_run_id: 'run-1',
    ...o,
  };
}

function polygonOf(
  o: Partial<TerritoryRow> = {},
  crewIds?: ReadonlySet<string> | null,
): RealTerritory[] {
  const res = rowToTerritory(territoryRow(o), ME, NOW, crewIds);
  if (!res.ok) throw new Error(`ligne non peinte : ${res.reason}`);
  return [res.territory];
}

Deno.test('E14 : MA zone personnelle — ownership, frontière exacte, « tenue depuis »', () => {
  const built = polygonOf();
  const view = selectZoneView(built, [], built[0].props.territoryId, { meId: ME });
  assertEquals(view?.role, 'mine');
  assertEquals(view?.ownership, 'personal');
  // Ma propre ligne : `pickRenderGeometry` sert `geometry`, donc le tracé exact.
  assertEquals(view?.border, 'exact');
  // `capturedAt` EST `controlled_since` sur ce chemin : « tenue depuis » y est vrai.
  assertEquals(view?.timeMetric, 'held');
  // defense_level = 0 ⇒ AUCUNE fortification, jamais « niveau 0 ».
  assertEquals(view?.protectionLevel, null);
});

Deno.test('E14 : LE DÉFAUT CORRIGÉ — ma zone `contested` n’est plus une zone rivale', () => {
  const built = polygonOf({ state: 'contested' });
  // Avant : props.status = 'contested' ⇒ role 'rival' ⇒ « ZONE RIVALE ·
  // Reprendre » sur MA zone, et `isDefenseZone` (qui exige 'mine') muet.
  const view = selectZoneView(built, [], built[0].props.territoryId, { meId: ME });
  assertEquals(view?.role, 'mine');
  assertEquals(view?.ownership, 'personal');
  // Et `territories.state` est une SOURCE de contesté à part entière : sans
  // elle, une zone officiellement attaquée s'ouvrait en feuille calme tant
  // qu'aucun agrégat de secteur n'avait bougé.
  assertEquals(view?.contested, true);
});

Deno.test('E14 : zone du CREW — distincte de la mienne, sans nom de crew', () => {
  const built = polygonOf(
    { owner_type: 'crew', owner_id: CREW_ID, state: 'owned_crew' },
    new Set([CREW_ID]),
  );
  const view = selectZoneView(built, [], built[0].props.territoryId, {
    meId: ME,
    crewIds: new Set([CREW_ID]),
  });
  assertEquals(view?.role, 'mine');
  assertEquals(view?.ownership, 'crew');
});

Deno.test('E14 : zone rivale — contour PUBLIC simplifié, jamais la trace exacte', () => {
  const built = polygonOf({ owner_id: RIVAL }, null);
  const view = selectZoneView(built, [], built[0].props.territoryId, { meId: ME });
  assertEquals(view?.ownership, 'rival');
  // §12.3 : le territoire d'autrui n'est servi que généralisé.
  assertEquals(view?.border, 'generalized');
});

Deno.test('E14 : protection — le niveau RÉEL remonte, le 0 par défaut ne remonte pas', () => {
  const fortified = polygonOf({ state: 'defended', defense_level: 2 });
  const view = selectZoneView(fortified, [], fortified[0].props.territoryId, { meId: ME });
  assertEquals(view?.protectionLevel, 2);
  const plain = polygonOf({ defense_level: 0 });
  assertEquals(
    selectZoneView(plain, [], plain[0].props.territoryId, { meId: ME })?.protectionLevel,
    null,
  );
});

Deno.test('E14 : chemin HEXAGONAL — contour avoué approximatif, « dernière prise »', () => {
  const built = buildTerritories(paris.map((c) => row(c, ME, '2026-07-25T10:00:00.000Z')), ME);
  const view = selectZoneView(built, [], built[0].props.territoryId, { meId: ME });
  // La spec §1.4 interdit l'hexagone ; la transition en laisse. L'app le DIT.
  assertEquals(view?.border, 'approx');
  assertEquals(view?.timeMetric, 'lastCapture');
  // Aucun `defense_level` sur ce chemin : absence, jamais un zéro affiché.
  assertEquals(view?.protectionLevel, null);
});

Deno.test('E14 : sans viewer, `status` garde son sens (aucune régression E04)', () => {
  const mine = buildTerritories(paris.map((c) => row(c, ME)), ME);
  assertEquals(selectZoneView(mine, [], mine[0].props.territoryId)?.role, 'mine');
  const theirs = buildTerritories(paris.map((c) => row(c, RIVAL)), ME);
  assertEquals(selectZoneView(theirs, [], theirs[0].props.territoryId)?.role, 'rival');
  // Mais la variante fine reste INDÉTERMINÉE : on ne devine pas personnel/crew.
  assertEquals(selectZoneView(mine, [], mine[0].props.territoryId)?.ownership, 'unknown');
});
