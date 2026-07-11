/**
 * GRYD — état RÉEL de la collection de badges (O1 lecture Pass B, 11/07/2026).
 *
 * Lecture SEULE : débloqués (`user_badges`) + progression (`user_stats`) depuis
 * Supabase quand une session existe, sinon fallback DÉMO (badges/demo.ts). Même
 * pattern que features/social/economy.ts (session → remote, sinon local ; démo
 * immédiate, bascule serveur à la résolution, retour démo sur ERREUR).
 *
 * Différence de règle avec le classement (leagueBoard.ts) : ici un état réel VIDE
 * (joueur sans badge / sans user_stats) est VALIDE et s'affiche (collection tout
 * verrouillé, jauges à 0) — on ne retombe donc PAS sur la démo quand la lecture
 * réussit mais est vide. On ne retombe sur la démo que hors session ou sur erreur.
 *
 * Source de vérité des débloqués = `user_badges` (décernés par le serveur via
 * ingest_run/season_close, service_role), JAMAIS re-dérivés des seuils côté client
 * (contrairement à la démo). `user_stats` (colonnes snake_case = camelCase des
 * BadgeMetric) alimente uniquement les jauges de progression. Aucune écriture client.
 */
import { useEffect, useMemo, useState } from 'react';
import { type BadgeMetric } from '@klaim/shared';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';
import { UNLOCKED_DEMO, UNLOCKED_IDS, demoStat } from './demo';

export type BadgesSource = 'local' | 'server';

export interface MyBadges {
  /** Clés (badge_key) des badges débloqués. */
  unlockedIds: ReadonlySet<string>;
  /** badge_key → date FR affichable (« 12 juin 2026 »). */
  unlockedDates: ReadonlyMap<string, string>;
  /** Valeur d'une métrique de progression (0 par défaut). */
  stat: (metric: BadgeMetric) => number;
  source: BadgesSource;
  loading: boolean;
}

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
 * Collection du joueur : réelle (Supabase) si session configurée, sinon démo.
 * Retourne unlockedIds + unlockedDates + une fonction stat(metric), forme
 * identique aux constantes démo consommées par l'écran Collection.
 */
export function useMyBadges(): MyBadges {
  const { session, configured, loading: sessionLoading } = useSession();
  const [remote, setRemote] = useState<RemoteBadges | null>(null);
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
    void fetchRemoteBadges(userId)
      .then((data) => {
        if (alive) setRemote(data);
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

  return useMemo<MyBadges>(() => {
    const loading = sessionLoading || remoteLoading;
    if (!remote) {
      return {
        unlockedIds: UNLOCKED_IDS,
        unlockedDates: UNLOCKED_DEMO,
        stat: demoStat,
        source: 'local',
        loading,
      };
    }
    const stats = remote.stats;
    return {
      unlockedIds: remote.unlockedIds,
      unlockedDates: remote.unlockedDates,
      stat: (metric: BadgeMetric) => stats[camelToSnake(metric)] ?? 0,
      source: 'server',
      loading,
    };
  }, [remote, sessionLoading, remoteLoading]);
}
