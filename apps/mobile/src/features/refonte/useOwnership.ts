import { useCallback, useEffect, useRef, useState } from 'react';
import type { Activity } from '@klaim/shared';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';

export type { OwnedFeature } from './territoryModel2026';
import { parseOwnership2026, type OwnedFeature, type OwnershipSnapshot2026 } from './territoryModel2026';
export type MapExtent = { west: number; south: number; east: number; north: number };

/** Read the sole September ownership authority. Never fall back to legacy cells. */
export function useOwnership(activity: Activity, extent: MapExtent) {
  const { session, loading: authLoading } = useSession();
  const [value, setValue] = useState<{ ownerId: string | null; activity: Activity; features: OwnedFeature[]; crew: OwnershipSnapshot2026['crew']; failed: boolean; loading: boolean }>({ ownerId: null, activity, features: [], crew: null, failed: false, loading: true });
  const [revision, setRevision] = useState(0);
  const generation = useRef(0);
  const reload = useCallback(() => setRevision(n => n + 1), []);
  useEffect(() => {
    const ticket = ++generation.current;
    if (authLoading) return;
    if (!supabase || !session) {
      setValue({ ownerId: null, activity, features: [], crew: null, failed: false, loading: false });
      return;
    }
    // ─── LE TERRITOIRE NE CLIGNOTE PLUS (10/09/2026) ────────────────────────
    // Cet effet posait `features: []` AVANT son débounce de 180 ms : à chaque
    // pan, à chaque pincement, la carte se vidait puis se repeuplait. Le
    // territoire — la seule chose que le joueur vient voir — clignotait sur
    // toute manipulation. On garde donc l'ancien rendu tant que le nouveau
    // n'est pas là : c'est un fait daté qui reste vrai une seconde de plus,
    // pas une invention.
    //
    // SAUF si la LENTILLE change (discipline ou compte) : les terrains de
    // l'autre sport n'ont rien à faire à l'écran, même une seconde
    // (§9.3, « Course → Vélo : sans afficher transitoirement celles de
    // l'autre sport »).
    setValue(previous => {
      const sameLens = previous.activity === activity && previous.ownerId === session.user.id;
      const keepFeatures = sameLens ? previous.features : [];
      return { ownerId: sameLens ? session.user.id : null, activity, features: keepFeatures, crew: sameLens ? previous.crew : null, failed: false, loading: true };
    });
    const timer = setTimeout(() => {
      void Promise.resolve(supabase!.rpc('get_ownership_2026', { p_activity: activity, p_west: extent.west, p_south: extent.south, p_east: extent.east, p_north: extent.north }))
        .then(({ data, error }) => {
          if (generation.current !== ticket) return;
          const parsed = !error ? parseOwnership2026(data, activity, session.user.id) : null;
          setValue({ ownerId: session.user.id, activity, features: parsed?.features ?? [], crew: parsed?.crew ?? null, failed: parsed === null, loading: false });
        }).catch(() => {
          if (generation.current === ticket) setValue({ ownerId: session.user.id, activity, features: [], crew: null, failed: true, loading: false });
        });
    }, 180);
    return () => { clearTimeout(timer); generation.current++; };
  }, [activity, extent.west, extent.south, extent.east, extent.north, session?.user.id, authLoading, revision]);
  const current = !authLoading && value.ownerId === (session?.user.id ?? null) && value.activity === activity;
  return { ...value, features: current ? value.features : [], crew: current ? value.crew : null, failed: current && value.failed, loading: !current || value.loading, signedOut: !authLoading && !session, reload };
}
