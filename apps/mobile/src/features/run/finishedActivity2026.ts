import type { LocalActivity2026 } from '../refonte/localActivityModel2026';
import { createOwnedRunMemory2026 } from './resultOwner2026';
export interface FinishedActivityEvidence2026 {
  activity: LocalActivity2026;
  archiveSaved: boolean;
  /** Exact recorder evidence was secured in the recovery buffer or upload queue. */
  recoverySaved: boolean;
}
const memory = createOwnedRunMemory2026<FinishedActivityEvidence2026>();
export function setFinishedActivity2026(evidence: FinishedActivityEvidence2026): void {
  memory.set(evidence, { ownerId: evidence.activity.ownerId, clientRunId: evidence.activity.clientRunId });
}
export function clearFinishedActivity2026(): void { memory.clear(); }
export function getFinishedActivity2026(ownerId?: string | null, clientRunId?: string) { return memory.get(ownerId, clientRunId); }

/** URL numbers are navigation hints, never proof of a recorded or durable outing. */
export function resolveResultActivity2026(input: {
  ownerId: string | null | undefined;
  localId?: string;
  activities: readonly LocalActivity2026[];
  finished: FinishedActivityEvidence2026 | null;
}): FinishedActivityEvidence2026 | null {
  if (input.ownerId === undefined) return null;
  const valid = (activity: LocalActivity2026) => activity.ownerId === input.ownerId && !!activity.clientRunId &&
    Number.isFinite(activity.distanceM) && activity.distanceM >= 0 && Number.isFinite(activity.durationS) && activity.durationS >= 0;
  const stored = input.localId ? input.activities.find(activity => activity.clientRunId === input.localId && valid(activity)) : null;
  const finished = input.finished;
  if (stored) {
    const matching = finished && valid(finished.activity) && finished.activity.clientRunId === stored.clientRunId ? finished.activity : null;
    return { activity: matching ? { ...stored, result: stored.result ?? matching.result, pending: stored.pending && matching.pending } : stored, archiveSaved: true, recoverySaved: true };
  }
  if (!finished || !valid(finished.activity) || input.localId && input.localId !== finished.activity.clientRunId ||
    !finished.archiveSaved && !finished.recoverySaved && !finished.activity.result) return null;
  return finished;
}
