import { assertEquals, assert } from 'jsr:@std/assert';
import { crewOutingCalendar2026 } from './crewOutingCalendar2026.ts';

const now = Date.parse('2026-09-09T12:00:00Z');
const outing = { id: 'outing-one', title: 'Canal du soir', startsAt: '2026-09-10T19:00:00+02:00', placeLabel: 'Entrée du parc', joined: true, cancelled: false, revision: 2 };
Deno.test('calendar preserves the actual instant and does not invent duration or attendees', () => {
  const result = crewOutingCalendar2026(outing, now)!;
  assert(result.includes('DTSTART:20260910T170000Z\r\n'));
  assert(result.includes('SEQUENCE:2\r\n'));
  assert(!/DTEND|DURATION|ATTENDEE|GEO:|VALARM/.test(result));
  assertEquals(result.match(/BEGIN:VEVENT/g)?.length, 1);
});
Deno.test('calendar rejects unknown, cancelled, withdrawn or elapsed outings', () => {
  for (const patch of [{ startsAt: 'bad' }, { startsAt: new Date(now).toISOString() }, { joined: false }, { cancelled: true }, { id: '' }, { revision: -1 }]) {
    assertEquals(crewOutingCalendar2026({ ...outing, ...patch }, now), null);
  }
  assertEquals(crewOutingCalendar2026(outing, NaN), null);
});
Deno.test('calendar prevents injected properties and round-trips UTF-8 line folding', () => {
  const title = 'Équipe 🏃 '.repeat(18) + ', rive; canal\\n\r\nBEGIN:VEVENT';
  const result = crewOutingCalendar2026({ ...outing, title }, now)!;
  assert(result.split('\r\n').every(line => new TextEncoder().encode(line).length <= 75));
  const unfolded = result.replace(/\r\n /g, '');
  assertEquals(unfolded.match(/\r\nBEGIN:VEVENT\r\n/g)?.length, 1);
  assert(unfolded.includes('\\, rive\\; canal\\\\n\\nBEGIN:VEVENT'));
  assert(unfolded.includes('Équipe 🏃 '.repeat(18)));
});
