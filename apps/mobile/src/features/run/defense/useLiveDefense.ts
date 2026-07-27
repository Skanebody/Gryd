/**
 * GRYD — E22 : LA LECTURE qui décide si l'activité en cours est une DÉFENSE.
 *
 * Deux `select`, aucune écriture, AUCUNE décision : tout le discernement vit
 * dans `liveDefense.ts`, pur et testé. Ce fichier est séparé pour cette raison
 * exacte — un module qui importe React et Supabase n'est pas testable en Deno,
 * et c'est la DÉCISION qu'il faut pouvoir tester.
 *
 * ─── LES QUATRE ÉTATS, JAMAIS CONFONDUS ─────────────────────────────────────
 *  · 'idle'    — rien à lire (pas de backend, pas de session, pas encore de
 *                position). Ce n'est PAS « aucune contestation » ;
 *  · 'loading' — lecture EN VOL : la variante ne s'affiche pas encore, et
 *                surtout on n'affirme pas qu'il n'y a rien à défendre ;
 *  · 'failed'  — la lecture a échoué. La sortie CONTINUE d'être enregistrée
 *                normalement (c'est le seul point qui compte) et l'écran le
 *                dit — `zoneUnavailable` — au lieu d'afficher une jauge figée ;
 *  · 'ready'   — lu. `target === null` est un fait : rien ne me vise à portée.
 *
 * ─── UNE SEULE LECTURE PAR SORTIE, ET C'EST VOULU ───────────────────────────
 * Les contestations qui me visent sont ouvertes par `ingest_run` à la FIN d'une
 * course rivale : elles n'apparaissent pas en plein milieu de la mienne, ou
 * alors si rarement que sonder le réseau toutes les N secondes coûterait de la
 * batterie et des données pour rien — pendant une course, exactement ce qu'il
 * ne faut pas dépenser. On lit UNE fois, dès qu'une position réelle existe, et
 * l'écran vit ensuite sur cette lecture. Ce qui bouge pendant la sortie (la
 * couverture, l'échéance) se recalcule LOCALEMENT, sans réseau.
 */
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useSession } from '../../../lib/session';
import type { CoveragePoint } from './coverage';
import {
  LIVE_DEFENSE_CONTEST_COLUMNS,
  LIVE_DEFENSE_TERRITORY_COLUMNS,
  pickLiveDefenseTarget,
  type LiveContestRow,
  type LiveDefenseTarget,
  type LiveTerritoryRow,
} from './liveDefense';

export type LiveDefensePhase = 'idle' | 'loading' | 'failed' | 'ready';

export interface UseLiveDefense {
  readonly phase: LiveDefensePhase;
  /** La zone défendue par CETTE sortie — `null` quand il n'y en a réellement aucune. */
  readonly target: LiveDefenseTarget | null;
}

const IDLE: UseLiveDefense = { phase: 'idle', target: null };

/**
 * @param here     position mesurée au moment de la lecture (`null` = pas encore
 *                 de fix : on ne lit rien, on n'affirme rien).
 * @param myCrewId crew RÉEL du joueur, ou `null`.
 * @param enabled  `false` coupe la lecture net (sortie terminée, mode où la
 *                 défense n'a pas de sens). Un `false` ne se lit pas « aucune
 *                 contestation » : il retombe sur 'idle'.
 */
export function useLiveDefense(input: {
  readonly here: CoveragePoint | null;
  readonly myCrewId: string | null;
  readonly enabled: boolean;
}): UseLiveDefense {
  const { session, configured, loading: sessionLoading } = useSession();
  const userId = session?.user?.id ?? null;
  const [state, setState] = useState<UseLiveDefense>(IDLE);
  const { here, myCrewId, enabled } = input;
  // La lecture ne se relance PAS à chaque fix (sinon une requête par seconde) :
  // elle se déclenche à l'ARRIVÉE de la première position, et c'est tout.
  const hasFix = here !== null;

  useEffect(() => {
    if (!enabled || sessionLoading || !configured || !supabase || !userId || here === null) {
      setState(IDLE);
      return;
    }
    const client = supabase;
    let alive = true;
    setState({ phase: 'loading', target: null });
    void (async () => {
      // 1. Les contestations OUVERTES que la policy 0078 m'ouvre (les deux
      //    camps — le tri « suis-je celui qui défend ? » se fait en pur).
      //    AUCUN `.limit()` : tronquer ferait rater la zone la plus proche.
      const contests = await client
        .from('territory_contests')
        .select(LIVE_DEFENSE_CONTEST_COLUMNS)
        .eq('status', 'active');
      if (!alive) return;
      if (contests.error || !contests.data) {
        setState({ phase: 'failed', target: null });
        return;
      }
      const contestRows = contests.data as unknown as LiveContestRow[];
      if (contestRows.length === 0) {
        setState({ phase: 'ready', target: null });
        return;
      }

      // 2. LES TERRITOIRES VISÉS, et eux seuls. On ne lit pas tout mon
      //    patrimoine : la requête reste bornée par le nombre de contestations
      //    en cours (petit), jamais par le nombre de zones que je possède.
      const targetIds = [...new Set(contestRows.map((r) => r.territory_id))];
      const territories = await client
        .from('territories')
        .select(LIVE_DEFENSE_TERRITORY_COLUMNS)
        .in('id', targetIds);
      if (!alive) return;
      if (territories.error || !territories.data) {
        setState({ phase: 'failed', target: null });
        return;
      }

      setState({
        phase: 'ready',
        target: pickLiveDefenseTarget({
          contests: contestRows,
          territories: territories.data as unknown as LiveTerritoryRow[],
          meId: userId,
          myCrewId,
          here,
          nowMs: Date.now(),
        }),
      });
    })();
    return () => {
      alive = false;
    };
    // `here` est volontairement HORS des dépendances (cf. `hasFix` ci-dessus) :
    // la position bouge à chaque seconde de course, la lecture non.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, sessionLoading, configured, userId, myCrewId, hasFix]);

  return state;
}
