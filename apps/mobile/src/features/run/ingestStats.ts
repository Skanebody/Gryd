/**
 * GRYD — mappe IngestRunResponse (seul juge serveur) vers RunResultStats
 * pour course-result. Les champs démo-only (zoneName, crew rank) gardent
 * des fallbacks neutres tant que le secteur live n'est pas branché (P1).
 */
import type { IngestRunResponse } from '@klaim/shared';
import { VERIFIED_MIN_TRUST } from '@klaim/shared';
import type { LiveRunMode, RunResultStats } from './simulation';

const DEFAULT_ZONE = 'Ta zone';
const DEFAULT_CREW = 'Ton crew';
const DEFAULT_PLAYER = 'Toi';

export function statsFromIngest(
  response: IngestRunResponse,
  mode: LiveRunMode,
): RunResultStats {
  const hexes =
    response.hexes.claimed + response.hexes.stolen + response.hexes.defended;
  const loopClosed = mode === 'conquete' && response.loopClosed === true;
  const enclosedZones = loopClosed ? Math.max(0, response.enclosedZones ?? 0) : 0;

  return {
    mode,
    distanceM: response.distanceM,
    durationS: response.durationS,
    paceSPerKm: response.avgPaceSKm,
    hexes,
    loopClosed,
    enclosedZones,
    basePoints: response.pointsAwarded,
    bonusPct: 0,
    totalPoints: response.pointsAwarded,
    verified: response.status === 'valid' || response.status === 'partial',
    gpsTrust: VERIFIED_MIN_TRUST,
    motionTrust: VERIFIED_MIN_TRUST,
    zoneName: DEFAULT_ZONE,
    zonePctBefore: 0,
    zonePctAfter: Math.min(99, hexes > 0 ? 5 : 0),
    crewRankBefore: 0,
    crewRankAfter: 0,
    rankGained: false,
    crewName: DEFAULT_CREW,
    playerName: DEFAULT_PLAYER,
  };
}

/** Badges débloqués par le serveur pour cette course. */
export function badgesFromIngest(response: IngestRunResponse): string[] {
  return response.newBadges ?? [];
}
