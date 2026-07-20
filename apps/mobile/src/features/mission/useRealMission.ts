/**
 * GRYD — MISSION-FIRST, câblage React de la mission RÉELLE (variante NATIVE).
 *
 * « À chaque ouverture, GRYD répond : où dois-je courir maintenant ? » — mais
 * JAMAIS en inventant. Ce hook ne consomme que du réel : MES `hex_claims` +
 * ma position GPS ponctuelle. La décision vit dans `deriveRealMission`
 * (pure, testée Deno) ; ici, uniquement l'accès réseau, le GPS et l'état React
 * (même patron que hexClaims.ts / useRealTerritories).
 *
 * Règle zéro-crash (« jamais un crash pour une mission ») : tout échec — pas de
 * session, showcase, lecture ratée, GPS absent, rejet réseau — retombe
 * SILENCIEUSEMENT sur `mission: null`. La carte porte déjà la vérité de l'état
 * des données (hexClaims → dataNote) ; la mission, elle, se contente de
 * disparaître quand elle n'a rien d'honnête à proposer.
 *
 * ⚠️ Variante WEB : `useRealMission.web.ts` renvoie l'état vide sans jamais
 * importer `provider.ts` (expo-location / expo-task-manager) — même raison que
 * `useRealRun.web.ts` / `registerBackgroundTask.web.ts` : garder ces modules
 * natifs HORS du bundle de la vitrine web. La garde `isShowcasePlatform`
 * ci-dessous est la ceinture-bretelles côté natif (toujours false sur device).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { cellArea } from 'h3-js';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';
import { isShowcasePlatform } from '../../lib/flags';
import { getCurrentPositionOnce } from '../run/gps/provider';
import { dbToH3 } from '../map/territoryBuild';
import {
  deriveRealMission,
  type MissionPoint,
  type MissionTerritoryInput,
  type RealMission,
} from './deriveMission';

/** Ce que la ligne mission de la Carte lit (le kind `first_capture` est rendu
 *  « rien » par l'appelant : le widget « Prends ta première zone » le porte déjà). */
export interface UseRealMissionResult {
  /**
   * null = rien à proposer (pas de session, showcase, chargement, ou échec
   * silencieux). Sinon LA mission (une seule — §A « 1 écran = 1 décision »).
   */
  mission: RealMission | null;
  /** true tant que la 1re résolution réelle n'a pas abouti (rien à afficher). */
  loading: boolean;
}

/** Les seules colonnes lues : la cellule (BIGINT) + son échéance de decay. */
interface MineClaimRow {
  h3index: string | number;
  decay_at: string | null;
}

export function useRealMission(): UseRealMissionResult {
  const { session } = useSession();
  const [mission, setMission] = useState<RealMission | null>(null);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    // Showcase (vitrine web) OU pas de session/backend → aucune mission réelle.
    // La démo de mission vit ailleurs (index.tsx, branche showcase, intacte).
    if (isShowcasePlatform || !supabase || !session) {
      setMission(null);
      setLoading(false);
      return;
    }
    const client = supabase;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        // MES captures + ma position, en parallèle. Le fix GPS est OPTIONNEL
        // (null accepté → mission sans distance) : jamais bloquant, jamais un throw.
        const [claims, fix] = await Promise.all([
          client
            .from('hex_claims')
            .select('h3index, decay_at')
            .eq('owner_user_id', session.user.id),
          getCurrentPositionOnce(),
        ]);
        if (cancelled) return;
        if (claims.error) {
          // Échec de lecture : on n'affiche PAS une mission fausse et on ne
          // prétend rien — la mission disparaît, la carte dit déjà la vérité.
          setMission(null);
          setLoading(false);
          return;
        }
        const rows = (claims.data ?? []) as MineClaimRow[];
        // UNE entrée PAR CELLULE : deriveRealMission fusionne/priorise lui-même
        // (le centroïde, l'urgence et la proximité sont sa responsabilité pure).
        const mine: MissionTerritoryInput[] = rows.map((row) => {
          const h3 = dbToH3(row.h3index);
          return {
            cells: [h3],
            decayAt: row.decay_at ? new Date(row.decay_at) : null,
            areaM2: cellArea(h3, 'm2'),
          };
        });
        const ego: MissionPoint | null = fix ? { lat: fix.lat, lng: fix.lng } : null;
        setMission(deriveRealMission({ now: new Date(), ego, mine }));
        setLoading(false);
      } catch {
        // Rejet réseau / natif inattendu : même filet silencieux.
        if (cancelled) return;
        setMission(null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, tick]);

  // Refetch au retour sur l'onglet Carte (patron MapScreen) : on saute le 1er
  // focus (le fetch au montage suffit) ; les suivants rafraîchissent la mission
  // après une course qui capture / laisse expirer une zone.
  const firstFocusRef = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocusRef.current) {
        firstFocusRef.current = false;
        return;
      }
      reload();
    }, [reload]),
  );

  return { mission, loading };
}
