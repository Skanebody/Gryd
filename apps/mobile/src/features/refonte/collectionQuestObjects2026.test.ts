import { assertEquals } from 'jsr:@std/assert@^1';
import { ownedObjectsTotal2026, questObjectsSection2026 } from './collectionQuestObjects2026.ts';
import type { WeeklyQuestObject2026 } from './WeeklyQuests2026Model.ts';

const object = (rewardId: string, equipped = false): WeeklyQuestObject2026 => ({
  rewardId, label: `Objet ${rewardId}`, kind: 'sticker', slot: 'sticker',
  questId: 'q-1', earnedAt: '2026-09-07T10:00:00Z', equipped,
});

Deno.test('collection : un échec de lecture n’est pas « aucun objet de défi »', () => {
  assertEquals(questObjectsSection2026('failed', []).kind, 'failed');
  assertEquals(questObjectsSection2026('loading', [object('a')]).kind, 'loading');
  // Contrat rompu : « prêt » sans données ne devient pas une collection vide.
  assertEquals(questObjectsSection2026('ready', null).kind, 'failed');
  assertEquals(questObjectsSection2026('ready', []).kind, 'empty');
  assertEquals(questObjectsSection2026('signed-out', []).kind, 'absent');
  assertEquals(questObjectsSection2026('unavailable', []).kind, 'absent');
});

Deno.test('collection : les objets possédés sont listés tels quels', () => {
  const section = questObjectsSection2026('ready', [object('a', true), object('b')]);
  assertEquals(section.kind, 'list');
  assertEquals(section.kind === 'list' ? section.objects.map(item => item.rewardId) : [], ['a', 'b']);
});

Deno.test('collection : le compteur n’additionne que ce qui est connu, et le dit', () => {
  const listed = questObjectsSection2026('ready', [object('a'), object('b')]);
  assertEquals(ownedObjectsTotal2026(3, listed), { count: 5, complete: true });
  assertEquals(ownedObjectsTotal2026(3, questObjectsSection2026('ready', [])), { count: 3, complete: true });
  // Inconnu ≠ zéro : le total reste celui des objets lus, et il se déclare incomplet.
  assertEquals(ownedObjectsTotal2026(3, questObjectsSection2026('failed', [])), { count: 3, complete: false });
  assertEquals(ownedObjectsTotal2026(3, questObjectsSection2026('loading', [])), { count: 3, complete: false });
  assertEquals(ownedObjectsTotal2026(-1, listed), { count: 2, complete: true });
});
