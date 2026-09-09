import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';
import { careerProgress2026 } from '@klaim/shared';
import { isResultOwnerCurrent2026 } from '../run/resultOwner2026';
import { useResultOwner2026 } from '../run/useResultOwner2026';
import type { MomentReadScope2026 } from './progressMomentLedger2026';
import { progressMomentLedger2026 } from './progressMomentStore2026';
import type { ProfileProgressStatus } from './ProfileMovementState2026';

export interface ProfileProgress2026 {
  /** Client read provenance; the parser never accepts this field from JSON. */
  readScope?: MomentReadScope2026;
  totalXp: number;
  activeDays: number;
  pending: boolean;
  timeZone: string;
  pendingTimeZone: null | { timeZone: string; effectiveAt: string };
  pendingSelection: null | { collectionId: string; effectiveDay: string };
  selectedCollectionId: string | null;
  season: null | { id: string; title: string; startsAt: string; endsAt: string; activeDays: number; stage: number; xp: number; archived: boolean };
  collections: ProgressCollection2026[];
  ownedRewards: OwnedSeasonReward2026[];
  /** §7.2 — objets de niveau octroyés par 0144. Un catalogue peint n'en est pas un. */
  levelRewards: OwnedLevelReward2026[];
}
export interface ProgressCollection2026 { id: string; title: string; startsAt: string; endsAt: string; state: 'current' | 'archived' | 'upcoming'; started: boolean; selectable: boolean; xp: number; stage: number }
export interface OwnedSeasonReward2026 { id: string; collectionId: string; rewardId: string; tier: number; label: string; variant: 'standard' | 'premium'; earnedAt: string; equipped: boolean }
export interface OwnedLevelReward2026 { id: string; rewardId: string; level: number; label: string; equippable: boolean; earnedAt: string; equipped: boolean }

export type { ProfileProgressStatus } from './ProfileMovementState2026';

/** Only the new idempotent ledger is progression. Legacy wallet XP is never reused. */
export function parseProfileProgress(value: unknown): ProfileProgress2026 | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const valid = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0;
  if (row.ruleset !== '2026.1' || !valid(row.totalXp) || !valid(row.activeDays)) return null;
  let season: ProfileProgress2026['season'] = null;
  if (row.season !== null && row.season !== undefined) {
    if (typeof row.season !== 'object') return null;
    const item = row.season as Record<string, unknown>;
    if (typeof item.id !== 'string' || typeof item.title !== 'string' || typeof item.startsAt !== 'string' || typeof item.endsAt !== 'string' || !valid(item.xp) || !valid(item.activeDays) || !valid(item.stage) || typeof item.archived !== 'boolean') return null;
    season = { id: item.id, title: item.title, startsAt: item.startsAt, endsAt: item.endsAt, activeDays: item.activeDays, stage: item.stage, xp: item.xp, archived: item.archived };
  }
  if (typeof row.pending !== 'boolean' || typeof row.timeZone !== 'string' || !Array.isArray(row.collections) || !Array.isArray(row.ownedRewards)) return null;
  // Un serveur antérieur à 0144 n'envoie pas ce champ : absent = aucun objet de
  // niveau CONNU, jamais un catalogue coché de repli.
  if (row.levelRewards !== undefined && !Array.isArray(row.levelRewards)) return null;
  const collections = row.collections.filter((v): v is ProgressCollection2026 => !!v && typeof v === 'object' && typeof v.id === 'string' && typeof v.title === 'string' && typeof v.startsAt === 'string' && typeof v.endsAt === 'string' && ['current', 'archived', 'upcoming'].includes(v.state) && typeof v.selectable === 'boolean' && typeof v.started === 'boolean' && valid(v.xp) && valid(v.stage));
  const ownedRewards = row.ownedRewards.filter((v): v is OwnedSeasonReward2026 => !!v && typeof v === 'object' && typeof v.id === 'string' && typeof v.collectionId === 'string' && typeof v.rewardId === 'string' && typeof v.label === 'string' && typeof v.earnedAt === 'string' && ['standard', 'premium'].includes(v.variant) && valid(v.tier) && typeof v.equipped === 'boolean');
  const rawLevelRewards = Array.isArray(row.levelRewards) ? row.levelRewards : [];
  const levelRewards = rawLevelRewards.filter((v): v is OwnedLevelReward2026 => !!v && typeof v === 'object' && typeof v.id === 'string' && typeof v.rewardId === 'string' && typeof v.label === 'string' && typeof v.earnedAt === 'string' && valid(v.level) && typeof v.equippable === 'boolean' && typeof v.equipped === 'boolean');
  if (collections.length !== row.collections.length || ownedRewards.length !== row.ownedRewards.length || levelRewards.length !== rawLevelRewards.length) return null;
  const selection = row.pendingSelection as Record<string, unknown> | null;
  const zone = row.pendingTimeZone as Record<string, unknown> | null;
  return { totalXp: row.totalXp, activeDays: row.activeDays, season, pending: row.pending, timeZone: row.timeZone, collections, ownedRewards, levelRewards,
    selectedCollectionId: typeof row.selectedCollectionId === 'string' ? row.selectedCollectionId : null,
    pendingSelection: selection && typeof selection.collectionId === 'string' && typeof selection.effectiveDay === 'string' ? { collectionId: selection.collectionId, effectiveDay: selection.effectiveDay } : null,
    pendingTimeZone: zone && typeof zone.timeZone === 'string' && typeof zone.effectiveAt === 'string' ? { timeZone: zone.timeZone, effectiveAt: zone.effectiveAt } : null,
  };
}

