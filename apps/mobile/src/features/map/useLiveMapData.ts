/**
 * GRYD — fetch hex_claims live (Phase 1).
 * - offline : null → fallback démo carte
 * - empty   : connecté mais aucune zone → carte honnête vide
 * - live    : données réelles
 */
import { useCallback, useEffect, useState } from 'react';
import { fetchActiveCrew } from '../crew/crewApi';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import { getMapDataGeneration, subscribeMapDataChanged } from '../../lib/mapRefresh';
import { useSession } from '../../lib/session';
import {
  claimsToTerritoryGeo,
  summaryFromClaims,
  type HexClaimRow,
} from './mapClaimsAdapter';
import type { BattleMapSummary } from './fakeHexes';
import type { TerritoryState } from './territory';
import type { RealMapGeoJSONLayer } from '../../ui/game';

export type GameCollection = RealMapGeoJSONLayer['data'];

export type LiveMapData =
  | { kind: 'empty'; summary: BattleMapSummary; territoryGeo: ReadonlyMap<TerritoryState, GameCollection> }
  | {
      kind: 'live';
      summary: BattleMapSummary;
      territoryGeo: ReadonlyMap<TerritoryState, GameCollection>;
    };

const EMPTY_SUMMARY: BattleMapSummary = {
  held: 0,
  decay: 0,
  decayUrgent: 0,
  contested: 0,
  objectiveHexes: 0,
  possiblePoints: 0,
};

export function useLiveMapData(cityId = 'paris'): LiveMapData | null {
  const { session } = useSession();
  const [data, setData] = useState<LiveMapData | null>(null);
  const [gen, setGen] = useState(getMapDataGeneration);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || supabase === null || session === null) {
      setData(null);
      return;
    }
    const userId = session.user.id;
    const [crewMembership, claimsRes] = await Promise.all([
      fetchActiveCrew(userId),
      supabase.rpc('hex_claims_for_city', { p_city_id: cityId }),
    ]);
    const myCrewId = crewMembership?.crewId ?? null;
    const claims = Array.isArray(claimsRes.data) ? (claimsRes.data as HexClaimRow[]) : [];

    if (claimsRes.error) {
      setData(null);
      return;
    }

    if (claims.length === 0) {
      setData({
        kind: 'empty',
        territoryGeo: claimsToTerritoryGeo([], userId, myCrewId),
        summary: EMPTY_SUMMARY,
      });
      return;
    }

    setData({
      kind: 'live',
      territoryGeo: claimsToTerritoryGeo(claims, userId, myCrewId),
      summary: summaryFromClaims(claims, userId, myCrewId),
    });
  }, [cityId, session]);

  useEffect(() => {
    void load();
  }, [load, gen]);

  useEffect(() => subscribeMapDataChanged(() => setGen(getMapDataGeneration())), []);

  return data;
}
