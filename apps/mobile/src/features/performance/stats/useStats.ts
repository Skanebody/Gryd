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
 * MISE À JOUR 25/07/2026 (retour des RECORDS PERSONNELS) — c'est désormais la
 * SEULE lecture de `runs` de /performance : le palmarès se dérive de CES lignes
 * (`records.ts`), il ne rouvre pas `useMyPerformance`. Deux lectures du même
 * joueur aboutissent à deux instants différents : le jour où elles se
 * désynchronisent, l'écran se contredit lui-même. `performance/real.ts` et
 * `performance/derive.ts` n'ont plus aucun appelant — leur retrait est un
 * nettoyage à part (hors périmètre de ce chantier).
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
import { DEFAULT_ACTIVITY, type Activity } from '@klaim/shared';
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

/**
 * `activity` — LA LENTILLE (E14, 26/07/2026). `runs.activity` existe depuis la
 * migration 0070 (appliquée le 25/07) et `ACTIVITY_SCOPE` (game-rules) classe
 * `runs` et `history` comme `per_activity` : une sortie appartient à UNE
 * discipline, et deux mondes ne se somment jamais.
 *
 * SANS CE FILTRE, la page de statistiques d'un joueur hybride mélangeait ses
 * kilomètres à pied et à vélo dans le MÊME « 24,6 km cette semaine », et son
 * allure moyenne devenait un chiffre qui ne décrit aucun effort réel. Ce n'est
 * pas une approximation : c'est un nombre faux affiché comme une mesure.
 *
 * DÉFAUT = `DEFAULT_ACTIVITY` : un appelant sans commutateur obtient exactement
 * ce qu'il affichait avant le vélo.
 */
export function useStats(activity: Activity = DEFAULT_ACTIVITY): UseStatsResult {
  const { session, configured, loading: sessionLoading } = useSession();
  const userId = session?.user?.id ?? null;
  /**
   * Les lignes portent LA DISCIPLINE dans laquelle elles ont été lues : sans ce
   * couplage, la bascule de lentille afficherait une fraction de seconde les
   * courses à pied sous l'étiquette vélo (l'effet ne repart qu'après la
   * peinture). L'écran repasse en `loading` pendant la bascule — il ne sait
   * effectivement pas encore.
   */
  const [read, setRead] = useState<{ activity: Activity; rows: StatsRunRow[] } | null>(null);
  const rows = read !== null && read.activity === activity ? read.rows : null;
  const [failed, setFailed] = useState(false);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    if (!configured || !supabase || !userId) {
      setRead(null);
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
      // `duration_s` et `avg_pace_s_km` servent au PALMARÈS (`records.ts`), pas
      // aux trois blocs : deux colonnes de plus sur la MÊME requête plutôt
      // qu'une seconde lecture de `runs`. Deux lectures du même joueur peuvent
      // aboutir à deux instants différents et se contredire à l'écran.
      const { data, error } = await client
        .from('runs')
        .select('started_at, distance_m, duration_s, avg_pace_s_km, status, celebration')
        .eq('user_id', userId)
        // E14 — UNE discipline. Voir la doc du paramètre : sans ce filtre les
        // kilomètres à pied et à vélo tombent dans le même total.
        .eq('activity', activity)
        .order('started_at', { ascending: false })
        .limit(RUN_HISTORY_LIMIT);
      if (cancelled) return;
      if (error || !data) {
        setRead(null);
        setFailed(true);
        return;
      }
      setRead({ activity, rows: data as StatsRunRow[] });
    })().catch(() => {
      // Sans ce catch, un throw synchrone du client laisserait le hook à jamais
      // sur 'loading' : un écran muet, ni « échec » ni « vide » — le cul-de-sac
      // que la doctrine interdit.
      if (cancelled) return;
      setRead(null);
      setFailed(true);
    });

    return () => {
      cancelled = true;
    };
  }, [configured, userId, tick, activity]);

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
