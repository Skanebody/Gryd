/**
 * Tests recompute_sectors/logic.ts — la partie PURE du job (§C, A-41 §2, 0061).
 * Purs : lignes construites en mémoire, aucun réseau.
 *
 * Ce que ces tests tiennent, et qu'aucune relecture ne tient durablement :
 *   • le payload d'upsert ne porte JAMAIS `owner_kind` / `top_rival_kind`
 *     (colonnes GÉNÉRÉES : les inclure ferait échouer tout le lot en prod) ;
 *   • un joueur SANS crew arrive jusqu'à `owner_user_id` (il n'est plus effacé) ;
 *   • un secteur SANS propriétaire (plancher de domination) est écrit tel quel,
 *     neutre, sans crash et sans propriétaire de repli.
 */
import { assertEquals, assertFalse } from 'jsr:@std/assert@^1';
import { SECTOR_CONTROL_THRESHOLDS } from '../_shared/game-rules.ts';
import { computeSectorSnapshot } from '../_shared/engine/sectorSnapshot.ts';
import {
  type ActivityRow,
  groupHoldingsBySector,
  type HoldingRow,
  indexActivityBySector,
  toSnapshotPayload,
} from './logic.ts';

const NOW = new Date('2026-07-23T10:00:00Z');
const NOW_ISO = NOW.toISOString();
const SECTOR = 'sector-belleville';
const CREW_A = 'crew-aaa';
const CREW_B = 'crew-bbb';
const SOLO = 'user-solo';
const FLOOR = SECTOR_CONTROL_THRESHOLDS.implantation;

function holding(over: Partial<HoldingRow> = {}): HoldingRow {
  return {
    sector_id: SECTOR,
    crew_id: CREW_A,
    holder_user_id: null,
    control_percent: '0.5000',
    ...over,
  };
}

/** Payload complet d'un secteur, comme le fait l'étape 4 du job. */
function payloadFor(rows: readonly HoldingRow[], acts: readonly ActivityRow[] = []) {
  const bySector = groupHoldingsBySector(rows);
  const activity = indexActivityBySector(acts);
  const ctrl = bySector.get(SECTOR) ?? [];
  const act = activity.get(SECTOR) ?? {};
  return toSnapshotPayload(SECTOR, computeSectorSnapshot(ctrl, act, NOW), act.lastAttackAt, NOW_ISO);
}

Deno.test('mapping : un crew détenteur arrive au moteur avec son crewId (percent numérique)', () => {
  const bySector = groupHoldingsBySector([holding({ control_percent: '0.4200' })]);
  assertEquals(bySector.get(SECTOR), [
    { crewId: CREW_A, userId: null, controlPercent: 0.42 },
  ]);
});

Deno.test('mapping : un joueur SANS crew garde son identité (userId), jamais effacé', () => {
  const bySector = groupHoldingsBySector([
    holding({ crew_id: null, holder_user_id: SOLO, control_percent: 0.6 }),
  ]);
  assertEquals(bySector.get(SECTOR), [
    { crewId: null, userId: SOLO, controlPercent: 0.6 },
  ]);
});

Deno.test('mapping : les lignes se groupent par secteur, sans mélange', () => {
  const bySector = groupHoldingsBySector([
    holding(),
    holding({ crew_id: CREW_B, control_percent: '0.2000' }),
    holding({ sector_id: 'sector-autre', crew_id: CREW_B }),
  ]);
  assertEquals(bySector.size, 2);
  assertEquals(bySector.get(SECTOR)?.length, 2);
  assertEquals(bySector.get('sector-autre')?.length, 1);
});

Deno.test('payload : owner SOLO écrit dans owner_user_id, crew laissé null', () => {
  const p = payloadFor([
    holding({ crew_id: null, holder_user_id: SOLO, control_percent: 0.6 }),
    holding({ crew_id: CREW_B, control_percent: 0.3 }),
  ]);
  assertEquals(p.owner_user_id, SOLO);
  assertEquals(p.owner_crew_id, null);
  assertEquals(p.top_rival_crew_id, CREW_B);
  assertEquals(p.top_rival_user_id, null);
});

Deno.test("payload : jamais de colonne GÉNÉRÉE (owner_kind / top_rival_kind) — l'upsert échouerait", () => {
  const keys = Object.keys(payloadFor([holding()]));
  assertFalse(keys.includes('owner_kind'));
  assertFalse(keys.includes('top_rival_kind'));
  assertEquals(keys.sort(), [
    'contested',
    'last_attack_at',
    'neutral_percent',
    'owner_crew_id',
    'owner_percent',
    'owner_user_id',
    'pressure_score',
    'sector_id',
    'status_level',
    'top_rival_crew_id',
    'top_rival_percent',
    'top_rival_user_id',
    'updated_at',
  ]);
});

Deno.test('payload : secteur sous le plancher → écrit NEUTRE, sans propriétaire de repli', () => {
  const p = payloadFor([
    holding({ control_percent: FLOOR / 2 }),
    holding({ crew_id: CREW_B, control_percent: FLOOR / 4 }),
  ]);
  assertEquals(p.owner_crew_id, null);
  assertEquals(p.owner_user_id, null);
  assertEquals(p.top_rival_crew_id, null);
  assertEquals(p.top_rival_user_id, null);
  assertEquals(p.owner_percent, 0);
  assertEquals(p.neutral_percent, 1);
  assertEquals(p.sector_id, SECTOR);
});

Deno.test('payload : idempotent — mêmes lignes (et même horodatage) → même ligne écrite', () => {
  const rows = [
    holding({ control_percent: '0.5000' }),
    holding({ crew_id: CREW_B, control_percent: '0.3000' }),
  ];
  assertEquals(payloadFor(rows), payloadFor([...rows].reverse()));
});

Deno.test('activité : last_attack_at remonte dans le payload ; absente → null', () => {
  const attack = '2026-07-22T08:30:00.000Z';
  const withAct = payloadFor([holding()], [{
    sector_id: SECTOR,
    zones_lost_recent: 4,
    rival_reclaimed_24h: 2,
    last_attack_at: attack,
    decay_fraction: '0.2000',
  }]);
  assertEquals(withAct.last_attack_at, attack);
  assertEquals(payloadFor([holding()]).last_attack_at, null);
});

Deno.test('activité : une vue qui rend null ne fabrique pas de signal (0, pas NaN)', () => {
  const act = indexActivityBySector([{
    sector_id: SECTOR,
    zones_lost_recent: null,
    rival_reclaimed_24h: null,
    last_attack_at: null,
    decay_fraction: null,
  }]).get(SECTOR);
  assertEquals(act, {
    zonesLostRecent: 0,
    rivalReclaimed24h: 0,
    decayFraction: 0,
    lastAttackAt: null,
  });
});
