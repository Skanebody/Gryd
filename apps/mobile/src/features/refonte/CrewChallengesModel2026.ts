import { addCalendarDays2026, CHALLENGE_RULES_2026 as rules, localDay2026, localWeek2026, startOfLocalDay2026 } from '@klaim/shared';
export interface ChallengeSector2026 { id: string; title: string; geometry: unknown }
export interface ChallengeArena2026 { id: string; title: string; activity: 'run' | 'bike'; timeZone: string; sectors: ChallengeSector2026[]; accessSource: string; reviewedAt: string }
export interface ChallengeTeam2026 { id: string; name: string; accepted: boolean; locked: boolean; players: number; side: number }
export interface ChallengeScore2026 { teamId: string; totalPoints: number; sectors: Record<string, number>; matchPoints?: number }
export interface CrewChallenge2026 {
  id: string; title: string; activity: 'run' | 'bike'; status: 'invited' | 'assembling' | 'scheduled' | 'active' | 'final' | 'cancelled'; reason: string | null;
  timeZone: string; startsAt: string; endsAt: string; sectors: ChallengeSector2026[]; myTeamId: string; canManage: boolean; joined: boolean; rostered: boolean;
  teams: ChallengeTeam2026[]; ownScore: ChallengeScore2026 | null;
  publishedResult: { scores: ChallengeScore2026[]; winnerTeamId: string | null; isDraw: boolean } | null;
  publishedAt: string | null; resultRevision: number | null;
  myPreference: { sectorId: string; recordedAt: string } | null;
  myContributions: { runId: string | null; day: string; sectorId: string; points: number | null; withdrawn: boolean; usedFallback: boolean }[];
}
const obj = (v: unknown): Record<string, unknown> | null => v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : null;
const text = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const date = (v: unknown): v is string => text(v) && Number.isFinite(Date.parse(v));
const number = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
function sectors(raw: unknown): ChallengeSector2026[] | null {
  if (!Array.isArray(raw) || raw.length !== rules.sectorCount) return null;
  const result: ChallengeSector2026[] = [];
  for (const item of raw) { const row = obj(item); if (!row || !text(row.id) || !text(row.title) || !obj(row.geometry)) return null; result.push({ id: row.id, title: row.title, geometry: row.geometry }); }
  return new Set(result.map(item => item.id)).size === result.length ? result : null;
}
function score(raw: unknown, comparative: boolean): ChallengeScore2026 | null {
  const row = obj(raw); const values = obj(row?.sectors);
  if (!row || !text(row.teamId) || !number(row.totalPoints) || !values || Object.values(values).some(v => !number(v)) || comparative && !number(row.matchPoints)) return null;
  // Own live data deliberately does not carry matchPoints, even if a server returns an extra field.
  return { teamId: row.teamId, totalPoints: row.totalPoints, sectors: values as Record<string, number>, ...(comparative ? { matchPoints: row.matchPoints as number } : {}) };
}
export function parseChallengeArenas2026(raw: unknown): ChallengeArena2026[] | null {
  if (!Array.isArray(raw)) return null;
  const result: ChallengeArena2026[] = [];
  for (const item of raw) {
    const row = obj(item); const publishedSectors = sectors(row?.sectors);
    if (!row || !text(row.id) || !text(row.title) || !['run', 'bike'].includes(String(row.activity)) || !text(row.timeZone) || !publishedSectors || !text(row.accessSource) || !date(row.reviewedAt)) return null;
    try { localDay2026(Date.now(), row.timeZone); } catch { return null; }
    result.push({ id: row.id, title: row.title, activity: row.activity as 'run' | 'bike', timeZone: row.timeZone, sectors: publishedSectors, accessSource: row.accessSource, reviewedAt: row.reviewedAt });
  }
  return result;
}
export function parseCrewChallenges2026(raw: unknown): CrewChallenge2026[] | null {
  if (!Array.isArray(raw)) return null;
  const result: CrewChallenge2026[] = [];
  for (const item of raw) {
    const row = obj(item); const publishedSectors = sectors(row?.sectors);
    if (!row || !text(row.id) || !text(row.title) || !text(row.timeZone) || !date(row.startsAt) || !date(row.endsAt) || !text(row.myTeamId) || !['run', 'bike'].includes(String(row.activity)) || !['invited', 'assembling', 'scheduled', 'active', 'final', 'cancelled'].includes(String(row.status)) || !publishedSectors || typeof row.canManage !== 'boolean' || typeof row.joined !== 'boolean' || !Array.isArray(row.teams) || row.teams.length !== rules.teamCount || !Array.isArray(row.myContributions)) return null;
    try { localDay2026(Date.now(), row.timeZone); } catch { return null; }
    const teams: ChallengeTeam2026[] = [];
    for (const input of row.teams) { const team = obj(input); if (!team || !text(team.id) || !text(team.name) || typeof team.accepted !== 'boolean' || typeof team.locked !== 'boolean' || !number(team.players) || !Number.isInteger(team.players) || team.players > rules.playersPerTeam || !number(team.side) || ![0, 1].includes(team.side)) return null; teams.push({ id: team.id, name: team.name, accepted: team.accepted, locked: team.locked, players: team.players, side: team.side }); }
    if (!teams.some(team => team.id === row.myTeamId) || new Set(teams.map(team => team.id)).size !== rules.teamCount || new Set(teams.map(team => team.side)).size !== rules.teamCount || Date.parse(row.endsAt) <= Date.parse(row.startsAt)) return null;
    let publishedResult: CrewChallenge2026['publishedResult'] = null;
    if (row.publishedResult !== null && row.publishedResult !== undefined) {
      const published = obj(row.publishedResult);
      if (!published || !Array.isArray(published.scores) || published.scores.length !== rules.teamCount || typeof published.isDraw !== 'boolean' || !date(row.publishedAt)) return null;
      const scores = published.scores.map(value => score(value, true)); if (scores.some(value => value === null || !teams.some(team => team.id === value.teamId)) || new Set(scores.map(value => value?.teamId)).size !== rules.teamCount) return null;
      if (published.winnerTeamId !== null && !teams.some(team => team.id === published.winnerTeamId)) return null;
      publishedResult = { scores: scores as ChallengeScore2026[], winnerTeamId: text(published.winnerTeamId) ? published.winnerTeamId : null, isDraw: published.isDraw };
    }
    const myContributions: CrewChallenge2026['myContributions'] = [];
    for (const input of row.myContributions) { const contribution = obj(input); if (!contribution || !text(contribution.day) || !text(contribution.sectorId) || typeof contribution.withdrawn !== 'boolean' || typeof contribution.usedFallback !== 'boolean') return null; myContributions.push({ runId: text(contribution.runId) ? contribution.runId : null, day: contribution.day, sectorId: contribution.sectorId, points: number(contribution.points) ? contribution.points : null, withdrawn: contribution.withdrawn, usedFallback: contribution.usedFallback }); }
    const preference = obj(row.myPreference);
    const own = row.ownScore === null ? null : score(row.ownScore, false); if (row.ownScore != null && (!own || own.teamId !== row.myTeamId)) return null;
    result.push({ id: row.id, title: row.title, activity: row.activity as CrewChallenge2026['activity'], status: row.status as CrewChallenge2026['status'], reason: typeof row.reason === 'string' ? row.reason : null, timeZone: row.timeZone, startsAt: row.startsAt, endsAt: row.endsAt, sectors: publishedSectors, myTeamId: row.myTeamId, canManage: row.canManage, joined: row.joined, rostered: row.rostered === true || row.joined, teams, ownScore: own, publishedResult, publishedAt: date(row.publishedAt) ? row.publishedAt : null, resultRevision: number(row.resultRevision) ? row.resultRevision : null, myContributions, myPreference: preference && text(preference.sectorId) && date(preference.recordedAt) ? { sectorId: preference.sectorId, recordedAt: preference.recordedAt } : null });
  }
  return result;
}
export function challengeActions2026(match: CrewChallenge2026, now: number) {
  const team = match.teams.find(item => item.id === match.myTeamId);
  const closed = match.status === 'final' || match.status === 'cancelled'; const before = now < Date.parse(match.startsAt);
  return {
    accept: !closed && before && ['invited', 'assembling'].includes(match.status) && match.canManage && team?.side === 1 && !team.accepted,
    join: !closed && !match.joined && (match.rostered || before && match.status !== 'scheduled' && team?.accepted === true && !team.locked && team.players < rules.playersPerTeam),
    withdraw: match.joined,
    lock: !closed && before && match.status === 'assembling' && match.canManage && team?.accepted === true && !team.locked && team.players === rules.playersPerTeam,
    cancel: !closed && before && match.canManage,
    chooseSector: !closed && match.joined && now < Date.parse(match.endsAt),
  };
}
/** Candidate schedule uses the published arena timezone, never the device timezone. */
export function nextChallengeStarts2026(nowMs: number, timeZone: string): string[] {
  const monday = localWeek2026(localDay2026(nowMs, timeZone));
  return [1, 2, 3].map(offset => new Date(startOfLocalDay2026(addCalendarDays2026(monday, rules.durationDays * offset), timeZone)).toISOString());
}
