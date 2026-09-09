import { useSyncExternalStore } from 'react';
import { currentResultOwner2026, resultOwnerEpoch2026, subscribeResultOwner2026 } from './resultOwner2026';
/** Synchronous auth transitions hide stale content even before SessionContext commits its next render. */
export function useResultOwner2026() {
  const epoch = useSyncExternalStore(subscribeResultOwner2026, resultOwnerEpoch2026, resultOwnerEpoch2026);
  return { ownerId: currentResultOwner2026(), epoch };
}
