/**
 * GRYD — SECTEURS §C : tests de la SEULE couche qui transforme une ligne de
 * `sector_snapshot` en pixel de carte.
 *
 * Ce que ces tests verrouillent, ce sont les quatre façons dont cette couche
 * pourrait MENTIR :
 *   1. peindre « c'est à toi » à un visiteur SANS CREW (deux `null` comparés
 *      égaux — le piège de la palette « sans viewer ») ;
 *   2. déclarer NEUTRE un secteur réellement tenu par un joueur sans crew
 *      (le trou que la migration 0061 a comblé côté serveur) ;
 *   3. peindre un secteur à la mauvaise place (index H3 arrondi, mauvaise
 *      résolution) plutôt que de ne rien peindre ;
 *   4. peindre quoi que ce soit alors qu'on ne sait pas encore QUI regarde,
 *      ou qu'il n'y a rien à dire (0 capture = carte nue).
 *
 * Deno, aucun réseau, aucun mock : on importe DIRECTEMENT les modules de prod.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { cellToParent, latLngToCell } from 'h3-js';
import { SECTOR_H3_RESOLUTION } from '@klaim/shared';
import {
  holderKey,
  resolveSectorRole,
  sectorPaintRole,
  sectorRing,
  sectorViewFor,
  sectorViewsFor,
  statusKeyFromLevel,
  joinSectorRows,
  parseSectorRow,
  type SectorSnapshotRow,
  type SectorViewer,
} from './sectorView.ts';

const ME = 'user-me';
const MY_CREW = 'crew-mine';
const OTHER_CREW = 'crew-other';
const SOLO = 'user-solo';

/** Un vrai secteur : la cellule res 7 qui contient la place de la République. */
const REPUBLIQUE_RES7 = cellToParent(
  latLngToCell(48.8674, 2.3636, 10),
  SECTOR_H3_RESOLUTION,
);

function row(over: Partial<SectorSnapshotRow> = {}): SectorSnapshotRow {
  return {
    sectorId: 'sector-1',
    name: 'République',
    centerH3: REPUBLIQUE_RES7,
    ownerKind: null,
    ownerCrewId: null,
    ownerUserId: null,
    ownerPercent: 0,
    rivalKind: null,
    rivalCrewId: null,
    rivalUserId: null,
    rivalPercent: 0,
    neutralPercent: 1,
    pressure: 0,
    statusLevel: 0,
    contested: false,
    ...over,
  };
}

const viewer = (over: Partial<SectorViewer> = {}): SectorViewer => ({
  userId: ME,
  crewId: MY_CREW,
  resolved: true,
  ...over,
});

// ═══════════════════════════════════════════════════════════════════════════
// (d) PALETTE « SANS VIEWER » — le mensonge le plus facile à écrire
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('sans crew : un secteur tenu par un crew n’est JAMAIS « à moi »', () => {
  const v = sectorViewFor(
    row({ ownerKind: 'crew', ownerCrewId: OTHER_CREW, ownerPercent: 0.62, neutralPercent: 0.38 }),
    viewer({ crewId: null }),
  );
  assert(v);
  assertEquals(v.ownerRole, 'rival');
  // Et surtout : ma part reste 0 — je ne « tiens » rien ici.
  assertEquals(v.minePercent, 0);
});

Deno.test('deux identités NULLES ne sont pas égales (clé bâtarde interdite)', () => {
  // Le piège exact : holder null + viewer null → une comparaison naïve dirait
  // « mine ». On exige `neutral`, et on exige qu'aucune clé `crew:null` n'existe.
  assertEquals(holderKey('crew', null), null);
  assertEquals(holderKey(null, MY_CREW), null);
  assertEquals(holderKey('crew', ''), null);
  assertEquals(resolveSectorRole(null, [null, null]), 'neutral');
  assertEquals(resolveSectorRole('crew:x', [null, null]), 'rival');
});

Deno.test('un crew et un joueur de même uuid ne sont pas la même identité', () => {
  const same = 'same-uuid';
  assertEquals(resolveSectorRole(holderKey('user', same), [holderKey('crew', same)]), 'rival');
  assertEquals(resolveSectorRole(holderKey('user', same), [holderKey('user', same)]), 'mine');
});

// ═══════════════════════════════════════════════════════════════════════════
// (e) OWNER SOLO — un joueur sans crew tient VRAIMENT le secteur
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('owner solo : le secteur est TENU, jamais « neutre »', () => {
  const v = sectorViewFor(
    row({ ownerKind: 'user', ownerUserId: SOLO, ownerPercent: 0.45, neutralPercent: 0.55 }),
    viewer(),
  );
  assert(v);
  assert(v.held, 'un propriétaire solo tient le secteur');
  assertEquals(v.ownerRole, 'rival');
  assertEquals(v.ownerPercent, 0.45);
});

