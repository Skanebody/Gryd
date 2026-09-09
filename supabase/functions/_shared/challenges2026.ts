import { CHALLENGE_RULES_2026 } from './game-rules.ts';
import { addCalendarDays2026, instantMs2026, localDay2026, localWeek2026, startOfLocalDay2026 } from './calendar2026.ts';
import type { RulesInstant2026 } from './calendar2026.ts';

const HOUR_MS = 3_600_000;
const compareStableIds = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;

export interface ChallengeTeam2026 {
  id: string;
  /** Frozen before kickoff; membership in a current crew is irrelevant here. */
  playerIds: readonly string[];
}

export interface Challenge2026 {
  id: string;
  sport: 'run' | 'bike';
  timeZone: string;
  startsAt: RulesInstant2026;
  /** Exclusive next Monday 00:00, not an ambiguous Sunday 23:59:00 cutoff. */
  endsAt: RulesInstant2026;
  teams: readonly ChallengeTeam2026[];
  /** Stable identifiers in the fallback order published before the match. */
  sectorIds: readonly string[];
}

/** Geometry and provenance have already been validated by the authoritative
 * engine. A private loop requires separate challenge consent, never publication.
 */
export interface ChallengeLoop2026 {
  eventId: string;
  activityId: string;
  playerId: string;
  sport: 'run' | 'bike';
  closedAt: RulesInstant2026;
  activityStartedAt: RulesInstant2026;
  activityEndedAt: RulesInstant2026;
  receivedAt: RulesInstant2026;
  admissible: boolean;
  challengeConsent: boolean;
  withdrawn: boolean;
  sectorTraceMetres: Readonly<Record<string, number>>;
  preference?: { sectorId: string; recordedAt: RulesInstant2026 };
}

export interface ChallengeDayAssignment2026 {
  id: string;
  playerId: string;
  teamId: string;
  activityId: string;
  eventId: string;
  day: string;
  sectorId: string;
  closedAt: number;
  usedFallback: boolean;
  withdrawn: boolean;
}

export interface ChallengeContribution2026 extends ChallengeDayAssignment2026 {
  points: number;
  countsTowardBudget: boolean;
  reason: 'contributed' | 'withdrawn_attempt_kept' | 'player_budget_reached';
}

export function validateChallenge2026(challenge: Challenge2026): void {
  const rule = CHALLENGE_RULES_2026;
  const start = instantMs2026(challenge.startsAt);
  const end = instantMs2026(challenge.endsAt);
  const day = localDay2026(start, challenge.timeZone);
  if (!challenge.id || day !== localWeek2026(day) || start !== startOfLocalDay2026(day, challenge.timeZone) ||
    end !== startOfLocalDay2026(addCalendarDays2026(day, rule.durationDays), challenge.timeZone)) {
    throw new RangeError('A standard challenge runs Monday to Monday in its frozen timezone');
  }
  if (challenge.teams.length !== rule.teamCount ||
    new Set(challenge.teams.map((team) => team.id)).size !== rule.teamCount ||
    challenge.teams.some((team) => !team.id || team.playerIds.length !== rule.playersPerTeam || team.playerIds.some((id) => !id)) ||
    new Set(challenge.teams.flatMap((team) => [...team.playerIds])).size !== rule.teamCount * rule.playersPerTeam) {
    throw new RangeError('A standard challenge requires two distinct frozen rosters of five');
  }
  if (challenge.sectorIds.length !== rule.sectorCount || challenge.sectorIds.some((id) => !id) ||
    new Set(challenge.sectorIds).size !== rule.sectorCount) {
    throw new RangeError('A standard challenge requires three distinct frozen sectors');
  }
}

/** Recompute ranked contributions from physical closure order, including late
 * admissible imports. Previously persisted assignments keep their sector and
 * consumed attempt when withdrawn. Store those tombstones; deletion cannot
 * manufacture another attempt. Calls with the same inputs are idempotent.
 *
 * This does not authorize roster edits or cross-match enrollment. The database
 * must enforce UNIQUE(player, discipline, ranked_week) across all matches.
 */
