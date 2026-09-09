import { assertEquals } from 'jsr:@std/assert@^1';
import { adoptedPayload2026, ownSnapshot2026, planLocalAdoption2026, type LocalActivity2026 } from './localActivityModel2026.ts';
import { enqueuePending, pendingEntriesForOwner2026, pendingOwnerConflict2026 } from '../../lib/pendingUploadQueue.ts';
const A = '00000000-0000-4000-8000-000000000001', B = '00000000-0000-4000-8000-000000000002';
const AT = '2026-09-09T12:00:00Z';
function run(id: string, ownerId: string | null, payload = true): LocalActivity2026 {
  return { clientRunId: id, ownerId, activity: 'run', distanceM: 100, durationS: 40, startedAt: AT, finishedAt: AT, pending: false, traceSegments: [[{lat:48,lng:2}]], ...(payload ? { uploadPayload: { recordingOwnerId: ownerId, clientRunId: id, source: 'gps' as const, startedAt: AT, points: [{lat:48,lng:2,t:Date.parse(AT),acc:8}], sharedMapParticipation: true, recordingSessionId: 'old-anchor' } } : {}) };
}
Deno.test('journal: change account masks old snapshot before a new read resolves', () => {
  const old = { ownerId: A, value: [run('a', A)] };
  assertEquals(ownSnapshot2026(old, B), null);
  assertEquals(ownSnapshot2026(old, null), null);
  assertEquals(ownSnapshot2026(old, A)?.length, 1);
  // A delayed A callback does not become B's data even after B is authenticated.
  assertEquals(ownSnapshot2026({ ownerId: A, value: [run('late', A)] }, B), null);
});
Deno.test('adoption: explicit consent, only anonymous records, other owner never transferred', () => {
  const input = [run('local', null), run('other', B), run('mine', A)];
  assertEquals(planLocalAdoption2026(input, A, false, AT).adopted, 0);
  const plan = planLocalAdoption2026(input, A, true, AT);
  assertEquals(plan.adopted, 1);
  assertEquals(plan.activities[1], input[1]);
  assertEquals(plan.activities[2], input[2]);
  assertEquals(plan.activities[0]?.ownerId, A);
  assertEquals(input[0]?.ownerId, null); // Pure planning never mutates stored evidence.
});
Deno.test('adoption: historical trace without full timed payload remains local without fake GPS', () => {
  const plan = planLocalAdoption2026([run('legacy', null, false)], A, true, AT);
  assertEquals(plan.localOnly, 1); assertEquals(plan.activities[0]?.pending, false);
  assertEquals(adoptedPayload2026(plan.activities[0]!), null);
  assertEquals(plan.activities[0]?.traceSegments.length, 1);
});
Deno.test('adoption: payload keeps recorded points, becomes private and has no retroactive anchor', () => {
  const original = run('trial', null);
  const adopted = planLocalAdoption2026([original], A, true, AT).activities[0]!;
  const payload = adoptedPayload2026(adopted)!;
  assertEquals(payload.points, original.uploadPayload!.points);
  assertEquals(payload.recordingOwnerId, A);
  assertEquals(payload.recordingSessionId, undefined);
  assertEquals(payload.sharedMapParticipation, false);
  assertEquals(payload.shared, false);
});
Deno.test('adoption: crash after durable consent resumes once; crash after enqueue cannot duplicate', () => {
  // Disk contains ownership and consent, but the process died before queuing.
  const disk = JSON.parse(JSON.stringify(planLocalAdoption2026([run('trial', null)], A, true, AT).activities)) as LocalActivity2026[];
  assertEquals(planLocalAdoption2026(disk, A, true, AT).adopted, 0);
  assertEquals(disk[0]?.adoption2026?.uploadEnqueued, false);
  const payload = adoptedPayload2026(disk[0]!)!;
  const queued = enqueuePending([], payload, 1);
  const afterSecondCrash = enqueuePending(queued.queue, payload, 2);
  assertEquals(afterSecondCrash.queue.length, 1);
  assertEquals(afterSecondCrash.queue[0]?.payload.recordingOwnerId, A);
  assertEquals(afterSecondCrash.queue[0]?.queuedAt, 1);
});
Deno.test('adoption: duplicate anonymous ids deduplicate; collision with other account never overwrites', () => {
  const plan = planLocalAdoption2026([run('same', null), run('same', null), run('conflict', B), run('conflict', null)], A, true, AT);
  assertEquals(plan.adopted, 1);
  assertEquals(plan.activities.filter(item => item.clientRunId === 'same').length, 1);
  assertEquals(plan.activities.find(item => item.clientRunId === 'conflict' && item.ownerId === B)?.ownerId, B);
  assertEquals(plan.activities.find(item => item.clientRunId === 'conflict' && item.ownerId === null)?.ownerId, null);
});
Deno.test('adoption: foreign embedded payload cannot be uploaded under the new account', () => {
  const record = run('mismatch', null); record.uploadPayload = { ...record.uploadPayload!, recordingOwnerId: B };
  const plan = planLocalAdoption2026([record], A, true, AT);
  assertEquals(plan.localOnly, 1); assertEquals(plan.activities[0]?.pending, false);
});

Deno.test('pending adoption: only exact owner entries send; anonymous and other owners never block it', () => {
  const entries = [run('b', B), run('anonymous', null), run('a', A)].map(item => ({ payload: item.uploadPayload!, queuedAt: 1 }));
  assertEquals(pendingEntriesForOwner2026(entries, A).map(entry => entry.payload.clientRunId), ['a']);
  assertEquals(pendingEntriesForOwner2026(entries, B).map(entry => entry.payload.clientRunId), ['b']);
  assertEquals(pendingEntriesForOwner2026(entries, '').length, 0);
  assertEquals(entries.length, 3);
  assertEquals(pendingOwnerConflict2026(entries, { ...entries[0]!.payload, recordingOwnerId: A }), true);
  assertEquals(pendingOwnerConflict2026(entries, entries[2]!.payload), false);
});
