/**
 * GRYD — économie du joueur (O1 Pass 2, 11/07/2026).
 *
 * Lecture SEULE des chiffres réels du joueur (XP, foulées, éclats, niveau, série,
 * points/rang de la saison active) depuis Supabase quand une session existe ;
 * fallback DÉMO (MY_SOCIAL_PROFILE + DEMO_WALLET) sinon. Le serveur reste seul
 * décideur : le client n'écrit jamais l'XP/les points (claim_hexes = service_role).
 * Même pattern que features/arsenal/signals.ts (session → remote, sinon local).
 *
 * `users.xp` est déjà l'XP permanent (D18, sans streak/perf) : on l'utilise tel
 * quel, sans le multiplier (contrairement au fallback démo qui dérive l'XP des
 * « points » de MY_SOCIAL_PROFILE). Le niveau/tier restent DÉRIVÉS de l'XP via la
 * courbe partagée côté écran — jamais un nombre magique ici.
 */
import { useEffect, useMemo, useState } from 'react';
import { XP_RATE_OF_POINTS } from '@klaim/shared';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';
import { DEMO_WALLET } from '../arsenal/inventory';
import { MY_SOCIAL_PROFILE } from './demo';

export type EconomySource = 'local' | 'server';

export interface MyEconomy {
  /** XP permanent (users.xp réel, ou dérivé de la démo). */
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

/** Fallback démo (jamais de réseau) — cohérent avec MY_SOCIAL_PROFILE + Arsenal. */
const DEMO_ECONOMY: MyEconomy = {
  xp: MY_SOCIAL_PROFILE.xp * XP_RATE_OF_POINTS,
  foulees: DEMO_WALLET.foulees,
  eclats: DEMO_WALLET.eclats,
  streakWeeks: 3, // STREAK_WEEKS démo (cohérent avec profil.tsx)
  isClub: DEMO_WALLET.isClub,
  seasonPoints: MY_SOCIAL_PROFILE.xp,
  seasonRank: MY_SOCIAL_PROFILE.seasonRank,
  source: 'local',
  loading: false,
};

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
 * Chiffres du joueur : réels (Supabase) si session configurée, sinon démo. Charge
 * en asynchrone (démo affichée immédiatement → jamais de flash), bascule sur le
 * serveur quand la lecture résout. En cas d'erreur réseau : reste sur la démo.
 */
export function useMyEconomy(): MyEconomy {
  const { session, configured, loading: sessionLoading } = useSession();
  const [remote, setRemote] = useState<RemoteEconomy | null>(null);
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
    void fetchRemoteEconomy(userId)
      .then((eco) => {
        if (alive) setRemote(eco);
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

  return useMemo<MyEconomy>(() => {
    if (!remote) {
      return { ...DEMO_ECONOMY, loading: sessionLoading || remoteLoading };
    }
    return { ...remote, source: 'server', loading: sessionLoading || remoteLoading };
  }, [remote, sessionLoading, remoteLoading]);
}
