import { assertEquals, assertExists } from 'jsr:@std/assert@^1';
import { challengeActions2026, nextChallengeStarts2026, parseChallengeArenas2026, parseCrewChallenges2026, type CrewChallenge2026 } from './CrewChallengesModel2026.ts';

const sectors = ['a', 'b', 'c'].map(id => ({ id, title: `Secteur ${id}`, geometry: { type: 'Polygon', coordinates: [[[2, 48], [2.01, 48], [2.01, 48.01], [2, 48]]] } }));
const rawMatch = () => ({
  id: 'match', title: 'Arène publiée', activity: 'run', status: 'assembling', reason: null,
  timeZone: 'Europe/Paris', startsAt: '2026-09-13T22:00:00Z', endsAt: '2026-09-20T22:00:00Z',
  sectors, myTeamId: 'mine', canManage: false, joined: false, rostered: false,
  teams: [{ id: 'mine', name: 'Mon crew', accepted: true, locked: false, players: 4, side: 0 }, { id: 'other', name: 'Crew invité', accepted: true, locked: false, players: 3, side: 1 }],
  ownScore: { teamId: 'mine', totalPoints: 3, sectors: { a: 3, b: 0, c: 0 } },
  publishedResult: null, publishedAt: null, resultRevision: null, myPreference: null, myContributions: [],
});
function match(patch: Partial<CrewChallenge2026> = {}): CrewChallenge2026 {
  const parsed = parseCrewChallenges2026([rawMatch()]); assertExists(parsed);
  return { ...parsed[0]!, ...patch };
}
const before = Date.parse('2026-09-10T12:00:00Z');
const during = Date.parse('2026-09-16T12:00:00Z');

Deno.test('challenges: an empty published catalogue is distinct from unavailable or malformed data', () => {
  assertEquals(parseChallengeArenas2026([]), []);
  assertEquals(parseChallengeArenas2026(null), null);
  const arena = { id: 'arena', title: 'Arène', activity: 'run' as const, timeZone: 'Europe/Paris', sectors, accessSource: 'https://example.org/access', reviewedAt: '2026-09-01T09:00:00Z' };
  assertEquals(parseChallengeArenas2026([arena]), [arena]);
  assertEquals(parseChallengeArenas2026([{ ...arena, sectors: sectors.slice(0, 2) }]), null);
  assertEquals(parseChallengeArenas2026([{ ...arena, timeZone: 'Invalid/Timezone' }]), null);
  assertEquals(parseCrewChallenges2026([]), []);
  assertEquals(parseCrewChallenges2026({ matches: [] }), null);
});

Deno.test('challenges: own live score never exposes comparative match points or unexpected fields', () => {
  const raw = rawMatch();
  const parsed = parseCrewChallenges2026([{ ...raw, ownScore: { ...raw.ownScore, matchPoints: 3, opponentScore: 27 }, opponentLiveScore: 27 }]);
  assertExists(parsed);
  assertEquals(parsed[0]!.ownScore, raw.ownScore);
  assertEquals(parsed[0]!.publishedResult, null);
  assertEquals('opponentLiveScore' in parsed[0]!, false);
});

Deno.test('challenges: comparisons require a published date and refer to the actual two crews', () => {
  const raw = rawMatch();
  const publishedResult = { scores: [{ ...raw.ownScore, matchPoints: 2.5 }, { teamId: 'other', totalPoints: 0, sectors: { a: 0, b: 0, c: 0 }, matchPoints: 0.5 }], winnerTeamId: 'mine', isDraw: false };
  assertEquals(parseCrewChallenges2026([{ ...raw, publishedResult }]), null);
  const published = { ...raw, publishedResult, publishedAt: '2026-09-15T10:00:00Z', resultRevision: 2 };
  assertEquals(parseCrewChallenges2026([published])?.[0]?.publishedResult, publishedResult);
  assertEquals(parseCrewChallenges2026([{ ...published, publishedResult: { ...publishedResult, winnerTeamId: 'stranger' } }]), null);
  assertEquals(parseCrewChallenges2026([{ ...published, publishedResult: { ...publishedResult, scores: [publishedResult.scores[0], publishedResult.scores[0]] } }]), null);
  assertEquals(parseCrewChallenges2026([{ ...raw, ownScore: { ...raw.ownScore, teamId: 'other' } }]), null);
});

Deno.test('challenges: malformed teams cannot grant management actions or manufacture roster capacity', () => {
  const raw = rawMatch();
  for (const side of [null, '0', 2, -1]) assertEquals(parseCrewChallenges2026([{ ...raw, teams: [{ ...raw.teams[0], side }, raw.teams[1]] }]), null);
  assertEquals(parseCrewChallenges2026([{ ...raw, teams: [raw.teams[0], raw.teams[0]] }]), null);
  assertEquals(parseCrewChallenges2026([{ ...raw, teams: [{ ...raw.teams[0], players: 6 }, raw.teams[1]] }]), null);
  assertEquals(parseCrewChallenges2026([{ ...raw, endsAt: raw.startsAt }]), null);
});

