/** Local navigation preferences. These fields never award a capture or grant account access. */
export type OnboardingPath = 'sync' | 'run' | null;
export interface OnboardingState {
  onboardingDone: boolean; firstCaptureDone: boolean; ageConfirmed: boolean;
  path: OnboardingPath; reachedStep: string | null; cityId: string | null; cityName: string | null;
}
export const DEFAULT_ONBOARDING_STATE: OnboardingState = {
  onboardingDone: false, firstCaptureDone: false, ageConfirmed: false,
  path: null, reachedStep: null, cityId: null, cityName: null,
};
export type OnboardingRead2026 = { readonly ok: true; readonly state: OnboardingState } | { readonly ok: false };
export function decodeOnboardingState2026(raw: string | null): OnboardingRead2026 {
  if (raw === null) return { ok: true, state: { ...DEFAULT_ONBOARDING_STATE } };
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false };
    const row = value as Record<string, unknown>;
    for (const key of ['onboardingDone', 'firstCaptureDone', 'ageConfirmed']) if (key in row && typeof row[key] !== 'boolean') return { ok: false };
    for (const key of ['reachedStep', 'cityId', 'cityName']) if (key in row && row[key] !== null && typeof row[key] !== 'string') return { ok: false };
    if ('path' in row && ![null, 'sync', 'run'].includes(row.path as OnboardingPath)) return { ok: false };
    // Preserve unknown future fields when patching: exploration cannot erase
    // a consent or preference introduced by another version of the app.
    return { ok: true, state: { ...DEFAULT_ONBOARDING_STATE, ...row } as OnboardingState };
  } catch { return { ok: false }; }
}
/** Reread inside the shared queue, then merge ONLY the explicit patch.
 * Unknown storage is never overwritten with default consent/age/city values.
 */
export function createOnboardingPatchQueue2026(read: () => Promise<OnboardingRead2026>, write: (state: OnboardingState) => Promise<boolean>) {
  let queue: Promise<unknown> = Promise.resolve();
  return (patch: Partial<OnboardingState>): Promise<boolean> => {
    const work = async () => {
      try {
        const latest = await read();
        if (!latest.ok) return false;
        return await write({ ...latest.state, ...patch });
      } catch { return false; }
    };
    const result = queue.then(work, work);
    queue = result;
    return result;
  };
}
