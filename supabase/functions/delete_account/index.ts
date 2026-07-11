/**
 * GRYD — Edge Function delete_account (Apple Guideline 5.1.1(v) : suppression de
 * compte OBLIGATOIRE dès qu'il y a création de compte ; RGPD art. 17 droit à
 * l'effacement).
 *
 * L'utilisateur connecté supprime SON PROPRE compte. On dérive l'identité du JWT
 * (jamais un id passé par le client), puis on supprime la ligne `auth.users` via
 * l'API admin (service-role). Le CASCADE des clés étrangères fait le reste :
 *   auth.users → public.users (`on delete cascade`, 0002_schema.sql) → runs,
 *   hex_claims, season_scores, user_badges, user_stats, crew_members,
 *   user_inventory, purchases, … (toutes `references public.users(id) on delete
 *   cascade`). Effacement TOTAL et irréversible, atomique côté Postgres.
 *
 * Sécurité : service-role UNIQUEMENT côté serveur ; AUCUN id cible accepté du
 * client ; POST seul ; JWT obligatoire (même pattern d'auth qu'ingest_run /
 * strava_import). Idempotent : un compte déjà supprimé → succès (`alreadyGone`),
 * jamais une erreur — l'état voulu est « ce compte n'existe plus ».
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

  // ── Suppression irréversible : auth.users → CASCADE sur toutes les tables ──
  const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
  if (deleteError) {
    // Compte déjà absent → succès idempotent ; sinon, erreur serveur honnête.
    const message = deleteError.message?.toLowerCase() ?? '';
    const status = (deleteError as { status?: number }).status;
    if (status === 404 || message.includes('not found')) {
      return json({ deleted: true, alreadyGone: true });
    }
    return json({ error: 'deletion_failed' }, 500);
  }

  return json({ deleted: true });
});
