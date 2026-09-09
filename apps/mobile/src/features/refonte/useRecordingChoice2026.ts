import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';
import { useResultOwner2026 } from '../run/useResultOwner2026';
import { isResultOwnerCurrent2026 } from '../run/resultOwner2026';
import { createRecordingChoiceStore2026 } from './recordingChoiceModel2026';
const store = createRecordingChoiceStore2026(AsyncStorage);
export function useRecordingChoice2026() {
  const { ownerId, epoch } = useResultOwner2026();
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  useEffect(() => { void store.load(ownerId); }, [ownerId, epoch]);
  const current = snapshot.ownerId === ownerId && isResultOwnerCurrent2026(ownerId, epoch);
  return {
    ownerId, shared: current ? snapshot.shared : false, hasChoice: current && snapshot.hasChoice,
    ready: current && snapshot.status === 'ready', failed: current && snapshot.status === 'failed',
    saving: current && snapshot.saving, saveFailed: current && snapshot.saveFailed,
    currentConsent: (): boolean | null => {
      const latest = store.getSnapshot();
      return isResultOwnerCurrent2026(ownerId, epoch) && latest.ownerId === ownerId && latest.status === 'ready' && !latest.saving ? latest.shared : null;
    },
    reload: () => isResultOwnerCurrent2026(ownerId, epoch) ? store.load(ownerId, true) : Promise.resolve(),
    save: (shared: boolean) => isResultOwnerCurrent2026(ownerId, epoch) ? store.save(ownerId, shared).then(saved => saved && isResultOwnerCurrent2026(ownerId, epoch)) : Promise.resolve(false),
  };
}