Deno.test('owner solo : si c’est MOI, le secteur est chartreuse (mine)', () => {
  const v = sectorViewFor(
    row({ ownerKind: 'user', ownerUserId: ME, ownerPercent: 0.4, neutralPercent: 0.6 }),
    viewer({ crewId: null }),
  );
  assert(v);
  assertEquals(v.ownerRole, 'mine');
  assertEquals(v.minePercent, 0.4);
  // §C : l'identité solo ne crée AUCUNE couleur nouvelle.
  assertEquals(sectorPaintRole(v), 'mine');
});

Deno.test('rival solo : rôle rival, part rivale conservée', () => {
  const v = sectorViewFor(
    row({
      ownerKind: 'crew',
      ownerCrewId: MY_CREW,
      ownerPercent: 0.4,
      rivalKind: 'user',
      rivalUserId: SOLO,
      rivalPercent: 0.3,
      neutralPercent: 0.3,
    }),
    viewer(),
  );
  assert(v);
  assertEquals(v.ownerRole, 'mine');
  assertEquals(v.rivalRole, 'rival');
  assertEquals(v.rivalPercent, 0.3);
});

Deno.test('un « rival » qui est en fait mon crew n’exerce aucune pression rivale', () => {
  const v = sectorViewFor(
    row({
      ownerKind: 'user',
      ownerUserId: SOLO,
      ownerPercent: 0.5,
      rivalKind: 'crew',
      rivalCrewId: MY_CREW,
      rivalPercent: 0.35,
    }),
    viewer(),
  );
  assert(v);
  assertEquals(v.rivalRole, 'mine');
  assertEquals(v.rivalPercent, 0, 'mon propre crew n’est pas une pression rivale');
});

// ═══════════════════════════════════════════════════════════════════════════
// GÉOMÉTRIE — dérivée du centre H3, ou RIEN
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('géométrie : le contour est celui de la cellule res 7, fermé', () => {
  const ring = sectorRing(REPUBLIQUE_RES7);
  assert(ring);
  // Un hexagone H3 : 6 sommets (7 avec la fermeture) — 7 si pentagone.
  assert(ring.length >= 6, 'contour hexagonal');
  const first = ring[0];
  const last = ring[ring.length - 1];
  assert(first && last);
  assertEquals(first[0], last[0]);
  assertEquals(first[1], last[1]);
  // Format GeoJSON [lng, lat] : la République est à lng ≈ 2,36 / lat ≈ 48,87.
  assert(Math.abs(first[0]) < 90, 'la première coordonnée est une LONGITUDE');
  assert(first[1] > 40, 'la seconde coordonnée est une LATITUDE');
});

Deno.test('géométrie : cellule d’une AUTRE résolution → aucun secteur peint', () => {
  const res10 = latLngToCell(48.8674, 2.3636, 10);
  assertEquals(sectorRing(res10), null);
  assertEquals(sectorViewFor(row({ centerH3: res10 }), viewer()), null);
});

Deno.test('géométrie : index illisible (arrondi/vide) → aucun secteur peint', () => {
  assertEquals(sectorRing(''), null);
  assertEquals(sectorRing('pas-un-h3'), null);
  // Un index H3 res 7 dépasse 2^53 : arrondi par un JSON number, il ne désigne
  // plus rien de valide — on ne peint pas « à peu près là ».
  assertEquals(sectorRing('0'), null);
});

// ═══════════════════════════════════════════════════════════════════════════
// STATUT + SÉLECTION DE CE QUI EST PEINT
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('statut : les 5 niveaux se relisent, un niveau inconnu reste MUET', () => {
  assertEquals(statusKeyFromLevel(0), 'stable');
  assertEquals(statusKeyFromLevel(1), 'pression');
  assertEquals(statusKeyFromLevel(2), 'contestee');
  assertEquals(statusKeyFromLevel(3), 'attaque');
  assertEquals(statusKeyFromLevel(4), 'urgence');
  // Hors contrat : jamais une alerte inventée.
  assertEquals(statusKeyFromLevel(9), 'stable');
  assertEquals(statusKeyFromLevel(-1), 'stable');
});

Deno.test('carte VIDE : un secteur neutre et stable n’est pas peint', () => {
  // C'est l'état de production aujourd'hui : 0 capture ⇒ rien à dire ⇒ rien à
  // peindre. Pas un hexagone gris, pas un « 0 % ».
  assertEquals(sectorViewsFor([row()], viewer()).length, 0);
});

Deno.test('un secteur SOUS pression est peint même sans propriétaire', () => {
  const views = sectorViewsFor([row({ statusLevel: 3, pressure: 72 })], viewer());
  assertEquals(views.length, 1);
  assertEquals(views[0]?.held, false);
  assertEquals(views[0]?.status.key, 'attaque');
});

