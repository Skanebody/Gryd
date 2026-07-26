/**
 * GRYD — tests des dérivations « Profil sans lentille » (E14, 26/07/2026).
 *
 * Les TROIS profils exigés par le chantier sont verrouillés ici, et le test
 * décisif est le troisième : « à vélo seul ». C'est lui qui échouait dans la
 * vraie app — le Profil déclarait « nouveau joueur » un cycliste qui tient du
 * territoire, masquait ses métriques et lui affichait PREMIÈRE MISSION.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { ACTIVITIES } from '../../../../../packages/shared/src/game-rules.ts';
import {
  illustratedWorlds,
  isNewPlayerAcrossActivities,
  profileTerritoryView,
  type WorldMeasure,
} from './profileTerritory.ts';
import { splitClaimsByActivity, type HexClaimRowWithActivity } from './claimsByActivity.ts';

const EMPTY: WorldMeasure = { areaM2: 0, zones: 0 };

// ─── Les trois profils ──────────────────────────────────────────────────────

Deno.test('à pied seul : un seul monde, et l’écran le NOMME', () => {
  const view = profileTerritoryView({ run: { areaM2: 1_240_000, zones: 8 }, bike: EMPTY });
  assertEquals(view.kind, 'single');
  if (view.kind !== 'single') throw new Error('variante inattendue');
  assertEquals(view.world.activity, 'run');
  assertEquals(view.world.zones, 8);
  assertEquals(isNewPlayerAcrossActivities(view), false);
});

Deno.test('à VÉLO seul : ce n’est PAS un nouveau joueur — le défaut prouvé du 26/07', () => {
  const view = profileTerritoryView({ run: EMPTY, bike: { areaM2: 3_800_000, zones: 21 } });
  assertEquals(view.kind, 'single');
  if (view.kind !== 'single') throw new Error('variante inattendue');
  // Le cœur du correctif : sa discipline est celle qu'il pratique, pas le défaut.
  assertEquals(view.world.activity, 'bike');
  assertEquals(view.world.zones, 21);
  assertEquals(view.world.areaM2, 3_800_000);
  // Et surtout : PREMIÈRE MISSION ne s'affiche pas.
  assertEquals(isNewPlayerAcrossActivities(view), false);
});

Deno.test('hybride : les DEUX mondes, côte à côte, JAMAIS sommés', () => {
  const view = profileTerritoryView({
    run: { areaM2: 1_240_000, zones: 8 },
    bike: { areaM2: 3_800_000, zones: 21 },
  });
  assertEquals(view.kind, 'both');
  if (view.kind !== 'both') throw new Error('variante inattendue');
  assertEquals(view.worlds.length, 2);
  // Aucune variante ne porte de total : le type lui-même l'interdit, et les
  // chiffres restent exactement ceux de leur monde.
  assertEquals(view.worlds[0], { activity: 'run', areaM2: 1_240_000, zones: 8 });
  assertEquals(view.worlds[1], { activity: 'bike', areaM2: 3_800_000, zones: 21 });
  assertEquals(
    view.worlds[0].zones + view.worlds[1].zones !== 0,
    true,
    'garde-fou de lecture : la somme n’est calculée QUE dans ce test, jamais dans le module',
  );
});

Deno.test('aucune donnée : le compte est réellement neuf', () => {
  const view = profileTerritoryView({ run: EMPTY, bike: EMPTY });
  assertEquals(view.kind, 'none');
  assertEquals(isNewPlayerAcrossActivities(view), true);
  assertEquals(illustratedWorlds(view).length, 0);
});

// ─── Détails qui font la différence entre honnête et « à peu près » ─────────

Deno.test('un monde à ZÉRO zone n’est jamais peint (pas de « 0,00 km² à vélo » nu)', () => {
  const view = profileTerritoryView({ run: { areaM2: 1_000, zones: 3 }, bike: EMPTY });
  assertEquals(illustratedWorlds(view).length, 1);
  assertEquals(illustratedWorlds(view)[0].activity, 'run');
});

Deno.test('des zones sans aire lisible restent un territoire (on ne l’efface pas)', () => {
  // Anomalie de géométrie, pas absence de possession : le monde reste montré.
  const view = profileTerritoryView({ run: EMPTY, bike: { areaM2: 0, zones: 4 } });
  assertEquals(view.kind, 'single');
  if (view.kind !== 'single') throw new Error('variante inattendue');
  assertEquals(view.world.activity, 'bike');
});

Deno.test('l’ordre des deux mondes suit celui du commutateur E14', () => {
  const view = profileTerritoryView({
    run: { areaM2: 1, zones: 1 },
    bike: { areaM2: 1, zones: 1 },
  });
  if (view.kind !== 'both') throw new Error('variante inattendue');
  assertEquals(
    view.worlds.map((w) => w.activity),
    [...ACTIVITIES],
  );
});

// ─── La séparation à la SOURCE (une requête, deux mondes) ───────────────────

const ROW = (h3index: string, activity: string, owner: string): HexClaimRowWithActivity => ({
  h3index,
  owner_user_id: owner,
  claim_type: 'claim',
  decay_at: null,
  claimed_at: null,
  activity,
});

Deno.test('splitClaimsByActivity : le MÊME hexagone dans les deux mondes reste deux lignes', () => {
  // Clé primaire composite (h3index, activity), migration 0070 : ce cas est
  // NORMAL, et le fondre compterait deux fois la même parcelle de ville.
  const split = splitClaimsByActivity([
    ROW('8a1f', 'run', 'moi'),
    ROW('8a1f', 'bike', 'un-rival'),
  ]);
  assertEquals(split.rows.run.length, 1);
  assertEquals(split.rows.bike.length, 1);
  assertEquals(split.rows.run[0].owner_user_id, 'moi');
  assertEquals(split.rows.bike[0].owner_user_id, 'un-rival');
  assertEquals(split.unknownCount, 0);
});

Deno.test('splitClaimsByActivity : les deux mondes existent TOUJOURS, même vides', () => {
  const split = splitClaimsByActivity([]);
  for (const a of ACTIVITIES) {
    assert(Array.isArray(split.rows[a]), `le monde « ${a} » doit exister même vide`);
    assertEquals(split.rows[a].length, 0);
  }
});

Deno.test('splitClaimsByActivity : une discipline inconnue n’est ni convertie ni oubliée', () => {
  const split = splitClaimsByActivity([ROW('8a1f', 'trottinette', 'moi'), ROW('8a20', 'run', 'moi')]);
  // Surtout PAS rangée dans la course à pied : ça fabriquerait du territoire.
  assertEquals(split.rows.run.length, 1);
  assertEquals(split.rows.bike.length, 0);
  assertEquals(split.unknownCount, 1);
});
