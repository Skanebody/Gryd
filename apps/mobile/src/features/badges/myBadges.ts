/**
 * GRYD — état RÉEL de la collection de badges (O1 lecture Pass B, 11/07/2026).
 *
 * Lecture SEULE : débloqués (`user_badges`) + progression (`user_stats`) depuis
 * Supabase quand une session existe.
 *
 * Un état réel VIDE (joueur sans badge / sans user_stats) est VALIDE et s'affiche
 * (collection tout verrouillé, jauges à 0) — c'est l'état exact d'un compte neuf.
 *
 * Source de vérité des débloqués = `user_badges` (décernés par le serveur via
 * ingest_run/season_close, service_role), JAMAIS re-dérivés des seuils côté
 * client. `user_stats` (colonnes snake_case = camelCase des
 * BadgeMetric) alimente uniquement les jauges de progression. Aucune écriture client.
 *
 * ─── LA FUITE COLMATÉE (21/07/2026) ──────────────────────────────────────────
 * AVANT : `if (!remote) return { unlockedIds: UNLOCKED_IDS, … }`. Sans session,
 * ou dès que la lecture échouait, le joueur se voyait attribuer les 20 badges du
 * persona de démonstration — « Premiers pas », « 10 km », « Hex Hunter II »… Un
 * badge est une preuve d'effort : en offrir vingt qu'on n'a pas gagnés est le
 * mensonge le plus direct que cet écran puisse produire (et il contaminait aussi
 * /badges, /profil-edit et /aujourdhui, qui consomment ce hook).
 *
 * MAINTENANT (mode vitrine ABANDONNÉ, 21/07/2026) : plus aucun repli de démo, sur
 * aucune plateforme. Pas de session ou lecture impossible → collection VIDE +
 * `failed` quand c'est une panne, pour que l'écran distingue « tu n'as encore
 * rien débloqué » de « on n'a pas pu charger tes badges ».
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { type BadgeMetric } from '@klaim/shared';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';

/**
 * D'où vient la collection affichée :
 *  · `server` — lue sur Supabase pour CE compte (y compris « aucun badge »).
 *  · `none`   — on ne sait rien : pas de session, ou lecture impossible.
 */
export type BadgesSource = 'server' | 'none';

export interface MyBadges {
  /** Clés (badge_key) des badges débloqués. */
  unlockedIds: ReadonlySet<string>;
  /** badge_key → date FR affichable (« 12 juin 2026 »). */
  unlockedDates: ReadonlyMap<string, string>;
  /** Valeur d'une métrique de progression (0 par défaut). */
  stat: (metric: BadgeMetric) => number;
  source: BadgesSource;
  loading: boolean;
  /**
   * true = session présente mais LECTURE ÉCHOUÉE. Une collection vide affichée
   * après une panne se lit « tu n'as rien gagné » : ce drapeau permet à l'écran
   * de dire la vérité (« on n'a pas pu charger ») et d'offrir un réessai.
   */
  failed: boolean;
  /** Relance la lecture serveur (bouton « Réessayer »). */
  reload: () => void;
}

/** Collection inconnue/vide — aucun badge inventé, toutes les jauges à 0. */
const NO_BADGES = {
  unlockedIds: new Set<string>() as ReadonlySet<string>,
  unlockedDates: new Map<string, string>() as ReadonlyMap<string, string>,
  stat: () => 0,
} as const;

/** camelCase (BadgeMetric) → snake_case (colonne user_stats) — cf. ingest_run rowToStats. */
function camelToSnake(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

const FR_MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

/** Formate un timestamptz en « 12 juin 2026 » (même style que la démo). */
function formatFrDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()} ${FR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

interface RemoteBadges {
  unlockedIds: Set<string>;
  unlockedDates: Map<string, string>;
  /** Colonne user_stats (snake_case) → valeur numérique. */
  stats: Record<string, number>;
}

async function fetchRemoteBadges(userId: string): Promise<RemoteBadges | null> {
  if (!supabase) return null;

  const [badgesResult, statsResult] = await Promise.all([
    supabase.from('user_badges').select('badge_key, earned_at').eq('user_id', userId),
    supabase.from('user_stats').select('*').eq('user_id', userId).maybeSingle(),
  ]);
  if (badgesResult.error) throw badgesResult.error;
  if (statsResult.error) throw statsResult.error;

  const rows = (badgesResult.data ?? []) as { badge_key?: unknown; earned_at?: unknown }[];
  const unlockedIds = new Set<string>();
  const unlockedDates = new Map<string, string>();
  for (const r of rows) {
    if (typeof r.badge_key !== 'string') continue;
    unlockedIds.add(r.badge_key);
    if (typeof r.earned_at === 'string') {
      const label = formatFrDate(r.earned_at);
      if (label) unlockedDates.set(r.badge_key, label);
    }
  }

  const statsRow = (statsResult.data ?? null) as Record<string, unknown> | null;
  const stats: Record<string, number> = {};
  if (statsRow) {
    for (const [col, val] of Object.entries(statsRow)) {
      const n = typeof val === 'number' ? val : Number(val);
      if (Number.isFinite(n)) stats[col] = n;
    }
  }

  return { unlockedIds, unlockedDates, stats };
}

/**
 * Collection du joueur : RÉELLE (Supabase) dès qu'une session existe, VIDE sinon.
 * Retourne unlockedIds + unlockedDates + une fonction stat(metric).
 */
export function useMyBadges(): MyBadges {
  const { session, configured, loading: sessionLoading } = useSession();
  const [remote, setRemote] = useState<RemoteBadges | null>(null);
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
    void fetchRemoteBadges(userId)
      .then((data) => {
        if (alive) setRemote(data);
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

  return useMemo<MyBadges>(() => {
    const loading = sessionLoading || remoteLoading;
    if (remote) {
      const stats = remote.stats;
      return {
        unlockedIds: remote.unlockedIds,
        unlockedDates: remote.unlockedDates,
        stat: (metric: BadgeMetric) => stats[camelToSnake(metric)] ?? 0,
        source: 'server',
        loading,
        failed: false,
        reload,
      };
    }
    return { ...NO_BADGES, source: 'none', loading, failed, reload };
  }, [remote, sessionLoading, remoteLoading, failed, reload]);
}
