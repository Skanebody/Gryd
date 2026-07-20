'use server';

/**
 * GRYD Admin — action serveur de revue d'un signalement.
 * La décision (reviewed/actioned/dismissed) est écrite par le RPC
 * `admin_resolve_report` en service-role : jamais par le client.
 */
import { revalidatePath } from 'next/cache';
import { resolveReport } from '../../lib/reports';

export type ResolveState = { status: 'idle' } | { status: 'error'; message: string };

export async function resolveReportAction(
  _prev: ResolveState,
  formData: FormData,
): Promise<ResolveState> {
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '');

  if (status !== 'reviewed' && status !== 'actioned' && status !== 'dismissed') {
    return { status: 'error', message: 'Statut invalide.' };
  }

  const res = await resolveReport(id, status);
  if (!res.ok) return { status: 'error', message: res.message ?? 'Échec.' };

  revalidatePath('/admin/signalements');
  revalidatePath('/admin');
  return { status: 'idle' };
}
