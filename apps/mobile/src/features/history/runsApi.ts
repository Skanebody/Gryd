/**
 * GRYD — historique des courses depuis Supabase (runs + celebration).
 * Le client n'attribue rien : il rejoue les données persistées serveur.
 */
import type { IngestRunResponse, RejectReason, RunStatus } from '@klaim/shared';
import { supabase } from '../../lib/supabase';
import type {
  HistoryFilter,
  ImpactLine,
  RefusalReason,
  RunHistoryEntry,
  RunKind,
  VerifyStatus,
} from './demo';

interface RunRow {
  id: string;
  started_at: string;
  distance_m: number;
  duration_s: number;
  avg_pace_s_km: number | null;
  status: RunStatus;
  reject_reason: RejectReason | null;
  celebration: IngestRunResponse | null;
}

const DEMO_ID_PREFIXES = ['r-', 'run-'];

export function isDemoRunId(id: string): boolean {
  return DEMO_ID_PREFIXES.some((p) => id.startsWith(p));
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfRun = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfRun.getTime()) / 86_400_000);
  const time = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  if (diffDays === 0) return `Aujourd'hui · ${time}`;
  if (diffDays === 1) return 'Hier';
  const days = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'] as const;
  if (diffDays < 7) return days[d.getDay()] ?? 'Récent';
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
}

function verifyFromStatus(status: RunStatus): VerifyStatus {
  if (status === 'valid') return 'verified';
  if (status === 'partial') return 'partial';
  return 'statsonly';
}

function refusalFromRun(
  status: RunStatus,
  rejectReason: RejectReason | null,
  celebration: IngestRunResponse | null,
): RefusalReason {
  if (status === 'rejected') {
    if (rejectReason === 'pace_too_fast') return 'speed_incoherent';
    if (rejectReason === 'no_valid_points') return 'gps_unstable';
    return 'speed_incoherent';
  }
  if (celebration?.loopRejectedReason === 'narrow') return 'zone_thin';
  const zones = celebration
    ? celebration.hexes.claimed + celebration.hexes.stolen + celebration.hexes.defended
    : 0;
  if (zones === 0 && celebration?.loopClosed === false) return 'loop_open';
  return null;
}

function kindFromCelebration(celebration: IngestRunResponse | null, status: RunStatus): RunKind {
  if (!celebration || status === 'rejected') {
    const zones = celebration
      ? celebration.hexes.claimed + celebration.hexes.stolen + celebration.hexes.defended
      : 0;
    return zones > 0 ? 'conquest' : 'stats';
  }
  if (celebration.openBoundary || celebration.boundaryCompleted) return 'route';
  const { claimed, stolen, defended } = celebration.hexes;
  if (defended > 0 && claimed + stolen === 0) return 'defense';
  if (claimed + stolen > 0) return 'conquest';
  if (defended > 0) return 'defense';
  return 'stats';
}

function impactChips(celebration: IngestRunResponse | null, status: RunStatus): readonly string[] {
  if (!celebration) {
    return status === 'rejected' ? ['Course refusée'] : ['Stats enregistrées'];
  }
  const chips: string[] = [];
  const zones = celebration.hexes.claimed + celebration.hexes.stolen;
  if (zones > 0) chips.push(`+${zones} zones`);
  if (celebration.hexes.defended > 0) chips.push(`${celebration.hexes.defended} défendues`);
  if (celebration.boundaryCompleted) chips.push('1 frontière fermée');
  if (celebration.openBoundary) chips.push('Frontière ouverte');
  if (chips.length === 0) {
    chips.push(status === 'rejected' ? 'Course refusée' : 'Stats only');
  }
  return chips;
}

