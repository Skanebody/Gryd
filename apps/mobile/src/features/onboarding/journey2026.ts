/** The photo is an entrance, not the first mandatory lesson. */
export const DISCOVERY_OPTIONAL_STEPS = ['loop', 'crew', 'location'] as const;
export const DISCOVERY_STEPS = ['welcome', ...DISCOVERY_OPTIONAL_STEPS] as const;
export type DiscoveryStep = typeof DISCOVERY_STEPS[number];
export function resumeDiscovery(reachedStep: string | null, completed: boolean, replay: boolean): DiscoveryStep {
  if (completed || replay || !reachedStep?.startsWith('discovery2026:optional:')) return 'welcome';
  const step = reachedStep.slice('discovery2026:optional:'.length);
  return DISCOVERY_OPTIONAL_STEPS.find(candidate => candidate === step) ?? 'welcome';
}
export function discoveryProgress(step: DiscoveryStep) {
  const index = DISCOVERY_OPTIONAL_STEPS.indexOf(step as typeof DISCOVERY_OPTIONAL_STEPS[number]);
  return { index, count: DISCOVERY_OPTIONAL_STEPS.length, previous: index < 0 ? null : index === 0 ? 'welcome' as const : DISCOVERY_OPTIONAL_STEPS[index - 1]!, next: index < 0 ? null : DISCOVERY_OPTIONAL_STEPS[index + 1] ?? null };
}
export function discoveryExit2026(replay: boolean, action: 'explore' | 'close' | 'done') {
  return { target: replay && action !== 'explore' ? '/parametres' as const : '/' as const,
    patch: replay ? null : { onboardingDone: true as const, reachedStep: 'map' } };
}
