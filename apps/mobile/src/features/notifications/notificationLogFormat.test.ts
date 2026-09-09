/**
 * GRYD — tests de la FORME du journal local des sollicitations.
 *
 * L'I/O (`localNotificationLog.ts`) n'est PAS testée ici : `AsyncStorage` n'est
 * pas type-vérifiable sous Deno, et c'est pour ça que la règle vit dans un
 * module à part. C'est dit, pas caché.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  parseNotificationLog2026,
  pruneNotificationLog2026,
} from './notificationLogFormat.ts';

const T0 = Date.parse('2026-09-10T12:00:00Z');
const DAY = 86_400_000;

Deno.test('lecture tolérante : une entrée cassée est écartée, pas tout le journal', () => {
  const raw = JSON.stringify([
    { eventId: 'a', category: 'sport', atMs: T0, transactional: false },
    { eventId: 'b', category: 'inventée', atMs: T0 },
    { eventId: 42, category: 'crew', atMs: T0 },
    { eventId: 'c', category: 'crew', atMs: 'hier' },
    { eventId: 'd', category: 'results', atMs: T0, transactional: true },
  ]);
  assertEquals(parseNotificationLog2026(raw).map((e) => e.eventId), ['a', 'd']);
  assertEquals(parseNotificationLog2026(raw)[1]?.transactional, true);
});

Deno.test('journal vide ou illisible : un tableau vide, jamais une exception', () => {
  assertEquals(parseNotificationLog2026(null), []);
  assertEquals(parseNotificationLog2026(''), []);
  assertEquals(parseNotificationLog2026('{{'), []);
  assertEquals(parseNotificationLog2026('{"eventId":"a"}'), []);
});

Deno.test('fenêtre glissante : 30 jours, la plus longue du cahier (les offres)', () => {
  const entries = [
    { eventId: 'vieux', category: 'offers' as const, atMs: T0 - 31 * DAY, transactional: false },
    { eventId: 'recent', category: 'offers' as const, atMs: T0 - 29 * DAY, transactional: false },
  ];
  assertEquals(pruneNotificationLog2026(entries, T0).map((e) => e.eventId), ['recent']);
});
