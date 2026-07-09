/**
 * GRYD — Edge Function onboarding_import (batch unique fondateur).
 *
 * Pipeline : auth JWT → déjà fait ? → sync Strava optionnel → sélection
 * capture_eligible (30 j, max 5) → ingest_run × N (onboardingRetro) →
 * bonus XP fondateur plafonné (top 3 runs) → users.onboarding_import_at.
 *
 * Règles : hexes neutres only, 0 pt saison, carte remplie, classement repart à zéro.
 */
import { createClient } from 'npm:@supabase/supabase-js@^2';
import type { IngestRunRequest, IngestRunResponse, OnboardingImportResponse } from '../_shared/types.ts';
import {
  founderXpFromCandidates,
  selectCaptureActivities,
  stravaActivityToIngestRequest,
  type ImportedActivityRow,
  type StravaDetailedActivity,
} from './logic.ts';

const STRAVA_TIMEOUT_MS = 10_000;
const INGEST_TIMEOUT_MS = 120_000;

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

interface OnboardingImportRequest {
  /** Refresh token Strava (appareil) — synchro + détail activités si présent. */
  refreshToken?: string;
  /** Courses déjà parsées côté client (HealthKit / GPX). */
  runs?: IngestRunRequest[];
  cityId?: IngestRunRequest['cityId'];
}

function isRequest(body: unknown): body is OnboardingImportRequest {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  if (b.refreshToken !== undefined && typeof b.refreshToken !== 'string') return false;
  if (b.runs !== undefined && !Array.isArray(b.runs)) return false;
  if (b.cityId !== undefined && typeof b.cityId !== 'string') return false;
  return true;
}

async function exchangeStravaToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): Promise<string | null> {
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
    signal: AbortSignal.timeout(STRAVA_TIMEOUT_MS),
  });
  if (!res.ok) return null;
  const body = await res.json() as { access_token?: string };
  return body.access_token ?? null;
}

