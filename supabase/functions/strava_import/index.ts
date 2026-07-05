/**
 * GRYD — Edge Function strava_import (AMENDEMENT-15 §3, prêt-à-clés O7).
 *
 * Pipeline : clés O7 présentes ? (sinon 503 configuration_required, propre)
 * → auth JWT (l'utilisateur connecte SON Strava) → échange OAuth
 * (code→token à la connexion, refresh_token aux synchros) → fetch activités
 * récentes API v3 → normalisation PURE (logic.ts : courses uniquement,
 * statut capture_eligible/stats_only selon la preuve GPS §15) → dédup contre
 * les courses GRYD déjà ingérées (dedupeActivity, moteur partagé) → insert
 * `imported_activities` en service-role (RLS : écriture client interdite).
 *
 * IDEMPOTENCE : index unique (user_id, source, external_id) — un re-sync
 * rejoue les mêmes activités et prend des 23505 comptés `alreadyImported`,
 * zéro doublon. Les TOKENS ne sont JAMAIS persistés en base : le refresh
 * token repart au client qui le garde sur l'appareil (AsyncStorage) — aucune
 * table de tokens au MVP (colonne dédiée = V1 si les synchros deviennent
 * serveur). Règle produit : un import ne claim JAMAIS — seules les courses
 * vérifiées capturent (la trace part uniquement vers ingest_run).
 */
import { createClient } from 'npm:@supabase/supabase-js@^2';
import {
  matchDuplicateRun,
  normalizeStravaActivity,
  type ExistingRunForDedup,
  type StravaActivity,
} from './logic.ts';

// Constantes TECHNIQUES d'I/O (pas des règles de jeu — précédent WEATHER_TIMEOUT_MS).
const STRAVA_TIMEOUT_MS = 10_000; // budget par appel HTTP Strava
const STRAVA_PER_PAGE = 30; // « activités récentes » : 1 page API v3 (défaut Strava)
const DEDUP_WINDOW_MS = 2 * 86_400_000; // fenêtre large ± 2 j — le filtre fin est dedupeActivity

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

interface StravaImportRequest {
  /** Code d'autorisation OAuth (première connexion). */
  code?: string;
  /** redirect_uri utilisée par le client pour obtenir le code (échange strict). */
  redirectUri?: string;
  /** Refresh token stocké sur l'appareil (synchros suivantes). */
  refreshToken?: string;
}

function isStravaImportRequest(body: unknown): body is StravaImportRequest {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  const hasCode = typeof b.code === 'string' && b.code.length > 0;
  const hasRefresh = typeof b.refreshToken === 'string' && b.refreshToken.length > 0;
  if (b.redirectUri !== undefined && typeof b.redirectUri !== 'string') return false;
  return hasCode !== hasRefresh; // exactement l'un des deux
}

interface StravaTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  athlete?: { id?: number };
}

/** Échange OAuth Strava (code OU refresh). null = refus Strava (clés/code invalides). */
async function exchangeToken(
  clientId: string,
  clientSecret: string,
  request: StravaImportRequest,
): Promise<StravaTokenResponse | null> {
  const params = new URLSearchParams({ client_id: clientId, client_secret: clientSecret });
  if (request.code) {
    params.set('grant_type', 'authorization_code');
    params.set('code', request.code);
    if (request.redirectUri) params.set('redirect_uri', request.redirectUri);
  } else {
    params.set('grant_type', 'refresh_token');
    params.set('refresh_token', request.refreshToken ?? '');
  }
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
    signal: AbortSignal.timeout(STRAVA_TIMEOUT_MS),
  });
  if (!res.ok) return null;
  const body = await res.json() as StravaTokenResponse;
  return body.access_token ? body : null;
}

