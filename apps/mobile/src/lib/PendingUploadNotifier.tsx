/**
 * GRYD — toast au lancement si une course hors-ligne vient d'être synchronisée.
 */
import { useEffect } from 'react';
import { retryPendingUpload } from '../lib/pendingUpload';
import { ToastHost, useToast } from '../features/social/Toast';

export function PendingUploadNotifier() {
  const toast = useToast();

  useEffect(() => {
    void retryPendingUpload().then((result) => {
      if (!result.ok) return;
      const zones = result.zonesCaptured ?? 0;
      toast.show(
        zones > 0
          ? `Course synchronisée · +${zones} zones`
          : 'Course synchronisée',
      );
    });
  }, []);

  return <ToastHost state={toast} />;
}
