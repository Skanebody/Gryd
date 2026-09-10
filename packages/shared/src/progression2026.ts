import { PROGRESSION_RULES_2026, SEASON_REWARDS_2026 } from './game-rules';
import {
  addCalendarDays2026, instantMs2026, localDay2026, localWeek2026,
  scheduleProgressTimezoneChange2026, startOfLocalDay2026,
} from './calendar2026';
import type { ProgressTimezoneChange2026, RulesInstant2026 } from './calendar2026';

const SECOND_MS = 1_000;
const DAY_MS = 86_400_000;

export function xpForLevel2026(level: number): number {
  if (!Number.isSafeInteger(level) || level < 1) throw new RangeError('Invalid level');
  const rank = level - 1;
  return PROGRESSION_RULES_2026.levelLinearXp * rank +
    PROGRESSION_RULES_2026.levelQuadraticXp * rank * (rank - 1);
}

/** Permanent level, without an editorial cap at 50. Invalid UI data is level 1. */
export function levelForXp2026(xp: number): number {
  if (!Number.isFinite(xp) || xp <= 0) return 1;
  const a = PROGRESSION_RULES_2026.levelQuadraticXp;
  const b = PROGRESSION_RULES_2026.levelLinearXp - a;
  let level = Math.floor((Math.sqrt(b * b + 4 * a * xp) - b) / (2 * a)) + 1;
  // Correct floating point rounding on exact thresholds.
  if (xpForLevel2026(level + 1) <= xp) level += 1;
  if (xpForLevel2026(level) > xp) level -= 1;
  return level;
}

/** §7.2 — le niveau, et RIEN d'autre. Cette fonction ne dresse aucune liste
 * d'objets : les objets de niveau sont OCTROYÉS par le serveur (migration 0144)
 * et lus tels quels (`levelRewards`). Un catalogue filtré ici serait un objet
 * peint — possédé à l'écran, absent du compte. */
export function careerProgress2026(xp: number) {
  const safeXp = Number.isFinite(xp) ? Math.max(0, Math.floor(xp)) : 0;
  const level = levelForXp2026(safeXp);
  const floorXp = xpForLevel2026(level);
  const nextLevelXp = xpForLevel2026(level + 1);
  return {
    xp: safeXp, level, floorXp, nextLevelXp,
    xpRemaining: nextLevelXp - safeXp,
    progress: (safeXp - floorXp) / (nextLevelXp - floorXp),
  };
}

export function seasonCollectionProgress2026(xp: number) {
  const { seasonTierCount: totalTiers, seasonXpPerTier: perTier } = PROGRESSION_RULES_2026;
  const safeXp = Number.isFinite(xp) ? Math.max(0, Math.floor(xp)) : 0;
  const creditedXp = Math.min(safeXp, totalTiers * perTier);
  const earnedTiers = Math.floor(creditedXp / perTier);
  const completed = earnedTiers === totalTiers;
  return {
    creditedXp, earnedTiers, totalTiers, completed,
    xpIntoTier: completed ? perTier : creditedXp % perTier,
    xpToNextTier: completed ? 0 : perTier - creditedXp % perTier,
    rewards: SEASON_REWARDS_2026.map((reward) => ({
      ...reward, unlocked: reward.tier <= earnedTiers,
    })),
  };
}

export interface MovementInterval2026 {
  start: RulesInstant2026;
  end: RulesInstant2026;
}

/** Input is normalized by ingestion. `canonicalId` groups the phone and imports.
 * Movement is verified by the server; a client duration is not sufficient proof.
 * Source eligibility is independent of GPS capture eligibility (including indoor).
 */
export interface ProgressActivity2026 {
  canonicalId: string;
  revision: number;
  sport: 'run' | 'bike';
  startedAt: RulesInstant2026;
  endedAt: RulesInstant2026;
  receivedAt: RulesInstant2026;
  source: 'gps' | 'verified_indoor' | 'manual';
  eligibility: 'eligible' | 'review' | 'withdrawn';
  movement: readonly MovementInterval2026[];
}

