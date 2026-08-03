/**
 * GRYD — un payload mal formé se répond 400 sans un mot (lot M6).
 *
 * `isIngestRunRequest` (ingest_run/index.ts:224) refuse en bloc et n'explique
 * rien : depuis l'app, un 400 ne se diagnostique pas, il se prévient. D'où ces
 * tests, qui portent sur la FORME exacte du contrat serveur.
 */
import { buildRunPayload, type RawPoint } from './payload';

declare const Deno: { test(nom: string, fn: () => void | Promise<void>): void };

function assert(condition: boolean, message = 'assertion échouée'): void {
  if (!condition) throw new Error(message);
}
function assertEquals(actual: unknown, expected: unknown, message = 'valeurs différentes'): void {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message}\n  attendu : ${String(expected)}\n  obtenu  : ${String(actual)}`);
  }
}

const T0 = 1_770_000_000_000;
const P = (i: number): RawPoint => ({ lat: 49.4431 + i * 0.0001, lng: 1.0993, ts: T0 + i * 1000, accuracy: 8 });
const TRACE = [P(0), P(1), P(2)];

Deno.test('`startedAt` est une CHAÎNE ISO — un nombre y répond 400', () => {
  const p = buildRunPayload({ clientRunId: 'r1', startedAt: T0, points: TRACE });
  assert(p !== null);
  assertEquals(typeof p?.startedAt, 'string');
  assertEquals(p?.startedAt, new Date(T0).toISOString());
});

Deno.test('chaque point porte exactement lat/lng/t — le champ s’appelle `t`, pas `ts`', () => {
  const p = buildRunPayload({ clientRunId: 'r1', startedAt: T0, points: TRACE });
  const q = p?.points[0];
  assertEquals(Object.keys(q ?? {}).sort().join(','), 'lat,lng,t');
  assertEquals(q?.t, T0);
});

Deno.test('la discipline et le mode sont DÉCLARÉS, jamais laissés à deviner', () => {
  const p = buildRunPayload({ clientRunId: 'r1', startedAt: T0, points: TRACE });
  assertEquals(p?.activity, 'run');
  assertEquals(p?.runMode, 'conquete');
  assertEquals(p?.source, 'gps');
});

Deno.test('`clientRunId` est repris TEL QUEL — jamais régénéré (idempotence D14)', () => {
  const p = buildRunPayload({ clientRunId: 'abc-123', startedAt: T0, points: TRACE });
  assertEquals(p?.clientRunId, 'abc-123');
  // Sans identifiant, on n'invente pas : le renvoi ne serait plus idempotent.
  assertEquals(buildRunPayload({ clientRunId: '', startedAt: T0, points: TRACE }), null);
});

Deno.test('un GO annulé n’est PAS une course rejetée : rien n’est envoyé', () => {
  // Envoyer une trace vide ferait répondre `no_valid_points`, donc afficher un
  // REFUS pour une course qui n'a jamais eu lieu (L19).
  assertEquals(buildRunPayload({ clientRunId: 'r1', startedAt: T0, points: [] }), null);
  assertEquals(buildRunPayload({ clientRunId: 'r1', startedAt: T0, points: [P(0)] }), null);
});

Deno.test('les points illisibles sont ÉCARTÉS, jamais corrigés', () => {
  // Ramener une latitude de 91 à 90 déplacerait la trace de kilomètres sans
  // qu'aucune ligne ne le dise.
  const sales: RawPoint[] = [
    { lat: 91, lng: 1, ts: T0 },
    { lat: Number.NaN, lng: 1, ts: T0 },
    { lat: 49, lng: 181, ts: T0 },
    { lat: 49, lng: 1, ts: Number.NaN },
  ];
  const p = buildRunPayload({ clientRunId: 'r1', startedAt: T0, points: [...TRACE, ...sales] });
  assertEquals(p?.points.length, 3);
});

Deno.test('un départ aberrant n’est pas envoyé', () => {
  for (const v of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assertEquals(buildRunPayload({ clientRunId: 'r1', startedAt: v, points: TRACE }), null, `startedAt ${String(v)}`);
  }
});
