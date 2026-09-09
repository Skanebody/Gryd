import { CHALLENGE_RULES_2026, TERRITORY_RULES_2026 } from './game-rules';
import {
  addCalendarDays2026, localDay2026, scheduleProgressTimezoneChange2026, startOfLocalDay2026,
} from './calendar2026';
import {
  careerProgress2026, computeProgressLedger2026, diffProgressLedger2026,
  levelForXp2026, runXpReason2026, seasonCollectionProgress2026, xpForLevel2026,
} from './progression2026';
import type { ProgressActivity2026, ProgressLedgerInput2026 } from './progression2026';
import { computeChallenge2026, validateChallenge2026 } from './challenges2026';
import type { Challenge2026, ChallengeLoop2026 } from './challenges2026';

declare const Deno: {
  test(name: string, fn: () => void | Promise<void>): void;
  readTextFile(path: string): Promise<string>;
};

function equal(actual: unknown, expected: unknown): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}
function throws(fn: () => unknown): void {
  try { fn(); } catch { return; }
  throw new Error('Expected a rejected configuration');
}

function activity(
  id: string, start: string, durationMinutes = 10, overrides: Partial<ProgressActivity2026> = {},
): ProgressActivity2026 {
  const endedAt = Date.parse(start) + durationMinutes * 60_000;
  return {
    canonicalId: id, revision: 1, sport: 'run', startedAt: start, endedAt,
    receivedAt: endedAt, source: 'gps', eligibility: 'eligible',
    movement: [{ start, end: endedAt }], ...overrides,
  };
}
function progression(
  activities: ProgressActivity2026[], overrides: Partial<ProgressLedgerInput2026> = {},
) {
  return computeProgressLedger2026({
    accountId: 'runner', accountCreatedAt: '2026-01-01T00:00:00Z',
    initialTimeZone: 'Europe/Paris', initialCollectionId: 'autumn', activities, ...overrides,
  });
}

Deno.test('2026: beta geometry is discipline-specific and publication is delayed', () => {
  equal(TERRITORY_RULES_2026.run, { closureMaxGapM: 25, minLoopDistanceM: 800, minAreaM2: 5_000 });
  equal(TERRITORY_RULES_2026.bike, { closureMaxGapM: 40, minLoopDistanceM: 2_000, minAreaM2: 20_000 });
  equal(TERRITORY_RULES_2026.endpointMaxAccuracyM, 15);
  equal(TERRITORY_RULES_2026.publicationDelayMinutes, 30);
});

Deno.test('2026: permanent level formula and exact threshold boundaries, beyond level 50', () => {
  const expected = [[1, 0], [2, 100], [3, 220], [5, 520], [10, 1620], [15, 3220], [20, 5320], [30, 11020], [50, 28420]];
  for (const [level, xp] of expected) {
    equal(xpForLevel2026(level!), xp);
    equal(levelForXp2026(xp!), level);
    if (level! > 1) equal(levelForXp2026(xp! - 1), level! - 1);
  }
  equal(levelForXp2026(xpForLevel2026(51)), 51);
  equal(careerProgress2026(200).xpRemaining, 20);
  equal(levelForXp2026(NaN), 1);
  throws(() => xpForLevel2026(1.5));
});

Deno.test('2026: two sports share one daily reward, overlapping minutes are never doubled', () => {
  const run = activity('run', '2026-09-08T09:00:00Z', 6);
  const bike = activity('bike', '2026-09-08T09:03:00Z', 6, { sport: 'bike' });
  equal(progression([run, bike]).totalXp, 0); // Only nine real minutes.
  const extra = activity('walk-run', '2026-09-08T10:00:00Z', 1);
  const result = progression([run, bike, extra]);
  equal(result.totalXp, 100);
  equal(result.days[0]!.movementSeconds, 600);
  equal(result.days.length, 1);
});

Deno.test('2026: duplicate canonical imports and exact replays are idempotent', () => {
  const run = activity('canonical', '2026-09-08T09:00:00Z');
  const first = progression([run]);
  const duplicate = progression([run, { ...run }]);
  equal(first, duplicate);
  equal(diffProgressLedger2026(first.days, duplicate.days), []);
  throws(() => progression([run, { ...run, endedAt: Date.parse('2026-09-08T10:00:00Z') }]));
});

