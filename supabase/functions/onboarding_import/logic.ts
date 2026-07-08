/**
 * GRYD — onboarding_import : logique PURE (sélection + XP fondateur).
 */
import type { IngestRunRequest } from '../_shared/types.ts';
import {
  ONBOARDING_IMPORT_MAX_CAPTURE_RUNS,
  ONBOARDING_IMPORT_WINDOW_DAYS,
} from '../_shared/game-rules.ts';
import {
  founderXpFromCandidates,
  isWithinOnboardingImportWindow,
} from '../_shared/engine/onboarding.ts';
import { decodeGooglePolyline, latLngsToRunPoints } from '../_shared/polyline.ts';

export { founderXpFromCandidates, isWithinOnboardingImportWindow };

/** Activité Strava détaillée (sous-ensemble utile). */
export interface StravaDetailedActivity {
  id?: number | string;
  start_date?: string;
  elapsed_time?: number;
  moving_time?: number;
  distance?: number;
  map?: { summary_polyline?: string | null; polyline?: string | null } | null;
}

export interface ImportedActivityRow {
  id: string;
  external_id: string | null;
  source: string;
  started_at: string;
  duration_s: number | null;
  distance_m: number | null;
  status: string;
}

/** Construit un IngestRunRequest depuis une activité Strava détaillée. */
export function stravaActivityToIngestRequest(
  activity: StravaDetailedActivity,
  clientRunId: string,
  cityId?: IngestRunRequest['cityId'],
): IngestRunRequest | null {
  const poly = activity.map?.polyline ?? activity.map?.summary_polyline;
  if (typeof poly !== 'string' || poly.length === 0) return null;

  const startedMs = activity.start_date ? Date.parse(activity.start_date) : NaN;
  if (!Number.isFinite(startedMs)) return null;

  const durationS = activity.elapsed_time ?? activity.moving_time;
  if (typeof durationS !== 'number' || durationS <= 0) return null;

  const coords = decodeGooglePolyline(poly);
  const points = latLngsToRunPoints(coords, new Date(startedMs), Math.round(durationS));
  if (points.length < 2) return null;

  return {
    clientRunId,
    source: 'strava',
    cityId,
    startedAt: new Date(startedMs).toISOString(),
    points,
    // Trust moyen Strava (summary polyline) → verify partiel côté serveur.
    gpsTrust: 65,
    onboardingRetro: true,
  };
}

/** Sélectionne les activités éligibles (fenêtre, statut, max runs), tri ancien → récent. */
export function selectCaptureActivities(
  rows: readonly ImportedActivityRow[],
  now: Date,
  alreadyRetroCount: number,
): ImportedActivityRow[] {
  const slots = Math.max(0, ONBOARDING_IMPORT_MAX_CAPTURE_RUNS - alreadyRetroCount);
  if (slots === 0) return [];

  return [...rows]
    .filter((r) =>
      r.status === 'capture_eligible' &&
      isWithinOnboardingImportWindow(new Date(r.started_at), now)
    )
    .sort((a, b) => Date.parse(a.started_at) - Date.parse(b.started_at))
    .slice(0, slots);
}

export function onboardingImportWindowDays(): number {
  return ONBOARDING_IMPORT_WINDOW_DAYS;
}