export function useProfileProgress() {
  const { session, loading: sessionLoading } = useSession();
  const { ownerId: authorityOwner, epoch } = useResultOwner2026();
  const [data, setData] = useState<ProfileProgress2026 | null>(null);
  const [status, setStatus] = useState<ProfileProgressStatus>('loading');
  const [tick, setTick] = useState(0);
  const [ownerId, setOwnerId] = useState<string | undefined>(undefined);
  const reload = useCallback(() => setTick(t => t + 1), []);
  const userId = session?.user.id;
  useFocusEffect(useCallback(() => {
    let current = true;
    setData(null);
    setOwnerId(userId);
    if (sessionLoading || authorityOwner === undefined || userId && userId !== authorityOwner) { setStatus('loading'); return; }
    if (!userId) { setStatus('signed-out'); return; }
    if (!supabase) { setStatus('unavailable'); return; }
    setStatus('loading');
    void supabase.functions.invoke('progression_2026', { body: {} }).then(result => {
      if (!current || !isResultOwnerCurrent2026(userId, epoch)) return;
      if (result.error) {
        setStatus('failed');
        return;
      }
      const parsed = parseProfileProgress(result.data);
      if (parsed && !parsed.pending) void progressMomentLedger2026.baseline(userId, 'progress', {
        level: careerProgress2026(parsed.totalXp).level,
        items: parsed.ownedRewards.map(item => ({ id: item.id, earnedAt: item.earnedAt })),
      }, () => current && isResultOwnerCurrent2026(userId, epoch));
      setData(parsed ? { ...parsed, readScope: { ownerId: userId, epoch } } : null);
      setStatus(parsed ? 'ready' : 'failed');
    }, () => { if (current && isResultOwnerCurrent2026(userId, epoch)) setStatus('failed'); });
    return () => { current = false; };
  }, [userId, sessionLoading, tick, authorityOwner, epoch]));
  // The render immediately following an account change must not expose the
  // previous account while the focus effect is still waiting to run.
  const scoped = !!userId && authorityOwner === userId && ownerId === userId && data?.readScope?.epoch === epoch;
  return { status: sessionLoading ? 'loading' as const : !userId ? 'signed-out' as const : authorityOwner !== userId || ownerId !== userId || status === 'ready' && !scoped ? 'loading' as const : status, data: scoped ? data : null, reload };
}
