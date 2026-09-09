import type { Activity, IngestRunRequest, IngestRunResponse } from '@klaim/shared';
export interface LocalActivity2026 {
  clientRunId: string; ownerId: string | null; activity: Activity;
  distanceM: number; durationS: number; startedAt: string; finishedAt: string; pending: boolean;
  traceSegments: readonly (readonly { lat: number; lng: number }[])[];
  result?: IngestRunResponse | null;
  /** Exact recorded upload evidence. Older archives without it are never reconstructed. */
  uploadPayload?: IngestRunRequest;
  /** Durable consent receipt doubles as a resumable migration journal. */
  adoption2026?: { consentedAt: string; uploadEnqueued: boolean };
}
export function ownSnapshot2026<T>(snapshot: { ownerId: string | null; value: T } | null, ownerId: string | null): T | null {
  return snapshot?.ownerId === ownerId ? snapshot.value : null;
}
export function adoptedPayload2026(activity: LocalActivity2026): IngestRunRequest | null {
  const payload = activity.uploadPayload;
  if (!activity.ownerId || !activity.adoption2026 || !payload || payload.clientRunId !== activity.clientRunId ||
      payload.recordingOwnerId != null && payload.recordingOwnerId !== activity.ownerId || !Array.isArray(payload.points) || !Number.isFinite(Date.parse(payload.startedAt))) return null;
  // Consent to storage is not consent to publishing a past trace. No retroactive anchor.
  const { recordingSessionId: _anchor, ...recorded } = payload;
  return { ...recorded, recordingOwnerId: activity.ownerId, sharedMapParticipation: false, shared: false };
}
export function planLocalAdoption2026(activities: readonly LocalActivity2026[], ownerId: string, consent: boolean, consentedAt: string) {
  if (!consent || !ownerId) return { activities: [...activities], adopted: 0, localOnly: 0 };
  const occupied = new Set(activities.filter(item => item.ownerId !== null).map(item => item.clientRunId));
  const adoptedIds = new Set<string>(); let localOnly = 0;
  const next: LocalActivity2026[] = [];
  for (const item of activities) {
    if (item.ownerId !== null || occupied.has(item.clientRunId)) { next.push(item); continue; }
    if (adoptedIds.has(item.clientRunId)) continue;
    const adopted: LocalActivity2026 = { ...item, ownerId, adoption2026: { consentedAt, uploadEnqueued: false } };
    const payload = adoptedPayload2026(adopted);
    adopted.pending = payload !== null;
    if (!payload) localOnly++;
    next.push(adopted); adoptedIds.add(item.clientRunId);
  }
  return { activities: next, adopted: adoptedIds.size, localOnly };
}
