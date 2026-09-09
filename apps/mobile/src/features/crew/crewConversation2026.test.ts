import { assertEquals } from 'jsr:@std/assert';
import { crewConversationError2026, isCrewSportingRole2026, parseCrewConversation2026 } from './crewConversation2026.ts';
const message = { id: 'message', body: 'À dimanche', createdAt: '2026-09-09T08:00:00Z', mine: false, canRemove: false, authorId: 'member', authorName: 'Camille' };
const context = { crewId: 'crew', crewName: 'Paris', myRole: 'runner', bodyMax: 600, windowSize: 60, olderCursor: null, messages: [message] };
Deno.test('crew conversation rejects stale audience and malformed or duplicated server messages', () => {
  assertEquals(parseCrewConversation2026(context, 'other'), null);
  for (const changed of [{ messages: [message, message] }, { messages: [{ ...message, createdAt: 'invalid' }] }, { messages: [{ ...message, canRemove: 'yes' }] }, { bodyMax: 0 }, { windowSize: 0 }, { messages: [{ ...message, body: '' }] }]) assertEquals(parseCrewConversation2026({ ...context, ...changed }, 'crew'), null);
  assertEquals(parseCrewConversation2026(context, 'crew'), context);
  assertEquals(parseCrewConversation2026({ ...context, messages: [] }, 'crew')?.messages, []);
});
Deno.test('unconfirmed writes keep the draft and distinguish changed audience from a successful send', () => {
  assertEquals(crewConversationError2026('network_error', false).includes('conservé'), true);
  assertEquals(crewConversationError2026('crew_changed', false).includes('crew a changé'), true);
  assertEquals(crewConversationError2026('message_rate_limited', true).includes('Wait'), true);
});

Deno.test('voluntary contribution cannot name an administrative role or claimed performance level', () => {
  for (const role of ['founder','captain','co_captain','champion','expert',null]) assertEquals(isCrewSportingRole2026(role), false);
  for (const role of ['welcomer','outing_host','route_scout']) assertEquals(isCrewSportingRole2026(role), true);
});
