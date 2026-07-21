/**
 * GRYD — économie du joueur (O1 Pass 2, 11/07/2026).
 *
 * Lecture SEULE des chiffres réels du joueur (XP, foulées, éclats, niveau, série,
 * points/rang de la saison active) depuis Supabase quand une session existe. Le
 * serveur reste seul décideur : le client n'écrit jamais l'XP/les points
 * (claim_hexes = service_role).
 *
 * `users.xp` est déjà l'XP permanent (D18, sans streak/perf) : on l'utilise tel
 * quel, sans le multiplier. Le niveau/tier restent DÉRIVÉS de l'XP via la courbe
 * partagée côté écran — jamais un nombre magique ici.
 *
 * ─── LA FUITE COLMATÉE (21/07/2026) ──────────────────────────────────────────
 * AVANT : `if (!remote) return DEMO_ECONOMY`. Trois chemins menaient donc à des
 * chiffres INVENTÉS sur l'app installée :
 *   1. pas de session (ou Supabase non configuré dans le build),
 *   2. la ligne `users` n'existe pas encore pour ce compte,
 *   3. la lecture réseau ÉCHOUE (avion, serveur down, RLS).
 * Dans les trois cas le joueur lisait « 4 210 XP · niveau ~14 · #8 de saison ·
 * série ×1,15 » — l'effort d'un persona de démonstration présenté comme le sien.
 * Le cas 3 est le pire : un joueur RÉEL, hors réseau, voyait sa progression
 * remplacée par celle de quelqu'un d'autre, sans le moindre signal.
 *
 * MAINTENANT (mode vitrine ABANDONNÉ, décision fondateur 21/07/2026) : il n'existe
 * plus AUCUN repli fabriqué, sur aucune plateforme. Trois cas, trois vérités :
 *   · pas de session          → `source: 'none'`, tout à zéro (l'écran invite à se connecter) ;
 *   · session + lecture vide  → `source: 'server'`, zéros RÉELS (un compte neuf a 0 XP : c'est vrai) ;
 *   · session + échec réseau  → `source: 'none'` + `failed: true` (l'écran DIT l'échec et propose de réessayer).
 * Zéro n'est pas un mensonge ; 4 210 en est un.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';

/**
 * D'où viennent les chiffres affichés :
 *  · `server` — lus sur Supabase pour CE compte (y compris « tout à zéro »).
 *  · `none`   — on ne sait rien : pas de session, ou lecture impossible.
 */
export type EconomySource = 'server' | 'none';

export interface MyEconomy {
  /** XP permanent (users.xp réel). */
  xp: number;
  foulees: number;
  eclats: number;
  streakWeeks: number;
  isClub: boolean;
  /** Points de la saison active (season_scores.points), 0 si aucun run. */
  seasonPoints: number;
  /** Rang saison (season_scores.rank_cache), null si non classé / pas de run. */
  seasonRank: number | null;
  source: EconomySource;
  loading: boolean;
  /**
   * true = on a une session mais la LECTURE A ÉCHOUÉ. À distinguer absolument de
   * « pas encore de données » : l'écran doit dire « on n'a pas pu charger » et
   * proposer de réessayer, jamais afficher un 0 qui se lirait « tu n'as rien fait ».
   */
  failed: boolean;
  /** Relance la lecture serveur (bouton « Réessayer » d'un état d'erreur). */
  reload: () => void;
}

type RemoteUserRow = {
  xp?: unknown;
  foulees?: unknown;
  eclats?: unknown;
  streak_weeks?: unknown;
  is_club?: unknown;
};

type RemoteSeasonScoreRow = {
  points?: unknown;
  rank_cache?: unknown;
};

interface RemoteEconomy {
  xp: number;
  foulees: number;
  eclats: number;
  streakWeeks: number;
  isClub: boolean;
  seasonPoints: number;
  seasonRank: number | null;
}

function asInt(value: unknown): number | undefined {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : undefined;
}

/** Rien de connu : que des zéros. Aucun rang inventé (`seasonRank: null`). */
const UNKNOWN_ECONOMY = {
  xp: 0,
  foulees: 0,
  eclats: 0,
  streakWeeks: 0,
  isClub: false,
  seasonPoints: 0,
  seasonRank: null,
} as const;

async function fetchRemoteEconomy(userId: string): Promise<RemoteEconomy | null> {
  if (!supabase) return null;

  const [userResult, scoreResult] = await Promise.all([
    supabase
      .from('users')
      .select('xp, foulees, eclats, streak_weeks, is_club')
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('season_scores')
      .select('points, rank_cache, seasons!inner(status)')
      .eq('user_id', userId)
      .eq('seasons.status', 'active')
      .order('points', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (userResult.error) throw userResult.error;
  if (scoreResult.error) throw scoreResult.error;
  if (!userResult.data) return null;

  const u = userResult.data as RemoteUserRow;
  const s = (scoreResult.data ?? null) as RemoteSeasonScoreRow | null;
  return {
    xp: asInt(u.xp) ?? 0,
    foulees: asInt(u.foulees) ?? 0,
    eclats: asInt(u.eclats) ?? 0,
    streakWeeks: asInt(u.streak_weeks) ?? 0,
    isClub: u.is_club === true,
    seasonPoints: asInt(s?.points) ?? 0,
    seasonRank: s ? (asInt(s.rank_cache) ?? null) : null,
  };
}

/**
 * Chiffres du joueur : RÉELS (Supabase) dès qu'une session existe, zéros honnêtes
 * sinon. Une lecture qui échoue lève `failed` — l'appelant dit la panne, il
 * n'invente pas la progression du joueur à la place.
 *
 * Un compte neuf dont la ligne `users` n'existe pas encore compte comme une
 * lecture RÉUSSIE et VIDE (`source: 'server'`, tout à zéro) : c'est exactement son
 * état de jeu, ce n'est pas une panne.
 */
export function useMyEconomy(): MyEconomy {
  const { session, configured, loading: sessionLoading } = useSession();
  const [remote, setRemote] = useState<RemoteEconomy | null>(null);
  const [failed, setFailed] = useState(false);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((n) => n + 1), []);
  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (!configured || !userId || !supabase) {
      setRemote(null);
      setFailed(false);
      setRemoteLoading(false);
      return;
    }
    let alive = true;
    setRemoteLoading(true);
    setFailed(false);
    void fetchRemoteEconomy(userId)
      .then((eco) => {
        // `null` = aucune ligne users : compte neuf, donc zéros RÉELS (pas une panne).
        if (alive) setRemote(eco ?? { ...UNKNOWN_ECONOMY });
      })
      .catch(() => {
        if (!alive) return;
        setRemote(null);
        setFailed(true);
      })
      .finally(() => {
        if (alive) setRemoteLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [configured, userId, tick]);

  return useMemo<MyEconomy>(() => {
    const loading = sessionLoading || remoteLoading;
    if (remote) {
      return { ...remote, source: 'server', loading, failed: false, reload };
    }
    return { ...UNKNOWN_ECONOMY, source: 'none', loading, failed, reload };
  }, [remote, sessionLoading, remoteLoading, failed, reload]);
}
