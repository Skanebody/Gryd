import type { SupabaseClient } from 'npm:@supabase/supabase-js@^2';
import { computeProgressLedger2026 } from './progression2026.ts';

/** Full normalized evidence + immutable settings history, under optimistic
 * concurrency. An interrupted calculation can be resumed independently of GPS. */
export async function recomputeProgression2026(db: SupabaseClient, userId: string, runId: string | null = null) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const snapshot = await db.rpc('progress_snapshot_2026', { p_user_id: userId });
    if (snapshot.error || !snapshot.data) throw new Error('progress_snapshot_unavailable');
    const s = snapshot.data;
    const ledger = computeProgressLedger2026({
      accountId: userId, accountCreatedAt: s.accountCreatedAt,
      initialTimeZone: s.initialTimeZone, timezoneChanges: s.timezoneChanges ?? [],
      initialCollectionId: s.initialCollectionId ?? null,
      initialCollectionEffectiveAt: s.initialCollectionEffectiveAt ?? null,
      collectionSelections: s.collectionSelections ?? [], activities: s.activities,
    });
    const committed = await db.rpc('commit_progress_2026', {
      p_user_id: userId, p_version: s.version, p_ledger: ledger, p_run_id: runId,
    });
    if (committed.error) throw new Error('progress_commit_failed');
    if (committed.data?.committed) return { ...committed.data, ledger };
  }
  throw new Error('progress_concurrent_update');
}