export function computeChallenge2026(
  challenge: Challenge2026,
  loops: readonly ChallengeLoop2026[],
  lockedAssignments: readonly ChallengeDayAssignment2026[] = [],
) {
  validateChallenge2026(challenge);
  const rule = CHALLENGE_RULES_2026;
  const starts = instantMs2026(challenge.startsAt);
  const ends = instantMs2026(challenge.endsAt);
  const deadline = ends + rule.finalSyncWindowHours * HOUR_MS;
  const teamFor = new Map(challenge.teams.flatMap((team) => team.playerIds.map((player) => [player, team.id] as const)));
  const assignmentId = (playerId: string, day: string) => `challenge:${challenge.id}:${playerId}:${day}`;
  const assignments = new Map<string, ChallengeDayAssignment2026>();
  for (const locked of lockedAssignments) {
    if (locked.teamId !== teamFor.get(locked.playerId) || !challenge.sectorIds.includes(locked.sectorId) ||
      locked.id !== assignmentId(locked.playerId, locked.day) ||
      localDay2026(locked.closedAt, challenge.timeZone) !== locked.day ||
      locked.closedAt < starts || locked.closedAt >= ends || assignments.has(locked.id)) {
      throw new RangeError('Invalid locked challenge assignment');
    }
    assignments.set(locked.id, { ...locked });
  }

  const rejected: { eventId: string; reason: string }[] = [];
  const seenEvent = new Map<string, string>();
  const firstActivity = new Set<string>();
  const ordered = [...loops].sort((a, b) => instantMs2026(a.closedAt) - instantMs2026(b.closedAt) || compareStableIds(a.eventId, b.eventId));
  for (const loop of ordered) {
    if (!loop.eventId || !loop.activityId) throw new RangeError('Missing stable loop ID');
    const serialized = JSON.stringify(loop);
    const duplicate = seenEvent.get(loop.eventId);
    if (duplicate !== undefined) {
      if (duplicate !== serialized) throw new RangeError('Conflicting loop event ID');
      continue;
    }
    seenEvent.set(loop.eventId, serialized);
    const closed = instantMs2026(loop.closedAt);
    const started = instantMs2026(loop.activityStartedAt);
    const finished = instantMs2026(loop.activityEndedAt);
    const received = instantMs2026(loop.receivedAt);
    const teamId = teamFor.get(loop.playerId);
    const eligibleSectors = challenge.sectorIds.filter((sector) => {
      const length = loop.sectorTraceMetres[sector];
      return typeof length === 'number' && Number.isFinite(length) && length >= rule.minimumTraceInsideSectorM[challenge.sport];
    });
    const reason = !teamId ? 'not_in_frozen_roster' :
      loop.sport !== challenge.sport ? 'wrong_sport' :
      !loop.admissible ? 'loop_not_admissible' :
      !loop.challengeConsent ? 'no_challenge_consent' :
      closed < starts || closed >= ends ? 'closure_outside_challenge' :
      started > closed || finished < closed || received < finished ? 'invalid_chronology' :
      finished > deadline || received > deadline ? 'sync_window_expired' :
      eligibleSectors.length === 0 ? 'insufficient_trace_inside_sector' : null;
    if (reason) {
      rejected.push({ eventId: loop.eventId, reason });
      continue;
    }
    const activityKey = `${loop.playerId}:${loop.activityId}`;
    // One activity, one physical contribution day even when it crosses midnight.
    if (firstActivity.has(activityKey)) continue;
    firstActivity.add(activityKey);
    const day = localDay2026(closed, challenge.timeZone);
    const id = assignmentId(loop.playerId, day);
    const locked = assignments.get(id);
    if (locked) {
      if (loop.withdrawn && loop.activityId === locked.activityId) locked.withdrawn = true;
      continue;
    }
    // An activity already locked to a different day cannot earn again after
    // edits, a removed first face, or an incomplete reprocessing payload.
    if ([...assignments.values()].some((item) => item.playerId === loop.playerId && item.activityId === loop.activityId)) continue;
    const preferred = loop.preference && instantMs2026(loop.preference.recordedAt) <= started &&
      eligibleSectors.includes(loop.preference.sectorId) ? loop.preference.sectorId : undefined;
    assignments.set(id, {
      id, playerId: loop.playerId, teamId: teamId!, activityId: loop.activityId,
      eventId: loop.eventId, day, sectorId: preferred ?? eligibleSectors[0]!, closedAt: closed,
      usedFallback: preferred === undefined, withdrawn: loop.withdrawn,
    });
  }
  // A withdrawal remains effective even when the revised loop is no longer
  // geometrically eligible; the historic slot must still stay consumed.
  for (const loop of loops) {
    if (loop.withdrawn) for (const item of assignments.values()) {
      if (item.playerId === loop.playerId && item.activityId === loop.activityId) item.withdrawn = true;
    }
  }
  const playerDays = new Map<string, number>();
  const contributions: ChallengeContribution2026[] = [...assignments.values()]
    .sort((a, b) => a.closedAt - b.closedAt || compareStableIds(a.eventId, b.eventId))
    .map((item) => {
      const previousDays = playerDays.get(item.playerId) ?? 0;
      const countsTowardBudget = previousDays < rule.maximumContributiveDaysPerPlayer;
      playerDays.set(item.playerId, previousDays + 1);
      return {
        ...item, countsTowardBudget,
        points: countsTowardBudget && !item.withdrawn ? rule.pointsPerDay : 0,
        reason: !countsTowardBudget ? 'player_budget_reached' : item.withdrawn ? 'withdrawn_attempt_kept' : 'contributed',
      };
    });
  const scores = challenge.teams.map((team) => ({
    teamId: team.id,
    totalPoints: contributions.filter((item) => item.teamId === team.id).reduce((total, item) => total + item.points, 0),
    matchPoints: 0,
    sectors: Object.fromEntries(challenge.sectorIds.map((sector) => [sector,
      contributions.filter((item) => item.teamId === team.id && item.sectorId === sector).reduce((total, item) => total + item.points, 0),
    ])),
  }));
  for (const sector of challenge.sectorIds) {
    const first = scores[0]!;
    const second = scores[1]!;
    if (first.sectors[sector] === second.sectors[sector]) {
      first.matchPoints += rule.sectorTieMatchPoints;
      second.matchPoints += rule.sectorTieMatchPoints;
    } else if (first.sectors[sector]! > second.sectors[sector]!) first.matchPoints += rule.sectorWinMatchPoints;
    else second.matchPoints += rule.sectorWinMatchPoints;
  }
  const winnerTeamId = scores[0]!.matchPoints === scores[1]!.matchPoints ? null :
    scores.reduce((best, score) => score.matchPoints > best.matchPoints ? score : best).teamId;
  return {
    contributions, scores, winnerTeamId, isDraw: winnerTeamId === null,
    finalPublishAt: deadline,
    rejected: rejected.sort((a, b) => compareStableIds(a.eventId, b.eventId)),
  };
}
