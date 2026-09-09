/** Calendar arithmetic for server-validated timestamps; never uses device time. */
export type RulesInstant2026 = string | number;
const DAY_MS = 86_400_000;

export function instantMs2026(value: RulesInstant2026): number {
  const ms = typeof value === 'number' ? value : Date.parse(value);
  if (!Number.isFinite(ms)) throw new RangeError('Invalid timestamp');
  return ms;
}

const formatters = new Map<string, Intl.DateTimeFormat>();
const midnightCache = new Map<string, number>();
function formatter(timeZone: string): Intl.DateTimeFormat {
  let value = formatters.get(timeZone);
  if (!value) {
    value = new Intl.DateTimeFormat('en-CA', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    });
    formatters.set(timeZone, value);
  }
  return value;
}

export function localDay2026(instant: RulesInstant2026, timeZone: string): string {
  const parts = formatter(timeZone).formatToParts(instantMs2026(instant));
  const part = (kind: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === kind)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function addCalendarDays2026(day: string, offset: number): string {
  const ms = Date.parse(`${day}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(ms)) {
    throw new RangeError('Invalid calendar day');
  }
  return new Date(ms + offset * DAY_MS).toISOString().slice(0, 10);
}

export function localWeek2026(day: string): string {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
  return addCalendarDays2026(day, -((weekday + 6) % 7));
}

/** First actual instant belonging to a civil day, including 23/25-hour days.
 * Binary search also handles jurisdictions whose offset changes at midnight.
 * A skipped civil day maps to the next existing day rather than invented time.
 */
export function startOfLocalDay2026(day: string, timeZone: string): number {
  const key = `${timeZone}:${day}`;
  const cached = midnightCache.get(key);
  if (cached !== undefined) return cached;
  const nominal = Date.parse(`${day}T00:00:00Z`);
  if (!Number.isFinite(nominal)) throw new RangeError('Invalid calendar day');
  let low = nominal - 2 * DAY_MS;
  let high = nominal + 2 * DAY_MS;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (localDay2026(middle, timeZone) < day) low = middle + 1;
    else high = middle;
  }
  // Bound memory independently of how many account histories a worker handles.
  if (midnightCache.size >= 1_024) midnightCache.delete(midnightCache.keys().next().value!);
  midnightCache.set(key, low);
  return low;
}

export interface ProgressTimezoneChange2026 {
  timeZone: string;
  requestedAt: RulesInstant2026;
  effectiveAt: RulesInstant2026;
}

/** A timezone request cannot reclassify a day already in the current week. */
export function scheduleProgressTimezoneChange2026(
  currentTimeZone: string,
  nextTimeZone: string,
  requestedAt: RulesInstant2026,
): ProgressTimezoneChange2026 {
  const requestedMs = instantMs2026(requestedAt);
  localDay2026(requestedMs, nextTimeZone); // Validate the IANA timezone.
  const week = localWeek2026(localDay2026(requestedMs, currentTimeZone));
  return {
    timeZone: nextTimeZone,
    requestedAt,
    effectiveAt: startOfLocalDay2026(addCalendarDays2026(week, 7), currentTimeZone),
  };
}
