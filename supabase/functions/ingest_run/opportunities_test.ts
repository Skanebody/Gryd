/**
 * Tests opportunities.ts — coach tactique « opportunités proches » (§carte).
 * Moteur PUR : genre par rôle+pression+contesté, filtre de rayon, tri par
 * distance, limite. Anti pay-to-win : rien d'acheté, tout situationnel.
 */
import { assert, assertEquals } from 'jsr:@std/assert@^1';
import {
  OPPORTUNITY_DEFENSE_PRESSURE_MIN,
  OPPORTUNITY_NEAR_MAX_M,
} from '../_shared/game-rules.ts';
import {
  nearbyOpportunities,
  type OpportunityZone,
} from '../_shared/engine/opportunities.ts';

const ME = { lat: 0, lng: 0 };
/** Point à ~`m` mètres à l'est de ME (1° lng ≈ 111 320 m à l'équateur). */
const atM = (m: number) => ({ lat: 0, lng: m / 111_320 });

const zone = (
  over: Partial<OpportunityZone> & { center: { lat: number; lng: number } },
): OpportunityZone => ({
  sectorId: 's',
  name: 'Z',
  ownerRole: 'neutral',
  pressure: 0,
  contested: false,
  ...over,
});

Deno.test('capture : zone neutre proche → opportunité capture (role neutral)', () => {
  const r = nearbyOpportunities([zone({ ownerRole: 'neutral', center: atM(300) })], ME);
  assertEquals(r.length, 1);
  assertEquals(r[0].kind, 'capture');
  assertEquals(r[0].role, 'neutral');
  assert(Math.abs(r[0].distanceM - 300) <= 3); // haversine ~300 m
});

Deno.test('rival : rival CONTESTÉ → opportunité rival ; rival stable → ignoré', () => {
  const contested = nearbyOpportunities(
    [zone({ ownerRole: 'rival', contested: true, center: atM(400) })],
    ME,
  );
  assertEquals(contested.map((o) => [o.kind, o.role]), [['rival', 'rival']]);
  const stable = nearbyOpportunities(
    [zone({ ownerRole: 'rival', contested: false, center: atM(400) })],
    ME,
  );
  assertEquals(stable.length, 0);
});

Deno.test('defense : zone tenue MENACÉE (pression ≥ seuil) → défendre ; calme → ignoré', () => {
  const threat = nearbyOpportunities(
    [zone({ ownerRole: 'mine', pressure: OPPORTUNITY_DEFENSE_PRESSURE_MIN, center: atM(500) })],
    ME,
  );
  assertEquals(threat.map((o) => [o.kind, o.role]), [['defense', 'mine']]);
  const calm = nearbyOpportunities(
    [zone({ ownerRole: 'mine', pressure: OPPORTUNITY_DEFENSE_PRESSURE_MIN - 1, center: atM(500) })],
    ME,
  );
  assertEquals(calm.length, 0);
});

Deno.test('rayon : au-delà de OPPORTUNITY_NEAR_MAX_M → exclu', () => {
  const r = nearbyOpportunities(
    [zone({ ownerRole: 'neutral', center: atM(OPPORTUNITY_NEAR_MAX_M + 500) })],
    ME,
  );
  assertEquals(r.length, 0);
});

Deno.test('tri par distance croissante + limite 3 (le plus loin coupé)', () => {
  const zones = [900, 100, 500, 300].map((m) =>
    zone({ ownerRole: 'neutral', center: atM(m), sectorId: `s${m}`, name: `Z${m}` }),
  );
  const r = nearbyOpportunities(zones, ME);
  assertEquals(r.length, 3);
  assertEquals(r.map((o) => o.sectorId), ['s100', 's300', 's500']);
});
