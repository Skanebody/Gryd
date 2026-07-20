/**
 * GRYD — Edge Function delete_account (Apple Guideline 5.1.1(v) : suppression de
 * compte OBLIGATOIRE dès qu'il y a création de compte ; RGPD art. 17 droit à
 * l'effacement).
 *
 * ── CHANGEMENT DE POLITIQUE (migration 0045) ────────────────────────────────
 * Cette fonction supprimait AUTREFOIS `auth.users` immédiatement : un tap
 * malheureux effaçait tout, sans retour possible. Elle DEMANDE désormais une
 * suppression DIFFÉRÉE (politique « Snapchat », ACCOUNT_DELETION_GRACE_DAYS) :
 *   • le compte devient INVISIBLE immédiatement (profil, classements, roster) ;
 *   • la purge RÉELLE et irréversible a lieu à l'échéance, exécutée par le cron
 *     `gryd_purge_accounts` → public.purge_due_accounts() ;
 *   • toute reconnexion pendant le délai ANNULE la suppression.
 *
 * POURQUOI GARDER CETTE FONCTION plutôt que laisser le client appeler le RPC
 * `request_account_deletion` en direct : les builds DÉJÀ INSTALLÉS appellent
 * `delete_account`. Si on la laissait en l'état, ces versions continueraient de
 * détruire des comptes sans délai de grâce. On la réécrit donc pour que TOUT
 * appelant — ancien ou nouveau — obtienne le comportement sûr. La réponse garde
 * la forme `{ deleted: true }` attendue par les anciens clients, enrichie de
 * `pending` / `purgeAt` que les nouveaux affichent.
 *
 * Sécurité : identité dérivée du JWT (jamais un id passé par le client) ; POST
 * seul ; service-role UNIQUEMENT côté serveur. Idempotent : re-demander ne
 * repousse jamais l'échéance (la 1re demande fait foi).
 */
import { createClient } from 'npm:@supabase/supabase-js@^2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  // ── Auth JWT (même pattern qu'ingest_run / strava_import) ─────────────────
  const authHeader = req.headers.get('authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  if (!jwt) return json({ error: 'missing_authorization' }, 401);
  const { data: userData, error: authError } = await supabase.auth.getUser(jwt);
  if (authError || !userData?.user) return json({ error: 'invalid_token' }, 401);
  const userId = userData.user.id;

  // ── Marquage de la demande ────────────────────────────────────────────────
  // On n'appelle pas le RPC `request_account_deletion` : il dérive son identité
  // d'auth.uid(), NULL sous service-role. On écrit donc la colonne directement,
  // avec la même sémantique idempotente (la 1re demande fait foi — une 2e ne
  // repousse jamais l'échéance, sinon un double-tap prolongerait la
  // conservation des données, l'inverse de ce que veut l'utilisateur).
  const { data: existing, error: readError } = await supabase
    .from('users')
    .select('deletion_requested_at')
    .eq('id', userId)
    .maybeSingle();

  if (readError) return json({ error: 'deletion_failed' }, 500);

  // Compte déjà absent → succès idempotent : l'état voulu est « ce compte
  // n'existe plus ». Jamais une erreur.
  if (!existing) return json({ deleted: true, alreadyGone: true, pending: false });

  const requestedAt =
    (existing as { deletion_requested_at?: string | null }).deletion_requested_at ??
    new Date().toISOString();

  const { error: writeError } = await supabase
    .from('users')
    .update({ deletion_requested_at: requestedAt })
    .eq('id', userId);

  if (writeError) return json({ error: 'deletion_failed' }, 500);

  const { data: graceDays } = await supabase.rpc('account_deletion_grace_days');
  const days = typeof graceDays === 'number' ? graceDays : null;

  return json({
    // `deleted: true` = la demande est enregistrée et le compte est DÉJÀ
    // invisible. Champ conservé pour les anciens builds qui le testent.
    deleted: true,
    pending: true,
    graceDays: days,
    requestedAt,
    purgeAt:
      days === null
        ? null
        : new Date(new Date(requestedAt).getTime() + days * 86_400_000).toISOString(),
  });
});