Deno.test('2026: latest canonical revision corrects XP while preserving the sports record', () => {
  const run = activity('canonical', '2026-09-08T09:00:00Z');
  const first = progression([run]);
  const correction = progression([run, { ...run, revision: 2, eligibility: 'withdrawn' }]);
  equal(correction.totalXp, 0);
  equal(correction.ignored, [{ activityId: 'canonical', reason: 'withdrawn' }]);
  equal(diffProgressLedger2026(first.days, correction.days)[0]!.xpDelta, -100);
});

Deno.test('2026: movement crossing midnight is apportioned to actual local days', () => {
  const crossing = activity('night', '2026-09-08T21:55:00Z', 15);
  const result = progression([crossing]);
  equal(result.days.map((day) => [day.day, day.movementSeconds, day.xp]), [
    ['2026-09-08', 300, 0], ['2026-09-09', 600, 100],
  ]);
});

Deno.test('2026: DST days count real elapsed movement, without phantom or lost minutes', () => {
  equal(startOfLocalDay2026('2026-03-30', 'Europe/Paris') - startOfLocalDay2026('2026-03-29', 'Europe/Paris'), 23 * 3_600_000);
  equal(startOfLocalDay2026('2026-10-26', 'Europe/Paris') - startOfLocalDay2026('2026-10-25', 'Europe/Paris'), 25 * 3_600_000);
  const spring = progression([activity('spring', '2026-03-29T00:55:00Z', 10)]);
  const autumn = progression([activity('autumn', '2026-10-25T00:55:00Z', 70)]);
  equal(spring.days.map((day) => [day.day, day.movementSeconds, day.xp]), [['2026-03-29', 600, 100]]);
  equal(autumn.days.map((day) => [day.day, day.movementSeconds, day.xp]), [['2026-10-25', 4_200, 100]]);
});

Deno.test('2026: an earlier admissible import corrects the first three days, never adds a fourth', () => {
  const runs = ['08', '10', '11'].map((day) => activity(day, `2026-09-${day}T09:00:00Z`));
  const before = progression(runs);
  const monday = activity('07', '2026-09-07T09:00:00Z', 10, { receivedAt: '2026-09-13T12:00:00Z' });
  const after = progression([...runs, monday]);
  equal(before.totalXp, 300);
  equal(after.totalXp, 300);
  equal(after.days.map((day) => [day.day, day.xp]), [
    ['2026-09-07', 100], ['2026-09-08', 100], ['2026-09-10', 100], ['2026-09-11', 0],
  ]);
  equal(diffProgressLedger2026(before.days, after.days).reduce((sum, change) => sum + change.xpDelta, 0), 0);
});

Deno.test('2026: seven-day receipt boundary is inclusive; pre-account and manual activities give no XP', () => {
  const run = activity('valid', '2026-09-08T09:00:00Z');
  equal(progression([{ ...run, receivedAt: Number(run.endedAt) + 7 * 86_400_000 }]).totalXp, 100);
  equal(progression([{ ...run, receivedAt: Number(run.endedAt) + 7 * 86_400_000 + 1 }]).totalXp, 0);
  equal(progression([run], { accountCreatedAt: '2026-09-08T09:05:00Z' }).totalXp, 0);
  equal(progression([{ ...run, source: 'manual' }]).totalXp, 0);
  equal(progression([{ ...run, source: 'verified_indoor' }]).totalXp, 100);
});

