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
