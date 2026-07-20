/**
 * GRYD — Edge Function export_account (RGPD art. 15 droit d'accès + art. 20
 * portabilité ; symétrique de delete_account).
 *
 * L'utilisateur connecté récupère une COPIE de ses données personnelles. On
 * dérive l'identité du JWT (jamais un id client), puis on lit en service-role
 * ses lignes dans chaque table porteuse de données perso, filtrées par sa colonne
 * utilisateur (user_id, sauf hex_claims = owner_user_id). Retour = un JSON lisible
 * `gryd.account-export.v1`. LECTURE SEULE : n'efface ni ne modifie rien.
 *
 * Robuste : chaque table est interrogée en BEST-EFFORT — une table absente ou une
 * colonne inattendue est consignée dans `partialErrors` et n'échoue pas l'export
 * global. Le client (confidentialite.tsx) présente le JSON via la feuille de
 * partage native.
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

/** Tables porteuses de données perso + colonne utilisateur (single = 0-1 ligne). */
const PERSONAL_TABLES: readonly {
  key: string;
  table: string;
  column: string;
  single?: boolean;
}[] = [
  { key: 'profile', table: 'users', column: 'id', single: true },
  { key: 'stats', table: 'user_stats', column: 'user_id', single: true },
  { key: 'runs', table: 'runs', column: 'user_id' },
  { key: 'hexClaims', table: 'hex_claims', column: 'owner_user_id' },
  { key: 'seasonScores', table: 'season_scores', column: 'user_id' },
  { key: 'badges', table: 'user_badges', column: 'user_id' },
  { key: 'inventory', table: 'user_inventory', column: 'user_id' },
  { key: 'purchases', table: 'purchases', column: 'user_id' },
  { key: 'crewMemberships', table: 'crew_members', column: 'user_id' },
  { key: 'privacyZones', table: 'privacy_zones', column: 'user_id' },
  { key: 'missionProgress', table: 'mission_progress', column: 'user_id' },
  { key: 'notifications', table: 'notifications', column: 'user_id' },
  { key: 'importedActivities', table: 'imported_activities', column: 'user_id' },
  // Droit d'accès : l'utilisateur doit aussi récupérer ses actions de MODÉRATION
  // (signalements émis, pseudos bloqués) — ce sont ses données personnelles au
  // même titre que ses courses. Cf. 0029_moderation.sql.
  { key: 'contentReports', table: 'content_reports', column: 'reporter_id' },
  { key: 'blockedPseudos', table: 'user_blocks', column: 'blocker_id' },
];

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  // ── Auth JWT (même pattern qu'ingest_run / strava_import / delete_account) ─
  const authHeader = req.headers.get('authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  if (!jwt) return json({ error: 'missing_authorization' }, 401);
  const { data: userData, error: authError } = await supabase.auth.getUser(jwt);
  if (authError || !userData?.user) return json({ error: 'invalid_token' }, 401);
  const userId = userData.user.id;

  // ── Collecte best-effort table par table ─────────────────────────────────
  const data: Record<string, unknown> = {};
  const partialErrors: { key: string; message: string }[] = [];
  for (const t of PERSONAL_TABLES) {
    try {
      const query = supabase.from(t.table).select('*').eq(t.column, userId);
      const res = t.single ? await query.maybeSingle() : await query;
      if (res.error) {
        partialErrors.push({ key: t.key, message: res.error.message });
        continue;
      }
      data[t.key] = res.data ?? (t.single ? null : []);
    } catch (e) {
      partialErrors.push({ key: t.key, message: e instanceof Error ? e.message : String(e) });
    }
  }

  // État de suppression différée (0046) : l'export doit DIRE si une suppression
  // est en cours et quand la purge aura lieu — sinon l'utilisateur exporte ses
  // données sans savoir qu'elles sont sur le point de disparaître.
  let deletion: unknown = null;
  const { data: pending } = await supabase
    .from('users')
    .select('deletion_requested_at')
    .eq('id', userId)
    .maybeSingle();
  const requestedAt = (pending as { deletion_requested_at?: string } | null)?.deletion_requested_at;
  if (requestedAt) {
    const { data: graceDays } = await supabase.rpc('account_deletion_grace_days');
    const days = typeof graceDays === 'number' ? graceDays : null;
    deletion = {
      pending: true,
      requestedAt,
      graceDays: days,
      purgeAt:
        days === null
          ? null
          : new Date(new Date(requestedAt).getTime() + days * 86_400_000).toISOString(),
    };
  } else {
    deletion = { pending: false };
  }

  return json({
    export: {
      format: 'gryd.account-export.v1',
      generatedAt: new Date().toISOString(),
      account: { id: userId, email: userData.user.email ?? null },
      deletion,
      data,
      ...(partialErrors.length > 0 ? { partialErrors } : {}),
    },
  });
});