async function fetchStravaActivity(
  accessToken: string,
  activityId: string,
): Promise<StravaDetailedActivity | null> {
  const res = await fetch(`https://www.strava.com/api/v3/activities/${activityId}`, {
    headers: { authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(STRAVA_TIMEOUT_MS),
  });
  if (!res.ok) return null;
  return await res.json() as StravaDetailedActivity;
}

async function countRetroRuns(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('runs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_onboarding_retro', true);
  if (error) throw new Error(`runs retro count: ${error.message}`);
  return count ?? 0;
}

async function invokeIngestRun(
  jwt: string,
  payload: IngestRunRequest,
): Promise<IngestRunResponse | { error: string }> {
  const url = `${Deno.env.get('SUPABASE_URL') ?? ''}/functions/v1/ingest_run`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${jwt}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ ...payload, onboardingRetro: true }),
    signal: AbortSignal.timeout(INGEST_TIMEOUT_MS),
  });
  const body = await res.json();
  if (!res.ok) {
    return { error: (body as { error?: string }).error ?? 'ingest_failed' };
  }
  return body as IngestRunResponse;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

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
  if (!isRequest(body)) return json({ error: 'invalid_payload' }, 400);
  const request = body;
  const now = new Date();

  try {
    const { data: profile, error: profileErr } = await supabase
      .from('users')
      .select('onboarding_import_at, city_id, xp, level')
      .eq('id', userId)
      .single();
    if (profileErr || !profile) return json({ error: 'unknown_user' }, 403);

    if (profile.onboarding_import_at) {
      const done: OnboardingImportResponse = {
        alreadyDone: true,
        completedAt: profile.onboarding_import_at as string,
        runsProcessed: 0,
        hexesClaimed: 0,
        founderXpAwarded: 0,
        playerLevel: profile.level as number,
        statsOnlyRuns: 0,
        runs: [],
      };
      return json(done);
    }

    const cityId = request.cityId ?? (profile.city_id as IngestRunRequest['cityId'] | null) ?? undefined;

    // ── Strava : synchro via strava_import puis détail des activités ─────────
    if (request.refreshToken) {
      const clientId = Deno.env.get('STRAVA_CLIENT_ID') ?? '';
      const clientSecret = Deno.env.get('STRAVA_CLIENT_SECRET') ?? '';
      if (clientId && clientSecret) {
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/strava_import`, {
          method: 'POST',
          headers: { authorization: `Bearer ${jwt}`, 'content-type': 'application/json' },
          body: JSON.stringify({ refreshToken: request.refreshToken }),
          signal: AbortSignal.timeout(STRAVA_TIMEOUT_MS * 3),
        });
      }
    }

    let retroCount = await countRetroRuns(userId);
    const runSummaries: OnboardingImportResponse['runs'] = [];
    let statsOnlyRuns = 0;

    // ── Courses client (HealthKit / GPX) ─────────────────────────────────────
    if (request.runs?.length) {
      for (const run of request.runs.slice(0, 5 - retroCount)) {
        const result = await invokeIngestRun(jwt, { ...run, onboardingRetro: true, cityId });
        if ('error' in result) continue;
        retroCount += 1;
        runSummaries.push({
          runId: result.runId,
          startedAt: run.startedAt,
          hexesClaimed: result.hexes.claimed + result.hexes.stolen,
          onboardingXpCandidate: result.onboardingXpCandidate ?? 0,
          status: result.status,
        });
      }
    }

    // ── imported_activities capture_eligible (Strava…) ───────────────────────
    const { data: imported, error: impErr } = await supabase
      .from('imported_activities')
      .select('id, external_id, source, started_at, duration_s, distance_m, status')
      .eq('user_id', userId)
      .in('status', ['capture_eligible', 'stats_only'])
      .order('started_at', { ascending: true });
    if (impErr) throw new Error(`imported_activities read: ${impErr.message}`);

    const rows = (imported ?? []) as ImportedActivityRow[];
    const toCapture = selectCaptureActivities(rows, now, retroCount);

    const stravaToken = request.refreshToken && Deno.env.get('STRAVA_CLIENT_ID')
      ? await exchangeStravaToken(
        Deno.env.get('STRAVA_CLIENT_ID')!,
        Deno.env.get('STRAVA_CLIENT_SECRET') ?? '',
        request.refreshToken,
      )
      : null;

    for (const row of toCapture) {
      if (!row.external_id) continue;

      let ingestPayload: IngestRunRequest | null = null;

      if (row.source === 'strava' && stravaToken) {
        const detail = await fetchStravaActivity(stravaToken, row.external_id);
        if (detail) {
          ingestPayload = stravaActivityToIngestRequest(
            detail,
            `onboarding-strava-${row.external_id}`,
            cityId,
          );
        }
      }

      if (!ingestPayload) continue;

      const result = await invokeIngestRun(jwt, ingestPayload);
      if ('error' in result) continue;

      await supabase.from('imported_activities')
        .update({ status: 'claimed', matched_run_id: result.runId })
        .eq('id', row.id);

      retroCount += 1;
      runSummaries.push({
        runId: result.runId,
        startedAt: ingestPayload.startedAt,
        hexesClaimed: result.hexes.claimed + result.hexes.stolen,
        onboardingXpCandidate: result.onboardingXpCandidate ?? 0,
        status: result.status,
      });
    }

    // stats_only : marquer importées (performance via courses futures / HealthKit)
    for (const row of rows.filter((r) => r.status === 'stats_only')) {
      statsOnlyRuns += 1;
      await supabase.from('imported_activities')
        .update({ status: 'claimed' })
        .eq('id', row.id)
        .eq('status', 'stats_only');
    }

    // ── XP fondateur (top 3 candidats, plafond) ──────────────────────────────
    const { data: retroRuns } = await supabase
      .from('runs')
      .select('onboarding_xp_candidate')
      .eq('user_id', userId)
      .eq('is_onboarding_retro', true);

    const candidates = (retroRuns ?? []).map((r) => r.onboarding_xp_candidate as number);
    const founderXp = founderXpFromCandidates(candidates);

    const { data: xpResult, error: xpErr } = await supabase.rpc('apply_founder_xp', {
      p_user_id: userId,
      p_xp: founderXp,
    });
    if (xpErr) throw new Error(`apply_founder_xp: ${xpErr.message}`);

    const hexesClaimed = runSummaries.reduce((acc, r) => acc + r.hexesClaimed, 0);
    const level = (xpResult as { level?: number })?.level ?? (profile.level as number);

    const response: OnboardingImportResponse = {
      alreadyDone: false,
      completedAt: (xpResult as { onboarding_import_at?: string })?.onboarding_import_at ??
        now.toISOString(),
      runsProcessed: runSummaries.length,
      hexesClaimed,
      founderXpAwarded: founderXp,
      playerLevel: level,
      statsOnlyRuns,
      runs: runSummaries,
    };

    return json(response);
  } catch (err) {
    console.error('onboarding_import:', err);
    return json({ error: 'internal_error' }, 500);
  }
});
