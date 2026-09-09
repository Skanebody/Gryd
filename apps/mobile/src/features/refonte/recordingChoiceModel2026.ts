/** Per-owner durable consent. The recording freezes its own copy at the actual start. */
export type RecordingOwner2026 = string | null | undefined;
export interface RecordingChoice2026 { ownerId: RecordingOwner2026; status: 'unresolved' | 'loading' | 'ready' | 'failed'; shared: boolean; hasChoice: boolean; saving: boolean; saveFailed: boolean }
export const recordingChoiceKey2026 = (owner: string | null) => `gryd.recording.sharedMap.2026.${owner ?? 'local'}`;
export function createRecordingChoiceStore2026(storage: { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> }) {
  let state: RecordingChoice2026 = { ownerId: undefined, status: 'unresolved', shared: false, hasChoice: false, saving: false, saveFailed: false };
  let generation = 0; let serial: Promise<unknown> = Promise.resolve();
  const listeners = new Set<() => void>();
  const emit = (next: RecordingChoice2026) => { state = next; listeners.forEach(fn => fn()); };
  return {
    getSnapshot: () => state,
    subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
    async load(ownerId: RecordingOwner2026, retry = false) {
      if (!retry && state.ownerId === ownerId && state.status !== 'unresolved') return;
      const ticket = ++generation;
      emit({ ownerId, status: ownerId === undefined ? 'unresolved' : 'loading', shared: false, hasChoice: false, saving: false, saveFailed: false });
      if (ownerId === undefined) return;
      try {
        const value = await storage.getItem(recordingChoiceKey2026(ownerId));
        if (ticket !== generation) return;
        if (value !== null && value !== 'private' && value !== 'shared') throw new Error('unreadable_recording_choice');
        emit({ ownerId, status: 'ready', shared: ownerId !== null && value === 'shared', hasChoice: value !== null, saving: false, saveFailed: false });
      } catch { if (ticket === generation) emit({ ...state, status: 'failed' }); }
    },
    save(ownerId: RecordingOwner2026, shared: boolean): Promise<boolean> {
      if (ownerId === undefined || state.ownerId !== ownerId || state.status !== 'ready' || state.saving || (ownerId === null && shared)) return Promise.resolve(false);
      const ticket = generation;
      emit({ ...state, saving: true, saveFailed: false });
      const task = serial.then(async () => {
        try {
          await storage.setItem(recordingChoiceKey2026(ownerId), shared ? 'shared' : 'private');
          if (ticket !== generation || state.ownerId !== ownerId) return false;
          emit({ ...state, shared, hasChoice: true, saving: false }); return true;
        } catch { if (ticket === generation) emit({ ...state, saving: false, saveFailed: true }); return false; }
      });
      serial = task; return task;
    },
  };
}
