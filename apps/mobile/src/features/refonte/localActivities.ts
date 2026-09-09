import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { useSession } from '../../lib/session';

export type { LocalActivity2026 } from './localActivityModel2026';
import { type LocalActivity2026, ownSnapshot2026, planLocalAdoption2026, adoptedPayload2026 } from './localActivityModel2026';
import { supabase } from '../../lib/supabase';

const KEY = 'gryd.completedActivities.2026';
const listeners = new Set<() => void>();
let serial: Promise<unknown> = Promise.resolve();
export async function readLocalActivities2026(): Promise<LocalActivity2026[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('Unreadable local journal');
  if (parsed.some(a => typeof a?.clientRunId !== 'string' || !a.clientRunId || !Number.isFinite(a.distanceM) || !Number.isFinite(a.durationS))) throw new Error('Unreadable local journal entry');
  return parsed as LocalActivity2026[];
}
/** The success result follows a durable write. Existing outings are never evicted. */
export function saveLocalActivity2026(activity: LocalActivity2026): Promise<boolean> {
  const task = serial.then(async () => {
    try {
      const current = await readLocalActivities2026();
      const next = [activity, ...current.filter(a => a.clientRunId !== activity.clientRunId || a.ownerId !== activity.ownerId)];
      await AsyncStorage.setItem(KEY, JSON.stringify(next));
      listeners.forEach(fn => fn());
      return true;
    } catch { return false; }
  });
  serial = task;
  return task;
}
interface LocalReadState2026 { activities: LocalActivity2026[]; loading: boolean; failed: boolean }
function useLocalArchive2026(ownerId: string | null) {
  const [read, setRead] = useState<{ ownerId: string | null; value: LocalReadState2026 } | null>(null);
  useEffect(() => {
    let alive = true;
    const refresh = () => { void readLocalActivities2026().then(activities => {
      if (alive) setRead({ ownerId, value: { activities: activities.filter(a => a.ownerId === ownerId), loading: false, failed: false } });
    }).catch(() => { if (alive) setRead({ ownerId, value: { activities: [], loading: false, failed: true } }); }); };
    listeners.add(refresh); refresh();
    return () => { alive = false; listeners.delete(refresh); };
  }, [ownerId]);
  return ownSnapshot2026(read, ownerId) ?? { activities: [], loading: true, failed: false };
}
export function useLocalActivities2026() {
  const { session, loading } = useSession();
  const state = useLocalArchive2026(session?.user.id ?? null);
  return loading ? { activities: [], loading: true, failed: false } : state;
}
/** Counts anonymous activities only; never exposes another account's records. */
export function useAdoptableLocalActivities2026() {
  const state = useLocalArchive2026(null);
  return { count: new Set(state.activities.map(item => item.clientRunId)).size, loading: state.loading, failed: state.failed };
}
async function sessionOwns2026(userId: string): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.auth.getSession();
  return !error && data.session?.user.id === userId;
}
function localMutation2026<T>(work: () => Promise<T>): Promise<T> {
  const next = serial.then(work, work); serial = next.then(() => undefined, () => undefined); return next;
}
export interface AdoptLocalActivitiesResult2026 {
  kind: 'adopted' | 'nothing' | 'auth_required' | 'failed'; adopted: number; queued: number; localOnly: number; pending: number;
}
/** Explicit consent only. Ownership + consent are written before queue mutation so a crash is resumable. */
export async function adoptLocalActivities2026(input: { userId: string; consent: true }): Promise<AdoptLocalActivitiesResult2026> {
  const empty = { adopted: 0, queued: 0, localOnly: 0, pending: 0 };
  if (input.consent !== true || !await sessionOwns2026(input.userId).catch(() => false)) return { kind: 'auth_required', ...empty };
  try {
    const result = await localMutation2026(async () => {
      const current = await readLocalActivities2026();
      if (!await sessionOwns2026(input.userId)) throw new Error('session_changed');
      const plan = planLocalAdoption2026(current, input.userId, input.consent, new Date().toISOString());
      if (plan.adopted > 0) { await AsyncStorage.setItem(KEY, JSON.stringify(plan.activities)); listeners.forEach(fn => fn()); }
      return plan;
    });
    const queued = await resumeConsentedLocalActivityUploads2026(input.userId).catch(() => 0);
    const own = (await readLocalActivities2026()).filter(item => item.ownerId === input.userId && item.adoption2026 && item.pending);
    return { kind: result.adopted ? 'adopted' : 'nothing', adopted: result.adopted, queued, localOnly: result.localOnly, pending: own.length };
  } catch { return { kind: 'failed', ...empty }; }
}
/** Background resumption is allowed only by a durable, earlier explicit consent receipt. */
const adoptionUploadsInFlight2026 = new Map<string, Promise<number>>();
export function resumeConsentedLocalActivityUploads2026(userId: string): Promise<number> {
  const existing = adoptionUploadsInFlight2026.get(userId);
  if (existing) return existing;
  const task = resumeConsentedLocalActivityUploadsOnce2026(userId).finally(() => { adoptionUploadsInFlight2026.delete(userId); });
  adoptionUploadsInFlight2026.set(userId, task);
  return task;
}
async function resumeConsentedLocalActivityUploadsOnce2026(userId: string): Promise<number> {
  if (!await sessionOwns2026(userId).catch(() => false)) return 0;
  const entries = (await readLocalActivities2026()).filter(item => item.ownerId === userId && item.adoption2026 && !item.adoption2026.uploadEnqueued && item.pending);
  // Lazy local boundary avoids a static journal ↔ upload module cycle.
  const { queuePendingUpload } = require('../../lib/pendingUpload') as typeof import('../../lib/pendingUpload');
  let queued = 0;
  for (const entry of entries) {
    if (!await sessionOwns2026(userId).catch(() => false)) break;
    const payload = adoptedPayload2026(entry);
    if (!payload || !await queuePendingUpload(payload)) continue;
    queued++;
    await localMutation2026(async () => {
      const current = await readLocalActivities2026();
      const next = current.map(item => item.clientRunId === entry.clientRunId && item.ownerId === userId && item.adoption2026 ? { ...item, adoption2026: { ...item.adoption2026, uploadEnqueued: true } } : item);
      await AsyncStorage.setItem(KEY, JSON.stringify(next)); listeners.forEach(fn => fn());
    });
  }
  return queued;
}
