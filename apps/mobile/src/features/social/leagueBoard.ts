/**
 * GRYD — classement Joueurs de la saison active (O1 Pass A « lecture », 11/07/2026).
 *
 * Lecture SEULE du board « Joueurs·Paris » réel depuis Supabase quand une session
 * existe, sinon fallback DÉMO (LEAGUE_BOARDS). Même pattern que features/social/
 * economy.ts (session → remote, sinon local ; démo affichée immédiatement, bascule
 * serveur quand la lecture résout, retour démo sur erreur).
 *
 * Source réelle = la VUE `public.player_leaderboard` (season_scores ⋈ seasons ⋈
 * users), explicitement `grant select to authenticated` (0003_rls.sql) — elle
 * contourne le RLS owner-only de `users` et porte déjà `pseudo`. On cible la
 * saison `status='active'` de la ville du joueur, triée par points desc. Le client
 * n'écrit jamais un score (season_scores = service_role via season_close/ingest).
 *
 * Périmètre : SEUL le board Joueurs·Paris devient réel. Joueurs·France / Crews /
 * Ville restent démo (aucune source serveur au MVP). Le rang est dérivé de l'ordre
 * (index+1) — robuste que `rank_cache` soit calculé ou non. Si le classement réel
 * est vide (aucun run encore), on garde la démo (source 'local') plutôt qu'un
 * podium vide.
 */
import { useEffect, useMemo, useState } from 'react';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';
import { LEAGUE_BOARDS, type LeagueBoard, type LeagueRow } from './league';

/** Nombre max de lignes lues (podium + liste + « Voir tout »). */
const LEADERBOARD_LIMIT = 50;

/** Board démo « Joueurs » — fallback + gabarit (id/label/kind/valueLabel réutilisés). */
const DEMO_JOUEURS_BOARD: LeagueBoard =
  LEAGUE_BOARDS.find((b) => b.id === 'joueurs') ?? LEAGUE_BOARDS[0]!;

export type LeagueSource = 'local' | 'server';

export interface SeasonLeaderboard {
  /** Board Joueurs·Paris : réel (saison active) si session, sinon démo. */
  joueursBoard: LeagueBoard;
  source: LeagueSource;
  loading: boolean;
}

function asInt(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
}

type ActiveSeasonRow = { id?: unknown; city_id?: unknown };
type BoardRow = { user_id?: unknown; pseudo?: unknown; points?: unknown };

/**
 * Lignes réelles du board Joueurs de la saison active du joueur, ou null (démo).
 * null = pas de session configurée, erreur, aucune saison active, ou classement
 * encore vide.
 */
async function fetchRemoteJoueurs(userId: string): Promise<LeagueRow[] | null> {
  if (!supabase) return null;

  const [seasonsResult, meResult] = await Promise.all([
    supabase.from('seasons').select('id, city_id').eq('status', 'active'),
    supabase.from('users').select('city_id').eq('id', userId).maybeSingle(),
  ]);
  if (seasonsResult.error) throw seasonsResult.error;
  if (meResult.error) throw meResult.error;

  const active = (seasonsResult.data ?? []) as ActiveSeasonRow[];
  if (active.length === 0) return null;

  const myCity = (meResult.data as { city_id?: unknown } | null)?.city_id ?? null;
  const chosen =
    active.find((s) => s.city_id != null && s.city_id === myCity) ?? active[0]!;
  const seasonId = chosen.id;
  if (typeof seasonId !== 'string') return null;

  const boardResult = await supabase
    .from('player_leaderboard')
    .select('user_id, pseudo, points')
    .eq('season_id', seasonId)
    .order('points', { ascending: false })
    .limit(LEADERBOARD_LIMIT);
  if (boardResult.error) throw boardResult.error;

  const rows = (boardResult.data ?? []) as BoardRow[];
  if (rows.length === 0) return null;

  return rows.map((r, i) => ({
    rank: i + 1,
    name: typeof r.pseudo === 'string' ? r.pseudo : '—',
    value: asInt(r.points),
    me: r.user_id === userId,
  }));
}

/**
 * Board Joueurs de la saison : réel (Supabase) si session configurée, sinon démo.
 * La ligne « TOI », l'écart et le rank-up sont dérivés du board par l'écran.
 */
export function useSeasonLeaderboard(): SeasonLeaderboard {
  const { session, configured, loading: sessionLoading } = useSession();
  const [remote, setRemote] = useState<LeagueRow[] | null>(null);
  const [remoteLoading, setRemoteLoading] = useState(false);

  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (!configured || !userId || !supabase) {
      setRemote(null);
      setRemoteLoading(false);
      return;
    }
    let alive = true;
    setRemoteLoading(true);
    void fetchRemoteJoueurs(userId)
      .then((rows) => {
        if (alive) setRemote(rows);
      })
      .catch(() => {
        if (alive) setRemote(null);
      })
      .finally(() => {
        if (alive) setRemoteLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [configured, userId]);

  return useMemo<SeasonLeaderboard>(() => {
    const loading = sessionLoading || remoteLoading;
    if (!remote) {
      return { joueursBoard: DEMO_JOUEURS_BOARD, source: 'local', loading };
    }
    return { joueursBoard: { ...DEMO_JOUEURS_BOARD, rows: remote }, source: 'server', loading };
  }, [remote, sessionLoading, remoteLoading]);
}
