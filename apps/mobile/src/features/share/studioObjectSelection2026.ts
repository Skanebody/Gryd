import { currentResultOwner2026, isResultOwnerCurrent2026, resultOwnerEpoch2026 } from '../run/resultOwner2026';
import type { StudioObjectRequest2026 } from './studioObjects2026';
let requested: { request: StudioObjectRequest2026; ownerId: string; epoch: number } | null = null;
export function requestStudioObject2026(request: StudioObjectRequest2026, ownerId: string): boolean {
  if (!ownerId || !isResultOwnerCurrent2026(ownerId)) return false;
  requested = { request: { ...request }, ownerId, epoch: resultOwnerEpoch2026() }; return true;
}
export function requestedStudioObject2026(ownerId = currentResultOwner2026()): StudioObjectRequest2026 | null {
  return requested && ownerId === requested.ownerId && isResultOwnerCurrent2026(ownerId, requested.epoch) ? { ...requested.request } : null;
}
export function clearStudioObject2026() { requested = null; }
