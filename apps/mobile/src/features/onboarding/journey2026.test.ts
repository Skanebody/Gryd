import { assertEquals } from 'jsr:@std/assert';
import { DISCOVERY_STEPS, DISCOVERY_OPTIONAL_STEPS, discoveryExit2026, discoveryProgress, resumeDiscovery } from './journey2026.ts';
import { completedOnboardingThisSession2026, rememberOnboardingCompletion2026 } from './sessionCompletion2026.ts';
Deno.test('only an explicitly opened optional tutorial resumes; replay always starts at the original photo', () => {
  assertEquals(resumeDiscovery('discovery2026:optional:crew', false, false), 'crew');
  for (const value of ['discovery2026:crew', 'discovery2026:location', 'obsolete-step', null]) assertEquals(resumeDiscovery(value, false, false), 'welcome');
  for (const step of DISCOVERY_STEPS) {
    assertEquals(resumeDiscovery(`discovery2026:optional:${step}`, false, true), 'welcome');
    assertEquals(resumeDiscovery(`discovery2026:optional:${step}`, true, false), 'welcome');
  }
});
Deno.test('the entrance has no lesson counter or automatic next step; all three optional lessons remain reachable', () => {
  assertEquals(discoveryProgress('welcome'), { index: -1, count: 3, previous: null, next: null });
  for (const [index, step] of DISCOVERY_OPTIONAL_STEPS.entries()) {
    const progress = discoveryProgress(step);
    assertEquals(progress.index, index); assertEquals(progress.count, 3);
    assertEquals(progress.previous, index === 0 ? 'welcome' : DISCOVERY_OPTIONAL_STEPS[index - 1]);
    assertEquals(progress.next, DISCOVERY_OPTIONAL_STEPS[index + 1] ?? null);
  }
});
Deno.test('explore never requires an account, sport or location; replay exits preserve the entire stored state', () => {
  for (const action of ['explore', 'close', 'done'] as const) {
    assertEquals(discoveryExit2026(false, action), { target: '/', patch: { onboardingDone: true, reachedStep: 'map' } });
    // ÉTAPE 0 — cette ligne figeait le défaut : elle attendait `/` quand
    // `action === 'explore'`, donc un rejeu ouvert depuis /parametres se
    // terminait sur la carte. Le cahier §9.3 demande de revenir d'où l'on vient.
    assertEquals(discoveryExit2026(true, action), { target: '/parametres', patch: null });
  }
});
Deno.test('unavailable durable storage does not trap a completed session in onboarding', () => {
  rememberOnboardingCompletion2026(false);
  assertEquals(completedOnboardingThisSession2026(), false);
  rememberOnboardingCompletion2026(true);
  assertEquals(completedOnboardingThisSession2026(), true);
  rememberOnboardingCompletion2026(false);
});
