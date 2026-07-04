/**
 * Tests strava_import/logic.ts — AMENDEMENT-15 §3 + Activity Hub §4/§15.
 * Purs : fixtures JSON au format RÉEL de l'API Strava v3 (SummaryActivity),
 * aucun réseau. Couvre : normalisation (courses uniquement, champs réels),
 * statut honnête (preuve GPS → capture_eligible ; manuel/tapis/sans trace →
 * stats_only), dédup contre les courses GRYD (mêmes tolérances DEDUP_* que
 * le serveur — source unique dedupeActivity), et idempotence des ids.
 */
import { assertEquals } from 'jsr:@std/assert@^1';
import {
  DEDUP_DISTANCE_TOLERANCE,
  DEDUP_DURATION_TOLERANCE,
  DEDUP_START_TOLERANCE_MIN,
} from '../_shared/badges.ts';
import {
  matchDuplicateRun,
  normalizeStravaActivity,
  type ExistingRunForDedup,
  type StravaActivity,
} from './logic.ts';

/** Fixture : SummaryActivity Strava v3 réaliste (course extérieure tracée). */
function stravaRun(over: Partial<StravaActivity> = {}): StravaActivity {
  return {
    id: 11223344556,
    name: 'Morning Run',
    sport_type: 'Run',
    type: 'Run',
    distance: 5012.3,
    moving_time: 1490,
    elapsed_time: 1560,
    start_date: '2026-07-04T06:30:00Z',
    manual: false,
    trainer: false,
    map: { summary_polyline: 'krl~Fzwyt@sBqAeCk@_B\\' },
    ...over,
  };
}

Deno.test('normalise une course extérieure tracée → capture_eligible, champs arrondis', () => {
  const n = normalizeStravaActivity(stravaRun());
  assertEquals(n !== null, true);
  assertEquals(n!.externalId, '11223344556');
  assertEquals(n!.startedAt, '2026-07-04T06:30:00.000Z');
  assertEquals(n!.durationS, 1560); // elapsed_time (durée TOTALE, cohérente avec runs.duration_s)
  assertEquals(n!.distanceM, 5012); // arrondi au mètre
  assertEquals(n!.status, 'capture_eligible');
  assertEquals(n!.hasTrace, true);
});

Deno.test('ignore les autres sports (Ride, Swim, WeightTraining)', () => {
  for (const sport_type of ['Ride', 'Swim', 'WeightTraining']) {
    assertEquals(normalizeStravaActivity(stravaRun({ sport_type })), null);
  }
});

Deno.test('fallback sur `type` quand sport_type absent (anciennes API)', () => {
  const n = normalizeStravaActivity(stravaRun({ sport_type: undefined, type: 'Run' }));
  assertEquals(n?.status, 'capture_eligible');
});

Deno.test('activité manuelle → stats_only (aucune preuve GPS, §15)', () => {
  const n = normalizeStravaActivity(stravaRun({ manual: true }));
  assertEquals(n?.status, 'stats_only');
});

Deno.test('VirtualRun (tapis) et trainer → stats_only', () => {
  assertEquals(normalizeStravaActivity(stravaRun({ sport_type: 'VirtualRun' }))?.status, 'stats_only');
  assertEquals(normalizeStravaActivity(stravaRun({ trainer: true }))?.status, 'stats_only');
});

Deno.test('sans summary_polyline → stats_only (import sans trace, jamais de claim)', () => {
  assertEquals(normalizeStravaActivity(stravaRun({ map: null }))?.status, 'stats_only');
  assertEquals(
    normalizeStravaActivity(stravaRun({ map: { summary_polyline: '' } }))?.status,
    'stats_only',
  );
});

Deno.test('champs invalides → null (id/date/durée/distance)', () => {
  assertEquals(normalizeStravaActivity(stravaRun({ id: undefined })), null);
  assertEquals(normalizeStravaActivity(stravaRun({ start_date: 'pas-une-date' })), null);
  assertEquals(normalizeStravaActivity(stravaRun({ elapsed_time: 0, moving_time: undefined })), null);
  assertEquals(normalizeStravaActivity(stravaRun({ distance: Number.NaN })), null);
});

// ── Dédup contre les courses GRYD (moteur partagé dedupeActivity) ────────────

const GRYD_RUN: ExistingRunForDedup = {
  id: 'run-0001',
  startedAt: '2026-07-04T06:31:00Z', // 60 s après l'import — dans ±3 min
  durationS: 1500, // ±10 % de 1560
  distanceM: 4900, // ±10 % de 5012
  polylineHash: 'abc123',
};

Deno.test('import Strava de la même course GRYD → duplicate (départ/durée/distance)', () => {
  const n = normalizeStravaActivity(stravaRun())!;
  assertEquals(matchDuplicateRun(n, [GRYD_RUN]), 'run-0001');
});

Deno.test('course différente (départ hors ±3 min) → pas un doublon', () => {
  const n = normalizeStravaActivity(stravaRun())!;
  const farStart = {
    ...GRYD_RUN,
    startedAt: new Date(
      Date.parse('2026-07-04T06:30:00Z') + (DEDUP_START_TOLERANCE_MIN + 1) * 60_000,
    ).toISOString(),
  };
  assertEquals(matchDuplicateRun(n, [farStart]), null);
});

Deno.test('durée ou distance hors tolérance ±10 % → pas un doublon', () => {
  const n = normalizeStravaActivity(stravaRun())!;
  const longDuration = {
    ...GRYD_RUN,
    durationS: Math.ceil(n.durationS * (1 + DEDUP_DURATION_TOLERANCE) + 60),
  };
  const longDistance = {
    ...GRYD_RUN,
    distanceM: Math.ceil(n.distanceM * (1 + DEDUP_DISTANCE_TOLERANCE) + 200),
  };
  assertEquals(matchDuplicateRun(n, [longDuration]), null);
  assertEquals(matchDuplicateRun(n, [longDistance]), null);
});

Deno.test('première course matchée retenue parmi plusieurs candidates', () => {
  const n = normalizeStravaActivity(stravaRun())!;
  const other = { ...GRYD_RUN, id: 'run-0002', startedAt: '2026-07-03T06:31:00Z' };
  assertEquals(matchDuplicateRun(n, [other, GRYD_RUN]), 'run-0001');
});

Deno.test('externalId stable pour id numérique ou string (idempotence import)', () => {
  assertEquals(normalizeStravaActivity(stravaRun({ id: 42 }))?.externalId, '42');
  assertEquals(normalizeStravaActivity(stravaRun({ id: '42' }))?.externalId, '42');
});
