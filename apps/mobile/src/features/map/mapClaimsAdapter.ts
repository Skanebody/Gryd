/**
 * GRYD — adapte hex_claims (Supabase) → GeoJSON carte + résumé HUD.
 * Couleurs par RÔLE (§C) : moi/crew = chartreuse, rival = orange, decay = danger.
 */
import { cellToBoundary } from 'h3-js';
import {
  POINTS_DEFENDED_HEX,
  POINTS_NEUTRAL_HEX,
  POINTS_STOLEN_HEX,
} from '@klaim/shared';
import type { BattleMapSummary } from './fakeHexes';
import type { TerritoryState } from './territory';
import type { RealMapGeoJSONLayer } from '../../ui/game';

export type GameCollection = RealMapGeoJSONLayer['data'];

export interface HexClaimRow {
  h3index: number | string;
  owner_user_id: string;
  claim_type: string;
  decay_at: string | null;
  shielded_until: string | null;
  owner_crew_id: string | null;
}

const EMPTY_COLLECTION: GameCollection = { type: 'FeatureCollection', features: [] };

function dbH3ToCell(h3index: number | string): string {
  return BigInt(h3index).toString(16);
}

function cellPolygon(h3Hex: string): number[][][] {
  const ring = cellToBoundary(h3Hex, true).map(([lat, lng]) => [lng, lat] as [number, number]);
  return [ring];
}

function resolveTerritoryState(
  row: HexClaimRow,
  myUserId: string,
  myCrewId: string | null,
  now: number,
): TerritoryState {
  const shielded = row.shielded_until !== null && new Date(row.shielded_until).getTime() > now;
  if (shielded && row.owner_user_id === myUserId) return 'protected';

  const decayAt = row.decay_at !== null ? new Date(row.decay_at).getTime() : null;
  if (decayAt !== null && row.owner_user_id === myUserId) {
    const daysLeft = (decayAt - now) / 86_400_000;
    if (daysLeft <= 3) return 'decayUrgent';
    if (daysLeft <= 14) return 'decay';
  }

  if (row.owner_user_id === myUserId) return 'crew';
  if (myCrewId !== null && row.owner_crew_id === myCrewId) return 'crew';
  if (row.claim_type === 'stolen') return 'contested';
  return 'rival';
}

export function claimsToTerritoryGeo(
  claims: readonly HexClaimRow[],
  myUserId: string,
  myCrewId: string | null = null,
): ReadonlyMap<TerritoryState, GameCollection> {
  const now = Date.now();
  const buckets = new Map<TerritoryState, GameCollection['features']>();

  const push = (state: TerritoryState, feature: GameCollection['features'][number]) => {
    const list = buckets.get(state) ?? [];
    list.push(feature);
    buckets.set(state, list);
  };

  for (const row of claims) {
    const h3 = dbH3ToCell(row.h3index);
    const state = resolveTerritoryState(row, myUserId, myCrewId, now);
    push(state, {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: cellPolygon(h3) },
      properties: { h3, state },
    });
  }

  const out = new Map<TerritoryState, GameCollection>();
  for (const [state, features] of buckets) {
    out.set(state, { type: 'FeatureCollection', features });
  }
  for (const s of ['crew', 'rival', 'contested', 'protected', 'decay', 'decayUrgent'] as const) {
    if (!out.has(s)) out.set(s, EMPTY_COLLECTION);
  }
  return out;
}

export function summaryFromClaims(
  claims: readonly HexClaimRow[],
  myUserId: string,
  myCrewId: string | null = null,
): BattleMapSummary {
  const now = Date.now();
  let held = 0;
  let decay = 0;
  let decayUrgent = 0;
  let contested = 0;

  for (const row of claims) {
    const state = resolveTerritoryState(row, myUserId, myCrewId, now);
    if (state === 'crew' || state === 'protected' || state === 'decay' || state === 'decayUrgent') {
      held += 1;
    }
    if (state === 'decay') decay += 1;
    if (state === 'decayUrgent') {
      decay += 1;
      decayUrgent += 1;
    }
    if (state === 'contested') contested += 1;
  }

  return {
    held,
    decay,
    decayUrgent,
    contested,
    objectiveHexes: 0,
    possiblePoints:
      decay * POINTS_DEFENDED_HEX + contested * POINTS_STOLEN_HEX + 0 * POINTS_NEUTRAL_HEX,
  };
}
