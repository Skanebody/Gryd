/**
 * GRYD — bootstrap web dev : onboarding sauté + session preview staging.
 */
import { useEffect } from 'react';
import { useOnboardingState } from '../features/onboarding/store';
import { ensureDevPreviewSession } from './devPreview';

export function DevPreviewBootstrap() {
  const { update } = useOnboardingState();

  useEffect(() => {
    void (async () => {
      await update({ onboardingDone: true, firstCaptureDone: true, path: 'run' });
      await ensureDevPreviewSession();
    })();
  }, [update]);

  return null;
}