function impactLines(celebration: IngestRunResponse | null): readonly ImpactLine[] {
  if (!celebration) return [{ icon: 'performance', label: 'Effort enregistré', gain: false }];
  const lines: ImpactLine[] = [];
  const zones = celebration.hexes.claimed + celebration.hexes.stolen;
  if (zones > 0) lines.push({ icon: 'cible', label: `+${zones} zones capturées`, gain: true });
  if (celebration.hexes.defended > 0) {
    lines.push({ icon: 'bouclier', label: `${celebration.hexes.defended} zones défendues`, gain: true });
  }
  if (celebration.boundaryCompleted) {
    lines.push({
      icon: 'bouclier',
      label: `Frontière fermée · ${celebration.boundaryCompleted.name}`,
      gain: true,
    });
  }
  if (celebration.openBoundary) {
    lines.push({
      icon: 'route',
      label: `Frontière ouverte · ${celebration.openBoundary.missingM} m restants`,
      gain: false,
    });
  }
  if (celebration.crewXp && celebration.crewXp > 0) {
    lines.push({ icon: 'crew', label: `+${celebration.crewXp} XP crew`, gain: true });
  }
  if (lines.length === 0) {
    lines.push({ icon: 'performance', label: 'Aucune capture sur cette course', gain: false });
  }
  return lines;
}

function runName(celebration: IngestRunResponse | null, startedAt: string): string {
  if (celebration?.boundaryCompleted) return `Boucle ${celebration.boundaryCompleted.name}`;
  if (celebration?.openBoundary) return `Route ${celebration.openBoundary.name}`;
  const d = new Date(startedAt);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `Course · ${h}:${m}`;
}

function refusalDetail(
  refusal: RefusalReason,
  celebration: IngestRunResponse | null,
): string | null {
  if (refusal === null) return null;
  if (refusal === 'loop_open' && celebration?.openBoundary) {
    return `Il manquait ${celebration.openBoundary.missingM} m pour fermer la zone.`;
  }
  if (refusal === 'zone_thin') return 'La forme de la boucle était trop étroite pour capturer.';
  if (refusal === 'gps_unstable') return 'Signal GPS trop instable — stats enregistrées sans capture.';
  if (refusal === 'speed_incoherent') return 'Allure incohérente avec une course à pied.';
  return null;
}

export function mapRunRow(row: RunRow): RunHistoryEntry {
  const celebration = row.celebration;
  const km = row.distance_m / 1000;
  const pace =
    row.avg_pace_s_km ??
    (km > 0 ? Math.round(row.duration_s / km) : row.duration_s);
  const refusal = refusalFromRun(row.status, row.reject_reason, celebration);
  const kind = kindFromCelebration(celebration, row.status);

  return {
    id: row.id,
    name: runName(celebration, row.started_at),
    area: 'Ta zone',
    kind,
    when: formatWhen(row.started_at),
    km,
    durationS: row.duration_s,
    paceSPerKm: pace,
    impactChips: impactChips(celebration, row.status),
    verify: verifyFromStatus(row.status),
    refusal,
    hasLoopMap: celebration?.loopClosed === true,
    impactLines: impactLines(celebration),
    segments: [{ label: 'Parcours', km, state: row.status === 'partial' ? 'weak_gps' : 'valid' }],
    refusalDetail: refusalDetail(refusal, celebration),
    crewNote:
      celebration?.boundaryCompleted !== undefined
        ? `Frontière crew fermée · ${celebration.boundaryCompleted.name}`
        : celebration?.openBoundary !== undefined
          ? `Frontière ouverte · expire bientôt`
          : null,
  };
}

export async function fetchMyRuns(userId: string): Promise<RunHistoryEntry[]> {
  if (supabase === null) return [];
  const { data, error } = await supabase
    .from('runs')
    .select(
      'id, started_at, distance_m, duration_s, avg_pace_s_km, status, reject_reason, celebration',
    )
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(100);
  if (error || !Array.isArray(data)) return [];
  return (data as RunRow[]).map(mapRunRow);
}

export async function fetchRunById(runId: string): Promise<RunHistoryEntry | null> {
  if (supabase === null || isDemoRunId(runId)) return null;
  const { data, error } = await supabase
    .from('runs')
    .select(
      'id, started_at, distance_m, duration_s, avg_pace_s_km, status, reject_reason, celebration',
    )
    .eq('id', runId)
    .maybeSingle();
  if (error || data === null) return null;
  return mapRunRow(data as RunRow);
}

export function filterRunEntries(
  entries: readonly RunHistoryEntry[],
  filter: HistoryFilter,
): readonly RunHistoryEntry[] {
  if (filter === 'all') return entries;
  return entries.filter((r) => r.kind === filter);
}
