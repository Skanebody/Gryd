/**
 * GRYD — sync file au lancement + retour foreground (Never lose a run).
 */
import { useEffect } from 'react';
import { useSession } from './session';
import { subscribeSyncQueue } from './syncQueue';
import { ToastHost, useToast } from '../features/social/Toast';

export function PendingUploadNotifier() {
  const toast = useToast();
  const { session } = useSession();

  useEffect(() => {
    if (session === null) return;
    return subscribeSyncQueue(({ drained, zonesCaptured }) => {
      const n = drained;
      const zones = zonesCaptured;
      toast.show(
        n > 1
          ? `${n} courses synchronisées`
          : zones > 0
            ? `Course synchronisée · +${zones} zones`
            : 'Course synchronisée',
      );
    });
  }, [session, toast]);

  return <ToastHost state={toast} />;
}