export interface CollectionSelection2026 {
  collectionId: string;
  selectedAt: RulesInstant2026;
}

export interface ProgressLedgerInput2026 {
  accountId: string;
  accountCreatedAt: RulesInstant2026;
  initialTimeZone: string;
  timezoneChanges?: readonly ProgressTimezoneChange2026[];
  initialCollectionId: string | null;
  /** Real season opening. Earlier civil days keep career XP but cannot be
   * retroactively assigned to a collection that did not exist yet. */
  initialCollectionEffectiveAt?: RulesInstant2026 | null;
  /** Selection becomes effective for the next civil day, never retroactively. */
  collectionSelections?: readonly CollectionSelection2026[];
  activities: readonly ProgressActivity2026[];
}

export interface ProgressDay2026 {
  id: string;
  day: string;
  week: string;
  timeZone: string;
  movementSeconds: number;
  eligible: boolean;
  xp: number;
  reason: 'credited' | 'movement_below_minimum' | 'weekly_budget_reached';
  collectionId: string | null;
  collectionXp: number;
  activityIds: string[];
}

type Interval = { start: number; end: number; activityId: string };
type CalendarPeriod = { start: number; timeZone: string };

function calendarPeriods(input: ProgressLedgerInput2026): CalendarPeriod[] {
  const created = instantMs2026(input.accountCreatedAt);
  localDay2026(created, input.initialTimeZone);
  const periods = [{ start: created, timeZone: input.initialTimeZone }];
  const changes = [...(input.timezoneChanges ?? [])]
    .sort((a, b) => instantMs2026(a.effectiveAt) - instantMs2026(b.effectiveAt));
  for (const change of changes) {
    const prior = periods[periods.length - 1]!;
    const requested = instantMs2026(change.requestedAt);
    const effective = instantMs2026(change.effectiveAt);
    const expected = scheduleProgressTimezoneChange2026(
      prior.timeZone, change.timeZone, change.requestedAt,
    );
    if (requested < prior.start || effective !== expected.effectiveAt || effective <= prior.start) {
      throw new RangeError('Timezone changes must start at the next frozen week boundary');
    }
    periods.push({ start: effective, timeZone: change.timeZone });
  }
  return periods;
}

function calendarAt(periods: readonly CalendarPeriod[], instant: number): CalendarPeriod {
  return [...periods].reverse().find((period) => period.start <= instant) ?? periods[0]!;
}

function unionDurationMs(intervals: readonly Interval[]): number {
  const ordered = [...intervals].sort((a, b) => a.start - b.start || a.end - b.end);
  let end = -Infinity;
  let total = 0;
  for (const interval of ordered) {
    total += Math.max(0, interval.end - Math.max(end, interval.start));
    end = Math.max(end, interval.end);
  }
  return total;
}

/** Reproducible snapshot for an idempotent server ledger, not a client award.
 * Persist its rows with UNIQUE(account_id, day), and apply corrections as deltas.
 * Input includes the account's complete normalized history and collection
 * selections. Passing only one activity or one week would reset career and
 * collection totals: incremental storage must merge with the existing history.
 * No capture status, subscription, speed or distance can increase these XP.
 */
