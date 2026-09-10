/**
 * GRYD — Edge Function export_account (RGPD art. 15 droit d'accès + art. 20
 * portabilité ; symétrique de delete_account).
 *
 * L'utilisateur connecté récupère une COPIE de ses données personnelles. On
 * dérive l'identité du JWT (jamais un id client), puis on lit en service-role
 * ses lignes dans chaque table porteuse de données perso, filtrées par sa colonne
 * utilisateur (`./personalTables.ts`). Retour = un JSON lisible
 * `gryd.account-export.v1`. LECTURE SEULE : n'efface ni ne modifie rien.
 *
 * ⚠️ CORRIGÉ LE 10/09/2026 : la liste s'était arrêtée au monde legacy. Aucune
 * table `*_2026` n'y figurait — ni les captures et leur GÉOMÉTRIE, ni les
 * territoires tenus, ni l'XP, ni les achats, ni les publications, commentaires,
 * signalements, blocages et messages de crew. L'export répondait donc FAUX à une
 * demande d'accès. La liste est désormais confrontée aux migrations par un test.
 *
 * Robuste : chaque table est interrogée en BEST-EFFORT — une table absente ou une
 * colonne inattendue est consignée dans `partialErrors` et n'échoue pas l'export
 * global. Le client (confidentialite.tsx) présente le JSON via la feuille de
 * partage native.
 */
import { createClient } from 'npm:@supabase/supabase-js@^2';
// La liste des tables vit à côté, pour qu'un test puisse la CONFRONTER aux
// migrations (personalTables_test.ts) sans démarrer la fonction.
import { PERSONAL_TABLES } from './personalTables.ts';

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
      // `also` n'existe que pour les tables POLYMORPHES (leaderboard_entries) :
      // sans lui, `subject_id = moi` accepterait aussi la ligne d'un crew dont
      // l'identifiant vaudrait le mien. Un export ne parie pas sur l'unicité de
      // deux espaces d'UUID distincts.
      // `columns` restreint la PROJECTION quand la table contient, à côté des
      // données du demandeur, un secret vivant du groupe (le code d'un crew, un
      // jeton d'invitation) ou l'identité d'un tiers (l'officier qui a décidé).
      // Sans elle, `select('*')` ferait sortir par l'export ce que la RLS et
      // les RPC gardent fermé — une fuite avec une preuve verte.
      const base = supabase
        .from(t.table)
        .select(t.columns ? t.columns.join(',') : '*')
        .eq(t.column, userId);
      const query = t.also ? base.match(t.also) : base;
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
