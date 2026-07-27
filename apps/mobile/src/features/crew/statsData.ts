/**
 * GRYD — E50/E54 · le CÂBLAGE React des RPC de 0086 (`crew_stats`, `crew_board`).
 *
 * Séparé de `stats.ts` VOLONTAIREMENT, comme `discoveryData.ts` l'est de
 * `discovery.ts` : la décision est pure et testée en Deno, ce fichier-ci ne fait
 * que lire. Il n'a AUCUNE règle de jeu à trancher — s'il en avait une, elle
 * serait intestable, parce qu'elle vivrait derrière un hook React.
 *
 * Les deux lectures passent par des RPC SECURITY DEFINER : aucune requête de
 * table directe. `crew_leaderboard` n'est d'ailleurs plus lisible par les
 * clients depuis 0086 — la seule porte est `crew_board()`, précisément parce
 * qu'elle sait REFUSER une vue jamais rafraîchie (`never_refreshed`) au lieu
 * d'en servir le vide.
 *
 * PAS DE BACKEND CONFIGURÉ = 'unavailable', jamais 'empty'. Sur un poste sans
 * `.env`, prétendre « aucun crew ne tient de terrain » serait un mensonge sur le
 * monde produit par une absence de configuration.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  CREW_STATS_TREND_WEEKS,
  LEADERBOARD_ROWS_LIMIT,
  type Activity,
} from '@klaim/shared';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';
import {
  emptyCrewBoard,
  parseCrewBoard,
  parseCrewStats,
  type CrewBoard,
  type CrewStatsState,
} from './stats';

// ─── E54 · le classement des crews ───────────────────────────────────────────

export interface UseCrewBoardResult extends CrewBoard {
  reload: () => void;
}

export function useCrewBoard(activity: Activity): UseCrewBoardResult {
  const { session } = useSession();
  const [board, setBoard] = useState<CrewBoard>(() => emptyCrewBoard(activity, 'loading'));
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    // Pas de session : l'état est un FAIT, pas un échec — et il a sa propre
    // phrase à l'écran (se connecter), différente d'un vide et d'une panne.
    if (!session) {
      setBoard(emptyCrewBoard(activity, 'signed_out'));
      return;
    }
    if (!supabase) {
      setBoard(emptyCrewBoard(activity, 'unavailable'));
      return;
    }
    const client = supabase;
    let cancelled = false;
    setBoard(emptyCrewBoard(activity, 'loading'));
    void (async () => {
      try {
        const res = await client.rpc('crew_board', {
          p_activity: activity,
          // La borne vient de game-rules — jamais un 50 écrit ici.
          p_limit: LEADERBOARD_ROWS_LIMIT,
        });
        if (cancelled) return;
        // Une erreur de transport n'est PAS une réponse : elle ne devient jamais
        // « aucun crew ». `parseCrewBoard(null)` rend 'unavailable'.
        setBoard(parseCrewBoard(res.error ? null : res.data, activity));
      } catch {
        if (!cancelled) setBoard(emptyCrewBoard(activity, 'unavailable'));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, activity, tick]);

  return { ...board, reload };
}

// ─── E50 · les trois mesures manquantes ──────────────────────────────────────

export interface UseCrewStatsResult extends CrewStatsState {
  reload: () => void;
}

export function useCrewStats(activity: Activity): UseCrewStatsResult {
  const { session } = useSession();
  const [state, setState] = useState<CrewStatsState>({ status: 'loading', stats: null });
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!session) {
      setState({ status: 'signed_out', stats: null });
      return;
    }
    if (!supabase) {
      setState({ status: 'unavailable', stats: null });
      return;
    }
    const client = supabase;
    let cancelled = false;
    setState({ status: 'loading', stats: null });
    void (async () => {
      try {
        const res = await client.rpc('crew_stats', {
          p_activity: activity,
          // Profondeur d'affichage décidée par game-rules (spec E50 :
          // « courbe quatre semaines »), jamais par le SQL ni par cet appel.
          p_weeks: CREW_STATS_TREND_WEEKS,
        });
        if (cancelled) return;
        setState(parseCrewStats(res.error ? null : res.data, activity));
      } catch {
        if (!cancelled) setState({ status: 'unavailable', stats: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, activity, tick]);

  return { ...state, reload };
}