Deno.test('viewer NON résolu : aucune vue (on ne peint pas un rôle qu’on ignore)', () => {
  const held = row({ ownerKind: 'crew', ownerCrewId: MY_CREW, ownerPercent: 0.6 });
  assertEquals(sectorViewsFor([held], viewer({ resolved: false })).length, 0);
  assertEquals(sectorViewsFor([held], viewer()).length, 1);
});

Deno.test('ordre DÉTERMINISTE : le plus chaud en dernier (peint au-dessus)', () => {
  const a = row({ sectorId: 'b', ownerKind: 'crew', ownerCrewId: MY_CREW, ownerPercent: 0.6 });
  const b = row({ sectorId: 'a', statusLevel: 4, pressure: 95 });
  const c = row({ sectorId: 'c', statusLevel: 2, contested: true });
  const first = sectorViewsFor([a, b, c], viewer()).map((v) => v.id);
  const second = sectorViewsFor([c, b, a], viewer()).map((v) => v.id);
  assertEquals(first, ['b', 'c', 'a']);
  assertEquals(second, first, 'même entrée, même ordre — la carte ne bascule pas seule');
});

Deno.test('contesté : la teinte est le VIOLET, quelle que soit l’identité du détenteur', () => {
  const mine = sectorViewFor(
    row({ ownerKind: 'crew', ownerCrewId: MY_CREW, ownerPercent: 0.45, contested: true }),
    viewer(),
  );
  const solo = sectorViewFor(
    row({ ownerKind: 'user', ownerUserId: SOLO, ownerPercent: 0.45, statusLevel: 2 }),
    viewer(),
  );
  assert(mine && solo);
  assertEquals(sectorPaintRole(mine), 'contested');
  assertEquals(sectorPaintRole(solo), 'contested');
});

// ═══════════════════════════════════════════════════════════════════════════
// LECTURE BRUTE → LIGNE NORMALISÉE (frontière base ↔ carte)
// ═══════════════════════════════════════════════════════════════════════════

/** Encodage EXACT de la base : `sectors.center_h3_res7` est un BIGINT. */
const h3ToDb = (h: string): string => BigInt('0x' + h).toString();

Deno.test('parse : une ligne complète devient une ligne normalisée', () => {
  const parsed = parseSectorRow(
    {
      sector_id: 's1',
      owner_crew_id: null,
      owner_user_id: SOLO,
      owner_kind: 'user',
      owner_percent: '0.4580',
      top_rival_crew_id: OTHER_CREW,
      top_rival_user_id: null,
      top_rival_kind: 'crew',
      top_rival_percent: 0.2,
      neutral_percent: '0.342',
      pressure_score: 63,
      status_level: 2,
      contested: true,
    },
    { name: 'République', centerH3: h3ToDb(REPUBLIQUE_RES7) },
  );
  assert(parsed);
  assertEquals(parsed.centerH3, REPUBLIQUE_RES7);
  assertEquals(parsed.ownerKind, 'user');
  assertEquals(parsed.ownerUserId, SOLO);
  assertEquals(parsed.ownerPercent, 0.458);
  assertEquals(parsed.rivalKind, 'crew');
  assertEquals(parsed.statusLevel, 2);
  assertEquals(parsed.contested, true);
});

Deno.test('parse : un snapshot SANS son secteur est omis (jamais un point sans lieu)', () => {
  assertEquals(parseSectorRow({ sector_id: 's1' }, undefined), null);
  assertEquals(
    parseSectorRow({ sector_id: 's1' }, { name: 'X', centerH3: null }),
    null,
  );
  assertEquals(joinSectorRows([{ sector_id: 's1' }], []).length, 0);
});

Deno.test('join : chaque snapshot retrouve SON secteur, les orphelins disparaissent', () => {
  const rows = joinSectorRows(
    [
      { sector_id: 's1', owner_kind: 'crew', owner_crew_id: MY_CREW, owner_percent: 0.5 },
      { sector_id: 'orphan' },
    ],
    [{ id: 's1', name: 'République', center_h3: h3ToDb(REPUBLIQUE_RES7) }],
  );
  assertEquals(rows.length, 1);
  assertEquals(rows[0]?.sectorId, 's1');
  assertEquals(rows[0]?.name, 'République');
});

Deno.test('parse : un contrat cassé ne fabrique ni alerte ni propriétaire', () => {
  const parsed = parseSectorRow(
    {
      sector_id: 's1',
      owner_kind: 'crew_of_the_moon',
      owner_percent: 'nope',
      status_level: 'boom',
      contested: 'yes',
    },
    { name: 'X', centerH3: h3ToDb(REPUBLIQUE_RES7) },
  );
  assert(parsed);
  assertEquals(parsed.ownerKind, null);
  assertEquals(parsed.ownerPercent, 0);
  assertEquals(parsed.statusLevel, 0);
  assertEquals(parsed.contested, false, '« yes » n’est pas true');
});
