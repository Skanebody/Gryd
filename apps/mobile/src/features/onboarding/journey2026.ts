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
/**
 * OÙ L'ON RESSORT DE LA DÉCOUVERTE — et le cahier §9.3 est catégorique : on
 * revient d'où l'on vient.
 *
 * ⚠️ CORRIGÉ LE 10/09/2026. La règle était `replay && action !== 'explore'`, si
 * bien qu'en REJEU — la découverte ouverte depuis `/parametres` — le bouton
 * principal de l'écran d'accueil (`finish('explore')`) déposait le joueur sur la
 * carte au lieu de le ramener dans ses Paramètres. Il n'y avait rien à
 * « explorer » : il n'était pas en train de découvrir l'app, il la relisait. La
 * seule sortie de rejeu qui rendait `/parametres` était la croix.
 *
 * `action` ne décide donc plus de la CIBLE (le mode suffit) ; il reste dans la
 * signature parce que l'écran s'en sert pour nommer ce qu'il fait et que les
 * analytics le distinguent. Le PATCH, lui, a toujours dépendu du seul mode : un
 * rejeu ne réécrit jamais l'état d'onboarding déjà acquis.
 */
export function discoveryExit2026(replay: boolean, action: 'explore' | 'close' | 'done') {
  void action;
  return { target: replay ? '/parametres' as const : '/' as const,
    patch: replay ? null : { onboardingDone: true as const, reachedStep: 'map' } };
}
