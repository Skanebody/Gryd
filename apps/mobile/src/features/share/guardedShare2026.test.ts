import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { guardedShareAsset2026 } from './guardedShare2026.ts';
import { isResultOwnerCurrent2026, resultOwnerEpoch2026, setResultOwner2026 } from '../run/resultOwner2026.ts';

function delayed<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }
function harness(owner: string | null = 'runner-a') {
  setResultOwner2026(owner);
  const epoch = resultOwnerEpoch2026();
  const events: string[] = [];
  return { events, input: {
    authorized: () => isResultOwnerCurrent2026(owner, epoch),
    capture: async () => { events.push('capture'); return '/tmp/owner-only.png'; },
    available: async () => { events.push('available'); return true; },
    deliver: async (uri: string) => { events.push(`deliver:${uri}`); return { ok: true }; },
    release: (uri: string) => { events.push(`release:${uri}`); },
    fallback: async () => { events.push('fallback'); return { ok: true }; },
  } };
}

Deno.test('export : un propriétaire révoqué avant le tap ne déclenche aucune capture ni copie', async () => {
  const { events, input } = harness(); setResultOwner2026('runner-b');
  assertEquals(await guardedShareAsset2026(input), { ok: false, reason: 'dismissed' });
  assertEquals(events, []);
});

Deno.test('export : changement pendant la capture — détruit le fichier, aucun partage ni fallback texte', async () => {
  const { events, input } = harness(); const captured = delayed<string>();
  const promise = guardedShareAsset2026({ ...input, capture: () => captured.promise });
  setResultOwner2026('runner-b'); captured.resolve('/tmp/owner-only.png');
  assertEquals(await promise, { ok: false, reason: 'dismissed' });
  assertEquals(events, ['release:/tmp/owner-only.png']);
});

Deno.test('export : changement pendant la détection de capacité — aucun envoi du fichier préparé', async () => {
  const { events, input } = harness(); const availability = delayed<boolean>(); const entered = delayed<void>();
  const promise = guardedShareAsset2026({ ...input, available: () => { entered.resolve(); return availability.promise; } });
  await entered.promise; setResultOwner2026(null); availability.resolve(true);
  assertEquals(await promise, { ok: false, reason: 'dismissed' });
  assertEquals(events, ['capture', 'release:/tmp/owner-only.png']);
});

Deno.test('export : une capture échouée après révocation ne copie pas un résumé du compte précédent', async () => {
  const { events, input } = harness();
  const result = await guardedShareAsset2026({ ...input, capture: async () => { setResultOwner2026('runner-b'); throw Error('capture failed'); } });
  assertEquals(result, { ok: false, reason: 'dismissed' });
  assertEquals(events, []);
});

Deno.test('export invité : son propre fichier est transmis puis supprimé après retour système', async () => {
  const { events, input } = harness(null);
  assertEquals(await guardedShareAsset2026(input), { ok: true });
  assertEquals(events, ['capture', 'available', 'deliver:/tmp/owner-only.png', 'release:/tmp/owner-only.png']);
});
Deno.test('objet remboursé pendant la préparation : le droit est revérifié, fichier détruit sans livraison', async()=>{
  const {events,input}=harness();
  assertEquals(await guardedShareAsset2026({...input,confirmBeforeDelivery:async()=>false}),{ok:false,reason:'dismissed'});
  assertEquals(events,['capture','available','release:/tmp/owner-only.png']);
});

Deno.test('export : le repli texte reste possible après échec réel si le propriétaire est inchangé', async () => {
  const { events, input } = harness();
  assertEquals(await guardedShareAsset2026({ ...input, capture: async () => { throw Error('capture failed'); } }), { ok: true });
  assertEquals(events, ['fallback']);
});
