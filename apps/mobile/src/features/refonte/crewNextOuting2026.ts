import type { CrewOuting2026 } from './crewOutingsModel2026.ts';
/** The nearest confirmed, upcoming meetup is the first community action. */
export function nextCrewOuting2026<T extends CrewOuting2026>(items: readonly T[], nowMs: number): T | null {
  return [...items].filter(item => !item.cancelled && Date.parse(item.startsAt) > nowMs).sort((a,b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))[0] ?? null;
}
