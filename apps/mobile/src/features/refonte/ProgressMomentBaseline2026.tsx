import { useEffect, useMemo } from 'react';
import { careerProgress2026 } from '@klaim/shared';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';
import { isResultOwnerCurrent2026 } from '../run/resultOwner2026';
import { useResultOwner2026 } from '../run/useResultOwner2026';
import { parseProfileProgress } from './ProfileProgress';
import { createProgressBaselineReader2026, type MomentSnapshot2026 } from './progressMomentLedger2026';
import { progressMomentLedger2026 } from './progressMomentStore2026';

/** Silent session companion, outside navigation. Never gates the first activity. */
export function ProgressMomentBaseline2026() {
  const { session, loading, configured } = useSession();
  const { ownerId, epoch } = useResultOwner2026();
  const prepare = useMemo(() => createProgressBaselineReader2026({
    progress: async () => {
      if (!supabase) return null;
      const result = await supabase.functions.invoke('progression_2026', { body: {} });
      if (result.error) return null;
      const progress = parseProfileProgress(result.data);
      return progress && !progress.pending ? {
        level: careerProgress2026(progress.totalXp).level,
        items: progress.ownedRewards.map(reward => ({ id: reward.id, earnedAt: reward.earnedAt })),
      } : null;
    },
    badges: async owner => {
      if (!supabase) return null;
      const result = await supabase.from('user_badges').select('badge_key, earned_at').eq('user_id', owner);
      if (result.error || !Array.isArray(result.data)) return null;
      const rows = result.data as { badge_key?: unknown; earned_at?: unknown }[];
      if (rows.some(row => typeof row.badge_key !== 'string' || !row.badge_key)) return null;
      return { items: rows.map(row => ({ id: row.badge_key as string, earnedAt: typeof row.earned_at === 'string' ? row.earned_at : '' })) } satisfies MomentSnapshot2026;
    },
  }, progressMomentLedger2026.baseline), []);
  useEffect(() => {
    if (loading || !configured || !ownerId || session?.user.id !== ownerId) return;
    // This scope has no UI to update. Global session authority, rather than a
    // mount flag, lets a Strict Mode remount reuse its one in-flight request.
    void prepare(ownerId, epoch, () => isResultOwnerCurrent2026(ownerId, epoch));
  }, [prepare, ownerId, epoch, session?.user.id, loading, configured]);
  return null;
}