Deno.test('2026: a timezone request waits for next week and cannot create double travel days', () => {
  const change = scheduleProgressTimezoneChange2026('Europe/Paris', 'America/Los_Angeles', '2026-09-09T12:00:00Z');
  equal(change.effectiveAt, Date.parse('2026-09-13T22:00:00Z'));
  const runs = ['08', '09', '10'].map((day) => activity(day, `2026-09-${day}T09:00:00Z`));
  runs.push(activity('old-sunday', '2026-09-13T12:00:00Z'));
  runs.push(activity('new-sunday', '2026-09-13T23:00:00Z'));
  runs.push(activity('new-monday', '2026-09-14T12:00:00Z'));
  const result = progression(runs, { timezoneChanges: [change] });
  equal(result.totalXp, 400);
  equal(result.days.filter((day) => day.day === '2026-09-13').length, 1);
  equal(result.days.find((day) => day.day === '2026-09-13')!.xp, 0);
  throws(() => progression(runs, { timezoneChanges: [{ ...change, effectiveAt: '2026-09-09T13:00:00Z' }] }));
});

Deno.test('2026: twelve active days in six weeks complete the entire free season', () => {
  const runs: ProgressActivity2026[] = [];
  for (let week = 0; week < 6; week += 1) for (const offset of [0, 2]) {
    const day = addCalendarDays2026('2026-09-07', week * 7 + offset);
    runs.push(activity(day, `${day}T09:00:00Z`));
  }
  const result = progression(runs);
  equal(result.totalXp, 1_200);
  equal(result.collections, { autumn: 1_200 });
  equal(seasonCollectionProgress2026(result.collections.autumn!).earnedTiers, 12);
  equal(seasonCollectionProgress2026(1_200).xpToNextTier, 0);
});

Deno.test('2026: selecting an archive is prospective; the same day does not credit two collections', () => {
  const result = progression([
    activity('mon', '2026-09-07T09:00:00Z'),
    activity('tue', '2026-09-08T09:00:00Z'),
    activity('wed', '2026-09-09T09:00:00Z'),
  ], { collectionSelections: [{ collectionId: 'spring-archive', selectedAt: '2026-09-08T08:00:00Z' }] });
  equal(result.collections, { autumn: 200, 'spring-archive': 100 });
  equal(result.totalXp, 300);
});

Deno.test('2026: overflow keeps advancing career without filling another collection', () => {
  const runs: ProgressActivity2026[] = [];
  for (let week = 0; week < 6; week += 1) for (const offset of [0, 2, 4]) {
    const day = addCalendarDays2026('2026-09-07', week * 7 + offset);
    runs.push(activity(day, `${day}T09:00:00Z`));
  }
  const result = progression(runs);
  equal(result.totalXp, 1_800);
  equal(result.collections, { autumn: 1_200 });
  equal(result.level, 10);
});

const match: Challenge2026 = {
  id: 'match', sport: 'run', timeZone: 'Europe/Paris',
  startsAt: '2026-09-06T22:00:00Z', endsAt: '2026-09-13T22:00:00Z',
  teams: [
    { id: 'A', playerIds: ['a1', 'a2', 'a3', 'a4', 'a5'] },
    { id: 'B', playerIds: ['b1', 'b2', 'b3', 'b4', 'b5'] },
  ],
  sectorIds: ['canal', 'park', 'centre'],
};
function loop(id: string, player: string, closed: string, overrides: Partial<ChallengeLoop2026> = {}): ChallengeLoop2026 {
  return {
    eventId: id, activityId: id, playerId: player, sport: 'run', closedAt: closed,
    activityStartedAt: Date.parse(closed) - 30 * 60_000,
    activityEndedAt: closed, receivedAt: closed,
    admissible: true, challengeConsent: true, withdrawn: false,
    sectorTraceMetres: { canal: 400 }, ...overrides,
  };
}

Deno.test('2026: challenge keeps a seven-day local week across DST', () => {
  validateChallenge2026({ ...match, startsAt: '2026-03-22T23:00:00Z', endsAt: '2026-03-29T22:00:00Z' });
  throws(() => validateChallenge2026({ ...match, startsAt: '2026-09-07T00:00:00Z' }));
  throws(() => validateChallenge2026({ ...match, teams: [match.teams[0]!, match.teams[0]!] }));
});

