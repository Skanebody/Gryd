import { assert, assertEquals } from 'jsr:@std/assert';
import { createProgressMomentLedger2026, createProgressBaselineReader2026, isMomentReadCurrent2026, momentStorageKey2026, type MomentSnapshot2026 } from './progressMomentLedger2026.ts';
const time = Date.parse('2026-09-09T08:00:00Z');
const current = () => true;
const item = (id: string, offset = 1) => ({ id, earnedAt: new Date(time + offset).toISOString() });
const snapshot = (level = 1, ids: string[] = []): MomentSnapshot2026 => ({ level, items: ids.map(id => item(id)) });
function fixture() {
  const disk = new Map<string, string>();
  const storage = { getItem: async (key: string) => disk.get(key) ?? null, setItem: async (key: string, value: string) => { disk.set(key, value); } };
  return { disk, storage, ledger: createProgressMomentLedger2026(storage) };
}
Deno.test('first verified observation is a silent persistent baseline, including a genuine empty collection', async () => {
  const { ledger, disk } = fixture();
  assertEquals(await ledger.claim('a', { progress: snapshot(9, ['old']) }, current), null);
  assert(disk.has(momentStorageKey2026('a')));
  assertEquals(await ledger.claim('a', { progress: snapshot(9, ['old']) }, current), null);
  await ledger.baseline('b', 'badges', { items: [] }, current);
  assertEquals(await ledger.claim('b', { badges: { items: [item('first')] } }, current), { level: null, rewardIds: [], badgeIds: ['first'] });
});
Deno.test('one grouped receipt contains actual level, reward and badge deltas; recreation and login do not replay', async () => {
  const { ledger, storage } = fixture();
  await ledger.baseline('a', 'progress', snapshot(1), current);
  await ledger.baseline('a', 'badges', { items: [] }, current);
  const observed = { progress: snapshot(3, ['poster', 'frame']), badges: { items: [item('first-run')] } };
  assertEquals(await ledger.claim('a', observed, current), { level: 3, rewardIds: ['poster', 'frame'], badgeIds: ['first-run'] });
  const restored = createProgressMomentLedger2026(storage);
  assertEquals(await restored.claim('a', observed, current), null);
});
Deno.test('passive reads seed once without consuming a newer achievement before a focused surface', async () => {
  const { ledger } = fixture();
  await ledger.baseline('a', 'progress', snapshot(1), current);
  await ledger.baseline('a', 'progress', snapshot(2, ['new']), current);
  assertEquals(await ledger.claim('a', { progress: snapshot(2, ['new']) }, current), { level: 2, rewardIds: ['new'], badgeIds: [] });
});
Deno.test('server-confirmed new IDs survive clock skew and response latency; first-baseline history stays silent', async () => {
  const { ledger, disk } = fixture();
  await ledger.baseline('a', 'badges', { items: [item('historic', -10_000)] }, current);
  // Reproduce the old persisted client clock being one minute ahead.
  const key = momentStorageKey2026('a');
  const legacyReceipt = JSON.parse(disk.get(key)!);
  legacyReceipt.domains.badges.baselineAt = time + 60_000;
  disk.set(key, JSON.stringify(legacyReceipt));
  const items = [item('historic', -10_000), item('new', 1), { id: 'undated-server-award', earnedAt: '' }];
  assertEquals(await ledger.claim('a', { badges: { items } }, current), { level: null, rewardIds: [], badgeIds: ['new', 'undated-server-award'] });
  assertEquals(await ledger.claim('a', { badges: { items } }, current), null);
});
Deno.test('a lower or partial later snapshot never lowers the level baseline or forgets ownership', async () => {
  const { ledger } = fixture();
  await ledger.baseline('a', 'progress', snapshot(5, ['owned']), current);
  assertEquals(await ledger.claim('a', { progress: snapshot(2) }, current), null);
  assertEquals(await ledger.claim('a', { progress: snapshot(5, ['owned']) }, current), null);
  assertEquals((await ledger.claim('a', { progress: snapshot(6, ['owned']) }, current))?.level, 6);
});
Deno.test('simultaneous surface claims serialize before display and emit an achievement once', async () => {
  const { ledger } = fixture();
  await ledger.baseline('a', 'progress', snapshot(), current);
  const claims = await Promise.all(Array.from({ length: 5 }, () => ledger.claim('a', { progress: snapshot(2, ['reward']) }, current)));
  assertEquals(claims.filter(Boolean).length, 1);
});
Deno.test('owners cannot share receipts or a persisted baseline even if stored under the wrong key', async () => {
  const { ledger, disk } = fixture();
  await ledger.baseline('a', 'progress', snapshot(8), current);
  disk.set(momentStorageKey2026('b'), disk.get(momentStorageKey2026('a'))!);
  assertEquals(await ledger.claim('b', { progress: snapshot(10, ['b-private']) }, current), null);
  assertEquals((await ledger.claim('a', { progress: snapshot(9, ['a-reward']) }, current))?.rewardIds, ['a-reward']);
  assertEquals(await ledger.claim('b', { progress: snapshot(10, ['b-private']) }, current), null);
});
Deno.test('logout during disk read aborts the claim and does not mutate a different owner', async () => {
  const { storage, ledger } = fixture();
  await ledger.baseline('a', 'progress', snapshot(), current);
  let unblock!: () => void;
  let started!: () => void;
  const reading = new Promise<void>(resolve => { started = resolve; });
  const gate = new Promise<void>(resolve => { unblock = resolve; });
  const delayed = createProgressMomentLedger2026({ ...storage, getItem: async key => { started(); await gate; return storage.getItem(key); } });
  let owner = 'a';
  const pending = delayed.claim('a', { progress: snapshot(2) }, () => owner === 'a');
  await reading; owner = 'b'; unblock();
  assertEquals(await pending, null);
  assertEquals((await ledger.claim('a', { progress: snapshot(2) }, current))?.level, 2);
});
Deno.test('logout or background during receipt write suppresses UI and the persisted receipt prevents a replay', async () => {
  const { storage, ledger } = fixture();
  await ledger.baseline('a', 'progress', snapshot(), current);
  let eligible = true;
  const delayed = createProgressMomentLedger2026({ ...storage, setItem: async (key, value) => { await storage.setItem(key, value); eligible = false; } });
  assertEquals(await delayed.claim('a', { progress: snapshot(2) }, () => eligible), null);
  assertEquals(await ledger.claim('a', { progress: snapshot(2) }, current), null);
});
Deno.test('failed storage reads and writes suppress animation and stop retries for that process', async () => {
  const { storage, ledger } = fixture();
  await ledger.baseline('a', 'progress', snapshot(), current);
  let writes = 0;
  const writeFailure = createProgressMomentLedger2026({ ...storage, setItem: async () => { writes++; throw Error('disk full'); } });
  assertEquals(await writeFailure.claim('a', { progress: snapshot(2) }, current), null);
  assertEquals(await writeFailure.claim('a', { progress: snapshot(2) }, current), null);
  assertEquals(writes, 1);
  let reads = 0;
  const readFailure = createProgressMomentLedger2026({ ...storage, getItem: async () => { reads++; throw Error('private storage'); } });
  assertEquals(await readFailure.claim('a', { progress: snapshot(2) }, current), null);
  assertEquals(await readFailure.claim('a', { progress: snapshot(2) }, current), null);
  assertEquals(reads, 1);
});
Deno.test('corruption, invalid snapshots and anonymous callers cannot manufacture a novelty', async () => {
  const { disk, ledger } = fixture();
  disk.set(momentStorageKey2026('a'), '{broken');
  assertEquals(await ledger.claim('a', { progress: snapshot(20, ['old']) }, current), null);
  assertEquals(await ledger.claim('a', { progress: snapshot(-1) }, current), null);
  assertEquals(await ledger.claim('a', { progress: snapshot(21, ['duplicate', 'duplicate']) }, current), null);
  assertEquals(await ledger.claim('', { progress: snapshot(30) }, current), null);
});
Deno.test('read provenance rejects cross-account snapshots, unresolved auth and A to B to A responses', () => {
  const fromA = { ownerId: 'a', epoch: 1 };
  assertEquals(isMomentReadCurrent2026(fromA, 'a', 1), true);
  for (const [owner, epoch] of [['b', 2], ['a', 3], [null, 2], [undefined, 2]] as const) assertEquals(isMomentReadCurrent2026(fromA, owner, epoch), false);
  assertEquals(isMomentReadCurrent2026(undefined, 'a', 1), false);
  assertEquals(isMomentReadCurrent2026({ ownerId: 'b', epoch: 2 }, 'a', 3), false);
});
Deno.test('session baseline covers direct Map to first result without opening Profile and runs once per login', async () => {
  const { ledger } = fixture();
  let progressReads = 0, badgeReads = 0;
  const prepare = createProgressBaselineReader2026({
    progress: async () => { progressReads++; return snapshot(1); },
    badges: async () => { badgeReads++; return { items: [] }; },
  }, ledger.baseline);
  await Promise.all([prepare('a', 1, current), prepare('a', 1, current)]);
  assertEquals([progressReads, badgeReads], [1, 1]);
  assertEquals(await ledger.claim('a', { progress: snapshot(2, ['first-object']), badges: { items: [item('first-badge')] } }, current), { level: 2, rewardIds: ['first-object'], badgeIds: ['first-badge'] });
});
Deno.test('session baseline makes no guest request and ignores a prior owner response after account switch', async () => {
  const { ledger, disk } = fixture();
  let requests = 0, release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let epoch = 1;
  const prepare = createProgressBaselineReader2026({
    progress: async () => { requests++; await gate; return snapshot(12, ['private-a']); },
    badges: async () => { requests++; await gate; return { items: [item('private-a-badge')] }; },
  }, ledger.baseline);
  await prepare(null, 0, current); await prepare(undefined, 0, current);
  assertEquals(requests, 0);
  const previous = prepare('a', 1, () => epoch === 1);
  epoch = 2; release(); await previous;
  assertEquals(disk.has(momentStorageKey2026('a')), false);
  assertEquals(disk.has(momentStorageKey2026('b')), false);
  assertEquals(requests, 2);
});
Deno.test('a failed passive read never seeds an invented empty collection or prevents the other baseline', async () => {
  const { ledger, disk } = fixture();
  const prepare = createProgressBaselineReader2026({
    progress: async () => { throw Error('offline'); },
    badges: async () => ({ items: [item('existing')] }),
  }, ledger.baseline);
  await prepare('a', 1, current);
  const receipt = JSON.parse(disk.get(momentStorageKey2026('a'))!);
  assertEquals(receipt.domains.progress, undefined);
  assertEquals(receipt.domains.badges.known, ['existing']);
  assertEquals(await ledger.claim('a', { progress: snapshot(15, ['history']) }, current), null);
});
