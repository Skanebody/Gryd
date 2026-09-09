import { assertEquals } from 'jsr:@std/assert';
import { createOnboardingPatchQueue2026, decodeOnboardingState2026, type OnboardingState } from './onboardingPersistence2026.ts';
const original = { onboardingDone: false, firstCaptureDone: true, ageConfirmed: true, ageDeclined: false, path: 'sync', reachedStep: 'legacy', cityId: 'lille', cityName: 'Lille', futureConsent: { share: false } } as const;
Deno.test('absence is a known empty navigation state; corruption and wrong field types stay unknown', () => {
  assertEquals(decodeOnboardingState2026(null).ok, true);
  for (const raw of ['broken', 'null', '[]', 'false', '{"ageConfirmed":"true"}', '{"ageDeclined":1}', '{"path":"cycling"}', '{"cityId":42}']) assertEquals(decodeOnboardingState2026(raw), { ok: false });
});
Deno.test('an immediate exploration patch waits for the read and preserves age, capture, city and future consent', async () => {
  let raw = JSON.stringify(original), release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const patch = createOnboardingPatchQueue2026(async () => { await gate; return decodeOnboardingState2026(raw); }, async state => { raw = JSON.stringify(state); return true; });
  const saving = patch({ onboardingDone: true, reachedStep: 'map' });
  assertEquals(JSON.parse(raw), original);
  release(); assertEquals(await saving, true);
  assertEquals(JSON.parse(raw), { ...original, onboardingDone: true, reachedStep: 'map' });
});
Deno.test('unknown, unreadable or corrupt storage is never overwritten with default consent values', async () => {
  let writes = 0;
  for (const read of [async () => ({ ok: false } as const), async () => decodeOnboardingState2026('{corrupt'), async (): Promise<never> => { throw Error('private storage'); }]) {
    const patch = createOnboardingPatchQueue2026(read, async () => { writes++; return true; });
    assertEquals(await patch({ onboardingDone: true, reachedStep: 'map' }), false);
  }
  assertEquals(writes, 0);
});
Deno.test('two mounted consumers merge ordered patches from the latest stored state, not stale hook snapshots', async () => {
  let raw = JSON.stringify(original);
  const writes: OnboardingState[] = [];
  const patch = createOnboardingPatchQueue2026(async () => decodeOnboardingState2026(raw), async state => { writes.push(state); raw = JSON.stringify(state); return true; });
  assertEquals(await Promise.all([patch({ cityId: 'paris', cityName: 'Paris' }), patch({ onboardingDone: true, reachedStep: 'map' })]), [true, true]);
  assertEquals(writes[1], { ...original, cityId: 'paris', cityName: 'Paris', onboardingDone: true, reachedStep: 'map' });
});
Deno.test('failed writes report failure and do not block a later explicit patch', async () => {
  let raw = JSON.stringify(original), attempts = 0;
  const patch = createOnboardingPatchQueue2026(async () => decodeOnboardingState2026(raw), async state => { if (++attempts === 1) throw Error('quota'); raw = JSON.stringify(state); return true; });
  assertEquals(await patch({ reachedStep: 'discovery2026:optional:loop' }), false);
  assertEquals(await patch({ onboardingDone: true, reachedStep: 'map' }), true);
  assertEquals(JSON.parse(raw), { ...original, onboardingDone: true, reachedStep: 'map' });
});

Deno.test('un refus d’âge SURVIT à la fermeture de l’app, et se révoque explicitement', async () => {
  // ÉTAPE 0 — le refus ne vivait que dans un `useState` d'écran : relancer
  // l'app effaçait le mur. Une garde qu'un redémarrage annule n'est pas une
  // garde. Il est désormais un champ du même stockage que `ageConfirmed`.
  const fresh = decodeOnboardingState2026('{}');
  assertEquals(fresh.ok && fresh.state.ageDeclined, false);
  let raw = JSON.stringify(original);
  const patch = createOnboardingPatchQueue2026(async () => decodeOnboardingState2026(raw), async state => { raw = JSON.stringify(state); return true; });
  assertEquals(await patch({ ageDeclined: true }), true);
  const reread = decodeOnboardingState2026(raw);
  assertEquals(reread.ok && reread.state.ageDeclined, true, 'le refus est relu depuis le disque');
  assertEquals(reread.ok && reread.state.ageConfirmed, true, 'aucun autre champ n’est écrasé');
  // « Ce n'est pas moi » — la seule sortie, et elle est explicite.
  assertEquals(await patch({ ageDeclined: false }), true);
  const after = decodeOnboardingState2026(raw);
  assertEquals(after.ok && after.state.ageDeclined, false);
});