Deno.test('2026: a challenge uses physical first two days and caps each player at six points', () => {
  const result = computeChallenge2026(match, [
    loop('wed', 'a1', '2026-09-09T10:00:00Z'),
    loop('mon', 'a1', '2026-09-07T10:00:00Z', { receivedAt: '2026-09-10T10:00:00Z' }),
    loop('tue', 'a1', '2026-09-08T10:00:00Z'),
    loop('again', 'a1', '2026-09-08T12:00:00Z'),
  ]);
  equal(result.contributions.map((item) => [item.activityId, item.points]), [['mon', 3], ['tue', 3], ['wed', 0]]);
  equal(result.scores[0]!.totalPoints, 6);
});

Deno.test('2026: first eligible face assigns one day and sector for an activity crossing midnight', () => {
  const result = computeChallenge2026(match, [
    loop('face1', 'a1', '2026-09-08T21:59:00Z', { activityId: 'night', activityEndedAt: '2026-09-08T22:10:00Z', receivedAt: '2026-09-08T22:10:00Z' }),
    loop('face2', 'a1', '2026-09-08T22:05:00Z', { activityId: 'night', sectorTraceMetres: { park: 900 } }),
  ]);
  equal(result.contributions.map((item) => [item.day, item.sectorId, item.points]), [['2026-09-08', 'canal', 3]]);
});

Deno.test('2026: sector fallback is announced order; only pre-activity eligible preferences apply', () => {
  const first = loop('first', 'a1', '2026-09-08T10:00:00Z', { sectorTraceMetres: { park: 900, canal: 400 } });
  equal(computeChallenge2026(match, [first]).contributions[0]!.sectorId, 'canal');
  const timely = { ...first, preference: { sectorId: 'park', recordedAt: '2026-09-08T09:00:00Z' } };
  equal(computeChallenge2026(match, [timely]).contributions[0]!.sectorId, 'park');
  const late = { ...first, preference: { sectorId: 'park', recordedAt: '2026-09-08T10:00:00Z' } };
  equal(computeChallenge2026(match, [late]).contributions[0]!.sectorId, 'canal');
  const unreachable = { ...first, preference: { sectorId: 'centre', recordedAt: '2026-09-08T09:00:00Z' } };
  equal(computeChallenge2026(match, [unreachable]).contributions[0]!.usedFallback, true);
});

Deno.test('2026: withdrawing a contribution retains the attempt and locked sector', () => {
  const monday = loop('mon', 'a1', '2026-09-07T10:00:00Z');
  const tuesday = loop('tue', 'a1', '2026-09-08T10:00:00Z');
  const initial = computeChallenge2026(match, [monday, tuesday]);
  const revised = computeChallenge2026(match, [
    { ...monday, withdrawn: true, admissible: false }, tuesday,
    loop('mon-retry', 'a1', '2026-09-07T12:00:00Z', { sectorTraceMetres: { park: 900 } }),
    loop('wed', 'a1', '2026-09-09T10:00:00Z'),
  ], initial.contributions);
  equal(revised.contributions.map((item) => [item.activityId, item.sectorId, item.points, item.reason]), [
    ['mon', 'canal', 0, 'withdrawn_attempt_kept'], ['tue', 'canal', 3, 'contributed'], ['wed', 'canal', 0, 'player_budget_reached'],
  ]);
});

Deno.test('2026: a late earlier day replaces a third day without changing locked sector assignments', () => {
  const tuesday = loop('tue', 'a1', '2026-09-08T10:00:00Z');
  const wednesday = loop('wed', 'a1', '2026-09-09T10:00:00Z');
  const initial = computeChallenge2026(match, [tuesday, wednesday]);
  const revised = computeChallenge2026(match, [
    tuesday, wednesday, loop('mon', 'a1', '2026-09-07T10:00:00Z', { receivedAt: '2026-09-10T10:00:00Z' }),
  ], initial.contributions);
  equal(revised.contributions.map((item) => [item.day, item.points]), [['2026-09-07', 3], ['2026-09-08', 3], ['2026-09-09', 0]]);
});

