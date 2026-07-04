/**
 * GRYD — strava_import : logique PURE (normalisation + dédup + statut).
 * AMENDEMENT-15 §3 (chemin Strava prêt-à-clés) + Activity Hub AMENDEMENT-06
 * §4/§15. Ce module ne fait AUCUNE I/O : il transforme une activité brute de
 * l'API Strava v3 (SummaryActivity) en ligne `imported_activities`, et décide
 * son statut honnête :
 *  - hors course à pied → ignorée (null) : GRYD n'importe que la course ;
 *  - sans preuve GPS (manuelle, tapis/trainer, VirtualRun, pas de polyline)
 *    → `stats_only` (§15 : « imports sans trace → stats_only, jamais de
 *    claims ») ;
 *  - avec trace GPS → `capture_eligible` : ÉLIGIBLE à la vérification capture
 *    (Strava = Trust moyen · Vérification requise) — la décision de claim
 *    finale reste ingest_run avec trace complète, jamais un import ;
 *  - doublon d'une course GRYD déjà ingérée → `duplicate` + matched_run_id
 *    (dedupeActivity, moteur partagé — mêmes tolérances que le §4).
 */
import { dedupeActivity, type DedupActivity } from '../_shared/engine/badges.ts';

/** Sous-ensemble utile d'une SummaryActivity Strava API v3 (champs réels). */
export interface StravaActivity {
  id?: number | string;
  name?: string;
  /** Nouveau champ fin ('Run'|'TrailRun'|'VirtualRun'|'Ride'…). */
  sport_type?: string;
  /** Ancien champ, encore renvoyé ('Run'|'Ride'…) — fallback. */
  type?: string;
  distance?: number; // mètres (float)
  moving_time?: number; // secondes
  elapsed_time?: number; // secondes
  start_date?: string; // ISO UTC
  manual?: boolean; // activité saisie à la main (aucune preuve)
  trainer?: boolean; // home trainer / tapis
  map?: { summary_polyline?: string | null } | null;
}

/** Statuts décidés à l'import (le reste du CHECK imported_activities vient d'ailleurs). */
export type StravaImportStatus = 'capture_eligible' | 'stats_only';

/** Ligne normalisée, prête pour imported_activities (source 'strava'). */
export interface NormalizedStravaRun {
  externalId: string;
  startedAt: string; // ISO
  durationS: number; // elapsed_time : durée TOTALE, cohérente avec runs.duration_s (dédup ±10 %)
  distanceM: number; // arrondi au mètre
  status: StravaImportStatus;
  /** true si l'activité porte une trace GPS résumée (summary_polyline). */
  hasTrace: boolean;
}

/** Types Strava considérés comme course à pied (VirtualRun = tapis → stats_only). */
const RUN_SPORT_TYPES: ReadonlySet<string> = new Set(['Run', 'TrailRun', 'VirtualRun']);

/**
 * Normalise UNE activité Strava. Retourne null si ce n'est pas une course à
 * pied exploitable (autre sport, champs manquants/incohérents) — l'appelant
 * la compte en `skipped`. PURE.
 */
export function normalizeStravaActivity(raw: StravaActivity): NormalizedStravaRun | null {
  const sport = raw.sport_type ?? raw.type ?? '';
  if (!RUN_SPORT_TYPES.has(sport)) return null;

  if (raw.id === undefined || raw.id === null) return null;
  const externalId = String(raw.id);
  if (externalId.length === 0) return null;

  const startedMs = raw.start_date ? Date.parse(raw.start_date) : NaN;
  if (!Number.isFinite(startedMs)) return null;

  // Durée totale (elapsed) : runs.duration_s est une durée totale, la branche
  // métrique de dedupeActivity (±10 %) doit comparer des grandeurs identiques.
  const durationS = raw.elapsed_time ?? raw.moving_time;
  if (typeof durationS !== 'number' || !Number.isFinite(durationS) || durationS <= 0) return null;

  const distance = raw.distance;
  if (typeof distance !== 'number' || !Number.isFinite(distance) || distance < 0) return null;

  const hasTrace = typeof raw.map?.summary_polyline === 'string' &&
    raw.map.summary_polyline.length > 0;
  // §15 : sans preuve GPS extérieure → stats_only (jamais de claims).
  const provable = hasTrace && raw.manual !== true && raw.trainer !== true &&
    sport !== 'VirtualRun';

  return {
    externalId,
    startedAt: new Date(startedMs).toISOString(),
    durationS: Math.round(durationS),
    distanceM: Math.round(distance),
    status: provable ? 'capture_eligible' : 'stats_only',
    hasTrace,
  };
}

/** Course GRYD existante candidate à la dédup (lignes `runs` du même user). */
export interface ExistingRunForDedup {
  id: string;
  startedAt: string;
  durationS: number;
  distanceM: number;
  polylineHash?: string | null;
}

/**
 * Première course GRYD dont l'import est un DOUBLON (dedupeActivity, moteur
 * partagé : hash identique OU départ ±3 min & durée ±10 % & distance ±10 %).
 * Les imports Strava n'ont pas de polyline_hash GRYD → seule la branche
 * métrique joue. Retourne l'id de la course matchée, ou null. PURE.
 */
export function matchDuplicateRun(
  activity: NormalizedStravaRun,
  existing: readonly ExistingRunForDedup[],
): string | null {
  const candidate: DedupActivity = {
    startedAt: activity.startedAt,
    durationS: activity.durationS,
    distanceM: activity.distanceM,
    polylineHash: null,
  };
  for (const run of existing) {
    const other: DedupActivity = {
      startedAt: run.startedAt,
      durationS: run.durationS,
      distanceM: run.distanceM,
      polylineHash: run.polylineHash ?? null,
    };
    if (dedupeActivity(candidate, other)) return run.id;
  }
  return null;
}
