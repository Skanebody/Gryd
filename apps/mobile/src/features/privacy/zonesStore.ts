/**
 * GRYD — LECTURE RÉELLE des zones floutées du joueur (§12.1).
 *
 * La FORME, le DÉCODAGE et le VERDICT vivent dans `./zones.ts` — module pur,
 * testé sous Deno. Ici : uniquement la requête et les quatre états.
 *
 * AUCUN REPLI INVENTÉ. Pas de session, pas de backend → `no-account` (il
 * n'existe alors aucune zone à honorer, ce n'est pas de l'ignorance). Lecture en
 * cours → `loading`. Erreur PostgREST/réseau → `error` : on ne retombe PAS sur
 * « zéro zone », parce que « je n'ai pas pu lire » et « il n'y en a pas » sont
 * deux phrases différentes et qu'une seule des deux autorise à publier une
 * trace (cf. `zonesForPublication`).
 *
 * RLS : la policy `privacy_zones_select_own` (0003_rls.sql:150) restreint déjà
 * la lecture au propriétaire. Le `.eq('user_id', …)` ci-dessous est donc une
 * ceinture, pas la bretelle — il rend la requête explicite et permet au test de
 * vérifier qu'aucune version ne lit les zones d'autrui.
 */
import { useEffect, useState } from 'react';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';
import {
  PRIVACY_ZONE_COLUMNS,
  rowsToPrivacyZones,
  type PrivacyZoneRow,
  type PrivacyZonesRead,
} from './zones';

/**
 * Zones floutées du joueur connecté. Ne rend JAMAIS de zone fabriquée : tant
 * qu'aucun écran ne permet d'en déclarer une, cette lecture rend `ready` avec
 * une liste vide — ce qui est la vérité, et pas la même chose qu'une erreur.
 */
export function usePrivacyZones(): PrivacyZonesRead {
  const { session, loading: sessionLoading, configured } = useSession();
  const userId = session?.user?.id ?? null;
  const [read, setRead] = useState<PrivacyZonesRead>({ status: 'loading' });

  useEffect(() => {
    // La session se restaure : on ne sait pas encore QUI est là, donc on ne sait
    // pas quelles zones s'appliquent. « En cours », pas « aucune ».
    if (sessionLoading) {
      setRead({ status: 'loading' });
      return;
    }
    if (!configured || !supabase || !userId) {
      setRead({ status: 'no-account' });
      return;
    }

    let cancelled = false;
    setRead({ status: 'loading' });

    supabase
      .from('privacy_zones')
      .select(PRIVACY_ZONE_COLUMNS)
      .eq('user_id', userId)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setRead({ status: 'error' });
          return;
        }
        setRead({
          status: 'ready',
          zones: rowsToPrivacyZones(data as unknown as PrivacyZoneRow[]),
        });
      })
      .then(undefined, () => {
        if (!cancelled) setRead({ status: 'error' });
      });

    return () => {
      cancelled = true;
    };
  }, [configured, sessionLoading, userId]);

  return read;
}
