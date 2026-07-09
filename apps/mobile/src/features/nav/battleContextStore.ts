/**
 * GRYD — contexte de bataille live (sync depuis Map + War Room).
 * Alimente runContext / contextualAction sans données démo.
 */
import type { BattleMapSummary } from '../map/fakeHexes';
import type { DefenseMissionDemo, OpenBoundaryDemo } from '../warroom/demo';

const EMPTY_SUMMARY: BattleMapSummary = {
  held: 0,
  decay: 0,
  decayUrgent: 0,
  contested: 0,
  objectiveHexes: 0,
  possiblePoints: 0,
};

let liveSummary: BattleMapSummary = EMPTY_SUMMARY;
let liveDefense: DefenseMissionDemo | null = null;
let liveBoundaries: readonly OpenBoundaryDemo[] = [];
let revision = 0;

export function getBattleContextRevision(): number {
  return revision;
}

export function getLiveBattleSummary(): BattleMapSummary {
  return liveSummary;
}

export function getLiveDefenseMission(): DefenseMissionDemo | null {
  return liveDefense;
}

export function getLiveOpenBoundaries(): readonly OpenBoundaryDemo[] {
  return liveBoundaries;
}

export function setLiveMapSummary(summary: BattleMapSummary | null): void {
  liveSummary = summary ?? EMPTY_SUMMARY;
  revision += 1;
}

export function setLiveWarRoomContext(patch: {
  defenseMission: DefenseMissionDemo | null;
  openBoundaries: readonly OpenBoundaryDemo[];
}): void {
  liveDefense = patch.defenseMission;
  liveBoundaries = patch.openBoundaries;
  revision += 1;
}

export function resetLiveBattleContext(): void {
  liveSummary = EMPTY_SUMMARY;
  liveDefense = null;
  liveBoundaries = [];
  revision += 1;
}