Deno.test('2026: match ends by physical closure, with an inclusive final 24-hour receipt window', () => {
  const end = Date.parse(String(match.endsAt));
  const deadline = end + 24 * 3_600_000;
  const valid = loop('last', 'a1', new Date(end - 1).toISOString(), { activityEndedAt: deadline, receivedAt: deadline });
  equal(computeChallenge2026(match, [valid]).scores[0]!.totalPoints, 3);
  equal(computeChallenge2026(match, [{ ...valid, closedAt: end }]).scores[0]!.totalPoints, 0);
  equal(computeChallenge2026(match, [{ ...valid, receivedAt: deadline + 1 }]).scores[0]!.totalPoints, 0);
});

Deno.test('2026: no consent, inadequate in-sector trace, outsiders and wrong sport cannot score', () => {
  const first = loop('first', 'a1', '2026-09-08T10:00:00Z');
  for (const invalid of [
    { ...first, challengeConsent: false }, { ...first, sectorTraceMetres: { canal: 399.999 } },
    { ...first, playerId: 'outsider' }, { ...first, sport: 'bike' as const },
  ]) equal(computeChallenge2026(match, [invalid]).scores[0]!.totalPoints, 0);
  const bike = { ...first, sport: 'bike' as const, sectorTraceMetres: { canal: 999 } };
  equal(computeChallenge2026({ ...match, sport: 'bike' }, [bike]).scores[0]!.totalPoints, 0);
  equal(computeChallenge2026({ ...match, sport: 'bike' }, [{ ...bike, sectorTraceMetres: { canal: 1_000 } }]).scores[0]!.totalPoints, 3);
});

Deno.test('2026: both full teams have at most thirty points; identical sectors end in a draw', () => {
  const loops: ChallengeLoop2026[] = [];
  for (const team of match.teams) for (const player of team.playerIds) for (const day of ['07', '08', '09']) {
    loops.push(loop(`${player}-${day}`, player, `2026-09-${day}T10:00:00Z`));
  }
  const result = computeChallenge2026(match, loops);
  equal(result.scores.map((score) => [score.totalPoints, score.matchPoints]), [[30, 1.5], [30, 1.5]]);
  equal(result.winnerTeamId, null);
  equal(CHALLENGE_RULES_2026.maximumPointsPerTeam, 30);
});

Deno.test('2026: strategic sector distribution decides the match independently of tied total points', () => {
  const allocations = {
    A: ['canal', 'canal', 'canal', 'canal', 'park', 'park', 'park', 'centre', 'centre', 'centre'],
    B: ['canal', 'canal', 'park', 'park', 'park', 'park', 'centre', 'centre', 'centre', 'centre'],
  };
  const loops: ChallengeLoop2026[] = [];
  for (const team of match.teams) team.playerIds.forEach((player, playerIndex) => {
    ['07', '08'].forEach((day, dayIndex) => {
      const sector = allocations[team.id as 'A' | 'B'][playerIndex * 2 + dayIndex]!;
      loops.push(loop(`${player}-${day}`, player, `2026-09-${day}T10:00:00Z`, { sectorTraceMetres: { [sector]: 400 } }));
    });
  });
  const result = computeChallenge2026(match, loops);
  equal(result.scores.map((score) => [score.totalPoints, score.matchPoints]), [[30, 1], [30, 2]]);
  equal(result.winnerTeamId, 'B');
});

Deno.test('2026: duplicate loop delivery is idempotent, stable IDs resolve exact physical ties', () => {
  const laterId = loop('z', 'a1', '2026-09-08T10:00:00Z', { sectorTraceMetres: { park: 800 } });
  const firstId = loop('a', 'a1', '2026-09-08T10:00:00Z');
  const result = computeChallenge2026(match, [laterId, firstId, firstId]);
  equal(result.contributions.length, 1);
  equal(result.contributions[0]!.sectorId, 'canal');
  equal(result, computeChallenge2026(match, [firstId, laterId]));
  equal(localDay2026(result.finalPublishAt, match.timeZone), '2026-09-15');
  const stableCase = computeChallenge2026(match, [firstId, { ...laterId, eventId: 'B' }]);
  equal(stableCase.contributions[0]!.eventId, 'B'); // Byte order, independent of runtime locale.
});

