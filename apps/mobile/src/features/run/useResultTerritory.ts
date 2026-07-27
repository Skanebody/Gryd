/**
 * GRYD — LA LECTURE qui donne sa surface RÉELLE à l'écran de résultat.
 *
 * Deux `select`, aucune écriture, aucune décision : tout le discernement
 * (quelle ligne, est-elle à moi, est-elle de cette sortie) vit dans
 * `resultTerritory.ts`, PUR et testé. Ce fichier ne fait que l'alimenter — il
 * est séparé pour cette raison exacte : un module qui importe React et Supabase
 * n'est pas testable en Deno, et c'est la DÉCISION qu'il faut pouvoir tester.
 *
 * Les 4 états sont DISTINCTS et ne se confondent jamais : rien à lire ('idle'),
 * lecture EN COURS ('loading'), échec de lecture ('failed'), lu ('ready', où
 * `own`/`defended` à `null` veut dire « il n'y a réellement rien »).
 */
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';
import {
  RESULT_CONTEST_COLUMNS,
  RESULT_TERRITORY_COLUMNS,
  pickDefendedContest,
  pickRunTerritory,
  type DefendedContestFacts,
  type ResultContestRow,
  type ResultTerritoryFacts,
  type ResultTerritoryRow,
} from './resultTerritory';

/**
 * Combien de temps en arrière on accepte de reconnaître une défense comme
 * « celle de cette sortie ». L'écran de résultat s'ouvre dans la foulée de la
 * course ; au-delà, la ligne appartient à une autre histoire. Généreux exprès
 * (une synchro hors-ligne peut arriver plus tard), mais borné.
 */
export const DEFENSE_WINDOW_MS = 6 * 60 * 60 * 1000;

/** Les 4 états DISTINCTS de la lecture — un chargement n'affirme rien. */
export type ResultTerritoryPhase = 'idle' | 'loading' | 'failed' | 'ready';

export interface UseResultTerritory {
  readonly phase: ResultTerritoryPhase;
  /** Territoire créé par cette sortie (E29/E30) — `null` s'il n'y en a pas. */
  readonly own: ResultTerritoryFacts | null;
  /** Contestation refermée par cette défense (E31) — `null` s'il n'y en a pas. */
  readonly defended: DefendedContestFacts | null;
  /**
   * Une revue anti-triche EXISTE pour cette course : `/appel` a de quoi
   * répondre. C'est la SEULE condition dans laquelle E34 peint son lien
   * d'appel — sinon le lien mènerait à un écran qui répond « aucune
   * vérification », c'est-à-dire un bouton mort (§A).
   */
  readonly appealOpen: boolean;
  /**
   * Mon identifiant, quand la session est ouverte. Sert à retrouver MA part
   * dans les contributions d'une frontière crew (E33) sans que l'écran ait à
   * ouvrir une seconde fois la session.
   */
  readonly meId: string | null;
}

const IDLE: UseResultTerritory = {
  phase: 'idle',
  own: null,
  defended: null,
  appealOpen: false,
  meId: null,
};

/**
 * Va chercher la surface RÉELLE du résultat.
 *
 * Ne lit RIEN quand il n'y a rien à lire : sans backend configuré, sans session,
 * sans `runId`, ou quand le verdict ne parle ni de capture ni de défense. C'est
 * une lecture d'affichage : elle ne conditionne aucun crédit, et son échec ne
 * dégrade que la richesse de l'écran — jamais sa véracité.
 */
export function useResultTerritory(input: {
  readonly runId: string | null;
  /** Cette sortie a-t-elle CAPTURÉ (pris ou repris) ? Sinon, aucun territoire écrit. */
  readonly captured: boolean;
  /** Cette sortie a-t-elle DÉFENDU ? Sinon, aucune contestation à refermer. */
  readonly defended: boolean;
  /** Cette sortie a-t-elle une portion EXCLUE (`status: 'partial'`) ? */
  readonly partial: boolean;
  /** Crew RÉEL du joueur (`null` = sans crew, ou roster non chargé). */
  readonly myCrewId: string | null;
}): UseResultTerritory {
  const { session, loading: sessionLoading } = useSession();
  const userId = session?.user?.id ?? null;
  const [state, setState] = useState<UseResultTerritory>(IDLE);
  const { runId, captured, defended, partial, myCrewId } = input;

  useEffect(() => {
    if (sessionLoading) return;
    const client = supabase;
    if (!client || !userId || !runId || (!captured && !defended && !partial)) {
      setState({ ...IDLE, meId: userId });
      return;
    }
    let alive = true;
    setState({ phase: 'loading', own: null, defended: null, appealOpen: false, meId: userId });
    void (async () => {
      const nowMs = Date.now();
      let own: ResultTerritoryFacts | null = null;
      let contest: DefendedContestFacts | null = null;
      let appealOpen = false;
      let failed = false;

      if (captured) {
        const res = await client
          .from('territories')
          .select(RESULT_TERRITORY_COLUMNS)
          .eq('source_run_id', runId)
          .limit(4);
        if (res.error) failed = true;
        else own = pickRunTerritory(res.data as unknown as ResultTerritoryRow[], runId);
      }

      if (defended) {
        const since = new Date(nowMs - DEFENSE_WINDOW_MS).toISOString();
        const res = await client
          .from('territory_contests')
          .select(RESULT_CONTEST_COLUMNS)
          .eq('status', 'defended')
          .gte('resolved_at', since)
          .order('resolved_at', { ascending: false })
          .limit(8);
        if (res.error) failed = true;
        else {
          contest = pickDefendedContest(res.data as unknown as ResultContestRow[], {
            meId: userId,
            myCrewId,
            windowStartMs: nowMs - DEFENSE_WINDOW_MS,
            nowMs,
          });
        }
      }

      // E34 — le lien d'appel n'existe que si une revue existe. `run_id` ET
      // `user_id` : la RLS de 0081 borne déjà, ce filtre rend la requête lisible
      // et la garde bornée si la policy bougeait un jour.
      if (partial) {
        const res = await client
          .from('anticheat_reviews')
          .select('id')
          .eq('run_id', runId)
          .eq('user_id', userId)
          .limit(1);
        // Un échec de CETTE lecture ne dégrade rien d'autre : il laisse
        // simplement le lien absent (une absence n'est pas un mensonge).
        if (!res.error) appealOpen = (res.data?.length ?? 0) > 0;
      }

      if (!alive) return;
      // Un échec ne se déguise PAS en « rien à afficher » : la phase le dit, et
      // les blocs restent absents dans les deux cas — mais l'app, elle, sait.
      setState(
        failed
          ? { phase: 'failed', own: null, defended: null, appealOpen, meId: userId }
          : { phase: 'ready', own, defended: contest, appealOpen, meId: userId },
      );
    })();
    return () => {
      alive = false;
    };
  }, [sessionLoading, userId, runId, captured, defended, partial, myCrewId]);

  return state;
}
