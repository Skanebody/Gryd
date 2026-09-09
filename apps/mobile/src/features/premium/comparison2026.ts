export interface ComparisonActivity2026 { id: string; startedAtMs: number; km: number; durationS: number; pending?: boolean }
export interface ComparisonSummary2026 { km: number; durationS: number; count: number; paceSPerKm: number | null; speedKmh: number | null; pending: boolean }
/** Same units on both sides; zero-distance activities never produce an infinite pace. */
export function summarizeComparison2026(activities: readonly ComparisonActivity2026[]): ComparisonSummary2026 {
  const valid = activities.filter(run => Number.isFinite(run.km) && run.km >= 0 && Number.isFinite(run.durationS) && run.durationS >= 0);
  const km = valid.reduce((sum, run) => sum + run.km, 0);
  const durationS = valid.reduce((sum, run) => sum + run.durationS, 0);
  return { km, durationS, count: valid.length, paceSPerKm: km > 0 && durationS > 0 ? durationS / km : null, speedKmh: durationS > 0 && km > 0 ? km * 3600 / durationS : null, pending: valid.some(run => run.pending) };
}
/** Local calendar windows handle daylight-saving boundaries without multiplying days by 24h. */
export function comparisonPeriods2026(now: Date, days: 7 | 28) {
  const end = new Date(now); end.setHours(0, 0, 0, 0); end.setDate(end.getDate() + 1);
  const start = new Date(end); start.setDate(start.getDate() - days);
  const previousStart = new Date(start); previousStart.setDate(previousStart.getDate() - days);
  return { current: { start: start.getTime(), end: end.getTime() }, previous: { start: previousStart.getTime(), end: start.getTime() } };
}
export function activitiesInPeriod2026(activities: readonly ComparisonActivity2026[], period: { start: number; end: number }) {
  return activities.filter(run => run.startedAtMs >= period.start && run.startedAtMs < period.end);
}