/** Activités récentes de l'athlète (1 page). null = API Strava en échec. */
async function fetchRecentActivities(accessToken: string): Promise<StravaActivity[] | null> {
  const res = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?per_page=${STRAVA_PER_PAGE}`,
    {
      headers: { authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(STRAVA_TIMEOUT_MS),
    },
  );
  if (!res.ok) return null;
  const body = await res.json();
  return Array.isArray(body) ? body as StravaActivity[] : null;
}

/** Courses GRYD du user dans la fenêtre de dédup couvrant tous les imports. */
async function loadRunsForDedup(
  userId: string,
  startsMs: readonly number[],
): Promise<ExistingRunForDedup[]> {
  if (startsMs.length === 0) return [];
  const from = new Date(Math.min(...startsMs) - DEDUP_WINDOW_MS).toISOString();
  const to = new Date(Math.max(...startsMs) + DEDUP_WINDOW_MS).toISOString();
  const { data, error } = await supabase
    .from('runs')
    .select('id, started_at, duration_s, distance_m, polyline_hash')
    .eq('user_id', userId)
    .gte('started_at', from)
    .lte('started_at', to);
  if (error) throw new Error(`runs dedup read: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: row.id as string,
    startedAt: row.started_at as string,
    durationS: row.duration_s as number,
    distanceM: row.distance_m as number,
    polylineHash: (row.polyline_hash as string | null) ?? null,
  }));
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  // ── O7 : sans clés, réponse 503 HONNÊTE (la function est déployée, inerte) ─
  const clientId = Deno.env.get('STRAVA_CLIENT_ID') ?? '';
  const clientSecret = Deno.env.get('STRAVA_CLIENT_SECRET') ?? '';
  if (!clientId || !clientSecret) {
    return json({
      error: 'configuration_required',
      openPoint: 'O7',
      message: 'Clés Strava absentes — npx supabase secrets set ' +
        'STRAVA_CLIENT_ID=… STRAVA_CLIENT_SECRET=… (strava.com/settings/api)',
    }, 503);
  }

  // ── Auth JWT (même pattern qu'ingest_run) ─────────────────────────────────
  const authHeader = req.headers.get('authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  if (!jwt) return json({ error: 'missing_authorization' }, 401);
  const { data: userData, error: authError } = await supabase.auth.getUser(jwt);
  if (authError || !userData?.user) return json({ error: 'invalid_token' }, 401);
  const userId = userData.user.id;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  if (!isStravaImportRequest(body)) return json({ error: 'invalid_payload' }, 400);

  try {
    // ── OAuth : échange code→token ou refresh ────────────────────────────────
    const token = await exchangeToken(clientId, clientSecret, body);
    if (!token?.access_token) return json({ error: 'strava_oauth_failed' }, 400);

    // ── Activités récentes → normalisation pure ──────────────────────────────
    const raw = await fetchRecentActivities(token.access_token);
    if (raw === null) return json({ error: 'strava_api_error' }, 502);

    const normalized = raw
      .map(normalizeStravaActivity)
      .filter(<T>(a: T | null): a is T => a !== null);
    const skipped = raw.length - normalized.length;

    // ── Dédup contre les courses GRYD (fenêtre unique, filtre fin pur) ───────
    const existingRuns = await loadRunsForDedup(
      userId,
      normalized.map((a) => Date.parse(a.startedAt)),
    );

    let imported = 0;
    let alreadyImported = 0;
    let duplicates = 0;
    let captureEligible = 0;
    let statsOnly = 0;

    for (const activity of normalized) {
      const matchedRunId = matchDuplicateRun(activity, existingRuns);
      const status = matchedRunId ? 'duplicate' : activity.status;

      // Idempotence par activité externe : index unique
      // (user_id, source, external_id) → 23505 = déjà importée, on passe.
      const { error: insertError } = await supabase.from('imported_activities').insert({
        user_id: userId,
        source: 'strava',
        external_id: activity.externalId,
        started_at: activity.startedAt,
        duration_s: activity.durationS,
        distance_m: activity.distanceM,
        polyline_hash: null, // hash GRYD = points bruts ; le summary Strava n'est pas comparable
        status,
        matched_run_id: matchedRunId,
      });
      if (insertError) {
        if (insertError.code === '23505') {
          alreadyImported++;
          continue;
        }
        throw new Error(`imported_activities insert: ${insertError.message}`);
      }
      imported++;
      if (status === 'duplicate') duplicates++;
      else if (status === 'capture_eligible') captureEligible++;
      else statsOnly++;
    }

    // Le refresh token repart au client (stockage appareil) — jamais en base.
    return json({
      connected: true,
      athleteId: token.athlete?.id,
      refreshToken: token.refresh_token,
      expiresAt: token.expires_at,
      lastSync: new Date().toISOString(),
      imported,
      alreadyImported,
      duplicates,
      captureEligible,
      statsOnly,
      skipped,
    });
  } catch (err) {
    // Détail loggé CÔTÉ SERVEUR uniquement (Supabase logs) — la réponse client
    // reste générique : jamais de stack/URL/message interne exposé.
    console.error('strava_import:', err);
    return json({ error: 'internal_error' }, 500);
  }
});
