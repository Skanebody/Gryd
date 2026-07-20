/**
 * GRYD — suppression de compte DIFFÉRÉE (migration 0046, politique « Snapchat »).
 *
 * Le compte n'est plus détruit au tap : la demande le rend INVISIBLE
 * immédiatement (profil, classements, roster crew), et la purge RÉELLE et
 * irréversible a lieu ACCOUNT_DELETION_GRACE_DAYS plus tard, exécutée côté
 * serveur par le cron `gryd_purge_accounts` → public.purge_due_accounts().
 *
 * ── LE PIÈGE, ET POURQUOI ON NE L'ÉVITE PAS PAR HASARD ──────────────────────
 * « Toute reconnexion annule la suppression » ne doit PAS se lire « toute
 * ouverture de l'app annule la suppression ». Si on annulait sur la session
 * RESTAURÉE (`INITIAL_SESSION`), il suffirait d'ouvrir l'app une fois pendant
 * les 30 jours pour que la suppression ne se produise JAMAIS — l'utilisateur
 * croirait son compte supprimé alors qu'il ne le sera pas. On n'annule donc que
 * sur une AUTHENTIFICATION RÉELLE (`SIGNED_IN`). C'est cohérent : demander la
 * suppression déconnecte, donc revenir exige une vraie reconnexion.
 *
 * Tout est décidé serveur : ce module n'écrit jamais d'état de suppression en
 * local, il ne fait que relayer les RPC et rapporter ce que le serveur répond.
 */
import { supabase } from '../../lib/supabase';

/** État renvoyé par le serveur. `pending` faux = compte normal. */
export interface DeletionStatus {
  pending: boolean;
  /** Délai de grâce en jours (ACCOUNT_DELETION_GRACE_DAYS côté serveur). */
  graceDays: number | null;
  /** Date de la demande (ISO) — null si aucune demande. */
  requestedAt: string | null;
  /** Date de purge RÉELLE (ISO) — null si aucune demande. */
  purgeAt: string | null;
}

const NONE: DeletionStatus = {
  pending: false,
  graceDays: null,
  requestedAt: null,
  purgeAt: null,
};

/** Normalise la réponse d'un RPC en DeletionStatus. Jamais d'invention. */
function toStatus(raw: unknown): DeletionStatus {
  if (!raw || typeof raw !== 'object') return NONE;
  const r = raw as Record<string, unknown>;
  if (r.ok !== true) return NONE;
  return {
    pending: r.pending === true,
    graceDays: typeof r.graceDays === 'number' ? r.graceDays : null,
    requestedAt: typeof r.requestedAt === 'string' ? r.requestedAt : null,
    purgeAt: typeof r.purgeAt === 'string' ? r.purgeAt : null,
  };
}

/**
 * État courant. `null` = indéterminé (hors ligne / pas de backend) — l'appelant
 * doit alors NE RIEN AFFIRMER plutôt que de supposer « compte normal ».
 */
export async function fetchDeletionStatus(): Promise<DeletionStatus | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('account_deletion_status');
  if (error) return null;
  return toStatus(data);
}

/**
 * Demande la suppression. Idempotent côté serveur : re-demander ne repousse
 * JAMAIS l'échéance (la 1re demande fait foi). Retourne null sur échec — dans
 * ce cas l'UI ne doit annoncer aucune suppression.
 */
export async function requestAccountDeletion(): Promise<DeletionStatus | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('request_account_deletion');
  if (error) return null;
  const status = toStatus(data);
  return status.pending ? status : null;
}

/**
 * Annule la suppression. `restored` distingue « il y avait bien une suppression
 * en cours, elle est annulée » de « le compte était déjà normal » : l'UI ne doit
 * annoncer une restauration que dans le premier cas (l'app ne ment jamais).
 */
export async function cancelAccountDeletion(): Promise<{ ok: boolean; restored: boolean }> {
  if (!supabase) return { ok: false, restored: false };
  const { data, error } = await supabase.rpc('cancel_account_deletion');
  if (error || !data || typeof data !== 'object') return { ok: false, restored: false };
  const r = data as Record<string, unknown>;
  return { ok: r.ok === true, restored: r.restored === true };
}
