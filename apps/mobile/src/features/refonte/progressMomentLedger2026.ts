/** Presentation receipts only: never awards XP, an item, or a sporting capability. */
export type MomentDomain2026 = 'progress' | 'badges';
export interface MomentSnapshot2026 { level?: number; items: readonly { id: string; earnedAt: string }[] }
export interface MomentClaim2026 { level: number | null; rewardIds: string[]; badgeIds: string[] }
export interface MomentReadScope2026 { ownerId: string; epoch: number }
/** Read provenance is captured before the request, never relabelled on render. */
export function isMomentReadCurrent2026(scope: MomentReadScope2026 | null | undefined, ownerId: string | null | undefined, epoch: number) {
  return !!ownerId && scope?.ownerId === ownerId && scope.epoch === epoch;
}
interface DomainMemory { level: number; known: string[] }
interface Receipt { version: 1; ownerId: string; domains: Partial<Record<MomentDomain2026, DomainMemory>> }
interface Storage { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<unknown> }
const emptyClaim = (): MomentClaim2026 => ({ level: null, rewardIds: [], badgeIds: [] });
export const momentStorageKey2026 = (ownerId: string) => `gryd.progress-moments.v1:${ownerId}`;
function parse(raw: string | null, ownerId: string): Receipt | null {
  try {
    const value = raw ? JSON.parse(raw) : null;
    if (value?.version !== 1 || value.ownerId !== ownerId || !value.domains || typeof value.domains !== 'object' || Array.isArray(value.domains)) return null;
    for (const key of ['progress', 'badges'] as const) {
      const row = value.domains[key];
      if (row && (!Number.isSafeInteger(row.level) || row.level < 0 || !Array.isArray(row.known) || row.known.some((id: unknown) => typeof id !== 'string'))) return null;
    }
    return value;
  } catch { return null; }
}
function valid(snapshot: MomentSnapshot2026) {
  return (snapshot.level === undefined || Number.isSafeInteger(snapshot.level) && snapshot.level >= 0) &&
    snapshot.items.every(item => typeof item.id === 'string' && item.id.length > 0 && typeof item.earnedAt === 'string') &&
    new Set(snapshot.items.map(item => item.id)).size === snapshot.items.length;
}
/** One serial queue per owner prevents duplicate claims from mounted screens.
 * A receipt is written BEFORE returning a moment; storage failure suppresses it.
 * A crash between that write and display may omit a moment, never replay one.
 */
export function createProgressMomentLedger2026(storage: Storage) {
  const queues = new Map<string, Promise<unknown>>();
  const unavailable = new Set<string>();
  function execute(ownerId: string, snapshots: Partial<Record<MomentDomain2026, MomentSnapshot2026>>, claim: boolean, isCurrent: () => boolean): Promise<MomentClaim2026 | null> {
    const work = async () => {
      if (!ownerId || unavailable.has(ownerId) || !isCurrent() || Object.values(snapshots).some(snapshot => !valid(snapshot))) return null;
      try {
        const raw = await storage.getItem(momentStorageKey2026(ownerId));
        if (!isCurrent()) return null;
        const receipt = parse(raw, ownerId) ?? { version: 1 as const, ownerId, domains: {} };
        const result = emptyClaim();
        let changed = false;
        for (const domain of ['progress', 'badges'] as const) {
          const snapshot = snapshots[domain];
          if (!snapshot) continue;
          const previous = receipt.domains[domain];
          // Passive profile reads establish the first baseline, never consume a
          // later achievement before its dedicated, focused surface can show it.
          if (previous && !claim) continue;
          const known = new Set(previous?.known ?? []);
          if (previous) {
            if (domain === 'progress' && snapshot.level !== undefined && snapshot.level > previous.level) result.level = snapshot.level;
            for (const item of snapshot.items) {
              // Both snapshots are server-confirmed. Never compare a server
              // award timestamp to the phone's clock or response arrival time.
              if (!known.has(item.id)) {
                (domain === 'progress' ? result.rewardIds : result.badgeIds).push(item.id);
              }
            }
          }
          snapshot.items.forEach(item => known.add(item.id));
          changed ||= !previous || known.size !== previous.known.length || (snapshot.level ?? 0) > previous.level;
          receipt.domains[domain] = { level: Math.max(previous?.level ?? 0, snapshot.level ?? 0), known: [...known] };
        }
        if (!isCurrent() || !changed) return null;
        await storage.setItem(momentStorageKey2026(ownerId), JSON.stringify(receipt));
        if (!isCurrent()) return null;
        return claim && (result.level !== null || result.rewardIds.length > 0 || result.badgeIds.length > 0) ? result : null;
      } catch {
        // Fail closed for this process. Never poll/retry storage into a replay loop.
        unavailable.add(ownerId);
        return null;
      }
    };
    const task = (queues.get(ownerId) ?? Promise.resolve()).then(work, work);
    queues.set(ownerId, task);
    return task;
  }
  return {
    baseline: (ownerId: string, domain: MomentDomain2026, snapshot: MomentSnapshot2026, isCurrent: () => boolean) => execute(ownerId, { [domain]: snapshot }, false, isCurrent),
    claim: (ownerId: string, snapshots: Partial<Record<MomentDomain2026, MomentSnapshot2026>>, isCurrent: () => boolean) => execute(ownerId, snapshots, true, isCurrent),
  };
}

/** Starts the two passive baselines once per authenticated session epoch.
 * Each successful read is persisted independently; no route or recorder awaits it.
 * A failed read is unknown, never an empty collection. No response survives an
 * authority change, including A → B → A with the same user id but a new epoch.
 */
export function createProgressBaselineReader2026(
  read: Record<MomentDomain2026, (ownerId: string) => Promise<MomentSnapshot2026 | null>>,
  record: (ownerId: string, domain: MomentDomain2026, snapshot: MomentSnapshot2026, isCurrent: () => boolean) => Promise<unknown>,
) {
  const started = new Map<string, Promise<void>>();
  return (ownerId: string | null | undefined, epoch: number, isCurrent: () => boolean): Promise<void> => {
    if (!ownerId || !isCurrent()) return Promise.resolve();
    const key = `${ownerId}:${epoch}`;
    const previous = started.get(key);
    if (previous) return previous;
    const job = Promise.allSettled((['progress', 'badges'] as const).map(async domain => {
      if (!isCurrent()) return;
      const snapshot = await read[domain](ownerId);
      if (snapshot && isCurrent()) await record(ownerId, domain, snapshot, isCurrent);
    })).then(() => {});
    started.set(key, job);
    return job;
  };
}