Deno.test('challenges: only the invited crew direction may accept and only five volunteers may be locked', () => {
  const invited = match({ myTeamId: 'other', status: 'invited', canManage: true, teams: match().teams.map(t => t.side === 1 ? { ...t, accepted: false } : t) });
  assertEquals(challengeActions2026(invited, before).accept, true);
  assertEquals(challengeActions2026({ ...invited, canManage: false }, before).accept, false);
  assertEquals(challengeActions2026({ ...invited, myTeamId: 'mine' }, before).accept, false);
  assertEquals(challengeActions2026(invited, during).accept, false);
  const full = match({ canManage: true, teams: match().teams.map(t => t.id === 'mine' ? { ...t, players: 5 } : t) });
  assertEquals(challengeActions2026(full, before).lock, true);
  assertEquals(challengeActions2026({ ...full, canManage: false }, before).lock, false);
  assertEquals(challengeActions2026(match({ canManage: true }), before).lock, false);
  assertEquals(challengeActions2026(full, during).lock, false);
});

Deno.test('challenges: new volunteers cannot join full, unaccepted or locked teams and never join after departure', () => {
  assertEquals(challengeActions2026(match(), before).join, true);
  for (const patch of [{ locked: true }, { accepted: false }, { players: 5 }]) {
    assertEquals(challengeActions2026(match({ teams: match().teams.map(t => t.id === 'mine' ? { ...t, ...patch } : t) }), before).join, false);
  }
  assertEquals(challengeActions2026(match({ status: 'scheduled' }), before).join, false);
  assertEquals(challengeActions2026(match({ status: 'active' }), during).join, false);
});

Deno.test('challenges: retained roster may re-consent during the match; final and cancelled states never reopen it', () => {
  assertEquals(challengeActions2026(match({ status: 'active', rostered: true }), during).join, true);
  for (const status of ['final', 'cancelled'] as const) {
    const closed = challengeActions2026(match({ status, rostered: true }), during);
    assertEquals(closed.join, false); assertEquals(closed.accept, false); assertEquals(closed.lock, false); assertEquals(closed.cancel, false); assertEquals(closed.chooseSector, false);
  }
});

// 0148 : le retrait global vaut tant que le résultat n'est pas arrêté. Après la
// publication finale ou la fenêtre de synchronisation, le serveur lève
// `challenge_closed` — l'écran ne doit donc plus proposer le geste.
Deno.test('challenges: consent withdrawal stops once the result is settled, and never before the player joined', () => {
  for (const status of ['assembling', 'active'] as const) {
    assertEquals(challengeActions2026(match({ status, joined: true, rostered: true }), during).withdraw, true);
    assertEquals(challengeActions2026(match({ status, joined: false, rostered: true }), during).withdraw, false);
  }
  for (const status of ['final', 'cancelled'] as const) {
    assertEquals(challengeActions2026(match({ status, joined: true, rostered: true }), during).withdraw, false);
  }
  const lastSecond = Date.parse('2026-09-21T21:59:59Z');
  assertEquals(challengeActions2026(match({ status: 'active', joined: true, rostered: true }), lastSecond).withdraw, true);
  assertEquals(challengeActions2026(match({ status: 'active', joined: true, rostered: true }), lastSecond + 1000).withdraw, false);
  assertEquals(challengeActions2026(match({ status: 'active', joined: true }), during).chooseSector, true);
  assertEquals(challengeActions2026(match({ status: 'active', joined: true }), Date.parse('2026-09-21T00:00:00Z')).chooseSector, false);
});

Deno.test('challenges: recorded preferences and deleted-source contributions preserve server facts', () => {
  const raw = rawMatch();
  const myPreference = { sectorId: 'b', recordedAt: '2026-09-15T09:00:00Z' };
  const myContributions = [{ runId: null, day: '2026-09-15', sectorId: 'b', points: 0, withdrawn: true, usedFallback: false }];
  const parsed = parseCrewChallenges2026([{ ...raw, joined: false, rostered: true, myPreference, myContributions }]);
  assertExists(parsed); assertEquals(parsed[0]!.rostered, true); assertEquals(parsed[0]!.myPreference, myPreference); assertEquals(parsed[0]!.myContributions, myContributions);
});

Deno.test('challenges: next Monday means midnight in the published arena timezone across both DST changes', () => {
  assertEquals(nextChallengeStarts2026(Date.parse('2026-03-23T12:00:00Z'), 'Europe/Paris'), ['2026-03-29T22:00:00.000Z', '2026-04-05T22:00:00.000Z', '2026-04-12T22:00:00.000Z']);
  assertEquals(nextChallengeStarts2026(Date.parse('2026-10-19T12:00:00Z'), 'Europe/Paris'), ['2026-10-25T23:00:00.000Z', '2026-11-01T23:00:00.000Z', '2026-11-08T23:00:00.000Z']);
  assertEquals(nextChallengeStarts2026(Date.parse('2026-09-13T22:30:00Z'), 'Europe/Paris')[0], '2026-09-20T22:00:00.000Z');
  assertEquals(nextChallengeStarts2026(Date.parse('2026-09-13T22:30:00Z'), 'America/New_York')[0], '2026-09-14T04:00:00.000Z');
});
