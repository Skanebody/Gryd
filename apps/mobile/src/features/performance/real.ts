/**
 * GRYD — Performance RÉELLE : câblage React de `derive.ts` sur Supabase.
 *
 * Même patron que `social/streak.ts`, `social/economy.ts` et `map/hexClaims.ts` :
 * ce fichier ne porte QUE l'accès réseau et l'état React ; toute la logique vit
 * dans le module pur `derive.ts`.
 *
 * LES TROIS ÉTATS, JAMAIS CONFONDUS (c'est tout l'objet du hook) :
 *  · `status: 'signed-out'` — pas de compte (ou pas de backend configuré) :
 *    aucune course ne peut être la sienne. L'écran invite à se connecter.
 *  · `status: 'ready'` avec `data.countedRuns === 0` — compte relié, zéro course
 *    ingérée. C'est un ÉTAT RÉEL VALIDE, pas un trou : l'écran invite à courir.
 *  · `status: 'failed'` — la lecture a échoué. Ses courses existent, on ne sait
 *    pas les lire. Afficher « 0 km » ici lui dirait qu'il n'a rien couru : on
 *    avoue la panne et on propose de réessayer.
 * (+ `loading`, borné : la lecture aboutit ou lève `failed` — jamais de spinner
 * infini.)
 *
 * Aucun repli sur la démo, nulle part : `demo.ts` n'est plus rendu par aucun
 * écran depuis la fin du mode vitrine (21/07/2026) — /performance n'en importe
 * plus qu'un TYPE (`PerfRecord`, la forme d'un record, pas ses valeurs).
 */
import { useCallback, useEffect, useState } from 'react';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';
import { derivePerformance, type RealPerformance, type RunRow } from './derive';

/**
 * Historique lu. Large volontairement : les records sont « de tous les temps »,
 * une troncature les ferait mentir par le bas (un record plus ancien serait
 * simplement invisible). 500 couvre plusieurs années de course quotidienne ;
 * au-delà, l'agrégation devra passer serveur — pas une rustine ici.
 */
const RUN_HISTORY_LIMIT = 500;

export type PerformanceStatus = 'signed-out' | 'loading' | 'failed' | 'ready';

export interface MyPerformance {
  status: PerformanceStatus;
  /** Rempli uniquement quand `status === 'ready'`. */
  data: RealPerformance | null;
  reload: () => void;
}

export function useMyPerformance(): MyPerformance {
  const { session, configured, loading: sessionLoading } = useSession();
  const userId = session?.user?.id ?? null;
  const [data, setData] = useState<RealPerformance | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    if (!configured || !supabase || !userId) {
      setData(null);
      setFailed(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setFailed(false);

    void (async () => {
      // Tous les statuts sont lus : GRYD Verify a besoin du dénominateur
      // complet (une course écartée reste une course ingérée). Le filtrage
      // 'valid'/'partial' est fait par le moteur pur.
      const { data: rows, error } = await supabase!
        .from('runs')
        .select(
          'started_at, distance_m, duration_s, avg_pace_s_km, status, gps_trust, motion_trust, step_count',
        )
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .limit(RUN_HISTORY_LIMIT);
      if (cancelled) return;
      setLoading(false);
      if (error || !rows) {
        setData(null);
        setFailed(true);
        return;
      }
      setData(derivePerformance(rows as RunRow[], new Date()));
    })().catch(() => {
      if (cancelled) return;
      setLoading(false);
      setData(null);
      setFailed(true);
    });

    return () => {
      cancelled = true;
    };
  }, [configured, userId, tick]);

  let status: PerformanceStatus = 'signed-out';
  if (configured && userId) {
    if (failed) status = 'failed';
    else if (data) status = 'ready';
    else status = 'loading';
  } else if (sessionLoading) {
    // La session n'a pas fini de s'hydrater : ne pas annoncer « connecte-toi »
    // à quelqu'un qui EST connecté (le message clignoterait au démarrage).
    status = 'loading';
  }

  return { status, data: status === 'ready' ? data : null, reload };
}
