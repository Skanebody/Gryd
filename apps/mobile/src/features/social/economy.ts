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
 *
 * ─── « TES POINTS DE SAISON » : DE QUEL MONDE ? (E14, 25/07/2026) ────────────
 * `season_scores` a pour clé (season_id, user_id, ACTIVITY) depuis la migration
 * 0070 : un athlète hybride a DEUX lignes sur la même saison. La lecture
 * `order('points', desc).limit(1)` en rendait donc UNE — la plus flatteuse —
 * sans jamais dire laquelle. Le joueur lisait « mes points de saison » alors
 * qu'il lisait « mon meilleur des deux mondes » : E14 interdit de sommer les
 * disciplines, mais afficher l'une pour l'autre est la même faute, en plus
 * discret. Ce n'est même pas stable — une bonne sortie vélo faisait basculer le
 * chiffre affiché sans qu'aucun écran ne bouge.
 *
 * La lecture est donc BORNÉE à une discipline, et `seasonActivity` la remonte
 * pour que l'écran la nomme. Défaut `run` (seule discipline chronométrée à ce
 * jour). XP, foulées, éclats et série restent MONO-POT, assumé et documenté par
 * la migration 0070 (« ce qui reste en suspens », §3) : ce sont des
 * progressions personnelles, pas des rangs comparatifs.
 *
 * DÉPENDANCE DE DÉPLOIEMENT, dite plutôt que promise : le filtre suppose la
 * colonne `activity` (migration 0070). Tant qu'elle n'est pas appliquée, la
 * lecture ÉCHOUE → `failed: true`, et l'écran DIT la panne au lieu d'afficher
 * un 0 qui se lirait « tu n'as rien fait ». Client et schéma se déploient
 * ensemble.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { type Activity, DEFAULT_ACTIVITY } from '@klaim/shared';
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
  /** Points de la saison active (season_scores.points) DANS `seasonActivity`, 0 si aucune sortie. */
  seasonPoints: number;
  /** Rang saison (season_scores.rank_cache) DANS `seasonActivity`, null si non classé. */
  seasonRank: number | null;
  /**
   * DISCIPLINE à laquelle `seasonPoints`/`seasonRank` se rapportent (E14) —
   * jamais un mélange, jamais « le meilleur des deux ». L'écran doit la nommer.
   */
  seasonActivity: Activity;
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

async function fetchRemoteEconomy(userId: string, activity: Activity): Promise<RemoteEconomy | null> {
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
      // E14 : UNE discipline. Sans ce filtre, `limit(1)` sur un tri par points
      // rendait le MEILLEUR des deux mondes, sans jamais dire lequel.
      .eq('activity', activity)
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
export function useMyEconomy(activity: Activity = DEFAULT_ACTIVITY): MyEconomy {
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
    void fetchRemoteEconomy(userId, activity)
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
  }, [configured, userId, tick, activity]);

  return useMemo<MyEconomy>(() => {
    const loading = sessionLoading || remoteLoading;
    if (remote) {
      return { ...remote, seasonActivity: activity, source: 'server', loading, failed: false, reload };
    }
    // Rien de connu : les zéros ne prétendent RIEN, mais la discipline demandée
    // reste dite — sinon l'écran ne saurait pas de quel monde il parle.
    return { ...UNKNOWN_ECONOMY, seasonActivity: activity, source: 'none', loading, failed, reload };
  }, [remote, sessionLoading, remoteLoading, failed, reload, activity]);
}
