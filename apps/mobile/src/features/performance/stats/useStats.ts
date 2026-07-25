/**
 * GRYD — E18 « Statistiques & data » : câblage React du moteur `stats/derive`.
 *
 * Même patron que `performance/real.ts`, `history/real.ts` et `map/hexClaims.ts` :
 * ce fichier ne porte QUE l'accès réseau et l'état React. UNE seule lecture de
 * `runs` par montage — le commutateur de période ne relance AUCUNE requête,
 * c'est l'écran qui re-dérive à partir des mêmes lignes.
 *
 * DIFFÉRENCE AVEC `performance/real.ts` (et pourquoi on ne l'a pas étendu) : la
 * planche a besoin de `runs.celebration`, que l'autre lecture ne sélectionne
 * pas, et de lignes BRUTES (le jour de la semaine d'une course, sa capture)
 * quand l'autre n'expose que des agrégats hebdomadaires. Étendre `real.ts`
 * aurait été plus propre — il est hors périmètre de ce chantier. Dette assumée
 * et signalée : une seule lecture de `runs` devra survivre à la fusion.
 *
 * LES QUATRE ÉTATS, JAMAIS CONFONDUS :
 *  · 'signed-out' — pas de compte (ou pas de backend) : aucune course ne peut
 *    être la sienne.
 *  · 'loading'    — session en cours d'hydratation OU lecture en vol. On
 *    n'affirme RIEN sur le joueur tant qu'on ne sait pas. État BORNÉ.
 *  · 'failed'     — la lecture a échoué. Ses courses existent, on ne sait pas
 *    les lire : afficher « 0 km » lui dirait qu'il n'a rien couru.
 *  · 'ready'      — lu. `rows` peut être vide : c'est un fait, pas un trou.
 */
import { useCallback, useEffect, useState } from 'react';
import { useSession } from '../../../lib/session';
import { supabase } from '../../../lib/supabase';
import type { StatsRunRow } from './derive';

/**
 * Fenêtre de lecture. L'horizon hebdomadaire couvre 12 semaines et la période
 * « Saison » peut remonter plusieurs mois : 500 lignes couvrent largement, et
 * une troncature silencieuse ferait mentir les moyennes par le bas. Au-delà,
 * l'agrégation devra passer serveur — pas une rustine ici.
 */
const RUN_HISTORY_LIMIT = 500;

export type StatsStatus = 'signed-out' | 'loading' | 'failed' | 'ready';

export interface UseStatsResult {
  status: StatsStatus;
  /** Rempli UNIQUEMENT quand `status === 'ready'` (tableau vide = compte neuf). */
  rows: readonly StatsRunRow[] | null;
  reload: () => void;
}

export function useStats(): UseStatsResult {
  const { session, configured, loading: sessionLoading } = useSession();
  const userId = session?.user?.id ?? null;
  const [rows, setRows] = useState<StatsRunRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    if (!configured || !supabase || !userId) {
      setRows(null);
      setFailed(false);
      return;
    }
    const client = supabase;
    let cancelled = false;
    setFailed(false);

    void (async () => {
      // `celebration` EST la source de l'impact territorial (payload serveur figé
      // à l'ingestion). On ne compte pas les lignes de `hex_claims` par `run_id` :
      // ce compte rétrécit quand un rival reprend un hex — la course d'il y a un
      // mois afficherait « +3 zones » là où elle en avait pris 18.
      const { data, error } = await client
        .from('runs')
        .select('started_at, distance_m, status, celebration')
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .limit(RUN_HISTORY_LIMIT);
      if (cancelled) return;
      if (error || !data) {
        setRows(null);
        setFailed(true);
        return;
      }
      setRows(data as StatsRunRow[]);
    })().catch(() => {
      // Sans ce catch, un throw synchrone du client laisserait le hook à jamais
      // sur 'loading' : un écran muet, ni « échec » ni « vide » — le cul-de-sac
      // que la doctrine interdit.
      if (cancelled) return;
      setRows(null);
      setFailed(true);
    });

    return () => {
      cancelled = true;
    };
  }, [configured, userId, tick]);

  let status: StatsStatus = 'signed-out';
  if (configured && userId) {
    if (failed) status = 'failed';
    else if (rows) status = 'ready';
    else status = 'loading';
  } else if (sessionLoading) {
    // La session n'a pas fini de s'hydrater : ne pas annoncer « connecte-toi » à
    // quelqu'un qui EST connecté (le message clignoterait au démarrage à froid).
    status = 'loading';
  }

  return { status, rows: status === 'ready' ? rows : null, reload };
}
