import 'server-only';

/**
 * GRYD Admin — accès RÉEL aux signalements (`content_reports`, migration 0029 ;
 * RPC de revue 0046).
 *
 * ── Le trou que ce fichier bouche ───────────────────────────────────────────
 * Les signalements émis depuis l'app étaient bien écrits en base, mais AUCUNE
 * surface ne les exposait : la console affichait « Signalements : 5 », un
 * nombre codé en dur dans `lib/demo-data.ts`. Autrement dit un signalement
 * n'atteignait personne, et le tableau de bord affirmait un chiffre faux.
 *
 * ── Honnêteté avant tout ────────────────────────────────────────────────────
 * Sans `SUPABASE_SERVICE_ROLE_KEY`, on renvoie `{ configured: false }` — jamais
 * un tableau vide qui se lirait « aucun signalement », jamais une valeur de
 * démo. L'écran DIT alors que la console n'est pas branchée. Mieux vaut « je ne
 * sais pas » qu'un faux « tout va bien » sur une file de modération.
 *
 * ── Sécurité ────────────────────────────────────────────────────────────────
 * `server-only` : ce module ne peut pas être importé par un composant client,
 * donc la clé service-role ne peut pas fuiter dans le bundle. Les RPC appelés
 * (`admin_reports_*`) sont révoqués pour public/anon/authenticated et accordés
 * au seul `service_role` (vérifié par harnais PGlite avec has_function_privilege).
 */
import { createClient } from '@supabase/supabase-js';

export interface AdminReport {
  id: string;
  kind: 'message' | 'member';
  target_id: string;
  author: string;
  reason: 'spam' | 'haine' | 'harcelement' | 'autre';
  status: 'pending' | 'reviewed' | 'actioned' | 'dismissed';
  created_at: string;
  /** null = compte du rapporteur supprimé ou en cours de suppression (0046). */
  reporter_pseudo: string | null;
}

export interface ReportCounts {
  pending: number;
  reviewed: number;
  actioned: number;
  dismissed: number;
  total: number;
}

/** `configured: false` = console non branchée. On n'invente aucune donnée. */
export type ReportsResult =
  | { configured: false; reason: 'missing_env' | 'error'; message?: string }
  | { configured: true; reports: AdminReport[]; counts: ReportCounts };

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getReports(): Promise<ReportsResult> {
  const supabase = client();
  if (!supabase) return { configured: false, reason: 'missing_env' };

  try {
    const [queue, counts] = await Promise.all([
      supabase.rpc('admin_reports_queue'),
      supabase.rpc('admin_reports_counts'),
    ]);

    if (queue.error) {
      return { configured: false, reason: 'error', message: queue.error.message };
    }
    if (counts.error) {
      return { configured: false, reason: 'error', message: counts.error.message };
    }

    const q = queue.data as { ok?: boolean; reports?: AdminReport[] } | null;
    const c = counts.data as (ReportCounts & { ok?: boolean }) | null;

    return {
      configured: true,
      reports: q?.reports ?? [],
      counts: {
        pending: Number(c?.pending ?? 0),
        reviewed: Number(c?.reviewed ?? 0),
        actioned: Number(c?.actioned ?? 0),
        dismissed: Number(c?.dismissed ?? 0),
        total: Number(c?.total ?? 0),
      },
    };
  } catch (e) {
    return {
      configured: false,
      reason: 'error',
      message: e instanceof Error ? e.message : String(e),
    };
  }
}

/** Statue sur un signalement (revue sous 24 h — GRYD_APPSTORE_CHECKLIST). */
export async function resolveReport(
  id: string,
  status: 'reviewed' | 'actioned' | 'dismissed',
): Promise<{ ok: boolean; message?: string }> {
  const supabase = client();
  if (!supabase) return { ok: false, message: 'Console non branchée à Supabase.' };

  const { data, error } = await supabase.rpc('admin_resolve_report', {
    p_id: id,
    p_status: status,
  });
  if (error) return { ok: false, message: error.message };
  const r = data as { ok?: boolean; reason?: string } | null;
  return r?.ok === true ? { ok: true } : { ok: false, message: r?.reason ?? 'unknown' };
}