Deno.test('2026: generated server modules remain in sync with the pure shared models', async () => {
  for (const name of ['calendar2026.ts', 'progression2026.ts', 'challenges2026.ts']) {
    const original = await Deno.readTextFile(`packages/shared/src/${name}`);
    const generated = await Deno.readTextFile(`supabase/functions/_shared/${name}`);
    const expected = original
      .replace(/(['"])\.\/game-rules\1/g, '$1./game-rules.ts$1')
      .replace(/(['"])\.\/calendar2026\1/g, '$1./calendar2026.ts$1');
    equal(generated, expected);
  }
});

Deno.test('2026: a real season opening cannot take XP from earlier calendar days', () => {
  const ledger = progression([
    activity('before', '2026-09-06T09:00:00Z'), activity('opening', '2026-09-07T09:00:00Z'),
  ], { initialCollectionEffectiveAt: '2026-09-06T22:00:00Z' });
  equal(ledger.totalXp, 200);
  equal(ledger.days.map(day => [day.day, day.collectionId, day.collectionXp]), [
    ['2026-09-06', null, 0], ['2026-09-07', 'autumn', 100],
  ]);
  equal(ledger.collections, { autumn: 100 });
});

Deno.test('2026: resuming an archive never reassigns the switching day or multiplies XP', () => {
  const activities = ['07', '08', '09'].map(day => activity(day, `2026-09-${day}T09:00:00Z`));
  const ledger = progression(activities, { collectionSelections: [
    { collectionId: 'archive', selectedAt: '2026-09-07T12:00:00Z' },
    { collectionId: 'autumn', selectedAt: '2026-09-08T12:00:00Z' },
  ] });
  equal(ledger.totalXp, 300);
  equal(ledger.days.map(day => [day.day, day.collectionId, day.collectionXp]), [
    ['2026-09-07', 'autumn', 100], ['2026-09-08', 'archive', 100], ['2026-09-09', 'autumn', 100],
  ]);
  equal(ledger.collections, { archive: 100, autumn: 200 });
});

Deno.test('2026: zéro XP porte toujours un motif — jamais un silence', () => {
  const reason = (ledger: ReturnType<typeof computeProgressLedger2026>, id: string, awarded = 0) =>
    runXpReason2026(ledger, id, awarded);
  // Une sortie créditée le dit ; une sortie inconnue du registre aussi.
  const credited = progression([activity('monday', '2026-09-07T09:00:00Z')]);
  equal(reason(credited, 'monday', 100), 'credited');
  equal(reason(credited, 'never-seen'), 'not_recorded');
  // La même journée, une deuxième sortie ne recrée pas une journée.
  const twice = progression([
    activity('morning', '2026-09-07T09:00:00Z'), activity('evening', '2026-09-07T19:00:00Z'),
  ]);
  equal(reason(twice, 'evening'), 'day_already_credited');
  // Sous le minimum de mouvement admissible, et au-delà du budget hebdomadaire.
  equal(reason(progression([activity('short', '2026-09-07T09:00:00Z', 5)]), 'short'), 'movement_below_minimum');
  const week = progression(['07', '08', '09', '10'].map(day => activity(`d${day}`, `2026-09-${day}T09:00:00Z`)));
  equal(week.totalXp, 300);
  equal(reason(week, 'd10'), 'weekly_budget_reached');
  // Les motifs d'exclusion de la source sont rendus tels quels, sans euphémisme.
  const excluded: [string, Partial<ProgressActivity2026>, string][] = [
    ['review', { eligibility: 'review' }, 'review'],
    ['withdrawn', { eligibility: 'withdrawn' }, 'withdrawn'],
    ['manual', { source: 'manual' }, 'manual'],
    ['old', { receivedAt: '2026-09-30T09:00:00Z' }, 'import_older_than_seven_days'],
  ];
  for (const [id, overrides, expected] of excluded) {
    equal(reason(progression([activity(id, '2026-09-07T09:00:00Z', 10, overrides)]), id), expected);
  }
  equal(reason(progression([activity('ancient', '2020-01-01T09:00:00Z')], { accountCreatedAt: '2026-01-01T00:00:00Z' }), 'ancient'), 'before_account_creation');
});
