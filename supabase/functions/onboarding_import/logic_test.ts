import { assertEquals } from 'jsr:@std/assert@^1';
import {
  founderXpFromCandidates,
  isWithinOnboardingImportWindow,
  selectCaptureActivities,
  stravaActivityToIngestRequest,
} from './logic.ts';
import { decodeGooglePolyline } from '../_shared/polyline.ts';
import { ONBOARDING_IMPORT_XP_CAP } from '../_shared/game-rules.ts';

Deno.test('decodeGooglePolyline — extrait au moins 2 points', () => {
  // Polyline courte connue (2 points proches Paris).
  const encoded = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';
  const pts = decodeGooglePolyline(encoded);
  assertEquals(pts.length >= 2, true);
});

Deno.test('founderXpFromCandidates — top 3 plafonné', () => {
  const xp = founderXpFromCandidates([5000, 4000, 3000, 2000, 1000]);
  assertEquals(xp, ONBOARDING_IMPORT_XP_CAP);
  assertEquals(founderXpFromCandidates([100, 200, 300]), 600);
});

Deno.test('isWithinOnboardingImportWindow — 31 jours exclus', () => {
  const now = new Date('2026-07-08T12:00:00Z');
  const inside = new Date('2026-06-15T12:00:00Z');
  const outside = new Date('2026-05-01T12:00:00Z');
  assertEquals(isWithinOnboardingImportWindow(inside, now), true);
  assertEquals(isWithinOnboardingImportWindow(outside, now), false);
});

Deno.test('selectCaptureActivities — max slots + tri chronologique', () => {
  const now = new Date('2026-07-08T12:00:00Z');
  const rows = [
    { id: '2', external_id: '2', source: 'strava', started_at: '2026-07-01T10:00:00Z', duration_s: 3600, distance_m: 5000, status: 'capture_eligible' },
    { id: '1', external_id: '1', source: 'strava', started_at: '2026-06-20T10:00:00Z', duration_s: 3600, distance_m: 5000, status: 'capture_eligible' },
    { id: '3', external_id: '3', source: 'strava', started_at: '2026-05-01T10:00:00Z', duration_s: 3600, distance_m: 5000, status: 'capture_eligible' },
  ];
  const picked = selectCaptureActivities(rows, now, 0);
  assertEquals(picked.length, 2);
  assertEquals(picked[0]?.id, '1');
  assertEquals(selectCaptureActivities(rows, now, 4).length, 1);
});

Deno.test('stravaActivityToIngestRequest — polyline requise', () => {
  const req = stravaActivityToIngestRequest({
    id: 42,
    start_date: '2026-07-01T08:00:00Z',
    elapsed_time: 3600,
    map: { summary_polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@' },
  }, 'test-id');
  assertEquals(req?.onboardingRetro, true);
  assertEquals((req?.points.length ?? 0) >= 2, true);
});
