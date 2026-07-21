/**
 * GRYD — LOT 1 « LA SÉRIE VISIBLE » : la série RÉELLE du joueur, côté client.
 *
 * AUDIT (21/07/2026) : le moteur de série existait (constantes STREAK_*,
 * multiplicateur dans scoring.ts, colonne `users.streak_weeks`) mais PERSONNE ne
 * l'affichait, et surtout personne n'écrivait jamais la colonne — la série valait
 * 0 pour tout le monde. Ce module la rend visible SANS jamais l'inventer.
 *
 * D'OÙ VIENT LE CHIFFRE : des courses du joueur (`runs`, statuts 'valid' et
 * 'partial'), lues avec sa propre session via la policy RLS `runs_select_own`,
 * et de ses gels réellement activés (`streak_gels`, policy `streak_gels_select_own`).
 * Le calcul est fait par le MOTEUR PARTAGÉ `computeStreak` (@klaim/engine) — la
 * même fonction que celle qu'ingest_run applique pour scorer. Une seule règle.
 *
 * POURQUOI PAS `users.streak_weeks` : ce cache serveur n'est rafraîchi qu'à
 * l'ingestion d'une course. Un joueur qui s'arrête de courir y verrait encore
 * « 3 semaines » alors que sa série est finie — l'app mentirait. On recalcule
 * donc à l'affichage, à partir de ses courses.
 *
 * HONNÊTETÉ : sans session, sans Supabase configuré, ou tant que la lecture n'a
 * pas abouti, `state` vaut `null` → l'appelant n'affiche RIEN. Aucune série de
 * démonstration : une série inventée serait un mensonge sur l'effort du joueur.
 */
import { useEffect, useState } from 'react';
import { computeStreak, weekKey, type StreakState } from '@klaim/shared';
import { STREAK_HISTORY_WEEKS } from '@klaim/shared';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';

const MS_PER_DAY = 86_400_000;

export interface MyStreak {
  /** État réel, ou `null` quand on ne sait rien → l'UI n'affiche rien. */
  state: StreakState | null;
  loading: boolean;
}

/** Semaines couvertes par un gel (activation → expiration incluses). */
function frozenWeeksOf(
  gels: readonly { activated_at: string; expires_at: string }[],
): string[] {
  const out = new Set<string>();
  for (const g of gels) {
    const from = Date.parse(g.activated_at);
    const to = Date.parse(g.expires_at);
    if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) continue;
    for (let t = from; t <= to; t += MS_PER_DAY) out.add(weekKey(new Date(t)));
    out.add(weekKey(new Date(to)));
  }
  return [...out];
}

/**
 * Série du joueur connecté, dérivée de ses vraies courses. `null` = rien à dire
 * (pas de session, lecture impossible, ou aucune course connue) — l'appelant ne
 * doit alors afficher NI série, NI « 0 ».
 */
export function useMyStreak(): MyStreak {
  const { session, configured } = useSession();
  const userId = session?.user?.id ?? null;
  const [state, setState] = useState<StreakState | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!configured || !supabase || !userId) {
      setState(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    (async () => {
      const now = new Date();
      const since = new Date(now.getTime() - STREAK_HISTORY_WEEKS * 7 * MS_PER_DAY)
        .toISOString();
      const [runsRes, gelsRes] = await Promise.all([
        supabase!
          .from('runs')
          .select('started_at')
          .eq('user_id', userId)
          .in('status', ['valid', 'partial'])
          .gte('started_at', since),
        supabase!
          .from('streak_gels')
          .select('activated_at, expires_at')
          .eq('user_id', userId)
          .gte('expires_at', since),
      ]);
      if (cancelled) return;

      // Lecture impossible → on ne devine pas : on n'affiche rien.
      if (runsRes.error || !runsRes.data) {
        setState(null);
        setLoading(false);
        return;
      }
      const runStartedAt = runsRes.data
        .map((r) => new Date(String(r.started_at)))
        .filter((d) => Number.isFinite(d.getTime()));
      // Les gels sont un confort : leur échec ne bloque pas la série.
      const frozenWeekKeys = gelsRes.error || !gelsRes.data
        ? []
        : frozenWeeksOf(
            gelsRes.data as { activated_at: string; expires_at: string }[],
          );

      const computed = computeStreak({ runStartedAt, now, frozenWeekKeys });
      // 'none' = aucune course connue : on garde `null` pour que l'UI se taise.
      setState(computed.status === 'none' ? null : computed);
      setLoading(false);
    })().catch(() => {
      if (cancelled) return;
      setState(null);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [configured, userId]);

  return { state, loading };
}
