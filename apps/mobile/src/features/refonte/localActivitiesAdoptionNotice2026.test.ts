import { assertEquals } from 'jsr:@std/assert@^1';
import { adoptionNoticeKey2026, createAdoptionNoticeStore2026 } from './localActivitiesAdoptionNotice2026.ts';
function memory(initial: Record<string, string> = {}, fail = false) {
  const data = { ...initial };
  return {
    data,
    getItem: (key: string) => fail ? Promise.reject(new Error('storage')) : Promise.resolve(data[key] ?? null),
    setItem: (key: string, value: string) => { if (fail) return Promise.reject(new Error('storage')); data[key] = value; return Promise.resolve(true); },
  };
}
Deno.test('rattachement : le rappel est acquittable, et l’acquittement est durable', async () => {
  const storage = memory();
  const store = createAdoptionNoticeStore2026(storage);
  assertEquals(await store.read('alice'), false);
  assertEquals(await store.acknowledge('alice'), true);
  assertEquals(storage.data[adoptionNoticeKey2026('alice')], '1');
  assertEquals(await store.read('alice'), true);
  // Un compte n'hérite jamais du reçu d'un autre.
  assertEquals(await store.read('bob'), false);
});
Deno.test('rattachement : un stockage muet ne fabrique ni acquittement ni oubli', async () => {
  const store = createAdoptionNoticeStore2026(memory({}, true));
  assertEquals(await store.read('alice'), null);
  assertEquals(await store.acknowledge('alice'), false);
  assertEquals(await store.read('alice'), null);
  assertEquals(await store.read(''), null);
});
