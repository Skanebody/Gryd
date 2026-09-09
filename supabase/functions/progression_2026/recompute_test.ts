import { assertEquals, assertRejects } from 'jsr:@std/assert@1';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@^2';
import { recomputeProgression2026 } from '../_shared/recomputeProgress2026.ts';

const activity = (id: string, day: string) => ({
  canonicalId: id, revision: 1, sport: 'run', startedAt: `${day}T09:00:00Z`,
  endedAt: `${day}T09:10:00Z`, receivedAt: `${day}T09:10:00Z`, source: 'gps',
  eligibility: 'eligible', movement: [{ start: `${day}T09:00:00Z`, end: `${day}T09:10:00Z` }],
});
const snapshot = {
  version: 5, accountCreatedAt: '2026-01-01T00:00:00Z', initialTimeZone: 'Europe/Paris',
  initialCollectionId: 'autumn', initialCollectionEffectiveAt: '2026-09-06T22:00:00Z',
  collectionSelections: [{ collectionId: 'archive', selectedAt: '2026-09-08T12:00:00Z' }],
  timezoneChanges: [{ timeZone: 'America/New_York', requestedAt: '2026-09-08T12:00:00Z', effectiveAt: '2026-09-13T22:00:00Z' }],
  activities: [activity('first', '2026-09-08'), activity('second', '2026-09-09')],
};

Deno.test('progress refresh uses complete evidence, dated collections and timezone history', async () => {
  const calls: { name: string; args: Record<string, unknown> }[] = [];
  const db = { rpc: (name: string, args: Record<string, unknown>) => {
    calls.push({ name, args });
    return Promise.resolve({ data: name === 'progress_snapshot_2026' ? snapshot : { committed: true, xpDelta: 0 }, error: null });
  } } as unknown as SupabaseClient;
  const result = await recomputeProgression2026(db, 'owner');
  assertEquals(result.ledger.totalXp, 200);
  assertEquals(result.ledger.collections, { archive: 100, autumn: 100 });
  assertEquals(calls.map(c => c.name), ['progress_snapshot_2026', 'commit_progress_2026']);
  assertEquals(calls[1]!.args.p_user_id, 'owner'); assertEquals(calls[1]!.args.p_run_id, null);
});

Deno.test('concurrent progress refresh retries with a fresh complete snapshot and retains run receipt', async () => {
  let reads = 0;
  const versions: unknown[] = [];
  const db = { rpc: (name: string, args: Record<string, unknown>) => {
    if (name === 'progress_snapshot_2026') {
      reads++;
      return Promise.resolve({ data: { ...snapshot, version: reads, activities: snapshot.activities.slice(0, reads) }, error: null });
    }
    versions.push(args.p_version);
    return Promise.resolve({ data: { committed: reads > 1, runXpAwarded: 100, xpDelta: 100 }, error: null });
  } } as unknown as SupabaseClient;
  const result = await recomputeProgression2026(db, 'owner', 'run');
  assertEquals(versions, [1, 2]); assertEquals(result.ledger.totalXp, 200);
  assertEquals(result.runXpAwarded, 100);
});

Deno.test('missing durable history fails closed and never commits an empty career', async () => {
  let commits = 0;
  const db = { rpc: (name: string) => {
    if (name === 'commit_progress_2026') commits++;
    return Promise.resolve({ data: null, error: { message: 'unavailable' } });
  } } as unknown as SupabaseClient;
  await assertRejects(() => recomputeProgression2026(db, 'owner'), Error, 'progress_snapshot_unavailable');
  assertEquals(commits, 0);
});

Deno.test('progress refresh reports contention and write failures explicitly', async () => {
  let calls = 0;
  const busy = { rpc: (name: string) => {
    calls++;
    return Promise.resolve({ data: name === 'progress_snapshot_2026' ? snapshot : { committed: false }, error: null });
  } } as unknown as SupabaseClient;
  await assertRejects(() => recomputeProgression2026(busy, 'owner'), Error, 'progress_concurrent_update');
  assertEquals(calls, 6);
  const failed = { rpc: (name: string) => Promise.resolve(name === 'progress_snapshot_2026' ?
    { data: snapshot, error: null } : { data: null, error: { message: 'storage unavailable' } }) } as unknown as SupabaseClient;
  await assertRejects(() => recomputeProgression2026(failed, 'owner'), Error, 'progress_commit_failed');
});
