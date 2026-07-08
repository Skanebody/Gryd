/**
 * GRYD — fetch hex_claims live (Phase 1). Fallback démo si pas de backend/session.
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

export interface LiveMapData {
  live: boolean;
  territoryGeo: ReadonlyMap<TerritoryState, GameCollection>;
  summary: BattleMapSummary;
}

export function useLiveMapData(cityId = 'paris'): LiveMapData | null {
  const { session } = useSession();
  const [claims, setClaims] = useState<HexClaimRow[] | null>(null);
  const [myCrewId, setMyCrewId] = useState<string | null>(null);
  const [gen, setGen] = useState(getMapDataGeneration);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || supabase === null || session === null) {
      setClaims(null);
      setMyCrewId(null);
      return;
    }
    const userId = session.user.id;
    const [crewMembership, claimsRes] = await Promise.all([
      fetchActiveCrew(userId),
      supabase.rpc('hex_claims_for_city', { p_city_id: cityId }),
    ]);
    setMyCrewId(crewMembership?.crewId ?? null);
    if (claimsRes.error || !Array.isArray(claimsRes.data) || claimsRes.data.length === 0) {
      setClaims(null);
      return;
    }
    setClaims(claimsRes.data as HexClaimRow[]);
  }, [cityId, session]);

  useEffect(() => {
    void load();
  }, [load, gen]);

  useEffect(() => subscribeMapDataChanged(() => setGen(getMapDataGeneration())), []);

  if (claims === null || session === null) return null;

  return {
    live: true,
    territoryGeo: claimsToTerritoryGeo(claims, session.user.id, myCrewId),
    summary: summaryFromClaims(claims, session.user.id, myCrewId),
  };
}
