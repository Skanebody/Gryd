/** Local navigation preferences. These fields never award a capture or grant account access. */
export type OnboardingPath = 'sync' | 'run' | null;
export interface OnboardingState {
  onboardingDone: boolean; firstCaptureDone: boolean; ageConfirmed: boolean;
  /**
   * LE REFUS D'ÂGE SURVIT À LA FERMETURE DE L'APP (10/09/2026).
   *
   * Il ne vivait que dans un `useState` d'écran : déclarer « j'ai moins de
   * 16 ans » affichait le mur, et relancer l'app le faisait disparaître. Une
   * garde qu'un redémarrage efface n'est pas une garde. Elle est ici, à côté de
   * `ageConfirmed`, parce que c'est le même fait — une déclaration d'âge —
   * et que les deux doivent rester exclusifs (voir `AuthEntry2026`).
   *
   * ⚠️ Ce n'est PAS une preuve d'âge et ça ne prétend pas l'être : c'est une
   * déclaration, stockée en local, révocable par « Ce n'est pas moi ».
   */
  ageDeclined: boolean;
  path: OnboardingPath; reachedStep: string | null; cityId: string | null; cityName: string | null;
}
export const DEFAULT_ONBOARDING_STATE: OnboardingState = {
  onboardingDone: false, firstCaptureDone: false, ageConfirmed: false, ageDeclined: false,
  path: null, reachedStep: null, cityId: null, cityName: null,
};
export type OnboardingRead2026 = { readonly ok: true; readonly state: OnboardingState } | { readonly ok: false };
export function decodeOnboardingState2026(raw: string | null): OnboardingRead2026 {
  if (raw === null) return { ok: true, state: { ...DEFAULT_ONBOARDING_STATE } };
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false };
    const row = value as Record<string, unknown>;
    for (const key of ['onboardingDone', 'firstCaptureDone', 'ageConfirmed', 'ageDeclined']) if (key in row && typeof row[key] !== 'boolean') return { ok: false };
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
