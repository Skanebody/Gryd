/**
 * GRYD — E59 « historique saison précédente » : le REGISTRE des saisons de MA
 * ville, lu en base. Câblage React du moteur pur `seasonLedger.ts`.
 *
 * ─── POURQUOI PAS `season_current` ───────────────────────────────────────────
 * La RPC 0060 ne rend que la saison ACTIVE — par construction (« ou AUCUNE
 * ligne »). E59 a besoin des saisons TERMINÉES, E61 de la SUIVANTE. Ces lignes
 * existent déjà dans `seasons` et sont lisibles par tout compte connecté
 * (0003 : `seasons_select_all`, `using (true)`) : aucune migration n'est requise,
 * seulement une lecture bornée à MA ville.
 *
 * ─── LA VILLE EST UN FILTRE, PAS UNE HYPOTHÈSE ───────────────────────────────
 * La policy autorisant la lecture de TOUTES les villes, une requête non filtrée
 * afficherait la saison d'une autre ville comme la mienne. On lit donc
 * `users.city_id` (même chemin que `leagueBoard.ts`) et on filtre dessus. Le
 * moteur re-vérifie ensuite (`assertSingleCity`) : si deux villes se glissaient
 * dans le lot, on passe en 'failed' plutôt que d'afficher un souvenir qui n'est
 * pas le sien.
 *
 * ─── LES QUATRE ÉTATS, JAMAIS CONFONDUS (constitution) ───────────────────────
 *  · 'signed-out'  — pas de compte / pas de backend : il n'y a pas de « ma ville » ;
 *  · 'loading'     — lecture en vol (ou session en hydratation) : on n'affirme rien ;
 *  · 'failed'      — la lecture a échoué : on le DIT, on ne dit surtout pas
 *                    « aucune saison terminée » ;
 *  · 'ready'       — lu. Le registre PEUT être vide : c'est l'état NORMAL
 *                    aujourd'hui (aucune saison n'a jamais été close), et il est
 *                    de première classe.
 *
 * Une ville non rattachée (`users.city_id` null) rend 'ready' avec un registre
 * VIDE : c'est un fait lu, pas une panne — le joueur n'a simplement pas encore
 * de ville, et l'écran l'invite à courir plutôt que d'afficher un échec.
 */
import { useCallback, useEffect, useState } from 'react';
import { type Activity, DEFAULT_ACTIVITY } from '@klaim/shared';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';
import {
  assertSingleCity,
  lastClosedSeason,
  nextSeasonAfter,
  seasonLedger,
  type SeasonLedgerRow,
} from './seasonLedger';

export type CitySeasonsStatus = 'signed-out' | 'loading' | 'failed' | 'ready';

export interface UseCitySeasonsResult {
  status: CitySeasonsStatus;
  /** Ville rattachée au compte, ou `null` si aucune (fait lu, pas une panne). */
  cityId: string | null;
  /** Toutes les saisons de MA ville, triées et numérotées. Vide = vide RÉEL. */
  ledger: readonly SeasonLedgerRow[];
  /** La dernière saison TERMINÉE, ou `null` — l'état dominant aujourd'hui. */
  previous: SeasonLedgerRow | null;
  /**
   * MON rang final sur cette saison précédente, GELÉ par `season_close` dans
   * `season_scores.rank_cache` (jamais recalculé côté client). `null` = je n'y
   * étais pas classé, ou la clôture n'a pas encore gelé les rangs — deux
   * absences que l'écran dit sans inventer de place.
   */
  previousRank: number | null;
  reload: () => void;
}

/** Plafond de lecture : une ville n'a que quelques saisons, jamais des milliers. */
const SEASON_READ_LIMIT = 50;

/**
 * @param activity discipline dont on lit le rang final de la saison précédente
 *                 (E59 : « rangs Run et Bike séparés » — jamais un rang de
 *                 course affiché sous une lentille vélo).
 */
export function useCitySeasons(activity: Activity = DEFAULT_ACTIVITY): UseCitySeasonsResult {
  const { session, configured, loading: sessionLoading } = useSession();
  const userId = session?.user?.id ?? null;
  const [status, setStatus] = useState<CitySeasonsStatus>('loading');
  const [cityId, setCityId] = useState<string | null>(null);
  const [ledger, setLedger] = useState<readonly SeasonLedgerRow[]>([]);
  const [previousRank, setPreviousRank] = useState<number | null>(null);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    // Session en cours d'hydratation : un CHARGEMENT n'est pas un « pas de compte ».
    if (configured && sessionLoading && !userId) {
      setStatus('loading');
      return;
    }
    if (!configured || !supabase || !userId) {
      setCityId(null);
      setLedger([]);
      setStatus('signed-out');
      return;
    }
    const client = supabase;
    let cancelled = false;
    setStatus('loading');

    void (async () => {
      try {
        const me = await client.from('users').select('city_id').eq('id', userId).maybeSingle();
        if (cancelled) return;
        if (me.error) {
          setStatus('failed');
          return;
        }
        const city = typeof me.data?.city_id === 'string' ? me.data.city_id : null;
        setCityId(city);
        if (city === null) {
          // Lu, et ce compte n'a pas encore de ville : registre vide RÉEL.
          setLedger([]);
          setStatus('ready');
          return;
        }

        const rows = await client
          .from('seasons')
          .select('id, city_id, starts_at, ends_at, status')
          .eq('city_id', city)
          .order('starts_at', { ascending: true })
          .limit(SEASON_READ_LIMIT);
        if (cancelled) return;
        if (rows.error) {
          setStatus('failed');
          return;
        }
        const derived = seasonLedger(rows.data ?? []);
        // Garde-fou : un lot multi-villes n'est PAS affichable comme le mien.
        if (!assertSingleCity(derived)) {
          setLedger([]);
          setPreviousRank(null);
          setStatus('failed');
          return;
        }

        // Mon rang final sur la dernière saison terminée. Une seule lecture de
        // plus, et seulement s'il y a une saison terminée — donc AUCUNE
        // aujourd'hui (la base est vide). Le rang est LU (`rank_cache`, gelé par
        // season_close), jamais dérivé d'un classement courant.
        const closed = lastClosedSeason(derived);
        let rank: number | null = null;
        if (closed !== null) {
          const mine = await client
            .from('season_scores')
            .select('rank_cache')
            .eq('season_id', closed.seasonId)
            .eq('user_id', userId)
            .eq('activity', activity)
            .maybeSingle();
          if (cancelled) return;
          if (mine.error) {
            // Même verdict pour tout : pas d'historique à moitié vrai.
            setLedger([]);
            setPreviousRank(null);
            setStatus('failed');
            return;
          }
          const cached = mine.data?.rank_cache;
          rank = typeof cached === 'number' && Number.isFinite(cached) && cached >= 1
            ? Math.trunc(cached)
            : null;
        }

        setLedger(derived);
        setPreviousRank(rank);
        setStatus('ready');
      } catch {
        if (cancelled) return;
        setStatus('failed');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [configured, sessionLoading, userId, activity, tick]);

  return {
    status,
    cityId,
    ledger,
    previous: status === 'ready' ? lastClosedSeason(ledger) : null,
    previousRank: status === 'ready' ? previousRank : null,
    reload,
  };
}

/** Ré-export de commodité : E61 a besoin de la saison qui suit celle qu'il clôt. */
export { nextSeasonAfter };