export function computeProgressLedger2026(input: ProgressLedgerInput2026) {
  if (!input.accountId) throw new RangeError('Missing account ID');
  const created = instantMs2026(input.accountCreatedAt);
  const periods = calendarPeriods(input);
  const latest = new Map<string, ProgressActivity2026>();
  for (const activity of input.activities) {
    if (!activity.canonicalId || !Number.isSafeInteger(activity.revision) || activity.revision < 0) {
      throw new RangeError('Invalid canonical activity revision');
    }
    const previous = latest.get(activity.canonicalId);
    if (!previous || activity.revision > previous.revision) latest.set(activity.canonicalId, activity);
    else if (activity.revision === previous.revision && JSON.stringify(activity) !== JSON.stringify(previous)) {
      throw new RangeError('Conflicting canonical activity revision');
    }
  }
  const daily = new Map<string, { timeZone: string; firstMs: number; intervals: Interval[] }>();
  const ignored: { activityId: string; reason: string }[] = [];
  for (const activity of latest.values()) {
    const start = instantMs2026(activity.startedAt);
    const end = instantMs2026(activity.endedAt);
    const received = instantMs2026(activity.receivedAt);
    const reason = activity.source === 'manual' ? 'manual' :
      activity.eligibility !== 'eligible' ? activity.eligibility :
      start < created ? 'before_account_creation' :
      end <= start || received < end ? 'invalid_chronology' :
      received - end > PROGRESSION_RULES_2026.importMaxAgeDays * DAY_MS ? 'import_older_than_seven_days' : null;
    if (reason) {
      ignored.push({ activityId: activity.canonicalId, reason });
      continue;
    }
    for (const movement of activity.movement) {
      let cursor = Math.max(start, instantMs2026(movement.start));
      const stop = Math.min(end, instantMs2026(movement.end));
      while (cursor < stop) {
        const period = calendarAt(periods, cursor);
        const day = localDay2026(cursor, period.timeZone);
        const nextDay = startOfLocalDay2026(addCalendarDays2026(day, 1), period.timeZone);
        const nextPeriod = periods.find((candidate) => candidate.start > cursor)?.start ?? Infinity;
        const boundary = Math.min(stop, nextDay, nextPeriod);
        if (boundary <= cursor) throw new RangeError('Calendar did not advance');
        const bucket = daily.get(day) ?? { timeZone: period.timeZone, firstMs: cursor, intervals: [] };
        // Same civil date across a timezone change stays ONE day; travelling
        // backwards cannot manufacture an extra daily or weekly reward.
        if (cursor < bucket.firstMs) {
          bucket.firstMs = cursor;
          bucket.timeZone = period.timeZone;
        }
        bucket.intervals.push({ start: cursor, end: boundary, activityId: activity.canonicalId });
        daily.set(day, bucket);
        cursor = boundary;
      }
    }
  }

  const selections = [...(input.collectionSelections ?? [])].map((selection) => {
    const selected = instantMs2026(selection.selectedAt);
    if (selected < created || !selection.collectionId) throw new RangeError('Invalid collection selection');
    const zone = calendarAt(periods, selected).timeZone;
    return {
      collectionId: selection.collectionId,
      selected,
      effectiveDay: addCalendarDays2026(localDay2026(selected, zone), 1),
    };
  }).sort((a, b) => a.selected - b.selected);
  const initialCollectionDay = input.initialCollectionEffectiveAt == null ? null :
    localDay2026(input.initialCollectionEffectiveAt, calendarAt(periods, instantMs2026(input.initialCollectionEffectiveAt)).timeZone);
  const weekCredits = new Map<string, number>();
  const collectionTotals = new Map<string, number>();
  const days: ProgressDay2026[] = [];
  for (const [day, bucket] of [...daily.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const movementSeconds = unionDurationMs(bucket.intervals) / SECOND_MS;
    const week = localWeek2026(day);
    const eligible = movementSeconds >= PROGRESSION_RULES_2026.minimumMovementSecondsPerDay;
    const weekCount = weekCredits.get(week) ?? 0;
    const credited = eligible && weekCount < PROGRESSION_RULES_2026.maximumCreditedDaysPerWeek;
    const xp = credited ? PROGRESSION_RULES_2026.xpPerActiveDay : 0;
    if (credited) weekCredits.set(week, weekCount + 1);
    const selection = [...selections].reverse().find((item) => item.effectiveDay <= day);
    const collectionId = selection?.collectionId ??
      (initialCollectionDay === null || day >= initialCollectionDay ? input.initialCollectionId : null);
    const collectionPrior = collectionId === null ? 0 : collectionTotals.get(collectionId) ?? 0;
    const collectionXp = collectionId === null ? 0 : Math.min(xp, Math.max(0,
      PROGRESSION_RULES_2026.seasonTierCount * PROGRESSION_RULES_2026.seasonXpPerTier - collectionPrior));
    if (collectionId !== null) collectionTotals.set(collectionId, collectionPrior + collectionXp);
    days.push({
      id: `progress:${input.accountId}:${day}`,
      day, week, timeZone: bucket.timeZone, movementSeconds, eligible, xp,
      reason: credited ? 'credited' : eligible ? 'weekly_budget_reached' : 'movement_below_minimum',
      collectionId, collectionXp,
      activityIds: [...new Set(bucket.intervals.map((interval) => interval.activityId))].sort(),
    });
  }
  const totalXp = days.reduce((total, day) => total + day.xp, 0);
  return {
    days, totalXp, level: levelForXp2026(totalXp),
    collections: Object.fromEntries([...collectionTotals].sort(([a], [b]) => a.localeCompare(b))),
    ignored: ignored.sort((a, b) => a.activityId.localeCompare(b.activityId)),
  };
}

/** Cahier G12 : « le résultat d'activité explique une fois les XP communs ».
 * Un zéro sans motif est un silence, et un silence est un mensonge par défaut.
 * Les codes reprennent EXACTEMENT le vocabulaire du registre : ceux du jour
 * (`movement_below_minimum`, `weekly_budget_reached`) et ceux de l'exclusion de
 * source (`review`, `manual`, `withdrawn`, `before_account_creation`,
 * `invalid_chronology`, `import_older_than_seven_days`). Deux codes s'y
 * ajoutent, qu'aucune des deux listes ne portait :
 *  · `day_already_credited` — la journée était déjà créditée par une autre
 *    sortie ; l'activité compte, la journée ne se dédouble pas ;
 *  · `not_recorded` — cette activité n'est dans aucune journée du registre.
 * `xpAwarded` est ce que porte CETTE sortie : le motif ne se déduit jamais du
 * seul état du jour, sinon un rejeu afficherait « déjà crédité » pour la sortie
 * qui a précisément crédité la journée.
 */
export type RunXpReason2026 = ProgressDay2026['reason'] | 'day_already_credited' | 'not_recorded' |
  'review' | 'manual' | 'withdrawn' | 'before_account_creation' | 'invalid_chronology' | 'import_older_than_seven_days';

export function runXpReason2026(
  ledger: Pick<ReturnType<typeof computeProgressLedger2026>, 'days' | 'ignored'>,
  activityId: string, xpAwarded: number,
): RunXpReason2026 {
  if (Number.isFinite(xpAwarded) && xpAwarded > 0) return 'credited';
  const ignored = ledger.ignored.find((entry) => entry.activityId === activityId);
  if (ignored) return ignored.reason as RunXpReason2026;
  const days = ledger.days.filter((day) => day.activityIds.includes(activityId));
  if (days.length === 0) return 'not_recorded';
  if (days.some((day) => day.xp > 0)) return 'day_already_credited';
  return days.some((day) => day.reason === 'weekly_budget_reached') ? 'weekly_budget_reached' : 'movement_below_minimum';
}

/** Durable stores record these changes, including revocations, in a transaction.
 * Existing activity rows survive a correction. A zero delta is an idempotent replay.
 */
export function diffProgressLedger2026(
  before: readonly ProgressDay2026[], after: readonly ProgressDay2026[],
) {
  const prior = new Map(before.map((day) => [day.id, day]));
  const next = new Map(after.map((day) => [day.id, day]));
  return [...new Set([...prior.keys(), ...next.keys()])].sort().flatMap((id) => {
    const a = prior.get(id);
    const b = next.get(id);
    if (JSON.stringify(a) === JSON.stringify(b)) return [];
    return [{ id, xpDelta: (b?.xp ?? 0) - (a?.xp ?? 0), before: a ?? null, after: b ?? null }];
  });
}
