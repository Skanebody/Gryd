/**
 * GRYD — orchestration sync file (reconnect + foreground).
 */
import { AppState, type AppStateStatus } from 'react-native';
import { drainPendingUploadQueue, hasPendingUpload } from './pendingUpload';

let draining = false;

export async function drainSyncQueueIfNeeded(): Promise<{
  ok: boolean;
  drained?: number;
  zonesCaptured?: number;
}> {
  if (draining) return { ok: false };
  const pending = await hasPendingUpload();
  if (!pending) return { ok: false };
  draining = true;
  try {
    const result = await drainPendingUploadQueue();
    return {
      ok: result.ok,
      drained: result.drained,
      zonesCaptured: result.zonesCaptured,
    };
  } finally {
    draining = false;
  }
}

/** Écoute retour foreground + poll léger tant qu'il reste des envois. */
export function subscribeSyncQueue(onDrained: (result: { drained: number; zonesCaptured: number }) => void): () => void {
  let pollId: ReturnType<typeof setInterval> | null = null;

  const tryDrain = () => {
    void drainSyncQueueIfNeeded().then((r) => {
      if (r.ok && (r.drained ?? 0) > 0) {
        onDrained({ drained: r.drained ?? 0, zonesCaptured: r.zonesCaptured ?? 0 });
      }
      void hasPendingUpload().then((still) => {
        if (!still && pollId !== null) {
          clearInterval(pollId);
          pollId = null;
        }
      });
    });
  };

  const onAppState = (state: AppStateStatus) => {
    if (state === 'active') tryDrain();
  };

  const sub = AppState.addEventListener('change', onAppState);
  tryDrain();
  pollId = setInterval(tryDrain, 45_000);

  return () => {
    sub.remove();
    if (pollId !== null) clearInterval(pollId);
  };
}
